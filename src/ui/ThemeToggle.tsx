
import React from 'react'
import { Moon, Sun } from 'lucide-react'
const setDark = (on: boolean) => { const root = document.documentElement; if (on) root.classList.add('dark'); else root.classList.remove('dark'); localStorage.setItem('ut_theme', on ? 'dark' : 'light') }
export const ThemeToggle: React.FC = () => {
  const [dark, setD] = React.useState<boolean>(() => { const saved = localStorage.getItem('ut_theme'); return saved ? saved === 'dark' : true })
  React.useEffect(() => setDark(dark), [dark])
  return (<button onClick={()=>setD(d=>!d)} className="btn-ghost rounded-lg border border-black/5 dark:border-white/10 px-3 py-2">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>)
}
