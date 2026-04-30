import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { SearchBox } from './SearchBox'

const mockPush = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}))

const messages = {
  Nav: { openSearch: 'Open search' },
  Search: { placeholder: 'Search the site', submit: 'Search' },
}

function renderInline() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SearchBox />
    </NextIntlClientProvider>,
  )
}

function renderExpanded() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SearchBox variant="expanded" />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  mockPush.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('SearchBox', () => {
  describe('inline (collapsed) variant', () => {
    it('renders the input in the DOM up front, absolute-positioned so it never resizes the form', () => {
      renderInline()
      const input = screen.getByPlaceholderText('Search the site') as HTMLInputElement
      const form = input.closest('form') as HTMLFormElement
      // Input is present immediately, before any user interaction.
      expect(input).toBeTruthy()
      // ...but it is hidden from screen readers and the tab order so it
      // cannot be reached or read until the user opens the search.
      expect(input.getAttribute('aria-hidden')).toBe('true')
      expect(input.tabIndex).toBe(-1)
      // The form must be a relative positioning context and the input
      // must be absolutely positioned so the form's footprint stays at
      // the icon's width — toggling open never shifts nav neighbours.
      expect(form.className).toContain('relative')
      expect(input.className).toContain('absolute')
      expect(input.className).toContain('opacity-0')
      expect(input.className).toContain('pointer-events-none')
      expect(input.className).not.toMatch(/\bhidden\b/)
    })

    it('reveals the input and gives it focus when the search icon is clicked', async () => {
      renderInline()
      const trigger = screen.getByRole('button', { name: 'Open search' })
      const input = screen.getByPlaceholderText('Search the site') as HTMLInputElement
      await act(async () => {
        fireEvent.click(trigger)
      })
      expect(input.getAttribute('aria-hidden')).toBeNull()
      expect(input.tabIndex).toBe(0)
      expect(input.className).toContain('opacity-100')
      expect(document.activeElement).toBe(input)
      // The button now acts as a submit button for the form.
      expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy()
    })

    it('navigates to /search with the trimmed query on submit', async () => {
      renderInline()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Open search' }))
      })
      const input = screen.getByPlaceholderText('Search the site') as HTMLInputElement
      await act(async () => {
        fireEvent.change(input, { target: { value: '  Sweelinck  ' } })
        fireEvent.submit(input.closest('form') as HTMLFormElement)
      })
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/search',
        query: { q: 'Sweelinck' },
      })
    })

    it('navigates to /search with no query when the input is empty', async () => {
      renderInline()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Open search' }))
      })
      await act(async () => {
        fireEvent.submit(
          screen.getByPlaceholderText('Search the site').closest('form') as HTMLFormElement,
        )
      })
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/search' })
    })

    it('collapses again on Escape', async () => {
      renderInline()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Open search' }))
      })
      const input = screen.getByPlaceholderText('Search the site') as HTMLInputElement
      expect(input.tabIndex).toBe(0)
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })
      expect(input.tabIndex).toBe(-1)
      expect(input.getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('expanded variant', () => {
    it('renders the input visible and focusable from first paint', () => {
      renderExpanded()
      const input = screen.getByPlaceholderText('Search the site') as HTMLInputElement
      expect(input.getAttribute('aria-hidden')).toBeNull()
      expect(input.tabIndex).toBe(0)
    })
  })
})
