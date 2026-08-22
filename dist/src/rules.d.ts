/**
 * Rule definitions and presets for editorial content linting.
 */
export type ViolationSeverity = 'warning' | 'error' | 'info';
export type RuleCategory = 'active-voice' | 'reading-level' | 'jargon' | 'brand-terms' | 'tone-voice';
export interface LintViolation {
    id: string;
    ruleId: string;
    category: RuleCategory;
    message: string;
    severity: ViolationSeverity;
    sentence: string;
    startIndex?: number;
    endIndex?: number;
    offendingText?: string;
    suggestedFix?: string;
    details?: Record<string, any>;
}
export interface ReadabilityMetrics {
    words: number;
    sentences: number;
    syllables: number;
    characters: number;
    fleschReadingEase: number;
    fleschKincaidGrade: number;
    averageWordsPerSentence: number;
    averageSyllablesPerWord: number;
}
export interface ContentRulesConfig {
    maxGradeLevel?: number;
    maxSentenceWords?: number;
    bannedTerms?: string[];
    preferredTerms?: Record<string, string>;
    customJargonTerms?: string[];
    brandVoiceInstructions?: string;
    enabledRules?: RuleCategory[];
}
export declare const DEFAULT_RULES_CONFIG: ContentRulesConfig;
/**
 * Built-in corporate jargon and buzzwords list
 */
export declare const BUILT_IN_JARGON: Record<string, string>;
/**
 * Count syllables in a single word using heuristic rules
 */
export declare function countSyllablesInWord(rawWord: string): number;
/**
 * Compute Flesch Reading Ease and Flesch-Kincaid Grade Level metrics
 */
export declare function calculateReadability(text: string, sentences: string[]): ReadabilityMetrics;
/**
 * Checks if a sentence has passive voice construction
 */
export declare function detectPassiveVoice(sentence: string): {
    isPassive: boolean;
    match?: string;
};
/**
 * Detects jargon terms in a sentence
 */
export declare function detectJargon(sentence: string, customTerms?: string[]): Array<{
    term: string;
    suggestion?: string;
}>;
/**
 * Detects banned or deprecated brand terms
 */
export declare function detectBrandViolations(sentence: string, bannedTerms?: string[], preferredTerms?: Record<string, string>): Array<{
    term: string;
    suggestion?: string;
    isBanned: boolean;
}>;
//# sourceMappingURL=rules.d.ts.map