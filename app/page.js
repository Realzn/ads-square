'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from "react";

const D = {
  bg:"#020609", s1:"#060c16", s2:"#0a1222", card:"#0d1828",
  bord:"rgba(255,255,255,0.055)", bord2:"rgba(255,255,255,0.11)",
  txt:"#dde8ff", muted:"rgba(185,205,255,0.48)", faint:"rgba(255,255,255,0.04)",
  cyan:"#00d9f5", violet:"#9d7dff", gold:"#f0b429",
  rose:"#ff4d8f", mint:"#00e8a2", red:"#ff4455", blue:"#4499ff",
};
const FF = { h:"'Clash Display','Syne',sans-serif", b:"'DM Sans',sans-serif" };
const GRID_COLS=37,GRID_ROWS=37,CENTER_X=18,CENTER_Y=18;
const CORNER_POSITIONS=new Set(["0-0","36-0","0-36","36-36"]);
function getTier(x,y){if(CORNER_POSITIONS.has(`${x}-${y}`))return"corner_ten";const dx=Math.abs(x-CENTER_X),dy=Math.abs(y-CENTER_Y),dist=Math.max(dx,dy);if(dist===0)return"one";if(dist<=3)return"ten";if(dist<=11)return"hundred";return"thousand";}
function isCorner(x,y){return CORNER_POSITIONS.has(`${x}-${y}`);}
const TIER_SIZE={one:120,ten:52,corner_ten:52,hundred:26,thousand:11};
const TIER_COLOR={one:"#f0b429",ten:"#ff4d8f",corner_ten:"#f0b429",hundred:"#00d9f5",thousand:"#00e8a2"};
const TIER_LABEL={one:"ÉPICENTRE",ten:"PRESTIGE",corner_ten:"CORNER",hundred:"BUSINESS",thousand:"VIRAL"};
const TIER_PRICE={one:1000,ten:100,corner_ten:100,hundred:10,thousand:1};
const PROFILES=[
  {id:"creator",icon:"🎨",label:"Créateur",desc:"TikTok, YouTube, Insta, portfolio…",color:D.mint,blocs:"VIRAL dès 1€/j"},
  {id:"freelance",icon:"🧾",label:"Auto-entrepreneur",desc:"Freelance, coach, artisan, commerce",color:D.cyan,blocs:"BUSINESS dès 10€/j"},
  {id:"brand",icon:"🏢",label:"Marque",desc:"PME, startup, agence, grande marque",color:D.gold,blocs:"PRESTIGE dès 100€/j"},
];
const TENANTS=[
  {l:"NK",t:"image",c:"#ff6b35",b:"#160800",name:"NikeKicks Studio",slogan:"Just Do It — Air Max 2025",url:"https://nike.com",cta:"Voir la collection",img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",badge:"MARQUE"},
  {l:"SV",t:"link",c:"#c5d3e8",b:"#08121e",name:"SaaS Vision",slogan:"Automatisez votre croissance B2B",url:"https://example.com",cta:"Essai 14 jours",img:"",badge:"FREELANCE"},
  {l:"SP",t:"video",c:"#1ed760",b:"#001409",name:"Spotify Ads",slogan:"Faites entendre votre marque",url:"https://spotify.com",cta:"Lancer une campagne",img:"https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&q=80",badge:"MARQUE"},
  {l:"TS",t:"video",c:"#e31937",b:"#100002",name:"TechStream TV",slogan:"Le streaming tech — 24h/24",url:"https://example.com",cta:"Regarder",img:"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",badge:"CRÉATEUR"},
  {l:"AZ",t:"link",c:"#ff9900",b:"#110800",name:"Amazon Business",slogan:"Pro pricing. Free shipping.",url:"https://amazon.com",cta:"Créer un compte Pro",img:"",badge:"MARQUE"},
  {l:"NF",t:"video",c:"#e50914",b:"#0e0000",name:"Netflix Originals",slogan:"Des histoires qui vous transportent",url:"https://netflix.com",cta:"Voir les nouveautés",img:"https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80",badge:"MARQUE"},
  {l:"GG",t:"brand",c:"#4285f4",b:"#000b1e",name:"Google Workspace",slogan:"Travaillez ensemble, partout",url:"https://workspace.google.com",cta:"Démarrer",img:"",badge:"MARQUE"},
  {l:"AB",t:"image",c:"#ff5a5f",b:"#110002",name:"Airbnb",slogan:"Vivez comme un local",url:"https://airbnb.com",cta:"Explorer",img:"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",badge:"MARQUE"},
  {l:"MT",t:"link",c:"#0082fb",b:"#000b1e",name:"Meta Ads",slogan:"Votre audience, vos règles",url:"https://facebook.com/business",cta:"Créer une annonce",img:"",badge:"MARQUE"},
  {l:"SN",t:"image",c:"#fffc00",b:"#111100",name:"Snapchat",slogan:"Stories 360°",url:"https://snapchat.com",cta:"Ouvrir Snapchat",img:"https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80",badge:"CRÉATEUR"},
  {l:"TW",t:"text",c:"#1d9bf0",b:"#000e1c",name:"X Premium+",slogan:"La conversation évolue",url:"https://x.com/premium",cta:"Passer Premium",img:"",badge:"CRÉATEUR"},
  {l:"LI",t:"brand",c:"#0a66c2",b:"#000c1a",name:"LinkedIn Talent",slogan:"Recrutez les meilleurs",url:"https://linkedin.com",cta:"Publier une offre",img:"",badge:"FREELANCE"},
];
function rng(s){let v=s;return()=>{v=(v*1664525+1013904223)&0xffffffff;return(v>>>0)/0xffffffff;};}
function buildMasterGrid(){
  const r=rng(42),canonical={};
  for(let y=0;y<=CENTER_Y;y++)for(let x=0;x<=CENTER_X;x++){
    const tier=getTier(x,y);
    const occ=r()<{one:0.99,ten:0.80,corner_ten:0.99,hundred:0.82,thousand:0.88}[tier];
    canonical[`${x}-${y}`]={occ,tenantIdx:occ?Math.floor(r()*TENANTS.length):-1,hot:occ&&r()>0.82};
  }
  const getData=(x,y)=>canonical[`${x<=CENTER_X?x:CENTER_X*2-x}-${y<=CENTER_Y?y:CENTER_Y*2-y}`];
  const slots=[];
  for(let y=0;y<GRID_ROWS;y++)for(let x=0;x<GRID_COLS;x++){
    const tier=getTier(x,y),{occ,tenantIdx,hot}=getData(x,y);
    slots.push({x,y,tier,occ,tenant:occ&&tenantIdx>=0?TENANTS[tenantIdx]:null,hot,id:`${x}-${y}`,corner:isCorner(x,y)});
  }
  return slots;
}
const MASTER_SLOTS=buildMasterGrid();

function useScreenSize(){
  const[w,setW]=useState(typeof window!=='undefined'?window.innerWidth:1200);
  useEffect(()=>{const fn=()=>setW(window.innerWidth);window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn);},[]);
  return{w,isMobile:w<768};
}

