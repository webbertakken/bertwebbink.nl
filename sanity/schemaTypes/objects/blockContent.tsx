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
                    {title: 'Page', value: 'page'},
                    {title: 'Post', value: 'post'},
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
                name: 'page',
                title: 'Page',
                type: 'reference',
                to: [{type: 'page'}],
                hidden: ({parent}) => parent?.linkType !== 'page',
                validation: (Rule) =>
                  Rule.custom((value, context: any) => {
                    if (context.parent?.linkType === 'page' && !value) {
                      return 'Page reference is required when Link Type is Page'
                    }
                    return true
                  }),
              }),
              defineField({
                name: 'post',
                title: 'Post',
                type: 'reference',
                to: [{type: 'post'}],
                hidden: ({parent}) => parent?.linkType !== 'post',
                validation: (Rule) =>
                  Rule.custom((value, context: any) => {
                    if (context.parent?.linkType === 'post' && !value) {
                      return 'Post reference is required when Link Type is Post'
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
              {title: 'Direct URL', value: 'url'},
            ],
            layout: 'radio',
          },
          initialValue: 'youtube',
        }),
        defineField({
          name: 'url',
          title: 'Video URL',
          type: 'url',
          description: 'Full URL to the video (YouTube, Vimeo, or direct video URL)',
          validation: (Rule) => Rule.required(),
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
          description: 'Title for the audio clip',
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
  ],
})
