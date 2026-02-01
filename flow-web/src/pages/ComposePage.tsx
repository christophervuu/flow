import { useState, FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { createRun } from "@/lib/api"
import { buildPrompt, type StructuredContext } from "@/lib/promptBuilder"
import { addRecentRun } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ContextAccordion } from "@/components/ContextAccordion"

const emptyContext: StructuredContext = {}

export function ComposePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState<StructuredContext>(emptyContext)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !prompt.trim()) {
      toast.error("Title and prompt are required")
      return
    }
    setSubmitting(true)
    try {
      const finalPrompt = buildPrompt(prompt, context)
      const linksText = context.links?.trim() ?? ""
      const links = linksText
        ? linksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        : undefined
      const notes = context.notes?.trim() || undefined

      const envelope = await createRun({
        title: title.trim(),
        prompt: finalPrompt,
        ...(links?.length || notes ? { context: { links, notes } } : {}),
      })

      addRecentRun(envelope.runId, title.trim())
      toast.success("Run started")
      navigate(`/runs/${envelope.runId}`, {
        state: envelope.status === "Completed" ? { designDocMarkdown: envelope.designDocMarkdown } : undefined,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start run")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">New Design</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Design title"
            required
            disabled={submitting}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to design..."
            required
            disabled={submitting}
            rows={5}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="mb-2 block">Optional context (collapsible)</Label>
          <ContextAccordion
            context={context}
            onChange={setContext}
            disabled={submitting}
          />
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Starting…" : "Start run"}
        </Button>
      </form>
    </div>
  )
}
