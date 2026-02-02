
import React from 'react'
type Props = { page: number; lastPage: number; total?: number; onPage: (p:number)=>void }
export const Pagination: React.FC<Props> = ({ page, lastPage, total, onPage }) => {
  const prev = () => page>1 && onPage(page-1)
  const next = () => page<lastPage && onPage(page+1)
  return (<div className="flex items-center justify-between text-sm mt-3"><div className="text-gray-500">{total!=null ? `${total} éléments` : ''}</div><div className="flex items-center gap-2"><button onClick={prev} disabled={page<=1} className="btn px-3 py-1 bg-gray-200 dark:bg-white/10 disabled:opacity-50">Précédent</button><span className="text-gray-500">Page {page} / {lastPage || 1}</span><button onClick={next} disabled={page>=lastPage} className="btn px-3 py-1 bg-gray-200 dark:bg-white/10 disabled:opacity-50">Suivant</button></div></div>)
}
