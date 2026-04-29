import 'server-only'

import { createClient } from '@sanity/client'

import { apiVersion, dataset, projectId } from './api'

const writeToken = process.env.SANITY_API_WRITE_TOKEN

/**
 * Server-side Sanity client with a write token. Used by the
 * `/api/translate` and `/api/publish-all` routes to fetch source
 * documents and write translated siblings.
 *
 * Throws lazily on first use if the token isn't set so that production
 * builds don't fail when the route isn't actually called.
 */
export function getServerClient() {
  if (!writeToken) {
    throw new Error('Missing SANITY_API_WRITE_TOKEN; cannot perform write operations')
  }
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token: writeToken,
    useCdn: false,
    perspective: 'published',
  })
}
