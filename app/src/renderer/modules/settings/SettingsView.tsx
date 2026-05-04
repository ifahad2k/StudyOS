import React, { useState, useEffect } from 'react'
import { Settings, Shield, Globe, Clock, Brain, Flame, Monitor, Palette, Database, Plus, X, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

type SettingsSection = 'general' | 'timer' | 'browser' | 'blocklist' | 'recall' | 'streak' | 'appearance' | 'data'

interface WhitelistItem { id: number; pattern: string; enabled: number; created_at: string }
interface BlocklistItem { id: number; process_name: string; enabled: number; created_at: string }

function SettingsView(): React.ReactElement {
  const [section, setSection] = useState<SettingsSection>('browser')
  const [settings, setAllSettings] = useState<Record<string, any>>({})
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>([])
  const [blocklist, setBlocklist] = useState<BlocklistItem[]>([])
  const [newWhitelist, setNewWhitelist] = useState('')
  const [newBlocklist, setNewBlocklist] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [s, w, b] = await Promise.all([
      window.electronAPI?.settings.getAll(),
      window.electronAPI?.whitelist.get(),
      window.electronAPI?.blocklist.get(),
    ])
    setAllSettings(s || {})
    setWhitelist(w || [])
    setBlocklist(b || [])
  }

  const updateSetting = async (key: string, value: any) => {
    await window.electronAPI?.settings.set({ key, value })
    setAllSettings(prev => ({ ...prev, [key]: value }))
  }

  const addWhitelist = async () => {
    if (!newWhitelist.trim()) return
    let pattern = newWhitelist.trim()
    if (!pattern.startsWith('*.')) pattern = `*.${pattern}`
    const result = await window.electronAPI?.whitelist.add({ pattern })
    if (result) setWhitelist(result)
    setNewWhitelist('')
  }

  const removeWhitelist = async (pattern: string) => {
    const result = await window.electronAPI?.whitelist.remove({ pattern })
    if (result) setWhitelist(result)
  }

  const toggleWhitelist = async (pattern: string, enabled: boolean) => {
    const result = await window.electronAPI?.whitelist.toggle({ pattern, enabled })
    if (result) setWhitelist(result)
  }

  const addBlocklist = async () => {
    if (!newBlocklist.trim()) return
    const result = await window.electronAPI?.blocklist.add({ processName: newBlocklist.trim() })
    if (result) setBlocklist(result)
    setNewBlocklist('')
  }

  const removeBlocklist = async (processName: string) => {
    const result = await window.electronAPI?.blocklist.remove({ processName })
    if (result) setBlocklist(result)
  }

  const toggleBlocklist = async (processName: string, enabled: boolean) => {
    const result = await window.electronAPI?.blocklist.toggle({ processName, enabled })
    if (result) setBlocklist(result)
  }

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings size={16} /> },
    { id: 'timer', label: 'Timer & Pomodoro', icon: <Clock size={16} /> },
    { id: 'browser', label: 'Browser Whitelist', icon: <Globe size={16} /> },
    { id: 'blocklist', label: 'App Blocklist', icon: <Shield size={16} /> },
    { id: 'recall', label: 'Active Recall', icon: <Brain size={16} /> },
    { id: 'streak', label: 'Streak', icon: <Flame size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'data', label: 'Data & Privacy', icon: <Database size={16} /> },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', marginTop: -16, marginLeft: -32, marginRight: -32 }}>
      {/* Settings sidebar */}
      <div style={{ width: 220, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)', padding: '16px 8px', overflowY: 'auto' }}>
        {sections.map(s => (
          <div key={s.id} onClick={() => setSection(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, cursor: 'pointer', marginBottom: 2,
              background: section === s.id ? 'var(--bg-tertiary)' : 'transparent',
              color: section === s.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: section === s.id ? 600 : 400, fontSize: 13,
              transition: 'all 0.15s ease',
            }}
          >
            {s.icon} {s.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {section === 'browser' && (
          <div>
            <h2 style={{ marginBottom: 8 }}>Browser Whitelist</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              Only whitelisted sites can be accessed. Everything else is blocked during study sessions.
            </p>

            {/* Add new */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input type="text" placeholder="e.g. google.com" value={newWhitelist}
                onChange={e => setNewWhitelist(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addWhitelist() }}
                style={{
                  flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                  borderRadius: 8, padding: '8px 16px', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                }}
              />
              <button className="btn btn-primary" onClick={addWhitelist}>
                <Plus size={16} /> Add Site
              </button>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {whitelist.map(w => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: 'var(--bg-tertiary)', borderRadius: 8,
                  opacity: w.enabled ? 1 : 0.5,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Globe size={14} color="var(--accent-secondary)" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{w.pattern}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleWhitelist(w.pattern, !w.enabled)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: w.enabled ? 'var(--accent-primary)' : 'var(--text-muted)', padding: 4 }}>
                      {w.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => removeWhitelist(w.pattern)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'blocklist' && (
          <div>
            <h2 style={{ marginBottom: 8 }}>App Blocklist</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              These apps will auto-pause your session when you switch to them.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input type="text" placeholder="e.g. discord, steam" value={newBlocklist}
                onChange={e => setNewBlocklist(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addBlocklist() }}
                style={{
                  flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                  borderRadius: 8, padding: '8px 16px', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                }}
              />
              <button className="btn btn-primary" onClick={addBlocklist}>
                <Plus size={16} /> Add App
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {blocklist.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: 'var(--bg-tertiary)', borderRadius: 8,
                  opacity: b.enabled ? 1 : 0.5,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Monitor size={14} color="var(--accent-danger)" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{b.process_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleBlocklist(b.process_name, !b.enabled)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: b.enabled ? 'var(--accent-primary)' : 'var(--text-muted)', padding: 4 }}>
                      {b.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => removeBlocklist(b.process_name)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'timer' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Timer & Pomodoro</h2>
            <SettingRow label="Default Mode" desc="Timer mode used when starting a new session">
              <select value={settings['timer.defaultMode'] || 'pomodoro'}
                onChange={e => updateSetting('timer.defaultMode', e.target.value)}
                style={selectStyle}>
                <option value="pomodoro">Pomodoro</option>
                <option value="stopwatch">Stopwatch</option>
                <option value="countdown">Countdown</option>
              </select>
            </SettingRow>
            <SettingRow label="Work Duration" desc="Minutes per Pomodoro work cycle">
              <NumInput value={settings['pomodoro.workMinutes'] || 25} onChange={v => updateSetting('pomodoro.workMinutes', v)} />
            </SettingRow>
            <SettingRow label="Short Break" desc="Minutes for short break">
              <NumInput value={settings['pomodoro.shortBreakMinutes'] || 5} onChange={v => updateSetting('pomodoro.shortBreakMinutes', v)} />
            </SettingRow>
            <SettingRow label="Long Break" desc="Minutes for long break">
              <NumInput value={settings['pomodoro.longBreakMinutes'] || 15} onChange={v => updateSetting('pomodoro.longBreakMinutes', v)} />
            </SettingRow>
            <SettingRow label="Cycles Before Long Break" desc="Work cycles before a long break">
              <NumInput value={settings['pomodoro.cyclesBeforeLongBreak'] || 4} onChange={v => updateSetting('pomodoro.cyclesBeforeLongBreak', v)} />
            </SettingRow>
          </div>
        )}

        {section === 'recall' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Active Recall</h2>
            <SettingRow label="Recall Prompt" desc="Show recall modal after each session">
              <ToggleSwitch value={settings['recall.enabled'] !== false} onChange={v => updateSetting('recall.enabled', v)} />
            </SettingRow>
            <SettingRow label="Min Session Length" desc="Minutes — skip recall for shorter sessions">
              <NumInput value={settings['recall.minSessionMinutes'] || 15} onChange={v => updateSetting('recall.minSessionMinutes', v)} />
            </SettingRow>
            <SettingRow label="Skip Penalty" desc="Streak points lost when skipping recall">
              <NumInput value={settings['recall.skipPenaltyPoints'] || 5} onChange={v => updateSetting('recall.skipPenaltyPoints', v)} />
            </SettingRow>
          </div>
        )}

        {section === 'streak' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Study Streak</h2>
            <SettingRow label="Min Study Time" desc="Minutes needed for a valid study day">
              <NumInput value={settings['streak.minSessionMinutes'] || 20} onChange={v => updateSetting('streak.minSessionMinutes', v)} />
            </SettingRow>
            <SettingRow label="Min Focus Score" desc="Focus score threshold for streak validation">
              <NumInput value={settings['streak.minFocusScore'] || 40} onChange={v => updateSetting('streak.minFocusScore', v)} />
            </SettingRow>
            <SettingRow label="Grace Days" desc="Grace days allowed per 7-day streak">
              <NumInput value={settings['streak.graceDaysPerWeek'] || 1} onChange={v => updateSetting('streak.graceDaysPerWeek', v)} />
            </SettingRow>
          </div>
        )}

        {section === 'general' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>General</h2>
            <SettingRow label="Fullscreen on Session Start" desc="Auto-enter fullscreen when a session starts">
              <ToggleSwitch value={settings['fullscreen.autoOnSessionStart'] === true} onChange={v => updateSetting('fullscreen.autoOnSessionStart', v)} />
            </SettingRow>
            <SettingRow label="Default Homepage" desc="Browser homepage URL">
              <input type="text" value={settings['browser.defaultHomepage'] || 'https://www.google.com'}
                onChange={e => updateSetting('browser.defaultHomepage', e.target.value)}
                style={{ ...inputStyle, width: 280 }}
              />
            </SettingRow>
          </div>
        )}

        {section === 'appearance' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Appearance</h2>
            <SettingRow label="Font Scale" desc="UI font size percentage">
              <NumInput value={settings['appearance.fontScale'] || 100} onChange={v => updateSetting('appearance.fontScale', v)} />
            </SettingRow>
            <SettingRow label="Animations" desc="Enable UI animations">
              <ToggleSwitch value={settings['appearance.animations'] !== 'disabled'} onChange={v => updateSetting('appearance.animations', v ? 'enabled' : 'disabled')} />
            </SettingRow>
          </div>
        )}

        {section === 'data' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Data & Privacy</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              All data is stored locally on your machine in an SQLite database. Nothing is sent to any server.
            </p>
            <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                Database: %APPDATA%\studyos\studyos.db
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
      </div>
      {children}
    </div>
  )
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
      style={{
        width: 70, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: 14,
      }}
    />
  )
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{
        width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: value ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
        position: 'relative', transition: 'background 0.2s ease',
      }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3, left: value ? 25 : 3,
        transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
  borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)', fontSize: 13,
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
  borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)', fontSize: 13,
}

export default SettingsView
