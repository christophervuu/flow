import { useState, useEffect } from 'react'

interface ResultsProps {
  runId: string
  runPath: string
  onStartNew: () => void
  initialMarkdown?: string | null
}

export default function Results({ runId, runPath, onStartNew, initialMarkdown }: ResultsProps) {
  const [markdown, setMarkdown] = useState<string | null>(initialMarkdown ?? null)
  const [loading, setLoading] = useState(!initialMarkdown)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialMarkdown != null) {
      setMarkdown(initialMarkdown)
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/design/runs/${runId}/design`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Design doc not available' : `Error ${res.status}`)
        return res.text()
      })
      .then(setMarkdown)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [runId, initialMarkdown])

  return (
    <div>
      <h1>Design doc</h1>
      <p>Run ID: {runId}</p>
      {runPath && (
        <p style={{ fontSize: '0.9rem', color: 'gray' }}>
          Path: <code>{runPath}</code>
        </p>
      )}
      {loading && <p>Loading design doc…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {markdown && (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.9rem',
            background: '#fff',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: 4,
            maxHeight: '70vh',
            overflow: 'auto',
          }}
        >
          {markdown}
        </pre>
      )}
      <div style={{ marginTop: '1rem' }}>
        <button onClick={onStartNew}>Start new run</button>
      </div>
    </div>
  )
}
