import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    // Matches the behavior of `sanity dev` which sets styled-components to use the fastest way of inserting CSS rules in both dev and production. It's default behavior is to disable it in dev mode.
    SC_DISABLE_SPEEDY: 'false',
  },
  // 301 redirect old /posts/* URLs to the renamed /organs/* — keeps any
  // bookmarks, search-engine results and external links working.
  async redirects() {
    return [
      {
        source: '/posts/:slug',
        destination: '/organs/:slug',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
