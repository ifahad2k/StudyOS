import { BrowserWindow } from 'electron'
import { eventBus } from '../../eventBus'
import { getDb } from '../../db/connection'
import { timerService } from '../timer/timer.service'
import { focusMonitorService } from '../focusMonitor/focusMonitor.service'

export interface FocusSignals {
  timerRunning: boolean
  elapsedSeconds: number
  appInForeground: boolean
  secondsSinceFocusLoss: number
  distractionAttemptsThisSession: number
  bypassesThisSession: number
  sessionElapsedSeconds: number
}

export interface SignalBreakdown {
  base: number
  focusLossPenalty: number
  distractionPenalty: number
  bypassPenalty: number
  idlePenalty: number
  engagementBonus: number
}

export interface ScoreResult {
  score: number
  state: 'deep' | 'focused' | 'distracted' | 'idle' | 'paused'
  breakdown: SignalBreakdown
  trend: 'rising' | 'falling' | 'flat'
}

function emptyBreakdown(): SignalBreakdown {
  return { base: 100, focusLossPenalty: 0, distractionPenalty: 0, bypassPenalty: 0, idlePenalty: 0, engagementBonus: 0 }
}

function computeFocusScore(signals: FocusSignals, previousScores: number[]): ScoreResult {
  if (!signals.timerRunning) {
    return { score: 0, state: 'paused', breakdown: emptyBreakdown(), trend: 'flat' }
  }

  let score = 100
  const breakdown: SignalBreakdown = { base: 100, focusLossPenalty: 0, distractionPenalty: 0, bypassPenalty: 0, idlePenalty: 0, engagementBonus: 0 }

  if (!signals.appInForeground) {
    const penalty = Math.min(30, signals.secondsSinceFocusLoss * 2)
    breakdown.focusLossPenalty = -penalty
    score -= penalty
  }

  if (signals.distractionAttemptsThisSession > 0) {
    const penalty = Math.min(25, signals.distractionAttemptsThisSession * 4)
    breakdown.distractionPenalty = -penalty
    score -= penalty
  }

  if (signals.bypassesThisSession > 0) {
    const penalty = Math.min(40, signals.bypassesThisSession * 15)
    breakdown.bypassPenalty = -penalty
    score -= penalty
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  const state: ScoreResult['state'] =
    score >= 80 ? 'deep' :
    score >= 60 ? 'focused' :
    score >= 30 ? 'distracted' : 'idle'

  const avg = previousScores.length > 0
    ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length
    : score
  const trend: ScoreResult['trend'] =
    score > avg + 5 ? 'rising' :
    score < avg - 5 ? 'falling' : 'flat'

  return { score, state, breakdown, trend }
}

class FocusEngineService {
  private ticker: NodeJS.Timeout | null = null
  private snapshotTicker: NodeJS.Timeout | null = null
  private scoreBuffer: number[] = []
  private currentScore: ScoreResult = { score: 0, state: 'idle', breakdown: emptyBreakdown(), trend: 'flat' }
  private currentSessionId: number | null = null
  private sessionStartTime: number = 0
  private distractionCount = 0
  private bypassCount = 0

  constructor() {
    // Track distraction events
    eventBus.on('BROWSER_BLOCKED_URL', () => this.distractionCount++)
    eventBus.on('APP_BLOCKED_ATTEMPT', () => this.distractionCount++)
    eventBus.on('BYPASS_GRANTED', () => this.bypassCount++)
  }

  start(sessionId: number): void {
    this.currentSessionId = sessionId
    this.scoreBuffer = []
    this.distractionCount = 0
    this.bypassCount = 0
    this.sessionStartTime = Date.now()

    this.ticker = setInterval(() => this.tick(), 1000)
    this.snapshotTicker = setInterval(() => this.flushSnapshot(), 10000)
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    if (this.snapshotTicker) clearInterval(this.snapshotTicker)
    this.ticker = null
    this.snapshotTicker = null
    this.flushSnapshot()
    this.computeFinalScore()
  }

  getCurrentScore(): ScoreResult {
    return this.currentScore
  }

  private tick(): void {
    const signals: FocusSignals = {
      timerRunning: timerService.isRunning(),
      elapsedSeconds: timerService.elapsed(),
      appInForeground: focusMonitorService.isInForeground(),
      secondsSinceFocusLoss: focusMonitorService.secondsSinceFocusLoss(),
      distractionAttemptsThisSession: this.distractionCount,
      bypassesThisSession: this.bypassCount,
      sessionElapsedSeconds: timerService.elapsed(),
    }

    const result = computeFocusScore(signals, this.scoreBuffer.slice(-6))
    this.scoreBuffer.push(result.score)
    if (this.scoreBuffer.length > 60) this.scoreBuffer.shift()

    this.currentScore = result

    // Send to renderer
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('focusEngine:scoreUpdated', {
        score: result.score,
        state: result.state,
        trend: result.trend,
        breakdown: result.breakdown,
      })
    }

    eventBus.emit('FOCUS_SCORE_TICK', { score: result.score, state: result.state })
  }

  private flushSnapshot(): void {
    if (!this.currentSessionId || this.scoreBuffer.length === 0) return

    try {
      const db = getDb()
      const recent = this.scoreBuffer.slice(-10)
      const avgScore = recent.reduce((a, b) => a + b, 0) / recent.length
      const minuteIndex = Math.floor((Date.now() - this.sessionStartTime) / 60000)

      db.prepare(`
        INSERT INTO focus_aggregates (session_id, minute_index, avg_score, min_score, max_score,
          score_state, distraction_count, bypass_count, was_paused, avg_engagement, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
      `).run(
        this.currentSessionId,
        minuteIndex,
        Math.round(avgScore),
        Math.min(...recent),
        Math.max(...recent),
        this.currentScore.state,
        this.distractionCount,
        this.bypassCount,
        timerService.isRunning() ? 0 : 1,
        50,
      )
    } catch {}
  }

  private computeFinalScore(): void {
    if (!this.currentSessionId || this.scoreBuffer.length === 0) return
    try {
      const db = getDb()
      const final = Math.round(this.scoreBuffer.reduce((a, b) => a + b, 0) / this.scoreBuffer.length)
      db.prepare('UPDATE sessions SET focus_score = ? WHERE id = ?').run(final, this.currentSessionId)
    } catch {}
  }
}

export const focusEngineService = new FocusEngineService()
