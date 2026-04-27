type FooterProps = {
  /** mailto:/href used for the Contact link. Falls back to /about. */
  contactHref?: string | null
}

export function Footer({ contactHref }: FooterProps = {}) {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-rule-soft px-12 pt-9 pb-12 mt-8 bg-paper">
      <div
        className="max-w-[1240px] mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-6 text-[12.5px] text-ink-faint"
        style={{ letterSpacing: '0.02em' }}
      >
        <div>© Bert Webbink, {year}</div>
        <div className="flex gap-7">
          <a href="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </a>
          <a href="/elsewhere" className="transition-colors hover:text-ink">
            Elsewhere
          </a>
          <a href={contactHref ?? '/about'} className="transition-colors hover:text-ink">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
