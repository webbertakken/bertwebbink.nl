import { MasterDetailIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

/**
 * Organs page singleton (_id: "siteOrgansPage").
 *
 * Hero copy for `/organs`. The surrounding chrome — corner editorial
 * meta, ✦ separator, ornament, distant church + windmill silhouettes,
 * sun, hero-cap fade — is part of the design and lives in the
 * component, not here.
 *
 * Convention: wrap words in {{double braces}} on the heading to
 * italicise them, matching `about.ts`.
 */
export const organsPage = defineType({
  name: 'organsPage',
  title: 'Organs page',
  type: 'document',
  icon: MasterDetailIcon,
  groups: [{ name: 'hero', title: 'Hero', default: true }],
  fields: [
    defineField({
      name: 'kickerLeft',
      title: 'Kicker — left',
      description: 'First half of the small-caps line above the title.',
      type: 'string',
      group: 'hero',
      initialValue: 'Field notes',
    }),
    defineField({
      name: 'kickerRight',
      title: 'Kicker — right',
      description: 'Second half, after the ✦ separator.',
      type: 'string',
      group: 'hero',
      initialValue: 'From the organ loft',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      description:
        'Wrap one or more words in {{double braces}} to italicise them, e.g. "Visits to {{old organs}}".',
      type: 'string',
      group: 'hero',
      initialValue: 'Visits to {{old organs}}',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      description:
        'Italic intro paragraph beneath the title — a sentence or two, not a slogan.',
      type: 'text',
      rows: 3,
      group: 'hero',
    }),
    defineField({
      name: 'cornerLeftSub',
      title: 'Top-left subtitle',
      description:
        'Italic subtitle under the top-left meta line (which shows “Since {year} · {n} organs”).',
      type: 'string',
      group: 'hero',
      initialValue: 'A field journal',
    }),
    defineField({
      name: 'cornerRightSub',
      title: 'Top-right subtitle',
      description:
        'Italic subtitle under the coordinates in the top-right meta line.',
      type: 'string',
      group: 'hero',
      initialValue: 'The low countries',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Organs page' }
    },
  },
})
