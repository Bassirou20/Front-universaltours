
import React from 'react'
export const FiltersBar: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-panel shadow-sm flex flex-wrap items-end gap-3 p-3">
    {children}
  </div>
)
