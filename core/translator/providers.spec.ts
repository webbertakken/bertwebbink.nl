import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AnthropicTranslator } from './anthropic'
import { GeminiTranslator } from './gemini'
import { OpenAITranslator } from './openai'

const fetchSpy = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchSpy.mockReset()
})

describe('GeminiTranslator', () => {
  it('posts a JSON body and decodes structured output', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      units: [
                        { id: 'title', translatedText: 'Bonjour' },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4, totalTokenCount: 16 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    const t = new GeminiTranslator({ apiKey: 'test', model: 'gemini-2.5-pro-test' })
    const result = await t.translate({
      sourceLocale: 'nl',
      targetLocale: 'fr',
      units: [{ id: 'title', sourceText: 'Hallo' }],
    })
    expect(result.units).toEqual([{ id: 'title', sourceText: 'Bonjour' }])
    expect(result.usage?.totalTokens).toBe(16)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.generationConfig.responseMimeType).toBe('application/json')
    expect(body.systemInstruction.parts[0].text).toContain('Dutch')
    expect(body.systemInstruction.parts[0].text).toContain('French')
  })

  it('surfaces non-2xx responses', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
    const t = new GeminiTranslator({ apiKey: 'test' })
    await expect(
      t.translate({
        sourceLocale: 'nl',
        targetLocale: 'fr',
        units: [{ id: 'x', sourceText: 'y' }],
      }),
    ).rejects.toThrow(/HTTP 429/)
  })
})

describe('AnthropicTranslator', () => {
  it('decodes tool_use response', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              name: 'submit_translations',
              input: { units: [{ id: 'title', translatedText: 'Hallo' }] },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
        { status: 200 },
      ),
    )
    const t = new AnthropicTranslator({ apiKey: 'test' })
    const result = await t.translate({
      sourceLocale: 'en',
      targetLocale: 'nl',
      units: [{ id: 'title', sourceText: 'Hello' }],
    })
    expect(result.units).toEqual([{ id: 'title', sourceText: 'Hallo' }])
    expect(result.usage?.totalTokens).toBe(15)
  })
})

describe('OpenAITranslator', () => {
  it('decodes JSON-schema response', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  units: [{ id: 'title', translatedText: 'Hola' }],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
        }),
        { status: 200 },
      ),
    )
    const t = new OpenAITranslator({ apiKey: 'test' })
    const result = await t.translate({
      sourceLocale: 'en',
      targetLocale: 'es',
      units: [{ id: 'title', sourceText: 'Hello' }],
    })
    expect(result.units).toEqual([{ id: 'title', sourceText: 'Hola' }])
    expect(result.usage?.totalTokens).toBe(11)
  })
})
