import { toast } from "sonner"
import { CopyIcon, DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownViewer } from "@/components/MarkdownViewer"
import { cn } from "@/lib/utils"

export type AgentResponseMessageType = "waiting" | "error" | "agent"

export interface AgentResponseMessageItem {
  id: string
  type: AgentResponseMessageType
  content: string
  agentName?: string
}

interface AgentResponseMessageProps {
  message: AgentResponseMessageItem
  onRetry?: () => void
  className?: string
}

function downloadMarkdown(content: string, filename = "design.md") {
  const blob = new Blob([content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AgentResponseMessage({
  message,
  onRetry,
  className,
}: AgentResponseMessageProps) {
  const { type, content, agentName } = message

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleDownload = () => {
    try {
      downloadMarkdown(content)
      toast.success("Download started")
    } catch {
      toast.error("Failed to download")
    }
  }

  if (type === "waiting") {
    return (
      <div
        className={cn(
          "rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--background)] p-4 retro-card-outline",
          className
        )}
      >
        <p className="italic text-[var(--muted-foreground)]">{content}</p>
      </div>
    )
  }

  if (type === "error") {
    return (
      <div
        className={cn(
          "rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-destructive/10 p-4 retro-card-outline",
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-destructive flex-1 text-sm">{content}</p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5"
            >
              <CopyIcon className="size-3.5" />
              Copy
            </Button>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // type === "agent"
  return (
    <div
      className={cn(
        "rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--background)] p-4 retro-card-outline",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--muted)] pb-2">
        {agentName ? (
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {agentName}
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8"
            title="Copy"
          >
            <CopyIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8"
            title="Download"
          >
            <DownloadIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="prose-wrapper">
        <MarkdownViewer content={content} />
      </div>
    </div>
  )
}
