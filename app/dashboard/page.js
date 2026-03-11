'use client';
import { useState, useEffect, useCallback } from 'react';
import { useT, LanguageSwitcher } from '../../lib/i18n/index';

/* ── Design tokens ─────────────────────────────────────────────────────── */
const C = {
  bg:      '#01020A',
  card:    'rgba(1,6,18,0.96)',
  border:  'rgba(0,200,240,0.10)',
  border2: 'rgba(0,200,240,0.22)',
  text:    '#DDE6F2',
  muted:   'rgba(140,180,220,0.55)',
  cyan:    '#00C8E4',
  green:   '#00D880',
  amber:   '#E8A020',
  red:     '#D02848',
  purple:  '#9060C8',
};
const TIER_COLOR = { epicenter:'#f0b429', prestige:'#ff4d8f', elite:'#a855f7', business:'#00d9f5', standard:'#38bdf8', viral:'#00e8a2' };
const RANK_COLOR = { elu:'#f0b429', architecte:'#9060C8', gardien:'#00D880', batisseur:'#00C8E4', signal:'#38bdf8' };
const TASK_ICONS = { share_grid:'📡', highlight_neighbor:'✨', create_content:'🎨', welcome_member:'👋', recommend_members:'🤝', offer_advantage:'🎁', slot_perfect:'💎' };
const fmt = n => (n || 0).toLocaleString('fr-FR');

/* ── Micro-components ──────────────────────────────────────────────────── */
function Card({ children, style: sx }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, ...sx }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color = C.cyan, icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.10em', color: C.muted, textTransform: 'uppercase' }}>{label}</div>
        {icon && <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function StreakRing({ streak, max = 30 }) {
  const pct = Math.min((streak || 0) / max, 1);
  const r = 42, circ = 2 * Math.PI * r, filled = circ * pct;
  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,200,240,0.10)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={streak > 0 ? C.amber : C.muted} strokeWidth="6"
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: streak > 0 ? C.amber : C.muted, lineHeight: 1 }}>{streak || 0}</div>
        <div style={{ fontSize: 9, letterSpacing: '0.10em', color: C.muted, marginTop: 2 }}>JOURS</div>
      </div>
    </div>
  );
}

function MiniChart({ values = [], color = C.cyan, label = '' }) {
  const max = Math.max(...values, 1);
  const h = 48;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: h }}>
      {values.map((v, i) => (
        <div key={i} title={`${label}: ${v}`} style={{
          flex: 1, borderRadius: '2px 2px 0 0',
          height: `${Math.max(3, Math.round((v / max) * h))}px`,
          background: i === values.length - 1 ? color : `${color}50`,
          transition: 'height .4s ease',
        }} />
      ))}
    </div>
  );
}

