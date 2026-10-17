"""Extract saved same-question traces; never execute rollout commands or call models."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('run', type=Path)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    assets = repo / 'public/writing/visual-composition/luna'
    assets.mkdir(parents=True, exist_ok=True)
    example = None
    variants = []
    provenance = []
    original_hash = None
    for effort, selected_index in [('none', 1), ('low', 1), ('medium', 1), ('high', 1), ('xhigh', 1), ('xhigh', 3)]:
        key = effort if selected_index == 1 else effort + '-crops'
        shard = args.run / 'arms' / f'codex_{effort}' / 'shards/remaining_0000'
        source = shard / 'eval_output/traces.jsonl'
        records = []
        with source.open() as stream:
            for line_number, line in enumerate(stream, 1):
                for trace in json.loads(line)['traces']:
                    if trace['task']['data']['idx'] == 16:
                        records.append((trace, line_number, hashlib.sha256(line.encode()).hexdigest()))
                if len(records) == 8:
                    break
        assert len(records) == 8
        rewards = [t['rewards']['correct_answer']['score'] for t, _, _ in records]
        summary = json.loads((shard / 'summary.json').read_text())
        assert rewards == summary['per_question_rewards'][summary['task_ids'].index(16)]
        trace, line_number, record_hash = records[selected_index]
        if selected_index == 3:
            assert rewards[selected_index] == 1
            for node in trace['nodes']:
                message = node['message']
                if message['role'] == 'tool' and isinstance(message.get('content'), str):
                    assert 'Process exited with code 0' in message['content']
        assert trace['agent']['config']['sampling']['reasoning_effort'] == effort
        task = trace['task']['data']

        def image_asset(url, name, label):
            header, encoded = url.split(',', 1)
            assert header in ['data:image/png;base64', 'data:image/jpeg;base64']
            payload = base64.b64decode(encoded, validate=True)
            with Image.open(io.BytesIO(payload)) as im:
                width, height = im.size
                im.verify()
            filename = name + ('.png' if 'png' in header else '.jpg')
            (assets / filename).write_bytes(payload)
            return {'src': '/writing/visual-composition/luna/' + filename,
                    'label': label, 'width': width, 'height': height,
                    'sha256': hashlib.sha256(payload).hexdigest()}

        original = next(p['image_url']['url'] for m in task['prompt'] for p in m['content']
                        if isinstance(p, dict) and p.get('type') == 'image_url')
        original_asset = image_asset(original, 'original', 'Original chat-window screenshot')
        if example is None:
            original_hash = original_asset['sha256']
            example = {k: task[k] for k in ['question', 'options', 'answer']}
            example.update(input=original_asset, defaultVariant='high')
        assert original_asset['sha256'] == original_hash
        assert all(task[k] == example[k] for k in ['question', 'options', 'answer'])
        events = []
        turn = 0
        for i, node in enumerate(trace['nodes']):
            message = node['message']
            if message['role'] not in ['assistant', 'tool']:
                continue
            if message['role'] == 'assistant':
                turn += 1
            content = message.get('content') or ''
            text = content if isinstance(content, str) else '\n'.join(p['text'] for p in content if p.get('type') == 'text')
            images = []
            if isinstance(content, list):
                for j, part in enumerate(content):
                    if part.get('type') == 'image_url':
                        images.append(image_asset(part['image_url']['url'], f'{key}-node{i}-{j}',
                                                  f'Saved image inspected at {effort} effort, turn {turn}'))
            reasoning = message.get('reasoning_content') or ''
            assert isinstance(reasoning, str)
            calls = [{'name': c['name'], 'arguments': json.loads(c['arguments']) if isinstance(c['arguments'], str) else c['arguments']}
                     for c in message.get('tool_calls', [])]
            events.append({'node': i, 'role': message['role'], 'turn': turn,
                           'text': text, 'reasoning': reasoning, 'calls': calls, 'images': images})
        assert turn == len(trace['calls'])
        label = ('xhigh: crops' if selected_index == 3 else 'xhigh: lookup') if effort == 'xhigh' else effort
        variants.append({'key': key, 'label': label, 'successes': int(sum(rewards)),
                         'correct': bool(rewards[selected_index]), 'events': events, 'showTools': True})
        provenance.append({'effort': effort, 'trace_id': trace['id'], 'source': str(source),
                           'line': line_number, 'record_sha256': record_hash,
                           'rollout_index': selected_index, 'rewards': rewards, 'model_calls': turn})
    example['variants'] = variants
    example['provenance'] = {'question_id': 16, 'selection': 'Second saved rollout at each effort, plus the fourth xhigh rollout selected as an error-free successful crop example. Not seed-paired.',
                             'images': 'Original embedded bytes; no commands executed or crops recreated.',
                             'traces': provenance}
    (repo / 'src/writing/visual-composition/luna-example.json').write_text(json.dumps(example, indent=2) + '\n')
    print('Validated 5 efforts x 8 rewards; extracted 6 saved trajectories and original image bytes.')
    print('Reasoning characters:', {v['key']: sum(len(e['reasoning']) for e in v['events']) for v in variants})


if __name__ == '__main__':
    main()
