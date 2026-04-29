import type {
  DocumentActionComponent,
  DocumentActionDescription,
  DocumentActionProps,
} from 'sanity'

/**
 * Wrap the built-in single-locale `publish` action so its label warns
 * the editor that it skips the multi-locale flow. The wrapper just
 * delegates to the original component and patches the rendered
 * description's label + title.
 */
export function relabelSingleLocalePublish(
  original: DocumentActionComponent,
): DocumentActionComponent {
  const wrapped = (props: DocumentActionProps): DocumentActionDescription | null => {
    const description = original(props)
    if (!description) return null
    return {
      ...description,
      label: 'Publish only this language (not recommended)',
      title:
        'Publishes only the current language. Most editors should use the primary "Publish" button at the top, which translates and publishes every other locale.',
    }
  }
  // Preserve the action identifier so the Studio still recognises it as
  // the built-in publish action for keyboard shortcuts, etc.
  ;(wrapped as { action?: string }).action = (original as { action?: string }).action
  ;(wrapped as { displayName?: string }).displayName = 'PublishOnlyThisLanguage'
  return wrapped as DocumentActionComponent
}
