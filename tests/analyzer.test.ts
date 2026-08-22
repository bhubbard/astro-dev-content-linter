import { describe, expect, it } from 'bun:test';
import {
  splitIntoSentences,
  computeHealthScore,
  analyzeContent,
  formatRewritePrompt,
  checkChromeAiAvailability
} from '../src/analyzer.js';

describe('Sentence Splitter', () => {
  it('splits simple sentences cleanly', () => {
    const text = 'Astro is fast. It uses islands architecture. You will love it!';
    const sentences = splitIntoSentences(text);
    expect(sentences.length).toBe(3);
    expect(sentences[0].text).toBe('Astro is fast.');
    expect(sentences[1].text).toBe('It uses islands architecture.');
    expect(sentences[2].text).toBe('You will love it!');
  });

  it('preserves common abbreviations without prematurely splitting', () => {
    const text = 'Use e.g. Tailwind or UnoCSS for styling. Check Dr. Smith vs. Jones report.';
    const sentences = splitIntoSentences(text);
    expect(sentences.length).toBe(2);
    expect(sentences[0].text).toContain('e.g.');
    expect(sentences[1].text).toContain('Dr.');
    expect(sentences[1].text).toContain('vs.');
  });

  it('preserves decimal numbers and software versions', () => {
    const text = 'We upgraded to Astro 5.4.0 today. The performance increased by 3.14 times!';
    const sentences = splitIntoSentences(text);
    expect(sentences.length).toBe(2);
    expect(sentences[0].text).toContain('5.4.0');
    expect(sentences[1].text).toContain('3.14');
  });

  it('handles empty or whitespace strings', () => {
    expect(splitIntoSentences('')).toEqual([]);
    expect(splitIntoSentences('   \n\t  ')).toEqual([]);
  });
});

describe('Health Score Calculation', () => {
  it('gives 100 for clean text without violations', () => {
    const metrics = {
      words: 20,
      sentences: 2,
      syllables: 25,
      characters: 100,
      fleschReadingEase: 75,
      fleschKincaidGrade: 6,
      averageWordsPerSentence: 10,
      averageSyllablesPerWord: 1.25
    };
    expect(computeHealthScore(metrics, [])).toBe(100);
  });

  it('deducts points for errors, warnings, and low readability', () => {
    const metrics = {
      words: 60,
      sentences: 1,
      syllables: 150,
      characters: 400,
      fleschReadingEase: 20,
      fleschKincaidGrade: 16,
      averageWordsPerSentence: 60,
      averageSyllablesPerWord: 2.5
    };
    const violations = [
      {
        id: '1',
        ruleId: 'brand-guidelines',
        category: 'brand-terms' as const,
        severity: 'error' as const,
        message: 'Banned term',
        sentence: 'Sample sentence.'
      },
      {
        id: '2',
        ruleId: 'active-voice',
        category: 'active-voice' as const,
        severity: 'warning' as const,
        message: 'Passive voice',
        sentence: 'Sample sentence.'
      }
    ];

    const score = computeHealthScore(metrics, violations);
    expect(score).toBeLessThan(70);
  });
});

describe('Full Content Analysis', () => {
  it('detects multiple violation categories across sample copy', () => {
    const rawCopy = `
      The documentation was written by our rockstar engineers.
      We need to leverage cross-functional synergy to move the needle.
      Please whitelist this IP address before proceeding.
    `;

    const result = analyzeContent(rawCopy);
    expect(result.sentences.length).toBe(3);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);

    const categories = result.violations.map(v => v.category);
    expect(categories).toContain('active-voice');
    expect(categories).toContain('jargon');
    expect(categories).toContain('brand-terms');
  });

  it('respects custom rules configurations', () => {
    const copy = 'The report was generated yesterday.';
    const result = analyzeContent(copy, {
      enabledRules: ['reading-level'] // disable active-voice check
    });

    const hasPassive = result.violations.some(v => v.category === 'active-voice');
    expect(hasPassive).toBe(false);
  });
});

describe('Gemini Nano Prompt Formatting', () => {
  it('generates a structured prompt including brand voice and violation details', () => {
    const violation = {
      id: 'v1',
      ruleId: 'active-voice',
      category: 'active-voice' as const,
      severity: 'warning' as const,
      message: 'Passive voice detected',
      offendingText: 'was configured',
      sentence: 'The database was configured by the admin.'
    };

    const prompt = formatRewritePrompt(
      violation.sentence,
      violation,
      'Friendly, developer-first, concise.'
    );

    expect(prompt).toContain('You are a professional editorial copy editor');
    expect(prompt).toContain('Friendly, developer-first, concise.');
    expect(prompt).toContain('was configured');
    expect(prompt).toContain('Original sentence:');
    expect(prompt).toContain(violation.sentence);
  });
});

describe('Chrome AI Availability Check', () => {
  it('returns false when running in non-browser or standard node/bun environment', async () => {
    const isAvailable = await checkChromeAiAvailability();
    expect(isAvailable).toBe(false);
  });
});
