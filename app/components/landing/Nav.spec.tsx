import { act, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import messages from '@/messages/en.json'
import { Nav } from './Nav'

let mockPathname = '/organs'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/sanity/lib/utils', () => ({
  dataAttr: () => ({ toString: () => '' }),
}))

function renderNav() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Nav locale="en" />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  mockPathname = '/organs'
})

describe('Nav', () => {
  it('closes the mobile menu when the route changes', async () => {
    const { rerender } = renderNav()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    })
    expect(screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')).toBe(
      'true',
    )

    mockPathname = '/scores'
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Nav locale="en" />
      </NextIntlClientProvider>,
    )

    expect(screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded')).toBe(
      'false',
    )
  })

  it('keeps the mobile menu open while the route stays the same', async () => {
    const { rerender } = renderNav()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    })
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Nav locale="en" />
      </NextIntlClientProvider>,
    )
    expect(screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')).toBe(
      'true',
    )
  })
})
