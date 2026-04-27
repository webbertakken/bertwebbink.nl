import { BookIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

/**
 * Scores page singleton (_id: "siteScoresPage").
 *
 * Hero copy for `/scores`. Note that the scores hero is structurally
 * different from the journal/organs heroes — a single-line kicker after
 * a hairline + ✦, not a two-part kicker — so this singleton has one
 * `kicker` field rather than `kickerLeft`/`kickerRight`.
 *
 * Convention: wrap words in {{double braces}} on the heading to
 * italicise them, matching `about.ts`.
 */
export const scoresPage = defineType({
  name: 'scoresPage',
  title: 'Scores page',
  type: 'document',
  icon: BookIcon,
  groups: [{ name: 'hero', title: 'Hero', default: true }],
  fields: [
    defineField({
      name: 'kicker',
      title: 'Kicker',
      description: 'Small-caps line above the title, after the ✦ separator.',
      type: 'string',
      group: 'hero',
      initialValue: 'A small library',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      description:
        'Wrap one or more words in {{double braces}} to italicise them, e.g. "Editions, fingerings, {{working scores}}.".',
      type: 'string',
      group: 'hero',
      initialValue: 'Editions, fingerings, {{working scores}}.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      description:
        'Italic intro paragraph beneath the title — a sentence or two, not a slogan.',
      type: 'text',
      rows: 4,
      group: 'hero',
      initialValue:
        "Working editions I've prepared for my own use — most for specific instruments visited in the field notes. Fingerings and registrations are suggestions, not prescriptions. All scores are free to download for non-commercial study.",
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Scores page' }
    },
  },
})
