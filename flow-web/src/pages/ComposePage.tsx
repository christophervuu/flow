import { useState, useEffect, useMemo, useRef } from "react"
import { FormEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createRun, getRun, getDesign, submitAnswers } from "@/lib/api"
import { buildPrompt, appendAttachmentsToPrompt, type StructuredContext } from "@/lib/promptBuilder"
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
import {
  AgentResponseMessage,
  type AgentResponseMessageItem,
} from "@/components/AgentResponseMessage"
import { cn } from "@/lib/utils"
import {
  SECTION_OPTIONS,
  DEFAULT_MINIMAL_SECTIONS,
  ALL_SECTION_IDS,
} from "@/lib/sections"

const emptyContext: StructuredContext = {}

export function ComposePage() {
  const { theme } = useTheme()
  const { runId, setRunId } = useRun()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState<StructuredContext>(emptyContext)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [includedSections, setIncludedSections] = useState<string[]>(() => [
    ...DEFAULT_MINIMAL_SECTIONS,
  ])
  const [allowAssumptions, setAllowAssumptions] = useState(false)
  const [initialDesignMarkdown, setInitialDesignMarkdown] = useState<string | null>(null)
  const [submittedPrompt, setSubmittedPrompt] = useState("")
  const [submittedTitle, setSubmittedTitle] = useState("")
  const [createRunError, setCreateRunError] = useState<string | null>(null)
  const [submitAnswersError, setSubmitAnswersError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; content: string }>
  >([])
  const [pendingPaste, setPendingPaste] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Non-blocking run creation mutation
  const createRunMutation = useMutation({
    mutationFn: (params: {
      title: string
      prompt: string
      context?: { links?: string[]; notes?: string }
      includedSections?: string[] | null
      allowAssumptions?: boolean
    }) => createRun(params),
    onSuccess: (envelope) => {
      setCreateRunError(null)
      addRecentRun(envelope.runId, submittedTitle)
      setRunId(envelope.runId)
      if (envelope.designDocMarkdown) {
        setInitialDesignMarkdown(envelope.designDocMarkdown)
      }
    },
    onError: (err) => {
      setCreateRunError(err instanceof Error ? err.message : "Failed to start run")
      setRunId(null)
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
      allowAssumptions?: boolean
    }) =>
      submitAnswers(runId!, {
        answers: payload.answers,
        ...(payload.allowAssumptions != null ? { allowAssumptions: payload.allowAssumptions } : {}),
      }),
    onMutate: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] })
    },
    onSuccess: () => {
      setSubmitAnswersError(null)
      queryClient.invalidateQueries({ queryKey: ["run", runId] })
      toast.success("Answers submitted")
    },
    onError: (err) => {
      setSubmitAnswersError(err instanceof Error ? err.message : "Failed to submit")
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

    const basePrompt = buildPrompt(prompt, context)
    const finalPrompt = appendAttachmentsToPrompt(basePrompt, attachments.map((a) => ({ name: a.name, content: a.content })))
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
      includedSections: includedSections.length > 0 ? includedSections : null,
      allowAssumptions,
    })
  }

  function handleStartNewRun() {
    setRunId(null)
    setInitialDesignMarkdown(null)
    setCreateRunError(null)
    setSubmitAnswersError(null)
  }

  function addAttachment(name: string, content: string) {
    setAttachments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, content },
    ])
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    for (const file of Array.from(files)) {
      try {
        const text = await file.text()
        const name = file.name || `attachment-${Date.now()}.txt`
        addAttachment(name, text)
      } catch {
        toast.error(`Could not read ${file.name}`)
      }
    }
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files?.length) return
    for (const file of Array.from(files)) {
      file.text().then(
        (text) => addAttachment(file.name || `attachment-${Date.now()}.txt`, text),
        () => toast.error(`Could not read ${file.name}`)
      )
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  function handlePromptPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text/plain")
    if (!text?.trim()) return
    e.preventDefault()
    setPendingPaste(text)
  }

  function applyPasteAsAttachment() {
    if (!pendingPaste) return
    const name =
      attachments.some((a) => a.name === "pasted.md")
        ? `pasted-${Date.now()}.md`
        : "pasted.md"
    addAttachment(name, pendingPaste)
    setPendingPaste(null)
  }

  function applyPasteIntoPrompt() {
    if (!pendingPaste || !promptTextareaRef.current) return
    const ta = promptTextareaRef.current
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = prompt.slice(0, start)
    const after = prompt.slice(end)
    setPrompt(before + pendingPaste + after)
    setPendingPaste(null)
    requestAnimationFrame(() => {
      const newPos = start + pendingPaste.length
      ta.setSelectionRange(newPos, newPos)
      ta.focus()
    })
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
      allowAssumptions,
    })
  }

  const status = meta?.status
  const content = (initialDesignMarkdown ?? designMarkdown ?? "").trim()

  const agentMessages = useMemo((): AgentResponseMessageItem[] => {
    if (isPending) {
      const messages: AgentResponseMessageItem[] = [
        { id: "creating", type: "waiting", content: "Creating run…" },
      ]
      if (createRunError) {
        messages.push({
          id: "create-error",
          type: "error",
          content: createRunError,
        })
      }
      return messages
    }
    if (isLoading) {
      return [{ id: "loading-run", type: "waiting", content: "Loading run…" }]
    }
    if (error) {
      return [
        {
          id: "run-error",
          type: "error",
          content: error instanceof Error ? error.message : "Failed to load run",
        },
      ]
    }
    if (!meta) return []

    if (status === "Running") {
      return [
        {
          id: "waiting-exec",
          type: "waiting",
          content: "Waiting for execution to complete…",
        },
      ]
    }
    if (status === "AwaitingClarifications") {
      const list: AgentResponseMessageItem[] = [
        {
          id: "clarifications",
          type: "waiting",
          content: "Clarifier has requested some clarifications.",
        },
      ]
      if (submitAnswersError) {
        list.push({
          id: "submit-error",
          type: "error",
          content: submitAnswersError,
        })
      }
      return list
    }
    if (status === "Completed") {
      if (content) {
        return [
          {
            id: "publisher",
            type: "agent",
            content,
            agentName: "Publisher",
          },
        ]
      }
      return [
        {
          id: "loading-design",
          type: "waiting",
          content: "Loading design doc…",
        },
      ]
    }
    if (status === "Failed") {
      return [
        {
          id: "run-failed",
          type: "error",
          content: "The pipeline failed. You can start a new run.",
        },
      ]
    }
    return [
      {
        id: "unknown-status",
        type: "waiting",
        content: `Unknown status: ${status}. Try refreshing.`,
      },
    ]
  }, [
    isPending,
    createRunError,
    isLoading,
    error,
    meta,
    status,
    content,
    submitAnswersError,
  ])

  if (!runId) {
    return (
      <div
        className={cn(
          "grid gap-6 min-h-[calc(100vh-12rem)]",
          "grid-cols-1 lg:grid-cols-[320px_1fr]"
        )}
      >
        {/* Left column: Include Sections */}
        <div className="flex flex-col min-h-0">
          <div
            className={cn(
              "relative flex flex-col flex-1 min-h-0 p-6 rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] retro-card-outline",
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
            <h2 className="text-xl font-semibold mb-1">Include sections</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Choose which sections to include in the final design doc. Excluded
              sections are omitted entirely.
            </p>
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIncludedSections([...DEFAULT_MINIMAL_SECTIONS])}
                disabled={createRunMutation.isPending}
                className={cn(
                  theme === "retro" &&
                    "border-2 border-[var(--border)] rounded-[var(--border-radius-button)]"
                )}
              >
                Select default
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIncludedSections([...ALL_SECTION_IDS])}
                disabled={createRunMutation.isPending}
                className={cn(
                  theme === "retro" &&
                    "border-2 border-[var(--border)] rounded-[var(--border-radius-button)]"
                )}
              >
                Select all
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 overflow-auto min-h-0">
              {SECTION_OPTIONS.map(({ id, label }) => (
                <label
                  key={id}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={includedSections.includes(id)}
                    onCheckedChange={(checked) => {
                      setIncludedSections((prev) =>
                        checked ? [...prev, id] : prev.filter((k) => k !== id)
                      )
                    }}
                    disabled={createRunMutation.isPending}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: New Design form */}
        <div className="flex flex-col min-h-0">
          <div
            className={cn(
              "relative flex flex-col flex-1 min-h-0 p-8 rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] retro-card-outline",
              "shadow-[var(--shadow-card)]"
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
              <h1 className="text-2xl font-semibold">New Design</h1>
            </div>

            {createRunError && (
              <div className="mb-6 rounded-[var(--border-radius-card)] border-2 border-[var(--destructive)] bg-[var(--destructive)]/10 p-4 text-sm">
                <p className="font-semibold text-[var(--destructive)]">Could not start run</p>
                <p className="mt-1 text-[var(--muted-foreground)]">{createRunError}</p>
                <p className="mt-2 text-[var(--muted-foreground)]">Fix the issue and try again, or start a new run.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-6">
              <div>
                <Label htmlFor="title" className="flex items-center gap-2 font-bold">
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
                <Label htmlFor="prompt" className="flex items-center gap-2 font-bold">
                  Prompt
                  {theme === "retro" && (
                    <span className="rounded-full border-2 border-[var(--border)] bg-[var(--accent-peach)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                      Required
                    </span>
                  )}
                </Label>
                <Textarea
                  ref={promptTextareaRef}
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onPaste={handlePromptPaste}
                  placeholder="Describe what you want to design..."
                  required
                  disabled={createRunMutation.isPending}
                  rows={5}
                  className="mt-1 bg-[var(--background)]"
                />
                {pendingPaste !== null && (
                  <div
                    className="mt-2 flex flex-wrap items-center gap-2 rounded-[var(--border-radius-input)] border-2 border-[var(--border)] bg-[var(--muted)]/50 p-3 text-sm"
                    role="alert"
                  >
                    <span className="text-muted-foreground">
                      Pasted content detected.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyPasteAsAttachment}
                      className={cn(
                        theme === "retro" &&
                          "border-2 border-[var(--border)] rounded-[var(--border-radius-button)]"
                      )}
                    >
                      Add as markdown attachment
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyPasteIntoPrompt}
                      className={cn(
                        theme === "retro" &&
                          "border-2 border-[var(--border)] rounded-[var(--border-radius-button)]"
                      )}
                    >
                      Keep in prompt
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingPaste(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  <Label className="text-sm font-medium">Attachments</Label>
                  {attachments.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/50 px-2 py-1 text-sm"
                        >
                          <span className="truncate max-w-[180px]" title={a.name}>
                            {a.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeAttachment(a.id)}
                            disabled={createRunMutation.isPending}
                            aria-label={`Remove ${a.name}`}
                          >
                            ×
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-[var(--border-radius-input)] border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-3 min-h-[52px]",
                      "hover:border-[var(--ring)] hover:bg-[var(--muted)]/50 transition-colors"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".txt,.md,.json,.yml,.yaml,.csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={createRunMutation.isPending}
                      className={cn(
                        theme === "retro" &&
                          "border-2 border-[var(--border)] rounded-[var(--border-radius-button)]"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Add file
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      or drag and drop text files here
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <ContextAccordion
                  context={context}
                  onChange={setContext}
                  disabled={createRunMutation.isPending}
                />
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
      </div>
    )
  }

  // Two-column layout whenever runId is set (including "pending")
  return (
    <div
      className={cn(
        "grid gap-6 transition-all duration-500 min-h-[calc(100vh-12rem)]",
        "grid-cols-1",
        "lg:grid-cols-[520px_1fr]"
      )}
    >
      {/* Left column: collapsed New Design + Execution Flow */}
      <div className="flex flex-col gap-6">
        <div
          className={cn(
            "rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] retro-card-outline"
          )}
        >
          <div className="flex items-center justify-between mb-4">
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
          <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap line-clamp-3 mb-4">
            {isPending ? submittedPrompt : prompt}
          </p>
          <p className="font-mono text-xs text-[var(--muted-foreground)]">
            {isPending ? "Creating run…" : runId}
          </p>
        </div>

        <div
          className={cn(
            "rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] retro-card-outline"
          )}
        >
          <ExecutionDAG
            runId={runId!}
            status={isPending ? "Running" : (status ?? "Running")}
            executionStatus={meta?.executionStatus ?? undefined}
          />
        </div>
      </div>

      {/* Right column: Agent Response (chat messages) */}
      <div
        className={cn(
          "flex flex-col min-h-0 rounded-[var(--border-radius-card)] border-[var(--border-width)] border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)] retro-card-outline flex-1"
        )}
      >
        <div className="flex flex-col flex-1 min-h-0 rounded-[var(--border-radius-card)] border-2 border-[var(--border)] bg-[var(--card)] p-6 retro-card-outline">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-dashed border-[var(--muted)]">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-[var(--accent-green)] text-lg"
              aria-hidden
            >
              📝
            </div>
            <h4 className="font-semibold">Agent Response</h4>
          </div>
          <div className="flex-1 min-h-0 overflow-auto space-y-4">
            {agentMessages.map((msg) => (
              <AgentResponseMessage
                key={msg.id}
                message={msg}
                onRetry={
                  msg.id === "run-error" ? () => refetch() : undefined
                }
              />
            ))}
          </div>

          {status === "AwaitingClarifications" && !isPending && meta && (
            <div className="mt-6 pt-6 border-t-2 border-dashed border-[var(--muted)]">
              <div className="flex items-center gap-3 mb-4">
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
                  blocking={meta.blockingQuestions ?? []}
                  nonBlocking={meta.nonBlockingQuestions ?? []}
                  answers={answers}
                  onChange={(newAnswers) => {
                    setAnswers(newAnswers)
                    setSubmitAnswersError(null)
                  }}
                  disabled={submitAnswersMutation.isPending}
                />
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
        </div>
      </div>
    </div>
  )
}
