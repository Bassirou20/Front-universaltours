import React from 'react'

type Tone = 'blue' | 'gray' | 'green' | 'red' | 'amber' | 'purple'

const toneClasses: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200',
}

export const Badge: React.FC<{
  children: React.ReactNode
  tone?: Tone
  className?: string
}> = ({ children, tone = 'gray', className }) => {
  const base =
    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap'

  return <span className={[base, toneClasses[tone], className].filter(Boolean).join(' ')}>{children}</span>
}

export default Badge
