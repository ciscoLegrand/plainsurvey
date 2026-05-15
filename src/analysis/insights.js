import { analyzeSurveyResponses, createSurveyAnalytics } from "../analytics/index.js";
import { createTranslator } from "../shared/i18n/index.js";
import { analysisInsightLocales } from "./locales/index.js";

/**
 * Stable version for the serializable analysis contract returned by
 * {@link createSurveyAnalysisContract}.
 *
 * @type {"1.1.0"}
 */
export const ANALYSIS_CONTRACT_VERSION = "1.1.0";

/**
 * Neutral defaults for text and scorecard helpers. The defaults intentionally
 * avoid domain terms, Spanish-only sentiment words, and business thresholds.
 * Applications can inject stop words, lexicons, or their own analyzers when
 * they want opinionated interpretation.
 */
export const DEFAULT_INSIGHT_CONFIG = Object.freeze({
	minWordLength: 3,
	stopWords: [],
	sentimentLexicon: {
		positive: [],
		negative: []
	},
	thresholds: {
		valuationHigh: 75,
		valuationMedium: 50,
		lowRating: 40,
		confidenceHighDimensions: 3,
		confidenceMediumDimensions: 2,
		sentimentImpactFactor: 10
	}
});

/**
 * Creates the complete analysis dataset used by dashboards, reports, exports,
 * and AI assistants. It combines neutral analytics, chart helpers, text
 * extraction, keyword counts, optional sentiment, and a scorecard.
 *
 * @param {object} [options]
 * @param {string} [options.id=""] Stable dataset identifier.
 * @param {string} [options.label=""] Human-readable dataset label.
 * @param {string} [options.domain=""] Optional app-defined grouping label.
 * @param {object} [options.survey] Plainsurvey JSON definition.
 * @param {Array<object>} [options.responses=[]] Response objects or raw answer maps.
 * @param {string} [options.locale="en"] Locale used only for formatting/report labels.
 * @param {object} [options.messages] Translation bundles for built-in report text.
 * @param {object} [options.labels] Translation overrides.
 * @param {object} [options.insightConfig] Text and scorecard configuration.
 * @returns {object} Serializable dataset plus helper-ready analytics objects.
 */
export function createSurveyInsightDataset({
	id = "",
	label = "",
	domain = "",
	survey,
	responses = [],
	locale = "en",
	messages = analysisInsightLocales,
	labels = {},
	insightConfig = {}
} = {}) {
	const t = createTranslator({ locale, fallbackLocale: "en", messages, overrides: labels });
	const resolvedInsightConfig = resolveInsightConfig(insightConfig);
	const analysis = analyzeSurveyResponses({ survey, responses });
	const analytics = createSurveyAnalytics({ survey, responses });
	const textInsights = createTextInsights(analysis, {
		t,
		locale,
		insightConfig: resolvedInsightConfig
	});
	const valuation = createSurveyValuation(analysis, textInsights, {
		t,
		locale,
		insightConfig: resolvedInsightConfig
	});

	return {
		id,
		label: label || survey?.title || id,
		domain,
		survey,
		responses,
		analysis,
		analytics,
		textInsights,
		valuation,
		locale,
		messages,
		labels,
		insightConfig: resolvedInsightConfig
	};
}

/**
 * Builds the minimal versioned contract most apps should send across process
 * boundaries. It omits helper functions and keeps the payload JSON-safe.
 *
 * @param {object} [options] Same input accepted by {@link createSurveyInsightDataset}.
 * @returns {object} Versioned analysis contract.
 */
export function createSurveyAnalysisContract(options = {}) {
	const dataset = createSurveyInsightDataset(options);
	return toSurveyAnalysisContract(dataset);
}

/**
 * Converts an insight dataset into a compact public contract.
 *
 * @param {object} dataset Dataset returned by {@link createSurveyInsightDataset}.
 * @returns {object} JSON-safe contract with metrics, scorecard, text insights, and questions.
 */
export function toSurveyAnalysisContract(dataset) {
	const dimensions = Object.fromEntries(
		(dataset.valuation.dimensions || []).map((dimension) => [dimension.id, {
			label: dimension.label,
			value: Number.isFinite(dimension.value) ? roundMetric(dimension.value) : null
		}])
	);

	return {
		version: ANALYSIS_CONTRACT_VERSION,
		id: dataset.id,
		label: dataset.label,
		domain: dataset.domain,
		locale: dataset.locale,
		metrics: {
			responses: dataset.analysis.responseCount,
			questions: dataset.analysis.survey.questionCount,
			pages: dataset.analysis.survey.pageCount,
			openComments: dataset.textInsights.comments.length,
			averageResponseRate: dataset.analysis.completion.averageResponseRate
		},
		valuation: {
			score: dataset.valuation.score,
			label: dataset.valuation.label,
			confidence: dataset.valuation.confidence,
			dimensions
		},
		text: {
			sentiment: dataset.textInsights.sentiment,
			topWords: dataset.textInsights.topWords,
			summaries: dataset.textInsights.summaries
		},
		questions: dataset.analysis.questions
	};
}

