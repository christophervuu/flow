const STORAGE_KEY = "flow-test-mode"

let testMode = false

function readFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return false
    return raw === "true"
  } catch {
    return false
  }
}

export function getTestMode(): boolean {
  return testMode
}

export function setTestMode(value: boolean): void {
  testMode = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false")
  } catch {
    // ignore
  }
}

export function initTestModeFromStorage(): boolean {
  testMode = readFromStorage()
  return testMode
}
