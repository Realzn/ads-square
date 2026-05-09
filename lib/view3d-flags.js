const VALID_MODES = new Set(['legacy', 'new'])

export const VIEW3D_QUERY_PARAM = 'view3d'
export const VIEW3D_QA_QUERY_PARAM = 'view3dqa'
export const VIEW3D_STORAGE_KEY = 'adsmostfair:view3d:mode'

export function normalizeView3DMode(value) {
  const mode = String(value || '').toLowerCase().trim()
  return VALID_MODES.has(mode) ? mode : null
}

export function readView3DModeFromQuery(searchParams) {
  if (!searchParams) return null
  return normalizeView3DMode(searchParams.get(VIEW3D_QUERY_PARAM))
}

export function readView3DModeFromStorage() {
  if (typeof window === 'undefined') return null
  try {
    return normalizeView3DMode(window.localStorage.getItem(VIEW3D_STORAGE_KEY))
  } catch {
    return null
  }
}

export function readView3DModeFromEnv() {
  return normalizeView3DMode(process.env.NEXT_PUBLIC_VIEW3D_DEFAULT_MODE) || 'legacy'
}

export function resolveView3DMode(searchParams) {
  return (
    readView3DModeFromQuery(searchParams) ||
    readView3DModeFromStorage() ||
    readView3DModeFromEnv()
  )
}

export function persistView3DMode(mode) {
  if (typeof window === 'undefined') return
  const normalized = normalizeView3DMode(mode)
  if (!normalized) return
  try {
    window.localStorage.setItem(VIEW3D_STORAGE_KEY, normalized)
  } catch {}
}

export function canAccessView3DModeSwitch(user, searchParams) {
  const qaFlag = String(searchParams?.get(VIEW3D_QA_QUERY_PARAM) || '').toLowerCase()
  const qaEnabled = qaFlag === '1' || qaFlag === 'true' || qaFlag === 'yes'

  const email = String(user?.email || '').toLowerCase()
  const isAdminLike = Boolean(
    user?.is_admin ||
    user?.isAdmin ||
    user?.role === 'admin' ||
    user?.app_metadata?.role === 'admin' ||
    email.endsWith('@adsmostfair.com')
  )

  return qaEnabled || isAdminLike
}
