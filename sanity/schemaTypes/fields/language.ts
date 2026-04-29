import { defineField } from 'sanity'

/**
 * Shared `language` field added to every document type registered with
 * `documentInternationalization`. The plugin writes to it; editors never
 * see it. Hidden + readOnly per the plugin docs.
 */
export const languageField = defineField({
  name: 'language',
  title: 'Language',
  type: 'string',
  readOnly: true,
  hidden: true,
})
