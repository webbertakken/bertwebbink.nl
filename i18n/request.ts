import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { isLocale, UI_DEFAULT_LOCALE } from '@/core/i18n/locales'
import { routing } from './routing'

/**
 * Server-side message loader. `next-intl` resolves `{locale}` from the
 * URL segment (because we use `localePrefix: 'always'`); we fall back to
 * the UI default for any odd request that arrives without one (e.g. an
 * RSC payload generated outside a route).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : UI_DEFAULT_LOCALE

  // We always have an `en.json`. The other locales fall back to it
  // when missing keys (handled by next-intl via `getMessages` config).
  const messages = await loadMessages(locale)
  return {
    locale,
    messages,
  }
})

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  if (!isLocale(locale)) {
    const en = (await import('../messages/en.json')).default
    return en
  }
  try {
    const mod = await import(`../messages/${locale}.json`)
    return mod.default
  } catch {
    const en = (await import('../messages/en.json')).default
    return en
  }
}
