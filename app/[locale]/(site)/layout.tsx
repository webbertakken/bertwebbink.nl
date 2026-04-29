import { setRequestLocale } from 'next-intl/server'

import { Nav } from '@/app/components/landing/Nav'
import { Footer } from '@/app/components/landing/Footer'
import { sanityFetch } from '@/sanity/lib/live'
import { footerContactQuery, navSettingsQuery } from '@/sanity/lib/queries'
import { isLocale, type Locale } from '@/core/i18n/locales'

type SiteLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
  const { locale: rawLocale } = await params
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en'
  setRequestLocale(locale)

  const [{ data: nav }, { data: contact }] = await Promise.all([
    sanityFetch({ query: navSettingsQuery, params: { locale } }),
    sanityFetch({ query: footerContactQuery, params: { locale } }),
  ])
  return (
    <section className="min-h-screen bg-bg text-ink font-sans overflow-x-hidden flex flex-col">
      <div className="relative z-[4] w-full">
        <div className="max-w-[1320px] mx-auto h-px bg-rule-soft" />
      </div>
      <Nav
        locale={locale}
        wordmark={nav?.wordmark ?? null}
        tagline={nav?.tagline ?? null}
      />
      <main className="flex-1">{children}</main>
      <Footer contactHref={contact?.href ?? null} />
    </section>
  )
}
