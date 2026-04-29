import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { LanguagePicker } from './LanguagePicker'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => '/about',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

const messages = {
  LanguagePicker: {
    label: 'Language',
    switchTo: 'Switch to {language}',
  },
}

afterEach(() => vi.clearAllMocks())

function renderPicker(locale: 'nl' | 'en' = 'nl') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LanguagePicker locale={locale} />
    </NextIntlClientProvider>,
  )
}

describe('LanguagePicker', () => {
  it('shows the current locale endonym on the trigger', () => {
    renderPicker('nl')
    const button = screen.getByRole('button', { name: /Language/i })
    expect(button.textContent).toContain('Nederlands')
  })

  it('renders the language list with endonyms only when opened', async () => {
    renderPicker('nl')
    const button = screen.getByRole('button', { name: /Language/i })
    button.click()
    const listbox = await screen.findByRole('listbox', { name: /Language/i })
    const options = within(listbox).getAllByRole('option')
    const labels = options.map((o) => o.textContent)
    expect(labels).toContain('Nederlands')
    expect(labels).toContain('English')
    expect(labels).toContain('Deutsch')
    expect(labels).toContain('हिन्दी')
    // No flags ever rendered.
    for (const opt of options) {
      expect(opt.querySelector('img')).toBeNull()
    }
  })

  it('renders no buttons with country emoji or flag images', async () => {
    renderPicker('en')
    const button = screen.getByRole('button', { name: /Language/i })
    button.click()
    const listbox = await screen.findByRole('listbox', { name: /Language/i })
    const html = listbox.innerHTML
    expect(html).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u)
  })
})
