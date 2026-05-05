import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

type FooterProps = {
  /** mailto:/href used for the Contact link. Falls back to /about. */
  contactHref?: string | null
}

export async function Footer({ contactHref }: FooterProps = {}) {
  const year = new Date().getFullYear()
  const t = await getTranslations('Footer')
  return (
    <footer className="border-t border-rule-soft px-12 pt-9 pb-12 mt-8 bg-paper">
      <div
        className="max-w-[1240px] mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-6 text-[12.5px] text-ink-faint"
        style={{ letterSpacing: '0.02em' }}
      >
        <div>{t('copyright', { year })}</div>
        <div className="flex gap-7">
          <Link href="/privacy" className="transition-colors hover:text-ink">
            {t('links.privacy')}
          </Link>
          <Link href="/elsewhere" className="transition-colors hover:text-ink">
            {t('links.elsewhere')}
          </Link>
          <a href={contactHref ?? '/about'} className="transition-colors hover:text-ink">
            {t('links.contact')}
          </a>
        </div>
      </div>
    </footer>
  )
}
