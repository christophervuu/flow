import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface MarkdownViewerProps {
  content: string
  className?: string
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div
      className={cn(
        "prose max-w-none",
        "prose-headings:font-semibold prose-headings:text-[var(--foreground)]",
        "prose-p:text-[var(--foreground)]",
        "prose-li:text-[var(--foreground)]",
        "prose-strong:text-[var(--foreground)]",
        "prose-a:text-[var(--primary)]",
        "prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg",
        "prose-code:text-[var(--foreground)]",
        "dark:prose-invert",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
