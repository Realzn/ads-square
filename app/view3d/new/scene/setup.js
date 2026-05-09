import { getPixelRatio } from '../perf/qualityManager'

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = quality.key === 'low' ? 0.95 : 1.08

  if (quality.shadows) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020207)
  scene.fog = new THREE.FogExp2(0x04040b, quality.key === 'low' ? 0.011 : 0.008)

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 500)
  camera.position.set(0, 14, 48)

  const hemi = new THREE.HemisphereLight(0x6a8ccf, 0x08070d, quality.key === 'low' ? 0.5 : 0.7)
  scene.add(hemi)

  const keyLight = new THREE.DirectionalLight(0x9ab9ff, quality.key === 'low' ? 1.2 : 1.8)
  keyLight.position.set(24, 32, 18)
  if (quality.shadows) {
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize)
    keyLight.shadow.camera.near = 1
    keyLight.shadow.camera.far = 180
    keyLight.shadow.camera.left = -60
    keyLight.shadow.camera.right = 60
    keyLight.shadow.camera.top = 60
    keyLight.shadow.camera.bottom = -60
  }
  scene.add(keyLight)

  const rim = new THREE.PointLight(0x7be7ff, quality.key === 'low' ? 1.5 : 2.6, 160, 2)
  rim.position.set(-28, 12, -32)
  scene.add(rim)

  const fill = new THREE.PointLight(0xff8fb7, quality.key === 'low' ? 0.65 : 1.1, 120, 2)
  fill.position.set(18, -12, -18)
  scene.add(fill)

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
