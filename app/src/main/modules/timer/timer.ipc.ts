import { ipcMain, BrowserWindow } from 'electron'
import { timerService } from './timer.service'
import { eventBus } from '../../eventBus'

export function registerTimerIPC(): void {
  ipcMain.handle('timer:start', (_e, data: { subject: string; mode: string; duration?: number }) => {
    return timerService.start(data.subject, data.mode as 'stopwatch' | 'pomodoro' | 'countdown', data.duration)
  })

  ipcMain.handle('timer:pause', (_e, data?: { reason?: string }) => {
    return timerService.pause(data?.reason)
  })

  ipcMain.handle('timer:resume', () => {
    return timerService.resume()
  })

  ipcMain.handle('timer:end', () => {
    return timerService.end()
  })

  ipcMain.handle('timer:getState', () => {
    return timerService.getState()
  })

  // Forward timer ticks to renderer
  eventBus.on('TIMER_TICK', (data) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('timer:tick', data)
    }
  })

  eventBus.on('POMODORO_CYCLE', (data) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('timer:cycleComplete', data)
    }
  })
}
