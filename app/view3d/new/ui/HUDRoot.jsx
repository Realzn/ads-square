import TopStatusBar from './components/TopStatusBar'
import TierBar from './components/TierBar'
import SlotTooltip from './components/SlotTooltip'
import SlotPanel from './components/SlotPanel'
import MinimalControls from './components/MinimalControls'

export default function HUDRoot({
  isLive,
  quality,
  globalStats,
  tierStats,
  activeTier,
  onTierChange,
  hoverSlot,
  pointer,
  selectedSlot,
  onCloseSelected,
  onCheckout,
  onBuyout,
  onViewSlot,
  user,
  onResetCamera,
}) {
  return (
    <>
      <TopStatusBar isLive={isLive} globalStats={globalStats} qualityKey={quality.key} />

      <TierBar
        tierStats={tierStats}
        activeTier={activeTier}
        onTierChange={onTierChange}
      />

      <SlotTooltip hoverSlot={hoverSlot} pointer={pointer} />

      <SlotPanel
        slot={selectedSlot}
        user={user}
        onClose={onCloseSelected}
        onCheckout={onCheckout}
        onBuyout={onBuyout}
        onViewSlot={onViewSlot}
      />

      <MinimalControls onResetCamera={onResetCamera} />
    </>
  )
}
