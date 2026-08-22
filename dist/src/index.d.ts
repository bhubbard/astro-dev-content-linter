import type { AstroIntegration } from 'astro';
import type { ContentRulesConfig, RuleCategory } from './rules.js';
export * from './rules.js';
export * from './analyzer.js';
export interface ContentLinterOptions {
    /**
     * Target CSS selectors to parse and lint.
     * Default: ['article', 'main', '[data-content-lint]']
     */
    targetSelectors?: string[];
    /**
     * Maximum target reading grade level according to Flesch-Kincaid formula.
     * Default: 10
     */
    readingLevelTarget?: number;
    /**
     * Team-defined brand voice instructions (used for Gemini Nano suggestions).
     * Example: "Direct, active voice, developer-focused, friendly, no corporate jargon."
     */
    brandVoice?: string;
    /**
     * Term replacements mapping (e.g., { "whitelist": "allowlist" })
     */
    preferredTerms?: Record<string, string>;
    /**
     * Forbidden/banned terms list
     */
    bannedTerms?: string[];
    /**
     * Custom jargon or buzzwords to detect
     */
    customJargonTerms?: string[];
    /**
     * Preset rule categories to enable.
     * Default: ['active-voice', 'reading-level', 'jargon', 'brand-terms']
     */
    enabledPresets?: RuleCategory[];
    /**
     * Additional granular rule settings
     */
    rules?: Partial<ContentRulesConfig>;
}
/**
 * Astro Content Linter Integration
 * Injects an Astro Dev Toolbar app to lint editorial copy and suggest on-device Gemini Nano rewrites.
 */
export declare function contentLinter(options?: ContentLinterOptions): AstroIntegration;
export default contentLinter;
//# sourceMappingURL=index.d.ts.map