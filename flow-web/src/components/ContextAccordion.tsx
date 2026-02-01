import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
    <Accordion type="multiple" className="w-full" defaultValue={[]}>
      <AccordionItem value="goals">
        <AccordionTrigger>Goals & Non-goals</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div>
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              placeholder="One per line, bullet-friendly"
              value={context.goals ?? ""}
              onChange={(e) => update("goals", e.target.value || undefined)}
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="nonGoals">Non-goals</Label>
            <Textarea
              id="nonGoals"
              placeholder="What we explicitly won't do"
              value={context.nonGoals ?? ""}
              onChange={(e) => update("nonGoals", e.target.value || undefined)}
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="requirements">
        <AccordionTrigger>Requirements</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div>
            <Label htmlFor="functionalReqs">Functional requirements</Label>
            <Textarea
              id="functionalReqs"
              placeholder="What the system must do"
              value={context.functionalReqs ?? ""}
              onChange={(e) =>
                update("functionalReqs", e.target.value || undefined)
              }
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="nonFunctionalReqs">
              Non-functional requirements
            </Label>
            <Textarea
              id="nonFunctionalReqs"
              placeholder="Performance, availability, etc."
              value={context.nonFunctionalReqs ?? ""}
              onChange={(e) =>
                update("nonFunctionalReqs", e.target.value || undefined)
              }
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="successMetrics">Success metrics</Label>
            <Textarea
              id="successMetrics"
              placeholder="How we measure success"
              value={context.successMetrics ?? ""}
              onChange={(e) =>
                update("successMetrics", e.target.value || undefined)
              }
              disabled={disabled}
              rows={2}
              className="mt-1"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="constraints">
        <AccordionTrigger>Constraints & Assumptions</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div>
            <Label htmlFor="constraints">Constraints</Label>
            <Textarea
              id="constraints"
              placeholder="Technical or business constraints"
              value={context.constraints ?? ""}
              onChange={(e) => update("constraints", e.target.value || undefined)}
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="assumptions">Assumptions</Label>
            <Textarea
              id="assumptions"
              placeholder="What we assume to be true"
              value={context.assumptions ?? ""}
              onChange={(e) => update("assumptions", e.target.value || undefined)}
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="currentSystem">
        <AccordionTrigger>Current System / Architecture</AccordionTrigger>
        <AccordionContent>
          <Label htmlFor="currentSystem">Current system context</Label>
          <Textarea
            id="currentSystem"
            placeholder="Existing architecture, dependencies, tech stack"
            value={context.currentSystem ?? ""}
            onChange={(e) =>
              update("currentSystem", e.target.value || undefined)
            }
            disabled={disabled}
            rows={4}
            className="mt-1"
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="dataSecurity">
        <AccordionTrigger>Data & Security</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div>
            <Label>Data classification</Label>
            <div className="mt-2 flex flex-wrap gap-4">
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
          </div>
          <div>
            <Label htmlFor="authExpectations">AuthN / AuthZ expectations</Label>
            <Textarea
              id="authExpectations"
              placeholder="Authentication and authorization requirements"
              value={context.authExpectations ?? ""}
              onChange={(e) =>
                update("authExpectations", e.target.value || undefined)
              }
              disabled={disabled}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="securityNotes">Security notes</Label>
            <Textarea
              id="securityNotes"
              placeholder="Additional security considerations"
              value={context.securityNotes ?? ""}
              onChange={(e) =>
                update("securityNotes", e.target.value || undefined)
              }
              disabled={disabled}
              rows={3}
              className="mt-1"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="operations">
        <AccordionTrigger>Operations (Observability / Rollout / Testing)</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div>
            <Label htmlFor="observability">Observability expectations</Label>
            <Textarea
              id="observability"
              placeholder="Logging, metrics, tracing"
              value={context.observability ?? ""}
              onChange={(e) =>
                update("observability", e.target.value || undefined)
              }
              disabled={disabled}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rollout">Rollout preferences</Label>
            <Textarea
              id="rollout"
              placeholder="Deployment strategy, feature flags"
              value={context.rollout ?? ""}
              onChange={(e) => update("rollout", e.target.value || undefined)}
              disabled={disabled}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="testExpectations">Test expectations</Label>
            <Textarea
              id="testExpectations"
              placeholder="Unit, integration, E2E requirements"
              value={context.testExpectations ?? ""}
              onChange={(e) =>
                update("testExpectations", e.target.value || undefined)
              }
              disabled={disabled}
              rows={2}
              className="mt-1"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="openQuestions">
        <AccordionTrigger>Open Questions</AccordionTrigger>
        <AccordionContent>
          <Label htmlFor="openQuestions">Open questions</Label>
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
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="links">
        <AccordionTrigger>Links & Attachments</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div>
            <Label htmlFor="links">Links</Label>
            <Textarea
              id="links"
              placeholder="One link per line"
              value={context.links ?? ""}
              onChange={(e) => update("links", e.target.value || undefined)}
              disabled={disabled}
              rows={3}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes / Paste anything</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes, specs, or content"
              value={context.notes ?? ""}
              onChange={(e) => update("notes", e.target.value || undefined)}
              disabled={disabled}
              rows={4}
              className="mt-1"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
