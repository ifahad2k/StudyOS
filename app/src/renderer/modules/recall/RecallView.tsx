import React, { useState, useEffect } from 'react'
import { Brain, CheckCircle, Clock, Archive, AlarmClock } from 'lucide-react'

function RecallView(): React.ReactElement {
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQueue()
  }, [])

  const loadQueue = async () => {
    setLoading(true)
    const items = await window.electronAPI?.recall.getQueue()
    setQueue(items || [])
    setLoading(false)
  }

  const resolveItem = async (id: number) => {
    const note = prompt('Resolution note (optional):')
    await window.electronAPI?.recall.resolveItem({ itemId: id, note: note || undefined })
    loadQueue()
  }

  const snoozeItem = async (id: number, days: number) => {
    await window.electronAPI?.recall.snoozeItem({ itemId: id, days })
    loadQueue()
  }

  const archiveItem = async (id: number) => {
    await window.electronAPI?.recall.archiveItem({ itemId: id })
    loadQueue()
  }

  const getAge = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 24, display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Brain size={28} color="var(--accent-recall)" />
            Revision Queue
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Questions you weren't sure about. Resolve them to strengthen your knowledge.
          </p>
        </div>
        <div className="badge badge-recall" style={{ fontSize: 14, padding: '4px 12px' }}>
          {queue.length} unresolved
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : queue.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--space-3xl)', background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
        }}>
          <CheckCircle size={48} color="var(--accent-primary)" style={{ marginBottom: 'var(--space-md)' }} />
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>All Clear!</h3>
          <p style={{ color: 'var(--text-muted)' }}>No unresolved questions. Keep studying to add more.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {queue.map((item) => (
            <div key={item.id} className="card" style={{ borderLeft: '3px solid var(--accent-recall)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                <span className="badge badge-recall">{item.subject}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {getAge(item.created_at)}
                </span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
                {item.question}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn-primary btn-sm" onClick={() => resolveItem(item.id)}>
                  <CheckCircle size={14} /> Resolved
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => snoozeItem(item.id, 3)}>
                  <AlarmClock size={14} /> 3 days
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => snoozeItem(item.id, 7)}>
                  <Clock size={14} /> 7 days
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => archiveItem(item.id)}>
                  <Archive size={14} /> Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecallView
