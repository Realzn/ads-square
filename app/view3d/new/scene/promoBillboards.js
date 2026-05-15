import { getTierColor } from '../../shared/constants'

const TIER_BILLBOARD_SIZE = {
  epicenter: { width: 2.75, height: 1.5, offset: 3.7 },
  prestige: { width: 2.46, height: 1.36, offset: 1.26 },
  elite: { width: 2.18, height: 1.22, offset: 1.05 },
  business: { width: 1.88, height: 1.02, offset: 0.9 },
  standard: { width: 1.58, height: 0.86, offset: 0.74 },
  viral: { width: 1.32, height: 0.72, offset: 0.62 },
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function hexToRgb(hex, fallback = [126, 163, 255]) {
  const raw = String(hex || '').replace('#', '')
  if (raw.length !== 6) return fallback
  const parsed = Number.parseInt(raw, 16)
  if (Number.isNaN(parsed)) return fallback
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255]
}

function rgbaFromHex(hex, alpha = 1) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBadge(ctx, text, { x, y, color, dark = false }) {
  const label = text || 'PROMO'
  ctx.save()
  ctx.font = '700 19px Inter, Rajdhani, sans-serif'
  const width = ctx.measureText(label).width + 22
  roundedRect(ctx, x, y, width, 28, 14)
  ctx.fillStyle = dark ? 'rgba(6, 11, 22, 0.92)' : rgbaFromHex(color, 0.24)
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = dark ? rgbaFromHex(color, 0.48) : rgbaFromHex(color, 0.65)
  ctx.stroke()
  ctx.fillStyle = '#f5f9ff'
  ctx.fillText(label, x + 11, y + 19)
  ctx.restore()
  return width
}

function drawPromoTexture({ ctx, width, height, promo, accentColor, mode }) {
  const title = promo?.title || 'Annonce active'
  const teaser = promo?.teaser || promo?.productServiceLabel || 'Produit / service'
  const badge = promo?.badge || 'PROMO'
  const cta = promo?.ctaText || 'Découvrir'
  const icon = promo?.contentIcon || '◈'

  const bgTop = 'rgba(6, 11, 25, 0.96)'
  const bgBottom = 'rgba(8, 12, 21, 0.86)'
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, bgTop)
  gradient.addColorStop(1, bgBottom)

  roundedRect(ctx, 0, 0, width, height, 20)
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.lineWidth = 2
  ctx.strokeStyle = rgbaFromHex(accentColor, 0.78)
  ctx.stroke()

  ctx.fillStyle = rgbaFromHex(accentColor, 0.18)
  roundedRect(ctx, 10, 10, width - 20, 32, 12)
  ctx.fill()

  drawBadge(ctx, badge, { x: 14, y: 12, color: accentColor, dark: true })

  const visualW = mode === 'detail' ? 110 : 76
  const visualH = mode === 'detail' ? 86 : 56
  const visualY = mode === 'detail' ? 52 : 46

  roundedRect(ctx, 16, visualY, visualW, visualH, 12)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = rgbaFromHex(accentColor, 0.42)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = mode === 'detail' ? '700 40px Rajdhani, sans-serif' : '700 30px Rajdhani, sans-serif'
  ctx.fillText(icon, 16 + visualW * 0.34, visualY + visualH * 0.62)

  const textX = 16 + visualW + 14
  const titleSize = mode === 'detail' ? 33 : 24
  const teaserSize = mode === 'detail' ? 20 : 17

  ctx.fillStyle = '#edf4ff'
  ctx.font = `700 ${titleSize}px Rajdhani, Inter, sans-serif`
  const clippedTitle = title.length > 24 ? `${title.slice(0, 23)}…` : title
  ctx.fillText(clippedTitle, textX, mode === 'detail' ? 94 : 82)

  ctx.fillStyle = 'rgba(210, 226, 255, 0.86)'
  ctx.font = `500 ${teaserSize}px Inter, sans-serif`
  const teaserMax = mode === 'detail' ? 42 : 32
  const clippedTeaser = teaser.length > teaserMax ? `${teaser.slice(0, teaserMax - 1)}…` : teaser
  ctx.fillText(clippedTeaser, textX, mode === 'detail' ? 124 : 106)

  if (mode === 'detail') {
    drawBadge(ctx, cta.toUpperCase(), {
      x: textX,
      y: 147,
      color: accentColor,
      dark: false,
    })
  }

  ctx.fillStyle = rgbaFromHex(accentColor, 0.2)
  ctx.fillRect(0, height - 7, width, 7)
}

