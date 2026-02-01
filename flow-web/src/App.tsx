import { useState, useEffect, useCallback } from 'react'
import type { RunEnvelope } from './types'
import StartRun from './StartRun'
import Clarifications from './Clarifications'
import Results from './Results'

function getRunIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('runId')
}

function setRunIdInUrl(runId: string | null) {
  const url = new URL(window.location.href)
  if (runId) {
    url.searchParams.set('runId', runId)
  } else {
    url.searchParams.delete('runId')
  }
  window.history.replaceState({}, '', url.toString())
}

export default function App() {
  const [runId, setRunIdState] = useState<string | null>(() => getRunIdFromUrl())
  const [run, setRun] = useState<RunEnvelope | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setRunId = useCallback((id: string | null) => {
    setRunIdState(id)
    setRunIdInUrl(id)
    if (!id) setRun(null)
  }, [])

  useEffect(() => {
    if (!runId) return
    setLoading(true)
    setError(null)
    fetch(`/api/design/runs/${runId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Run not found' : `Error ${res.status}`)
        return res.json()
      })
      .then((meta) => {
        const statePath = meta.artifactPaths?.state ?? ''
        const runPath = statePath ? statePath.replace(/[/\\]state\.json$/i, '') : ''
        setRun({
          runId: meta.runId,
          status: meta.status,
          runPath,
          blockingQuestions: meta.blockingQuestions ?? [],
          nonBlockingQuestions: meta.nonBlockingQuestions ?? [],
          designDocMarkdown: null,
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [runId])

  if (runId && run?.status === 'AwaitingClarifications') {
    return (
      <Clarifications
        runId={runId}
        run={run}
        onSuccess={(updated) => setRun(updated)}
        onStartNew={() => setRunId(null)}
      />
    )
  }

  if (runId && run?.status === 'Completed') {
    return (
      <Results
        runId={runId}
        runPath={run.runPath}
        onStartNew={() => setRunId(null)}
        initialMarkdown={run.designDocMarkdown}
      />
    )
  }

  return (
    <StartRun
      onSuccess={(envelope) => {
        setRun(envelope)
        setRunId(envelope.runId)
      }}
      loading={loading}
      error={error}
      existingRunId={runId}
    />
  )
}
