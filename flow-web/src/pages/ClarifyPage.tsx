import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { submitAnswers } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { QuestionSection } from "@/components/QuestionSection"
import type { RunEnvelope } from "@/types"

interface ClarifyPageProps {
  runId: string
  run: RunEnvelope
}

export function ClarifyPage({ runId, run }: ClarifyPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (answers: Record<string, string>) =>
      submitAnswers(runId, { answers }),
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
    const payload: Record<string, string> = {}
    for (const q of [...blocking, ...nonBlocking]) {
      const val = answers[q.id]?.trim()
      if (val) payload[q.id] = val
    }
    mutation.mutate(payload)
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
