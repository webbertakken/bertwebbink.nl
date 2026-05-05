'use client'

import dynamic from 'next/dynamic'
import config from '@/sanity.config'

/**
 * Render the Studio client-only.
 *
 * `@sanity/ui` builds on styled-components, whose auto-generated class
 * names (`sc-XXX`) depend on registration order. When the Studio is
 * SSR-rendered inside Next.js App Router, that order can drift between
 * server and client, producing a hydration mismatch deep inside Studio
 * internals (`LoadingBlock` → `StyledSpinner` → `StyledText`, etc.) that
 * `suppressHydrationWarning` on the outer `<NextStudio>` cannot reach
 * because it doesn't recurse into descendants.
 *
 * Skipping SSR sidesteps the mismatch entirely. The Studio is a
 * client-only editing tool — there is nothing to gain from SSR-ing it,
 * and the Studio shows its own loader while the bundle resolves.
 */
const NextStudio = dynamic(() => import('next-sanity/studio').then((mod) => mod.NextStudio), {
  ssr: false,
})

export default function AdminPage() {
  return <NextStudio config={config} />
}
