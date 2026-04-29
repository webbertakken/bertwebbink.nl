import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { LanguagePicker } from './LanguagePicker'

let mockPathname = '/about'
let mockParams: Record<string, string> = {}
const mockReplace = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}))

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>()
  return { ...actual, useParams: () => mockParams }
})

const messages = {
  LanguagePicker: {
    label: 'Language',
    switchTo: 'Switch to {language}',
  },
}

beforeEach(() => {
  mockPathname = '/about'
  mockParams = {}
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

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

  describe('on a slugged route', () => {
    it('translates the slug via /api/locale-sibling when switching from a journal post', async () => {
      mockPathname = '/journal/[slug]'
      mockParams = { locale: 'nl', slug: 'mijn-post' }
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          new Response(JSON.stringify({ slug: 'my-post' }), { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchMock)

      renderPicker('nl')
      screen.getByRole('button', { name: /Language/i }).click()
      const listbox = await screen.findByRole('listbox', { name: /Language/i })
      await act(async () => {
        within(listbox).getByRole('option', { name: /Switch to English/i }).click()
      })

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      const calledUrl = String(fetchMock.mock.calls[0]?.[0])
      expect(calledUrl).toContain('type=journal')
      expect(calledUrl).toContain('from=nl')
      expect(calledUrl).toContain('slug=mijn-post')
      expect(calledUrl).toContain('to=en')

      await vi.waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1))
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/journal/[slug]',
          params: expect.objectContaining({ slug: 'my-post' }),
        }),
        { locale: 'en' },
      )
    })

    it('falls back to /organs when an organ has no sibling in the target locale', async () => {
      mockPathname = '/organs/[slug]'
      mockParams = { locale: 'nl', slug: 'het-orgel' }
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          new Response(JSON.stringify({ slug: null }), { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchMock)

      renderPicker('nl')
      screen.getByRole('button', { name: /Language/i }).click()
      const listbox = await screen.findByRole('listbox', { name: /Language/i })
      await act(async () => {
        within(listbox).getByRole('option', { name: /Switch to Deutsch/i }).click()
      })

      await vi.waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1))
      expect(mockReplace).toHaveBeenCalledWith(
        { pathname: '/organs' },
        { locale: 'de' },
      )
    })

    it('falls back to the listing when the sibling lookup throws', async () => {
      mockPathname = '/journal/[slug]'
      mockParams = { locale: 'nl', slug: 'mijn-post' }
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
          throw new Error('network down')
        }),
      )

      renderPicker('nl')
      screen.getByRole('button', { name: /Language/i }).click()
      const listbox = await screen.findByRole('listbox', { name: /Language/i })
      await act(async () => {
        within(listbox).getByRole('option', { name: /Switch to English/i }).click()
      })

      await vi.waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1))
      expect(mockReplace).toHaveBeenCalledWith(
        { pathname: '/' },
        { locale: 'en' },
      )
    })

    it('does not query the API for non-slugged routes', async () => {
      mockPathname = '/about'
      mockParams = { locale: 'nl' }
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      renderPicker('nl')
      screen.getByRole('button', { name: /Language/i }).click()
      const listbox = await screen.findByRole('listbox', { name: /Language/i })
      await act(async () => {
        within(listbox).getByRole('option', { name: /Switch to English/i }).click()
      })

      await vi.waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1))
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/about' }),
        { locale: 'en' },
      )
    })
  })
})
