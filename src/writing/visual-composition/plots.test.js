import data from './chart-data.json';
import { rescueConsistency } from './rescue-consistency';

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
    for (const k of ['nullPass1', 'nullPass8', 'codexPass1', 'codexPass8']) {
      expect(r[k + 'Error'].every(e => e > 0)).toBe(true);
    }
  }
});
