import {defineField, defineType} from 'sanity'

/**
 * Horizontal-rule-style separator.
 *
 * Sanity requires every object to declare at least one field, so the block
 * carries a single read-only `style` marker. Editors don't see it; the
 * value is fixed and the renderer always produces the same separator.
 */
export const divider = defineType({
  name: 'divider',
  title: 'Divider',
  type: 'object',
  fields: [
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      options: {
        list: [{title: 'Default separator', value: 'default'}],
      },
      initialValue: 'default',
      readOnly: true,
      hidden: true,
    }),
  ],
  preview: {
    prepare: () => ({title: '———'}),
  },
})
