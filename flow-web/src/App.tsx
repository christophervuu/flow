import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { RecentRuns } from "@/components/RecentRuns"
import { ComposePage } from "@/pages/ComposePage"
import { RunPage } from "@/pages/RunPage"
import { TestModeProvider, useTestMode } from "@/contexts/TestModeContext"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-6 px-4 py-3">
          <Link
            to="/"
            className="text-lg font-semibold hover:text-primary"
          >
            Flow
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
          <div className="ml-auto flex items-center gap-2">
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
      <TestModeProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<ComposePage />} />
              <Route path="/runs/:runId" element={<RunPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TestModeProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
