import { TIER_ORDER, TIER_ICON, getTierColor, getTierLabel, formatTierPrice, VIEW_THEME } from '../../../shared/constants'

function tierButtonStyle({ active, color }) {
  return {
    border: `1px solid ${active ? color : 'rgba(170,199,255,0.22)'}`,
    background: active ? `linear-gradient(160deg, ${color}3f, ${color}14)` : 'rgba(255,255,255,0.03)',
    color: active ? '#fff' : VIEW_THEME.muted,
    padding: '8px 12px',
    minWidth: 118,
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: active ? `0 0 22px ${color}33` : 'none',
    transition: 'all 120ms ease',
  }
}

export default function TierBar({ tierStats, activeTier, onTierChange }) {
  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      bottom: 14,
      transform: 'translateX(-50%)',
      zIndex: 20,
      display: 'flex',
      gap: 7,
      padding: '8px 10px',
      border: `1px solid ${VIEW_THEME.panelBorder}`,
      borderRadius: 14,
      background: VIEW_THEME.panel,
      backdropFilter: 'blur(14px)',
      maxWidth: 'calc(100% - 20px)',
      overflowX: 'auto',
      boxShadow: '0 14px 34px rgba(0,0,0,0.35)',
    }}>
      <button
        onClick={() => onTierChange(null)}
        style={tierButtonStyle({
          active: activeTier == null,
          color: VIEW_THEME.accent,
        })}
      >
        <div style={{ fontSize: 10, letterSpacing: '.08em' }}>ALL TIERS</div>
        <div style={{ fontSize: 9, color: VIEW_THEME.dim, marginTop: 3 }}>Vue complète</div>
      </button>

      {TIER_ORDER.map(tier => {
        const stat = tierStats[tier]
        const color = getTierColor(tier)
        const active = activeTier === tier

        return (
          <button
            key={tier}
            onClick={() => onTierChange(active ? null : tier)}
            style={tierButtonStyle({ active, color })}
            title={`${getTierLabel(tier)} · ${formatTierPrice(tier)}`}
          >
            <div style={{ fontSize: 10, letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color }}>{TIER_ICON[tier]}</span>
              <span>{getTierLabel(tier)}</span>
            </div>
            <div style={{ fontSize: 9, color: VIEW_THEME.dim, marginTop: 3 }}>
              {stat?.occupied || 0}/{stat?.total || 0}
            </div>
          </button>
        )
      })}
    </div>
  )
}
