"""Extract three saved Qwen examples, without inference or executing trace code.

Run with uv run --no-project --with pillow python
 scripts/build-qwen-composition-examples.py [--check].
Only two current-run shards are streamed (at most 200 lines / 1 GiB each).
The unchanged 36 GiB baseline is read at 24 verified record offsets, not scanned.
All inputs are validated before any output is written. --check performs the
same extraction and checks existing output bytes without writing anything.
"""

import argparse
import base64
import copy
import csv
import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image


REPO = Path(__file__).resolve().parents[1]
SKYRL = REPO.parents[1]
EVALS = Path('/scratch/gpfs/ZHUANGL/hk4638/evals/worldbench')
RUN = EVALS / 'qwen36-27b_codex_execution_only_first100_pass8_20261008'
BASELINE = EVALS / 'qwen36_27b_pass8_null_thinking_official_20260819_repaired_missing5_20260820/traces.jsonl'
SCORES = SKYRL / 'analysis/worldbench/derived_scores/worldbench_27b_task_scores.tsv'
PLOT = SKYRL / 'plots/worldbench_compositional_20261011/plot_data.json'
OLD = REPO / 'src/writing/improving-vlms/trace-examples.json'
OUTPUT = REPO / 'src/writing/visual-composition/qwen-examples.json'
ASSETS = REPO / 'public/writing/visual-composition/qwen'
PREFIX = '/writing/visual-composition/qwen/'
SELECTION = {
    193: ('a80ba9761e634a7d85302a91c549ff85', 5, 'Dish counting',
          '340af067d5244f228536ea3cba368c58', 0),
    187: ('67386249934245b9b6857406d0e85950', 5, 'Door number',
          '06f99a8de81f4d03907e9738e3e838c2', 0),
    16: ('7d8d9ad2a76041e7bc504d387d514128', 0, 'Window corners',
         'd75b860bebbb45099375284363bb07ba', 1),
}
# One-based source lines and zero-based byte offsets from a bounded inventory.
# Each seek is validated against task ID, rollout count, rewards, and selected ID.
BASELINE_INDEX = {
    193: [(1519, 1979382530), (1520, 1996884094), (1522, 2016714356),
          (1523, 2034214366), (1524, 2051713907), (1525, 2069212532),
          (1528, 2105538784), (1531, 2128700212)],
    187: [(1471, 1746318937), (1472, 1746810328), (1473, 1747299619),
          (1474, 1747789471), (1477, 1767458518), (1478, 1767957440),
          (1479, 1768448864), (1482, 1772136544)],
    16: [(102, 103573136), (106, 104354146), (107, 104492158),
         (113, 106670987), (114, 106817170), (121, 112659610),
         (122, 112809411), (134, 124468667)],
}
# These are annotations of literal saved commands, never recreated crops.
# node: (label, box, command node, exact command fragment proving the box).
CROPS = {
    193: {
        9: ('Lighthouse and mast', [4449, 1191, 6039, 2185], 6,
            ['x1 = int(w * 0.7)', 'y1 = int(h * 0.3)',
             'x2 = int(w * 0.95)', 'y2 = int(h * 0.55)']),
        13: ('Mast close-up', [5000, 1400, 5600, 2000], 10,
             ['x1 = 5000', 'y1 = 1400', 'x2 = 5600', 'y2 = 2000']),
    },
    187: {
        5: ('Upper-left facade', [0, 0, 512, 341], 2,
            ['crop1 = img.crop((0, 0, w//2, h//2))']),
        7: ('Door region', [300, 400, 400, 500], 2,
            ['box2 = (300, 400, 400, 500)', 'crop2 = img.crop(box2)']),
        11: ('Facade detail', [400, 300, 500, 400], 8,
             ['box = (400, 300, 500, 400)', 'crop3 = img.crop(box)']),
        13: ('Door top', [300, 350, 400, 450], 8,
             ['box4 = (300, 350, 400, 450)', 'crop4 = img.crop(box4)']),
        17: ('Numbers above door', [300, 300, 400, 360], 14,
             ['box = (300, 300, 400, 360)', 'crop5 = img.crop(box)']),
    },
    16: {
        5: ('Top-left corner', [0, 0, 150, 150], 2,
            ['tl = img.crop((0, 0, 150, 150))']),
        7: ('Top-right corner', [165, 0, 315, 150], 2,
            ['tr = img.crop((w-150, 0, w, 150))']),
        9: ('Bottom-left corner', [0, 350, 150, 500], 2,
            ['bl = img.crop((0, h-150, 150, h))']),
        11: ('Bottom-right corner', [165, 350, 315, 500], 2,
             ['br = img.crop((w-150, h-150, w, h))']),
    },
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def file_info(path, full_hash=False):
    stat = path.stat()
    info = {'source': str(path), 'size_bytes': stat.st_size, 'mtime_ns': stat.st_mtime_ns}
    if full_hash:
        info['sha256'] = sha(path.read_bytes())
    return info


def score(trace):
    value = trace['rewards']['correct_answer']['score']
    require(value in (0, 1), 'Nonbinary reward')
    return int(value)


def record_info(trace, raw, path, line, offset, index, position=0):
    return {'trace_id': trace['id'], 'source': str(path), 'line': line,
            'byte_offset': offset, 'record_bytes': len(raw),
            'record_sha256': sha(raw), 'trace_sha256': sha(canonical(trace)),
            'trace_index_in_record': position, 'rollout_index': index,
            'reward': score(trace)}


def current_records():
    records = {idx: [] for idx in SELECTION}
    selected, reads = {}, []
    for shard, ids in [('task_0175_0199', (193, 187)), ('task_0000_0024', (16,))]:
        path = RUN / 'shards' / shard / 'eval_output/traces.jsonl'
        offset = 0
        with path.open('rb') as stream:
            for line in range(1, 201):
                raw = stream.readline(64 * 1024**2 + 1)
                require(raw.endswith(b'\n') and len(raw) <= 64 * 1024**2,
                        'Missing or oversized current-run record')
                require(offset + len(raw) <= 1024**3, 'Current-run read bound exceeded')
                for position, trace in enumerate(json.loads(raw)['traces']):
                    idx = trace['task']['data']['idx']
                    if idx not in ids:
                        continue
                    index = len(records[idx])
                    records[idx].append(record_info(trace, raw, path, line, offset, index, position))
                    if trace['id'] == SELECTION[idx][0]:
                        require(index == SELECTION[idx][1], 'Harness rollout index changed')
                        selected[idx] = trace
                offset += len(raw)
                if all(len(records[idx]) == 8 for idx in ids):
                    break
        require(all(len(records[idx]) == 8 for idx in ids), 'Expected eight current traces per question')
        reads.append({**file_info(path), 'lines_read': line, 'bytes_read': offset})
    require(set(selected) == set(SELECTION), 'Selected current trace missing')
    return records, selected, reads


def baseline_records():
    records, selected = {}, {}
    with BASELINE.open('rb') as stream:
        for idx, locations in BASELINE_INDEX.items():
            records[idx] = []
            for index, (line, offset) in enumerate(locations):
                stream.seek(offset - 1)
                require(stream.read(1) == b'\n', 'Stale baseline offset')
                raw = stream.readline(32 * 1024**2 + 1)
                require(raw.endswith(b'\n') and len(raw) <= 32 * 1024**2,
                        'Missing or oversized baseline record')
                traces = json.loads(raw)['traces']
                require(len(traces) == 1, 'Unexpected baseline record shape')
                trace = traces[0]
                require(trace['task']['data']['idx'] == idx, 'Baseline index is stale')
                require(trace['agent']['config']['harness']['id'] == 'null', 'Not a null trace')
                records[idx].append(record_info(trace, raw, BASELINE, line, offset, index))
                if index == SELECTION[idx][4]:
                    require(trace['id'] == SELECTION[idx][3], 'Baseline trace ID changed')
                    selected[idx] = trace
    return records, selected


def message_text(message):
    content = message.get('content') or ''
    if isinstance(content, str):
        return content
    require(all(p['type'] in ('text', 'image_url') for p in content), 'Unknown content type')
    return '\n'.join(p['text'] for p in content if p['type'] == 'text')


def calls(message):
    result = []
    for call in message.get('tool_calls') or []:
        arguments = call['arguments']
        result.append({'name': call['name'], 'arguments': json.loads(arguments)
                       if isinstance(arguments, str) else arguments})
    return result


def image_parts(messages):
    for mi, message in enumerate(messages):
        content = message.get('content') or []
        for pi, part in enumerate(content if isinstance(content, list) else []):
            if part['type'] == 'image_url':
                yield mi, pi, part['image_url']['url']


def image_asset(url, name, label, pending):
    header, encoded = url.split(',', 1)
    require(header in ('data:image/png;base64', 'data:image/jpeg;base64'), 'Unexpected image encoding')
    payload = base64.b64decode(encoded, validate=True)
    with Image.open(io.BytesIO(payload)) as im:
        width, height = im.size
        require(im.format == ('PNG' if 'png' in header else 'JPEG'), 'Image MIME mismatch')
        im.verify()
    filename = name + ('.png' if 'png' in header else '.jpg')
    require(filename not in pending or pending[filename] == payload, 'Asset collision')
    pending[filename] = payload
    return {'src': PREFIX + filename, 'label': label, 'width': width, 'height': height,
            'sha256': sha(payload), 'reconstructed': False}


def extract(trace, idx, harness, pending):
    require(trace['ok'] and trace['is_completed'] and not trace['errors'], 'Trace is not complete and error-free')
    require(score(trace) == int(harness), 'Selected verdict mismatch')
    require(trace['agent']['config']['model'] == 'qwen/qwen3.6-27b', 'Wrong model')
    require(trace['agent']['config']['harness']['id'] == ('codex' if harness else 'null'), 'Wrong harness')
    events, reminders, turn = [], [], 0
    for ni, node in enumerate(trace['nodes']):
        message = node['message']
        role = message['role']
        if role not in ('assistant', 'tool'):
            if role == 'user' and turn:
                reminders.append({'node': ni, 'message': message,
                                  'message_sha256': sha(canonical(message))})
            continue
        turn += int(role == 'assistant')
        reasoning = message.get('reasoning_content') or ''
        require(isinstance(reasoning, str), 'Reasoning must be a string')
        event = {'node': ni, 'role': role, 'turn': turn, 'text': message_text(message),
                 'reasoning': reasoning, 'calls': calls(message), 'images': []}
        if role == 'tool' and event['text']:
            require('Process exited with code 0' in event['text'], 'Nonzero or unconfirmed tool exit')
            require(not re.search(r'Traceback|Error:|command not found|cannot access|syntax error', event['text']),
                    'Tool output contains an error')
        for _, pi, url in image_parts([message]):
            require(harness and role == 'tool' and ni in CROPS[idx], 'Unannotated image')
            label, box, command_node, fragments = CROPS[idx][ni]
            command = calls(trace['nodes'][command_node]['message'])[0]['arguments']['cmd']
            require(all(fragment in command for fragment in fragments), 'Crop command changed')
            picture = image_asset(url, f'{idx}-node{ni}-{pi}', label, pending)
            require([picture['width'], picture['height']] == [box[2] - box[0], box[3] - box[1]],
                    'Saved crop dimensions disagree with recorded box')
            picture.update(box=box, scale=1, provenance={
                'trace_id': trace['id'], 'node': ni, 'content_index': pi,
                'source': 'nodes[].message.content[].image_url.url; original embedded bytes',
                'command_node': command_node, 'command_sha256': sha(command.encode()),
                'box_evidence': fragments, 'box_coordinate_system': 'original task image pixels',
            })
            event['images'].append(picture)
        events.append(event)
    require(turn == len(trace['calls']), 'Model-call count mismatch')
    if harness:
        require(sum(len(e['images']) for e in events) == len(CROPS[idx]), 'Saved image missing')
        require(any(e['calls'] for e in events), 'Selected harness trace does not use tools')
    else:
        require(turn == 1 and not any(e['calls'] for e in events), 'Baseline is not one-turn null')
    require([r['node'] for r in reminders] == ([18] if harness and idx == 187 else []),
            'Unexpected final-answer reminder')
    if reminders:
        require(message_text(reminders[0]['message']) ==
                'Do not call tools or continue analysis. Using the existing context, respond now with exactly one line: Answer: <letter>',
                'Reminder content changed')
    final = events[-1]
    answer = re.search(r'Answer:\s*([A-D])\b', final['text'])
    require(final['role'] == 'assistant' and not final['calls'] and answer is not None, 'Missing final answer')
    require((answer[1] == trace['task']['data']['answer']) == harness, 'Final answer disagrees with reward')
    return events, reminders, turn


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate existing output without writes')
    args = parser.parse_args()
    plot = json.loads(PLOT.read_text())
    require(plot['sources']['qwen']['27B'] == str(RUN), 'Figure 5 references a different run')
    scores = {}
    with SCORES.open() as stream:
        for idx, value in csv.reader(stream, delimiter='\t'):
            scores.setdefault(int(idx), []).append(float(value))
    current, selected, reads = current_records()
    baseline, null_selected = baseline_records()
    old187 = next(e for e in json.loads(OLD.read_text()) if e['idx'] == 187)
    pending, examples = {}, []
    for idx, (trace_id, selected_index, label, null_id, null_index) in SELECTION.items():
        trace, null = selected[idx], null_selected[idx]
        task, null_task = trace['task']['data'], null['task']['data']
        for key in ('question', 'options', 'answer', 'category', 'domain'):
            require(task[key] == null_task[key], f'Paired task differs: {key}')
        h_rewards = [r['reward'] for r in current[idx]]
        n_rewards = [r['reward'] for r in baseline[idx]]
        require(len(set(r['trace_id'] for r in current[idx])) == 8, 'Duplicate harness rollouts')
        require(len(set(r['trace_id'] for r in baseline[idx])) == 8, 'Duplicate null rollouts')
        require(h_rewards == plot['harness']['27B'][idx], 'Harness rewards differ from Figure 5')
        require(n_rewards == scores[idx] == plot['null']['27B'][idx] and len(n_rewards) == 8,
                'Baseline rewards differ from saved TSV or Figure 5')
        original = list(image_parts(task['prompt']))
        null_original = list(image_parts(null_task['prompt']))
        require(len(original) == len(null_original) == 1 and original[0][2] == null_original[0][2],
                'Paired original image bytes differ')
        input_image = image_asset(original[0][2], f'{idx}-original', 'Original task image', pending)
        events, reminders, turns = extract(trace, idx, True, pending)
        null_events, _, null_turns = extract(null, idx, False, pending)
        if idx == 187:
            require(old187['withoutHarness'] == {'id': null_id, 'turns': null_turns, 'events': null_events},
                    'Existing 187 baseline differs from original saved trace')
        # The harness may present a resized original while tools read full resolution.
        presented = list(image_parts([n['message'] for n in trace['nodes'] if n['message']['role'] == 'user']))
        require(len(presented) == 1, 'Unexpected harness input image count')
        presented_asset = image_asset(presented[0][2], f'{idx}-presented', 'Image presented to the harness model', pending)
        if presented_asset['sha256'] == input_image['sha256']:
            del pending[Path(presented_asset['src']).name]
            presented_asset = copy.deepcopy(input_image)
        harness_provenance = {
            **current[idx][selected_index], 'run_root': str(RUN),
            'records': current[idx], 'rewards': h_rewards, 'successes': sum(h_rewards), 'attempts': 8,
            'selected_event_indices': [e['node'] for e in events],
            'selected_image_indices': [{'node': e['node'], 'content_index': p['provenance']['content_index']}
                                       for e in events for p in e['images']],
            'events_sha256': sha(canonical(events)), 'model_calls': turns,
            'omitted_user_reminders': reminders,
            'reminder_note': ('Final-answer reminder at node 18 omitted from displayed events; all assistant/tool events retained.'
                              if reminders else 'No final-answer reminder.'),
            'presented_input': presented_asset,
            'input_note': 'Original task image displayed; presented_input records actual initial model image bytes. Crops use original pixels.',
            'model': trace['agent']['config']['model'],
            'harness': trace['agent']['config']['harness']['id'],
            'sampling': trace['agent']['config']['sampling'],
        }
        baseline_provenance = {
            **baseline[idx][null_index], 'records': baseline[idx], 'rewards': n_rewards,
            'successes': sum(n_rewards), 'attempts': 8,
            'selected_event_indices': [e['node'] for e in null_events],
            'events_sha256': sha(canonical(null_events)), 'model_calls': null_turns,
            'status': 'Unchanged original null baseline used by current Figure 5; not a new evaluation.',
            'existing_187_withoutHarness_verified': idx == 187,
            'sampling': null['agent']['config']['sampling'],
        }
        example = {k: task[k] for k in ('idx', 'question', 'options', 'answer')}
        example.update(id=trace_id, label=label, nullSuccesses=sum(n_rewards),
                       harnessSuccesses=sum(h_rewards), turns=turns, input=input_image, events=events,
                       withoutHarness={'id': null_id, 'turns': null_turns, 'events': null_events})
        example['provenance'] = {
            'harness': harness_provenance, 'baseline': baseline_provenance,
            'counts_validation': {'plot': file_info(PLOT, True), 'baseline_tsv': file_info(SCORES, True),
                                  'plot_harness_array': f'harness.27B[{idx}]', 'plot_null_array': f'null.27B[{idx}]'},
            'source_reads': reads, 'baseline_file': file_info(BASELINE),
            'source_hash_format': 'record_sha256 hashes exact JSONL bytes including newline; trace/events hashes use sorted compact ASCII JSON.',
            'selection': 'Successful error-free tool-using harness trace paired with a failed same-question null trace; not seed-paired.',
            'display_policy': 'All assistant/tool messages in original order; exact reasoning_content strings; no provider metadata or summaries added.',
            'image_policy': 'Original embedded bytes only; saved tool code never executed; no images reconstructed or re-encoded.',
            'replacement': 'Authorized replacement of historical question 175 trace fe18398f0f5c49798d4ebbab8b91d7e9 (absent from current run) and question 23 (no error-free successful tool trace). Primary example is 193.',
        }
        if idx == 187:
            example['provenance']['baseline']['existing_article_data'] = file_info(OLD, True)
        examples.append(example)
    serialized = (json.dumps(examples, indent=2, ensure_ascii=True) + '\n').encode()
    if args.check:
        require(OUTPUT.read_bytes() == serialized, 'Generated JSON is not reproducible')
        require({p.name for p in ASSETS.iterdir()} == set(pending), 'Unexpected or missing assets')
        for name, payload in pending.items():
            require((ASSETS / name).read_bytes() == payload, f'Asset mismatch: {name}')
    else:
        require(not ASSETS.is_symlink() and not OUTPUT.is_symlink(), 'Output must not be a symlink')
        ASSETS.mkdir(parents=True, exist_ok=True)
        for name, payload in pending.items():
            path = ASSETS / name
            require(not path.is_symlink(), 'Asset must not be a symlink')
            path.write_bytes(payload)
        OUTPUT.write_bytes(serialized)
    print(('Verified' if args.check else 'Wrote'), OUTPUT)
    print(f'{len(pending)} original-byte assets; {sum(map(len, pending.values())):,} asset bytes')
    for example in examples:
        print(f"Question {example['idx']}: null {example['nullSuccesses']}/8; harness {example['harnessSuccesses']}/8; "
              f"{sum(len(e['images']) for e in example['events'])} saved tool images; trace {example['id']}")


if __name__ == '__main__':
    main()
