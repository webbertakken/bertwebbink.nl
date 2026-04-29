import { LinkIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { languageField } from '../fields/language'

/**
 * Elsewhere page singleton (_id: "siteElsewhere").
 *
 * A curated, grouped outbound link list — choirs, churches, organ
 * resources, etc. Singleton so editors get exactly one source of truth
 * accessible from the Studio sidebar.
 */
export const elsewhere = defineType({
  name: 'elsewhere',
  title: 'Elsewhere page',
  type: 'document',
  icon: LinkIcon,
  fields: [
    languageField,
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      initialValue: 'Elsewhere',
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      description: 'Small mono caps line above the title.',
      type: 'string',
      initialValue: 'Een paar goede links',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      description: 'Optional 1–2 sentence introduction shown beneath the title.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Body', value: 'normal' }],
          marks: { decorators: [{ title: 'Italic', value: 'em' }], annotations: [] },
          lists: [],
        }),
      ],
    }),
    defineField({
      name: 'groups',
      title: 'Groups',
      description: 'Sectioned link list. Each group gets a small heading.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'group',
          fields: [
            defineField({
              name: 'title',
              title: 'Group title',
              description: 'e.g. "Vriezenveen", "Orgelbronnen".',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'links',
              title: 'Links',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'link',
                  fields: [
                    defineField({
                      name: 'label',
                      type: 'string',
                      validation: (rule) => rule.required(),
                    }),
                    defineField({
                      name: 'href',
                      title: 'URL',
                      type: 'url',
                      validation: (rule) =>
                        rule.required().uri({ scheme: ['http', 'https', 'mailto'] }),
                    }),
                    defineField({
                      name: 'description',
                      type: 'string',
                      description: 'Optional one-line description shown beneath the link.',
                    }),
                  ],
                  preview: {
                    select: { label: 'label', href: 'href' },
                    prepare: ({ label, href }) => ({ title: label, subtitle: href }),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'title', links: 'links' },
            prepare: ({ title, links }) => ({
              title,
              subtitle: `${(links || []).length} link(s)`,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Elsewhere page' }
    },
  },
})
