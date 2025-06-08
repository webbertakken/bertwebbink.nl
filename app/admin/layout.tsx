export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen">
      <main>{children}</main>
    </section>
  )
}
