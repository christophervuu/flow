import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Loader2Icon } from "lucide-react"
import { getRun } from "@/lib/api"
import { ClarifyPage } from "./ClarifyPage"
import { ResultsPage } from "./ResultsPage"

export function RunPage() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
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
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Running design pipeline…</p>
        <p className="text-sm text-muted-foreground">This may take a minute.</p>
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
