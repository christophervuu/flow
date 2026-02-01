import { useState, useEffect, FormEvent } from 'react'
import type { RunEnvelope, QuestionDto } from './types'

interface ClarificationsProps {
  runId: string
  run: RunEnvelope
  onSuccess: (envelope: RunEnvelope) => void
  onStartNew: () => void
}

export default function Clarifications({ runId, run, onSuccess, onStartNew }: ClarificationsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [nonBlockingOpen, setNonBlockingOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blocking = run.blockingQuestions ?? []
  const nonBlocking = run.nonBlockingQuestions ?? []

  useEffect(() => {
    const initial: Record<string, string> = {}
    blocking.forEach((q) => { initial[q.id] = '' })
    nonBlocking.forEach((q) => { initial[q.id] = '' })
    setAnswers((prev) => ({ ...initial, ...prev }))
  }, [blocking, nonBlocking])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const missing = blocking.filter((q) => !answers[q.id]?.trim())
    if (missing.length) {
      setError('Please answer all blocking questions.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/design/runs/${runId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Error ${res.status}`)
      }
      const envelope: RunEnvelope = await res.json()
      onSuccess(envelope)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>Clarifications</h1>
      <p>Run ID: {runId}</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <section>
          <h2>Blocking questions (required)</h2>
          {(blocking as QuestionDto[]).map((q) => (
            <label key={q.id} style={{ display: 'block', marginBottom: '0.75rem' }}>
              <strong>{q.id}:</strong> {q.text}
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                rows={2}
                required
                disabled={submitting}
                style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
              />
            </label>
          ))}
        </section>
        {nonBlocking.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setNonBlockingOpen((o) => !o)}
              style={{ marginBottom: '0.5rem' }}
            >
              {nonBlockingOpen ? 'Hide' : 'Show'} non-blocking questions ({nonBlocking.length})
            </button>
            {nonBlockingOpen &&
              (nonBlocking as QuestionDto[]).map((q) => (
                <label key={q.id} style={{ display: 'block', marginBottom: '0.75rem' }}>
                  <strong>{q.id}:</strong> {q.text}
                  <textarea
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    rows={2}
                    disabled={submitting}
                    style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                  />
                </label>
              ))}
          </section>
        )}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
          <button type="button" onClick={onStartNew}>
            Start new run
          </button>
        </div>
      </form>
    </div>
  )
}
