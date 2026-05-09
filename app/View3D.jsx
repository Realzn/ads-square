'use client'

import View3DLegacy from './view3d/legacy/View3DLegacy'
import View3DNew from './view3d/new/View3DNew'

const legacyEmergencyEnabled = process.env.NEXT_PUBLIC_VIEW3D_INTERNAL_EMERGENCY_LEGACY === '1'

export default function View3D(props) {
  const ActiveView = legacyEmergencyEnabled ? View3DLegacy : View3DNew

  return (
    <div
      style={{ flex: 1, position: 'relative', minHeight: 0 }}
      data-release-note="2026-05-09:view3d-new-default"
    >
      <ActiveView {...props} />
    </div>
  )
}
