/**
 * This config is used to configure your Sanity Studio.
 * Learn more: https://www.sanity.io/docs/configuration
 */

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from '@/sanity/schemaTypes'
import { structure } from '@/sanity/structure'
import { StudioLayout } from '@/sanity/studio/StudioLayout'
import { media } from 'sanity-plugin-media'
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash'
import {
  presentationTool,
  defineDocuments,
  defineLocations,
  type DocumentLocation,
} from 'sanity/presentation'
import { assist } from '@sanity/assist'
import { assertValue } from '@/core/util/assertValue'

// Environment variables for project configuration
const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID',
)

const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET',
)

const sanityStudioPreviewUrl = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PREVIEW_URL,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PREVIEW_URL',
)

// Define the home location for the presentation tool
const homeLocation = { title: 'Home', href: '/' } satisfies DocumentLocation

// resolveHref() is a convenience function that resolves the URL
// path for different document types and used in the presentation tool.
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    case 'organ':
      return slug ? `/organs/${slug}` : undefined
    case 'journal':
      return slug ? `/journal/${slug}` : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}

// Main Sanity configuration
export default defineConfig({
  name: 'default',
  title: 'Bert Webbink',
  projectId,
  dataset,
  basePath: '/admin', // Base path for the Sanity Studio, can be customized
  plugins: [
    media({
      creditLine: {
        enabled: true,
        // boolean - enables an optional "Credit Line" field in the plugin.
        // Used to store credits e.g. photographer, licence information
        excludeSources: ['unsplash'],
        // string | string[] - when used with 3rd party asset sources, you may
        // wish to prevent users overwriting the creditLine based on the `source.name`
      },
      maximumUploadSize: 10000000,
    }),

    // Presentation tool configuration for Visual Editing
    presentationTool({
      previewUrl: {
        initial: sanityStudioPreviewUrl,
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        // The Main Document Resolver API provides a method of resolving a main document from a given route or route pattern. https://www.sanity.io/docs/presentation-resolver-api#57720a5678d9
        mainDocuments: defineDocuments([
          {
            route: '/',
            filter: `_type == "journalPage" && _id == "siteJournalPage"`,
          },
          {
            route: '/organs',
            filter: `_type == "organsPage" && _id == "siteOrgansPage"`,
          },
          {
            route: '/organs/:slug',
            filter: `_type == "organ" && slug.current == $slug || _id == $slug`,
          },
          {
            route: '/scores',
            filter: `_type == "scoresPage" && _id == "siteScoresPage"`,
          },
          {
            route: '/journal/:slug',
            filter: `_type == "journal" && slug.current == $slug || _id == $slug`,
          },
          {
            route: '/about',
            filter: `_type == "about" && _id == "siteAbout"`,
          },
          {
            route: '/elsewhere',
            filter: `_type == "elsewhere" && _id == "siteElsewhere"`,
          },
          {
            route: '/privacy',
            filter: `_type == "privacy" && _id == "sitePrivacy"`,
          },
        ]),
        // Locations Resolver API allows you to define where data is being used in your application. https://www.sanity.io/docs/presentation-resolver-api#8d8bca7bfcd7
        locations: {
          settings: defineLocations({
            locations: [homeLocation],
            message: 'Drives <head> metadata (title template, description, OG image) on every page.',
            tone: 'positive',
          }),
          journalPage: defineLocations({
            locations: [homeLocation],
            message: 'Drives the homepage hero copy.',
            tone: 'positive',
          }),
          organsPage: defineLocations({
            locations: [
              { title: 'Organs', href: '/organs' } satisfies DocumentLocation,
            ],
            message: 'Drives the /organs hero copy.',
            tone: 'positive',
          }),
          scoresPage: defineLocations({
            locations: [
              { title: 'Scores', href: '/scores' } satisfies DocumentLocation,
            ],
            message: 'Drives the /scores hero copy.',
            tone: 'positive',
          }),
          journal: defineLocations({
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href: resolveHref('journal', doc?.slug)!,
                },
                { title: 'Home', href: '/' } satisfies DocumentLocation,
              ].filter(Boolean) as DocumentLocation[],
            }),
          }),
          about: defineLocations({
            locations: [
              { title: 'About me', href: '/about' } satisfies DocumentLocation,
            ],
            tone: 'positive',
          }),
          elsewhere: defineLocations({
            locations: [
              { title: 'Elsewhere', href: '/elsewhere' } satisfies DocumentLocation,
            ],
            tone: 'positive',
          }),
          privacy: defineLocations({
            locations: [
              { title: 'Privacy', href: '/privacy' } satisfies DocumentLocation,
            ],
            tone: 'positive',
          }),
          organ: defineLocations({
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href: resolveHref('organ', doc?.slug)!,
                },
                {
                  title: 'Home',
                  href: '/',
                } satisfies DocumentLocation,
              ].filter(Boolean) as DocumentLocation[],
            }),
          }),
        },
      },
    }),
    structureTool({
      structure, // Custom studio structure configuration, imported from ./src/structure.ts
    }),
    // Additional plugins for enhanced functionality
    unsplashImageAsset(),
    assist(),
    visionTool(),
  ],

  // Schema configuration, imported from ./src/schemaTypes/index.ts
  schema: {
    types: schemaTypes,
  },

  // Custom studio chrome: widens the document pane so the PortableText
  // editor on long posts has room to breathe.
  studio: {
    components: {
      layout: StudioLayout,
    },
  },
})
