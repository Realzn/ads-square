import { TIER_ORDER, getTierColor } from '../../shared/constants'
import { getInstanceColor } from '../materials/pbrMaterials'

const LAYER_CONFIG = {
  prestige: { radius: 11, size: 1.45, spread: 0.2 },
  elite: { radius: 18, size: 1.2, spread: 0.38 },
  business: { radius: 24, size: 1.05, spread: 0.55 },
  standard: { radius: 30, size: 0.95, spread: 0.7 },
  viral: { radius: 36, size: 0.8, spread: 0.95 },
}

function seeded(slot, salt = 0) {
  const x = Number(slot?.x || 0)
  const y = Number(slot?.y || 0)
  const h = Math.sin((x + 17 * salt) * 12.9898 + (y + salt) * 78.233) * 43758.5453
  return h - Math.floor(h)
}

function fibonacciPoint(THREE, index, total, radius, spread, slot) {
  const i = index + 0.5
  const phi = Math.acos(1 - (2 * i) / total)
  const theta = Math.PI * (1 + Math.sqrt(5)) * i
  const jitter = (seeded(slot, 7) - 0.5) * spread

  const x = Math.cos(theta + jitter) * Math.sin(phi) * radius
  const y = Math.cos(phi + jitter * 0.2) * radius
  const z = Math.sin(theta + jitter) * Math.sin(phi) * radius

  const position = new THREE.Vector3(x, y, z)
  const normal = position.clone().normalize()
  return { position, normal }
}

function createStarField(THREE, starCount = 1200) {
  const geometry = new THREE.BufferGeometry()
  const points = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i++) {
    const radius = 120 + Math.random() * 280
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    points[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
    points[i * 3 + 1] = Math.cos(phi) * radius
    points[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))

  const material = new THREE.PointsMaterial({
    color: 0xbfd7ff,
    size: 0.52,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  })

  return new THREE.Points(geometry, material)
}

