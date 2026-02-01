import type { QuestionDto } from "@/types"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface QuestionSectionProps {
  blocking: QuestionDto[]
  nonBlocking: QuestionDto[]
  answers: Record<string, string>
  onChange: (answers: Record<string, string>) => void
  disabled?: boolean
}

export function QuestionSection({
  blocking,
  nonBlocking,
  answers,
  onChange,
  disabled = false,
}: QuestionSectionProps) {
  const updateAnswer = (id: string, text: string) => {
    onChange({ ...answers, [id]: text })
  }

  const renderQuestion = (q: QuestionDto, required: boolean) => (
    <div key={q.id} className="space-y-2">
      <Label htmlFor={`q-${q.id}`} className="text-base">
        <span className="font-medium">{q.text}</span>
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={`q-${q.id}`}
        value={answers[q.id] ?? ""}
        onChange={(e) => updateAnswer(q.id, e.target.value)}
        required={required}
        disabled={disabled}
        rows={3}
        placeholder="Your answer..."
        className="resize-y"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {blocking.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Blocking questions (required)</h2>
          <div className="space-y-4">{blocking.map((q) => renderQuestion(q, true))}</div>
        </section>
      )}

      {nonBlocking.length > 0 && (
        <section>
          <Accordion type="single" collapsible defaultValue="">
            <AccordionItem value="non-blocking">
              <AccordionTrigger>
                Non-blocking questions ({nonBlocking.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {nonBlocking.map((q) => renderQuestion(q, false))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      )}
    </div>
  )
}
