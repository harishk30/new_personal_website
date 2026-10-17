"""Extract exactly one saved Luna trajectory per effort; never run trace code.

uv run --no-project --with pillow python scripts/build-luna-effort-example.py RUN [--check]

Validate all 400 Codex shard summaries against the saved plot arrays, then read
only the five shards containing question 53, stopping after its eight rollouts.
All validation finishes before writes. --check is read-only and byte-for-byte.
"""

import argparse
import base64
import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image


REPO = Path(__file__).resolve().parents[1]
PLOT = REPO.parents[1] / 'plots/worldbench_compositional_20261011/plot_data.json'
OUTPUT = REPO / 'src/writing/visual-composition/luna-example.json'
ASSETS = REPO / 'public/writing/visual-composition/luna'
PREFIX = '/writing/visual-composition/luna/'
RUN_NAME = 'gpt6_luna_effort_sweep_20261009'
QUESTION = 53
EFFORTS = ('none', 'low', 'medium', 'high', 'xhigh')
SELECTED = {
    'none': (0, '6e85b3b27acb455582f335956d5c2b87'),
    'low': (0, 'b0f2b0aa15af4a8c94bb6d0361f21b06'),
    'medium': (4, 'a0a5c8b6e5204e84aa8ea326f5a6eb88'),
    'high': (2, '894688a59f77482dbfdbcee4b10333f1'),
    'xhigh': (1, 'f4c7f992a1af4cf0aa1fea1d1602a3d0'),
}
# Annotations of literal saved commands; image bytes are never reconstructed.
# image node: (label, original-pixel box, scale, producing command node).
CROPS = {
    'none': {}, 'low': {},
    'medium': {7: ('Highlighted control', [410, 180, 915, 310], 2, 4)},
    'high': {5: ('Highlighted control', [400, 180, 920, 320], 2, 2),
             9: ('Instruction banner', [410, 130, 1010, 165], 2, 6)},
    'xhigh': {5: ('Highlighted control', [400, 180, 920, 315], 2, 2),
              9: ('Instruction banner', [400, 130, 800, 171], 3, 6)},
}
REVIEW = {
    29: 'Unread-room counting: original and saved crop visually inspected. Clear markers, but interpretation relies on unread-indicator conventions; higher efforts mostly repeat one crop.',
    47: 'Word above highlighted character: original and saved crop visually inspected. Clear breadcrumb alignment, but higher efforts mostly repeat one crop.',
    52: 'Repository star/fork counts: all 40 traces inspected; no medium/high/xhigh trace returned a tool image, so less illustrative of visual inspection.',
    53: 'Selected: original and saved crops visually inspected. The control handle and toolbar word are legible; high/xhigh inspect both regions separately after none/low choose wrong words.',
    119: 'Header/map alignment: all 40 traces inspected; no medium/high/xhigh trace returned a tool image, so less illustrative of visual inspection.',
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def file_info(path):
    payload = path.read_bytes()
    return {'source': str(path), 'sha256': sha(payload), 'size_bytes': len(payload)}


def reward(trace):
    value = trace['rewards']['correct_answer']['score']
    require(value in (0, 1), 'Nonbinary trace reward')
    return int(value)


def summaries(run):
    plot = json.loads(PLOT.read_text())
    require(plot['sources']['luna'] == str(run / 'progress.json'), 'Plot references another Luna run')
    by_effort, inventory, locations, plot_indices = {}, [], {}, {}
    for effort in EFFORTS:
        rows, keyed = [], {}
        paths = sorted((run / 'arms' / f'codex_{effort}' / 'shards').glob('*/summary.json'))
        require(len(paths) == 80, 'Expected 80 completed shards per effort')
        for path in paths:
            data = json.loads(path.read_text())
            require(data['effort'] == effort and data['harness'] == 'codex', 'Summary arm mismatch')
            require(len(data['task_ids']) == len(data['per_question_rewards']), 'Summary length mismatch')
            inventory.append(file_info(path))
            for idx, values in zip(data['task_ids'], data['per_question_rewards']):
                require(idx not in keyed and len(values) == 8 and all(v in (0, 1) for v in values),
                        'Duplicate task, invalid reward, or missing rollout')
                if idx == QUESTION:
                    locations[effort] = path
                    plot_indices[effort] = len(rows)
                keyed[idx] = values
                rows.append(values)
        require(set(keyed) == set(range(2000)), 'Incomplete effort coverage')
        arm = next(a for a in plot['luna']['arms'] if a['harness'] == 'codex' and a['effort'] == effort)
        require(rows == arm['per_question_rewards'], 'Ordered 2000 x 8 outcomes differ from plot')
        require(arm['questions'] == 2000 and arm['rollouts'] == 16000, 'Plot count mismatch')
        require(abs(sum(map(sum, rows)) / 16000 - arm['pass_at_1']) < 1e-12, 'Pass@1 mismatch')
        require(abs(sum(any(row) for row in rows) / 2000 - arm['pass_at_8']) < 1e-12, 'Pass@8 mismatch')
        by_effort[effort] = keyed
    return by_effort, locations, plot_indices, {
        'plot': file_info(PLOT), 'summary_count': len(inventory),
        'summary_inventory_sha256': sha(canonical(inventory)),
        'summary_order': 'Efforts none/low/medium/high/xhigh, then sorted absolute summary paths; hashes use sorted compact ASCII JSON.',
        'questions_per_effort': 2000, 'rollouts_per_question': 8,
        'validated_outcomes': 80000, 'validation': 'Exact ordered arrays, Pass@1, and Pass@8 match the saved plot for all five Codex arms.',
    }


def read_records(source, effort):
    records, selected, offset = [], None, 0
    with source.open('rb') as stream:
        for line in range(1, 201):
            raw = stream.readline(64 * 1024**2 + 1)
            require(raw.endswith(b'\n') and len(raw) <= 64 * 1024**2, 'Missing or oversized record')
            require(offset + len(raw) <= 1024**3, 'Shard read limit exceeded')
            for position, trace in enumerate(json.loads(raw)['traces']):
                if trace['task']['data']['idx'] != QUESTION:
                    continue
                index = len(records)
                records.append({'trace_id': trace['id'], 'source': str(source), 'line': line,
                                'byte_offset': offset, 'record_bytes': len(raw),
                                'trace_index_in_record': position, 'rollout_index': index,
                                'record_sha256': sha(raw), 'trace_sha256': sha(canonical(trace)),
                                'reward': reward(trace)})
                require(trace['agent']['config']['sampling']['reasoning_effort'] == effort,
                        'Actual trace effort differs from its arm')
                if index == SELECTED[effort][0]:
                    require(trace['id'] == SELECTED[effort][1], 'Selected trace ID changed')
                    selected = trace
            offset += len(raw)
            if len(records) == 8:
                break
    require(len(records) == len({r['trace_id'] for r in records}) == 8, 'Expected eight unique traces')
    require(selected is not None, 'Selected trajectory missing')
    return selected, records, {'lines_read': line, 'bytes_read': offset,
                                'source_size_bytes': source.stat().st_size}


def text_content(message):
    content = message.get('content') or ''
    if isinstance(content, str):
        return content
    require(all(p['type'] in ('text', 'image_url') for p in content), 'Unknown message content')
    return '\n'.join(p['text'] for p in content if p['type'] == 'text')


def tool_calls(message):
    return [{'name': c['name'], 'arguments': json.loads(c['arguments'])
             if isinstance(c['arguments'], str) else c['arguments']}
            for c in message.get('tool_calls') or []]


def image_parts(message):
    content = message.get('content') or []
    for index, part in enumerate(content if isinstance(content, list) else []):
        if part['type'] == 'image_url':
            yield index, part['image_url']['url']


def image_asset(url, name, label, pending, provenance):
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
            'sha256': sha(payload), 'reconstructed': False, 'provenance': provenance}


