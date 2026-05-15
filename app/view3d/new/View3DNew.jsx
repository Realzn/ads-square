'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeSlots, buildTierStats, getGlobalStats } from './data/slotAdapter'
import { getQualityProfile, canUseWebGL, createAdaptiveFrameLimiter } from './perf/qualityManager'
import { createSceneSetup } from './scene/setup'
import { createTierMaterialLibrary } from './materials/pbrMaterials'
import { createDysonScene } from './scene/dysonScene'
import { createCameraController } from './controls/cameraController'
import { createPostprocessPipeline } from './effects/postprocess'
import HUDRoot from './ui/HUDRoot'
import FallbackGrid2D from './ui/components/FallbackGrid2D'
import { VIEW_THEME } from '../shared/constants'

export default function View3DNew({
  slots = [],
  isLive = false,
  onCheckout,
  onBuyout,
  onViewSlot,
  user = null,
}) {
  const canvasRef = useRef(null)
  const runtimeRef = useRef(null)

  const normalizedSlots = useMemo(() => normalizeSlots(slots), [slots])
  const tierStats = useMemo(() => buildTierStats(normalizedSlots), [normalizedSlots])
  const globalStats = useMemo(() => getGlobalStats(normalizedSlots), [normalizedSlots])

  const [quality, setQuality] = useState(() => getQualityProfile())
  const [webglReady, setWebglReady] = useState(() => canUseWebGL())
  const [loading, setLoading] = useState(true)
  const [engineError, setEngineError] = useState(null)
  const [activeTier, setActiveTier] = useState(null)
  const [hoveredSlotId, setHoveredSlotId] = useState(null)
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [pointer, setPointer] = useState(null)

  const selectedSlot = useMemo(
    () => normalizedSlots.find(slot => slot.id === selectedSlotId) || null,
    [normalizedSlots, selectedSlotId]
  )
  const hoverSlot = useMemo(
    () => normalizedSlots.find(slot => slot.id === hoveredSlotId) || null,
    [normalizedSlots, hoveredSlotId]
  )

  useEffect(() => {
    setQuality(getQualityProfile())
  }, [])

  useEffect(() => {
    if (selectedSlotId && !normalizedSlots.some(slot => slot.id === selectedSlotId)) {
      setSelectedSlotId(null)
    }
  }, [normalizedSlots, selectedSlotId])

  useEffect(() => {
    if (!canvasRef.current || !webglReady) {
      setLoading(false)
      return
    }

    let cancelled = false
    let animationFrame = 0

    const runtime = {
      THREE: null,
      setup: null,
      cameraController: null,
      dyson: null,
      postprocess: null,
      materialLibrary: null,
      frameLimiter: createAdaptiveFrameLimiter(quality),
      raycaster: null,
      pointerNdc: null,
    }

    runtimeRef.current = runtime

    const boot = async () => {
      try {
        const THREE = await import('three')
        if (cancelled) return

        runtime.THREE = THREE
        runtime.setup = createSceneSetup({ THREE, canvas: canvasRef.current, quality })
        runtime.materialLibrary = createTierMaterialLibrary(THREE)
        runtime.dyson = createDysonScene({
          THREE,
          scene: runtime.setup.scene,
          slots: normalizedSlots,
          quality,
          materialLibrary: runtime.materialLibrary,
        })
        runtime.cameraController = await createCameraController({
          THREE,
          camera: runtime.setup.camera,
          domElement: runtime.setup.renderer.domElement,
        })
        runtime.postprocess = await createPostprocessPipeline({
          THREE,
          renderer: runtime.setup.renderer,
          scene: runtime.setup.scene,
          camera: runtime.setup.camera,
          quality,
        })
        runtime.raycaster = new THREE.Raycaster()
        runtime.pointerNdc = new THREE.Vector2()

        runtime.dyson.updateSlotColors({ activeTier, hoveredSlotId, selectedSlotId })

        const tick = () => {
          if (cancelled) return
          animationFrame = requestAnimationFrame(tick)

          const dt = runtime.setup.clock.getDelta()
          const elapsed = runtime.setup.clock.elapsedTime

          if (document.hidden && quality.key !== 'high') return
          if (!runtime.frameLimiter.shouldRender(dt)) return

          runtime.dyson.tick(dt, elapsed)
          runtime.cameraController.update(dt)

          if (runtime.postprocess) runtime.postprocess.render()
          else runtime.setup.renderer.render(runtime.setup.scene, runtime.setup.camera)
        }

        tick()
        setLoading(false)
      } catch {
        if (cancelled) return
        setEngineError('NEW_VIEW3D_INIT_FAILED')
        setLoading(false)
      }
    }

    boot()

    const cleanup = () => {
      cancelled = true
      cancelAnimationFrame(animationFrame)

      if (runtime.postprocess?.dispose) runtime.postprocess.dispose()
      runtime.cameraController?.dispose?.()
      runtime.dyson?.dispose?.()
      runtime.materialLibrary?.dispose?.()
      runtime.setup?.dispose?.()

      runtimeRef.current = null
    }

    return cleanup
  }, [normalizedSlots, quality, webglReady])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime?.dyson) return
    runtime.dyson.updateSlotColors({ activeTier, hoveredSlotId, selectedSlotId })
  }, [activeTier, hoveredSlotId, selectedSlotId])

  const handleTierChange = useCallback(tier => {
    setActiveTier(tier)
    const runtime = runtimeRef.current
    if (!runtime?.cameraController) return
    if (tier) runtime.cameraController.focusTier(tier)
    else runtime.cameraController.reset()
  }, [])

  const handleResetCamera = useCallback(() => {
    const runtime = runtimeRef.current
    runtime?.cameraController?.reset()
    setActiveTier(null)
    setSelectedSlotId(null)
  }, [])

  const handlePointerMove = useCallback(event => {
    const runtime = runtimeRef.current
    if (!runtime?.raycaster || !runtime?.pointerNdc || !runtime?.setup || !runtime?.dyson) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    runtime.pointerNdc.set(x, y)
    runtime.raycaster.setFromCamera(runtime.pointerNdc, runtime.setup.camera)
    const hit = runtime.dyson.raycast(runtime.raycaster)

    setHoveredSlotId(hit?.__slotId || null)
    setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }, [])

  const handlePointerLeave = useCallback(() => {
    setHoveredSlotId(null)
    setPointer(null)
  }, [])

  const handleClick = useCallback(() => {
    const runtime = runtimeRef.current
    if (!runtime?.raycaster || !runtime?.pointerNdc || !runtime?.setup || !runtime?.dyson) return

    runtime.raycaster.setFromCamera(runtime.pointerNdc, runtime.setup.camera)
    const hit = runtime.dyson.raycast(runtime.raycaster)

    if (!hit?.__slotId) {
      setSelectedSlotId(null)
      return
    }

    setSelectedSlotId(hit.__slotId)
    const hint = runtime.dyson.getSlotCameraHint(hit.__slotId)
    if (hint) runtime.cameraController?.focusSlot(hint)
  }, [])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime?.setup?.renderer) return

    const onResize = () => {
      runtime.setup.resize()
      const width = runtime.setup.renderer.domElement.clientWidth
      const height = runtime.setup.renderer.domElement.clientHeight
      runtime.postprocess?.setSize?.(width, height)
    }

    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [loading])

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setSelectedSlotId(null)
        setActiveTier(null)
        runtimeRef.current?.cameraController?.reset()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onContextLost = event => {
      event.preventDefault()
      setWebglReady(false)
    }

    canvas.addEventListener('webglcontextlost', onContextLost, false)
    return () => canvas.removeEventListener('webglcontextlost', onContextLost, false)
  }, [])

  const fallbackActive = !webglReady || Boolean(engineError)

  return (
    <div
      data-release-note="2026-05-15:AAA quality pass applied on View3DNew"
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: VIEW_THEME.backgroundGradient,
        color: VIEW_THEME.text,
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          display: fallbackActive ? 'none' : 'block',
          cursor: 'grab',
        }}
      />

      {fallbackActive && (
        <FallbackGrid2D
          slots={normalizedSlots}
          onSelect={slot => setSelectedSlotId(slot.id)}
        />
      )}

      {!loading && (
        <HUDRoot
          isLive={isLive}
          quality={quality}
          globalStats={globalStats}
          tierStats={tierStats}
          activeTier={activeTier}
          onTierChange={handleTierChange}
          hoverSlot={hoverSlot}
          pointer={pointer}
          selectedSlot={selectedSlot}
          onCloseSelected={() => setSelectedSlotId(null)}
          onCheckout={onCheckout}
          onBuyout={onBuyout}
          onViewSlot={onViewSlot}
          user={user}
          onResetCamera={handleResetCamera}
        />
      )}

      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          color: VIEW_THEME.muted,
          letterSpacing: '.1em',
          fontSize: 12,
          background: 'rgba(2,2,6,0.75)',
          zIndex: 15,
        }}>
          Initialisation Dyson Sphere...
        </div>
      )}
    </div>
  )
}
