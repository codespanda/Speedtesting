import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Link } from "react-router-dom"

import { PathIcon } from "@/components/path-icon"
import { Button } from "@/components/ui/button"
import { ICONS } from "@/lib/speed"

/** Info pages, linked from the footer only. */
const FOOTER_LINKS = [
  { to: "/methodology", label: "Methodology" },
  { to: "/privacy", label: "Privacy" },
  { to: "/help", label: "Help" },
]

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <header className="bg-appbar text-white shadow-appbar">
      <div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-6">
        <Link to="/" className="mr-4 flex items-center gap-2.5 text-white no-underline">
          <PathIcon d={ICONS.pulse} size={26} strokeWidth={2.2} />
          <span className="text-xl font-medium tracking-[0.15px]">Pulse</span>
        </Link>

        <span className="flex-auto" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="size-11 rounded-full text-white hover:bg-white/15 hover:text-white dark:hover:bg-white/15"
        >
          {isDark ? <SunIcon className="size-[22px]" /> : <MoonIcon className="size-[22px]" />}
        </Button>
      </div>
    </header>
  )
}

export function AppFooter() {
  return (
    <footer className="border-t bg-card" aria-label="Site">
      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-6 gap-y-2 px-6 py-5 text-[13px] text-muted-foreground">
        <span>© Pulse</span>
        {FOOTER_LINKS.map((n) => (
          <Link key={n.to} to={n.to} className="text-primary no-underline hover:underline">
            {n.label}
          </Link>
        ))}
      </div>
    </footer>
  )
}
