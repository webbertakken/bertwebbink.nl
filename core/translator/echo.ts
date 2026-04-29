import type { Translator, TranslateRequest, TranslateResult } from './types'

/**
 * Test-only translator. Returns each unit's source text wrapped in
 * `[<targetLocale>] ...` so unit tests can verify pipeline plumbing
 * without hitting an external API.
 */
export class EchoTranslator implements Translator {
  readonly name = 'echo'
  readonly model = 'echo-noop'

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    return {
      units: req.units.map((u) => ({
        id: u.id,
        sourceText: `[${req.targetLocale}] ${u.sourceText}`,
      })),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, durationMs: 0 },
    }
  }
}
