import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { createPortal } from 'react-dom'

type ActionItem = {
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
  icon?: React.ReactNode
  disabled?: boolean
}

function useIsMobile(breakpointPx = 1024) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpointPx)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpointPx)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpointPx])
  return isMobile
}

function Portal({ children }: { children: React.ReactNode }) {
  const el = useMemo(() => document.createElement('div'), [])

  useEffect(() => {
    document.body.appendChild(el)
    return () => {
      try {
        document.body.removeChild(el)
      } catch {}
    }
  }, [el])

  return createPortal(children, el)
}


function BottomSheet({
  open,
  title = 'Actions',
  items,
  onClose,
}: {
  open: boolean
  title?: string
  items: ActionItem[]
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[80]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-lg rounded-t-3xl bg-white dark:bg-panel shadow-soft border border-black/10 dark:border-white/10 overflow-hidden animate-[sheetUp_180ms_ease-out]">
            <div className="px-4 pt-3 pb-2">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/10" />
              <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
            </div>

            <div className="px-2 pb-2">
              {items.map((it, idx) => (
                <button
                  key={idx}
                  disabled={it.disabled}
                  onClick={() => {
                    if (it.disabled) return
                    onClose()
                    it.onClick()
                  }}
                  className={[
                    'w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm',
                    'hover:bg-black/5 dark:hover:bg-white/10',
                    it.disabled ? 'opacity-50 cursor-not-allowed' : '',
                    it.tone === 'danger' ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100',
                  ].join(' ')}
                >
                  {it.icon ? <span className="shrink-0">{it.icon}</span> : null}
                  <span className="truncate">{it.label}</span>
                </button>
              ))}

              <button
                onClick={onClose}
                className="mt-1 w-full rounded-2xl px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(12px); opacity: 0.7; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </Portal>
  )
}

type DropdownPos = { top: number; left: number }

function computeDropdownPos(btn: HTMLElement, menuHeight = 220): DropdownPos {
  const r = btn.getBoundingClientRect()
  const gap = 8
  const spaceBelow = window.innerHeight - r.bottom
  const spaceAbove = r.top
  const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow

  const top = openUp ? Math.max(gap, r.top - menuHeight - gap) : Math.min(window.innerHeight - gap, r.bottom + gap)
  const left = r.right
  return { top, left }
}

export function ActionsMenu({
  items,
  label = 'Actions',
  buttonClassName = 'btn px-2 bg-gray-200 dark:bg-white/10',
}: {
  items: ActionItem[]
  label?: string
  buttonClassName?: string
}) {
  const isMobile = useIsMobile(1024)

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos | null>(null)

  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // ✅ IMPORTANT: click-outside doit considérer menu+button (Portal)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  // ESC ferme
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // recalcul position
  useEffect(() => {
    if (!open || isMobile) return
    const btn = btnRef.current
    if (!btn) return
    const recalc = () => setPos(computeDropdownPos(btn, 220))
    recalc()
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, true)
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc, true)
    }
  }, [open, isMobile])

  const toggle = () => {
    if (isMobile) {
      setOpen(true)
      return
    }
    const btn = btnRef.current
    if (!btn) return
    setPos(computeDropdownPos(btn, 220))
    setOpen((v) => !v)
  }

  // Mobile => bottom sheet
  if (isMobile) {
    return (
      <>
        <button
          ref={btnRef}
          className={buttonClassName}
          onClick={toggle}
          aria-label={label}
          title={label}
          type="button"
        >
          <MoreVertical size={16} />
        </button>

        <BottomSheet open={open} title={label} items={items} onClose={() => setOpen(false)} />
      </>
    )
  }

  // Desktop => dropdown portal
  return (
    <>
      <button
        ref={btnRef}
        className={buttonClassName}
        onClick={toggle}
        aria-label={label}
        title={label}
        type="button"
      >
        <MoreVertical size={16} />
      </button>

      {open && pos ? (
        <Portal>
          <div className="fixed inset-0 z-[75]" />

          <div
            ref={menuRef}
            className="fixed z-[76] w-48 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-panel shadow-soft overflow-hidden"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translateX(-100%)',
            }}
          >
            {items.map((it, idx) => (
              <button
                key={idx}
                disabled={it.disabled}
                className={[
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
                  'hover:bg-black/5 dark:hover:bg-white/10',
                  it.disabled ? 'opacity-50 cursor-not-allowed' : '',
                  it.tone === 'danger' ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100',
                ].join(' ')}
                onClick={() => {
                  if (it.disabled) return
                  setOpen(false)
                  it.onClick()
                }}
                type="button"
              >
                {it.icon ? <span className="shrink-0">{it.icon}</span> : null}
                <span className="truncate">{it.label}</span>
              </button>
            ))}
          </div>
        </Portal>
      ) : null}
    </>
  )
}
