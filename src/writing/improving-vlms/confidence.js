// Pointwise 95% Wilson score interval for problem-level success within 8 rollouts.
export function pass8Interval(passed, problems) {
  if (!Number.isInteger(problems) || problems <= 0 || !Number.isInteger(passed) || passed < 0 || passed > problems) {
    throw new Error('Pass@8 confidence intervals require valid integer problem counts');
  }
  const z = 1.959963984540054;
  const p = passed / problems;
  const denominator = 1 + z * z / problems;
  const center = (p + z * z / (2 * problems)) / denominator;
  const radius = z * Math.sqrt(p * (1 - p) / problems + z * z / (4 * problems * problems)) / denominator;
  const lower = Math.max(0, center - radius) * 100;
  const upper = Math.min(1, center + radius) * 100;
  return { pass8Lower: lower, pass8Upper: upper, pass8Error: [p * 100 - lower, upper - p * 100] };
}