const GLOBAL_CSS=`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  @import url('https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:100%;background:#020609;color:#dde8ff;font-family:'DM Sans',sans-serif;overflow:hidden;}
  ::-webkit-scrollbar{width:6px;height:6px;}
  ::-webkit-scrollbar-track{background:rgba(255,255,255,0.03);}
  ::-webkit-scrollbar-thumb{background:rgba(0,217,245,0.25);border-radius:3px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
  @keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(0,217,245,0.2)}50%{box-shadow:0 0 60px rgba(0,217,245,0.5)}}
  @keyframes selectedPulse{0%,100%{box-shadow:0 0 0 2px currentColor,0 0 12px currentColor}50%{box-shadow:0 0 0 4px currentColor,0 0 28px currentColor,0 0 60px currentColor}}
  @keyframes vacantBreath{0%,100%{opacity:0.6}50%{opacity:1}}
  @keyframes tierHighlight{0%,100%{box-shadow:inset 0 0 0 1px currentColor,0 0 8px currentColor}50%{box-shadow:inset 0 0 0 2px currentColor,0 0 22px currentColor}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes modalIn{from{opacity:0;transform:scale(0.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
  .block-hover{transition:transform 0.12s,box-shadow 0.12s;cursor:pointer;}
  .block-hover:hover{transform:scale(1.15);z-index:20;}
  .block-hover:hover .rent-cta{opacity:1!important;}
  .rent-cta{opacity:0;transition:opacity 0.15s;}
  .landing-btn{transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);}
  .landing-btn:hover{transform:translateY(-3px) scale(1.03);}
  .landing-btn:active{transform:scale(0.97);}
  .profile-card{transition:all 0.2s cubic-bezier(0.34,1.3,0.64,1);cursor:pointer;}
  .profile-card:hover{transform:translateY(-4px) scale(1.02);}
  .focus-nav{transition:all 0.2s;}
  .focus-nav:hover{transform:scale(1.1);background:rgba(0,217,245,0.2)!important;}
  @media(hover:none)and(pointer:coarse){.block-hover:hover{transform:none;}.block-hover:active{transform:scale(1.08);}.rent-cta{opacity:0.7!important;}}
`;

function BrandLogo({size=22,onClick}){
  return(
    <button onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:size*1.1,height:size*1.1,borderRadius:size*0.22,background:`linear-gradient(135deg,${D.cyan}33,${D.violet}22)`,border:`1.5px solid ${D.cyan}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{color:D.cyan,fontSize:size*0.52,fontWeight:900,fontFamily:FF.h,lineHeight:1}}>□</span>
      </div>
      <span style={{color:D.txt,fontWeight:900,fontSize:size,letterSpacing:.3,fontFamily:FF.h,lineHeight:1}}>ADS<span style={{color:D.cyan}}>-</span>SQUARE</span>
    </button>
  );
}

function BetaBanner(){
  const[visible,setVisible]=useState(true);
  if(!visible)return null;
  return(
    <div style={{background:`linear-gradient(90deg,${D.violet}22,${D.cyan}11)`,borderBottom:`1px solid ${D.violet}44`,padding:"7px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,animation:"slideDown 0.4s ease",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{background:`${D.violet}33`,border:`1px solid ${D.violet}55`,borderRadius:20,padding:"2px 8px",color:D.violet,fontSize:9,fontWeight:900,letterSpacing:1,fontFamily:FF.h,whiteSpace:"nowrap"}}>BÊTA PUBLIQUE</span>
        <span style={{color:D.muted,fontSize:11}}>Plateforme en développement — réservations bientôt disponibles.</span>
        <a href="#waitlist" style={{color:D.cyan,fontSize:11,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Rejoindre la liste d'attente →</a>
      </div>
      <button onClick={()=>setVisible(false)} style={{background:"none",border:"none",color:D.muted,cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1,flexShrink:0}}>×</button>
    </div>
  );
}

function WaitlistModal({onClose}){
  const{isMobile}=useScreenSize();
  const[entered,setEntered]=useState(false);
  useEffect(()=>{const t=requestAnimationFrame(()=>setEntered(true));return()=>cancelAnimationFrame(t);},[]);
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(2,6,9,0.95)",backdropFilter:"blur(28px)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",opacity:entered?1:0,transition:"opacity 0.3s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:isMobile?"100vw":"min(96vw,560px)",background:`linear-gradient(145deg,${D.s2},${D.card})`,border:`2px solid ${D.violet}44`,borderRadius:isMobile?"24px 24px 0 0":20,overflow:"hidden",overflowY:"auto",maxHeight:isMobile?"90vh":"auto",boxShadow:`0 0 80px ${D.violet}22`,animation:entered?"modalIn 0.3s cubic-bezier(0.34,1.2,0.64,1) forwards":undefined}}>
        {isMobile&&<div style={{display:"flex",justifyContent:"center",padding:"10px 0 2px"}}><div style={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.2)"}}/></div>}
        <div style={{height:3,background:`linear-gradient(90deg,${D.violet},${D.cyan}44,transparent)`}}/>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,width:34,height:34,borderRadius:"50%",border:`1px solid ${D.bord2}`,background:D.faint,color:D.muted,cursor:"pointer",fontSize:18,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        <div style={{padding:isMobile?"24px 20px 32px":"36px 36px 40px"}}>
          <div style={{fontSize:36,marginBottom:12}}>📬</div>
          <div style={{color:D.txt,fontWeight:900,fontSize:22,fontFamily:FF.h,marginBottom:8}}>Soyez parmi les premiers</div>
          <div style={{color:D.muted,fontSize:13,lineHeight:1.7,marginBottom:20}}>
            La plateforme ouvre bientôt. Inscrivez-vous pour être notifié en premier et obtenir un <span style={{color:D.gold,fontWeight:700}}>tarif de lancement exclusif</span>.
          </div>
          <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
            {PROFILES.map(p=>(
              <div key={p.id} style={{flex:1,minWidth:80,padding:"10px 8px",borderRadius:10,background:`${p.color}0f`,border:`1px solid ${p.color}33`,textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>{p.icon}</div>
                <div style={{color:p.color,fontSize:10,fontWeight:800,fontFamily:FF.h}}>{p.label}</div>
                <div style={{color:D.muted,fontSize:9,marginTop:2}}>{p.blocs}</div>
              </div>
            ))}
          </div>
          <div style={{borderRadius:12,overflow:"hidden",background:D.faint,border:`1px solid ${D.bord}`}}>
            <iframe
              src="https://tally.so/embed/w4KNOQ?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              width="100%" height="220" frameBorder="0" marginHeight="0" marginWidth="0"
              title="Liste d'attente ADS-SQUARE"
              style={{display:"block",minHeight:180}}
            />
          </div>
          <div style={{marginTop:12,color:D.muted,fontSize:10,textAlign:"center"}}>🔒 Pas de spam. Désabonnement en 1 clic.</div>
        </div>
      </div>
    </div>
  );
}

function BlockMedia({tenant,tier}){
  const sz=TIER_SIZE[tier]||56;
  if(!tenant)return null;
  if(tenant.t==="image"&&tenant.img)return(
    <div style={{position:"absolute",inset:0,overflow:"hidden"}}>
      <img src={tenant.img} alt={tenant.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.65}} onError={e=>e.target.style.display="none"}/>
      <div style={{position:"absolute",inset:0,background:`linear-gradient(to top,${tenant.b}ee,transparent 60%)`}}/>
    </div>
  );
  if(tenant.t==="video"&&sz>=52)return(
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:sz*0.35,height:sz*0.35,borderRadius:"50%",background:`${tenant.c}22`,border:`1px solid ${tenant.c}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:sz*0.15,color:tenant.c,marginLeft:2}}>▶</span>
      </div>
    </div>
  );
  return null;
}

