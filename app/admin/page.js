'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Design System · DYSON COSMOS ─────────────────────────────────────────
const A = {
  bg:      '#01020A',
  s1:      'rgba(0,4,16,0.98)',
  s2:      'rgba(0,8,24,0.97)',
  card:    'rgba(1,6,18,0.96)',
  card2:   'rgba(0,4,14,0.94)',
  border:  'rgba(0,200,240,0.09)',
  border2: 'rgba(0,200,240,0.18)',
  text:    '#DDE6F2',
  muted:   'rgba(140,180,220,0.60)',
  faint:   'rgba(0,200,240,0.04)',
  accent:  '#E8A020',
  accentFg:'#01020A',
  green:   '#00D880',
  red:     '#D02848',
  blue:    '#3B8FE8',
  purple:  '#9060C8',
  cyan:    '#00C8E4',
  orange:  '#E87020',
};
const F = {
  h:    "'Rajdhani','Sora',system-ui,sans-serif",
  b:    "'Rajdhani','Sora',system-ui,sans-serif",
  m:    "'JetBrains Mono','Fira Code',monospace",
};

// ── Tiers alignés sur lib/grid.js ────────────────────────────────────────────
const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_COLOR = {
  epicenter: '#f0b429',
  prestige:  '#ff4d8f',
  elite:     '#a855f7',
  business:  '#00d9f5',
  standard:  '#38bdf8',
  viral:     '#00e8a2',
};
const TIER_LABEL = {
  epicenter: 'ÉPICENTRE',
  prestige:  'PRESTIGE',
  elite:     'ELITE',
  business:  'BUSINESS',
  standard:  'STANDARD',
  viral:     'VIRAL',
};
const TIER_PRICE_DISPLAY = {
  epicenter: '€1 000/j',
  prestige:  '€100/j',
  elite:     '€50/j',
  business:  '€10/j',
  standard:  '€3/j',
  viral:     '€1/j',
};
// Nombre de blocs par tier (grille 36×36, distance de Chebyshev)
const TIER_COUNT = {
  epicenter: 1,    // d=0
  prestige:  8,    // d=1 → 3×3-1
  elite:     40,   // d≤3 → 7×7-3×3
  business:  176,  // d≤7 → 15×15-7×7
  standard:  400,  // d≤12 → 25×25-15×15
  viral:     671,  // d>12 → 36×36-25×25
};
const GRID_TOTAL = 1296; // 36×36

// ─── Helpers UI ────────────────────────────────────────────────────────────
const fmt  = (c) => `€${(c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 })}`;
const fmtN = (n) => (n || 0).toLocaleString('fr-FR');
const ago  = (dt) => {
  if (!dt) return '—';
  const s = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (s < 60) return `il y a ${s}s`;
  if (s < 3600) return `il y a ${Math.floor(s/60)}min`;
  if (s < 86400) return `il y a ${Math.floor(s/3600)}h`;
  return `il y a ${Math.floor(s/86400)}j`;
};

