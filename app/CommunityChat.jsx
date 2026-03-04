'use client';
// ─────────────────────────────────────────────────────────────────
//  CommunityChat.jsx — HUD Chat flottant style League of Legends
//  Draggable · Multi-canaux · Toujours au-dessus de la sphère
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '../lib/supabase';

const sb = getSupabaseClient();

// ── Design System ─────────────────────────────────────────────────
const DS = {
  bg:      'rgba(1,3,12,0.92)',
  bg2:     'rgba(0,2,10,0.96)',
  border:  'rgba(0,200,240,0.12)',
  border2: 'rgba(0,200,240,0.25)',
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
  mono: "'JetBrains Mono','Fira Code',monospace",
};

// ── Canaux ────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'general',   label: 'général',    icon: '◈', color: DS.cyan   },
  { id: 'annonces',  label: 'annonces',   icon: '◆', color: DS.gold,  readOnly: true },
  { id: 'createurs', label: 'créateurs',  icon: '◎', color: DS.purple },
  { id: 'collab',    label: 'collab',     icon: '⊕', color: DS.green  },
  { id: 'music',     label: 'musique',    icon: '♪', color: '#FF6B6B' },
  { id: 'vitrines',  label: 'vitrines',   icon: '▣', color: '#40AAFF' },
  { id: 'offtopic',  label: 'off-topic',  icon: '⚡', color: DS.muted  },
];

