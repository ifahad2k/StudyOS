import { getDb } from './connection'

/**
 * Data Aggregation — runs at session end and computes daily_stats.
 */
export function aggregateSession(sessionId: number): void {
  try {
    const db = getDb()
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any
    if (!session) return

    const date = session.started_at.split('T')[0]

    const focusStats = db.prepare(`
      SELECT
        COALESCE(AVG(avg_score), 0) as avg_score,
        COALESCE(MIN(min_score), 0) as min_score,
        COALESCE(MAX(max_score), 0) as max_score
      FROM focus_aggregates WHERE session_id = ?
    `).get(sessionId) as any

    db.prepare(`
      INSERT INTO daily_stats
        (date, total_study_seconds, total_sessions, avg_focus_score,
         min_focus_score, max_focus_score, total_distraction_attempts,
         total_bypasses, total_pause_seconds, recall_submitted)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_study_seconds = total_study_seconds + excluded.total_study_seconds,
        total_sessions = total_sessions + 1,
        avg_focus_score = (avg_focus_score * (total_sessions - 1) + excluded.avg_focus_score) / total_sessions,
        total_distraction_attempts = total_distraction_attempts + excluded.total_distraction_attempts,
        total_bypasses = total_bypasses + excluded.total_bypasses,
        total_pause_seconds = total_pause_seconds + excluded.total_pause_seconds,
        recall_submitted = recall_submitted OR excluded.recall_submitted,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      date,
      session.actual_seconds || 0,
      focusStats?.avg_score || 0,
      focusStats?.min_score || 0,
      focusStats?.max_score || 0,
      session.distraction_attempts || 0,
      session.bypass_count || 0,
      session.pause_total_seconds || 0,
      session.recall_submitted || 0,
    )
  } catch (err) {
    console.error('[Aggregator] Failed:', err)
  }
}
