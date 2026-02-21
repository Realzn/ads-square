'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getSession, signOut, getAdvertiserProfile, getDashboardBookings,
  updateBookingContent, updateAdvertiserProfile, uploadBlockImage,
} from '../../lib/supabase-auth';
import { TIER_LABEL, TIER_PRICE, TIER_COLOR } from '../../lib/grid';

// ─── Design System ────────────────────────────────────────────
const U = {
  bg: '#080808', s1: '#0f0f0f', s2: '#121212', card: '#1a1a1a',
  card2: '#1f1f1f', border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)',
  faint: 'rgba(255,255,255,0.04)', accent: '#d4a84b',
  accentFg: '#080808', err: '#e05252', green: '#22c55e',
};
const F = { h: "'Clash Display','Syne',sans-serif", b: "'DM Sans','Inter',sans-serif" };

const inputStyle = (focused) => ({
  width: '100%', padding: '12px 14px', background: U.s1,
  border: `1px solid ${focused ? U.accent : U.border2}`,
  borderRadius: 8, color: U.text, fontSize: 14, outline: 'none',
  fontFamily: F.b, boxSizing: 'border-box', transition: 'border-color 0.2s',
});

// ─── Composants UI ────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.12em', marginBottom: 7 }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Btn({ onClick, children, variant = 'primary', size = 'md', disabled, style: extra }) {
  const base = {
    border: 'none', borderRadius: 8, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: F.b, transition: 'opacity 0.15s',
    opacity: disabled ? 0.5 : 1,
    padding: size === 'sm' ? '8px 14px' : '12px 20px',
    fontSize: size === 'sm' ? 13 : 14,
  };
  const variants = {
    primary: { background: U.accent, color: U.accentFg },
    secondary: { background: U.faint, color: U.text, border: `1px solid ${U.border2}` },
    danger: { background: 'rgba(224,82,82,0.12)', color: U.err, border: `1px solid rgba(224,82,82,0.3)` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...extra }}>
      {children}
    </button>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? U.err : U.green,
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      fontSize: 14, fontWeight: 600, fontFamily: F.b,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      animation: 'fadeIn 0.2s ease',
    }}>
      {msg}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    active:    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e',  label: 'Actif' },
    pending:   { bg: 'rgba(212,168,75,0.12)', color: U.accent,   label: 'En attente' },
    expired:   { bg: 'rgba(255,255,255,0.06)', color: U.muted,   label: 'Expiré' },
    cancelled: { bg: 'rgba(224,82,82,0.12)',  color: U.err,      label: 'Annulé' },
  }[status] || { bg: U.faint, color: U.muted, label: status };

  return (
    <span style={{
      background: cfg.bg, color: cfg.color, borderRadius: 6,
      padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── TAB : Mes Blocs ─────────────────────────────────────────
// ─── Boost Toggle ────────────────────────────────────────────
function BoostToggle({ booking, onToggled }) {
  const [loading, setLoading] = useState(false);
  const [boosted, setBoosted] = useState(!!booking.is_boosted);

  const handleToggle = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      await fetch(`${url}/rest/v1/bookings?id=eq.${booking.id}`, {
        method: 'PATCH',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_boosted: !boosted }),
      });
      setBoosted(b => !b);
      if (onToggled) onToggled(booking);
    } catch(err) { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={boosted ? 'Désactiver le boost ticker' : 'Apparaître dans la barre boost'}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        border: `1px solid ${boosted ? '#f0b42940' : '#ffffff18'}`,
        background: boosted ? '#f0b42912' : 'transparent',
        color: boosted ? '#f0b429' : 'rgba(255,255,255,0.3)',
        transition: 'all 0.2s',
      }}>
      <span style={{ fontSize: 11 }}>⚡</span>
      {loading ? '…' : boosted ? 'Boosté' : 'Booster'}
    </button>
  );
}

function TabMesBlocs({ bookings, onSelect, selectedId }) {
  const active  = bookings.filter(b => b.status === 'active');
  const others  = bookings.filter(b => b.status !== 'active');

  const BookingCard = ({ b }) => {
    const tier = b.tier || 'thousand';
    const color = TIER_COLOR[tier] || U.accent;
    const isSelected = b.id === selectedId;

    return (
      <div
        onClick={() => onSelect(b)}
        style={{
          background: isSelected ? `rgba(212,168,75,0.08)` : U.card2,
          border: `1px solid ${isSelected ? U.accent : U.border}`,
          borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
          transition: 'all 0.15s', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        {/* Bloc visuel */}
        <div style={{
          width: 44, height: 44, borderRadius: 8, flexShrink: 0,
          background: b.image_url ? `url(${b.image_url}) center/cover` : b.background_color || '#111',
          border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color,
        }}>
          {!b.image_url && (b.logo_initials || '??')}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: U.text, fontSize: 14 }}>{b.display_name}</span>
            <StatusBadge status={b.status} />
          </div>
          <div style={{ color: U.muted, fontSize: 12 }}>
            <span style={{ color }}>{TIER_LABEL[tier]}</span>
            {' · '}Position ({b.slot_x},{b.slot_y})
            {' · '}
            {b.start_date} → {b.end_date}
          </div>
        </div>

        {/* Stats rapides */}
        {b.status === 'active' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: U.text }}>{b.clicks}</div>
              <div style={{ fontSize: 11, color: U.muted }}>clics</div>
            </div>
            <BoostToggle booking={b} onToggled={onSelect} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: U.text, margin: '0 0 20px', fontFamily: F.h }}>
        Mes blocs publicitaires
      </h2>

      {bookings.length === 0 && (
        <div style={{
          background: U.card2, border: `1px solid ${U.border}`,
          borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◻</div>
          <div style={{ color: U.text, fontWeight: 600, marginBottom: 8 }}>Aucun bloc réservé</div>
          <div style={{ color: U.muted, fontSize: 14, marginBottom: 20 }}>
            Réservez votre premier espace publicitaire depuis la grille.
          </div>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 20px',
            background: U.accent, color: U.accentFg,
            borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14,
          }}>
            Explorer la grille →
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', marginBottom: 10 }}>
            ACTIFS ({active.length})
          </div>
          {active.map(b => <BookingCard key={b.id} b={b} />)}
        </>
      )}

      {others.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', margin: '20px 0 10px' }}>
            HISTORIQUE ({others.length})
          </div>
          {others.map(b => <BookingCard key={b.id} b={b} />)}
        </>
      )}
    </div>
  );
}


