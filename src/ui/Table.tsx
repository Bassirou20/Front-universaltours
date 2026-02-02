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
    className={`p-2 text-left text-gray-600 dark:text-gray-300 ${className}`}
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
  <td className={`p-2 ${className}`} {...rest}>
    {children}
  </td>
)
