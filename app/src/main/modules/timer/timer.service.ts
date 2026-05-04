import { eventBus } from '../../eventBus'
import { getDb } from '../../db/connection'

export type TimerMode = 'stopwatch' | 'pomodoro' | 'countdown'
export type TimerState = 'idle' | 'running' | 'paused' | 'ended'
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

export interface SessionState {
  sessionId: number | null
  subject: string
  mode: TimerMode
  state: TimerState
  elapsedSeconds: number
  plannedSeconds: number | null
  pauseCount: number
  pauseTotalSeconds: number
  startedAt: number | null
  pomodoroPhase: PomodoroPhase | null
  pomodoroCycle: number
}

class TimerService {
  private ticker: NodeJS.Timeout | null = null
  private sessionState: SessionState = this.defaultState()
  private lastTickAt: number = 0
  private pauseStartedAt: number = 0

  // Pomodoro config
  private pomodoroWorkMinutes = 25
  private pomodoroShortBreakMinutes = 5
  private pomodoroLongBreakMinutes = 15
  private pomodoroCyclesBeforeLong = 4

  private defaultState(): SessionState {
    return {
      sessionId: null,
      subject: '',
      mode: 'pomodoro',
      state: 'idle',
      elapsedSeconds: 0,
      plannedSeconds: null,
      pauseCount: 0,
      pauseTotalSeconds: 0,
      startedAt: null,
      pomodoroPhase: null,
      pomodoroCycle: 0,
    }
  }

  start(subject: string, mode: TimerMode, duration?: number): SessionState {
    if (this.sessionState.state === 'running') {
      return this.sessionState
    }

    // Load pomodoro settings
    try {
      const db = getDb()
      const getVal = (key: string, def: number) => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
        return row ? JSON.parse(row.value) : def
      }
      this.pomodoroWorkMinutes = getVal('pomodoro.workMinutes', 25)
      this.pomodoroShortBreakMinutes = getVal('pomodoro.shortBreakMinutes', 5)
      this.pomodoroLongBreakMinutes = getVal('pomodoro.longBreakMinutes', 15)
      this.pomodoroCyclesBeforeLong = getVal('pomodoro.cyclesBeforeLongBreak', 4)
    } catch {}

    // Create session in DB
    const db = getDb()
    const now = new Date().toISOString()
    const plannedSeconds = mode === 'pomodoro'
      ? this.pomodoroWorkMinutes * 60
      : mode === 'countdown' && duration
        ? duration
        : null

    const result = db.prepare(`
      INSERT INTO sessions (subject, mode, started_at, planned_seconds)
      VALUES (?, ?, ?, ?)
    `).run(subject, mode, now, plannedSeconds)

    this.sessionState = {
      sessionId: result.lastInsertRowid as number,
      subject,
      mode,
      state: 'running',
      elapsedSeconds: 0,
      plannedSeconds: plannedSeconds,
      pauseCount: 0,
      pauseTotalSeconds: 0,
      startedAt: Date.now(),
      pomodoroPhase: mode === 'pomodoro' ? 'work' : null,
      pomodoroCycle: mode === 'pomodoro' ? 1 : 0,
    }

    this.lastTickAt = Date.now()
    this.startTicker()

    eventBus.emit('SESSION_STARTED', {
      sessionId: this.sessionState.sessionId,
      subject,
      mode,
      startedAt: now,
    })

