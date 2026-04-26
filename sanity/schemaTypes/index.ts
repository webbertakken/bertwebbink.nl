import { post } from './documents/post'
import { score } from './documents/score'
import { divider } from './objects/divider'
import { embed } from './objects/embed'
import { about } from './singletons/about'
import { settings } from './singletons/settings'
import { blockContent } from './objects/blockContent'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/schema-types
export const schemaTypes = [
  // Singletons
  settings,
  about,
  // Documents
  post,
  score,
  // Objects
  blockContent,
  divider,
  embed,
]
