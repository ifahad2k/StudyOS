import React from 'react';
import { Maximize, Flame } from 'lucide-react';

const TopBar = () => {
  return (
    <div className="glass-panel" style={{
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      zIndex: 5
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '20px',
          color: 'var(--text-primary)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>[</span>
          <span style={{ color: 'var(--accent-primary)' }}>⏱ 00:00:00</span>
          <span style={{ color: 'var(--text-muted)' }}>]</span>
        </div>
        
        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '4px 12px',
          borderRadius: '16px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
          Idle
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-streak)',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '8px',
        }}>
          <Flame size={18} fill="currentColor" /> 6
        </div>

        <button style={{ color: 'var(--text-secondary)' }}>
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
