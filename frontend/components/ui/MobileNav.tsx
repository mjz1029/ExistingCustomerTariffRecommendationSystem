import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, BarChart3, Settings, Upload, Brain } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconRegistry: Record<string, LucideIcon> = {
  Home,
  BarChart3,
  Settings,
  Upload,
  Brain,
}

interface NavItem {
  label: string
  value: string
  icon?: string
}

interface MobileNavProps {
  items: NavItem[]
  currentValue: string
  onSelect: (value: string) => void
}

export function MobileNav({ items, currentValue, onSelect }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (value: string) => {
    onSelect(value)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <span className="text-lg font-semibold text-slate-800">Menu</span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {items.map((item) => {
                  const Icon = item.icon ? iconRegistry[item.icon] : undefined
                  const isActive = item.value === currentValue
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleSelect(item.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {Icon && (
                        <Icon
                          className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                        />
                      )}
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
