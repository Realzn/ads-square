import { formatTierPrice, getTierColor, getTierLabel, VIEW_THEME } from '../../../shared/constants'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function SlotTooltip({ hoverSlot, pointer }) {
  if (!hoverSlot || !pointer) return null

  const color = getTierColor(hoverSlot.tier)
  const promo = hoverSlot.promo || {}
  const maxWidth = 262
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 720
  const left = clamp(pointer.x + 14, 10, Math.max(10, viewportW - maxWidth - 10))
  const top = clamp(pointer.y + 10, 10, Math.max(10, viewportH - 114))

  return (
    <div style={{
      position: 'absolute',
      left,
      top,
      zIndex: 24,
      maxWidth,
      pointerEvents: 'none',
      background: 'linear-gradient(155deg, rgba(9,13,31,0.95), rgba(8,12,24,0.9))',
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
        {promo.title || hoverSlot.tenant?.name || 'Slot disponible'}
      </div>
      <div style={{ fontSize: 9, color: VIEW_THEME.dim }}>
        {hoverSlot.occ ? promo.productServiceLabel || 'Campagne active' : 'Disponible'} · {formatTierPrice(hoverSlot.tier)}
      </div>
    </div>
  )
}
