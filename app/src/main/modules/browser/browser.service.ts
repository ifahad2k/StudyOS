import { BrowserView, BrowserWindow } from 'electron'
import { eventBus } from '../../eventBus'
import { getDb } from '../../db/connection'
import { timerService } from '../timer/timer.service'

export interface TabState {
  id: string
  url: string
  title: string
  domain: string
  isActive: boolean
  isPinned: boolean
  favicon?: string
}

interface BrowserContentBounds {
  x: number
  y: number
  width: number
  height: number
}

class BrowserService {
  private views: Map<string, BrowserView> = new Map()
  private tabStates: Map<string, TabState> = new Map()
  private activeTabId: string | null = null
  private mainWindow: BrowserWindow | null = null
  private tabCounter = 0
  private activeSecondsTrackers: Map<string, NodeJS.Timeout> = new Map()
  private isVisible = true
  private contentBounds: BrowserContentBounds | null = null

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  newTab(url?: string): TabState {
    if (!this.mainWindow) throw new Error('BrowserService not initialized')

    const tabId = `tab-${++this.tabCounter}-${Date.now()}`
    const defaultUrl = url || 'https://www.google.com'

    const view = new BrowserView({
      webPreferences: {
        partition: 'persist:studyos-user',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    // URL filtering — whitelist check on navigation
    view.webContents.on('will-navigate', (event, navUrl) => {
      if (!this.isWhitelisted(navUrl)) {
        event.preventDefault()
        this.handleBlockedUrl(tabId, navUrl)
      }
    })

    view.webContents.on('did-start-navigation', (_event, navUrl, _isInPlace, isMainFrame) => {
      if (isMainFrame && navUrl !== 'about:blank') {
        const domain = this.extractDomain(navUrl)
        const tab = this.tabStates.get(tabId)
        if (tab) {
          tab.url = navUrl
          tab.domain = domain
          this.broadcastTabState()
        }
      }
    })

    // Handle new window requests (open in same browser)
    view.webContents.setWindowOpenHandler(({ url: newUrl }) => {
      if (this.isWhitelisted(newUrl)) {
        this.newTab(newUrl)
      } else {
        this.handleBlockedUrl(tabId, newUrl)
      }
      return { action: 'deny' }
    })

    view.webContents.on('page-title-updated', (_event, title) => {
      const tab = this.tabStates.get(tabId)
      if (tab) {
        tab.title = title
        this.broadcastTabState()
      }
    })

    const domain = this.extractDomain(defaultUrl)
    const tabState: TabState = {
      id: tabId,
      url: defaultUrl,
      title: 'New Tab',
      domain,
      isActive: true,
      isPinned: false,
    }

    this.views.set(tabId, view)
    this.tabStates.set(tabId, tabState)

    // Load URL
    view.webContents.loadURL(defaultUrl).catch(() => {
      // If blocked, will be handled by will-navigate
    })

    // Switch to this tab
    this.switchTab(tabId)

    // Track session in DB
    try {
      const db = getDb()
      const sessionId = timerService.getCurrentSessionId()
      db.prepare(`
        INSERT INTO tab_sessions (session_id, tab_id, url, domain, title, opened_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sessionId, tabId, defaultUrl, domain, 'New Tab', new Date().toISOString())
    } catch {}

    eventBus.emit('BROWSER_TAB_OPENED', { tabId, url: defaultUrl, domain })

    return tabState
  }

  closeTab(tabId: string): void {
    const view = this.views.get(tabId)
    if (!view) return

    // Stop tracking
    const tracker = this.activeSecondsTrackers.get(tabId)
    if (tracker) clearInterval(tracker)
    this.activeSecondsTrackers.delete(tabId)

    // Remove from window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        this.mainWindow.removeBrowserView(view)
      } catch {}
    }

    // Destroy the view
    try { (view.webContents as any).destroy?.() } catch {}

    this.views.delete(tabId)
    this.tabStates.delete(tabId)

    // Update DB
    try {
      const db = getDb()
      db.prepare(`UPDATE tab_sessions SET closed_at = ? WHERE tab_id = ? AND closed_at IS NULL`)
        .run(new Date().toISOString(), tabId)
    } catch {}

    eventBus.emit('BROWSER_TAB_CLOSED', { tabId })

    // Switch to another tab or clear
    if (this.activeTabId === tabId) {
      const remaining = Array.from(this.tabStates.keys())
      if (remaining.length > 0) {
        this.switchTab(remaining[remaining.length - 1])
      } else {
        this.activeTabId = null
      }
    }

    this.broadcastTabState()
  }

  switchTab(tabId: string): void {
    if (!this.mainWindow) return

    // Hide old active view
    if (this.activeTabId && this.activeTabId !== tabId) {
      const oldView = this.views.get(this.activeTabId)
      if (oldView) {
        try { this.mainWindow.removeBrowserView(oldView) } catch {}
      }
      const oldTab = this.tabStates.get(this.activeTabId)
      if (oldTab) oldTab.isActive = false

      // Stop old tracker
      const tracker = this.activeSecondsTrackers.get(this.activeTabId)
      if (tracker) clearInterval(tracker)
      this.activeSecondsTrackers.delete(this.activeTabId)
    }

    const view = this.views.get(tabId)
    if (!view) return

    this.activeTabId = tabId
    const tab = this.tabStates.get(tabId)
    if (tab) tab.isActive = true

    // Add and position BrowserView only when Browser module is active.
    if (this.isVisible) {
      this.mainWindow.addBrowserView(view)
      this.updateViewBounds(view)
    }

    // Track active seconds
    this.startActiveTracker(tabId)

    eventBus.emit('BROWSER_TAB_SWITCHED', { tabId, domain: tab?.domain })
    this.broadcastTabState()
  }

  navigate(tabId: string, url: string): void {
    const view = this.views.get(tabId)
    if (!view) return

    // Ensure URL has protocol
    let finalUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Check if it looks like a search query or a domain
      if (url.includes('.') && !url.includes(' ')) {
        finalUrl = `https://${url}`
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`
      }
    }

    if (!this.isWhitelisted(finalUrl)) {
      this.handleBlockedUrl(tabId, finalUrl)
      return
    }

    view.webContents.loadURL(finalUrl).catch(() => {})
    eventBus.emit('BROWSER_NAVIGATED', { tabId, url: finalUrl, domain: this.extractDomain(finalUrl) })
  }

  goBack(tabId: string): void {
    const view = this.views.get(tabId)
    if (view?.webContents.canGoBack()) view.webContents.goBack()
  }

  goForward(tabId: string): void {
    const view = this.views.get(tabId)
    if (view?.webContents.canGoForward()) view.webContents.goForward()
  }

  reload(tabId: string): void {
    const view = this.views.get(tabId)
    view?.webContents.reload()
  }

  pinTab(tabId: string, pinned: boolean): void {
    const tab = this.tabStates.get(tabId)
    if (tab) {
      tab.isPinned = pinned
      this.broadcastTabState()
    }
  }

  getTabs(): TabState[] {
    return Array.from(this.tabStates.values())
  }

  getActiveTabDomain(): string | null {
    if (!this.activeTabId) return null
    return this.tabStates.get(this.activeTabId)?.domain || null
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (!visible) {
      for (const view of this.views.values()) {
        try { this.mainWindow.removeBrowserView(view) } catch {}
      }
      return
    }

    if (!this.activeTabId) return
    const activeView = this.views.get(this.activeTabId)
    if (!activeView) return
    this.mainWindow.addBrowserView(activeView)
    this.updateViewBounds(activeView)
  }

  setContentBounds(bounds: BrowserContentBounds): void {
    this.contentBounds = bounds
    this.updateViewBounds()
  }

  // ─── Whitelist Logic ───

  isWhitelisted(url: string): boolean {
    try {
      const domain = this.extractDomain(url)
      const db = getDb()
      const patterns = db.prepare('SELECT pattern FROM whitelist WHERE enabled = 1').all() as { pattern: string }[]

      for (const { pattern } of patterns) {
        if (this.matchPattern(domain, pattern)) return true
      }

      // Allow local/internal URLs
      if (domain === 'localhost' || domain.startsWith('127.') || url.startsWith('chrome') || url === 'about:blank') {
        return true
      }

      return false
    } catch {
      return true // Fail open if DB error
    }
  }

  private matchPattern(domain: string, pattern: string): boolean {
    // Handle wildcard patterns like *.google.com
    const cleaned = pattern.replace(/^\*\./, '')
    return domain === cleaned || domain.endsWith(`.${cleaned}`)
  }

  private handleBlockedUrl(tabId: string, url: string): void {
    const domain = this.extractDomain(url)

    // Log distraction attempt
    try {
      const db = getDb()
      const sessionId = timerService.getCurrentSessionId()
      db.prepare(`
        INSERT INTO distraction_attempts (session_id, type, target, domain, elapsed_seconds, attempted_at)
        VALUES (?, 'url', ?, ?, ?, ?)
      `).run(sessionId, url, domain, timerService.elapsed(), new Date().toISOString())
    } catch {}

    eventBus.emit('BROWSER_BLOCKED_URL', { url, domain, tabId })

    // Notify renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('browser:siteBlocked', { url, domain, tabId })
    }
  }

  addToWhitelist(pattern: string): void {
    try {
      const db = getDb()
      db.prepare('INSERT OR IGNORE INTO whitelist (pattern) VALUES (?)').run(pattern)
    } catch {}
  }

  removeFromWhitelist(pattern: string): void {
    try {
      const db = getDb()
      db.prepare('DELETE FROM whitelist WHERE pattern = ?').run(pattern)
    } catch {}
  }

  requestBypass(tabId: string, url: string): void {
    // Allow one-time bypass
    const view = this.views.get(tabId)
    if (view) {
      try {
        const db = getDb()
        const sessionId = timerService.getCurrentSessionId()
        db.prepare(`
          UPDATE distraction_attempts SET was_bypassed = 1
          WHERE session_id = ? AND target = ? AND was_bypassed = 0
          ORDER BY id DESC LIMIT 1
        `).run(sessionId, url)
      } catch {}

      eventBus.emit('BYPASS_GRANTED', { url, tabId })
      view.webContents.loadURL(url).catch(() => {})
    }
  }

  // ─── Helpers ───

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  private startActiveTracker(tabId: string) {
    const tracker = setInterval(() => {
      if (timerService.isRunning()) {
        try {
          const db = getDb()
          db.prepare('UPDATE tab_sessions SET active_seconds = active_seconds + 1 WHERE tab_id = ? AND closed_at IS NULL')
            .run(tabId)
        } catch {}
      }
    }, 1000)
    this.activeSecondsTrackers.set(tabId, tracker)
  }

  private broadcastTabState(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    this.mainWindow.webContents.send('browser:tabsUpdated', {
      tabs: this.getTabs(),
      activeTabId: this.activeTabId,
    })
  }

  updateViewBounds(view?: BrowserView): void {
    if (!this.mainWindow) return
    const targetView = view || (this.activeTabId ? this.views.get(this.activeTabId) : null)
    if (!targetView || !this.isVisible) return

    if (this.contentBounds) {
      targetView.setBounds({
        x: this.contentBounds.x,
        y: this.contentBounds.y,
        width: Math.max(0, this.contentBounds.width),
        height: Math.max(0, this.contentBounds.height),
      })
      return
    }

    // Fallback in case renderer has not sent measured bounds yet.
    const bounds = this.mainWindow.getBounds()
    targetView.setBounds({
      x: 64,
      y: 148,
      width: Math.max(0, bounds.width - 64),
      height: Math.max(0, bounds.height - 148),
    })
  }

  cleanup(): void {
    for (const [tabId] of this.views) {
      this.closeTab(tabId)
    }
  }
}

export const browserService = new BrowserService()
