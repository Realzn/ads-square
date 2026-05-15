import { VIEW_THEME } from '../../../shared/constants'

function pillStyle({ border, color, background }) {
  return {
    padding: '8px 12px',
    borderRadius: 999,
    border,
    background,
    color,
    fontSize: 10,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
  }
}

export default function TopStatusBar({ isLive, globalStats, qualityKey }) {
  return (
    <div style={{
      position: 'absolute',
      top: 14,
      left: 14,
      zIndex: 20,
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      pointerEvents: 'none',
      flexWrap: 'wrap',
      maxWidth: 'calc(100% - 28px)',
    }}>
      <div style={pillStyle({
        border: `1px solid ${VIEW_THEME.panelBorder}`,
        background: VIEW_THEME.panel,
        color: VIEW_THEME.text,
      })}>
        DYSON COSMOS
      </div>

      <div style={pillStyle({
        border: `1px solid ${isLive ? VIEW_THEME.success : VIEW_THEME.danger}`,
        background: isLive ? 'rgba(55,220,155,0.15)' : 'rgba(255,104,138,0.14)',
        color: isLive ? VIEW_THEME.success : VIEW_THEME.danger,
      })}>
        {isLive ? 'LIVE' : 'OFFLINE'} · {globalStats.occupied}/{globalStats.total}
      </div>

      <div style={pillStyle({
        border: '1px solid rgba(161,198,255,0.24)',
        background: 'rgba(22,31,58,0.55)',
        color: VIEW_THEME.dim,
      })}>
        render {qualityKey}
      </div>
    </div>
  )
}
