import { TIER_ORDER, getTierColor } from '../../shared/constants'
import { getInstanceColor } from '../materials/pbrMaterials'
import { createPromoBillboardLayer } from './promoBillboards'

const LAYER_CONFIG = {
  prestige: { radius: 11.4, size: 1.56, spread: 0.19 },
  elite: { radius: 17.8, size: 1.28, spread: 0.33 },
  business: { radius: 23.8, size: 1.12, spread: 0.5 },
  standard: { radius: 30.1, size: 0.98, spread: 0.68 },
  viral: { radius: 36.4, size: 0.84, spread: 0.93 },
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
  const y = Math.cos(phi + jitter * 0.18) * radius
  const z = Math.sin(theta + jitter) * Math.sin(phi) * radius

  const position = new THREE.Vector3(x, y, z)
  const normal = position.clone().normalize()
  return { position, normal }
}

function createRoundedPanelGeometry(THREE, { width, height, depth, radius, curveSegments, bevelSegments }) {
  const halfW = width * 0.5
  const halfH = height * 0.5
  const r = Math.min(radius, halfW * 0.5, halfH * 0.5)

  const shape = new THREE.Shape()
  shape.moveTo(-halfW + r, -halfH)
  shape.lineTo(halfW - r, -halfH)
  shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r)
  shape.lineTo(halfW, halfH - r)
  shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH)
  shape.lineTo(-halfW + r, halfH)
  shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r)
  shape.lineTo(-halfW, -halfH + r)
  shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    steps: 1,
    bevelSize: r * 0.38,
    bevelThickness: depth * 0.36,
    curveSegments,
  })

  geometry.center()

  const position = geometry.attributes.position
  const curvature = 0.065
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const pushIn = (x * x + y * y) * curvature
    position.setZ(i, z - pushIn)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()

  return geometry
}

function createStarField(THREE, starCount, { radiusMin, radiusMax, size, opacity, colorA, colorB }) {
  const geometry = new THREE.BufferGeometry()
  const points = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)
  const colorFrom = new THREE.Color(colorA)
  const colorTo = new THREE.Color(colorB)

  for (let i = 0; i < starCount; i++) {
    const radius = radiusMin + Math.random() * (radiusMax - radiusMin)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const tint = Math.random()
    const c = colorFrom.clone().lerp(colorTo, tint)

    points[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
    points[i * 3 + 1] = Math.cos(phi) * radius
    points[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius

    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  })

  return new THREE.Points(geometry, material)
}

function createNebulaSprites(THREE, count = 5) {
  const group = new THREE.Group()

  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: i % 2 === 0 ? 0x4d79ff : 0x7dd8ff,
        opacity: 0.05 + Math.random() * 0.05,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )

    const radius = 80 + Math.random() * 90
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    sprite.position.set(
      Math.cos(theta) * Math.sin(phi) * radius,
      Math.cos(phi) * radius * 0.6,
      Math.sin(theta) * Math.sin(phi) * radius
    )

    const scale = 95 + Math.random() * 70
    sprite.scale.set(scale, scale * (0.62 + Math.random() * 0.36), 1)
    group.add(sprite)
  }

  return group
}

