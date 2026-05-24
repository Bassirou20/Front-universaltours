import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../ui/Sidebar'
import { Topbar } from '../../ui/Topbar'
import { SidebarContext } from '../../store/sidebar'

// Below this width, sidebar auto-collapses to give content more room
// 1440 covers most laptops (1366×768, 1440×900) where the 260px sidebar would
// otherwise eat too much horizontal space
const AUTO_COLLAPSE_BREAKPOINT = 1440

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // User preference: null = no override (use auto), true/false = manual override
  const [userPref, setUserPref] = useState<boolean | null>(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') return true
    if (stored === 'false') return false
    return null
  })

  // Auto-collapse when viewport is too narrow (laptops 1366×768, etc.)
  const [autoCollapsed, setAutoCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < AUTO_COLLAPSE_BREAKPOINT : false
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${AUTO_COLLAPSE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setAutoCollapsed(e.matches)
    handler(mql)
    mql.addEventListener('change', handler as any)
    return () => mql.removeEventListener('change', handler as any)
  }, [])

  // User preference wins over auto-detection (manual toggle is always respected)
  const collapsed = userPref !== null ? userPref : autoCollapsed

  const close = () => setSidebarOpen(false)

  // Toggle flips current effective state and persists choice
  const toggleCollapse = () => {
    const next = !collapsed
    setUserPref(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0B1220]">

        {/* ── Sidebar desktop ── */}
        <div
          className="hidden lg:flex lg:flex-col lg:shrink-0 transition-[width] duration-300 ease-in-out"
          style={{ width: collapsed ? 64 : 260 }}
        >
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        </div>

        {/* ── Overlay mobile ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={close}
          />
        )}

        {/* ── Drawer mobile ── */}
        <div
          className={[
            'fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-300 ease-in-out lg:hidden',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <Sidebar onNavigate={close} />
        </div>

        {/* ── Colonne droite : topbar + contenu ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-3 md:px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
