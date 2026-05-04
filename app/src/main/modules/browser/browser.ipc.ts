import { ipcMain, BrowserWindow } from 'electron'
import { browserService } from './browser.service'
import { getDb } from '../../db/connection'

export function registerBrowserIPC(): void {
  ipcMain.handle('browser:newTab', (_e, data?: { url?: string }) => {
    return browserService.newTab(data?.url)
  })

  ipcMain.handle('browser:closeTab', (_e, data: { tabId: string }) => {
    browserService.closeTab(data.tabId)
  })

  ipcMain.handle('browser:switchTab', (_e, data: { tabId: string }) => {
    browserService.switchTab(data.tabId)
  })

  ipcMain.handle('browser:navigate', (_e, data: { tabId: string; url: string }) => {
    browserService.navigate(data.tabId, data.url)
  })

  ipcMain.handle('browser:goBack', (_e, data: { tabId: string }) => {
    browserService.goBack(data.tabId)
  })

  ipcMain.handle('browser:goForward', (_e, data: { tabId: string }) => {
    browserService.goForward(data.tabId)
  })

  ipcMain.handle('browser:reload', (_e, data: { tabId: string }) => {
    browserService.reload(data.tabId)
  })

  ipcMain.handle('browser:pinTab', (_e, data: { tabId: string; pinned: boolean }) => {
    browserService.pinTab(data.tabId, data.pinned)
  })

  ipcMain.handle('browser:getTabs', () => {
    return browserService.getTabs()
  })

  ipcMain.handle('browser:getHistory', (_e, data?: { limit?: number; query?: string }) => {
    return browserService.getHistory(data)
  })

  ipcMain.handle('browser:clearHistory', () => {
    browserService.clearHistory()
  })

  ipcMain.handle('browser:requestBypass', (_e, data: { tabId: string; url: string }) => {
    browserService.requestBypass(data.tabId, data.url)
  })

  ipcMain.handle('browser:setVisibility', (_e, data: { visible: boolean }) => {
    browserService.setVisible(data.visible)
  })

  ipcMain.handle('browser:updateBounds', (_e, data: { x: number; y: number; width: number; height: number }) => {
    browserService.setContentBounds(data)
  })

  // Whitelist management
  ipcMain.handle('whitelist:get', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM whitelist ORDER BY pattern').all()
  })

  ipcMain.handle('whitelist:add', (_e, data: { pattern: string }) => {
    browserService.addToWhitelist(data.pattern)
    const db = getDb()
    return db.prepare('SELECT * FROM whitelist ORDER BY pattern').all()
  })

  ipcMain.handle('whitelist:remove', (_e, data: { pattern: string }) => {
    browserService.removeFromWhitelist(data.pattern)
    const db = getDb()
    return db.prepare('SELECT * FROM whitelist ORDER BY pattern').all()
  })

  ipcMain.handle('whitelist:toggle', (_e, data: { pattern: string; enabled: boolean }) => {
    const db = getDb()
    db.prepare('UPDATE whitelist SET enabled = ? WHERE pattern = ?').run(data.enabled ? 1 : 0, data.pattern)
    return db.prepare('SELECT * FROM whitelist ORDER BY pattern').all()
  })

  // Blocklist management
  ipcMain.handle('blocklist:get', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM blocklist ORDER BY process_name').all()
  })

  ipcMain.handle('blocklist:add', (_e, data: { processName: string }) => {
    const db = getDb()
    db.prepare('INSERT OR IGNORE INTO blocklist (process_name) VALUES (?)').run(data.processName.toLowerCase())
    return db.prepare('SELECT * FROM blocklist ORDER BY process_name').all()
  })

  ipcMain.handle('blocklist:remove', (_e, data: { processName: string }) => {
    const db = getDb()
    db.prepare('DELETE FROM blocklist WHERE process_name = ?').run(data.processName)
    return db.prepare('SELECT * FROM blocklist ORDER BY process_name').all()
  })

  ipcMain.handle('blocklist:toggle', (_e, data: { processName: string; enabled: boolean }) => {
    const db = getDb()
    db.prepare('UPDATE blocklist SET enabled = ? WHERE process_name = ?').run(data.enabled ? 1 : 0, data.processName)
    return db.prepare('SELECT * FROM blocklist ORDER BY process_name').all()
  })
}