const AVATAR_COLORS = ['#00C8E4','#E8A020','#9D7DFF','#00D880','#FF6B6B','#40AAFF','#FF9F40','#4BC0C0'];
function avatarColor(name = '') {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
function timeStr(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Styles globaux injectés une fois ──────────────────────────────
const INJECTED = { current: false };
function injectStyles() {
  if (INJECTED.current || typeof document === 'undefined') return;
  INJECTED.current = true;
  const s = document.createElement('style');
  s.textContent = `
    .hud-chat-wrap * { box-sizing: border-box; }
    .hud-msg-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,200,240,0.18) transparent; }
    .hud-msg-scroll::-webkit-scrollbar { width: 3px; }
    .hud-msg-scroll::-webkit-scrollbar-thumb { background: rgba(0,200,240,0.25); border-radius:2px; }
    .hud-msg-scroll::-webkit-scrollbar-track { background: transparent; }
    .hud-input:focus { outline: none; }
    .hud-input::placeholder { color: rgba(140,180,220,0.35); }
    .hud-ch-tab:hover { background: rgba(0,200,240,0.07) !important; }
    .hud-send-btn:hover { opacity: 1 !important; }
    @keyframes hudFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes hudBlink  { 0%,100% { opacity:1; } 50% { opacity:0; } }
    @keyframes hudPulse  { 0%,100% { box-shadow: 0 0 0 0 rgba(0,200,240,0.4); } 70% { box-shadow: 0 0 0 6px rgba(0,200,240,0); } }
    @keyframes msgIn     { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:translateX(0); } }
  `;
  document.head.appendChild(s);
}

// ── Message component ─────────────────────────────────────────────
function ChatMsg({ msg, isOwn }) {
  const ac = avatarColor(msg.author_name);
  const initial = (msg.author_name || '?')[0].toUpperCase();
  return (
    <div style={{
      display: 'flex', gap: 7, padding: '3px 10px',
      animation: 'msgIn 0.18s ease',
      opacity: 0.95,
    }}>
      {/* Avatar mini */}
      <div style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        background: `${ac}22`, border: `1px solid ${ac}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: ac, fontFamily: F.h,
        marginTop: 1,
      }}>{initial}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 1 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: isOwn ? DS.cyan : ac,
            fontFamily: F.h, lineHeight: 1,
          }}>{msg.author_name}</span>
          <span style={{ fontSize: 9, color: DS.muted, fontFamily: F.mono }}>{timeStr(msg.created_at)}</span>
        </div>
        <div style={{
          fontSize: 12, color: DS.text, lineHeight: 1.45,
          wordBreak: 'break-word', fontFamily: F.h, fontWeight: 400,
        }}
          dangerouslySetInnerHTML={{ __html: msg.content
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/https?:\/\/[^\s]+/g, u => `<a href="${u}" target="_blank" rel="noopener" style="color:${DS.cyan};text-decoration:underline;">${u}</a>`)
          }}
        />
      </div>
    </div>
  );
}

// ── Guest name bar ────────────────────────────────────────────────
function GuestNameBar({ onSet }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 5, padding: '6px 8px' }}>
      <input
        className="hud-input"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && val.trim() && onSet(val.trim())}
        placeholder="Votre pseudo…"
        maxLength={24}
        style={{
          flex: 1, background: DS.faint, border: `1px solid ${DS.border2}`,
          borderRadius: 4, padding: '5px 8px', color: DS.text,
          fontSize: 11, fontFamily: F.h,
        }}
      />
      <button
        onClick={() => val.trim() && onSet(val.trim())}
        style={{
          background: DS.cyan, border: 'none', borderRadius: 4,
          color: '#000', fontWeight: 800, fontSize: 10, padding: '5px 10px',
          cursor: 'pointer', fontFamily: F.h, letterSpacing: '.06em',
        }}>OK</button>
    </div>
  );
}

// ── Main HUD Chat ─────────────────────────────────────────────────
export default function CommunityChat({ user }) {
  injectStyles();

  // ── Position & drag ──
  const wrapRef   = useRef(null);
  const tabsRef   = useRef(null);
  const tabsDrag  = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onTabsDragStart = useCallback((e) => {
    const el = tabsRef.current;
    if (!el) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    tabsDrag.current = { active: true, startX: clientX, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    const onMove = (ev) => {
      if (!tabsDrag.current.active) return;
      const x = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0;
      el.scrollLeft = tabsDrag.current.scrollLeft - (x - tabsDrag.current.startX);
    };
    const onUp = () => {
      tabsDrag.current.active = false;
      el.style.cursor = 'grab';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  }, []);
  const dragRef   = useRef({ dragging: false, ox: 0, oy: 0 });
  const [pos, setPos]         = useState({ x: 16, y: null, bottom: 72 }); // bottom-left default
  const [size, setSize]       = useState({ w: 300, h: 420 });
  const [collapsed, setCollapsed] = useState(false);
  const [minimized, setMinimized] = useState(false); // just tab bar visible

  // ── Chat state ──
  const [channel, setChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [unread, setUnread]   = useState({});
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const ch = CHANNELS.find(c => c.id === channel) || CHANNELS[0];
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || guestName;
  const isNamed = !!displayName;

  // ── Drag logic ───────────────────────────────────────────────────
  const onDragStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.hud-msg-scroll')) return;
    e.preventDefault();
    const el = wrapRef.current;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      ox: (e.clientX || e.touches?.[0]?.clientX) - rect.left,
      oy: (e.clientY || e.touches?.[0]?.clientY) - rect.top,
    };
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = wrapRef.current?.offsetWidth || size.w;
      const h = wrapRef.current?.offsetHeight || size.h;
      const nx = Math.max(0, Math.min(vw - w, cx - dragRef.current.ox));
      const ny = Math.max(0, Math.min(vh - 40, cy - dragRef.current.oy));
      setPos({ x: nx, y: ny, bottom: null });
    };
    const onUp = () => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
      dragRef.current.dragging = false;
      document.body.style.userSelect = '';
    };
  }, [size.w, size.h]);

  // ── Load messages ─────────────────────────────────────────────
  useEffect(() => {
    if (!sb) return;
    setLoading(true);
    setMessages([]);
    let cancelled = false;

    sb.from('chat_messages_enriched')
      .select('*')
      .eq('channel_id', channel)
      .order('created_at', { ascending: true })
      .limit(80)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error) setMessages(data || []);
        setLoading(false);
      });

    // Realtime
    const sub = sb.channel(`chat:${channel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channel}` },
        (payload) => {
          if (cancelled) return;
          setMessages(prev => [...prev, payload.new]);
        }
      ).subscribe();

    return () => { cancelled = true; sub.unsubscribe(); };
  }, [channel]);

  // Track unread on channel switch
  const prevChannelRef = useRef(channel);
  useEffect(() => {
    if (prevChannelRef.current !== channel) {
      setUnread(u => ({ ...u, [prevChannelRef.current]: 0 }));
      prevChannelRef.current = channel;
    }
  }, [channel]);

  // Global listener for unread dots
  useEffect(() => {
    if (!sb) return;
    const subs = CHANNELS.filter(c => c.id !== channel).map(c => {
      return sb.channel(`chat_unread:${c.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${c.id}` },
          () => setUnread(u => ({ ...u, [c.id]: (u[c.id] || 0) + 1 }))
        ).subscribe();
    });
    return () => subs.forEach(s => s.unsubscribe());
  }, [channel]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ──────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !isNamed || ch.readOnly || !sb) return;
    setInput('');
    try {
      await sb.from('chat_messages').insert({
        channel_id:   channel,
        author_id:    user?.id || null,
        author_name:  displayName,
        author_badge: user?.id ? 'MEMBRE' : null,
        content:      text,
        reactions:    {},
      });
    } catch (e) { console.warn('chat send error', e); }
  }, [input, isNamed, channel, displayName, user, ch.readOnly]);

  // ── Computed pos ──────────────────────────────────────────────
  const wrapStyle = useMemo(() => {
    const base = {
      position: 'fixed',
      left: pos.x,
      width: size.w,
      zIndex: 500,
      fontFamily: F.h,
      pointerEvents: 'auto',  // explicite : le chat capte ses propres clics
    };
    if (pos.y !== null) base.top = pos.y;
    else { base.bottom = pos.bottom; }
    return base;
  }, [pos, size]);

  // ── Resize handle (bottom-right) ─────────────────────────────
  const resizeRef = useRef({ resizing: false, ox: 0, oy: 0, sw: 0, sh: 0 });
  const onResizeStart = useCallback((e) => {
    e.stopPropagation(); e.preventDefault();
    resizeRef.current = { resizing: true, ox: e.clientX, oy: e.clientY, sw: size.w, sh: size.h };
  }, [size]);
  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current.resizing) return;
      const dw = e.clientX - resizeRef.current.ox;
      const dh = e.clientY - resizeRef.current.oy;
      setSize({
        w: Math.max(240, Math.min(520, resizeRef.current.sw + dw)),
        h: Math.max(280, Math.min(700, resizeRef.current.sh + dh)),
      });
    };
    const onUp = () => { resizeRef.current.resizing = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // ── MINIMIZED: just a floating tab ───────────────────────────
  if (minimized) {
    return (
      <div
        ref={wrapRef}
        className="hud-chat-wrap"
        style={{ ...wrapStyle, width: 'auto' }}
      >
        <button
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          onClick={() => setMinimized(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 14px',
            background: DS.bg,
            border: `1px solid ${DS.border2}`,
            borderRadius: 6,
            color: DS.cyan, fontSize: 11, fontWeight: 700,
            fontFamily: F.mono, letterSpacing: '.10em',
            cursor: 'pointer',
            backdropFilter: 'blur(16px)',
            boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${DS.border}`,
          }}
        >
          <span style={{ fontSize: 13 }}>◈</span>
          CHAT
          {totalUnread > 0 && (
            <span style={{
              background: DS.rose, color: '#fff', borderRadius: 8,
              fontSize: 9, fontWeight: 800, padding: '1px 5px',
              animation: 'hudPulse 1.5s infinite',
            }}>{totalUnread}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="hud-chat-wrap"
      style={{
        ...wrapStyle,
        display: 'flex', flexDirection: 'column',
        height: collapsed ? 'auto' : size.h,
        background: DS.bg,
        border: `1px solid ${DS.border2}`,
        borderRadius: 8,
        overflow: 'hidden',
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px ${DS.border}, inset 0 1px 0 rgba(0,200,240,0.08)`,
        animation: 'hudFadeIn 0.2s ease',
      }}
    >
      {/* ── TOP ACCENT LINE ── */}
      <div style={{
        height: 1.5,
        background: `linear-gradient(90deg, transparent, ${ch.color}, ${ch.color}88, transparent)`,
        boxShadow: `0 0 6px ${ch.color}`,
        transition: 'all 0.3s',
      }} />

      {/* ── TITLEBAR (draggable) ── */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 8px 5px 10px',
          background: DS.bg2,
          borderBottom: `1px solid ${DS.border}`,
          cursor: 'grab', flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Drag handle dots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.35, marginRight: 3 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ display: 'flex', gap: 2 }}>
              <div style={{ width: 2, height: 2, borderRadius: '50%', background: DS.text }} />
              <div style={{ width: 2, height: 2, borderRadius: '50%', background: DS.text }} />
            </div>
          ))}
        </div>

        <span style={{ fontSize: 12, color: ch.color }}>{ch.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: DS.text, fontFamily: F.mono, letterSpacing: '.08em', flex: 1 }}>
          #{ch.label}
        </span>

        {/* ONLINE indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: DS.green, boxShadow: `0 0 5px ${DS.green}` }} />
          <span style={{ fontSize: 9, color: DS.green, fontFamily: F.mono }}>LIVE</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
          {[
            { icon: collapsed ? '▲' : '▼', action: () => setCollapsed(v => !v), title: collapsed ? 'Ouvrir' : 'Réduire' },
            { icon: '—', action: () => setMinimized(true), title: 'Minimiser' },
          ].map(({ icon, action, title }) => (
            <button key={icon} onClick={action} title={title} style={{
              width: 18, height: 18, borderRadius: 3,
              background: 'transparent', border: `1px solid ${DS.border}`,
              color: DS.muted, fontSize: 9, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, fontFamily: F.mono,
              transition: 'all 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = DS.border2; e.currentTarget.style.color = DS.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = DS.border; e.currentTarget.style.color = DS.muted; }}
            >{icon}</button>
          ))}
        </div>
      </div>

      {/* ── CHANNEL TABS ── */}
      <div
        ref={tabsRef}
        onMouseDown={onTabsDragStart}
        onTouchStart={onTabsDragStart}
        style={{
          display: 'flex', gap: 1, padding: '4px 6px',
          background: DS.bg2,
          borderBottom: `1px solid ${DS.border}`,
          overflowX: 'auto', flexShrink: 0,
          scrollbarWidth: 'none',
          cursor: 'grab',
          userSelect: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
        {CHANNELS.map(c => {
          const active = c.id === channel;
          const uCount = unread[c.id] || 0;
          return (
            <button
              key={c.id}
              className="hud-ch-tab"
              onClick={(e) => {
                // Ignorer si on vient de dragger (déplacement > 4px)
                if (tabsDrag.current.active) return;
                setChannel(c.id);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 4, flexShrink: 0,
                background: active ? `${c.color}18` : 'transparent',
                border: `1px solid ${active ? c.color + '55' : 'transparent'}`,
                color: active ? c.color : DS.muted,
                fontSize: 10, fontWeight: active ? 700 : 500,
                fontFamily: F.mono, letterSpacing: '.06em',
                cursor: 'pointer', transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 11 }}>{c.icon}</span>
              <span>{c.label}</span>
              {uCount > 0 && !active && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  background: DS.rose, color: '#fff',
                  borderRadius: '50%', width: 13, height: 13,
                  fontSize: 8, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}>{uCount > 9 ? '9+' : uCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── MESSAGES ── */}
      {!collapsed && (
        <>
          <div
            className="hud-msg-scroll"
            style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: DS.muted, fontFamily: F.mono, fontSize: 10 }}>
                <span style={{ animation: 'hudBlink 1s infinite', display: 'inline-block' }}>{ch.icon}</span>
                <div style={{ marginTop: 8 }}>CHARGEMENT…</div>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                <div style={{ fontSize: 28, color: ch.color, marginBottom: 8 }}>{ch.icon}</div>
                <div style={{ color: DS.muted, fontSize: 11, fontFamily: F.mono }}>Début de #{ch.label}</div>
                {!ch.readOnly && isNamed && (
                  <div style={{ color: DS.muted, fontSize: 10, marginTop: 8, opacity: 0.7 }}>Soyez le premier ↓</div>
                )}
              </div>
            ) : (
              messages.map(msg => (
                <ChatMsg key={msg.id} msg={msg} isOwn={msg.author_name === displayName} />
              ))
            )}
            <div ref={bottomRef} style={{ height: 4 }} />
          </div>

          {/* ── INPUT AREA ── */}
          <div style={{
            borderTop: `1px solid ${DS.border}`,
            background: DS.bg2, flexShrink: 0,
          }}>
            {ch.readOnly ? (
              <div style={{ padding: '8px 10px', textAlign: 'center', color: DS.muted, fontSize: 10, fontFamily: F.mono }}>
                📢 Lecture seule
              </div>
            ) : !isNamed ? (
              <GuestNameBar onSet={n => {
                try { localStorage.setItem('chat_guest_name', n); } catch {}
                setGuestName(n);
              }} />
            ) : (
              <div style={{ display: 'flex', gap: 5, padding: '5px 8px', alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  className="hud-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder={`Message #${ch.label}…`}
                  rows={1}
                  style={{
                    flex: 1, background: `${ch.color}08`,
                    border: `1px solid ${input ? ch.color + '40' : DS.border}`,
                    borderRadius: 4, padding: '6px 8px',
                    color: DS.text, fontSize: 11.5, fontFamily: F.h,
                    resize: 'none', lineHeight: 1.4,
                    transition: 'border-color 0.2s',
                    maxHeight: 80, overflowY: 'auto',
                  }}
                />
                <button
                  className="hud-send-btn"
                  onClick={send}
                  disabled={!input.trim()}
                  style={{
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                    background: input.trim() ? ch.color : DS.faint,
                    border: `1px solid ${input.trim() ? ch.color : DS.border}`,
                    color: input.trim() ? '#000' : DS.muted,
                    cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900,
                    opacity: input.trim() ? 0.9 : 0.5,
                    transition: 'all 0.15s',
                  }}
                >▶</button>
              </div>
            )}

            {/* Signed as */}
            {isNamed && !ch.readOnly && (
              <div style={{ padding: '2px 10px 5px', fontSize: 9, color: DS.muted, fontFamily: F.mono }}>
                <span style={{ opacity: 0.6 }}>connecté · </span>
                <span style={{ color: avatarColor(displayName) }}>{displayName}</span>
                <span style={{ opacity: 0.4 }}> · Entrée pour envoyer</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── RESIZE HANDLE ── */}
      {!collapsed && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 14, height: 14, cursor: 'nwse-resize',
            opacity: 0.35,
          }}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" style={{ position: 'absolute', bottom: 2, right: 2 }}>
            <line x1="8" y1="2" x2="2" y2="8" stroke={DS.cyan} strokeWidth="1" />
            <line x1="8" y1="5" x2="5" y2="8" stroke={DS.cyan} strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
}
