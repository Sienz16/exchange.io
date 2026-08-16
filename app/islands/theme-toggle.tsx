import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'
const storageKey = 'exchangeio-theme'

function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f5f0' : '#05070c')
  if (persist) window.localStorage.setItem(storageKey, theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    // Follow live system changes until the visitor makes an explicit choice.
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const sync = () => {
      if (!window.localStorage.getItem(storageKey)) {
        const next: Theme = media.matches ? 'light' : 'dark'
        applyTheme(next, false)
        setTheme(next)
      }
    }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    applyTheme(next, true)
    setTheme(next)
  }

  return <button type="button" onClick={toggle}
    aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    aria-pressed={theme === 'light'}
    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent-strong hover:text-accent-strong">
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={theme ?? 'unknown'} initial={{ opacity: 0, rotate: -60 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 60 }} transition={{ duration: 0.2 }}>
        {theme === 'light' ? <Moon aria-hidden="true" size={15} strokeWidth={1.8} /> : <Sun aria-hidden="true" size={15} strokeWidth={1.8} />}
      </motion.span>
    </AnimatePresence>
  </button>
}
