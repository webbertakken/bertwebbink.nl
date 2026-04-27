import { ComposeIcon } from '@sanity/icons'
import { format, parseISO } from 'date-fns'
import { defineField, defineType } from 'sanity'

/**
 * Journal entry — for editorial content that isn't a single-organ visit.
 *
 * Travelogues (orgelpaden, multi-stop trips), workshop/museum visits,
 * memorials, biographies of others, news / announcements / milestones,
 * the editor's home-organ build, and collection-style list pages
 * (recordings, sheet music, photos).
 *
 * Lighter than `organ`: no location object, no disposition, no
 * builder/year. Same rich block content (audio/video/image embeds).
 */
export const journal = defineType({
  name: 'journal',
  title: 'Journal entry',
  icon: ComposeIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      description: 'Drives the small mono caps eyebrow on the post page.',
      type: 'string',
      options: {
        list: [
          { title: 'Orgelpad (travelogue)', value: 'travelogue' },
          { title: 'Werkplaats / museum', value: 'workshop' },
          { title: 'In memoriam', value: 'memorial' },
          { title: 'Huisorgel', value: 'home-organ' },
          { title: 'Biografie', value: 'biography' },
          { title: 'Nieuws / aankondiging', value: 'news' },
          { title: 'Verzameling', value: 'collection' },
          { title: 'Anders', value: 'other' },
        ],
        layout: 'radio',
      },
      initialValue: 'other',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', title: 'Alternative text' },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
          description: 'Italic figure caption shown beneath the cover.',
        },
      ],
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      date: 'date',
      media: 'coverImage',
    },
    prepare({ title, category, date, media }) {
      const subtitle = [
        category && category !== 'other' ? category : null,
        date ? format(parseISO(date), 'LLL d, yyyy') : null,
      ]
        .filter(Boolean)
        .join(' · ')
      return { title, media, subtitle }
    },
  },
})
