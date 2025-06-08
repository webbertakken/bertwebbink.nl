import 'dotenv/config'

/**
 * Sanity CLI Configuration
 * This file configures the Sanity CLI tool with project-specific settings
 * and customizes the Vite bundler configuration.
 * Learn more: https://www.sanity.io/docs/cli
 */

import { defineCliConfig } from 'sanity/cli'
import { assertValue } from '@/core/util/assertValue'

const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing NEXT_PUBLIC_SANITY_PROJECT_ID environment variable',
)

const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing NEXT_PUBLIC_SANITY_DATASET environment variable',
)

const studioHost = assertValue(
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL,
  'Missing NEXT_PUBLIC_SANITY_STUDIO_URL environment variable',
)

export default defineCliConfig({ api: { projectId, dataset }, studioHost, autoUpdates: true })
