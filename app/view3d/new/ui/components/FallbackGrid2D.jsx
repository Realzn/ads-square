import { getTierColor, getTierLabel, VIEW_THEME } from '../../../shared/constants'

export default function FallbackGrid2D({ slots, onSelect }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'auto',
      zIndex: 6,
      padding: 14,
      background: 'linear-gradient(160deg, rgba(6,8,18,0.98), rgba(2,2,6,0.98))',
    }}>
      <div style={{ color: VIEW_THEME.text, fontSize: 12, letterSpacing: '.08em', marginBottom: 10 }}>
        MODE FALLBACK 2D · WEBGL indisponible
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: 6,
      }}>
        {slots.map(slot => {
          const color = getTierColor(slot.tier)
          return (
            <button
              key={slot.id}
              onClick={() => onSelect(slot)}
              style={{
                textAlign: 'left',
                padding: '8px 7px',
                border: `1px solid ${color}44`,
                background: slot.occ ? `${color}20` : 'rgba(255,255,255,0.03)',
                color: VIEW_THEME.text,
                cursor: 'pointer',
                minHeight: 68,
              }}
            >
              <div style={{ fontSize: 9, color }}>{getTierLabel(slot.tier)}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>{slot.id}</div>
              <div style={{ fontSize: 9, marginTop: 6, color: VIEW_THEME.dim }}>
                {slot.occ ? 'Occupé' : 'Libre'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
