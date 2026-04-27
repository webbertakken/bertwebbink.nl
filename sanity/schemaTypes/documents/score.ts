import { BookIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const score = defineType({
  name: 'score',
  title: 'Score',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'composer',
      title: 'Composer',
      description: 'e.g. "Dieterich Buxtehude", "J.S. Bach", "arr. B. Webbink".',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'work',
      title: 'Work title',
      description:
        'e.g. "Praeludium in *g-moll*", "Trio Sonata No. 1 in *E-flat*". Wrap key terms in *single asterisks* to render them in italic.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'catalog',
      title: 'Catalog number',
      description: 'e.g. "BuxWV 149", "BWV 525".',
      type: 'string',
    }),
    defineField({
      name: 'era',
      title: 'Era',
      type: 'string',
      validation: (rule) => rule.required(),
      options: {
        list: [
          { title: 'Baroque', value: 'baroque' },
          { title: 'Dutch School', value: 'dutch' },
          { title: 'Romantic', value: 'romantic' },
          { title: 'Modern', value: 'modern' },
          { title: 'Arrangement', value: 'arrangement' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'year',
      title: 'Composition year',
      type: 'number',
      validation: (rule) => rule.integer().min(1300).max(new Date().getFullYear()),
    }),
    defineField({
      name: 'pages',
      title: 'Page count',
      type: 'number',
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: 'editionNumber',
      title: 'Edition number',
      description: 'Sequential edition number, rendered as "Ed. Webbink No. {NN}".',
      type: 'number',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'forInstrument',
      title: 'For instrument',
      type: 'string',
      initialValue: 'For organ',
    }),
    defineField({
      name: 'edition',
      title: 'Edition revision',
      description: 'e.g. "1st edition", "2nd revised, 2024".',
      type: 'string',
    }),
    defineField({
      name: 'blurb',
      title: 'Description',
      description: 'Short description shown alongside the featured score.',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'pdfFile',
      title: 'PDF file',
      type: 'file',
      options: { accept: 'application/pdf' },
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured edition',
      description:
        'Pin this score as the featured edition on the /scores page. Only one score should be featured at a time.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  orderings: [
    {
      title: 'Composer',
      name: 'composerAsc',
      by: [{ field: 'composer', direction: 'asc' }],
    },
    {
      title: 'Edition number, newest first',
      name: 'editionDesc',
      by: [{ field: 'editionNumber', direction: 'desc' }],
    },
    {
      title: 'Composition year',
      name: 'yearAsc',
      by: [{ field: 'year', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      composer: 'composer',
      work: 'work',
      editionNumber: 'editionNumber',
      isFeatured: 'isFeatured',
    },
    prepare({ composer, work, editionNumber, isFeatured }) {
      return {
        title: `${composer} — ${work}`,
        subtitle: `${isFeatured ? '★ Featured · ' : ''}Ed. Webbink No. ${String(editionNumber || '?').padStart(2, '0')}`,
      }
    },
  },
})
