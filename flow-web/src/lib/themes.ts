export interface ThemeDefinition {
  id: string
  name: string
  description: string
  variables: Record<string, string>
}

export const themes: Record<string, ThemeDefinition> = {
  basic: {
    id: "basic",
    name: "Basic",
    description: "Clean, modern interface",
    variables: {
      // Colors (current design)
      "--background": "oklch(100% 0 0)",
      "--foreground": "oklch(9% 0.006 285.885)",
      "--card": "oklch(100% 0 0)",
      "--card-foreground": "oklch(9% 0.006 285.885)",
      "--primary": "oklch(9% 0.006 285.885)",
      "--primary-foreground": "oklch(98.5% 0 0)",
      "--secondary": "oklch(96.7% 0.001 286.375)",
      "--secondary-foreground": "oklch(9% 0.006 285.885)",
      "--muted": "oklch(96.7% 0.001 286.375)",
      "--muted-foreground": "oklch(44.2% 0.017 285.786)",
      "--accent": "oklch(96.7% 0.001 286.375)",
      "--accent-foreground": "oklch(9% 0.006 285.885)",
      "--border": "oklch(92% 0.004 286.32)",
      "--input": "oklch(92% 0.004 286.32)",
      "--ring": "oklch(9% 0.006 285.885)",
      "--destructive": "oklch(57.7% 0.245 27.325)",
      "--destructive-foreground": "oklch(98.2% 0.018 155.826)",
      "--popover": "oklch(100% 0 0)",
      "--popover-foreground": "oklch(9% 0.006 285.885)",
      // Accent colors (for retro compatibility; basic uses muted tones)
      "--accent-purple": "oklch(85% 0.05 285)",
      "--accent-green": "oklch(90% 0.06 150)",
      "--accent-peach": "oklch(92% 0.05 50)",
      "--accent-yellow": "oklch(95% 0.08 95)",
      "--accent-blue": "oklch(90% 0.05 240)",
      // Typography
      "--font-body": "ui-sans-serif, system-ui, sans-serif",
      "--font-mono": "ui-monospace, monospace",
      "--font-display": "ui-sans-serif, system-ui, sans-serif",
      // Borders & Shadows
      "--border-width": "1px",
      "--border-radius-card": "0.5rem",
      "--border-radius-button": "0.375rem",
      "--border-radius-input": "0.375rem",
      "--shadow-card": "0 1px 3px rgba(0,0,0,0.1)",
      "--shadow-button": "none",
      "--shadow-button-hover": "0 4px 6px rgba(0,0,0,0.1)",
      // Animations
      "--transition-fast": "150ms ease",
      "--hover-transform": "none",
    },
  },
  retro: {
    id: "retro",
    name: "Retro",
    description: "Illustrated, playful aesthetic",
    variables: {
      // Retro pastel colors
      "--background": "#faf8f3",
      "--foreground": "#2d2d2d",
      "--card": "#ffffff",
      "--card-foreground": "#2d2d2d",
      "--primary": "#fff4b8",
      "--primary-foreground": "#2d2d2d",
      "--secondary": "#faf8f3",
      "--secondary-foreground": "#2d2d2d",
      "--muted": "#f0f0f0",
      "--muted-foreground": "#6b6b6b",
      "--accent": "#d4c5f9",
      "--accent-foreground": "#2d2d2d",
      "--border": "#2d2d2d",
      "--input": "#2d2d2d",
      "--ring": "#2d2d2d",
      "--destructive": "#ef4444",
      "--destructive-foreground": "#ffffff",
      "--popover": "#ffffff",
      "--popover-foreground": "#2d2d2d",
      // Accent colors
      "--accent-purple": "#d4c5f9",
      "--accent-green": "#c8f0d4",
      "--accent-peach": "#ffd4c4",
      "--accent-yellow": "#fff4b8",
      "--accent-blue": "#c4e0ff",
      // Typography
      "--font-body": "'DM Sans', sans-serif",
      "--font-mono": "'Space Mono', monospace",
      "--font-display": "'Caveat', cursive",
      // Borders & Shadows
      "--border-width": "3px",
      "--border-radius-card": "24px",
      "--border-radius-button": "16px",
      "--border-radius-input": "16px",
      "--shadow-card": "6px 6px 0 #2d2d2d",
      "--shadow-button": "4px 4px 0 #2d2d2d",
      "--shadow-button-hover": "6px 6px 0 #2d2d2d",
      // Animations
      "--transition-fast": "300ms ease",
      "--hover-transform": "translate(-2px, -2px)",
    },
  },
}

export const defaultTheme = "basic"
