import React from 'react'

type Props = {
  page: number
  lastPage: number
  total?: number
  perPage?: number
  onPage: (p: number) => void
}

export const Pagination: React.FC<Props> = ({ page, lastPage, total, perPage = 10, onPage }) => {
  const prev = () => page > 1 && onPage(page - 1)
  const next = () => page < lastPage && onPage(page + 1)

  const from = total && total > 0 ? (page - 1) * perPage + 1 : 0
  const to   = total ? Math.min(page * perPage, total) : 0

  return (
    <div className="flex items-center justify-between text-sm mt-3">
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {total != null && total > 0
          ? `${from}–${to} sur ${total} élément${total > 1 ? 's' : ''}`
          : total === 0
          ? 'Aucun résultat'
          : ''}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={prev}
          disabled={page <= 1}
          className="btn px-3 py-1 bg-gray-200 dark:bg-white/10 disabled:opacity-40 text-sm"
        >
          Précédent
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums px-1">
          {page} / {lastPage || 1}
        </span>
        <button
          onClick={next}
          disabled={page >= lastPage}
          className="btn px-3 py-1 bg-gray-200 dark:bg-white/10 disabled:opacity-40 text-sm"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
