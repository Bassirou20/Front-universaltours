
import React from 'react'
import { createPortal } from 'react-dom'
type Toast = { id: number; title: string; tone?: 'success'|'error'|'info' }
type Ctx = { push: (t: Omit<Toast, 'id'>)=>void }
const ToastCtx = React.createContext<Ctx | null>(null)
let id = 1
export const ToastProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [items, setItems] = React.useState<Toast[]>([])
  const push = (t: Omit<Toast,'id'>) => { const tid = id++; setItems(s=>[...s, { id: tid, ...t }]); setTimeout(()=> setItems(s=> s.filter(x=>x.id!==tid)), 3000) }
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {createPortal(<div className="fixed top-4 right-4 space-y-2 z-50">
        {items.map(t=> (<div key={t.id} className={'card shadow-soft px-4 py-2 text-sm ' + (t.tone==='success' ? 'border-l-4 border-green-500' : t.tone==='error' ? 'border-l-4 border-red-500' : 'border-l-4 border-primary')}>{t.title}</div>))}
      </div>, document.body)}
    </ToastCtx.Provider>
  )
}
export const useToast = () => { const ctx = React.useContext(ToastCtx); if (!ctx) throw new Error('useToast outside provider'); return ctx }
