import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Loader2Icon } from "lucide-react"
import { getRun } from "@/lib/api"
import { ClarifyPage } from "./ClarifyPage"
import { ResultsPage } from "./ResultsPage"
import { ExecutionDAG } from "@/components/ExecutionDAG"
import { useTheme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

export function RunPage() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const initialDesign = (location.state as { designDocMarkdown?: string } | null)?.designDocMarkdown

  const { data: meta, isLoading, error, refetch } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "Running" ? 1500 : false
    },
  })

  if (!runId) {
    navigate("/", { replace: true })
    return null
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading run…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-destructive mb-4">
          {error instanceof Error ? error.message : "Failed to load run"}
        </p>
        <button
          onClick={() => refetch()}
          className="text-primary underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!meta) return null

  const status = meta.status
  const runPath = meta.artifactPaths?.state
    ? meta.artifactPaths.state.replace(/[/\\]state\.json$/i, "")
    : undefined

  if (status === "Running") {
    return (
      <div
        className={cn(
          "grid gap-6 transition-all duration-500",
          "grid-cols-1",
          "lg:grid-cols-[520px_1fr]"
        )}
      >
        <div
          className={cn(
            "rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)] retro-card-outline"
          )}
        >
          <div className="flex items-center gap-3 mb-6">
            {theme === "retro" && (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--accent-green)] text-xl"
                aria-hidden
              >
                🎨
              </div>
            )}
            <h2 className="text-xl font-semibold">Run in progress</h2>
          </div>
          <p className="text-[var(--muted-foreground)] mb-4">
            Design pipeline is running. This may take a minute.
          </p>
          <p className="font-mono text-sm text-[var(--muted-foreground)]">
            {runId}
          </p>
        </div>

        <div
          className={cn(
            "rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)] retro-card-outline"
          )}
        >
          <ExecutionDAG
            runId={runId}
            status={status}
            executionStatus={meta?.executionStatus ?? undefined}
          />
          <div className="mt-6 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--card)] p-6 retro-card-outline">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-dashed border-[var(--muted)]">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-[var(--accent-green)] text-lg"
                aria-hidden
              >
                📝
              </div>
              <h4 className="font-semibold">Agent Response</h4>
            </div>
            <p className="italic text-[var(--muted-foreground)]">
              Waiting for execution to complete…
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === "AwaitingClarifications") {
    const run = {
      runId: meta.runId,
      status: meta.status,
      runPath: runPath ?? "",
      blockingQuestions: meta.blockingQuestions ?? [],
      nonBlockingQuestions: meta.nonBlockingQuestions ?? [],
      designDocMarkdown: null,
    }
    return <ClarifyPage runId={runId} run={run} />
  }

  if (status === "Completed") {
    return (
      <ResultsPage
        runId={runId}
        runPath={runPath}
        initialMarkdown={initialDesign ?? null}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <p className="text-muted-foreground mb-2">Unknown status: {status}</p>
      <button onClick={() => refetch()} className="text-primary underline">
        Refresh
      </button>
    </div>
  )
}
