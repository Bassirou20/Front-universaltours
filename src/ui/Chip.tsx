// src/ui/Chip.tsx
import React from 'react'

// petit utilitaire local (pas besoin d'import externe)
function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export type ChipTone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple'

export const Chip: React.FC<{
  children: React.ReactNode
  tone?: ChipTone
  size?: 'sm' | 'md'
  icon?: React.ReactNode
  className?: string
}> = ({ children, tone = 'gray', size = 'sm', icon, className }) => {
  const toneClasses: Record<ChipTone, string> = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  }

  const sizeClasses = size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5'

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium', toneClasses[tone], sizeClasses, className)}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
