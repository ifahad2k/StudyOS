import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase } from './db/connection'
import { eventBus } from './eventBus'
import { registerTimerIPC } from './modules/timer/timer.ipc'
import { registerBrowserIPC } from './modules/browser/browser.ipc'
import { registerPdfIPC } from './modules/pdf/pdf.ipc'
import { registerRecallIPC } from './modules/activeRecall/activeRecall.ipc'
import { registerStreakIPC, updateStreakDay } from './modules/streak/streak.ipc'
import { registerSettingsIPC } from './modules/settings/settings.ipc'
import { browserService } from './modules/browser/browser.service'
import { focusMonitorService } from './modules/focusMonitor/focusMonitor.service'
import { focusEngineService } from './modules/focusEngine/focusEngine.service'
import { replayService } from './modules/sessionReplay/replay.service'
import { aggregateSession } from './db/aggregator'
import { timerService } from './modules/timer/timer.service'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0D0F14',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  })

  // Window control IPC
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())
  ipcMain.handle('window:isFullscreen', () => mainWindow?.isFullScreen())
  ipcMain.handle('window:enterFullscreen', () => {
    mainWindow?.setFullScreen(true)
    mainWindow?.setAlwaysOnTop(true, 'screen-saver')
    eventBus.emit('FULLSCREEN_ENTERED', { timestamp: Date.now() })
  })
  ipcMain.handle('window:exitFullscreen', () => {
    mainWindow?.setFullScreen(false)
    mainWindow?.setAlwaysOnTop(false)
    eventBus.emit('FULLSCREEN_EXITED', { timestamp: Date.now() })
  })

  // Register all module IPCs
  registerTimerIPC()
  registerBrowserIPC()
  registerPdfIPC()
  registerRecallIPC()
  registerStreakIPC()
  registerSettingsIPC()

  // Initialize browser service
  browserService.init(mainWindow)

  // Initialize replay service (filtered event recording)
  replayService.init()

  // Wire session lifecycle events
  eventBus.on('SESSION_STARTED', (data: any) => {
    focusMonitorService.start()
    focusEngineService.start(data.sessionId)
  })

  eventBus.on('SESSION_ENDED', (data: any) => {
    focusMonitorService.stop()
    focusEngineService.stop()
    aggregateSession(data.sessionId)
    updateStreakDay(data.sessionId)
  })

  eventBus.on('SESSION_PAUSED', () => {
    // Focus engine keeps running during pause but scores 0
  })

  // Handle window resize for browser views
  mainWindow.on('resize', () => {
    browserService.updateViewBounds()
  })

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreenChanged', true)
  })

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreenChanged', false)
  })

  // Load renderer
  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    browserService.cleanup()
  })
}

// App lifecycle
app.whenReady().then(() => {
  initDatabase()
  createWindow()
  eventBus.emit('APP_STARTED', { timestamp: Date.now() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
