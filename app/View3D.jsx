'use client';
/**
 * ─── ADS·SQUARE ✦ DYSON SPHERE — HUD METAVERSE EDITION ─────────────────────
 * Design System : Deep blacks #080A0F · Neon accents · Glassmorphism 12px
 * Fonts : Sora (UI) · JetBrains Mono (chiffres)
 * Sphère : wireframe 0.5px + Bloom multicouche · Hologrammes flottants
 * Bordures lumineuses · Zéro bouton plein · Zéro dégradé générique
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ─── HUD Design Tokens ────────────────────────────────────────────────────────
const DS = {
  // Noirs profonds
  void:      '#080A0F',
  deep:      '#0B0D14',
  abyss:     '#060709',
  // Glassmorphism
  glass:     'rgba(8,10,18,0.76)',
  glassHi:   'rgba(10,14,26,0.90)',
  glassBrd:  'rgba(255,255,255,0.055)',
  glassBrdHi:'rgba(255,255,255,0.11)',
  // Néons
  cyan:      '#00E5FF',
  violet:    '#7B5FFF',
  gold:      '#FFB700',
  green:     '#00FF94',
  rose:      '#FF3D72',
  // Texte
  textHi:    '#EEF2FF',
  textMid:   'rgba(200,212,248,0.72)',
  textLo:    'rgba(140,162,220,0.38)',
  // Misc
  err:       '#FF3D5A',
  live:      '#00FF94',
};

// Palette néon par tier — override des couleurs par défaut pour bloom maximal
const TIER_NEON = {
  epicenter: '#FFB700',
  prestige:  '#FF3D72',
  elite:     '#7B5FFF',
  business:  '#00E5FF',
  standard:  '#00BFFF',
  viral:     '#00FF94',
};

const F = {
  ui:   "'Sora','DM Sans',system-ui,sans-serif",
  mono: "'JetBrains Mono','Fira Code',monospace",
};

const TIER_ORDER  = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_TOTALS = { epicenter:1,prestige:8,elite:50,business:176,standard:400,viral:671 };
const LEVELS = [
  {n:0,name:'GRID 2D',  icon:'▦',faces:0},
  {n:1,name:'CUBE',     icon:'⬡',faces:6},
  {n:2,name:'OCTA',     icon:'◆',faces:8},
  {n:3,name:'ICO',      icon:'⬟',faces:20},
  {n:4,name:'SPHERE·I', icon:'◎',faces:80},
  {n:5,name:'SPHERE·II',icon:'◉',faces:320},
  {n:6,name:'COSMOS',   icon:'✦',faces:1280},
];

const SPHERE_R  = 5.8;
const PANEL_GAP = 0.82;
const STAR_R    = 0.88;
const fmt  = t => ((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const hex3 = h => { const s=(h||'#08f').replace('#',''); return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]; };

// ─── GLSL — Wireframe 0.5px + Bloom ─────────────────────────────────────────
const PANEL_VERT = /* glsl */`
precision highp float;
attribute float aOccupied;
attribute vec3  aTierColor;
attribute float aTierIdx;
attribute float aFaceIdx;
attribute vec3  aBary;
uniform float uTime;
uniform float uHovered;
uniform float uSelected;
varying vec3  vN;
varying vec3  vWP;
varying float vOcc;
varying vec3  vTC;
varying float vFI;
varying float vFresnel;
varying float vHov;
varying float vSel;
varying vec3  vBary;

void main(){
  vN  = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWP = wp.xyz;
  vOcc = aOccupied; vTC = aTierColor; vFI = aFaceIdx; vBary = aBary;
  vHov = step(abs(aFaceIdx - uHovered), 0.5);
  vSel = step(abs(aFaceIdx - uSelected),0.5);
  vec3 vd = normalize(cameraPosition - wp.xyz);
  vFresnel = pow(clamp(1.0 - abs(dot(vN,vd)),0.0,1.0),3.2);
  vec3 pos = position;
  if(vSel > 0.5) pos += normalize(position)*(0.20+0.06*sin(uTime*3.5));
  else if(vHov > 0.5) pos += normalize(position)*0.08;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
}`;

const PANEL_FRAG = /* glsl */`
precision highp float;
#extension GL_OES_standard_derivatives : enable
uniform float uTime;
varying vec3  vN;
varying vec3  vWP;
varying float vOcc;
varying vec3  vTC;
varying float vFI;
varying float vFresnel;
varying float vHov;
varying float vSel;
varying vec3  vBary;

float wire(float w){
  vec3 d = fwidth(vBary);
  vec3 a = smoothstep(vec3(0.0),d*w,vBary);
  return 1.0 - min(min(a.x,a.y),a.z);
}
float hash(float n){return fract(sin(n)*43758.5453);}

void main(){
  float t   = uTime;
  bool  hov = vHov>0.5;
  bool  sel = vSel>0.5;

  // Bloom multicouche : core fin 0.5px + glow large
  float wCore  = wire(0.55);  // trait 0.5px
  float wBloom = wire(3.0);   // halo bloom
  float wAura  = wire(7.0);   // aura lointaine

  float seed = hash(vFI*11.3+3.7);
  float pulse = 0.72 + 0.28*sin(t*(0.5+vFI*0.0001)+seed*6.28);

  if(vOcc > 0.5){
    // ── PANNEAU OCCUPÉ — hologramme lumineux ─────────────────────
    // Scanlines horizontales discrètes
    float scan = step(0.95, fract(vWP.y*16.0-t*1.2))*0.20;
    // Face quasi-transparente → effet hologramme
    vec3  fill = vTC * (0.05 + scan) * pulse;
    float fillA = 0.10 + vFresnel*0.15;

    // Intensité wire selon état
    float wi, bi, ai;
    if(sel){
      wi = wCore*1.0; bi = wBloom*0.45; ai = wAura*0.12;
      // Tinte gold sur sélection
      vec3 gold = vec3(1.0,0.72,0.05);
      vec3 col = fill + vTC*wi + gold*bi + gold*ai;
      col += vTC*pow(vFresnel,1.4)*1.6*pulse;
      gl_FragColor = vec4(col, clamp(fillA+wi*0.7+bi*0.3,0.0,0.94));
    } else if(hov){
      wi = wCore*0.90; bi = wBloom*0.35; ai = wAura*0.08;
      vec3 col = fill + vTC*wi*1.4 + vTC*bi + vTC*ai;
      col += vTC*pow(vFresnel,1.6)*1.2*pulse;
      gl_FragColor = vec4(col, clamp(fillA+wi*0.6+bi*0.25,0.0,0.88));
    } else {
      wi = wCore*(0.55+0.35*pulse); bi = wBloom*0.20; ai = wAura*0.05;
      vec3 col = fill + vTC*wi + vTC*bi + vTC*ai;
      col += vTC*pow(vFresnel,2.0)*0.9*pulse;
      gl_FragColor = vec4(col, clamp(fillA+wi*0.55+bi*0.18,0.0,0.82));
    }
  } else {
    // ── PANNEAU VACANT — fantôme wireframe ───────────────────────
    vec3 ghost = vec3(0.0,0.75,1.0);
    float str = sel?0.85:(hov?0.55:0.18);
    float wi  = wCore*str;
    float bi  = wBloom*str*0.28;
    // Énergie voyageante sur les arêtes
    float travel = fract(vWP.y*1.3 - t*0.45);
    float spark  = pow(smoothstep(0.0,0.05,travel)*smoothstep(0.12,0.05,travel),2.0)*0.45;
    if(hov||sel) ghost = mix(ghost,vec3(0.4,1.0,0.9),0.35);
    vec3 col = ghost*(wi+bi) + ghost*spark*(hov?0.4:0.15);
    float alpha = 0.018 + vFresnel*0.05 + wi*0.55 + bi*0.18 + spark*0.15;
    gl_FragColor = vec4(col, clamp(alpha,0.0,0.85));
  }
}`;

