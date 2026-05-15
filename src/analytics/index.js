import { calculateSurveyScore, getBooleanLabels, normalizeSurvey } from "../core/index.js";
import {
	toBarChartData,
	toMatrixHeatmapData,
	toPieChartData,
	toRankingChartData,
	toRatingDistributionData
} from "./charts/index.js";

export { analyticsAdviceLocales, analyticsDashboardLocales, analyticsLocales } from "./locales/index.js";

/**
 * Stable version for the serializable analytics contract returned by
 * {@link createAnalyticsContract}. Increment this value only when the shape of
 * the exported contract changes in a way consumers need to detect.
 *
 * @type {"1.1.0"}
 */
export const ANALYTICS_CONTRACT_VERSION = "1.1.0";

export {
	toBarChartData,
	toMatrixHeatmapData,
	toPieChartData,
	toRankingChartData,
	toRatingDistributionData
};

/**
 * Creates chart-ready datasets for every chartable representation supported by
 * a question summary. The returned objects are intentionally renderer-neutral:
 * they are plain JSON that can be adapted to Chart.js, ECharts, Recharts, a
 * table, or a custom dashboard.
 *
 * @param {object | null | undefined} questionSummary Summary returned by {@link analyzeSurveyResponses}.
 * @returns {{bar: object|null, pie: object|null, rating: object|null, matrix: object|null, ranking: object|null} | null}
 */
export function createQuestionCharts(questionSummary) {
	if (!questionSummary) return null;
	return {
		bar: questionSummary.options ? toBarChartData(questionSummary) : null,
		pie: questionSummary.options ? toPieChartData(questionSummary) : null,
		rating: questionSummary.rating ? toRatingDistributionData(questionSummary) : null,
		matrix: questionSummary.matrix ? toMatrixHeatmapData(questionSummary) : null,
		ranking: questionSummary.ranking ? toRankingChartData(questionSummary) : null
	};
}

/**
 * Builds a compact, serializable analytics payload suitable for persistence,
 * API responses, worker messages, or AI context windows. It includes the full
 * neutral analysis plus lookup indexes and a small set of chart samples.
 *
 * @param {object} [options]
 * @param {object} [options.survey] Plainsurvey JSON definition.
 * @param {Array<object>} [options.responses=[]] Response objects or raw answer maps.
 * @param {number} [options.chartSampleLimit=6] Maximum chartable questions included in `chartSamples`.
 * @returns {object} Versioned analytics contract.
 */
export function createAnalyticsContract({ survey, responses = [], chartSampleLimit = 6, ...analysisOptions } = {}) {
	const analysis = analyzeSurveyResponses({ survey, responses, ...analysisOptions });
	const byName = Object.fromEntries(analysis.questions.map((question) => [question.name, question]));
	const byType = analysis.questions.reduce((accumulator, question) => {
		if (!accumulator[question.type]) accumulator[question.type] = [];
		accumulator[question.type].push(question.name);
		return accumulator;
	}, {});
	const chartSamples = analysis.questions
		.filter((question) => hasChartData(question))
		.slice(0, Math.max(0, Number(chartSampleLimit) || 0))
		.map((question) => ({
			name: question.name,
			title: question.title,
			type: question.type,
			responseCount: question.responseCount,
			charts: createQuestionCharts(question)
		}));

	return {
		version: ANALYTICS_CONTRACT_VERSION,
		survey: analysis.survey,
		responseCount: analysis.responseCount,
		completion: analysis.completion,
		scoring: analysis.scoring,
		questions: analysis.questions,
		indexes: { byName, byType },
		chartSamples
	};
}

/**
 * Aggregates a survey definition and a collection of responses into neutral,
 * framework-agnostic summaries. The function does not assume a business
 * domain, language, charting library, storage layer, or UI framework.
 *
 * Responses may be raw answer maps (`{ q1: "yes" }`) or objects with an
 * `answers` property (`{ id, answers: { q1: "yes" } }`). Unknown answer keys
 * are ignored because the survey schema is the source of truth.
 *
 * @param {object} [options]
 * @param {object} [options.survey] Plainsurvey JSON definition.
 * @param {Array<object>} [options.responses=[]] Response objects or raw answer maps.
 * @returns {object} Serializable survey analytics summary.
 */
