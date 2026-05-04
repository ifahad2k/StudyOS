import React, { useState, useEffect } from 'react'
import { BarChart3, Clock, Flame, Brain, Target, Globe, TrendingUp } from 'lucide-react'

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ color, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</div>
    </div>
  )
}

function AnalyticsView(): React.ReactElement {
  const [sessions, setSessions] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [streakState, setStreakState] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [sess, subj, streak] = await Promise.all([
      window.electronAPI?.analytics.getSessions({ limit: 20 }),
      window.electronAPI?.analytics.getSubjectBreakdown(),
      window.electronAPI?.streak.getState(),
    ])
    setSessions(sess || [])
    setSubjects(subj || [])
    setStreakState(streak)
  }

  const fmt = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}m` : `${m}m` }
  const total = sessions.reduce((s, x) => s + (x.actual_seconds||0), 0)
  const avgF = sessions.filter(s=>s.focus_score).length > 0
    ? Math.round(sessions.filter(s=>s.focus_score).reduce((a,s)=>a+s.focus_score,0)/sessions.filter(s=>s.focus_score).length) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}><BarChart3 size={28} style={{ verticalAlign:'middle', marginRight:12 }} />Analytics</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Study Time" value={fmt(total)} icon={<Clock size={20}/>} color="var(--accent-primary)" />
        <StatCard label="Sessions" value={String(sessions.length)} icon={<Target size={20}/>} color="var(--accent-secondary)" />
        <StatCard label="Avg Focus" value={avgF?`${avgF}/100`:'—'} icon={<TrendingUp size={20}/>} color="var(--accent-primary)" />
        <StatCard label="Streak" value={streakState?`${streakState.current}d`:'—'} icon={<Flame size={20}/>} color="var(--accent-streak)" />
      </div>
      <div className="card">
        <h4 style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginBottom:16 }}>RECENT SESSIONS</h4>
        {sessions.slice(0,10).map(s=>(
          <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 16px', background:'var(--bg-tertiary)', borderRadius:8, marginBottom:4 }}>
            <div><span style={{fontWeight:600,fontSize:13}}>{s.subject}</span><br/><span style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(s.started_at).toLocaleDateString()}</span></div>
            <div style={{display:'flex',gap:16,alignItems:'center'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:13}}>{fmt(s.actual_seconds)}</span>
              {s.focus_score!=null&&<span style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,color:s.focus_score>=70?'var(--accent-primary)':'var(--accent-warning)'}}>{Math.round(s.focus_score)}</span>}
            </div>
          </div>
        ))}
        {sessions.length===0&&<p style={{color:'var(--text-muted)'}}>No sessions yet</p>}
      </div>
    </div>
  )
}

export default AnalyticsView
