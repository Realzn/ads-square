'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import View3DLegacy from './view3d/legacy/View3DLegacy'
import View3DNew from './view3d/new/View3DNew'
import {
  canAccessView3DModeSwitch,
  persistView3DMode,
  resolveView3DMode,
} from '../lib/view3d-flags'

function ModeSwitcher({ mode, onSwitch }) {
  return (
    <div style={{
      position: 'absolute',
      top: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 120,
      display: 'flex',
      padding: 4,
      border: '1px solid rgba(255,255,255,0.16)',
      background: 'rgba(8,10,20,0.82)',
      backdropFilter: 'blur(10px)',
      gap: 4,
    }}>
      {['legacy', 'new'].map(id => {
        const active = mode === id
        return (
          <button
            key={id}
            onClick={() => onSwitch(id)}
            style={{
              border: `1px solid ${active ? 'rgba(134,187,255,0.75)' : 'rgba(255,255,255,0.14)'}`,
              background: active ? 'rgba(134,187,255,0.2)' : 'rgba(255,255,255,0.03)',
              color: active ? '#eaf1ff' : 'rgba(230,236,252,0.75)',
              fontSize: 10,
              letterSpacing: '.12em',
              padding: '5px 9px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {id}
          </button>
        )
      })}
    </div>
  )
}

export default function View3D(props) {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState('legacy')

  useEffect(() => {
    setMode(resolveView3DMode(searchParams))
  }, [searchParams])

  const showModeSwitch = useMemo(
    () => canAccessView3DModeSwitch(props.user, searchParams),
    [props.user, searchParams]
  )

  const handleSwitch = useCallback(nextMode => {
    persistView3DMode(nextMode)
    setMode(nextMode)
  }, [])

  const ActiveView = mode === 'new' ? View3DNew : View3DLegacy

  return (
    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
      <ActiveView
        {...props}
        mode={mode}
        onSwitchMode={showModeSwitch ? handleSwitch : undefined}
      />
      {showModeSwitch && <ModeSwitcher mode={mode} onSwitch={handleSwitch} />}
    </div>
  )
}
