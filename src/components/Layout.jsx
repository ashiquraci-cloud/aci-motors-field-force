import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const DESK_LINKS = [
  ['/', 'Dashboard', '\u{1F3E0}'],
  ['/upload', 'New Registration', '\u{1F69A}'],
  ['/review', 'Document Review', '\u{1F4C1}'],
  ['/timeline', 'Registrations', '\u{1F9FE}'],
  ['/timeline', 'Approvals', '\u2714'],
  ['/timeline', 'Payments', '\u{1F4B3}'],
  ['/timeline', 'Route Permit', '\u26A0'],
  ['/reports', 'Reports', '\u{1F4CA}'],
  ['/users', 'Users', '\u{1F465}'],
  ['/notifications', 'Notifications', '\u{1F514}']
]

export default function Layout() {
  const { isAdmin } = useAuth()
  return (
    <div className="min-h-screen bg-bg md:flex">
      {isAdmin && (
        <aside className="hidden md:flex w-60 bg-navy-950 text-white flex-col p-4 gap-1 min-h-screen sticky top-0">
          <div className="flex items-center gap-2 py-3">
            <div className="w-9 h-9 rounded-full bg-green-600 grid place-items-center font-black">ACI</div>
            <div className="text-xs font-bold">ACI MOTORS LTD.<br /><span className="font-normal opacity-70">FIELD FORCE</span></div>
          </div>
          {DESK_LINKS.map(([to, l, e], i) => (
            <NavLink key={i + to + l} to={to} className="px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10">
              {e} {l}
            </NavLink>
          ))}
        </aside>
      )}
      <div className="flex-1 max-w-[480px] md:max-w-none mx-auto md:mx-0 w-full pb-24 md:pb-8">
        <Outlet />
        <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-100 flex justify-around py-2 md:hidden z-40">
          {[['/', 'Home', '\u{1F3E0}'], ['/notifications', 'Notifications', '\u{1F514}'], ['/timeline', 'Dashboard', '\u{1F4CA}'], ['/reports', 'Profile', '\u{1F464}']].map(([to, l, e]) => (
            <NavLink key={to + l} to={to} className={({ isActive }) => 'flex flex-col items-center text-[11px] px-3 py-1 ' + (isActive ? 'text-brand-600 font-bold' : 'text-slate-500')}>
              <span className="text-xl">{e}</span>{l}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}