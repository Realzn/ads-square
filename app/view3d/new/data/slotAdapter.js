import { TIER_ORDER, TIER_INDEX } from '../../shared/constants'
import { normalizePromoContent } from './promoContent'

function toSlotId(slot, idx) {
  if (slot?.id != null) return String(slot.id)
  if (slot?.x != null && slot?.y != null) return `${slot.x},${slot.y}`
  return `slot-${idx}`
}

export function normalizeSlots(rawSlots = []) {
  return rawSlots
    .map((slot, idx) => {
      const tier = TIER_ORDER.includes(slot?.tier) ? slot.tier : 'viral'
      return {
        ...slot,
        id: toSlotId(slot, idx),
        tier,
        occ: Boolean(slot?.occ ?? slot?.is_occupied),
        promo: normalizePromoContent(slot),
      }
    })
    .sort((a, b) => {
      const td = (TIER_INDEX[a.tier] ?? 99) - (TIER_INDEX[b.tier] ?? 99)
      if (td !== 0) return td
      const ay = Number(a.y || 0)
      const by = Number(b.y || 0)
      if (ay !== by) return ay - by
      return Number(a.x || 0) - Number(b.x || 0)
    })
}

export function buildTierStats(slots = []) {
  return TIER_ORDER.reduce((acc, tier) => {
    const tierSlots = slots.filter(slot => slot.tier === tier)
    const occupied = tierSlots.filter(slot => slot.occ).length
    const total = tierSlots.length
    acc[tier] = {
      tier,
      total,
      occupied,
      free: total - occupied,
      ratio: total > 0 ? occupied / total : 0,
    }
    return acc
  }, {})
}

export function groupSlotsByTier(slots = []) {
  return TIER_ORDER.reduce((acc, tier) => {
    acc[tier] = slots.filter(slot => slot.tier === tier)
    return acc
  }, {})
}

export function getGlobalStats(slots = []) {
  const occupied = slots.filter(slot => slot.occ).length
  const total = slots.length
  return {
    total,
    occupied,
    free: total - occupied,
    ratio: total > 0 ? occupied / total : 0,
  }
}
