import type { Translator, TranslateRequest, TranslateResult } from './types'
import {
  buildSystemPrompt,
  buildUserPayload,
  decodeResponse,
  responseSchema,
  type RawTranslatorResponse,
} from './prompts'

/**
 * Default LLM translator: Google Gemini 2.5 Pro via the Google AI Studio
 * REST endpoint. Uses `responseMimeType: application/json` +
 * `responseSchema` for guaranteed structured output.
 *
 * The class only depends on `fetch` so it's safe in any runtime
 * (Node, Vercel Edge, browser tests). Actual SDK adoption can come
 * later if we need streaming.
 */
export class GeminiTranslator implements Translator {
  readonly name = 'gemini'
  readonly model: string

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(opts?: {
    apiKey?: string
    model?: string
    baseUrl?: string
  }) {
    const apiKey = opts?.apiKey ?? process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GeminiTranslator: missing GOOGLE_AI_API_KEY / GEMINI_API_KEY')
    this.apiKey = apiKey
    this.model = opts?.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-pro'
    this.baseUrl =
      opts?.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const systemPrompt = buildSystemPrompt(req)
    const payload = buildUserPayload(req)
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`
    const startedAt = Date.now()
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: JSON.stringify(payload) }],
        },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`GeminiTranslator: HTTP ${resp.status} ${resp.statusText} \u2014 ${text.slice(0, 500)}`)
    }
    const json = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
    }
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    let parsed: RawTranslatorResponse
    try {
      parsed = JSON.parse(text)
    } catch (cause) {
      throw new Error(`GeminiTranslator: response was not valid JSON: ${text.slice(0, 200)}`, { cause })
    }
    return {
      units: decodeResponse(parsed, req),
      usage: {
        inputTokens: json?.usageMetadata?.promptTokenCount,
        outputTokens: json?.usageMetadata?.candidatesTokenCount,
        totalTokens: json?.usageMetadata?.totalTokenCount,
        durationMs: Date.now() - startedAt,
      },
    }
  }
}