// Arêtes LineSegments — bloom 3 passes
const EDGE_VERT = /* glsl */`
precision highp float;
attribute float aOcc; attribute vec3 aTC; attribute float aFI;
uniform float uHovered; uniform float uSelected;
varying float vOcc; varying vec3 vTC; varying float vHov; varying float vSel; varying float vPY;
void main(){
  vOcc=aOcc; vTC=aTC; vPY=position.y;
  vHov=step(abs(aFI-uHovered),0.5);
  vSel=step(abs(aFI-uSelected),0.5);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const EDGE_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
varying float vOcc; varying vec3 vTC; varying float vHov; varying float vSel; varying float vPY;
void main(){
  float t=uTime;
  float travel=fract(vPY*0.95-t*0.52);
  float spark=pow(smoothstep(0.0,0.055,travel)*smoothstep(0.13,0.055,travel),2.0);
  float pulse=0.60+0.40*sin(t*1.1+vPY*2.5);
  if(vSel>0.5){
    vec3 g=vec3(1.0,0.75,0.08);
    gl_FragColor=vec4(g*(0.9+0.1*sin(t*5.0+vPY*6.0))*3.0+g*spark*2.5,0.98);
  } else if(vHov>0.5){
    vec3 cc=vOcc>0.5?vTC*1.8:vec3(0.2,0.96,1.0);
    gl_FragColor=vec4(cc*(0.82+0.18*sin(t*3.0+vPY*4.5))*2.2+cc*spark,0.90);
  } else if(vOcc>0.5){
    gl_FragColor=vec4(vTC*pulse*1.9+vTC*spark*1.4,0.52+spark*0.38);
  } else {
    gl_FragColor=vec4(vec3(0.0,0.52,1.0)*pulse*1.5+vec3(0.0,0.72,1.0)*spark*0.9,0.20*pulse+spark*0.22);
  }
}`;