/**
 * Extracts open-text answers and produces neutral text metrics. Sentiment is
 * lexicon-based only when the caller supplies a lexicon; otherwise every text
 * item is classified as neutral.
 *
 * @param {object} analysis Result of {@link analyzeSurveyResponses}.
 * @param {object} [options]
 * @param {object} [options.insightConfig] Tokenization and sentiment options.
 * @param {Function} [options.sentimentAnalyzer] Custom `(texts, context) => result` analyzer.
 * @returns {{comments: Array<object>, wordCloud: Array<object>, topWords: Array<object>, sentiment: object, summaries: Array<string>}}
 */
export function createTextInsights(analysis, options = {}) {
	const t = options.t || createTranslator({
		locale: options.locale || "en",
		fallbackLocale: "en",
		messages: options.messages || analysisInsightLocales,
		overrides: options.labels || {}
	});
	const insightConfig = resolveInsightConfig(options.insightConfig);
	const comments = analysis.questions
		.filter((question) => Array.isArray(question.openText))
		.flatMap((question) => question.openText.map((text) => ({
			question: question.title,
			questionName: question.name,
			text: String(text)
		})))
		.filter((item) => item.text.trim());

	const sourceText = comments.map((item) => item.text).join(" ");
	const wordCloud = countWords(sourceText, insightConfig).slice(0, 42);
	const sentimentAnalyzer = options.sentimentAnalyzer || analyzeSentiment;
	const sentiment = sentimentAnalyzer(comments.map((item) => item.text), { t, insightConfig });
	const { byCategory = { positive: [], neutral: [], negative: [] }, ...sentimentStats } = sentiment || {};

	return {
		comments,
		wordCloud,
		topWords: wordCloud.slice(0, 12),
		sentiment: {
			...sentimentStats,
			byCategory: {
				positive: (byCategory.positive || []).map((index) => comments[index]).filter(Boolean),
				neutral: (byCategory.neutral || []).map((index) => comments[index]).filter(Boolean),
				negative: (byCategory.negative || []).map((index) => comments[index]).filter(Boolean)
			}
		},
		summaries: createTextSummaries(comments, wordCloud, sentimentStats, t)
	};
}

/**
 * Creates a configurable scorecard from objective survey metrics. The default
 * dimensions are scoring percentage, normalized rating average, completion, and
 * optional sentiment balance. This is a convenience summary, not a claim of
 * statistical validity.
 *
 * @param {object} analysis Result of {@link analyzeSurveyResponses}.
 * @param {object} [textInsights={}] Text insights returned by {@link createTextInsights}.
 * @param {object} [options]
 * @param {object} [options.insightConfig] Threshold configuration.
 * @returns {{score: number, label: string, confidence: string, dimensions: Array<object>}}
 */