function TaskItem({ task, onComplete }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState({ text: '', url: '', platform: '' });
  const [loading, setLoading] = useState(false);

  const TASK_MAP = {
    share_grid:         { lk: 'task_share_grid_label',  dk: 'task_share_grid_desc',   ik: '📡' },
    highlight_neighbor: { lk: 'task_highlight_label',   dk: 'task_highlight_desc',    ik: '✨' },
    create_content:     { lk: 'task_content_label',     dk: 'task_content_desc',      ik: '🎨' },
    welcome_member:     { lk: 'task_welcome_label',     dk: 'task_welcome_desc',      ik: '👋' },
    recommend_members:  { lk: 'task_recommend_label',   dk: 'task_recommend_desc',    ik: '🤝' },
    offer_advantage:    { lk: 'task_advantage_label',   dk: 'task_advantage_desc',    ik: '🎁' },
    slot_perfect:       { lk: 'task_perfect_label',     dk: 'task_perfect_desc',      ik: '💎' },
  };
  const cfg = TASK_MAP[task.task_type] || { lk: null, dk: null, ik: '✦' };
  const label = cfg.lk ? t(cfg.lk) : task.task_type;
  const desc  = cfg.dk ? t(cfg.dk) : '';
  const icon  = cfg.ik;

  const handle = async () => {
    if (task.completed || loading || !proof.text.trim()) return;
    setLoading(true);
    await onComplete(task.id, proof);
    setLoading(false);
    setOpen(false);
  };

  return (
    <div style={{
      background: task.completed ? 'rgba(0,216,128,0.05)' : C.card,
      border: `1px solid ${task.completed ? 'rgba(0,216,128,0.25)' : C.border}`,
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
      transition: 'border-color .2s',
    }}>
      <div onClick={() => !task.completed && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, cursor: task.completed ? 'default' : 'pointer' }}>
        <div style={{ fontSize: 22, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: task.completed ? C.green : C.text }}>{label}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{desc}</div>
        </div>
        {task.completed
          ? <div style={{ fontSize: 13, color: C.green, fontWeight: 700, whiteSpace: 'nowrap' }}>✓ {t('tasks_done')}</div>
          : <div style={{ fontSize: 18, color: C.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>▾</div>}
      </div>

      {open && !task.completed && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea rows={2} placeholder={t('tasks_proof_text_ph')} value={proof.text}
            onChange={e => setProof(p => ({ ...p, text: e.target.value }))}
            style={{ background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
          <input placeholder={t('tasks_proof_url_ph')} value={proof.url}
            onChange={e => setProof(p => ({ ...p, url: e.target.value }))}
            style={{ background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit' }} />
          <select value={proof.platform} onChange={e => setProof(p => ({ ...p, platform: e.target.value }))}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', color: proof.platform ? C.text : C.muted, fontSize: 13, fontFamily: 'inherit' }}>
            <option value="">{t('tasks_proof_platform_ph')}</option>
            {(t('tasks_platforms') || []).map(pl => <option key={pl}>{pl}</option>)}
          </select>
          <button onClick={handle} disabled={!proof.text.trim() || loading}
            style={{ background: proof.text.trim() ? C.cyan : 'rgba(0,200,240,0.15)', color: proof.text.trim() ? '#01020A' : C.muted, border: 'none', borderRadius: 7, padding: '12px 20px', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', cursor: proof.text.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background .15s' }}>
            {loading ? t('tasks_validating') : t('tasks_validate_btn')}
          </button>
        </div>
      )}
    </div>
  );
}

function FeedItem({ item }) {
  const { ago, t } = useT();
  const EMOJI = { share: '📡', highlight: '✨', recommend: '🤝', welcome: '👋', advantage: '🎁', content: '🎨' };
  const emoji = EMOJI[item.action_type] || '✦';
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 20, marginTop: 2, flexShrink: 0 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
          <span style={{ color: C.cyan, fontWeight: 700 }}>{item.author_name || 'Anonyme'}</span>
          {' '}<span style={{ color: C.muted }}>{item.content_text}</span>
        </div>
        {item.proof_url && (
          <a href={item.proof_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: C.cyan, opacity: 0.7, marginTop: 3, display: 'block' }}>
            {item.platform ? `↗ ${item.platform}` : t('dash_feed_proof')}
          </a>
        )}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{ago(item.created_at)}</div>
      </div>
      {item.rank && (
        <div style={{ fontSize: 11, color: RANK_COLOR[item.rank] || C.muted, fontWeight: 700, flexShrink: 0 }}>
          {item.rank.toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { t } = useT();
  const [tab, setTab]           = useState('stats');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [token, setToken]       = useState(null);

  // Auth states
  const [email, setEmail]       = useState('');
  const [loginStep, setStep]    = useState('email'); // 'email' | 'otp'
  const [otp, setOtp]           = useState('');
  const [authErr, setAuthErr]   = useState('');
  const [authLoading, setAL]    = useState(false);

  // Init token from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('ads_token');
    if (saved) setToken(saved);
  }, []);

  const fetchData = useCallback(async (tk) => {
    if (!tk) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/tasks?token=${encodeURIComponent(tk)}`);
      if (!r.ok) {
        if (r.status === 401) { setToken(null); localStorage.removeItem('ads_token'); }
        throw new Error('fetch error');
      }
      setData(await r.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) fetchData(token); }, [token, fetchData]);

  const handleCompleteTask = async (taskId, proof) => {
    if (!token) return;
    const r = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, task_id: taskId, proof_text: proof.text, proof_url: proof.url, proof_platform: proof.platform }),
    });
    if (r.ok) fetchData(token);
  };

  // Magic link auth via Supabase
  const handleSendOtp = async () => {
    setAuthErr(''); setAL(true);
    try {
      const r = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'magic_link', email }),
      });
      if (!r.ok) throw new Error(t('error'));
      setStep('otp');
    } catch (e) { setAuthErr(e.message); } finally { setAL(false); }
  };

  const handleVerifyOtp = async () => {
    setAuthErr(''); setAL(true);
    try {
      const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const r = await fetch(`${SB_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB_ANON },
        body: JSON.stringify({ email, token: otp, type: 'magiclink' }),
      });
      const j = await r.json();
      if (!j.access_token) throw new Error(t('dash_invalid_token'));
      localStorage.setItem('ads_token', j.access_token);
      setToken(j.access_token);
    } catch (e) { setAuthErr(e.message); } finally { setAL(false); }
  };

  const handleLogout = () => { localStorage.removeItem('ads_token'); setToken(null); setData(null); setStep('email'); setEmail(''); setOtp(''); };

  /* ── Login screen ───────────────────────────────────────────────────── */
  if (!token) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif" }}>
      <style>{`*{box-sizing:border-box}input,select,button,textarea{font-family:inherit}input::placeholder,textarea::placeholder{color:rgba(140,180,220,0.4)}`}</style>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, fontWeight: 700 }}>AdsMostFair</div>
          <LanguageSwitcher />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, marginBottom: 8 }}>{t('dash_login_title')}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>{t('dash_login_sub')}</p>

        <Card>
          {loginStep === 'email' && (
            <>
              <input type="email" placeholder={t('dash_email_ph')} value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && email.includes('@') && handleSendOtp()}
                style={{ width: '100%', background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '13px 14px', color: C.text, fontSize: 14, marginBottom: 14 }} />
              <button onClick={handleSendOtp} disabled={!email.includes('@') || authLoading}
                style={{ width: '100%', background: email.includes('@') && !authLoading ? C.cyan : 'rgba(0,200,240,0.2)', color: email.includes('@') && !authLoading ? '#01020A' : C.muted, border: 'none', borderRadius: 8, padding: 14, fontSize: 13, fontWeight: 800, letterSpacing: '0.10em', cursor: email.includes('@') && !authLoading ? 'pointer' : 'not-allowed', transition: 'background .15s' }}>
                {authLoading ? t('dash_sending') : t('dash_send_code')}
              </button>
            </>
          )}
          {loginStep === 'otp' && (
            <>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
                {t('dash_code_sent', email)}
              </div>
              <input type="text" placeholder={t('dash_code_ph')} value={otp} maxLength={6}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                style={{ width: '100%', background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '13px 14px', color: C.text, fontSize: 22, letterSpacing: '0.4em', textAlign: 'center', marginBottom: 14 }} />
              <button onClick={handleVerifyOtp} disabled={otp.length < 6 || authLoading}
                style={{ width: '100%', background: otp.length === 6 && !authLoading ? C.cyan : 'rgba(0,200,240,0.2)', color: otp.length === 6 && !authLoading ? '#01020A' : C.muted, border: 'none', borderRadius: 8, padding: 14, fontSize: 13, fontWeight: 800, letterSpacing: '0.10em', cursor: otp.length === 6 && !authLoading ? 'pointer' : 'not-allowed', transition: 'background .15s' }}>
                {authLoading ? t('dash_connecting') : t('dash_connect')}
              </button>
              <button onClick={() => setStep('email')}
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', marginTop: 12, display: 'block', width: '100%', textAlign: 'center' }}>
                {t('dash_change_email')}
              </button>
            </>
          )}
          {authErr && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{authErr}</div>}
        </Card>
      </div>
    </div>
  );

  /* ── Loading ────────────────────────────────────────────────────────── */
  if (loading || !data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid rgba(0,200,240,0.15)`, borderTopColor: C.cyan, animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const sub       = data.subscription || {};
  const tasks     = data.tasks || [];
  const feed      = data.feed || [];
  const offers    = data.offers || [];
  const topStreaks = data.topStreaks || [];
  const stats     = data.stats || {};
  const streak    = sub.tasks_streak || 0;
  const rank      = sub.rank || 'signal';
  const rankColor = RANK_COLOR[rank] || C.muted;

  const daysLeft  = sub.days_remaining ?? null;
  const showWarning = daysLeft !== null && daysLeft <= 3;

  const clicksArr = stats.clicks_history || Array(7).fill(0);
  const doneTasks = tasks.filter(t2 => t2.completed).length;

  /* ── Tabs ───────────────────────────────────────────────────────────── */
  const TABS = [
    { id: 'stats',  label: t('dash_tab_stats') },
    { id: 'tasks',  label: t('dash_tab_tasks') },
    { id: 'feed',   label: t('dash_tab_feed') },
    { id: 'offers', label: `${t('dash_tab_offers')}${offers.length > 0 ? ` (${offers.length})` : ''}` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", color: C.text }}>
      <style>{`*{box-sizing:border-box}input,select,button,textarea{font-family:inherit}input::placeholder,textarea::placeholder{color:rgba(140,180,220,0.4)} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,2,10,0.98)', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/" style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, fontWeight: 700, textDecoration: 'none' }}>AdsMostFair</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: rankColor, fontWeight: 700, letterSpacing: '0.1em' }}>⬡ {rank.toUpperCase()}</span>
          <LanguageSwitcher compact />
          <button onClick={handleLogout}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', color: C.muted, fontSize: 12, cursor: 'pointer' }}>
            {t('dash_logout')}
          </button>
        </div>
      </div>

      {/* ── Suspension warning ───────────────────────────────────── */}
      {showWarning && (
        <div style={{ background: `rgba(208,40,72,0.12)`, border: `1px solid rgba(208,40,72,0.30)`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>{t('dash_suspension_warning', daysLeft)}</span>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Hero row ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          {/* Streak ring */}
          <Card style={{ display: 'flex', alignItems: 'center', gap: 20, flex: '0 0 auto' }}>
            <StreakRing streak={streak} />
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', color: C.muted, marginBottom: 4 }}>{t('dash_streak')}</div>
              <div style={{ fontSize: 13, color: streak > 0 ? C.amber : C.muted }}>
                {streak > 0 ? `🔥 ${t('tasks_streak', streak)}` : '—'}
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, background: `${rankColor}18`, border: `1px solid ${rankColor}40`, fontSize: 11, fontWeight: 700, color: rankColor, letterSpacing: '0.08em' }}>
                  {rank.toUpperCase()}
                </div>
              </div>
            </div>
          </Card>

          {/* Active slot */}
          {sub.slot_x != null && (
            <Card style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.10em', color: C.muted, marginBottom: 8 }}>{t('dash_slot_section')}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: TIER_COLOR[sub.tier] || C.cyan, fontFamily: "'JetBrains Mono',monospace" }}>
                [{sub.slot_x},{sub.slot_y}]
              </div>
              <div style={{ fontSize: 13, color: C.text, marginTop: 4, marginBottom: 12 }}>{sub.display_name || '—'}</div>
              {sub.end_date && (
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                  {t('slot_active_until', new Date(sub.end_date).toLocaleDateString())}
                </div>
              )}
              <a href={`/slot/${sub.slot_x}-${sub.slot_y}`} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: C.cyan, textDecoration: 'none', fontWeight: 700, letterSpacing: '0.08em' }}>
                {t('dash_view_page')}
              </a>
            </Card>
          )}

          {/* Tasks progress */}
          {tasks.length > 0 && (
            <Card style={{ flex: '0 0 auto', minWidth: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.10em', color: C.muted, marginBottom: 6 }}>{t('tasks_title')}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: doneTasks === tasks.length ? C.green : C.text }}>
                  {doneTasks}/{tasks.length}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t('tasks_progress', doneTasks, tasks.length)}</div>
              </div>
              {/* Progress bar */}
              <div style={{ marginTop: 12, height: 4, background: `${C.green}20`, borderRadius: 2 }}>
                <div style={{ height: 4, borderRadius: 2, width: `${tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0}%`, background: C.green, transition: 'width .6s ease' }} />
              </div>
            </Card>
          )}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(0,200,240,0.04)', padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{ flex: 1, padding: '9px 12px', border: 'none', borderRadius: 7, background: tab === tb.id ? C.cyan : 'transparent', color: tab === tb.id ? '#01020A' : C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background .15s, color .15s', letterSpacing: '0.03em' }}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* ── Tab : Stats ──────────────────────────────────────── */}
        {tab === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard label={t('dash_clicks_7d')}  value={fmt(stats.clicks_7d)}  icon="📡" color={C.cyan} />
              <StatCard label={t('dash_clicks_today')} value={fmt(stats.clicks_today)} icon="🖱" color={C.green} />
              <StatCard label={t('dash_clicks_month')} value={fmt(stats.clicks_30d)} icon="📈" color={C.amber} />
              <StatCard label={t('dash_ctr')} value={`${stats.ctr_pct || 0}%`} icon="📊" color={C.purple}
                sub={stats.impressions_7d ? `${fmt(stats.impressions_7d)} imp.` : t('dash_coming_soon')} />
            </div>

            {clicksArr.some(v => v > 0) && (
              <Card>
                <div style={{ fontSize: 11, letterSpacing: '0.10em', color: C.muted, marginBottom: 12 }}>{t('dash_chart_title')}</div>
                <MiniChart values={clicksArr} color={C.cyan} label="clics" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  {(t('dash_chart_days') || []).map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i === 6 ? C.cyan : C.muted }}>{d}</div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Tab : Tasks ──────────────────────────────────────── */}
        {tab === 'tasks' && (
          <div>
            {tasks.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌙</div>
                <div style={{ fontSize: 15, color: C.text, marginBottom: 8 }}>{t('tasks_no_tasks')}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{t('tasks_no_tasks_sub')}</div>
              </Card>
            ) : (
              <>
                {doneTasks === tasks.length && (
                  <div style={{ background: 'rgba(0,216,128,0.10)', border: '1px solid rgba(0,216,128,0.25)', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: C.green, fontWeight: 700 }}>
                    {t('tasks_all_done')}
                  </div>
                )}
                {tasks.map(task => (
                  <TaskItem key={task.id} task={task} onComplete={handleCompleteTask} />
                ))}
              </>
            )}

            {/* Top streaks sidebar */}
            {topStreaks.length > 0 && (
              <Card style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', marginBottom: 14 }}>{t('tasks_top_streaks')}</div>
                {topStreaks.slice(0, 5).map((m, i) => (
                  <div key={m.advertiser_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.display_name}</div>
                      <div style={{ fontSize: 11, color: RANK_COLOR[m.rank] || C.muted }}>{m.rank?.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.amber }}>🔥 {m.tasks_streak}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{t('tasks_consecutive')}</div>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* ── Tab : Feed ───────────────────────────────────────── */}
        {tab === 'feed' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('dash_feed_title')}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{t('dash_feed_sub')}</div>
            </div>
            {feed.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
                <div style={{ fontSize: 15, color: C.text, marginBottom: 8 }}>{t('dash_feed_empty')}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{t('dash_feed_empty_sub')}</div>
              </Card>
            ) : (
              <Card style={{ padding: '4px 20px' }}>
                {feed.map(item => <FeedItem key={item.id} item={item} />)}
              </Card>
            )}
          </div>
        )}

        {/* ── Tab : Offers ─────────────────────────────────────── */}
        {tab === 'offers' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('dash_offers_title')}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{t('dash_offers_sub')}</div>
            </div>
            {offers.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
                <div style={{ fontSize: 15, color: C.text, marginBottom: 8 }}>{t('dash_offers_empty')}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{t('dash_offers_empty_sub')}</div>
              </Card>
            ) : (
              offers.map(offer => (
                <Card key={offer.id} style={{ marginBottom: 12, border: `1px solid rgba(232,160,32,0.30)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.amber }}>
                        €{((offer.offer_amount_cents || 0) / 100).toLocaleString('fr-FR')}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>par {offer.buyer_name || offer.buyer_email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>
                      {offer.expires_at && (
                        <div style={{ color: C.red }}>
                          Expire dans {Math.max(0, Math.floor((new Date(offer.expires_at) - Date.now()) / 3600000))}h
                        </div>
                      )}
                    </div>
                  </div>
                  {offer.message && (
                    <div style={{ padding: '10px 12px', background: 'rgba(232,160,32,0.06)', borderRadius: 7, fontSize: 13, color: C.muted, marginBottom: 12, fontStyle: 'italic' }}>
                      "{offer.message}"
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={async () => {
                      await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action: 'accept_offer', offerId: offer.id }) });
                      fetchData(token);
                    }}
                      style={{ flex: 1, background: 'rgba(0,216,128,0.15)', border: '1px solid rgba(0,216,128,0.30)', color: C.green, borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      ✓ Accepter
                    </button>
                    <button onClick={async () => {
                      await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action: 'reject_offer', offerId: offer.id }) });
                      fetchData(token);
                    }}
                      style={{ flex: 1, background: 'rgba(208,40,72,0.12)', border: '1px solid rgba(208,40,72,0.25)', color: C.red, borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      ✕ Refuser
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
