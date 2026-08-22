// src/app.ts
import { defineToolbarApp } from "astro/toolbar";

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

// src/app.ts
var app_default = defineToolbarApp({
  init(canvas, app, _server) {
    const globalConfig = window.__ASTRO_CONTENT_LINTER_CONFIG__ || {};
    const targetSelectors = globalConfig.targetSelectors || ["article", "main", "[data-content-lint]"];
    const brandVoice = globalConfig.brandVoice;
    const rulesConfig = {
      maxGradeLevel: globalConfig.readingLevelTarget ?? 10,
      bannedTerms: globalConfig.bannedTerms,
      preferredTerms: globalConfig.preferredTerms,
      customJargonTerms: globalConfig.customJargonTerms,
      enabledRules: globalConfig.enabledPresets,
      brandVoiceInstructions: brandVoice
    };
    const state = {
      enabled: false,
      targetSelectors,
      config: rulesConfig,
      brandVoice,
      results: new Map,
      overlays: []
    };
    const container = document.createElement("div");
    container.className = "content-linter-root";
    container.innerHTML = `
      <style>
        :host {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #f1f5f9;
        }
        .content-linter-root {
          position: fixed;
          bottom: 70px;
          right: 20px;
          width: 380px;
          max-height: calc(100vh - 100px);
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 999999;
          font-size: 13px;
        }
        .header {
          padding: 14px 16px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .title {
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f8fafc;
        }
        .ai-pill {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .ai-ready {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid #059669;
        }
        .ai-off {
          background: rgba(148, 163, 184, 0.2);
          color: #94a3b8;
          border: 1px solid #64748b;
        }
        .score-bar {
          padding: 12px 16px;
          background: #1e293b;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          border-bottom: 1px solid #334155;
          text-align: center;
        }
        .metric-box {
          background: #0f172a;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #334155;
        }
        .metric-val {
          font-size: 16px;
          font-weight: 700;
          color: #38bdf8;
        }
        .metric-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #94a3b8;
          margin-top: 2px;
        }
        .health-high { color: #4ade80 !important; }
        .health-mid { color: #fbbf24 !important; }
        .health-low { color: #f87171 !important; }
        .content {
          padding: 12px;
          overflow-y: auto;
          max-height: 420px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .empty-state {
          padding: 24px 16px;
          text-align: center;
          color: #94a3b8;
        }
        .violation-card {
          background: #1e293b;
          border-left: 4px solid #64748b;
          padding: 10px;
          border-radius: 0 6px 6px 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .violation-card:hover {
          background: #273549;
        }
        .v-active-voice { border-left-color: #f59e0b; }
        .v-jargon { border-left-color: #a855f7; }
        .v-brand-terms { border-left-color: #ef4444; }
        .v-reading-level { border-left-color: #38bdf8; }
        .v-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 600;
        }
        .v-msg {
          font-size: 12px;
          color: #e2e8f0;
          line-height: 1.4;
        }
        .v-sentence {
          font-size: 11px;
          font-style: italic;
          color: #94a3b8;
          border-left: 2px solid #475569;
          padding-left: 6px;
          margin-top: 2px;
        }
        .rewrite-btn {
          margin-top: 4px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .rewrite-btn:hover {
          opacity: 0.9;
        }
        .rewrite-box {
          margin-top: 6px;
          padding: 8px;
          background: #090d16;
          border: 1px dashed #6366f1;
          border-radius: 4px;
          font-size: 12px;
          color: #a5b4fc;
        }
        .apply-btn {
          margin-top: 4px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 2px 6px;
          font-size: 10px;
          cursor: pointer;
        }
      </style>
      <div class="header">
        <div class="title">
          <span>✨ Content Voice & Linter</span>
        </div>
        <div id="ai-status" class="ai-pill ai-off">Checking AI...</div>
      </div>
      <div class="score-bar">
        <div class="metric-box">
          <div id="score-val" class="metric-val">100%</div>
          <div class="metric-label">Health Score</div>
        </div>
        <div class="metric-box">
          <div id="grade-val" class="metric-val">-</div>
          <div class="metric-label">Grade Level</div>
        </div>
        <div class="metric-box">
          <div id="issues-val" class="metric-val">0</div>
          <div class="metric-label">Violations</div>
        </div>
      </div>
      <div class="content" id="violations-list">
        <div class="empty-state">Scan page content...</div>
      </div>
    `;
    canvas.appendChild(container);
    let hasAi = false;
    checkChromeAiAvailability().then((available) => {
      hasAi = available;
      const pill = container.querySelector("#ai-status");
      if (pill) {
        if (available) {
          pill.className = "ai-pill ai-ready";
          pill.textContent = "✨ Gemini Nano Ready";
        } else {
          pill.className = "ai-pill ai-off";
          pill.textContent = "⚡ Rule-based (AI off)";
        }
      }
    });
    const styleId = "astro-content-linter-styles";
    function injectHostStyles() {
      if (document.getElementById(styleId))
        return;
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `
        .astro-lint-highlight {
          position: relative;
          cursor: pointer;
          border-radius: 2px;
          transition: background-color 0.2s ease;
        }
        .astro-lint-active-voice {
          border-bottom: 2px wavy #f59e0b;
          background-color: rgba(245, 158, 11, 0.15);
        }
        .astro-lint-jargon {
          border-bottom: 2px wavy #a855f7;
          background-color: rgba(168, 85, 247, 0.15);
        }
        .astro-lint-brand-terms {
          border-bottom: 2px wavy #ef4444;
          background-color: rgba(239, 68, 68, 0.15);
        }
        .astro-lint-reading-level {
          border-bottom: 2px wavy #38bdf8;
          background-color: rgba(56, 189, 248, 0.15);
        }
        .astro-lint-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 4px;
          margin-left: 4px;
          vertical-align: middle;
          text-transform: uppercase;
          pointer-events: auto;
        }
        .astro-lint-badge-active-voice { background: #f59e0b; color: #000; }
        .astro-lint-badge-jargon { background: #a855f7; color: #fff; }
        .astro-lint-badge-brand-terms { background: #ef4444; color: #fff; }
        .astro-lint-badge-reading-level { background: #38bdf8; color: #000; }
      `;
      document.head.appendChild(s);
    }
    function removeHostStyles() {
      const s = document.getElementById(styleId);
      if (s)
        s.remove();
    }
    function clearHighlights() {
      document.querySelectorAll(".astro-lint-badge").forEach((b) => b.remove());
      document.querySelectorAll(".astro-lint-highlight").forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          parent.normalize();
        }
      });
    }
    function runScan() {
      if (!state.enabled)
        return;
      clearHighlights();
      injectHostStyles();
      const targets = [];
      for (const selector of state.targetSelectors) {
        document.querySelectorAll(selector).forEach((el) => targets.push(el));
      }
      if (targets.length === 0) {
        const fallback = document.querySelector("article") || document.querySelector("main");
        if (fallback)
          targets.push(fallback);
      }
      state.results.clear();
      const allViolations = [];
      let totalWords = 0;
      let totalSentences = 0;
      let totalGrade = 0;
      for (const target of targets) {
        const text = target.textContent || "";
        const analysis = analyzeContent(text, state.config, hasAi);
        state.results.set(target, analysis);
        allViolations.push(...analysis.violations);
        totalWords += analysis.metrics.words;
        totalSentences += analysis.metrics.sentences;
        totalGrade += analysis.metrics.fleschKincaidGrade;
        highlightTargetElement(target, analysis.violations);
      }
      app.toggleNotification({
        state: allViolations.length > 0,
        level: allViolations.some((v) => v.severity === "error") ? "error" : "warning"
      });
      renderDashboard(allViolations, totalWords, totalSentences, totalGrade, targets.length);
    }
    function highlightTargetElement(rootEl, violations) {
      if (violations.length === 0)
        return;
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.nodeValue && node.nodeValue.trim().length > 0) {
          textNodes.push(node);
        }
      }
      for (const v of violations) {
        for (const textNode of textNodes) {
          const text = textNode.nodeValue || "";
          if (!v.offendingText && !v.sentence)
            continue;
          const snippet = v.offendingText || v.sentence.slice(0, 30);
          const idx = text.indexOf(snippet);
          if (idx !== -1 && textNode.parentNode) {
            try {
              const range = document.createRange();
              range.setStart(textNode, idx);
              range.setEnd(textNode, idx + snippet.length);
              const wrapper = document.createElement("span");
              wrapper.className = `astro-lint-highlight astro-lint-${v.category}`;
              wrapper.title = `${v.category.toUpperCase()}: ${v.message}`;
              wrapper.dataset.violationId = v.id;
              const badge = document.createElement("span");
              badge.className = `astro-lint-badge astro-lint-badge-${v.category}`;
              badge.textContent = v.category === "active-voice" ? "Passive" : v.category === "brand-terms" ? "Brand" : v.category === "jargon" ? "Jargon" : "Readability";
              range.surroundContents(wrapper);
              wrapper.appendChild(badge);
              wrapper.addEventListener("click", (e) => {
                e.stopPropagation();
                focusViolationInDashboard(v);
              });
              break;
            } catch {}
          }
        }
      }
    }
    function renderDashboard(violations, words, sentences, gradeSum, targetCount) {
      const scoreVal = container.querySelector("#score-val");
      const gradeVal = container.querySelector("#grade-val");
      const issuesVal = container.querySelector("#issues-val");
      const list = container.querySelector("#violations-list");
      const avgGrade = targetCount > 0 && sentences > 0 ? (gradeSum / targetCount).toFixed(1) : "-";
      const health = Math.max(0, 100 - violations.length * 8);
      if (scoreVal) {
        scoreVal.textContent = `${health}%`;
        scoreVal.className = `metric-val ${health > 80 ? "health-high" : health > 50 ? "health-mid" : "health-low"}`;
      }
      if (gradeVal)
        gradeVal.textContent = avgGrade !== "-" ? `Gr ${avgGrade}` : "-";
      if (issuesVal)
        issuesVal.textContent = `${violations.length}`;
      if (!list)
        return;
      list.innerHTML = "";
      if (violations.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div style="font-size: 24px; margin-bottom: 6px;">\uD83C\uDF89</div>
            <strong>Great copy!</strong>
            <p style="font-size: 11px; margin-top: 4px;">No voice or readability violations detected across ${words} words.</p>
          </div>
        `;
        return;
      }
      for (const v of violations) {
        const card = document.createElement("div");
        card.className = `violation-card v-${v.category}`;
        card.id = `card-${v.id}`;
        card.innerHTML = `
          <div class="v-head">
            <span>${v.category.toUpperCase()}</span>
            <span style="color: #94a3b8; font-weight: normal;">${v.severity}</span>
          </div>
          <div class="v-msg">${v.message}</div>
          <div class="v-sentence">"${v.sentence}"</div>
          <button class="rewrite-btn" data-violation-id="${v.id}">
            ✨ Suggest Rewrite (Gemini Nano)
          </button>
          <div class="rewrite-slot" style="display: none;"></div>
        `;
        const rewriteBtn = card.querySelector(".rewrite-btn");
        const slot = card.querySelector(".rewrite-slot");
        rewriteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          rewriteBtn.disabled = true;
          rewriteBtn.textContent = "✨ Rewriting with Nano...";
          slot.style.display = "block";
          slot.innerHTML = '<span style="color: #94a3b8;">Processing on-device AI...</span>';
          try {
            const rewritten = await requestAiRewrite(v.sentence, v, state.brandVoice);
            slot.innerHTML = `
              <div class="rewrite-box">
                <div><strong>AI Suggestion:</strong></div>
                <div style="margin-top: 2px;">${rewritten}</div>
                <button class="apply-btn">Copy / Apply</button>
              </div>
            `;
            const applyBtn = slot.querySelector(".apply-btn");
            applyBtn?.addEventListener("click", (ev) => {
              ev.stopPropagation();
              navigator.clipboard?.writeText(rewritten);
              applyBtn.textContent = "Copied to clipboard!";
            });
          } catch (err) {
            slot.innerHTML = `
              <div class="rewrite-box" style="border-color: #ef4444; color: #fca5a5;">
                ${err?.message || "Gemini Nano error"}
              </div>
            `;
          } finally {
            rewriteBtn.disabled = false;
            rewriteBtn.textContent = "✨ Re-generate Rewrite";
          }
        });
        list.appendChild(card);
      }
    }
    function focusViolationInDashboard(v) {
      const card = container.querySelector(`#card-${v.id}`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("highlight-card");
      }
    }
    app.onToggled(({ state: isEnabled }) => {
      state.enabled = isEnabled;
      container.style.display = isEnabled ? "flex" : "none";
      if (isEnabled) {
        runScan();
      } else {
        clearHighlights();
        removeHostStyles();
      }
    });
    container.style.display = "none";
    const observer = new MutationObserver(() => {
      if (state.enabled) {
        runScan();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
});
export {
  app_default as default
};
