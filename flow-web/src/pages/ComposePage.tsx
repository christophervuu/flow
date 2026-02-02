import { useState, useEffect } from "react"
import { FormEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createRun, getRun, getDesign, submitAnswers } from "@/lib/api"
import { buildPrompt, type StructuredContext } from "@/lib/promptBuilder"
import { addRecentRun } from "@/lib/storage"
import { useTheme } from "@/contexts/ThemeContext"
import { useRun } from "@/contexts/RunContext"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ContextAccordion } from "@/components/ContextAccordion"
import { ExecutionDAG } from "@/components/ExecutionDAG"
import { QuestionSection } from "@/components/QuestionSection"
import { MarkdownViewer } from "@/components/MarkdownViewer"
import { cn } from "@/lib/utils"

const emptyContext: StructuredContext = {}

const SYNTH_SPECIALIST_OPTIONS: { key: string; label: string }[] = [
  { key: "architecture", label: "Architecture" },
  { key: "contracts", label: "Contracts" },
  { key: "requirements", label: "Requirements" },
  { key: "ops", label: "Ops" },
  { key: "security", label: "Security" },
]

export function ComposePage() {
  const { theme } = useTheme()
  const { runId, setRunId } = useRun()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState<StructuredContext>(emptyContext)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [synthSpecialists, setSynthSpecialists] = useState<string[]>([])
  const [allowAssumptions, setAllowAssumptions] = useState(false)
  const [initialDesignMarkdown, setInitialDesignMarkdown] = useState<string | null>(null)
  const [submittedPrompt, setSubmittedPrompt] = useState("")
  const [submittedTitle, setSubmittedTitle] = useState("")

  // Non-blocking run creation mutation
  const createRunMutation = useMutation({
    mutationFn: (params: {
      title: string
      prompt: string
      context?: { links?: string[]; notes?: string }
      synthSpecialists?: string[] | null
      allowAssumptions?: boolean
    }) => createRun(params),
    onSuccess: (envelope) => {
      addRecentRun(envelope.runId, submittedTitle)
      setRunId(envelope.runId)
      if (envelope.designDocMarkdown) {
        setInitialDesignMarkdown(envelope.designDocMarkdown)
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start run")
      setRunId(null) // Go back to form
    },
  })

  const isPending = runId === "pending"

  const { data: meta, isLoading, error, refetch } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId && runId !== "pending",
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "Running" || status === "AwaitingClarifications"
        ? 1500
        : false
    },
  })

  const { data: designMarkdown } = useQuery({
    queryKey: ["design", runId],
    queryFn: () => getDesign(runId!),
    enabled: !!runId && meta?.status === "Completed" && !initialDesignMarkdown,
  })

  const submitAnswersMutation = useMutation({
    mutationFn: (payload: {
      answers: Record<string, string>
      synthSpecialists?: string[] | null
      allowAssumptions?: boolean
    }) =>
      submitAnswers(runId!, {
        answers: payload.answers,
        ...(payload.synthSpecialists != null ? { synthSpecialists: payload.synthSpecialists } : {}),
        ...(payload.allowAssumptions != null ? { allowAssumptions: payload.allowAssumptions } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] })
      toast.success("Answers submitted")
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to submit")
    },
  })

  useEffect(() => {
    if (meta?.status === "AwaitingClarifications") {
      const blocking = meta.blockingQuestions ?? []
      const nonBlocking = meta.nonBlockingQuestions ?? []
      const initial: Record<string, string> = {}
      for (const q of [...blocking, ...nonBlocking]) {
        initial[q.id] = ""
      }
      setAnswers((prev) => ({ ...initial, ...prev }))
    }
  }, [meta?.status, meta?.blockingQuestions, meta?.nonBlockingQuestions])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !prompt.trim()) {
      toast.error("Title and prompt are required")
      return
    }

    const finalPrompt = buildPrompt(prompt, context)
    const linksText = context.links?.trim() ?? ""
    const links = linksText
      ? linksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      : undefined
    const notes = context.notes?.trim() || undefined

    // Store submitted values for display in left column
    setSubmittedTitle(title.trim())
    setSubmittedPrompt(prompt.trim())

    // Transition immediately to two-column view
    setRunId("pending")

    // Fire API request in background
    createRunMutation.mutate({
      title: title.trim(),
      prompt: finalPrompt,
      ...(links?.length || notes ? { context: { links, notes } } : {}),
      ...(synthSpecialists.length > 0 ? { synthSpecialists } : {}),
      allowAssumptions,
    })
  }

  function handleStartNewRun() {
    setRunId(null)
    setInitialDesignMarkdown(null)
  }

  function handleClarificationsSubmit(e: FormEvent) {
    e.preventDefault()
    const blocking = meta?.blockingQuestions ?? []
    const nonBlocking = meta?.nonBlockingQuestions ?? []
    const missing = blocking.filter((q) => !answers[q.id]?.trim())
    if (missing.length) {
      toast.error("Please answer all blocking questions")
      return
    }
    const answersPayload: Record<string, string> = {}
    for (const q of [...blocking, ...nonBlocking]) {
      const val = answers[q.id]?.trim()
      if (val) answersPayload[q.id] = val
    }
    submitAnswersMutation.mutate({
      answers: answersPayload,
      synthSpecialists: synthSpecialists.length > 0 ? synthSpecialists : undefined,
      allowAssumptions,
    })
  }

  const status = meta?.status
  const content = (initialDesignMarkdown ?? designMarkdown ?? "").trim()

  if (!runId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div
          className={cn(
            "relative p-8 rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] retro-card-outline",
            "shadow-[var(--shadow-card)]"
          )}
        >
          {theme === "retro" && (
            <>
              <span className="card-doodle-star absolute -top-3 right-10 text-3xl">
                ✨
              </span>
              <span className="card-doodle-sparkle absolute -bottom-2 left-8 text-2xl">
                ⭐
              </span>
            </>
          )}

          <div className="flex items-center gap-3 mb-7">
            {theme === "retro" && (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--accent-green)] text-xl"
                aria-hidden
              >
                🎨
              </div>
            )}
            <h1 className="text-2xl font-semibold">New Design</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title" className="flex items-center gap-2">
                Title
                {theme === "retro" && (
                  <span className="rounded-full border-2 border-[var(--border)] bg-[var(--accent-peach)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                    Required
                  </span>
                )}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  theme === "retro" ? "Give your design a name..." : "Design title"
                }
                required
                disabled={createRunMutation.isPending}
                className="mt-1 bg-[var(--background)]"
              />
            </div>
            <div>
              <Label htmlFor="prompt" className="flex items-center gap-2">
                Prompt
                {theme === "retro" && (
                  <span className="rounded-full border-2 border-[var(--border)] bg-[var(--accent-peach)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                    Required
                  </span>
                )}
              </Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to design..."
                required
                disabled={createRunMutation.isPending}
                rows={5}
                className="mt-1 bg-[var(--background)]"
              />
            </div>

            <div>
              <ContextAccordion
                context={context}
                onChange={setContext}
                disabled={createRunMutation.isPending}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Specialist synthesizers</Label>
              <p className="text-xs text-muted-foreground">
                Optional: run specialist agents for specific design sections.
              </p>
              <div className="flex flex-wrap gap-4">
                {SYNTH_SPECIALIST_OPTIONS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={synthSpecialists.includes(key)}
                      onCheckedChange={(checked) => {
                        setSynthSpecialists((prev) =>
                          checked ? [...prev, key] : prev.filter((k) => k !== key)
                        )
                      }}
                      disabled={createRunMutation.isPending}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="allow-assumptions"
                checked={allowAssumptions}
                onCheckedChange={(checked) =>
                  setAllowAssumptions(checked === true)
                }
                disabled={createRunMutation.isPending}
              />
              <Label
                htmlFor="allow-assumptions"
                className="text-sm font-medium cursor-pointer"
              >
                Allow assumptions for unanswered questions
              </Label>
            </div>

            <Button
              type="submit"
              disabled={createRunMutation.isPending}
              className={cn(
                theme === "retro" &&
                  "bg-[var(--accent-yellow)] text-[var(--foreground)] hover:bg-[#ffef9f] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-button-hover)]"
              )}
            >
              {theme === "retro" ? "▶ Start run" : "Start run"}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Don't show the old loading spinner - we now show inline loading in the DAG
  // Only show loading if we have a real runId (not pending) and are still loading
  if (isLoading && !isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
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
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button onClick={handleStartNewRun}>Start new run</Button>
        </div>
      </div>
    )
  }

  // If we're pending or have meta, show the two-column layout
  if (!meta && !isPending) return null

  return (
    <div
      className={cn(
        "grid gap-6 transition-all duration-500",
        "grid-cols-1",
        "lg:grid-cols-[520px_1fr]"
      )}
    >
      {/* Left column: form summary */}
      <div
        className={cn(
          "rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)] retro-card-outline"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {theme === "retro" && (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--accent-green)] text-xl"
                aria-hidden
              >
                🎨
              </div>
            )}
            <h2 className="text-xl font-semibold">New Design</h2>
          </div>
          <Button
            variant="outline"
            onClick={handleStartNewRun}
            disabled={isPending}
            className={cn(
              theme === "retro" &&
                "border-2 border-[var(--border)] rounded-[var(--border-radius-button)]"
            )}
          >
            Start new run
          </Button>
        </div>
        <p className="font-semibold text-[var(--foreground)] mb-1">
          {isPending ? submittedTitle : title}
        </p>
        <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap line-clamp-6 mb-4">
          {isPending ? submittedPrompt : prompt}
        </p>
        <p className="font-mono text-xs text-[var(--muted-foreground)]">
          {isPending ? "Creating run…" : runId}
        </p>
      </div>

      {/* Right column: DAG + status-dependent content */}
      <div
        className={cn(
          "rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)] retro-card-outline"
        )}
      >
        {/* Always show ExecutionDAG at the top */}
        <ExecutionDAG
          runId={runId!}
          status={isPending ? "Running" : (status ?? "Running")}
          executionStatus={meta?.executionStatus ?? undefined}
        />

        {/* Status-dependent content below the DAG */}
        {(status === "Running" || isPending) && (
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
        )}

        {status === "AwaitingClarifications" && !isPending && (
          <div className="mt-6 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--card)] p-6 retro-card-outline">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--accent-blue)] text-xl"
                aria-hidden
              >
                ❓
              </div>
              <h3 className="text-xl font-semibold">Clarifications</h3>
            </div>
            <form onSubmit={handleClarificationsSubmit} className="space-y-6">
              <QuestionSection
                blocking={meta?.blockingQuestions ?? []}
                nonBlocking={meta?.nonBlockingQuestions ?? []}
                answers={answers}
                onChange={setAnswers}
                disabled={submitAnswersMutation.isPending}
              />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Specialist synthesizers</Label>
                <p className="text-xs text-muted-foreground">
                  Optional: run specialist agents for specific design sections.
                </p>
                <div className="flex flex-wrap gap-4">
                  {SYNTH_SPECIALIST_OPTIONS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={synthSpecialists.includes(key)}
                        onCheckedChange={(checked) => {
                          setSynthSpecialists((prev) =>
                            checked ? [...prev, key] : prev.filter((k) => k !== key)
                          )
                        }}
                        disabled={submitAnswersMutation.isPending}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-assumptions-clarify"
                  checked={allowAssumptions}
                  onCheckedChange={(checked) =>
                    setAllowAssumptions(checked === true)
                  }
                  disabled={submitAnswersMutation.isPending}
                />
                <Label
                  htmlFor="allow-assumptions-clarify"
                  className="text-sm font-medium cursor-pointer"
                >
                  Allow assumptions for unanswered questions
                </Label>
              </div>
              <Button
                type="submit"
                disabled={submitAnswersMutation.isPending}
                className={cn(
                  theme === "retro" &&
                    "bg-[var(--accent-yellow)] text-[var(--foreground)] hover:bg-[#ffef9f]"
                )}
              >
                {submitAnswersMutation.isPending ? "Submitting…" : "Submit answers"}
              </Button>
            </form>
          </div>
        )}

        {status === "Completed" && !isPending && (
          <div className="mt-6 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--card)] p-6 retro-card-outline">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-dashed border-[var(--muted)]">
              {theme === "retro" && (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-[var(--accent-green)] text-lg"
                  aria-hidden
                >
                  📝
                </div>
              )}
              <h3 className="font-semibold">Agent Response</h3>
            </div>
            {content ? (
              <div className="max-h-[70vh] overflow-auto">
                <MarkdownViewer content={content} />
              </div>
            ) : (
              <p className="italic text-[var(--muted-foreground)]">
                Loading design doc…
              </p>
            )}
          </div>
        )}

        {status && !isPending && !["Running", "AwaitingClarifications", "Completed"].includes(status) && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Unknown status: {status}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
