import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, FolderOpen, GraduationCap, Home, Settings, type LucideIcon } from 'lucide-react'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

export const TABS: Tab[] = [
  { to: '/', label: 'Start', icon: Home },
  { to: '/ordner', label: 'Ordner', icon: FolderOpen },
  { to: '/lernen', label: 'Lernen', icon: GraduationCap },
  { to: '/statistik', label: 'Statistik', icon: BarChart3 },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
]

function isActive(tab: Tab, pathname: string) {
  if (tab.to === '/') return pathname === '/'
  if (tab.to === '/ordner') return pathname.startsWith('/ordner') || pathname.startsWith('/stapel')
  return pathname.startsWith(tab.to)
}

export function TabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Hauptnavigation"
      className="glass absolute inset-x-0 bottom-0 z-30 border-t border-line pb-safe"
    >
      <ul className="flex h-[var(--tabbar-h)] items-stretch px-2">
        {TABS.map((tab) => {
          const active = isActive(tab, pathname)
          const Icon = tab.icon
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className="relative flex h-full flex-col items-center justify-center gap-1 outline-none"
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute top-1.5 h-8 w-14 rounded-full bg-accent-soft"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.span
                  className="relative"
                  animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 1.9}
                    className={active ? 'text-accent' : 'text-ink-3'}
                  />
                </motion.span>
                <span
                  className={`relative text-[10.5px] font-medium tracking-tight ${active ? 'text-accent' : 'text-ink-3'}`}
                >
                  {tab.label}
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
