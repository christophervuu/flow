import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { RecentRuns } from "@/components/RecentRuns"
import { ComposePage } from "@/pages/ComposePage"
import { TestModeProvider, useTestMode } from "@/contexts/TestModeContext"
import { RunProvider } from "@/contexts/RunContext"
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function Layout({ children }: { children: React.ReactNode }) {
  const { testMode, setTestMode } = useTestMode()
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          "border-b-[var(--border-width)] border-[var(--border)] bg-[var(--card)] retro-card-outline"
        )}
      >
        <div className="container mx-auto flex items-center gap-6 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80">
            <div
              className={cn(
                "flex items-center justify-center font-bold",
                theme === "retro"
                  ? "h-[60px] w-[60px] rounded-[16px] border-[3px] border-[var(--border)] bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 text-2xl text-white shadow-[4px_4px_0_var(--border)]"
                  : "h-10 w-10 rounded-lg bg-primary text-primary-foreground"
              )}
            >
              F
            </div>
            <div>
              <span className="text-lg font-semibold">Flow</span>
              {theme === "retro" && (
                <p
                  className="text-[var(--muted-foreground)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Design your AI agent with ease
                </p>
              )}
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              New Design
            </Link>
            <RecentRuns />
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <ThemeSwitcher />
            {testMode && (
              <span className="text-xs font-medium rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                Test
              </span>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="test-mode"
                checked={testMode}
                onCheckedChange={setTestMode}
              />
              <Label htmlFor="test-mode" className="text-sm cursor-pointer">
                Test mode
              </Label>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TestModeProvider>
          <RunProvider>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<ComposePage />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </RunProvider>
        </TestModeProvider>
      </ThemeProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
