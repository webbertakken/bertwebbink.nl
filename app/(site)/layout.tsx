import Header from '@/app/components/Header'
import Footer from '@/app/components/Footer'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen pt-24">
      <Header />
      <main>{children}</main>
      <Footer />
    </section>
  )
}
