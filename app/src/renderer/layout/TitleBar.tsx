import React from 'react'
import { Minus, Square, X } from 'lucide-react'

declare global {
  interface Window {
    electronAPI?: {
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
        enterFullscreen: () => void
        exitFullscreen: () => void
      }
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

function TitleBar(): React.ReactElement {
  const handleMinimize = () => window.electronAPI?.window.minimize()
  const handleMaximize = () => window.electronAPI?.window.maximize()
  const handleClose = () => window.electronAPI?.window.close()

  return (
    <div className="titlebar">
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--font-heading)',
        fontSize: 12,
        color: 'var(--text-muted)',
        letterSpacing: '0.5px',
      }}>
        STUDYOS
      </div>

      <div style={{ display: 'flex', gap: 2 }}>
        <button className="titlebar-button" onClick={handleMinimize} title="Minimize">
          <Minus size={14} />
        </button>
        <button className="titlebar-button" onClick={handleMaximize} title="Maximize">
          <Square size={11} />
        </button>
        <button className="titlebar-button close" onClick={handleClose} title="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
