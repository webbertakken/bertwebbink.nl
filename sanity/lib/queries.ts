import { defineQuery } from 'next-sanity'

export const settingsQuery = defineQuery(`*[_type == "settings"][0]`)

const postFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  "date": coalesce(date, _updatedAt),
  "author": author->{firstName, lastName, picture},
  location,
  builder,
  year,
  "hasAudio": count(content[_type == "audio"]) > 0,
  "hasVideo": count(content[_type == "video"]) > 0,
`

const linkReference = /* groq */ `
  _type == "link" => {
    "page": page->slug.current,
    "post": post->slug.current
  }
`

const linkFields = /* groq */ `
  link {
      ...,
      ${linkReference}
      }
`

export const getPageQuery = defineQuery(`
  *[_type == 'page' && slug.current == $slug][0]{
    _id,
    _type,
    name,
    slug,
    heading,
    subheading,
    "pageBuilder": pageBuilder[]{
      ...,
      _type == "callToAction" => {
        ${linkFields},
      },
      _type == "infoSection" => {
        content[]{
          ...,
          markDefs[]{
            ...,
            ${linkReference}
          }
        }
      },
    },
  }
`)

export const sitemapData = defineQuery(`
  *[_type == "page" || _type == "post" && defined(slug.current)] | order(_type asc) {
    "slug": slug.current,
    _type,
    _updatedAt,
  }
`)

export const allPostsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

export const morePostsQuery = defineQuery(`
  *[_type == "post" && _id != $skip && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${postFields}
  }
`)

export const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug] [0] {
    content[]{
      ...,
      markDefs[]{
        ...,
        ${linkReference}
      }
    },
    ${postFields}
    disposition,
    "position": count(*[_type == "post" && defined(slug.current) && date <= ^.date]),
    "totalCount": count(*[_type == "post" && defined(slug.current)]),
    "prev": *[_type == "post" && defined(slug.current) && date < ^.date] | order(date desc, _updatedAt desc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      location
    },
    "next": *[_type == "post" && defined(slug.current) && date > ^.date] | order(date asc, _updatedAt asc) [0]{
      "title": coalesce(title, "Untitled"),
      "slug": slug.current,
      "date": coalesce(date, _updatedAt),
      location
    }
  }
`)

export const postPagesSlugs = defineQuery(`
  *[_type == "post" && defined(slug.current)]
  {"slug": slug.current}
`)

export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current)]
  {"slug": slug.current}
`)

export const landingPostsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${postFields}
  }
`)

export const landingStatsQuery = defineQuery(`
  {
    "totalCount": count(*[_type == "post" && defined(slug.current)]),
    "firstDate": *[_type == "post" && defined(slug.current)] | order(date asc) [0].date,
    "latestDate": *[_type == "post" && defined(slug.current)] | order(date desc) [0].date
  }
`)

export const landingCitiesQuery = defineQuery(`
  *[_type == "post" && defined(slug.current) && defined(location.city)]{
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
