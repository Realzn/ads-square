import { formatTierPrice, getTierColor, getTierLabel, VIEW_THEME } from '../../../shared/constants'

function actionButtonStyle({ background, border, color, disabled = false }) {
  return {
    padding: '10px 9px',
    background,
    border,
    color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 11,
    borderRadius: 10,
    transition: 'all 120ms ease',
    opacity: disabled ? 0.45 : 1,
  }
}

export default function SlotPanel({ slot, user, onClose, onCheckout, onBuyout, onViewSlot }) {
  if (!slot) return null

  const color = getTierColor(slot.tier)

  return (
    <div style={{
      position: 'absolute',
      right: 14,
      top: 14,
      zIndex: 26,
      width: 316,
      maxWidth: 'calc(100% - 28px)',
      background: 'linear-gradient(155deg, rgba(8,12,30,0.95), rgba(8,12,24,0.86))',
      border: `1px solid ${color}66`,
      borderRadius: 16,
      boxShadow: `0 20px 42px rgba(0,0,0,0.45), 0 0 34px ${color}2a`,
      padding: 14,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ color, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {getTierLabel(slot.tier)} · {slot.id}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.02)',
            color: VIEW_THEME.dim,
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 8,
            cursor: 'pointer',
            width: 26,
            height: 26,
            lineHeight: '24px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ color: VIEW_THEME.text, fontSize: 18, marginBottom: 4 }}>
        {slot.tenant?.name || 'Slot disponible'}
      </div>
      <div style={{ color: VIEW_THEME.dim, fontSize: 12, lineHeight: 1.45 }}>
        {slot.tenant?.slogan || (slot.occ ? 'Campagne active' : 'Disponible immédiatement')}
      </div>

      <div style={{
        marginTop: 12,
        marginBottom: 12,
        padding: '9px 11px',
        border: '1px solid rgba(171,198,255,0.26)',
        borderRadius: 10,
        color: VIEW_THEME.muted,
        fontSize: 11,
        background: 'rgba(255,255,255,0.02)',
      }}>
        Tarif journalier: <strong style={{ color: VIEW_THEME.text }}>{formatTierPrice(slot.tier)}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={() => onViewSlot?.(slot)}
          style={actionButtonStyle({
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(191,211,255,0.24)',
            color: VIEW_THEME.text,
          })}
        >
          Voir la fiche
        </button>

        <button
          onClick={() => onCheckout?.(slot)}
          style={actionButtonStyle({
            background: `linear-gradient(145deg, ${color}3d, ${color}1f)`,
            border: `1px solid ${color}`,
            color: '#fff',
          })}
        >
          Réserver
        </button>

        <button
          onClick={() => onBuyout?.(slot)}
          style={{
            ...actionButtonStyle({
              background: 'transparent',
              border: '1px dashed rgba(190,212,255,0.34)',
              color: VIEW_THEME.muted,
              disabled: !user,
            }),
            gridColumn: '1 / -1',
          }}
          disabled={!user}
        >
          Proposer un buyout
        </button>
      </div>
    </div>
  )
}
