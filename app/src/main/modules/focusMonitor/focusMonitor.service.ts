import { exec } from 'child_process'
import { eventBus } from '../../eventBus'
import { BrowserWindow } from 'electron'
import { getDb } from '../../db/connection'
import { timerService } from '../timer/timer.service'

class FocusMonitorService {
  private poller: NodeJS.Timeout | null = null
  private wasInForeground = true
  private focusLostAt = 0
  private lastApp = 'StudyOS'

  start(): void {
    this.poller = setInterval(() => this.poll(), 1500)
  }

  stop(): void {
    if (this.poller) {
      clearInterval(this.poller)
      this.poller = null
    }
  }

  isInForeground(): boolean {
    return this.wasInForeground
  }

  secondsSinceFocusLoss(): number {
    if (this.wasInForeground) return 0
    return Math.floor((Date.now() - this.focusLostAt) / 1000)
  }

  private poll(): void {
    if (!timerService.isRunning()) return

    // Use PowerShell to detect foreground window
    const cmd = `powershell -NoProfile -Command "Add-Type -Name FG -Namespace Win -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow();[DllImport(\\\"user32.dll\\\")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int processId);'; $hwnd = [Win.FG]::GetForegroundWindow(); $pid = 0; [Win.FG]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null; (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName"`

    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err) return

      const processName = stdout.trim().toLowerCase()
      const isStudyOS = processName === 'electron' || processName === 'studyos'

      if (!isStudyOS && this.wasInForeground) {
        // Focus lost
        this.wasInForeground = false
        this.focusLostAt = Date.now()
        this.lastApp = processName

        // Check if it's a blocked app
        const isBlocked = this.isBlockedApp(processName)

        eventBus.emit('FOCUS_LOST', {
          appName: processName,
          processName,
          lostAt: new Date().toISOString(),
          isBlocked,
        })

        // Notify renderer
        const win = BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) {
          win.webContents.send('focus:warning', { appName: processName, processName, isBlocked })
        }

        // Auto-pause if configured
        if (isBlocked) {
          timerService.pause('focus_lost')
        }
      } else if (isStudyOS && !this.wasInForeground) {
        // Focus returned
        const awaySeconds = Math.floor((Date.now() - this.focusLostAt) / 1000)
        this.wasInForeground = true

        eventBus.emit('FOCUS_RETURNED', {
          appName: this.lastApp,
          returnedAt: new Date().toISOString(),
          awaySeconds,
        })

        // Notify renderer
        const win = BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) {
          win.webContents.send('focus:returned', { appName: this.lastApp, awaySeconds })
        }
      }
    })
  }

  private isBlockedApp(processName: string): boolean {
    try {
      const db = getDb()
      const row = db.prepare('SELECT 1 FROM blocklist WHERE process_name = ? AND enabled = 1').get(processName)
      return !!row
    } catch {
      return false
    }
  }
}

export const focusMonitorService = new FocusMonitorService()
