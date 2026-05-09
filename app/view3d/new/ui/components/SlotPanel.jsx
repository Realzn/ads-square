import { formatTierPrice, getTierColor, getTierLabel, VIEW_THEME } from '../../../shared/constants'

export default function SlotPanel({ slot, user, onClose, onCheckout, onBuyout, onViewSlot }) {
  if (!slot) return null

  const color = getTierColor(slot.tier)

  return (
    <div style={{
      position: 'absolute',
      right: 14,
      top: 14,
      zIndex: 26,
      width: 300,
      maxWidth: 'calc(100% - 28px)',
      background: 'rgba(6,8,16,0.94)',
      border: `1px solid ${color}66`,
      boxShadow: `0 20px 40px rgba(0,0,0,0.45), 0 0 30px ${color}24`,
      padding: 14,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ color, fontSize: 11, letterSpacing: '.1em' }}>
          {getTierLabel(slot.tier)} · {slot.id}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent',
          color: VIEW_THEME.dim,
          border: '1px solid rgba(255,255,255,0.14)',
          cursor: 'pointer',
          width: 24,
          height: 24,
        }}>
          ×
        </button>
      </div>

      <div style={{ color: VIEW_THEME.text, fontSize: 17, marginBottom: 4 }}>
        {slot.tenant?.name || 'Slot disponible'}
      </div>
      <div style={{ color: VIEW_THEME.dim, fontSize: 12, lineHeight: 1.45 }}>
        {slot.tenant?.slogan || (slot.occ ? 'Campagne active' : 'Disponible immédiatement')}
      </div>

      <div style={{
        marginTop: 12,
        marginBottom: 12,
        padding: '8px 10px',
        border: '1px solid rgba(255,255,255,0.12)',
        color: VIEW_THEME.muted,
        fontSize: 11,
      }}>
        Tarif journalier: <strong style={{ color: VIEW_THEME.text }}>{formatTierPrice(slot.tier)}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={() => onViewSlot?.(slot)}
          style={{
            padding: '9px 8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: VIEW_THEME.text,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Voir la fiche
        </button>

        <button
          onClick={() => onCheckout?.(slot)}
          style={{
            padding: '9px 8px',
            background: `${color}22`,
            border: `1px solid ${color}`,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Réserver
        </button>

        <button
          onClick={() => onBuyout?.(slot)}
          style={{
            gridColumn: '1 / -1',
            padding: '9px 8px',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.35)',
            color: user ? VIEW_THEME.muted : 'rgba(255,255,255,0.35)',
            cursor: user ? 'pointer' : 'not-allowed',
            fontSize: 11,
          }}
          disabled={!user}
        >
          Proposer un buyout
        </button>
      </div>
    </div>
  )
}
