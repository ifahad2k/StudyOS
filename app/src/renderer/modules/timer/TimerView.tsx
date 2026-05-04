import React, { useState, useEffect, useCallback } from 'react'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'

interface TimerViewProps {
  onSessionEnd: (session: any) => void
}

type TimerMode = 'stopwatch' | 'pomodoro' | 'countdown'
type TimerState = 'idle' | 'running' | 'paused' | 'ended'

const SUBJECTS = ['Physics', 'Mathematics', 'Computer Science', 'Chemistry', 'Biology', 'English', 'History', 'Other']

function TimerView({ onSessionEnd }: TimerViewProps): React.ReactElement {
  const [mode, setMode] = useState<TimerMode>('pomodoro')
  const [subject, setSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [plannedSeconds, setPlannedSeconds] = useState<number | null>(null)
  const [countdownMinutes, setCountdownMinutes] = useState(45)
  const [pomodoroPhase, setPomodoroPhase] = useState<string | null>(null)
  const [pomodoroCycle, setPomodoroCycle] = useState(0)
  const [sessionId, setSessionId] = useState<number | null>(null)

  useEffect(() => {
    // Get initial state
    window.electronAPI?.timer.getState().then((s: any) => {
      if (s && s.state !== 'idle' && s.state !== 'ended') {
        setTimerState(s.state)
        setElapsed(s.elapsedSeconds)
        setSubject(s.subject)
        setMode(s.mode)
        setPlannedSeconds(s.plannedSeconds)
        setSessionId(s.sessionId)
        setPomodoroPhase(s.pomodoroPhase)
        setPomodoroCycle(s.pomodoroCycle)
      }
    }).catch(() => {})

    window.electronAPI?.on('timer:tick', (data: any) => {
      setElapsed(data.elapsed)
      if (data.pomodoroPhase) setPomodoroPhase(data.pomodoroPhase)
      if (data.cycleNumber) setPomodoroCycle(data.cycleNumber)
    })

    window.electronAPI?.on('timer:cycleComplete', (data: any) => {
      setPomodoroPhase(data.type === 'work' ? 'work' : data.breakType || 'shortBreak')
      setPomodoroCycle(data.cycleNumber)
      setElapsed(0)
    })

    return () => {
      window.electronAPI?.removeAllListeners('timer:tick')
      window.electronAPI?.removeAllListeners('timer:cycleComplete')
    }
  }, [])

  const startSession = useCallback(async () => {
    const finalSubject = subject === 'Other' ? customSubject : subject
    if (!finalSubject.trim()) return

    const duration = mode === 'countdown' ? countdownMinutes * 60 : undefined
    const result = await window.electronAPI?.timer.start({
      subject: finalSubject,
      mode,
      duration,
    })

    if (result) {
      setTimerState('running')
      setSessionId(result.sessionId)
      setPlannedSeconds(result.plannedSeconds)
      setElapsed(0)
    }
  }, [subject, customSubject, mode, countdownMinutes])

  const pauseSession = async () => {
    await window.electronAPI?.timer.pause()
    setTimerState('paused')
  }

  const resumeSession = async () => {
    await window.electronAPI?.timer.resume()
    setTimerState('running')
  }

  const endSession = async () => {
    const result = await window.electronAPI?.timer.end()
    setTimerState('idle')
    setElapsed(0)
    if (result) {
      onSessionEnd(result)
    }
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const displayTime = () => {
    if (mode === 'pomodoro' && plannedSeconds) {
      const remaining = Math.max(0, plannedSeconds - elapsed)
      return formatTime(remaining)
    }
    if (mode === 'countdown' && plannedSeconds) {
      const remaining = Math.max(0, plannedSeconds - elapsed)
      return formatTime(remaining)
    }
    return formatTime(elapsed)
  }

  const progress = plannedSeconds ? Math.min(1, elapsed / plannedSeconds) : 0
  const timerColor = timerState === 'running' ? 'var(--accent-primary)' :
                     timerState === 'paused' ? 'var(--accent-warning)' :
                     'var(--text-muted)'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-xl)' }}>
      {/* Timer Display */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        {/* Large circular progress */}
        <div style={{ position: 'relative', width: 280, height: 280, margin: '0 auto var(--space-xl)' }}>
          <svg width="280" height="280" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r="125" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
            {(mode === 'pomodoro' || mode === 'countdown') && (
              <circle
                cx="140" cy="140" r="125"
                fill="none" stroke={timerColor} strokeWidth="8"
                strokeDasharray={2 * Math.PI * 125}
                strokeDashoffset={2 * Math.PI * 125 * (1 - progress)}
                strokeLinecap="round"
                transform="rotate(-90 140 140)"
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            )}
            {timerState === 'running' && (
              <circle cx="140" cy="140" r="125" fill="none" stroke={timerColor} strokeWidth="8"
                style={{ filter: `drop-shadow(0 0 12px ${timerColor})`, opacity: 0.3 }} />
            )}
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 700,
              color: timerColor, lineHeight: 1,
            }}>
              {displayTime()}
            </div>
            {timerState !== 'idle' && (
              <div style={{
                fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text-secondary)',
                marginTop: 'var(--space-sm)',
              }}>
                {subject}
              </div>
            )}
            {pomodoroPhase && timerState !== 'idle' && (
              <div style={{
                fontSize: 12, fontFamily: 'var(--font-mono)',
                color: pomodoroPhase === 'work' ? 'var(--accent-primary)' : 'var(--accent-replay)',
                marginTop: 4,
              }}>
                {pomodoroPhase === 'work' ? `Work · Cycle ${pomodoroCycle}` :
                 pomodoroPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        {timerState === 'idle' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', alignItems: 'center' }}>
            {/* Mode selector */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              {(['pomodoro', 'stopwatch', 'countdown'] as TimerMode[]).map((m) => (
                <button
                  key={m}
                  className={`btn ${mode === m ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode(m)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode === 'countdown' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <input
                  type="number" value={countdownMinutes}
                  onChange={(e) => setCountdownMinutes(Number(e.target.value))}
                  min={1} max={600}
                  style={{
                    width: 80, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: 16,
                  }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>minutes</span>
              </div>
            )}

            {/* Subject picker */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', justifyContent: 'center', maxWidth: 400 }}>
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  className={`btn ${subject === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSubject(s)}
                  style={{ fontSize: 13 }}
                >
                  {s}
                </button>
              ))}
            </div>

            {subject === 'Other' && (
              <input
                type="text" placeholder="Enter subject..."
                value={customSubject} onChange={(e) => setCustomSubject(e.target.value)}
                style={{
                  width: 250, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14,
                }}
              />
            )}

            <button
              className="btn btn-primary btn-lg"
              onClick={startSession}
              disabled={!subject.trim() && (subject !== 'Other' || !customSubject.trim())}
              style={{ padding: '16px 48px', fontSize: 18 }}
            >
              <Play size={22} fill="currentColor" />
              START SESSION
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            {timerState === 'running' ? (
              <button className="btn btn-secondary btn-lg" onClick={pauseSession}>
                <Pause size={20} /> Pause
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={resumeSession}>
                <Play size={20} fill="currentColor" /> Resume
              </button>
            )}
            <button className="btn btn-danger btn-lg" onClick={endSession}>
              <Square size={20} /> End Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimerView
