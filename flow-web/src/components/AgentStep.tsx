import { useTheme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

const AGENT_ICONS: Record<string, string> = {
  Clarifier: "🎯",
  Synthesizer: "🎨",
  Merger: "🔗",
  Challenger: "🔍",
  Optimizer: "⚡",
  Publisher: "📝",
  DesignJudge: "⚖️",
  CritiqueJudge: "⚖️",
}

function getIcon(agentName: string): string {
  if (AGENT_ICONS[agentName]) return AGENT_ICONS[agentName]
  if (agentName.startsWith("Synth_")) return "🎨"
  if (agentName.startsWith("Challenger_")) return "🔍"
  return "📌"
}

export interface AgentStepProps {
  agentName: string
  status: "pending" | "active" | "complete"
  statusText?: string
  isLast?: boolean
}

export function AgentStep({
  agentName,
  status,
  statusText,
  isLast = false,
}: AgentStepProps) {
  const { theme } = useTheme()
  const icon = status === "complete" ? "✓" : getIcon(agentName)

  const displayName =
    agentName.startsWith("Synth_") || agentName.startsWith("Challenger_")
      ? agentName.replace("_", " ")
      : agentName

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-4 rounded-[var(--border-radius-card)] border-[2px] border-[var(--border)] p-4 transition-all",
          status === "pending" && "bg-[#f0f0f0]",
          status === "active" &&
            "bg-[var(--accent-yellow)] step-icon-active shadow-[var(--shadow-button)]",
          status === "complete" &&
            "bg-[var(--accent-green)] shadow-[var(--shadow-button)]"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] text-xl",
            status === "pending" && "bg-[#f0f0f0]",
            status === "active" && "bg-[var(--accent-yellow)] step-icon-active",
            status === "complete" && "bg-[var(--accent-green)]"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--foreground)]">
            {displayName}
          </div>
          <div
            className="text-sm text-[var(--muted-foreground)]"
            style={theme === "retro" ? { fontFamily: "var(--font-display)" } : {}}
          >
            {statusText ??
              (status === "pending"
                ? "Waiting…"
                : status === "active"
                  ? "Processing…"
                  : "Complete!")}
          </div>
        </div>
      </div>
      {!isLast && (
        <div
          className="absolute left-7 -bottom-4 z-10 text-[var(--muted-foreground)]"
          aria-hidden
        >
          ↓
        </div>
      )}
    </div>
  )
}