function buildTexture(THREE, promo, accentColor, mode = 'compact') {
  const canvas = document.createElement('canvas')
  canvas.width = mode === 'detail' ? 420 : 320
  canvas.height = mode === 'detail' ? 224 : 168
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  drawPromoTexture({
    ctx,
    width: canvas.width,
    height: canvas.height,
    promo,
    accentColor,
    mode,
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return { texture, canvas }
}

function resolveAccent(slot, tier) {
  return slot?.tenant?.c || slot?.primary_color || getTierColor(tier)
}

export function createPromoBillboardLayer({ THREE, root, entries = [] }) {
  if (!entries.length) {
    return {
      updateState() {},
      tick() {},
      dispose() {},
    }
  }

  const group = new THREE.Group()
  group.name = 'promo-billboard-layer'
  group.renderOrder = 9
  root.add(group)

  const textureLoader = new THREE.TextureLoader()
  textureLoader.setCrossOrigin?.('anonymous')

  const billboards = new Map()
  const targetScale = new THREE.Vector3()
  const targetPosition = new THREE.Vector3()
  let lodTimer = 0

  const attachLogo = item => {
    const imageUrl = item.promo?.imageUrl
    if (!imageUrl || item.logoSprite) return

    textureLoader.load(
      imageUrl,
      texture => {
        if (!item.sprite.parent) {
          texture.dispose?.()
          return
        }

        texture.generateMipmaps = false
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter

        const logoMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          opacity: 0.95,
        })
        logoMaterial.toneMapped = false

        const logoSprite = new THREE.Sprite(logoMaterial)
        const side = item.base.width * 0.24
        logoSprite.scale.set(side, side, 1)
        logoSprite.position.set(-item.base.width * 0.29, item.base.height * 0.07, 0.02)
        logoSprite.visible = false

        item.sprite.add(logoSprite)
        item.logoSprite = logoSprite
        item.logoTexture = texture
      },
      undefined,
      () => {}
    )
  }

  const setDisplayMode = (item, mode) => {
    if (item.mode === mode) return

    if (mode === 'detail' && !item.detailTexture) {
      const detail = buildTexture(THREE, item.promo, item.accentColor, 'detail')
      item.detailTexture = detail?.texture || null
      item.detailCanvas = detail?.canvas || null
    }

    item.mode = mode
    if (mode === 'detail' && item.detailTexture) {
      item.material.map = item.detailTexture
    } else {
      item.material.map = item.compactTexture
    }
    item.material.needsUpdate = true
  }

  for (const entry of entries) {
    if (!entry?.slot?.occ) continue

    const base = TIER_BILLBOARD_SIZE[entry.tier] || TIER_BILLBOARD_SIZE.standard
    const accentColor = resolveAccent(entry.slot, entry.tier)
    const compact = buildTexture(THREE, entry.promo, accentColor, 'compact')
    if (!compact?.texture) continue

    const material = new THREE.SpriteMaterial({
      map: compact.texture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      opacity: 0.78,
    })
    material.alphaTest = 0.08
    material.toneMapped = false

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(base.width, base.height, 1)
    sprite.position.copy(entry.position).addScaledVector(entry.normal, base.offset)
    sprite.renderOrder = 10
    group.add(sprite)

    const item = {
      slotId: entry.slot.id,
      tier: entry.tier,
      promo: entry.promo,
      accentColor,
      sprite,
      material,
      base,
      anchor: entry.position.clone(),
      normal: entry.normal.clone(),
      compactTexture: compact.texture,
      compactCanvas: compact.canvas,
      detailTexture: null,
      detailCanvas: null,
      logoSprite: null,
      logoTexture: null,
      mode: 'compact',
      focused: false,
      dimmed: false,
    }

    billboards.set(item.slotId, item)
    attachLogo(item)
  }

  const updateState = ({ activeTier = null, hoveredSlotId = null, selectedSlotId = null }) => {
    for (const item of billboards.values()) {
      item.focused = item.slotId === hoveredSlotId || item.slotId === selectedSlotId
      item.dimmed = Boolean(activeTier && item.tier !== activeTier)
      setDisplayMode(item, item.focused ? 'detail' : 'compact')
    }
  }

  const tick = ({ dt, camera }) => {
    if (!camera) return

    lodTimer += dt
    if (lodTimer < 0.05) return
    lodTimer = 0

    for (const item of billboards.values()) {
      const distance = camera.position.distanceTo(item.anchor)
      const distanceFactor = clamp((distance - 14) / 86, 0, 1)
      const focusBoost = item.focused ? 1.22 : 1
      const distanceScale = 1 + distanceFactor * 0.52

      targetScale.set(
        item.base.width * focusBoost * distanceScale,
        item.base.height * focusBoost * distanceScale,
        1
      )
      item.sprite.scale.lerp(targetScale, 0.28)

      const lift = item.base.offset + (item.focused ? 0.22 : 0) + distanceFactor * 0.12
      targetPosition.copy(item.anchor).addScaledVector(item.normal, lift)
      item.sprite.position.lerp(targetPosition, 0.24)

      const baseOpacity = item.focused ? 1 : 0.74 - distanceFactor * 0.24
      const dimFactor = item.dimmed ? 0.26 : 1
      item.material.opacity = clamp(baseOpacity * dimFactor, 0.12, 1)

      if (item.logoSprite) {
        item.logoSprite.visible = item.focused || distance < 34
        item.logoSprite.material.opacity = item.focused ? 0.98 : 0.76
      }
    }
  }

  const dispose = () => {
    for (const item of billboards.values()) {
      item.compactTexture?.dispose?.()
      item.detailTexture?.dispose?.()
      item.material?.dispose?.()
      item.logoTexture?.dispose?.()
      item.logoSprite?.material?.dispose?.()
    }
    billboards.clear()
    root.remove(group)
  }

  return {
    updateState,
    tick,
    dispose,
  }
}
