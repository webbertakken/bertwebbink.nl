import { describe, expect, it } from 'vitest'

import { EchoTranslator } from './echo'

describe('EchoTranslator', () => {
  it('echoes each unit prefixed with the target locale tag', async () => {
    const t = new EchoTranslator()
    const result = await t.translate({
      sourceLocale: 'nl',
      targetLocale: 'en',
      units: [
        { id: 'title', sourceText: 'Hallo' },
        { id: 'body', sourceText: 'Wereld' },
      ],
    })
    expect(result.units).toEqual([
      { id: 'title', sourceText: '[en] Hallo' },
      { id: 'body', sourceText: '[en] Wereld' },
    ])
  })
})
