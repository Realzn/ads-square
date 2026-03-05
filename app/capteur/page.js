'use client';
// app/capteur/page.js
// LE CAPTEUR — Panneau photovoltaïque de la Sphère de Dyson
// En mode normal : absorbe l'énergie de l'étoile
// En mode émission : devient votre panneau pendant quelques secondes
// 1 centime / seconde

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────────

const PRICE_PER_SEC = 0.01; // €

const DEMO_LIVE = {
  id: 'live-1',
  emetteur_name: 'NIKE GLOBAL',
  emetteur_slogan: 'Just Do It.',
  primary_color: '#f0b429',
  background_color: '#080400',
  call_to_action: 'Voir la collection',
  cta_url: '#',
  duration_seconds: 30,
  started_at: new Date(Date.now() - 8000).toISOString(),
};

const DEMO_QUEUE = [
  { id:'q1', pos:1, emetteur_name:'Studio Parallax', duration_seconds:60,  primary_color:'#ff4d8f' },
  { id:'q2', pos:2, emetteur_name:'OpenAI',          duration_seconds:120, primary_color:'#00d9f5' },
  { id:'q3', pos:3, emetteur_name:'Indie Records',   duration_seconds:45,  primary_color:'#a855f7' },
];

const DEMO_HISTORY = [
  { id:'h1', emetteur_name:'Tesla',      duration_seconds:60,  started_at:new Date(Date.now()-600000).toISOString(),  views_count:204, primary_color:'#e82127' },
  { id:'h2', emetteur_name:'Figma',      duration_seconds:30,  started_at:new Date(Date.now()-800000).toISOString(),  views_count:89,  primary_color:'#f24e1e' },
  { id:'h3', emetteur_name:'Stripe',     duration_seconds:90,  started_at:new Date(Date.now()-1200000).toISOString(), views_count:156, primary_color:'#635bff' },
  { id:'h4', emetteur_name:'Vercel',     duration_seconds:20,  started_at:new Date(Date.now()-2000000).toISOString(), views_count:44,  primary_color:'#fff' },
  { id:'h5', emetteur_name:'Spotify',    duration_seconds:300, started_at:new Date(Date.now()-3600000).toISOString(), views_count:501, primary_color:'#1ed760' },
];

// ─────────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────────

const fmt = {
  dur: s => s < 60 ? s+'s' : s < 3600 ? Math.floor(s/60)+'min'+(s%60?s%60+'s':'') : Math.floor(s/3600)+'h',
  eur: s => '€'+(s*PRICE_PER_SEC).toFixed(2),
  ago: iso => {
    const d = Math.floor((Date.now()-new Date(iso))/1000);
    if (d < 60) return d+'s';
    if (d < 3600) return Math.floor(d/60)+'min';
    if (d < 86400) return Math.floor(d/3600)+'h';
    return Math.floor(d/86400)+'j';
  },
};

// ─────────────────────────────────────────────────────────────────
//  PAGE
// ─────────────────────────────────────────────────────────────────

