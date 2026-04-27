import { DocumentTextIcon } from '@sanity/icons'
import { format, parseISO } from 'date-fns'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * Post schema. Define and edit the fields for the 'post' content type.
 * Learn more: https://www.sanity.io/docs/schema-types
 */
export const organ = defineType({
  name: 'organ',
  title: 'Organ',
  icon: DocumentTextIcon,
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
      description: 'A slug is required for the post to show up in the preview',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'blockContent',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
          validation: (rule) => {
            // Custom validation to ensure alt text is provided if the image is present. https://www.sanity.io/docs/validation
            return rule.custom((alt, context) => {
              if ((context.document?.coverImage as any)?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
          description:
            'Italic figure caption shown beneath the cover image on the post page.',
        },
      ],
      // No required validation: bulk-imported posts may not have a source
      // image; editors can attach a cover image manually after import.
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'tone',
      title: 'Placeholder tone',
      description:
        'Colour palette for the striped placeholder shown when no cover image is set. Defaults to warm.',
      type: 'string',
      options: {
        list: [
          { title: 'Warm (default)', value: 'warm' },
          { title: 'Cool', value: 'cool' },
          { title: 'Sage', value: 'sage' },
          { title: 'Stone', value: 'stone' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'placeholderLabel',
      title: 'Placeholder label',
      description:
        'Override for the small caption inside the placeholder card. Defaults to the building name.',
      type: 'string',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      description:
        'Where the organ stands. Drives the card meta and the "By city" sidebar on the landing page.',
      type: 'object',
      fields: [
        defineField({
          name: 'city',
          title: 'City',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'country',
          title: 'Country code',
          description: 'ISO 3166-1 alpha-2, e.g. NL, DE, BE.',
          type: 'string',
          initialValue: 'NL',
          validation: (rule) => rule.required().length(2).uppercase(),
        }),
        defineField({
          name: 'building',
          title: 'Building',
          description:
            'The church or building housing the organ, e.g. "Jacobuskerk" or "Bovenkerk".',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'builder',
      title: 'Organ builder',
      description: 'Maker of the instrument, e.g. "Albertus Antoni Hinsz".',
      type: 'string',
    }),
    defineField({
      name: 'year',
      title: 'Build year',
      description: 'Year the instrument was built.',
      type: 'number',
      validation: (rule) => rule.integer().min(1300).max(new Date().getFullYear()),
    }),
    defineField({
      name: 'disposition',
      title: 'Organ disposition',
      description:
        'Technical specification of the instrument. Drives the Specification sidebar on the post page.',
      type: 'object',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'manuals',
          title: 'Manuals',
          description: 'Number of keyboards (excluding pedal).',
          type: 'number',
          validation: (rule) => rule.integer().min(1).max(7),
        }),
        defineField({
          name: 'stops',
          title: 'Number of stops',
          type: 'number',
          validation: (rule) => rule.integer().min(1),
        }),
        defineField({
          name: 'pitch',
          title: 'Pitch',
          description: 'e.g. "a¹ = 415 Hz" or "a¹ = 440 Hz".',
          type: 'string',
        }),
        defineField({
          name: 'temperament',
          title: 'Temperament',
          description: 'e.g. "Equal", "Modified meantone", "Werckmeister III".',
          type: 'string',
        }),
        defineField({
          name: 'action',
          title: 'Action',
          description: 'Key action type, e.g. "Mechanical", "Pneumatic", "Electric".',
          type: 'string',
        }),
        defineField({
          name: 'restoredYear',
          title: 'Year of restoration',
          description: 'Last major restoration year, if any.',
          type: 'number',
          validation: (rule) =>
            rule.integer().min(1300).max(new Date().getFullYear()),
        }),
        defineField({
          name: 'couplings',
          title: 'Couplings (Koppelingen)',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'coupling',
              fields: [
                defineField({
                  name: 'name',
                  title: 'Name',
                  description: 'e.g. "Hoofdwerk – Bovenwerk", "Pedaal – Manuaal I".',
                  type: 'string',
                  validation: (rule) => rule.required(),
                }),
                defineField({
                  name: 'note',
                  title: 'Note',
                  description: 'Optional, e.g. "schuifkoppel", "4\u2032".',
                  type: 'string',
                }),
              ],
              preview: {
                select: { name: 'name', note: 'note' },
                prepare: ({ name, note }) => ({
                  title: note ? `${name} — ${note}` : name,
                }),
              },
            }),
          ],
        }),
        defineField({
          name: 'accessories',
          title: 'Accessories (Speelhulpen)',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'accessory',
              fields: [
                defineField({
                  name: 'name',
                  title: 'Name',
                  description: 'e.g. "Tremulant", "Calcant", "Setzerkombinationen", "Tutti".',
                  type: 'string',
                  validation: (rule) => rule.required(),
                }),
                defineField({
                  name: 'note',
                  title: 'Note',
                  description: 'Optional, e.g. "2004".',
                  type: 'string',
                }),
              ],
              preview: {
                select: { name: 'name', note: 'note' },
                prepare: ({ name, note }) => ({
                  title: note ? `${name} — ${note}` : name,
                }),
              },
            }),
          ],
        }),
        defineField({
          name: 'registers',
          title: 'Registers (per keyboard)',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'register',
              fields: [
                defineField({
                  name: 'name',
                  title: 'Keyboard name',
                  description: 'e.g. "Hoofdwerk", "Rugwerk", "Bovenwerk", "Pedaal".',
                  type: 'string',
                  validation: (rule) => rule.required(),
                }),
                defineField({
                  name: 'range',
                  title: 'Compass',
                  description: 'Optional keyboard range, e.g. "C–f\u2032\u2032\u2032".',
                  type: 'string',
                }),
                defineField({
                  name: 'stops',
                  title: 'Stops',
                  type: 'array',
                  of: [
                    defineArrayMember({
                      type: 'object',
                      name: 'stop',
                      fields: [
                        defineField({
                          name: 'name',
                          title: 'Name',
                          type: 'string',
                          validation: (rule) => rule.required(),
                        }),
                        defineField({
                          name: 'pitch',
                          title: 'Pitch',
                          description:
                            'e.g. "8\u2032", "16\u2032", "II", "III–IV", "V (vanaf a)".',
                          type: 'string',
                        }),
                        defineField({
                          name: 'note',
                          title: 'Note',
                          description: 'Optional, e.g. "discant", "1841/1974".',
                          type: 'string',
                        }),
                      ],
                      preview: {
                        select: { name: 'name', pitch: 'pitch' },
                        prepare: ({ name, pitch }) => ({
                          title: `${name}${pitch ? ' ' + pitch : ''}`,
                        }),
                      },
                    }),
                  ],
                }),
              ],
              preview: {
                select: { name: 'name', stops: 'stops' },
                prepare: ({ name, stops }) => ({
                  title: name,
                  subtitle: `${(stops || []).length} stops`,
                }),
              },
            }),
          ],
        }),
      ],
    }),
  ],
  // List preview configuration. https://www.sanity.io/docs/previews-list-views
  preview: {
    select: {
      title: 'title',
      date: 'date',
      media: 'coverImage',
    },
    prepare({ title, media, date }) {
      const subtitle = date ? `on ${format(parseISO(date), 'LLL d, yyyy')}` : ''
      return { title, media, subtitle }
    },
  },
})
