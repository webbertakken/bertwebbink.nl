import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { emphasis, highlighted, inlineCode, italic } from './richTextTags'

function html(node: ReactNode) {
  return render(<>{node}</>).container.innerHTML
}

describe('richTextTags', () => {
  it('renders emphasis in the regular weight', () => {
    expect(html(emphasis('on'))).toBe('<em class="italic font-normal">on</em>')
  })

  it('renders italic without changing the weight', () => {
    expect(html(italic('scores'))).toBe('<em class="italic">scores</em>')
  })

  it('renders inline code upright in monospace', () => {
    expect(html(inlineCode('settings'))).toBe(
      '<span class="not-italic font-mono text-sm text-ink">settings</span>',
    )
  })

  it('renders the highlighted text in place of the tag content', () => {
    expect(html(highlighted('Zwolle')())).toBe(
      '<span class="not-italic font-normal text-ink">Zwolle</span>',
    )
  })
})
