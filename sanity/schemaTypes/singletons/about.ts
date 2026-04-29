import { UserIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { languageField } from '../fields/language'

/**
 * About page singleton (_id: "siteAbout").
 *
 * Convention for `title`-style fields: wrap any text in {{double braces}}
 * to italicise it on render — e.g. "Schrijf me over {{een orgel}}.".
 */
export const about = defineType({
  name: 'about',
  title: 'About page',
  type: 'document',
  icon: UserIcon,
  fields: [
    languageField,
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      description: 'Small mono caps line above the title.',
      type: 'string',
    }),
    defineField({
      name: 'title',
      title: 'Page title',
      description: 'Wrap words in {{double braces}} to italicise them.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),

    // Letter
    defineField({
      name: 'letter',
      title: 'Letter',
      description:
        'Long-form personal introduction. The first block (style "Lede") renders larger and italic.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Body', value: 'normal' },
            { title: 'Lede (large italic)', value: 'lede' },
          ],
          marks: {
            decorators: [
              { title: 'Italic', value: 'em' },
              { title: 'Strong', value: 'strong' },
            ],
            annotations: [],
          },
          lists: [],
        }),
      ],
    }),
    defineField({
      name: 'signoffName',
      title: 'Signature name',
      type: 'string',
      initialValue: '— Bert',
    }),
    defineField({
      name: 'signoffLocation',
      title: 'Signature location',
      type: 'string',
      initialValue: 'Vriezenveen',
    }),

    // Portrait
    defineField({
      name: 'portraitImage',
      title: 'Portrait',
      description:
        'Primary portrait shown in the sticky right column. If empty, a striped placeholder is shown. Best practice: re-use an existing asset from the media library rather than re-uploading — Sanity deduplicates by SHA but a shared `_ref` keeps things clean.',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
      ],
    }),
    defineField({
      name: 'portraitCaption',
      title: 'Portrait caption',
      description: 'Italic caption shown beneath the portrait.',
      type: 'string',
    }),
    defineField({
      name: 'portraitPlate',
      title: 'Plate label',
      description: 'Small mono caps tag in the corner of the caption, e.g. "Plate II".',
      type: 'string',
      initialValue: 'Plate II',
    }),
    defineField({
      name: 'secondaryImage',
      title: 'Secondary photo',
      description:
        'Optional second photo, shown as an inline plate between the Trajectory and Repertoire sections. Same asset-sharing best practice applies.',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
      ],
    }),
    defineField({
      name: 'secondaryCaption',
      title: 'Secondary caption',
      type: 'string',
    }),
    defineField({
      name: 'secondaryPlate',
      title: 'Secondary plate label',
      type: 'string',
      initialValue: 'Plate III',
    }),

    // Quick facts
    defineField({
      name: 'quickFacts',
      title: 'Quick facts',
      description: 'Five-ish key/value rows shown beneath the portrait.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'fact',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'value',
              type: 'string',
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { label: 'label', value: 'value' },
            prepare: ({ label, value }) => ({ title: `${label}: ${value}` }),
          },
        }),
      ],
    }),

    // Timeline
    defineField({
      name: 'timelineSummary',
      title: 'Timeline summary',
      description:
        'Short multi-line summary in the left column of the trajectory section. One word per line works well.',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'timeline',
      title: 'Timeline entries',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'entry',
          fields: [
            defineField({
              name: 'year',
              type: 'string',
              description: 'Year or label, e.g. "1962", "ca 1968", "onlangs".',
            }),
            defineField({
              name: 'what',
              type: 'string',
              description: 'Wrap proper names in {{double braces}} for italic emphasis.',
              validation: (r) => r.required(),
            }),
            defineField({ name: 'where', type: 'string' }),
          ],
          preview: {
            select: { year: 'year', what: 'what', where: 'where' },
            prepare: ({ year, what, where }) => ({
              title: what,
              subtitle: [year, where].filter(Boolean).join(' · '),
            }),
          },
        }),
      ],
    }),

    // Repertoire
    defineField({
      name: 'repertoireIntro',
      title: 'Repertoire intro',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'repertoire',
      title: 'Repertoire cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'card',
          fields: [
            defineField({ name: 'era', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'title',
              type: 'string',
              description: 'Wrap words in {{double braces}} for italic emphasis.',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'pieces',
              type: 'array',
              of: [{ type: 'string' }],
            }),
          ],
          preview: {
            select: { era: 'era', title: 'title' },
            prepare: ({ era, title }) => ({ title, subtitle: era }),
          },
        }),
      ],
    }),

    // Contact
    defineField({
      name: 'contactTitle',
      title: 'Contact heading',
      description: 'Wrap words in {{double braces}} for italic emphasis.',
      type: 'string',
    }),
    defineField({
      name: 'contactLede',
      title: 'Contact intro',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'contactRows',
      title: 'Contact rows',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'row',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'value',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'italic',
              type: 'boolean',
              description: 'Render the value in italic serif (used for soft notes / addresses).',
              initialValue: false,
            }),
            defineField({
              name: 'href',
              type: 'string',
              description: 'Optional link target, e.g. "mailto:bert@webbink.nl".',
            }),
          ],
          preview: {
            select: { label: 'label', value: 'value' },
            prepare: ({ label, value }) => ({ title: `${label}: ${value}` }),
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'About page' }
    },
  },
})
