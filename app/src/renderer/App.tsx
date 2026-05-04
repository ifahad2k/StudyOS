import React, { useState, useEffect, useCallback } from 'react'
import TitleBar from './layout/TitleBar'
import Sidebar from './layout/Sidebar'
import TopBar from './layout/TopBar'
import Dashboard from './modules/dashboard/Dashboard'
import TimerView from './modules/timer/TimerView'
import BrowserView from './modules/browser/BrowserShell'
import PdfView from './modules/pdf/PdfViewer'
import RecallView from './modules/recall/RecallView'
import AnalyticsView from './modules/analytics/AnalyticsView'
import SettingsView from './modules/settings/SettingsView'
import RecallPrompt from './modules/recall/RecallPrompt'
import { ToastProvider, useToast } from './shared/Toast'

export type ActiveView = 'dashboard' | 'timer' | 'browser' | 'pdf' | 'recall' | 'analytics' | 'settings'

function AppContent(): React.ReactElement {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [showRecallPrompt, setShowRecallPrompt] = useState(false)
  const [endedSession, setEndedSession] = useState<any>(null)
  const { addToast } = useToast()

  useEffect(() => {
    // Listen for session-end recall prompt
    window.electronAPI?.on('timer:tick', () => {
      // tick updates handled by TopBar
    })

    window.electronAPI?.on('focus:warning', (data: any) => {
      addToast({ message: `⚠️ Focus lost: ${data.appName}`, type: 'warning' })
    })

    window.electronAPI?.on('focus:returned', (data: any) => {
      addToast({ message: `✅ Welcome back! Away for ${data.awaySeconds}s`, type: 'success' })
    })

    window.electronAPI?.on('browser:siteBlocked', (data: any) => {
      addToast({ message: `🚫 Blocked: ${data.domain}`, type: 'error', duration: 3000 })
    })

    window.electronAPI?.on('streak:milestone', (data: any) => {
      addToast({ message: `🔥 ${data.days}-day streak! Keep going!`, type: 'success', duration: 5000 })
    })

    return () => {
      window.electronAPI?.removeAllListeners('timer:tick')
      window.electronAPI?.removeAllListeners('focus:warning')
      window.electronAPI?.removeAllListeners('focus:returned')
      window.electronAPI?.removeAllListeners('browser:siteBlocked')
      window.electronAPI?.removeAllListeners('streak:milestone')
    }
  }, [addToast])

  useEffect(() => {
    window.electronAPI?.browser.setVisibility({ visible: activeView === 'browser' })
  }, [activeView])

  const handleSessionEnd = useCallback((session: any) => {
    setEndedSession(session)
    setShowRecallPrompt(true)
  }, [])

  const handleRecallDone = useCallback(() => {
    setShowRecallPrompt(false)
    setEndedSession(null)
    setActiveView('dashboard')
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} />
      case 'timer':
        return <TimerView onSessionEnd={handleSessionEnd} />
      case 'browser':
        return <BrowserView />
      case 'pdf':
        return <PdfView />
      case 'recall':
        return <RecallView />
      case 'analytics':
        return <AnalyticsView />
      case 'settings':
        return <SettingsView />
      default:
        return <Dashboard onNavigate={setActiveView} />
    }
  }

  return (
    <>
      <TitleBar />
      <div className="app-shell">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <div className="main-area">
          <TopBar activeView={activeView} />
          <div className="canvas">
            {renderView()}
          </div>
        </div>
      </div>
      {showRecallPrompt && endedSession && (
        <RecallPrompt session={endedSession} onDone={handleRecallDone} />
      )}
    </>
  )
}

function App(): React.ReactElement {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
