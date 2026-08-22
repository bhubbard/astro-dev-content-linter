// src/index.ts
import { fileURLToPath } from "node:url";

// src/rules.ts
var DEFAULT_RULES_CONFIG = {
  maxGradeLevel: 10,
  maxSentenceWords: 28,
  bannedTerms: [
    "whitelist",
    "blacklist",
    "master/slave",
    "ninja",
    "rockstar",
    "guru"
  ],
  preferredTerms: {
    whitelist: "allowlist",
    blacklist: "blocklist",
    "master/slave": "primary/replica",
    native: "built-in",
    utilize: "use",
    "in order to": "to",
    "at this point in time": "now",
    "due to the fact that": "because",
    "for the purpose of": "to",
    "with reference to": "regarding"
  },
  customJargonTerms: [],
  brandVoiceInstructions: "Direct, clear, active voice, empathetic, and developer-friendly without corporate fluff.",
  enabledRules: ["active-voice", "reading-level", "jargon", "brand-terms"]
};
var BUILT_IN_JARGON = {
  synergy: "collaboration / teamwork",
  "paradigm shift": "fundamental change",
  leverage: "use / apply",
  "move the needle": "make measurable progress",
  "circle back": "follow up",
  "boil the ocean": "overcomplicate",
  "low-hanging fruit": "easy wins",
  bandwidth: "capacity / time",
  "deep dive": "detailed look / explore",
  "touch base": "contact / talk",
  "actionable insights": "practical advice",
  "mission critical": "vital / essential",
  "bleeding edge": "experimental / latest",
  "drill down": "inspect / examine",
  "game changer": "significant innovation",
  "outside the box": "creatively",
  "value add": "benefit / value",
  "holistic approach": "complete solution",
  wheelhouse: "expertise / specialty",
  "core competency": "main skill",
  "table this": "postpone / delay",
  ping: "message / email",
  seamlessly: "smoothly",
  revolutionize: "improve / transform",
  disruptive: "innovative / groundbreaking"
};
var IRREGULAR_PAST_PARTICIPLES = new Set([
  "been",
  "born",
  "become",
  "begun",
  "bitten",
  "blown",
  "broken",
  "brought",
  "built",
  "bought",
  "caught",
  "chosen",
  "done",
  "drawn",
  "driven",
  "eaten",
  "fallen",
  "fed",
  "felt",
  "found",
  "flown",
  "forgotten",
  "forgiven",
  "frozen",
  "given",
  "gone",
  "grown",
  "hung",
  "heard",
  "hidden",
  "held",
  "kept",
  "known",
  "laid",
  "led",
  "left",
  "lent",
  "lost",
  "made",
  "meant",
  "met",
  "paid",
  "put",
  "read",
  "ridden",
  "rung",
  "risen",
  "run",
  "said",
  "seen",
  "sold",
  "sent",
  "set",
  "shaken",
  "shone",
  "shot",
  "shown",
  "shut",
  "sung",
  "sunk",
  "sat",
  "slept",
  "spoken",
  "spent",
  "stood",
  "stolen",
  "struck",
  "sworn",
  "swept",
  "swum",
  "taken",
  "taught",
  "torn",
  "told",
  "thought",
  "thrown",
  "understood",
  "woken",
  "worn",
  "won",
  "written"
]);
var TO_BE_VERBS = new Set([
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "am",
  "'s",
  "'re"
]);
function countSyllablesInWord(rawWord) {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!word)
    return 0;
  if (word.length <= 3)
    return 1;
  let clean = word;
  if (clean.endsWith("e") && !clean.endsWith("le")) {
    clean = clean.slice(0, -1);
  }
  const matches = clean.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  if (word.endsWith("ed") && !word.endsWith("ted") && !word.endsWith("ded")) {
    count = Math.max(1, count - 1);
  }
  if (word.endsWith("es") && !word.endsWith("ses") && !word.endsWith("zes") && !word.endsWith("shes") && !word.endsWith("ches")) {
    count = Math.max(1, count - 1);
  }
  return Math.max(1, count);
}
function calculateReadability(text, sentences) {
  const words = text.match(/[a-zA-Z0-9'-]+/g) || [];
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const characterCount = text.replace(/\s/g, "").length;
  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllablesInWord(word);
  }
  syllableCount = Math.max(1, syllableCount);
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 1;
  let fleschReadingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  fleschReadingEase = Math.min(100, Math.max(0, Math.round(fleschReadingEase * 10) / 10));
  let fleschKincaidGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
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
function detectPassiveVoice(sentence) {
  const words = sentence.match(/[a-zA-Z']+/g) || [];
  if (words.length < 2)
    return { isPassive: false };
  for (let i = 0;i < words.length - 1; i++) {
    const currentWord = words[i].toLowerCase();
    if (TO_BE_VERBS.has(currentWord)) {
      for (let j = i + 1;j <= Math.min(i + 2, words.length - 1); j++) {
        const targetWord = words[j].toLowerCase();
        const isPastParticiple = targetWord.endsWith("ed") && targetWord.length > 3 || IRREGULAR_PAST_PARTICIPLES.has(targetWord);
        if (isPastParticiple) {
          const snippet = words.slice(i, j + 1).join(" ");
          return { isPassive: true, match: snippet };
        }
      }
    }
  }
  return { isPassive: false };
}
function detectJargon(sentence, customTerms = []) {
  const found = [];
  const lowerSentence = sentence.toLowerCase();
  for (const [term, suggestion] of Object.entries(BUILT_IN_JARGON)) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    if (regex.test(lowerSentence)) {
      found.push({ term, suggestion });
    }
  }
  for (const term of customTerms) {
    if (!term)
      continue;
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    if (regex.test(lowerSentence) && !found.some((f) => f.term.toLowerCase() === term.toLowerCase())) {
      found.push({ term });
    }
  }
  return found;
}
function detectBrandViolations(sentence, bannedTerms = [], preferredTerms = {}) {
  const found = [];
  const lowerSentence = sentence.toLowerCase();
  for (const [term, replacement] of Object.entries(preferredTerms)) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    if (regex.test(lowerSentence)) {
      found.push({ term, suggestion: replacement, isBanned: false });
    }
  }
  for (const term of bannedTerms) {
    if (!term)
      continue;
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    if (regex.test(lowerSentence) && !found.some((f) => f.term.toLowerCase() === term.toLowerCase())) {
      found.push({ term, isBanned: true });
    }
  }
  return found;
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// src/analyzer.ts
function splitIntoSentences(text) {
  if (!text || !text.trim())
    return [];
  const sanitized = text.replace(/\r\n/g, `
`).replace(/[\t\f]/g, " ").trim();
  const placeholderMap = new Map;
  let placeholderIndex = 0;
  const protect = (match) => {
    const key = `__P_${placeholderIndex++}__`;
    placeholderMap.set(key, match);
    return key;
  };
  const protectedText = sanitized.replace(/\b(e\.g\.|i\.e\.|etc\.|vs\.|mr\.|mrs\.|ms\.|dr\.|prof\.|inc\.|ltd\.|dept\.|approx\.)/gi, protect).replace(/\b\d+\.\d+(\.\d+)?\b/g, protect).replace(/https?:\/\/[^\s]+/g, protect).replace(/\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, protect);
  const rawChunks = protectedText.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'‘])|\n{2,}|\n(?=[-*#\d])/g);
  const sentences = [];
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
function computeHealthScore(metrics, violations) {
  if (metrics.sentences === 0)
    return 100;
  let score = 100;
  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;
  const infoCount = violations.filter((v) => v.severity === "info").length;
  score -= errorCount * 12;
  score -= warningCount * 6;
  score -= infoCount * 2;
  if (metrics.fleschReadingEase < 40) {
    score -= Math.round((40 - metrics.fleschReadingEase) * 0.4);
  }
  if (metrics.fleschKincaidGrade > 12) {
    score -= Math.round((metrics.fleschKincaidGrade - 12) * 3);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
function analyzeContent(text, userConfig, hasAi = false) {
  const config = {
    ...DEFAULT_RULES_CONFIG,
    ...userConfig
  };
  const sentences = splitIntoSentences(text);
  const sentenceStrings = sentences.map((s) => s.text);
  const metrics = calculateReadability(text, sentenceStrings);
  const violations = [];
  const enabled = new Set(config.enabledRules || ["active-voice", "reading-level", "jargon", "brand-terms"]);
  for (const sentence of sentences) {
    if (enabled.has("active-voice")) {
      const passive = detectPassiveVoice(sentence.text);
      if (passive.isPassive) {
        violations.push({
          id: `passive-${sentence.index}`,
          ruleId: "active-voice",
          category: "active-voice",
          severity: "warning",
          sentence: sentence.text,
          offendingText: passive.match,
          message: `Passive voice detected ("${passive.match}"). Use active voice to keep copy direct and engaging.`,
          details: { match: passive.match }
        });
      }
    }
    if (enabled.has("jargon")) {
      const jargons = detectJargon(sentence.text, config.customJargonTerms);
      for (const item of jargons) {
        violations.push({
          id: `jargon-${sentence.index}-${item.term}`,
          ruleId: "jargon-buzzword",
          category: "jargon",
          severity: "warning",
          sentence: sentence.text,
          offendingText: item.term,
          suggestedFix: item.suggestion,
          message: item.suggestion ? `Corporate jargon detected: "${item.term}". Consider using "${item.suggestion}".` : `Corporate jargon detected: "${item.term}". Use clear, plain language.`,
          details: { term: item.term, suggestion: item.suggestion }
        });
      }
    }
    if (enabled.has("brand-terms")) {
      const brandHits = detectBrandViolations(sentence.text, config.bannedTerms, config.preferredTerms);
      for (const hit of brandHits) {
        violations.push({
          id: `brand-${sentence.index}-${hit.term}`,
          ruleId: "brand-guidelines",
          category: "brand-terms",
          severity: hit.isBanned ? "error" : "warning",
          sentence: sentence.text,
          offendingText: hit.term,
          suggestedFix: hit.suggestion,
          message: hit.suggestion ? `Brand violation: "${hit.term}" is deprecated. Preferred term: "${hit.suggestion}".` : `Brand violation: "${hit.term}" is forbidden according to brand guidelines.`,
          details: { term: hit.term, isBanned: hit.isBanned, suggestion: hit.suggestion }
        });
      }
    }
    if (enabled.has("reading-level")) {
      const maxWords = config.maxSentenceWords ?? 28;
      if (sentence.wordCount > maxWords) {
        violations.push({
          id: `length-${sentence.index}`,
          ruleId: "sentence-length",
          category: "reading-level",
          severity: "info",
          sentence: sentence.text,
          message: `Long sentence (${sentence.wordCount} words, limit: ${maxWords}). Break into shorter sentences for better readability.`,
          details: { wordCount: sentence.wordCount, limit: maxWords }
        });
      }
      const sentenceMetrics = calculateReadability(sentence.text, [sentence.text]);
      const maxGrade = config.maxGradeLevel ?? 10;
      if (sentenceMetrics.fleschKincaidGrade > maxGrade && sentence.wordCount > 10) {
        violations.push({
          id: `grade-${sentence.index}`,
          ruleId: "reading-grade-level",
          category: "reading-level",
          severity: "warning",
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
function formatRewritePrompt(sentence, violation, brandVoice) {
  const instructions = [
    "You are a professional editorial copy editor and technical writer.",
    "Rewrite the following single sentence to improve clarity and engagement.",
    "Rules to follow:",
    "- Write in direct, active voice.",
    "- Use plain English and eliminate corporate buzzwords.",
    "- Keep the original meaning intact.",
    "- Return ONLY the rewritten sentence without quotes, intro, or explanations."
  ];
  if (brandVoice) {
    instructions.push(`- Adhere strictly to this brand voice: ${brandVoice}`);
  }
  if (violation) {
    if (violation.category === "active-voice") {
      instructions.push(`- Change the passive construction ("${violation.offendingText || ""}") to active voice.`);
    } else if (violation.category === "jargon" && violation.suggestedFix) {
      instructions.push(`- Replace jargon "${violation.offendingText}" with "${violation.suggestedFix}" or simpler language.`);
    } else if (violation.category === "brand-terms" && violation.suggestedFix) {
      instructions.push(`- Replace "${violation.offendingText}" with "${violation.suggestedFix}".`);
    } else if (violation.category === "reading-level") {
      instructions.push("- Split or simplify this sentence for easier reading comprehension.");
    }
  }
  return `${instructions.join(`
`)}

Original sentence:
${sentence}

Rewritten sentence:`;
}
async function checkChromeAiAvailability() {
  if (typeof window === "undefined" || !window.ai) {
    return false;
  }
  try {
    if (window.ai.languageModel) {
      const caps = await window.ai.languageModel.capabilities();
      return caps.available !== "no";
    }
    if (window.ai.rewriter) {
      const caps = await window.ai.rewriter.capabilities();
      return caps.available !== "no";
    }
  } catch {
    return false;
  }
  return false;
}
var activeAiSession = null;
async function requestAiRewrite(sentence, violation, brandVoice) {
  if (typeof window === "undefined" || !window.ai) {
    throw new Error("Chrome Built-in AI is not available. Enable chrome://flags/#prompt-api-for-gemini-nano");
  }
  if (window.ai.rewriter) {
    try {
      const caps = await window.ai.rewriter.capabilities();
      if (caps.available !== "no") {
        const rewriter = await window.ai.rewriter.create({
          tone: "more-casual",
          format: "plain-text",
          length: "as-is",
          sharedContext: brandVoice || "Clear, active voice technical copy."
        });
        const result = await rewriter.rewrite(sentence, {
          context: violation?.message || "Improve clarity and remove passive voice or jargon."
        });
        rewriter.destroy();
        return result.trim().replace(/^["']|["']$/g, "");
      }
    } catch {}
  }
  if (window.ai.languageModel) {
    try {
      const caps = await window.ai.languageModel.capabilities();
      if (caps.available === "no") {
        throw new Error("Gemini Nano model is not ready.");
      }
      if (!activeAiSession) {
        activeAiSession = await window.ai.languageModel.create({
          systemPrompt: "You are an expert copy editor. Rewrite sentences to be active, concise, clear, and direct. Output ONLY the rewritten sentence.",
          temperature: 0.3,
          topK: 3
        });
      }
      const promptText = formatRewritePrompt(sentence, violation, brandVoice);
      const response = await activeAiSession.prompt(promptText);
      return response.trim().replace(/^["']|["']$/g, "");
    } catch (err) {
      if (activeAiSession) {
        try {
          activeAiSession.destroy();
        } catch {}
        activeAiSession = null;
      }
      throw new Error(`AI rewrite failed: ${err?.message || err}`);
    }
  }
  throw new Error("No compatible Chrome Built-in AI API detected.");
}

// src/index.ts
var LINTER_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m18 2 4 4-14 14H4v-4L18 2z"/>
  <path d="m14.5 5.5 4 4"/>
  <path d="m3 21 3-3"/>
  <circle cx="19" cy="19" r="2" fill="currentColor"/>
</svg>
`;
function contentLinter(options = {}) {
  return {
    name: "astro-dev-content-linter",
    hooks: {
      "astro:config:setup": ({ addDevToolbarApp, injectScript }) => {
        const appEntrypoint = fileURLToPath(new URL("./app.js", import.meta.url));
        const serializedConfig = JSON.stringify({
          targetSelectors: options.targetSelectors ?? ["article", "main", "[data-content-lint]"],
          readingLevelTarget: options.readingLevelTarget ?? 10,
          brandVoice: options.brandVoice ?? "Direct, active voice, developer-focused, friendly, concise.",
          preferredTerms: options.preferredTerms ?? {},
          bannedTerms: options.bannedTerms ?? [],
          customJargonTerms: options.customJargonTerms ?? [],
          enabledPresets: options.enabledPresets ?? ["active-voice", "reading-level", "jargon", "brand-terms"],
          rules: options.rules ?? {}
        });
        injectScript("page", `window.__ASTRO_CONTENT_LINTER_CONFIG__ = ${serializedConfig};`);
        addDevToolbarApp({
          id: "astro-dev-content-linter",
          name: "Content Linter",
          icon: LINTER_ICON,
          entrypoint: appEntrypoint
        });
      }
    }
  };
}
var src_default = contentLinter;
export {
  splitIntoSentences,
  requestAiRewrite,
  formatRewritePrompt,
  detectPassiveVoice,
  detectJargon,
  detectBrandViolations,
  src_default as default,
  countSyllablesInWord,
  contentLinter,
  computeHealthScore,
  checkChromeAiAvailability,
  calculateReadability,
  analyzeContent,
  DEFAULT_RULES_CONFIG,
  BUILT_IN_JARGON
};
