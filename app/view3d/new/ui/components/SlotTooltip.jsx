import { formatTierPrice, getTierColor, getTierLabel, VIEW_THEME } from '../../../shared/constants'

export default function SlotTooltip({ hoverSlot, pointer }) {
  if (!hoverSlot || !pointer) return null

  const color = getTierColor(hoverSlot.tier)

  return (
    <div style={{
      position: 'absolute',
      left: pointer.x + 14,
      top: pointer.y + 10,
      zIndex: 24,
      maxWidth: 250,
      pointerEvents: 'none',
      background: 'linear-gradient(155deg, rgba(9,13,31,0.95), rgba(8,12,24,0.88))',
      border: `1px solid ${color}66`,
      borderRadius: 12,
      padding: '9px 11px',
      color: VIEW_THEME.text,
      boxShadow: `0 10px 30px rgba(0,0,0,0.42), 0 0 20px ${color}30`,
      transform: 'translate3d(0,0,0)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ fontSize: 10, letterSpacing: '.09em', color, marginBottom: 4 }}>
        {getTierLabel(hoverSlot.tier)} · {hoverSlot.id}
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        {hoverSlot.tenant?.name || 'Slot disponible'}
      </div>
      <div style={{ fontSize: 9, color: VIEW_THEME.dim }}>
        {hoverSlot.occ ? 'Occupé' : 'Disponible'} · {formatTierPrice(hoverSlot.tier)}
      </div>
    </div>
  )
}
