const QUALITY_PROFILES = {
  ultra: {
    key: 'ultra',
    dprMin: 1.25,
    dprMax: 2.2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    postprocess: true,
    bloomStrength: 0.5,
    bloomRadius: 0.42,
    bloomThreshold: 0.74,
    starCount: 4600,
    slotDetail: 1.2,
    panelCurveSegments: 14,
    panelBevelSegments: 5,
    smaa: true,
    colorGrade: true,
    chromaticAberration: 0.001,
    vignette: 0.32,
    targetFps: 60,
  },
  high: {
    key: 'high',
    dprMin: 1,
    dprMax: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 1536,
    postprocess: true,
    bloomStrength: 0.4,
    bloomRadius: 0.38,
    bloomThreshold: 0.78,
    starCount: 3200,
    slotDetail: 1.05,
    panelCurveSegments: 12,
    panelBevelSegments: 4,
    smaa: true,
    colorGrade: true,
    chromaticAberration: 0.0007,
    vignette: 0.28,
    targetFps: 60,
  },
  medium: {
    key: 'medium',
    dprMin: 1,
    dprMax: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 768,
    postprocess: true,
    bloomStrength: 0.28,
    bloomRadius: 0.3,
    bloomThreshold: 0.82,
    starCount: 1900,
    slotDetail: 0.9,
    panelCurveSegments: 10,
    panelBevelSegments: 3,
    smaa: false,
    colorGrade: true,
    chromaticAberration: 0.0004,
    vignette: 0.22,
    targetFps: 50,
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
    bloomRadius: 0,
    bloomThreshold: 1,
    starCount: 800,
    slotDetail: 0.72,
    panelCurveSegments: 7,
    panelBevelSegments: 2,
    smaa: false,
    colorGrade: false,
    chromaticAberration: 0,
    vignette: 0,
    targetFps: 36,
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
    bloomRadius: 0,
    bloomThreshold: 1,
    starCount: 0,
    slotDetail: 0.55,
    panelCurveSegments: 6,
    panelBevelSegments: 1,
    smaa: false,
    colorGrade: false,
    chromaticAberration: 0,
    vignette: 0,
    targetFps: 30,
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
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches

  if (reducedMotion) return QUALITY_PROFILES.low

  if (coarsePointer && width < 1024) return QUALITY_PROFILES.low

  const desktop = !coarsePointer && width >= 1180
  const ultraCapable = desktop && cores >= 8 && memory >= 8 && dpr >= 1.2 && width >= 1500
  if (ultraCapable) return QUALITY_PROFILES.ultra

  const highCapable = desktop && cores >= 4 && memory >= 4
  if (highCapable) return QUALITY_PROFILES.high

  const constrained = width < 900 || cores <= 2 || memory <= 3
  if (constrained) return QUALITY_PROFILES.low

  return QUALITY_PROFILES.medium
}

export function getPixelRatio(profile) {
  if (typeof window === 'undefined') return 1
  const dpr = window.devicePixelRatio || 1
  return Math.min(profile.dprMax, Math.max(profile.dprMin, dpr))
}

export function createAdaptiveFrameLimiter(profile) {
  const targetFps = profile?.targetFps || (profile.key === 'high' ? 60 : profile.key === 'medium' ? 48 : 32)
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