export default function Capteur() {
  const [live,    setLive]    = useState(DEMO_LIVE);
  const [queue,   setQueue]   = useState(DEMO_QUEUE);
  const [history, setHistory] = useState(DEMO_HISTORY);
  const [elapsed, setElapsed] = useState(0);
  const [view,    setView]    = useState('panel'); // 'panel' | 'book' | 'history'
  // form
  const [name,    setName]    = useState('');
  const [slogan,  setSlogan]  = useState('');
  const [dur,     setDur]     = useState(30);
  const [color,   setColor]   = useState('#f0b429');
  const [bg,      setBg]      = useState('#03030c');
  const [cta,     setCta]     = useState('');
  const [ctaUrl,  setCtaUrl]  = useState('');
  const [done,    setDone]    = useState(false);

  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!live) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(live.started_at)) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [live]);

  // Supabase
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    (async () => {
      const { data: l } = await sb.from('eclats').select('*').eq('status','live').limit(1);
      setLive(l?.[0] || null);
      const { data: q } = await sb.from('flux_solaire').select('*').limit(20);
      if (q?.length) setQueue(q);
      const { data: h } = await sb.from('chroniques').select('*').eq('status','completed').limit(100);
      if (h?.length) setHistory(h);
    })();
    const ch = sb.channel('capteur')
      .on('postgres_changes', { event:'*', schema:'public', table:'eclats' }, async () => {
        const { data: l } = await sb.from('eclats').select('*').eq('status','live').limit(1);
        setLive(l?.[0] || null);
        const { data: q } = await sb.from('flux_solaire').select('*').limit(20);
        if (q) setQueue(q);
      })
      .subscribe();
    return () => sb.removeChannel(ch);
  }, []);

  const progress   = live ? Math.min(100, (elapsed / live.duration_seconds) * 100) : 0;
  const remaining  = live ? Math.max(0, live.duration_seconds - elapsed) : 0;
  const col        = live?.primary_color || '#f0b429';
  const totalWait  = queue.reduce((a, b) => a + (b.duration_seconds || 0), 0);

  const submit = async () => {
    const sb = getSupabaseClient();
    const row = {
      emetteur_name: name, emetteur_slogan: slogan || null,
      primary_color: color, background_color: bg,
      call_to_action: cta || null, cta_url: ctaUrl || null,
      duration_seconds: dur, content_type: 'brand', content_text: name,
      status: 'queued', paid: false,
    };
    if (sb) await sb.from('eclats').insert([row]);
    setDone(true);
    setQueue(q => [...q, { id:'new', pos: q.length+1, emetteur_name: name, duration_seconds: dur, primary_color: color }]);
  };

  // ───────────────────────────────────────────────────────────────
  //  PANEL VIEW — le mur
  // ───────────────────────────────────────────────────────────────
  if (view === 'panel') return (
    <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column',
      background: live ? live.background_color : '#03030c', transition:'background 1s', overflow:'hidden',
      fontFamily:"'Courier New',monospace", position:'relative' }}>

      {/* ── PANNEAU PRINCIPAL ── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden' }}>

        {live ? <>
          {/* Lueur centrale */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 65% 55% at 50% 48%, '+col+'20 0%, transparent 68%)', pointerEvents:'none' }}/>

          {/* Contenu */}
          <div style={{ textAlign:'center', zIndex:2, padding:'6vw', maxWidth:'88%' }}>
            <div style={{ fontSize:'clamp(3rem,10vw,8rem)', fontWeight:900, color:'#fff',
              letterSpacing:'-0.03em', lineHeight:0.92, textShadow:'0 0 100px '+col+'60',
              fontFamily:"'Arial Black','Impact',sans-serif" }}>
              {live.emetteur_name}
            </div>
            {live.emetteur_slogan && (
              <div style={{ marginTop:'2.5vh', fontSize:'clamp(.9rem,2vw,1.6rem)',
                color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>
                {live.emetteur_slogan}
              </div>
            )}
            {live.call_to_action && (
              <a href={live.cta_url||'#'} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-block', marginTop:'3.5vh', background:col, color:'#000',
                  padding:'13px 30px', fontSize:'clamp(.75rem,1.4vw,.95rem)',
                  fontWeight:800, letterSpacing:'0.15em', textDecoration:'none',
                  borderRadius:2, fontFamily:'monospace' }}>
                {live.call_to_action} →
              </a>
            )}
          </div>

          {/* Barre progression */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.06)' }}>
            <div style={{ height:'100%', width:progress+'%', background:col,
              boxShadow:'0 0 10px '+col, transition:'width 1s linear' }}/>
          </div>

          {/* Timer */}
          <div style={{ position:'absolute', bottom:12, right:16, fontSize:12,
            color:'rgba(255,255,255,0.25)', letterSpacing:2, fontFamily:'monospace' }}>
            {remaining}s
          </div>

        </> : <>
          {/* Veille */}
          <div style={{ textAlign:'center', opacity:0.12 }}>
            <div style={{ fontSize:'clamp(4rem,12vw,10rem)', lineHeight:1 }}>◈</div>
            <div style={{ fontSize:'clamp(.7rem,1.5vw,1rem)', letterSpacing:'0.35em',
              color:'#fff', marginTop:'1.5vh', fontFamily:'monospace' }}>
              CAPTEUR EN VEILLE
            </div>
            <div style={{ fontSize:'clamp(.55rem,1vw,.75rem)', letterSpacing:'0.25em',
              color:'#fff', marginTop:'0.8vh', fontFamily:'monospace', opacity:0.6 }}>
              PANNEAU PHOTOVOLTAÏQUE · SPHÈRE DE DYSON
            </div>
          </div>
        </>}
      </div>

      {/* ── BARRE BAS ── */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(0,0,0,0.72)', backdropFilter:'blur(12px)',
        padding:'10px 20px', display:'flex', alignItems:'center', gap:0 }}>

        {/* Badge LIVE ou VEILLE */}
        <div style={{ display:'flex', alignItems:'center', gap:7, marginRight:20, flexShrink:0 }}>
          <div style={{ width:7, height:7, borderRadius:'50%',
            background: live ? col : 'rgba(255,255,255,0.15)',
            boxShadow: live ? '0 0 8px '+col : 'none',
            animation: live ? 'p 1.2s ease-in-out infinite' : 'none' }}/>
          <span style={{ fontSize:9, color: live ? col : 'rgba(255,255,255,0.2)',
            letterSpacing:1.5, fontFamily:'monospace' }}>
            {live ? 'LIVE' : 'VEILLE'}
          </span>
        </div>

        {/* File d'attente scrollable horizontalement */}
        <div style={{ flex:1, display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none',
          alignItems:'center', padding:'2px 0' }}>
          {queue.length === 0 ? (
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.15)', letterSpacing:1, fontFamily:'monospace', whiteSpace:'nowrap' }}>
              FLUX VIDE · PROCHAIN ÉCLAT DISPONIBLE IMMÉDIATEMENT
            </span>
          ) : queue.map((item, i) => (
            <div key={item.id} style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:2, padding:'5px 10px' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background: item.primary_color||'rgba(255,255,255,0.3)', flexShrink:0 }}/>
              <span style={{ fontSize:9, color:'rgba(255,255,255,0.5)', fontFamily:'monospace', letterSpacing:0.5, whiteSpace:'nowrap' }}>
                {item.emetteur_name}
              </span>
              <span style={{ fontSize:8, color:'rgba(255,255,255,0.2)', fontFamily:'monospace' }}>
                {fmt.dur(item.duration_seconds)}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, marginLeft:16, flexShrink:0 }}>
          <button onClick={() => setView('history')}
            style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(255,255,255,0.35)', fontSize:8.5, padding:'6px 12px',
              cursor:'pointer', fontFamily:'monospace', letterSpacing:1, borderRadius:2 }}>
            CHRONIQUES
          </button>
          <button onClick={() => setView('book')}
            style={{ background:'#f0b429', border:'none',
              color:'#000', fontSize:8.5, fontWeight:800, padding:'6px 14px',
              cursor:'pointer', fontFamily:'monospace', letterSpacing:1.5, borderRadius:2 }}>
            RÉSERVER · 1ct/s
          </button>
        </div>
      </div>

      <style>{`@keyframes p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.8)}}`}</style>
    </div>
  );

  // ───────────────────────────────────────────────────────────────
  //  BOOK VIEW — formulaire
  // ───────────────────────────────────────────────────────────────
  if (view === 'book') return (
    <div style={{ width:'100%', height:'100vh', background:'#03030c',
      display:'flex', fontFamily:"'Courier New',monospace", overflow:'hidden' }}>

      {/* Aperçu live à gauche */}
      <div style={{ flex:1, background:bg, display:'flex', alignItems:'center',
        justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0,
          background:'radial-gradient(ellipse 60% 50% at 50% 50%, '+color+'18, transparent 70%)' }}/>
        <div style={{ textAlign:'center', zIndex:2, padding:'8%', maxWidth:'85%' }}>
          <div style={{ fontSize:'clamp(2rem,7vw,5rem)', fontWeight:900, color:'#fff',
            letterSpacing:'-0.03em', lineHeight:0.92, textShadow:'0 0 80px '+color+'50',
            fontFamily:"'Arial Black',sans-serif" }}>
            {name || <span style={{ opacity:0.2 }}>VOTRE NOM</span>}
          </div>
          {slogan && <div style={{ marginTop:'2vh', fontSize:'clamp(.8rem,1.8vw,1.2rem)',
            color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em' }}>{slogan}</div>}
          {cta && <div style={{ marginTop:'3vh', display:'inline-block', background:color,
            color:'#000', padding:'10px 24px', fontSize:'clamp(.7rem,1.2vw,.85rem)',
            fontWeight:800, letterSpacing:'0.15em', fontFamily:'monospace' }}>{cta} →</div>}
        </div>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:color+'80' }}/>
        <div style={{ position:'absolute', bottom:12, left:16, fontSize:9,
          color:'rgba(255,255,255,0.2)', letterSpacing:2 }}>APERÇU</div>
      </div>

      {/* Formulaire à droite */}
      <div style={{ width:320, background:'#050610', borderLeft:'1px solid #0e1028',
        display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'16px', borderBottom:'1px solid #0e1028', display:'flex',
          justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:'#f0b429', fontSize:11, letterSpacing:2, fontWeight:700 }}>◈ RÉSERVER</div>
            <div style={{ color:'#181c35', fontSize:7.5, marginTop:2, letterSpacing:1 }}>1 CENTIME · 1 SECONDE</div>
          </div>
          <button onClick={() => setView('panel')}
            style={{ background:'transparent', border:'1px solid #0e1028', color:'rgba(255,255,255,0.2)',
              fontSize:9, padding:'4px 10px', cursor:'pointer', fontFamily:'monospace', borderRadius:2 }}>
            ✕
          </button>
        </div>

        {done ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', padding:24, textAlign:'center', gap:16 }}>
            <div style={{ fontSize:32, color:'#f0b429' }}>◈</div>
            <div style={{ fontSize:12, color:'#fff', letterSpacing:1, fontWeight:700 }}>ÉCLAT RÉSERVÉ</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', lineHeight:1.9 }}>
              Vous êtes en position #{queue.length}<br/>
              dans le Flux Solaire.<br/>
              Durée · {fmt.dur(dur)}<br/>
              Total · {fmt.eur(dur)}
            </div>
            <button onClick={() => { setView('panel'); setDone(false); setName(''); setSlogan(''); }}
              style={{ background:'transparent', border:'1px solid #f0b42960', color:'#f0b429',
                fontSize:9, padding:'8px 18px', cursor:'pointer', fontFamily:'monospace', letterSpacing:1, borderRadius:2 }}>
              RETOUR AU PANNEAU
            </button>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto', padding:16,
            scrollbarWidth:'thin', scrollbarColor:'#0e1025 transparent', display:'flex', flexDirection:'column', gap:12 }}>

            {/* Nom */}
            <Field label="NOM / MARQUE *">
              <input value={name} onChange={e=>setName(e.target.value)} maxLength={40}
                placeholder="NIKE, MON STUDIO, JEAN DUPONT..." style={INP}/>
            </Field>

            {/* Slogan */}
            <Field label="TAGLINE">
              <input value={slogan} onChange={e=>setSlogan(e.target.value)} maxLength={60}
                placeholder="Just do it." style={INP}/>
            </Field>

            {/* CTA */}
            <Field label="BOUTON (optionnel)">
              <input value={cta} onChange={e=>setCta(e.target.value)} maxLength={30}
                placeholder="Visiter le site" style={{...INP, marginBottom:6}}/>
              <input value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)}
                placeholder="https://..." style={INP}/>
            </Field>

            {/* Couleurs */}
            <Field label="COULEURS">
              <div style={{ display:'flex', gap:8 }}>
                {[{l:'PRINCIPALE', v:color, s:setColor},{l:'FOND', v:bg, s:setBg}].map(c=>(
                  <label key={c.l} style={{ flex:1, cursor:'pointer' }}>
                    <div style={{ fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:1, marginBottom:4 }}>{c.l}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6,
                      background:'#060810', border:'1px solid #0e1028', padding:'6px 8px', borderRadius:2 }}>
                      <div style={{ width:14, height:14, borderRadius:2, background:c.v, flexShrink:0 }}/>
                      <span style={{ fontSize:8, color:'rgba(255,255,255,0.2)', fontFamily:'monospace' }}>{c.v}</span>
                      <input type="color" value={c.v} onChange={e=>c.s(e.target.value)}
                        style={{ opacity:0, position:'absolute', width:1, height:1 }}/>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            {/* Durée */}
            <Field label={'DURÉE · '+fmt.dur(dur)+' · '+fmt.eur(dur)}>
              <input type="range" min={10} max={3600} step={5} value={dur}
                onChange={e=>setDur(+e.target.value)}
                style={{ width:'100%', accentColor:'#f0b429', margin:'4px 0 8px' }}/>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {[[10,'10s'],[30,'30s'],[60,'1min'],[300,'5min'],[600,'10min'],[1800,'30min'],[3600,'1h']].map(([s,l])=>(
                  <button key={s} onClick={()=>setDur(s)}
                    style={{ background:dur===s?'#f0b42922':'transparent',
                      border:'1px solid '+(dur===s?'#f0b429':'#0e1028'),
                      color:dur===s?'#f0b429':'rgba(255,255,255,0.25)',
                      fontSize:8, padding:'4px 8px', cursor:'pointer',
                      fontFamily:'monospace', borderRadius:2 }}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            {/* Info file */}
            {queue.length > 0 && (
              <div style={{ background:'#060810', border:'1px solid #0e1028',
                borderRadius:2, padding:'9px 12px', fontSize:8,
                color:'rgba(255,255,255,0.25)', fontFamily:'monospace', lineHeight:1.8 }}>
                <div>{queue.length} éclat{queue.length>1?'s':''} avant vous</div>
                <div>Attente estimée · {fmt.dur(totalWait + (remaining||0))}</div>
              </div>
            )}

          </div>
        )}

        {!done && (
          <div style={{ padding:'12px 16px', borderTop:'1px solid #0e1028' }}>
            <button onClick={submit} disabled={!name}
              style={{ width:'100%', background:name?'#f0b429':'#0e1028',
                border:'none', color:name?'#000':'rgba(255,255,255,0.1)',
                fontSize:11, fontWeight:800, padding:'13px',
                cursor:name?'pointer':'default', fontFamily:'monospace',
                letterSpacing:2, borderRadius:2 }}>
              ÉMETTRE · {fmt.eur(dur)}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ───────────────────────────────────────────────────────────────
  //  HISTORY VIEW — chroniques
  // ───────────────────────────────────────────────────────────────
  const totalSec  = history.reduce((a,b) => a+(b.duration_seconds||0), 0);
  const totalEur  = totalSec * PRICE_PER_SEC;
  const totalViews= history.reduce((a,b) => a+(b.views_count||0), 0);

  return (
    <div style={{ width:'100%', height:'100vh', background:'#03030c',
      fontFamily:"'Courier New',monospace", display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1px solid #0e1028',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        background:'#050610' }}>
        <div>
          <div style={{ color:'#f0b429', fontSize:12, fontWeight:700, letterSpacing:2 }}>◆ CHRONIQUES DU CAPTEUR</div>
          <div style={{ color:'#181c35', fontSize:8, marginTop:3, letterSpacing:1 }}>
            MÉMOIRE PERMANENTE DE CHAQUE ÉCLAT ÉMIS
          </div>
        </div>
        <button onClick={() => setView('panel')}
          style={{ background:'transparent', border:'1px solid #0e1028',
            color:'rgba(255,255,255,0.25)', fontSize:9, padding:'6px 14px',
            cursor:'pointer', fontFamily:'monospace', letterSpacing:1, borderRadius:2 }}>
          ← PANNEAU
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding:'14px 24px', borderBottom:'1px solid #0e1028',
        display:'flex', gap:32, background:'#050610' }}>
        {[
          { l:'ÉCLATS TOTAUX',    v: history.length },
          { l:'SECONDES ÉMISES',  v: fmt.dur(totalSec) },
          { l:'ÉNERGIE INVESTIE', v: '€'+totalEur.toFixed(2) },
          { l:'VUES CUMULÉES',    v: totalViews.toLocaleString() },
          { l:'ÉMETTEURS UNIQUES',v: [...new Set(history.map(h=>h.emetteur_name))].length },
        ].map(s => (
          <div key={s.l}>
            <div style={{ fontSize:7.5, color:'rgba(255,255,255,0.18)', letterSpacing:1.5, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:18, color:'#f0b429', fontWeight:700, letterSpacing:-0.5 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'#0e1025 transparent' }}>
        {/* Head */}
        <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr 1fr 1fr 1fr',
          padding:'10px 24px', borderBottom:'1px solid #0e1028',
          fontSize:8, color:'rgba(255,255,255,0.18)', letterSpacing:1.5 }}>
          {['ÉMETTEUR','DURÉE','PRIX','VUES','IL Y A'].map(h=><span key={h}>{h}</span>)}
        </div>
        {history.map((item, i) => (
          <div key={item.id}
            style={{ display:'grid', gridTemplateColumns:'3fr 1fr 1fr 1fr 1fr',
              padding:'12px 24px', borderBottom:'1px solid #090b18',
              transition:'background 0.1s', cursor:'default' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            {/* Nom */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:3, height:20, background:item.primary_color||'#f0b429',
                borderRadius:1, flexShrink:0 }}/>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)', fontWeight:700, letterSpacing:0.3 }}>
                {item.emetteur_name}
              </span>
            </div>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)', alignSelf:'center' }}>
              {fmt.dur(item.duration_seconds)}
            </span>
            <span style={{ fontSize:11, color:item.primary_color||'#f0b429', alignSelf:'center' }}>
              {fmt.eur(item.duration_seconds)}
            </span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', alignSelf:'center' }}>
              {(item.views_count||0).toLocaleString()}
            </span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', alignSelf:'center' }}>
              {fmt.ago(item.started_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MICRO COMPOSANTS
// ─────────────────────────────────────────────────────────────────

const INP = {
  width:'100%', background:'#060810', border:'1px solid #0e1028',
  color:'rgba(255,255,255,0.8)', fontSize:11, padding:'8px 10px',
  fontFamily:'monospace', outline:'none', borderRadius:2, boxSizing:'border-box',
};

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:7.5, color:'rgba(255,255,255,0.22)', letterSpacing:1.5,
        marginBottom:5, fontFamily:'monospace' }}>{label}</div>
      {children}
    </div>
  );
}
