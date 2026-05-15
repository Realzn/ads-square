import { VIEW_THEME } from '../../../shared/constants'

export default function MinimalControls({ onResetCamera }) {
  return (
    <div style={{
      position: 'absolute',
      right: 14,
      bottom: 14,
      zIndex: 24,
      display: 'flex',
      gap: 8,
      alignItems: 'center',
    }}>
      <button
        onClick={onResetCamera}
        style={{
          border: `1px solid ${VIEW_THEME.panelBorder}`,
          background: VIEW_THEME.panel,
          color: VIEW_THEME.muted,
          padding: '9px 12px',
          borderRadius: 10,
          cursor: 'pointer',
          letterSpacing: '.08em',
          fontSize: 10,
          textTransform: 'uppercase',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
        }}
      >
        Recentrer caméra
      </button>
    </div>
  )
}
