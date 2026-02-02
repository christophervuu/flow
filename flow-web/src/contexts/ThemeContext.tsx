import { createContext, useContext, useEffect, useState } from "react"
import { themes, defaultTheme, type ThemeDefinition } from "@/lib/themes"

interface ThemeContextValue {
  theme: string
  setTheme: (id: string) => void
  themeDefinition: ThemeDefinition
  availableThemes: ThemeDefinition[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return defaultTheme
    return localStorage.getItem("flow-theme") || defaultTheme
  })

  const setTheme = (id: string) => {
    if (themes[id]) {
      setThemeState(id)
      localStorage.setItem("flow-theme", id)
    }
  }

  // Apply theme variables to document root
  useEffect(() => {
    const def = themes[theme] || themes[defaultTheme]
    const root = document.documentElement
    Object.entries(def.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    // Set data attribute for theme-specific CSS
    root.dataset.theme = theme
  }, [theme])

  const value: ThemeContextValue = {
    theme,
    setTheme,
    themeDefinition: themes[theme] || themes[defaultTheme],
    availableThemes: Object.values(themes),
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
