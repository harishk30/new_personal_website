import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Article from './Article';

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
    expect(container.querySelectorAll('.writing-notes')).toHaveLength(3);
    expect(container.querySelectorAll('.writing-notes li')).toHaveLength(11);
    expect(container.textContent).not.toContain('Harness provides transformations that can make correct solution available');
    expect(container.textContent).toContain('A cost- or token-matched comparison');
  } finally {
    act(() => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
