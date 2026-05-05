import { LockIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { languageField } from '../fields/language'

/**
 * Privacy page singleton (_id: "sitePrivacy").
 *
 * Deliberately structured rather than a single rich-text blob: the
 * page renders as a list of short Q&A rows, so editors stay honest
 * about keeping each answer to one or two sentences.
 */
export const privacy = defineType({
  name: 'privacy',
  title: 'Privacy page',
  type: 'document',
  icon: LockIcon,
  fields: [
    languageField,
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      description: 'Small mono caps line above the title.',
      type: 'string',
      initialValue: 'A short note',
    }),
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      initialValue: 'Privacy',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      description: 'One or two sentences in plain language. Sets the tone.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      description: 'Shown beneath the title as a small caps date.',
      type: 'date',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      description:
        'Short Q&A-style rows. Keep each answer to one or two sentences — long policies hide the important bits.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'section',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'body',
              title: 'Body',
              description: 'Plain text. One or two sentences.',
              type: 'text',
              rows: 3,
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: { heading: 'heading', body: 'body' },
            prepare: ({ heading, body }) => ({
              title: heading,
              subtitle: body,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'contactLine',
      title: 'Contact line',
      description: 'Final line. Usually an email invitation for questions.',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Privacy page' }
    },
  },
})