export function analyzeSurveyResponses({ survey, responses = [] } = {}) {
	const normalizedSurvey = normalizeSurvey(survey);
	const normalizedResponses = responses.map(normalizeResponseAnswers);
	const questionSummaries = flattenQuestions(normalizedSurvey)
		.map((question) => summarizeQuestion(question, normalizedResponses));
	const scores = normalizedResponses.map((answers) => calculateSurveyScore(normalizedSurvey, answers));
	const totalAwardedPoints = scores.reduce((total, score) => total + score.totalAwardedPoints, 0);
	const totalMaxPoints = scores.reduce((total, score) => total + score.totalMaxPoints, 0);

	return {
		survey: {
			title: normalizedSurvey.title,
			pageCount: normalizedSurvey.pages.length,
			questionCount: questionSummaries.length
		},
		responseCount: normalizedResponses.length,
		completion: summarizeCompletion(questionSummaries, normalizedResponses.length),
		questions: questionSummaries,
		scoring: {
			totalAwardedPoints,
			totalMaxPoints,
			averagePercentage: scores.length
				? Math.round(scores.reduce((total, score) => total + score.percentage, 0) / scores.length)
				: 0
		}
	};
}

/**
 * Convenience facade around {@link analyzeSurveyResponses}. Use it when an app
 * wants an object with lookup helpers while keeping the underlying analytics
 * payload plain and serializable.
 *
 * @param {object} [options] Same input accepted by {@link analyzeSurveyResponses}.
 * @returns {object} Analytics facade with query and serialization helpers.
 */
export function createSurveyAnalytics(options = {}) {
	const analysis = analyzeSurveyResponses(options);

	return {
		analysis,
		getQuestion(name) {
			return analysis.questions.find((question) => question.name === name);
		},
		getQuestionsByType(type) {
			return analysis.questions.filter((question) => question.type === type);
		},
		createCharts(name) {
			const summary = analysis.questions.find((question) => question.name === name);
			return createQuestionCharts(summary);
		},
		getChartData(name, chartType = "bar") {
			return this.createCharts(name)?.[chartType] || null;
		},
		toContract(params = {}) {
			return createAnalyticsContract({
				survey: options.survey,
				responses: options.responses,
				...params
			});
		},
		toJSON() {
			return analysis;
		}
	};
}

function hasChartData(question) {
	return Boolean(question.options || question.rating || question.matrix || question.ranking);
}

function summarizeQuestion(question, responses) {
	const answers = responses.map((response) => response[question.name]).filter((answer) => !isEmptyAnswer(answer));
	const base = {
		id: question.id,
		name: question.name,
		title: question.title,
		type: question.type,
		required: Boolean(question.required),
		responseCount: answers.length,
		emptyCount: Math.max(0, responses.length - answers.length),
		responseRate: ratio(answers.length, responses.length)
	};

	if (["radio", "dropdown", "emojiScale", "imageChoice", "imageCompare", "boolean"].includes(question.type)) {
		return { ...base, options: countSingle(question, answers) };
	}
	if (question.type === "checkbox") {
		return { ...base, options: countMultiple(question, answers) };
	}
	if (question.type === "rating") {
		return { ...base, rating: summarizeRatings(question, answers) };
	}
	if (question.type === "matrix") {
		return { ...base, matrix: summarizeMatrix(question, answers) };
	}
	if (question.type === "ranking") {
		return { ...base, ranking: summarizeRanking(question, answers) };
	}
	if (["text", "textarea"].includes(question.type)) {
		return { ...base, openText: answers.map(String).filter(Boolean) };
	}

	return base;
}

function countSingle(question, answers) {
	const counts = Object.fromEntries(choiceEntries(question).map((choice) => [String(choice.value), 0]));
	for (const answer of answers) {
		const key = String(answer);
		counts[key] = (counts[key] || 0) + 1;
	}
	return entriesToOptionCounts(question, counts, answers.length);
}

