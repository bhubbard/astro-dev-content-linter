import type { AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
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

const LINTER_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m18 2 4 4-14 14H4v-4L18 2z"/>
  <path d="m14.5 5.5 4 4"/>
  <path d="m3 21 3-3"/>
  <circle cx="19" cy="19" r="2" fill="currentColor"/>
</svg>
`;

/**
 * Astro Content Linter Integration
 * Injects an Astro Dev Toolbar app to lint editorial copy and suggest on-device Gemini Nano rewrites.
 */
export function contentLinter(options: ContentLinterOptions = {}): AstroIntegration {
  return {
    name: 'astro-dev-content-linter',
    hooks: {
      'astro:config:setup': ({ addDevToolbarApp, injectScript }) => {
        const appEntrypoint = fileURLToPath(new URL('./app.js', import.meta.url));

        // Inject configuration object into client window context
        const serializedConfig = JSON.stringify({
          targetSelectors: options.targetSelectors ?? ['article', 'main', '[data-content-lint]'],
          readingLevelTarget: options.readingLevelTarget ?? 10,
          brandVoice: options.brandVoice ?? 'Direct, active voice, developer-focused, friendly, concise.',
          preferredTerms: options.preferredTerms ?? {},
          bannedTerms: options.bannedTerms ?? [],
          customJargonTerms: options.customJargonTerms ?? [],
          enabledPresets: options.enabledPresets ?? ['active-voice', 'reading-level', 'jargon', 'brand-terms'],
          rules: options.rules ?? {}
        });

        injectScript('page', `window.__ASTRO_CONTENT_LINTER_CONFIG__ = ${serializedConfig};`);

        addDevToolbarApp({
          id: 'astro-dev-content-linter',
          name: 'Content Linter',
          icon: LINTER_ICON,
          entrypoint: appEntrypoint
        });
      }
    }
  };
}

export default contentLinter;
