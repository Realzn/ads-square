'use client';
// ─────────────────────────────────────────────────────────────────
//  CommunityChat.jsx — Chat multi-canaux temps réel
//  Supabase Realtime · Dyson Cosmos design system
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Supabase client (public anon key — safe pour le browser) ──
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────────
//  Design System (identique à page.js)
// ─────────────────────────────────────────────────────────────────
const DS = {
  bg:      '#01020A',
  s1:      'rgba(0,4,16,0.98)',
  s2:      'rgba(0,8,24,0.97)',
  card:    'rgba(1,6,20,0.96)',
  border:  'rgba(0,200,240,0.09)',
  border2: 'rgba(0,200,240,0.18)',
  border3: 'rgba(0,200,240,0.30)',
  text:    '#DDE6F2',
  muted:   'rgba(140,180,220,0.55)',
  faint:   'rgba(0,200,240,0.04)',
  cyan:    '#00C8E4',
  gold:    '#E8A020',
  green:   '#00D880',
  rose:    '#D02848',
  purple:  '#9D7DFF',
};
const F = {
  h:    "'Rajdhani','Sora',system-ui,sans-serif",
  b:    "'Rajdhani','Sora',system-ui,sans-serif",
  mono: "'JetBrains Mono','Fira Code',monospace",
};

// ─────────────────────────────────────────────────────────────────
//  Canaux de discussion
// ─────────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'general',    label: 'général',     icon: '◈', color: DS.cyan,   desc: 'Discussion générale — bienvenue dans la Sphère' },
  { id: 'annonces',   label: 'annonces',    icon: '◆', color: DS.gold,   desc: 'Annonces officielles ADS-SQUARE', readOnly: true },
  { id: 'createurs',  label: 'créateurs',   icon: '◎', color: DS.purple, desc: 'Échanges entre créateurs de contenu' },
  { id: 'collab',     label: 'collab',      icon: '⊕', color: DS.green,  desc: 'Chercher des collaborations et partenariats' },
  { id: 'music',      label: 'musique',     icon: '♪', color: '#FF6B6B', desc: 'Artistes, labels, playlists, releases' },
  { id: 'vitrines',   label: 'vitrines',    icon: '▣', color: '#40AAFF', desc: 'Partagez vos blocs et campagnes actives' },
  { id: 'offtopic',   label: 'off-topic',   icon: '⚡', color: DS.muted,  desc: 'Tout le reste — détente et bavardage' },
];

// Emojis de réaction rapide
const REACTIONS = ['👍','🔥','◈','💎','🚀','❤️','😂','👀'];

// Couleurs d'avatar auto par initiale
const AVATAR_COLORS = [
  '#00C8E4','#E8A020','#9D7DFF','#00D880','#FF6B6B','#40AAFF','#FF9F40','#4BC0C0',
];
function avatarColor(name = '') {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)   return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400)return `il y a ${Math.floor(diff/3600)} h`;
  return new Date(ts).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}

function formatMsgText(text) {
  // Basique : URLs cliquables, @mentions colorées
  return text
    .replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener" style="color:${DS.cyan};text-decoration:underline;word-break:break-all;">${url}</a>`)
    .replace(/@([\w-]+)/g, `<span style="color:${DS.gold};font-weight:700;">@$1</span>`);
}

