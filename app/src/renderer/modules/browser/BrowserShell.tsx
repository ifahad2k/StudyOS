import React, { useState, useEffect, useRef } from 'react'
import { Plus, X, ArrowLeft, ArrowRight, RotateCw, Search, Shield } from 'lucide-react'

interface TabState {
  id: string
  url: string
  title: string
  domain: string
  isActive: boolean
  isPinned: boolean
}

function BrowserShell(): React.ReactElement {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [addressValue, setAddressValue] = useState('')
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null)
  const [blockedTabId, setBlockedTabId] = useState<string | null>(null)
  const addressRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTabs()

    window.electronAPI?.on('browser:siteBlocked', (data: any) => {
      setBlockedUrl(data.url)
      setBlockedTabId(data.tabId)
    })

    window.electronAPI?.on('browser:tabsUpdated', (data: any) => {
      if (data.tabs) setTabs(data.tabs)
    })

    return () => {
      window.electronAPI?.removeAllListeners('browser:siteBlocked')
      window.electronAPI?.removeAllListeners('browser:tabsUpdated')
    }
  }, [])

  const loadTabs = async () => {
    const t = await window.electronAPI?.browser.getTabs()
    if (t) {
      setTabs(t)
      const active = t.find((tab: TabState) => tab.isActive)
      if (active) {
        setActiveTabId(active.id)
        setAddressValue(active.url)
      }
    }
  }

  const newTab = async (url?: string) => {
    const tab = await window.electronAPI?.browser.newTab(url ? { url } : undefined)
    if (tab) {
      setTabs((prev) => [...prev.map(t => ({ ...t, isActive: false })), { ...tab, isActive: true }])
      setActiveTabId(tab.id)
      setAddressValue(tab.url)
    }
  }

  const closeTab = async (tabId: string) => {
    await window.electronAPI?.browser.closeTab({ tabId })
    setTabs((prev) => prev.filter(t => t.id !== tabId))
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId)
      if (remaining.length > 0) {
        switchTab(remaining[remaining.length - 1].id)
      } else {
        setActiveTabId(null)
        setAddressValue('')
      }
    }
  }

  const switchTab = async (tabId: string) => {
    await window.electronAPI?.browser.switchTab({ tabId })
    setActiveTabId(tabId)
    setTabs((prev) => prev.map(t => ({ ...t, isActive: t.id === tabId })))
    const tab = tabs.find(t => t.id === tabId)
    if (tab) setAddressValue(tab.url)
  }

  const navigate = async (url: string) => {
    if (!activeTabId) return
    await window.electronAPI?.browser.navigate({ tabId: activeTabId, url })
    setTabs((prev) => prev.map(t => t.id === activeTabId ? { ...t, url } : t))
  }

  const goBack = () => activeTabId && window.electronAPI?.browser.goBack({ tabId: activeTabId })
  const goForward = () => activeTabId && window.electronAPI?.browser.goForward({ tabId: activeTabId })
  const reload = () => activeTabId && window.electronAPI?.browser.reload({ tabId: activeTabId })

  const handleAddressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate(addressValue)
      addressRef.current?.blur()
    }
  }

  const handleBypass = async () => {
    if (blockedTabId && blockedUrl) {
      await window.electronAPI?.browser.requestBypass({ tabId: blockedTabId, url: blockedUrl })
      setBlockedUrl(null)
      setBlockedTabId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: -16, marginLeft: -32, marginRight: -32 }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 40,
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)',
        padding: '0 var(--space-sm)', gap: 2, overflowX: 'auto',
      }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: tab.isActive ? 'var(--bg-tertiary)' : 'transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer', maxWidth: 200, minWidth: 100,
              color: tab.isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden',
              borderTop: tab.isActive ? '2px solid var(--accent-secondary)' : '2px solid transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tab.title || tab.domain || 'New Tab'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex',
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => newTab()}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '4px 8px', borderRadius: 4,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Address Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
        padding: '6px var(--space-md)',
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={goBack} title="Back"><ArrowLeft size={16} /></button>
        <button className="btn btn-ghost btn-sm" onClick={goForward} title="Forward"><ArrowRight size={16} /></button>
        <button className="btn btn-ghost btn-sm" onClick={reload} title="Reload"><RotateCw size={14} /></button>

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)', padding: '4px 12px',
        }}>
          <Shield size={14} color="var(--accent-primary)" />
          <input
            ref={addressRef}
            type="text"
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            onKeyDown={handleAddressKeyDown}
            placeholder="Search or enter URL..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Content Area (BrowserView will be overlaid here by Electron) */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        {tabs.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 'var(--radius-xl)',
              background: 'var(--accent-secondary)15', border: '2px dashed var(--accent-secondary)40',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-lg)', fontSize: 36,
            }}>
              🌐
            </div>
            <h3 style={{ color: 'var(--accent-secondary)', marginBottom: 'var(--space-sm)' }}>
              StudyOS Browser
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 'var(--space-lg)', maxWidth: 400 }}>
              A focus-first browser. Only whitelisted sites are allowed.
              <br />Manage your whitelist in Settings → Browser.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => newTab()}>
              <Plus size={18} /> Open New Tab
            </button>
          </div>
        ) : (
          // Transparent space — BrowserView renders on top from main process
          <div style={{ width: '100%', height: '100%' }} />
        )}
      </div>

      {/* Blocked URL Overlay */}
      {blockedUrl && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-2xl)', maxWidth: 480, width: '90%', textAlign: 'center',
            border: '1px solid var(--accent-danger)40',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--accent-danger)15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-lg)', fontSize: 32,
            }}>
              🚫
            </div>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Site Blocked</h2>
            <p style={{
              color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              wordBreak: 'break-all',
            }}>
              {blockedUrl}
            </p>
            <p style={{
              color: 'var(--text-muted)', fontSize: 13, marginBottom: 'var(--space-xl)',
            }}>
              This site is not in your whitelist. Bypassing will be logged and affects your focus score.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={() => { setBlockedUrl(null); setBlockedTabId(null) }}>
                Stay Focused
              </button>
              <button className="btn btn-danger" onClick={handleBypass}>
                Open Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrowserShell
