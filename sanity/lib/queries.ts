import { defineQuery } from 'next-sanity'

/**
 * All page queries are locale-aware: they take a `$locale` parameter and
 * scope by `language == $locale`. Singletons resolve via the symmetric
 * `{type}-{locale}` id pattern. The `score` type is field-level: it has
 * no `language` field and uses `coalesce(value[language == $locale][0],
 * value[language == "nl"][0])` for its localised array fields.
 */

export const settingsQuery = defineQuery(
  `*[_type == "settings" && _id == "settings-" + $locale][0]`,
)

export const navSettingsQuery = defineQuery(`
  *[_type == "settings" && _id == "settings-" + $locale][0] {
    _id,
    wordmark,
    tagline
  }
`)

export const footerContactQuery = defineQuery(`
  *[_type == "about" && _id == "about-" + $locale][0] {
    "href": contactRows[href match "mailto:*"][0].href
  }
`)

const organFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  "date": coalesce(date, _updatedAt),
  location,
  builder,
  year,
  "hasAudio": count(content[_type == "audio"]) > 0,
  "hasVideo": count(content[_type == "video"]) > 0,
`

const linkReference = /* groq */ `
  _type == "link" => {
    "organ": organ->slug.current
  }
`

/**
 * Sitemap data: emits one entry per (slug, locale) pair so the
 * sitemap.ts route can build per-locale URLs with hreflang siblings.
 */
export const sitemapData = defineQuery(`
  *[(_type == "organ" || _type == "journal") && defined(slug.current)] | order(_type asc) {
    "slug": slug.current,
    _type,
    _updatedAt,
    language,
  }
`)

export const organQuery = defineQuery(`
  *[_type == "organ" && language == $locale && slug.current == $slug] [0] {
    content[]{
      ...,
      markDefs[]{
        ...,
        ${linkReference}
      }
    },
    ${organFields}
    disposition,
    "position": count(*[_type == "organ" && language == $locale && defined(slug.current) && date <= ^.date]),
    "totalCount": count(*[_type == "organ" && language == $locale && defined(slug.current)]),
    "prev": *[_type == "organ" && language == $locale && defined(slug.current) && date < ^.date] | order(date desc, _updatedAt desc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      location
    },
    "next": *[_type == "organ" && language == $locale && defined(slug.current) && date > ^.date] | order(date asc, _updatedAt asc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      location
    }
  }
`)

/**
 * Enumerates one entry per (slug, locale) pair for `generateStaticParams`.
 * The route handler maps these to params.
 */
export const organPagesSlugs = defineQuery(`
  *[_type == "organ" && defined(slug.current) && defined(language)]
  { "slug": slug.current, "locale": language }
`)

export const landingOrgansQuery = defineQuery(`
  *[_type == "organ" && language == $locale && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${organFields}
  }
`)

export const landingStatsQuery = defineQuery(`
  {
    "totalCount": count(*[_type == "organ" && language == $locale && defined(slug.current)]),
    "firstDate": *[_type == "organ" && language == $locale && defined(slug.current)] | order(date asc) [0].date,
    "latestDate": *[_type == "organ" && language == $locale && defined(slug.current)] | order(date desc) [0].date
  }
`)

export const landingCitiesQuery = defineQuery(`
  *[_type == "organ" && language == $locale && defined(slug.current) && defined(location.city)]{
    "city": location.city
  }
`)

export const archiveOrgansQuery = defineQuery(`
  *[_type == "organ" && language == $locale && defined(slug.current) && ($city == "" || location.city == $city)]
    | order(date desc, _updatedAt desc) [$offset...$end] {
    ${organFields}
  }
`)

export const archiveOrgansCountQuery = defineQuery(`
  count(*[_type == "organ" && language == $locale && defined(slug.current) && ($city == "" || location.city == $city)])
