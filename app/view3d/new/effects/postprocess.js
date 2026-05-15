function createCinematicGradeShader(quality) {
  return {
    uniforms: {
      tDiffuse: { value: null },
      uVignette: { value: quality.vignette ?? 0.25 },
      uContrast: { value: quality.key === 'ultra' ? 1.09 : quality.key === 'high' ? 1.07 : 1.05 },
      uSaturation: { value: quality.key === 'ultra' ? 1.08 : 1.06 },
      uChromatic: { value: quality.chromaticAberration ?? 0.0005 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform float uVignette;
      uniform float uContrast;
      uniform float uSaturation;
      uniform float uChromatic;

      vec3 adjustContrast(vec3 color, float contrast) {
        return (color - 0.5) * contrast + 0.5;
      }

      vec3 adjustSaturation(vec3 color, float saturation) {
        float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
        return mix(vec3(luma), color, saturation);
      }

      void main() {
        vec2 centered = vUv - 0.5;
        float dist = dot(centered, centered);
        vec2 dir = normalize(centered + vec2(1e-6));
        vec2 offset = dir * uChromatic * (0.2 + dist * 1.6);

        float r = texture2D(tDiffuse, vUv + offset).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - offset).b;

        vec3 color = vec3(r, g, b);
        color = adjustSaturation(color, uSaturation);
        color = adjustContrast(color, uContrast);

        float vignette = smoothstep(0.85, 0.18, dist);
        color *= mix(1.0 - uVignette, 1.0, vignette);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }
}

export async function createPostprocessPipeline({ THREE, renderer, scene, camera, quality }) {
  if (!quality.postprocess) return null

  try {
    const [composerModule, renderPassModule, bloomModule, shaderPassModule, fxaaModule, smaaModule, outputModule] = await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/ShaderPass.js'),
      import('three/examples/jsm/shaders/FXAAShader.js').catch(() => ({})),
      import('three/examples/jsm/postprocessing/SMAAPass.js').catch(() => ({})),
      import('three/examples/jsm/postprocessing/OutputPass.js').catch(() => ({})),
    ])

    const { EffectComposer } = composerModule
    const { RenderPass } = renderPassModule
    const { UnrealBloomPass } = bloomModule
    const { ShaderPass } = shaderPassModule

    const composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    let fxaaPass = null
    let smaaPass = null

    if (quality.smaa && smaaModule?.SMAAPass) {
      smaaPass = new smaaModule.SMAAPass(renderer.domElement.width, renderer.domElement.height)
      composer.addPass(smaaPass)
    } else if (fxaaModule?.FXAAShader) {
      fxaaPass = new ShaderPass(fxaaModule.FXAAShader)
      composer.addPass(fxaaPass)
    }

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
      quality.bloomStrength,
      quality.bloomRadius ?? 0.35,
      quality.bloomThreshold ?? 0.8
    )
    composer.addPass(bloomPass)

    if (quality.colorGrade) {
      const gradePass = new ShaderPass(createCinematicGradeShader(quality))
      composer.addPass(gradePass)
    }

    if (outputModule?.OutputPass) {
      composer.addPass(new outputModule.OutputPass())
    }

    const updateResolution = (width, height) => {
      if (fxaaPass?.material?.uniforms?.resolution?.value) {
        fxaaPass.material.uniforms.resolution.value.set(1 / Math.max(width, 1), 1 / Math.max(height, 1))
      }
      if (smaaPass?.setSize) smaaPass.setSize(width, height)
    }

    updateResolution(renderer.domElement.clientWidth || renderer.domElement.width, renderer.domElement.clientHeight || renderer.domElement.height)

    return {
      render() {
        composer.render()
      },
      setSize(width, height) {
        composer.setSize(width, height)
        updateResolution(width, height)
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