export function createDysonScene({ THREE, scene, slots, quality, materialLibrary }) {
  const root = new THREE.Group()
  scene.add(root)

  const disposable = []
  const interactiveObjects = []
  const slotLookup = new Map()
  const instanceLookup = new Map()

  const coreLight = new THREE.PointLight(0xffd5a2, quality.key === 'low' ? 2.2 : 3.3, 90, 2)
  root.add(coreLight)

  const coreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.5, 2),
    materialLibrary.get('epicenter')
  )
  coreMesh.castShadow = quality.shadows
  coreMesh.receiveShadow = quality.shadows
  root.add(coreMesh)
  disposable.push(coreMesh.geometry)

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(25, quality.key === 'low' ? 16 : 32, quality.key === 'low' ? 12 : 24),
    new THREE.MeshStandardMaterial({
      color: 0x223252,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      metalness: 0.45,
      roughness: 0.75,
    })
  )
  shell.rotation.x = Math.PI * 0.12
  shell.rotation.z = Math.PI * 0.2
  root.add(shell)
  disposable.push(shell.geometry, shell.material)

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(26.5, 32, 24),
    materialLibrary.get('atmosphere')
  )
  root.add(atmosphere)
  disposable.push(atmosphere.geometry)

  if (quality.starCount > 0) {
    const stars = createStarField(THREE, quality.starCount)
    root.add(stars)
    disposable.push(stars.geometry, stars.material)
  }

  const epicSlot = slots.find(slot => slot.tier === 'epicenter')
  if (epicSlot) {
    coreMesh.userData = {
      __slotId: epicSlot.id,
      __slot: epicSlot,
      __position: new THREE.Vector3(0, 0, 0),
      __normal: new THREE.Vector3(0, 1, 0),
      __tier: 'epicenter',
      __isCore: true,
    }
    interactiveObjects.push(coreMesh)
    slotLookup.set(epicSlot.id, coreMesh.userData)
  }

  const dummy = new THREE.Object3D()

  const setSlotInLookup = (slot, payload) => {
    const fullPayload = {
      __slotId: slot.id,
      __slot: slot,
      __tier: slot.tier,
      ...payload,
    }
    slotLookup.set(slot.id, fullPayload)
    if (payload.__instanceId != null && payload.__mesh?.uuid) {
      instanceLookup.set(`${payload.__mesh.uuid}:${payload.__instanceId}`, fullPayload)
    }
  }

  for (const tier of TIER_ORDER.filter(t => t !== 'epicenter')) {
    const tierSlots = slots.filter(slot => slot.tier === tier)
    if (!tierSlots.length) continue

    const layer = LAYER_CONFIG[tier]
    const detail = quality.slotDetail
    const geoSize = Math.max(0.5, layer.size * detail)

    const geometry = new THREE.BoxGeometry(
      geoSize,
      geoSize * (tier === 'viral' ? 0.5 : 0.62),
      geoSize * 0.24
    )

    const mesh = new THREE.InstancedMesh(geometry, materialLibrary.get(tier), tierSlots.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.castShadow = quality.shadows
    mesh.receiveShadow = quality.shadows
    mesh.frustumCulled = false
    mesh.userData.__tier = tier

    for (let i = 0; i < tierSlots.length; i++) {
      const slot = tierSlots[i]
      const { position, normal } = fibonacciPoint(THREE, i, tierSlots.length, layer.radius, layer.spread, slot)

      dummy.position.copy(position)
      dummy.lookAt(position.clone().add(normal))
      dummy.rotateY((seeded(slot, 3) - 0.5) * Math.PI)
      dummy.rotateX((seeded(slot, 9) - 0.5) * 0.25)
      dummy.updateMatrix()

      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, getInstanceColor(THREE, slot, tier))
      setSlotInLookup(slot, { __instanceId: i, __position: position, __normal: normal, __mesh: mesh })
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    root.add(mesh)
    interactiveObjects.push(mesh)
    disposable.push(geometry)

    if (tier === 'elite') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(layer.radius + 0.6, 0.17, 12, quality.key === 'low' ? 100 : 180),
        new THREE.MeshStandardMaterial({
          color: getTierColor('elite'),
          metalness: 0.75,
          roughness: 0.3,
          emissive: getTierColor('elite'),
          emissiveIntensity: 0.08,
          transparent: true,
          opacity: 0.7,
        })
      )
      ring.rotation.x = Math.PI * 0.52
      root.add(ring)
      disposable.push(ring.geometry, ring.material)
    }
  }

  const raycast = raycaster => {
    const hits = raycaster.intersectObjects(interactiveObjects, false)
    if (!hits.length) return null

    const hit = hits[0]

    if (hit.object?.userData?.__isCore) {
      return hit.object.userData
    }

    const tier = hit.object?.userData?.__tier
    if (!tier || hit.instanceId == null) return null

    return instanceLookup.get(`${hit.object.uuid}:${hit.instanceId}`) || null
  }

  const updateSlotColors = ({ activeTier = null, hoveredSlotId = null, selectedSlotId = null }) => {
    for (const payload of slotLookup.values()) {
      const mesh = payload.__mesh
      if (!mesh || payload.__instanceId == null) continue

      const isDimmed = Boolean(activeTier && payload.__tier !== activeTier)
      const isHovered = payload.__slotId === hoveredSlotId
      const isSelected = payload.__slotId === selectedSlotId
      const color = getInstanceColor(THREE, payload.__slot, payload.__tier, { isDimmed, isHovered, isSelected })
      mesh.setColorAt(payload.__instanceId, color)
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    if (coreMesh.userData?.__slot) {
      const coreSelected = coreMesh.userData.__slotId === selectedSlotId
      const coreHovered = coreMesh.userData.__slotId === hoveredSlotId
      coreMesh.material.emissiveIntensity = coreSelected ? 0.72 : coreHovered ? 0.56 : 0.42
    }
  }

  const tick = (dt, elapsed) => {
    root.rotation.y += dt * 0.06
    coreMesh.rotation.y += dt * 0.24
    coreMesh.scale.setScalar(1 + Math.sin(elapsed * 1.9) * 0.035)
    atmosphere.rotation.y -= dt * 0.03
  }

  const getSlotCameraHint = slotId => {
    const payload = slotLookup.get(slotId)
    if (!payload) return null
    return {
      position: payload.__position.clone(),
      normal: payload.__normal.clone(),
      tier: payload.__tier,
      slot: payload.__slot,
    }
  }

  const dispose = () => {
    for (const item of disposable) {
      if (!item) continue
      if (typeof item.dispose === 'function') item.dispose()
    }
    scene.remove(root)
  }

  return {
    root,
    raycast,
    tick,
    dispose,
    updateSlotColors,
    getSlotCameraHint,
  }
}
