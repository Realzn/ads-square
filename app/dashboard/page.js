'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp, getSession } from '../../../lib/supabase-auth';

const U = {
  bg:'#01020A', void:'#000408', card:'rgba(0,4,18,0.98)',
  border:'rgba(0,200,240,0.09)', border2:'rgba(0,200,240,0.20)',
  text:'#DDE6F2', muted:'rgba(140,180,220,0.60)', faint:'rgba(0,200,240,0.04)',
  accent:'#E8A020', accentFg:'#01020A', cyan:'#00C8E4',
  rose:'#D02848', err:'#D02848', green:'#00D880',
};
const F = {
  h:"'Rajdhani','Sora',system-ui,sans-serif",
  b:"'Rajdhani','Sora',system-ui,sans-serif",
  mono:"'JetBrains Mono','Fira Code',monospace",
};

function LoginContent() {
  const router     = useRouter();
  const params     = useSearchParams();
  const redirectTo = params.get('redirect') || '/dashboard';

  const [mode,setMode]         = useState('login');
  const [email,setEmail]       = useState('');
  const [password,setPassword] = useState('');
  const [name,setName]         = useState('');
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState('');
  const [success,setSuccess]   = useState('');
  const [focused,setFocused]   = useState('');
  const [mounted,setMounted]   = useState(false);

  useEffect(()=>{
    getSession().then(s=>{ if(s) router.replace(redirectTo); });
    const t=setTimeout(()=>setMounted(true),60);
    return ()=>clearTimeout(t);
  },[]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if(mode==='login'){
        await signIn({email,password});
        router.replace(redirectTo);
      } else {
        await signUp({email,password,displayName:name});
        setSuccess('Signal enregistré. Vérifiez votre email pour confirmer.');
        setMode('login');
      }
    } catch(err){
      setError(
        err.message==='Invalid login credentials' ? 'Signal non reconnu — email ou clé incorrects.' :
        err.message==='User already registered'   ? 'Vecteur déjà enregistré. Connectez-vous.' :
        err.message
      );
    } finally { setLoading(false); }
  };

  const isLogin = mode==='login';
  const modeCol = isLogin ? U.cyan : U.accent;

  return (
    <>
      <style>{`
        @keyframes scanDown  { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbitSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spinAuth  { to{transform:rotate(360deg)} }
        @keyframes gridFade  { from{opacity:0} to{opacity:1} }
        .lf input::placeholder { color:rgba(140,180,220,0.22); }
        .lf input:focus { outline:none; }
        .tab-btn { transition:all .22s cubic-bezier(.16,1,.3,1); }
        .cta-btn:hover:not(:disabled){ box-shadow:0 0 48px rgba(232,160,32,0.50)!important; transform:translateY(-1px); }
        .cta-btn:active:not(:disabled){ transform:translateY(0); }
        .cta-btn{ transition:all .18s cubic-bezier(.16,1,.3,1); }
        .back-link:hover{ color:rgba(0,200,240,0.65)!important; }
        .forgot-link:hover{ color:rgba(232,160,32,0.80)!important; }
      `}</style>

      <div style={{
        width:'100%', maxWidth:460,
        opacity:mounted?1:0, transform:mounted?'translateY(0)':'translateY(16px)',
        transition:'opacity .55s ease, transform .55s cubic-bezier(.16,1,.3,1)',
      }}>

        {/* ── Logo ── */}
        <div style={{textAlign:'center',marginBottom:36,animation:'fadeUp .5s ease both'}}>
          <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
            <div style={{position:'absolute',width:52,height:52,borderRadius:'50%',border:`1px solid ${U.cyan}28`,animation:'orbitSpin 8s linear infinite'}}>
              <div style={{position:'absolute',top:-2,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:'50%',background:U.cyan,boxShadow:`0 0 8px ${U.cyan}`}}/>
            </div>
            <div style={{position:'absolute',width:38,height:38,borderRadius:'50%',border:`0.5px solid ${U.accent}22`,animation:'orbitSpin 5s linear infinite reverse'}}>
              <div style={{position:'absolute',bottom:-2,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:U.accent,boxShadow:`0 0 6px ${U.accent}`}}/>
            </div>
            <div style={{width:18,height:18,borderRadius:'50%',background:`radial-gradient(circle at 35% 35%, ${U.accent}cc, ${U.accent}44)`,boxShadow:`0 0 18px ${U.accent}60, 0 0 6px ${U.accent}`}}/>
          </div>
          <Link href="/" style={{textDecoration:'none'}}>
            <div style={{fontFamily:F.h,fontSize:26,fontWeight:800,letterSpacing:'.12em',color:U.accent,lineHeight:1,textShadow:`0 0 28px ${U.accent}50`}}>ADS-SQUARE</div>
            <div style={{fontFamily:F.mono,fontSize:7,letterSpacing:'.28em',color:`${U.cyan}50`,marginTop:3}}>GALACTIC·ADV·GRID</div>
          </Link>
          <div style={{fontFamily:F.mono,fontSize:9,letterSpacing:'.16em',color:`${modeCol}60`,marginTop:12,transition:'color .3s'}}>
            {isLogin ? 'ACCÈS·ESPACE·ANNONCEUR' : 'ENREGISTREMENT·NOUVEAU·VECTEUR'}
          </div>
        </div>

        {/* ── Card ── */}
        <div style={{
          position:'relative',
          background:U.card,
          border:`0.5px solid ${U.border2}`,
          clipPath:'polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))',
          boxShadow:`0 0 80px ${U.cyan}08, 0 32px 80px rgba(0,0,0,0.95)`,
          overflow:'hidden',
          animation:'fadeUp .55s .1s ease both',
        }}>
          {/* Barre énergie */}
          <div style={{height:1.5,background:`linear-gradient(90deg,transparent,${modeCol},${modeCol}88,transparent)`,boxShadow:`0 0 8px ${modeCol}`,transition:'background .3s,box-shadow .3s'}}/>
          {/* Brackets coins */}
          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i)=>(
            <div key={i} style={{position:'absolute',[v]:8,[h]:8,width:12,height:12,pointerEvents:'none',zIndex:10,
              borderTop:v==='top'?`1px solid ${U.cyan}44`:'none',borderBottom:v==='bottom'?`1px solid ${U.cyan}44`:'none',
              borderLeft:h==='left'?`1px solid ${U.cyan}44`:'none',borderRight:h==='right'?`1px solid ${U.cyan}44`:'none'}}/>
          ))}
          {/* Scanlines */}
          <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,240,0.018) 2px,rgba(0,200,240,0.018) 3px)'}}/>
          {/* Lueur fond */}
          <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:0,background:`radial-gradient(ellipse 75% 55% at 50% 0%, ${modeCol}07 0%, transparent 65%)`,transition:'background .4s ease'}}/>

          <div style={{position:'relative',zIndex:2,padding:'28px 32px 32px'}}>

            {/* Toggle mode */}
            <div style={{display:'flex',marginBottom:26,background:'rgba(0,3,14,0.80)',border:`0.5px solid ${U.border}`,padding:3,clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))'}}>
              {[{key:'login',icon:'◉',label:'ACCÈS·SPHÈRE'},{key:'register',icon:'◈',label:'ENREGISTREMENT'}].map(tab=>{
                const on=mode===tab.key;
                const col=tab.key==='login'?U.cyan:U.accent;
                return (
                  <button key={tab.key} className="tab-btn"
                    onClick={()=>{setMode(tab.key);setError('');setSuccess('');}}
                    style={{flex:1,padding:'9px 0',border:'none',cursor:'pointer',
                      background:on?`${col}12`:'transparent',
                      borderBottom:on?`1.5px solid ${col}`:'1.5px solid transparent',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:7}}
                  >
                    <span style={{fontSize:10,color:on?col:`${col}35`,transition:'color .2s'}}>{tab.icon}</span>
                    <span style={{fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.15em',color:on?col:`${U.text}25`,textShadow:on?`0 0 12px ${col}80`:'none',transition:'all .2s'}}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Erreur */}
            {error && (
              <div style={{marginBottom:18,padding:'9px 13px',background:`${U.err}0c`,border:`0.5px solid ${U.err}44`,borderLeft:`2px solid ${U.err}`,clipPath:'polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,0 100%)',display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:U.err,fontSize:10,flexShrink:0}}>⚠</span>
                <span style={{fontFamily:F.mono,fontSize:8.5,color:`${U.err}cc`,letterSpacing:'.05em',lineHeight:1.5}}>{error}</span>
              </div>
            )}
            {/* Succès */}
            {success && (
              <div style={{marginBottom:18,padding:'9px 13px',background:`${U.green}0c`,border:`0.5px solid ${U.green}44`,borderLeft:`2px solid ${U.green}`,clipPath:'polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,0 100%)',display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:U.green,fontSize:10,flexShrink:0}}>◈</span>
                <span style={{fontFamily:F.mono,fontSize:8.5,color:`${U.green}cc`,letterSpacing:'.05em',lineHeight:1.5}}>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:15}}>

              {/* NOM (register) */}
              {mode==='register' && (
                <div className="lf">
                  <div style={{fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.18em',color:`${U.accent}65`,marginBottom:7,display:'flex',alignItems:'center',gap:6}}>
                    <span style={{color:`${U.accent}35`}}>◈</span> IDENTIFIANT·ÉMETTEUR
                  </div>
                  <div style={{position:'relative'}}>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)}
                      onFocus={()=>setFocused('nm')} onBlur={()=>setFocused('')}
                      placeholder="Votre nom ou marque"
                      style={{width:'100%',padding:'11px 14px 11px 38px',background:focused==='nm'?`${U.accent}06`:U.faint,border:`0.5px solid ${focused==='nm'?U.accent+'55':U.border}`,color:U.text,fontSize:13,fontFamily:F.b,outline:'none',boxSizing:'border-box',clipPath:'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)',boxShadow:focused==='nm'?`0 0 0 1px ${U.accent}18`:'none',transition:'all .15s'}}
                    />
                    <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:focused==='nm'?U.accent:`${U.accent}30`,fontSize:11,pointerEvents:'none',transition:'color .15s'}}>◈</span>
                  </div>
                </div>
              )}

              {/* EMAIL */}
              <div className="lf">
                <div style={{fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.18em',color:`${U.cyan}65`,marginBottom:7,display:'flex',alignItems:'center',gap:6}}>
                  <span style={{color:`${U.cyan}35`}}>◉</span> SIGNAL·EMAIL
                </div>
                <div style={{position:'relative'}}>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                    onFocus={()=>setFocused('em')} onBlur={()=>setFocused('')}
                    placeholder="votre@email.com"
                    style={{width:'100%',padding:'11px 14px 11px 38px',background:focused==='em'?`${U.cyan}05`:U.faint,border:`0.5px solid ${focused==='em'?U.cyan+'55':U.border}`,color:U.text,fontSize:13,fontFamily:F.b,outline:'none',boxSizing:'border-box',clipPath:'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)',boxShadow:focused==='em'?`0 0 0 1px ${U.cyan}15`:'none',transition:'all .15s'}}
                  />
                  <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:focused==='em'?U.cyan:`${U.cyan}30`,fontSize:11,pointerEvents:'none',transition:'color .15s'}}>◉</span>
                </div>
              </div>

              {/* MOT DE PASSE */}
              <div className="lf">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                  <div style={{fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.18em',color:`${U.cyan}65`,display:'flex',alignItems:'center',gap:6}}>
                    <span style={{color:`${U.cyan}35`}}>◌</span> CLÉ·D'ACCÈS
                  </div>
                  {isLogin && (
                    <Link href="/dashboard/forgot-password" className="forgot-link"
                      style={{fontFamily:F.mono,fontSize:7.5,letterSpacing:'.08em',color:`${U.accent}45`,textDecoration:'none',transition:'color .15s'}}>
                      CLÉ OUBLIÉE ?
                    </Link>
                  )}
                </div>
                <div style={{position:'relative'}}>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}
                    onFocus={()=>setFocused('pw')} onBlur={()=>setFocused('')}
                    placeholder={mode==='register'?'Minimum 6 caractères':'••••••••'}
                    style={{width:'100%',padding:'11px 14px 11px 38px',background:focused==='pw'?`${U.cyan}05`:U.faint,border:`0.5px solid ${focused==='pw'?U.cyan+'55':U.border}`,color:U.text,fontSize:13,fontFamily:F.b,outline:'none',boxSizing:'border-box',clipPath:'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)',boxShadow:focused==='pw'?`0 0 0 1px ${U.cyan}15`:'none',transition:'all .15s'}}
                  />
                  <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:focused==='pw'?U.cyan:`${U.cyan}30`,fontSize:11,pointerEvents:'none',transition:'color .15s'}}>◌</span>
                </div>
              </div>

              {/* CTA */}
              <button type="submit" disabled={loading} className="cta-btn"
                style={{marginTop:6,padding:'14px 0',background:loading?'transparent':`linear-gradient(90deg,${U.accent}ee,${U.accent}bb)`,border:loading?`0.5px solid ${U.accent}35`:'none',color:loading?`${U.accent}55`:U.accentFg,fontFamily:F.mono,fontWeight:700,fontSize:11,letterSpacing:'.20em',cursor:loading?'not-allowed':'pointer',clipPath:'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',boxShadow:loading?'none':`0 0 28px ${U.accent}28`,display:'flex',alignItems:'center',justifyContent:'center',gap:9}}
              >
                {loading ? (
                  <><span style={{width:10,height:10,borderRadius:'50%',border:`1.5px solid ${U.accent}35`,borderTop:`1.5px solid ${U.accent}`,display:'inline-block',animation:'spinAuth .8s linear infinite'}}/>{isLogin?'VÉRIFICATION…':'ENREGISTREMENT…'}</>
                ) : isLogin ? (
                  <><span style={{fontSize:12}}>◉</span> ACCÉDER À LA SPHÈRE</>
                ) : (
                  <><span style={{fontSize:12}}>◈</span> ENREGISTRER MON SIGNAL</>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Pied */}
        <div style={{marginTop:22,textAlign:'center',display:'flex',flexDirection:'column',gap:8,alignItems:'center',animation:'fadeUp .55s .25s ease both'}}>
          <Link href="/" className="back-link" style={{fontFamily:F.mono,fontSize:8,letterSpacing:'.14em',color:`${U.text}22`,textDecoration:'none',transition:'color .15s'}}>
            ← RETOUR·À·LA·GRILLE
          </Link>
          <div style={{fontFamily:F.mono,fontSize:7,letterSpacing:'.14em',color:`${U.cyan}18`}}>
            DYSON·COSMOS · GALACTIC·ADV·GRID
          </div>
        </div>

      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div style={{minHeight:'100vh',background:U.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.b,padding:'24px 16px',position:'relative',overflow:'hidden'}}>
      {/* Grille */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`linear-gradient(rgba(0,200,240,0.028) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,240,0.028) 1px,transparent 1px)`,backgroundSize:'48px 48px',animation:'gridFade 1.2s ease both'}}/>
      {/* Lueur accent bas */}
      <div style={{position:'absolute',bottom:-120,left:'50%',transform:'translateX(-50%)',width:600,height:300,borderRadius:'50%',background:`radial-gradient(ellipse,${U.accent}08 0%,transparent 70%)`,pointerEvents:'none'}}/>
      {/* Lueur cyan haut-droit */}
      <div style={{position:'absolute',top:-80,right:-80,width:400,height:400,borderRadius:'50%',background:`radial-gradient(ellipse,${U.cyan}06 0%,transparent 65%)`,pointerEvents:'none'}}/>
      {/* Scanline animée */}
      <div style={{position:'absolute',left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${U.cyan}14,transparent)`,animation:'scanDown 6s linear infinite',pointerEvents:'none'}}/>
      {/* Scanlines statiques */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,200,240,0.015) 2px,rgba(0,200,240,0.015) 3px)'}}/>

      <Suspense fallback={
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,color:`${U.cyan}50`}}>
          <div style={{width:28,height:28,borderRadius:'50%',border:`1.5px solid ${U.cyan}25`,borderTop:`1.5px solid ${U.cyan}`,animation:'spinAuth .8s linear infinite'}}/>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:'.22em'}}>INITIALISATION…</div>
          <style>{`@keyframes spinAuth{to{transform:rotate(360deg)}} @keyframes gridFade{from{opacity:0}to{opacity:1}}`}</style>
        </div>
      }>
        <LoginContent/>
      </Suspense>
    </div>
  );
}
