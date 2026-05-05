import {
  buildSystemPrompt,
  buildUserPayload,
  decodeResponse,
  responseSchema,
  type RawTranslatorResponse,
} from './prompts'
import type { Translator, TranslateRequest, TranslateResult } from './types'

/**
 * Anthropic Claude translator. Uses tool-use (forced tool choice) for
 * guaranteed structured JSON output. Fallback when Gemini regresses on
 * a particular doc.
 */
export class AnthropicTranslator implements Translator {
  readonly name = 'anthropic'
  readonly model: string

  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly anthropicVersion: string

  constructor(opts?: {
    apiKey?: string
    model?: string
    baseUrl?: string
    anthropicVersion?: string
  }) {
    const apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('AnthropicTranslator: missing ANTHROPIC_API_KEY')
    this.apiKey = apiKey
    this.model = opts?.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'
    this.baseUrl = opts?.baseUrl ?? 'https://api.anthropic.com/v1'
    this.anthropicVersion = opts?.anthropicVersion ?? '2023-06-01'
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const systemPrompt = buildSystemPrompt(req)
    const payload = buildUserPayload(req)
    const startedAt = Date.now()
    const body = {
      model: this.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: JSON.stringify(payload) }],
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_translations' },
      tools: [
        {
          name: 'submit_translations',
          description: 'Submit translations for the supplied units.',
          input_schema: responseSchema,
        },
      ],
    }
    const resp = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.anthropicVersion,
      },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(
        `AnthropicTranslator: HTTP ${resp.status} ${resp.statusText} \u2014 ${text.slice(0, 500)}`,
      )
    }
    const json = (await resp.json()) as {
      content?: Array<{ type: string; name?: string; input?: unknown }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const toolUse = json?.content?.find(
      (c) => c.type === 'tool_use' && c.name === 'submit_translations',
    )
    if (!toolUse?.input) {
      throw new Error('AnthropicTranslator: missing tool_use response')
    }
    const parsed = toolUse.input as RawTranslatorResponse
    const inputTokens = json?.usage?.input_tokens
    const outputTokens = json?.usage?.output_tokens
    return {
      units: decodeResponse(parsed, req),
      usage: {
        inputTokens,
        outputTokens,
        totalTokens:
          inputTokens != null && outputTokens != null ? inputTokens + outputTokens : undefined,
        durationMs: Date.now() - startedAt,
      },
    }
  }
}
