import { Nav } from '@/app/components/landing/Nav'
import { Footer } from '@/app/components/landing/Footer'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-bg text-ink font-sans overflow-x-hidden">
      <div className="max-w-[1320px] mx-auto h-px bg-rule-soft relative z-[4]" />
      <Nav />
      <main>{children}</main>
      <Footer />
    </section>
  )
}
