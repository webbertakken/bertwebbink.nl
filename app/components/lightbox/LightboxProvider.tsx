'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { LightboxModal } from './LightboxModal'

export type LightboxItem = {
  src: string
  alt: string
  caption?: string | null
  width?: number
  height?: number
}

type RegisterFn = (el: HTMLElement, item: LightboxItem) => () => void
type OpenFn = (trigger: HTMLElement) => void

type LightboxContextValue = {
  register: RegisterFn
  open: OpenFn
}

const LightboxContext = createContext<LightboxContextValue | null>(null)

/** Hook for descendants of `LightboxProvider`. Returns `null` outside one. */
export function useLightbox(): LightboxContextValue | null {
  return useContext(LightboxContext)
}

type ModalState = {
  items: LightboxItem[]
  index: number
} | null

/**
 * Sort registered (element, item) pairs in document order so the
 * lightbox advances through images the way the reader sees them
 * regardless of mount order.
 */
function sortByDomOrder(entries: Array<[HTMLElement, LightboxItem]>) {
  return [...entries].sort(([a], [b]) => {
    if (a === b) return 0
    const r = a.compareDocumentPosition(b)
    if (r & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (r & Node.DOCUMENT_POSITION_PRECEDING) return 1
    return 0
  })
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const itemsRef = useRef(new Map<HTMLElement, LightboxItem>())
  const triggerRef = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<ModalState>(null)

  const register = useCallback<RegisterFn>((el, item) => {
    itemsRef.current.set(el, item)
    return () => {
      itemsRef.current.delete(el)
    }
  }, [])

  const open = useCallback<OpenFn>((trigger) => {
    const sorted = sortByDomOrder(Array.from(itemsRef.current.entries()))
    const items = sorted.map(([, item]) => item)
    const index = sorted.findIndex(([el]) => el === trigger)
    if (index === -1 || items.length === 0) return
    triggerRef.current = trigger
    setState({ items, index })
  }, [])

  const close = useCallback(() => {
    setState(null)
  }, [])

  // Restore focus to the trigger element after closing.
  useEffect(() => {
    if (state !== null) return
    const trigger = triggerRef.current
    if (trigger && typeof trigger.focus === 'function') {
      trigger.focus()
    }
    triggerRef.current = null
  }, [state])

  const setIndex = useCallback((nextIndex: number) => {
    setState((prev) => {
      if (!prev) return prev
      const total = prev.items.length
      const wrapped = ((nextIndex % total) + total) % total
      return { ...prev, index: wrapped }
    })
  }, [])

  const value = useMemo(() => ({ register, open }), [register, open])

  return (
    <LightboxContext.Provider value={value}>
      {children}
      {state !== null && (
        <LightboxModal
          items={state.items}
          index={state.index}
          onClose={close}
          onIndexChange={setIndex}
        />
      )}
    </LightboxContext.Provider>
  )
}
