import React, { useState, useEffect } from 'react'
import { Flame, Maximize, Minimize2 } from 'lucide-react'
import type { ActiveView } from '../App'

const viewLabels: Record<ActiveView, string> = {
  dashboard: 'Dashboard',
  timer: 'Study Timer',
  browser: 'Browser',
  pdf: 'PDF Reader',
  recall: 'Recall Queue',
  analytics: 'Analytics',
  settings: 'Settings',
}

function TopBar({ activeView }: { activeView: ActiveView }): React.ReactElement {
  const [elapsed, setElapsed] = useState(0)
  const [timerState, setTimerState] = useState('idle')
  const [focusScore, setFocusScore] = useState(0)
  const [focusState, setFocusState] = useState('idle')
  const [streak, setStreak] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    window.electronAPI?.on('timer:tick', (data: any) => {
      setElapsed(data.elapsed)
      setTimerState(data.state || 'running')
    })

    window.electronAPI?.on('focusEngine:scoreUpdated', (data: any) => {
      setFocusScore(data.score)
      setFocusState(data.state)
    })

    // Load streak on mount
    window.electronAPI?.streak.getState().then((s: any) => {
      if (s) setStreak(s.current)
    }).catch(() => {})

    window.electronAPI?.window.isFullscreen().then((value: boolean) => {
      setIsFullscreen(Boolean(value))
    }).catch(() => {})

    window.electronAPI?.on('window:fullscreenChanged', (value: boolean) => {
      setIsFullscreen(Boolean(value))
    })

    return () => {
      window.electronAPI?.removeAllListeners('timer:tick')
      window.electronAPI?.removeAllListeners('focusEngine:scoreUpdated')
      window.electronAPI?.removeAllListeners('window:fullscreenChanged')
    }
  }, [])

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const focusColor = focusScore >= 70 ? 'var(--accent-primary)' :
                     focusScore >= 40 ? 'var(--accent-warning)' :
                     'var(--accent-danger)'

  const toggleFullscreen = () => {
    if (isFullscreen) {
      window.electronAPI?.window.exitFullscreen()
      setIsFullscreen(false)
    } else {
      window.electronAPI?.window.enterFullscreen()
      setIsFullscreen(true)
    }
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          {viewLabels[activeView]}
        </span>

        <div className={`timer-display ${timerState === 'paused' ? 'paused' : ''}`}>
          <span className="bracket">[</span>
          <span className="time">⏱ {formatTime(elapsed)}</span>
          <span className="bracket">]</span>
        </div>

        {timerState !== 'idle' && (
          <div className="session-badge">
            <span className={`dot ${timerState}`}></span>
            {timerState === 'running' ? 'Running' : timerState === 'paused' ? 'Paused' : 'Idle'}
          </div>
        )}

        {timerState === 'running' && focusScore > 0 && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14,
            color: focusColor,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: `${focusColor}15`,
          }}>
            Focus: {focusScore}
          </div>
        )}
      </div>

      <div className="topbar-right">
        <div className="streak-badge" title="Current streak">
          <Flame size={18} fill="currentColor" />
          <span>{streak}</span>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </div>
  )
}

export default TopBar
