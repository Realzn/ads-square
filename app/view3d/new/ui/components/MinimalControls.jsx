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
          padding: '8px 10px',
          cursor: 'pointer',
          letterSpacing: '.08em',
          fontSize: 10,
        }}
      >
        RESET CAM
      </button>
    </div>
  )
}
