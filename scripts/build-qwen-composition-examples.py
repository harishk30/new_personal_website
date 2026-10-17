"""Extract two saved Qwen examples, without inference or executing trace code.

Run with uv run --no-project --with pillow python
 scripts/build-qwen-composition-examples.py [--check].
Only two current-run shards are streamed (at most 200 lines / 1 GiB each).
The unchanged 36 GiB baseline is read at 16 verified record offsets, not scanned.
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

from PIL import Image, ImageChops


REPO = Path(__file__).resolve().parents[1]
SKYRL = REPO.parents[1]
EVALS = Path('/scratch/gpfs/ZHUANGL/hk4638/evals/worldbench')
RUN = EVALS / 'qwen36-27b_codex_execution_only_first100_pass8_20261008'
BASELINE = EVALS / 'qwen36_27b_pass8_null_thinking_official_20260819_repaired_missing5_20260820/traces.jsonl'
SCORES = SKYRL / 'analysis/worldbench/derived_scores/worldbench_27b_task_scores.tsv'
PLOT = SKYRL / 'plots/worldbench_compositional_20261011/plot_data.json'
OUTPUT = REPO / 'src/writing/visual-composition/qwen-examples.json'
ASSETS = REPO / 'public/writing/visual-composition/qwen'
PREFIX = '/writing/visual-composition/qwen/'
SELECTION = {
    1809: ('6566a690e8cf4cbc8a7a7bf219866913', 7, 'Chart labels',
           '0a6898c3d3c54b7697dced982e501202', 0),
    1625: ('9cd2b92b8cce474aaa8b4def48e5fe53', 6, 'Text spacing',
           'a8b4c80af42242dc80157943c0c12ce5', 0),
}
# One-based source lines and zero-based byte offsets from a bounded inventory.
# Each seek is validated against task ID, rollout count, rewards, and selected ID.
BASELINE_INDEX = {
    1809: [(14471, 36370686622), (14472, 36370895008), (14478, 36375070277),
           (14490, 36388862411), (14498, 36407689749), (14523, 36433443287),
           (14597, 36500857314), (14605, 36504647305)],
    1625: [(12978, 33864397237), (12979, 33864702908), (12981, 33865492106),
           (12983, 33866220699), (12989, 33891660410), (13010, 33967191473),
           (13053, 34018574481), (13108, 34059548623)],
}
# These are annotations of literal saved commands, never recreated crops.
# node: (label, box, command node, exact command fragment proving the box).
CROPS = {
    1809: {
        5: ('Chart labels', [0, 385, 708, 453], 2,
            ['crop_y = int(height * 0.85)',
             'cropped_img = img.crop((0, crop_y, width, height))']),
    },
    1625: {
        5: ('Paystub header', [0, 0, 550, 43], 2,
            ['top_crop = img.crop((0, 0, w, int(h * 0.1)))']),
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
    for shard, ids in [('task_1800_1824', (1809,)), ('task_1625_1649', (1625,))]:
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
    require(not reminders, 'Selected example must not need a final-answer reminder')
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
        with Image.open(io.BytesIO(pending[Path(input_image['src']).name])) as original_image:
            for event in events:
                for picture in event['images']:
                    with Image.open(io.BytesIO(pending[Path(picture['src']).name])) as crop_image:
                        expected = original_image.convert('RGB').crop(picture['box'])
                        require(ImageChops.difference(expected, crop_image.convert('RGB')).getbbox() is None,
                                'Saved crop pixels do not match the original task image and recorded box')
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
            'reminder_note': 'No final-answer reminder.',
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
            'image_policy': 'Original embedded bytes only; saved tool code never executed; no images reconstructed or re-encoded. Every saved crop is pixel-identical to its box in the decoded original.',
            'replacement': 'Current-run chart labels and measured text spacing replace lighthouse/dish counting, occluded door digits, subtle window corners, and blurry whiteboard marks after source and visual review. Primary example is 1809. Only two examples retained because their visual evidence is clear.',
        }
        examples.append(example)
    serialized = (json.dumps(examples, indent=2, ensure_ascii=True) + '\n').encode()
    if args.check:
        require(OUTPUT.read_bytes() == serialized, 'Generated JSON is not reproducible')
        require({p.name for p in ASSETS.iterdir()} == set(pending), 'Unexpected or missing assets')
        for name, payload in pending.items():
            require((ASSETS / name).read_bytes() == payload, f'Asset mismatch: {name}')
    else:
        require(not ASSETS.is_symlink() and not OUTPUT.is_symlink(), 'Output must not be a symlink')
        previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else []
        def asset_names(value):
            if isinstance(value, dict):
                for key, item in value.items():
                    if key == 'src' and isinstance(item, str) and item.startswith(PREFIX):
                        yield Path(item).name
                    else:
                        yield from asset_names(item)
            elif isinstance(value, list):
                for item in value:
                    yield from asset_names(item)
        ASSETS.mkdir(parents=True, exist_ok=True)
        for name, payload in pending.items():
            path = ASSETS / name
            require(not path.is_symlink(), 'Asset must not be a symlink')
            path.write_bytes(payload)
        # Only remove assets explicitly registered by the replaced example manifest.
        for name in set(asset_names(previous)) - set(pending):
            path = ASSETS / name
            require(not path.is_symlink(), 'Stale asset must not be a symlink')
            path.unlink(missing_ok=True)
        OUTPUT.write_bytes(serialized)
    print(('Verified' if args.check else 'Wrote'), OUTPUT)
    print(f'{len(pending)} original-byte assets; {sum(map(len, pending.values())):,} asset bytes')
    for example in examples:
        print(f"Question {example['idx']}: null {example['nullSuccesses']}/8; harness {example['harnessSuccesses']}/8; "
              f"{sum(len(e['images']) for e in example['events'])} saved tool images; trace {example['id']}")


if __name__ == '__main__':
    main()
