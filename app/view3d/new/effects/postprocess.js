export async function createPostprocessPipeline({ THREE, renderer, scene, camera, quality }) {
  if (!quality.postprocess) return null

  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, outputModule] = await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/OutputPass.js').catch(() => ({})),
    ])

    const composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
      quality.bloomStrength,
      0.45,
      0.85
    )
    composer.addPass(bloomPass)

    if (outputModule?.OutputPass) {
      composer.addPass(new outputModule.OutputPass())
    }

    return {
      render() {
        composer.render()
      },
      setSize(width, height) {
        composer.setSize(width, height)
      },
      dispose() {
        for (const pass of composer.passes) {
          if (typeof pass.dispose === 'function') pass.dispose()
        }
      },
    }
  } catch {
    return null
  }
}
