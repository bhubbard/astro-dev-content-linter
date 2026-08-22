# astro-dev-content-linter

[![Astro 5+](https://img.shields.io/badge/Astro-5.0%2B-FF5D01?style=flat&logo=astro&logoColor=white)](https://astro.build)
[![Chrome Built-in AI](https://img.shields.io/badge/Chrome%20AI-Gemini%20Nano-4285F4?style=flat&logo=google&logoColor=white)](https://developer.chrome.com/docs/ai/built-in)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-blue?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Astro Dev Toolbar app for editorial voice, reading grade level, brand guidelines, and on-device Gemini Nano suggestions.**

---

## 🎯 Overview

`astro-dev-content-linter` brings automated editorial linting right inside your browser during local development. It inspects `<article>`, `<main>`, or custom page elements and highlights offending sentences with inline badges and color-coded underlines:

- **Active Voice Enforcement**: Flags passive sentences and helps maintain direct, punchy copy.
- **Readability & Grade Level**: Calculates **Flesch Reading Ease** and **Flesch-Kincaid Grade Level** scores to keep copy accessible.
- **Jargon & Buzzword Buster**: Identifies corporate fluff (*synergy*, *paradigm shift*, *move the needle*, *circle back*) and suggests plain-English alternatives.
- **Brand Vocabulary & Terminology**: Enforces inclusive naming and brand terms (e.g. deprecated *whitelist* &rarr; *allowlist*).
- **On-Device AI Rewriting (Gemini Nano)**: Uses Chrome's Built-in Prompt/Rewriter API (`window.ai`) to suggest instant, context-aware rewrites matching your team's tone of voice—with zero cloud API latency and total privacy.

---

## 📦 Installation

```bash
# Using bun
bun add -d astro-dev-content-linter

# Using npm
npm install --save-dev astro-dev-content-linter

# Using pnpm
pnpm add -D astro-dev-content-linter
```

---

## 🚀 Quick Start

Add `contentLinter()` to your `astro.config.mjs`:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import contentLinter from 'astro-dev-content-linter';

export default defineConfig({
  integrations: [
    contentLinter({
      readingLevelTarget: 9, // Target max 9th grade reading level
      brandVoice: 'Concise, direct, friendly, and developer-focused.',
      preferredTerms: {
        'whitelist': 'allowlist',
        'blacklist': 'blocklist',
        'master/slave': 'primary/replica',
        'utilize': 'use'
      }
    })
  ]
});
```

Now start your Astro development server:

```bash
bun run dev
```

Open your app in the browser, click the **Content Linter** icon (✨) in the Astro Dev Toolbar at the bottom of the screen, and see real-time content feedback!

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `targetSelectors` | `string[]` | `['article', 'main', '[data-content-lint]']` | CSS selectors for content containers to lint. |
| `readingLevelTarget` | `number` | `10` | Maximum recommended Flesch-Kincaid grade level. |
| `brandVoice` | `string` | `"Direct, active voice, developer-focused, concise."` | Team voice guide passed into Gemini Nano prompts. |
| `preferredTerms` | `Record<string, string>` | Built-in mappings | Glossary of deprecated words and their preferred alternatives. |
| `bannedTerms` | `string[]` | `['whitelist', 'blacklist', 'ninja', ...]` | List of forbidden words that trigger errors. |
| `customJargonTerms` | `string[]` | `[]` | Additional team or corporate buzzwords to flag. |
| `enabledPresets` | `RuleCategory[]` | `['active-voice', 'reading-level', 'jargon', 'brand-terms']` | Enabled rule modules. |
| `rules` | `ContentRulesConfig` | `{}` | Fine-grained threshold overrides. |

---

## 🧠 Prerequisites for Chrome Built-in AI (Gemini Nano)

The rule-based linter (passive voice, readability statistics, jargon, brand terms) works in **any modern browser**.

To enable **on-device AI rewriting suggestions** powered by Gemini Nano:

1. Use **Google Chrome Dev / Canary** (version 128+).
2. Navigate to `chrome://flags` and configure:
   - **Prompt API for Gemini Nano**: `Enabled`
   - **Enables optimization guide on device**: `Enabled (BypassPerfRequirement)`
3. Restart Chrome.
4. Go to `chrome://components` and find **Optimization Guide On Device Model**. Click **Check for update** to ensure the model has finished downloading locally.

When ready, the dev toolbar app badge will display: **`✨ Gemini Nano Ready`**.

---

## 🧪 Running Tests & Development

```bash
# Install dependencies
bun install

# Run unit test suite
bun test

# Run TypeScript typecheck
bun run typecheck

# Build the integration package
bun run build
```

---

## 📄 License

[MIT](LICENSE)
