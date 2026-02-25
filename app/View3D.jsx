'use client';
/**
 * ─── ADS·SQUARE ✦ DYSON SPHERE ORACULUM ────────────────────────────────────
 * Dark Matter aesthetic — faces cliquables — product reveal — cinematic zoom
 * Holographic UI 2026 · npm install three gsap
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ─── Design System ───────────────────────────────────────────────────────────
const C = {
  void:    '#00000f',
  deep:    '#010212',
  abyss:   '#020318',
  glass:   'rgba(2,5,28,0.88)',
  glassHi: 'rgba(5,12,45,0.92)',
  stroke:  'rgba(0,210,255,0.08)',
  strokeHi:'rgba(0,210,255,0.22)',
  text:    '#ccd8ff',
  textHi:  '#eef2ff',
  dim:     'rgba(140,170,255,0.38)',
  cyan:    '#00d4ff',
  cyanGlow:'rgba(0,212,255,0.15)',
  gold:    '#f0c060',
  goldGlow:'rgba(240,192,96,0.20)',
  err:     '#ff3355',
  live:    '#00ff99',
};
const F = {
  display: "'Orbitron','Clash Display','Syne',sans-serif",
  ui:      "'DM Mono','IBM Plex Mono',monospace",
  body:    "'DM Sans','Outfit',system-ui,sans-serif",
};

const TIER_ORDER  = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_TOTALS = { epicenter:1, prestige:8, elite:50, business:176, standard:400, viral:671 };
const LEVELS = [
  {n:0,name:'GRID 2D',  icon:'▦', faces:0},
  {n:1,name:'CUBE',     icon:'⬡', faces:6},
  {n:2,name:'OCTA',     icon:'◆', faces:8},
  {n:3,name:'ICO',      icon:'⬟', faces:20},
  {n:4,name:'SPHERE·I', icon:'◎', faces:80},
  {n:5,name:'SPHERE·II',icon:'◉', faces:320},
  {n:6,name:'COSMOS',   icon:'✦', faces:1280},
];

const SPHERE_R  = 5.8;
const PANEL_GAP = 0.78;   // gap généreux → lumière étoile visible
const STAR_R    = 0.88;
const fmt  = t => ((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const hex3 = h => { const s=(h||'#08f').replace('#',''); return [parseInt(s.slice(0,2),16)/255, parseInt(s.slice(2,4),16)/255, parseInt(s.slice(4,6),16)/255]; };

// ─── GLSL Shaders ────────────────────────────────────────────────────────────

const PANEL_VERT = /* glsl */`
precision highp float;
attribute float aOccupied;
attribute vec3  aTierColor;
attribute float aTierIdx;
attribute float aFaceIdx;
uniform float uTime;
uniform float uHovered;
uniform float uSelected;

varying vec3  vN;
varying vec3  vWP;
varying float vOcc;
varying vec3  vTC;
varying float vTI;
varying float vFI;
varying float vFresnel;
varying float vHov;
varying float vSel;

void main(){
  vN   = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP  = wp.xyz;
  vOcc = aOccupied;
  vTC  = aTierColor;
  vTI  = aTierIdx;
  vFI  = aFaceIdx;
  vHov = step(abs(aFaceIdx - uHovered),  0.5);
  vSel = step(abs(aFaceIdx - uSelected), 0.5);

  vec3 vd = normalize(cameraPosition - wp.xyz);
  vFresnel = pow(clamp(1.0 - abs(dot(vN, vd)), 0.0, 1.0), 2.0);

  // Extrude selected/hovered toward camera
  vec3 pos = position;
  if(vSel > 0.5){
    pos += normalize(position) * (0.22 + 0.06*sin(uTime*4.0));
  } else if(vHov > 0.5){
    pos += normalize(position) * (0.10 + 0.03*sin(uTime*3.0));
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const PANEL_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
uniform float uHovered;
uniform float uSelected;
uniform vec3  uCamPos;

varying vec3  vN;
varying vec3  vWP;
varying float vOcc;
varying vec3  vTC;
varying float vTI;
varying float vFI;
varying float vFresnel;
varying float vHov;
varying float vSel;

float hash(float n){ return fract(sin(n)*43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),u.x), mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u.x), u.y);
}
vec3 spectrum(float t){ return 0.5+0.5*cos(6.28318*(t+vec3(0.0,0.333,0.667))); }

void main(){
  float t    = uTime;
  float seed = hash(vFI * 9.37 + 4.21);
  float ph   = seed * 6.28318;
  bool  hov  = vHov > 0.5;
  bool  sel  = vSel > 0.5;

  if(vOcc > 0.5){
    // ── OCCUPIED PANEL ─────────────────────────────────────────────────────
    float spd   = 0.4 + vTI * 0.15;
    float pulse = 0.7 + 0.3 * sin(t * spd + ph);

    // Hex data grid lines
    vec2 uv  = vWP.xz * 4.0 + vWP.y * 1.5;
    float gx = step(0.93, fract(uv.x)) * 0.30;
    float gy = step(0.93, fract(uv.y)) * 0.30;

    // Holographic scanlines (horizontal + diagonal)
    float scanH = step(0.86, fract(vWP.y * 12.0 - t * 1.8)) * 0.4;
    float scanD = step(0.90, fract((vWP.x + vWP.y) * 6.0 - t * 0.9)) * 0.15;

    // Logo/brand circle region (center of face)
    vec3 faceC = normalize(vWP);
    float logoDist = length(vWP - faceC * SPHERE_R);
    float logoCircle = smoothstep(1.4, 0.8, logoDist) * 0.35;

    // Base diffuse
    vec3 base = vTC * (0.22 + gx + gy + logoCircle) * pulse;

    // Emissive
    vec3 emit = vTC * (0.58 + scanH + scanD) * pulse;

    // Iridescent rim (spectrum shift)
    float iriT = vFresnel * 0.8 + t * 0.06 + seed;
    vec3  iri  = spectrum(iriT) * vTC;
    vec3  rim  = iri * pow(vFresnel, 1.2) * 2.4;

    // Inner star glow
    float sf = max(0.0, dot(vN, normalize(-vWP))) * 0.3;
    vec3  sg = vec3(1.0, 0.88, 0.5) * sf;

    // Hover / selected overrides
    float boost = sel ? 2.8 : (hov ? 1.6 : 1.0);
    vec3  hl    = vec3(0.0);
    float alpha = 0.68 + vFresnel * 0.25;

    if(sel){
      // Gold selection ring
      hl = vec3(1.0, 0.85, 0.25) * pow(vFresnel, 0.9) * 2.2;
      hl += vTC * step(0.88, fract(vWP.y * 18.0 - t * 6.0)) * 0.6;
      alpha = 0.92;
    } else if(hov){
      hl = vec3(0.2, 0.9, 1.0) * pow(vFresnel, 1.0) * 1.4;
      alpha = 0.82;
    }

    vec3 col = (base + emit + rim + sg) * boost + hl;
    gl_FragColor = vec4(col, alpha);

  } else {
    // ── VACANT PANEL ───────────────────────────────────────────────────────
    vec3 cyanV = vec3(0.0, 0.75, 1.0);

    // Subtle circuit board pattern
    vec2 uv  = vWP.xz * 3.5;
    float gx = step(0.91, fract(uv.x)) * 0.12;
    float gy = step(0.91, fract(uv.y)) * 0.12;
    float noise = vnoise(vWP.xz * 2.0 + t * 0.15) * 0.07;

    // Fresnel rim
    float rimStr = sel ? 1.2 : (hov ? 0.75 : 0.28);
    vec3  rim = cyanV * pow(vFresnel, 1.5) * rimStr;

    // Star inner glow
    float sf = max(0.0, dot(vN, normalize(-vWP))) * 0.15;
    vec3  sg = vec3(1.0, 0.85, 0.4) * sf;

    // Hover/sel tint
    vec3 hl = vec3(0);
    if(sel) hl = vec3(0.3, 1.0, 0.8) * (gx+gy) * 1.8 + vec3(0.1,0.5,0.3) * pow(vFresnel,1.0)*0.8;
    else if(hov) hl = cyanV * (gx+gy) * 1.2 + cyanV * pow(vFresnel, 0.9) * 0.3;

    vec3 col = vec3(0.0, 0.010, 0.032) + cyanV * (gx + gy + noise) + rim + sg + hl;
    float alpha = sel ? 0.80 : (hov ? 0.52 : 0.12 + vFresnel * 0.18);
    gl_FragColor = vec4(col, alpha);
  }
}
#define SPHERE_R 5.8
`;

