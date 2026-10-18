import data from './chart-data.json';
import { rescueConsistency } from './rescue-consistency';
import luna from './luna-example.json';
import source from './source-document.json';
import qwenExamples from './qwen-examples.json';

test('Qwen examples come from the plotted harness run and retain matched baseline counts', () => {
  expect(qwenExamples.map(e => e.idx)).toEqual([1809, 795]);
  for (const example of qwenExamples) {
    expect(example.provenance.harness.run_root).toContain('qwen36-27b_codex_execution_only_first100_pass8_20261008');
    for (const [arm, count] of [['harness', example.harnessSuccesses], ['baseline', example.nullSuccesses]]) {
      const evidence = example.provenance[arm];
      expect(evidence.rewards).toHaveLength(8);
      expect(evidence.rewards.reduce((a, b) => a + b, 0)).toBe(count);
      expect(evidence.reward).toBe(arm === 'harness' ? 1 : 0);
    }
    for (const image of [example.input, ...example.events.flatMap(e => e.images)]) {
      expect(image.src).toMatch(/^\/writing\/visual-composition\/qwen\//);
      expect(image.reconstructed).toBe(false);
    }
  }
});

test('Luna shows exactly one error-free trace per effort with verified aggregate counts', () => {
  expect(luna.variants.map(v => v.key)).toEqual(['none', 'low', 'medium', 'high', 'xhigh']);
  expect(luna.provenance.question_id).toBe(53);
  for (const [i, variant] of luna.variants.entries()) {
    const p = luna.provenance.traces[i];
    expect(p.rewards).toHaveLength(8);
    expect(variant.successes).toBe(p.rewards.reduce((a, b) => a + b, 0));
    expect(variant.correct).toBe(Boolean(p.rewards[p.rollout_index]));
    expect(variant.events.filter(e => e.role === 'assistant')).toHaveLength(p.model_calls);
    for (const event of variant.events.filter(e => e.role === 'tool' && e.text)) {
      expect(event.text).toContain('Process exited with code 0');
      expect(event.text).not.toMatch(/Traceback|No such file|Error:/);
    }
  }
  for (const effort of ['medium', 'high', 'xhigh']) {
    const variant = luna.variants.find(v => v.key === effort);
    expect(variant.correct).toBe(true);
    expect(variant.events.flatMap(e => e.images).length).toBeGreaterThan(0);
  }
});

test('article source retains category bullets and the requested introduction wording', () => {
  const categories = source.paragraphs.filter(p => p.bullet && data.categories.some(c => p.elements[0].textRun?.content === c.label));
  expect(categories).toHaveLength(4);
  expect(categories.every(p => p.elements[0].textRun.textStyle.bold)).toBe(true);
  const text = source.paragraphs.flatMap(p => p.elements.map(e => e.textRun?.content || '')).join('');
  expect(text).toContain('This is because a harness enables a model to go from a complex state');
});

test('every category and model has bounded intervals for both metrics', () => {
  expect(data.categories.reduce((n, c) => n + c.problems, 0)).toBe(2000);
  for (const category of data.categories) {
    expect(category.values).toHaveLength(4);
    for (const row of category.values) for (const key of ['pass1', 'pass8']) {
      const error = row[key + 'Error'];
      expect(error).toHaveLength(2);
      expect(error.every(e => Number.isFinite(e) && e > 0)).toBe(true);
      expect(row[key] - error[0]).toBeGreaterThanOrEqual(0);
      expect(row[key] + error[1]).toBeLessThanOrEqual(100);
    }
  }
});

test('rescue threshold curves include zeros in denominators and are non-increasing', () => {
  const curves = rescueConsistency(data.rescued);
  expect(curves.map(r => r.threshold)).toEqual([1,2,3,4,5,6,7,8]);
  for (const r of data.rescued) {
    expect(curves[0][r.effort]).toBeCloseTo(r.gained / r.total * 100, 10);
    expect(curves[7][r.effort]).toBeCloseTo(r.values[8].count / r.total * 100, 10);
    for (let i=1; i<curves.length; i++) expect(curves[i][r.effort]).toBeLessThanOrEqual(curves[i-1][r.effort]);
  }
});

test('all Qwen histogram rows represent 2000 matched questions and reproduce the plotted metrics', () => {
  for (const q of data.qwen) {
    for (const key of ['null', 'codex']) {
      expect(q.histogram.reduce((n, r) => n + r[key], 0)).toBe(2000);
      const p1 = q.histogram.reduce((n, r) => n + r.successes * r[key], 0) / 160;
      const p8 = (2000 - q.histogram[0][key]) / 20;
      expect(q.metrics[0][key]).toBeCloseTo(p1, 10);
      expect(q.metrics[1][key]).toBeCloseTo(p8, 10);
    }
    expect(q.gained - q.lost).toBe(q.histogram[0].null - q.histogram[0].codex);
  }
});

test('Luna rescues retain failures and pair against the same effort baseline', () => {
  expect(data.efforts.map(r => r.effort)).toEqual(['none', 'low', 'medium', 'high', 'xhigh']);
  for (const r of data.rescued) {
    const effort = data.efforts.find(e => e.effort === r.effort);
    expect(r.values.reduce((n, v) => n + v.count, 0)).toBe(r.total);
    expect(r.total).toBeCloseTo((100 - effort.nullPass8) * 20, 8);
    expect(r.gained).toBe(r.total - r.values[0].count);
    expect(r.gained - r.lost).toBeCloseTo(effort.delta8 * 20, 8);
  }
});

test('Luna difference series and intervals preserve the source point estimates', () => {
  for (const r of data.efforts) {
    expect(r.delta1).toBeCloseTo(r.codexPass1 - r.nullPass1, 10);
    expect(r.delta8).toBeCloseTo(r.codexPass8 - r.nullPass8, 10);
    for (const k of ['nullPass1', 'nullPass8', 'codexPass1', 'codexPass8', 'delta1', 'delta8']) {
      expect(r[k + 'Error'].every(e => e > 0)).toBe(true);
    }
  }
});
