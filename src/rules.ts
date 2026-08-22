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

export const DEFAULT_RULES_CONFIG: ContentRulesConfig = {
  maxGradeLevel: 10,
  maxSentenceWords: 28,
  bannedTerms: [
    'whitelist',
    'blacklist',
    'master/slave',
    'ninja',
    'rockstar',
    'guru'
  ],
  preferredTerms: {
    'whitelist': 'allowlist',
    'blacklist': 'blocklist',
    'master/slave': 'primary/replica',
    'native': 'built-in',
    'utilize': 'use',
    'in order to': 'to',
    'at this point in time': 'now',
    'due to the fact that': 'because',
    'for the purpose of': 'to',
    'with reference to': 'regarding'
  },
  customJargonTerms: [],
  brandVoiceInstructions: 'Direct, clear, active voice, empathetic, and developer-friendly without corporate fluff.',
  enabledRules: ['active-voice', 'reading-level', 'jargon', 'brand-terms']
};

/**
 * Built-in corporate jargon and buzzwords list
 */
export const BUILT_IN_JARGON: Record<string, string> = {
  'synergy': 'collaboration / teamwork',
  'paradigm shift': 'fundamental change',
  'leverage': 'use / apply',
  'move the needle': 'make measurable progress',
  'circle back': 'follow up',
  'boil the ocean': 'overcomplicate',
  'low-hanging fruit': 'easy wins',
  'bandwidth': 'capacity / time',
  'deep dive': 'detailed look / explore',
  'touch base': 'contact / talk',
  'actionable insights': 'practical advice',
  'mission critical': 'vital / essential',
  'bleeding edge': 'experimental / latest',
  'drill down': 'inspect / examine',
  'game changer': 'significant innovation',
  'outside the box': 'creatively',
  'value add': 'benefit / value',
  'holistic approach': 'complete solution',
  'wheelhouse': 'expertise / specialty',
  'core competency': 'main skill',
  'table this': 'postpone / delay',
  'ping': 'message / email',
  'seamlessly': 'smoothly',
  'revolutionize': 'improve / transform',
  'disruptive': 'innovative / groundbreaking'
};

// Common irregular past participles for passive voice detection
const IRREGULAR_PAST_PARTICIPLES = new Set([
  'been', 'born', 'become', 'begun', 'bitten', 'blown', 'broken', 'brought',
  'built', 'bought', 'caught', 'chosen', 'done', 'drawn', 'driven', 'eaten',
  'fallen', 'fed', 'felt', 'found', 'flown', 'forgotten', 'forgiven', 'frozen',
  'given', 'gone', 'grown', 'hung', 'heard', 'hidden', 'held', 'kept',
  'known', 'laid', 'led', 'left', 'lent', 'lost', 'made', 'meant',
  'met', 'paid', 'put', 'read', 'ridden', 'rung', 'risen', 'run',
  'said', 'seen', 'sold', 'sent', 'set', 'shaken', 'shone', 'shot',
  'shown', 'shut', 'sung', 'sunk', 'sat', 'slept', 'spoken', 'spent',
  'stood', 'stolen', 'struck', 'sworn', 'swept', 'swum', 'taken', 'taught',
  'torn', 'told', 'thought', 'thrown', 'understood', 'woken', 'worn', 'won', 'written'
]);

const TO_BE_VERBS = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', "'s", "'re"
]);

/**
 * Count syllables in a single word using heuristic rules
 */
export function countSyllablesInWord(rawWord: string): number {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;

  // Remove silent e at the end (unless ending in le preceded by consonant)
  let clean = word;
  if (clean.endsWith('e') && !clean.endsWith('le')) {
    clean = clean.slice(0, -1);
  }

  // Count vowel sequences
  const matches = clean.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;

  // Adjust for specific endings
  if (word.endsWith('ed') && !word.endsWith('ted') && !word.endsWith('ded')) {
    count = Math.max(1, count - 1);
  }
  if (word.endsWith('es') && !word.endsWith('ses') && !word.endsWith('zes') && !word.endsWith('shes') && !word.endsWith('ches')) {
    count = Math.max(1, count - 1);
  }

  return Math.max(1, count);
}

