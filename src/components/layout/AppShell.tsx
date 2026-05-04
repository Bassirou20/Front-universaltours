import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../ui/Sidebar'
import { Topbar } from '../../ui/Topbar'

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const close = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0B1220]">

      {/* ── Sidebar desktop (flex item, pas fixed) ── */}
      <div className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0">
        <Sidebar />
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

      {/* ── Colonne droite : topbar + contenu scrollable ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Zone scrollable — SEULE cette zone scrolle */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden ut-scrollbar">
          <div className="mx-auto max-w-7xl w-full p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
