import type {
  CreateRunRequest,
  ExecutionStatusDto,
  RunEnvelope,
  RunMetadata,
  SubmitAnswersRequest,
  TraceEvent,
} from "@/types"
import { getTestMode } from "@/lib/testMode"
import {
  mockRunEnvelope,
  mockRunMetadata,
  mockDesignMarkdown,
  mockExecutionStatus,
} from "@/lib/apiMocks"

const API_BASE = "/api"

async function parseErrorResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      const body = (await res.json()) as {
        detail?: string
        title?: string
        status?: number
      }
      return body.detail ?? body.title ?? `Error ${res.status}`
    } catch {
      return `Error ${res.status}: ${res.statusText}`
    }
  }
  const text = await res.text()
  return text || `Error ${res.status}: ${res.statusText}`
}

export async function createRun(req: CreateRunRequest): Promise<RunEnvelope> {
  if (getTestMode()) {
    return Promise.resolve(mockRunEnvelope())
  }
  const res = await fetch(`${API_BASE}/design/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.json()
}

export async function submitAnswers(
  runId: string,
  req: SubmitAnswersRequest
): Promise<RunEnvelope> {
  if (getTestMode()) {
    return Promise.resolve(mockRunEnvelope(runId))
  }
  const res = await fetch(`${API_BASE}/design/runs/${runId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.json()
}

export async function getRun(runId: string): Promise<RunMetadata> {
  if (getTestMode()) {
    return Promise.resolve(mockRunMetadata(runId))
  }
  const res = await fetch(`${API_BASE}/design/runs/${runId}`)
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.json()
}

export async function getDesign(runId: string): Promise<string> {
  if (getTestMode()) {
    return Promise.resolve(mockDesignMarkdown())
  }
  const res = await fetch(`${API_BASE}/design/runs/${runId}/design`)
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.text()
}

export async function getExecutionStatus(runId: string): Promise<ExecutionStatusDto> {
  if (getTestMode()) {
    return Promise.resolve(mockExecutionStatus(runId))
  }
  const res = await fetch(`${API_BASE}/design/runs/${runId}/status`)
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.json()
}

export async function getTrace(runId: string): Promise<TraceEvent[]> {
  if (getTestMode()) {
    return Promise.resolve([])
  }
  const res = await fetch(`${API_BASE}/design/runs/${runId}/trace`)
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.json()
}
