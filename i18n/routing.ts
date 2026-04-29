import { defineRouting } from 'next-intl/routing'

import {
  DEFAULT_LOCALE,
  LOCALES,
  UI_DEFAULT_LOCALE,
  type Locale,
} from '@/core/i18n/locales'

/**
 * `next-intl` routing configuration.
 *
 * Strategy: prefix every URL with the locale, no exception. Visitors land
 * on `/{detected}/...` on first visit; the picker switches the prefix.
 *
 * `defaultLocale` is the "fall back when nothing matches" — we use the
 * UI default (English) per Q1 of the plan, since visitors who aren't
 * coming in with a recognisable Accept-Language are most likely to
 * understand English than Dutch.
 */
export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: UI_DEFAULT_LOCALE,
  localePrefix: 'always',
})

export type RoutingLocale = Locale

/** Re-exported for ergonomic imports from app code. */
export { DEFAULT_LOCALE, LOCALES, UI_DEFAULT_LOCALE }
