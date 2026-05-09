import { CAMERA_PRESETS } from '../../shared/constants'

export async function createCameraController({ THREE, camera, domElement }) {
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance = 10
  controls.maxDistance = 110
  controls.maxPolarAngle = Math.PI * 0.9

  const state = {
    transition: null,
  }

  const vecFrom = new THREE.Vector3()
  const vecTo = new THREE.Vector3()

  const startTransition = ({ toPosition, toTarget, duration = 0.65 }) => {
    state.transition = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: toPosition.clone(),
      toTarget: toTarget.clone(),
      elapsed: 0,
      duration,
    }
  }

  const focusTier = tier => {
    const preset = CAMERA_PRESETS.tier[tier] || CAMERA_PRESETS.default
    const toPosition = new THREE.Vector3(...preset.position)
    const toTarget = new THREE.Vector3(...preset.target)
    startTransition({ toPosition, toTarget, duration: 0.72 })
  }

  const focusSlot = ({ position, normal }) => {
    const target = position.clone().multiplyScalar(0.66)
    const offset = normal.clone().normalize().multiplyScalar(10)
    const toPosition = position.clone().add(offset)
    startTransition({ toPosition, toTarget: target, duration: 0.52 })
  }

  const reset = () => {
    const preset = CAMERA_PRESETS.default
    startTransition({
      toPosition: new THREE.Vector3(...preset.position),
      toTarget: new THREE.Vector3(...preset.target),
      duration: 0.7,
    })
  }

  const update = dt => {
    if (state.transition) {
      state.transition.elapsed += dt
      const t = Math.min(1, state.transition.elapsed / state.transition.duration)
      const eased = 1 - Math.pow(1 - t, 3)

      vecFrom.copy(state.transition.fromPosition)
      vecTo.copy(state.transition.toPosition)
      camera.position.copy(vecFrom.lerp(vecTo, eased))

      vecFrom.copy(state.transition.fromTarget)
      vecTo.copy(state.transition.toTarget)
      controls.target.copy(vecFrom.lerp(vecTo, eased))

      if (t >= 1) state.transition = null
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
