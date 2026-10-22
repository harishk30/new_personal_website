import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ArticleCitation, { bibtex, references } from './citation';

let container;
let root;
let clipboard;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ArticleCitation />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.getSelection()?.removeAllRanges();
  if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
  else delete navigator.clipboard;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('shows both authors and four deduplicated research references below the citation', () => {
  expect(container.querySelector('code').textContent).toBe(bibtex);
  expect(bibtex).toContain('Krishnakumar, Harish and Müller, Sebastian');
  expect(bibtex).not.toContain('{VLMs}');
  expect(bibtex).toContain('https://www.harishkk.com/writing/visual-composition');
  expect(container.querySelectorAll('.article-references li')).toHaveLength(4);
  expect(new Set(references.map(r => r.url)).size).toBe(4);
  expect([...container.querySelectorAll('.reference-publication')].map(e => e.textContent)).toEqual(['2026.', 'CVPR, 2024.', 'ACCV, 2024.', '2026.']);
  expect([...container.querySelectorAll('h2')].map(h => h.id)).toEqual(['citation', 'footnotes', 'references']);
});

test('shows WorldBench authors without contribution markers', () => {
  const reference = container.querySelector('#ref-yin2026worldbench');
  expect(reference.querySelector('.reference-authors').textContent).toContain('Yida Yin, Harish Krishnakumar,');
  expect(reference.textContent).not.toContain('*');
  expect(reference.textContent).not.toContain('Equal contribution');
});

test('copies the exact BibTeX with an accessible success message', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await act(async () => container.querySelector('button').click());
  expect(writeText).toHaveBeenCalledWith(bibtex);
  expect(container.querySelector('[role="status"]').textContent).toBe('Citation copied.');
});

test('keeps the citation selectable and reports clipboard failures truthfully', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockRejectedValue(new Error('Denied')) } });
  await act(async () => container.querySelector('button').click());
  expect(container.querySelector('[role="status"]').textContent).toContain('Copy unavailable');
  expect(window.getSelection().toString()).toBe(bibtex);
});
