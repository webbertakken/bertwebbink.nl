import {defineArrayMember, defineType, defineField} from 'sanity'

/**
 * This is the schema definition for the rich text fields used for
 * for this blog studio. When you import it in schemas.js it can be
 * reused in other parts of the studio with:
 *  {
 *    name: 'someName',
 *    title: 'Some title',
 *    type: 'blockContent'
 *  }
 *
 * Learn more: https://www.sanity.io/docs/block-content
 */
export const blockContent = defineType({
  title: 'Block Content',
  name: 'blockContent',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      marks: {
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
                    {title: 'URL', value: 'href'},
                    {title: 'Organ', value: 'organ'},
                  ],
                  layout: 'radio',
                },
              }),
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                hidden: ({parent}) => parent?.linkType !== 'href' && parent?.linkType != null,
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
                to: [{type: 'organ'}],
                hidden: ({parent}) => parent?.linkType !== 'organ',
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
    defineArrayMember({
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
        }),
        defineField({
          name: 'caption',
          type: 'string',
          title: 'Caption',
          description: 'Optional caption for the image.',
        }),
        defineField({
          name: 'alignment',
          title: 'Alignment',
          type: 'string',
          description: 'How the image is laid out within the surrounding flow.',
          options: {
            list: [
              {title: 'Left', value: 'left'},
              {title: 'Center', value: 'center'},
              {title: 'Right', value: 'right'},
            ],
            layout: 'radio',
          },
        }),
      ],
    }),
    defineArrayMember({
      type: 'object',
      name: 'video',
      title: 'Video',
      fields: [
        defineField({
          name: 'videoType',
          title: 'Video Type',
          type: 'string',
          options: {
            list: [
              {title: 'YouTube', value: 'youtube'},
              {title: 'Vimeo', value: 'vimeo'},
              {title: 'Self-hosted file', value: 'url'},
            ],
            layout: 'radio',
          },
          initialValue: 'youtube',
        }),
        defineField({
          name: 'url',
          title: 'Video URL',
          type: 'url',
          description:
            'Full external URL (YouTube or Vimeo). Leave empty for self-hosted files.',
          hidden: ({parent}) => parent?.videoType === 'url',
          validation: (Rule) =>
            Rule.custom((value, context: any) => {
              if (context.parent?.videoType !== 'url' && !value) {
                return 'URL is required for YouTube and Vimeo videos'
              }
              return true
            }),
        }),
        defineField({
          name: 'videoFile',
          title: 'Video file',
          type: 'file',
          options: {accept: 'video/*'},
          description: 'Self-hosted video file. Used when video type is "Self-hosted file".',
          hidden: ({parent}) => parent?.videoType !== 'url',
        }),
        defineField({
          name: 'title',
          title: 'Video Title',
          type: 'string',
          description: 'Title for the video',
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          description: 'Optional description for the video',
        }),
        defineField({
          name: 'aspectRatio',
          title: 'Aspect Ratio',
          type: 'string',
          options: {
            list: [
              {title: '16:9 (Widescreen)', value: '16:9'},
              {title: '4:3 (Standard)', value: '4:3'},
              {title: '1:1 (Square)', value: '1:1'},
              {title: '9:16 (Vertical)', value: '9:16'},
            ],
          },
          initialValue: '16:9',
        }),
      ],
      preview: {
        select: {
          title: 'title',
          url: 'url',
          videoType: 'videoType',
        },
        prepare({title, url, videoType}) {
          return {
            title: title || 'Video',
            subtitle: `${videoType?.toUpperCase() || 'VIDEO'}: ${url || 'No URL'}`,
            media: () => '🎥',
          }
        },
      },
    }),
    defineArrayMember({
      type: 'object',
      name: 'audio',
      title: 'Audio',
      fields: [
        defineField({
          name: 'audioFile',
          title: 'Audio File',
          type: 'file',
          options: {
            accept: 'audio/*',
          },
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'title',
          title: 'Audio Title',
          type: 'string',
          description: 'Title for the audio clip, e.g. "Praeludium in g — Buxtehude, BuxWV 149".',
        }),
        defineField({
          name: 'kind',
          title: 'Kind label',
          type: 'string',
          description:
            'Short label shown next to the duration on the post page. Defaults to "Recording". Other useful values: "Live", "Field recording", "Improvisation", "Demo".',
          initialValue: 'Recording',
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          description: 'Optional description for the audio clip',
        }),
        defineField({
          name: 'duration',
          title: 'Duration',
          type: 'string',
          description: 'Duration of the audio (e.g., "3:45")',
        }),
        defineField({
          name: 'showControls',
          title: 'Show Audio Controls',
          type: 'boolean',
          description: 'Whether to show play/pause controls',
          initialValue: true,
        }),
        defineField({
          name: 'autoplay',
          title: 'Autoplay',
          type: 'boolean',
          description: 'Whether to autoplay the audio (not recommended for accessibility)',
          initialValue: false,
        }),
      ],
      preview: {
        select: {
          title: 'title',
          audioFile: 'audioFile',
          duration: 'duration',
        },
        prepare({title, audioFile, duration}) {
          return {
            title: title || 'Audio',
            subtitle: `${audioFile?.originalFilename || 'No file'} ${duration ? `(${duration})` : ''}`,
            media: () => '🎵',
          }
        },
      },
    }),
    // Divider and embed are registered as standalone object types
    // (see ./divider.ts and ./embed.ts) and referenced by name here.
    defineArrayMember({type: 'divider'}),
    defineArrayMember({type: 'embed'}),
  ],
})
