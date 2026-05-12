export function toBarChartData(summary) {
  const options = optionCounts(summary);
  return {
    type: "bar",
    labels: options.map((item) => item.label),
    datasets: [{ label: summary.title, data: options.map((item) => item.count) }]
  };
}

export function toPieChartData(summary) {
  const options = optionCounts(summary);
  return {
    type: "pie",
    labels: options.map((item) => item.label),
    datasets: [{ label: summary.title, data: options.map((item) => item.count) }]
  };
}

export function toRatingDistributionData(summary) {
  const distribution = summary.rating?.distribution || {};
  const labels = Object.keys(distribution).sort((a, b) => Number(a) - Number(b));
  return {
    type: "bar",
    labels,
    datasets: [{ label: summary.title, data: labels.map((label) => distribution[label]) }]
  };
}

export function toMatrixHeatmapData(summary) {
  const matrix = summary.matrix || { rows: [], columns: [], values: [] };
  return {
    type: "heatmap",
    rows: matrix.rows || [],
    columns: matrix.columns || [],
    values: matrix.values || []
  };
}

export function toRankingChartData(summary) {
  const ranking = summary.ranking || [];
  return {
    type: "bar",
    labels: ranking.map((item) => item.label),
    datasets: [{ label: summary.title, data: ranking.map((item) => item.averagePosition) }]
  };
}

function optionCounts(summary) {
  return [...(summary.options || [])].sort((left, right) => String(left.label).localeCompare(String(right.label)));
}
