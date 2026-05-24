import { createContext, useContext } from 'react'

interface SidebarCtx {
  collapsed: boolean
}

export const SidebarContext = createContext<SidebarCtx>({ collapsed: false })
export const useSidebar = () => useContext(SidebarContext)
