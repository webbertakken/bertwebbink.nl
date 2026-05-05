/**
 * This config is used to configure your Sanity Studio.
 * Learn more: https://www.sanity.io/docs/configuration
 */

import { documentInternationalization } from '@sanity/document-internationalization'
import { languageFilter } from '@sanity/language-filter'
import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash'
import { internationalizedArray } from 'sanity-plugin-internationalized-array'
import { media } from 'sanity-plugin-media'
import {
  presentationTool,
  defineDocuments,
  defineLocations,
  type DocumentLocation,
} from 'sanity/presentation'
import { structureTool } from 'sanity/structure'
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LANGUAGES, type Locale } from '@/core/i18n/locales'
import { isTranslatableType } from '@/core/translator/orchestrator'
import { assertValue } from '@/core/util/assertValue'
import { pathnames } from '@/i18n/routing'
import { publishAllLocalesAction } from '@/sanity/actions/publishAll'
import { relabelSingleLocalePublish } from '@/sanity/actions/relabelPublish'
import { withRevalidatePublish } from '@/sanity/actions/withRevalidate'
import { staleTranslationBadge } from '@/sanity/badges/staleTranslation'
import { schemaTypes } from '@/sanity/schemaTypes'
import { structure } from '@/sanity/structure'
import { StudioLayout } from '@/sanity/studio/StudioLayout'

/** Document types that use document-per-locale (one full document per language). */
const LOCALIZED_DOC_TYPES = [
  'journal',
  'organ',
  'journalPage',
  'organsPage',
  'scoresPage',
  'about',
  'elsewhere',
  'privacy',
  'settings',
] as const

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

/** Resolve a canonical pathnames key (`/organs`) to the locale-specific segment. */
function localisedSegment(canonical: string, locale: Locale): string {
  const map = pathnames as Record<string, string | Record<Locale, string>>
  const entry = map[canonical]
  if (typeof entry === 'string') return entry
  if (entry && entry[locale]) return entry[locale] as string
  return canonical
}

