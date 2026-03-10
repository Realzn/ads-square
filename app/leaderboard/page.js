'use client';
import { useState, useEffect } from 'react';

const C = {
  bg: '#01020A', card: 'rgba(1,6,18,0.96)', border: 'rgba(0,200,240,0.10)',
  border2: 'rgba(0,200,240,0.22)', text: '#DDE6F2', muted: 'rgba(140,180,220,0.55)',
  cyan: '#00C8E4', green: '#00D880', amber: '#E8A020', red: '#D02848', purple: '#9060C8',
};
const TIER_COLOR = { epicenter:'#f0b429', prestige:'#ff4d8f', elite:'#a855f7', business:'#00d9f5', standard:'#38bdf8', viral:'#00e8a2' };
const fmt = (n) => (n||0).toLocaleString('fr-FR');
const fmtEur = (c) => `${((c||0)/100).toLocaleString('fr-FR',{minimumFractionDigits:0})}€`;

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const CATEGORIES = [
  { id: 'clicks', label: '📡 Clics', desc: 'Slots les plus cliqués' },
  { id: 'streaks', label: '🔥 Streaks', desc: 'Meilleurs streaks de tâches' },
  { id: 'revenue', label: '💰 Investissement', desc: 'Plus gros investisseurs' },
];
const PERIODS = [
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'all', label: 'Tout temps' },
];

function RankRow({ entry, index, category }) {
  const isTop3 = index < 3;
  const tierColor = TIER_COLOR[entry.tier] || C.cyan;
  
  const displayValue = category === 'revenue'
    ? fmtEur(entry.value)
    : `${fmt(entry.value)} ${entry.label || ''}`;

  return (
    <a href={`/slot/${entry.slot_x}-${entry.slot_y}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
        background: isTop3 ? `linear-gradient(90deg, ${tierColor}08, transparent)` : 'transparent',
        borderLeft: isTop3 ? `3px solid ${tierColor}` : `3px solid transparent`,
        transition: 'background 0.2s', cursor: 'pointer', textDecoration: 'none', color: 'inherit',
        borderBottom: `1px solid ${C.border}`,
      }}
      onMouseEnter={e => e.currentTarget.style.background = isTop3 ? `linear-gradient(90deg, ${tierColor}12, transparent)` : 'rgba(0,200,240,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = isTop3 ? `linear-gradient(90deg, ${tierColor}08, transparent)` : 'transparent'}
    >
      {/* Rank number */}
      <div style={{ width: 36, textAlign: 'center', fontSize: isTop3 ? 20 : 14, fontWeight: 900, color: isTop3 ? tierColor : C.muted, flexShrink: 0 }}>
        {isTop3 ? RANK_MEDALS[index] : `#${entry.rank}`}
      </div>

      {/* Slot mini indicator */}
      <div style={{ width: 36, height: 36, background: `${tierColor}15`, border: `1px solid ${tierColor}30`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: tierColor }}>{entry.slot_x},{entry.slot_y}</div>
      </div>

      {/* Name + secondary */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.display_name || `Slot [${entry.slot_x},${entry.slot_y}]`}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{entry.secondary}</div>
      </div>

      {/* Value */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: isTop3 ? tierColor : C.text }}>{displayValue}</div>
      </div>
    </a>
  );
}

function GlobalStats({ meta }) {
  if (!meta) return null;
  const occupied = meta.grid_stats?.reduce((s, t) => s + (t.occupied_slots || 0), 0) || 0;
  const total = meta.grid_stats?.reduce((s, t) => s + (t.total_slots || 0), 0) || 1369;
  const pct = Math.round(occupied / total * 100);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
      {[
        { label: 'CLICS TOTAUX', value: fmt(meta.total_clicks), color: C.cyan },
        { label: 'SLOTS OCCUPÉS', value: `${occupied}/${total}`, color: C.green },
        { label: 'TAUX OCCUPATION', value: `${pct}%`, color: C.amber },
      ].map(s => (
        <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 9, letterSpacing: '0.1em', color: C.muted, marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState('clicks');
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?category=${category}&period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category, period]);

  const entries = data?.entries || [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", paddingBottom: 60 }}>
      <style>{`* { box-sizing: border-box; } a { text-decoration: none; } @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } } .fade { animation: fadeIn 0.25s ease; }`}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '20px 20px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <a href="/" style={{ fontSize: 11, letterSpacing: '0.2em', color: C.cyan, fontWeight: 800 }}>ADS-SQUARE</a>
            <span style={{ color: C.muted }}>/</span>
            <span style={{ fontSize: 11, letterSpacing: '0.15em', color: C.muted }}>CLASSEMENT</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Classement
          </h1>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Les meilleures performances de la grille.</p>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: 'none', overflowX: 'auto' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                background: 'none', border: 'none', padding: '10px 16px', fontSize: 13, fontWeight: 700,
                color: category === cat.id ? C.cyan : C.muted, cursor: 'pointer', whiteSpace: 'nowrap',
                borderBottom: `2px solid ${category === cat.id ? C.cyan : 'transparent'}`, transition: 'all 0.15s',
              }}>{cat.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>

        {/* Stats globales */}
        <GlobalStats meta={data?.meta} />

        {/* Period filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              background: period === p.id ? `${C.cyan}15` : 'transparent',
              border: `1px solid ${period === p.id ? C.border2 : C.border}`,
              color: period === p.id ? C.cyan : C.muted, padding: '6px 14px', borderRadius: 6,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Leaderboard table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }} className="fade" key={`${category}-${period}`}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: C.muted }}>
              <div style={{ fontSize: 13, letterSpacing: '0.1em' }}>CHARGEMENT…</div>
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: C.muted }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>
                {category === 'clicks' ? '📡' : category === 'streaks' ? '🔥' : '💰'}
              </div>
              <p>Aucune donnée pour cette période.</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Réservez un slot et revenez ici !</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 36 }} />
                <div style={{ width: 36 }} />
                <div style={{ flex: 1, fontSize: 10, letterSpacing: '0.1em', color: C.muted }}>ANNONCEUR</div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', color: C.muted }}>{CATEGORIES.find(c => c.id === category)?.desc}</div>
              </div>
              {entries.map((entry, i) => <RankRow key={i} entry={entry} index={i} category={category} />)}
            </>
          )}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 28, textAlign: 'center', padding: '22px', background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 12 }}>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Votre nom pourrait être ici.</p>
          <a href="/" style={{ display: 'inline-block', background: C.cyan, color: '#01020A', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', padding: '11px 24px', borderRadius: 7 }}>
            RÉSERVER MON SLOT →
          </a>
        </div>
      </div>
    </div>
  );
}