def extract(trace, effort, source, pending):
    require(trace['ok'] and trace['is_completed'] and not trace['errors'], 'Incomplete or failed trace')
    require(trace['agent']['config']['harness']['id'] == 'codex', 'Wrong harness')
    events, omitted, missing_reasoning, turn = [], [], [], 0
    for ni, node in enumerate(trace['nodes']):
        message = node['message']
        if message['role'] not in ('assistant', 'tool'):
            if message['role'] == 'user' and turn:
                omitted.append(ni)
            continue
        turn += int(message['role'] == 'assistant')
        reasoning = message.get('reasoning_content')
        require(reasoning is None or isinstance(reasoning, str), 'Unexpected reasoning type')
        if message['role'] == 'assistant' and reasoning is None:
            missing_reasoning.append(ni)
        event = {'node': ni, 'role': message['role'], 'turn': turn, 'text': text_content(message),
                 'reasoning': reasoning or '', 'calls': tool_calls(message), 'images': []}
        if event['role'] == 'tool' and event['text']:
            require('Process exited with code 0' in event['text'], 'Nonzero or unconfirmed tool exit')
            require(not re.search(r'Traceback|Error:|command not found|cannot access|syntax error', event['text']),
                    'Tool output contains an error')
        for pi, url in image_parts(message):
            require(event['role'] == 'tool' and ni in CROPS[effort], 'Unexpected image return')
            label, box, scale, command_node = CROPS[effort][ni]
            command = tool_calls(trace['nodes'][command_node]['message'])[0]['arguments']['cmd']
            size = [(box[2] - box[0]) * scale, (box[3] - box[1]) * scale]
            fragment = f".crop(({','.join(map(str, box))})).resize(({','.join(map(str, size))}))"
            require(fragment in command, 'Saved crop command changed')
            picture = image_asset(url, f'q53-{effort}-node{ni}-{pi}', label, pending, {
                'source': str(source), 'trace_id': trace['id'], 'node': ni, 'content_index': pi,
                'command_node': command_node, 'command_sha256': sha(command.encode()),
                'box_evidence': fragment, 'box_coordinate_system': 'original image pixels',
            })
            require([picture['width'], picture['height']] == size, 'Crop size mismatch')
            picture.update(box=box, scale=scale)
            event['images'].append(picture)
        events.append(event)
    require(not omitted, 'Selected trace contains a final-answer reminder')
    require(turn == len(trace['calls']), 'Assistant turn/model-call mismatch')
    require(sum(len(e['images']) for e in events) == len(CROPS[effort]), 'Missing saved tool image')
    final = events[-1]
    answer = re.search(r'Answer:\s*([A-D])\b', final['text'])
    require(final['role'] == 'assistant' and not final['calls'] and answer is not None, 'Missing final answer')
    require((answer[1] == trace['task']['data']['answer']) == bool(reward(trace)), 'Answer/reward mismatch')
    return events, turn, missing_reasoning


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run', type=Path)
    parser.add_argument('--check', action='store_true', help='Check generated bytes without writing')
    args = parser.parse_args()
    run = args.run.resolve()
    require(run.name == RUN_NAME, 'Only the latest saved Luna sweep is supported')
    all_rewards, locations, plot_indices, aggregate_validation = summaries(run)
    pending, variants, provenance, example, original_url, model = {}, [], [], None, None, None
    for effort in EFFORTS:
        summary = locations[effort]
        source = summary.parent / 'eval_output/traces.jsonl'
        trace, records, read_info = read_records(source, effort)
        rewards = [r['reward'] for r in records]
        require(rewards == all_rewards[effort][QUESTION], 'Actual eight rewards differ from summary/plot')
        task = trace['task']['data']
        originals = [(mi, pi, url) for mi, message in enumerate(task['prompt'])
                     for pi, url in image_parts(message)]
        require(len(originals) == 1, 'Expected one original task image')
        mi, pi, url = originals[0]
        if example is None:
            original_url = url
            model = trace['agent']['config']['model']
            example = {k: task[k] for k in ('idx', 'question', 'options', 'answer')}
            example.update(defaultVariant='high', input=image_asset(url, 'q53-original',
                           'GUI builder with highlighted control and instruction banner', pending, {
                               'source': str(source), 'trace_id': trace['id'],
                               'location': 'task.data.prompt', 'message_index': mi, 'content_index': pi,
                           }))
            require((example['input']['width'], example['input']['height']) == (1298, 783), 'Original dimensions changed')
        require(url == original_url, 'Original image bytes differ across efforts')
        require(all(task[k] == example[k] for k in ('idx', 'question', 'options', 'answer')), 'Task changed across efforts')
        require(trace['agent']['config']['model'] == model, 'Model changed across efforts')
        presented = [(ni, pi, url) for ni, n in enumerate(trace['nodes']) if n['message']['role'] == 'user'
                     for pi, url in image_parts(n['message'])]
        require(len(presented) == 1 and presented[0][2] == original_url, 'Presented image differs from original')
        events, turns, missing_reasoning = extract(trace, effort, source, pending)
        variants.append({'key': effort, 'label': effort, 'successes': sum(rewards),
                         'correct': bool(reward(trace)), 'events': events, 'showTools': True})
        provenance.append({**records[SELECTED[effort][0]], 'effort': effort,
                           'records': records, 'rewards': rewards, 'successes': sum(rewards), 'attempts': 8,
                           'summary': file_info(summary), 'plot_question_index': plot_indices[effort],
                           'model_calls': turns, 'read_bounds': read_info,
                           'selected_event_indices': [e['node'] for e in events],
                           'events_sha256': sha(canonical(events)),
                           'selected_image_indices': [{'node': e['node'], 'content_index': p['provenance']['content_index']}
                                                      for e in events for p in e['images']],
                           'input_image_sha256': example['input']['sha256'],
                           'presented_image_node': presented[0][0], 'presented_image_content_index': presented[0][1],
                           'assistant_nodes_without_saved_reasoning': missing_reasoning,
                           'sampling': trace['agent']['config']['sampling'],
                           'tool_errors': [], 'omitted_user_reminders': []})
    require([v['key'] for v in variants] == list(EFFORTS), 'Exactly one variant per effort is required')
    example['variants'] = variants
    example['provenance'] = {
        'question_id': QUESTION, 'run': str(run), 'model': model,
        'selection': 'Question 53 selected after screening all 2000 questions across five effort summaries and inspecting all 40 saved rollouts for each of questions 29, 47, 52, 53, and 119. Originals and tool crops visually reviewed for 29, 47, and 53.',
        'selection_rule': 'First saved rollout for none/low; first error-free successful visual trace for medium; first error-free successful two-image trace for high/xhigh. Selected zero-based indices: 0, 0, 4, 2, 1.',
        'selection_caveat': 'Illustrative, outcome-aware selection, not random or seed-paired. The 8-rollout counts include failures and tool-error traces. This example is not evidence of a monotonic effort effect or of tool use causing correctness. High scores 7/8, below medium and xhigh at 8/8.',
        'rationale': 'None answers code and low answers Use without tools. Medium inspects the highlighted control; high and xhigh inspect both the control and instruction banner before answering toolbar. The saved images make the coordinate relationship inspectable.',
        'reasoning_policy': 'Exact saved reasoning_content strings only; missing reasoning is displayed as empty, never invented. None and low have no saved reasoning_content. No provider metadata appended to displayed prose.',
        'images': 'Original embedded bytes; no trace commands executed, no crops reconstructed, no image re-encoding. All five efforts received byte-identical original images.',
        'hash_format': 'Record SHA256 covers exact JSONL bytes including newline; trace/events/inventory hashes cover sorted compact ASCII JSON.',
        'shortlist': [{'question_id': idx, 'successes_by_effort': {e: int(sum(all_rewards[e][idx])) for e in EFFORTS},
                       'review': note} for idx, note in REVIEW.items()],
        'aggregate_validation': aggregate_validation, 'traces': provenance,
    }
    payload = (json.dumps(example, indent=2, ensure_ascii=True) + '\n').encode()
    if args.check:
        require(OUTPUT.read_bytes() == payload, 'Generated JSON is not reproducible')
        require({p.name for p in ASSETS.glob('q53-*')} == set(pending), 'Missing or unexpected question-53 asset')
        for name, data in pending.items():
            require((ASSETS / name).read_bytes() == data, f'Asset mismatch: {name}')
    else:
        require(not OUTPUT.is_symlink() and not ASSETS.is_symlink(), 'Output must not be a symlink')
        ASSETS.mkdir(parents=True, exist_ok=True)
        for name, data in pending.items():
            path = ASSETS / name
            require(not path.is_symlink(), 'Asset must not be a symlink')
            path.write_bytes(data)
        OUTPUT.write_bytes(payload)
    print(('Verified' if args.check else 'Wrote'), OUTPUT)
    print(f'Exactly five variants; {len(pending)} original-byte assets ({sum(map(len, pending.values())):,} bytes).')
    print('Validated 400 summaries / 80,000 outcomes against plot arrays, and 40 actual question-53 traces against summaries.')
    for variant, source in zip(variants, provenance):
        print(variant['key'], f"{variant['successes']}/8", 'selected', source['rollout_index'],
              source['trace_id'], 'images', sum(len(e['images']) for e in variant['events']))


if __name__ == '__main__':
    main()