// resolveHref() is a convenience function that resolves the URL
// path for different document types and used in the presentation tool.
function resolveHref(
  documentType?: string,
  slug?: string,
  locale: Locale = DEFAULT_LOCALE,
): string | undefined {
  switch (documentType) {
    case 'organ':
      return slug
        ? `/${locale}${localisedSegment('/organs/[slug]', locale).replace('[slug]', slug)}`
        : undefined
    case 'journal':
      return slug
        ? `/${locale}${localisedSegment('/journal/[slug]', locale).replace('[slug]', slug)}`
        : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}

/**
 * Build the locale-aware Presentation `mainDocuments` resolver list.
 *
 * Every public route is locale-prefixed (`/{locale}/...`). For each route,
 * we register one entry per locale so Presentation matches the correct
 * sibling document for the locale-prefixed URL the editor previews.
 */
function localizedMainDocuments() {
  const entries: Array<{ route: string; filter: string }> = []
  for (const locale of LOCALES) {
    const localePrefix = `/${locale}`
    const seg = (canonical: string) => localisedSegment(canonical, locale)
    entries.push(
      {
        route: `${localePrefix}`,
        filter: `_type == "journalPage" && _id == "journalPage-${locale}"`,
      },
      {
        route: `${localePrefix}${seg('/organs')}`,
        filter: `_type == "organsPage" && _id == "organsPage-${locale}"`,
      },
      {
        route: `${localePrefix}${seg('/organs/[slug]').replace('[slug]', ':slug')}`,
        filter: `_type == "organ" && language == "${locale}" && (slug.current == $slug || _id == $slug)`,
      },
      {
        route: `${localePrefix}${seg('/scores')}`,
        filter: `_type == "scoresPage" && _id == "scoresPage-${locale}"`,
      },
      {
        route: `${localePrefix}${seg('/journal/[slug]').replace('[slug]', ':slug')}`,
        filter: `_type == "journal" && language == "${locale}" && (slug.current == $slug || _id == $slug)`,
      },
      {
        route: `${localePrefix}${seg('/about')}`,
        filter: `_type == "about" && _id == "about-${locale}"`,
      },
      {
        route: `${localePrefix}${seg('/elsewhere')}`,
        filter: `_type == "elsewhere" && _id == "elsewhere-${locale}"`,
      },
      {
        route: `${localePrefix}${seg('/privacy')}`,
        filter: `_type == "privacy" && _id == "privacy-${locale}"`,
      },
    )
  }
  return entries
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
        mainDocuments: defineDocuments(localizedMainDocuments()),
        // Locations Resolver API allows you to define where data is being used in your application. https://www.sanity.io/docs/presentation-resolver-api#8d8bca7bfcd7
        locations: {
          settings: defineLocations({
            locations: [homeLocation],
            message:
              'Drives <head> metadata (title template, description, OG image) on every page.',
            tone: 'positive',
          }),
          journalPage: defineLocations({
            locations: [homeLocation],
            message: 'Drives the homepage hero copy.',
            tone: 'positive',
          }),
          organsPage: defineLocations({
            locations: [{ title: 'Organs', href: '/organs' } satisfies DocumentLocation],
            message: 'Drives the /organs hero copy.',
            tone: 'positive',
          }),
          scoresPage: defineLocations({
            locations: [{ title: 'Scores', href: '/scores' } satisfies DocumentLocation],
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
            locations: [{ title: 'About me', href: '/about' } satisfies DocumentLocation],
            tone: 'positive',
          }),
          elsewhere: defineLocations({
            locations: [{ title: 'Elsewhere', href: '/elsewhere' } satisfies DocumentLocation],
            tone: 'positive',
          }),
          privacy: defineLocations({
            locations: [{ title: 'Privacy', href: '/privacy' } satisfies DocumentLocation],
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
    // Document-per-locale: every translatable document type except `score`.
    // Singleton ids are pinned via Initial Value Templates and our own
    // "Translate to all locales" action; the plugin still tracks language
    // tabs and the translation.metadata document for them.
    documentInternationalization({
      supportedLanguages: SUPPORTED_LANGUAGES,
      schemaTypes: [...LOCALIZED_DOC_TYPES],
      languageField: 'language',
      bulkPublish: false,
    }),
    // Field-level: only the `score` type uses internationalised arrays.
    internationalizedArray({
      languages: SUPPORTED_LANGUAGES,
      defaultLanguages: [DEFAULT_LOCALE],
      fieldTypes: ['string', 'text'],
    }),
    // Hide non-active locale tabs in the score editor.
    languageFilter({
      supportedLanguages: SUPPORTED_LANGUAGES,
      defaultLanguages: [DEFAULT_LOCALE],
      documentTypes: ['score'],
    }),
    // Additional plugins for enhanced functionality
    unsplashImageAsset(),
    visionTool(),
  ],

  // Schema configuration, imported from ./src/schemaTypes/index.ts
  schema: {
    types: schemaTypes,
    // Per (translatable type, locale) Initial Value Template so the
    // "Create new" menu seeds the correct `language` field. Singletons
    // also pin their id to the symmetric `{type}-{locale}` pattern.
    templates: (prev) => {
      const SINGLETON_TYPES = new Set([
        'about',
        'elsewhere',
        'journalPage',
        'organsPage',
        'privacy',
        'scoresPage',
        'settings',
      ])
      const docTypes: string[] = ['journal', 'organ', ...SINGLETON_TYPES]
      const out = [...prev]
      for (const type of docTypes) {
        for (const locale of LOCALES) {
          out.push({
            id: `${type}-${locale}`,
            title: `${type} (${locale})`,
            schemaType: type,
            value: SINGLETON_TYPES.has(type)
              ? { _id: `${type}-${locale}`, language: locale }
              : { language: locale },
          })
        }
      }
      return out
    },
  },

  document: {
    actions: (prev, context) => {
      // For every doc type: wrap the built-in `publish` action so that a
      // successful single-doc publish busts the matching `sanity:<docId>`
      // ISR cache tag. See `docs/architecture/caching-strategy.md`.
      const wrappedForRevalidate = prev.map((action) =>
        (action as unknown as { action?: string }).action === 'publish'
          ? withRevalidatePublish(action)
          : action,
      )
      if (!isTranslatableType(context.schemaType)) return wrappedForRevalidate
      // Translatable types: also relabel the single-locale Publish so editors
      // see it's the fallback, then prepend the multi-locale Publish action
      // (which busts caches itself via `/api/publish-all`).
      const relabeled = wrappedForRevalidate.map((action) =>
        (action as unknown as { action?: string }).action === 'publish'
          ? relabelSingleLocalePublish(action)
          : action,
      )
      return [publishAllLocalesAction, ...relabeled]
    },
    badges: (prev, context) => {
      if (!isTranslatableType(context.schemaType)) return prev
      return [...prev, staleTranslationBadge]
    },
  },

  // Custom studio chrome: widens the document pane so the PortableText
  // editor on long posts has room to breathe.
  studio: {
    components: {
      layout: StudioLayout,
    },
  },
})