const EDGE_VERT = /* glsl */`
precision highp float;
attribute float aOcc;
attribute vec3  aTC;
attribute float aFI;
uniform float uTime;
uniform float uHovered;
uniform float uSelected;
varying float vOcc;
varying vec3  vTC;
varying float vHov;
varying float vSel;
varying float vPY;
void main(){
  vOcc = aOcc; vTC = aTC; vPY = position.y;
  vHov = step(abs(aFI - uHovered),  0.5);
  vSel = step(abs(aFI - uSelected), 0.5);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const EDGE_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
varying float vOcc; varying vec3 vTC; varying float vHov; varying float vSel; varying float vPY;
void main(){
  float t = uTime;
  float travel = fract(vPY * 0.8 - t * 0.4); // energy traveling up edges
  float spark  = pow(smoothstep(0.0,0.08,travel)*smoothstep(0.18,0.08,travel), 1.5) * 0.8;
  if(vSel > 0.5){
    float p = 0.8 + 0.2*sin(t*5.0 + vPY*6.0);
    gl_FragColor = vec4(vec3(1.0,0.88,0.22)*p*3.0 + vec3(1.0,0.5,0.0)*spark, 1.0);
  } else if(vHov > 0.5){
    float p = 0.75 + 0.25*sin(t*3.5 + vPY*4.0);
    vec3 cc = vOcc>0.5 ? vTC : vec3(0.0,0.88,1.0);
    gl_FragColor = vec4(cc*p*2.2 + vec3(0.5,0.9,1.0)*spark*0.6, 0.95);
  } else if(vOcc > 0.5){
    float p = 0.55 + 0.35*sin(t*1.1 + vPY*2.2);
    gl_FragColor = vec4(vTC*p*1.5 + vTC*spark*0.5, 0.65*p);
  } else {
    float p = 0.35 + 0.22*sin(t*0.65 + vPY*1.6);
    gl_FragColor = vec4(vec3(0.0,0.65,1.0)*p + vec3(0.0,0.8,1.0)*spark*0.3, 0.32*p);
  }
}`;

