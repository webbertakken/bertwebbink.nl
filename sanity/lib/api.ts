/**
 * As this file is reused in several other files, try to keep it lean and small.
 * Importing other npm packages here could lead to needlessly increasing the client bundle size, or end up in a server-only function that don't need it.
 */

import { assertValue } from '@/core/util/assertValue'

/**
 * As this file is reused in several other files, try to keep it lean and small.
 * Importing other npm packages here could lead to needlessly increasing the client bundle size, or end up in a server-only function that don't need it.
 */
export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET',
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID',
)

/**
 * see https://www.sanity.io/docs/api-versioning for how versioning works
 */
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-10-28'

/**
 * Used to configure edit intent links, for Presentation Mode, as well as to configure where the Studio is mounted in the router.
 */
export const studioUrl = assertValue(
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL,
  'Missing environment variable: NEXT_PUBLIC_SANITY_STUDIO_URL',
)
