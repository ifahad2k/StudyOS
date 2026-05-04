import React, { useState, useEffect } from 'react'
import { Play, Book, Globe, FileText, Clock, Flame, ArrowRight } from 'lucide-react'
import type { ActiveView } from '../../App'

interface DashboardProps {
  onNavigate: (view: ActiveView) => void
}

function Dashboard({ onNavigate }: DashboardProps): React.ReactElement {
  const [streak, setStreak] = useState(0)
  const [queue, setQueue] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [todayStudy, setTodayStudy] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [st, q, sess] = await Promise.all([
        window.electronAPI?.streak.getState(),
        window.electronAPI?.recall.getQueue(),
        window.electronAPI?.analytics.getSessions({ limit: 5 }),
      ])
      if (st) { setStreak(st.current); setTodayStudy(st.todayStudySeconds || 0) }
      if (q) setQueue(q.slice(0, 3))
      if (sess) setSessions(sess)
    } catch {}
  }

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const dailyGoal = 4 * 3600
  const progress = Math.min(1, todayStudy / dailyGoal)

  const getAge = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`
  }

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>{greeting()}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Ready to build your knowledge today?</p>
      </div>

      {/* Quick Start */}
      <div className="card-glow" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                background: 'var(--accent-primary)', color: 'var(--bg-primary)',
                padding: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(0, 212, 170, 0.4)',
              }}>
                <Play size={22} fill="currentColor" />
              </div>
              <h2 style={{ fontSize: 24, fontFamily: 'var(--font-heading)' }}>QUICK START</h2>
            </div>
            <div style={{ display: 'flex', gap: 24, color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Start a session</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={14} /> Open browser</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Read PDF</span>
            </div>
          </div>
          <button className="btn btn-lg" onClick={() => onNavigate('timer')} style={{
            background: 'var(--text-primary)', color: 'var(--bg-primary)',
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15,
            padding: '16px 32px', borderRadius: 16,
            boxShadow: '0 4px 16px rgba(232, 234, 240, 0.1)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            START SESSION <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Progress */}
        <div className="card">
          <h4 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 24 }}>TODAY'S PROGRESS</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent-primary)" strokeWidth="6"
                  strokeDasharray={2*Math.PI*34} strokeDashoffset={2*Math.PI*34*(1-progress)}
                  strokeLinecap="round" transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent-primary)',
              }}>{Math.round(progress * 100)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 4 }}>{fmt(todayStudy)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>of 4h 00m daily goal</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <MiniStat icon={<Clock size={14} />} label="Sessions" value={String(sessions.length)} />
            <MiniStat icon={<Flame size={14} />} label="Streak" value={String(streak)} suffix="d" />
          </div>
        </div>

        {/* Revision Queue */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('recall')}>
          <h4 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 24 }}>REVISION QUEUE</h4>
          {queue.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No pending questions. Study more to add items.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.map((q: any) => (
                <div key={q.id} style={{
                  background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8,
                  borderLeft: '3px solid var(--accent-recall)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span className="badge badge-recall">{q.subject}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{getAge(q.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{q.question}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Streak + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div className="card" style={{ background: 'var(--gradient-streak)' }}>
          <h4 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>STUDY STREAK</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Flame size={32} fill="var(--accent-streak)" color="var(--accent-streak)" />
            <div>
              <div style={{ fontSize: 36, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-streak)', lineHeight: 1 }}>{streak}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>days</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => (
              <div key={day} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: i < streak % 7 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: i < streak % 7 ? 'var(--bg-primary)' : 'var(--text-muted)',
                  fontWeight: 700, marginBottom: 4,
                }}>{i < streak % 7 ? '✓' : ''}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 16 }}>RECENT SESSIONS</h4>
          {sessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No sessions yet. Start your first study session!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sessions.map((s: any) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tertiary)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: (s.focus_score||0)>=70 ? 'var(--accent-primary)' : 'var(--accent-warning)',
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getAge(s.started_at)}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{fmt(s.actual_seconds||0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{value}</span>
      {suffix && <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{suffix}</span>}
    </div>
  )
}

export default Dashboard
