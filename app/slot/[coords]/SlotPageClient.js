'use client';
import { useState, useEffect } from 'react';

const C = {
  bg: '#01020A', card: 'rgba(1,6,18,0.96)', border: 'rgba(0,200,240,0.10)',
  border2: 'rgba(0,200,240,0.22)', text: '#DDE6F2', muted: 'rgba(140,180,220,0.55)',
  cyan: '#00C8E4', green: '#00D880', amber: '#E8A020', red: '#D02848',
};
const TIER_COLOR = { epicenter:'#f0b429', prestige:'#ff4d8f', elite:'#a855f7', business:'#00d9f5', standard:'#38bdf8', viral:'#00e8a2' };
const TIER_LABEL = { epicenter:'ÉPICENTRE', prestige:'PRESTIGE', elite:'ÉLITE', business:'BUSINESS', standard:'STANDARD', viral:'VIRAL' };
const TIER_PRICE = { epicenter:'1 000€/j', prestige:'100€/j', elite:'50€/j', business:'10€/j', standard:'3€/j', viral:'1€/j' };

function MiniGrid({ x, y, size = 80 }) {
  const range = 5;
  const cells = [];
  for (let cy = y - range; cy <= y + range; cy++) {
    for (let cx = x - range; cx <= x + range; cx++) {
      const isTarget = cx === x && cy === y;
      const valid = cx >= 0 && cx <= 36 && cy >= 0 && cy <= 36;
      const d = Math.max(Math.abs(cx - 18), Math.abs(cy - 18));
      let color = 'rgba(0,200,240,0.04)';
      if (d === 0) color = 'rgba(240,180,41,0.3)';
      else if (d <= 2) color = 'rgba(255,77,143,0.2)';
      else if (d <= 5) color = 'rgba(168,85,247,0.15)';
      else if (d <= 10) color = 'rgba(0,217,245,0.12)';
      cells.push({ cx, cy, isTarget, valid, color });
    }
  }
  const cols = range * 2 + 1;
  const cellSize = size / cols;
  return (
    <svg width={size} height={size}>
      {cells.map(({ cx, cy, isTarget, valid, color }) => {
        const px = (cx - (x - range)) * cellSize;
        const py = (cy - (y - range)) * cellSize;
        return (
          <rect key={`${cx}-${cy}`} x={px} y={py} width={cellSize - 0.5} height={cellSize - 0.5}
            fill={!valid ? 'transparent' : isTarget ? (TIER_COLOR[getTier(cx,cy)] || C.cyan) : color}
            rx={isTarget ? 2 : 1}
            opacity={isTarget ? 1 : valid ? 0.9 : 0}
          />
        );
      })}
    </svg>
  );
}

function getTier(x, y) {
  const d = Math.max(Math.abs(x - 18), Math.abs(y - 18));
  if (d === 0) return 'epicenter';
  if (d <= 2) return 'prestige';
  if (d <= 5) return 'elite';
  if (d <= 10) return 'business';
  if (d <= 15) return 'standard';
  return 'viral';
}

