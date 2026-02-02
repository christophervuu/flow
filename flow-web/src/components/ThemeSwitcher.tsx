import { useTheme } from "@/contexts/ThemeContext"

export function ThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-select" className="text-sm text-muted-foreground">
        Theme:
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="retro-card-outline rounded-[var(--border-radius-input)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm"
      >
        {availableThemes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
