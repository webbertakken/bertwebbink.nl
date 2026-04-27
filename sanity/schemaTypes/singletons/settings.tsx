import { CogIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

import * as demo from '../../lib/initialValues'

/**
 * Settings schema Singleton. Singletons are single documents that are displayed not in a collection, handy for things like site settings and other global configurations.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */
export const settings = defineType({
  name: 'settings',
  title: 'Settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'chrome', title: 'Site chrome' },
    { name: 'seo', title: 'Search engine optimisation' },
    { name: 'aeo', title: 'Agentic engine optimisation' },
  ],
  fields: [
    defineField({
      name: 'title',
      description: 'Site name. Used in the browser tab title ("%s | Site name") and as the default page title.',
      title: 'Title',
      type: 'string',
      group: 'general',
      initialValue: demo.title,
      validation: (rule) => rule.required(),
    }),

    // ─── Site chrome (nav wordmark + tagline) ───
    defineField({
      name: 'wordmark',
      title: 'Nav wordmark',
      description: 'The name shown in the top-left of the navigation, e.g. "Bert Webbink".',
      type: 'string',
      group: 'chrome',
      initialValue: 'Bert Webbink',
    }),
    defineField({
      name: 'tagline',
      title: 'Nav tagline',
      description:
        'Small mono-caps line shown next to the wordmark, e.g. "Organist". Keep it short — one or two words.',
      type: 'string',
      group: 'chrome',
      initialValue: 'Organist',
    }),
    defineField({
      name: 'scoresNoticeBody',
      title: 'Scores: notice body',
      description:
        'Italic notice shown beneath the score grid. One or two sentences explaining how the scores may be used.',
      type: 'text',
      rows: 3,
      group: 'chrome',
      initialValue:
        'These scores are shared for personal study and church use. If you would like to perform or record one, a short email is appreciated — and please credit the edition.',
    }),
    defineField({
      name: 'scoresEditionLine',
      title: 'Scores: edition prefix',
      description:
        'Small mono caps prefix shown above the notice. The current year is appended automatically.',
      type: 'string',
      group: 'chrome',
      initialValue: 'Edition Webbink',
    }),
    defineField({
      name: 'description',
      description: 'Site-wide meta description. Used in the homepage <meta name="description"> tag and as a fallback for pages that don\u2019t set their own.',
      title: 'Description',
      type: 'array',
      group: 'seo',
      initialValue: demo.description,
      of: [
        // Define a minified block content field for the description. https://www.sanity.io/docs/block-content
        defineArrayMember({
          type: 'block',
          options: {},
          styles: [],
          lists: [],
          marks: {
            decorators: [],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'linkType',
                    title: 'Link Type',
                    type: 'string',
                    initialValue: 'href',
                    options: {
                      list: [
                        { title: 'URL', value: 'href' },
                        { title: 'Organ', value: 'organ' },
                      ],
                      layout: 'radio',
                    },
                  }),
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    hidden: ({ parent }) => parent?.linkType !== 'href' && parent?.linkType != null,
                    validation: (Rule) =>
                      Rule.custom((value, context: any) => {
                        if (context.parent?.linkType === 'href' && !value) {
                          return 'URL is required when Link Type is URL'
                        }
                        return true
                      }),
                  }),
                  defineField({
                    name: 'organ',
                    title: 'Organ',
                    type: 'reference',
                    to: [{ type: 'organ' }],
                    hidden: ({ parent }) => parent?.linkType !== 'organ',
                    validation: (Rule) =>
                      Rule.custom((value, context: any) => {
                        if (context.parent?.linkType === 'organ' && !value) {
                          return 'Organ reference is required when Link Type is Organ'
                        }
                        return true
                      }),
                  }),
                  defineField({
                    name: 'openInNewTab',
                    title: 'Open in new tab',
                    type: 'boolean',
                    initialValue: false,
                  }),
                ],
              },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
      group: 'seo',
      description: 'Displayed on social cards and search engine results.',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      fields: [
        defineField({
          name: 'alt',
          description: 'Important for accessibility and SEO.',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => {
            return rule.custom((alt, context) => {
              if ((context.document?.ogImage as any)?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        }),
        defineField({
          name: 'metadataBase',
          type: 'url',
          description: (
            <a
              href="https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase"
              rel="noreferrer noopener"
            >
              More information
            </a>
          ),
        }),
      ],
    }),

    // ─── Agentic Engine Optimisation ───
    // Drives `app/llms.txt/route.ts` and `app/robots.ts`.
    defineField({
      name: 'aiSummary',
      title: 'Site summary for AI agents',
      group: 'aeo',
      description:
        'One or two sentences describing what this site is and who it is for, optimised for ingestion by LLMs (used in the generated /llms.txt). Plain prose, no marketing slogans.',
      type: 'text',
      rows: 4,
      initialValue:
        'Field notes, recordings and photographs from one organist’s visits to old organs in the Netherlands and beyond — plus working editions of the scores he prepares along the way.',
    }),
    defineField({
      name: 'aiCrawlPolicy',
      title: 'AI crawl policy',
      group: 'aeo',
      description:
        'Controls which AI crawlers may access the site. “Citation only” is the recommended default — it lets your work appear as a cited source in tools like ChatGPT and Perplexity, while blocking the training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, etc.) that absorb content into commercial AI products without attribution.',
      type: 'string',
      options: {
        list: [
          {
            title: 'Allow all crawlers (training + citation)',
            value: 'allow-all',
          },
          {
            title: 'Citation only — block training crawlers (recommended)',
            value: 'citation-only',
          },
          { title: 'Disallow all AI crawlers', value: 'disallow-all' },
        ],
        layout: 'radio',
      },
      initialValue: 'citation-only',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Settings',
      }
    },
  },
})
