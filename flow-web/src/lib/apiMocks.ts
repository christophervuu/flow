import type {
  ExecutionStatusDto,
  RunEnvelope,
  RunMetadata,
} from "@/types"

export const MOCK_RUN_ID = "mock-run-test"

const MOCK_DESIGN_MARKDOWN = `# Mock design

This is mock data from test mode. No backend was called.
`

const MOCK_ARTIFACT_PATHS = {
  state: "/mock/path/state.json",
  input: "/mock/path/input.json",
  clarifier: "/mock/path/clarifier.json",
  clarifiedSpec: "/mock/path/clarified-spec.json",
  publishedPackage: "/mock/path/package",
  designDoc: "/mock/path/design.md",
}

export function mockRunEnvelope(runId: string = MOCK_RUN_ID): RunEnvelope {
  return {
    runId,
    status: "Completed",
    runPath: "/mock/path",
    blockingQuestions: [],
    nonBlockingQuestions: [],
    designDocMarkdown: MOCK_DESIGN_MARKDOWN,
  }
}

export function mockRunMetadata(runId: string = MOCK_RUN_ID): RunMetadata {
  const now = new Date().toISOString()
  return {
    runId,
    status: "Completed",
    createdAt: now,
    updatedAt: now,
    hasDesignDoc: true,
    artifactPaths: MOCK_ARTIFACT_PATHS,
    blockingQuestions: null,
    nonBlockingQuestions: null,
  }
}

export function mockDesignMarkdown(): string {
  return MOCK_DESIGN_MARKDOWN
}

const MOCK_AGENTS = [
  "Clarifier",
  "Synthesizer",
  "Challenger",
  "Optimizer",
  "Publisher",
] as const

export function mockExecutionStatus(runId: string): ExecutionStatusDto {
  const elapsed = Date.now() % 25000 // 25s cycle for demo
  let current = 0
  if (elapsed < 5000) current = 0
  else if (elapsed < 10000) current = 1
  else if (elapsed < 15000) current = 2
  else if (elapsed < 20000) current = 3
  else current = 4

  const completedAgents = MOCK_AGENTS.slice(0, current)
  const activeAgents = current < MOCK_AGENTS.length ? [MOCK_AGENTS[current]] : []
  const pendingAgents = MOCK_AGENTS.slice(current + 1)

  return {
    runId,
    status: "Running",
    currentStage: activeAgents[0] ?? completedAgents[completedAgents.length - 1] ?? "Clarifier",
    currentAgent: activeAgents[0] ?? null,
    completedAgents: [...completedAgents],
    activeAgents: [...activeAgents],
    pendingAgents: [...pendingAgents],
    progress: {
      current: current + (activeAgents.length > 0 ? 1 : 0),
      total: MOCK_AGENTS.length,
    },
  }
}