const BlockCell=({slot,isSelected,onSelect,onFocus})=>{
  const{tier,occ,tenant,hot}=slot;
  const sz=TIER_SIZE[tier];
  const isCornerTen=tier==="corner_ten";
  const color=occ?tenant.c:TIER_COLOR[tier];
  const bg=occ?(tenant.b||D.card):D.s2;
  const glow=isCornerTen?`0 0 ${sz*0.5}px ${D.gold}88,0 0 ${sz*0.2}px ${D.gold}cc`:hot?`0 0 ${sz*0.25}px ${color}66`:occ?`0 0 ${sz*0.12}px ${color}22`:"none";
  const selectedGlow=isSelected?`0 0 0 3px ${TIER_COLOR[tier]},0 0 18px ${TIER_COLOR[tier]}aa,0 0 40px ${TIER_COLOR[tier]}44`:glow;
  return(
    <div className="block-hover" onClick={()=>occ?onFocus(slot):onSelect&&onSelect(slot)} style={{
      width:sz,height:sz,flexShrink:0,position:"relative",
      borderRadius:tier==="one"?10:tier==="ten"||isCornerTen?6:tier==="hundred"?3:2,
      background:isSelected&&!occ?`${TIER_COLOR[tier]}18`:bg,
      border:`${isSelected?2:isCornerTen?2:1}px solid ${isSelected?TIER_COLOR[tier]:isCornerTen?D.gold:occ?`${color}45`:`${TIER_COLOR[tier]}18`}`,
      boxShadow:selectedGlow,overflow:"hidden",transition:"transform 0.12s,box-shadow 0.12s",
      animation:isSelected&&!occ?"selectedPulse 1.8s ease-in-out infinite":isCornerTen?"glowPulse 3s infinite":undefined,
      color:TIER_COLOR[tier],
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 50%)",pointerEvents:"none"}}/>
      {isCornerTen&&<div style={{position:"absolute",inset:0,pointerEvents:"none",background:`linear-gradient(45deg,${D.gold}22 0%,transparent 40%,${D.gold}11 100%)`}}/>}
      {occ&&<BlockMedia tenant={tenant} tier={tier}/>}
      {occ&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:sz>30?3:1,padding:sz>20?4:1}}>
          {tier==="one"&&(<>
            <div style={{fontSize:36,fontWeight:900,color:tenant.c,fontFamily:FF.h,textShadow:`0 0 24px ${tenant.c}`,lineHeight:1}}>{tenant.l}</div>
            <div style={{color:tenant.c,fontSize:13,fontWeight:800,textAlign:"center"}}>{tenant.name}</div>
            <div style={{color:`${tenant.c}88`,fontSize:10,textAlign:"center",maxWidth:"90%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tenant.slogan}</div>
            <div style={{marginTop:6,padding:"4px 12px",borderRadius:20,background:`${tenant.c}22`,border:`1px solid ${tenant.c}44`,color:tenant.c,fontSize:9,fontWeight:800}}>{tenant.badge}</div>
          </>)}
          {(tier==="ten"||isCornerTen)&&(<>
            <div style={{fontSize:isCornerTen?18:16,fontWeight:900,color:tenant.c,fontFamily:FF.h,textShadow:`0 0 14px ${tenant.c}`,lineHeight:1}}>{tenant.l}</div>
            {sz>=40&&<div style={{color:tenant.c,fontSize:8,fontWeight:800,textAlign:"center",maxWidth:"90%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tenant.name}</div>}
            {isCornerTen&&<div style={{marginTop:2,padding:"1px 5px",borderRadius:8,background:`${D.gold}22`,border:`1px solid ${D.gold}55`,color:D.gold,fontSize:6,fontWeight:800,letterSpacing:0.5}}>CORNER</div>}
          </>)}
          {tier==="hundred"&&sz>=26&&<div style={{fontSize:8,fontWeight:900,color:tenant.c,fontFamily:FF.h,textAlign:"center",lineHeight:1}}>{tenant.l}</div>}
          {tier==="thousand"&&sz>=11&&<div style={{width:"55%",height:1.5,background:tenant.c,borderRadius:1,opacity:0.7}}/>}
        </div>
      )}
      {!occ&&(
        <div className="rent-cta" style={{position:"absolute",inset:0,background:isSelected?`${TIER_COLOR[tier]}15`:"rgba(0,0,0,0.75)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
          {isSelected?<span style={{color:TIER_COLOR[tier],fontSize:Math.max(10,sz*0.25),fontWeight:900,textShadow:`0 0 12px ${TIER_COLOR[tier]}`}}>✓</span>
          :sz>=28?(<><span style={{fontSize:Math.min(12,sz*0.2),color:TIER_COLOR[tier],fontWeight:900,animation:"vacantBreath 2s ease-in-out infinite"}}>+</span>{sz>=46&&<span style={{fontSize:Math.min(7,sz*0.12),color:TIER_COLOR[tier],fontWeight:700}}>{isCornerTen?"CORNER":"Louer"}</span>}</>)
          :<div style={{width:3,height:3,borderRadius:"50%",background:TIER_COLOR[tier],animation:"vacantBreath 2s ease-in-out infinite"}}/>}
        </div>
      )}
      {occ&&hot&&<div style={{position:"absolute",top:2,right:2,width:4,height:4,borderRadius:"50%",background:D.red,boxShadow:`0 0 5px ${D.red}`,animation:"blink 1.5s infinite"}}/>}
      {isCornerTen&&!occ&&<div style={{position:"absolute",top:3,right:3,width:5,height:5,borderRadius:"50%",background:D.gold,boxShadow:`0 0 8px ${D.gold}`,animation:"blink 2s infinite"}}/>}
    </div>
  );
};

function FocusModal({slot,allSlots,onClose,onWaitlist,onNavigate}){
  const[entered,setEntered]=useState(false);
  const[dir,setDir]=useState(0);
  const{isMobile}=useScreenSize();
  const occupiedSlots=useMemo(()=>allSlots.filter(s=>s.occ),[allSlots]);
  const curIdx=occupiedSlots.findIndex(s=>s.id===slot?.id);
  const hasPrev=curIdx>0,hasNext=curIdx<occupiedSlots.length-1;
  const goPrev=useCallback(()=>{if(!hasPrev)return;setDir(-1);onNavigate(occupiedSlots[curIdx-1]);setTimeout(()=>setDir(0),250);},[hasPrev,curIdx,occupiedSlots,onNavigate]);
  const goNext=useCallback(()=>{if(!hasNext)return;setDir(1);onNavigate(occupiedSlots[curIdx+1]);setTimeout(()=>setDir(0),250);},[hasNext,curIdx,occupiedSlots,onNavigate]);
  useEffect(()=>{const t=requestAnimationFrame(()=>setEntered(true));return()=>cancelAnimationFrame(t);},[slot]);
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")goPrev();if(e.key==="ArrowRight")goNext();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[slot,onClose,goPrev,goNext]);
  if(!slot)return null;
  const{tier,occ,tenant}=slot;
  const color=occ?tenant.c:TIER_COLOR[tier];
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(2,6,9,0.95)",backdropFilter:"blur(28px)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",opacity:entered?1:0,transition:"opacity 0.3s ease"}}>
      {!isMobile&&hasPrev&&<button onClick={e=>{e.stopPropagation();goPrev();}} className="focus-nav" style={{position:"fixed",left:"max(12px,calc(50% - 420px))",top:"50%",transform:"translateY(-50%)",width:48,height:48,borderRadius:"50%",background:"rgba(6,12,22,0.85)",backdropFilter:"blur(12px)",border:`1px solid ${D.bord2}`,color:D.txt,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1020}}>‹</button>}
      {!isMobile&&hasNext&&<button onClick={e=>{e.stopPropagation();goNext();}} className="focus-nav" style={{position:"fixed",right:"max(12px,calc(50% - 420px))",top:"50%",transform:"translateY(-50%)",width:48,height:48,borderRadius:"50%",background:"rgba(6,12,22,0.85)",backdropFilter:"blur(12px)",border:`1px solid ${D.bord2}`,color:D.txt,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1020}}>›</button>}
      <div onClick={e=>e.stopPropagation()} style={{width:isMobile?"100vw":"min(96vw,760px)",background:`linear-gradient(145deg,${D.s2},${D.card})`,border:`2px solid ${color}44`,borderRadius:isMobile?"24px 24px 0 0":20,overflow:"hidden",overflowY:"auto",maxHeight:isMobile?"88vh":"90vh",boxShadow:`0 0 0 1px ${color}18,0 40px 100px rgba(0,0,0,0.9),0 0 80px ${color}18`,transform:entered?(isMobile?undefined:`scale(1) translateX(${dir*-18}px)`):(isMobile?undefined:"scale(0.88) translateY(28px)"),transition:"transform 0.25s cubic-bezier(0.34,1.2,0.64,1)"}}>
        {isMobile&&<div style={{display:"flex",justifyContent:"center",padding:"10px 0 2px"}}><div style={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.2)"}}/></div>}
        <div style={{height:3,background:`linear-gradient(90deg,${color},${color}44,transparent)`}}/>
        <div style={{position:"absolute",top:isMobile?22:12,left:16,zIndex:10,padding:"3px 10px",borderRadius:20,background:`${TIER_COLOR[tier]}18`,border:`1px solid ${TIER_COLOR[tier]}40`,color:TIER_COLOR[tier],fontSize:8,fontWeight:800,letterSpacing:1}}>{TIER_LABEL[tier]} · €{TIER_PRICE[tier]}/j</div>
        <button onClick={onClose} style={{position:"absolute",top:isMobile?18:10,right:12,width:34,height:34,borderRadius:"50%",border:`1px solid ${D.bord2}`,background:D.faint,color:D.muted,cursor:"pointer",fontSize:18,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        {occ&&tenant?.img&&tier!=="thousand"&&<div style={{position:"relative",height:isMobile?160:220,overflow:"hidden",background:tenant.b}}><img src={tenant.img} alt={tenant.name} style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.75}}/><div style={{position:"absolute",inset:0,background:`linear-gradient(to top,${D.card}ee,transparent 60%)`}}/></div>}
        {occ&&tenant&&(
          <div style={{padding:isMobile?"16px 16px 20px":"22px 26px 24px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:isMobile?10:14,marginBottom:16}}>
              <div style={{width:54,height:54,borderRadius:14,flexShrink:0,background:`${color}20`,border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color,fontFamily:FF.h,boxShadow:`0 0 20px ${color}33`}}>{tenant.l}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:D.txt,fontWeight:900,fontSize:isMobile?17:20,fontFamily:FF.h,marginBottom:4}}>{tenant.name}</div>
                <div style={{color,fontSize:12,fontWeight:700,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tenant.slogan}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{padding:"2px 9px",borderRadius:20,background:`${color}18`,border:`1px solid ${color}44`,color,fontSize:9,fontWeight:800}}>{tenant.badge}</span>
                  <span style={{color:D.muted,fontSize:10}}>📍 {TIER_LABEL[tier]}</span>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,flexDirection:isMobile?"column":"row"}}>
              <a href={tenant.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{flex:1,padding:"12px 20px",borderRadius:12,background:`linear-gradient(135deg,${color}ee,${color}88)`,color:"#030810",fontWeight:900,fontSize:13,fontFamily:FF.b,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:`0 0 22px ${color}44`}}>{tenant.cta} →</a>
              <button onClick={()=>{onClose();onWaitlist();}} style={{padding:"12px 18px",borderRadius:12,fontFamily:FF.b,cursor:"pointer",background:`${D.violet}18`,border:`1px solid ${D.violet}44`,color:D.violet,fontWeight:700,fontSize:12}}>Louer ici →</button>
            </div>
          </div>
        )}
        {!occ&&(
          <div style={{padding:isMobile?"28px 20px":"40px 26px",textAlign:"center"}}>
            <div style={{fontSize:42,marginBottom:14,color:TIER_COLOR[tier]}}>◆</div>
            <div style={{color:D.txt,fontWeight:900,fontSize:20,fontFamily:FF.h,marginBottom:8}}>Espace disponible</div>
            <div style={{color:D.muted,fontSize:12,lineHeight:1.7,marginBottom:20}}>Bloc {TIER_LABEL[tier]} — €{TIER_PRICE[tier]}/jour.<br/>Ouvert à tous : créateur, freelance ou marque.</div>
            <button onClick={()=>{onClose();onWaitlist();}} style={{padding:"14px 28px",borderRadius:12,fontFamily:FF.b,cursor:"pointer",background:`linear-gradient(135deg,${TIER_COLOR[tier]}ee,${TIER_COLOR[tier]}88)`,border:"none",color:"#030810",fontWeight:900,fontSize:14,boxShadow:`0 0 28px ${TIER_COLOR[tier]}44`,width:isMobile?"100%":"auto"}}>📬 Réserver ma place →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function useGridLayout(){
  const GAP=2;
  const colWidths=useMemo(()=>Array.from({length:GRID_COLS},(_,x)=>{let m=0;for(let y=0;y<GRID_ROWS;y++)m=Math.max(m,TIER_SIZE[MASTER_SLOTS[y*GRID_COLS+x].tier]);return m;}),[]);
  const rowHeights=useMemo(()=>Array.from({length:GRID_ROWS},(_,y)=>{let m=0;for(let x=0;x<GRID_COLS;x++)m=Math.max(m,TIER_SIZE[MASTER_SLOTS[y*GRID_COLS+x].tier]);return m;}),[]);
  const colOffsets=useMemo(()=>{const o=[0];for(let x=0;x<GRID_COLS-1;x++)o.push(o[x]+colWidths[x]+GAP);return o;},[colWidths]);
  const rowOffsets=useMemo(()=>{const o=[0];for(let y=0;y<GRID_ROWS-1;y++)o.push(o[y]+rowHeights[y]+GAP);return o;},[rowHeights]);
  return{colOffsets,rowOffsets,totalGridW:colOffsets[GRID_COLS-1]+colWidths[GRID_COLS-1],totalGridH:rowOffsets[GRID_ROWS-1]+rowHeights[GRID_ROWS-1]};
}

function PublicView({onWaitlist}){
  const containerRef=useRef(null);
  const[containerW,setContainerW]=useState(1200);
  const[focusSlot,setFocusSlot]=useState(null);
  const[selected,setSelected]=useState(new Set());
  const[filterTier,setFilterTier]=useState("all");
  const[showVacant,setShowVacant]=useState(false);
  const[zoomLevel,setZoomLevel]=useState(0);
  const{colOffsets,rowOffsets,totalGridW,totalGridH}=useGridLayout();
  const{isMobile}=useScreenSize();
  useEffect(()=>{const el=containerRef.current;if(!el)return;const obs=new ResizeObserver(e=>setContainerW(e[0].contentRect.width));obs.observe(el);return()=>obs.disconnect();},[]);
  const baseScale=Math.min(1,Math.max(0.15,(containerW-(isMobile?16:32))/totalGridW));
  const scale=Math.min(2,Math.max(0.12,baseScale*Math.pow(1.25,zoomLevel)));
  const filteredSlots=useMemo(()=>{let s=MASTER_SLOTS;if(filterTier!=="all")s=s.filter(sl=>sl.tier===filterTier||(filterTier==="ten"&&sl.tier==="corner_ten"));if(showVacant)s=s.filter(sl=>!sl.occ);return new Set(s.map(sl=>sl.id));},[filterTier,showVacant]);
  const toggleSelect=slot=>{if(slot.occ)return;setSelected(prev=>{const n=new Set(prev);n.has(slot.id)?n.delete(slot.id):n.add(slot.id);return n;});};
  const stats=useMemo(()=>({occupied:MASTER_SLOTS.filter(s=>s.occ).length,vacant:MASTER_SLOTS.filter(s=>!s.occ).length}),[]);
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:D.bg}}>
      <div style={{padding:"8px 16px",borderBottom:`1px solid ${D.bord}`,background:D.s1,display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap"}}>
        {[["all","Tous",D.txt],["one","ÉPICENTRE",D.gold],["ten","PRESTIGE",D.rose],["hundred","BUSINESS",D.cyan],["thousand","VIRAL",D.mint]].map(([id,label,color])=>(
          <button key={id} onClick={()=>setFilterTier(id)} style={{padding:"4px 12px",borderRadius:20,fontFamily:FF.b,cursor:"pointer",fontSize:11,background:filterTier===id?`${color}20`:"transparent",border:`1px solid ${filterTier===id?color:D.bord}`,color:filterTier===id?color:D.muted,fontWeight:filterTier===id?800:400,transition:"all 0.2s",whiteSpace:"nowrap"}}>{label}</button>
        ))}
        <div style={{width:1,height:18,background:D.bord}}/>
        <button onClick={()=>setShowVacant(v=>!v)} style={{padding:"4px 12px",borderRadius:20,fontFamily:FF.b,cursor:"pointer",fontSize:11,background:showVacant?`${D.violet}20`:"transparent",border:`1px solid ${showVacant?D.violet:D.bord}`,color:showVacant?D.violet:D.muted}}>Disponibles</button>
        <div style={{marginLeft:"auto",display:"flex",gap:isMobile?8:16,alignItems:"center"}}>
          {!isMobile&&[[stats.occupied,"Démos",D.rose],[stats.vacant,"Libres",D.mint],[selected.size,"Sél.",D.violet]].map(([v,l,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:c,fontWeight:900,fontSize:13,fontFamily:FF.h}}>{v}</span><span style={{color:D.muted,fontSize:10}}>{l}</span></div>
          ))}
        </div>
        {selected.size>0&&<button onClick={onWaitlist} style={{padding:"6px 16px",borderRadius:9,fontFamily:FF.b,cursor:"pointer",background:`linear-gradient(135deg,${D.violet}ee,${D.violet}88)`,border:"none",color:"#030810",fontWeight:900,fontSize:12,boxShadow:`0 0 18px ${D.violet}44`}}>📬 Réserver {selected.size} bloc{selected.size>1?"s":""} →</button>}
      </div>
      <div ref={containerRef} style={{flex:1,overflow:"auto",padding:isMobile?8:16,position:"relative"}}>
        <div style={{position:"relative",width:totalGridW*scale,height:totalGridH*scale}}>
          <div style={{position:"absolute",top:0,left:0,transform:`scale(${scale})`,transformOrigin:"top left",width:totalGridW,height:totalGridH}}>
            {MASTER_SLOTS.map(slot=>(
              <div key={slot.id} style={{position:"absolute",left:colOffsets[slot.x],top:rowOffsets[slot.y],opacity:filteredSlots.has(slot.id)?1:0.08,transition:"opacity 0.25s"}}>
                <BlockCell slot={slot} isSelected={selected.has(slot.id)} onSelect={toggleSelect} onFocus={setFocusSlot}/>
              </div>
            ))}
          </div>
        </div>
        <div style={{position:"sticky",bottom:16,float:"right",zIndex:50,display:"flex",flexDirection:"column",gap:4,marginTop:-120,pointerEvents:"none"}}>
          {[{icon:"+",fn:()=>setZoomLevel(z=>Math.min(z+1,4))},{icon:"−",fn:()=>setZoomLevel(z=>Math.max(z-1,-3))}].map((z,i)=>(
            <button key={i} onClick={z.fn} style={{pointerEvents:"auto",width:40,height:40,borderRadius:12,background:"rgba(6,12,22,0.92)",backdropFilter:"blur(12px)",border:`1px solid ${D.bord2}`,color:D.txt,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{z.icon}</button>
          ))}
          {zoomLevel!==0&&<button onClick={()=>setZoomLevel(0)} style={{pointerEvents:"auto",width:40,height:40,borderRadius:12,background:"rgba(6,12,22,0.92)",backdropFilter:"blur(12px)",border:`1px solid ${D.bord2}`,color:D.txt,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>⟳</button>}
        </div>
      </div>
      {focusSlot&&<FocusModal slot={focusSlot} allSlots={MASTER_SLOTS} onClose={()=>setFocusSlot(null)} onWaitlist={onWaitlist} onNavigate={setFocusSlot}/>}
    </div>
  );
}

function AdvertiserView({selectedSlot,onWaitlist}){
  const[chosenSlot,setChosenSlot]=useState(selectedSlot||null);
  const[hoveredTier,setHoveredTier]=useState(null);
  const[selectedTier,setSelectedTier]=useState(null);
  const containerRef=useRef(null);
  const[containerW,setContainerW]=useState(1200);
  const{colOffsets,rowOffsets,totalGridW,totalGridH}=useGridLayout();
  const{isMobile}=useScreenSize();
  useEffect(()=>{const el=containerRef.current;if(!el)return;const obs=new ResizeObserver(e=>setContainerW(e[0].contentRect.width));obs.observe(el);return()=>obs.disconnect();},[]);
  const scale=Math.min(1,Math.max(0.2,(containerW-32)/totalGridW));
  const activeTier=selectedTier||hoveredTier;
  const tierStats=useMemo(()=>{const map={};for(const t of["one","ten","corner_ten","hundred","thousand"]){const slots=MASTER_SLOTS.filter(s=>s.tier===t);map[t]={total:slots.length,vacant:slots.filter(s=>!s.occ).length};}return map;},[]);
  const AnonBlock=({slot})=>{
    const{tier:t,occ}=slot;const sz=TIER_SIZE[t];const c=TIER_COLOR[t];
    const isChosen=chosenSlot?.id===slot.id;
    const isTierHighlighted=activeTier&&(t===activeTier||(activeTier==="ten"&&t==="corner_ten"));
    const dimmed=activeTier&&!isTierHighlighted;
    if(occ)return(<div style={{width:sz,height:sz,borderRadius:t==="one"?10:5,background:"rgba(10,15,25,0.9)",border:`1px solid ${isTierHighlighted?c+"55":"rgba(255,255,255,0.04)"}`,position:"relative",overflow:"hidden",flexShrink:0,opacity:dimmed?0.15:1,transition:"opacity 0.3s"}}><div style={{position:"absolute",inset:0,background:`${c}06`,display:"flex",alignItems:"center",justifyContent:"center"}}>{sz>=20&&<div style={{width:"40%",height:1.5,background:`${c}30`,borderRadius:1}}/>}</div></div>);
    return(<div className="block-hover" onClick={()=>{setChosenSlot(slot);setSelectedTier(slot.tier==="corner_ten"?"corner_ten":slot.tier);}} style={{width:sz,height:sz,flexShrink:0,position:"relative",borderRadius:t==="one"?10:t==="ten"||t==="corner_ten"?6:t==="hundred"?3:2,background:isChosen?`${c}22`:isTierHighlighted?`${c}0c`:D.s2,border:`${t==="corner_ten"?2:isChosen?2:1}px solid ${isChosen?c:isTierHighlighted?c:t==="corner_ten"?D.gold:`${c}25`}`,boxShadow:isChosen?`0 0 0 2px ${c},0 0 20px ${c}44`:t==="corner_ten"?`0 0 15px ${D.gold}44`:"none",cursor:"pointer",opacity:dimmed?0.15:1,transition:"opacity 0.3s,border-color 0.3s,background 0.3s",animation:isTierHighlighted&&!isChosen?"tierHighlight 2s ease-in-out infinite":t==="corner_ten"?"glowPulse 3s infinite":undefined,color:c}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 50%)",pointerEvents:"none"}}/>
      <div className="rent-cta" style={{position:"absolute",inset:0,background:isChosen?`${c}15`:"rgba(0,0,0,0.75)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
        {isChosen?<span style={{color:c,fontSize:Math.max(8,sz*0.3),fontWeight:900}}>✓</span>:sz>=28?(<><span style={{fontSize:Math.min(14,sz*0.22),color:c,fontWeight:900}}>+</span>{sz>=46&&<span style={{fontSize:Math.min(8,sz*0.13),color:c,fontWeight:700}}>{t==="corner_ten"?"CORNER":t==="one"?"ÉPICENTRE":"Choisir"}</span>}</>):<div style={{width:3,height:3,borderRadius:"50%",background:c}}/>}
      </div>
    </div>);
  };
  return(
    <div style={{flex:1,display:"flex",overflow:"hidden",background:D.bg,flexDirection:isMobile?"column":"row"}}>
      <div style={{width:isMobile?"100%":340,flexShrink:0,borderRight:isMobile?undefined:`1px solid ${D.bord}`,borderTop:isMobile?`1px solid ${D.bord}`:undefined,display:"flex",flexDirection:"column",background:D.s1,overflowY:"auto",order:isMobile?2:0,maxHeight:isMobile?"55vh":undefined}}>
        <div style={{padding:"18px 20px",borderBottom:`1px solid ${D.bord}`}}>
          <div style={{color:D.txt,fontWeight:900,fontSize:18,fontFamily:FF.h,marginBottom:6}}>Choisissez <span style={{color:D.gold}}>votre bloc</span></div>
          <div style={{color:D.muted,fontSize:11,lineHeight:1.6,marginBottom:10}}>Tous les blocs sont ouverts à tous — aucune restriction. Choisissez celui qui vous correspond.</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {PROFILES.map(p=>(<div key={p.id} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:20,background:`${p.color}10`,border:`1px solid ${p.color}33`}}><span style={{fontSize:11}}>{p.icon}</span><span style={{color:p.color,fontSize:9,fontWeight:700}}>{p.label}</span></div>))}
          </div>
        </div>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${D.bord}`}}>
          <div style={{color:D.muted,fontSize:9,fontWeight:700,letterSpacing:1.2,marginBottom:10}}>TIERS DISPONIBLES</div>
          {[{tier:"one",label:"ÉPICENTRE",desc:"Bloc central unique",icon:"◆",who:"Toute marque premium"},{tier:"corner_ten",label:"CORNER",desc:"4 coins emblématiques",icon:"⬛",who:"Marques & créateurs"},{tier:"ten",label:"PRESTIGE",desc:"Anneau autour du centre",icon:"💎",who:"Freelances & PME"},{tier:"hundred",label:"BUSINESS",desc:"Zone business principale",icon:"🏢",who:"Auto-entrepreneurs"},{tier:"thousand",label:"VIRAL",desc:"Maximum de portée",icon:"🚀",who:"Créateurs & particuliers"}].map(({tier:t,label,desc,icon,who})=>{
            const s=tierStats[t];const isHov=hoveredTier===t;const isSel=selectedTier===t;const c=TIER_COLOR[t];
            return(<div key={t} onMouseEnter={()=>setHoveredTier(t)} onMouseLeave={()=>setHoveredTier(null)} onClick={()=>setSelectedTier(prev=>prev===t?null:t)} style={{padding:"11px 14px",borderRadius:11,marginBottom:7,cursor:"pointer",background:isSel?`${c}18`:isHov?`${c}12`:D.faint,border:`1px solid ${isSel?c:isHov?c+"44":D.bord}`,transition:"all 0.2s",boxShadow:isSel?`0 0 16px ${c}33`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>{icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:c,fontWeight:900,fontSize:13,fontFamily:FF.h,letterSpacing:1}}>{label}</span>
                    {isSel&&<div style={{width:6,height:6,borderRadius:"50%",background:c,boxShadow:`0 0 8px ${c}`,animation:"blink 1.5s infinite"}}/>}
                  </div>
                  <div style={{color:D.muted,fontSize:10,marginTop:1}}>{desc}</div>
                  <div style={{color:`${c}88`,fontSize:9,marginTop:2}}>👤 {who}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:c,fontWeight:900,fontSize:13,fontFamily:FF.h}}>€{TIER_PRICE[t]}/j</div>
                  <div style={{color:D.muted,fontSize:9}}>{s.vacant} libres</div>
                </div>
              </div>
            </div>);
          })}
        </div>
        <div style={{padding:"16px 20px",flex:1}}>
          {chosenSlot?(
            <>
              <div style={{color:D.muted,fontSize:9,fontWeight:700,letterSpacing:1.2,marginBottom:10}}>BLOC SÉLECTIONNÉ</div>
              <div style={{padding:"12px 14px",borderRadius:12,background:`${TIER_COLOR[chosenSlot.tier]}10`,border:`1px solid ${TIER_COLOR[chosenSlot.tier]}35`,marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:D.txt,fontWeight:800,fontSize:13,fontFamily:FF.h}}>{TIER_LABEL[chosenSlot.tier]}</span>
                  <span style={{color:TIER_COLOR[chosenSlot.tier],fontWeight:900,fontSize:13,fontFamily:FF.h}}>€{TIER_PRICE[chosenSlot.tier]}/j</span>
                </div>
                <div style={{color:D.muted,fontSize:10}}>Position ({chosenSlot.x},{chosenSlot.y}) · 30j = €{TIER_PRICE[chosenSlot.tier]*30}</div>
              </div>
              <button onClick={onWaitlist} style={{width:"100%",padding:"13px",borderRadius:12,fontFamily:FF.b,cursor:"pointer",background:`linear-gradient(135deg,${D.cyan}ee,${D.cyan}88)`,border:"none",color:"#030810",fontWeight:900,fontSize:14,boxShadow:`0 0 22px ${D.cyan}44`}}>📬 Réserver ma place →</button>
              <div style={{color:D.muted,fontSize:10,textAlign:"center",marginTop:8}}>Paiements disponibles bientôt · Soyez notifié en premier</div>
            </>
          ):(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:32,marginBottom:12}}>🎯</div>
              <div style={{color:D.muted,fontSize:11,lineHeight:1.6,marginBottom:16}}>Survolez un tier pour surligner, puis cliquez sur un bloc libre dans la grille.</div>
              <button onClick={onWaitlist} style={{padding:"11px 20px",borderRadius:12,fontFamily:FF.b,cursor:"pointer",background:`${D.violet}18`,border:`1px solid ${D.violet}44`,color:D.violet,fontWeight:700,fontSize:12}}>📬 Liste d'attente</button>
            </div>
          )}
        </div>
      </div>
      <div ref={containerRef} style={{flex:1,overflow:"auto",padding:16,background:D.bg,order:isMobile?1:0,minHeight:isMobile?"30vh":undefined}}>
        <div style={{position:"relative",width:totalGridW*scale,height:totalGridH*scale}}>
          <div style={{position:"absolute",top:0,left:0,transform:`scale(${scale})`,transformOrigin:"top left",width:totalGridW,height:totalGridH}}>
            {MASTER_SLOTS.map(slot=>(<div key={slot.id} style={{position:"absolute",left:colOffsets[slot.x],top:rowOffsets[slot.y]}}><AnonBlock slot={slot}/></div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage({onPublic,onAdvertiser,onWaitlist}){
  const{isMobile}=useScreenSize();
  const stats=useMemo(()=>({occupied:MASTER_SLOTS.filter(s=>s.occ).length,vacant:MASTER_SLOTS.filter(s=>!s.occ).length}),[]);
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:isMobile?"24px 16px":40,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,overflow:"hidden",opacity:0.1,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?8:12},${isMobile?14:18}px)`,gap:2}}>
          {MASTER_SLOTS.slice(0,isMobile?64:144).map(s=>(<div key={s.id} style={{width:isMobile?14:18,height:isMobile?14:18,borderRadius:2,background:s.occ?(s.tenant.c+"33"):D.s2,border:`1px solid ${s.occ?s.tenant.c+"22":D.bord}`}}/>))}
        </div>
      </div>
      <div style={{position:"relative",zIndex:10,maxWidth:620,textAlign:"center",animation:"fadeUp 0.6s ease forwards",width:"100%"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 14px",borderRadius:20,marginBottom:20,background:`${D.violet}15`,border:`1px solid ${D.violet}35`,color:D.violet,fontSize:10,fontWeight:800,letterSpacing:1}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:D.violet,animation:"blink 1.8s infinite"}}/>
          BÊTA PUBLIQUE · LANCEMENT IMMINENT
        </div>
        <h1 style={{color:D.txt,fontWeight:900,fontSize:"clamp(32px,7vw,54px)",lineHeight:1.05,fontFamily:FF.h,letterSpacing:-1,margin:"0 0 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${D.cyan}33,${D.violet}22)`,border:`2px solid ${D.cyan}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:D.cyan,fontSize:24,fontWeight:900,fontFamily:FF.h}}>□</span>
          </div>
          <span>ADS<span style={{color:D.cyan}}>-</span>SQUARE</span>
        </h1>
        <div style={{fontSize:"clamp(13px,2.5vw,18px)",letterSpacing:3,color:D.muted,fontWeight:700,fontFamily:FF.h,marginBottom:14}}>PUBLICITÉ POUR TOUS</div>
        <p style={{color:D.muted,fontSize:"clamp(12px,2.5vw,14px)",lineHeight:1.7,maxWidth:480,margin:"0 auto 24px"}}>
          Une grille de blocs publicitaires ouverts à tous —<br/>
          <span style={{color:D.mint}}>créateur</span>, <span style={{color:D.cyan}}>auto-entrepreneur</span> ou <span style={{color:D.gold}}>grande marque</span>.<br/>
          Choisissez votre bloc. Diffusez votre contenu. Dès 1€/jour.
        </p>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:24,flexWrap:"wrap"}}>
          {PROFILES.map(p=>(<div key={p.id} className="profile-card" onClick={onAdvertiser} style={{padding:"12px 16px",borderRadius:14,background:`${p.color}0c`,border:`1px solid ${p.color}33`,textAlign:"center",minWidth:isMobile?90:120}}>
            <div style={{fontSize:22,marginBottom:4}}>{p.icon}</div>
            <div style={{color:p.color,fontWeight:800,fontSize:11,fontFamily:FF.h,marginBottom:2}}>{p.label}</div>
            <div style={{color:D.muted,fontSize:9,marginBottom:5}}>{p.desc}</div>
            <div style={{color:p.color,fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:20,background:`${p.color}15`,display:"inline-block"}}>{p.blocs}</div>
          </div>))}
        </div>
        <div style={{display:"flex",gap:isMobile?16:32,justifyContent:"center",marginBottom:28,flexWrap:"wrap"}}>
          {[[stats.occupied.toLocaleString(),"Blocs démo",D.rose],[stats.vacant.toLocaleString(),"Blocs libres",D.mint],["1 369","Total blocs",D.cyan],["1€","Prix départ",D.gold]].map(([v,l,c])=>(
            <div key={l} style={{textAlign:"center"}}><div style={{color:c,fontWeight:900,fontSize:isMobile?20:24,fontFamily:FF.h}}>{v}</div><div style={{color:D.muted,fontSize:10,marginTop:2}}>{l}</div></div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button className="landing-btn" onClick={onPublic} style={{padding:isMobile?"12px 18px":"16px 24px",borderRadius:16,background:`${D.cyan}0a`,border:`2px solid ${D.cyan}44`,cursor:"pointer",fontFamily:FF.b,color:D.cyan,fontWeight:800,fontSize:13,display:"flex",alignItems:"center",gap:8}}>👁 Explorer la grille</button>
          <button className="landing-btn" onClick={onAdvertiser} style={{padding:isMobile?"12px 18px":"16px 24px",borderRadius:16,background:`${D.gold}0a`,border:`2px solid ${D.gold}44`,cursor:"pointer",fontFamily:FF.b,color:D.gold,fontWeight:800,fontSize:13,display:"flex",alignItems:"center",gap:8}}>📢 Choisir mon bloc</button>
          <button className="landing-btn" id="waitlist" onClick={onWaitlist} style={{padding:isMobile?"12px 18px":"16px 24px",borderRadius:16,background:`linear-gradient(135deg,${D.violet}dd,${D.violet}99)`,border:"none",cursor:"pointer",fontFamily:FF.b,color:"#030810",fontWeight:900,fontSize:13,display:"flex",alignItems:"center",gap:8,boxShadow:`0 0 30px ${D.violet}44`}}>📬 Liste d'attente</button>
        </div>
        <div style={{marginTop:14,color:D.muted,fontSize:11}}>Pas de budget minimum · Pas d'agence · Résultat immédiat</div>
      </div>
    </div>
  );
}

export default function App(){
  const[view,setView]=useState("landing");
  const[rentSlot,setRentSlot]=useState(null);
  const[showWaitlist,setShowWaitlist]=useState(false);
  const{isMobile}=useScreenSize();
  const handleWaitlist=useCallback(()=>setShowWaitlist(true),[]);
  const isFullscreen=view==="public"||view==="advertiser";
  return(
    <div style={{display:"flex",height:"100vh",background:D.bg,fontFamily:FF.b,color:D.txt,overflow:"hidden",flexDirection:"column"}}>
      <style dangerouslySetInnerHTML={{__html:GLOBAL_CSS}}/>
      <BetaBanner/>
      {!isFullscreen?(
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isMobile?"0 12px":"0 24px",height:52,flexShrink:0,borderBottom:`1px solid ${D.bord}`,background:`${D.s1}e8`,backdropFilter:"blur(14px)",zIndex:100}}>
          <BrandLogo size={isMobile?16:20} onClick={()=>setView("landing")}/>
          <nav style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setView("public")} style={{padding:"5px 12px",borderRadius:8,fontFamily:FF.b,cursor:"pointer",background:"transparent",border:`1px solid ${D.bord}`,color:D.muted,fontSize:11}}>👁{isMobile?"":" Explorer"}</button>
            <button onClick={()=>setView("advertiser")} style={{padding:"6px 14px",borderRadius:9,fontFamily:FF.b,cursor:"pointer",background:`${D.gold}18`,border:`1px solid ${D.gold}44`,color:D.gold,fontSize:11,fontWeight:700}}>📢{isMobile?"":" Mon bloc"}</button>
            <button onClick={handleWaitlist} style={{padding:"6px 14px",borderRadius:9,fontFamily:FF.b,cursor:"pointer",background:`${D.violet}18`,border:`1px solid ${D.violet}44`,color:D.violet,fontSize:11,fontWeight:700}}>📬{isMobile?"":" Attente"}</button>
          </nav>
        </header>
      ):(
        <div style={{position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",zIndex:200,display:"flex",alignItems:"center",gap:6,background:"rgba(6,12,22,0.88)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:40,padding:"7px 14px",boxShadow:"0 4px 32px rgba(0,0,0,0.6)",maxWidth:"calc(100vw - 24px)"}}>
          <BrandLogo size={isMobile?12:14} onClick={()=>setView("landing")}/>
          <div style={{width:1,height:16,background:"rgba(255,255,255,0.12)"}}/>
          {[["public","👁","Explorer",D.cyan],["advertiser","📢","Mon bloc",D.gold]].map(([v,ico,l,c])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"4px 10px",borderRadius:20,fontFamily:FF.b,cursor:"pointer",background:view===v?`${c}22`:"transparent",border:`1px solid ${view===v?c+"77":"transparent"}`,color:view===v?c:D.muted,fontWeight:view===v?800:400,fontSize:10,display:"flex",alignItems:"center",gap:4}}>
              <span>{ico}</span>{isMobile?"":l}
            </button>
          ))}
          <div style={{width:1,height:16,background:"rgba(255,255,255,0.12)"}}/>
          <button onClick={handleWaitlist} style={{padding:"4px 10px",borderRadius:20,fontFamily:FF.b,cursor:"pointer",background:`${D.violet}18`,border:`1px solid ${D.violet}44`,color:D.violet,fontSize:10,fontWeight:700}}>📬</button>
        </div>
      )}
      {view==="landing"&&<LandingPage onPublic={()=>setView("public")} onAdvertiser={()=>setView("advertiser")} onWaitlist={handleWaitlist}/>}
      {view==="public"&&<PublicView onWaitlist={handleWaitlist}/>}
      {view==="advertiser"&&<AdvertiserView selectedSlot={rentSlot} onWaitlist={handleWaitlist}/>}
      {showWaitlist&&<WaitlistModal onClose={()=>setShowWaitlist(false)}/>}
    </div>
  );
}
