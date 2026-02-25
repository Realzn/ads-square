'use client';
// app/sphere/page.js — Dashboard Sphère de Dyson
// Cockpit du membre : tâches du jour + fil communautaire + statut abonnement

import { useState, useEffect, useCallback } from 'react';
import { getSession } from '../../lib/supabase-auth';
import { supabase } from '../../lib/supabase';

// ─── Design System ────────────────────────────────────────────
const U = {
  bg:      '#060608',
  s1:      '#0d0d10',
  s2:      '#12121a',
  card:    '#16161e',
  card2:   '#1a1a24',
  border:  'rgba(255,255,255,0.06)',
  border2: 'rgba(255,255,255,0.12)',
  text:    '#f0f0f0',
  muted:   'rgba(255,255,255,0.4)',
  faint:   'rgba(255,255,255,0.04)',
  err:     '#e05252',
  green:   '#22c55e',
};
const F = { h: "'Clash Display','Syne',sans-serif", b: "'DM Sans','Inter',sans-serif" };

const RANK_CONFIG = {
  elu:        { label: "L'Élu",        color: '#f0b429', icon: '☀', glow: '#f0b42940' },
  architecte: { label: "L'Architecte", color: '#ff4d8f', icon: '🔵', glow: '#ff4d8f30' },
  gardien:    { label: "Le Gardien",   color: '#a855f7', icon: '🟣', glow: '#a855f730' },
  batisseur:  { label: "Le Bâtisseur", color: '#00d9f5', icon: '🟡', glow: '#00d9f530' },
  signal:     { label: "Le Signal",    color: '#00e8a2', icon: '⚪', glow: '#00e8a230' },
};

const TASK_CONFIG = {
  share_grid:          { icon: '🌐', label: 'Partager la Sphère',           desc: 'Partagez le lien de la Sphère sur un réseau social', platform: true },
  highlight_neighbor:  { icon: '✨', label: 'Mettre en avant un voisin',    desc: 'Mentionnez un slot voisin dans votre communication', target: true },
  create_content:      { icon: '🎬', label: 'Créer du contenu',             desc: 'Publiez du contenu autour de votre slot (vidéo, post, article)', platform: true },
  welcome_member:      { icon: '👋', label: 'Accueillir un nouveau membre', desc: 'Envoyez un message de bienvenue à un nouveau Signal', target: true },
  recommend_members:   { icon: '⭐', label: 'Recommander 2 membres',        desc: 'Recommandez publiquement 2 membres à votre audience', target: true },
  offer_advantage:     { icon: '🎁', label: 'Offrir un avantage',           desc: 'Proposez quelque chose de concret à la communauté (réduction, accès, collab)' },
  slot_perfect:        { icon: '💎', label: 'Slot parfait',                 desc: 'Confirmez que votre slot est à jour et votre lien actif' },
};

const PLATFORMS = ['Instagram', 'Twitter/X', 'LinkedIn', 'TikTok', 'YouTube', 'Facebook', 'Threads', 'Autre'];

const FEED_ACTION_LABELS = {
  share:     { icon: '🌐', label: 'a partagé la Sphère' },
  highlight: { icon: '✨', label: 'a mis en avant' },
  recommend: { icon: '⭐', label: 'a recommandé' },
  welcome:   { icon: '👋', label: 'a accueilli' },
  advantage: { icon: '🎁', label: 'offre un avantage' },
};

// ─── Composants de base ───────────────────────────────────────

