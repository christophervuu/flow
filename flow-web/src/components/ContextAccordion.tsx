import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { StructuredContext } from "@/lib/promptBuilder"

const DATA_CLASS_OPTIONS = ["PII", "PHI", "Secrets", "None", "Other"] as const

interface ContextAccordionProps {
  context: StructuredContext
  onChange: (context: StructuredContext) => void
  disabled?: boolean
}

export function ContextAccordion({
  context,
  onChange,
  disabled = false,
}: ContextAccordionProps) {
  const [expanded, setExpanded] = useState(false)

  const update = <K extends keyof StructuredContext>(
    key: K,
    value: StructuredContext[K]
  ) => onChange({ ...context, [key]: value })

  const toggleDataClass = (opt: string) => {
    const current = context.dataClassification ?? []
    const next = current.includes(opt)
      ? current.filter((x) => x !== opt)
      : [...current, opt]
    update("dataClassification", next.length ? next : undefined)
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 rounded-[var(--border-radius-input)]",
          "border-[var(--border-width)] border-[var(--border)]",
          "bg-[var(--accent-purple)] font-semibold text-[var(--foreground)]",
          "transition-colors hover:bg-[#c4b5f0]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <span
          className={cn("text-sm transition-transform", expanded && "rotate-90")}
          aria-hidden
        >
          ▶
        </span>
        Optional Configuration
      </button>

      {expanded && (
        <div className="space-y-6 border-t-2 border-dashed border-[var(--muted)] pt-6">
          <div>
            <Label htmlFor="goals">Goals & Non-goals</Label>
            <div className="mt-2 space-y-2">
              <Textarea
                id="goals"
                placeholder="Goals: one per line"
                value={context.goals ?? ""}
                onChange={(e) => update("goals", e.target.value || undefined)}
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
              <Textarea
                id="nonGoals"
                placeholder="Non-goals: what we explicitly won't do"
                value={context.nonGoals ?? ""}
                onChange={(e) => update("nonGoals", e.target.value || undefined)}
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Requirements</Label>
            <div className="mt-2 space-y-2">
              <Textarea
                id="functionalReqs"
                placeholder="Functional requirements"
                value={context.functionalReqs ?? ""}
                onChange={(e) =>
                  update("functionalReqs", e.target.value || undefined)
                }
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
              <Textarea
                id="nonFunctionalReqs"
                placeholder="Non-functional requirements"
                value={context.nonFunctionalReqs ?? ""}
                onChange={(e) =>
                  update("nonFunctionalReqs", e.target.value || undefined)
                }
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
              <Textarea
                id="successMetrics"
                placeholder="Success metrics"
                value={context.successMetrics ?? ""}
                onChange={(e) =>
                  update("successMetrics", e.target.value || undefined)
                }
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Constraints & Assumptions</Label>
            <div className="mt-2 space-y-2">
              <Textarea
                id="constraints"
                placeholder="Constraints"
                value={context.constraints ?? ""}
                onChange={(e) => update("constraints", e.target.value || undefined)}
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
              <Textarea
                id="assumptions"
                placeholder="Assumptions"
                value={context.assumptions ?? ""}
                onChange={(e) => update("assumptions", e.target.value || undefined)}
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="currentSystem">Current System / Architecture</Label>
            <Textarea
              id="currentSystem"
              placeholder="Existing architecture, dependencies, tech stack"
              value={context.currentSystem ?? ""}
              onChange={(e) =>
                update("currentSystem", e.target.value || undefined)
              }
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Data & Security</Label>
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-4">
                {DATA_CLASS_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={(context.dataClassification ?? []).includes(opt)}
                      onCheckedChange={() => toggleDataClass(opt)}
                      disabled={disabled}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              <Textarea
                id="authExpectations"
                placeholder="AuthN / AuthZ expectations"
                value={context.authExpectations ?? ""}
                onChange={(e) =>
                  update("authExpectations", e.target.value || undefined)
                }
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
              <Textarea
                id="securityNotes"
                placeholder="Security notes"
                value={context.securityNotes ?? ""}
                onChange={(e) =>
                  update("securityNotes", e.target.value || undefined)
                }
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Operations (Observability / Rollout / Testing)</Label>
            <div className="mt-2 space-y-2">
              <Textarea
                id="observability"
                placeholder="Observability expectations"
                value={context.observability ?? ""}
                onChange={(e) =>
                  update("observability", e.target.value || undefined)
                }
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
              <Textarea
                id="rollout"
                placeholder="Rollout preferences"
                value={context.rollout ?? ""}
                onChange={(e) => update("rollout", e.target.value || undefined)}
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
              <Textarea
                id="testExpectations"
                placeholder="Test expectations"
                value={context.testExpectations ?? ""}
                onChange={(e) =>
                  update("testExpectations", e.target.value || undefined)
                }
                disabled={disabled}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="openQuestions">Open Questions</Label>
            <Textarea
              id="openQuestions"
              placeholder="Unresolved questions for the design"
              value={context.openQuestions ?? ""}
              onChange={(e) =>
                update("openQuestions", e.target.value || undefined)
              }
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Links & Attachments</Label>
            <div className="mt-2 space-y-2">
              <Textarea
                id="links"
                placeholder="Links (one per line)"
                value={context.links ?? ""}
                onChange={(e) => update("links", e.target.value || undefined)}
                disabled={disabled}
                rows={2}
                className="mt-1 font-mono text-sm"
              />
              <Textarea
                id="notes"
                placeholder="Notes / Paste anything"
                value={context.notes ?? ""}
                onChange={(e) => update("notes", e.target.value || undefined)}
                disabled={disabled}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
