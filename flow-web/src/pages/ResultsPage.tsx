import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CopyIcon, RefreshCwIcon } from "lucide-react"
import { getDesign } from "@/lib/api"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import { MarkdownViewer } from "@/components/MarkdownViewer"
import { cn } from "@/lib/utils"

interface ResultsPageProps {
  runId: string
  runPath?: string
  initialMarkdown?: string | null
}

export function ResultsPage({
  runId,
  runPath,
  initialMarkdown,
}: ResultsPageProps) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { data: markdown, isLoading, error, refetch } = useQuery({
    queryKey: ["design", runId],
    queryFn: () => getDesign(runId),
    initialData: initialMarkdown ?? undefined,
    enabled: !initialMarkdown,
  })

  const content = (initialMarkdown ?? markdown ?? "").trim()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(runId)
      toast.success("Run ID copied")
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Design doc</h1>
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted-foreground">
        <span className="font-mono">{runId}</span>
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
          <CopyIcon className="size-4" />
        </Button>
        {runPath && (
          <span className="text-xs truncate max-w-[200px]" title={runPath}>
            {runPath}
          </span>
        )}
      </div>

      {isLoading && !content && <p className="text-muted-foreground">Loading design doc…</p>}
      {error && (
        <p className="text-destructive mb-2">
          {error instanceof Error ? error.message : "Failed to load design"}
        </p>
      )}

      {content && (
        <div
          className={cn(
            "rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-6 mb-6 max-h-[70vh] overflow-auto shadow-[var(--shadow-card)] retro-card-outline"
          )}
        >
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-dashed border-[var(--muted)]">
            {theme === "retro" && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-[var(--accent-green)] text-lg"
                aria-hidden
              >
                📝
              </div>
            )}
            <h2 className="font-semibold">Agent Response</h2>
          </div>
          <MarkdownViewer content={content} />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          className={cn(
            theme === "retro" &&
              "border-2 border-[var(--border)] rounded-[var(--border-radius-button)]"
          )}
        >
          <RefreshCwIcon className="size-4 mr-2" />
          Refresh
        </Button>
        <Button
          onClick={() => navigate("/")}
          className={cn(
            theme === "retro" &&
              "bg-[var(--accent-yellow)] text-[var(--foreground)] hover:bg-[#ffef9f] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-button-hover)]"
          )}
        >
          Start new run
        </Button>
      </div>
    </div>
  )
}