export function createSurveyValuation(analysis, textInsights = {}, options = {}) {
	const t = options.t || createTranslator({
		locale: options.locale || "en",
		fallbackLocale: "en",
		messages: options.messages || analysisInsightLocales,
		overrides: options.labels || {}
	});
	const insightConfig = resolveInsightConfig(options.insightConfig);
	const scored = analysis.scoring.totalMaxPoints > 0 ? analysis.scoring.averagePercentage : null;
	const ratingScore = averageOrNull(analysis.questions
		.filter((question) => question.rating)
		.map((question) => normalizeRatingAverage(question.rating))
		.filter(Number.isFinite));
	const completionScore = analysis.completion?.averageResponseRate ?? averageOrNull(analysis.questions
		.map((question) => question.responseRate)
		.filter(Number.isFinite));
	const sentimentScore = Number.isFinite(textInsights.sentiment?.score)
		? clamp(50 + textInsights.sentiment.score * insightConfig.thresholds.sentimentImpactFactor, 0, 100)
		: null;

	const dimensions = [
		{ id: "scoring", label: t("dimensionScoring"), value: scored },
		{ id: "ratings", label: t("dimensionRatings"), value: ratingScore },
		{ id: "coverage", label: t("dimensionCoverage"), value: completionScore },
		{ id: "sentiment", label: t("dimensionSentiment"), value: sentimentScore }
	];
	const values = dimensions.map((dimension) => dimension.value).filter(Number.isFinite);
	const score = Math.round(values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

	return {
		score,
		label: labelForScore(score, t, insightConfig),
		confidence: labelForConfidence(values.length, t, insightConfig),
		dimensions
	};
}

/**
 * Builds a lightweight deterministic report from a dataset. The report is meant
 * as a fallback or prompt context for an AI layer; it never invents conclusions
 * outside the aggregated dataset.
 *
 * @param {object} dataset Dataset returned by {@link createSurveyInsightDataset}.
 * @param {string} [userQuestion=""] User question or prompt associated with the report.
 * @param {object} [options] Locale, message, label, and insight config overrides.
 * @returns {{title: string, summary: Array<string>, evidence: Array<string>, caveats: Array<string>, metadata: object}}
 */
export function buildConsultantReport(dataset, userQuestion = "", options = {}) {
	const t = createTranslator({
		locale: options.locale || dataset.locale || "en",
		fallbackLocale: "en",
		messages: options.messages || dataset.messages || analysisInsightLocales,
		overrides: options.labels || dataset.labels || {}
	});
	const insightConfig = resolveInsightConfig(options.insightConfig || dataset.insightConfig);
	const risks = findRisks(dataset, t, insightConfig);
	const actions = recommendActions(dataset, t, insightConfig);
	const strengths = findStrengths(dataset, t);
	const evidence = [...strengths.slice(0, 2), ...risks.slice(0, 2), ...actions.slice(0, 2)];

	return {
		title: t("reportTitle", { label: dataset.label }),
		summary: [
			t("reportValuation", {
				score: dataset.valuation.score,
				label: String(dataset.valuation.label).toLowerCase(),
				confidence: dataset.valuation.confidence
			}),
			t("reportBase", {
				responses: dataset.analysis.responseCount,
				questions: dataset.analysis.survey.questionCount,
				comments: dataset.textInsights.comments.length
			}),
			t("reportSentiment", {
				label: dataset.textInsights.sentiment.label,
				positive: dataset.textInsights.sentiment.positive,
				negative: dataset.textInsights.sentiment.negative,
				neutral: dataset.textInsights.sentiment.neutral
			})
		],
		evidence,
		caveats: [
			t("reportCaveatData"),
			t("reportCaveatHeuristic")
		],
		metadata: {
			question: String(userQuestion || "").trim()
		}
	};
}

/**
 * Counts normalized tokens in free text. The tokenizer lowercases text, removes
 * diacritics, filters short tokens, and applies caller-provided stop words.
 *
 * @param {string} text Source text.
 * @param {object} [insightConfig=DEFAULT_INSIGHT_CONFIG] Tokenization config.
 * @returns {Array<{word: string, count: number}>} Sorted word counts.
 */
export function countWords(text, insightConfig = DEFAULT_INSIGHT_CONFIG) {
	const config = resolveInsightConfig(insightConfig);
	const stopWords = new Set((config.stopWords || []).map((word) => normalizeToken(word)));
	const counts = new Map();

	for (const word of normalizeText(text).split(/\s+/)) {
		if (word.length < config.minWordLength || stopWords.has(word)) continue;
		counts.set(word, (counts.get(word) || 0) + 1);
	}

	return [...counts.entries()]
		.map(([word, count]) => ({ word, count }))
		.sort((left, right) => right.count - left.count || left.word.localeCompare(right.word));
}

function analyzeSentiment(texts, { t, insightConfig }) {
	const positiveWords = new Set((insightConfig.sentimentLexicon.positive || []).map((word) => normalizeToken(word)));
	const negativeWords = new Set((insightConfig.sentimentLexicon.negative || []).map((word) => normalizeToken(word)));
	let positive = 0;
	let negative = 0;
	let neutral = 0;
	let score = 0;
	const byCategory = { positive: [], neutral: [], negative: [] };

	for (let i = 0; i < texts.length; i++) {
		const value = normalizeText(texts[i]).split(/\s+/).reduce((total, word) => {
			if (positiveWords.has(word)) return total + 1;
			if (negativeWords.has(word)) return total - 1;
			return total;
		}, 0);

		score += value;
		if (value > 0) { positive += 1; byCategory.positive.push(i); }
		else if (value < 0) { negative += 1; byCategory.negative.push(i); }
		else { neutral += 1; byCategory.neutral.push(i); }
	}

	const label = score > 0 ? t("sentimentLabelPositive") : score < 0 ? t("sentimentLabelCritical") : t("sentimentLabelMixed");
	return { score, positive, negative, neutral, label, byCategory };
}

function createTextSummaries(comments, words, sentiment, t) {
	if (!comments.length) return [];
	return [
		t("summaryThemes", { themes: words.slice(0, 6).map((item) => item.word).join(", ") || t("summaryNoThemes") }),
		t("summaryTone", { label: sentiment.label, negative: sentiment.negative, positive: sentiment.positive }),
		...comments
			.sort((left, right) => right.text.length - left.text.length)
			.slice(0, 2)
			.map((item) => `${item.question}: ${item.text}`)
	];
}

function findRisks(dataset, t, insightConfig) {
	const risks = [];
	for (const question of dataset.analysis.questions) {
		const ratingValue = normalizeRatingAverage(question.rating);
		if (Number.isFinite(ratingValue) && ratingValue < insightConfig.thresholds.lowRating) {
			risks.push(t("riskRating", {
				title: question.title,
				value: formatDecimal(question.rating.average, dataset.locale)
			}));
		}
	}
	if (dataset.textInsights.sentiment.negative > dataset.textInsights.sentiment.positive) {
		risks.push(t("riskSentimentImbalance", {
			negative: dataset.textInsights.sentiment.negative,
			positive: dataset.textInsights.sentiment.positive
		}));
	}
	return risks.length ? risks : [t("riskNone")];
}

function findStrengths(dataset, t) {
	const strengths = dataset.valuation.dimensions
		.filter((dimension) => Number.isFinite(dimension.value) && dimension.value >= dataset.valuation.score)
		.map((dimension) => t("strengthDimension", {
			label: dimension.label,
			value: Math.round(dimension.value)
		}));
	if (dataset.textInsights.sentiment.positive > dataset.textInsights.sentiment.negative) {
		strengths.push(t("strengthSentimentBalance", {
			positive: dataset.textInsights.sentiment.positive,
			negative: dataset.textInsights.sentiment.negative
		}));
	}
	return strengths.length ? strengths : [t("strengthNone")];
}

function recommendActions(dataset, t, insightConfig) {
	const actions = [];
	const coverageDimension = dataset.valuation.dimensions.find((dimension) => dimension.id === "coverage");
	if (dataset.valuation.score < insightConfig.thresholds.valuationMedium) actions.push(t("actionImproveScore"));
	if (coverageDimension && coverageDimension.value < 80) actions.push(t("actionImproveCoverage"));
	if (dataset.textInsights.comments.length > 0) actions.push(t("actionReviewFeedback"));
	return actions.length ? actions : [t("actionDefault")];
}

function resolveInsightConfig(config = {}) {
	const source = config || {};
	return {
		...DEFAULT_INSIGHT_CONFIG,
		...source,
		sentimentLexicon: {
			...DEFAULT_INSIGHT_CONFIG.sentimentLexicon,
			...(source.sentimentLexicon || {})
		},
		thresholds: {
			...DEFAULT_INSIGHT_CONFIG.thresholds,
			...(source.thresholds || {})
		},
		stopWords: Array.isArray(source.stopWords) ? source.stopWords : DEFAULT_INSIGHT_CONFIG.stopWords,
		minWordLength: Number.isFinite(source.minWordLength) ? source.minWordLength : DEFAULT_INSIGHT_CONFIG.minWordLength
	};
}

function normalizeRatingAverage(rating) {
	if (!rating) return null;
	const min = Number.isFinite(rating.min) ? rating.min : 1;
	const max = Number.isFinite(rating.max) ? rating.max : Math.max(...Object.keys(rating.distribution || {}).map(Number), 10);
	if (!Number.isFinite(rating.average) || max <= min) return null;
	return ((rating.average - min) / (max - min)) * 100;
}

function labelForScore(score, t, insightConfig) {
	if (score >= insightConfig.thresholds.valuationHigh) return t("valuationHigh");
	if (score >= insightConfig.thresholds.valuationMedium) return t("valuationMedium");
	return t("valuationAttention");
}

function labelForConfidence(count, t, insightConfig) {
	if (count >= insightConfig.thresholds.confidenceHighDimensions) return t("confidenceHigh");
	if (count >= insightConfig.thresholds.confidenceMediumDimensions) return t("confidenceMedium");
	return t("confidenceExploratory");
}

function normalizeText(text) {
	return String(text || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9ñ\s]/g, " ");
}

function normalizeToken(token) {
	return normalizeText(token).trim();
}

function averageOrNull(values) {
	return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function formatDecimal(value, locale = "en") {
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function roundMetric(value) {
	return Math.round((Number(value) || 0) * 10) / 10;
}
