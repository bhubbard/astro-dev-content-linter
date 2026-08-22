import type { ChromeAI, AILanguageModel } from './chrome-ai.d.ts';
import {
  type ContentRulesConfig,
  type LintViolation,
  type ReadabilityMetrics,
  DEFAULT_RULES_CONFIG,
  calculateReadability,
  detectPassiveVoice,
  detectJargon,
  detectBrandViolations
} from './rules.js';

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
  healthScore: number; // 0 to 100
  aiAvailable: boolean;
}

/**
 * Robust sentence splitter that preserves abbreviations, decimals, and URLs
 */
export function splitIntoSentences(text: string): SentenceItem[] {
  if (!text || !text.trim()) return [];

  // Normalize line breaks & excessive whitespace
  const sanitized = text
    .replace(/\r\n/g, '\n')
    .replace(/[\t\f]/g, ' ')
    .trim();

  // Protect known abbreviations and dots (e.g., i.e., vs., Dr., etc., v1.0, 3.14)
  const placeholderMap = new Map<string, string>();
  let placeholderIndex = 0;

  const protect = (match: string) => {
    const key = `__P_${placeholderIndex++}__`;
    placeholderMap.set(key, match);
    return key;
  };

  const protectedText = sanitized
    // Protect abbreviations
    .replace(/\b(e\.g\.|i\.e\.|etc\.|vs\.|mr\.|mrs\.|ms\.|dr\.|prof\.|inc\.|ltd\.|dept\.|approx\.)/gi, protect)
    // Protect decimal numbers & versions (e.g. 5.4, 0.1.0)
    .replace(/\b\d+\.\d+(\.\d+)?\b/g, protect)
    // Protect domain names / URLs
    .replace(/https?:\/\/[^\s]+/g, protect)
    .replace(/\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, protect);

  // Split by sentence terminators (. ! ? or newline sequence) followed by space or end
  const rawChunks = protectedText.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'‘])|\n{2,}|\n(?=[-*#\d])/g);

  const sentences: SentenceItem[] = [];
  let currentIndex = 0;

  for (const chunk of rawChunks) {
    let restored = chunk;
    for (const [key, val] of placeholderMap.entries()) {
      restored = restored.replaceAll(key, val);
    }

    const trimmed = restored.trim();
    if (trimmed.length > 0) {
      const words = trimmed.match(/[a-zA-Z0-9'-]+/g) || [];
      sentences.push({
        index: currentIndex++,
        text: trimmed,
        rawText: chunk,
        wordCount: words.length
      });
    }
  }

  return sentences;
}

/**
 * Calculates Content Health Score (0 - 100) based on metrics and violations
 */
export function computeHealthScore(metrics: ReadabilityMetrics, violations: LintViolation[]): number {
  if (metrics.sentences === 0) return 100;

  let score = 100;

  // Deduct for violations based on density
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  const infoCount = violations.filter(v => v.severity === 'info').length;

  score -= errorCount * 12;
  score -= warningCount * 6;
  score -= infoCount * 2;

  // Readability penalty if Flesch Reading Ease is very low (< 40)
  if (metrics.fleschReadingEase < 40) {
    score -= Math.round((40 - metrics.fleschReadingEase) * 0.4);
  }

  // Grade level penalty if > 12 (college level)
  if (metrics.fleschKincaidGrade > 12) {
    score -= Math.round((metrics.fleschKincaidGrade - 12) * 3);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Analyzes text with configured rules
 */
export function analyzeContent(
  text: string,
  userConfig?: Partial<ContentRulesConfig>,
  hasAi = false
): ContentAnalysisResult {
  const config: ContentRulesConfig = {
    ...DEFAULT_RULES_CONFIG,
    ...userConfig
  };

  const sentences = splitIntoSentences(text);
  const sentenceStrings = sentences.map(s => s.text);
  const metrics = calculateReadability(text, sentenceStrings);
  const violations: LintViolation[] = [];
  const enabled = new Set(config.enabledRules || ['active-voice', 'reading-level', 'jargon', 'brand-terms']);

  for (const sentence of sentences) {
    // 1. Active Voice check
    if (enabled.has('active-voice')) {
      const passive = detectPassiveVoice(sentence.text);
      if (passive.isPassive) {
        violations.push({
          id: `passive-${sentence.index}`,
          ruleId: 'active-voice',
          category: 'active-voice',
          severity: 'warning',
          sentence: sentence.text,
          offendingText: passive.match,
          message: `Passive voice detected ("${passive.match}"). Use active voice to keep copy direct and engaging.`,
          details: { match: passive.match }
        });
      }
    }

    // 2. Jargon check
    if (enabled.has('jargon')) {
      const jargons = detectJargon(sentence.text, config.customJargonTerms);
      for (const item of jargons) {
        violations.push({
          id: `jargon-${sentence.index}-${item.term}`,
          ruleId: 'jargon-buzzword',
          category: 'jargon',
          severity: 'warning',
          sentence: sentence.text,
          offendingText: item.term,
          suggestedFix: item.suggestion,
          message: item.suggestion
            ? `Corporate jargon detected: "${item.term}". Consider using "${item.suggestion}".`
            : `Corporate jargon detected: "${item.term}". Use clear, plain language.`,
          details: { term: item.term, suggestion: item.suggestion }
        });
      }
    }

    // 3. Brand Terms check
    if (enabled.has('brand-terms')) {
      const brandHits = detectBrandViolations(sentence.text, config.bannedTerms, config.preferredTerms);
      for (const hit of brandHits) {
        violations.push({
          id: `brand-${sentence.index}-${hit.term}`,
          ruleId: 'brand-guidelines',
          category: 'brand-terms',
          severity: hit.isBanned ? 'error' : 'warning',
          sentence: sentence.text,
          offendingText: hit.term,
          suggestedFix: hit.suggestion,
          message: hit.suggestion
            ? `Brand violation: "${hit.term}" is deprecated. Preferred term: "${hit.suggestion}".`
            : `Brand violation: "${hit.term}" is forbidden according to brand guidelines.`,
          details: { term: hit.term, isBanned: hit.isBanned, suggestion: hit.suggestion }
        });
      }
    }

    // 4. Reading Level / Sentence Length check
    if (enabled.has('reading-level')) {
      const maxWords = config.maxSentenceWords ?? 28;
      if (sentence.wordCount > maxWords) {
        violations.push({
          id: `length-${sentence.index}`,
          ruleId: 'sentence-length',
          category: 'reading-level',
          severity: 'info',
          sentence: sentence.text,
          message: `Long sentence (${sentence.wordCount} words, limit: ${maxWords}). Break into shorter sentences for better readability.`,
          details: { wordCount: sentence.wordCount, limit: maxWords }
        });
      }

      // Sentence-level grade level check
      const sentenceMetrics = calculateReadability(sentence.text, [sentence.text]);
      const maxGrade = config.maxGradeLevel ?? 10;
      if (sentenceMetrics.fleschKincaidGrade > maxGrade && sentence.wordCount > 10) {
        violations.push({
          id: `grade-${sentence.index}`,
          ruleId: 'reading-grade-level',
          category: 'reading-level',
          severity: 'warning',
          sentence: sentence.text,
          message: `High complexity (Grade ${sentenceMetrics.fleschKincaidGrade}, target ≤ ${maxGrade}). Simplify vocabulary and structure.`,
          details: { grade: sentenceMetrics.fleschKincaidGrade, targetGrade: maxGrade }
        });
      }
    }
  }

  const healthScore = computeHealthScore(metrics, violations);

  return {
    sentences,
    metrics,
    violations,
    healthScore,
    aiAvailable: hasAi
  };
}

/**
 * Formats prompt for Chrome Built-in AI (Gemini Nano) rewrite
 */
export function formatRewritePrompt(
  sentence: string,
  violation?: LintViolation,
  brandVoice?: string
): string {
  const instructions: string[] = [
    'You are a professional editorial copy editor and technical writer.',
    'Rewrite the following single sentence to improve clarity and engagement.',
    'Rules to follow:',
    '- Write in direct, active voice.',
    '- Use plain English and eliminate corporate buzzwords.',
    '- Keep the original meaning intact.',
    '- Return ONLY the rewritten sentence without quotes, intro, or explanations.'
  ];

  if (brandVoice) {
    instructions.push(`- Adhere strictly to this brand voice: ${brandVoice}`);
  }

  if (violation) {
    if (violation.category === 'active-voice') {
      instructions.push(`- Change the passive construction ("${violation.offendingText || ''}") to active voice.`);
    } else if (violation.category === 'jargon' && violation.suggestedFix) {
      instructions.push(`- Replace jargon "${violation.offendingText}" with "${violation.suggestedFix}" or simpler language.`);
    } else if (violation.category === 'brand-terms' && violation.suggestedFix) {
      instructions.push(`- Replace "${violation.offendingText}" with "${violation.suggestedFix}".`);
    } else if (violation.category === 'reading-level') {
      instructions.push('- Split or simplify this sentence for easier reading comprehension.');
    }
  }

  return `${instructions.join('\n')}\n\nOriginal sentence:\n${sentence}\n\nRewritten sentence:`;
}

/**
 * Checks if Chrome Built-in AI is available in the current browser session
 */
export async function checkChromeAiAvailability(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ai) {
    return false;
  }

  try {
    if (window.ai.languageModel) {
      const caps = await window.ai.languageModel.capabilities();
      return caps.available !== 'no';
    }
    if (window.ai.rewriter) {
      const caps = await window.ai.rewriter.capabilities();
      return caps.available !== 'no';
    }
  } catch {
    return false;
  }

  return false;
}

let activeAiSession: AILanguageModel | null = null;

/**
 * Requests a rewritten suggestion from Gemini Nano via window.ai
 */
export async function requestAiRewrite(
  sentence: string,
  violation?: LintViolation,
  brandVoice?: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.ai) {
    throw new Error('Chrome Built-in AI is not available. Enable chrome://flags/#prompt-api-for-gemini-nano');
  }

  // Option A: Use specialized rewriter API if available
  if (window.ai.rewriter) {
    try {
      const caps = await window.ai.rewriter.capabilities();
      if (caps.available !== 'no') {
        const rewriter = await window.ai.rewriter.create({
          tone: 'more-casual',
          format: 'plain-text',
          length: 'as-is',
          sharedContext: brandVoice || 'Clear, active voice technical copy.'
        });
        const result = await rewriter.rewrite(sentence, {
          context: violation?.message || 'Improve clarity and remove passive voice or jargon.'
        });
        rewriter.destroy();
        return result.trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      // Fallback to languageModel
    }
  }

  // Option B: Use languageModel (Prompt API)
  if (window.ai.languageModel) {
    try {
      const caps = await window.ai.languageModel.capabilities();
      if (caps.available === 'no') {
        throw new Error('Gemini Nano model is not ready.');
      }

      if (!activeAiSession) {
        activeAiSession = await window.ai.languageModel.create({
          systemPrompt: 'You are an expert copy editor. Rewrite sentences to be active, concise, clear, and direct. Output ONLY the rewritten sentence.',
          temperature: 0.3,
          topK: 3
        });
      }

      const promptText = formatRewritePrompt(sentence, violation, brandVoice);
      const response = await activeAiSession.prompt(promptText);
      return response.trim().replace(/^["']|["']$/g, '');
    } catch (err: any) {
      // Clean up session if error
      if (activeAiSession) {
        try { activeAiSession.destroy(); } catch {}
        activeAiSession = null;
      }
      throw new Error(`AI rewrite failed: ${err?.message || err}`);
    }
  }

  throw new Error('No compatible Chrome Built-in AI API detected.');
}
