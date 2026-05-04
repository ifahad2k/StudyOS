import { ipcMain } from 'electron'
import { getDb } from '../../db/connection'
import { eventBus } from '../../eventBus'
import { timerService } from '../timer/timer.service'

export function registerRecallIPC(): void {
  ipcMain.handle('recall:submit', (_e, data: { sessionId: number; subject: string; learned: string[]; questions: string[] }) => {
    const db = getDb()

    // Save recall entry
    const result = db.prepare(`
      INSERT INTO recall_entries (session_id, subject, learned, questions)
      VALUES (?, ?, ?, ?)
    `).run(data.sessionId, data.subject, JSON.stringify(data.learned), JSON.stringify(data.questions))

    const recallEntryId = result.lastInsertRowid as number

    // Add questions to revision queue
    for (const q of data.questions) {
      if (q.trim()) {
        db.prepare(`
          INSERT INTO revision_queue (recall_entry_id, session_id, subject, question)
          VALUES (?, ?, ?, ?)
        `).run(recallEntryId, data.sessionId, data.subject, q.trim())
      }
    }

    // Mark session as recall submitted
    db.prepare('UPDATE sessions SET recall_submitted = 1 WHERE id = ?').run(data.sessionId)

    eventBus.emit('RECALL_SUBMITTED', {
      sessionId: data.sessionId,
      learnedCount: data.learned.length,
      questionsCount: data.questions.length,
    })

    return { success: true }
  })

  ipcMain.handle('recall:skip', (_e, data: { sessionId: number }) => {
    const db = getDb()
    const session = db.prepare('SELECT subject FROM sessions WHERE id = ?').get(data.sessionId) as any

    db.prepare(`
      INSERT INTO recall_entries (session_id, subject, was_skipped)
      VALUES (?, ?, 1)
    `).run(data.sessionId, session?.subject || 'Unknown')

    eventBus.emit('RECALL_SKIPPED', { sessionId: data.sessionId })
    return { success: true }
  })

  ipcMain.handle('recall:getQueue', () => {
    const db = getDb()
    return db.prepare(`
      SELECT rq.*, re.session_id as origin_session_id
      FROM revision_queue rq
      LEFT JOIN recall_entries re ON rq.recall_entry_id = re.id
      WHERE rq.status = 'unresolved'
        OR (rq.status = 'snoozed' AND rq.snooze_until <= datetime('now'))
      ORDER BY rq.created_at ASC
    `).all()
  })

  ipcMain.handle('recall:resolveItem', (_e, data: { itemId: number; note?: string }) => {
    const db = getDb()
    db.prepare(`
      UPDATE revision_queue SET status = 'resolved', resolved_at = ?, resolution_note = ?, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), data.note || null, new Date().toISOString(), data.itemId)
    eventBus.emit('REVISION_RESOLVED', { itemId: data.itemId })
  })

  ipcMain.handle('recall:snoozeItem', (_e, data: { itemId: number; days: number }) => {
    const db = getDb()
    const snoozeUntil = new Date(Date.now() + data.days * 86400000).toISOString()
    db.prepare(`
      UPDATE revision_queue SET status = 'snoozed', snooze_until = ?, updated_at = ?
      WHERE id = ?
    `).run(snoozeUntil, new Date().toISOString(), data.itemId)
  })

  ipcMain.handle('recall:archiveItem', (_e, data: { itemId: number }) => {
    const db = getDb()
    db.prepare(`UPDATE revision_queue SET status = 'archived', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), data.itemId)
  })

  ipcMain.handle('recall:getPreSession', (_e, data: { subject: string }) => {
    const db = getDb()
    const lastRecall = db.prepare(`
      SELECT * FROM recall_entries
      WHERE subject = ? AND was_skipped = 0
      ORDER BY created_at DESC LIMIT 1
    `).get(data.subject) as any

    const queueCount = db.prepare(`
      SELECT COUNT(*) as count FROM revision_queue
      WHERE subject = ? AND status = 'unresolved'
    `).get(data.subject) as any

    return {
      lastRecall: lastRecall ? {
        ...lastRecall,
        learned: JSON.parse(lastRecall.learned || '[]'),
        questions: JSON.parse(lastRecall.questions || '[]'),
      } : null,
      queueCount: queueCount?.count || 0,
    }
  })
}
