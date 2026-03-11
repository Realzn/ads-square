'use client';
import { useState, useEffect } from 'react';
import { useT, LanguageSwitcher } from '../../lib/i18n';

const C = { bg:'#01020A', card:'rgba(1,6,18,0.96)', border:'rgba(0,200,240,0.10)', border2:'rgba(0,200,240,0.22)', text:'#DDE6F2', muted:'rgba(140,180,220,0.55)', cyan:'#00C8E4', green:'#00D880', amber:'#E8A020', red:'#D02848', purple:'#9060C8' };
const TIER_COLOR = { epicenter:'#f0b429', prestige:'#ff4d8f', elite:'#a855f7', business:'#00d9f5', standard:'#38bdf8', viral:'#00e8a2' };
const RANK_COLOR = { elu:'#f0b429', architecte:'#9060C8', gardien:'#00D880', batisseur:'#00C8E4', signal:'#38bdf8' };

const MEDALS = ['🥇','🥈','🥉'];

function TierBadge({ tier }) {
  const { t } = useT();
  const c = TIER_COLOR[tier] || C.muted;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: `${c}18`, border: `1px solid ${c}40`, color: c, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
      {t(`tier_${tier}`) || tier?.toUpperCase()}
    </span>
  );
}

function RankRow({ entry, rank, category }) {
  const { t } = useT();
  const isTop3  = rank <= 3;
  const color   = TIER_COLOR[entry.tier] || C.muted;
  const rankClr = RANK_COLOR[entry.rank] || C.muted;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: isTop3 ? `rgba(${rank===1?'240,180,41':rank===2?'180,180,200':'180,130,80'},0.05)` : 'transparent',
      borderBottom: `1px solid ${C.border}`,
      transition: 'background .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,240,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = isTop3 ? `rgba(${rank===1?'240,180,41':rank===2?'180,180,200':'180,130,80'},0.05)` : 'transparent'}
    >
      {/* Rank / medal */}
      <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
        {rank <= 3
          ? <span style={{ fontSize: 22 }}>{MEDALS[rank - 1]}</span>
          : <span style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>#{rank}</span>}
      </div>

      {/* Avatar / badge */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: entry.primary_color || `${color}20`,
        border: `1.5px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: entry.badge ? 20 : 14, fontWeight: 900, color,
      }}>
        {entry.badge || (entry.slot_x != null ? `${entry.slot_x},${entry.slot_y}` : '#')}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.display_name || '—'}
          </span>
          {entry.tier && <TierBadge tier={entry.tier} />}
          {entry.rank && (
            <span style={{ fontSize: 10, color: rankClr, fontWeight: 700 }}>{entry.rank?.toUpperCase()}</span>
          )}
        </div>
        {entry.secondary && (
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{entry.secondary}</div>
        )}
        {entry.slot_x != null && (
          <a href={`/slot/${entry.slot_x}-${entry.slot_y}`}
            style={{ fontSize: 11, color: C.cyan, opacity: 0.7, marginTop: 2, display: 'inline-block' }}>
            [{entry.slot_x},{entry.slot_y}] →
          </a>
        )}
      </div>

      {/* Value */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: isTop3 ? C.amber : C.text, lineHeight: 1 }}>
          {category === 'revenue'
            ? `€${((entry.value || 0) / 100).toLocaleString('fr-FR')}`
            : (entry.value || 0).toLocaleString('fr-FR')}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {category === 'clicks'  ? t('lb_clicks_unit') :
           category === 'streaks' ? t('lb_days_unit') :
                                    t('lb_invested_unit')}
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { t } = useT();
  const [category, setCategory] = useState('clicks');
  const [period,   setPeriod]   = useState('7d');
  const [data,     setData]     = useState(null);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/leaderboard?category=${category}&period=${period}`).then(r => r.json()),
      fetch(`/api/leaderboard?category=stats`).then(r => r.json()),
    ])
      .then(([lb, st]) => { setData(lb); setStats(st); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, period]);

  const entries = data?.data || [];

  const CATS = [
    { id: 'clicks',  label: t('lb_cat_clicks'),  desc: t('lb_cat_clicks_desc'),  icon: '📡' },
    { id: 'streaks', label: t('lb_cat_streaks'),  desc: t('lb_cat_streaks_desc'), icon: '🔥' },
    { id: 'revenue', label: t('lb_cat_revenue'),  desc: t('lb_cat_revenue_desc'), icon: '💰' },
  ];
  const PERIODS = [
    { id: '7d',  label: t('lb_period_7d') },
    { id: '30d', label: t('lb_period_30d') },
    { id: 'all', label: t('lb_period_all') },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", color: C.text }}>
      <style>{`*{box-sizing:border-box} a{text-decoration:none} @keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,2,10,0.98)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, fontWeight: 700 }}>AdsMostFair</a>
          <span style={{ color: C.muted, fontSize: 12 }}>/ {t('lb_title')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/dashboard" style={{ fontSize: 12, color: C.muted, padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6 }}>
            {t('nav_dashboard')}
          </a>
          <LanguageSwitcher compact />
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 8px' }}>{t('lb_title')}</h1>
          <p style={{ fontSize: 15, color: C.muted, margin: 0 }}>{t('lb_sub')}</p>
        </div>

        {/* ── Global stats ─────────────────────────────────── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
            {[
              { label: t('lb_stat_clicks'), value: (stats.total_clicks || 0).toLocaleString(), color: C.cyan },
              { label: t('lb_stat_slots'),  value: (stats.occupied_slots || 0).toLocaleString(), color: C.green },
              { label: t('lb_stat_occ'),    value: `${stats.occupancy_pct || 0}%`, color: C.amber },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color }}>{value}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.10em', color: C.muted, marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Category picker ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {CATS.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              style={{
                padding: '14px 16px', border: `1px solid ${category === cat.id ? C.cyan + '50' : C.border}`,
                borderRadius: 10, background: category === cat.id ? 'rgba(0,200,240,0.08)' : C.card,
                color: category === cat.id ? C.cyan : C.muted, cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', transition: 'all .15s',
              }}
              onMouseEnter={e => { if (category !== cat.id) e.currentTarget.style.borderColor = C.border2; }}
              onMouseLeave={e => { if (category !== cat.id) e.currentTarget.style.borderColor = C.border; }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{cat.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{cat.label}</div>
              <div style={{ fontSize: 12, marginTop: 2, opacity: 0.7 }}>{cat.desc}</div>
            </button>
          ))}
        </div>

        {/* ── Period picker ────────────────────────────────── */}
        {category !== 'streaks' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(0,200,240,0.04)', padding: 4, borderRadius: 8, border: `1px solid ${C.border}`, width: 'fit-content' }}>
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                style={{ padding: '7px 16px', border: 'none', borderRadius: 6, background: period === p.id ? C.cyan : 'transparent', color: period === p.id ? '#01020A' : C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Table ────────────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Column header */}
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36 }} />
            <div style={{ width: 40 }} />
            <div style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: C.muted }}>{t('lb_col_advertiser')}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: C.muted, textAlign: 'right' }}>
              {category === 'clicks' ? t('lb_clicks_unit').toUpperCase() :
               category === 'streaks' ? t('lb_days_unit').toUpperCase() :
               t('lb_invested_unit').toUpperCase()}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid rgba(0,200,240,0.15)`, borderTopColor: C.cyan, animation: 'spin .8s linear infinite' }} />
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
              <div style={{ fontSize: 16, color: C.text, marginBottom: 8 }}>{t('lb_empty')}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{t('lb_empty_sub')}</div>
            </div>
          ) : (
            entries.map((entry, i) => (
              <RankRow key={entry.id || i} entry={entry} rank={i + 1} category={category} />
            ))
          )}
        </div>

        {/* ── CTA ──────────────────────────────────────────── */}
        <div style={{ marginTop: 32, textAlign: 'center', padding: '32px 20px', background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>{t('lb_cta')}</div>
          <a href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '13px 28px', background: C.cyan, color: '#01020A', borderRadius: 8, fontSize: 13, fontWeight: 800, letterSpacing: '0.10em' }}>
            {t('lb_cta_btn')}
          </a>
        </div>
      </div>
    </div>
  );
}
