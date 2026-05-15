import { getPixelRatio } from '../perf/qualityManager'

function getExposure(qualityKey) {
  if (qualityKey === 'ultra') return 1.04
  if (qualityKey === 'high') return 1.02
  if (qualityKey === 'medium') return 0.98
  return 0.94
}

export function createSceneSetup({ THREE, canvas, quality }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    alpha: true,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(getPixelRatio(quality))
  renderer.setSize(canvas.clientWidth || 1, canvas.clientHeight || 1, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.useLegacyLights = false
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = getExposure(quality.key)

  if (quality.shadows) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x02030a)
  scene.fog = new THREE.FogExp2(0x040715, quality.key === 'low' ? 0.0094 : 0.0068)

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500)
  camera.position.set(0, 13.5, 47)

  const ambient = new THREE.AmbientLight(0x344872, quality.key === 'low' ? 0.25 : 0.32)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0x9bb7ff, 0x0a0b12, quality.key === 'low' ? 0.4 : 0.56)
  scene.add(hemi)

  const keyLight = new THREE.DirectionalLight(0xb8ccff, quality.key === 'low' ? 1.05 : 1.55)
  keyLight.position.set(34, 40, 24)
  if (quality.shadows) {
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize)
    keyLight.shadow.camera.near = 1
    keyLight.shadow.camera.far = 220
    keyLight.shadow.camera.left = -72
    keyLight.shadow.camera.right = 72
    keyLight.shadow.camera.top = 72
    keyLight.shadow.camera.bottom = -72
    keyLight.shadow.bias = -0.00015
  }
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0x6ec6ff, quality.key === 'low' ? 0.45 : 0.75)
  fillLight.position.set(-26, -8, 22)
  scene.add(fillLight)

  const rimLight = new THREE.SpotLight(0x7bf4ff, quality.key === 'low' ? 1.35 : 2.2, 220, Math.PI * 0.24, 0.42, 1.6)
  rimLight.position.set(-32, 18, -30)
  rimLight.target.position.set(0, 0, 0)
  scene.add(rimLight)
  scene.add(rimLight.target)

  const warmBounce = new THREE.PointLight(0xff9ac2, quality.key === 'low' ? 0.4 : 0.72, 140, 2)
  warmBounce.position.set(16, -14, -20)
  scene.add(warmBounce)

  const coldBounce = new THREE.PointLight(0x5ec6ff, quality.key === 'low' ? 0.46 : 0.82, 160, 2)
  coldBounce.position.set(-18, 10, 30)
  scene.add(coldBounce)

  const clock = new THREE.Clock()

  const resize = () => {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(getPixelRatio(quality))
    renderer.setSize(width, height, false)
  }

  resize()

  const dispose = () => {
    renderer.dispose()
    try {
      renderer.forceContextLoss()
    } catch {}
  }

  return { renderer, scene, camera, clock, resize, dispose }
}
