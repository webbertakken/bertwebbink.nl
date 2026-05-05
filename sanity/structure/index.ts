import {
  BookIcon,
  CogIcon,
  ComposeIcon,
  DocumentIcon,
  DocumentTextIcon,
  EarthGlobeIcon,
  HomeIcon,
  LinkIcon,
  LockIcon,
  MasterDetailIcon,
  TranslateIcon,
  UserIcon,
} from '@sanity/icons'
import pluralize from 'pluralize-esm'
import type {
  StructureBuilder,
  StructureResolver,
  StructureResolverContext,
} from 'sanity/structure'
import { LOCALES, LOCALE_LABELS_EN, type Locale } from '@/core/i18n/locales'

/**
 * Studio sidebar (left column / "desk" structure).
 *
 * Per-locale singletons get the symmetric `{type}-{locale}` id pattern.
 * The locale-aware doc lists for `organ` / `journal` filter by `language`
 * so editors don't see 11x duplicates of every doc.
 */

const SINGLETON_TYPES = new Set([
  'settings',
  'about',
  'elsewhere',
  'journalPage',
  'organsPage',
  'scoresPage',
  'privacy',
])

// Plugin-managed types we never want to surface in the sidebar list.
const HIDDEN_TYPES = new Set(['translation.metadata', 'media.tag'])

const EXPLICIT_TYPES = new Set(['organ', 'journal', 'score'])

type SingletonSpec = {
  type: string
  title: string
  icon: typeof DocumentIcon
}

const SINGLETON_SPECS: SingletonSpec[] = [
  { type: 'journalPage', title: 'Journal page', icon: HomeIcon },
  { type: 'organsPage', title: 'Organs page', icon: MasterDetailIcon },
  { type: 'scoresPage', title: 'Scores page', icon: BookIcon },
  { type: 'about', title: 'About page', icon: UserIcon },
  { type: 'elsewhere', title: 'Elsewhere page', icon: LinkIcon },
  { type: 'privacy', title: 'Privacy page', icon: LockIcon },
  { type: 'settings', title: 'Site Settings', icon: CogIcon },
]

/**
 * Returns one structure node per locale for a given singleton type.
 * Each node opens the symmetric `{type}-{locale}` document.
 */
function localizedSingletonItem(S: StructureBuilder, spec: SingletonSpec) {
  return S.listItem()
    .id(spec.type)
    .title(spec.title)
    .icon(spec.icon)
    .child(
      S.list()
        .id(`${spec.type}-by-locale`)
        .title(`${spec.title} \u00b7 by language`)
        .items(
          LOCALES.map((locale: Locale) =>
            S.listItem()
              .id(`${spec.type}-${locale}`)
              .title(LOCALE_LABELS_EN[locale])
              .icon(EarthGlobeIcon)
              .child(
                S.document()
                  .schemaType(spec.type)
                  .documentId(`${spec.type}-${locale}`)
                  .id(`${spec.type}-${locale}`),
              ),
          ),
        ),
    )
}

/**
 * Per-locale sub-list for `organ` / `journal` collection types.
 * Filters the document list by `language` so editors stay scoped.
 */
function localizedDocumentTypeItem(
  S: StructureBuilder,
  type: 'organ' | 'journal',
  title: string,
  icon: typeof DocumentIcon,
) {
  return S.listItem()
    .id(type)
    .title(title)
    .icon(icon)
    .child(
      S.list()
        .id(`${type}-by-locale`)
        .title(`${title} \u00b7 by language`)
        .items(
          LOCALES.map((locale: Locale) =>
            S.listItem()
              .id(`${type}-${locale}`)
              .title(LOCALE_LABELS_EN[locale])
              .icon(EarthGlobeIcon)
              .child(
                S.documentTypeList(type)
                  .id(`${type}-${locale}`)
                  .title(`${title} \u00b7 ${LOCALE_LABELS_EN[locale]}`)
                  .filter('_type == $type && language == $locale')
                  .params({ type, locale }),
              ),
          ),
        ),
    )
}

export const structure: StructureResolver = (
  S: StructureBuilder,
  _context: StructureResolverContext,
) =>
  S.list()
    .title('Website Content')
    .items([
      // \u2500\u2500\u2500 Editorial \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      localizedDocumentTypeItem(S, 'organ', 'Organs', DocumentTextIcon),
      localizedDocumentTypeItem(S, 'journal', 'Journal', ComposeIcon),
      S.documentTypeListItem('score').title('Scores').icon(BookIcon),

      S.divider(),

      // \u2500\u2500\u2500 Pages (per locale) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      ...SINGLETON_SPECS.filter((s) => s.type !== 'settings').map((spec) =>
        localizedSingletonItem(S, spec),
      ),

      S.divider(),

      // \u2500\u2500\u2500 Site \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      localizedSingletonItem(S, SINGLETON_SPECS.find((s) => s.type === 'settings')!),
      S.listItem()
        .id('translation-metadata')
        .title('Translation links')
        .icon(TranslateIcon)
        .child(S.documentTypeList('translation.metadata').title('Translation links')),

      // \u2500\u2500\u2500 Catch-all \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      ...S.documentTypeListItems()
        .filter((item) => {
          const id = item.getId()
          if (!id) return false
          if (HIDDEN_TYPES.has(id)) return false
          if (SINGLETON_TYPES.has(id)) return false
          if (EXPLICIT_TYPES.has(id)) return false
          return true
        })
        .map((item) => item.title(pluralize(item.getTitle() as string)).icon(DocumentIcon)),
    ])
