import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { toPlainText } from 'next-sanity'
import { VisualEditing } from 'next-sanity/visual-editing'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import { draftMode } from 'next/headers'
import { Toaster } from 'sonner'
import DraftModeToast from '@/app/components/DraftModeToast'
import { isLocale, UI_DEFAULT_LOCALE, type Locale } from '@/core/i18n/locales'
import * as demo from '@/sanity/lib/demo'
import { sanityFetch, SanityLive } from '@/sanity/lib/live'
import { settingsQuery } from '@/sanity/lib/queries'
import { resolveOpenGraphImage } from '@/sanity/lib/utils'
import { handleError } from './client-utils'

/**
 * Resolve the active locale for the root layout. We can't use route
 * params here (root layout has none), so we read the request pathname
 * from `next/headers` — `next-intl`'s middleware adds the prefixed path
 * to every request, and we parse the first segment.
 */
async function resolveRootLocale(): Promise<Locale> {
  const { headers } = await import('next/headers')
  const list = await headers()
  // next-intl middleware sets `x-next-intl-locale` when localePrefix is 'always'.
  const fromHeader = list.get('x-next-intl-locale')
  if (fromHeader && isLocale(fromHeader)) return fromHeader
  // Fallback: derive from request URL when middleware hasn't run (e.g. /admin).
  const url = list.get('x-pathname') ?? list.get('referer') ?? ''
  const match = url.match(/\/([a-z]{2})(?:[/?]|$)/)
  if (match && isLocale(match[1])) return match[1] as Locale
  return UI_DEFAULT_LOCALE
}

/**
 * Generate metadata for the page. Per-locale title/description come from
 * the `[locale]` layout's metadata; this is a global fallback for
 * non-localised routes (e.g. `/admin`).
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRootLocale()
  const { data: settings } = await sanityFetch({
    query: settingsQuery,
    params: { locale },
    stega: false,
  })
  const title = settings?.title || demo.title
  const description = settings?.description || demo.description

  const ogImage = resolveOpenGraphImage(settings?.ogImage)
  let metadataBase: URL | undefined = undefined
  try {
    metadataBase = settings?.ogImage?.metadataBase
      ? new URL(settings.ogImage.metadataBase)
      : undefined
  } catch {
    // ignore
  }
  return {
    metadataBase,
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description: toPlainText(description),
    openGraph: {
      images: ogImage ? [ogImage] : [],
    },
  }
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode()
  const locale = await resolveRootLocale()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${cormorant.variable} bg-bg text-ink`}
      suppressHydrationWarning
    >
      <body>
        {/* The <Toaster> component is responsible for rendering toast notifications used in /app/client-utils.ts and /app/components/DraftModeToast.tsx */}
        <Toaster />
        {isDraftMode && (
          <>
            <DraftModeToast />
            {/*  Enable Visual Editing, only to be rendered when Draft Mode is enabled */}
            <VisualEditing />
          </>
        )}
        {/* The <SanityLive> component is responsible for making all sanityFetch calls in your application live, so should always be rendered. */}
        <SanityLive onError={handleError} />

        {children}

        <SpeedInsights />
      </body>
    </html>
  )
}
