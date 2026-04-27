import { Nav } from '@/app/components/landing/Nav'
import { Footer } from '@/app/components/landing/Footer'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-bg text-ink font-sans overflow-x-hidden flex flex-col">
      <div className="relative z-[4] w-full">
        <div className="max-w-[1320px] mx-auto h-px bg-rule-soft" />
      </div>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </section>
  )
}
