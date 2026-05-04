import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Window controls
  window: {
    minimize:        () => ipcRenderer.invoke('window:minimize'),
    maximize:        () => ipcRenderer.invoke('window:maximize'),
    close:           () => ipcRenderer.invoke('window:close'),
    isMaximized:     () => ipcRenderer.invoke('window:isMaximized'),
    isFullscreen:    () => ipcRenderer.invoke('window:isFullscreen'),
    enterFullscreen: () => ipcRenderer.invoke('window:enterFullscreen'),
    exitFullscreen:  () => ipcRenderer.invoke('window:exitFullscreen'),
  },

  // Timer
  timer: {
    start:     (data: { subject: string; mode: string; duration?: number }) => ipcRenderer.invoke('timer:start', data),
    pause:     (data?: { reason?: string }) => ipcRenderer.invoke('timer:pause', data),
    resume:    () => ipcRenderer.invoke('timer:resume'),
    end:       () => ipcRenderer.invoke('timer:end'),
    getState:  () => ipcRenderer.invoke('timer:getState'),
  },

  // Browser
  browser: {
    newTab:         (data?: { url?: string }) => ipcRenderer.invoke('browser:newTab', data),
    closeTab:       (data: { tabId: string }) => ipcRenderer.invoke('browser:closeTab', data),
    switchTab:      (data: { tabId: string }) => ipcRenderer.invoke('browser:switchTab', data),
    navigate:       (data: { tabId: string; url: string }) => ipcRenderer.invoke('browser:navigate', data),
    goBack:         (data: { tabId: string }) => ipcRenderer.invoke('browser:goBack', data),
    goForward:      (data: { tabId: string }) => ipcRenderer.invoke('browser:goForward', data),
    reload:         (data: { tabId: string }) => ipcRenderer.invoke('browser:reload', data),
    pinTab:         (data: { tabId: string; pinned: boolean }) => ipcRenderer.invoke('browser:pinTab', data),
    getTabs:        () => ipcRenderer.invoke('browser:getTabs'),
    requestBypass:  (data: { tabId: string; url: string }) => ipcRenderer.invoke('browser:requestBypass', data),
    setVisibility:  (data: { visible: boolean }) => ipcRenderer.invoke('browser:setVisibility', data),
  },

  // Whitelist / Blocklist
  whitelist: {
    get:     () => ipcRenderer.invoke('whitelist:get'),
    add:     (data: { pattern: string }) => ipcRenderer.invoke('whitelist:add', data),
    remove:  (data: { pattern: string }) => ipcRenderer.invoke('whitelist:remove', data),
    toggle:  (data: { pattern: string; enabled: boolean }) => ipcRenderer.invoke('whitelist:toggle', data),
  },
  blocklist: {
    get:     () => ipcRenderer.invoke('blocklist:get'),
    add:     (data: { processName: string }) => ipcRenderer.invoke('blocklist:add', data),
    remove:  (data: { processName: string }) => ipcRenderer.invoke('blocklist:remove', data),
    toggle:  (data: { processName: string; enabled: boolean }) => ipcRenderer.invoke('blocklist:toggle', data),
  },

  // PDF
  pdf: {
    openDialog:       () => ipcRenderer.invoke('pdf:openDialog'),
    open:             (data: { filePath: string }) => ipcRenderer.invoke('pdf:open', data),
    close:            (data: { filePath: string }) => ipcRenderer.invoke('pdf:close', data),
    saveState:        (data: { filePathHash: string; page: number; zoom: number; sidebarOpen: boolean }) => ipcRenderer.invoke('pdf:saveState', data),
    getState:         (data: { filePathHash: string }) => ipcRenderer.invoke('pdf:getState', data),
    saveAnnotation:   (data: any) => ipcRenderer.invoke('pdf:saveAnnotation', data),
    deleteAnnotation: (data: { annotationId: number }) => ipcRenderer.invoke('pdf:deleteAnnotation', data),
    getAnnotations:   (data: { filePathHash: string }) => ipcRenderer.invoke('pdf:getAnnotations', data),
  },

  // Active Recall
  recall: {
    submit:      (data: { sessionId: number; subject: string; learned: string[]; questions: string[] }) => ipcRenderer.invoke('recall:submit', data),
    skip:        (data: { sessionId: number }) => ipcRenderer.invoke('recall:skip', data),
    getQueue:    () => ipcRenderer.invoke('recall:getQueue'),
    resolveItem: (data: { itemId: number; note?: string }) => ipcRenderer.invoke('recall:resolveItem', data),
    snoozeItem:  (data: { itemId: number; days: number }) => ipcRenderer.invoke('recall:snoozeItem', data),
    archiveItem: (data: { itemId: number }) => ipcRenderer.invoke('recall:archiveItem', data),
    getPreSession: (data: { subject: string }) => ipcRenderer.invoke('recall:getPreSession', data),
  },

  // Streak
  streak: {
    getState:    () => ipcRenderer.invoke('streak:getState'),
    getCalendar: (data?: { months?: number }) => ipcRenderer.invoke('streak:getCalendar', data),
    getHistory:  () => ipcRenderer.invoke('streak:getHistory'),
  },

  // Settings
  settings: {
    get:     (key: string) => ipcRenderer.invoke('settings:get', key),
    getAll:  () => ipcRenderer.invoke('settings:getAll'),
    set:     (data: { key: string; value: unknown }) => ipcRenderer.invoke('settings:set', data),
    setMany: (data: { pairs: { key: string; value: unknown }[] }) => ipcRenderer.invoke('settings:setMany', data),
  },

  // Analytics
  analytics: {
    getDaily:            (data: { date: string }) => ipcRenderer.invoke('analytics:getDaily', data),
    getWeekly:           (data: { startDate: string }) => ipcRenderer.invoke('analytics:getWeekly', data),
    getSessions:         (data?: { limit?: number }) => ipcRenderer.invoke('analytics:getSessions', data),
    getSubjectBreakdown: () => ipcRenderer.invoke('analytics:getSubjectBreakdown'),
    getTabReport:        () => ipcRenderer.invoke('analytics:getTabReport'),
    getDistractionReport:() => ipcRenderer.invoke('analytics:getDistractionReport'),
  },

  // Quick Start
  quickstart: {
    getState:  () => ipcRenderer.invoke('quickstart:getState'),
    saveState: (data: any) => ipcRenderer.invoke('quickstart:saveState', data),
  },

  // Replay
  replay: {
    getTimeline: (data: { sessionId: number }) => ipcRenderer.invoke('replay:getTimeline', data),
    getSummary:  (data: { sessionId: number }) => ipcRenderer.invoke('replay:getSummary', data),
  },

  // Event listeners (Main → Renderer)
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
