import { getTierColor } from '../../shared/constants'

function colorFromHex(THREE, hex) {
  return new THREE.Color(hex)
}

function createRoughnessTexture(THREE, size = 128) {
  const data = new Uint8Array(size * size * 4)

  for (let i = 0; i < size * size; i++) {
    const grain = Math.random()
    const streak = Math.random() * 0.22
    const value = Math.floor((0.48 + grain * 0.44 + streak) * 255)
    const idx = i * 4
    data[idx] = value
    data[idx + 1] = value
    data[idx + 2] = value
    data[idx + 3] = 255
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  texture.needsUpdate = true
  return texture
}

function createNormalDetailTexture(THREE, size = 128) {
  const data = new Uint8Array(size * size * 4)

  for (let i = 0; i < size * size; i++) {
    const nx = (Math.random() - 0.5) * 0.38
    const ny = (Math.random() - 0.5) * 0.38
    const nz = Math.sqrt(Math.max(0.1, 1 - nx * nx - ny * ny))
    const idx = i * 4

    data[idx] = Math.floor((nx * 0.5 + 0.5) * 255)
    data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255)
    data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255)
    data[idx + 3] = 255
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  texture.needsUpdate = true
  return texture
}

function applyRimAndMicroDetail(material, THREE, { rimColor, rimPower = 2.6, rimIntensity = 0.22, noiseIntensity = 0.018 }) {
  const rim = colorFromHex(THREE, rimColor)

  material.customProgramCacheKey = () => `${material.name || 'tier'}-rim-${rim.getHexString()}-${rimPower}-${rimIntensity}-${noiseIntensity}`
  material.onBeforeCompile = shader => {
    shader.uniforms.uRimColor = { value: rim }
    shader.uniforms.uRimPower = { value: rimPower }
    shader.uniforms.uRimIntensity = { value: rimIntensity }
    shader.uniforms.uNoiseIntensity = { value: noiseIntensity }

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimIntensity;
uniform float uNoiseIntensity;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `float rimDot = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
float rim = pow(rimDot, uRimPower) * uRimIntensity;
float grain = fract(sin(dot(vViewPosition.xyz * 1.17, vec3(12.9898, 78.233, 37.719))) * 43758.5453123);
gl_FragColor.rgb += uRimColor * rim;
gl_FragColor.rgb += (grain - 0.5) * uNoiseIntensity;
#include <dithering_fragment>`
    )
  }

  material.needsUpdate = true
}

