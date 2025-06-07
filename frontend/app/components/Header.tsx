import Link from 'next/link'
import { settingsQuery } from '@/sanity/lib/queries'
import { sanityFetch } from '@/sanity/lib/live'

export default async function Header() {
  const { data: settings } = await sanityFetch({
    query: settingsQuery,
  })

  return (
    <header className="fixed z-50 h-24 inset-0 bg-white/80 flex items-center backdrop-blur-lg">
      <div className="container py-6 px-2 sm:px-6">
        <div className="flex items-center justify-between gap-5">
          <Link className="flex items-center gap-2" href="/">
            <span className="text-lg sm:text-2xl pl-2 font-semibold">
              {settings?.title || 'Bert Webbink'}
            </span>
          </Link>

          <nav>
            <ul
              role="list"
              className="flex items-center gap-4 md:gap-6 leading-5 text-xs sm:text-base tracking-tight font-mono"
            >
              <li>
                <Link href="/about" className="hover:underline">
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
