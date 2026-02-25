'use client';
/**
 * ADS·SQUARE — DYSON SPHERE ✦ MEGASTRUCTURE EDITION
 *
 * Philosophie de rendu radicalement nouvelle :
 * ─ Panneaux SOLIDES OPAQUES (dark metal) qui BLOQUENT la lumière
 * ─ Étoile centrale brillant à travers les GAPS naturellement
 * ─ Taille des panneaux DRAMATIQUEMENT différente par tier
 * ─ Épicentre = panneau géant, Viral = fragments minuscules
 * ─ God rays : shafts radiales depuis le centre, visibles à travers les gaps
 * ─ Inner glow sphere : lumière chaude interne qui filtre par les interstices
 * ─ Anneaux massifs et structurels (style image 3)
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ── Design System ──────────────────────────────────────────────────────────────
const DS = {
  void:'#05060A', glass:'rgba(6,8,14,0.82)', glassBrd:'rgba(255,255,255,0.06)',
  glassBrdHi:'rgba(255,255,255,0.12)', gold:'#FFB700', cyan:'#00D4FF',
  violet:'#9D50FF', green:'#00FF94', rose:'#FF3D72',
  textHi:'#EEF2FF', textMid:'rgba(200,212,248,0.70)', textLo:'rgba(140,162,220,0.36)',
};
const TIER_NEON = {
  epicenter:'#FFB700', prestige:'#FF5E9C', elite:'#9D50FF',
  business:'#00D4FF', standard:'#38BEFF', viral:'#00FF94',
};
const TIER_ROLE = {
  epicenter:{ icon:'☀', role:'Source Absolue',      desc:"L'étoile. Votre marque EST l'épicentre. Impossible à ignorer." },
  prestige: { icon:'◈', role:'Capteurs Primaires',   desc:'Panneaux géants, proches de l\'étoile. ROI maximal.' },
  elite:    { icon:'◆', role:'Cristaux Énergétiques',desc:'Zone élite. Grands panneaux, fort rayonnement.' },
  business: { icon:'▣', role:'Relais Technologiques',desc:'Présence solide sur la sphère. Trafic qualifié.' },
  standard: { icon:'▪', role:'Émetteurs Standard',   desc:'Entrée sur la sphère. Visibilité globale.' },
  viral:    { icon:'⚡', role:'Drones Orbitaux',      desc:'Micro-fragments qui orbitent. Tâches marketing.' },
};
const F = { ui:"'Sora','DM Sans',system-ui,sans-serif", mono:"'JetBrains Mono','Fira Code',monospace" };
const TIER_ORDER  = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_TOTALS = { epicenter:1, prestige:8, elite:50, business:176, standard:400, viral:671 };
const LEVELS = [
  {n:0,name:'GRID 2D',icon:'▦',faces:0}, {n:1,name:'CUBE',icon:'⬡',faces:6},
  {n:2,name:'OCTA',icon:'◆',faces:8},   {n:3,name:'ICO',icon:'⬟',faces:20},
  {n:4,name:'SPHERE·I',icon:'◎',faces:80}, {n:5,name:'SPHERE·II',icon:'◉',faces:320},
  {n:6,name:'COSMOS',icon:'✦',faces:1280},
];

const SPHERE_R  = 5.8;
const PANEL_GAP = 0.82; // base contraction
const STAR_R    = 1.15;
const fmt  = t => ((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const hex3 = h => { const s=(h||'#aaa').replace('#',''); return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]; };

// Taille réelle des panneaux par tier — la différence DOIT être dramatique
const TIER_PANEL_SCALE = {
  epicenter: 1.22,  // panneau quasi-plein (gap=0.82*1.22≈1.0 → immense)
  prestige:  1.05,  // très grand
  elite:     0.88,  // grand
  business:  0.70,  // moyen
  standard:  0.52,  // petit
  viral:     0.26,  // minuscule (beaucoup d'espace vide autour)
};

// ── GLSL : Panneaux solides opaques ────────────────────────────────────────────
const PANEL_VERT = `
precision highp float;
attribute float aOccupied; attribute vec3 aTierColor; attribute float aTierIdx;
attribute float aFaceIdx;  attribute vec3 aBary;
uniform float uTime, uHovered, uSelected;
varying vec3  vN, vWP, vTC, vBary;
varying float vOcc, vTI, vFI, vFresnel, vHov, vSel;
void main(){
  vN  = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;
  vOcc=aOccupied; vTC=aTierColor; vTI=aTierIdx; vFI=aFaceIdx; vBary=aBary;
  vHov = step(abs(aFaceIdx-uHovered), 0.5);
  vSel = step(abs(aFaceIdx-uSelected),0.5);
  vec3 vd = normalize(cameraPosition - wp.xyz);
  vFresnel = pow(clamp(1.0-abs(dot(vN,vd)),0.0,1.0), 3.5);
  vec3 pos = position;
  // Hover / select lift
  if(vSel>0.5)      pos += normalize(position)*(0.18+0.06*sin(uTime*3.5));
  else if(vHov>0.5) pos += normalize(position)*0.10;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const PANEL_FRAG = `
precision highp float;
#extension GL_OES_standard_derivatives : enable
uniform float uTime;
varying vec3  vN, vWP, vTC, vBary;
varying float vOcc, vTI, vFI, vFresnel, vHov, vSel;

float edgeF(float w){ vec3 d=fwidth(vBary); vec3 a=smoothstep(vec3(0.0),d*w,vBary); return 1.0-min(min(a.x,a.y),a.z); }
float hash(float n){ return fract(sin(n)*43758.5453); }

void main(){
  float t = uTime;
  int   ti = int(vTI+0.5);
  bool  hov = vHov>0.5, sel = vSel>0.5;

  float seed  = hash(vFI*13.7+2.3);
  float pulse = 0.72 + 0.28*sin(t*(0.6+seed*0.4)+seed*6.28);
  float edge1 = edgeF(0.8);   // core edge trim
  float edge3 = edgeF(4.0);   // glow halo
  float edge8 = edgeF(10.0);  // wide ambient

  // ── Face externe (gl_FrontFacing) — métal sombre visible depuis l'extérieur
  if(gl_FrontFacing){
    // Base métal très sombre, légèrement bleuté
    vec3 base = vec3(0.055, 0.065, 0.095);

    // Liseret lumineux sur les arêtes — couleur tier
    float trimBright = (sel?3.2:(hov?2.2:1.4)) * pulse;
    vec3  trim = vTC * edge1 * trimBright + vTC * edge3 * 0.45 + vTC * edge8 * 0.12;

    // Panneau occupé : teinte de marque sur la surface
    vec3 brandFill = vec3(0.0);
    if(vOcc > 0.5){
      // Surface tintée couleur marque — plus visible sur les grands tiers
      float fillStr = ti==0?0.28:(ti==1?0.20:(ti==2?0.14:(ti==3?0.09:0.05)));
      brandFill = vTC * fillStr * pulse;
      // Pattern subtil selon tier
      if(ti==0){ // Épicentre : maille or pulsante
        float grid = max(step(0.94,fract(vWP.x*3.5)), step(0.94,fract(vWP.y*3.5)));
        brandFill += vTC * grid * 0.18 * pulse;
      } else if(ti==1){ // Prestige : scanlines
        float scan = step(0.88,fract(vWP.y*8.0-t*0.4))*0.12;
        brandFill += vTC * scan;
      }
    }

    // Fresnel rim — halo sur les bords du panneau (lumière interne qui déborde)
    float rimStr = ti==0?1.8:(ti==1?1.3:(ti==2?0.9:0.5));
    vec3 rim = vTC * pow(vFresnel,2.2) * rimStr * pulse;

    vec3 color = base + trim + brandFill + rim;

    // Surbrillance sélection
    if(sel){ vec3 flash = vec3(1.0,0.85,0.2)*edge3*0.8; color += flash; }

    gl_FragColor = vec4(color, 1.0); // OPAQUE — bloque la lumière interne

  } else {
    // ── Face interne — capteur solaire tourné vers l'étoile
    // Visible seulement depuis les gaps — chaud, lumineux
    vec3 starDir  = normalize(-vWP);
    float diffuse = max(0.0, dot(-vN, starDir));
    vec3 warmBase = mix(vec3(0.9,0.55,0.1), vec3(1.0,0.85,0.4), diffuse);
    vec3 inner    = warmBase * (0.35+diffuse*0.65);
    if(vOcc>0.5) inner = mix(inner, vTC*1.8, 0.45); // couleur marque sur face interne
    gl_FragColor = vec4(inner, 1.0);
  }
}`;

// ── GLSL : Sphère de lueur interne (god rays naturels) ────────────────────────
const IGLOW_VERT = `varying vec3 vN; varying vec3 vWP;
void main(){ vN=normalize(normalMatrix*normal); vec4 wp=modelMatrix*vec4(position,1.0); vWP=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const IGLOW_FRAG = `
precision highp float;
uniform float uTime; varying vec3 vN; varying vec3 vWP;
void main(){
  vec3 vd = normalize(cameraPosition - vWP);
  float fresnel = pow(clamp(1.0-dot(vN,vd),0.0,1.0),1.4);
  float pulse = 0.75+0.25*sin(uTime*0.7);
  vec3 col = mix(vec3(1.0,0.95,0.70), vec3(1.0,0.45,0.05), fresnel);
  float alpha = (0.18 + fresnel*0.55)*pulse;
  gl_FragColor = vec4(col*1.8, clamp(alpha,0.0,0.88));
}`;

// ── GLSL : God ray shafts radiales ────────────────────────────────────────────
const GRAY_VERT = `varying float vR; varying float vAlpha;
attribute float aAlpha;
void main(){ vR=length(position); vAlpha=aAlpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const GRAY_FRAG = `
precision highp float;
uniform float uTime; varying float vR; varying float vAlpha;
void main(){
  float fade  = smoothstep(${(SPHERE_R*1.12).toFixed(2)}, 1.0, vR);
  float pulse = 0.6+0.4*sin(uTime*0.4+vR*1.5);
  vec3 col    = mix(vec3(1.0,0.90,0.50), vec3(1.0,0.50,0.08), vR/${(SPHERE_R*1.1).toFixed(2)});
  gl_FragColor = vec4(col*pulse, vAlpha*fade*0.5);
}`;

// ── GLSL : Étoile plasma ──────────────────────────────────────────────────────
const STAR_VERT = `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const STAR_FRAG = `
precision highp float;
uniform float uTime; varying vec2 vU;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*h2(p);p*=2.2;a*=0.48;}return v;}
void main(){
  vec2 uv=vU*2.0-1.0; float r=length(uv); if(r>1.0)discard;
  vec2 uv2=uv+vec2(sin(uTime*0.28)*0.09,cos(uTime*0.22)*0.07);
  float t=fbm(uv2*4.5+uTime*0.18)+fbm(uv2*9.0-uTime*0.11)*0.4;
  float core=1.0-smoothstep(0.0,0.55,r), edge=1.0-smoothstep(0.45,1.0,r);
  float ray=pow(max(0.0,sin(atan(uv.y,uv.x)*8.0+uTime*1.2)*0.5+0.5),3.0)*0.35;
  vec3 plasma=mix(vec3(0.97,0.18,0.0),vec3(1.0,0.72,0.08),core+t*0.4);
  plasma=mix(plasma,vec3(1.0,0.98,0.82),core*core);
  plasma+=vec3(1.0,0.5,0.0)*ray*edge*0.6;
  gl_FragColor=vec4(plasma*5.0,edge*(0.94+t*0.06));
}`;

// ── GLSL : Anneau structural ──────────────────────────────────────────────────
const RING_VERT = `varying float vA; varying vec3 vWP;
void main(){ vA=atan(position.z,position.x); vWP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const RING_FRAG = `
precision highp float;
uniform float uTime; uniform vec3 uCol; uniform float uAlpha; uniform float uWidth;
varying float vA; varying vec3 vWP;
void main(){
  float pulse = 0.55+0.45*sin(uTime*1.1+vA*4.0);
  float tv    = fract(vA/6.28318+uTime*0.10);
  float spark = pow(smoothstep(0.0,0.06,tv)*smoothstep(0.16,0.06,tv),2.0)*1.4;
  float glow  = pulse*1.6 + spark*3.0;
  gl_FragColor = vec4(uCol*glow, uAlpha*(0.22+pulse*0.55+spark*0.8));
}`;

// ── GLSL : Essaim viral ───────────────────────────────────────────────────────
const VIRAL_VERT = `
precision highp float;
attribute float aPhase,aSpeed,aAxis,aRadius;
uniform float uTime; varying float vBright;
void main(){
  float t=uTime*aSpeed+aPhase;
  float ca=cos(aAxis),sa=sin(aAxis),co=cos(t),si=sin(t);
  float r=aRadius*(1.0+0.10*sin(t*1.9+aPhase));
  vec3 pos=vec3(co*ca-si*sa*0.35, si*0.72, co*sa+si*ca*0.35)*r;
  vBright=0.40+0.60*sin(t*2.5+aPhase*5.0);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  gl_PointSize=clamp((1.2+vBright*2.5)*(260.0/gl_Position.w),1.0,6.0);
}`;
const VIRAL_FRAG = `
precision highp float; varying float vBright;
void main(){
  vec2 c=gl_PointCoord-0.5; if(length(c)>0.5)discard;
  float g=1.0-length(c)*2.0;
  gl_FragColor=vec4(mix(vec3(0.0,0.82,0.50),vec3(0.45,1.0,0.72),vBright)*g*2.5,g*g*(0.45+vBright*0.55));
}`;

// ── Géométrie ─────────────────────────────────────────────────────────────────
const ins=(vs,c,f)=>vs.map(v=>[c[0]+(v[0]-c[0])*f,c[1]+(v[1]-c[1])*f,c[2]+(v[2]-c[2])*f]);
const cN =vs=>[vs.reduce((s,v)=>s+v[0],0)/vs.length,vs.reduce((s,v)=>s+v[1],0)/vs.length,vs.reduce((s,v)=>s+v[2],0)/vs.length];
const mS =(a,b)=>{const m=a.map((c,i)=>(c+b[i])/2),l=Math.hypot(...m);return m.map(c=>c/l);};
function buildCubeFaces(){const a=SPHERE_R/Math.sqrt(3);return[[[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],[[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],[[-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]],[[a,-a,-a],[-a,-a,-a],[-a,a,-a],[a,a,-a]],[[a,-a,a],[a,a,a],[a,a,-a],[a,-a,-a]],[[-a,-a,-a],[-a,a,-a],[-a,a,a],[-a,-a,a]]].map(vs=>{const c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:true};});}
function buildOctaFaces(){const R=SPHERE_R,v=[[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];return[[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]].map(fi=>{const vs=fi.map(i=>v[i]),c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:false};});}
function buildIcoFaces(sub){const phi=(1+Math.sqrt(5))/2;const rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(c=>c/l);});let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]].map(f=>f.map(i=>rv[i]));for(let s=0;s<sub;s++){const nx=[];for(const[a,b,c]of faces){const ab=mS(a,b),bc=mS(b,c),ca=mS(c,a);nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}faces=nx;}const R=SPHERE_R;return faces.map(([a,b,c])=>{const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];const cnt=cN(vs);return{verts:ins(vs,cnt,PANEL_GAP),centroid:cnt,isQuad:false};});}
function getFaces(n){switch(n){case 1:return buildCubeFaces();case 2:return buildOctaFaces();case 3:return buildIcoFaces(0);case 4:return buildIcoFaces(1);case 5:return buildIcoFaces(2);case 6:return buildIcoFaces(3);default:return[];}}

// Rescale les verts d'un face depuis son centroïde avec le facteur tier
function rescaleVerts(face, tier){
  const adj = (TIER_PANEL_SCALE[tier] || 0.82) / PANEL_GAP;
  const c   = face.centroid;
  return face.verts.map(v=>[
    c[0]+(v[0]-c[0])*adj,
    c[1]+(v[1]-c[1])*adj,
    c[2]+(v[2]-c[2])*adj,
  ]);
}

function buildPanelBufs(faces){
  let nT=0;for(const f of faces)nT+=f.isQuad?2:1;
  const pos=new Float32Array(nT*9),nrm=new Float32Array(nT*9);
  const occ=new Float32Array(nT*3),tc=new Float32Array(nT*9);
  const ti=new Float32Array(nT*3),fi=new Float32Array(nT*3),bary=new Float32Array(nT*9);
  const t2f=new Int32Array(nT);
  let v=0,t=0;
  const tn=(a,b,c)=>{const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l);};
  const push=(x,y,z,nx,ny,nz,o,r,g,b,tiv,fiv,bx,by,bz)=>{const i=v*3;pos[i]=x;pos[i+1]=y;pos[i+2]=z;nrm[i]=nx;nrm[i+1]=ny;nrm[i+2]=nz;occ[v]=o;tc[i]=r;tc[i+1]=g;tc[i+2]=b;ti[v]=tiv;fi[v]=fiv;bary[i]=bx;bary[i+1]=by;bary[i+2]=bz;v++;};
  faces.forEach((face,fI)=>{
    const s=face.slot; const isO=s?.occ?1:0; const tier=s?.tier||'viral';
    const rgb=hex3(TIER_NEON[tier]||'#00FF94');
    const tiv=TIER_ORDER.indexOf(tier)<0?5:TIER_ORDER.indexOf(tier);
    const vs = rescaleVerts(face, tier); // tier-specific panel size!
    const n0=tn(vs[0],vs[1],vs[2]);
    push(vs[0][0],vs[0][1],vs[0][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);
    push(vs[1][0],vs[1][1],vs[1][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);
    push(vs[2][0],vs[2][1],vs[2][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);
    t2f[t++]=fI;
    if(face.isQuad){const n1=tn(vs[0],vs[2],vs[3]);push(vs[0][0],vs[0][1],vs[0][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);push(vs[2][0],vs[2][1],vs[2][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);push(vs[3][0],vs[3][1],vs[3][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);t2f[t++]=fI;}
  });
  return{pos,nrm,occ,tc,ti,fi,bary,t2f};
}

const sortSlots=s=>[...(s||[])].filter(Boolean).sort((a,b)=>{const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);return d||((b.occ?1:0)-(a.occ?1:0));});
const sortPole =f=>[...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);

// ── Scene3D ────────────────────────────────────────────────────────────────────
class Scene3D{
  constructor(canvas){
    Object.assign(this,{
      canvas,T:null,G:null,renderer:null,scene:null,camera:null,
      panelMesh:null,starMesh:null,halos:[],innerGlow:null,
      godRays:null,rings:[],viralSwarm:null,starfield:null,
      raycaster:null,triToFace:null,faceSlots:[],_faces:null,
      rot:{x:0.12,y:0},vel:{x:0,y:0},isDragging:false,
      pinchDist:null,touchStart:null,
      zoomTarget:22,zoomCurrent:22,hovFace:-1,selFace:-1,
      animId:null,transitioning:false,onHover:null,onClick:null,_h:{},
      _t0:Date.now(),_pU:null,_sU:null,_igU:null,_grU:null,_vU:null,_rUs:[],
    });
  }

  async init(THREE,GSAP){
    this.T=THREE; this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;
    const r=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(devicePixelRatio,2));
    r.setSize(W,H,false);
    r.setClearColor(0x05060A,1);
    r.toneMapping=THREE.ACESFilmicToneMapping;
    r.toneMappingExposure=1.6;
    this.renderer=r;
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x05060A,0.005);
    this.camera=new THREE.PerspectiveCamera(40,W/H,0.1,600);
    this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();

    // Lumières
    this.scene.add(new THREE.AmbientLight(0x080B14,6.0));
    this._sl=new THREE.PointLight(0xFFF4D0,35,120,1.2); this.scene.add(this._sl);
    this._cl=new THREE.PointLight(0xFF6600,12,70,1.8);  this.scene.add(this._cl);
    const dl=new THREE.DirectionalLight(0x1A2460,0.9); dl.position.set(-20,-8,-18); this.scene.add(dl);

    this._buildStarfield();
    this._buildStar();
    this._buildInnerGlow(); // god rays naturels
    this._buildGodRays();   // shafts radiales
    this._buildRings();
    this._buildViralSwarm();
    this._bindEvents();
    this._animate();
  }

  _buildStarfield(){
    const T=this.T,N=10000;
    const p=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=80+Math.random()*350;
      p[i*3]=r*Math.sin(ph)*Math.cos(th); p[i*3+1]=r*Math.sin(ph)*Math.sin(th); p[i*3+2]=r*Math.cos(ph);
      const q=Math.random();
      if(q<0.12){col[i*3]=0.52;col[i*3+1]=0.72;col[i*3+2]=1.0;}
      else if(q<0.50){col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.92;}
      else if(q<0.78){col[i*3]=1.0;col[i*3+1]=0.82;col[i*3+2]=0.44;}
      else{col[i*3]=0.76;col[i*3+1]=0.38;col[i*3+2]=1.0;}
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(p,3));
    g.setAttribute('color',  new T.BufferAttribute(col,3));
    this.starfield=new T.Points(g,new T.PointsMaterial({size:0.20,vertexColors:true,transparent:true,opacity:0.90,sizeAttenuation:true,depthWrite:false}));
    this.scene.add(this.starfield);
  }

  _buildStar(){
    const T=this.T;
    const u={uTime:{value:0}}; this._sU=u;
    this.starMesh=new T.Mesh(
      new T.SphereGeometry(STAR_R,64,64),
      new T.ShaderMaterial({vertexShader:STAR_VERT,fragmentShader:STAR_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending})
    );
    this.scene.add(this.starMesh);
    this.halos=[];
    for(const[r,col,op]of[
      [STAR_R*1.8,0xFFFFF0,0.70],[STAR_R*3.2,0xFFCC44,0.38],
      [STAR_R*6.0,0xFF8800,0.18],[STAR_R*12,0x551100,0.08],
    ]){
      const m=new T.Mesh(new T.SphereGeometry(r,16,16),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending}));
      this.scene.add(m); this.halos.push(m);
    }
  }

  // Sphère interne lumineuse — ses faces sont visibles UNIQUEMENT à travers les gaps des panneaux solides
  _buildInnerGlow(){
    const T=this.T;
    const u={uTime:{value:0}}; this._igU=u;
    // Sphère légèrement plus petite que la sphère de panneaux
    this.innerGlow=new T.Mesh(
      new T.SphereGeometry(SPHERE_R*0.90,48,48),
      new T.ShaderMaterial({
        vertexShader:IGLOW_VERT, fragmentShader:IGLOW_FRAG, uniforms:u,
        transparent:true, depthWrite:false,
        depthTest:true,   // CRUCIAL : occulté par les panneaux solides
        blending:T.AdditiveBlending,
        side:T.FrontSide,
      })
    );
    // Rendu APRÈS les panneaux opaques grâce au système de passes de Three.js
    this.innerGlow.renderOrder=1;
    this.scene.add(this.innerGlow);
  }

  // God rays : shafts radiales depuis le centre vers l'extérieur
  _buildGodRays(){
    const T=this.T;
    const N=160;
    const verts=[],alphas=[];

    for(let i=0;i<N;i++){
      const phi=Math.random()*Math.PI*2;
      const theta=Math.acos(2*Math.random()-1);
      const dx=Math.sin(theta)*Math.cos(phi);
      const dy=Math.cos(theta);
      const dz=Math.sin(theta)*Math.sin(phi);

      // Perpendiculaire
      let ux=0,uy=1,uz=0;
      if(Math.abs(dy)>0.9){ux=1;uy=0;uz=0;}
      const px=uy*dz-uz*dy, py=uz*dx-ux*dz, pz=ux*dy-uy*dx;
      const pl=Math.sqrt(px*px+py*py+pz*pz)||1;
      const pxn=px/pl,pyn=py/pl,pzn=pz/pl;

      const w    = 0.04+Math.random()*0.12;
      const nearR= STAR_R*1.5;
      const farR = SPHERE_R*(1.05+Math.random()*0.15);
      const alpha= 0.08+Math.random()*0.22;
      const wFar = w*0.15; // shaft se rétrécit en s'éloignant

      const p0=[dx*nearR-pxn*w,  dy*nearR-pyn*w,  dz*nearR-pzn*w];
      const p1=[dx*nearR+pxn*w,  dy*nearR+pyn*w,  dz*nearR+pzn*w];
      const p2=[dx*farR +pxn*wFar,dy*farR +pyn*wFar,dz*farR +pzn*wFar];
      const p3=[dx*farR -pxn*wFar,dy*farR -pyn*wFar,dz*farR -pzn*wFar];

      verts.push(...p0,...p1,...p2,...p0,...p2,...p3);
      for(let j=0;j<6;j++) alphas.push(alpha);
    }

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(verts),3));
    geo.setAttribute('aAlpha',  new T.BufferAttribute(new Float32Array(alphas),1));

    const u={uTime:{value:0}}; this._grU=u;
    this.godRays=new T.Mesh(geo,new T.ShaderMaterial({
      vertexShader:GRAY_VERT, fragmentShader:GRAY_FRAG, uniforms:u,
      transparent:true, depthWrite:false,
      depthTest:true,   // visible uniquement à travers les gaps
      blending:T.AdditiveBlending, side:T.DoubleSide,
    }));
    this.godRays.renderOrder=1;
    this.scene.add(this.godRays);
  }

  // Anneaux structurels massifs (style image 3)
  _buildRings(){
    const T=this.T;
    const configs=[
      {r:SPHERE_R*1.22, col:'#FFB700', alpha:0.75, tiltX:0.16, tiltY:0.0,  width:0.055},
      {r:SPHERE_R*1.17, col:'#9D50FF', alpha:0.52, tiltX:0.55, tiltY:1.05, width:0.040},
      {r:SPHERE_R*1.13, col:'#9D50FF', alpha:0.35, tiltX:-0.42,tiltY:2.20, width:0.028},
      {r:SPHERE_R*1.26, col:'#00D4FF', alpha:0.28, tiltX:1.10, tiltY:0.55, width:0.022},
    ];
    this.rings=[]; this._rUs=[];
    configs.forEach(({r,col,alpha,tiltX,tiltY,width})=>{
      const N=400;
      const p=new Float32Array(N*3);
      for(let i=0;i<N;i++){
        const a=i/N*Math.PI*2;
        const x=Math.cos(a)*r, z=Math.sin(a)*r;
        const ctx=Math.cos(tiltX), stx=Math.sin(tiltX);
        const cty=Math.cos(tiltY), sty=Math.sin(tiltY);
        // Rotation X then Y
        const y2=-z*stx, z2=z*ctx;
        p[i*3]=x*cty+z2*sty; p[i*3+1]=y2; p[i*3+2]=-x*sty+z2*cty;
      }
      const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(p,3));
      const[cr,cg,cb]=hex3(col);
      const u={uTime:{value:0},uCol:{value:new T.Vector3(cr,cg,cb)},uAlpha:{value:alpha},uWidth:{value:width}};
      this._rUs.push(u);
      const mesh=new T.LineLoop(geo,new T.ShaderMaterial({
        vertexShader:RING_VERT,fragmentShader:RING_FRAG,uniforms:u,
        transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      }));
      this.rings.push(mesh); this.scene.add(mesh);
    });
  }

  _buildViralSwarm(){
    const T=this.T, N=671;
    const phase=new Float32Array(N),speed=new Float32Array(N),axis=new Float32Array(N),radius=new Float32Array(N);
    for(let i=0;i<N;i++){phase[i]=Math.random()*Math.PI*2;speed[i]=0.14+Math.random()*0.52;axis[i]=Math.random()*Math.PI*2;radius[i]=SPHERE_R*(1.12+Math.random()*0.22);}
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(N*3),3));
    geo.setAttribute('aPhase', new T.BufferAttribute(phase,1));
    geo.setAttribute('aSpeed', new T.BufferAttribute(speed,1));
    geo.setAttribute('aAxis',  new T.BufferAttribute(axis,1));
    geo.setAttribute('aRadius',new T.BufferAttribute(radius,1));
    const u={uTime:{value:0}}; this._vU=u;
    this.viralSwarm=new T.Points(geo,new T.ShaderMaterial({
      vertexShader:VIRAL_VERT,fragmentShader:VIRAL_FRAG,uniforms:u,
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    }));
    this.scene.add(this.viralSwarm);
  }

  _buildMesh(faces){
    const T=this.T;
    if(this.panelMesh){this.scene.remove(this.panelMesh);this.panelMesh.geometry.dispose();this.panelMesh.material.dispose();this.panelMesh=null;}
    if(!faces?.length)return;
    this.faceSlots=faces.map(f=>f.slot||null);
    this._faces=faces;
    const{pos,nrm,occ,tc,ti,fi,bary,t2f}=buildPanelBufs(faces);
    this.triToFace=t2f;
    const uni={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1}};
    this._pU=uni;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',  new T.BufferAttribute(pos,3));
    geo.setAttribute('normal',    new T.BufferAttribute(nrm,3));
    geo.setAttribute('aOccupied', new T.BufferAttribute(occ,1));
    geo.setAttribute('aTierColor',new T.BufferAttribute(tc,3));
    geo.setAttribute('aTierIdx',  new T.BufferAttribute(ti,1));
    geo.setAttribute('aFaceIdx',  new T.BufferAttribute(fi,1));
    geo.setAttribute('aBary',     new T.BufferAttribute(bary,3));
    this.panelMesh=new T.Mesh(geo,new T.ShaderMaterial({
      vertexShader:PANEL_VERT, fragmentShader:PANEL_FRAG, uniforms:uni,
      side:T.DoubleSide,
      transparent:false, // OPAQUE — bloque le inner glow
      extensions:{derivatives:true},
    }));
    this.panelMesh.rotation.x=this.rot.x;
    this.panelMesh.rotation.y=this.rot.y;
    this.panelMesh.renderOrder=0; // Avant inner glow
    this.scene.add(this.panelMesh);
  }

  setFaces(faces,animate=false){
    this.hovFace=-1; this.selFace=-1;
    if(!animate||this.transitioning){this._buildMesh(faces);return;}
    this.transitioning=true;
    const G=this.G;
    const doSwap=()=>{
      this._buildMesh(faces);
      if(this.panelMesh){
        this.panelMesh.scale.set(0,0,0);
        const p={v:0};
        G.to(p,{v:1,duration:0.55,ease:'back.out(1.4)',
          onUpdate:()=>this.panelMesh?.scale.set(p.v,p.v,p.v),
          onComplete:()=>{this.transitioning=false;}});
      }else{this.transitioning=false;}
    };
    if(this.panelMesh){
      const p={v:1};
      G.to(p,{v:0,duration:0.18,ease:'power3.in',
        onUpdate:()=>this.panelMesh?.scale.set(p.v,p.v,p.v),
        onComplete:doSwap});
    }else{doSwap();}
  }

  _ndc(cx,cy){const r=this.canvas.getBoundingClientRect();return{x:((cx-r.left)/r.width)*2-1,y:-((cy-r.top)/r.height)*2+1};}
  _cast(cx,cy){if(!this.panelMesh)return-1;const{x,y}=this._ndc(cx,cy);this.raycaster.setFromCamera({x,y},this.camera);const h=this.raycaster.intersectObject(this.panelMesh);return h.length?this.triToFace?.[h[0].faceIndex]??h[0].faceIndex:-1;}
  _setHov(fi){this.hovFace=fi;if(this._pU){this._pU.uHovered.value=fi;}}
  _setSel(fi){this.selFace=fi;if(this._pU){this._pU.uSelected.value=fi;}}

  zoomToFace(centroid){
    if(!centroid||!this.G)return;
    const T=this.T,G=this.G;
    const v=new T.Vector3(...centroid);v.applyEuler(this.panelMesh.rotation);
    const dir=v.clone().normalize();
    G.to(this.camera.position,{x:dir.x*SPHERE_R*2.1,y:dir.y*SPHERE_R*2.1,z:dir.z*SPHERE_R*2.1+9,duration:1.1,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(dir.x*0.4,dir.y*0.4,dir.z*0.4))});
    G.to(this,{zoomTarget:12,duration:1.1,ease:'power3.inOut'});
  }
  resetCamera(){
    if(!this.G)return;
    const T=this.T;
    this.G.to(this.camera.position,{x:0,y:0,z:22,duration:0.95,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(0,0,0))});
    this.G.to(this,{zoomTarget:22,duration:0.95,ease:'power3.inOut'});
  }
  zoom(dy){this.zoomTarget=Math.max(7,Math.min(55,this.zoomTarget+dy*0.012));}

  _bindEvents(){
    const c=this.canvas,h=this._h;let lx=0,ly=0,mv=false;
    h.md=e=>{this.isDragging=true;mv=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0};};
    h.mm=e=>{
      if(this.isDragging){const dx=e.clientX-lx,dy=e.clientY-ly;if(Math.abs(dx)>1||Math.abs(dy)>1)mv=true;this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.clientX;ly=e.clientY;}
      else{const fi=this._cast(e.clientX,e.clientY);if(fi!==this.hovFace){this._setHov(fi);this.onHover?.(fi>=0?this.faceSlots[fi]:null,fi);}c.style.cursor=fi>=0?'pointer':'grab';}
    };
    h.mu=e=>{if(!mv){const fi=this._cast(e.clientX,e.clientY);if(fi>=0){this._setSel(fi);const face=this._faces?.[fi];this.onClick?.(this.faceSlots[fi],fi,face);if(face?.centroid)this.zoomToFace(face.centroid);}}this.isDragging=false;};
    c.addEventListener('mousedown',h.md);window.addEventListener('mousemove',h.mm);window.addEventListener('mouseup',h.mu);
    h.ts=e=>{if(e.touches.length===1){this.isDragging=true;mv=false;lx=e.touches[0].clientX;ly=e.touches[0].clientY;this.touchStart={x:lx,y:ly};this.pinchDist=null;}else if(e.touches.length===2){this.isDragging=false;const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;this.pinchDist=Math.sqrt(dx*dx+dy*dy);}};
    h.tm=e=>{e.preventDefault();if(e.touches.length===1&&this.isDragging){const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;if(Math.abs(dx)>2||Math.abs(dy)>2)mv=true;this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.touches[0].clientX;ly=e.touches[0].clientY;}else if(e.touches.length===2&&this.pinchDist!=null){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const d=Math.sqrt(dx*dx+dy*dy);this.zoom((this.pinchDist-d)*3);this.pinchDist=d;}};
    h.te=e=>{if(e.changedTouches.length===1&&!mv&&this.touchStart){const fi=this._cast(e.changedTouches[0].clientX,e.changedTouches[0].clientY);if(fi>=0){this._setSel(fi);const face=this._faces?.[fi];this.onClick?.(this.faceSlots[fi],fi,face);if(face?.centroid)this.zoomToFace(face.centroid);}}this.isDragging=false;};
    c.addEventListener('touchstart',h.ts,{passive:false});c.addEventListener('touchmove',h.tm,{passive:false});c.addEventListener('touchend',h.te);
  }

  _animate(){
    this.animId=requestAnimationFrame(()=>this._animate());
    const t=(Date.now()-this._t0)*0.001;
    if(!this.isDragging){
      this.rot.y+=this.vel.x; this.rot.x+=this.vel.y;
      this.vel.x*=0.93; this.vel.y*=0.93;
      this.rot.y+=0.00022; // rotation lente auto
    }
    const rx=this.rot.x,ry=this.rot.y;
    if(this.panelMesh){this.panelMesh.rotation.x=rx;this.panelMesh.rotation.y=ry;}
    if(this.innerGlow){this.innerGlow.rotation.x=rx*0.1;this.innerGlow.rotation.y=ry*0.1;}
    if(this.godRays){this.godRays.rotation.x=rx;this.godRays.rotation.y=ry;}
    this.rings.forEach((ring,i)=>{ring.rotation.x=rx+(i%2?0.005:-0.005)*t;ring.rotation.y=ry+(i%2?0.008:-0.008)*t;});
    if(this._pU)this._pU.uTime.value=t;
    if(this._sU)this._sU.uTime.value=t;
    if(this._igU)this._igU.uTime.value=t;
    if(this._grU)this._grU.uTime.value=t;
    if(this._vU)this._vU.uTime.value=t;
    this._rUs.forEach(u=>{ if(u)u.uTime.value=t; });
    // Pulse de l'étoile
    const sp=1+Math.sin(t*0.88)*0.20+Math.sin(t*2.3)*0.06;
    if(this._sl)this._sl.intensity=35*sp;
    if(this._cl)this._cl.intensity=12*sp;
    if(this.starMesh)this.starMesh.scale.setScalar(1+Math.sin(t*1.2)*0.07);
    this.halos.forEach((h,i)=>h.scale.setScalar(1+Math.sin(t*0.35+i*0.8)*0.055));
    // Swarm viral
    if(this.viralSwarm){this.viralSwarm.rotation.y=t*0.035;this.viralSwarm.rotation.x=Math.sin(t*0.025)*0.20;}
    // Stars drift
    if(this.starfield){this.starfield.rotation.y=t*0.0003;}
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.065;
    this.camera.position.z=this.zoomCurrent;
    this.renderer.render(this.scene,this.camera);
  }

  resize(){const W=this.canvas.clientWidth,H=this.canvas.clientHeight;if(!W||!H)return;this.camera.aspect=W/H;this.camera.updateProjectionMatrix();this.renderer.setSize(W,H,false);}
  destroy(){
    cancelAnimationFrame(this.animId);
    const h=this._h;
    this.canvas.removeEventListener('mousedown',h.md);
    window.removeEventListener('mousemove',h.mm);
    window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts);
    this.canvas.removeEventListener('touchmove',h.tm);
    this.canvas.removeEventListener('touchend',h.te);
    [this.panelMesh,this.innerGlow,this.godRays,...this.rings,this.viralSwarm].forEach(m=>{if(m){m.geometry?.dispose();m.material?.dispose();}});
    this.renderer?.dispose();
  }
}

// ── UI Components ─────────────────────────────────────────────────────────────
function Glass({children,style={},glow,...p}){return(<div style={{background:DS.glass,backdropFilter:'blur(14px) saturate(160%)',WebkitBackdropFilter:'blur(14px) saturate(160%)',border:`0.5px solid ${glow?glow+'38':DS.glassBrd}`,boxShadow:glow?`0 0 0 1px ${glow}12,0 0 24px ${glow}14,inset 0 1px 0 rgba(255,255,255,0.05)`:`inset 0 1px 0 rgba(255,255,255,0.04),0 8px 32px rgba(0,0,0,0.6)`,...style}}{...p}>{children}</div>);}

function LumBtn({children,onClick,col=DS.cyan,style={},sm}){const[hov,setHov]=useState(false);return(<button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov?`${col}0e`:'transparent',border:`0.5px solid ${col}${hov?'cc':'44'}`,borderRadius:8,color:hov?col:`${col}88`,fontFamily:F.ui,fontSize:sm?10:12,fontWeight:600,padding:sm?'6px 12px':'10px 20px',cursor:'pointer',outline:'none',letterSpacing:'0.04em',boxShadow:hov?`0 0 20px ${col}28`:'none',transition:'all 0.16s ease',display:'flex',alignItems:'center',justifyContent:'center',gap:7,...style}}>{children}</button>);}

function Sep({col=DS.gold,style={}}){return<div style={{height:0.5,background:`linear-gradient(90deg,transparent,${col}55,transparent)`,boxShadow:`0 0 6px ${col}33`,...style}}/>;}

// Chip hover sur panneau
function HoverChip({slot}){
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const role=TIER_ROLE[slot.tier];
  return(
    <div style={{position:'absolute',bottom:64,left:'50%',transform:'translateX(-50%)',pointerEvents:'none',zIndex:35,animation:'hfadeUp 0.16s ease both'}}>
      <Glass glow={col} style={{padding:'5px 14px',display:'flex',alignItems:'center',gap:9,borderRadius:8}}>
        <span style={{color:col,fontSize:13,lineHeight:1}}>{role?.icon||'○'}</span>
        <span style={{color:col,fontSize:9,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[slot.tier]||slot.tier).toUpperCase()}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrd}}/>
        <span style={{color:DS.textMid,fontSize:9,fontFamily:F.ui}}>{slot.occ?(slot.tenant?.name||'Occupé'):'Disponible'}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrd}}/>
        <span style={{color:DS.gold,fontSize:9,fontWeight:600,fontFamily:F.mono}}>€{fmt(slot.tier)}/j</span>
      </Glass>
    </div>
  );
}

// Panel détail slot sélectionné
function SlotReveal({slot,onClose,onRent,onBuyout}){
  const[ph,setPh]=useState(0);
  useEffect(()=>{const id=requestAnimationFrame(()=>setPh(1));return()=>cancelAnimationFrame(id);},[]);
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const label=(TIER_LABEL[slot.tier]||slot.tier).toUpperCase();
  const price=fmt(slot.tier);
  const occ=slot.occ; const tenant=slot.tenant;
  const role=TIER_ROLE[slot.tier];
  const isEpic=slot.tier==='epicenter';
  return(
    <div style={{position:'absolute',top:0,bottom:0,right:228,width:355,display:'flex',alignItems:'center',justifyContent:'flex-end',padding:'0 14px',zIndex:45,pointerEvents:'none'}}>
      <div style={{width:334,pointerEvents:'auto',opacity:ph?1:0,transform:ph?'none':'translateX(20px) scale(0.95)',transition:'opacity 0.26s ease,transform 0.34s cubic-bezier(0.34,1.56,0.64,1)',borderRadius:14,background:DS.glass,backdropFilter:'blur(14px) saturate(180%)',WebkitBackdropFilter:'blur(14px) saturate(180%)',border:`0.5px solid ${col}44`,boxShadow:`0 0 0 1px ${col}12,0 0 40px ${col}16,inset 0 1px 0 rgba(255,255,255,0.06)`,overflow:'hidden'}}>
        {/* Top accent bar */}
        <div style={{height:2,background:`linear-gradient(90deg,transparent 0%,${col} 40%,${col}88 100%)`,boxShadow:`0 0 12px ${col}`}}/>
        {/* Hero */}
        <div style={{height:120,position:'relative',overflow:'hidden',background:'rgba(4,5,9,0.9)'}}>
          {occ&&tenant?.img&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${tenant.img})`,backgroundSize:'cover',backgroundPosition:'center',opacity:0.7}}/>}
          {/* Grid overlay */}
          <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${col}10 1px,transparent 1px),linear-gradient(90deg,${col}10 1px,transparent 1px)`,backgroundSize:'20px 20px',pointerEvents:'none'}}/>
          {/* Scanlines */}
          <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,0.12) 0px,rgba(0,0,0,0.12) 1px,transparent 1px,transparent 3px)',pointerEvents:'none'}}/>
          {/* Corner marks */}
          {[{t:8,l:8},{t:8,r:8},{b:8,l:8},{b:8,r:8}].map(({t,r,b,l},i)=>(
            <div key={i} style={{position:'absolute',width:10,height:10,top:t,right:r,bottom:b,left:l,borderTop:i<2?`1.5px solid ${col}`:'none',borderBottom:i>=2?`1.5px solid ${col}`:'none',borderLeft:(i===0||i===2)?`1.5px solid ${col}`:'none',borderRight:(i===1||i===3)?`1.5px solid ${col}`:'none',zIndex:2,boxShadow:`0 0 6px ${col}66`}}/>
          ))}
          {/* Icon central */}
          {!(occ&&tenant?.img)&&(
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,zIndex:2}}>
              <div style={{width:isEpic?76:60,height:isEpic?76:60,borderRadius:isEpic?'50%':12,border:`1.5px solid ${col}88`,background:`${col}0c`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isEpic?32:22,color:col,boxShadow:`0 0 32px ${col}44,inset 0 0 20px ${col}08`}}>
                {role?.icon}
              </div>
              <div style={{color:`${col}99`,fontSize:8,fontFamily:F.ui,letterSpacing:'0.14em',fontWeight:600}}>{role?.role?.toUpperCase()}</div>
            </div>
          )}
          {/* Badges */}
          <div style={{position:'absolute',top:9,left:9,zIndex:3}}><span style={{padding:'2px 7px',borderRadius:4,border:`0.5px solid ${col}44`,background:`${col}0c`,color:col,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.10em'}}>{label}</span></div>
          <div style={{position:'absolute',top:9,right:9,zIndex:3}}><span style={{padding:'2px 7px',borderRadius:4,border:`0.5px solid ${occ?col:DS.textLo}44`,background:`${occ?col:DS.textLo}0c`,color:occ?col:DS.textLo,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{occ?'● ACTIF':'○ LIBRE'}</span></div>
          {/* Close */}
          <button onClick={onClose} style={{position:'absolute',bottom:9,right:9,zIndex:3,width:22,height:22,borderRadius:5,background:'transparent',border:`0.5px solid ${DS.glassBrd}`,color:DS.textLo,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',outline:'none',transition:'all 0.14s'}} onMouseEnter={e=>{e.currentTarget.style.color=DS.rose;e.currentTarget.style.borderColor=DS.rose+'88';}} onMouseLeave={e=>{e.currentTarget.style.color=DS.textLo;e.currentTarget.style.borderColor=DS.glassBrd;}}>✕</button>
        </div>

        <Sep col={col} style={{opacity:0.6}}/>
        <div style={{padding:'13px 15px 16px'}}>
          <div style={{marginBottom:10}}>
            <div style={{color:DS.textHi,fontSize:14,fontWeight:700,fontFamily:F.ui,marginBottom:3,lineHeight:1.3}}>{occ?(tenant?.name||`Panneau ${label}`):`Emplacement ${label}`}</div>
            <div style={{color:DS.textLo,fontSize:8.5,fontFamily:F.ui,lineHeight:1.6}}>{role?.desc||'Sphère de Dyson · Marketing collaboratif'}</div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:11}}>
            {[['TIER',label,col],['PRIX/J',`€${price}`,DS.gold],['RÔLE',role?.role?.split(' ')[0]||'COSMOS',DS.cyan]].map(([k,v,c])=>(
              <div key={k} style={{padding:'7px 5px',borderRadius:6,textAlign:'center',border:`0.5px solid ${DS.glassBrd}`,background:'rgba(255,255,255,0.02)'}}>
                <div style={{color:c,fontSize:10,fontWeight:700,fontFamily:F.mono,marginBottom:2}}>{v}</div>
                <div style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>{k}</div>
              </div>
            ))}
          </div>

          {/* Social links */}
          {occ&&(tenant?.instagramUrl||tenant?.twitterUrl||tenant?.tiktokUrl||tenant?.websiteUrl)&&(
            <div style={{display:'flex',gap:5,marginBottom:11}}>
              {[['𝕏',tenant?.twitterUrl,'#1DA1F2'],['◎',tenant?.instagramUrl,'#E4405F'],['♪',tenant?.tiktokUrl,'#00f2ea'],['⬡',tenant?.websiteUrl,DS.cyan]].filter(([,u])=>u).map(([ic,u,c])=>(
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{flex:1,padding:'7px 4px',borderRadius:6,border:`0.5px solid ${c}33`,color:`${c}77`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',background:'transparent',transition:'all 0.14s',outline:'none'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${c}99`;e.currentTarget.style.color=c;e.currentTarget.style.background=`${c}08`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${c}33`;e.currentTarget.style.color=`${c}77`;e.currentTarget.style.background='transparent';}}>{ic}</a>
              ))}
            </div>
          )}

          {/* Prix */}
          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:11,padding:'9px 12px',borderRadius:8,border:`0.5px solid ${col}28`,background:`${col}06`,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(90deg,transparent,transparent 24px,${col}04 24px,${col}04 24.5px)`,pointerEvents:'none'}}/>
            <span style={{color:col,fontSize:24,fontWeight:700,fontFamily:F.mono,lineHeight:1,textShadow:`0 0 20px ${col}66`}}>€{price}</span>
            <span style={{color:DS.textLo,fontSize:9,fontFamily:F.ui}}>/jour · excl. taxes</span>
            <span style={{marginLeft:'auto',color:`${col}33`,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.12em'}}>ADS·SQ</span>
          </div>

          {/* CTA */}
          {!occ
            ?<LumBtn onClick={()=>onRent(slot)} col={col} style={{width:'100%'}}><span>Réserver ce slot</span><span style={{opacity:0.5,fontSize:10}}>→</span></LumBtn>
            :<LumBtn onClick={()=>onBuyout(slot)} col={DS.textLo} style={{width:'100%',fontSize:11}}>Proposer un rachat</LumBtn>
          }
        </div>
      </div>
    </div>
  );
}

// Sidebar
const Sidebar=memo(function Sidebar({slots,isLive,level}){
  const[tab,setTab]=useState('tiers');
  const stats=useMemo(()=>{const c={};TIER_ORDER.forEach(t=>{c[t]=0;});(slots||[]).forEach(s=>{if(s?.occ&&c[s.tier]!==undefined)c[s.tier]++;});return c;},[slots]);
  const rev=TIER_ORDER.reduce((s,t)=>s+(stats[t]||0)*(TIER_PRICE[t]||0)/100,0);
  const totalOcc=Object.values(stats).reduce((s,v)=>s+v,0);
  return(
    <div style={{width:228,flexShrink:0,background:DS.glass,backdropFilter:'blur(14px) saturate(160%)',WebkitBackdropFilter:'blur(14px) saturate(160%)',borderLeft:`0.5px solid ${DS.glassBrdHi}`,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'-16px 0 40px rgba(0,0,0,0.55)'}}>
      {/* Header */}
      <div style={{padding:'13px 14px 10px',borderBottom:`0.5px solid ${DS.glassBrd}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{color:DS.gold,fontSize:15,textShadow:`0 0 16px ${DS.gold}`,lineHeight:1}}>☀</span>
            <span style={{color:DS.textHi,fontSize:11,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.09em'}}>DYSON SPHERE</span>
          </div>
          {isLive&&(<div style={{display:'flex',alignItems:'center',gap:4,padding:'2px 7px',borderRadius:4,border:`0.5px solid ${DS.green}44`,background:`${DS.green}08`}}><div style={{width:4,height:4,borderRadius:'50%',background:DS.green,boxShadow:`0 0 8px ${DS.green}`,animation:'hpulse 1.5s ease-in-out infinite'}}/><span style={{color:DS.green,fontSize:7,fontWeight:700,letterSpacing:'0.12em',fontFamily:F.ui}}>LIVE</span></div>)}
        </div>
        <div style={{color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.06em',marginBottom:9}}>{LEVELS[level]?.faces||0} PANNEAUX · LVL {level}</div>
        <div style={{display:'flex',gap:3}}>
          {[['tiers','TIERS'],['roles','RÔLES']].map(([id,label])=>(<button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'5px 0',background:'transparent',border:`0.5px solid ${tab===id?DS.gold:DS.glassBrd}`,borderRadius:5,color:tab===id?DS.gold:DS.textLo,fontSize:7.5,fontWeight:600,fontFamily:F.ui,letterSpacing:'0.08em',cursor:'pointer',outline:'none',boxShadow:tab===id?`0 0 10px ${DS.gold}22`:'none',transition:'all 0.14s'}}>{label}</button>))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
        {tab==='tiers'
          ? TIER_ORDER.map(tier=>{
              const col=TIER_NEON[tier],occ=stats[tier]||0,tot=TIER_TOTALS[tier],pct=Math.round(occ/tot*100);
              const role=TIER_ROLE[tier];
              const scale=TIER_PANEL_SCALE[tier];
              return(<div key={tier} style={{padding:'7px 12px 7px 10px',borderLeft:`1.5px solid ${occ>0?col:'transparent'}`,marginLeft:2,borderRadius:'0 7px 7px 0',transition:'background 0.14s'}} onMouseEnter={e=>{e.currentTarget.style.background=`${col}08`;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:12,color:col,textShadow:occ>0?`0 0 10px ${col}`:'none'}}>{role?.icon}</span>
                    <span style={{color:occ>0?col:DS.textLo,fontSize:7.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[tier]||tier).toUpperCase()}</span>
                  </div>
                  <span style={{color:occ>0?col:DS.textLo,fontSize:8.5,fontWeight:600,fontFamily:F.mono}}>€{fmt(tier)}</span>
                </div>
                {/* Indicateur taille panneau */}
                <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                  <div style={{flex:1,height:3,borderRadius:2,background:DS.glassBrd,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.round(scale/1.22*100)}%`,background:occ>0?col:`${col}44`,borderRadius:2,boxShadow:occ>0?`0 0 5px ${col}`:'none',transition:'width 0.6s'}}/>
                  </div>
                  <span style={{color:DS.textLo,fontSize:6.5,fontFamily:F.mono,width:24,textAlign:'right'}}>{Math.round(scale/1.22*100)}%</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>{occ}/{tot} slots</span>
                  <span style={{color:occ>0?`${col}aa`:DS.textLo,fontSize:7,fontFamily:F.mono}}>{pct}% occ.</span>
                </div>
              </div>);
            })
          : TIER_ORDER.map(tier=>{
              const col=TIER_NEON[tier];const role=TIER_ROLE[tier];
              return(<div key={tier} style={{padding:'9px 12px 9px 10px',borderBottom:`0.5px solid ${DS.glassBrd}`,transition:'background 0.14s'}} onMouseEnter={e=>{e.currentTarget.style.background=`${col}06`;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                  <div style={{width:26,height:26,borderRadius:tier==='epicenter'?'50%':6,border:`1.5px solid ${col}55`,background:`${col}0e`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:col,flexShrink:0,boxShadow:`0 0 12px ${col}22`}}>{role?.icon}</div>
                  <div><div style={{color:col,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.06em'}}>{role?.role}</div><div style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>€{fmt(tier)}/j · {TIER_TOTALS[tier]} slots</div></div>
                </div>
                <div style={{color:DS.textLo,fontSize:7.5,fontFamily:F.ui,lineHeight:1.55,paddingLeft:33}}>{role?.desc}</div>
              </div>);
            })
        }
      </div>

      <div style={{padding:'10px 14px',borderTop:`0.5px solid ${DS.glassBrd}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
          <span style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>REVENUS/JOUR</span>
          <span style={{color:DS.gold,fontSize:15,fontWeight:700,fontFamily:F.mono,textShadow:`0 0 16px ${DS.gold}55`}}>€{rev.toLocaleString('fr-FR')}</span>
        </div>
        <Sep col={DS.gold} style={{marginBottom:6,opacity:0.30}}/>
        {/* Mini energy bars */}
        <div style={{display:'flex',gap:2,marginBottom:5}}>
          {TIER_ORDER.map(t=>{const c=TIER_NEON[t],o=stats[t]||0,tot=TIER_TOTALS[t];return<div key={t} title={(TIER_LABEL[t]||t).toUpperCase()+` (${o}/${tot})`} style={{flex:1,height:2.5,borderRadius:2,background:o>0?c:DS.glassBrd,opacity:0.3+0.7*(o/tot),boxShadow:o>0?`0 0 4px ${c}`:'none',transition:'all 0.5s'}}/>;} )}
        </div>
        <div style={{textAlign:'center',color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.08em'}}>{totalOcc} ACTIFS · {671-totalOcc} LIBRES</div>
      </div>
    </div>
  );
});

const LevelNav=memo(function LevelNav({level,onLevel}){
  return(
    <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:30}}>
      <Glass glow={DS.cyan} style={{padding:'5px 9px',display:'flex',alignItems:'center',gap:3,borderRadius:10}}>
        {LEVELS.map(lv=>{const act=lv.n===level;const col=act?DS.cyan:DS.textLo;return(
          <button key={lv.n} onClick={()=>onLevel(lv.n)} title={lv.name} style={{width:act?30:15,height:act?30:15,borderRadius:'50%',border:`0.5px solid ${col}${act?'cc':'44'}`,background:act?`${DS.cyan}12`:'transparent',color:col,fontSize:act?10:7.5,fontWeight:700,cursor:'pointer',transition:'all 0.26s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.ui,padding:0,flexShrink:0,boxShadow:act?`0 0 16px ${DS.cyan}55`:'none',outline:'none'}}>
            {act?lv.icon:lv.n}
          </button>);
        })}
        <div style={{marginLeft:6,paddingLeft:8,borderLeft:`0.5px solid ${DS.glassBrd}`,display:'flex',flexDirection:'column',gap:1}}>
          <span style={{color:DS.cyan,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em',lineHeight:1.1}}>{LEVELS[level]?.name}</span>
          <span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>{LEVELS[level]?.faces} PANELS</span>
        </div>
      </Glass>
    </div>
  );
});

function HUDLoader(){
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28,background:DS.void}}>
      <div style={{position:'relative',width:90,height:90}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{position:'absolute',inset:i*10,borderRadius:'50%',border:`0.5px solid rgba(${['255,183,0','255,93,156','157,80,255','0,212,255'][i]},${0.08-i*0.01})`,borderTopColor:`rgba(${['255,183,0','255,93,156','157,80,255','0,212,255'][i]},${0.90-i*0.18})`,animation:`hspin ${0.9+i*0.75}s linear infinite ${i%2?'reverse':''}`}}/>
        ))}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:14,height:14,borderRadius:'50%',background:'#FFF8E0',boxShadow:'0 0 20px #FFCC44,0 0 45px #FF8800,0 0 80px #FF440015'}}/>
        </div>
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{color:DS.gold,fontSize:10,fontWeight:600,letterSpacing:'0.30em',fontFamily:F.ui,marginBottom:5,textShadow:`0 0 24px ${DS.gold}`}}>DYSON SPHERE</div>
        <div style={{color:DS.textLo,fontSize:7.5,letterSpacing:'0.18em',fontFamily:F.mono,marginBottom:10}}>CHARGEMENT MÉGASTRUCTURE…</div>
        <div style={{display:'flex',justifyContent:'center',gap:6}}>
          {TIER_ORDER.map((t,i)=>(<div key={t} style={{width:4,height:4,borderRadius:'50%',background:TIER_NEON[t],boxShadow:`0 0 8px ${TIER_NEON[t]}`,animation:`hpulse ${0.7+i*0.15}s ease-in-out infinite`}}/>))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function View3D({slots=[],isLive=false,onGoAdvertiser,onWaitlist,onCheckout,onBuyout,ExistingPublicView}){
  const canvasRef=useRef(null), sceneRef=useRef(null);
  const[level,setLevel]=useState(6);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(null);
  const[selSlot,setSelSlot]=useState(null);
  const[hovSlot,setHovSlot]=useState(null);
  const hovTimer=useRef(null);

  const sorted=useMemo(()=>sortSlots(slots),[slots]);
  const assignedFaces=useMemo(()=>{
    if(level===0)return[];
    return sortPole(getFaces(level)).map((f,i)=>({...f,slot:sorted[i]||null}));
  },[level,sorted]);

  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let sc;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([T,G])=>{
        sc=new Scene3D(canvasRef.current); sceneRef.current=sc;
        sc.onHover=slot=>{clearTimeout(hovTimer.current);if(slot){hovTimer.current=setTimeout(()=>setHovSlot(slot),80);}else setHovSlot(null);};
        sc.onClick=slot=>setSelSlot(slot||null);
        return sc.init(T,G);
      })
      .then(()=>{sceneRef.current.setFaces(assignedFaces,false);setLoading(false);})
      .catch(e=>{console.error(e);setError('npm install three gsap');setLoading(false);});
    return()=>{if(sc)sc.destroy();sceneRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{if(!sceneRef.current||level===0)return;sceneRef.current.setFaces(assignedFaces,true);},[assignedFaces,level]);

  useEffect(()=>{
    const fn=e=>{
      if(e.key>='0'&&e.key<='6')setLevel(+e.key);
      else if(e.key==='ArrowRight'||e.key==='ArrowUp')setLevel(l=>Math.min(6,l+1));
      else if(e.key==='ArrowLeft'||e.key==='ArrowDown')setLevel(l=>Math.max(1,l-1));
      else if(e.key==='Escape'){setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();}
    };
    window.addEventListener('keydown',fn);
    return()=>window.removeEventListener('keydown',fn);
  },[]);

  useEffect(()=>{
    const fn=e=>{e.preventDefault();sceneRef.current?.zoom(e.deltaY);};
    const c=canvasRef.current;
    if(c)c.addEventListener('wheel',fn,{passive:false});
    return()=>{if(c)c.removeEventListener('wheel',fn);};
  },[level]);

  useEffect(()=>{
    if(!canvasRef.current)return;
    const ro=new ResizeObserver(()=>sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return()=>ro.disconnect();
  },[]);

  const goLevel=useCallback(n=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();setLevel(n);},[]);
  const handleClose=useCallback(()=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();},[]);

  if(level===0){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <LumBtn onClick={()=>goLevel(6)} col={DS.gold} sm style={{position:'absolute',top:10,right:10,zIndex:100,letterSpacing:'0.08em'}}>
          ☀ DYSON SPHERE
        </LumBtn>
        {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
      </div>
    );
  }

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:DS.void,display:'flex'}}>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',opacity:loading?0:1,transition:'opacity 0.80s ease'}}/>
        {loading&&!error&&<HUDLoader/>}
        {error&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,background:DS.void}}>
            <div style={{color:'#FF3D5A',fontSize:11,fontWeight:600,fontFamily:F.mono}}>⚠ {error}</div>
            <LumBtn onClick={()=>goLevel(0)} col={DS.cyan} sm>Vue 2D</LumBtn>
          </div>
        )}

        {/* Retour 2D */}
        <Glass style={{position:'absolute',top:11,left:11,zIndex:30,borderRadius:7}}>
          <button onClick={()=>goLevel(0)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'none',border:'none',color:DS.textLo,fontSize:8.5,fontWeight:600,cursor:'pointer',fontFamily:F.ui,letterSpacing:'0.06em',outline:'none',transition:'color 0.14s'}} onMouseEnter={e=>e.currentTarget.style.color=DS.textHi} onMouseLeave={e=>e.currentTarget.style.color=DS.textLo}>
            ▦ VUE 2D
          </button>
        </Glass>

        {/* Badge viral */}
        {!loading&&(
          <Glass glow={TIER_NEON.viral} style={{position:'absolute',top:11,right:11,zIndex:30,borderRadius:7,padding:'4px 10px',display:'flex',alignItems:'center',gap:6,pointerEvents:'none'}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:TIER_NEON.viral,boxShadow:`0 0 10px ${TIER_NEON.viral}`,animation:'hpulse 2s ease-in-out infinite'}}/>
            <span style={{color:TIER_NEON.viral,fontSize:7.5,fontFamily:F.ui,fontWeight:600,letterSpacing:'0.08em'}}>⚡ {TIER_TOTALS.viral} DRONES ORBITAUX</span>
          </Glass>
        )}

        {hovSlot&&!selSlot&&<HoverChip slot={hovSlot}/>}
        {!loading&&!selSlot&&(
          <div style={{position:'absolute',bottom:54,left:'50%',transform:'translateX(-50%)',color:DS.textLo,fontSize:7.5,letterSpacing:'0.12em',fontFamily:F.mono,pointerEvents:'none',whiteSpace:'nowrap',opacity:0.45}}>
            CLIC · ZOOM · DRAG · ⌨ 0-6
          </div>
        )}

        <LevelNav level={level} onLevel={goLevel}/>

        {selSlot&&(
          <SlotReveal slot={selSlot} onClose={handleClose}
            onRent={s=>{handleClose();onCheckout?.(s);}}
            onBuyout={s=>{handleClose();onBuyout?.(s);}}/>
        )}
      </div>

      <Sidebar slots={slots} isLive={isLive} level={level}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes hspin { to { transform: rotate(360deg); } }
        @keyframes hpulse { 0%,100%{opacity:1;} 50%{opacity:0.20;} }
        @keyframes hfadeUp { from{opacity:0;transform:translateX(-50%) translateY(6px);}to{opacity:1;transform:translateX(-50%) translateY(0);} }
        ::-webkit-scrollbar{width:1.5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,183,0,0.15);border-radius:1px;}
        canvas{cursor:grab;} canvas:active{cursor:grabbing;}
      `}</style>
    </div>
  );
}
