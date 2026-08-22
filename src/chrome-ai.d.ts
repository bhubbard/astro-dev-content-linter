/**
 * Complete TypeScript definitions for Chrome Built-in AI (Gemini Nano) APIs
 * Covers window.ai, languageModel, summarizer, rewriter, writer, and translator
 */

export type AICapabilityAvailability = 'readily' | 'after-download' | 'no';

export interface AICapabilityOptions {
  available: AICapabilityAvailability;
  defaultTemperature?: number;
  maxTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface AICreateMonitor {
  ondownloadprogress?: (event: { loaded: number; total: number }) => void;
}

// ==========================================
// 1. Language Model (Prompt API)
// ==========================================

export interface AILanguageModelPromptOptions {
  systemPrompt?: string;
  initialPrompts?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
}

export interface AILanguageModelCloneOptions {
  signal?: AbortSignal;
}

export interface AILanguageModel {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  countPromptTokens(input: string, options?: { signal?: AbortSignal }): Promise<number>;
  maxTokens: number;
  tokensSoFar: number;
  tokensLeft: number;
  topK: number;
  temperature: number;
  clone(options?: AILanguageModelCloneOptions): Promise<AILanguageModel>;
  destroy(): void;
}

export interface AILanguageModelFactory {
  capabilities(): Promise<AICapabilityOptions>;
  create(options?: AILanguageModelPromptOptions): Promise<AILanguageModel>;
}

// ==========================================
// 2. Rewriter API
// ==========================================

export type AIRewriterTone = 'as-is' | 'more-formal' | 'more-casual';
export type AIRewriterFormat = 'as-is' | 'plain-text' | 'markdown';
export type AIRewriterLength = 'as-is' | 'shorter' | 'longer';

export interface AIRewriterCreateOptions {
  sharedContext?: string;
  tone?: AIRewriterTone;
  format?: AIRewriterFormat;
  length?: AIRewriterLength;
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
}

export interface AIRewriteOptions {
  context?: string;
  signal?: AbortSignal;
}

export interface AIRewriter {
  rewrite(input: string, options?: AIRewriteOptions): Promise<string>;
  rewriteStreaming(input: string, options?: AIRewriteOptions): ReadableStream<string>;
  destroy(): void;
}

export interface AIRewriterFactory {
  capabilities(): Promise<AICapabilityOptions>;
  create(options?: AIRewriterCreateOptions): Promise<AIRewriter>;
}

// ==========================================
// 3. Summarizer API
// ==========================================

export type AISummarizerType = 'tl;dr' | 'key-points' | 'teaser' | 'headline';
export type AISummarizerFormat = 'plain-text' | 'markdown';
export type AISummarizerLength = 'short' | 'medium' | 'long';

export interface AISummarizerCreateOptions {
  sharedContext?: string;
  type?: AISummarizerType;
  format?: AISummarizerFormat;
  length?: AISummarizerLength;
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
}

export interface AISummarizeOptions {
  context?: string;
  signal?: AbortSignal;
}

export interface AISummarizer {
  summarize(input: string, options?: AISummarizeOptions): Promise<string>;
  summarizeStreaming(input: string, options?: AISummarizeOptions): ReadableStream<string>;
  destroy(): void;
}

export interface AISummarizerFactory {
  capabilities(): Promise<AICapabilityOptions>;
  create(options?: AISummarizerCreateOptions): Promise<AISummarizer>;
}

// ==========================================
// 4. Writer API
// ==========================================

export type AIWriterTone = 'formal' | 'neutral' | 'casual';
export type AIWriterFormat = 'plain-text' | 'markdown';
export type AIWriterLength = 'short' | 'medium' | 'long';

export interface AIWriterCreateOptions {
  sharedContext?: string;
  tone?: AIWriterTone;
  format?: AIWriterFormat;
  length?: AIWriterLength;
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
}

export interface AIWriteOptions {
  context?: string;
  signal?: AbortSignal;
}

export interface AIWriter {
  write(input: string, options?: AIWriteOptions): Promise<string>;
  writeStreaming(input: string, options?: AIWriteOptions): ReadableStream<string>;
  destroy(): void;
}

export interface AIWriterFactory {
  capabilities(): Promise<AICapabilityOptions>;
  create(options?: AIWriterCreateOptions): Promise<AIWriter>;
}

// ==========================================
// 5. Translator API
// ==========================================

export interface AITranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
  monitor?: (monitor: AICreateMonitor) => void;
}

export interface AITranslatorCapabilities {
  available: AICapabilityAvailability;
  languagePairAvailable(sourceLanguage: string, targetLanguage: string): AICapabilityAvailability;
}

export interface AITranslator {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  translateStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}

export interface AITranslatorFactory {
  capabilities(): Promise<AITranslatorCapabilities>;
  create(options: AITranslatorCreateOptions): Promise<AITranslator>;
}

// ==========================================
// Global Window AI Object
// ==========================================

export interface ChromeAI {
  languageModel?: AILanguageModelFactory;
  summarizer?: AISummarizerFactory;
  rewriter?: AIRewriterFactory;
  writer?: AIWriterFactory;
  translator?: AITranslatorFactory;
}

declare global {
  interface Window {
    ai?: ChromeAI;
  }

  // Also in some Chromium builds, `ai` or `translation` might be exposed directly
  var ai: ChromeAI | undefined;
}
