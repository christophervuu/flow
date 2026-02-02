import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getExecutionStatus } from "@/lib/api"
import { AgentStep } from "./AgentStep"
import { cn } from "@/lib/utils"

interface ExecutionDAGProps {
  runId: string
  status: string
}

const DEFAULT_AGENTS = [
  "Clarifier",
  "Synthesizer",
  "Challenger",
  "Optimizer",
  "Publisher",
]

function getOrderedSteps(
  completed: string[],
  active: string[],
  pending: string[]
): string[] {
  const order: string[] = []
  const seen = new Set<string>()

  const add = (agents: string[]) => {
    for (const a of agents) {
      if (!seen.has(a)) {
        seen.add(a)
        order.push(a)
      }
    }
  }

  add(completed)
  add(active)
  add(pending)
  return order
}

export function ExecutionDAG({ runId, status }: ExecutionDAGProps) {
  const [hideFlow, setHideFlow] = useState(false)

  const isRunning = status === "Running"
  const isCompleted = status === "Completed"
  const isPending = runId === "pending"

  const { data: execStatus } = useQuery({
    queryKey: ["execution-status", runId],
    queryFn: () => getExecutionStatus(runId),
    enabled: !!runId && runId !== "pending" && isRunning,
    refetchInterval: isRunning ? 1000 : false,
  })

  // For completed runs, show all agents as completed
  // For pending runs, show all agents as pending
  const completed = isCompleted
    ? DEFAULT_AGENTS
    : isPending
      ? []
      : (execStatus?.completedAgents ?? [])
  const active = isCompleted || isPending ? [] : (execStatus?.activeAgents ?? [])
  const pending = isCompleted
    ? []
    : isPending
      ? DEFAULT_AGENTS
      : (execStatus?.pendingAgents ?? [])
  const steps = getOrderedSteps(completed, active, pending)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--accent-blue)] text-xl",
              isRunning && "step-icon-pulse",
              isCompleted && "bg-[var(--accent-green)]"
            )}
            aria-hidden
          >
            {isCompleted ? "✓" : "⚡"}
          </div>
          <h3 className="text-lg font-semibold">
            {isCompleted ? "Execution Complete" : "Execution Flow"}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setHideFlow((v) => !v)}
          className="retro-card-outline rounded-[var(--border-radius-input)] border-[var(--border-width)] border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold hover:bg-[var(--accent-purple)]"
        >
          {hideFlow ? "Show flow" : "Hide flow"}
        </button>
      </div>

      {!hideFlow && (
        <div
          className={cn(
            "space-y-4 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--background)] p-6 retro-card-outline"
          )}
        >
          {isPending ? (
            <div className="flex items-center gap-4 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--accent-yellow)] p-4 retro-card-outline">
              <div className="size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-transparent" />
              <div>
                <div className="font-semibold">Starting run…</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Connecting to agent pipeline…
                </div>
              </div>
            </div>
          ) : steps.length > 0 ? (
            steps.map((agentName, i) => {
              const stepStatus = active.includes(agentName)
                ? "active"
                : completed.includes(agentName)
                  ? "complete"
                  : "pending"
              const statusText =
                stepStatus === "active"
                  ? "Processing…"
                  : stepStatus === "complete"
                    ? "Complete!"
                    : "Waiting…"
              return (
                <div key={agentName} className="pt-4 first:pt-0">
                  <AgentStep
                    agentName={agentName}
                    status={stepStatus}
                    statusText={statusText}
                    isLast={i === steps.length - 1}
                  />
                </div>
              )
            })
          ) : (
            <div className="flex items-center gap-4 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[#f0f0f0] p-4 retro-card-outline">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[#f0f0f0] text-xl">
                🎯
              </div>
              <div>
                <div className="font-semibold">Initializing</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Setting up agent context…
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