    return this.sessionState
  }

  pause(reason: string = 'manual'): SessionState {
    if (this.sessionState.state !== 'running') return this.sessionState
    this.sessionState.state = 'paused'
    this.sessionState.pauseCount++
    this.pauseStartedAt = Date.now()
    this.stopTicker()

    // Log pause to DB
    try {
      const db = getDb()
      db.prepare(`
        INSERT INTO pauses (session_id, reason, paused_at)
        VALUES (?, ?, ?)
      `).run(this.sessionState.sessionId, reason, new Date().toISOString())
    } catch {}

    eventBus.emit('SESSION_PAUSED', {
      sessionId: this.sessionState.sessionId,
      reason,
      pausedAt: new Date().toISOString(),
      elapsedSeconds: this.sessionState.elapsedSeconds,
    })

    return this.sessionState
  }

  resume(): SessionState {
    if (this.sessionState.state !== 'paused') return this.sessionState

    const pauseDuration = Math.floor((Date.now() - this.pauseStartedAt) / 1000)
    this.sessionState.pauseTotalSeconds += pauseDuration
    this.sessionState.state = 'running'
    this.lastTickAt = Date.now()
    this.startTicker()

    // Update pause record
    try {
      const db = getDb()
      db.prepare(`
        UPDATE pauses SET resumed_at = ?, duration_seconds = ?
        WHERE session_id = ? AND resumed_at IS NULL
      `).run(new Date().toISOString(), pauseDuration, this.sessionState.sessionId)
    } catch {}

    eventBus.emit('SESSION_RESUMED', {
      sessionId: this.sessionState.sessionId,
      resumedAt: new Date().toISOString(),
    })

    return this.sessionState
  }

  end(): SessionState {
    if (this.sessionState.state === 'idle' || this.sessionState.state === 'ended') {
      return this.sessionState
    }

    // If paused, account for final pause
    if (this.sessionState.state === 'paused') {
      const pauseDuration = Math.floor((Date.now() - this.pauseStartedAt) / 1000)
      this.sessionState.pauseTotalSeconds += pauseDuration
    }

    this.stopTicker()
    this.sessionState.state = 'ended'

    // Update session in DB
    try {
      const db = getDb()
      db.prepare(`
        UPDATE sessions SET
          ended_at = ?,
          actual_seconds = ?,
          pause_count = ?,
          pause_total_seconds = ?
        WHERE id = ?
      `).run(
        new Date().toISOString(),
        this.sessionState.elapsedSeconds,
        this.sessionState.pauseCount,
        this.sessionState.pauseTotalSeconds,
        this.sessionState.sessionId,
      )
    } catch {}

    eventBus.emit('SESSION_ENDED', {
      sessionId: this.sessionState.sessionId,
      endedAt: new Date().toISOString(),
      actualSeconds: this.sessionState.elapsedSeconds,
      subject: this.sessionState.subject,
    })

    const finalState = { ...this.sessionState }
    // Reset for next session
    setTimeout(() => {
      this.sessionState = this.defaultState()
    }, 500)

    return finalState
  }

  getState(): SessionState {
    return { ...this.sessionState }
  }

  isRunning(): boolean {
    return this.sessionState.state === 'running'
  }

  elapsed(): number {
    return this.sessionState.elapsedSeconds
  }

  getCurrentSessionId(): number | null {
    return this.sessionState.sessionId
  }

  private startTicker() {
    this.stopTicker()
    this.ticker = setInterval(() => this.tick(), 1000)
  }

  private stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker)
      this.ticker = null
    }
  }

  private tick() {
    if (this.sessionState.state !== 'running') return

    const now = Date.now()
    const delta = Math.round((now - this.lastTickAt) / 1000)
    this.lastTickAt = now
    this.sessionState.elapsedSeconds += delta

    // Check pomodoro cycle completion
    if (this.sessionState.mode === 'pomodoro' && this.sessionState.plannedSeconds) {
      if (this.sessionState.elapsedSeconds >= this.sessionState.plannedSeconds) {
        this.handlePomodoroCycleEnd()
        return
      }
    }

    // Check countdown completion
    if (this.sessionState.mode === 'countdown' && this.sessionState.plannedSeconds) {
      if (this.sessionState.elapsedSeconds >= this.sessionState.plannedSeconds) {
        this.end()
        return
      }
    }

    // Emit tick (EPHEMERAL — never stored)
    eventBus.emit('TIMER_TICK', {
      elapsed: this.sessionState.elapsedSeconds,
      state: this.sessionState.state,
      pomodoroPhase: this.sessionState.pomodoroPhase,
      cycleNumber: this.sessionState.pomodoroCycle,
    })
  }

  private handlePomodoroCycleEnd() {
    const wasWork = this.sessionState.pomodoroPhase === 'work'

    if (wasWork) {
      // Determine break type
      const isLongBreak = this.sessionState.pomodoroCycle % this.pomodoroCyclesBeforeLong === 0
      const breakPhase: PomodoroPhase = isLongBreak ? 'longBreak' : 'shortBreak'
      const breakMinutes = isLongBreak ? this.pomodoroLongBreakMinutes : this.pomodoroShortBreakMinutes

      this.sessionState.pomodoroPhase = breakPhase
      this.sessionState.elapsedSeconds = 0
      this.sessionState.plannedSeconds = breakMinutes * 60

      eventBus.emit('POMODORO_CYCLE', {
        sessionId: this.sessionState.sessionId,
        cycleNumber: this.sessionState.pomodoroCycle,
        type: 'break',
        breakType: breakPhase,
      })
    } else {
      // Break ended — start next work cycle
      this.sessionState.pomodoroCycle++
      this.sessionState.pomodoroPhase = 'work'
      this.sessionState.elapsedSeconds = 0
      this.sessionState.plannedSeconds = this.pomodoroWorkMinutes * 60

      eventBus.emit('POMODORO_CYCLE', {
        sessionId: this.sessionState.sessionId,
        cycleNumber: this.sessionState.pomodoroCycle,
        type: 'work',
      })
    }
  }
}

export const timerService = new TimerService()
