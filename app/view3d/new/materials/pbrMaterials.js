import { getTierColor } from '../../shared/constants'

function colorFromHex(THREE, hex) {
  const color = new THREE.Color(hex)
  return color
}

export function createTierMaterialLibrary(THREE) {
  const materials = new Map()

  const makeTierMaterial = tier => new THREE.MeshPhysicalMaterial({
    color: colorFromHex(THREE, getTierColor(tier)),
    roughness: tier === 'epicenter' ? 0.2 : 0.45,
    metalness: tier === 'epicenter' ? 0.55 : 0.35,
    clearcoat: 0.65,
    clearcoatRoughness: 0.2,
    emissive: colorFromHex(THREE, getTierColor(tier)),
    emissiveIntensity: tier === 'epicenter' ? 0.45 : 0.18,
    transparent: true,
    opacity: tier === 'viral' ? 0.74 : 0.9,
    reflectivity: 0.7,
    vertexColors: true,
  })

  for (const tier of ['epicenter', 'prestige', 'elite', 'business', 'standard', 'viral']) {
    materials.set(tier, makeTierMaterial(tier))
  }

  const atmosphere = new THREE.MeshPhysicalMaterial({
    color: 0x4e85ff,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  materials.set('atmosphere', atmosphere)

  return {
    get(tier) {
      return materials.get(tier)
    },
    dispose() {
      for (const material of materials.values()) material.dispose()
      materials.clear()
    },
  }
}

export function getInstanceColor(THREE, slot, tier, { isDimmed = false, isHovered = false, isSelected = false } = {}) {
  const baseHex = slot?.occ ? slot?.tenant?.c || getTierColor(tier) : getTierColor(tier)
  const color = new THREE.Color(baseHex)

  if (!slot?.occ) color.lerp(new THREE.Color('#263046'), 0.45)
  if (isDimmed) color.multiplyScalar(0.4)
  if (isHovered) color.lerp(new THREE.Color('#d7ebff'), 0.25)
  if (isSelected) color.lerp(new THREE.Color('#ffffff'), 0.45)

  return color
}
