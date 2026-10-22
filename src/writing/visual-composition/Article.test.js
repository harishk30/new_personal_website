import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Article from './Article';
import { harnessPrompt, harnessSentence } from './footnotes';

jest.mock('react-router-dom', () => ({ Link: ({ to, children }) => <a href={to}>{children}</a> }), { virtual: true });
jest.mock('../../ThemeToggle', () => ({ __esModule: true, default: () => null, useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));
jest.mock('./diagrams', () => ({ EncoderDiagram: () => null, HarnessComparison: () => null }));
jest.mock('./plots', () => ({ ScalingPlot: () => null, CategoryPlot: () => null, QwenHarnessPlot: () => null, LunaEffortPlot: () => null, LunaRescuePlot: () => null, LunaBehaviorPlot: () => null }));
jest.mock('./examples', () => ({ QwenExamples: () => <div data-testid="qwen" />, LunaExample: () => <div data-testid="luna" /> }));

test('article keeps category bullets and both trace widgets while suppressing figure instructions', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    act(() => root.render(<Article />));
    expect(container.querySelectorAll('.category-list li')).toHaveLength(4);
    expect(container.querySelectorAll('.category-list li strong')).toHaveLength(4);
    expect(container.querySelector('[data-testid="qwen"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="luna"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/Use two aligned|embed in trajectory|Generate a version/);
    expect(container.textContent).toContain('a harness enables a model to go from a complex state');
    expect(container.querySelectorAll('.writing-notes')).toHaveLength(0);
    expect(container.textContent).not.toContain('To write');
    expect(container.textContent).not.toContain('Harness provides transformations that can make correct solution available');
    expect(container.textContent).not.toContain('A cost- or token-matched comparison');
    expect(container.textContent).toContain('At xhigh reasoning, Pass@1 rises from 57.1% to 63.5%');
    expect(container.textContent).toContain('training specifically for reliable visual decomposition');
    expect(container.textContent).toContain('five different reasoning levels');
    expect(container.textContent).not.toContain('four different reasoning levels');
    expect(container.querySelector('#acknowledgements')?.tagName).toBe('H2');
    expect(container.querySelector('a[href="#acknowledgements"]')).not.toBeNull();
    const marker = container.querySelector('#fnref-harness');
    expect(marker.textContent).toBe('1');
    expect(marker.closest('p').textContent).toContain(harnessSentence);
    expect(marker.getAttribute('href')).toBe('#fn-harness');
    const note = container.querySelector('#fn-harness');
    expect(note.textContent).toContain('Codex CLI 0.146.1');
    expect(note.querySelector('details').open).toBe(false);
    expect(note.querySelector('pre').textContent).toBe(harnessPrompt);
    expect(note.querySelector('a').getAttribute('href')).toBe('#fnref-harness');
  } finally {
    act(() => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