/**
 * Compute Flesch Reading Ease and Flesch-Kincaid Grade Level metrics
 */
export function calculateReadability(text: string, sentences: string[]): ReadabilityMetrics {
  const words = text.match(/[a-zA-Z0-9'-]+/g) || [];
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const characterCount = text.replace(/\s/g, '').length;

  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllablesInWord(word);
  }
  syllableCount = Math.max(1, syllableCount);

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 1;

  // Flesch Reading Ease: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
  let fleschReadingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  fleschReadingEase = Math.min(100, Math.max(0, Math.round(fleschReadingEase * 10) / 10));

  // Flesch-Kincaid Grade Level: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
  let fleschKincaidGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
  fleschKincaidGrade = Math.max(1, Math.round(fleschKincaidGrade * 10) / 10);

  return {
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    characters: characterCount,
    fleschReadingEase,
    fleschKincaidGrade,
    averageWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    averageSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
  };
}

/**
 * Checks if a sentence has passive voice construction
 */
export function detectPassiveVoice(sentence: string): { isPassive: boolean; match?: string } {
  const words = sentence.match(/[a-zA-Z']+/g) || [];
  if (words.length < 2) return { isPassive: false };

  for (let i = 0; i < words.length - 1; i++) {
    const currentWord = words[i].toLowerCase();
    if (TO_BE_VERBS.has(currentWord)) {
      // Look at next 1-2 words (allowing for adverbs like 'was easily configured' or 'is completely written')
      for (let j = i + 1; j <= Math.min(i + 2, words.length - 1); j++) {
        const targetWord = words[j].toLowerCase();
        const isPastParticiple =
          (targetWord.endsWith('ed') && targetWord.length > 3) ||
          IRREGULAR_PAST_PARTICIPLES.has(targetWord);

        if (isPastParticiple) {
          const snippet = words.slice(i, j + 1).join(' ');
          return { isPassive: true, match: snippet };
        }
      }
    }
  }

  return { isPassive: false };
}

/**
 * Detects jargon terms in a sentence
 */
export function detectJargon(sentence: string, customTerms: string[] = []): Array<{ term: string; suggestion?: string }> {
  const found: Array<{ term: string; suggestion?: string }> = [];
  const lowerSentence = sentence.toLowerCase();

  // Check built-in jargon
  for (const [term, suggestion] of Object.entries(BUILT_IN_JARGON)) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    if (regex.test(lowerSentence)) {
      found.push({ term, suggestion });
    }
  }

  // Check custom jargon
  for (const term of customTerms) {
    if (!term) continue;
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    if (regex.test(lowerSentence) && !found.some(f => f.term.toLowerCase() === term.toLowerCase())) {
      found.push({ term });
    }
  }

  return found;
}

/**
 * Detects banned or deprecated brand terms
 */
export function detectBrandViolations(
  sentence: string,
  bannedTerms: string[] = [],
  preferredTerms: Record<string, string> = {}
): Array<{ term: string; suggestion?: string; isBanned: boolean }> {
  const found: Array<{ term: string; suggestion?: string; isBanned: boolean }> = [];
  const lowerSentence = sentence.toLowerCase();

  // Check preferred terms map
  for (const [term, replacement] of Object.entries(preferredTerms)) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    if (regex.test(lowerSentence)) {
      found.push({ term, suggestion: replacement, isBanned: false });
    }
  }

  // Check banned terms list
  for (const term of bannedTerms) {
    if (!term) continue;
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    if (regex.test(lowerSentence) && !found.some(f => f.term.toLowerCase() === term.toLowerCase())) {
      found.push({ term, isBanned: true });
    }
  }

  return found;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