function Badge({ label, color = A.muted, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: bg || `${color}15`, border: `1px solid ${color}40`,
      color, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
      fontFamily: F.b, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}
function StatusBadge({ status }) {
  const map = {
    active:    { label: 'ACTIF',      color: A.green },
    pending:   { label: 'EN ATTENTE', color: A.accent },
    expired:   { label: 'EXPIRÉ',     color: A.muted },
    cancelled: { label: 'ANNULÉ',     color: A.red },
    rejected:  { label: 'REJETÉ',     color: A.red },
    accepted:  { label: 'ACCEPTÉ',    color: A.green },
  };
  const { label, color } = map[status] || { label: status?.toUpperCase(), color: A.muted };
  return <Badge label={label} color={color} />;
}
function TierBadge({ tier }) {
  const c = TIER_COLOR[tier] || A.muted;
  return <Badge label={TIER_LABEL[tier] || tier?.toUpperCase()} color={c} />;
}
function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style: extra }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: 'none', borderRadius: 7, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: F.b, transition: 'opacity 0.15s, transform 0.1s',
    opacity: disabled ? 0.4 : 1,
    padding: size === 'sm' ? '5px 10px' : size === 'xs' ? '3px 8px' : '9px 16px',
    fontSize: size === 'sm' ? 12 : size === 'xs' ? 11 : 13,
  };
  const variants = {
    primary: { background: A.accent, color: A.accentFg },
    ghost:   { background: A.faint,  color: A.text,  border: `1px solid ${A.border2}` },
    danger:  { background: 'rgba(239,68,68,0.12)', color: A.red,   border: '1px solid rgba(239,68,68,0.3)' },
    success: { background: 'rgba(34,197,94,0.12)',  color: A.green, border: '1px solid rgba(34,197,94,0.3)' },
    blue:    { background: 'rgba(59,130,246,0.12)', color: A.blue,  border: '1px solid rgba(59,130,246,0.3)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...extra }}>
      {children}
    </button>
  );
}
function Input({ value, onChange, placeholder, style: extra, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        background: A.s1, border: `1px solid ${A.border2}`, borderRadius: 7,
        color: A.text, fontFamily: F.b, fontSize: 13, padding: '8px 12px', outline: 'none',
        width: '100%', boxSizing: 'border-box', ...extra,
      }}
    />
  );
}
function Card({ children, style: extra }) {
  return (
    <div style={{ background: A.card, border: `1px solid ${A.border}`, borderRadius: 12, padding: 20, ...extra }}>
      {children}
    </div>
  );
}
function KPI({ label, value, sub, color = A.accent, icon }) {
  return (
    <div style={{ background: A.card, border: `1px solid ${A.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, color: A.muted, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: F.b }}>{label}</div>
        {icon && <div style={{ fontSize: 18, opacity: 0.7 }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: F.h, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: A.muted }}>{sub}</div>}
    </div>
  );
}
function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: A.card, border: `1px solid ${A.border2}`, borderRadius: 14, width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${A.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: F.h, color: A.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: A.muted, cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}
function Toast({ msg, type, onDismiss }) {
  useEffect(() => { if (msg) { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
      background: type === 'error' ? A.red : type === 'success' ? A.green : A.accent,
      color: type === 'success' || type === 'error' ? '#fff' : A.accentFg,
      borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600,
      fontFamily: F.b, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>{msg}</div>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: A.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontFamily: F.b }}>{children}</div>;
}
function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${A.border2}`, borderTopColor: A.accent, animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}
// Toggle switch component
function Toggle({ on, onChange, loading }) {
  return (
    <div onClick={() => !loading && onChange(!on)} style={{
      width: 48, height: 26, borderRadius: 13,
      background: on ? A.green : 'rgba(255,255,255,0.12)',
      position: 'relative', cursor: loading ? 'wait' : 'pointer',
      transition: 'background 0.25s', flexShrink: 0,
      opacity: loading ? 0.6 : 1,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </div>
  );
}

// ─── API Helper ────────────────────────────────────────────────────────────
const useAdminAPI = (token) => {
  const call = useCallback(async (action, params = {}) => {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`/api/admin?${qs}`, { headers: { 'x-admin-token': token } });
    if (!res.ok) throw new Error((await res.json()).error || 'Erreur API');
    return res.json();
  }, [token]);

  const post = useCallback(async (body) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Erreur API');
    return res.json();
  }, [token]);

  return { call, post };
};

// ══════════════════════════════════════════════════════════════════════════
// WAITLIST LAUNCH SECTION
// ══════════════════════════════════════════════════════════════════════════
function WaitlistLaunchSection({ api, waitlistStats }) {
  const [status, setStatus] = useState('idle'); // idle | confirm | sending | done | error
  const [result, setResult] = useState(null);
  const ws = waitlistStats || {};

  const handleLaunch = async () => {
    setStatus('sending');
    try {
      const res = await api.post({ action: 'launch_waitlist' });
      if (res.ok) {
        setResult(res);
        setStatus('done');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      <SectionTitle>📧 Waitlist & Lancement</SectionTitle>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: A.accent, fontFamily: F.m }}>{ws.total || '—'}</div>
              <div style={{ fontSize: 10, color: A.muted, letterSpacing: '.08em', marginTop: 4 }}>INSCRITS</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: A.cyan, fontFamily: F.m }}>{ws.brands || '—'}</div>
              <div style={{ fontSize: 10, color: A.muted, letterSpacing: '.08em', marginTop: 4 }}>MARQUES</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: A.green, fontFamily: F.m }}>{ws.creators || '—'}</div>
              <div style={{ fontSize: 10, color: A.muted, letterSpacing: '.08em', marginTop: 4 }}>CRÉATEURS</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: A.purple, fontFamily: F.m }}>{ws.freelancers || '—'}</div>
              <div style={{ fontSize: 10, color: A.muted, letterSpacing: '.08em', marginTop: 4 }}>FREELANCES</div>
            </div>
          </div>

          {/* Launch button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 220 }}>
            {status === 'idle' && (
              <button
                onClick={() => setStatus('confirm')}
                style={{
                  padding: '12px 20px',
                  background: `linear-gradient(135deg, ${A.accent}, #d4890a)`,
                  border: 'none',
                  color: '#000',
                  fontSize: 12,
                  fontFamily: F.m,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  cursor: 'pointer',
                  clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)',
                  boxShadow: `0 0 24px ${A.accent}40`,
                }}
              >
                🚀 ENVOYER L'EMAIL DE LANCEMENT
              </button>
            )}

            {status === 'confirm' && (
              <div style={{ background: 'rgba(232,160,32,0.08)', border: `1px solid ${A.accent}40`, padding: '14px 16px', borderRadius: 4 }}>
                <div style={{ fontSize: 12, color: A.accent, fontWeight: 700, marginBottom: 10, letterSpacing: '.06em' }}>
                  ⚠ CONFIRMER L'ENVOI
                </div>
                <div style={{ fontSize: 11, color: A.muted, marginBottom: 14 }}>
                  Cela enverra un email à <strong style={{ color: A.text }}>{ws.total || '?'} personnes</strong> pour annoncer l'ouverture de la plateforme.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setStatus('idle')}
                    style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${A.border}`, color: A.muted, fontSize: 11, fontFamily: F.m, cursor: 'pointer' }}
                  >Annuler</button>
                  <button
                    onClick={handleLaunch}
                    style={{ flex: 2, padding: '8px', background: A.accent, border: 'none', color: '#000', fontSize: 11, fontFamily: F.m, fontWeight: 800, cursor: 'pointer', letterSpacing: '.06em' }}
                  >✓ CONFIRMER</button>
                </div>
              </div>
            )}

            {status === 'sending' && (
              <div style={{ fontSize: 12, color: A.accent, fontFamily: F.m, letterSpacing: '.08em' }}>
                ⏳ Envoi en cours…
              </div>
            )}

            {status === 'done' && result && (
              <div style={{ background: 'rgba(0,216,128,0.08)', border: `1px solid rgba(0,216,128,0.30)`, padding: '14px 16px', borderRadius: 4, minWidth: 200 }}>
                <div style={{ fontSize: 12, color: A.green, fontWeight: 700, marginBottom: 8, letterSpacing: '.06em' }}>✓ ENVOI TERMINÉ</div>
                <div style={{ fontSize: 11, color: A.muted }}>
                  <span style={{ color: A.green }}>✓ {result.sent} envoyés</span>
                  {result.errors > 0 && <span style={{ color: A.red }}> · ✗ {result.errors} erreurs</span>}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div style={{ fontSize: 11, color: A.red, fontFamily: F.m }}>
                ✗ Erreur lors de l'envoi
                <button onClick={() => setStatus('idle')} style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: A.muted, cursor: 'pointer', fontSize: 11 }}>Réessayer</button>
              </div>
            )}

            <div style={{ fontSize: 10, color: A.muted, fontFamily: F.m, letterSpacing: '.06em', textAlign: 'right' }}>
              Email bilngue FR/EN · via Resend
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB : VUE D'ENSEMBLE
// ══════════════════════════════════════════════════════════════════════════
function TabOverview({ api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.call('stats').then(setData).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const s = data?.stats || {};
  const tierStats = data?.tierStats || [];
  const recent = data?.recentBookings || [];
  const dayMap = {};
  recent.forEach(b => {
    const d = b.created_at.slice(0, 10);
    if (!dayMap[d]) dayMap[d] = { revenue: 0, count: 0 };
    dayMap[d].revenue += b.amount_cents || 0;
    dayMap[d].count++;
  });
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
    return { d, ...(dayMap[d] || { revenue: 0, count: 0 }) };
  });
  const maxRev = Math.max(...days30.map(d => d.revenue), 1);
  const occPct = Math.round((s.occupied_slots || 0) / GRID_TOTAL * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <SectionTitle>💰 Revenus</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <KPI label="Revenu Total"   value={fmt(s.total_revenue_cents || 0)} icon="💶" />
          <KPI label="Ce mois"        value={fmt(s.revenue_this_month_cents || 0)} color={A.green} icon="📈" />
          <KPI label="MRR"            value={fmt(s.mrr_cents || 0)} color={A.cyan} icon="🔄" />
          <KPI label="Panier moyen"   value={s.total_bookings > 0 ? fmt(Math.round((s.total_revenue_cents || 0) / s.total_bookings)) : '—'} color={A.purple} icon="🛒" />
        </div>
      </div>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>REVENUS — 30 DERNIERS JOURS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
          {days30.map((d, i) => {
            const h = Math.max(2, Math.round((d.revenue / maxRev) * 72));
            return <div key={i} title={`${d.d} — ${fmt(d.revenue)} (${d.count} booking${d.count > 1 ? 's' : ''})`}
              style={{ flex: 1, height: h, borderRadius: 3, background: d.revenue > 0 ? `linear-gradient(to top,${A.accent},${A.accent}80)` : A.border }} />;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: A.muted, fontSize: 10 }}>
          <span>-30j</span><span>aujourd'hui</span>
        </div>
      </Card>
      <div>
        <SectionTitle>📊 Plateforme</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <KPI label="Blocs Actifs"  value={fmtN(s.active_bookings)} color={A.green} icon="🟢"
               sub={`sur ${GRID_TOTAL} · ${occPct}% d'occupation`} />
          <KPI label="En attente"    value={fmtN(s.pending_bookings)} color={A.accent} icon="⏳" />
          <KPI label="Utilisateurs"  value={fmtN(s.total_advertisers)} color={A.blue} icon="👤"
               sub={`${s.active_advertisers} actifs`} />
          <KPI label="Offres en att" value={fmtN(s.pending_offers)} color={A.orange} icon="🤝" />
        </div>
      </div>

      {/* ─── Section Waitlist + Bouton de lancement ─── */}
      <WaitlistLaunchSection api={api} waitlistStats={data?.waitlistStats} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>OCCUPATION PAR TIER</div>
          {tierStats.map(t => {
            const pct = parseFloat(t.occupancy_pct || 0);
            const c = TIER_COLOR[t.tier] || A.muted;
            return (
              <div key={t.tier} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TierBadge tier={t.tier} />
                    <span style={{ color: A.muted, fontSize: 11 }}>{t.occupied_slots}/{t.total_slots}</span>
                  </div>
                  <span style={{ color: c, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: A.border }}>
                  <div style={{ height: 5, borderRadius: 3, width: `${pct}%`, background: `linear-gradient(90deg,${c}90,${c})`, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </Card>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>ENGAGEMENT</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Clics totaux',  fmtN(s.total_clicks),       '🖱'],
              ['Impressions',   fmtN(s.total_impressions),   '👁'],
              ['CTR moyen',     s.total_impressions > 0 ? `${((s.total_clicks / s.total_impressions) * 100).toFixed(2)}%` : '—', '📊'],
              ['Bookings total',fmtN(s.total_bookings),      '📋'],
            ].map(([label, val, icon]) => (
              <div key={label} style={{ padding: '12px', borderRadius: 8, background: A.s2, border: `1px solid ${A.border}` }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: A.text, fontFamily: F.h }}>{val}</div>
                <div style={{ fontSize: 10, color: A.muted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB : RÉSERVATIONS
// ══════════════════════════════════════════════════════════════════════════
function TabBookings({ api, onToast }) {
  const [bookings,       setBookings]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [tierFilter,     setTierFilter]     = useState('all');
  const [selected,       setSelected]       = useState(null);
  const [modal,          setModal]          = useState(null);
  const [reason,         setReason]         = useState('');
  const [extraDays,      setExtraDays]      = useState('30');
  const [actionLoading,  setActionLoading]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.call('bookings', { status: statusFilter, tier: tierFilter, search })
      .then(d => setBookings(d.bookings || []))
      .finally(() => setLoading(false));
  }, [statusFilter, tierFilter, search]);

  useEffect(() => { load(); }, [statusFilter, tierFilter]);
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [search]);

  const doAction = async (action, extra = {}) => {
    setActionLoading(true);
    try {
      await api.post({ action, bookingId: selected.id, reason, extraDays: parseInt(extraDays), ...extra });
      onToast({ msg: 'Action effectuée ✓', type: 'success' });
      setModal(null); setSelected(null); setReason('');
      load();
    } catch (e) { onToast({ msg: e.message, type: 'error' }); }
    finally { setActionLoading(false); }
  };

  const StatusFilter = ({ val, label }) => (
    <button onClick={() => setStatusFilter(val)} style={{
      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      fontFamily: F.b, border: 'none',
      background: statusFilter === val ? A.accent : A.faint,
      color: statusFilter === val ? A.accentFg : A.muted,
    }}>{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input value={search} onChange={setSearch} placeholder="🔍 Nom, email…" style={{ maxWidth: 260 }} />
        <div style={{ display: 'flex', gap: 6, background: A.s1, padding: '4px', borderRadius: 8 }}>
          {[['all','Tous'],['active','Actifs'],['pending','En attente'],['expired','Expirés'],['cancelled','Annulés']].map(([v,l]) =>
            <StatusFilter key={v} val={v} label={l} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, background: A.s1, padding: '4px', borderRadius: 8 }}>
          {[['all','Tiers'],...TIER_ORDER.map(t => [t, TIER_LABEL[t]])].map(([v,l]) => (
            <button key={v} onClick={() => setTierFilter(v)} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: F.b, border: 'none',
              background: tierFilter === v ? (TIER_COLOR[v] || A.accent) : A.faint,
              color: tierFilter === v ? (v !== 'all' ? '#000' : A.accentFg) : A.muted,
            }}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', color: A.muted, fontSize: 12 }}>{bookings.length} résultats</div>
      </div>

      <Card style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${A.border2}` }}>
              {['Slot','Annonceur','Tier','Statut','Période','Montant','Clics','Offres','Actions'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: A.muted, fontWeight: 600, fontSize: 10, letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: A.muted }}>Chargement…</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: A.muted }}>Aucun résultat</td></tr>
            ) : bookings.map((b, i) => (
              <tr key={b.id} style={{
                borderBottom: `1px solid ${A.border}`,
                background: selected?.id === b.id ? `${A.accent}08` : i % 2 === 0 ? 'transparent' : A.faint,
                cursor: 'pointer',
              }} onClick={() => setSelected(prev => prev?.id === b.id ? null : b)}>
                <td style={{ padding: '10px 14px', fontFamily: F.m, color: A.cyan, fontSize: 11 }}>({b.slot_x},{b.slot_y})</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ color: A.text, fontWeight: 600, marginBottom: 1 }}>{b.display_name}</div>
                  <div style={{ color: A.muted, fontSize: 10 }}>{b.advertiser_email}</div>
                </td>
                <td style={{ padding: '10px 14px' }}><TierBadge tier={b.tier} /></td>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={b.status} /></td>
                <td style={{ padding: '10px 14px', color: A.muted, fontSize: 11, whiteSpace: 'nowrap' }}>
                  {b.start_date} → {b.end_date}
                  {b.days_remaining > 0 && <div style={{ color: b.days_remaining <= 7 ? A.orange : A.green, fontSize: 10 }}>J-{b.days_remaining}</div>}
                </td>
                <td style={{ padding: '10px 14px', color: A.accent, fontWeight: 700, fontFamily: F.h }}>{fmt(b.amount_cents)}</td>
                <td style={{ padding: '10px 14px', color: A.muted }}>
                  <div>{fmtN(b.clicks_total)} clics</div>
                  <div style={{ fontSize: 10 }}>{b.ctr_pct}% CTR</div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {b.pending_offers > 0
                    ? <Badge label={`${b.pending_offers} offre${b.pending_offers > 1 ? 's' : ''}`} color={A.orange} />
                    : <span style={{ color: A.muted }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    {b.status === 'pending' && (
                      <Btn size="xs" variant="success" onClick={() => { setSelected(b); setModal('activate'); }}>✓</Btn>
                    )}
                    {['active','pending'].includes(b.status) && (
                      <Btn size="xs" variant="blue" onClick={() => { setSelected(b); setModal('extend'); }}>+j</Btn>
                    )}
                    {['active','pending'].includes(b.status) && (
                      <Btn size="xs" variant="danger" onClick={() => { setSelected(b); setModal('cancel'); }}>✕</Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal === 'cancel' && selected && (
        <Modal title={`Annuler — ${selected.display_name}`} onClose={() => { setModal(null); setReason(''); }}>
          <p style={{ color: A.muted, marginBottom: 16, fontSize: 13 }}>Le slot sera libéré immédiatement.</p>
          <Input value={reason} onChange={setReason} placeholder="Raison (optionnel)" style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="danger" onClick={() => doAction('cancel_booking')} disabled={actionLoading}>
              {actionLoading ? '…' : "Confirmer l'annulation"}
            </Btn>
          </div>
        </Modal>
      )}
      {modal === 'extend' && selected && (
        <Modal title={`Prolonger — ${selected.display_name}`} onClose={() => setModal(null)}>
          <p style={{ color: A.muted, marginBottom: 16, fontSize: 13 }}>Fin actuelle : <strong style={{ color: A.text }}>{selected.end_date}</strong></p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[7,14,30,60,90].map(n => (
              <Btn key={n} size="sm" variant={extraDays === String(n) ? 'primary' : 'ghost'} onClick={() => setExtraDays(String(n))}>+{n}j</Btn>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="success" onClick={() => doAction('extend_booking')} disabled={actionLoading}>
              {actionLoading ? '…' : `Prolonger de ${extraDays} jours`}
            </Btn>
          </div>
        </Modal>
      )}
      {modal === 'activate' && selected && (
        <Modal title={`Forcer activation — ${selected.display_name}`} onClose={() => setModal(null)}>
          <p style={{ color: A.muted, marginBottom: 20, fontSize: 13 }}>Passer de <strong style={{ color: A.accent }}>En attente</strong> → <strong style={{ color: A.green }}>Actif</strong> sans paiement Stripe.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="success" onClick={() => doAction('activate_booking')} disabled={actionLoading}>
              {actionLoading ? '…' : 'Forcer actif'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB : UTILISATEURS
// ══════════════════════════════════════════════════════════════════════════
function TabUsers({ api, onToast }) {
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filter,        setFilter]        = useState('all');
  const [selected,      setSelected]      = useState(null);
  const [noteText,      setNoteText]      = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    api.call('users', { search, filter }).then(d => setUsers(d.users || [])).finally(() => setLoading(false));
  }, [search, filter]);
  useEffect(() => { load(); }, [filter]);
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [search]);

  const doAction = async (action, extra = {}) => {
    setActionLoading(true);
    try {
      await api.post({ action, userId: selected.id, note: noteText, ...extra });
      onToast({ msg: 'Utilisateur mis à jour ✓', type: 'success' });
      load();
      setSelected(prev => prev ? { ...prev, is_suspended: action === 'suspend_user' } : null);
    } catch (e) { onToast({ msg: e.message, type: 'error' }); }
    finally { setActionLoading(false); }
  };

  const PROFILE_COLOR = { creator: A.cyan, freelance: A.green, brand: A.accent };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Input value={search} onChange={setSearch} placeholder="🔍 Email, nom…" style={{ maxWidth: 280 }} />
          {[['all','Tous'],['active','Actifs'],['suspended','Suspendus']].map(([v,l]) => (
            <Btn key={v} size="sm" variant={filter === v ? 'primary' : 'ghost'} onClick={() => setFilter(v)}>{l}</Btn>
          ))}
          <div style={{ marginLeft: 'auto', color: A.muted, fontSize: 12 }}>{users.length} utilisateurs</div>
        </div>
        <Card style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border2}` }}>
                {['Utilisateur','Type','Bookings','LTV','Dernière activité','Statut'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: A.muted, fontWeight: 600, fontSize: 10, letterSpacing: '0.07em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: A.muted }}>Chargement…</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} style={{
                  borderBottom: `1px solid ${A.border}`,
                  background: selected?.id === u.id ? `${A.accent}08` : i % 2 === 0 ? 'transparent' : A.faint,
                  cursor: 'pointer',
                }} onClick={() => { setSelected(u); setNoteText(u.admin_note || ''); }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: A.text }}>{u.display_name}</div>
                    <div style={{ color: A.muted, fontSize: 10 }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><Badge label={u.profile_type?.toUpperCase()} color={PROFILE_COLOR[u.profile_type] || A.muted} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ color: A.text }}>{u.active_bookings} actifs</div>
                    <div style={{ color: A.muted, fontSize: 10 }}>{u.total_bookings} total</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: A.accent, fontWeight: 700, fontFamily: F.h }}>{fmt(u.lifetime_value_cents)}</td>
                  <td style={{ padding: '10px 14px', color: A.muted, fontSize: 11 }}>{ago(u.last_booking_at)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {u.is_suspended ? <Badge label="SUSPENDU" color={A.red} />
                      : u.active_bookings > 0 ? <Badge label="ACTIF" color={A.green} />
                      : <Badge label="INACTIF" color={A.muted} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {selected && (
        <div style={{ width: 300, flexShrink: 0 }}>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: A.text, fontFamily: F.h }}>{selected.display_name}</div>
                <div style={{ color: A.muted, fontSize: 11, marginTop: 2 }}>{selected.email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: A.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['LTV',fmt(selected.lifetime_value_cents)],['Bookings',`${selected.total_bookings}`],['Actifs',`${selected.active_bookings}`],['Expirés',`${selected.expired_bookings}`]].map(([l,v]) => (
                <div key={l} style={{ padding: '10px', background: A.s2, borderRadius: 8, border: `1px solid ${A.border}` }}>
                  <div style={{ fontSize: 10, color: A.muted, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontWeight: 700, color: A.text, fontFamily: F.h }}>{v}</div>
                </div>
              ))}
            </div>
            {selected.stripe_customer_id && (
              <div style={{ padding: '8px 10px', background: A.s2, borderRadius: 8, border: `1px solid ${A.border}` }}>
                <div style={{ fontSize: 10, color: A.muted, marginBottom: 2 }}>Stripe Customer</div>
                <a href={`https://dashboard.stripe.com/customers/${selected.stripe_customer_id}`} target="_blank" rel="noreferrer"
                  style={{ color: A.cyan, fontSize: 11, fontFamily: F.m }}>{selected.stripe_customer_id.slice(0, 24)}…</a>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: A.muted, marginBottom: 6, fontWeight: 600, letterSpacing: '0.07em' }}>NOTE ADMIN</div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Ajouter une note interne…"
                style={{ width: '100%', background: A.s1, border: `1px solid ${A.border2}`, borderRadius: 7, color: A.text, fontFamily: F.b, fontSize: 12, padding: '8px 10px', outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }} />
              <Btn size="sm" variant="ghost" style={{ marginTop: 6, width: '100%', justifyContent: 'center' }}
                onClick={() => doAction('update_user_note')} disabled={actionLoading}>Enregistrer la note</Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selected.is_suspended
                ? <Btn variant="success" onClick={() => doAction('unsuspend_user')} disabled={actionLoading}>✓ Réactiver le compte</Btn>
                : <Btn variant="danger" onClick={() => doAction('suspend_user', { note: noteText })} disabled={actionLoading}>⊗ Suspendre le compte</Btn>}
              <div style={{ fontSize: 10, color: A.muted, textAlign: 'center' }}>
                Membre depuis {selected.created_at ? new Date(selected.created_at).toLocaleDateString('fr-FR') : '—'}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB : OFFRES DE RACHAT
// ══════════════════════════════════════════════════════════════════════════
function TabOffers({ api, onToast }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const load = () => { setLoading(true); api.call('offers').then(d => setOffers(d.offers || [])).finally(() => setLoading(false)); };
  useEffect(load, []);
  const resolve = async (offerId, resolution) => {
    setActionLoading(true);
    try {
      await api.post({ action: 'resolve_offer', offerId, resolution });
      onToast({ msg: `Offre ${resolution === 'accepted' ? 'acceptée' : 'rejetée'} ✓`, type: 'success' });
      load();
    } catch (e) { onToast({ msg: e.message, type: 'error' }); }
    finally { setActionLoading(false); }
  };
  const groups = { pending: [], accepted: [], rejected: [], expired: [] };
  offers.forEach(o => { (groups[o.status] || groups.pending).push(o); });
  const OfferCard = ({ offer }) => {
    const b = offer.bookings || {};
    const isPending = offer.status === 'pending';
    const expiresIn = offer.expires_at ? Math.max(0, Math.floor((new Date(offer.expires_at) - Date.now()) / 3600000)) : null;
    return (
      <div style={{ padding: '16px', borderRadius: 10, background: A.s1, border: `1px solid ${isPending ? A.orange + '40' : A.border}`, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: A.text, fontFamily: F.h }}>{fmt(offer.offer_amount_cents)}</div>
            <div style={{ color: A.muted, fontSize: 11, marginTop: 2 }}>par {offer.buyer_name || offer.buyer_email}</div>
          </div>
          <StatusBadge status={offer.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 11 }}>
          <div style={{ color: A.muted }}>Slot <span style={{ color: A.cyan, fontFamily: F.m }}>({b.slot_x},{b.slot_y})</span></div>
          <div style={{ color: A.muted }}>Occupant : <span style={{ color: A.text }}>{b.display_name}</span></div>
          <div style={{ color: A.muted }}>Email : <span style={{ color: A.text, fontSize: 10 }}>{offer.buyer_email}</span></div>
          {expiresIn !== null && <div style={{ color: expiresIn < 6 ? A.red : A.muted }}>Expire dans : <span style={{ color: A.text }}>{expiresIn}h</span></div>}
        </div>
        {offer.message && <div style={{ padding: '8px 10px', background: A.s2, borderRadius: 7, fontSize: 11, color: A.muted, marginBottom: 10, fontStyle: 'italic' }}>"{offer.message}"</div>}
        {isPending && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn size="sm" variant="success" onClick={() => resolve(offer.id, 'accepted')} disabled={actionLoading}>✓ Accepter</Btn>
            <Btn size="sm" variant="danger"  onClick={() => resolve(offer.id, 'rejected')} disabled={actionLoading}>✕ Rejeter</Btn>
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 10, color: A.muted }}>{ago(offer.created_at)}</div>
      </div>
    );
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div>
        <SectionTitle>⏳ En attente ({groups.pending.length})</SectionTitle>
        {loading ? <LoadingSpinner /> : groups.pending.length === 0
          ? <div style={{ color: A.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>Aucune offre en attente</div>
          : groups.pending.map(o => <OfferCard key={o.id} offer={o} />)}
      </div>
      <div>
        <SectionTitle>📋 Historique</SectionTitle>
        {[...groups.accepted, ...groups.rejected, ...groups.expired].slice(0, 20).map(o => <OfferCard key={o.id} offer={o} />)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB : REVENUS
// ══════════════════════════════════════════════════════════════════════════
function TabRevenue({ api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.call('revenue').then(setData).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const monthly = data?.monthly || [];
  const topSpenders = data?.topSpenders || [];
  const months = {};
  monthly.forEach(row => {
    const m = row.month?.slice(0, 7);
    if (!months[m]) months[m] = { total: 0 };
    months[m].total += row.revenue_cents || 0;
  });
  const monthEntries = Object.entries(months).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 12);
  const maxMonthly = Math.max(...monthEntries.map(([,v]) => v.total), 1);
  const tierRevenue = monthly.reduce((acc, row) => { acc[row.tier] = (acc[row.tier] || 0) + (row.revenue_cents || 0); return acc; }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 16 }}>REVENU PAR MOIS</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
          {monthEntries.map(([month, { total }]) => {
            const h = Math.max(4, Math.round((total / maxMonthly) * 112));
            return (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${month} — ${fmt(total)}`}>
                <div style={{ fontSize: 9, color: A.muted }}>{fmt(total)}</div>
                <div style={{ width: '100%', height: h, borderRadius: 4, background: `linear-gradient(to top,${A.accent},${A.accent}70)` }} />
                <div style={{ fontSize: 9, color: A.muted }}>{month?.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>REVENU PAR TIER</div>
          {TIER_ORDER.filter(t => tierRevenue[t]).map(tier => {
            const c = TIER_COLOR[tier];
            return (
              <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '10px 12px', background: A.s2, borderRadius: 8, border: `1px solid ${c}20` }}>
                <TierBadge tier={tier} />
                <div style={{ fontWeight: 700, color: c, fontFamily: F.h }}>{fmt(tierRevenue[tier])}</div>
              </div>
            );
          })}
        </Card>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>TOP 10 CLIENTS</div>
          {topSpenders.map((u, i) => (
            <div key={u.email} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 10px', background: A.s2, borderRadius: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${A.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: A.accent }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: A.text, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name}</div>
                <div style={{ color: A.muted, fontSize: 10 }}>{u.total_bookings} booking{u.total_bookings > 1 ? 's' : ''}</div>
              </div>
              <div style={{ fontWeight: 700, color: A.accent, fontFamily: F.h, fontSize: 13 }}>{fmt(u.lifetime_value_cents)}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB : ANALYTICS
// ══════════════════════════════════════════════════════════════════════════
function TabAnalytics({ api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.call('analytics').then(setData).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingSpinner />;
  const topSlots = data?.topSlots || [];
  const clicksByDay = data?.clicksByDay || [];
  const topReferrers = data?.topReferrers || [];
  const clickDayMap = {};
  clicksByDay.forEach(c => {
    const d = c.created_at?.slice(0, 10);
    if (!clickDayMap[d]) clickDayMap[d] = { clicks: 0, impressions: 0 };
    if (c.event_type === 'click') clickDayMap[d].clicks++;
    else clickDayMap[d].impressions++;
  });
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { d, ...(clickDayMap[d] || { clicks: 0, impressions: 0 }) };
  });
  const maxClicks = Math.max(...days14.map(d => d.clicks), 1);
  const refMap = {};
  topReferrers.forEach(r => {
    if (!r.referrer) return;
    try { const domain = new URL(r.referrer).hostname; refMap[domain] = (refMap[domain] || 0) + 1; }
    catch { refMap[r.referrer] = (refMap[r.referrer] || 0) + 1; }
  });
  const refEntries = Object.entries(refMap).sort((a,b) => b[1]-a[1]).slice(0, 10);
  const maxRef = Math.max(...refEntries.map(r => r[1]), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 16 }}>CLICS — 14 DERNIERS JOURS</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
          {days14.map((d, i) => {
            const h = Math.max(2, Math.round((d.clicks / maxClicks) * 72));
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                title={`${d.d} — ${d.clicks} clics · ${d.impressions} impressions`}>
                <div style={{ width: '100%', height: h, borderRadius: 3, background: `linear-gradient(to top,${A.cyan},${A.cyan}60)` }} />
                <div style={{ fontSize: 8, color: A.muted }}>{d.d.slice(8)}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>TOP 20 SLOTS PAR CTR</div>
          {topSlots.length === 0 ? <div style={{ color: A.muted, fontSize: 12 }}>Pas de données</div>
            : topSlots.map((s, i) => (
              <div key={`${s.slot_x}-${s.slot_y}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: A.s2, border: `1px solid ${A.border}` }}>
                <div style={{ width: 20, textAlign: 'right', color: A.muted, fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                <div style={{ fontFamily: F.m, fontSize: 11, color: A.cyan }}>({s.slot_x},{s.slot_y})</div>
                <div style={{ flex: 1, fontSize: 11, color: A.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display_name}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: A.green }}>{s.ctr_pct}%</div>
                <div style={{ fontSize: 10, color: A.muted }}>{fmtN(s.clicks_7d)}c/7j</div>
              </div>
            ))}
        </Card>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>TOP SOURCES (30j)</div>
          {refEntries.length === 0 ? <div style={{ color: A.muted, fontSize: 12 }}>Pas encore de données referrer</div>
            : refEntries.map(([domain, count]) => (
              <div key={domain} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: A.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{domain}</div>
                  <div style={{ fontSize: 11, color: A.muted }}>{count} clics</div>
                </div>
                <div style={{ height: 4, background: A.border, borderRadius: 2 }}>
                  <div style={{ height: 4, borderRadius: 2, width: `${(count / maxRef) * 100}%`, background: A.purple }} />
                </div>
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB : CONFIGURATION — tiers + blocs individuels
// ══════════════════════════════════════════════════════════════════════════
function TabConfig({ api, onToast }) {
  const [tiers,         setTiers]         = useState([]);
  const [overrides,     setOverrides]     = useState([]); // blocs désactivés individuellement
  const [audit,         setAudit]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toggling,      setToggling]      = useState(null); // tier en cours de toggle
  // Formulaire ajout slot override
  const [slotX,         setSlotX]         = useState('');
  const [slotY,         setSlotY]         = useState('');
  const [slotReason,    setSlotReason]    = useState('');
  const [slotLoading,   setSlotLoading]   = useState(false);
  const [removingSlot,  setRemovingSlot]  = useState(null); // 'x,y'

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.call('config'), api.call('audit')])
      .then(([cfg, aud]) => {
        // Merge tier_config rows with defaults for any missing tiers
        const dbTierMap = {};
        (cfg.tiers || []).forEach(t => { dbTierMap[t.tier] = t; });
        // Ensure all 6 tiers are shown even if not yet in DB
        const merged = TIER_ORDER.map(tier => dbTierMap[tier] || {
          tier,
          available:   ['business','standard','viral'].includes(tier),
          label:       TIER_LABEL[tier],
          price_cents: { epicenter:100000,prestige:10000,elite:5000,business:1000,standard:300,viral:100 }[tier],
        });
        setTiers(merged);
        setOverrides(cfg.overrides || []);
        setAudit(aud.actions || []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, []);

  const toggleTier = async (tier, currentAvailable) => {
    setToggling(tier);
    try {
      await api.post({ action: 'update_tier', tier, available: !currentAvailable });
      setTiers(prev => prev.map(t => t.tier === tier ? { ...t, available: !currentAvailable } : t));
      onToast({ msg: `Tier ${TIER_LABEL[tier]} ${!currentAvailable ? '🟢 ouvert' : '🔒 fermé'} ✓`, type: 'success' });
    } catch (e) { onToast({ msg: e.message, type: 'error' }); }
    finally { setToggling(null); }
  };

  const disableSlot = async () => {
    const x = parseInt(slotX), y = parseInt(slotY);
    if (!x || !y || x < 1 || x > 36 || y < 1 || y > 36) {
      onToast({ msg: 'Coordonnées invalides (1–36)', type: 'error' }); return;
    }
    setSlotLoading(true);
    try {
      await api.post({ action: 'disable_slot', slotX: x, slotY: y, reason: slotReason });
      onToast({ msg: `Bloc (${x},${y}) désactivé ✓`, type: 'success' });
      setSlotX(''); setSlotY(''); setSlotReason('');
      loadAll();
    } catch (e) { onToast({ msg: e.message, type: 'error' }); }
    finally { setSlotLoading(false); }
  };

  const enableSlot = async (x, y) => {
    const key = `${x},${y}`;
    setRemovingSlot(key);
    try {
      await api.post({ action: 'enable_slot', slotX: x, slotY: y });
      onToast({ msg: `Bloc (${x},${y}) réactivé ✓`, type: 'success' });
      setOverrides(prev => prev.filter(o => !(o.slot_x === x && o.slot_y === y)));
    } catch (e) { onToast({ msg: e.message, type: 'error' }); }
    finally { setRemovingSlot(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Section 1 : Tiers ───────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: A.text, fontFamily: F.h, marginBottom: 2 }}>Ouverture progressive des tiers</div>
            <div style={{ fontSize: 11, color: A.muted }}>Contrôle en temps réel — sans redéploiement</div>
          </div>
          <div style={{ display: 'flex', gap: 6, fontSize: 11, color: A.muted }}>
            <span style={{ color: A.green, fontWeight: 700 }}>{tiers.filter(t => t.available).length}</span> ouverts ·
            <span style={{ color: A.muted }}>{tiers.filter(t => !t.available).length} fermés</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tiers.map(t => {
            const c         = TIER_COLOR[t.tier] || A.muted;
            const isToggling = toggling === t.tier;
            const count     = TIER_COUNT[t.tier] || 0;
            const price     = TIER_PRICE_DISPLAY[t.tier] || '?';
            return (
              <div key={t.tier} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 10,
                background: A.s1, border: `1px solid ${t.available ? c + '45' : A.border}`,
                transition: 'border-color 0.3s',
              }}>
                {/* Color dot */}
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}80`, flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <TierBadge tier={t.tier} />
                    <span style={{ color: A.muted, fontSize: 11 }}>{price}</span>
                    <span style={{ color: A.border, fontSize: 11 }}>·</span>
                    <span style={{ color: A.muted, fontSize: 11 }}>{count} bloc{count > 1 ? 's' : ''}</span>
                  </div>
                  {t.updated_by && (
                    <div style={{ fontSize: 10, color: A.muted }}>
                      Modifié par <span style={{ color: A.text }}>{t.updated_by}</span> · {t.updated_at ? new Date(t.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  )}
                </div>

                {/* Status label */}
                <div style={{ fontSize: 11, fontWeight: 700, color: t.available ? A.green : A.muted, minWidth: 120, textAlign: 'right' }}>
                  {isToggling ? '⏳ Mise à jour…' : t.available ? '🟢 OUVERT' : '🔒 PROCHAINEMENT'}
                </div>

                {/* Toggle */}
                <Toggle on={t.available} onChange={() => toggleTier(t.tier, t.available)} loading={isToggling} />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: `${A.accent}08`, borderRadius: 8, border: `1px solid ${A.accent}20`, fontSize: 11, color: A.muted }}>
          ⚡ Ces changements prennent effet immédiatement. L'API checkout vérifie <code style={{ color: A.accent }}>tier_config</code> à chaque transaction.
        </div>
      </Card>

      {/* ── Section 2 : Blocs individuels ───────────────────────── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: A.text, fontFamily: F.h, marginBottom: 2 }}>Blocs désactivés individuellement</div>
            <div style={{ fontSize: 11, color: A.muted }}>Désactiver un slot précis sans fermer tout son tier</div>
          </div>
          {overrides.length > 0 && (
            <Badge label={`${overrides.length} bloc${overrides.length > 1 ? 's' : ''} désactivé${overrides.length > 1 ? 's' : ''}`} color={A.orange} />
          )}
        </div>

        {/* Formulaire ajout */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16, padding: '14px 16px', background: A.s2, borderRadius: 10, border: `1px solid ${A.border}` }}>
          <div style={{ flex: '0 0 90px' }}>
            <div style={{ fontSize: 10, color: A.muted, marginBottom: 5, fontWeight: 600 }}>COLONNE X</div>
            <Input value={slotX} onChange={setSlotX} placeholder="1–36" type="number" style={{ textAlign: 'center' }} />
          </div>
          <div style={{ flex: '0 0 90px' }}>
            <div style={{ fontSize: 10, color: A.muted, marginBottom: 5, fontWeight: 600 }}>LIGNE Y</div>
            <Input value={slotY} onChange={setSlotY} placeholder="1–36" type="number" style={{ textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: A.muted, marginBottom: 5, fontWeight: 600 }}>RAISON (optionnel)</div>
            <Input value={slotReason} onChange={setSlotReason} placeholder="Maintenance, réservé, etc." />
          </div>
          <Btn variant="danger" onClick={disableSlot} disabled={slotLoading || !slotX || !slotY}>
            {slotLoading ? '…' : '⊗ Désactiver'}
          </Btn>
        </div>

        {/* Liste des blocs désactivés */}
        {overrides.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: A.muted, fontSize: 13, border: `1px dashed ${A.border}`, borderRadius: 8 }}>
            Aucun bloc désactivé individuellement
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overrides.map(o => (
              <div key={`${o.slot_x},${o.slot_y}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <div style={{ fontFamily: F.m, fontSize: 13, fontWeight: 700, color: A.red, minWidth: 70 }}>
                  ({o.slot_x},{o.slot_y})
                </div>
                <div style={{ flex: 1 }}>
                  {o.reason && <div style={{ fontSize: 12, color: A.text }}>{o.reason}</div>}
                  <div style={{ fontSize: 10, color: A.muted }}>Désactivé {ago(o.updated_at)}{o.updated_by ? ` par ${o.updated_by}` : ''}</div>
                </div>
                <Btn size="xs" variant="success"
                  onClick={() => enableSlot(o.slot_x, o.slot_y)}
                  disabled={removingSlot === `${o.slot_x},${o.slot_y}`}>
                  {removingSlot === `${o.slot_x},${o.slot_y}` ? '…' : '✓ Réactiver'}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Section 3 : Audit log ────────────────────────────────── */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: A.muted, letterSpacing: '0.07em', marginBottom: 14 }}>
          JOURNAL D'AUDIT — 100 DERNIÈRES ACTIONS
        </div>
        {audit.length === 0 ? (
          <div style={{ color: A.muted, fontSize: 12 }}>Aucune action enregistrée</div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {audit.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px solid ${A.border}`, fontSize: 12 }}>
                <div style={{ color: A.muted, fontSize: 10, whiteSpace: 'nowrap', paddingTop: 1, minWidth: 80 }}>{ago(a.created_at)}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ color: A.accent, fontWeight: 600 }}>{a.admin_email}</span>
                  <span style={{ color: A.muted }}> → </span>
                  <span style={{ color: A.text }}>{a.action}</span>
                  {a.target_type && <span style={{ color: A.muted }}> · {a.target_type}: <span style={{ fontFamily: F.m, fontSize: 10 }}>{a.target_id}</span></span>}
                  {a.details && Object.keys(a.details).length > 0 && (
                    <span style={{ color: A.muted, fontSize: 10 }}> ({JSON.stringify(a.details)})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const tryLogin = async () => {
    if (!pwd) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin?action=stats', { headers: { 'x-admin-token': pwd } });
      if (res.ok) { onLogin(pwd); }
      else if (res.status === 500) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || 'Erreur serveur — vérifiez que ADMIN_SECRET est défini dans Cloudflare Pages');
      } else if (res.status === 401) { setError('Mot de passe incorrect.'); }
      else { setError(`Erreur ${res.status} — réessayez.`); }
    } catch { setError('Erreur de connexion au serveur.'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:'100vh', background:A.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F.m }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>
      <div style={{
        width:380,
        background:'rgba(0,4,16,0.98)',
        border:`0.5px solid rgba(0,200,240,0.20)`,
        padding:'40px 36px',
        clipPath:'polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))',
        boxShadow:'0 0 80px rgba(0,200,240,0.06), 0 32px 80px rgba(0,0,0,0.9)',
        position:'relative', overflow:'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'1.5px', background:'linear-gradient(90deg,transparent,rgba(0,200,240,0.50),rgba(232,160,32,0.30),transparent)', boxShadow:'0 0 8px rgba(0,200,240,0.30)' }}/>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:24, fontWeight:700, fontFamily:F.m, letterSpacing:'.18em', color:A.accent, marginBottom:6 }}>
            ◈ DYSON·COSMOS
          </div>
          <div style={{ color:A.muted, fontSize:10, letterSpacing:'.18em' }}>ADMINISTRATION·MK·VII</div>
        </div>
        <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryLogin()}
          placeholder="MOT DE PASSE ADMIN" autoFocus
          style={{ width:'100%', background:'rgba(0,4,14,0.80)', border:`0.5px solid ${error ? A.red+'80' : 'rgba(0,200,240,0.22)'}`, color:A.text, fontFamily:F.m, fontSize:12, padding:'12px 14px', outline:'none', boxSizing:'border-box', marginBottom:8, letterSpacing:'.08em', clipPath:'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)' }} />
        {error && <div style={{ color:A.red, fontSize:11, marginBottom:10, fontFamily:F.m, letterSpacing:'.06em' }}>{error}</div>}
        <button onClick={tryLogin} disabled={loading || !pwd}
          style={{ width:'100%', padding:'12px', background: loading||!pwd ? `${A.accent}40` : A.accent, border:'none', color:A.accentFg, fontWeight:700, fontSize:12, cursor:loading||!pwd?'not-allowed':'pointer', opacity:1, fontFamily:F.m, letterSpacing:'.12em', marginTop:4, clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))' }}>
          {loading ? 'VÉRIFICATION…' : 'ACCÉDER →'}
        </button>
        <div style={{ textAlign:'center', marginTop:20, fontSize:9, color:A.muted, fontFamily:F.m, letterSpacing:'.10em' }}>
          ENV : <code style={{ color:A.accent }}>ADMIN_SECRET</code>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ══════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'overview',   label: "Vue d'ensemble", icon: '⬡' },
  { id: 'bookings',   label: 'Réservations',   icon: '🗂' },
  { id: 'users',      label: 'Utilisateurs',   icon: '👤' },
  { id: 'offers',     label: 'Offres',         icon: '🤝' },
  { id: 'revenue',    label: 'Revenus',        icon: '💶' },
  { id: 'analytics',  label: 'Analytics',      icon: '📊' },
  { id: 'config',     label: 'Configuration',  icon: '⚙' },
];

export default function AdminDashboard() {
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('admin_token') || '';
    return '';
  });
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState({ msg: '', type: '' });
  const api = useAdminAPI(token);

  const handleLogin = (t) => { sessionStorage.setItem('admin_token', t); setToken(t); };
  const handleLogout = () => { sessionStorage.removeItem('admin_token'); setToken(''); };
  const onToast = ({ msg, type }) => setToast({ msg, type });

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: '100vh', background: A.bg, fontFamily: F.b, color: A.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 2px; height: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,200,240,0.15); border-radius: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanMove { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>

      {/* Sidebar */}
      <div style={{
        position:'fixed', left:0, top:0, bottom:0, width:220,
        background:'rgba(0,2,10,0.99)',
        borderRight:`0.5px solid rgba(0,200,240,0.12)`,
        display:'flex', flexDirection:'column', zIndex:100,
        boxShadow:'4px 0 40px rgba(0,0,0,0.7)',
        overflow:'hidden',
      }}>
        {/* Subtle scan line */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
          <div style={{ position:'absolute', left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(0,200,240,0.10),transparent)', animation:'scanMove 8s linear infinite' }}/>
        </div>
        <div style={{ padding:'20px 16px 16px', borderBottom:`0.5px solid rgba(0,200,240,0.10)`, position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ color:A.accent, fontSize:16, fontFamily:F.m }}>◈</span>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:F.m, letterSpacing:'.16em', color:A.accent }}>DYSON·COSMOS</div>
          </div>
          <div style={{ fontSize:9, color:A.muted, letterSpacing:'.16em', fontFamily:F.m }}>ADMINISTRATION·MK·VII</div>
        </div>
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, position:'relative', zIndex:1 }}>
          {TABS.map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display:'flex', alignItems:'center', gap:9, padding:'9px 11px', border:'none',
                background: isActive ? `${A.accent}12` : 'transparent',
                borderLeft: `2px solid ${isActive ? A.accent : 'transparent'}`,
                color: isActive ? A.accent : A.muted, cursor:'pointer',
                fontSize:11, fontWeight:700, letterSpacing:'.08em', fontFamily:F.m, textAlign:'left',
                transition:'all .10s',
                clipPath: isActive ? 'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)' : 'none',
              }}>
                <span style={{ fontSize:13, flexShrink:0 }}>{t.icon}</span>{t.label.toUpperCase()}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:'12px 12px', borderTop:`0.5px solid rgba(0,200,240,0.08)`, position:'relative', zIndex:1 }}>
          <a href="/" target="_blank" style={{ display:'block', marginBottom:8, color:A.muted, fontSize:10, textDecoration:'none', fontFamily:F.m, letterSpacing:'.08em' }}>↗ VOIR·LE·SITE</a>
          <button onClick={handleLogout} style={{ width:'100%', padding:'7px', border:`0.5px solid rgba(0,200,240,0.14)`, background:'transparent', color:A.muted, cursor:'pointer', fontSize:10, fontFamily:F.m, letterSpacing:'.08em' }}>DÉCONNEXION</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft:220, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        <div style={{
          padding:'14px 28px', borderBottom:`0.5px solid rgba(0,200,240,0.10)`,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(0,2,10,0.95)', position:'sticky', top:0, zIndex:50,
          boxShadow:'0 4px 32px rgba(0,0,0,0.5)',
        }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:F.m, letterSpacing:'.10em', color:A.text }}>{TABS.find(t => t.id === tab)?.label?.toUpperCase()}</div>
            <div style={{ fontSize:9, color:A.muted, marginTop:2, fontFamily:F.m, letterSpacing:'.12em' }}>{new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase()}</div>
          </div>
          <Btn size="sm" variant="ghost" onClick={() => window.location.reload()}>↻ RAFRAÎCHIR</Btn>
        </div>
        <div style={{ flex:1, padding:'24px 28px', maxWidth:1400, overflowY:'auto', background:'rgba(0,1,8,0.50)' }}>
          {tab === 'overview'  && <TabOverview  api={api} />}
          {tab === 'bookings'  && <TabBookings  api={api} onToast={onToast} />}
          {tab === 'users'     && <TabUsers     api={api} onToast={onToast} />}
          {tab === 'offers'    && <TabOffers    api={api} onToast={onToast} />}
          {tab === 'revenue'   && <TabRevenue   api={api} />}
          {tab === 'analytics' && <TabAnalytics api={api} />}
          {tab === 'config'    && <TabConfig    api={api} onToast={onToast} />}
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast({ msg:'', type:'' })} />
    </div>
  );
}