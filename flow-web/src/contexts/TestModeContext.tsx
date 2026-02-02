import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  setTestMode as setTestModeStore,
  initTestModeFromStorage,
} from "@/lib/testMode"

interface TestModeContextValue {
  testMode: boolean
  setTestMode: (value: boolean) => void
}

const TestModeContext = createContext<TestModeContextValue | null>(null)

function readInitialTestMode(): boolean {
  return initTestModeFromStorage()
}

export function TestModeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [testMode, setTestModeState] = useState(readInitialTestMode)

  const setTestMode = useCallback(
    (value: boolean) => {
      setTestModeStore(value)
      setTestModeState(value)
      queryClient.invalidateQueries()
    },
    [queryClient]
  )

  return (
    <TestModeContext.Provider value={{ testMode, setTestMode }}>
      {children}
    </TestModeContext.Provider>
  )
}

export function useTestMode(): TestModeContextValue {
  const ctx = useContext(TestModeContext)
  if (!ctx) {
    throw new Error("useTestMode must be used within TestModeProvider")
  }
  return ctx
}
