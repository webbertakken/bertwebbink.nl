import type { Translator, TranslateRequest, TranslateResult } from './types'
import {
  buildSystemPrompt,
  buildUserPayload,
  decodeResponse,
  responseSchema,
  type RawTranslatorResponse,
} from './prompts'

/**
 * OpenAI GPT-4o translator. Uses `response_format: { type: 'json_schema' }`
 * for guaranteed structured output.
 */
export class OpenAITranslator implements Translator {
  readonly name = 'openai'
  readonly model: string

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(opts?: { apiKey?: string; model?: string; baseUrl?: string }) {
    const apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OpenAITranslator: missing OPENAI_API_KEY')
    this.apiKey = apiKey
    this.model = opts?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o'
    this.baseUrl = opts?.baseUrl ?? 'https://api.openai.com/v1'
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const systemPrompt = buildSystemPrompt(req)
    const payload = buildUserPayload(req)
    const startedAt = Date.now()
    const body = {
      model: this.model,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'translations',
          strict: true,
          schema: responseSchema,
        },
      },
    }
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(
        `OpenAITranslator: HTTP ${resp.status} ${resp.statusText} \u2014 ${text.slice(0, 500)}`,
      )
    }
    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    const text = json?.choices?.[0]?.message?.content ?? ''
    let parsed: RawTranslatorResponse
    try {
      parsed = JSON.parse(text)
    } catch (cause) {
      throw new Error(`OpenAITranslator: response was not valid JSON: ${text.slice(0, 200)}`, { cause })
    }
    return {
      units: decodeResponse(parsed, req),
      usage: {
        inputTokens: json?.usage?.prompt_tokens,
        outputTokens: json?.usage?.completion_tokens,
        totalTokens: json?.usage?.total_tokens,
        durationMs: Date.now() - startedAt,
      },
    }
  }
}
