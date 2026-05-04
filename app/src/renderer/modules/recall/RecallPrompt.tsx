import React, { useState } from 'react'
import { X, Lightbulb, HelpCircle, AlertTriangle } from 'lucide-react'

interface RecallPromptProps {
  session: any
  onDone: () => void
}

function RecallPrompt({ session, onDone }: RecallPromptProps): React.ReactElement {
  const [learned, setLearned] = useState(['', '', ''])
  const [questions, setQuestions] = useState(['', ''])

  const submit = async () => {
    const validLearned = learned.filter((l) => l.trim())
    const validQuestions = questions.filter((q) => q.trim())

    await window.electronAPI?.recall.submit({
      sessionId: session.sessionId,
      subject: session.subject,
      learned: validLearned,
      questions: validQuestions,
    })
    onDone()
  }

  const skip = async () => {
    await window.electronAPI?.recall.skip({ sessionId: session.sessionId })
    onDone()
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }}>
      <div className="modal-content" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
            <Lightbulb size={24} color="var(--accent-recall)" />
            What did you learn?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {session.subject} · {formatTime(session.actualSeconds || session.elapsedSeconds || 0)} session
          </p>
        </div>

        {/* Learned inputs */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
            fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--accent-primary)',
          }}>
            <Lightbulb size={16} /> Key takeaways (up to 3)
          </label>
          {learned.map((val, i) => (
            <input
              key={i}
              type="text" placeholder={`What I learned ${i + 1}...`}
              value={val}
              onChange={(e) => {
                const copy = [...learned]
                copy[i] = e.target.value
                setLearned(copy)
              }}
              style={{
                width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14,
                marginBottom: 'var(--space-sm)',
              }}
            />
          ))}
        </div>

        {/* Questions inputs */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
            fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--accent-warning)',
          }}>
            <HelpCircle size={16} /> Still unsure about (up to 2)
          </label>
          {questions.map((val, i) => (
            <input
              key={i}
              type="text" placeholder={`Question ${i + 1}...`}
              value={val}
              onChange={(e) => {
                const copy = [...questions]
                copy[i] = e.target.value
                setQuestions(copy)
              }}
              style={{
                width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14,
                marginBottom: 'var(--space-sm)',
              }}
            />
          ))}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            These will be added to your Revision Queue for future review.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={skip} style={{ color: 'var(--accent-danger)' }}>
            <AlertTriangle size={14} />
            Skip (−5 streak points)
          </button>
          <button className="btn btn-primary btn-lg" onClick={submit}>
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecallPrompt
