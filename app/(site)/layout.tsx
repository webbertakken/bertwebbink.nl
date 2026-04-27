import { Nav } from '@/app/components/landing/Nav'
import { Footer } from '@/app/components/landing/Footer'
import { sanityFetch } from '@/sanity/lib/live'
import { footerContactQuery, navSettingsQuery } from '@/sanity/lib/queries'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ data: nav }, { data: contact }] = await Promise.all([
    sanityFetch({ query: navSettingsQuery }),
    sanityFetch({ query: footerContactQuery }),
  ])
  return (
    <section className="min-h-screen bg-bg text-ink font-sans overflow-x-hidden flex flex-col">
      <div className="relative z-[4] w-full">
        <div className="max-w-[1320px] mx-auto h-px bg-rule-soft" />
      </div>
      <Nav wordmark={nav?.wordmark ?? null} tagline={nav?.tagline ?? null} />
      <main className="flex-1">{children}</main>
      <Footer contactHref={contact?.href ?? null} />
    </section>
  )
}
