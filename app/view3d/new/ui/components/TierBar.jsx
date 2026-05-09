import { TIER_ORDER, TIER_ICON, getTierColor, getTierLabel, formatTierPrice, VIEW_THEME } from '../../../shared/constants'

export default function TierBar({ tierStats, activeTier, onTierChange }) {
  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      bottom: 14,
      transform: 'translateX(-50%)',
      zIndex: 20,
      display: 'flex',
      gap: 6,
      padding: '8px 10px',
      border: `1px solid ${VIEW_THEME.panelBorder}`,
      background: VIEW_THEME.panel,
      backdropFilter: 'blur(8px)',
      maxWidth: 'calc(100% - 20px)',
      overflowX: 'auto',
    }}>
      <button
        onClick={() => onTierChange(null)}
        style={{
          border: `1px solid ${activeTier == null ? VIEW_THEME.accent : 'rgba(255,255,255,0.12)'}`,
          background: activeTier == null ? 'rgba(134,187,255,0.18)' : 'rgba(255,255,255,0.03)',
          color: activeTier == null ? VIEW_THEME.text : VIEW_THEME.muted,
          padding: '7px 9px',
          minWidth: 88,
          cursor: 'pointer',
          fontSize: 10,
          letterSpacing: '.08em',
        }}
      >
        ALL TIERS
      </button>
      {TIER_ORDER.map(tier => {
        const stat = tierStats[tier]
        const color = getTierColor(tier)
        const active = activeTier === tier

        return (
          <button
            key={tier}
            onClick={() => onTierChange(active ? null : tier)}
            style={{
              border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
              background: active ? `${color}26` : 'rgba(255,255,255,0.02)',
              color: active ? '#fff' : VIEW_THEME.muted,
              padding: '7px 10px',
              minWidth: 110,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            title={`${getTierLabel(tier)} · ${formatTierPrice(tier)}`}
          >
            <div style={{ fontSize: 10, letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color }}>{TIER_ICON[tier]}</span>
              <span>{getTierLabel(tier)}</span>
            </div>
            <div style={{ fontSize: 9, color: VIEW_THEME.dim, marginTop: 2 }}>
              {stat?.occupied || 0}/{stat?.total || 0}
            </div>
          </button>
        )
      })}
    </div>
  )
}
