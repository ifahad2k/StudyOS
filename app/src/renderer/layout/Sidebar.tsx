import React from 'react'
import {
  Home, Clock, Globe, BookOpen, Brain, BarChart3, Settings,
} from 'lucide-react'
import type { ActiveView } from '../App'

interface SidebarProps {
  activeView: ActiveView
  onNavigate: (view: ActiveView) => void
}

interface NavItemConfig {
  id: ActiveView
  icon: React.ReactNode
  label: string
  badge?: string
}

const mainNavItems: NavItemConfig[] = [
  { id: 'dashboard', icon: <Home size={20} />,       label: 'Home' },
  { id: 'timer',     icon: <Clock size={20} />,      label: 'Timer' },
  { id: 'browser',   icon: <Globe size={20} />,      label: 'Browser' },
  { id: 'pdf',       icon: <BookOpen size={20} />,   label: 'PDF Reader' },
  { id: 'recall',    icon: <Brain size={20} />,      label: 'Recall' },
  { id: 'analytics', icon: <BarChart3 size={20} />,  label: 'Analytics' },
]

const bottomNavItems: NavItemConfig[] = [
  { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
]

function Sidebar({ activeView, onNavigate }: SidebarProps): React.ReactElement {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">S</div>
        <span className="sidebar-logo-text">StudyOS</span>
      </div>

      <nav className="sidebar-nav">
        {mainNavItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            role="button"
            tabIndex={0}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </div>
        ))}

        <div className="sidebar-nav-bottom">
          {bottomNavItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              role="button"
              tabIndex={0}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
