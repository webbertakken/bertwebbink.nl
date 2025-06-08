'use client'

import { NextStudio } from 'next-sanity/studio'
import config from '@/sanity.config'

export default function AdminPage() {
  // @ts-expect-error NextStudio types don't support suppressHydrationWarning prop
  return <NextStudio config={config} suppressHydrationWarning />
}
