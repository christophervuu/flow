import type { RunEnvelope, RunMetadata } from "@/types"

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
