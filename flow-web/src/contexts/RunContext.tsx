import { createContext, useContext, useState } from "react"

interface RunContextValue {
  runId: string | null
  setRunId: (id: string | null) => void
}

const RunContext = createContext<RunContextValue | null>(null)

export function RunProvider({ children }: { children: React.ReactNode }) {
  const [runId, setRunId] = useState<string | null>(null)
  return (
    <RunContext.Provider value={{ runId, setRunId }}>
      {children}
    </RunContext.Provider>
  )
}

export function useRun() {
  const ctx = useContext(RunContext)
  if (!ctx) throw new Error("useRun must be used within RunProvider")
  return ctx
}
