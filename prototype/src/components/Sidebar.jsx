import React, { useState } from 'react';
import { Home, Clock, Activity, BarChart2, Settings, BookOpen } from 'lucide-react';

const Sidebar = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="sidebar"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isHovered ? '200px' : '64px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isHovered ? 'flex-start' : 'center',
        padding: '24px 0',
        transition: 'all 0.2s ease',
        zIndex: 10
      }}
    >
      <div style={{ padding: isHovered ? '0 24px' : '0', marginBottom: '48px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--bg-primary)' }}>
          S
        </div>
        {isHovered && <span style={{ marginLeft: '12px', fontFamily: 'var(--font-heading)', fontWeight: 'bold', fontSize: '18px' }}>StudyOS</span>}
      </div>

      <nav style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavItem icon={<Home size={20} />} label="Home" active isHovered={isHovered} />
        <NavItem icon={<Clock size={20} />} label="Timer" isHovered={isHovered} />
        <NavItem icon={<BookOpen size={20} />} label="Library" isHovered={isHovered} />
        <NavItem icon={<Activity size={20} />} label="Recall Queue" isHovered={isHovered} badge="3" />
        <NavItem icon={<BarChart2 size={20} />} label="Analytics" isHovered={isHovered} />
      </nav>

      <div style={{ marginTop: 'auto', width: '100%' }}>
        <NavItem icon={<Settings size={20} />} label="Settings" isHovered={isHovered} />
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, isHovered, badge }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    cursor: 'pointer',
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    borderLeft: active ? '3px solid var(--accent-primary)' : '3px solid transparent',
    background: active ? 'rgba(0, 212, 170, 0.05)' : 'transparent',
    transition: 'all 0.2s ease',
    width: '100%',
    justifyContent: isHovered ? 'flex-start' : 'center'
  }}>
    <div style={{ minWidth: '24px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
    {isHovered && (
      <div style={{ marginLeft: '16px', fontSize: '14px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span>{label}</span>
        {badge && (
          <span style={{
            background: 'var(--accent-recall)',
            color: '#fff',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 'bold'
          }}>{badge}</span>
        )}
      </div>
    )}
    {!isHovered && badge && (
      <div style={{
        position: 'absolute',
        right: '12px',
        marginTop: '-16px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: 'var(--accent-recall)'
      }} />
    )}
  </div>
);

export default Sidebar;