const STAR_VERT=`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const STAR_FRAG=`
precision highp float; uniform float uTime; varying vec2 vU;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*h2(p);p*=2.1;a*=0.5;}return v;}
void main(){
  vec2 uv=vU*2.0-1.0;float r=length(uv);
  if(r>1.0)discard;
  float turb=fbm(uv*5.0+uTime*0.16);
  float core=1.0-smoothstep(0.0,0.80,r); float edge=1.0-smoothstep(0.40,1.0,r);
  vec3 col=mix(vec3(0.94,0.22,0.02),mix(vec3(1.0,0.68,0.08),vec3(1.0,0.96,0.80),core+turb*0.35),edge);
  gl_FragColor=vec4(col*3.8,edge*(1.0-r*0.26));
}`;

// ─── Géométrie ────────────────────────────────────────────────────────────────
const ins=(vs,c,f)=>vs.map(v=>[c[0]+(v[0]-c[0])*f,c[1]+(v[1]-c[1])*f,c[2]+(v[2]-c[2])*f]);
const cN=vs=>[vs.reduce((s,v)=>s+v[0],0)/vs.length,vs.reduce((s,v)=>s+v[1],0)/vs.length,vs.reduce((s,v)=>s+v[2],0)/vs.length];
const mS=(a,b)=>{const m=a.map((c,i)=>(c+b[i])/2),l=Math.hypot(...m);return m.map(c=>c/l);};

function buildCubeFaces(){
  const a=SPHERE_R/Math.sqrt(3);
  return[[[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],[[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],
    [[-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]],[[a,-a,-a],[-a,-a,-a],[-a,a,-a],[a,a,-a]],
    [[a,-a,a],[a,a,a],[a,a,-a],[a,-a,-a]],[[-a,-a,-a],[-a,a,-a],[-a,a,a],[-a,-a,a]]]
    .map(vs=>{const c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:true};});
}
function buildOctaFaces(){
  const R=SPHERE_R,v=[[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];
  return[[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]]
    .map(fi=>{const vs=fi.map(i=>v[i]),c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:false};});
}
function buildIcoFaces(sub){
  const phi=(1+Math.sqrt(5))/2;
  const rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(c=>c/l);});
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]].map(f=>f.map(i=>rv[i]));
  for(let s=0;s<sub;s++){const nx=[];for(const[a,b,c]of faces){const ab=mS(a,b),bc=mS(b,c),ca=mS(c,a);nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}faces=nx;}
  const R=SPHERE_R;
  return faces.map(([a,b,c])=>{const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];const cnt=cN(vs);return{verts:ins(vs,cnt,PANEL_GAP),centroid:cnt,isQuad:false};});
}
function getFaces(n){switch(n){case 1:return buildCubeFaces();case 2:return buildOctaFaces();case 3:return buildIcoFaces(0);case 4:return buildIcoFaces(1);case 5:return buildIcoFaces(2);case 6:return buildIcoFaces(3);default:return[];}}

// ─── Buffers ──────────────────────────────────────────────────────────────────
function buildPanelBufs(faces){
  let nT=0;for(const f of faces)nT+=f.isQuad?2:1;
  const pos=new Float32Array(nT*9),nrm=new Float32Array(nT*9);
  const occ=new Float32Array(nT*3),tc=new Float32Array(nT*9),ti=new Float32Array(nT*3),fi=new Float32Array(nT*3);
  const bary=new Float32Array(nT*9);
  const t2f=new Int32Array(nT);
  let v=0,t=0;
  const tn=(a,b,c)=>{const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l);};
  const push=(x,y,z,nx,ny,nz,o,r,g,b,tiv,fiv,bx,by,bz)=>{const i=v*3;pos[i]=x;pos[i+1]=y;pos[i+2]=z;nrm[i]=nx;nrm[i+1]=ny;nrm[i+2]=nz;occ[v]=o;tc[i]=r;tc[i+1]=g;tc[i+2]=b;ti[v]=tiv;fi[v]=fiv;bary[i]=bx;bary[i+1]=by;bary[i+2]=bz;v++;};
  faces.forEach((face,fI)=>{
    const s=face.slot;const isO=s?.occ?1:0;const tier=s?.tier;
    const rgb=hex3(tier?(TIER_NEON[tier]||TIER_COLOR[tier]||'#00E5FF'):'#00E5FF');
    const tiv=tier?TIER_ORDER.indexOf(tier):5;
    const vs=face.verts;const n0=tn(vs[0],vs[1],vs[2]);
    push(vs[0][0],vs[0][1],vs[0][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);
    push(vs[1][0],vs[1][1],vs[1][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);
    push(vs[2][0],vs[2][1],vs[2][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);
    t2f[t++]=fI;
    if(face.isQuad){const n1=tn(vs[0],vs[2],vs[3]);push(vs[0][0],vs[0][1],vs[0][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);push(vs[2][0],vs[2][1],vs[2][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);push(vs[3][0],vs[3][1],vs[3][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);t2f[t++]=fI;}
  });
  return{pos,nrm,occ,tc,ti,fi,bary,t2f};
}
function buildEdgeBufs(faces){
  const segs=[],occA=[],tcA=[],fiA=[];
  faces.forEach((face,fi)=>{
    const vs=face.verts,n=face.isQuad?4:3;
    const s=face.slot;const isO=s?.occ?1:0;const tier=s?.tier;
    const rgb=hex3(tier?(TIER_NEON[tier]||TIER_COLOR[tier]||'#00E5FF'):'#00E5FF');
    for(let i=0;i<n;i++){const a=vs[i],b=vs[(i+1)%n];segs.push(a[0],a[1],a[2],b[0],b[1],b[2]);occA.push(isO,isO);tcA.push(...rgb,...rgb);fiA.push(fi,fi);}
  });
  return{pos:new Float32Array(segs),occ:new Float32Array(occA),tc:new Float32Array(tcA),fi:new Float32Array(fiA)};
}

const sortSlots=s=>[...(s||[])].filter(Boolean).sort((a,b)=>{const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);return d||((b.occ?1:0)-(a.occ?1:0));});
const sortPole=f=>[...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);

// ─── Scene3D ──────────────────────────────────────────────────────────────────
class Scene3D{
  constructor(canvas){
    Object.assign(this,{canvas,T:null,G:null,renderer:null,scene:null,camera:null,
      panelMesh:null,edgeMeshes:[],starMesh:null,halos:[],coronaPts:null,starfield:null,
      raycaster:null,triToFace:null,faceSlots:[],_faces:null,
      rot:{x:0.12,y:0},vel:{x:0,y:0},isDragging:false,pinchDist:null,touchStart:null,
      zoomTarget:22,zoomCurrent:22,hovFace:-1,selFace:-1,
      animId:null,transitioning:false,onHover:null,onClick:null,_h:{},
      _t0:Date.now(),_pU:null,_eU:null,_sU:null,
    });
  }

  async init(THREE,GSAP){
    this.T=THREE;this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth,H=this.canvas.clientHeight||window.innerHeight;
    const r=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(W,H,false);
    r.setClearColor(0x080A0F,1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.45;
    this.renderer=r;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x080A0F,0.008);
    this.camera=new THREE.PerspectiveCamera(40,W/H,0.1,600);this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();
    this.scene.add(new THREE.AmbientLight(0x0A0F1C,9.0));
    this._sl=new THREE.PointLight(0xFFF8E0,22,75,1.4);this.scene.add(this._sl);
    this._cl=new THREE.PointLight(0xFF8800,7,55,2);this.scene.add(this._cl);
    const dl=new THREE.DirectionalLight(0x1A2888,1.1);dl.position.set(-20,-8,-18);this.scene.add(dl);
    const rl=new THREE.PointLight(0x7B5FFF,0.9,110);rl.position.set(-15,-20,22);this.scene.add(rl);
    this._buildStarfield();this._buildStar();this._buildCorona();
    this._bindEvents();this._animate();
  }

  _buildStarfield(){
    const T=this.T,N=7500;const p=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=100+Math.random()*300;
      p[i*3]=r*Math.sin(ph)*Math.cos(th);p[i*3+1]=r*Math.sin(ph)*Math.sin(th);p[i*3+2]=r*Math.cos(ph);
      const q=Math.random();
      if(q<0.14){col[i*3]=0.55;col[i*3+1]=0.75;col[i*3+2]=1.0;}
      else if(q<0.50){col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.92;}
      else if(q<0.76){col[i*3]=1.0;col[i*3+1]=0.82;col[i*3+2]=0.44;}
      else{col[i*3]=0.76;col[i*3+1]=0.38;col[i*3+2]=1.0;}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(col,3));
    this.starfield=new T.Points(g,new T.PointsMaterial({size:0.19,vertexColors:true,transparent:true,opacity:0.86,sizeAttenuation:true,depthWrite:false}));
    this.scene.add(this.starfield);
  }

  _buildStar(){
    const T=this.T;const u={uTime:{value:0}};this._sU=u;
    this.starMesh=new T.Mesh(new T.SphereGeometry(STAR_R,48,48),new T.ShaderMaterial({vertexShader:STAR_VERT,fragmentShader:STAR_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
    this.scene.add(this.starMesh);
    this.halos=[];
    for(const[r,col,op]of[[STAR_R*1.4,0xFFFFF0,0.52],[STAR_R*2.4,0xFFCC44,0.26],[STAR_R*4.0,0xFF8800,0.12],[STAR_R*7.5,0x440600,0.055]]){
      const m=new T.Mesh(new T.SphereGeometry(r,16,16),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending}));
      this.scene.add(m);this.halos.push(m);
    }
  }

  _buildCorona(){
    const T=this.T,N=2600;const p=new Float32Array(N*3),col=new Float32Array(N*3);
    this._hB=new Float32Array(N*3);this._hL=Array.from({length:N},()=>Math.random());this._hS=Array.from({length:N},()=>0.003+Math.random()*0.007);
    const pal=[[0,0.9,1],[0.48,0.37,1],[0,1,0.58],[1,0.72,0]];
    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=SPHERE_R*(0.90+Math.random()*0.20);
      const x=r*Math.sin(ph)*Math.cos(th),y=r*Math.sin(ph)*Math.sin(th),z=r*Math.cos(ph);
      this._hB[i*3]=x;this._hB[i*3+1]=y;this._hB[i*3+2]=z;p[i*3]=x;p[i*3+1]=y;p[i*3+2]=z;
      const pl=pal[Math.floor(Math.random()*pal.length)],br=0.4+Math.random()*0.6;
      col[i*3]=pl[0]*br;col[i*3+1]=pl[1]*br;col[i*3+2]=pl[2]*br;
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(col,3));
    this.coronaPts=new T.Points(g,new T.PointsMaterial({size:0.11,vertexColors:true,transparent:true,opacity:0.52,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));
    this._hG=g;this.scene.add(this.coronaPts);
  }

  _buildMesh(faces){
    const T=this.T;
    if(this.panelMesh){this.scene.remove(this.panelMesh);this.panelMesh.geometry.dispose();this.panelMesh.material.dispose();this.panelMesh=null;}
    for(const e of this.edgeMeshes){this.scene.remove(e);e.geometry.dispose();e.material.dispose();}this.edgeMeshes=[];
    if(!faces?.length)return;
    this.faceSlots=faces.map(f=>f.slot||null);this._faces=faces;
    const{pos,nrm,occ,tc,ti,fi,bary,t2f}=buildPanelBufs(faces);this.triToFace=t2f;
    const uni={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1}};this._pU=uni;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('normal',new T.BufferAttribute(nrm,3));
    geo.setAttribute('aOccupied',new T.BufferAttribute(occ,1));
    geo.setAttribute('aTierColor',new T.BufferAttribute(tc,3));
    geo.setAttribute('aTierIdx',new T.BufferAttribute(ti,1));
    geo.setAttribute('aFaceIdx',new T.BufferAttribute(fi,1));
    geo.setAttribute('aBary',new T.BufferAttribute(bary,3));
    this.panelMesh=new T.Mesh(geo,new T.ShaderMaterial({
      vertexShader:PANEL_VERT,fragmentShader:PANEL_FRAG,uniforms:uni,
      side:T.DoubleSide,transparent:true,depthWrite:false,
      extensions:{derivatives:true},blending:T.AdditiveBlending,
    }));
    this.panelMesh.rotation.x=this.rot.x;this.panelMesh.rotation.y=this.rot.y;
    this.scene.add(this.panelMesh);
    const eD=buildEdgeBufs(faces);
    const eU={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1}};this._eU=eU;
    // 3 passes bloom : aura > glow > core
    for(const[LIFT,opacity]of[[1.012,0.18],[1.005,0.45],[1.001,1.0]]){
      const sp=new Float32Array(eD.pos.length);
      for(let i=0;i<eD.pos.length;i+=3){sp[i]=eD.pos[i]*LIFT;sp[i+1]=eD.pos[i+1]*LIFT;sp[i+2]=eD.pos[i+2]*LIFT;}
      const eg=new T.BufferGeometry();
      eg.setAttribute('position',new T.BufferAttribute(sp,3));
      eg.setAttribute('aOcc',new T.BufferAttribute(eD.occ,1));
      eg.setAttribute('aTC',new T.BufferAttribute(eD.tc,3));
      eg.setAttribute('aFI',new T.BufferAttribute(eD.fi,1));
      const mat=new T.ShaderMaterial({vertexShader:EDGE_VERT,fragmentShader:EDGE_FRAG,uniforms:eU,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
      mat.opacity=opacity; // hint seulement, le frag gère l'alpha
      const em=new T.LineSegments(eg,mat);
      em.rotation.x=this.rot.x;em.rotation.y=this.rot.y;
      this.scene.add(em);this.edgeMeshes.push(em);
    }
  }

  setFaces(faces,animate=false){
    this.hovFace=-1;this.selFace=-1;
    if(!animate||this.transitioning){this._buildMesh(faces);return;}
    this.transitioning=true;
    const G=this.G,doSwap=()=>{
      this._buildMesh(faces);
      const meshes=[this.panelMesh,...this.edgeMeshes].filter(Boolean);
      if(meshes.length){
        meshes.forEach(m=>m.scale.set(0,0,0));
        const proxy={v:0};
        G.to(proxy,{v:1,duration:0.58,ease:'back.out(1.4)',
          onUpdate:()=>meshes.forEach(m=>m.scale.set(proxy.v,proxy.v,proxy.v)),
          onComplete:()=>{this.transitioning=false;}});
      }else{this.transitioning=false;}
    };
    const meshes=[this.panelMesh,...this.edgeMeshes].filter(Boolean);
    if(meshes.length){
      const proxy={v:1};
      G.to(proxy,{v:0,duration:0.20,ease:'power3.in',
        onUpdate:()=>meshes.forEach(m=>m.scale.set(proxy.v,proxy.v,proxy.v)),
        onComplete:doSwap});
    }else{doSwap();}
  }

  _ndc(cx,cy){const r=this.canvas.getBoundingClientRect();return{x:((cx-r.left)/r.width)*2-1,y:-((cy-r.top)/r.height)*2+1};}
  _cast(cx,cy){if(!this.panelMesh)return-1;const{x,y}=this._ndc(cx,cy);this.raycaster.setFromCamera({x,y},this.camera);const h=this.raycaster.intersectObject(this.panelMesh);return h.length?this.triToFace?.[h[0].faceIndex]??h[0].faceIndex:-1;}
  _setHov(fi){this.hovFace=fi;if(this._pU)this._pU.uHovered.value=fi;if(this._eU)this._eU.uHovered.value=fi;}
  _setSel(fi){this.selFace=fi;if(this._pU)this._pU.uSelected.value=fi;if(this._eU)this._eU.uSelected.value=fi;}

  zoomToFace(centroid){
    if(!centroid||!this.G)return;
    const T=this.T,G=this.G;
    const v=new T.Vector3(...centroid);v.applyEuler(this.panelMesh.rotation);
    const dir=v.clone().normalize();
    G.to(this.camera.position,{x:dir.x*SPHERE_R*2.0,y:dir.y*SPHERE_R*2.0,z:dir.z*SPHERE_R*2.0+8,duration:1.1,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(dir.x*0.4,dir.y*0.4,dir.z*0.4))});
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
    if(!this.isDragging){this.rot.y+=this.vel.x;this.rot.x+=this.vel.y;this.vel.x*=0.94;this.vel.y*=0.94;this.rot.y+=0.00032;}
    const rx=this.rot.x,ry=this.rot.y;
    if(this.panelMesh){this.panelMesh.rotation.x=rx;this.panelMesh.rotation.y=ry;}
    for(const e of this.edgeMeshes){e.rotation.x=rx;e.rotation.y=ry;}
    if(this._pU)this._pU.uTime.value=t;if(this._eU)this._eU.uTime.value=t;if(this._sU)this._sU.uTime.value=t;
    const sp=1+Math.sin(t*0.88)*0.18+Math.sin(t*2.1)*0.05;
    if(this._sl)this._sl.intensity=22*sp;if(this._cl)this._cl.intensity=7*sp;
    this.halos.forEach((h,i)=>h.scale.setScalar(1+Math.sin(t*0.34+i*0.70)*0.04));
    if(this._hG){const pa=this._hG.getAttribute('position'),N=pa.count;for(let i=0;i<N;i++){this._hL[i]+=this._hS[i];if(this._hL[i]>1)this._hL[i]=0;const l=this._hL[i],r=SPHERE_R*(0.90+l*0.20),bx=this._hB[i*3],by=this._hB[i*3+1],bz=this._hB[i*3+2],l2=Math.sqrt(bx*bx+by*by+bz*bz)||1;pa.array[i*3]=bx/l2*r;pa.array[i*3+1]=by/l2*r;pa.array[i*3+2]=bz/l2*r;}pa.needsUpdate=true;}
    if(this.coronaPts){this.coronaPts.rotation.x=rx;this.coronaPts.rotation.y=ry;}
    if(this.starfield){this.starfield.rotation.y=t*0.0005;this.starfield.rotation.x=Math.sin(t*0.00007)*0.010;}
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.065;
    this.camera.position.z=this.zoomCurrent;
    this.renderer.render(this.scene,this.camera);
  }
  resize(){const W=this.canvas.clientWidth,H=this.canvas.clientHeight;if(!W||!H)return;this.camera.aspect=W/H;this.camera.updateProjectionMatrix();this.renderer.setSize(W,H,false);}
  destroy(){cancelAnimationFrame(this.animId);const h=this._h;this.canvas.removeEventListener('mousedown',h.md);window.removeEventListener('mousemove',h.mm);window.removeEventListener('mouseup',h.mu);this.canvas.removeEventListener('touchstart',h.ts);this.canvas.removeEventListener('touchmove',h.tm);this.canvas.removeEventListener('touchend',h.te);[this.panelMesh,...this.edgeMeshes].forEach(m=>{if(m){m.geometry?.dispose();m.material?.dispose();}});this.renderer?.dispose();}
}

// ─── HUD UI COMPONENTS ───────────────────────────────────────────────────────

// Glassmorphism 12px — panel universel
function GlassPanel({children,style={},glow,...p}){
  return(
    <div style={{
      background:DS.glass,
      backdropFilter:'blur(12px) saturate(155%)',
      WebkitBackdropFilter:'blur(12px) saturate(155%)',
      border:`0.5px solid ${glow?`${glow}38`:DS.glassBrd}`,
      boxShadow:glow
        ?`0 0 0 1px ${glow}14,0 0 22px ${glow}14,inset 0 1px 0 rgba(255,255,255,0.05)`
        :`inset 0 1px 0 rgba(255,255,255,0.04),0 8px 28px rgba(0,0,0,0.55)`,
      ...style,
    }}{...p}>{children}</div>
  );
}

// Bouton à bordure lumineuse — zéro background plein
function LumBtn({children,onClick,col=DS.cyan,style={},sm,...p}){
  const[hov,setHov]=useState(false);
  return(
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:hov?`${col}0e`:'transparent',
        border:`0.5px solid ${col}${hov?'cc':'4a'}`,
        borderRadius:8,color:hov?col:`${col}99`,
        fontFamily:F.ui,fontSize:sm?10:12,fontWeight:600,
        padding:sm?'6px 12px':'10px 20px',
        cursor:'pointer',outline:'none',letterSpacing:'0.04em',
        boxShadow:hov?`0 0 18px ${col}28,inset 0 0 10px ${col}06`:'none',
        transition:'all 0.16s ease',
        display:'flex',alignItems:'center',justifyContent:'center',gap:7,
        ...style,
      }}{...p}>{children}</button>
  );
}

// Tag HUD compact
function Tag({label,col,mono}){
  return(
    <span style={{
      display:'inline-flex',alignItems:'center',gap:4,
      padding:'2px 7px',borderRadius:4,
      border:`0.5px solid ${col}44`,background:`${col}0c`,
      color:col,fontSize:8.5,fontWeight:600,
      fontFamily:mono?F.mono:F.ui,letterSpacing:'0.10em',
    }}>{label}</span>
  );
}

// Séparateur lumineux 0.5px
function LumSep({col=DS.cyan,style={}}){
  return <div style={{height:0.5,background:`linear-gradient(90deg,transparent,${col}55,transparent)`,boxShadow:`0 0 6px ${col}44`,...style}}/>;
}

// ── Hologramme Produit ────────────────────────────────────────────────────────
function ProductReveal({slot,onClose,onRent,onBuyout}){
  const[phase,setPhase]=useState(0);
  useEffect(()=>{const id=requestAnimationFrame(()=>setPhase(1));return()=>cancelAnimationFrame(id);},[]);
  if(!slot)return null;

  const col   = TIER_NEON[slot.tier]||TIER_COLOR[slot.tier]||DS.cyan;
  const label = (TIER_LABEL[slot.tier]||slot.tier).toUpperCase();
  const price = fmt(slot.tier);
  const isEpic= slot.tier==='epicenter';
  const occ   = slot.occ;
  const tenant= slot.tenant;

  return(
    <div style={{position:'absolute',top:0,bottom:0,right:220,width:360,display:'flex',alignItems:'center',justifyContent:'flex-end',padding:'0 14px',zIndex:45,pointerEvents:'none'}}>
      <div style={{
        width:338,pointerEvents:'auto',
        opacity:phase?1:0,
        transform:phase?'none':'translateX(18px) scale(0.96)',
        transition:'opacity 0.28s ease,transform 0.36s cubic-bezier(0.34,1.56,0.64,1)',
        // Hologramme : glass 12px, coins 14px arrondis, bordure 0.5px lumineuse
        borderRadius:14,
        background:DS.glass,
        backdropFilter:'blur(12px) saturate(180%)',
        WebkitBackdropFilter:'blur(12px) saturate(180%)',
        border:`0.5px solid ${col}44`,
        boxShadow:`0 0 0 1px ${col}14,0 0 36px ${col}16,0 0 72px ${col}08,inset 0 1px 0 rgba(255,255,255,0.06)`,
        overflow:'hidden',
      }}>
        {/* Trait top lumineux 0.5px */}
        <div style={{height:0.5,background:`linear-gradient(90deg,transparent,${col},transparent)`,boxShadow:`0 0 10px ${col}`}}/>

        {/* Hero */}
        <div style={{height:occ&&tenant?.img?136:104,position:'relative',overflow:'hidden',background:DS.abyss}}>
          {occ&&tenant?.img&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${tenant.img})`,backgroundSize:'cover',backgroundPosition:'center'}}/>}
          {/* Grille holographique fine */}
          <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${col}08 0.5px,transparent 0.5px),linear-gradient(90deg,${col}08 0.5px,transparent 0.5px)`,backgroundSize:'18px 18px',pointerEvents:'none'}}/>
          {/* Scanlines */}
          <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,0.10) 0px,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 3px)',pointerEvents:'none'}}/>
          {/* Corner marks HUD — 0.5px */}
          {[{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}].map((pos,i)=>(
            <div key={i} style={{
              position:'absolute',width:9,height:9,...pos,
              borderTop:i<2?`0.5px solid ${col}`:'none',
              borderBottom:i>=2?`0.5px solid ${col}`:'none',
              borderLeft:(i===0||i===2)?`0.5px solid ${col}`:'none',
              borderRight:(i===1||i===3)?`0.5px solid ${col}`:'none',
              boxShadow:`0 0 5px ${col}55`,zIndex:2,
            }}/>
          ))}
          {/* Icône centrale */}
          {!(occ&&tenant?.img)&&(
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>
              <div style={{
                width:isEpic?66:52,height:isEpic?66:52,borderRadius:isEpic?'50%':10,
                border:`0.5px solid ${col}88`,background:`${col}08`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:isEpic?24:18,fontWeight:700,color:col,fontFamily:F.mono,
                boxShadow:`0 0 28px ${col}35`,
              }}>{tenant?.l||(occ?'◉':'○')}</div>
            </div>
          )}
          {/* Badges */}
          <div style={{position:'absolute',top:9,left:9,zIndex:3}}><Tag label={label} col={col}/></div>
          <div style={{position:'absolute',top:9,right:9,zIndex:3}}><Tag label={occ?'● ACTIF':'○ LIBRE'} col={occ?col:DS.textLo}/></div>
          {/* Bouton close */}
          <button onClick={onClose} style={{position:'absolute',bottom:9,right:9,zIndex:3,width:22,height:22,borderRadius:5,background:'transparent',border:`0.5px solid ${DS.glassBrdHi}`,color:DS.textLo,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',outline:'none',transition:'all 0.14s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${DS.rose}88`;e.currentTarget.style.color=DS.rose;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=DS.glassBrdHi;e.currentTarget.style.color=DS.textLo;}}>✕</button>
        </div>

        <LumSep col={col} style={{opacity:0.5}}/>

        {/* Contenu */}
        <div style={{padding:'14px 16px 18px'}}>
          {/* Nom + tagline */}
          <div style={{marginBottom:12}}>
            <div style={{color:DS.textHi,fontSize:14,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.01em',marginBottom:3,lineHeight:1.3}}>
              {occ?(tenant?.name||`Panneau ${label}`):`Emplacement ${label}`}
            </div>
            <div style={{color:DS.textLo,fontSize:9.5,fontFamily:F.ui,lineHeight:1.6}}>
              {occ?(tenant?.cta||'Présence active · Sphère de Dyson'):`Slot disponible · Exposition maximale`}
            </div>
          </div>

          {/* Stats 3 cols */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:12}}>
            {[{k:'TIER',v:label,c:col},{k:'PRIX/J',v:`€${price}`,c:DS.gold},{k:'ZONE',v:'COSMOS',c:DS.cyan}].map(({k,v,c})=>(
              <div key={k} style={{padding:'7px 5px',borderRadius:7,textAlign:'center',border:`0.5px solid ${DS.glassBrdHi}`,background:'transparent'}}>
                <div style={{color:c,fontSize:10.5,fontWeight:700,fontFamily:F.mono,marginBottom:2}}>{v}</div>
                <div style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>{k}</div>
              </div>
            ))}
          </div>

          {/* Réseaux sociaux */}
          {occ&&(tenant?.instagramUrl||tenant?.twitterUrl||tenant?.tiktokUrl||tenant?.websiteUrl)&&(
            <div style={{display:'flex',gap:5,marginBottom:12}}>
              {[['𝕏',tenant?.twitterUrl,'#1DA1F2'],['◎',tenant?.instagramUrl,'#E4405F'],['♪',tenant?.tiktokUrl,'#00f2ea'],['⬡',tenant?.websiteUrl,DS.cyan]].filter(([,u])=>u).map(([ic,u,ic_col])=>(
                <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                  style={{flex:1,padding:'7px 4px',borderRadius:7,border:`0.5px solid ${ic_col}33`,color:`${ic_col}88`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',transition:'all 0.14s',outline:'none',background:'transparent'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=`${ic_col}88`;e.currentTarget.style.color=ic_col;e.currentTarget.style.boxShadow=`0 0 10px ${ic_col}22`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=`${ic_col}33`;e.currentTarget.style.color=`${ic_col}88`;e.currentTarget.style.boxShadow='none';}}>{ic}</a>
              ))}
            </div>
          )}

          {/* Prix — cadre 0.5px, pas de background plein */}
          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12,padding:'9px 12px',borderRadius:9,border:`0.5px solid ${col}33`,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(90deg,transparent,transparent 22px,${col}05 22px,${col}05 22.5px)`,pointerEvents:'none'}}/>
            <span style={{color:col,fontSize:22,fontWeight:700,fontFamily:F.mono,lineHeight:1,textShadow:`0 0 18px ${col}66`}}>€{price}</span>
            <span style={{color:DS.textLo,fontSize:9.5,fontFamily:F.ui}}>/jour · excl. taxes</span>
            <span style={{marginLeft:'auto',color:`${col}33`,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.12em'}}>ADS·SQ</span>
          </div>

          {/* CTA — bordure lumineuse uniquement */}
          {!occ
            ?<LumBtn onClick={()=>onRent(slot)} col={col} style={{width:'100%'}}>
              <span>Réserver ce slot</span><span style={{opacity:0.45,fontSize:10}}>→</span>
             </LumBtn>
            :<LumBtn onClick={()=>onBuyout(slot)} col={DS.textLo} style={{width:'100%',fontSize:11}}>
              Proposer un rachat
             </LumBtn>
          }
        </div>
      </div>
    </div>
  );
}

// ── Hover Chip HUD ────────────────────────────────────────────────────────────
function HoverChip({slot}){
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  return(
    <div style={{position:'absolute',bottom:64,left:'50%',transform:'translateX(-50%)',pointerEvents:'none',zIndex:35,animation:'hfadeUp 0.16s ease both'}}>
      <GlassPanel glow={col} style={{padding:'5px 13px',display:'flex',alignItems:'center',gap:9,borderRadius:8}}>
        <div style={{width:4,height:4,borderRadius:'50%',background:col,boxShadow:`0 0 8px ${col}`,flexShrink:0}}/>
        <span style={{color:col,fontSize:9,fontWeight:600,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[slot.tier]||slot.tier).toUpperCase()}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrdHi}}/>
        <span style={{color:DS.textMid,fontSize:9,fontFamily:F.ui}}>{slot.occ?(slot.tenant?.name||'Occupé'):'Disponible'}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrdHi}}/>
        <span style={{color:DS.gold,fontSize:9,fontWeight:600,fontFamily:F.mono}}>€{fmt(slot.tier)}/j</span>
      </GlassPanel>
    </div>
  );
}

// ── Sidebar Glassmorphism ─────────────────────────────────────────────────────
const Sidebar=memo(function Sidebar({slots,isLive,level}){
  const stats=useMemo(()=>{const c={};TIER_ORDER.forEach(t=>{c[t]=0;});(slots||[]).forEach(s=>{if(s?.occ&&c[s.tier]!==undefined)c[s.tier]++;});return c;},[slots]);
  const rev=TIER_ORDER.reduce((s,t)=>s+(stats[t]||0)*(TIER_PRICE[t]||0)/100,0);
  const totalOcc=Object.values(stats).reduce((s,v)=>s+v,0);

  return(
    <div style={{
      width:218,flexShrink:0,
      background:DS.glass,
      backdropFilter:'blur(12px) saturate(155%)',
      WebkitBackdropFilter:'blur(12px) saturate(155%)',
      borderLeft:`0.5px solid ${DS.glassBrdHi}`,
      display:'flex',flexDirection:'column',zIndex:20,
      boxShadow:'-1px 0 0 rgba(255,255,255,0.04),-14px 0 36px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{padding:'15px 15px 11px',borderBottom:`0.5px solid ${DS.glassBrdHi}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{color:DS.cyan,fontSize:13,textShadow:`0 0 12px ${DS.cyan}`,lineHeight:1}}>✦</span>
            <span style={{color:DS.textHi,fontSize:11,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.09em'}}>COSMOS</span>
          </div>
          {isLive&&(
            <div style={{display:'flex',alignItems:'center',gap:4,padding:'2px 6px',borderRadius:4,border:`0.5px solid ${DS.green}44`,background:`${DS.green}08`}}>
              <div style={{width:4,height:4,borderRadius:'50%',background:DS.green,boxShadow:`0 0 8px ${DS.green}`,animation:'hpulse 1.5s ease-in-out infinite'}}/>
              <span style={{color:DS.green,fontSize:7,fontWeight:700,letterSpacing:'0.12em',fontFamily:F.ui}}>LIVE</span>
            </div>
          )}
        </div>
        <div style={{color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.06em'}}>{LEVELS[level]?.faces||0} PANELS · LVL {level}</div>
      </div>

      {/* Tiers */}
      <div style={{flex:1,overflowY:'auto',padding:'7px 0'}}>
        {TIER_ORDER.map(tier=>{
          const col=TIER_NEON[tier]||DS.cyan,occ=stats[tier]||0,tot=TIER_TOTALS[tier]||1,pct=Math.round(occ/tot*100);
          return(
            <div key={tier} style={{padding:'7px 13px 7px 11px',borderLeft:`0.5px solid ${occ>0?col:'transparent'}`,marginLeft:2,borderRadius:'0 7px 7px 0',transition:'background 0.14s',cursor:'default'}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${col}07`;}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:4,height:4,borderRadius:'50%',flexShrink:0,background:occ>0?col:DS.textLo,boxShadow:occ>0?`0 0 7px ${col}`:'none'}}/>
                  <span style={{color:occ>0?col:DS.textLo,fontSize:7.5,fontWeight:600,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[tier]||tier).toUpperCase()}</span>
                </div>
                <span style={{color:occ>0?col:DS.textLo,fontSize:8.5,fontWeight:600,fontFamily:F.mono}}>€{fmt(tier)}</span>
              </div>
              {/* Barre progress 1px */}
              <div style={{height:1,borderRadius:1,background:DS.glassBrd,overflow:'hidden',marginBottom:3}}>
                <div style={{height:'100%',width:`${pct}%`,borderRadius:1,background:occ>0?col:'transparent',boxShadow:occ>0?`0 0 5px ${col}`:'none',transition:'width 0.9s ease'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>{occ}/{tot}</span>
                <span style={{color:occ>0?`${col}aa`:DS.textLo,fontSize:7,fontFamily:F.mono}}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{padding:'11px 15px',borderTop:`0.5px solid ${DS.glassBrdHi}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
          <span style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>REVENUS/JOUR</span>
          <span style={{color:DS.gold,fontSize:14,fontWeight:700,fontFamily:F.mono,textShadow:`0 0 14px ${DS.gold}55`}}>€{rev.toLocaleString('fr-FR')}</span>
        </div>
        <LumSep col={DS.cyan} style={{marginBottom:6,opacity:0.4}}/>
        <div style={{textAlign:'center',color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.08em'}}>{totalOcc} ACTIFS</div>
      </div>
    </div>
  );
});

// ── Level Navigator ───────────────────────────────────────────────────────────
const LevelNav=memo(function LevelNav({level,onLevel}){
  return(
    <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:30}}>
      <GlassPanel glow={DS.cyan} style={{padding:'5px 9px',display:'flex',alignItems:'center',gap:3,borderRadius:10}}>
        {LEVELS.map(lv=>{
          const act=lv.n===level;const col=act?DS.cyan:DS.textLo;
          return(
            <button key={lv.n} onClick={()=>onLevel(lv.n)} title={lv.name}
              style={{width:act?30:15,height:act?30:15,borderRadius:'50%',border:`0.5px solid ${col}${act?'cc':'44'}`,background:act?`${DS.cyan}12`:'transparent',color:col,fontSize:act?10:7.5,fontWeight:700,cursor:'pointer',transition:'all 0.26s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.ui,padding:0,flexShrink:0,boxShadow:act?`0 0 16px ${DS.cyan}55,0 0 4px ${DS.cyan}33`:'none',outline:'none'}}>
              {act?lv.icon:lv.n}
            </button>
          );
        })}
        <div style={{marginLeft:6,paddingLeft:8,borderLeft:`0.5px solid ${DS.glassBrdHi}`,display:'flex',flexDirection:'column',gap:1}}>
          <span style={{color:DS.cyan,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em',lineHeight:1.1}}>{LEVELS[level]?.name}</span>
          <span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono,letterSpacing:'0.06em'}}>{LEVELS[level]?.faces} PANELS</span>
        </div>
      </GlassPanel>
    </div>
  );
});

// ── Loading Screen ────────────────────────────────────────────────────────────
function HUDLoader(){
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:26,background:DS.void}}>
      <div style={{position:'relative',width:68,height:68}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{position:'absolute',inset:i*10,borderRadius:'50%',border:`0.5px solid rgba(0,229,255,${0.08-i*0.02})`,borderTopColor:`rgba(0,229,255,${0.82-i*0.24})`,animation:`hspin ${1.0+i*0.85}s linear infinite ${i%2?'reverse':''}`}}/>
        ))}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:9,height:9,borderRadius:'50%',background:'#FFF8E0',boxShadow:'0 0 12px #FFCC44,0 0 28px #FF8800,0 0 55px #FF440018'}}/>
        </div>
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{color:DS.cyan,fontSize:10,fontWeight:600,letterSpacing:'0.30em',fontFamily:F.ui,marginBottom:5,textShadow:`0 0 18px ${DS.cyan}`}}>DYSON SPHERE</div>
        <div style={{color:DS.textLo,fontSize:7.5,letterSpacing:'0.20em',fontFamily:F.mono}}>INITIALISATION…</div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function View3D({slots=[],isLive=false,onGoAdvertiser,onWaitlist,onCheckout,onBuyout,ExistingPublicView}){
  const canvasRef=useRef(null),sceneRef=useRef(null);
  const[level,setLevel]=useState(6);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(null);
  const[selSlot,setSelSlot]=useState(null);
  const[hovSlot,setHovSlot]=useState(null);
  const hovTimer=useRef(null);

  const sorted=useMemo(()=>sortSlots(slots),[slots]);
  const assignedFaces=useMemo(()=>{if(level===0)return[];return sortPole(getFaces(level)).map((f,i)=>({...f,slot:sorted[i]||null}));},[level,sorted]);

  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let sc;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([T,G])=>{
        sc=new Scene3D(canvasRef.current);sceneRef.current=sc;
        sc.onHover=slot=>{clearTimeout(hovTimer.current);if(slot){hovTimer.current=setTimeout(()=>setHovSlot(slot),80);}else setHovSlot(null);};
        sc.onClick=slot=>setSelSlot(slot||null);
        return sc.init(T,G);
      }).then(()=>{sceneRef.current.setFaces(assignedFaces,false);setLoading(false);})
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
    window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);
  },[]);

  useEffect(()=>{
    const fn=e=>{e.preventDefault();sceneRef.current?.zoom(e.deltaY);};
    const c=canvasRef.current;if(c)c.addEventListener('wheel',fn,{passive:false});
    return()=>{if(c)c.removeEventListener('wheel',fn);};
  },[level]);

  useEffect(()=>{if(!canvasRef.current)return;const ro=new ResizeObserver(()=>sceneRef.current?.resize());ro.observe(canvasRef.current);return()=>ro.disconnect();},[]);

  const goLevel=useCallback(n=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();setLevel(n);},[]);
  const handleClose=useCallback(()=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();},[]);

  if(level===0){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <LumBtn onClick={()=>goLevel(6)} col={DS.cyan} sm
          style={{position:'absolute',top:10,right:10,zIndex:100,letterSpacing:'0.08em'}}>
          ✦ DYSON SPHERE
        </LumBtn>
        {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
      </div>
    );
  }

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:DS.void,display:'flex'}}>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',opacity:loading?0:1,transition:'opacity 0.75s ease'}}/>
        {loading&&!error&&<HUDLoader/>}
        {error&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,background:DS.void}}>
            <div style={{color:DS.err,fontSize:11,fontWeight:600,fontFamily:F.mono,letterSpacing:'0.06em'}}>⚠ {error}</div>
            <LumBtn onClick={()=>goLevel(0)} col={DS.cyan} sm>Vue 2D</LumBtn>
          </div>
        )}

        {/* Back to 2D */}
        <GlassPanel style={{position:'absolute',top:11,left:11,zIndex:30,borderRadius:7}}>
          <button onClick={()=>goLevel(0)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'none',border:'none',color:DS.textLo,fontSize:8.5,fontWeight:600,cursor:'pointer',fontFamily:F.ui,letterSpacing:'0.06em',outline:'none',transition:'color 0.14s'}}
            onMouseEnter={e=>e.currentTarget.style.color=DS.textHi}
            onMouseLeave={e=>e.currentTarget.style.color=DS.textLo}>
            ▦ VUE 2D
          </button>
        </GlassPanel>

        {hovSlot&&!selSlot&&<HoverChip slot={hovSlot}/>}

        {!loading&&!selSlot&&(
          <div style={{position:'absolute',bottom:54,left:'50%',transform:'translateX(-50%)',color:DS.textLo,fontSize:7.5,letterSpacing:'0.12em',fontFamily:F.mono,pointerEvents:'none',whiteSpace:'nowrap',opacity:0.55}}>
            CLIC · ZOOM · DRAG
          </div>
        )}

        <LevelNav level={level} onLevel={goLevel}/>

        {selSlot&&<ProductReveal slot={selSlot} onClose={handleClose} onRent={s=>{handleClose();onCheckout?.(s);}} onBuyout={s=>{handleClose();onBuyout?.(s);}}/>}
      </div>

      <Sidebar slots={slots} isLive={isLive} level={level}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes hspin { to { transform: rotate(360deg); } }
        @keyframes hpulse { 0%,100%{opacity:1;} 50%{opacity:0.25;} }
        @keyframes hfadeUp {
          from { opacity:0; transform:translateX(-50%) translateY(5px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar { width: 1.5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.16); border-radius: 1px; }
        canvas { cursor: grab; }
        canvas:active { cursor: grabbing; }
      `}</style>
    </div>
  );
}
