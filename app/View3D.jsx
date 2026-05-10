'use client'

import dynamic from 'next/dynamic'
import View3DNew from './view3d/new/View3DNew'

const View3DLegacy = dynamic(() => import('./view3d/legacy/View3DLegacy'), {
  ssr: false,
  loading: () => null,
})

const legacyEmergencyEnabled =
  typeof window !== 'undefined' &&
  window.__ADS_INTERNAL_VIEW3D_EMERGENCY_LEGACY__ === true

export default function View3D(props) {
  const ActiveView = legacyEmergencyEnabled ? View3DLegacy : View3DNew

  return (
    <div
      style={{ flex: 1, position: 'relative', minHeight: 0 }}
      data-view3d-active={legacyEmergencyEnabled ? 'legacy-emergency' : 'new-default'}
      data-release-note="2026-05-10:view3d-new-default-enforced"
    >
      <ActiveView {...props} />
    </div>
  )
}
