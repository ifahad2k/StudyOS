import React from 'react';
import { Play, Book, Globe, FileText } from 'lucide-react';

const Dashboard = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '64px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Good afternoon.</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '48px' }}>
        Ready to build your knowledge today?
      </p>

      {/* QUICK START WIDGET */}
      <div className="glass-panel" style={{
        padding: '32px',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05), rgba(79, 142, 247, 0.05))',
        border: '1px solid var(--border-active)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'var(--accent-primary)',
          filter: 'blur(100px)',
          opacity: 0.1,
          borderRadius: '50%'
        }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                background: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                padding: '12px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 212, 170, 0.4)'
              }}>
                <Play size={24} fill="currentColor" />
              </div>
              <h2 style={{ fontSize: '28px', color: 'var(--text-primary)' }}>QUICK START</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Book size={16} /> Continue Physics
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} /> ch12.pdf (pg 47)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={16} /> Restore 3 tabs
              </div>
            </div>
          </div>

          <button style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            padding: '16px 32px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: 'var(--font-heading)',
            boxShadow: '0 4px 12px rgba(232, 234, 240, 0.1)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            START SESSION
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '48px' }}>
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '16px' }}>REVISION QUEUE</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <RevisionItem subject="Physics" text="Why does the continuity equation assume incompressibility?" age="2 days ago" />
            <RevisionItem subject="Comp Sci" text="Difference between B-tree and binary search tree?" age="3 days ago" />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '16px' }}>TODAY'S TARGET</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--accent-primary)" strokeWidth="8" strokeDasharray="226" strokeDashoffset="170" strokeLinecap="round" transform="rotate(-90 40 40)" />
              </svg>
              <div style={{ position: 'absolute', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 'bold' }}>25%</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>1h 30m</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>of 4h 00m goal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RevisionItem = ({ subject, text, age }) => (
  <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', borderLeft: '3px solid var(--accent-recall)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
      <span style={{ color: 'var(--accent-recall)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{subject}</span>
      <span style={{ color: 'var(--text-muted)' }}>{age}</span>
    </div>
    <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{text}</div>
  </div>
);

export default Dashboard;
