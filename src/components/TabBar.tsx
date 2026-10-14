import { NavLink } from 'react-router-dom'
import { BookOpenText, CloudSun, Map as MapIcon, Menu, Plus } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Map', icon: MapIcon, end: true },
  { to: '/forecast', label: 'Forecast', icon: CloudSun },
  { to: '/log', label: 'Log catch', icon: Plus, primary: true },
  { to: '/logbook', label: 'Logbook', icon: BookOpenText },
  { to: '/more', label: 'More', icon: Menu },
]

export function TabBar() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-raised pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex h-16 max-w-xl items-stretch">
        {TABS.map(({ to, label, icon: Icon, end, primary }) => (
          <li key={to} className="flex flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              {primary ? (
                <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-pop">
                  <Icon size={26} aria-hidden />
                </span>
              ) : (
                <Icon size={22} aria-hidden />
              )}
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
