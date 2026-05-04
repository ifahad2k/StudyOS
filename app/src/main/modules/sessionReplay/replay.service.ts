import { eventBus } from '../../eventBus'
import { isReplayRelevant } from '../../eventFilter'
import { getDb } from '../../db/connection'

/**
 * Replay Service — listens to all events but only stores REPLAY_RELEVANT ones.
 * Expected volume: 5–30 rows per hour (not 3600+).
 */
class ReplayService {
  private currentSessionId: number | null = null

  init(): void {
    // Listen to ALL EventBus events
    const originalEmit = eventBus.emit.bind(eventBus)
    eventBus.emit = (event: string, data?: any): boolean => {
      // Store if replay-relevant and we have an active session
      if (this.currentSessionId && isReplayRelevant(event)) {
        try {
          const db = getDb()
          db.prepare(`
            INSERT INTO session_events (session_id, event_type, event_data, occurred_at)
            VALUES (?, ?, ?, ?)
          `).run(this.currentSessionId, event, JSON.stringify(data || {}), Date.now())
        } catch {}
      }
      return originalEmit(event, data)
    }

    eventBus.on('SESSION_STARTED', (data: any) => {
      this.currentSessionId = data.sessionId
    })

    eventBus.on('SESSION_ENDED', () => {
      this.currentSessionId = null
    })
  }
}

export const replayService = new ReplayService()
