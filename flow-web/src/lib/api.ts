import type {
  CreateRunRequest,
  RunEnvelope,
  RunMetadata,
  SubmitAnswersRequest,
} from "@/types"

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
  const res = await fetch(`${API_BASE}/design/runs/${runId}`)
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.json()
}

export async function getDesign(runId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/design/runs/${runId}/design`)
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res))
  }
  return res.text()
}