const STAR_VERT = `varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const STAR_FRAG = `
precision highp float;
uniform float uTime;
varying vec2 vU;
float h(float n){return fract(sin(n)*43758.5);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*h2(p);p*=2.1;a*=0.5;}return v;}
void main(){
  vec2 uv=vU*2.0-1.0; float r=length(uv);
  if(r>1.0){discard;}
  float turb = fbm(uv*6.0 + uTime*0.2);
  float core  = 1.0-smoothstep(0.0,0.85,r);
  float edge  = 1.0-smoothstep(0.45,1.0,r);
  vec3 c1=vec3(1.0,0.97,0.84), c2=vec3(1.0,0.66,0.10), c3=vec3(0.92,0.22,0.02);
  vec3 col = mix(c3, mix(c2,c1, core + turb*0.4), edge);
  float spot = h2(uv*10.0 + uTime*0.03);
  col -= vec3(0.15,0.07,0.0)*step(0.72,spot)*core;
  gl_FragColor = vec4(col*3.5, edge*(1.0-r*0.3));
}`;

// ─── Geometry ────────────────────────────────────────────────────────────────
const ins  = (vs,c,f) => vs.map(v=>[c[0]+(v[0]-c[0])*f, c[1]+(v[1]-c[1])*f, c[2]+(v[2]-c[2])*f]);
const cN   = vs => [vs.reduce((s,v)=>s+v[0],0)/vs.length, vs.reduce((s,v)=>s+v[1],0)/vs.length, vs.reduce((s,v)=>s+v[2],0)/vs.length];
const mS   = (a,b) => { const m=a.map((c,i)=>(c+b[i])/2), l=Math.hypot(...m); return m.map(c=>c/l); };

function buildCubeFaces(){
  const a=SPHERE_R/Math.sqrt(3);
  return [[[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],[[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],
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

// ─── Buffer builders ─────────────────────────────────────────────────────────
function buildPanelBufs(faces){
  let nT=0;for(const f of faces)nT+=f.isQuad?2:1;
  const pos=new Float32Array(nT*9),nrm=new Float32Array(nT*9);
  const occ=new Float32Array(nT*3),tc=new Float32Array(nT*9),ti=new Float32Array(nT*3),fi=new Float32Array(nT*3);
  const t2f=new Int32Array(nT);
  let v=0,t=0;
  const tn=(a,b,c)=>{const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l);};
  const push=(x,y,z,nx,ny,nz,o,r,g,b,tiv,fiv)=>{const i=v*3;pos[i]=x;pos[i+1]=y;pos[i+2]=z;nrm[i]=nx;nrm[i+1]=ny;nrm[i+2]=nz;occ[v]=o;tc[i]=r;tc[i+1]=g;tc[i+2]=b;ti[v]=tiv;fi[v]=fiv;v++;};
  faces.forEach((face,faceI)=>{
    const s=face.slot;const isO=s?.occ?1:0;const tier=s?.tier;
    const rgb=tier?hex3(TIER_COLOR[tier]||'#08f'):[0,0.5,0.8];
    const tiv=tier?TIER_ORDER.indexOf(tier):5;
    const vs=face.verts;const n0=tn(vs[0],vs[1],vs[2]);
    push(vs[0][0],vs[0][1],vs[0][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,faceI);
    push(vs[1][0],vs[1][1],vs[1][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,faceI);
    push(vs[2][0],vs[2][1],vs[2][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,faceI);
    t2f[t++]=faceI;
    if(face.isQuad){const n1=tn(vs[0],vs[2],vs[3]);push(vs[0][0],vs[0][1],vs[0][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,faceI);push(vs[2][0],vs[2][1],vs[2][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,faceI);push(vs[3][0],vs[3][1],vs[3][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,faceI);t2f[t++]=faceI;}
  });
  return{pos,nrm,occ,tc,ti,fi,t2f};
}
function buildEdgeBufs(faces){
  const segs=[],occA=[],tcA=[],fiA=[];
  faces.forEach((face,fi)=>{
    const vs=face.verts,n=face.isQuad?4:3;
    const s=face.slot;const isO=s?.occ?1:0;const tier=s?.tier;
    const rgb=tier?hex3(TIER_COLOR[tier]||'#08f'):[0,0.5,0.8];
    const LIFT=1.005;
    for(let i=0;i<n;i++){const a=vs[i],b=vs[(i+1)%n];segs.push(a[0]*LIFT,a[1]*LIFT,a[2]*LIFT,b[0]*LIFT,b[1]*LIFT,b[2]*LIFT);occA.push(isO,isO);tcA.push(...rgb,...rgb);fiA.push(fi,fi);}
  });
  return{pos:new Float32Array(segs),occ:new Float32Array(occA),tc:new Float32Array(tcA),fi:new Float32Array(fiA)};
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sortSlots = s => [...(s||[])].filter(Boolean).sort((a,b)=>{const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);return d||((b.occ?1:0)-(a.occ?1:0));});
const sortPole  = f => [...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);

// ─── Scene3D ─────────────────────────────────────────────────────────────────
class Scene3D {
  constructor(canvas){
    Object.assign(this,{canvas,T:null,G:null,renderer:null,scene:null,camera:null,
      panelMesh:null,edgeMeshes:[],starMesh:null,halos:[],coronaPts:null,outerRing:null,starfield:null,nebula:null,
      raycaster:null,triToFace:null,faceSlots:[],_faces:null,
      rot:{x:0.14,y:0},vel:{x:0,y:0},isDragging:false,pinchDist:null,touchStart:null,
      zoomTarget:22,zoomCurrent:22,
      hovFace:-1,selFace:-1,
      animId:null,transitioning:false,
      onHover:null,onClick:null,_h:{},
      _t0:Date.now(),_pU:null,_eU:null,_sU:null,
    });
  }

  async init(THREE,GSAP){
    this.T=THREE;this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth,H=this.canvas.clientHeight||window.innerHeight;
    const r=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(W,H,false);
    r.setClearColor(0x00000f,1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.18;
    this.renderer=r;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x00000f,0.010);
    this.camera=new THREE.PerspectiveCamera(40,W/H,0.1,600);this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();

    this.scene.add(new THREE.AmbientLight(0x010318,6.0));
    this._sl=new THREE.PointLight(0xfff8e0,16,60,1.5);this.scene.add(this._sl);
    this._cl=new THREE.PointLight(0xff9900,5,40,2);this.scene.add(this._cl);
    const dl=new THREE.DirectionalLight(0x182888,1.2);dl.position.set(-25,-10,-20);this.scene.add(dl);
    const rl=new THREE.PointLight(0x0022cc,0.9,110);rl.position.set(-15,-20,22);this.scene.add(rl);

    this._buildStarfield();this._buildNebula();this._buildStar();this._buildHalo();
    this._bindEvents();this._animate();
  }

  _buildStarfield(){
    const T=this.T,N=6000;const p=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=95+Math.random()*240;p[i*3]=r*Math.sin(ph)*Math.cos(th);p[i*3+1]=r*Math.sin(ph)*Math.sin(th);p[i*3+2]=r*Math.cos(ph);const q=Math.random();if(q<0.2){col[i*3]=0.5;col[i*3+1]=0.7;col[i*3+2]=1.0;}else if(q<0.55){col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.92;}else if(q<0.80){col[i*3]=1.0;col[i*3+1]=0.84;col[i*3+2]=0.52;}else{col[i*3]=1.0;col[i*3+1]=0.48;col[i*3+2]=0.28;}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(col,3));
    this.starfield=new T.Points(g,new T.PointsMaterial({size:0.22,vertexColors:true,transparent:true,opacity:0.90,sizeAttenuation:true,depthWrite:false}));this.scene.add(this.starfield);
  }

  _buildNebula(){
    const T=this.T,N=1400;const p=new Float32Array(N*3),col=new Float32Array(N*3);
    const gn=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
    const pal=[[0.0,0.55,1.0],[0.35,0.08,0.92],[0.0,0.38,0.85],[0.08,0.65,0.88]];
    for(let i=0;i<N;i++){const cx=(Math.random()-0.5)*100,cy=(Math.random()-0.5)*60,cz=(Math.random()-0.5)*100;p[i*3]=cx+gn()*20;p[i*3+1]=cy+gn()*15;p[i*3+2]=cz+gn()*20;const pl=pal[Math.floor(Math.random()*pal.length)];col[i*3]=pl[0]*0.62;col[i*3+1]=pl[1]*0.62;col[i*3+2]=pl[2]*0.62;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(col,3));
    this.nebula=new T.Points(g,new T.PointsMaterial({size:2.2,vertexColors:true,transparent:true,opacity:0.075,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));this.scene.add(this.nebula);
  }

  _buildStar(){
    const T=this.T;const u={uTime:{value:0}};this._sU=u;
    this.starMesh=new T.Mesh(new T.SphereGeometry(STAR_R,48,48),new T.ShaderMaterial({vertexShader:STAR_VERT,fragmentShader:STAR_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
    this.scene.add(this.starMesh);
    this.halos=[];
    for(const[r,col,op]of[[STAR_R*1.5,0xfffff2,0.50],[STAR_R*2.6,0xffdf66,0.24],[STAR_R*4.4,0xff8800,0.11],[STAR_R*8.0,0x440600,0.05],[STAR_R*15,0x110100,0.022]]){const m=new T.Mesh(new T.SphereGeometry(r,16,16),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending}));this.scene.add(m);this.halos.push(m);}
  }

  _buildHalo(){
    const T=this.T,N=3200;const p=new Float32Array(N*3),col=new Float32Array(N*3);
    this._hB=new Float32Array(N*3);this._hL=Array.from({length:N},()=>Math.random());this._hS=Array.from({length:N},()=>0.003+Math.random()*0.007);
    for(let i=0;i<N;i++){const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=SPHERE_R*(0.91+Math.random()*0.19);const x=r*Math.sin(ph)*Math.cos(th),y=r*Math.sin(ph)*Math.sin(th),z=r*Math.cos(ph);this._hB[i*3]=x;this._hB[i*3+1]=y;this._hB[i*3+2]=z;p[i*3]=x;p[i*3+1]=y;p[i*3+2]=z;const br=0.5+Math.random()*0.5;col[i*3]=br*0.07;col[i*3+1]=br*0.72;col[i*3+2]=br*1.0;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(col,3));
    this.coronaPts=new T.Points(g,new T.PointsMaterial({size:0.15,vertexColors:true,transparent:true,opacity:0.62,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));
    this._hG=g;this.scene.add(this.coronaPts);
    const N2=900,p2=new Float32Array(N2*3),c2=new Float32Array(N2*3);
    for(let i=0;i<N2;i++){const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=SPHERE_R*(1.06+Math.random()*0.28);p2[i*3]=r*Math.sin(ph)*Math.cos(th);p2[i*3+1]=r*Math.sin(ph)*Math.sin(th);p2[i*3+2]=r*Math.cos(ph);c2[i*3]=0.04;c2[i*3+1]=0.52+Math.random()*0.26;c2[i*3+2]=0.92+Math.random()*0.08;}
    const g2=new T.BufferGeometry();g2.setAttribute('position',new T.BufferAttribute(p2,3));g2.setAttribute('color',new T.BufferAttribute(c2,3));
    this.outerRing=new T.Points(g2,new T.PointsMaterial({size:0.09,vertexColors:true,transparent:true,opacity:0.24,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));this.scene.add(this.outerRing);
  }

  _buildMesh(faces){
    const T=this.T;
    if(this.panelMesh){this.scene.remove(this.panelMesh);this.panelMesh.geometry.dispose();this.panelMesh.material.dispose();this.panelMesh=null;}
    for(const e of this.edgeMeshes){this.scene.remove(e);e.geometry.dispose();e.material.dispose();}this.edgeMeshes=[];
    if(!faces?.length)return;
    this.faceSlots=faces.map(f=>f.slot||null);this._faces=faces;
    const{pos,nrm,occ,tc,ti,fi,t2f}=buildPanelBufs(faces);this.triToFace=t2f;
    const uni={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1}};this._pU=uni;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nrm,3));
    geo.setAttribute('aOccupied',new T.BufferAttribute(occ,1));geo.setAttribute('aTierColor',new T.BufferAttribute(tc,3));
    geo.setAttribute('aTierIdx',new T.BufferAttribute(ti,1));geo.setAttribute('aFaceIdx',new T.BufferAttribute(fi,1));
    this.panelMesh=new T.Mesh(geo,new T.ShaderMaterial({vertexShader:PANEL_VERT,fragmentShader:PANEL_FRAG,uniforms:uni,side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.NormalBlending}));
    this.panelMesh.rotation.x=this.rot.x;this.panelMesh.rotation.y=this.rot.y;this.scene.add(this.panelMesh);

    const eD=buildEdgeBufs(faces);
    const eU={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1}};this._eU=eU;
    for(const LIFT of[1.012,1.006,1.001]){
      const sp=new Float32Array(eD.pos.length);for(let i=0;i<eD.pos.length;i+=3){sp[i]=eD.pos[i]*LIFT;sp[i+1]=eD.pos[i+1]*LIFT;sp[i+2]=eD.pos[i+2]*LIFT;}
      const eg=new T.BufferGeometry();eg.setAttribute('position',new T.BufferAttribute(sp,3));eg.setAttribute('aOcc',new T.BufferAttribute(eD.occ,1));eg.setAttribute('aTC',new T.BufferAttribute(eD.tc,3));eg.setAttribute('aFI',new T.BufferAttribute(eD.fi,1));
      const em=new T.LineSegments(eg,new T.ShaderMaterial({vertexShader:EDGE_VERT,fragmentShader:EDGE_FRAG,uniforms:eU,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
      em.rotation.x=this.rot.x;em.rotation.y=this.rot.y;this.scene.add(em);this.edgeMeshes.push(em);
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
        G.to(proxy,{v:1,duration:0.55,ease:'back.out(1.4)',
          onUpdate:()=>{meshes.forEach(m=>m.scale.set(proxy.v,proxy.v,proxy.v));},
          onComplete:()=>{this.transitioning=false;}});
      } else{this.transitioning=false;}
    };
    const meshes=[this.panelMesh,...this.edgeMeshes].filter(Boolean);
    if(meshes.length){
      const proxy={v:1};
      G.to(proxy,{v:0,duration:0.22,ease:'power3.in',
        onUpdate:()=>{meshes.forEach(m=>m.scale.set(proxy.v,proxy.v,proxy.v));},
        onComplete:doSwap});
    } else{doSwap();}
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
    const dist=SPHERE_R*2.1;
    G.to(this.camera.position,{x:dir.x*dist,y:dir.y*dist,z:dir.z*dist+8,duration:1.1,ease:'power3.inOut',
      onUpdate:()=>this.camera.lookAt(new T.Vector3(dir.x*0.4,dir.y*0.4,dir.z*0.4))});
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
    h.mu=e=>{
      if(!mv){const fi=this._cast(e.clientX,e.clientY);if(fi>=0){this._setSel(fi);const face=this._faces?.[fi];this.onClick?.(this.faceSlots[fi],fi,face);if(face?.centroid)this.zoomToFace(face.centroid);}}
      this.isDragging=false;
    };
    c.addEventListener('mousedown',h.md);window.addEventListener('mousemove',h.mm);window.addEventListener('mouseup',h.mu);
    h.ts=e=>{if(e.touches.length===1){this.isDragging=true;mv=false;lx=e.touches[0].clientX;ly=e.touches[0].clientY;this.touchStart={x:lx,y:ly};this.pinchDist=null;}else if(e.touches.length===2){this.isDragging=false;const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;this.pinchDist=Math.sqrt(dx*dx+dy*dy);}};
    h.tm=e=>{e.preventDefault();if(e.touches.length===1&&this.isDragging){const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;if(Math.abs(dx)>2||Math.abs(dy)>2)mv=true;this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.touches[0].clientX;ly=e.touches[0].clientY;}else if(e.touches.length===2&&this.pinchDist!=null){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const d=Math.sqrt(dx*dx+dy*dy);this.zoom((this.pinchDist-d)*3);this.pinchDist=d;}};
    h.te=e=>{if(e.changedTouches.length===1&&!mv&&this.touchStart){const fi=this._cast(e.changedTouches[0].clientX,e.changedTouches[0].clientY);if(fi>=0){this._setSel(fi);const face=this._faces?.[fi];this.onClick?.(this.faceSlots[fi],fi,face);if(face?.centroid)this.zoomToFace(face.centroid);}}this.isDragging=false;};
    c.addEventListener('touchstart',h.ts,{passive:false});c.addEventListener('touchmove',h.tm,{passive:false});c.addEventListener('touchend',h.te);
  }

  _animate(){
    this.animId=requestAnimationFrame(()=>this._animate());
    const t=(Date.now()-this._t0)*0.001;
    if(!this.isDragging){this.rot.y+=this.vel.x;this.rot.x+=this.vel.y;this.vel.x*=0.94;this.vel.y*=0.94;this.rot.y+=0.00040;}
    const rx=this.rot.x,ry=this.rot.y;
    if(this.panelMesh){this.panelMesh.rotation.x=rx;this.panelMesh.rotation.y=ry;}
    for(const e of this.edgeMeshes){e.rotation.x=rx;e.rotation.y=ry;}
    if(this._pU)this._pU.uTime.value=t;if(this._eU)this._eU.uTime.value=t;if(this._sU)this._sU.uTime.value=t;
    const sp=1+Math.sin(t*0.88)*0.17+Math.sin(t*2.1)*0.05;
    if(this._sl){this._sl.intensity=16*sp;}if(this._cl){this._cl.intensity=5*sp;}
    this.halos.forEach((h,i)=>h.scale.setScalar(1+Math.sin(t*0.33+i*0.72)*0.04));
    if(this._hG){const pa=this._hG.getAttribute('position'),N=pa.count;for(let i=0;i<N;i++){this._hL[i]+=this._hS[i];if(this._hL[i]>1)this._hL[i]=0;const l=this._hL[i],r=SPHERE_R*(0.91+l*0.19),bx=this._hB[i*3],by=this._hB[i*3+1],bz=this._hB[i*3+2],l2=Math.sqrt(bx*bx+by*by+bz*bz)||1;pa.array[i*3]=bx/l2*r;pa.array[i*3+1]=by/l2*r;pa.array[i*3+2]=bz/l2*r;}pa.needsUpdate=true;}
    if(this.coronaPts){this.coronaPts.rotation.x=rx;this.coronaPts.rotation.y=ry;}
    if(this.outerRing){this.outerRing.rotation.y=ry*0.70;this.outerRing.rotation.x=rx*0.70;}
    if(this.starfield){this.starfield.rotation.y=t*0.0006;this.starfield.rotation.x=Math.sin(t*0.00008)*0.012;}
    if(this.nebula)this.nebula.rotation.y=t*0.0003;
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.065;
    this.camera.position.z=this.zoomCurrent;
    this.renderer.render(this.scene,this.camera);
  }
  resize(){const W=this.canvas.clientWidth,H=this.canvas.clientHeight;if(!W||!H)return;this.camera.aspect=W/H;this.camera.updateProjectionMatrix();this.renderer.setSize(W,H,false);}
  destroy(){cancelAnimationFrame(this.animId);const h=this._h;this.canvas.removeEventListener('mousedown',h.md);window.removeEventListener('mousemove',h.mm);window.removeEventListener('mouseup',h.mu);this.canvas.removeEventListener('touchstart',h.ts);this.canvas.removeEventListener('touchmove',h.tm);this.canvas.removeEventListener('touchend',h.te);[this.panelMesh,...this.edgeMeshes].forEach(m=>{if(m){m.geometry?.dispose();m.material?.dispose();}});this.renderer?.dispose();}
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS — Oraculum Dark Matter
// ─────────────────────────────────────────────────────────────────────────────

/** Glass pill atom */
const Pill=({children,style={},...p})=>(
  <div style={{background:C.glass,backdropFilter:'blur(24px) saturate(180%)',border:`1px solid ${C.stroke}`,borderRadius:999,boxShadow:'0 8px 40px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.04)',...style}} {...p}>{children}</div>
);

/** Tier color dot */
const Dot=({col,size=7,glow=false})=>(
  <div style={{width:size,height:size,borderRadius:2,flexShrink:0,background:col,boxShadow:glow?`0 0 8px ${col},0 0 18px ${col}55`:undefined}}/>
);

// ── Product Reveal Panel ──────────────────────────────────────────────────────
function ProductReveal({slot,onClose,onRent,onBuyout}){
  const [phase,setPhase]=useState(0); // 0=hidden → 1=reveal
  useEffect(()=>{const id=requestAnimationFrame(()=>setPhase(1));return()=>cancelAnimationFrame(id);},[]);

  if(!slot)return null;
  const col   = TIER_COLOR[slot.tier]||C.cyan;
  const label = (TIER_LABEL[slot.tier]||slot.tier).toUpperCase();
  const price = fmt(slot.tier);
  const isEpic = slot.tier==='epicenter';
  const occ    = slot.occ;
  const tenant = slot.tenant;

  return(
    <div style={{
      position:'absolute',top:0,bottom:0,right:220,width:360,
      display:'flex',alignItems:'center',justifyContent:'flex-end',padding:'0 20px',zIndex:45,pointerEvents:'none',
    }}>
      <div style={{
        width:340,pointerEvents:'auto',
        opacity:phase?1:0, transform:phase?'none':'translateX(24px) scale(0.97)',
        transition:'opacity 0.35s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        borderRadius:22, overflow:'hidden',
        background:'linear-gradient(160deg, rgba(2,5,30,0.98) 0%, rgba(1,3,18,0.99) 100%)',
        border:`1px solid ${col}20`,
        boxShadow:`0 0 0 1px rgba(255,255,255,0.03), 0 0 50px ${col}15, 0 0 120px ${col}08, 0 40px 100px rgba(0,0,0,0.96)`,
        backdropFilter:'blur(24px)',
      }}>

        {/* ── Top accent ── */}
        <div style={{height:2.5, background:`linear-gradient(90deg,transparent,${col} 30%,${col}aa 70%,transparent)`, boxShadow:`0 0 22px ${col}cc,0 0 50px ${col}44`}}/>

        {/* ── Hero zone ── */}
        <div style={{
          height: occ&&tenant?.img ? 150 : 110,
          position:'relative', overflow:'hidden',
          background: occ&&tenant?.img
            ? `url(${tenant.img}) center/cover no-repeat`
            : `radial-gradient(ellipse at 30% 60%, ${col}20 0%, transparent 65%), linear-gradient(135deg,${col}0e 0%,rgba(0,0,0,0) 60%)`,
        }}>
          {/* Scanline overlay always */}
          <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(0deg,rgba(0,0,0,0.10) 0px,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 4px)`,pointerEvents:'none',zIndex:1}}/>
          {/* Grid */}
          <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${col}07 1px,transparent 1px),linear-gradient(90deg,${col}07 1px,transparent 1px)`,backgroundSize:'22px 22px',pointerEvents:'none',zIndex:1}}/>
          {/* Corner marks */}
          {[[0,0,'top:8px;left:8px;border-top:1px;border-left:1px'],[0,1,'top:8px;right:8px;border-top:1px;border-right:1px'],[1,0,'bottom:8px;left:8px;border-bottom:1px;border-left:1px'],[1,1,'bottom:8px;right:8px;border-bottom:1px;border-right:1px']].map(([,, css],ci)=>(
            <div key={ci} style={{position:'absolute',width:12,height:12,borderColor:`${col}66`,borderStyle:'solid',borderWidth:0,...Object.fromEntries(css.split(';').filter(Boolean).map(s=>{const[k,v]=s.split(':');return[k.trim(),v?.trim()];})),zIndex:2}}/>
          ))}

          {/* Center icon if no image */}
          {!(occ&&tenant?.img)&&(
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>
              <div style={{
                width:isEpic?76:58, height:isEpic?76:58,
                borderRadius:isEpic?'50%':16,
                background:`linear-gradient(135deg,${col}25,${col}08)`,
                border:`1.5px solid ${col}${occ?'55':'22'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:isEpic?28:22, fontWeight:900, color:col, fontFamily:F.display,
                boxShadow:occ?`0 0 40px ${col}40,inset 0 0 24px ${col}12`:`0 0 14px ${col}1a`,
                animation:occ&&isEpic?'epicPulse 2.5s ease-in-out infinite':undefined,
              }}>
                {tenant?.l||(occ?'◉':'○')}
              </div>
            </div>
          )}

          {/* Tier badge */}
          <div style={{position:'absolute',top:10,left:10,zIndex:3,display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:'rgba(0,0,0,0.72)',border:`1px solid ${col}35`,backdropFilter:'blur(10px)'}}>
            <Dot col={col} glow={occ}/>
            <span style={{color:col,fontSize:9,fontWeight:700,letterSpacing:'0.10em',fontFamily:F.ui}}>{label}</span>
          </div>

          {/* Status badge */}
          <div style={{position:'absolute',top:10,right:10,zIndex:3,padding:'3px 9px',borderRadius:20,background:occ?`${col}18`:'rgba(0,0,0,0.55)',border:`1px solid ${occ?col+'35':'rgba(255,255,255,0.08)'}`,backdropFilter:'blur(10px)'}}>
            <span style={{color:occ?col:'rgba(140,160,200,0.38)',fontSize:8,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{occ?'● ACTIF':'○ LIBRE'}</span>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{position:'absolute',bottom:10,right:10,zIndex:3,width:26,height:26,borderRadius:'50%',background:'rgba(0,0,0,0.65)',border:'1px solid rgba(255,255,255,0.10)',color:'rgba(180,200,255,0.55)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',outline:'none',backdropFilter:'blur(8px)',transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,40,40,0.28)';e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0.65)';e.currentTarget.style.color='rgba(180,200,255,0.55)';}}>
            ✕
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{padding:'18px 20px 22px'}}>
          {/* Name + tagline */}
          <div style={{marginBottom:14}}>
            <div style={{color:C.textHi,fontSize:16,fontWeight:700,fontFamily:F.display,letterSpacing:'0.02em',marginBottom:4,lineHeight:1.2}}>
              {occ?(tenant?.name||`Panneau ${label}`):`Emplacement ${label}`}
            </div>
            <div style={{color:C.dim,fontSize:10,fontFamily:F.body,lineHeight:1.5}}>
              {occ?(tenant?.cta||'Présence confirmée sur la Dyson Sphere'):`Disponible · Visible de tout l'univers`}
            </div>
          </div>

          {/* 3-col stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:14}}>
            {[{k:'TIER',v:label,c:col},{k:'PRIX/J',v:`€${price}`,c:C.gold},{k:'ZONE',v:'COSMOS',c:C.cyan}].map(({k,v,c})=>(
              <div key={k} style={{padding:'9px 8px',borderRadius:10,background:'rgba(255,255,255,0.026)',border:'1px solid rgba(255,255,255,0.055)',textAlign:'center'}}>
                <div style={{color:c,fontSize:11,fontWeight:800,fontFamily:F.display,marginBottom:3,letterSpacing:'0.04em'}}>{v}</div>
                <div style={{color:'rgba(130,155,200,0.40)',fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>{k}</div>
              </div>
            ))}
          </div>

          {/* Social links */}
          {occ&&(tenant?.instagramUrl||tenant?.twitterUrl||tenant?.tiktokUrl||tenant?.websiteUrl)&&(
            <div style={{display:'flex',gap:6,marginBottom:14}}>
              {[['𝕏',tenant?.twitterUrl,'#1DA1F2'],['◎',tenant?.instagramUrl,'#E4405F'],['♪',tenant?.tiktokUrl,'#00f2ea'],['⬡',tenant?.websiteUrl,C.cyan]].filter(([,url])=>url).map(([ic,url,ic_col])=>(
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  style={{flex:1,padding:'8px 4px',borderRadius:9,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',color:ic_col,fontSize:13,textDecoration:'none',transition:'all 0.15s',outline:'none'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${ic_col}14`;e.currentTarget.style.borderColor=`${ic_col}33`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';}}>
                  {ic}
                </a>
              ))}
            </div>
          )}

          {/* Price display */}
          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:16,padding:'11px 14px',borderRadius:12,background:`${col}07`,border:`1px solid ${col}15`,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(90deg,transparent,transparent 20px,${col}04 20px,${col}04 21px)`,pointerEvents:'none'}}/>
            <span style={{color:col,fontSize:26,fontWeight:800,fontFamily:F.display,lineHeight:1,position:'relative'}}>€{price}</span>
            <span style={{color:C.dim,fontSize:10,fontFamily:F.body,position:'relative'}}>/jour · excl. taxes</span>
            <span style={{marginLeft:'auto',color:`${col}44`,fontSize:8,fontFamily:F.ui,letterSpacing:'0.12em',position:'relative'}}>ADS·SQUARE</span>
          </div>

          {/* CTA */}
          {!occ?(
            <button onClick={()=>onRent(slot)} style={{width:'100%',padding:'13px',borderRadius:13,
              background:`linear-gradient(135deg, ${col} 0%, ${col}ee 40%, ${col}99 100%)`,
              border:'none',color:'#030303',fontSize:13,fontWeight:800,fontFamily:F.body,cursor:'pointer',
              boxShadow:`0 0 32px ${col}55, 0 10px 30px rgba(0,0,0,0.65)`,letterSpacing:'0.03em',outline:'none',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all 0.22s ease',}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 0 50px ${col}77, 0 18px 44px rgba(0,0,0,0.75)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 0 32px ${col}55, 0 10px 30px rgba(0,0,0,0.65)`;}}>
              <span>Réserver ce panneau</span>
              <span style={{opacity:0.65,fontWeight:400}}>→</span>
            </button>
          ):(
            <button onClick={()=>onBuyout(slot)} style={{width:'100%',padding:'13px',borderRadius:13,
              background:'rgba(255,255,255,0.028)',border:`1px solid ${col}20`,
              color:'rgba(160,185,230,0.45)',fontSize:12,fontWeight:600,fontFamily:F.body,cursor:'pointer',outline:'none',
              letterSpacing:'0.02em',transition:'all 0.22s',display:'flex',alignItems:'center',justifyContent:'center',gap:6,}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${col}0e`;e.currentTarget.style.color=col;e.currentTarget.style.borderColor=`${col}44`;}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.028)';e.currentTarget.style.color='rgba(160,185,230,0.45)';e.currentTarget.style.borderColor=`${col}20`;}}>
              Proposer un rachat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hover Tooltip ─────────────────────────────────────────────────────────────
function HoverChip({slot}){
  if(!slot)return null;
  const col=TIER_COLOR[slot.tier]||C.cyan;
  return(
    <div style={{position:'absolute',bottom:74,left:'calc(50% - 110px)',transform:'translateX(-50%)',pointerEvents:'none',zIndex:35,
      animation:'fadeUp 0.18s ease both',
    }}>
      <Pill style={{padding:'7px 16px',display:'flex',alignItems:'center',gap:8}}>
        <Dot col={col} glow/>
        <span style={{color:col,fontSize:10,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[slot.tier]||slot.tier).toUpperCase()}</span>
        <div style={{width:1,height:10,background:C.strokeHi}}/>
        <span style={{color:C.dim,fontSize:10,fontFamily:F.body}}>{slot.occ?(slot.tenant?.name||'Occupé'):'Disponible'}</span>
        <div style={{width:1,height:10,background:C.strokeHi}}/>
        <span style={{color:C.gold,fontSize:10,fontWeight:700,fontFamily:F.ui}}>€{fmt(slot.tier)}/j</span>
      </Pill>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar=memo(function Sidebar({slots,isLive,level}){
  const stats=useMemo(()=>{const c={};TIER_ORDER.forEach(t=>{c[t]=0;});(slots||[]).forEach(s=>{if(s?.occ&&c[s.tier]!==undefined)c[s.tier]++;});return c;},[slots]);
  const rev=TIER_ORDER.reduce((s,t)=>s+(stats[t]||0)*(TIER_PRICE[t]||0)/100,0);
  const totalOcc=Object.values(stats).reduce((s,v)=>s+v,0);

  return(
    <div style={{width:214,flexShrink:0,background:'rgba(0,1,14,0.90)',backdropFilter:'blur(30px) saturate(160%)',borderLeft:`1px solid ${C.stroke}`,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'-12px 0 40px rgba(0,0,20,0.7)'}}>
      {/* Header */}
      <div style={{padding:'16px 16px 10px',borderBottom:`1px solid ${C.stroke}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{color:C.cyan,fontSize:15,textShadow:`0 0 14px ${C.cyan}`,lineHeight:1}}>✦</span>
            <span style={{color:C.textHi,fontSize:12,fontWeight:700,fontFamily:F.display,letterSpacing:'0.08em'}}>COSMOS</span>
          </div>
          {isLive&&(
            <div style={{display:'flex',alignItems:'center',gap:4,padding:'2px 7px',borderRadius:12,background:'rgba(0,255,120,0.07)',border:'1px solid rgba(0,255,120,0.20)'}}>
              <div style={{width:4,height:4,borderRadius:'50%',background:C.live,boxShadow:`0 0 8px ${C.live}`,animation:'livePulse 1.5s ease-in-out infinite'}}/>
              <span style={{color:C.live,fontSize:7.5,fontWeight:700,letterSpacing:'0.12em',fontFamily:F.ui}}>LIVE</span>
            </div>
          )}
        </div>
        <div style={{color:C.dim,fontSize:8.5,fontFamily:F.ui,letterSpacing:'0.06em'}}>{LEVELS[level]?.faces||0} PANNEAUX · LVL {level}</div>
      </div>

      {/* Tiers */}
      <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
        {TIER_ORDER.filter(t=>TIER_COLOR[t]).map(tier=>{
          const col=TIER_COLOR[tier],occ=stats[tier]||0,tot=TIER_TOTALS[tier]||1,pct=Math.round(occ/tot*100);
          return(
            <div key={tier} style={{padding:'8px 12px 8px 10px',marginLeft:3,borderLeft:`2px solid ${occ>0?col:'transparent'}`,borderRadius:'0 8px 8px 0',cursor:'default',transition:'background 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${col}07`;}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <Dot col={col} glow={occ>0}/>
                  <span style={{color:occ>0?col:'rgba(120,145,195,0.40)',fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.07em'}}>{(TIER_LABEL[tier]||tier).toUpperCase()}</span>
                </div>
                <span style={{color:col,fontSize:8.5,fontWeight:700,fontFamily:F.ui}}>€{fmt(tier)}</span>
              </div>
              <div style={{height:1.5,borderRadius:2,background:'rgba(255,255,255,0.04)',overflow:'hidden',marginBottom:3}}>
                <div style={{height:'100%',width:`${pct}%`,borderRadius:2,background:occ>0?`linear-gradient(90deg,${col}55,${col})`:'transparent',transition:'width 0.9s ease',boxShadow:occ>0?`0 0 6px ${col}66`:undefined}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'rgba(120,145,195,0.28)',fontSize:7.5,fontFamily:F.ui}}>{occ}/{tot}</span>
                <span style={{color:occ>0?`${col}bb`:'rgba(120,145,195,0.18)',fontSize:7.5,fontWeight:600,fontFamily:F.ui}}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{padding:'10px 16px',borderTop:`1px solid ${C.stroke}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
          <span style={{color:C.dim,fontSize:7.5,fontFamily:F.ui,letterSpacing:'0.10em'}}>REVENUS/JOUR</span>
          <span style={{color:C.gold,fontSize:14,fontWeight:800,fontFamily:F.display,textShadow:`0 0 20px ${C.gold}55`}}>€{rev.toLocaleString('fr-FR')}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.cyan}22,transparent)`}}/>
          <span style={{color:`${C.cyan}44`,fontSize:7,fontFamily:F.ui,letterSpacing:'0.08em'}}>{totalOcc} ACTIFS</span>
          <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.cyan}22,transparent)`}}/>
        </div>
      </div>
    </div>
  );
});

// ── Level Navigator ───────────────────────────────────────────────────────────
const LevelNav=memo(function LevelNav({level,onLevel}){
  return(
    <div style={{position:'absolute',bottom:20,left:'calc(50% - 107px)',transform:'translateX(-50%)',zIndex:30}}>
      <Pill style={{padding:'5px 10px',display:'flex',alignItems:'center',gap:3}}>
        {LEVELS.map(lv=>{
          const act=lv.n===level;
          const col=act?C.cyan:'rgba(80,120,200,0.22)';
          return(
            <button key={lv.n} onClick={()=>onLevel(lv.n)} title={lv.name}
              style={{width:act?32:17,height:act?32:17,borderRadius:'50%',border:`1.5px solid ${col}`,background:act?'rgba(0,212,255,0.10)':'transparent',color:col,fontSize:act?11:8,fontWeight:700,cursor:'pointer',transition:'all 0.30s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:act?F.display:F.ui,padding:0,flexShrink:0,boxShadow:act?`0 0 22px ${C.cyan}99,0 0 6px ${C.cyan}44`:'none',outline:'none'}}>
              {act?lv.icon:lv.n}
            </button>
          );
        })}
        <div style={{marginLeft:6,paddingLeft:8,borderLeft:`1px solid ${C.strokeHi}`,display:'flex',flexDirection:'column'}}>
          <span style={{color:C.cyan,fontSize:9,fontWeight:700,fontFamily:F.display,letterSpacing:'0.08em',lineHeight:1.1}}>{LEVELS[level]?.name}</span>
          <span style={{color:C.dim,fontSize:7,fontFamily:F.ui,letterSpacing:'0.06em'}}>{LEVELS[level]?.faces} PANNEAUX</span>
        </div>
      </Pill>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function View3D({slots=[],isLive=false,onGoAdvertiser,onWaitlist,onCheckout,onBuyout,ExistingPublicView}){
  const canvasRef=useRef(null),sceneRef=useRef(null);
  const [level,setLevel]  = useState(6);
  const [loading,setLoading] = useState(true);
  const [error,setError]  = useState(null);
  const [selSlot,setSelSlot] = useState(null);
  const [hovSlot,setHovSlot] = useState(null);
  const hovTimerRef = useRef(null);

  const sorted       = useMemo(()=>sortSlots(slots),[slots]);
  const assignedFaces = useMemo(()=>{if(level===0)return[];return sortPole(getFaces(level)).map((f,i)=>({...f,slot:sorted[i]||null}));},[level,sorted]);

  // Three.js init
  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let sc;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([T,G])=>{
        sc=new Scene3D(canvasRef.current);sceneRef.current=sc;
        sc.onHover=(slot)=>{
          clearTimeout(hovTimerRef.current);
          if(slot){hovTimerRef.current=setTimeout(()=>setHovSlot(slot),100);}
          else{setHovSlot(null);}
        };
        sc.onClick=(slot)=>setSelSlot(slot||null);
        return sc.init(T,G);
      }).then(()=>{
        sceneRef.current.setFaces(assignedFaces,false);setLoading(false);
      }).catch(e=>{console.error(e);setError('npm install three gsap');setLoading(false);});
    return()=>{if(sc){sc.destroy();}sceneRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{if(!sceneRef.current||level===0)return;sceneRef.current.setFaces(assignedFaces,true);},[assignedFaces,level]);

  // Keyboard
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

  // ── Level 0 ─────────────────────────────────────────────────────────────────
  if(level===0){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <button onClick={()=>goLevel(6)} style={{position:'absolute',top:10,right:10,zIndex:100,display:'flex',alignItems:'center',gap:8,padding:'8px 18px',borderRadius:22,background:'rgba(0,0,18,0.94)',border:`1px solid ${C.cyan}38`,backdropFilter:'blur(16px)',color:C.cyan,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F.display,boxShadow:`0 0 28px ${C.cyan}22`,letterSpacing:'0.06em',outline:'none',transition:'box-shadow 0.2s'}}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 0 44px ${C.cyan}55`;}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 0 28px ${C.cyan}22`;}}>
          ✦ DYSON SPHERE
        </button>
        {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
      </div>
    );
  }

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:C.void,display:'flex'}}>
      {/* Canvas */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',opacity:loading?0:1,transition:'opacity 0.85s ease'}}/>

        {/* Loading */}
        {loading&&!error&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24,background:C.void}}>
            <div style={{position:'relative',width:80,height:80}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{position:'absolute',inset:i*12,borderRadius:'50%',border:`1px solid rgba(0,212,255,${0.14-i*0.04})`,borderTopColor:`rgba(0,212,255,${0.88-i*0.26})`,animation:`dSpin ${1.0+i*1.1}s linear infinite ${i%2?'reverse':''}`}}/>
              ))}
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:14,height:14,borderRadius:'50%',background:'#fffee0',boxShadow:'0 0 18px #ffcc44,0 0 40px #ff8800,0 0 80px #ff440030'}}/>
              </div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{color:C.cyan,fontSize:13,fontWeight:700,letterSpacing:'0.22em',fontFamily:F.display,marginBottom:6,textShadow:`0 0 24px ${C.cyan}`}}>DYSON SPHERE</div>
              <div style={{color:C.dim,fontSize:8.5,letterSpacing:'0.16em',fontFamily:F.ui}}>ASSEMBLAGE EN COURS…</div>
            </div>
          </div>
        )}

        {error&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:24,background:C.void}}>
            <div style={{color:C.err,fontSize:13,fontWeight:700,fontFamily:F.ui}}>⚠ {error}</div>
            <button onClick={()=>goLevel(0)} style={{padding:'10px 22px',borderRadius:12,background:C.cyan,border:'none',color:'#000',fontWeight:700,cursor:'pointer',fontFamily:F.body}}>Vue 2D</button>
          </div>
        )}

        {/* Back to 2D */}
        <Pill style={{position:'absolute',top:12,left:12,zIndex:30,borderRadius:20}}>
          <button onClick={()=>goLevel(0)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'none',border:'none',color:C.dim,fontSize:9.5,fontWeight:600,cursor:'pointer',fontFamily:F.ui,letterSpacing:'0.06em',outline:'none',transition:'color 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.color=C.textHi}
            onMouseLeave={e=>e.currentTarget.style.color=C.dim}>
            ▦ VUE 2D
          </button>
        </Pill>

        {/* Hover chip */}
        {hovSlot&&!selSlot&&<HoverChip slot={hovSlot}/>}

        {/* Hint */}
        {!loading&&!selSlot&&(
          <div style={{position:'absolute',bottom:62,left:'calc(50% - 107px)',transform:'translateX(-50%)',color:'rgba(60,110,180,0.28)',fontSize:8.5,letterSpacing:'0.08em',fontFamily:F.ui,pointerEvents:'none',whiteSpace:'nowrap'}}>
            CLIC = PANEL · MOLETTE = ZOOM · DRAG = ORBITE
          </div>
        )}

        {/* Level nav */}
        <LevelNav level={level} onLevel={goLevel}/>

        {/* Product reveal */}
        {selSlot&&(
          <ProductReveal slot={selSlot}
            onClose={handleClose}
            onRent={s=>{handleClose();onCheckout?.(s);}}
            onBuyout={s=>{handleClose();onBuyout?.(s);}}
          />
        )}
      </div>

      {/* Sidebar */}
      <Sidebar slots={slots} isLive={isLive} level={level}/>

      <style>{`
        @keyframes dSpin{to{transform:rotate(360deg);}}
        @keyframes livePulse{0%,100%{opacity:1;}50%{opacity:0.30;}}
        @keyframes epicPulse{0%,100%{box-shadow:0 0 40px var(--c)40,inset 0 0 24px var(--c)12;}50%{box-shadow:0 0 70px var(--c)70,inset 0 0 40px var(--c)20;}}
        @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(6px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        ::-webkit-scrollbar{width:2px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(0,180,255,0.20);border-radius:2px;}
      `}</style>
    </div>
  );
}
