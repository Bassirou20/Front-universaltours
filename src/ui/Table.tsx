import React from 'react'


export const TableWrap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`w-full overflow-x-auto rounded-2xl shadow-soft bg-white dark:bg-panel ${className}`}>
    {children}
  </div>
)

// Table principale
export const T: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ children, className = '', ...rest }) => (
  <table className={`w-full text-sm ${className}`} {...rest}>
    {children}
  </table>
)

// Cellule d’en-tête
export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <th
    className={`px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${className}`}
    {...rest}
  >
    {children}
  </th>
)

// Cellule de tableau
export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <td className={`px-3 py-2 ${className}`} {...rest}>
    {children}
  </td>
)
