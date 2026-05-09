import { TIER_LABEL, TIER_PRICE, TIER_COLOR } from '../../../lib/grid'

export const TIER_ORDER = ['epicenter', 'prestige', 'elite', 'business', 'standard', 'viral']

export const TIER_INDEX = TIER_ORDER.reduce((acc, tier, idx) => {
  acc[tier] = idx
  return acc
}, {})

export const TIER_ICON = {
  epicenter: '◈',
  prestige: '◎',
  elite: '◍',
  business: '▣',
  standard: '▪',
  viral: '✦',
}

export const VIEW_THEME = {
  background: '#03040a',
  backgroundGradient: 'radial-gradient(circle at 20% 12%, #141a2f 0%, #05060d 45%, #020207 100%)',
  panel: 'rgba(6,8,18,0.78)',
  panelBorder: 'rgba(255,255,255,0.10)',
  text: '#e6ecfa',
  muted: 'rgba(198,208,236,0.72)',
  dim: 'rgba(160,172,205,0.45)',
  accent: '#86bbff',
  success: '#57d79c',
  danger: '#f56d8b',
}

export const CAMERA_PRESETS = {
  default: { position: [0, 14, 48], target: [0, 0, 0] },
  tier: {
    epicenter: { position: [0, 8, 18], target: [0, 0, 0] },
    prestige: { position: [0, 14, 30], target: [0, 0, 0] },
    elite: { position: [0, 16, 38], target: [0, 0, 0] },
    business: { position: [0, 18, 48], target: [0, 0, 0] },
    standard: { position: [0, 20, 56], target: [0, 0, 0] },
    viral: { position: [0, 22, 64], target: [0, 0, 0] },
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
