import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EncoderDiagram, HarnessComparison } from './diagrams';
import traces from './qwen-examples.json';
import { reasoningMarkdown } from '../improving-vlms/trace-format';
import { Trace } from '../improving-vlms/traces';

jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);
jest.mock('../improving-vlms/ui', () => {
  const Group = ({ children }) => <div>{children}</div>;
  return Object.fromEntries(['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent', 'Collapsible', 'CollapsibleTrigger', 'CollapsibleContent', 'Dialog', 'DialogTrigger', 'DialogContent', 'DialogTitle'].map(name => [name, Group]));
});

const example = traces[0];
let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('keeps reasoning and crop images in source order without command-only steps', () => {
  act(() => root.render(<HarnessComparison />));
  const lane = container.querySelectorAll('.concept-lane')[1];
  const steps = [...lane.querySelectorAll('.sequence-strip button')];
  expect(steps[0].getAttribute('title')).toContain('Original image and question');
  const expectedGroups = [];
  let group = null;
  for (const event of example.events) {
    if (event.role === 'assistant' && event.reasoning) {
      if (!group) { group = []; expectedGroups.push(group); }
      group.push(event.reasoning);
      if (event.calls.length && event.text) group.push(event.text);
    }
    if (event.images.length) group = null;
  }
  [...lane.querySelectorAll('.reason-segment')].forEach((button, index) => {
    act(() => button.click());
    expect([...container.querySelectorAll('.saved-model-text')].map(node=>node.textContent))
      .toEqual(expectedGroups[index].map(reasoningMarkdown));
  });

  const images = example.events.flatMap(event => event.images);
  [...lane.querySelectorAll('.inspection-segment')].forEach((button, index) => {
    act(() => button.click());
    const panel = container.querySelector('.example-disclosure');
    expect(panel.querySelector('.image-open img').getAttribute('src')).toBe(images[index].src);
    expect(panel.querySelector('.image-open').getAttribute('aria-label')).toContain(images[index].label);
    expect(panel.querySelector('.example-text').textContent).toBe('');
  });
});

test('the chosen harness trace completes without tool errors or final-answer recovery', () => {
  expect(example.events.some(event=>event.role==='user')).toBe(false);
  for(const event of example.events) {
    expect(event.reasoning).not.toMatch(/<tool_call>|<function=/);
    if(event.role==='tool' && event.text) {
      expect(event.text).toContain('Process exited with code 0');
      expect(event.text).not.toMatch(/Traceback|Error:/);
    }
  }
  expect(example.events.flatMap(event=>event.calls).filter(call=>call.name==='view_image')).toHaveLength(1);
  expect(example.events.flatMap(event=>event.images)).toHaveLength(1);
});

test('all panels exclude tool code, stdout, and reminders while retaining final replies', () => {
  act(() => root.render(<HarnessComparison />));
  for (const button of container.querySelectorAll('.sequence-segment')) {
    act(() => button.click());
    const panel = container.querySelector('.example-disclosure');
    expect(panel.querySelector('pre, code, details, .tool-status, .tool-output')).toBeNull();
    expect(panel.textContent).not.toMatch(/<tool_call>|exec_command|view_image|Chunk ID:|Do not call tools/);
  }
  const answers = container.querySelectorAll('.answer-segment');
  expect(answers[0].classList.contains('answer-incorrect')).toBe(true);
  expect(answers[1].classList.contains('answer-correct')).toBe(true);
  act(() => answers[0].click());
  expect(container.querySelector('.saved-model-text').textContent).toBe(example.withoutHarness.events[0].text);
  act(() => answers[1].click());
  expect(container.querySelector('.saved-model-text').textContent).toBe(example.events.at(-1).text);
});

test('centers the language model and answer on the combined token connector', () => {
  act(() => root.render(<EncoderDiagram />));
  expect(container.querySelector('path[d="M427 112 H476"]')).not.toBeNull();
  expect(container.querySelector('path[d="M604 112 H649"]')).not.toBeNull();
  expect(container.querySelector('path[d="M501 72 H489 V152 H501 M581 72 H593 V152 H581"]')).not.toBeNull();
});

test('optional commands preserve reasoning, image events, and execution failures', () => {
  const testExample = {
    question: 'Which side?', options: { A: 'Left', B: 'Right' }, answer: 'A',
    input: { src: '/input.png', label: 'Original', width: 10, height: 10 },
    variants: [{ key: 'high', label: 'high', successes: 2, correct: true, events: [
      { node: 1, role: 'assistant', turn: 1, reasoning: 'Inspect the left region.', text: '', calls: [{ name: 'exec_command', arguments: { cmd: 'python inspect.py' } }], images: [] },
      { node: 2, role: 'tool', turn: 1, reasoning: '', text: 'Process exited with code 1\nOutput:\nError: missing file', calls: [], images: [] },
      { node: 3, role: 'assistant', turn: 2, reasoning: '', text: 'Answer: A', calls: [], images: [] },
    ] }],
  };
  act(() => root.render(<Trace example={testExample} compact toolDetailsToggle />));
  expect(container.textContent).toContain('Inspect the left region.');
  expect(container.textContent).toContain('Error: missing file');
  expect(container.textContent).not.toContain('python inspect.py');
  act(() => container.querySelector('input[type="checkbox"]').click());
  expect(container.textContent).toContain('python inspect.py');
  expect(container.textContent).toContain('Error: missing file');
  expect(container.querySelector('.trace-verdict').textContent).toBe('Correct');
});