function RankBadge({ rank, size = 'md' }) {
  const cfg = RANK_CONFIG[rank] || RANK_CONFIG.signal;
  const sizes = { sm: { p: '3px 10px', fs: 10 }, md: { p: '5px 14px', fs: 12 } };
  const s = sizes[size];
  return (
    <span style={{
      background: cfg.glow, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      borderRadius: 6, padding: s.p, fontSize: s.fs,
      fontWeight: 700, letterSpacing: '0.08em', fontFamily: F.b,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function Btn({ onClick, children, variant = 'primary', disabled, small }) {
  const styles = {
    primary:   { background: '#d4a84b', color: '#080808' },
    success:   { background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e40' },
    secondary: { background: U.faint, color: U.text, border: `1px solid ${U.border2}` },
    danger:    { background: 'rgba(224,82,82,0.1)', color: U.err, border: '1px solid rgba(224,82,82,0.3)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      border: 'none', borderRadius: 8, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: F.b, opacity: disabled ? 0.5 : 1,
      padding: small ? '8px 16px' : '12px 24px',
      fontSize: small ? 13 : 14, transition: 'opacity 0.15s',
      ...styles[variant],
    }}>
      {children}
    </button>
  );
}

function Gauge({ value, max, color, label }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: U.muted, fontWeight: 600, letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: U.faint, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ─── Composant : Tâche ────────────────────────────────────────

function TaskCard({ task, onComplete, loading }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ proof_text: '', proof_url: '', proof_platform: '', target_name: '' });
  const cfg = TASK_CONFIG[task.task_type] || {};
  const isCompleted = task.completed;

  const handleComplete = () => {
    onComplete(task.id, form);
    setOpen(false);
  };

  return (
    <div style={{
      background: isCompleted ? 'rgba(34,197,94,0.05)' : U.card,
      border: `1px solid ${isCompleted ? '#22c55e30' : U.border}`,
      borderRadius: 12, padding: '16px 20px', transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: isCompleted ? '#22c55e' : U.text }}>
              {cfg.label}
              {isCompleted && <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e' }}>✓ Fait</span>}
            </div>
            <div style={{ fontSize: 12, color: U.muted, marginTop: 2 }}>{cfg.desc}</div>
          </div>
        </div>
        {!isCompleted && (
          <button onClick={() => setOpen(!open)} style={{
            background: 'rgba(212,168,75,0.12)', color: '#d4a84b',
            border: '1px solid rgba(212,168,75,0.3)',
            borderRadius: 8, padding: '7px 14px', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', fontFamily: F.b,
          }}>
            {open ? 'Fermer' : 'Déclarer'}
          </button>
        )}
      </div>

      {/* Preuve déclarative */}
      {open && !isCompleted && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${U.border}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              placeholder="Décrivez ce que vous avez fait (1-2 phrases)…"
              value={form.proof_text}
              onChange={e => setForm(f => ({ ...f, proof_text: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', background: U.s1,
                border: `1px solid ${U.border2}`, borderRadius: 8,
                color: U.text, fontSize: 13, fontFamily: F.b, resize: 'vertical',
                minHeight: 72, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <input
              placeholder="Lien vers votre action (optionnel) — post, vidéo, article…"
              value={form.proof_url}
              onChange={e => setForm(f => ({ ...f, proof_url: e.target.value }))}
              style={{
                padding: '10px 12px', background: U.s1,
                border: `1px solid ${U.border2}`, borderRadius: 8,
                color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none',
              }}
            />
            {cfg.platform && (
              <select value={form.proof_platform} onChange={e => setForm(f => ({ ...f, proof_platform: e.target.value }))}
                style={{ padding: '10px 12px', background: U.s1, border: `1px solid ${U.border2}`, borderRadius: 8, color: U.text, fontSize: 13, fontFamily: F.b }}>
                <option value="">Plateforme (optionnel)</option>
                {PLATFORMS.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
              </select>
            )}
            {cfg.target && (
              <input
                placeholder="Nom du membre mis en avant"
                value={form.target_name}
                onChange={e => setForm(f => ({ ...f, target_name: e.target.value }))}
                style={{ padding: '10px 12px', background: U.s1, border: `1px solid ${U.border2}`, borderRadius: 8, color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none' }}
              />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={handleComplete} disabled={loading || !form.proof_text} small>
                {loading ? '…' : '✓ Confirmer'}
              </Btn>
              <Btn onClick={() => setOpen(false)} variant="secondary" small>Annuler</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant : Entrée du fil communautaire ──────────────────

function FeedEntry({ entry }) {
  const rankCfg = RANK_CONFIG[entry.rank] || RANK_CONFIG.signal;
  const actionCfg = FEED_ACTION_LABELS[entry.action_type] || { icon: '◈', label: 'a agi' };
  const timeAgo = getTimeAgo(entry.created_at);

  return (
    <div style={{
      background: U.card, border: `1px solid ${U.border}`,
      borderRadius: 12, padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: rankCfg.glow, border: `2px solid ${rankCfg.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: rankCfg.color,
        }}>
          {(entry.author_name || '?').substring(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            <strong style={{ color: U.text }}>{entry.author_name}</strong>
            <span style={{ color: U.muted }}> </span>
            <span style={{ color: rankCfg.color }}>{actionCfg.icon}</span>
            <span style={{ color: U.muted }}> {actionCfg.label}</span>
            {entry.featured_name && (
              <strong style={{ color: U.text }}> {entry.featured_name}</strong>
            )}
          </div>
          <RankBadge rank={entry.rank} size="sm" />
          {entry.content_text && (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              {entry.content_text}
            </p>
          )}
          {entry.proof_url && (
            <a href={entry.proof_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#00d9f5', textDecoration: 'none' }}>
              ↗ Voir la preuve
            </a>
          )}
          {entry.advantage_description && (
            <div style={{
              marginTop: 10, padding: '8px 12px', background: 'rgba(212,168,75,0.08)',
              border: '1px solid rgba(212,168,75,0.2)', borderRadius: 8, fontSize: 12, color: '#d4a84b',
            }}>
              🎁 {entry.advantage_description}
              {entry.advantage_valid_until && <span style={{ color: U.muted }}> — Jusqu'au {new Date(entry.advantage_valid_until).toLocaleDateString('fr-FR')}</span>}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: U.muted }}>{timeAgo}</div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

// ─── Page principale ──────────────────────────────────────────

export default function SphereDashboard() {
  const [session, setSession] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('tasks'); // tasks | feed | subscription
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Charger la session et les abonnements
  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (!s) { window.location.href = '/dashboard/login'; return; }
      setSession(s);

      // Récupérer les abonnements via Supabase
      const { data: subs } = await supabase
        .from('member_dashboard')
        .select('*')
        .eq('advertiser_id', s.user.id)
        .order('started_at', { ascending: false });

      setSubscriptions(subs || []);
      if (subs && subs.length > 0) {
        setSelectedSub(subs[0]);
        setDashboard(subs[0]);
      }
      setLoading(false);
    })();
  }, []);

  // Charger les tâches quand l'abonnement sélectionné change
  useEffect(() => {
    if (!selectedSub) return;
    (async () => {
      const res = await fetch(`/api/tasks?subscription_id=${selectedSub.id}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    })();
  }, [selectedSub]);

  // Charger le fil communautaire
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/community?limit=30');
      const data = await res.json();
      setFeed(data.feed || []);
    })();
  }, []);

  // Compléter une tâche
  const handleCompleteTask = useCallback(async (taskId, form) => {
    setTaskLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          proof_text: form.proof_text,
          proof_url: form.proof_url,
          proof_platform: form.proof_platform,
          target_name: form.target_name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(t => t.map(task => task.id === taskId ? { ...task, completed: true } : task));
        if (data.dashboard) setDashboard(data.dashboard);
        showToast('Tâche accomplie ✓ — Amplification publiée sur le fil !');
        // Recharger le fil
        const feedRes = await fetch('/api/community?limit=30');
        const feedData = await feedRes.json();
        setFeed(feedData.feed || []);
      } else {
        showToast(data.error || 'Erreur', 'error');
      }
    } catch (e) {
      showToast('Erreur réseau', 'error');
    } finally {
      setTaskLoading(false);
    }
  }, []);

  // Annuler l'abonnement
  const handleCancel = async () => {
    if (!selectedSub || !session) return;
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: selectedSub.id, advertiser_id: session.user.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Abonnement annulé. Votre slot restera visible 24h.');
        setSubscriptions(s => s.map(sub => sub.id === selectedSub.id ? { ...sub, status: 'cancelled' } : sub));
        setDashboard(d => ({ ...d, status: 'cancelled' }));
        setCancelConfirm(false);
      } else {
        showToast(data.error || 'Erreur annulation', 'error');
      }
    } catch (e) {
      showToast('Erreur réseau', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: U.muted, fontFamily: F.b }}>Chargement de la Sphère…</div>
      </div>
    );
  }

  if (!selectedSub) {
    return (
      <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', fontFamily: F.b }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>◎</div>
          <div style={{ color: U.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Vous n'êtes pas encore dans la Sphère</div>
          <div style={{ color: U.muted, marginBottom: 24 }}>Réservez un slot pour rejoindre le réseau mutualiste.</div>
          <a href="/" style={{ background: '#d4a84b', color: '#080808', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>
            Voir la grille
          </a>
        </div>
      </div>
    );
  }

  const rankCfg = RANK_CONFIG[dashboard?.rank] || RANK_CONFIG.signal;
  const tasksDone = tasks.filter(t => t.completed).length;
  const tasksTotal = tasks.length;
  const allTasksDone = tasksTotal > 0 && tasksDone === tasksTotal;
  const daysBeforeSuspension = dashboard?.days_before_suspension ?? 0;
  const suspensionThreshold = dashboard?.suspension_threshold ?? 5;

  return (
    <div style={{ minHeight: '100vh', background: U.bg, fontFamily: F.b }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? U.err : U.green,
          color: '#fff', borderRadius: 10, padding: '12px 20px',
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>

        {/* ─── Header Cockpit ───────────────────────────────── */}
        <div style={{
          background: `radial-gradient(ellipse at 20% 50%, ${rankCfg.glow} 0%, transparent 60%), ${U.card}`,
          border: `1px solid ${rankCfg.color}30`,
          borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: U.muted, marginBottom: 8, letterSpacing: '0.1em' }}>SPHÈRE DE DYSON — COCKPIT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 32, lineHeight: 1 }}>{rankCfg.icon}</div>
                <div>
                  <RankBadge rank={dashboard?.rank} />
                  <div style={{ fontSize: 12, color: U.muted, marginTop: 4 }}>
                    Slot ({selectedSub.slot_x},{selectedSub.slot_y}) · {selectedSub.tier?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: rankCfg.color, fontFamily: F.h }}>
                {dashboard?.tasks_streak || 0}
              </div>
              <div style={{ fontSize: 11, color: U.muted, marginTop: 2 }}>jours consécutifs</div>
            </div>
          </div>

          {/* Jauges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
            <Gauge
              label="TÂCHES AUJOURD'HUI"
              value={tasksDone} max={tasksTotal || 1}
              color={allTasksDone ? U.green : rankCfg.color}
            />
            <Gauge
              label="JOURS RESTANTS AVANT SUSPENSION"
              value={daysBeforeSuspension}
              max={suspensionThreshold}
              color={daysBeforeSuspension <= 1 ? U.err : daysBeforeSuspension <= 2 ? '#f0b429' : U.green}
            />
          </div>

          {/* Alertes */}
          {dashboard?.status === 'suspended' && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 8, fontSize: 13, color: U.err }}>
              ⚠️ Votre slot est suspendu. Complétez vos tâches pour le réactiver.
              <button onClick={async () => {
                await fetch('/api/subscriptions/reactivate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription_id: selectedSub.id }) });
                window.location.reload();
              }} style={{ marginLeft: 12, background: U.err, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Réactiver
              </button>
            </div>
          )}
          {allTasksDone && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 13, color: U.green }}>
              ✓ Toutes vos tâches sont complétées ! La Sphère s'amplifie grâce à vous.
            </div>
          )}
        </div>

        {/* ─── Tabs ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, background: U.s1, borderRadius: 10, padding: 4, marginBottom: 24, border: `1px solid ${U.border}` }}>
          {[
            { key: 'tasks', label: `Tâches du jour ${tasksTotal > 0 ? `(${tasksDone}/${tasksTotal})` : ''}` },
            { key: 'feed', label: `Fil communautaire` },
            { key: 'subscription', label: 'Mon abonnement' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none',
              background: tab === t.key ? U.card2 : 'transparent',
              color: tab === t.key ? U.text : U.muted,
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: 13, cursor: 'pointer', fontFamily: F.b, transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Tab : Tâches du jour ─────────────────────────── */}
        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: U.muted, fontSize: 14 }}>
                Chargement des tâches…
              </div>
            ) : (
              tasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} loading={taskLoading} />
              ))
            )}
            <div style={{ padding: '16px 0', fontSize: 12, color: U.muted, lineHeight: 1.7 }}>
              <strong style={{ color: U.text }}>Comment ça marche ?</strong><br />
              Chaque tâche accomplie est publiée sur le fil communautaire. Vos actions amplifient la visibilité
              de toute la Sphère — y compris votre propre slot. Plus la Sphère est active, plus vous êtes vu.
            </div>
          </div>
        )}

        {/* ─── Tab : Fil communautaire ──────────────────────── */}
        {tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {feed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: U.muted }}>
                Le fil est vide pour l'instant. Soyez le premier à amplifier !
              </div>
            ) : (
              feed.map(entry => <FeedEntry key={entry.id} entry={entry} />)
            )}
          </div>
        )}

        {/* ─── Tab : Mon abonnement ─────────────────────────── */}
        {tab === 'subscription' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'Prix/jour', value: `${((selectedSub.price_cents_per_day || 0) / 100).toFixed(2)}€` },
                { label: 'Amplifications', value: dashboard?.total_amplifications || 0 },
                { label: 'Série active', value: `${dashboard?.tasks_streak || 0}j` },
              ].map(stat => (
                <div key={stat.label} style={{ background: U.card, border: `1px solid ${U.border}`, borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, color: U.muted, letterSpacing: '0.08em', marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: rankCfg.color, fontFamily: F.h }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Info abonnement */}
            <div style={{ background: U.card, border: `1px solid ${U.border}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: U.text, marginBottom: 16 }}>Détails de l'abonnement</div>
              {[
                { label: 'Statut', value: dashboard?.status },
                { label: 'Rang', value: RANK_CONFIG[dashboard?.rank]?.label },
                { label: 'Slot', value: `(${selectedSub.slot_x}, ${selectedSub.slot_y}) · ${selectedSub.tier}` },
                { label: 'Membre depuis', value: new Date(selectedSub.started_at).toLocaleDateString('fr-FR') },
                { label: 'Tâches manquées', value: `${dashboard?.tasks_missed_days || 0} / ${dashboard?.suspension_threshold || 5} jours` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${U.border}` }}>
                  <span style={{ fontSize: 13, color: U.muted }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: U.text }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Annulation */}
            {dashboard?.status === 'active' && (
              <div style={{ background: U.card, border: `1px solid rgba(224,82,82,0.2)`, borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: U.text, marginBottom: 8 }}>Annuler l'abonnement</div>
                <div style={{ fontSize: 13, color: U.muted, marginBottom: 16 }}>
                  L'annulation est immédiate. Votre slot sera affiché en "void" pendant 24h sur la grille, puis libéré.
                </div>
                {!cancelConfirm ? (
                  <Btn onClick={() => setCancelConfirm(true)} variant="danger" small>Annuler mon abonnement</Btn>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: U.err }}>Confirmer l'annulation ?</span>
                    <Btn onClick={handleCancel} variant="danger" small>Oui, annuler</Btn>
                    <Btn onClick={() => setCancelConfirm(false)} variant="secondary" small>Non, rester</Btn>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
