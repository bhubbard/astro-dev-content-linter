import { describe, expect, it } from 'bun:test';
import {
  countSyllablesInWord,
  calculateReadability,
  detectPassiveVoice,
  detectJargon,
  detectBrandViolations,
  DEFAULT_RULES_CONFIG
} from '../src/rules.js';

describe('Syllable Counter', () => {
  it('correctly estimates syllables for common words', () => {
    expect(countSyllablesInWord('the')).toBe(1);
    expect(countSyllablesInWord('code')).toBe(1);
    expect(countSyllablesInWord('developer')).toBe(4);
    expect(countSyllablesInWord('integration')).toBe(4);
    expect(countSyllablesInWord('synergy')).toBe(3);
    expect(countSyllablesInWord('astro')).toBe(2);
  });

  it('handles empty or short words gracefully', () => {
    expect(countSyllablesInWord('')).toBe(0);
    expect(countSyllablesInWord('a')).toBe(1);
    expect(countSyllablesInWord('is')).toBe(1);
  });
});

describe('Readability Metrics (Flesch & Flesch-Kincaid)', () => {
  it('computes reasonable scores for simple copy', () => {
    const text = 'The dog ran fast. It was a sunny day. We played in the park.';
    const sentences = ['The dog ran fast.', 'It was a sunny day.', 'We played in the park.'];
    const metrics = calculateReadability(text, sentences);

    expect(metrics.words).toBe(14);
    expect(metrics.sentences).toBe(3);
    expect(metrics.fleschReadingEase).toBeGreaterThan(70);
    expect(metrics.fleschKincaidGrade).toBeLessThan(6);
  });

  it('computes higher grade levels for complex technical prose', () => {
    const text = 'Heterogeneous distributed architecture necessitates asynchronous synchronization paradigms and multi-threading concurrency primitives.';
    const sentences = [text];
    const metrics = calculateReadability(text, sentences);

    expect(metrics.fleschKincaidGrade).toBeGreaterThan(12);
    expect(metrics.fleschReadingEase).toBeLessThan(30);
  });
});

describe('Passive Voice Detection', () => {
  it('detects passive voice constructions with to-be verbs and past participles', () => {
    const r1 = detectPassiveVoice('The documentation was written by our team.');
    expect(r1.isPassive).toBe(true);
    expect(r1.match).toContain('was written');

    const r2 = detectPassiveVoice('The deployment was easily executed.');
    expect(r2.isPassive).toBe(true);
    expect(r2.match).toContain('was easily executed');

    const r3 = detectPassiveVoice('New features are being developed continuously.');
    expect(r3.isPassive).toBe(true);
  });

  it('does not flag active voice sentences', () => {
    const r1 = detectPassiveVoice('Our team wrote the documentation.');
    expect(r1.isPassive).toBe(false);

    const r2 = detectPassiveVoice('Developers build fast websites using Astro.');
    expect(r2.isPassive).toBe(false);
  });
});

describe('Jargon Detection', () => {
  it('identifies corporate buzzwords and provides alternatives', () => {
    const hits = detectJargon('We need to leverage our synergy and circle back next week.');
    expect(hits.length).toBe(3);
    const terms = hits.map(h => h.term);
    expect(terms).toContain('leverage');
    expect(terms).toContain('synergy');
    expect(terms).toContain('circle back');
  });

  it('supports custom jargon words', () => {
    const hits = detectJargon('Our hyper-growth velocity is skyrocketing.', ['hyper-growth', 'velocity']);
    const terms = hits.map(h => h.term);
    expect(terms).toContain('hyper-growth');
    expect(terms).toContain('velocity');
  });
});

describe('Brand Violations Detection', () => {
  it('detects banned terms and suggests preferred replacements', () => {
    const hits = detectBrandViolations(
      'Please add the IP address to the whitelist in order to utilize the API.',
      DEFAULT_RULES_CONFIG.bannedTerms,
      DEFAULT_RULES_CONFIG.preferredTerms
    );

    const terms = hits.map(h => h.term);
    expect(terms).toContain('whitelist');
    expect(terms).toContain('in order to');
    expect(terms).toContain('utilize');

    const whitelistHit = hits.find(h => h.term === 'whitelist');
    expect(whitelistHit?.suggestion).toBe('allowlist');
  });
});