function ShareButton({ url, text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
        style={{ background: 'rgba(29,161,242,0.15)', border: '1px solid rgba(29,161,242,0.3)', color: '#1DA1F2', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}>
        𝕏 PARTAGER
      </a>
      <button onClick={handleCopy}
        style={{ background: copied ? 'rgba(0,216,128,0.15)' : 'rgba(0,200,240,0.08)', border: `1px solid ${copied ? 'rgba(0,216,128,0.3)' : C.border}`, color: copied ? C.green : C.muted, padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
        {copied ? '✓ COPIÉ' : '⎘ COPIER LE LIEN'}
      </button>
    </div>
  );
}

export default function SlotPageClient({ x, y }) {
  const [slotData, setSlotData] = useState(null);
  const [loading, setLoading] = useState(true);

  const tier = getTier(x, y);
  const tierColor = TIER_COLOR[tier] || C.cyan;

  useEffect(() => {
    fetch(`/api/slot?x=${x}&y=${y}`)
      .then(r => r.json())
      .then(setSlotData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [x, y]);

  const booking = slotData?.booking;
  const stats = slotData?.stats;
  const history = slotData?.history || [];
  const neighbors = slotData?.neighbors || [];

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = booking
    ? `Découvrez ${booking.display_name} sur ADS-SQUARE — slot ${TIER_LABEL[tier]} [${x},${y}]`
    : `Slot ${TIER_LABEL[tier]} [${x},${y}] disponible sur ADS-SQUARE dès ${TIER_PRICE[tier]}`;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 13, letterSpacing: '0.1em' }}>CHARGEMENT…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", padding: '0 0 60px' }}>
      <style>{`* { box-sizing: border-box; } a { text-decoration: none; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* Breadcrumb */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
          <a href="/" style={{ color: C.cyan, fontWeight: 700, letterSpacing: '0.1em' }}>ADS-SQUARE</a>
          <span>/</span>
          <span>Grille</span>
          <span>/</span>
          <span style={{ color: C.text }}>Slot [{x},{y}]</span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>

        {/* Hero slot card */}
        <div style={{
          background: booking ? `linear-gradient(135deg, ${booking.background_color || '#0d1828'}, rgba(1,2,10,0.98))` : C.card,
          border: `1px solid ${tierColor}30`,
          borderRadius: 16, padding: '28px', marginBottom: 24, position: 'relative', overflow: 'hidden',
        }}>
          {/* Tier badge */}
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <span style={{ background: `${tierColor}15`, border: `1px solid ${tierColor}40`, color: tierColor, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 4 }}>
              {TIER_LABEL[tier]}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar / Slot visual */}
            <div style={{ flexShrink: 0 }}>
              {booking?.image_url ? (
                <img src={booking.image_url} alt={booking.display_name}
                  style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: `2px solid ${booking.primary_color || tierColor}40` }} />
              ) : booking ? (
                <div style={{ width: 72, height: 72, background: `${booking.primary_color || tierColor}20`, border: `2px solid ${booking.primary_color || tierColor}40`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: booking.primary_color || tierColor }}>
                  {booking.logo_initials || '??'}
                </div>
              ) : (
                <div style={{ width: 72, height: 72, background: `${tierColor}08`, border: `2px dashed ${tierColor}30`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MiniGrid x={x} y={y} size={56} />
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              {booking ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0 }}>{booking.display_name}</h1>
                    {booking.badge && (
                      <span style={{ background: `${tierColor}15`, border: `1px solid ${tierColor}30`, color: tierColor, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 7px', borderRadius: 3 }}>
                        {booking.badge}
                      </span>
                    )}
                  </div>
                  {booking.slogan && <p style={{ color: C.muted, fontSize: 14, marginBottom: 12, lineHeight: 1.5 }}>{booking.slogan}</p>}
                  {booking.cta_url && (
                    <a href={booking.cta_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-block', background: booking.primary_color || tierColor, color: '#01020A', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', padding: '10px 20px', borderRadius: 7 }}>
                      {booking.cta_text || 'VISITER'} →
                    </a>
                  )}
                </>
              ) : (
                <>
                  <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Slot [{x},{y}] disponible</h1>
                  <p style={{ color: C.muted, fontSize: 14, marginBottom: 14, lineHeight: 1.5 }}>
                    Ce slot {TIER_LABEL[tier]} est libre. Réservez-le dès <strong style={{ color: tierColor }}>{TIER_PRICE[tier]}</strong> et exposez votre marque à toute la grille.
                  </p>
                  <a href="/" style={{ display: 'inline-block', background: tierColor, color: '#01020A', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', padding: '10px 20px', borderRadius: 7 }}>
                    RÉSERVER CE SLOT →
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Slot coords + status */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid rgba(255,255,255,0.06)`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: C.muted }}>
              <span style={{ fontWeight: 700, color: C.text }}>Position</span> [{x}, {y}]
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              <span style={{ fontWeight: 700, color: C.text }}>Tier</span> {TIER_LABEL[tier]}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              <span style={{ fontWeight: 700, color: C.text }}>Tarif</span> {TIER_PRICE[tier]}
            </div>
            {booking && (
              <div style={{ fontSize: 12 }}>
                <span style={{ color: C.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: C.green, borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
                  ACTIF jusqu'au {new Date(booking.end_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats (si booking actif) */}
        {booking && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'CLICS TOTAUX', value: (stats.clicks || 0).toLocaleString('fr-FR') },
              { label: 'IMPRESSIONS', value: (stats.impressions || 0).toLocaleString('fr-FR') },
              { label: 'CTR', value: `${stats.ctr_pct || 0}%` },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.cyan }}>{s.value}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', color: C.muted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Share */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 12 }}>PARTAGER CE SLOT</div>
          <ShareButton url={pageUrl} text={shareText} />
        </div>

        {/* Voisins actifs */}
        {neighbors.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 14 }}>VOISINS SUR LA GRILLE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {neighbors.map(n => (
                <a key={`${n.x}-${n.y}`} href={`/slot/${n.x}-${n.y}`}
                  style={{ background: C.card, border: `1px solid ${n.primary_color ? `${n.primary_color}30` : C.border}`, borderRadius: 10, padding: '14px', display: 'block', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = n.primary_color || C.border2}
                  onMouseLeave={e => e.currentTarget.style.borderColor = n.primary_color ? `${n.primary_color}30` : C.border}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.display_name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>[{n.x},{n.y}]</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Historique */}
        {history.length > 1 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 14 }}>HISTORIQUE DE CE SLOT</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.status === 'active' ? C.green : C.muted, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{h.display_name}</div>
                    {h.slogan && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{h.slogan}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: C.muted }}>{new Date(h.start_date).toLocaleDateString('fr-FR')}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>→ {new Date(h.end_date).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA bas */}
        <div style={{ marginTop: 32, textAlign: 'center', padding: '28px', background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', color: C.cyan, fontWeight: 700, marginBottom: 10 }}>ADS-SQUARE</div>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>La grille publicitaire ouverte à tous</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>1 369 slots disponibles · de 1€ à 1 000€/jour</p>
          <a href="/" style={{ display: 'inline-block', background: C.cyan, color: '#01020A', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', padding: '13px 28px', borderRadius: 7 }}>
            EXPLORER LA GRILLE →
          </a>
        </div>
      </div>
    </div>
  );
}
