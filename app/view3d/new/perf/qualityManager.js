const QUALITY_PROFILES = {
  high: {
    key: 'high',
    dprMin: 1,
    dprMax: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    postprocess: true,
    bloomStrength: 0.4,
    starCount: 2200,
    slotDetail: 1,
  },
  medium: {
    key: 'medium',
    dprMin: 1,
    dprMax: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 512,
    postprocess: true,
    bloomStrength: 0.25,
    starCount: 1400,
    slotDetail: 0.8,
  },
  low: {
    key: 'low',
    dprMin: 0.8,
    dprMax: 1.1,
    antialias: false,
    shadows: false,
    shadowMapSize: 256,
    postprocess: false,
    bloomStrength: 0,
    starCount: 700,
    slotDetail: 0.65,
  },
  fallback: {
    key: 'fallback',
    dprMin: 1,
    dprMax: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 0,
    postprocess: false,
    bloomStrength: 0,
    starCount: 0,
    slotDetail: 0.55,
  },
}

export function canUseWebGL() {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}

export function getQualityProfile() {
  if (typeof window === 'undefined') return QUALITY_PROFILES.medium

  if (!canUseWebGL()) return QUALITY_PROFILES.fallback

  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth || 1440
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  if (reducedMotion) return QUALITY_PROFILES.low

  const veryStrongDevice = cores >= 8 && memory >= 8 && width >= 1440 && dpr >= 1.25
  if (veryStrongDevice) return QUALITY_PROFILES.high

  const constrained = width < 1100 || cores <= 4 || memory <= 4
  if (constrained) return QUALITY_PROFILES.low

  return QUALITY_PROFILES.medium
}

export function getPixelRatio(profile) {
  if (typeof window === 'undefined') return 1
  const dpr = window.devicePixelRatio || 1
  return Math.min(profile.dprMax, Math.max(profile.dprMin, dpr))
}

export function createAdaptiveFrameLimiter(profile) {
  const targetFps = profile.key === 'high' ? 60 : profile.key === 'medium' ? 48 : 32
  const frameStep = 1 / targetFps
  let accumulator = 0

  return {
    shouldRender(dt) {
      accumulator += dt
      if (accumulator < frameStep) return false
      accumulator = 0
      return true
    },
    targetFps,
  }
}
