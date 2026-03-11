'use client';
import { useState, useEffect } from 'react';
import { useT, LanguageSwitcher } from '../../../lib/i18n';

const TIER_COLOR = { epicenter:'#f0b429', prestige:'#ff4d8f', elite:'#a855f7', business:'#00d9f5', standard:'#38bdf8', viral:'#00e8a2' };
const C = { bg:'#01020A', card:'rgba(1,6,18,0.96)', border:'rgba(0,200,240,0.10)', border2:'rgba(0,200,240,0.22)', text:'#DDE6F2', muted:'rgba(140,180,220,0.55)', cyan:'#00C8E4', green:'#00D880', amber:'#E8A020' };

function TierBadge({ tier }) {
  const { t } = useT();
  const color = TIER_COLOR[tier] || C.muted;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: `${color}18`, border: `1px solid ${color}40`, color, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
      {t(`tier_${tier}`) || tier?.toUpperCase()}
    </span>
  );
}

function StatBox({ label, value, color = C.cyan }) {
  return (
    <div style={{ textAlign: 'center', padding: '18px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, letterSpacing: '0.10em', color: C.muted, marginTop: 6, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

export default function SlotPageClient({ x, y, initialData }) {
  const { t, ago } = useT();
  const [data, setData]     = useState(initialData || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!initialData) {
      fetch(`/api/slot?x=${x}&y=${y}`)
        .then(r => r.json())
        .then(setData)
        .catch(() => {});
    }
  }, [x, y, initialData]);

  if (!data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid rgba(0,200,240,0.15)`, borderTopColor: C.cyan, animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const { slot, booking, stats, history = [], neighbors = [] } = data;
  const tier      = slot?.tier || 'viral';
  const tierColor = TIER_COLOR[tier] || C.muted;
  const isOccupied = !!booking;
  const APP_URL   = typeof window !== 'undefined' ? window.location.origin : 'https://adsmostfair.com';
  const pageUrl   = `${APP_URL}/slot/${x}-${y}`;

  const shareText = isOccupied
    ? t('slot_share_occupied', booking.display_name, t(`tier_${tier}`), x, y)
    : t('slot_share_free', t(`tier_${tier}`), x, y, '1€/j');

  const handleCopy = () => {
    navigator.clipboard?.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleTweet = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`, '_blank');
  };

  // Price display
  const PRICE = { epicenter: '€1 000', prestige: '€100', elite: '€50', business: '€10', standard: '€3', viral: '€1' };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", color: C.text }}>
      <style>{`*{box-sizing:border-box} a{color:inherit;text-decoration:none} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,2,10,0.98)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, fontWeight: 700 }}>AdsMostFair</a>
          <span style={{ color: C.muted, fontSize: 12 }}>/ {t('slot_grid_link')}</span>
          <span style={{ color: C.muted, fontSize: 12 }}>/ [{x},{y}]</span>
        </div>
        <LanguageSwitcher compact />
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Hero ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, marginBottom: 32, alignItems: 'start' }}>
          <div>
            {/* Slot preview */}
            <div style={{
              width: 80, height: 80, borderRadius: 10, marginBottom: 20,
              background: isOccupied ? (booking.primary_color || tierColor) : `${tierColor}20`,
              border: `2px solid ${tierColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 30px ${tierColor}30`,
            }}>
              {isOccupied && booking.badge
                ? <span style={{ fontSize: 32 }}>{booking.badge}</span>
                : <span style={{ fontSize: 20, color: tierColor, fontWeight: 900, fontFamily: 'monospace' }}>{x},{y}</span>}
            </div>

            {isOccupied ? (
              <>
                <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, marginBottom: 8, margin: '0 0 8px' }}>
                  {booking.display_name}
                </h1>
                {booking.slogan && (
                  <p style={{ fontSize: 16, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>{booking.slogan}</p>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                  <TierBadge tier={tier} />
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
                    ● {t('slot_active_until', new Date(booking.end_date).toLocaleDateString())}
                  </span>
                </div>
                {booking.cta_url && (
                  <a href={booking.cta_url} target="_blank" rel="noopener noreferrer sponsored"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', background: booking.primary_color || tierColor, color: '#01020A', borderRadius: 8, fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', boxShadow: `0 4px 20px ${(booking.primary_color || tierColor)}40` }}>
                    {t('slot_book_btn').replace('RÉSERVER CE SLOT →', booking.display_name)} ↗
                  </a>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: C.muted, letterSpacing: '0.08em', marginBottom: 8 }}>
                  {t('slot_available_title', x, y)}
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, margin: '0 0 12px', color: tierColor }}>
                  Slot [{x},{y}] — {t(`tier_${tier}`)}
                </h1>
                <p style={{ fontSize: 15, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
                  {t('slot_available_desc', t(`tier_${tier}`), `${PRICE[tier] || '1€'}/jour`)}
                </p>
                <a href={`/?book=${x}-${y}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: tierColor, color: '#01020A', borderRadius: 8, fontSize: 14, fontWeight: 800, letterSpacing: '0.10em', boxShadow: `0 4px 24px ${tierColor}40` }}>
                  {t('slot_book_btn')}
                </a>
              </>
            )}
          </div>

          {/* Info panel */}
          <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              [t('slot_position'), `(${x}, ${y})`],
              [t('slot_tier'),     t(`tier_${tier}`)],
              [t('slot_rate'),     `${PRICE[tier] || '1€'}/j`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
            <StatBox label={t('slot_stat_clicks')}     value={(stats.clicks || 0).toLocaleString()} color={C.cyan} />
            <StatBox label={t('slot_stat_impressions')} value={(stats.impressions || 0).toLocaleString()} color={C.amber} />
            <StatBox label={t('slot_stat_ctr')}        value={`${stats.ctr_pct || 0}%`} color={C.green} />
          </div>
        )}

        {/* ── Share ─────────────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.10em', marginBottom: 14 }}>{t('slot_share_title')}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleTweet}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(29,155,240,0.12)', border: '1px solid rgba(29,155,240,0.25)', borderRadius: 8, color: '#1d9bf0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('slot_tweet')}
            </button>
            <button onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: copied ? 'rgba(0,216,128,0.12)' : 'rgba(0,200,240,0.08)', border: `1px solid ${copied ? 'rgba(0,216,128,0.30)' : C.border}`, borderRadius: 8, color: copied ? C.green : C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
              {copied ? t('copied') : t('slot_copy_link')}
            </button>
          </div>
        </div>

        {/* ── Neighbors ─────────────────────────────────────── */}
        {neighbors.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.10em', marginBottom: 14 }}>{t('slot_neighbors')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
              {neighbors.slice(0, 6).map(n => {
                const nColor = n.primary_color || TIER_COLOR[n.tier] || C.muted;
                return (
                  <a key={`${n.x}-${n.y}`} href={`/slot/${n.x}-${n.y}`}
                    style={{ display: 'block', padding: '14px 16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, textDecoration: 'none', transition: 'border-color .2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = nColor + '60'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {n.badge
                        ? <span style={{ fontSize: 18 }}>{n.badge}</span>
                        : <div style={{ width: 24, height: 24, borderRadius: 4, background: nColor, opacity: 0.8 }} />}
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.muted }}>[{n.x},{n.y}]</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.display_name || '—'}
                    </div>
                    {n.cta_url && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.cta_url.replace(/^https?:\/\//, '').split('/')[0]}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* ── History ───────────────────────────────────────── */}
        {history.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.10em', marginBottom: 14 }}>{t('slot_history')}</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  {h.badge && <span style={{ fontSize: 18, flexShrink: 0 }}>{h.badge}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.display_name}</div>
                    {h.slogan && <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.slogan}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: C.muted }}>{h.start_date} → {h.end_date}</div>
                    <TierBadge tier={h.tier} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA footer ────────────────────────────────────── */}
        <div style={{ background: `linear-gradient(135deg,rgba(0,200,240,0.06),rgba(232,160,32,0.04))`, border: `1px solid ${C.border2}`, borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 8 }}>{t('slot_cta_title')}</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{t('slot_cta_sub')}</div>
          <a href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: C.cyan, color: '#01020A', borderRadius: 8, fontSize: 14, fontWeight: 800, letterSpacing: '0.10em', boxShadow: `0 4px 24px ${C.cyan}30` }}>
            {t('slot_explore')}
          </a>
        </div>
      </div>
    </div>
  );
}
