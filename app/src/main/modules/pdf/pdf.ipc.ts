import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getDb } from '../../db/connection'
import { eventBus } from '../../eventBus'
import { timerService } from '../timer/timer.service'
import { createHash } from 'crypto'

function hashPath(filePath: string): string {
  return createHash('md5').update(filePath).digest('hex')
}

export function registerPdfIPC(): void {
  ipcMain.handle('pdf:openDialog', async () => {
    const win = BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('pdf:open', (_e, data: { filePath: string }) => {
    const hash = hashPath(data.filePath)
    const fileName = data.filePath.split(/[\\/]/).pop() || 'Unknown'
    const db = getDb()
    const sessionId = timerService.getCurrentSessionId()

    // Log PDF session
    db.prepare(`
      INSERT INTO pdf_sessions (session_id, file_path, file_path_hash, file_name, opened_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, data.filePath, hash, fileName, new Date().toISOString())

    // Get saved state
    const state = db.prepare('SELECT * FROM pdf_state WHERE file_path_hash = ?').get(hash) as any

    // Update last opened
    db.prepare(`
      INSERT INTO pdf_state (file_path_hash, file_path, last_opened)
      VALUES (?, ?, ?)
      ON CONFLICT(file_path_hash) DO UPDATE SET last_opened = excluded.last_opened
    `).run(hash, data.filePath, new Date().toISOString())

    eventBus.emit('PDF_OPENED', { filePath: data.filePath, fileName, hash })

    return {
      filePath: data.filePath,
      hash,
      fileName,
      savedState: state || { last_page: 1, zoom_level: 100, sidebar_open: true },
    }
  })

  ipcMain.handle('pdf:close', (_e, data: { filePath: string }) => {
    const hash = hashPath(data.filePath)
    const db = getDb()
    db.prepare(`
      UPDATE pdf_sessions SET closed_at = ? WHERE file_path_hash = ? AND closed_at IS NULL
    `).run(new Date().toISOString(), hash)
    eventBus.emit('PDF_CLOSED', { filePath: data.filePath })
  })

  ipcMain.handle('pdf:saveState', (_e, data: { filePathHash: string; page: number; zoom: number; sidebarOpen: boolean }) => {
    const db = getDb()
    db.prepare(`
      UPDATE pdf_state SET last_page = ?, zoom_level = ?, sidebar_open = ?
      WHERE file_path_hash = ?
    `).run(data.page, data.zoom, data.sidebarOpen ? 1 : 0, data.filePathHash)
  })

  ipcMain.handle('pdf:getState', (_e, data: { filePathHash: string }) => {
    const db = getDb()
    return db.prepare('SELECT * FROM pdf_state WHERE file_path_hash = ?').get(data.filePathHash)
  })

  ipcMain.handle('pdf:saveAnnotation', (_e, data: {
    filePathHash: string; pageNumber: number; type: string;
    content: string; positionData?: string; color?: string
  }) => {
    const db = getDb()
    db.prepare(`
      INSERT INTO pdf_annotations (file_path_hash, page_number, type, content, position_data, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.filePathHash, data.pageNumber, data.type, data.content, data.positionData || '{}', data.color || '#F5A623')
    eventBus.emit('PDF_ANNOTATED', { filePathHash: data.filePathHash, page: data.pageNumber, type: data.type })
    return db.prepare('SELECT * FROM pdf_annotations WHERE file_path_hash = ? ORDER BY page_number').all(data.filePathHash)
  })

  ipcMain.handle('pdf:deleteAnnotation', (_e, data: { annotationId: number }) => {
    const db = getDb()
    db.prepare('DELETE FROM pdf_annotations WHERE id = ?').run(data.annotationId)
  })

  ipcMain.handle('pdf:getAnnotations', (_e, data: { filePathHash: string }) => {
    const db = getDb()
    return db.prepare('SELECT * FROM pdf_annotations WHERE file_path_hash = ? AND is_archived = 0 ORDER BY page_number').all(data.filePathHash)
  })
}
