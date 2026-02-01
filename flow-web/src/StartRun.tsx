import { useState, FormEvent } from 'react'
import type { RunEnvelope, CreateRunRequest } from './types'

interface StartRunProps {
  onSuccess: (envelope: RunEnvelope) => void
  loading: boolean
  error: string | null
  existingRunId: string | null
}

export default function StartRun({ onSuccess, loading, error, existingRunId }: StartRunProps) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [linksText, setLinksText] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !prompt.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    const links = linksText.trim() ? linksText.trim().split(/\r?\n/).filter(Boolean) : undefined
    const body: CreateRunRequest = {
      title: title.trim(),
      prompt: prompt.trim(),
      ...(links?.length || notes.trim() ? { context: { links, notes: notes.trim() || undefined } } : {}),
    }
    try {
      const res = await fetch('/api/design/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Error ${res.status}`)
      }
      const envelope: RunEnvelope = await res.json()
      onSuccess(envelope)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>Start design run</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {existingRunId && !error && (
        <p style={{ color: 'gray' }}>Run ID: {existingRunId} (loading…)</p>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480 }}>
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={submitting}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={4}
            disabled={submitting}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          Links <span style={{ color: 'gray', fontWeight: 'normal' }}>(one per line, optional)</span>
          <textarea
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            rows={2}
            disabled={submitting}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          Notes <span style={{ color: 'gray', fontWeight: 'normal' }}>(optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={submitting}
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </label>
        {submitError && <p style={{ color: 'crimson' }}>{submitError}</p>}
        <button type="submit" disabled={submitting || loading}>
          {submitting ? 'Starting…' : 'Start run'}
        </button>
      </form>
    </div>
  )
}
