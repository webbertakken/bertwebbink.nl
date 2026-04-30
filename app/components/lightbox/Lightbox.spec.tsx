import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { LightboxImage } from './LightboxImage'

const messages = {
  Lightbox: {
    label: 'Image preview',
    close: 'Close',
    open: 'View {alt} larger',
    untitled: 'image',
  },
}

function renderLightbox(props?: { src?: string; alt?: string }) {
  const { src = '/photo.jpg', alt = 'A handsome organ' } = props ?? {}
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LightboxImage src={src} alt={alt}>
        <img src={src} alt={alt} data-testid="thumb" />
      </LightboxImage>
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  // jsdom does not implement requestAnimationFrame consistently; shim
  // so any rAF-driven mount work flushes synchronously.
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number,
  )
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function getTrigger() {
  return screen.getByRole('button', { name: 'View A handsome organ larger' })
}

describe('LightboxImage', () => {
  it('renders the trigger and thumbnail without opening the modal', () => {
    renderLightbox()
    expect(getTrigger()).toBeTruthy()
    expect(screen.getByTestId('thumb')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the modal showing the same image source as the thumbnail', async () => {
    renderLightbox()
    await act(async () => {
      fireEvent.click(getTrigger())
    })
    const dialog = screen.getByRole('dialog', { name: 'Image preview' })
    const img = dialog.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/photo.jpg')
    expect(img?.getAttribute('alt')).toBe('A handsome organ')
  })

  it('moves focus to the close button on open and restores it on close', async () => {
    renderLightbox()
    const trigger = getTrigger()
    await act(async () => {
      fireEvent.click(trigger)
    })
    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(closeButton)
    await act(async () => {
      fireEvent.click(closeButton)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes when the Escape key is pressed', async () => {
    renderLightbox()
    await act(async () => {
      fireEvent.click(getTrigger())
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when the backdrop is clicked', async () => {
    renderLightbox()
    await act(async () => {
      fireEvent.click(getTrigger())
    })
    const dialog = screen.getByRole('dialog')
    await act(async () => {
      fireEvent.click(dialog)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when the image itself is clicked', async () => {
    renderLightbox()
    await act(async () => {
      fireEvent.click(getTrigger())
    })
    const dialog = screen.getByRole('dialog')
    const img = dialog.querySelector('img') as HTMLElement
    await act(async () => {
      fireEvent.click(img)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps Tab focus inside the dialog', async () => {
    renderLightbox()
    await act(async () => {
      fireEvent.click(getTrigger())
    })
    const dialog = screen.getByRole('dialog')
    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(closeButton)
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Tab' })
    })
    expect(document.activeElement).toBe(closeButton)
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    })
    expect(document.activeElement).toBe(closeButton)
  })

  it('locks body scroll while open and restores it on close', async () => {
    document.body.style.overflow = 'auto'
    renderLightbox()
    await act(async () => {
      fireEvent.click(getTrigger())
    })
    expect(document.body.style.overflow).toBe('hidden')
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(document.body.style.overflow).toBe('auto')
  })

  it('falls back to a generic accessible name when the alt is empty', () => {
    renderLightbox({ alt: '' })
    expect(screen.getByRole('button', { name: 'View image larger' })).toBeTruthy()
  })

  it('exposes aria-haspopup="dialog" on the trigger', () => {
    renderLightbox()
    expect(getTrigger().getAttribute('aria-haspopup')).toBe('dialog')
  })
})