`)

export const aboutQuery = defineQuery(`
  *[_type == "about" && _id == "about-" + $locale][0] {
    _id,
    eyebrow,
    title,
    letter,
    signoffName,
    signoffLocation,
    portraitImage,
    portraitCaption,
    portraitPlate,
    secondaryImage,
    secondaryCaption,
    secondaryPlate,
    quickFacts[]{ _key, label, value },
    timelineSummary,
    timeline[]{ _key, year, what, where },
    repertoireIntro,
    repertoire[]{ _key, era, title, pieces },
    contactTitle,
    contactLede,
    contactRows[]{ _key, label, value, italic, href }
  }
`)

const journalDetailFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  category,
  coverImage,
  "date": coalesce(date, _updatedAt),
`

export const journalQuery = defineQuery(`
  *[_type == "journal" && language == $locale && slug.current == $slug] [0] {
    content[]{
      ...,
      markDefs[]{
        ...,
        ${linkReference}
      }
    },
    ${journalDetailFields}
    "position": count(*[_type == "journal" && language == $locale && defined(slug.current) && date <= ^.date]),
    "totalCount": count(*[_type == "journal" && language == $locale && defined(slug.current)]),
    "prev": *[_type == "journal" && language == $locale && defined(slug.current) && date < ^.date] | order(date desc, _updatedAt desc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      category
    },
    "next": *[_type == "journal" && language == $locale && defined(slug.current) && date > ^.date] | order(date asc, _updatedAt asc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      category
    }
  }
`)

export const journalPagesSlugs = defineQuery(`
  *[_type == "journal" && defined(slug.current) && defined(language)]
  { "slug": slug.current, "locale": language }
`)

export const journalEntriesQuery = defineQuery(`
  *[_type == "journal" && language == $locale && defined(slug.current)] | order(date desc, _updatedAt desc) {
    _id,
    "title": coalesce(title, "Untitled"),
    "slug": slug.current,
    excerpt,
    coverImage,
    "date": coalesce(date, _updatedAt),
    category,
    "hasAudio": count(content[_type == "audio"]) > 0,
  }
`)

export const journalStatsQuery = defineQuery(`
  {
    "totalCount": count(*[_type == "journal" && language == $locale && defined(slug.current)]),
    "firstDate": *[_type == "journal" && language == $locale && defined(slug.current)] | order(date asc) [0].date
  }
`)

export const journalPageQuery = defineQuery(`
  *[_type == "journalPage" && _id == "journalPage-" + $locale][0] {
    _id,
    kickerLeft,
    kickerRight,
    heading,
    tagline,
    cornerLeftSub,
    cornerRightSub
  }
`)

export const organsPageQuery = defineQuery(`
  *[_type == "organsPage" && _id == "organsPage-" + $locale][0] {
    _id,
    kickerLeft,
    kickerRight,
    heading,
    tagline,
    cornerLeftSub,
    cornerRightSub
  }
`)

export const scoresPageQuery = defineQuery(`
  *[_type == "scoresPage" && _id == "scoresPage-" + $locale][0] {
    _id,
    kicker,
    heading,
    tagline,
    "noticeBody": *[_type == "settings" && _id == "settings-" + $locale][0].scoresNoticeBody,
    "editionLine": *[_type == "settings" && _id == "settings-" + $locale][0].scoresEditionLine,
    "contactHref": *[_type == "about" && _id == "about-" + $locale][0].contactRows[href match "mailto:*"][0].href
  }
`)

/**
 * Per-locale llms.txt index. The route at `/llms.{locale}.txt` calls this
 * with the appropriate locale; root `/llms.txt` defaults to English.
 */
export const llmsTxtIndexQuery = defineQuery(`
  {
    "organs": *[_type == "organ" && language == $locale && defined(slug.current)] | order(date desc) {
      "slug": slug.current,
      "title": coalesce(title, "Untitled"),
      excerpt,
      "date": coalesce(date, _updatedAt)
    },
    "journal": *[_type == "journal" && language == $locale && defined(slug.current)] | order(date desc) {
      "slug": slug.current,
      "title": coalesce(title, "Untitled"),
      excerpt,
      category,
      "date": coalesce(date, _updatedAt)
    }
  }
`)

