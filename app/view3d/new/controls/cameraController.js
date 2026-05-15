import { CAMERA_PRESETS } from '../../shared/constants'

function easeInOutCinematic(t) {
  const base = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) * 0.5
  const overshoot = Math.sin(base * Math.PI) * 0.03 * (1 - t)
  return Math.min(1, base + overshoot)
}

export async function createCameraController({ THREE, camera, domElement }) {
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.rotateSpeed = 0.58
  controls.zoomSpeed = 0.8
  controls.minDistance = 10
  controls.maxDistance = 110
  controls.maxPolarAngle = Math.PI * 0.9

  const state = {
    transition: null,
    driftTime: 0,
    idleOffset: new THREE.Vector3(),
    appliedIdleOffset: new THREE.Vector3(),
  }

  const vecFrom = new THREE.Vector3()
  const vecTo = new THREE.Vector3()
  const vecScratch = new THREE.Vector3()
  const vecDelta = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

  const startTransition = ({ toPosition, toTarget, duration = 0.72 }) => {
    state.transition = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: toPosition.clone(),
      toTarget: toTarget.clone(),
      elapsed: 0,
      duration,
    }
    state.appliedIdleOffset.set(0, 0, 0)
  }

  const focusTier = tier => {
    const preset = CAMERA_PRESETS.tier[tier] || CAMERA_PRESETS.default
    const toPosition = new THREE.Vector3(...preset.position)
    const toTarget = new THREE.Vector3(...preset.target)
    toPosition.y += 0.7
    startTransition({ toPosition, toTarget, duration: 0.82 })
  }

  const focusSlot = ({ position, normal, tier }) => {
    const focusNormal = normal.clone().normalize()
    const side = new THREE.Vector3().crossVectors(focusNormal, up)
    if (side.lengthSq() < 0.01) side.set(1, 0, 0)
    side.normalize()

    const tierDistance = tier === 'prestige' ? 8.8 : tier === 'elite' ? 9.4 : tier === 'business' ? 10.2 : 10.8
    const target = position.clone().multiplyScalar(0.72).addScaledVector(focusNormal, 0.35)
    const toPosition = position
      .clone()
      .addScaledVector(focusNormal, tierDistance)
      .addScaledVector(side, 1.5)
      .add(new THREE.Vector3(0, 1.4, 0))

    startTransition({ toPosition, toTarget: target, duration: 0.58 })
  }

  const reset = () => {
    const preset = CAMERA_PRESETS.default
    startTransition({
      toPosition: new THREE.Vector3(...preset.position),
      toTarget: new THREE.Vector3(...preset.target),
      duration: 0.76,
    })
  }

  const applyIdleInertia = dt => {
    state.driftTime += dt
    const desiredOffset = vecScratch.set(
      Math.sin(state.driftTime * 0.29) * 0.14,
      Math.sin(state.driftTime * 0.43 + 1.7) * 0.09,
      Math.cos(state.driftTime * 0.36 + 0.8) * 0.12
    )

    state.idleOffset.lerp(desiredOffset, Math.min(1, dt * 1.4))

    vecDelta.copy(state.idleOffset).sub(state.appliedIdleOffset)
    camera.position.add(vecDelta)
    controls.target.addScaledVector(vecDelta, 0.24)
    state.appliedIdleOffset.copy(state.idleOffset)
  }

  const update = dt => {
    if (state.transition) {
      state.transition.elapsed += dt
      const t = Math.min(1, state.transition.elapsed / state.transition.duration)
      const eased = easeInOutCinematic(t)

      vecFrom.copy(state.transition.fromPosition)
      vecTo.copy(state.transition.toPosition)
      camera.position.copy(vecFrom.lerp(vecTo, eased))

      vecFrom.copy(state.transition.fromTarget)
      vecTo.copy(state.transition.toTarget)
      controls.target.copy(vecFrom.lerp(vecTo, eased))

      controls.dampingFactor = 0.11
      state.idleOffset.set(0, 0, 0)
      state.appliedIdleOffset.set(0, 0, 0)

      if (t >= 1) state.transition = null
    } else {
      controls.dampingFactor = 0.08
      applyIdleInertia(dt)
    }

    controls.update()
  }

  return {
    controls,
    update,
    focusTier,
    focusSlot,
    reset,
    setEnabled(value) {
      controls.enabled = value
    },
    dispose() {
      controls.dispose()
    },
  }
}
