import { type ContentRulesConfig, type LintViolation, type ReadabilityMetrics } from './rules.js';
export interface SentenceItem {
    index: number;
    text: string;
    rawText: string;
    wordCount: number;
}
export interface ContentAnalysisResult {
    sentences: SentenceItem[];
    metrics: ReadabilityMetrics;
    violations: LintViolation[];
    healthScore: number;
    aiAvailable: boolean;
}
/**
 * Robust sentence splitter that preserves abbreviations, decimals, and URLs
 */
export declare function splitIntoSentences(text: string): SentenceItem[];
/**
 * Calculates Content Health Score (0 - 100) based on metrics and violations
 */
export declare function computeHealthScore(metrics: ReadabilityMetrics, violations: LintViolation[]): number;
/**
 * Analyzes text with configured rules
 */
export declare function analyzeContent(text: string, userConfig?: Partial<ContentRulesConfig>, hasAi?: boolean): ContentAnalysisResult;
/**
 * Formats prompt for Chrome Built-in AI (Gemini Nano) rewrite
 */
export declare function formatRewritePrompt(sentence: string, violation?: LintViolation, brandVoice?: string): string;
/**
 * Checks if Chrome Built-in AI is available in the current browser session
 */
export declare function checkChromeAiAvailability(): Promise<boolean>;
/**
 * Requests a rewritten suggestion from Gemini Nano via window.ai
 */
export declare function requestAiRewrite(sentence: string, violation?: LintViolation, brandVoice?: string): Promise<string>;
//# sourceMappingURL=analyzer.d.ts.map