// ─── Composant : preview image avec validation de taille ─────
const IMAGE_RECS = {
  one:        { min: 500, warn: 300, label: '500×500px min' },
  ten:        { min: 300, warn: 200, label: '300×300px min' },
  corner_ten: { min: 300, warn: 200, label: '300×300px min' },
  hundred:    { min: 200, warn: 120, label: '200×200px min' },
  thousand:   null,
};

function ImagePreviewWithCheck({ src, tier }) {
  const [imgInfo, setImgInfo] = useState(null); // {w, h, ok, warn}
  const [loadErr, setLoadErr] = useState(false);
  const rec = IMAGE_RECS[tier];

  useEffect(() => {
    if (!src) return;
    setImgInfo(null);
    setLoadErr(false);
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const minDim = Math.min(w, h);
      const ok   = rec ? minDim >= rec.min : true;
      const warn = rec ? minDim >= rec.warn && minDim < rec.min : false;
      setImgInfo({ w, h, ok, warn });
    };
    img.onerror = () => setLoadErr(true);
    img.src = src;
  }, [src, tier]);

  if (loadErr) return (
    <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'#e5353512', border:'1px solid #e5353540', display:'flex', alignItems:'center', gap:8 }}>
      <span>⚠️</span>
      <span style={{ fontSize:11, color:'#e53535' }}>Image inaccessible ou URL invalide</span>
    </div>
  );

  return (
    <div>
      <div style={{ marginTop:8, borderRadius:8, overflow:'hidden', height:100, background:'#0d1828', border:`1px solid ${imgInfo ? (imgInfo.ok ? '#00e8a240' : imgInfo.warn ? '#f0b42940' : '#e5353540') : '#ffffff15'}` }}>
        <img src={src} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
      </div>
      {imgInfo && (
        <div style={{ marginTop:6, padding:'6px 10px', borderRadius:7, background: imgInfo.ok ? '#00e8a212' : imgInfo.warn ? '#f0b42912' : '#e5353512', border:`1px solid ${imgInfo.ok ? '#00e8a230' : imgInfo.warn ? '#f0b42930' : '#e5353530'}`, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13 }}>{imgInfo.ok ? '✅' : imgInfo.warn ? '⚠️' : '❌'}</span>
          <div>
            <span style={{ fontSize:11, fontWeight:700, color: imgInfo.ok ? '#00e8a2' : imgInfo.warn ? '#f0b429' : '#e53535' }}>
              {imgInfo.ok ? 'Taille parfaite' : imgInfo.warn ? 'Taille acceptable' : 'Image trop petite'}
            </span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginLeft:6 }}>
              {imgInfo.w}×{imgInfo.h}px{rec && !imgInfo.ok ? ` — recommandé : ${rec.label}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB : Éditer le bloc ────────────────────────────────────
function TabEditBloc({ booking, onSaved, showToast }) {
  const [form, setForm]     = useState({});
  const [category, setCat]  = useState('link');
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState('');

  const CATS = [
    {id:'video',    label:'Vidéo',      icon:'▶', color:'#e53935', urlLabel:'LIEN VIDÉO',        urlPh:'https://youtube.com/watch?v=…',  showImg:false, showSocial:false, showMusic:false},
    {id:'image',    label:'Image',      icon:'◻', color:'#8e24aa', urlLabel:'LIEN DESTINATION',   urlPh:'https://votresite.com',          showImg:true,  showSocial:false, showMusic:false},
    {id:'link',     label:'Lien',       icon:'⌖', color:'#1e88e5', urlLabel:'URL DESTINATION',    urlPh:'https://votresite.com',          showImg:false, showSocial:false, showMusic:false},
    {id:'social',   label:'Réseaux',    icon:'⊕', color:'#00acc1', urlLabel:'LIEN DU PROFIL',     urlPh:'https://instagram.com/…',        showImg:false, showSocial:true,  showMusic:false},
    {id:'music',    label:'Musique',    icon:'♪', color:'#1ed760', urlLabel:"LIEN D'ÉCOUTE",      urlPh:'https://open.spotify.com/…',     showImg:false, showSocial:false, showMusic:true },
    {id:'app',      label:'App',        icon:'⬡', color:'#43a047', urlLabel:"LIEN APP",           urlPh:'https://apps.apple.com/…',       showImg:true,  showSocial:false, showMusic:false},
    {id:'brand',    label:'Marque',     icon:'⬟', color:'#f0b429', urlLabel:'SITE MARQUE',        urlPh:'https://votremarque.com',        showImg:true,  showSocial:false, showMusic:false},
    {id:'clothing', label:'Vêtements',  icon:'◎', color:'#f4511e', urlLabel:'LIEN COLLECTION',    urlPh:'https://boutique.com',           showImg:true,  showSocial:false, showMusic:false},
    {id:'lifestyle',label:'Lifestyle',  icon:'❋', color:'#00bfa5', urlLabel:'LIEN DESTINATION',   urlPh:'https://votrecontenu.com',       showImg:true,  showSocial:false, showMusic:false},
    {id:'text',     label:'Publication',icon:'≡', color:'#90a4ae', urlLabel:"LIEN ARTICLE",       urlPh:'https://medium.com/…',           showImg:false, showSocial:false, showMusic:false},
  ];
  const SOCIALS = [
    {id:'instagram',label:'Instagram',color:'#e1306c',e:'📸'},{id:'tiktok',label:'TikTok',color:'#69c9d0',e:'🎵'},
    {id:'x',label:'X/Twitter',color:'#1d9bf0',e:'✕'},{id:'youtube',label:'YouTube',color:'#ff0000',e:'▶'},
    {id:'linkedin',label:'LinkedIn',color:'#0a66c2',e:'💼'},{id:'snapchat',label:'Snapchat',color:'#fffc00',e:'👻'},
    {id:'twitch',label:'Twitch',color:'#9146ff',e:'🎮'},{id:'discord',label:'Discord',color:'#5865f2',e:'💬'},
  ];
  const MUSIC_PLATS = [
    {id:'spotify',label:'Spotify',color:'#1ed760',e:'🎵'},{id:'apple_music',label:'Apple Music',color:'#fc3c44',e:'🍎'},
    {id:'soundcloud',label:'SoundCloud',color:'#ff5500',e:'☁'},{id:'deezer',label:'Deezer',color:'#a238ff',e:'🎶'},
    {id:'youtube_music',label:'YT Music',color:'#ff0000',e:'▶'},{id:'bandcamp',label:'Bandcamp',color:'#1da0c3',e:'🎸'},
  ];

  useEffect(() => {
    if (!booking) return;
    const c = booking.content_type || 'link';
    setCat(c);
    setForm({
      display_name:    booking.display_name || '',
      slogan:          booking.slogan || '',
      description:     booking.description || '',
      cta_url:         booking.cta_url || '',
      cta_text:        booking.cta_text || 'Visiter',
      primary_color:   booking.primary_color || '',
      background_color:booking.background_color || '#0d1828',
      image_url:       booking.image_url || '',
      social_network:  '',
      music_platform:  '',
    });
  }, [booking?.id]);

  if (!booking) return (
    <div style={{ textAlign: 'center', padding: 60, color: U.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>◻</div>
      Sélectionnez un bloc dans "Mes blocs" pour l'éditer.
    </div>
  );

  const tier  = booking.tier || 'thousand';
  const color = TIER_COLOR[tier];
  const cat   = CATS.find(c => c.id === category) || CATS[2];
  const selSocial = SOCIALS.find(s => s.id === form.social_network);
  const selMusic  = MUSIC_PLATS.find(p => p.id === form.music_platform);
  const blockColor = form.primary_color || selSocial?.color || selMusic?.color || cat.color;
  const canEdit = ['active', 'pending'].includes(booking.status);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const iStyle = (f) => ({
    width:'100%', padding:'11px 13px', background:U.s1,
    border:`1px solid ${f ? U.accent : U.border2}`,
    borderRadius:8, color:U.text, fontSize:13, outline:'none',
    fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box',
    transition:'border-color 0.2s', opacity: canEdit ? 1 : 0.5,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBookingContent(booking.id, {
        content_type:     category,
        display_name:     form.display_name,
        slogan:           form.slogan,
        description:      form.description,
        cta_url:          form.cta_url,
        cta_text:         form.cta_text,
        image_url:        form.image_url,
        primary_color:    blockColor,
        background_color: form.background_color,
        badge:            cat.label.toUpperCase(),
        logo_initials:    (form.display_name||'??').substring(0,2).toUpperCase(),
      });
      showToast('Bloc mis à jour ! Visible sur la grille.', 'success');
      onSaved();
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error');
    } finally { setSaving(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:U.text, margin:'0 0 4px', fontFamily:F.h }}>Contenu du bloc</h2>
          <div style={{ color:U.muted, fontSize:13 }}>
            <span style={{ color }}>{TIER_LABEL[tier]}</span>
            {" · "}Position ({booking.slot_x},{booking.slot_y})
            {" · "}<StatusBadge status={booking.status} />
          </div>
        </div>
        {canEdit && <Btn onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde…' : 'Sauvegarder →'}</Btn>}
      </div>

      {!canEdit && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${U.border}`, borderRadius:10, padding:'12px 16px', marginBottom:20, color:U.muted, fontSize:13 }}>
          ℹ Ce bloc est {booking.status} — l'édition est désactivée.
        </div>
      )}

      {/* ─── CATÉGORIE ─── */}
      <div style={{ marginBottom:24 }}>
        <Label>CATÉGORIE DU BLOC</Label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {CATS.map(c => (
            <button key={c.id} disabled={!canEdit}
              onClick={() => { setCat(c.id); set('primary_color', ''); }}
              style={{ padding:'6px 11px', borderRadius:8, border:`1px solid ${category===c.id?c.color:U.border2}`, background:category===c.id?c.color+'15':'transparent', color:category===c.id?c.color:U.muted, fontSize:12, fontWeight:category===c.id?700:400, cursor:canEdit?'pointer':'default', display:'flex', alignItems:'center', gap:5, transition:'all 0.15s' }}>
              <span>{c.icon}</span><span>{c.label}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize:11, color:U.muted, marginTop:6 }}>{cat.label} — {
          cat.id==='video'?'YouTube, TikTok, Reels…':
          cat.id==='social'?'Instagram, TikTok, X, LinkedIn…':
          cat.id==='music'?'Spotify, Apple Music, SoundCloud…':
          cat.id==='app'?'App Store, Google Play ou PWA':
          'Image mise en valeur + lien de destination'
        }</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Colonne gauche — champs adaptatifs */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          <Field label="NOM / TITRE">
            <input type="text" value={form.display_name||''} disabled={!canEdit} maxLength={40}
              onChange={e => set('display_name', e.target.value)}
              onFocus={() => setFocused('dn')} onBlur={() => setFocused('')}
              placeholder={cat.id==='social'?'Votre pseudo':cat.id==='music'?'Artiste / titre':'Votre nom ou marque'}
              style={iStyle(focused==='dn')} />
          </Field>

          <Field label="ACCROCHE">
            <input type="text" value={form.slogan||''} disabled={!canEdit} maxLength={80}
              onChange={e => set('slogan', e.target.value)}
              onFocus={() => setFocused('sl')} onBlur={() => setFocused('')}
              placeholder={
                cat.id==='video'?'Nouvelle vidéo chaque semaine !':
                cat.id==='social'?'Suivez mes aventures ✨':
                cat.id==='music'?'Nouveau single disponible':
                cat.id==='clothing'?'Nouvelle collection 2025':
                'Votre accroche en une phrase…'
              }
              style={iStyle(focused==='sl')} />
          </Field>

          {/* ── Description libre ── */}
          <Field label="DESCRIPTION">
            <div style={{ position: 'relative' }}>
              <textarea
                value={form.description || ''}
                disabled={!canEdit}
                maxLength={500}
                rows={4}
                onChange={e => set('description', e.target.value)}
                onFocus={() => setFocused('desc')} onBlur={() => setFocused('')}
                placeholder={
                  cat.id === 'video'  ? "Raconte ce que tu crées, pourquoi tu le crées, à qui ça s'adresse…" :
                  cat.id === 'social' ? "Qui tu es, ce que tu partages, pourquoi te suivre…" :
                  cat.id === 'music'  ? "Ton univers musical, ton parcours, ce que tu prépares…" :
                  cat.id === 'brand'  ? "L'histoire de ta marque, ta mission, ce qui te différencie…" :
                  "Raconte ton histoire, ton projet, ce qui va donner envie de cliquer…"
                }
                style={{
                  ...iStyle(focused === 'desc'),
                  resize: 'vertical',
                  lineHeight: 1.6,
                  minHeight: 90,
                  paddingBottom: 24,
                  fontFamily: "'DM Sans',sans-serif",
                }}
              />
              <div style={{
                position: 'absolute', bottom: 8, right: 10,
                fontSize: 10,
                color: (form.description?.length || 0) > 450 ? '#ff6b6b' : 'rgba(255,255,255,0.22)',
                fontFamily: 'monospace',
                pointerEvents: 'none',
                transition: 'color 0.2s',
              }}>
                {form.description?.length || 0}/500
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5, lineHeight: 1.5 }}>
              Affiché dans ton <strong style={{ color: 'rgba(255,255,255,0.5)' }}>profil</strong> — raconte ton histoire ou incite au clic.
            </div>
          </Field>

          {/* Réseau social picker */}
          {cat.showSocial && (
            <Field label="RÉSEAU SOCIAL">
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {SOCIALS.map(s => (
                  <button key={s.id} disabled={!canEdit}
                    onClick={() => { set('social_network', s.id); set('primary_color', s.color); }}
                    style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${form.social_network===s.id?s.color:U.border2}`, background:form.social_network===s.id?s.color+'18':'transparent', color:form.social_network===s.id?s.color:U.muted, fontSize:11, fontWeight:600, cursor:canEdit?'pointer':'default', display:'flex', alignItems:'center', gap:4 }}>
                    {s.e} {s.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* Musique picker */}
          {cat.showMusic && (
            <Field label="PLATEFORME MUSICALE">
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {MUSIC_PLATS.map(p => (
                  <button key={p.id} disabled={!canEdit}
                    onClick={() => { set('music_platform', p.id); set('primary_color', p.color); }}
                    style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${form.music_platform===p.id?p.color:U.border2}`, background:form.music_platform===p.id?p.color+'18':'transparent', color:form.music_platform===p.id?p.color:U.muted, fontSize:11, fontWeight:600, cursor:canEdit?'pointer':'default', display:'flex', alignItems:'center', gap:4 }}>
                    {p.e} {p.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label={cat.urlLabel}>
            <input type="url" value={form.cta_url||''} disabled={!canEdit}
              onChange={e => set('cta_url', e.target.value)}
              onFocus={() => setFocused('url')} onBlur={() => setFocused('')}
              placeholder={cat.urlPh} style={iStyle(focused==='url')} />
            <div style={{ fontSize:11, color:U.muted, marginTop:4 }}>
              {cat.id==='social'?'Lien direct vers votre profil':
               cat.id==='video'?'YouTube, TikTok, Vimeo, Twitch…':
               cat.id==='music'?'Spotify, Apple Music, SoundCloud…':
               'Où l\'utilisateur arrive en cliquant'}
            </div>
          </Field>

          <Field label="TEXTE DU BOUTON CTA">
            <input type="text" value={form.cta_text||''} disabled={!canEdit}
              onChange={e => set('cta_text', e.target.value)}
              onFocus={() => setFocused('cta')} onBlur={() => setFocused('')}
              placeholder={
                cat.id==='video'?'Regarder':cat.id==='music'?'Écouter':
                cat.id==='app'?'Télécharger':cat.id==='social'?'Suivre':'Visiter'
              }
              style={iStyle(focused==='cta')} />
          </Field>

          {/* Couleurs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="COULEUR PRINCIPALE">
              <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                <input type="color" value={form.primary_color||cat.color} disabled={!canEdit}
                  onChange={e => set('primary_color', e.target.value)}
                  style={{ width:36, height:36, borderRadius:6, border:`1px solid ${U.border2}`, cursor:canEdit?'pointer':'default', background:'none', flexShrink:0 }} />
                <input type="text" value={form.primary_color||''} disabled={!canEdit}
                  onChange={e => set('primary_color', e.target.value)}
                  placeholder={cat.color} style={{ ...iStyle(false), flex:1 }} />
              </div>
            </Field>
            <Field label="COULEUR DE FOND">
              <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                <input type="color" value={form.background_color||'#0d1828'} disabled={!canEdit}
                  onChange={e => set('background_color', e.target.value)}
                  style={{ width:36, height:36, borderRadius:6, border:`1px solid ${U.border2}`, cursor:canEdit?'pointer':'default', background:'none', flexShrink:0 }} />
                <input type="text" value={form.background_color||''} disabled={!canEdit}
                  onChange={e => set('background_color', e.target.value)}
                  placeholder="#0d1828" style={{ ...iStyle(false), flex:1 }} />
              </div>
            </Field>
          </div>
        </div>

        {/* Colonne droite — image + aperçu */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Image : url pour toutes catégories visuelles */}
          {cat.showImg && (
            <Field label="IMAGE / VISUEL (URL)">
              <input type="url" value={form.image_url||''} disabled={!canEdit}
                onChange={e => set('image_url', e.target.value)}
                onFocus={() => setFocused('img')} onBlur={() => setFocused('')}
                placeholder="https://exemple.com/image.jpg"
                style={iStyle(focused==='img')} />
              {/* Recommandation de taille selon le tier */}
              {(() => {
                const rec = IMAGE_RECS[booking.tier];
                if (!rec) return null;
                return (
                  <div style={{ marginTop:6, padding:'7px 10px', borderRadius:7, background:'#f0b42912', border:'1px solid #f0b42930', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14 }}>📐</span>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#f0b429' }}>Taille recommandée : {rec.label}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Ratio 1:1 (carré) — JPG, PNG ou WEBP</div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ fontSize:11, color:U.muted, marginTop:4 }}>URL directe vers une image JPG, PNG, WEBP</div>
              {form.image_url && (
                <ImagePreviewWithCheck src={form.image_url} tier={booking.tier} />
              )}
              {!form.image_url && (
                <div style={{ marginTop:8, borderRadius:8, height:100, background:U.s1, border:`2px dashed ${U.border2}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:4 }}>
                  <div style={{ fontSize:22, color:U.muted }}>{cat.icon}</div>
                  <div style={{ fontSize:11, color:U.muted }}>Collez une URL d'image ci-dessus</div>
                </div>
              )}
            </Field>
          )}

          {/* Aperçu du bloc */}
          <Field label="APERÇU EN TEMPS RÉEL">
            <div style={{ borderRadius:10, background:form.background_color||'#0d1828', border:`1px solid ${blockColor}30`, padding:16, boxShadow:`0 0 24px ${blockColor}12` }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:8, flexShrink:0, background:form.image_url?`url(${form.image_url}) center/cover`:`${blockColor}18`, border:`2px solid ${blockColor}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:blockColor, overflow:'hidden' }}>
                  {!form.image_url && (selSocial?.e || selMusic?.e || cat.icon)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:blockColor, marginBottom:3 }}>{form.display_name||'Votre titre'}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{form.slogan||'Votre accroche…'}</div>
                </div>
                <div style={{ fontSize:9, fontWeight:700, color:blockColor, padding:'3px 8px', background:`${blockColor}15`, borderRadius:5, border:`1px solid ${blockColor}30`, flexShrink:0 }}>{cat.label.toUpperCase()}</div>
              </div>
              <div style={{ padding:'8px 14px', borderRadius:7, background:`${blockColor}15`, border:`1px solid ${blockColor}30`, textAlign:'center', color:blockColor, fontSize:12, fontWeight:700 }}>
                {form.cta_text||'Visiter'} →
              </div>
            </div>
          </Field>

          <div style={{ padding:'12px 14px', background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:10, fontSize:12, color:'rgba(34,197,94,0.8)' }}>
            ✓ Les modifications sont <strong>immédiatement visibles sur la grille</strong> après sauvegarde.
          </div>
        </div>
      </div>

      {canEdit && (
        <div style={{ marginTop:20 }}>
          <Btn onClick={handleSave} disabled={saving} style={{ width:'100%', textAlign:'center' }}>
            {saving ? 'Sauvegarde en cours…' : '✓ Sauvegarder — mettre à jour le bloc sur la grille'}
          </Btn>
        </div>
      )}
    </div>
  );
}


// ─── TAB : Analytics ─────────────────────────────────────────
function TabAnalytics({ booking }) {
  if (!booking) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: U.muted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        Sélectionnez un bloc pour voir ses analytics.
      </div>
    );
  }

  const stats = [
    { label: 'Impressions totales', value: booking.impressions || 0, icon: '👁' },
    { label: 'Clics totaux',        value: booking.clicks || 0,      icon: '↗' },
    { label: 'CTR',                 value: `${booking.ctr_pct || 0}%`, icon: '%' },
    { label: 'Clics (7 derniers j)', value: booking.clicks_7d || 0,  icon: '📅' },
  ];

  const daysLeft = booking.end_date
    ? Math.max(0, Math.ceil((new Date(booking.end_date) - new Date()) / 86400000))
    : 0;

  const totalDays = booking.start_date && booking.end_date
    ? Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000)
    : 30;

  const elapsed = totalDays - daysLeft;
  const progress = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: U.text, margin: '0 0 20px', fontFamily: F.h }}>
        Analytics — {booking.display_name}
      </h2>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: U.card2, border: `1px solid ${U.border}`,
            borderRadius: 12, padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: U.text, marginBottom: 4, fontFamily: F.h }}>
              {typeof s.value === 'number' ? s.value.toLocaleString('fr-FR') : s.value}
            </div>
            <div style={{ fontSize: 12, color: U.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Durée restante */}
      <div style={{
        background: U.card2, border: `1px solid ${U.border}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, color: U.text }}>Durée de la campagne</span>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: daysLeft < 5 ? U.err : U.green,
          }}>
            {daysLeft > 0 ? `${daysLeft} jours restants` : 'Expiré'}
          </span>
        </div>
        <div style={{ background: U.s1, borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, progress)}%`, height: '100%',
            background: daysLeft < 5 ? U.err : U.accent,
            borderRadius: 6, transition: 'width 0.4s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: U.muted }}>{booking.start_date}</span>
          <span style={{ fontSize: 12, color: U.muted }}>{booking.end_date}</span>
        </div>
      </div>

      {/* Renouveler */}
      {booking.status === 'active' && daysLeft < 8 && (
        <div style={{
          background: 'rgba(212,168,75,0.08)', border: `1px solid rgba(212,168,75,0.25)`,
          borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, color: U.accent, marginBottom: 4 }}>⚡ Renouvelez bientôt</div>
            <div style={{ color: U.muted, fontSize: 13 }}>
              Il reste {daysLeft} jours. Renouvelez pour garder votre position.
            </div>
          </div>
          <Link href="/" style={{
            padding: '10px 18px', background: U.accent, color: U.accentFg,
            borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap',
          }}>
            Renouveler →
          </Link>
        </div>
      )}

      {/* Infos du booking */}
      <div style={{
        background: U.card2, border: `1px solid ${U.border}`,
        borderRadius: 12, padding: '16px 20px', marginTop: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          DÉTAILS DU BOOKING
        </div>
        {[
          ['Tier', TIER_LABEL[booking.tier]],
          ['Position', `(${booking.slot_x}, ${booking.slot_y})`],
          ['Montant payé', `€${((booking.amount_cents || 0) / 100).toFixed(2)}`],
          ['ID Booking', booking.id?.slice(0, 8) + '…'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${U.border}` }}>
            <span style={{ color: U.muted, fontSize: 13 }}>{k}</span>
            <span style={{ color: U.text, fontSize: 13, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB : Profil ────────────────────────────────────────────
function TabProfil({ advertiser, onSaved, showToast }) {
  const [form, setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState('');

  useEffect(() => {
    if (!advertiser) return;
    setForm({
      display_name:  advertiser.display_name || '',
      bio:           advertiser.bio || '',
      profile_type:  advertiser.profile_type || 'creator',
      website_url:   advertiser.website_url || '',
      instagram_url: advertiser.instagram_url || '',
      tiktok_url:    advertiser.tiktok_url || '',
      twitter_url:   advertiser.twitter_url || '',
      youtube_url:   advertiser.youtube_url || '',
      linkedin_url:  advertiser.linkedin_url || '',
    });
  }, [advertiser?.id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdvertiserProfile(advertiser.id, form);
      showToast('Profil mis à jour !', 'success');
      onSaved();
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error');
    } finally { setSaving(false); }
  };

  if (!advertiser) return null;

  const socials = [
    { key: 'instagram_url', label: 'Instagram', icon: '◎', placeholder: 'https://instagram.com/…' },
    { key: 'tiktok_url',    label: 'TikTok',    icon: '♪', placeholder: 'https://tiktok.com/@…' },
    { key: 'twitter_url',   label: 'X / Twitter', icon: '✕', placeholder: 'https://x.com/…' },
    { key: 'youtube_url',   label: 'YouTube',   icon: '▶', placeholder: 'https://youtube.com/@…' },
    { key: 'linkedin_url',  label: 'LinkedIn',  icon: '⊡', placeholder: 'https://linkedin.com/in/…' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: U.text, margin: 0, fontFamily: F.h }}>
          Mon profil
        </h2>
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder →'}
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Colonne gauche — infos générales */}
        <div>
          <Field label="NOM / MARQUE">
            <input type="text" value={form.display_name || ''}
              onChange={e => set('display_name', e.target.value)}
              onFocus={() => setFocused('dn')} onBlur={() => setFocused('')}
              style={inputStyle(focused === 'dn')} placeholder="Votre nom ou marque" />
          </Field>

          <Field label="BIO">
            <textarea value={form.bio || ''}
              onChange={e => set('bio', e.target.value)}
              onFocus={() => setFocused('bio')} onBlur={() => setFocused('')}
              rows={4} placeholder="Décrivez votre activité…"
              style={{ ...inputStyle(focused === 'bio'), resize: 'vertical', lineHeight: 1.5 }} />
          </Field>

          <Field label="SITE WEB">
            <input type="url" value={form.website_url || ''}
              onChange={e => set('website_url', e.target.value)}
              onFocus={() => setFocused('web')} onBlur={() => setFocused('')}
              style={inputStyle(focused === 'web')} placeholder="https://votresite.com" />
          </Field>

          <Field label="TYPE DE PROFIL">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { val: 'creator', label: '🎨 Créateur' },
                { val: 'freelance', label: '🧾 Freelance' },
                { val: 'brand', label: '🏢 Marque' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('profile_type', opt.val)}
                  style={{
                    padding: '9px 14px', borderRadius: 8, border: `1px solid ${form.profile_type === opt.val ? U.accent : U.border}`,
                    background: form.profile_type === opt.val ? 'rgba(212,168,75,0.12)' : 'transparent',
                    color: form.profile_type === opt.val ? U.accent : U.muted,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <div style={{ padding: '14px 16px', background: U.faint, borderRadius: 8, fontSize: 13, color: U.muted }}>
            <strong style={{ color: U.text }}>Email :</strong> {advertiser.email}
            <br />
            <span style={{ fontSize: 11 }}>L'email ne peut pas être modifié.</span>
          </div>
        </div>

        {/* Colonne droite — réseaux sociaux */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', marginBottom: 16 }}>
            RÉSEAUX SOCIAUX
          </div>
          {socials.map(s => (
            <Field key={s.key} label={s.label}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 7, background: U.s1,
                  border: `1px solid ${U.border}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: U.muted, fontSize: 14, flexShrink: 0,
                }}>{s.icon}</div>
                <input type="url" value={form[s.key] || ''}
                  onChange={e => set(s.key, e.target.value)}
                  onFocus={() => setFocused(s.key)} onBlur={() => setFocused('')}
                  style={{ ...inputStyle(focused === s.key), flex: 1 }}
                  placeholder={s.placeholder} />
              </div>
            </Field>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB : Paiements ─────────────────────────────────────────
function TabPaiements({ bookings }) {
  const sorted = [...bookings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = bookings.reduce((sum, b) => sum + (b.amount_cents || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: U.text, margin: 0, fontFamily: F.h }}>
          Historique des paiements
        </h2>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: U.accent, fontFamily: F.h }}>
            €{(total / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: U.muted }}>total investi</div>
        </div>
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: U.muted }}>Aucun paiement enregistré.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(b => (
          <div key={b.id} style={{
            background: U.card2, border: `1px solid ${U.border}`,
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: TIER_COLOR[b.tier] + '18',
              border: `1.5px solid ${TIER_COLOR[b.tier] || U.accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>◻</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: U.text, fontSize: 14 }}>{b.display_name}</span>
                <StatusBadge status={b.status} />
              </div>
              <div style={{ color: U.muted, fontSize: 12 }}>
                {TIER_LABEL[b.tier]} · Bloc ({b.slot_x},{b.slot_y}) · {b.start_date} → {b.end_date}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: U.text }}>
                €{((b.amount_cents || 0) / 100).toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: U.muted }}>
                {new Date(b.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>

            {/* Renouveler */}
            {b.status === 'active' && (
              <Link href={`/?slot=${b.slot_x}-${b.slot_y}`} style={{
                padding: '8px 14px', background: 'rgba(212,168,75,0.1)',
                border: `1px solid rgba(212,168,75,0.3)`,
                color: U.accent, borderRadius: 8, fontSize: 12,
                fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                Renouveler
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────

// ─── TAB : Offres reçues ─────────────────────────────────────
function TabOffres({ bookings, userId, showToast }) {
  const [offers, setOffers]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [responding, setResp]   = useState(null); // offerId being processed

  useEffect(() => {
    if (!bookings?.length) { setLoading(false); return; }
    const ids = bookings.map(b => b.id);
    // Fetch pending offers on all my bookings
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setLoading(false); return; }
    const idsStr = ids.map(id => `"${id}"`).join(',');
    fetch(`${url}/rest/v1/slot_offers?select=*&target_booking_id=in.(${ids.join(',')})&status=in.(pending)&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    }).then(r => r.json()).then(data => {
      setOffers(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookings]);

  const handleRespond = async (offerId, action) => {
    setResp(offerId);
    try {
      const res = await fetch('/api/offers/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, action, userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      showToast(action === 'accept' ? '✅ Offre acceptée !' : '❌ Offre refusée', action === 'accept' ? 'success' : 'info');
      setOffers(prev => prev.filter(o => o.id !== offerId));
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error');
    } finally {
      setResp(null);
    }
  };

  if (loading) return <div style={{ color: U.muted, padding: 32, textAlign:'center' }}>Chargement…</div>;

  if (!offers.length) return (
    <div style={{ textAlign:'center', padding:'48px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
      <div style={{ color: U.text, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Aucune offre en attente</div>
      <div style={{ color: U.muted, fontSize: 13 }}>Les offres de rachat sur vos blocs apparaîtront ici.</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 18, color: U.text, marginBottom: 6 }}>Offres reçues</div>
      <div style={{ color: U.muted, fontSize: 12, marginBottom: 24 }}>{offers.length} offre{offers.length > 1 ? 's' : ''} en attente · Expire sous 72h</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {offers.map(o => {
          const booking = bookings?.find(b => b.id === o.target_booking_id);
          const euros   = (o.offer_amount_cents / 100).toLocaleString('fr-FR', { style:'currency', currency:'EUR' });
          const hoursLeft = Math.max(0, Math.round((new Date(o.expires_at) - new Date()) / 3600000));
          const isProc = responding === o.id;
          return (
            <div key={o.id} style={{ borderRadius: 12, background: U.s1, border: `1px solid ${U.border2}`, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${U.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ color: U.text, fontWeight: 700, fontSize: 15 }}>{o.buyer_name || o.buyer_email}</div>
                  <div style={{ color: U.muted, fontSize: 11, marginTop: 2 }}>
                    {o.buyer_email} · Bloc ({o.slot_x},{o.slot_y})
                    {booking && <span style={{ color: U.accent }}> · {booking.display_name || ''}</span>}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color: U.accent, fontWeight: 800, fontSize: 22 }}>{euros}</div>
                  <div style={{ color: hoursLeft < 12 ? '#e53535' : U.muted, fontSize: 10 }}>⏱ {hoursLeft}h restantes</div>
                </div>
              </div>
              {/* Message */}
              {o.message && (
                <div style={{ padding: '10px 18px', background: U.faint, borderBottom: `1px solid ${U.border}` }}>
                  <div style={{ fontSize: 10, color: U.muted, fontWeight: 600, marginBottom: 4 }}>MESSAGE</div>
                  <div style={{ fontSize: 13, color: U.text, lineHeight: 1.6, fontStyle:'italic' }}>"{o.message}"</div>
                </div>
              )}
              {/* Actions */}
              <div style={{ padding: '12px 18px', display:'flex', gap: 10 }}>
                <button
                  disabled={isProc}
                  onClick={() => handleRespond(o.id, 'accept')}
                  style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background: isProc ? U.s2 : U.accent, color: isProc ? U.muted : U.accentFg, fontWeight:700, fontSize:13, cursor: isProc ? 'wait' : 'pointer', boxShadow: isProc ? 'none' : `0 0 18px ${U.accent}40` }}>
                  {isProc ? '…' : '✅ Accepter'}
                </button>
                <button
                  disabled={isProc}
                  onClick={() => handleRespond(o.id, 'reject')}
                  style={{ flex:1, padding:'10px', borderRadius:8, border:`1px solid ${U.border2}`, background:'transparent', color: U.muted, fontWeight:600, fontSize:13, cursor: isProc ? 'wait' : 'pointer' }}>
                  ❌ Refuser
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession]         = useState(null);
  const [advertiser, setAdvertiser]   = useState(null);
  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('blocs');
  const [selectedBooking, setSelected] = useState(null);
  const [toast, setToast]             = useState({ msg: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  }, []);

  const loadData = useCallback(async () => {
    const [adv, bkgs] = await Promise.all([getAdvertiserProfile(), getDashboardBookings()]);
    setAdvertiser(adv);
    setBookings(bkgs);
    // Keep selected booking in sync
    if (selectedBooking) {
      const updated = bkgs.find(b => b.id === selectedBooking.id);
      if (updated) setSelected(updated);
    }
  }, [selectedBooking?.id]);

  useEffect(() => {
    getSession().then(s => {
      if (!s) { router.replace('/dashboard/login'); return; }
      setSession(s);
      setLoading(false);
      loadData();
    });
  }, []);

  const handleSelectBooking = (b) => {
    setSelected(b);
    setActiveTab('edit');
  };

  const tabs = [
    { id: 'blocs',     label: 'Mes blocs',    icon: '◻' },
    { id: 'edit',      label: 'Contenu',       icon: '✏' },
    { id: 'analytics', label: 'Analytics',     icon: '📊' },
    { id: 'offres',    label: 'Offres reçues', icon: '💬' },
    { id: 'profil',    label: 'Profil',        icon: '👤' },
    { id: 'paiements', label: 'Paiements',     icon: '💳' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: U.muted, fontFamily: F.b }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: U.bg, fontFamily: F.b, display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{
        background: U.s1, borderBottom: `1px solid ${U.border}`,
        padding: '0 24px', display: 'flex', alignItems: 'center',
        gap: 16, height: 56, flexShrink: 0,
      }}>
        <Link href="/" style={{
          fontSize: 16, fontWeight: 800, color: U.accent,
          textDecoration: 'none', letterSpacing: '0.06em', fontFamily: F.h,
        }}>
          ADS-SQUARE
        </Link>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ color: U.muted, fontSize: 13 }}>Espace client</span>
        <div style={{ flex: 1 }} />

        {/* User + signout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(212,168,75,0.15)', border: `1.5px solid ${U.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: U.accent,
          }}>
            {(advertiser?.display_name || session?.user?.email || '?')[0].toUpperCase()}
          </div>
          <span style={{ color: U.text, fontSize: 13 }}>
            {advertiser?.display_name || session?.user?.email}
          </span>
          <Btn variant="secondary" size="sm" onClick={async () => { await signOut(); router.replace('/dashboard/login'); }}>
            Déconnexion
          </Btn>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: 220, background: U.s1, borderRight: `1px solid ${U.border}`,
          padding: '20px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 9, border: 'none',
                background: activeTab === tab.id ? 'rgba(212,168,75,0.1)' : 'transparent',
                color: activeTab === tab.id ? U.accent : U.muted,
                fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                borderLeft: activeTab === tab.id ? `2px solid ${U.accent}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Bloc sélectionné */}
          {selectedBooking && (
            <div style={{
              background: U.faint, border: `1px solid ${U.border}`,
              borderRadius: 8, padding: '10px 12px', fontSize: 12,
            }}>
              <div style={{ color: U.muted, marginBottom: 4, fontSize: 10, letterSpacing: '0.1em', fontWeight: 700 }}>
                BLOC SÉLECTIONNÉ
              </div>
              <div style={{ color: U.text, fontWeight: 600 }}>{selectedBooking.display_name}</div>
              <div style={{ color: U.muted }}>({selectedBooking.slot_x},{selectedBooking.slot_y})</div>
            </div>
          )}

          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', color: U.muted, fontSize: 13,
            textDecoration: 'none', borderRadius: 8,
          }}>
            ← Retour à la grille
          </Link>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
          {activeTab === 'blocs' && (
            <TabMesBlocs bookings={bookings} onSelect={handleSelectBooking} selectedId={selectedBooking?.id} />
          )}
          {activeTab === 'edit' && (
            <TabEditBloc booking={selectedBooking} onSaved={loadData} showToast={showToast} />
          )}
          {activeTab === 'analytics' && (
            <TabAnalytics booking={selectedBooking} />
          )}
          {activeTab === 'profil' && (
            <TabProfil advertiser={advertiser} onSaved={loadData} showToast={showToast} />
          )}
          {activeTab === 'offres' && (
            <TabOffres bookings={bookings} userId={session?.user?.id} showToast={showToast} />
          )}
          {activeTab === 'paiements' && (
            <TabPaiements bookings={bookings} />
          )}
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
