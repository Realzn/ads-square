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
  const promo = slot.promo || {}
  const hasImage = Boolean(promo.imageUrl)

  return (
    <div style={{
      position: 'absolute',
      right: 14,
      top: 14,
      zIndex: 26,
      width: 332,
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: '76px 1fr',
        gap: 10,
        marginBottom: 12,
      }}>
        <div style={{
          width: 76,
          height: 76,
          borderRadius: 12,
          overflow: 'hidden',
          background: hasImage
            ? `url(${promo.imageUrl}) center/cover no-repeat`
            : `linear-gradient(145deg, ${color}30, rgba(11,18,34,0.9))`,
          border: `1px solid ${color}55`,
          boxShadow: `inset 0 0 0 1px ${color}20`,
          display: 'grid',
          placeItems: 'center',
          fontSize: 22,
          color: '#fff',
        }}>
          {!hasImage && (promo.contentIcon || '◈')}
        </div>

        <div>
          <div style={{ color: VIEW_THEME.text, fontSize: 18, marginBottom: 4 }}>
            {promo.title || slot.tenant?.name || 'Slot disponible'}
          </div>
          <div style={{ color: VIEW_THEME.dim, fontSize: 12, lineHeight: 1.45 }}>
            {promo.teaser || slot.tenant?.slogan || (slot.occ ? 'Campagne active' : 'Disponible immédiatement')}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 7px',
              borderRadius: 999,
              border: `1px solid ${color}66`,
              color,
              fontSize: 9,
              letterSpacing: '.08em',
            }}>
              {promo.badge || 'PROMO'}
            </span>
            <span style={{
              padding: '2px 7px',
              borderRadius: 999,
              border: '1px solid rgba(175,201,255,0.35)',
              color: VIEW_THEME.muted,
              fontSize: 9,
            }}>
              {promo.ctaText || 'Découvrir'}
            </span>
          </div>
        </div>
      </div>

      <div style={{
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
