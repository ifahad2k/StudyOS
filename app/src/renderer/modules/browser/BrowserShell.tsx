import React, { useState, useEffect, useRef } from 'react'
import { Plus, X, ArrowLeft, ArrowRight, RotateCw, Search, Shield, History, Trash2, Clock3 } from 'lucide-react'

interface TabState {
  id: string
  url: string
  title: string
  domain: string
  isActive: boolean
  isPinned: boolean
}

interface BrowserHistoryEntry {
  id: number
  tab_id: string | null
  url: string
  domain: string
  title: string | null
  visited_at: string
}

function BrowserShell(): React.ReactElement {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [addressValue, setAddressValue] = useState('')
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null)
  const [blockedTabId, setBlockedTabId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyItems, setHistoryItems] = useState<BrowserHistoryEntry[]>([])
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const addressRef = useRef<HTMLInputElement>(null)
  const browserViewportRef = useRef<HTMLDivElement>(null)

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

  const loadHistory = async (query = '') => {
    setHistoryLoading(true)
    const items = await window.electronAPI?.browser.getHistory({
      limit: 300,
      query: query.trim() || undefined,
    })
    setHistoryItems(items || [])
    setHistoryLoading(false)
  }

  const openHistory = async () => {
    setShowHistory(true)
    await loadHistory(historyQuery)
  }

  const clearHistory = async () => {
    await window.electronAPI?.browser.clearHistory()
    await loadHistory(historyQuery)
  }

  const openHistoryEntry = async (item: BrowserHistoryEntry) => {
    setShowHistory(false)
    if (activeTabId) {
      await window.electronAPI?.browser.navigate({ tabId: activeTabId, url: item.url })
      setAddressValue(item.url)
      return
    }
    await newTab(item.url)
  }

  useEffect(() => {
    if (!showHistory) return
    const handler = setTimeout(() => {
      loadHistory(historyQuery)
    }, 180)
    return () => clearTimeout(handler)
  }, [historyQuery, showHistory])

  useEffect(() => {
    const target = browserViewportRef.current
    if (!target) return

    const syncBounds = () => {
      const rect = target.getBoundingClientRect()
      window.electronAPI?.browser.updateBounds({
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }

    const resizeObserver = new ResizeObserver(syncBounds)
    resizeObserver.observe(target)

    const rafId = requestAnimationFrame(syncBounds)
    window.addEventListener('resize', syncBounds)
    window.addEventListener('scroll', syncBounds, true)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', syncBounds)
      window.removeEventListener('scroll', syncBounds, true)
      resizeObserver.disconnect()
    }
  }, [])

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
        <button className="btn btn-ghost btn-sm" onClick={openHistory} title="History"><History size={15} /></button>

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
      <div
        ref={browserViewportRef}
        style={{
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

      {showHistory && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 220,
        }}>
          <div style={{
            width: 'min(920px, 92vw)', height: 'min(680px, 84vh)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px var(--space-md)', borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                <History size={16} />
                Browser History
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <button className="btn btn-danger btn-sm" onClick={clearHistory}><Trash2 size={13} /> Clear</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(false)}><X size={14} /></button>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 'var(--space-md)', borderBottom: '1px solid var(--border-subtle)',
            }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search history by title, URL or domain..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13,
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {historyLoading ? (
                <div style={{ padding: 'var(--space-lg)', color: 'var(--text-muted)', fontSize: 13 }}>Loading history...</div>
              ) : historyItems.length === 0 ? (
                <div style={{ padding: 'var(--space-lg)', color: 'var(--text-muted)', fontSize: 13 }}>No history yet.</div>
              ) : (
                historyItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openHistoryEntry(item)}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer',
                      padding: '10px var(--space-md)', borderBottom: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-primary)',
                    }}
                  >
                    <Clock3 size={13} color="var(--text-muted)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title || item.domain}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.url}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(item.visited_at).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrowserShell
