import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { submitAnswers } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { QuestionSection } from "@/components/QuestionSection"
import type { RunEnvelope } from "@/types"

const SYNTH_SPECIALIST_OPTIONS: { key: string; label: string }[] = [
  { key: "architecture", label: "Architecture" },
  { key: "contracts", label: "Contracts" },
  { key: "requirements", label: "Requirements" },
  { key: "ops", label: "Ops" },
  { key: "security", label: "Security" },
]

interface ClarifyPageProps {
  runId: string
  run: RunEnvelope
}

export function ClarifyPage({ runId, run }: ClarifyPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (payload: {
      answers: Record<string, string>
      synthSpecialists?: string[] | null
      allowAssumptions?: boolean
    }) =>
      submitAnswers(runId, {
        answers: payload.answers,
        ...(payload.synthSpecialists != null ? { synthSpecialists: payload.synthSpecialists } : {}),
        ...(payload.allowAssumptions != null ? { allowAssumptions: payload.allowAssumptions } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] })
      toast.success("Answers submitted")
      navigate(`/runs/${runId}`, { replace: true })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to submit")
    },
  })

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [synthSpecialists, setSynthSpecialists] = useState<string[]>([])
  const [allowAssumptions, setAllowAssumptions] = useState(false)
  const blocking = run.blockingQuestions ?? []
  const nonBlocking = run.nonBlockingQuestions ?? []

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const q of [...blocking, ...nonBlocking]) {
      initial[q.id] = ""
    }
    setAnswers((prev) => ({ ...initial, ...prev }))
  }, [blocking, nonBlocking])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
    mutation.mutate({
      answers: answersPayload,
      synthSpecialists: synthSpecialists.length > 0 ? synthSpecialists : undefined,
      allowAssumptions,
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Clarifications</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Run ID: <code className="font-mono">{runId}</code>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <QuestionSection
          blocking={blocking}
          nonBlocking={nonBlocking}
          answers={answers}
          onChange={setAnswers}
          disabled={mutation.isPending}
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
                  disabled={mutation.isPending}
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
            disabled={mutation.isPending}
          />
          <Label
            htmlFor="allow-assumptions"
            className="text-sm font-medium cursor-pointer"
          >
            Allow assumptions for unanswered questions
          </Label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting…" : "Submit answers"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/")}
          >
            Start new run
          </Button>
        </div>
      </form>
    </div>
  )
}
