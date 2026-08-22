import { defineToolbarApp } from 'astro/toolbar';
import {
  analyzeContent,
  checkChromeAiAvailability,
  requestAiRewrite,
  type ContentAnalysisResult
} from './analyzer.js';
import type { ContentRulesConfig, LintViolation } from './rules.js';

interface LinterClientState {
  enabled: boolean;
  targetSelectors: string[];
  config: Partial<ContentRulesConfig>;
  brandVoice?: string;
  results: Map<Element, ContentAnalysisResult>;
  overlays: HTMLElement[];
}

export default defineToolbarApp({
  init(canvas, app, _server) {
    // Read configuration injected into window or fallback
    const globalConfig = (window as any).__ASTRO_CONTENT_LINTER_CONFIG__ || {};
    const targetSelectors: string[] = globalConfig.targetSelectors || ['article', 'main', '[data-content-lint]'];
    const brandVoice: string | undefined = globalConfig.brandVoice;
    const rulesConfig: Partial<ContentRulesConfig> = {
      maxGradeLevel: globalConfig.readingLevelTarget ?? 10,
      bannedTerms: globalConfig.bannedTerms,
      preferredTerms: globalConfig.preferredTerms,
      customJargonTerms: globalConfig.customJargonTerms,
      enabledRules: globalConfig.enabledPresets,
      brandVoiceInstructions: brandVoice
    };

    const state: LinterClientState = {
      enabled: false,
      targetSelectors,
      config: rulesConfig,
      brandVoice,
      results: new Map(),
      overlays: []
    };

    // Build Toolbar Canvas UI
    const container = document.createElement('div');
    container.className = 'content-linter-root';
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
      const pill = container.querySelector('#ai-status');
      if (pill) {
        if (available) {
          pill.className = 'ai-pill ai-ready';
          pill.textContent = '✨ Gemini Nano Ready';
        } else {
          pill.className = 'ai-pill ai-off';
          pill.textContent = '⚡ Rule-based (AI off)';
        }
      }
    });

    // Inline Highlight & Popover Injection Styles for the Host Page
    const styleId = 'astro-content-linter-styles';
    function injectHostStyles() {
      if (document.getElementById(styleId)) return;
      const s = document.createElement('style');
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
      if (s) s.remove();
    }

    // Clean up all DOM highlights on page
    function clearHighlights() {
      document.querySelectorAll('.astro-lint-badge').forEach(b => b.remove());
      document.querySelectorAll('.astro-lint-highlight').forEach(el => {
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

    // Run content analysis on target elements
    function runScan() {
      if (!state.enabled) return;

      clearHighlights();
      injectHostStyles();

      const targets: Element[] = [];
      for (const selector of state.targetSelectors) {
        document.querySelectorAll(selector).forEach(el => targets.push(el));
      }

      // If no explicit targets matched, fallback to article or main or body
      if (targets.length === 0) {
        const fallback = document.querySelector('article') || document.querySelector('main');
        if (fallback) targets.push(fallback);
      }

      state.results.clear();
      const allViolations: LintViolation[] = [];
      let totalWords = 0;
      let totalSentences = 0;
      let totalGrade = 0;

      for (const target of targets) {
        const text = target.textContent || '';
        const analysis = analyzeContent(text, state.config, hasAi);
        state.results.set(target, analysis);
        allViolations.push(...analysis.violations);
        totalWords += analysis.metrics.words;
        totalSentences += analysis.metrics.sentences;
        totalGrade += analysis.metrics.fleschKincaidGrade;

        // Apply highlights on offending sentences in target DOM
        highlightTargetElement(target, analysis.violations);
      }

      // Update Dev Toolbar Notification & UI
      app.toggleNotification({
        state: allViolations.length > 0,
        level: allViolations.some(v => v.severity === 'error') ? 'error' : 'warning'
      });

      renderDashboard(allViolations, totalWords, totalSentences, totalGrade, targets.length);
    }

    function highlightTargetElement(rootEl: Element, violations: LintViolation[]) {
      if (violations.length === 0) return;

      // Map sentence violation to text nodes
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.trim().length > 0) {
          textNodes.push(node as Text);
        }
      }

      for (const v of violations) {
        for (const textNode of textNodes) {
          const text = textNode.nodeValue || '';
          if (!v.offendingText && !v.sentence) continue;

          const snippet = v.offendingText || v.sentence.slice(0, 30);
          const idx = text.indexOf(snippet);
          if (idx !== -1 && textNode.parentNode) {
            try {
              const range = document.createRange();
              range.setStart(textNode, idx);
              range.setEnd(textNode, idx + snippet.length);

              const wrapper = document.createElement('span');
              wrapper.className = `astro-lint-highlight astro-lint-${v.category}`;
              wrapper.title = `${v.category.toUpperCase()}: ${v.message}`;
              wrapper.dataset.violationId = v.id;

              const badge = document.createElement('span');
              badge.className = `astro-lint-badge astro-lint-badge-${v.category}`;
              badge.textContent = v.category === 'active-voice' ? 'Passive' : v.category === 'brand-terms' ? 'Brand' : v.category === 'jargon' ? 'Jargon' : 'Readability';

              range.surroundContents(wrapper);
              wrapper.appendChild(badge);

              wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                focusViolationInDashboard(v);
              });
              break;
            } catch {
              // DOM manipulation may fail on complex split nodes
            }
          }
        }
      }
    }

    function renderDashboard(
      violations: LintViolation[],
      words: number,
      sentences: number,
      gradeSum: number,
      targetCount: number
    ) {
      const scoreVal = container.querySelector('#score-val');
      const gradeVal = container.querySelector('#grade-val');
      const issuesVal = container.querySelector('#issues-val');
      const list = container.querySelector('#violations-list');

      const avgGrade = targetCount > 0 && sentences > 0 ? (gradeSum / targetCount).toFixed(1) : '-';
      const health = Math.max(0, 100 - (violations.length * 8));

      if (scoreVal) {
        scoreVal.textContent = `${health}%`;
        scoreVal.className = `metric-val ${health > 80 ? 'health-high' : health > 50 ? 'health-mid' : 'health-low'}`;
      }
      if (gradeVal) gradeVal.textContent = avgGrade !== '-' ? `Gr ${avgGrade}` : '-';
      if (issuesVal) issuesVal.textContent = `${violations.length}`;

      if (!list) return;
      list.innerHTML = '';

      if (violations.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div style="font-size: 24px; margin-bottom: 6px;">🎉</div>
            <strong>Great copy!</strong>
            <p style="font-size: 11px; margin-top: 4px;">No voice or readability violations detected across ${words} words.</p>
          </div>
        `;
        return;
      }

      for (const v of violations) {
        const card = document.createElement('div');
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

        const rewriteBtn = card.querySelector('.rewrite-btn') as HTMLButtonElement;
        const slot = card.querySelector('.rewrite-slot') as HTMLElement;

        rewriteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          rewriteBtn.disabled = true;
          rewriteBtn.textContent = '✨ Rewriting with Nano...';
          slot.style.display = 'block';
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

            const applyBtn = slot.querySelector('.apply-btn');
            applyBtn?.addEventListener('click', (ev) => {
              ev.stopPropagation();
              navigator.clipboard?.writeText(rewritten);
              applyBtn.textContent = 'Copied to clipboard!';
            });
          } catch (err: any) {
            slot.innerHTML = `
              <div class="rewrite-box" style="border-color: #ef4444; color: #fca5a5;">
                ${err?.message || 'Gemini Nano error'}
              </div>
            `;
          } finally {
            rewriteBtn.disabled = false;
            rewriteBtn.textContent = '✨ Re-generate Rewrite';
          }
        });

        list.appendChild(card);
      }
    }

    function focusViolationInDashboard(v: LintViolation) {
      const card = container.querySelector(`#card-${v.id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-card');
      }
    }

    // App toggle handler
    app.onToggled(({ state: isEnabled }) => {
      state.enabled = isEnabled;
      container.style.display = isEnabled ? 'flex' : 'none';
      if (isEnabled) {
        runScan();
      } else {
        clearHighlights();
        removeHostStyles();
      }
    });

    // Default hidden until toggled
    container.style.display = 'none';

    // Watch for DOM mutations when enabled
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
