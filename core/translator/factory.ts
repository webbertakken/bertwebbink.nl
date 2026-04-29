import { AnthropicTranslator } from './anthropic'
import { EchoTranslator } from './echo'
import { GeminiTranslator } from './gemini'
import { OpenAITranslator } from './openai'
import type { Translator } from './types'

export type TranslatorProvider = 'gemini' | 'anthropic' | 'openai' | 'echo'

const PROVIDERS: Record<TranslatorProvider, () => Translator> = {
  gemini: () => new GeminiTranslator(),
  anthropic: () => new AnthropicTranslator(),
  openai: () => new OpenAITranslator(),
  echo: () => new EchoTranslator(),
}

/**
 * Returns the active translator implementation. Picked from the
 * `TRANSLATOR_PROVIDER` env var (default `gemini`); `echo` is a
 * test-only sentinel.
 *
 * Each implementation throws on construction if its API key is missing,
 * which surfaces a clear error in the route handler logs rather than a
 * silent fallback.
 */
export function getTranslator(provider?: TranslatorProvider): Translator {
  const requested = (provider ?? (process.env.TRANSLATOR_PROVIDER as TranslatorProvider) ?? 'gemini') as TranslatorProvider
  const factory = PROVIDERS[requested]
  if (!factory) throw new Error(`getTranslator: unknown provider "${requested}"`)
  return factory()
}
