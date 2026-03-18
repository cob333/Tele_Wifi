export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMetric(value: number, digits = 3) {
  return value.toFixed(digits);
}

export function formatWithCI(mean: number, ci95: number, digits = 3) {
  return `${mean.toFixed(digits)} +/- ${ci95.toFixed(digits)}`;
}
