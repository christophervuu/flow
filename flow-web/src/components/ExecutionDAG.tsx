import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getExecutionStatus } from "@/lib/api"
import { AgentStep } from "./AgentStep"
import { cn } from "@/lib/utils"
import type { ExecutionStatusDto } from "@/types"

interface ExecutionDAGProps {
  runId: string
  status: string
  executionStatus?: ExecutionStatusDto | null
}

const DEFAULT_AGENTS = [
  "Clarifier",
  "Synthesizer",
  "Challenger",
  "Optimizer",
  "Publisher",
]

/** Build fixed stage columns for DAG: Clarifier | Synth group | Merger | Challenger group | Optimizer | Publisher */
function buildStageColumns(
  completed: string[],
  active: string[],
  pending: string[]
): string[][] {
  const seen = new Set<string>()
  const order: string[] = []
  const add = (list: string[]) => {
    for (const a of list) {
      if (!seen.has(a)) {
        seen.add(a)
        order.push(a)
      }
    }
  }
  add(completed)
  add(active)
  add(pending)

  const col0: string[] = []
  const col1: string[] = []
  const col2: string[] = []
  const col3: string[] = []
  const col4: string[] = []
  const col5: string[] = []

  for (const a of order) {
    if (a === "Clarifier") col0.push(a)
    else if (
      a === "Synthesizer" ||
      a.startsWith("Synth_") ||
      a === "DesignJudge" ||
      a === "ConsistencyChecker" ||
      a.startsWith("Synthesizer_")
    )
      col1.push(a)
    else if (a === "Merger") col2.push(a)
    else if (
      a === "Challenger" ||
      a.startsWith("Challenger_") ||
      a === "CritiqueJudge"
    )
      col3.push(a)
    else if (a === "Optimizer") col4.push(a)
    else if (a === "Publisher") col5.push(a)
  }

  if (col0.length === 0) col0.push("Clarifier")
  if (col1.length === 0) col1.push("Synthesizer")
  if (col3.length === 0) col3.push("Challenger")
  if (col4.length === 0) col4.push("Optimizer")
  if (col5.length === 0) col5.push("Publisher")
  const hasSpecialists = col1.some((a) => a.startsWith("Synth_"))
  if (hasSpecialists && col2.length === 0) col2.push("Merger")

  return [col0, col1, col2, col3, col4, col5]
}

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

export function ExecutionDAG({ runId, status, executionStatus: executionStatusProp }: ExecutionDAGProps) {
  const [hideFlow, setHideFlow] = useState(false)

  const isRunning = status === "Running"
  const isCompleted = status === "Completed"
  const isFailed = status === "Failed"
  const isPending = runId === "pending"
  const shouldPoll =
    status === "Running" || status === "AwaitingClarifications"

  const { data: execStatus, isLoading: execStatusLoading } = useQuery({
    queryKey: ["execution-status", runId],
    queryFn: () => getExecutionStatus(runId),
    enabled: !!runId && runId !== "pending" && shouldPoll,
    refetchInterval: shouldPoll ? 1000 : false,
  })

  // Use prop when completed so parent can pass meta.executionStatus; otherwise use fetched execStatus
  const resolvedStatus = isCompleted && executionStatusProp ? executionStatusProp : execStatus

  // For completed runs, use actual execution status when provided; else fallback to DEFAULT_AGENTS
  // For pending runs, show all agents as pending
  const completed = isCompleted
    ? (resolvedStatus?.completedAgents?.length ? resolvedStatus.completedAgents : DEFAULT_AGENTS)
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
  const stageColumns = useMemo(
    () => buildStageColumns(completed, active, pending),
    [completed, active, pending]
  )
  const nonEmptyColumns = stageColumns.filter((col) => col.length > 0)

  const showExecutionStatusLoading = isRunning && !isPending && execStatusLoading

  const getStepStatus = (agentName: string) =>
    active.includes(agentName) ? "active" : completed.includes(agentName) ? "complete" : "pending"
  const getStatusText = (agentName: string) => {
    const s = getStepStatus(agentName)
    return s === "active" ? "Processing…" : s === "complete" ? "Complete!" : "Waiting…"
  }

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
          ) : isFailed ? (
            <div className="flex items-center gap-4 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--destructive)]/10 p-4 retro-card-outline">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] text-xl">
                ✕
              </div>
              <div>
                <div className="font-semibold">Run failed</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  The pipeline encountered an error. Start a new run to try again.
                </div>
              </div>
            </div>
          ) : showExecutionStatusLoading ? (
            <div className="flex items-center gap-4 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--background)] p-4 retro-card-outline">
              <div className="size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-transparent" />
              <div>
                <div className="font-semibold">Loading execution status…</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Fetching pipeline progress…
                </div>
              </div>
            </div>
          ) : nonEmptyColumns.length > 0 ? (
            <div className="flex flex-wrap items-start gap-2">
              {nonEmptyColumns.map((col, colIndex) => (
                <div key={colIndex} className="flex items-center gap-2">
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {col.map((agentName) => (
                      <AgentStep
                        key={agentName}
                        agentName={agentName}
                        status={getStepStatus(agentName)}
                        statusText={getStatusText(agentName)}
                        isLast={true}
                      />
                    ))}
                  </div>
                  {colIndex < nonEmptyColumns.length - 1 && (
                    <div
                      className="self-center shrink-0 text-[var(--muted-foreground)] px-1"
                      aria-hidden
                    >
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : steps.length > 0 ? (
            steps.map((agentName, i) => {
              const stepStatus = getStepStatus(agentName)
              return (
                <div key={agentName} className="pt-4 first:pt-0">
                  <AgentStep
                    agentName={agentName}
                    status={stepStatus}
                    statusText={getStatusText(agentName)}
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
