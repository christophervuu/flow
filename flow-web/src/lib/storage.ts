const STORAGE_KEY = "flow-recent-runs"
const MAX_RUNS = 10

export interface RecentRun {
  runId: string
  title: string
  createdAt: string
}

export function getRecentRuns(): RecentRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is RecentRun =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as RecentRun).runId === "string" &&
        typeof (r as RecentRun).title === "string" &&
        typeof (r as RecentRun).createdAt === "string"
    )
  } catch {
    return []
  }
}

export function addRecentRun(
  runId: string,
  title: string,
  createdAt?: string
): void {
  const now = new Date().toISOString()
  const runs = getRecentRuns()
  const filtered = runs.filter((r) => r.runId !== runId)
  const updated = [
    { runId, title, createdAt: createdAt ?? now },
    ...filtered,
  ].slice(0, MAX_RUNS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}
