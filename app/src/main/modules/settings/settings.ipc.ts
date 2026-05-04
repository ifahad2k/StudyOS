import { ipcMain } from 'electron'
import { getDb } from '../../db/connection'

export function registerSettingsIPC(): void {
  ipcMain.handle('settings:get', (_e, key: string) => {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row ? JSON.parse(row.value) : null
  })

  ipcMain.handle('settings:getAll', () => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value, section FROM settings').all() as { key: string; value: string; section: string }[]
    const result: Record<string, unknown> = {}
    for (const row of rows) {
      result[row.key] = JSON.parse(row.value)
    }
    return result
  })

  ipcMain.handle('settings:set', (_e, data: { key: string; value: unknown }) => {
    const db = getDb()
    db.prepare(`
      UPDATE settings SET value = ?, updated_at = ? WHERE key = ?
    `).run(JSON.stringify(data.value), new Date().toISOString(), data.key)
    return true
  })

  ipcMain.handle('settings:setMany', (_e, data: { pairs: { key: string; value: unknown }[] }) => {
    const db = getDb()
    const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
    const transaction = db.transaction(() => {
      for (const pair of data.pairs) {
        stmt.run(JSON.stringify(pair.value), new Date().toISOString(), pair.key)
      }
    })
    transaction()
    return true
  })

  ipcMain.handle('settings:reset', (_e, key?: string) => {
    // Re-run the default settings INSERT OR IGNORE
    // For a full reset, just re-init the schema
    return true
  })

  // Analytics queries
  ipcMain.handle('analytics:getDaily', (_e, data: { date: string }) => {
    const db = getDb()
    return db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(data.date)
  })

  ipcMain.handle('analytics:getWeekly', (_e, data: { startDate: string }) => {
    const db = getDb()
    return db.prepare('SELECT * FROM daily_stats WHERE date >= ? ORDER BY date ASC').all(data.startDate)
  })

  ipcMain.handle('analytics:getSessions', (_e, data?: { limit?: number }) => {
    const db = getDb()
    return db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?').all(data?.limit || 50)
  })

  ipcMain.handle('analytics:getSubjectBreakdown', () => {
    const db = getDb()
    return db.prepare(`
      SELECT subject, SUM(actual_seconds) as total_seconds, COUNT(*) as session_count,
             AVG(focus_score) as avg_focus
      FROM sessions WHERE ended_at IS NOT NULL
      GROUP BY subject ORDER BY total_seconds DESC
    `).all()
  })

  ipcMain.handle('analytics:getTabReport', () => {
    const db = getDb()
    return db.prepare(`
      SELECT domain, SUM(active_seconds) as total_seconds, COUNT(*) as visit_count
      FROM tab_sessions
      GROUP BY domain ORDER BY total_seconds DESC LIMIT 20
    `).all()
  })

  ipcMain.handle('analytics:getDistractionReport', () => {
    const db = getDb()
    return db.prepare(`
      SELECT target, domain, COUNT(*) as attempts, SUM(was_bypassed) as bypassed
      FROM distraction_attempts
      GROUP BY target ORDER BY attempts DESC LIMIT 20
    `).all()
  })

  // Quick start
  ipcMain.handle('quickstart:getState', () => {
    const db = getDb()
    const state = db.prepare('SELECT * FROM quick_start_state WHERE profile_name = ? ORDER BY updated_at DESC LIMIT 1')
      .get('default') as any
    if (state) {
      state.browser_tabs = JSON.parse(state.browser_tabs || '[]')
      state.last_pdf = JSON.parse(state.last_pdf || '{}')
    }
    return state
  })

  ipcMain.handle('quickstart:saveState', (_e, data: { subject: string; mode: string; browserTabs: any[]; lastPdf: any }) => {
    const db = getDb()
    db.prepare(`
      INSERT INTO quick_start_state (profile_name, subject, mode, browser_tabs, last_pdf, updated_at)
      VALUES ('default', ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(data.subject, data.mode, JSON.stringify(data.browserTabs), JSON.stringify(data.lastPdf), new Date().toISOString())

    // Also update if exists
    db.prepare(`
      UPDATE quick_start_state SET subject = ?, mode = ?, browser_tabs = ?, last_pdf = ?, updated_at = ?
      WHERE profile_name = 'default'
    `).run(data.subject, data.mode, JSON.stringify(data.browserTabs), JSON.stringify(data.lastPdf), new Date().toISOString())
  })

  // Session replay
  ipcMain.handle('replay:getTimeline', (_e, data: { sessionId: number }) => {
    const db = getDb()
    return db.prepare('SELECT * FROM session_events WHERE session_id = ? ORDER BY occurred_at ASC').all(data.sessionId)
  })

  ipcMain.handle('replay:getSummary', (_e, data: { sessionId: number }) => {
    const db = getDb()
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(data.sessionId)
    const events = db.prepare('SELECT COUNT(*) as count FROM session_events WHERE session_id = ?').get(data.sessionId) as any
    const pauses = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(duration_seconds),0) as total FROM pauses WHERE session_id = ?').get(data.sessionId) as any
    const distractions = db.prepare('SELECT COUNT(*) as count FROM distraction_attempts WHERE session_id = ?').get(data.sessionId) as any
    return { session, eventCount: events?.count, pauseCount: pauses?.count, pauseTotal: pauses?.total, distractionCount: distractions?.count }
  })
}