// ─────────────────────────────────────────────────────────────────
//  Hook : messages d'un canal
// ─────────────────────────────────────────────────────────────────
function useMessages(channelId) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Charger l'historique
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data || []);
    setLoading(false);
  }, [channelId]);

  useEffect(() => { load(); }, [load]);

  // Abonnement Realtime
  useEffect(() => {
    const sub = sb
      .channel(`chat:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, payload => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => { sb.removeChannel(sub); };
  }, [channelId]);

  // Ajouter une réaction
  const react = useCallback(async (msgId, emoji) => {
    const { data: msg } = await sb.from('chat_messages').select('reactions').eq('id', msgId).single();
    if (!msg) return;
    const reacts = { ...(msg.reactions || {}) };
    reacts[emoji] = (reacts[emoji] || 0) + 1;
    await sb.from('chat_messages').update({ reactions: reacts }).eq('id', msgId);
  }, []);

  return { messages, loading, reload: load, react };
}

// ─────────────────────────────────────────────────────────────────
//  Hook : présences (qui est en ligne)
// ─────────────────────────────────────────────────────────────────
function usePresence(channelId, displayName) {
  const [online, setOnline] = useState([]);
  const chRef = useRef(null);

  useEffect(() => {
    if (!displayName) return;
    const ch = sb.channel(`presence:${channelId}`, { config: { presence: { key: displayName } } });
    chRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const names = Object.values(state).flat().map(p => p.name).filter(Boolean);
      setOnline([...new Set(names)]);
    });

    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ name: displayName, online_at: new Date().toISOString() });
      }
    });

    return () => { sb.removeChannel(ch); };
  }, [channelId, displayName]);

  return online;
}

// ─────────────────────────────────────────────────────────────────
//  Composant : Avatar
// ─────────────────────────────────────────────────────────────────
function Avatar({ name = '?', size = 32, img }) {
  const col = avatarColor(name);
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: img ? `url(${img}) center/cover` : `${col}22`,
      border: `1px solid ${col}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: col,
      fontFamily: F.h, overflow: 'hidden',
    }}>
      {!img && initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Composant : Message individuel
// ─────────────────────────────────────────────────────────────────
function ChatMessage({ msg, isOwn, onReact, isMobile }) {
  const [showReacts, setShowReacts] = useState(false);
  const col = avatarColor(msg.author_name);
  const reactions = msg.reactions || {};
  const hasReactions = Object.keys(reactions).some(k => reactions[k] > 0);

  return (
    <div
      style={{
        display: 'flex', gap: 10, padding: '6px 16px',
        background: isOwn ? `${DS.cyan}05` : 'transparent',
        position: 'relative',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = isOwn ? `${DS.cyan}08` : `${DS.border}`; setShowReacts(true); }}
      onMouseLeave={e => { e.currentTarget.style.background = isOwn ? `${DS.cyan}05` : 'transparent'; setShowReacts(false); }}
    >
      {/* Avatar */}
      <div style={{ paddingTop: 2 }}>
        <Avatar name={msg.author_name} size={30} img={msg.author_img} />
      </div>

      {/* Corps */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Auteur + temps */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{
            color: isOwn ? DS.cyan : col,
            fontFamily: F.mono, fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
          }}>{msg.author_name}</span>
          {msg.author_badge && (
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '.10em', padding: '1px 5px',
              background: `${DS.gold}18`, border: `0.5px solid ${DS.gold}40`, color: DS.gold,
            }}>{msg.author_badge}</span>
          )}
          <span style={{ color: DS.muted, fontSize: 9, fontFamily: F.mono }}>{timeAgo(msg.created_at)}</span>
        </div>

        {/* Texte */}
        <div
          style={{ color: DS.text, fontSize: 13, lineHeight: 1.55, wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: formatMsgText(msg.content) }}
        />

        {/* Image jointe */}
        {msg.image_url && (
          <img src={msg.image_url} alt="" style={{
            marginTop: 8, maxWidth: isMobile ? '100%' : 340, maxHeight: 260,
            borderRadius: 8, border: `1px solid ${DS.border2}`, display: 'block',
          }} />
        )}

        {/* Réactions */}
        {hasReactions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {Object.entries(reactions).filter(([,v]) => v > 0).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 7px', borderRadius: 12,
                background: `${DS.cyan}0d`, border: `0.5px solid ${DS.border2}`,
                color: DS.text, fontSize: 12, cursor: 'pointer', fontFamily: F.b,
              }}>
                {emoji}<span style={{ fontSize: 10, color: DS.muted }}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Boutons réaction — au survol */}
      {showReacts && !isMobile && (
        <div style={{
          position: 'absolute', top: -18, right: 16,
          display: 'flex', gap: 2, padding: '3px 6px',
          background: DS.s1, border: `0.5px solid ${DS.border2}`,
          borderRadius: 8, zIndex: 10,
          boxShadow: `0 4px 20px rgba(0,0,0,0.6)`,
        }}>
          {REACTIONS.map(e => (
            <button key={e} onClick={() => onReact(msg.id, e)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 14, padding: '2px 3px', borderRadius: 4,
              transition: 'transform 0.1s',
            }}
            onMouseEnter={ev => ev.currentTarget.style.transform = 'scale(1.3)'}
            onMouseLeave={ev => ev.currentTarget.style.transform = 'scale(1)'}
            >{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Composant : Séparateur de date
// ─────────────────────────────────────────────────────────────────
function DateSep({ date }) {
  const label = (() => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  })();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', userSelect: 'none' }}>
      <div style={{ flex: 1, height: 0.5, background: DS.border }} />
      <span style={{ color: DS.muted, fontSize: 10, fontFamily: F.mono, letterSpacing: '.12em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 0.5, background: DS.border }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Composant : Zone de saisie
// ─────────────────────────────────────────────────────────────────
function MessageInput({ onSend, disabled, placeholder, isMobile }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const ta = useRef(null);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    await onSend(trimmed);
    setText('');
    setSending(false);
    ta.current?.focus();
  }, [text, sending, disabled, onSend]);

  const onKey = useCallback(e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const EMOJI_LIST = ['😀','😂','🥲','😍','🤩','😎','🥸','🤯','🔥','💎','🚀','⭐','🎵','🎮','💰','🌟','👋','🙌','💪','✨'];

  return (
    <div style={{
      padding: isMobile ? '10px 12px' : '12px 16px',
      borderTop: `0.5px solid ${DS.border}`,
      background: DS.s1,
      position: 'relative',
    }}>
      {/* Emoji picker */}
      {showEmoji && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 16, right: 16, marginBottom: 6,
          background: DS.s1, border: `0.5px solid ${DS.border2}`, borderRadius: 10,
          padding: 10, display: 'flex', flexWrap: 'wrap', gap: 4,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          zIndex: 50,
        }}>
          {EMOJI_LIST.map(e => (
            <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); ta.current?.focus(); }} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 20, padding: '4px 6px', borderRadius: 6,
              transition: 'background 0.1s',
            }}
            onMouseEnter={ev => ev.currentTarget.style.background = DS.border}
            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
            >{e}</button>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: 'rgba(0,8,24,0.80)', border: `0.5px solid ${DS.border2}`,
        borderRadius: 10, padding: '6px 8px 6px 12px',
        boxShadow: `inset 0 0 0 0.5px ${DS.border}`,
      }}>
        {/* Emoji btn */}
        <button onClick={() => setShowEmoji(v => !v)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 16, padding: '4px 4px 4px 0',
          color: showEmoji ? DS.cyan : DS.muted,
          transition: 'color 0.1s', flexShrink: 0,
        }}>☺</button>

        {/* Textarea */}
        <textarea
          ref={ta}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          style={{
            flex: 1, resize: 'none', background: 'transparent', border: 'none',
            color: disabled ? DS.muted : DS.text, fontSize: 13, fontFamily: F.b,
            outline: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            paddingTop: 4, paddingBottom: 4,
          }}
        />

        {/* Send btn */}
        <button
          onClick={send}
          disabled={!text.trim() || sending || disabled}
          style={{
            width: 32, height: 32, borderRadius: 7, flexShrink: 0,
            background: text.trim() && !disabled ? DS.cyan : `${DS.cyan}20`,
            border: 'none', cursor: text.trim() && !disabled ? 'pointer' : 'not-allowed',
            color: text.trim() && !disabled ? '#000' : DS.muted,
            fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↑</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Composant : Sidebar canaux (desktop)
// ─────────────────────────────────────────────────────────────────
function ChannelSidebar({ active, onChange, unread, isMobile, open, onClose }) {
  if (isMobile && !open) return null;

  const sidebar = (
    <div style={{
      width: isMobile ? '100vw' : 220,
      height: '100%',
      background: DS.bg,
      borderRight: isMobile ? 'none' : `0.5px solid ${DS.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,240,0.008) 2px,rgba(0,200,240,0.008) 3px)',
      position: isMobile ? 'absolute' : 'relative',
      zIndex: isMobile ? 40 : 'auto',
      left: 0, top: 0, bottom: 0,
    }}>
      {/* Header sidebar */}
      <div style={{
        padding: '16px 14px 10px',
        borderBottom: `0.5px solid ${DS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: DS.text, fontFamily: F.h, fontWeight: 700, fontSize: 13, letterSpacing: '.06em' }}>CANAUX</div>
          <div style={{ color: DS.muted, fontSize: 9, fontFamily: F.mono, letterSpacing: '.12em', marginTop: 1 }}>DYSON NETWORK</div>
        </div>
        {isMobile && (
          <button onClick={onClose} style={{
            background: 'transparent', border: `0.5px solid ${DS.border2}`, color: DS.muted,
            width: 26, height: 26, cursor: 'pointer', fontSize: 11, borderRadius: 4,
          }}>✕</button>
        )}
      </div>

      {/* Liste des canaux */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {CHANNELS.map(ch => {
          const isActive = ch.id === active;
          const hasUnread = unread[ch.id] > 0;
          return (
            <button
              key={ch.id}
              onClick={() => { onChange(ch.id); if (isMobile) onClose(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 7, marginBottom: 2,
                background: isActive ? `${ch.color}14` : 'transparent',
                border: `0.5px solid ${isActive ? ch.color + '40' : 'transparent'}`,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                boxShadow: isActive ? `0 0 12px ${ch.color}10` : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = DS.faint; e.currentTarget.style.borderColor = DS.border; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}}
            >
              <span style={{ fontSize: 13, color: isActive ? ch.color : DS.muted, flexShrink: 0 }}>{ch.icon}</span>
              <span style={{
                flex: 1, color: isActive ? ch.color : DS.muted,
                fontFamily: F.mono, fontSize: 10.5, fontWeight: isActive ? 700 : 500,
                letterSpacing: '.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>#{ch.label}</span>
              {ch.readOnly && <span style={{ fontSize: 8, color: DS.muted, letterSpacing: '.08em' }}>📢</span>}
              {hasUnread && !isActive && (
                <span style={{
                  minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                  background: DS.cyan, color: '#000',
                  fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{Math.min(99, unread[ch.id])}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 12px', borderTop: `0.5px solid ${DS.border}` }}>
        <div style={{ fontSize: 8, color: DS.muted, fontFamily: F.mono, letterSpacing: '.12em', textAlign: 'center' }}>
          ADS-SQUARE · BETA
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', zIndex:39 }} />
        {sidebar}
      </>
    );
  }
  return sidebar;
}

// ─────────────────────────────────────────────────────────────────
//  Composant : Liste membres en ligne
// ─────────────────────────────────────────────────────────────────
function OnlinePanel({ members, channel }) {
  return (
    <div style={{
      width: 180, flexShrink: 0, borderLeft: `0.5px solid ${DS.border}`,
      background: DS.bg, display: 'flex', flexDirection: 'column',
      backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,240,0.006) 2px,rgba(0,200,240,0.006) 3px)',
    }}>
      <div style={{ padding: '14px 12px 8px', borderBottom: `0.5px solid ${DS.border}` }}>
        <div style={{ color: DS.muted, fontFamily: F.mono, fontSize: 9, letterSpacing: '.14em', marginBottom: 2 }}>EN LIGNE</div>
        <div style={{ color: DS.green, fontFamily: F.mono, fontSize: 11, fontWeight: 700 }}>
          <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:DS.green, marginRight:5, boxShadow:`0 0 6px ${DS.green}` }} />
          {members.length} {members.length > 1 ? 'membres' : 'membre'}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {members.length === 0 ? (
          <div style={{ color: DS.muted, fontSize: 10, fontFamily: F.mono, textAlign: 'center', paddingTop: 20 }}>
            Soyez le premier
          </div>
        ) : members.map(name => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0' }}>
            <Avatar name={name} size={22} />
            <span style={{
              color: DS.text, fontSize: 11, fontFamily: F.b,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>{name}</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: DS.green, flexShrink: 0 }} />
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', borderTop: `0.5px solid ${DS.border}` }}>
        <div style={{ color: DS.muted, fontSize: 8, fontFamily: F.mono, letterSpacing: '.10em' }}>#{CHANNELS.find(c=>c.id===channel)?.label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Composant : Panneau identité (si non connecté)
// ─────────────────────────────────────────────────────────────────
function GuestBar({ onSetName }) {
  const [name, setName] = useState('');
  return (
    <div style={{
      padding: '10px 16px', borderTop: `0.5px solid ${DS.border}`,
      background: `${DS.gold}0a`, borderTop: `0.5px solid ${DS.gold}30`,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={{ color: DS.gold, fontFamily: F.mono, fontSize: 10, letterSpacing: '.10em', whiteSpace: 'nowrap' }}>◈ CHOISIR UN PSEUDO</span>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && name.trim() && onSetName(name.trim())}
        placeholder="Votre pseudo…"
        maxLength={24}
        style={{
          flex: 1, minWidth: 140, padding: '7px 12px',
          background: 'rgba(0,8,24,0.80)', border: `0.5px solid ${DS.gold}40`,
          color: DS.text, fontSize: 12, fontFamily: F.mono, outline: 'none', borderRadius: 6,
        }}
      />
      <button
        onClick={() => name.trim() && onSetName(name.trim())}
        style={{
          padding: '7px 16px', background: `${DS.gold}20`, border: `0.5px solid ${DS.gold}55`,
          color: DS.gold, fontFamily: F.mono, fontSize: 11, fontWeight: 700,
          letterSpacing: '.10em', cursor: 'pointer', borderRadius: 6, whiteSpace: 'nowrap',
        }}
      >REJOINDRE →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Composant principal : CommunityChat
// ─────────────────────────────────────────────────────────────────
export default function CommunityChat({ user }) {
  const [channel, setChannel]       = useState('general');
  const [guestName, setGuestName]   = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnline, setShowOnline] = useState(true);
  const [unread, setUnread]         = useState({});
  const bottomRef = useRef(null);
  const [isMobile, setIsMobile]     = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Pseudo effectif
  const displayName = useMemo(() => {
    if (user?.email) return user.user_metadata?.display_name || user.email.split('@')[0];
    return guestName;
  }, [user, guestName]);

  const isLoggedOrNamed = !!displayName;
  const ch = CHANNELS.find(c => c.id === channel) || CHANNELS[0];

  const { messages, loading, react } = useMessages(channel);
  const online = usePresence(channel, displayName);

  // Scroll bas automatique
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Marquer comme lu quand actif
  useEffect(() => {
    setUnread(prev => ({ ...prev, [channel]: 0 }));
  }, [channel]);

  // Incrémenter unread pour les autres canaux (via abonnements globaux)
  useEffect(() => {
    const subs = CHANNELS
      .filter(c => c.id !== channel)
      .map(c => sb.channel(`unread:${c.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${c.id}` },
          () => setUnread(prev => ({ ...prev, [c.id]: (prev[c.id] || 0) + 1 }))
        )
        .subscribe()
      );
    return () => subs.forEach(s => sb.removeChannel(s));
  }, [channel]);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || !displayName) return;
    await sb.from('chat_messages').insert({
      channel_id:   channel,
      author_id:    user?.id || null,
      author_name:  displayName,
      author_badge: user?.id ? 'MEMBRE' : null,
      content,
      reactions:    {},
    });
  }, [channel, displayName, user]);

  // Regrouper les messages par date
  const grouped = useMemo(() => {
    const groups = [];
    let lastDate = null;
    for (const msg of messages) {
      const day = new Date(msg.created_at).toDateString();
      if (day !== lastDate) { groups.push({ type: 'sep', date: msg.created_at, key: day }); lastDate = day; }
      groups.push({ type: 'msg', msg });
    }
    return groups;
  }, [messages]);

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      background: DS.bg, fontFamily: F.b, color: DS.text,
      position: 'relative',
    }}>
      {/* ── Sidebar canaux ── */}
      <ChannelSidebar
        active={channel}
        onChange={c => { setChannel(c); setUnread(prev => ({...prev, [c]: 0})); }}
        unread={unread}
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Zone principale ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header canal */}
        <div style={{
          padding: isMobile ? '10px 14px' : '12px 18px',
          borderBottom: `0.5px solid ${DS.border}`,
          background: DS.s1,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          {/* Burger mobile */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{
              background:'transparent', border:`0.5px solid ${DS.border2}`,
              color:DS.muted, width:28, height:28, cursor:'pointer', borderRadius:5, fontSize:12,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>☰</button>
          )}

          {/* Icone + nom du canal */}
          <span style={{ fontSize: 16, color: ch.color }}>{ch.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: ch.color, fontFamily: F.mono, fontSize: 12, fontWeight: 700, letterSpacing: '.08em' }}>
              #{ch.label}
              {ch.readOnly && <span style={{ marginLeft: 8, fontSize: 9, color: DS.muted }}>LECTURE SEULE</span>}
            </div>
            <div style={{ color: DS.muted, fontSize: 10, letterSpacing: '.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.desc}</div>
          </div>

          {/* Membres en ligne (toggle sur mobile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: DS.green, boxShadow: `0 0 6px ${DS.green}` }} />
            <span style={{ color: DS.green, fontFamily: F.mono, fontSize: 10 }}>{online.length}</span>
            {!isMobile && (
              <button onClick={() => setShowOnline(v => !v)} style={{
                background: 'transparent', border: `0.5px solid ${DS.border}`, color: DS.muted,
                padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 9,
                fontFamily: F.mono, letterSpacing: '.08em', marginLeft: 4,
              }}>{showOnline ? 'MASQUER' : 'MEMBRES'}</button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: DS.muted, fontFamily: F.mono, fontSize: 11 }}>
              <div style={{ marginBottom: 8, fontSize: 20 }}>{ch.icon}</div>
              CHARGEMENT…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: isMobile ? 30 : 60, maxWidth: 380, margin: '0 auto' }}>
              <div style={{ fontSize: 40, marginBottom: 16, color: ch.color }}>{ch.icon}</div>
              <div style={{ color: DS.text, fontFamily: F.h, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                Début du canal #{ch.label}
              </div>
              <div style={{ color: DS.muted, fontSize: 13, lineHeight: 1.6 }}>{ch.desc}</div>
              {!ch.readOnly && isLoggedOrNamed && (
                <div style={{ marginTop: 20, color: DS.muted, fontSize: 11, fontFamily: F.mono }}>Soyez le premier à écrire ↓</div>
              )}
            </div>
          ) : (
            grouped.map((item) =>
              item.type === 'sep'
                ? <DateSep key={item.key} date={item.date} />
                : <ChatMessage
                    key={item.msg.id}
                    msg={item.msg}
                    isOwn={item.msg.author_name === displayName}
                    onReact={react}
                    isMobile={isMobile}
                  />
            )
          )}
          <div ref={bottomRef} style={{ height: 8 }} />
        </div>

        {/* Zone de saisie */}
        {ch.readOnly ? (
          <div style={{
            padding: '12px 16px', borderTop: `0.5px solid ${DS.border}`,
            background: DS.s1, textAlign: 'center',
            color: DS.muted, fontFamily: F.mono, fontSize: 10, letterSpacing: '.10em',
          }}>
            📢 Canal en lecture seule — réservé aux annonces officielles
          </div>
        ) : !isLoggedOrNamed ? (
          <GuestBar onSetName={name => {
            try { localStorage.setItem('chat_guest_name', name); } catch {}
            setGuestName(name);
          }} />
        ) : (
          <MessageInput
            onSend={sendMessage}
            disabled={false}
            placeholder={`Message #${ch.label}…`}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* ── Panel membres en ligne (desktop) ── */}
      {!isMobile && showOnline && (
        <OnlinePanel members={online} channel={channel} />
      )}
    </div>
  );
}
