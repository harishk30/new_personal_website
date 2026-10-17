import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EncoderDiagram, HarnessComparison } from './diagrams';
import traces from './qwen-examples.json';
import { reasoningMarkdown } from '../improving-vlms/trace-format';

jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);

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
  expect(example.events.flatMap(event=>event.calls).filter(call=>call.name==='view_image')).toHaveLength(2);
  expect(example.events.flatMap(event=>event.images)).toHaveLength(2);
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
