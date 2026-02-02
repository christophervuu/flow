import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HistoryIcon } from "lucide-react"
import { getRecentRuns } from "@/lib/storage"
import { useRun } from "@/contexts/RunContext"
import { useNavigate } from "react-router-dom"

export function RecentRuns() {
  const runs = getRecentRuns()
  const { setRunId } = useRun()
  const navigate = useNavigate()

  if (runs.length === 0) return null

  function handleSelectRun(runId: string) {
    setRunId(runId)
    navigate("/")
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="recent" className="border-none">
        <AccordionTrigger className="py-2 hover:no-underline [&[data-state=open]>svg]:rotate-0">
          <span className="flex items-center gap-2">
            <HistoryIcon className="size-4" />
            Recent runs ({runs.length})
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1">
            {runs.map((run) => (
              <li key={run.runId}>
                <button
                  type="button"
                  onClick={() => handleSelectRun(run.runId)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{run.title || "Untitled"}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
