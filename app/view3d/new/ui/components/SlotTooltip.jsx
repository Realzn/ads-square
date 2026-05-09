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
      maxWidth: 230,
      pointerEvents: 'none',
      background: 'rgba(8,10,20,0.95)',
      border: `1px solid ${color}66`,
      padding: '8px 10px',
      color: VIEW_THEME.text,
      boxShadow: `0 0 20px ${color}33`,
      transform: 'translate3d(0,0,0)',
    }}>
      <div style={{ fontSize: 10, letterSpacing: '.08em', color, marginBottom: 4 }}>
        {getTierLabel(hoverSlot.tier)} · {hoverSlot.id}
      </div>
      <div style={{ fontSize: 11, marginBottom: 4 }}>
        {hoverSlot.tenant?.name || 'Slot disponible'}
      </div>
      <div style={{ fontSize: 9, color: VIEW_THEME.dim }}>
        {hoverSlot.occ ? 'Occupé' : 'Disponible'} · {formatTierPrice(hoverSlot.tier)}
      </div>
    </div>
  )
}
