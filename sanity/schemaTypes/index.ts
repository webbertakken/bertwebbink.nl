import { page } from './documents/page'
import { post } from './documents/post'
import { score } from './documents/score'
import { callToAction } from './objects/callToAction'
import { divider } from './objects/divider'
import { embed } from './objects/embed'
import { infoSection } from './objects/infoSection'
import { about } from './singletons/about'
import { settings } from './singletons/settings'
import { link } from './objects/link'
import { blockContent } from './objects/blockContent'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/schema-types
export const schemaTypes = [
  // Singletons
  settings,
  about,
  // Documents
  page,
  post,
  score,
  // Objects
  blockContent,
  infoSection,
  callToAction,
  link,
  divider,
  embed,
]
