export function rescueConsistency(cohorts) {
  return Array.from({ length: 8 }, (_, index) => {
    const threshold = index + 1;
    return Object.fromEntries([
      ['threshold', threshold],
      ...cohorts.map(cohort => [cohort.effort,
        100 * cohort.values.filter(v => v.successes >= threshold).reduce((sum, v) => sum + v.count, 0) / cohort.total]),
    ]);
  });
}
