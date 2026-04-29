import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  env: {
    // Matches the behavior of `sanity dev` which sets styled-components to use the fastest way of inserting CSS rules in both dev and production. It's default behavior is to disable it in dev mode.
    SC_DISABLE_SPEEDY: 'false',
  },
  // 301 redirect old /posts/* URLs to the renamed /organs/* — keeps any
  // bookmarks, search-engine results and external links working. The
  // locale prefix is added by `next-intl` middleware on the redirect
  // target so visitors land on `/{locale}/organs/...` etc.
  async redirects() {
    return [
      {
        source: '/posts/:slug',
        destination: '/organs/:slug',
        permanent: true,
      },
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog/:slug',
        destination: '/journal/:slug',
        permanent: true,
      },
      {
        source: '/journal',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
