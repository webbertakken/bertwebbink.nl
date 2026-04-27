import { defineQuery } from 'next-sanity'

export const settingsQuery = defineQuery(`*[_type == "settings"][0]`)

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

export const sitemapData = defineQuery(`
  *[(_type == "organ" || _type == "journal") && defined(slug.current)] | order(_type asc) {
    "slug": slug.current,
    _type,
    _updatedAt,
  }
`)

export const organQuery = defineQuery(`
  *[_type == "organ" && slug.current == $slug] [0] {
    content[]{
      ...,
      markDefs[]{
        ...,
        ${linkReference}
      }
    },
    ${organFields}
    disposition,
    "position": count(*[_type == "organ" && defined(slug.current) && date <= ^.date]),
    "totalCount": count(*[_type == "organ" && defined(slug.current)]),
    "prev": *[_type == "organ" && defined(slug.current) && date < ^.date] | order(date desc, _updatedAt desc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      location
    },
    "next": *[_type == "organ" && defined(slug.current) && date > ^.date] | order(date asc, _updatedAt asc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      location
    }
  }
`)

export const organPagesSlugs = defineQuery(`
  *[_type == "organ" && defined(slug.current)]
  {"slug": slug.current}
`)

export const landingOrgansQuery = defineQuery(`
  *[_type == "organ" && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${organFields}
  }
`)

export const landingStatsQuery = defineQuery(`
  {
    "totalCount": count(*[_type == "organ" && defined(slug.current)]),
    "firstDate": *[_type == "organ" && defined(slug.current)] | order(date asc) [0].date,
    "latestDate": *[_type == "organ" && defined(slug.current)] | order(date desc) [0].date
  }
`)

export const landingCitiesQuery = defineQuery(`
  *[_type == "organ" && defined(slug.current) && defined(location.city)]{
    "city": location.city
  }
`)

export const aboutQuery = defineQuery(`
  *[_type == "about" && _id == "siteAbout"][0] {
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
  *[_type == "journal" && slug.current == $slug] [0] {
    content[]{
      ...,
      markDefs[]{
        ...,
        ${linkReference}
      }
    },
    ${journalDetailFields}
    "position": count(*[_type == "journal" && defined(slug.current) && date <= ^.date]),
    "totalCount": count(*[_type == "journal" && defined(slug.current)]),
    "prev": *[_type == "journal" && defined(slug.current) && date < ^.date] | order(date desc, _updatedAt desc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      category
    },
    "next": *[_type == "journal" && defined(slug.current) && date > ^.date] | order(date asc, _updatedAt asc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      category
    }
  }
`)

export const journalPagesSlugs = defineQuery(`
  *[_type == "journal" && defined(slug.current)]
  {"slug": slug.current}
`)

export const journalEntriesQuery = defineQuery(`
  *[_type == "journal" && defined(slug.current)] | order(date desc, _updatedAt desc) {
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
    "totalCount": count(*[_type == "journal" && defined(slug.current)]),
    "firstDate": *[_type == "journal" && defined(slug.current)] | order(date asc) [0].date
  }
`)

export const journalPageQuery = defineQuery(`
  *[_type == "journalPage" && _id == "siteJournalPage"][0] {
    kickerLeft,
    kickerRight,
    heading,
    tagline
  }
`)

export const organsPageQuery = defineQuery(`
  *[_type == "organsPage" && _id == "siteOrgansPage"][0] {
    kickerLeft,
    kickerRight,
    heading,
    tagline
  }
`)

export const scoresPageQuery = defineQuery(`
  *[_type == "scoresPage" && _id == "siteScoresPage"][0] {
    kicker,
    heading,
    tagline
  }
`)

export const llmsTxtIndexQuery = defineQuery(`
  {
    "organs": *[_type == "organ" && defined(slug.current)] | order(date desc) {
      "slug": slug.current,
      "title": coalesce(title, "Untitled"),
      excerpt,
      "date": coalesce(date, _updatedAt)
    },
    "journal": *[_type == "journal" && defined(slug.current)] | order(date desc) {
      "slug": slug.current,
      "title": coalesce(title, "Untitled"),
      excerpt,
      category,
      "date": coalesce(date, _updatedAt)
    }
  }
`)

export const elsewhereQuery = defineQuery(`
  *[_type == "elsewhere" && _id == "siteElsewhere"][0] {
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
  *[_type == "privacy" && _id == "sitePrivacy"][0] {
    eyebrow,
    title,
    intro,
    lastUpdated,
    sections[]{ _key, heading, body },
    contactLine
  }
`)

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
    forInstrument,
    edition,
    blurb,
    "pdfUrl": pdfFile.asset->url,
    isFeatured,
  }
`)
