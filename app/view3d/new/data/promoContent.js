const CONTENT_TYPE_LABELS = {
  video: 'Vidéo sponsorisée',
  image: 'Visuel produit',
  link: 'Service en ligne',
  social: 'Compte social',
  music: 'Sortie musicale',
  app: 'Application',
  brand: 'Marque',
  clothing: 'Collection mode',
  fashion: 'Collection mode',
  lifestyle: 'Offre lifestyle',
  text: 'Publication',
}

const CONTENT_TYPE_BADGES = {
  video: 'VIDEO',
  image: 'VISUEL',
  link: 'SERVICE',
  social: 'SOCIAL',
  music: 'MUSIC',
  app: 'APP',
  brand: 'BRAND',
  clothing: 'MODE',
  fashion: 'MODE',
  lifestyle: 'LIFE',
  text: 'POST',
}

const CONTENT_TYPE_ICONS = {
  video: '▶',
  image: '▦',
  link: '⌁',
  social: '◎',
  music: '♪',
  app: '⬢',
  brand: '◈',
  clothing: '◍',
  fashion: '◍',
  lifestyle: '✦',
  text: '≣',
}

function sanitizeString(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text.length ? text : null
}

function pickFirstString(...values) {
  for (const value of values) {
    const clean = sanitizeString(value)
    if (clean) return clean
  }
  return null
}

function compactLabel(text, max = 22) {
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function getProductServiceLabel({ contentType, badge, slogan, ctaText } = {}) {
  const normalizedType = sanitizeString(contentType)?.toLowerCase()
  if (normalizedType && CONTENT_TYPE_LABELS[normalizedType]) return CONTENT_TYPE_LABELS[normalizedType]

  const cleanBadge = sanitizeString(badge)
  if (cleanBadge) return compactLabel(cleanBadge, 28)

  const cleanSlogan = sanitizeString(slogan)
  if (cleanSlogan) return compactLabel(cleanSlogan, 36)

  const cleanCta = sanitizeString(ctaText)
  if (cleanCta) return `Offre · ${compactLabel(cleanCta, 18)}`

  return 'Offre sponsorisée'
}

export function normalizePromoContent(slot) {
  const tenant = slot?.tenant || {}

  const displayName = pickFirstString(
    tenant.display_name,
    tenant.name,
    slot?.display_name,
    slot?.name,
    slot?.title,
    slot?.id ? `Annonce ${slot.id}` : null
  ) || 'Annonce en diffusion'

  const contentType = (
    pickFirstString(tenant.content_type, tenant.t, slot?.content_type, slot?.type) || 'link'
  ).toLowerCase()

  const slogan = pickFirstString(tenant.slogan, slot?.slogan)
  const badge = pickFirstString(tenant.badge, slot?.badge) || CONTENT_TYPE_BADGES[contentType] || 'PROMO'
  const ctaText = pickFirstString(tenant.cta_text, tenant.cta, slot?.cta_text) || 'Découvrir'
  const ctaUrl = pickFirstString(tenant.cta_url, tenant.url, slot?.cta_url, slot?.url)
  const imageUrl = pickFirstString(tenant.image_url, tenant.img, slot?.image_url)

  return {
    title: displayName,
    shortTitle: compactLabel(displayName, 18),
    slogan,
    teaser: slogan || getProductServiceLabel({ contentType, badge, ctaText }),
    contentType,
    contentIcon: CONTENT_TYPE_ICONS[contentType] || '◈',
    badge: compactLabel(badge.toUpperCase(), 14),
    ctaText: compactLabel(ctaText, 20),
    ctaUrl,
    imageUrl,
    productServiceLabel: getProductServiceLabel({ contentType, badge, slogan, ctaText }),
  }
}
