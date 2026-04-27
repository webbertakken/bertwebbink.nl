import { journal } from './documents/journal'
import { organ } from './documents/organ'
import { score } from './documents/score'
import { divider } from './objects/divider'
import { embed } from './objects/embed'
import { about } from './singletons/about'
import { elsewhere } from './singletons/elsewhere'
import { settings } from './singletons/settings'
import { blockContent } from './objects/blockContent'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/schema-types
export const schemaTypes = [
  // Singletons
  settings,
  about,
  elsewhere,
  // Documents
  organ,
  journal,
  score,
  // Objects
  blockContent,
  divider,
  embed,
]
