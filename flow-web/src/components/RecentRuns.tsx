import { Link } from "react-router-dom"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HistoryIcon } from "lucide-react"
import { getRecentRuns } from "@/lib/storage"

export function RecentRuns() {
  const runs = getRecentRuns()
  if (runs.length === 0) return null

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
                <Link
                  to={`/runs/${run.runId}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{run.title || "Untitled"}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
