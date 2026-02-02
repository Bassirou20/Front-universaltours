import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../ui/Sidebar'
import { Topbar } from '../../ui/Topbar'

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface">
      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[260px]">
        <Sidebar />
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar mobile drawer */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Content */}
      <div className="lg:pl-[260px]">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl w-full p-4 space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
