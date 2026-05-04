import { ipcMain } from 'electron'
import { getDb } from '../../db/connection'
import { format, subDays, eachDayOfInterval } from 'date-fns'

export function registerStreakIPC(): void {
  ipcMain.handle('streak:getState', () => {
    return computeStreakState()
  })

  ipcMain.handle('streak:getCalendar', (_e, data?: { months?: number }) => {
    const months = data?.months || 3
    const db = getDb()
    const startDate = format(subDays(new Date(), months * 30), 'yyyy-MM-dd')
    const days = db.prepare(`
      SELECT * FROM streak_days WHERE date >= ? ORDER BY date ASC
    `).all(startDate)
    return days
  })

  ipcMain.handle('streak:getHistory', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM streak_history ORDER BY start_date DESC LIMIT 10').all()
  })
}

export function computeStreakState() {
  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')

  // Get last 90 days of streak data
  const days = db.prepare(`
    SELECT * FROM streak_days WHERE date >= ? ORDER BY date DESC
  `).all(format(subDays(new Date(), 90), 'yyyy-MM-dd')) as any[]

  // Calculate current streak
  let currentStreak = 0
  let bestStreak = 0
  let graceUsed = false
  let consecutiveMisses = 0

  const allDays = eachDayOfInterval({
    start: subDays(new Date(), 90),
    end: new Date(),
  }).reverse()

  for (const day of allDays) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayData = days.find((d: any) => d.date === dateStr)

    if (dayData?.is_valid) {
      currentStreak++
      consecutiveMisses = 0
    } else if (dayData?.grace_used) {
      currentStreak++
      graceUsed = true
      consecutiveMisses = 0
    } else {
      consecutiveMisses++
      if (consecutiveMisses >= 2 || (consecutiveMisses >= 1 && currentStreak < 7)) {
        break
      }
    }

    if (currentStreak > bestStreak) bestStreak = currentStreak
  }

  // Get all-time best from history
  const bestHistory = db.prepare('SELECT MAX(length_days) as best FROM streak_history').get() as any
  if (bestHistory?.best && bestHistory.best > bestStreak) {
    bestStreak = bestHistory.best
  }

  // Check if today is valid
  const todayData = days.find((d: any) => d.date === today)

  return {
    current: currentStreak,
    best: bestStreak,
    todayValid: todayData?.is_valid || false,
    graceUsed,
    todayStudySeconds: todayData?.study_seconds || 0,
    todaySessionCount: todayData?.session_count || 0,
    todayFocusScore: todayData?.focus_score || 0,
  }
}

export function updateStreakDay(sessionId: number): void {
  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')

  // Get today's session stats
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(actual_seconds), 0) as total_seconds,
      COUNT(*) as session_count,
      COALESCE(AVG(focus_score), 0) as avg_focus
    FROM sessions
    WHERE date(started_at) = ? AND ended_at IS NOT NULL
  `).get(today) as any

  const isValid = stats.total_seconds >= 1200 && stats.session_count >= 1 && stats.avg_focus >= 40

  db.prepare(`
    INSERT INTO streak_days (date, is_valid, study_seconds, session_count, focus_score, recall_done)
    VALUES (?, ?, ?, ?, ?, 0)
    ON CONFLICT(date) DO UPDATE SET
      is_valid = excluded.is_valid,
      study_seconds = excluded.study_seconds,
      session_count = excluded.session_count,
      focus_score = excluded.focus_score
  `).run(today, isValid ? 1 : 0, stats.total_seconds, stats.session_count, stats.avg_focus)
}