export const elsewhereQuery = defineQuery(`
  *[_type == "elsewhere" && _id == "elsewhere-" + $locale][0] {
    _id,
    title,
    eyebrow,
    intro,
    groups[]{
      _key,
      title,
      links[]{ _key, label, href, description }
    }
  }
`)

export const privacyQuery = defineQuery(`
  *[_type == "privacy" && _id == "privacy-" + $locale][0] {
    _id,
    eyebrow,
    title,
    intro,
    lastUpdated,
    sections[]{ _key, heading, body },
    contactLine
  }
`)

/**
 * Site-wide search across journal, organ, score, and the long-form
 * singletons. Document-level types filter by `language == $locale`;
 * `score` is field-level so it is matched without a language filter
 * and its localised fields are pulled out per-locale via the existing
 * `[language == $locale][0].value` pattern.
 *
 * `pt::text(...)` flattens Portable Text inline so `match` can run on
 * its plain-text projection. The query is fetched with `stega: false`
 * — slugs flow into URL building and must be free of invisible chars.
 *
 * Score has no slug; results carry `editionNumber` instead so the
 * frontend can build the `/scores#ed-NN` anchor.
 */
export const searchQuery = defineQuery(`
  *[
    _type in ["journal", "organ", "score", "about", "elsewhere", "privacy"] &&
    (
      (_type == "score") ||
      (_type in ["about", "elsewhere", "privacy"] && language == $locale) ||
      (_type in ["journal", "organ"] && language == $locale && defined(slug.current))
    ) &&
    (
      title match $q ||
      pt::text(content) match $q ||
      pt::text(letter) match $q ||
      pt::text(intro) match $q ||
      excerpt match $q ||
      work match $q ||
      composer match $q ||
      catalog match $q ||
      builder match $q ||
      location.city match $q ||
      location.country match $q ||
      location.building match $q ||
      forInstrument[language == $locale][0].value match $q ||
      edition[language == $locale][0].value match $q ||
      blurb[language == $locale][0].value match $q
    )
  ]
  | score(
      boost(title match $q, 5),
      boost(work match $q, 5),
      boost(composer match $q, 4),
      boost(excerpt match $q, 2),
      boost(blurb[language == $locale][0].value match $q, 2)
    )
  | order(_score desc, _updatedAt desc)
  [0...50]
  {
    _id,
    _type,
    _score,
    "title": select(
      _type == "score" => composer + " — " + work,
      coalesce(title, "Untitled")
    ),
    "slug": slug.current,
    "editionNumber": editionNumber,
    "snippet": coalesce(
      pt::text(content)[0...200],
      pt::text(letter)[0...200],
      pt::text(intro)[0...200],
      excerpt,
      coalesce(blurb[language == $locale][0].value, blurb[language == "nl"][0].value)
    )
  }
`)

/**
 * Scores: field-level locale via `internationalizedArrayString` /
 * `internationalizedArrayText`. We coalesce to the Dutch source as a
 * fallback when a locale entry is missing.
 */
export const scoresQuery = defineQuery(`
  *[_type == "score"] | order(coalesce(editionNumber, 0) desc) {
    _id,
    composer,
    work,
    catalog,
    era,
    year,
    pages,
    editionNumber,
    "forInstrument": coalesce(forInstrument[language == $locale][0].value, forInstrument[language == "nl"][0].value),
    "edition": coalesce(edition[language == $locale][0].value, edition[language == "nl"][0].value),
    "blurb": coalesce(blurb[language == $locale][0].value, blurb[language == "nl"][0].value),
    "pdfUrl": pdfFile.asset->url,
    isFeatured,
  }
`)
