import { VIEW_THEME } from '../../../shared/constants'

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
    }}>
      <div style={{
        padding: '7px 10px',
        border: `1px solid ${VIEW_THEME.panelBorder}`,
        background: VIEW_THEME.panel,
        color: VIEW_THEME.text,
        fontSize: 11,
        letterSpacing: '.12em',
      }}>
        DYSON SPHERE
      </div>
      <div style={{
        padding: '7px 10px',
        border: `1px solid ${VIEW_THEME.panelBorder}`,
        background: VIEW_THEME.panel,
        color: isLive ? VIEW_THEME.success : VIEW_THEME.danger,
        fontSize: 10,
        letterSpacing: '.11em',
      }}>
        {isLive ? 'LIVE' : 'OFFLINE'} · {globalStats.occupied}/{globalStats.total}
      </div>
      <div style={{
        padding: '7px 10px',
        border: `1px solid ${VIEW_THEME.panelBorder}`,
        background: VIEW_THEME.panel,
        color: VIEW_THEME.dim,
        fontSize: 10,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
      }}>
        quality {qualityKey}
      </div>
    </div>
  )
}
