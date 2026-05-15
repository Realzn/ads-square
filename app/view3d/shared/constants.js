import { TIER_LABEL, TIER_PRICE, TIER_COLOR } from '../../../lib/grid'

export const TIER_ORDER = ['epicenter', 'prestige', 'elite', 'business', 'standard', 'viral']

export const TIER_INDEX = TIER_ORDER.reduce((acc, tier, idx) => {
  acc[tier] = idx
  return acc
}, {})

export const TIER_ICON = {
  epicenter: '⬢',
  prestige: '◉',
  elite: '◌',
  business: '◈',
  standard: '◍',
  viral: '✶',
}

export const VIEW_THEME = {
  background: '#040610',
  backgroundGradient: 'radial-gradient(circle at 20% 10%, #1a2450 0%, #090d1f 36%, #040611 100%)',
  panel: 'linear-gradient(145deg, rgba(10,14,31,0.8), rgba(6,10,22,0.7))',
  panelBorder: 'rgba(166, 207, 255, 0.24)',
  text: '#ecf2ff',
  muted: 'rgba(210,223,255,0.82)',
  dim: 'rgba(158,180,231,0.6)',
  accent: '#9ed3ff',
  success: '#62ecb6',
  danger: '#ff7ca3',
}

export const CAMERA_PRESETS = {
  default: { position: [0, 13.5, 47], target: [0, 0, 0] },
  tier: {
    epicenter: { position: [0, 8, 17], target: [0, 0, 0] },
    prestige: { position: [0, 13, 28], target: [0, 0, 0] },
    elite: { position: [0, 15.5, 36], target: [0, 0, 0] },
    business: { position: [0, 17.4, 45], target: [0, 0, 0] },
    standard: { position: [0, 19, 54], target: [0, 0, 0] },
    viral: { position: [0, 21.2, 63], target: [0, 0, 0] },
  },
}

export function formatTierPrice(tier) {
  const value = Number(TIER_PRICE?.[tier] || 0) / 100
  return `€${value.toLocaleString('fr-FR')}/j`
}

export function getTierLabel(tier) {
  return TIER_LABEL?.[tier] || tier
}

export function getTierColor(tier, fallback = '#7890c6') {
  return TIER_COLOR?.[tier] || fallback
}
