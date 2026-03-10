'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── Design System ─────────────────────────────────────────────────────────
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
  pink:    '#FF4D8F',
};

const TIER_COLOR = {
  epicenter:'#f0b429', prestige:'#ff4d8f', elite:'#a855f7',
  business:'#00d9f5', standard:'#38bdf8', viral:'#00e8a2',
};
const RANK_CONFIG = {
  elu:        { label:'ÉLU',        color:'#f0b429', tasks:['slot_perfect'] },
  architecte: { label:'ARCHITECTE', color:'#9060C8', tasks:['create_content','recommend_members','offer_advantage'] },
  gardien:    { label:'GARDIEN',    color:'#00D880', tasks:['create_content','welcome_member'] },
  batisseur:  { label:'BÂTISSEUR',  color:'#00C8E4', tasks:['share_grid','highlight_neighbor'] },
  signal:     { label:'SIGNAL',     color:'#38bdf8', tasks:['share_grid'] },
};
const TASK_CONFIG = {
  share_grid:         { label:'Partager la grille',        icon:'📡', desc:'Partagez ADS-SQUARE sur vos réseaux.' },
  highlight_neighbor: { label:'Mettre en avant un voisin', icon:'✨', desc:'Mentionnez un créateur voisin sur vos réseaux.' },
  create_content:     { label:'Créer du contenu',          icon:'🎨', desc:'Publiez du contenu autour de la grille.' },
  welcome_member:     { label:'Accueillir un nouveau',     icon:'👋', desc:'Accueillez un nouveau membre publiquement.' },
  recommend_members:  { label:'Recommander 2 membres',     icon:'🤝', desc:'Recommandez publiquement 2 membres.' },
  offer_advantage:    { label:'Offrir un avantage',        icon:'🎁', desc:"Offrez un avantage exclusif aux membres." },
  slot_perfect:       { label:'Slot parfait',              icon:'💎', desc:'Votre slot est à jour — rien à faire !' },
};

const fmt = (n) => (n||0).toLocaleString('fr-FR');
const fmtEur = (c) => `${((c||0)/100).toLocaleString('fr-FR',{minimumFractionDigits:0})}€`;

// ─── Components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = C.cyan, big = false }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: big ? '24px 20px' : '18px 16px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.border2}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: big ? 36 : 28, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function StreakRing({ streak, max = 30 }) {
  const pct = Math.min(streak / max, 1);
  const r = 42, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * pct;
  return (
    <div style={{ position: 'relative', width: 100, height: 100 }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,200,240,0.1)" strokeWidth="6" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={streak > 0 ? C.amber : C.muted}
          strokeWidth="6" strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: streak > 0 ? C.amber : C.muted }}>{streak}</div>
        <div style={{ fontSize: 9, letterSpacing: '0.08em', color: C.muted }}>JOURS</div>
      </div>
    </div>
  );
}

