import {
  BookIcon,
  CogIcon,
  ComposeIcon,
  DocumentIcon,
  DocumentTextIcon,
  LinkIcon,
  UserIcon,
} from '@sanity/icons'
import type { StructureBuilder, StructureResolver } from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Studio sidebar (left column / "desk" structure).
 *
 * Grouped flat with dividers — small site, easier to scan than nested
 * sub-panes. New document types added to the schema automatically appear
 * at the bottom (see catch-all below) so we don't silently lose anything;
 * promote them into one of the sections above when the time comes.
 */

// Singletons get their own listItem with a fixed documentId; we don't
// want them appearing again in the auto-discovered list.
const SINGLETON_TYPES = new Set(['settings', 'about', 'elsewhere'])

// Document types managed elsewhere (Sanity AI, etc.) — hide entirely.
const HIDDEN_TYPES = new Set(['assist.instruction.context'])

// Document types we place explicitly in the sections below.
const EXPLICIT_TYPES = new Set(['organ', 'score'])

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      // ─── Editorial ──────────────────────────────────────────
      S.documentTypeListItem('organ').title('Organs').icon(DocumentTextIcon),
      S.documentTypeListItem('blog').title('Blog posts').icon(ComposeIcon),
      S.documentTypeListItem('score').title('Scores').icon(BookIcon),

      S.divider(),

      // ─── Pages ──────────────────────────────────────────────
      S.listItem()
        .title('About page')
        .child(S.document().schemaType('about').documentId('siteAbout'))
        .icon(UserIcon),
      S.listItem()
        .title('Elsewhere page')
        .child(S.document().schemaType('elsewhere').documentId('siteElsewhere'))
        .icon(LinkIcon),

      S.divider(),

      // ─── Site ───────────────────────────────────────────────
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),

      // ─── Catch-all — auto-discovered new document types ─────
      // Anything we forget to place explicitly will land here so we
      // can still find it. Move into a section above when categorised.
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