function countMultiple(question, answers) {
	const counts = Object.fromEntries(choiceEntries(question).map((choice) => [String(choice.value), 0]));
	for (const answer of answers) {
		for (const item of Array.isArray(answer) ? answer : []) {
			const key = String(item);
			counts[key] = (counts[key] || 0) + 1;
		}
	}
	return entriesToOptionCounts(question, counts, answers.length);
}

function entriesToOptionCounts(question, counts, answerCount) {
	return Object.entries(counts).map(([value, count]) => ({
		value: parseValue(value),
		label: labelFor(question, value),
		count,
		percentage: ratio(count, answerCount)
	}));
}

function summarizeRatings(question, answers) {
	const values = answers.map(Number).filter(Number.isFinite);
	const distribution = {};
	for (const value of values) distribution[value] = (distribution[value] || 0) + 1;
	return {
		min: question.rateMin,
		max: question.rateMax,
		count: values.length,
		average: values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0,
		median: median(values),
		distribution
	};
}

function summarizeMatrix(question, answers) {
	const rows = (question.rows || []).map((row) => row.value);
	const columns = (question.columns || []).map((column) => column.value);
	const values = rows.map((row) => {
		return columns.map((column) => {
			return answers.filter((answer) => answer && answer[row] === column).length;
		});
	});
	return {
		rows,
		rowLabels: rows.map((row) => labelFor({ ...question, choices: question.rows }, row)),
		columns,
		columnLabels: columns.map((column) => labelFor({ ...question, choices: question.columns }, column)),
		values
	};
}

function summarizeRanking(question, answers) {
	return (question.choices || []).map((choice) => {
		const positions = answers
			.map((answer) => Array.isArray(answer) ? answer.indexOf(choice.value) : -1)
			.filter((index) => index >= 0)
			.map((index) => index + 1);
		return {
			value: choice.value,
			label: choice.text,
			count: positions.length,
			averagePosition: positions.length ? positions.reduce((total, value) => total + value, 0) / positions.length : 0
		};
	});
}

function summarizeCompletion(questionSummaries, responseCount) {
	const requiredQuestions = questionSummaries.filter((question) => question.required);
	const averageResponseRate = questionSummaries.length
		? questionSummaries.reduce((total, question) => total + question.responseRate, 0) / questionSummaries.length
		: 0;
	const requiredResponseRate = requiredQuestions.length
		? requiredQuestions.reduce((total, question) => total + question.responseRate, 0) / requiredQuestions.length
		: null;

	return {
		responseCount,
		averageResponseRate,
		requiredResponseRate,
		answeredQuestionCount: questionSummaries.filter((question) => question.responseCount > 0).length,
		unansweredQuestionCount: questionSummaries.filter((question) => question.responseCount === 0).length
	};
}

function flattenQuestions(survey) {
	return survey.pages.flatMap((page) => flattenElements(page.elements || []));
}

function flattenElements(elements) {
	return elements.flatMap((question) => {
		if (question.type === "panel") return flattenElements(question.elements || []);
		return question;
	});
}

function choiceEntries(question) {
	if (question.type === "boolean") {
		const labels = getBooleanLabels(question);
		return [
			{ value: true, text: labels.trueLabel },
			{ value: false, text: labels.falseLabel }
		];
	}
	return question.choices || [];
}

function labelFor(question, value) {
	const choice = choiceEntries(question).find((item) => String(item.value) === String(value));
	return choice?.text || String(value);
}

function parseValue(value) {
	if (value === "true") return true;
	if (value === "false") return false;
	return value;
}

function normalizeResponseAnswers(response) {
	return response?.answers && typeof response.answers === "object" ? response.answers : response || {};
}

function isEmptyAnswer(answer) {
	if (answer === undefined || answer === null) return true;
	if (typeof answer === "string") return answer.trim() === "";
	if (Array.isArray(answer)) return answer.length === 0;
	if (typeof answer === "object") return Object.keys(answer).length === 0;
	return false;
}

function median(values) {
	if (!values.length) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ratio(value, total) {
	return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}
