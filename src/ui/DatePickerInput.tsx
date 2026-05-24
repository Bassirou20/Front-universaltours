import React, { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { fr } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { CalendarDays, X } from 'lucide-react'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

export function DatePickerInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = value ? new Date(value) : undefined
  const display = selected
    ? selected.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-all',
          'bg-white dark:bg-[#1c2535]',
          open
            ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-400/20'
            : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20',
        )}
      >
        <CalendarDays size={14} className="shrink-0 text-gray-400" />
        <span className={display ? 'text-gray-900 dark:text-gray-100 flex-1 truncate' : 'text-gray-400 flex-1'}>
          {display || placeholder || 'Choisir une date'}
        </span>
        {value && (
          <span
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onMouseDown={(e) => { e.stopPropagation(); onChange(''); setOpen(false) }}
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c2535] shadow-xl overflow-hidden">
          <DayPicker
            locale={fr}
            mode="single"
            selected={selected}
            onSelect={(d) => {
              onChange(d ? d.toISOString().slice(0, 10) : '')
              setOpen(false)
            }}
            defaultMonth={selected ?? new Date()}
            classNames={{
              root: 'p-3',
              month_caption: 'flex items-center justify-between px-1 pb-2 font-semibold text-sm text-gray-800 dark:text-gray-100',
              nav: 'flex items-center gap-1',
              button_previous: 'flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-gray-500 transition-colors',
              button_next: 'flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-gray-500 transition-colors',
              weekdays: 'flex mb-1',
              weekday: 'w-9 text-center text-[11px] font-medium text-gray-400 dark:text-gray-500',
              weeks: 'space-y-0.5',
              week: 'flex',
              day: 'w-9 h-9 flex items-center justify-center',
              day_button: 'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 text-gray-700 dark:text-gray-300',
              selected: '[&>button]:bg-sky-500 [&>button]:text-white [&>button]:hover:bg-sky-600',
              today: '[&>button]:font-bold [&>button]:text-sky-600 [&>button]:dark:text-sky-400',
              outside: 'opacity-30',
              disabled: 'opacity-30 cursor-not-allowed',
            }}
          />
        </div>
      )}
    </div>
  )
}
