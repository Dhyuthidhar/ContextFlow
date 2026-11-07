'use client'

import { ReactNode, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

export interface DialogProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Dialog({ open, title, description, children, onClose }: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const node = document.createElement('div')
    node.dataset.cfDialogPortal = 'true'
    document.body.appendChild(node)
    setPortalNode(node)

    return () => {
      setPortalNode(null)
      node.remove()
    }
  }, [open])

  useEffect(() => {
    if (!open || !portalNode) return

    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const backgroundElements = Array.from(document.body.children)
      .filter((element) => element !== portalNode)
      .map((element) => ({
        element: element as HTMLElement,
        inert: (element as HTMLElement).inert,
        ariaHidden: element.getAttribute('aria-hidden'),
      }))
    for (const background of backgroundElements) {
      background.element.inert = true
      background.element.setAttribute('aria-hidden', 'true')
    }

    const dialog = dialogRef.current
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector)
    firstFocusable?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      for (const background of backgroundElements) {
        background.element.inert = background.inert
        if (background.ariaHidden === null) background.element.removeAttribute('aria-hidden')
        else background.element.setAttribute('aria-hidden', background.ariaHidden)
      }
      previousFocus.current?.focus()
    }
  }, [open, portalNode])

  if (!open || !portalNode) return null

  return createPortal(
    <div className="cf-ui fixed inset-0 z-[200] grid place-items-center bg-overlay p-cf-4" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-lg rounded-cf-md border-3 border-strong-border bg-surface p-cf-6 text-ink shadow-brutal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-cf-4">
          <div>
            <h2 id={titleId} className="text-cf-lg font-black">{title}</h2>
            {description && <p id={descriptionId} className="mt-cf-2 text-cf-sm text-ink-muted">{description}</p>}
          </div>
          <Button variant="quiet" size="sm" onClick={onClose} aria-label={`Close ${title}`}>
            <span aria-hidden="true">×</span>
          </Button>
        </div>
        <div className="mt-cf-6">{children}</div>
      </div>
    </div>,
    portalNode,
  )
}
