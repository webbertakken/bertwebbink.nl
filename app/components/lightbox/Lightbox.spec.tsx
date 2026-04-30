import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { LightboxImage } from './LightboxImage'
import { LightboxProvider } from './LightboxProvider'

vi.mock('next-sanity/image', () => ({
  Image: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // Render the loaded image so the modal asserts can find it.
    // Strip non-DOM props that next/image would consume.
    const {
      src,
      alt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      width,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      height,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sizes,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      priority,
      ...rest
    } = props as Record<string, unknown> as React.ImgHTMLAttributes<HTMLImageElement> & {
      priority?: boolean
    }
    return <img src={src as string} alt={alt as string} {...rest} />
  },
}))

const messages = {
  Lightbox: {
    label: 'Image viewer',
    close: 'Close',
    previous: 'Previous image',
    next: 'Next image',
    open: 'Open {alt} in viewer',
    untitled: 'image',
  },
}

function Page() {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <LightboxProvider>
        <LightboxImage fullSrc="/full-1.jpg" alt="Plate I" caption="One">
          <img src="/thumb-1.jpg" alt="Plate I" />
        </LightboxImage>
        <LightboxImage fullSrc="/full-2.jpg" alt="Plate II">
          <img src="/thumb-2.jpg" alt="Plate II" />
        </LightboxImage>
        <LightboxImage fullSrc="/full-3.jpg" alt="Plate III">
          <img src="/thumb-3.jpg" alt="Plate III" />
        </LightboxImage>
      </LightboxProvider>
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  // jsdom lacks rAF; use a synchronous shim so mount-time effects flush.
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number,
  )
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function getTrigger(altText: string) {
  return screen.getByRole('button', { name: `Open ${altText} in viewer` })
}

describe('Lightbox', () => {
  it('renders triggers for every image without opening the modal', () => {
    render(<Page />)
    expect(getTrigger('Plate I')).toBeTruthy()
    expect(getTrigger('Plate II')).toBeTruthy()
    expect(getTrigger('Plate III')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the modal showing the clicked image and its caption', async () => {
    render(<Page />)
    await act(async () => {
      fireEvent.click(getTrigger('Plate I'))
    })
    const dialog = screen.getByRole('dialog', { name: 'Image viewer' })
    expect(dialog).toBeTruthy()
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/full-1.jpg')
    expect(screen.getByText('One')).toBeTruthy()
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })

  it('navigates with the right arrow key and wraps around', async () => {
    render(<Page />)
    await act(async () => {
      fireEvent.click(getTrigger('Plate III'))
    })
    expect(screen.getByText('3 / 3')).toBeTruthy()
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' })
    })
    expect(screen.getByText('1 / 3')).toBeTruthy()
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
    })
    expect(screen.getByText('3 / 3')).toBeTruthy()
  })

  it('closes on Escape and restores focus to the trigger', async () => {
    render(<Page />)
    const trigger = getTrigger('Plate II')
    await act(async () => {
      fireEvent.click(trigger)
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes when the backdrop is clicked but not when the image is clicked', async () => {
    render(<Page />)
    await act(async () => {
      fireEvent.click(getTrigger('Plate I'))
    })
    const dialog = screen.getByRole('dialog')
    await act(async () => {
      fireEvent.mouseDown(dialog.querySelector('img') as HTMLElement)
    })
    expect(screen.queryByRole('dialog')).toBeTruthy()
    await act(async () => {
      fireEvent.mouseDown(dialog)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when the close button is clicked', async () => {
    render(<Page />)
    await act(async () => {
      fireEvent.click(getTrigger('Plate I'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('navigates on touch swipe', async () => {
    render(<Page />)
    await act(async () => {
      fireEvent.click(getTrigger('Plate I'))
    })
    const dialog = screen.getByRole('dialog')
    await act(async () => {
      fireEvent.touchStart(dialog, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 100, clientY: 100 }] })
    })
    expect(screen.getByText('2 / 3')).toBeTruthy()
    await act(async () => {
      fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 200, clientY: 100 }] })
    })
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })

  it('hides the prev/next chrome and counter when there is only one image', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LightboxProvider>
          <LightboxImage fullSrc="/only.jpg" alt="Solitary plate">
            <img src="/thumb.jpg" alt="Solitary plate" />
          </LightboxImage>
        </LightboxProvider>
      </NextIntlClientProvider>,
    )
    await act(async () => {
      fireEvent.click(getTrigger('Solitary plate'))
    })
    expect(screen.queryByRole('button', { name: 'Previous image' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next image' })).toBeNull()
    expect(screen.queryByText(/1 \/ 1/)).toBeNull()
  })

  it('renders raw children outside a provider so the page is still readable', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LightboxImage fullSrc="/full.jpg" alt="Standalone">
          <img src="/thumb.jpg" alt="Standalone" data-testid="standalone" />
        </LightboxImage>
      </NextIntlClientProvider>,
    )
    expect(screen.getByTestId('standalone')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