function TaskItem({ task, onComplete }) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState({ text: '', url: '', platform: '' });
  const [loading, setLoading] = useState(false);
  const config = TASK_CONFIG[task.task_type] || { label: task.task_type, icon: '✦', desc: '' };

  const handleComplete = async () => {
    if (task.completed || loading) return;
    setLoading(true);
    await onComplete(task.id, proof);
    setLoading(false);
    setOpen(false);
  };

  return (
    <div style={{
      background: task.completed ? 'rgba(0,216,128,0.06)' : C.card,
      border: `1px solid ${task.completed ? 'rgba(0,216,128,0.25)' : C.border}`,
      borderRadius: 10, padding: '16px', marginBottom: 10,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: task.completed ? 'default' : 'pointer' }}
        onClick={() => !task.completed && setOpen(!open)}>
        <div style={{ fontSize: 22 }}>{config.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: task.completed ? C.green : C.text }}>{config.label}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{config.desc}</div>
        </div>
        {task.completed ? (
          <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>✓ FAIT</div>
        ) : (
          <div style={{ fontSize: 18, color: C.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</div>
        )}
      </div>
      {open && !task.completed && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Décrivez l'action réalisée (requis)" value={proof.text}
              onChange={e => setProof(p => ({ ...p, text: e.target.value }))}
              style={{ background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 13 }} />
            <input placeholder="Lien de preuve (optionnel)" value={proof.url}
              onChange={e => setProof(p => ({ ...p, url: e.target.value }))}
              style={{ background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 13 }} />
            <select value={proof.platform} onChange={e => setProof(p => ({ ...p, platform: e.target.value }))}
              style={{ background: '#01020A', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: proof.platform ? C.text : C.muted, fontSize: 13 }}>
              <option value="">Plateforme (optionnel)</option>
              <option>Instagram</option><option>Twitter/X</option><option>LinkedIn</option>
              <option>TikTok</option><option>YouTube</option><option>Autre</option>
            </select>
            <button onClick={handleComplete} disabled={!proof.text.trim() || loading}
              style={{ background: proof.text.trim() ? C.cyan : 'rgba(0,200,240,0.2)', color: proof.text.trim() ? '#01020A' : C.muted, border: 'none', borderRadius: 6, padding: '12px 20px', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', cursor: proof.text.trim() ? 'pointer' : 'not-allowed' }}>
              {loading ? 'VALIDATION…' : 'VALIDER LA TÂCHE ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniChart({ data, color = C.cyan, height = 50 }) {
  if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>Pas de données</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100 / data.length;
  return (
    <svg width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 8);
        return (
          <rect key={i} x={`${i * w + 0.5}%`} width={`${w - 1}%`}
            y={height - barH} height={barH}
            fill={i === data.length - 1 ? color : `url(#chartGrad)`}
            rx="2" />
        );
      })}
    </svg>
  );
}

function FeedItem({ item }) {
  const actionEmoji = { share: '📡', highlight: '✨', recommend: '🤝', welcome: '👋', advantage: '🎁' }[item.action_type] || '✦';
  const ago = (dt) => {
    if (!dt) return '';
    const s = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (s < 60) return 'à l\'instant';
    if (s < 3600) return `il y a ${Math.floor(s / 60)}min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
    return `il y a ${Math.floor(s / 86400)}j`;
  };
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 18, marginTop: 2 }}>{actionEmoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: C.text }}>
          <strong style={{ color: C.cyan }}>{item.author_name || 'Anonyme'}</strong>{' '}
          <span style={{ color: C.muted }}>{item.content_text}</span>
        </div>
        {item.proof_url && (
          <a href={item.proof_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: C.cyan, opacity: 0.7, marginTop: 4, display: 'block' }}>
            {item.platform ? `↗ ${item.platform}` : '↗ Voir la preuve'}
          </a>
        )}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{ago(item.created_at)}</div>
      </div>
      <div style={{ fontSize: 13, color: C.muted }}>{item.rank?.toUpperCase()}</div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tab, setTab] = useState('stats');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStep, setLoginStep] = useState('email'); // 'email' | 'otp' | 'done'
  const [otp, setOtp] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Simuler Supabase Auth (remplacer par votre import réel)
  const SUPABASE_URL = typeof window !== 'undefined' ? window.__SUPABASE_URL__ || '' : '';
  const SUPABASE_ANON = typeof window !== 'undefined' ? window.__SUPABASE_ANON__ || '' : '';

  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ads_token') : null;
    if (saved) setToken(saved);
  }, []);

  const fetchData = useCallback(async (t) => {
    if (!t) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?token=${encodeURIComponent(t)}`);
      if (!res.ok) {
        if (res.status === 401) { setToken(null); localStorage.removeItem('ads_token'); }
        throw new Error('Erreur chargement');
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (token) fetchData(token); }, [token, fetchData]);

  const handleCompleteTask = async (taskId, proof) => {
    if (!token) return;
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, task_id: taskId, ...proof }),
    });
    if (res.ok) fetchData(token);
  };

  const handleLoginEmail = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email: loginEmail, create_user: false }),
      });
      if (!res.ok) throw new Error('Email non reconnu');
      setLoginStep('otp');
    } catch (e) {
      setLoginError(e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginOtp = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email: loginEmail, token: otp, type: 'magiclink' }),
      });
      const json = await res.json();
      if (!json.access_token) throw new Error('Code invalide');
      localStorage.setItem('ads_token', json.access_token);
      setToken(json.access_token);
      setLoginStep('done');
    } catch (e) {
      setLoginError(e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <style>{`* { box-sizing: border-box; } input, select, button { font-family: inherit; } input::placeholder { color: rgba(140,180,220,0.4); }`}</style>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, fontWeight: 700, marginBottom: 12 }}>ADS-SQUARE</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: C.text, marginBottom: 8 }}>Mon Dashboard</h1>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>Connectez-vous pour accéder à vos stats, tâches et offres.</p>
          
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28 }}>
            {loginStep === 'email' && (
              <>
                <input type="email" placeholder="votre@email.com" value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLoginEmail()}
                  style={{ width: '100%', background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '12px 14px', color: C.text, fontSize: 14, marginBottom: 12 }} />
                <button onClick={handleLoginEmail} disabled={!loginEmail.includes('@') || loginLoading}
                  style={{ width: '100%', background: C.cyan, color: '#01020A', border: 'none', borderRadius: 7, padding: '13px', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer' }}>
                  {loginLoading ? 'ENVOI…' : 'RECEVOIR MON CODE →'}
                </button>
              </>
            )}
            {loginStep === 'otp' && (
              <>
                <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Code envoyé à <strong style={{ color: C.text }}>{loginEmail}</strong></p>
                <input type="text" placeholder="000000" value={otp} maxLength={6}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                  onKeyDown={e => e.key === 'Enter' && handleLoginOtp()}
                  style={{ width: '100%', background: 'rgba(0,200,240,0.04)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '12px 14px', color: C.text, fontSize: 20, letterSpacing: '0.3em', textAlign: 'center', marginBottom: 12 }} />
                <button onClick={handleLoginOtp} disabled={otp.length < 6 || loginLoading}
                  style={{ width: '100%', background: C.cyan, color: '#01020A', border: 'none', borderRadius: 7, padding: '13px', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer' }}>
                  {loginLoading ? 'VÉRIFICATION…' : 'SE CONNECTER →'}
                </button>
                <button onClick={() => setLoginStep('email')} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', marginTop: 10 }}>← Changer d'email</button>
              </>
            )}
            {loginError && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{loginError}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 13, letterSpacing: '0.1em' }}>CHARGEMENT…</div>
      </div>
    );
  }

  const dash = data?.dashboard;
  const tasks = data?.tasks || [];
  const feed = data?.feed || [];
  const topStreaks = data?.top_streaks || [];
  const rankConfig = RANK_CONFIG[dash?.rank] || RANK_CONFIG.signal;

  // Générer des données mini-chart depuis les stats
  const weeklyData = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    value: Math.floor(Math.random() * 50), // À remplacer par vraies données
  }));

  const doneToday = tasks.filter(t => t.completed).length;
  const totalToday = tasks.length;
  const allDone = totalToday > 0 && doneToday === totalToday;

  const TABS = [
    { id: 'stats', label: '📊 Stats' },
    { id: 'tasks', label: `✦ Tâches${allDone ? ' ✓' : totalToday > 0 ? ` ${doneToday}/${totalToday}` : ''}` },
    { id: 'feed', label: '🌐 Fil' },
    { id: 'offers', label: '💰 Offres' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", padding: '0 0 80px' }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea, button { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: rgba(140,180,220,0.4); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,200,240,0.2); border-radius: 2px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .tab-content { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '20px 20px 16px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.2em', color: C.cyan, fontWeight: 700 }}>ADS-SQUARE</div>
              <h1 style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
                {dash?.display_name || 'Mon Dashboard'}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {dash?.slot_x !== undefined && (
                <a href={`/slot/${dash.slot_x}-${dash.slot_y}`} style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>
                  Slot [{dash.slot_x},{dash.slot_y}]
                </a>
              )}
              <span style={{
                background: `${rankConfig.color}15`, border: `1px solid ${rankConfig.color}40`,
                color: rankConfig.color, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                padding: '4px 10px', borderRadius: 5,
              }}>{rankConfig.label}</span>
              <button onClick={() => { setToken(null); localStorage.removeItem('ads_token'); }}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', color: C.muted, fontSize: 12, cursor: 'pointer' }}>
                Déconnexion
              </button>
            </div>
          </div>

          {/* Suspension warning */}
          {dash?.days_before_suspension <= 1 && dash?.rank !== 'elu' && (
            <div style={{ marginTop: 14, background: 'rgba(208,40,72,0.1)', border: '1px solid rgba(208,40,72,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              <strong style={{ color: C.red }}>⚠️ Suspension imminente</strong>
              <span style={{ color: C.muted, marginLeft: 8 }}>
                Votre slot sera suspendu dans {dash.days_before_suspension} jour{dash.days_before_suspension > 1 ? 's' : ''} — complétez vos tâches aujourd'hui.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '0 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', padding: '14px 16px', fontSize: 13, fontWeight: 700,
                color: tab === t.id ? C.cyan : C.muted, cursor: 'pointer', whiteSpace: 'nowrap',
                borderBottom: `2px solid ${tab === t.id ? C.cyan : 'transparent'}`, transition: 'all 0.15s',
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }} className="tab-content" key={tab}>

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div>
            {/* Streak + KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 12, marginBottom: 20, alignItems: 'stretch' }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <StreakRing streak={dash?.tasks_streak || 0} />
                <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted }}>STREAK</div>
              </div>
              <StatCard label="CLICS 7 JOURS" value={fmt(0)} sub="impressions à venir" />
              <StatCard label="CTR MOYEN" value="—%" sub="connectez votre slot" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <StatCard label="CLICS AUJOURD'HUI" value={fmt(0)} color={C.green} />
              <StatCard label="CLICS CE MOIS" value={fmt(0)} />
            </div>

            {/* Chart */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 14 }}>CLICS — 7 DERNIERS JOURS</div>
              <MiniChart data={weeklyData} color={C.cyan} height={60} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {['L','M','M','J','V','S','D'].map((d, i) => (
                  <div key={i} style={{ fontSize: 10, color: C.muted }}>{d}</div>
                ))}
              </div>
            </div>

            {/* Tier info */}
            {dash?.tier && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 16px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 12 }}>MON SLOT</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, background: `${TIER_COLOR[dash.tier]}15`, border: `2px solid ${TIER_COLOR[dash.tier]}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: TIER_COLOR[dash.tier] }}>
                    {(dash.tier || '')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TIER_COLOR[dash.tier] }}>{dash.tier?.toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Position [{dash.slot_x},{dash.slot_y}]</div>
                  </div>
                  <a href={`/slot/${dash.slot_x}-${dash.slot_y}`} style={{ marginLeft: 'auto', background: `${C.cyan}15`, border: `1px solid ${C.border2}`, borderRadius: 6, padding: '7px 12px', fontSize: 12, color: C.cyan, textDecoration: 'none', fontWeight: 700 }}>
                    VOIR MA PAGE →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {tab === 'tasks' && (
          <div>
            {/* Header tâches */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Tâches du jour</h2>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  {allDone ? '✓ Toutes les tâches sont complétées !' : `${doneToday}/${totalToday} complétées`}
                  {dash?.tasks_streak > 0 && ` · 🔥 ${dash.tasks_streak} jours de streak`}
                </p>
              </div>
              {allDone && (
                <div style={{ fontSize: 24 }}>🎉</div>
              )}
            </div>

            {/* Progress bar */}
            {totalToday > 0 && (
              <div style={{ background: 'rgba(0,200,240,0.08)', borderRadius: 4, height: 4, marginBottom: 20 }}>
                <div style={{ background: allDone ? C.green : C.cyan, height: '100%', borderRadius: 4, width: `${(doneToday / totalToday) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
            )}

            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                <p>Aucune tâche pour aujourd'hui.</p>
                <p style={{ fontSize: 12, marginTop: 8 }}>Les tâches sont générées chaque matin pour les abonnés actifs.</p>
              </div>
            ) : (
              tasks.map(t => <TaskItem key={t.id} task={t} onComplete={handleCompleteTask} />)
            )}

            {/* Top streaks */}
            {topStreaks.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 12 }}>🏆 TOP STREAKS DE LA GRILLE</div>
                {topStreaks.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13, color: C.muted, width: 20 }}>#{i + 1}</div>
                    <div style={{ flex: 1, fontSize: 13, color: C.text }}>{s.advertisers?.display_name || 'Anonyme'}</div>
                    <div style={{ fontSize: 13, color: C.amber, fontWeight: 700 }}>🔥 {s.tasks_streak}j</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEED TAB */}
        {tab === 'feed' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Fil communautaire</h2>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Les actions des membres de la Sphère de Dyson.</p>
            </div>
            {feed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
                <p>Le fil communautaire est vide pour l'instant.</p>
                <p style={{ fontSize: 12, marginTop: 8 }}>Complétez vos tâches pour y apparaître !</p>
              </div>
            ) : (
              feed.map((item, i) => <FeedItem key={item.id || i} item={item} />)
            )}
          </div>
        )}

        {/* OFFERS TAB */}
        {tab === 'offers' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Offres de rachat</h2>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Quelqu'un veut votre slot ? Acceptez ou refusez ici.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
              <p style={{ fontSize: 15 }}>Aucune offre en attente.</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Les offres de rachat apparaîtront ici dès qu'un acheteur cible votre slot.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav (mobile) */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(1,2,10,0.95)', borderTop: `1px solid ${C.border}`,
        display: 'flex', backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: 'none', border: 'none',
            padding: '12px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            color: tab === t.id ? C.cyan : C.muted, cursor: 'pointer',
            borderTop: `2px solid ${tab === t.id ? C.cyan : 'transparent'}`, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}
