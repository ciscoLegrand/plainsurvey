/**
 * Converts option counts into a generic bar dataset. The shape mirrors common
 * charting libraries while staying plain enough for tables or custom renderers.
 *
 * @param {object} summary Question summary with an `options` collection.
 * @returns {{type: "bar", labels: Array<string>, datasets: Array<object>}}
 */
export function toBarChartData(summary) {
  const options = optionCounts(summary);
  return {
    type: "bar",
    labels: options.map((item) => item.label),
    datasets: [{ label: summary.title, data: options.map((item) => item.count) }]
  };
}

/**
 * Converts option counts into a generic pie dataset.
 *
 * @param {object} summary Question summary with an `options` collection.
 * @returns {{type: "pie", labels: Array<string>, datasets: Array<object>}}
 */
export function toPieChartData(summary) {
  const options = optionCounts(summary);
  return {
    type: "pie",
    labels: options.map((item) => item.label),
    datasets: [{ label: summary.title, data: options.map((item) => item.count) }]
  };
}

/**
 * Converts numeric rating distribution data into a generic bar dataset.
 *
 * @param {object} summary Question summary with a `rating.distribution` object.
 * @returns {{type: "bar", labels: Array<string>, datasets: Array<object>}}
 */
export function toRatingDistributionData(summary) {
  const distribution = summary.rating?.distribution || {};
  const labels = Object.keys(distribution).sort((a, b) => Number(a) - Number(b));
  return {
    type: "bar",
    labels,
    datasets: [{ label: summary.title, data: labels.map((label) => distribution[label]) }]
  };
}

/**
 * Converts matrix counts into a heatmap-friendly structure.
 *
 * @param {object} summary Question summary with a `matrix` object.
 * @returns {{type: "heatmap", rows: Array<string>, columns: Array<string>, values: Array<Array<number>>}}
 */
export function toMatrixHeatmapData(summary) {
  const matrix = summary.matrix || { rows: [], columns: [], values: [] };
  return {
    type: "heatmap",
    rows: matrix.rows || [],
    columns: matrix.columns || [],
    values: matrix.values || []
  };
}

/**
 * Converts ranking averages into a generic bar dataset.
 *
 * @param {object} summary Question summary with a `ranking` collection.
 * @returns {{type: "bar", labels: Array<string>, datasets: Array<object>}}
 */
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