export function createDysonScene({ THREE, scene, camera, slots, quality, materialLibrary }) {
  const root = new THREE.Group()
  scene.add(root)

  const disposable = []
  const animated = []
  const interactiveObjects = []
  const slotLookup = new Map()
  const instanceLookup = new Map()
  const occupiedBillboards = []

  const coreLight = new THREE.PointLight(0xffd9a8, quality.key === 'low' ? 2 : 3.8, 110, 2)
  root.add(coreLight)

  const coreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.9, quality.key === 'low' ? 2 : 4),
    materialLibrary.get('epicenter')
  )
  coreMesh.castShadow = quality.shadows
  coreMesh.receiveShadow = quality.shadows
  root.add(coreMesh)
  disposable.push(coreMesh.geometry)

  const coreHalo = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, quality.key === 'low' ? 18 : 30, quality.key === 'low' ? 12 : 24),
    new THREE.MeshBasicMaterial({
      color: 0xffba70,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  root.add(coreHalo)
  disposable.push(coreHalo.geometry, coreHalo.material)

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(24.8, quality.key === 'low' ? 24 : 48, quality.key === 'low' ? 18 : 32),
    materialLibrary.get('shell')
  )
  shell.rotation.x = Math.PI * 0.1
  shell.rotation.z = Math.PI * 0.18
  root.add(shell)
  disposable.push(shell.geometry)

  const lattice = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(24.95, quality.key === 'low' ? 16 : 28, quality.key === 'low' ? 12 : 20)),
    materialLibrary.get('shellWire')
  )
  lattice.rotation.copy(shell.rotation)
  root.add(lattice)
  disposable.push(lattice.geometry)

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(26.9, quality.key === 'low' ? 22 : 44, quality.key === 'low' ? 14 : 28),
    materialLibrary.get('atmosphere')
  )
  root.add(atmosphere)
  disposable.push(atmosphere.geometry)

  if (quality.starCount > 0) {
    const distantStars = createStarField(THREE, quality.starCount, {
      radiusMin: 130,
      radiusMax: 390,
      size: 0.58,
      opacity: 0.9,
      colorA: 0x8ebcff,
      colorB: 0xc6e7ff,
    })

    const nearStars = createStarField(THREE, Math.round(quality.starCount * 0.24), {
      radiusMin: 70,
      radiusMax: 170,
      size: 0.74,
      opacity: 0.35,
      colorA: 0x5f91ff,
      colorB: 0x9de9ff,
    })

    root.add(distantStars)
    root.add(nearStars)
    disposable.push(distantStars.geometry, distantStars.material, nearStars.geometry, nearStars.material)
    animated.push({ type: 'stars', mesh: nearStars })
  }

  if (quality.key !== 'low') {
    const nebula = createNebulaSprites(THREE, quality.key === 'ultra' ? 7 : 5)
    root.add(nebula)
    for (const sprite of nebula.children) disposable.push(sprite.material)
    animated.push({ type: 'nebula', mesh: nebula })
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

    if (epicSlot.occ) {
      occupiedBillboards.push({
        slot: epicSlot,
        tier: 'epicenter',
        position: new THREE.Vector3(0, 0, 0),
        normal: new THREE.Vector3(0, 1, 0),
        promo: epicSlot.promo,
      })
    }
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
    const detail = quality.slotDetail || 1
    const geoWidth = Math.max(0.62, layer.size * detail * 1.22)
    const geoHeight = Math.max(0.38, layer.size * detail * (tier === 'viral' ? 0.62 : 0.74))
    const geoDepth = Math.max(0.16, layer.size * detail * 0.27)

    const geometry = createRoundedPanelGeometry(THREE, {
      width: geoWidth,
      height: geoHeight,
      depth: geoDepth,
      radius: geoHeight * 0.36,
      curveSegments: quality.panelCurveSegments || 10,
      bevelSegments: quality.panelBevelSegments || 3,
    })

    const mesh = new THREE.InstancedMesh(geometry, materialLibrary.get(tier), tierSlots.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.castShadow = quality.shadows
    mesh.receiveShadow = quality.shadows
    mesh.frustumCulled = false
    mesh.userData.__tier = tier

    for (let i = 0; i < tierSlots.length; i++) {
      const slot = tierSlots[i]
      const { position, normal } = fibonacciPoint(THREE, i, tierSlots.length, layer.radius, layer.spread, slot)
      const sink = geoDepth * 0.4

      dummy.position.copy(position).addScaledVector(normal, -sink)
      dummy.lookAt(position.clone().add(normal))
      dummy.rotateY((seeded(slot, 3) - 0.5) * Math.PI * 0.28)
      dummy.rotateX((seeded(slot, 9) - 0.5) * 0.14)
      const stretch = 0.93 + seeded(slot, 11) * 0.14
      dummy.scale.set(stretch, 1 + (seeded(slot, 15) - 0.5) * 0.08, 1)
      dummy.updateMatrix()

      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, getInstanceColor(THREE, slot, tier))
      setSlotInLookup(slot, { __instanceId: i, __position: position, __normal: normal, __mesh: mesh })

      if (slot.occ) {
        occupiedBillboards.push({
          slot,
          tier,
          position: position.clone(),
          normal: normal.clone(),
          promo: slot.promo,
        })
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    root.add(mesh)
    interactiveObjects.push(mesh)
    disposable.push(geometry)

    const orbitMaterial = materialLibrary.get('orbit').clone()
    orbitMaterial.color.set(getTierColor(tier))
    orbitMaterial.opacity = tier === 'prestige' ? 0.26 : tier === 'viral' ? 0.14 : 0.2

    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(layer.radius + 0.52, 0.08 + layer.size * 0.02, 14, quality.key === 'low' ? 100 : 220),
      orbitMaterial
    )
    orbit.rotation.x = Math.PI * (0.44 + seeded({ x: layer.radius, y: layer.size }, 2) * 0.16)
    orbit.rotation.z = Math.PI * (0.12 + seeded({ x: layer.radius, y: layer.size }, 4) * 0.2)
    root.add(orbit)

    disposable.push(orbit.geometry, orbit.material)
    animated.push({ type: 'orbit', mesh: orbit, speed: 0.015 + seeded({ x: layer.radius, y: layer.size }, 6) * 0.02 })
  }

  const promoBillboards = createPromoBillboardLayer({
    THREE,
    root,
    entries: occupiedBillboards,
    quality,
  })

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
    const touchedMeshes = new Set()

    for (const payload of slotLookup.values()) {
      const mesh = payload.__mesh
      if (!mesh || payload.__instanceId == null) continue

      const isDimmed = Boolean(activeTier && payload.__tier !== activeTier)
      const isHovered = payload.__slotId === hoveredSlotId
      const isSelected = payload.__slotId === selectedSlotId
      const color = getInstanceColor(THREE, payload.__slot, payload.__tier, { isDimmed, isHovered, isSelected })
      mesh.setColorAt(payload.__instanceId, color)
      touchedMeshes.add(mesh)
    }

    for (const mesh of touchedMeshes) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    if (coreMesh.userData?.__slot) {
      const coreSelected = coreMesh.userData.__slotId === selectedSlotId
      const coreHovered = coreMesh.userData.__slotId === hoveredSlotId
      coreMesh.material.emissiveIntensity = coreSelected ? 0.82 : coreHovered ? 0.67 : 0.55
      coreHalo.material.opacity = coreSelected ? 0.2 : coreHovered ? 0.16 : 0.1
    }

    promoBillboards.updateState({ activeTier, hoveredSlotId, selectedSlotId })
  }

  const tick = (dt, elapsed) => {
    root.rotation.y += dt * 0.048
    coreMesh.rotation.y += dt * 0.21
    coreMesh.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.03)
    coreHalo.scale.setScalar(1 + Math.sin(elapsed * 1.1 + 0.4) * 0.08)
    atmosphere.rotation.y -= dt * 0.022
    lattice.rotation.y += dt * 0.016

    for (const item of animated) {
      if (item.type === 'orbit') {
        item.mesh.rotation.y += dt * item.speed
      }

      if (item.type === 'stars') {
        item.mesh.rotation.y -= dt * 0.004
        item.mesh.material.opacity = 0.32 + Math.sin(elapsed * 0.46) * 0.05
      }

      if (item.type === 'nebula') {
        item.mesh.rotation.y -= dt * 0.003
      }
    }

    promoBillboards.tick({ dt, elapsed, camera })
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
    promoBillboards.dispose()
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