export function createTierMaterialLibrary(THREE) {
  const materials = new Map()
  const textureDisposables = []

  const roughnessMap = createRoughnessTexture(THREE)
  const normalMap = createNormalDetailTexture(THREE)
  textureDisposables.push(roughnessMap, normalMap)

  const tierSetup = {
    epicenter: { roughness: 0.2, metalness: 0.78, clearcoat: 0.95, emissive: 0.55, opacity: 0.94, ior: 1.55, rimIntensity: 0.36 },
    prestige: { roughness: 0.3, metalness: 0.62, clearcoat: 0.88, emissive: 0.25, opacity: 0.92, ior: 1.45, rimIntensity: 0.24 },
    elite: { roughness: 0.33, metalness: 0.56, clearcoat: 0.82, emissive: 0.22, opacity: 0.9, ior: 1.43, rimIntensity: 0.22 },
    business: { roughness: 0.38, metalness: 0.5, clearcoat: 0.76, emissive: 0.18, opacity: 0.88, ior: 1.4, rimIntensity: 0.2 },
    standard: { roughness: 0.42, metalness: 0.46, clearcoat: 0.68, emissive: 0.15, opacity: 0.84, ior: 1.38, rimIntensity: 0.17 },
    viral: { roughness: 0.5, metalness: 0.38, clearcoat: 0.62, emissive: 0.12, opacity: 0.78, ior: 1.34, rimIntensity: 0.14 },
  }

  const makeTierMaterial = tier => {
    const setup = tierSetup[tier]
    const color = colorFromHex(THREE, getTierColor(tier))

    const material = new THREE.MeshPhysicalMaterial({
      name: `tier-${tier}`,
      color,
      roughness: setup.roughness,
      metalness: setup.metalness,
      clearcoat: setup.clearcoat,
      clearcoatRoughness: 0.2,
      ior: setup.ior,
      sheen: 0.15,
      sheenColor: color.clone().offsetHSL(0, 0.08, 0.05),
      sheenRoughness: 0.55,
      emissive: color.clone().offsetHSL(0, 0.05, 0.03),
      emissiveIntensity: setup.emissive,
      transparent: true,
      opacity: setup.opacity,
      depthWrite: tier !== 'viral',
      vertexColors: true,
      roughnessMap,
      normalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      envMapIntensity: tier === 'epicenter' ? 1.35 : 0.9,
    })

    applyRimAndMicroDetail(material, THREE, {
      rimColor: getTierColor(tier),
      rimPower: tier === 'epicenter' ? 2.1 : 2.7,
      rimIntensity: setup.rimIntensity,
      noiseIntensity: tier === 'viral' ? 0.016 : 0.014,
    })

    return material
  }

  for (const tier of ['epicenter', 'prestige', 'elite', 'business', 'standard', 'viral']) {
    materials.set(tier, makeTierMaterial(tier))
  }

  const atmosphere = new THREE.MeshPhysicalMaterial({
    color: 0x5f87ff,
    roughness: 0.16,
    metalness: 0,
    clearcoat: 0.5,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    emissive: 0x2a4fb4,
    emissiveIntensity: 0.24,
  })
  applyRimAndMicroDetail(atmosphere, THREE, {
    rimColor: '#8fd8ff',
    rimPower: 2.35,
    rimIntensity: 0.3,
    noiseIntensity: 0.01,
  })

  materials.set('atmosphere', atmosphere)

  const shell = new THREE.MeshPhysicalMaterial({
    color: 0x1d2848,
    roughness: 0.35,
    metalness: 0.6,
    clearcoat: 0.7,
    clearcoatRoughness: 0.35,
    transparent: true,
    opacity: 0.24,
    emissive: 0x19294a,
    emissiveIntensity: 0.16,
  })
  applyRimAndMicroDetail(shell, THREE, {
    rimColor: '#5f9dff',
    rimPower: 2.8,
    rimIntensity: 0.16,
    noiseIntensity: 0.012,
  })
  materials.set('shell', shell)

  const shellWire = new THREE.LineBasicMaterial({
    color: 0x78a5ff,
    transparent: true,
    opacity: 0.18,
  })
  materials.set('shellWire', shellWire)

  const orbit = new THREE.MeshBasicMaterial({
    color: 0x76b9ff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  materials.set('orbit', orbit)

  return {
    get(tier) {
      return materials.get(tier)
    },
    dispose() {
      for (const material of materials.values()) {
        if (typeof material.dispose === 'function') material.dispose()
      }
      for (const texture of textureDisposables) {
        if (typeof texture.dispose === 'function') texture.dispose()
      }
      materials.clear()
    },
  }
}

function seededSlotValue(slot) {
  const x = Number(slot?.x || 0)
  const y = Number(slot?.y || 0)
  const base = Math.sin(x * 12.9898 + y * 78.233 + 0.7123) * 43758.5453
  return base - Math.floor(base)
}

export function getInstanceColor(THREE, slot, tier, { isDimmed = false, isHovered = false, isSelected = false } = {}) {
  const baseHex = slot?.occ ? slot?.tenant?.c || getTierColor(tier) : getTierColor(tier)
  const color = new THREE.Color(baseHex)

  const variance = seededSlotValue(slot)
  color.offsetHSL((variance - 0.5) * 0.03, (variance - 0.5) * 0.08, (variance - 0.5) * 0.11)

  if (!slot?.occ) color.lerp(new THREE.Color('#1e2638'), 0.55)
  if (isDimmed) color.multiplyScalar(0.34)
  if (isHovered) color.lerp(new THREE.Color('#d1ecff'), 0.27)
  if (isSelected) color.lerp(new THREE.Color('#ffffff'), 0.5)

  return color
}
