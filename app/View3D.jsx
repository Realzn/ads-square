'use client';
/**
 * ─── ADS·SQUARE — Dyson Sphere "Cosmos" ─────────────────────────────────────
 * Esthétique : wireframe cyan lumineux + panneaux énergie + étoile dorée
 * 1 face = 1 bloc · sidebar tier · LIVE indicator
 *
 * Niveaux : 0=2D · 1=Cube(6) · 2=Octa(8) · 3=Ico(20)
 *           4=Sph×80 · 5=Sph×320 · 6=Cosmos×1280
 *
 * npm install three gsap
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ── Tokens ────────────────────────────────────────────────────────────────────
const U = {
  bg:'#010209', s1:'rgba(1,4,18,0.92)', text:'#e8f4ff',
  muted:'rgba(160,200,255,0.45)', accent:'#d4a84b', accentFg:'#050505',
  cyan:'#00ccff', cyanDim:'rgba(0,180,255,0.15)',
  border:'rgba(0,180,255,0.12)', err:'#ff4466',
};
const F = { h:"'Clash Display','Syne',sans-serif", b:"'DM Sans','Inter',system-ui,sans-serif" };
const fmt = t => ((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];

const LEVELS = [
  {n:0,name:'Grille 2D',  icon:'◫',faces:0},
  {n:1,name:'Cube',       icon:'⬡',faces:6},
  {n:2,name:'Octaèdre',   icon:'◆',faces:8},
  {n:3,name:'Icosaèdre',  icon:'⬟',faces:20},
  {n:4,name:'Sphère I',   icon:'◎',faces:80},
  {n:5,name:'Sphère II',  icon:'◉',faces:320},
  {n:6,name:'Cosmos',     icon:'●',faces:1280},
];

const SPHERE_R  = 5.8;
const PANEL_GAP = 0.82;  // gap → lumière visible
const STAR_R    = 0.95;

// ─────────────────────────────────────────────────────────────────────────────
// SHADERS
// ─────────────────────────────────────────────────────────────────────────────

// ── Panel shader ── semi-transparent énergie + glow tier
const PANEL_VERT = /* glsl */`
  precision highp float;
  attribute float aOccupied;
  attribute vec3  aTierColor;
  attribute float aTierIdx;
  uniform float uTime;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vOccupied;
  varying vec3  vTierColor;
  varying float vFresnel;
  varying float vTierIdx;
  void main(){
    vNormal   = normalize(normalMatrix * normal);
    vec4 wp   = modelMatrix * vec4(position,1.0);
    vWorldPos = wp.xyz;
    vOccupied = aOccupied;
    vTierColor= aTierColor;
    vTierIdx  = aTierIdx;
    vec3 vd   = normalize(cameraPosition - wp.xyz);
    vFresnel  = pow(1.0 - abs(dot(vNormal, vd)), 2.2);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const PANEL_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vOccupied;
  varying vec3  vTierColor;
  varying float vFresnel;
  varying float vTierIdx;

  float hash(float n){ return fract(sin(n)*43758.5453); }

  void main(){
    float seed = hash(vWorldPos.x*13.7 + vWorldPos.y*9.3 + vWorldPos.z*5.1);
    float ph   = seed * 6.2831;
    float t    = uTime;

    if(vOccupied > 0.5){
      // Occupied: pulsing panel with tier color + scan lines
      float spd   = 0.6 + vTierIdx * 0.2;
      float pulse = 0.7 + 0.3*sin(t*spd + ph);

      // Holographic scan
      float scan = sin(vWorldPos.y*22.0 - t*2.5)*0.5+0.5;
      scan = pow(scan, 4.0) * 0.4;

      // Fresnel rim
      vec3 rim = vTierColor * pow(vFresnel, 1.4) * 1.8;

      // Base panel
      vec3 base = vTierColor * 0.30 * pulse;
      vec3 emit = vTierColor * 0.60 * pulse + vTierColor * scan;

      // Inner star glow
      vec3 toC = normalize(-vWorldPos);
      float sg = max(0.0, dot(vNormal, toC)) * 0.35;
      vec3 starTint = vec3(1.0,0.9,0.5)*sg;

      vec3 col = base + emit + rim + starTint;
      float alpha = 0.55 + vFresnel*0.35;
      gl_FragColor = vec4(col, alpha);

    } else {
      // Vacant: very dark with subtle cyan energy + fresnel
      vec3 cyanBase = vec3(0.0, 0.65, 1.0);

      // Subtle shimmer
      float shim = sin(vWorldPos.x*6.0+vWorldPos.y*6.0+t*0.3)*0.5+0.5;
      shim = pow(shim,6.0)*0.08;

      // Fresnel cyan rim
      vec3 rim = cyanBase * pow(vFresnel, 1.8) * 0.55;

      // Inner star reflection
      vec3 toC = normalize(-vWorldPos);
      float sg = max(0.0, dot(vNormal, toC)) * 0.22;
      vec3 starTint = vec3(1.0,0.85,0.4)*sg;

      vec3 col = vec3(0.0,0.015,0.04) + cyanBase*shim + rim + starTint;
      float alpha = 0.12 + vFresnel*0.25;
      gl_FragColor = vec4(col, alpha);
    }
  }
`;

// ── Grid edge shader ── cyan neon glow
const EDGE_VERT = /* glsl */`
  precision highp float;
  attribute float aOccupied;
  attribute vec3  aTierColor;
  uniform float uTime;
  varying float vOcc;
  varying vec3  vTCol;
  varying float vPos;
  void main(){
    vOcc = aOccupied;
    vTCol= aTierColor;
    vPos = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const EDGE_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  varying float vOcc;
  varying vec3  vTCol;
  varying float vPos;
  void main(){
    float t = uTime;
    if(vOcc > 0.5){
      // Tier-colored edge — bright + pulse
      float pulse = 0.75 + 0.25*sin(t*1.2 + vPos*3.0);
      gl_FragColor = vec4(vTCol * pulse * 1.6, 0.80 * pulse);
    } else {
      // Cyan energy edge
      float pulse = 0.55 + 0.45*sin(t*0.7 + vPos*2.0);
      vec3 cyan = vec3(0.0, 0.76, 1.0);
      gl_FragColor = vec4(cyan * pulse, 0.55 * pulse);
    }
  }
`;

// ── Star shader ── animated turbulent sun
const STAR_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const STAR_FRAG = `
  precision highp float;
  uniform float uTime;
  varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*h(p);p*=2.1;a*=0.5;} return v; }
  void main(){
    vec2 uv=vUv*2.0-1.0; float r=length(uv);
    if(r>1.0){discard;}
    float turb=fbm(uv*5.0+uTime*0.18);
    float core=1.0-smoothstep(0.0,0.9,r);
    float edge=1.0-smoothstep(0.55,1.0,r);
    vec3 c1=vec3(1.00,0.98,0.88);
    vec3 c2=vec3(1.00,0.70,0.15);
    vec3 c3=vec3(0.90,0.28,0.02);
    vec3 col=mix(c3,mix(c2,c1,core+turb*0.35),edge);
    float spot=h(uv*8.0+uTime*0.04);
    col-=vec3(0.12,0.07,0.0)*step(0.74,spot)*core;
    gl_FragColor=vec4(col*3.0, edge*(1.0-r*0.4));
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY
// ─────────────────────────────────────────────────────────────────────────────

const inset=(verts,c,f)=>verts.map(v=>[c[0]+(v[0]-c[0])*f,c[1]+(v[1]-c[1])*f,c[2]+(v[2]-c[2])*f]);
const centN=vs=>[vs.reduce((s,v)=>s+v[0],0)/vs.length,vs.reduce((s,v)=>s+v[1],0)/vs.length,vs.reduce((s,v)=>s+v[2],0)/vs.length];

function buildCubeFaces(){
  const a=SPHERE_R/Math.sqrt(3);
  return [[[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],[[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],
    [[-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]],[[a,-a,-a],[-a,-a,-a],[-a,a,-a],[a,a,-a]],
    [[a,-a,a],[a,a,a],[a,a,-a],[a,-a,-a]],[[-a,-a,-a],[-a,a,-a],[-a,a,a],[-a,-a,a]]]
    .map(vs=>{const c=centN(vs);return{verts:inset(vs,c,PANEL_GAP),centroid:c,isQuad:true};});
}
function buildOctaFaces(){
  const R=SPHERE_R,v=[[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];
  return [[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]]
    .map(fi=>{const vs=fi.map(i=>v[i]),c=centN(vs);return{verts:inset(vs,c,PANEL_GAP),centroid:c,isQuad:false};});
}
const midS=(a,b)=>{const m=a.map((c,i)=>(c+b[i])/2),l=Math.hypot(...m);return m.map(c=>c/l);};
function buildIcoFaces(sub){
  const phi=(1+Math.sqrt(5))/2;
  const rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]]
    .map(v=>{const l=Math.hypot(...v);return v.map(c=>c/l);});
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
    .map(f=>f.map(i=>rv[i]));
  for(let s=0;s<sub;s++){const nx=[];for(const[a,b,c]of faces){const ab=midS(a,b),bc=midS(b,c),ca=midS(c,a);nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}faces=nx;}
  const R=SPHERE_R;
  return faces.map(([a,b,c])=>{
    const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];
    const cnt=centN(vs);return{verts:inset(vs,cnt,PANEL_GAP),centroid:cnt,isQuad:false};
  });
}
function getFacesForLevel(n){
  switch(n){case 1:return buildCubeFaces();case 2:return buildOctaFaces();case 3:return buildIcoFaces(0);case 4:return buildIcoFaces(1);case 5:return buildIcoFaces(2);case 6:return buildIcoFaces(3);default:return[];}
}

// ─────────────────────────────────────────────────────────────────────────────
// BUFFER BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

const hex3=h=>{const s=(h||'#08f').replace('#','');return[parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255];};
const sortSlots=s=>[...(s||[])].filter(Boolean).sort((a,b)=>{const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);return d||((b.occ?1:0)-(a.occ?1:0));});
const sortByPole=f=>[...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);

function buildPanelBuffers(faces){
  let nT=0; for(const f of faces) nT+=f.isQuad?2:1;
  const pos=new Float32Array(nT*9),norm=new Float32Array(nT*9);
  const occ=new Float32Array(nT*3),tcol=new Float32Array(nT*9),tidx=new Float32Array(nT*3);
  const t2f=new Int32Array(nT);
  let v=0,t=0;
  const tn=(a,b,c)=>{const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l);};
  const push=(x,y,z,nx,ny,nz,o,r,g,b,ti)=>{const i=v*3;pos[i]=x;pos[i+1]=y;pos[i+2]=z;norm[i]=nx;norm[i+1]=ny;norm[i+2]=nz;occ[v]=o;tcol[i]=r;tcol[i+1]=g;tcol[i+2]=b;tidx[v]=ti;v++;};
  faces.forEach((face,fi)=>{
    const slot=face.slot;const isO=slot?.occ?1:0;const tier=slot?.tier;
    const tc=tier?hex3(TIER_COLOR[tier]||'#08f'):[0,0.5,0.8];
    const ti=tier?TIER_ORDER.indexOf(tier):5;
    const vs=face.verts;const n0=tn(vs[0],vs[1],vs[2]);
    push(vs[0][0],vs[0][1],vs[0][2],n0[0],n0[1],n0[2],isO,tc[0],tc[1],tc[2],ti);
    push(vs[1][0],vs[1][1],vs[1][2],n0[0],n0[1],n0[2],isO,tc[0],tc[1],tc[2],ti);
    push(vs[2][0],vs[2][1],vs[2][2],n0[0],n0[1],n0[2],isO,tc[0],tc[1],tc[2],ti);
    t2f[t++]=fi;
    if(face.isQuad){const n1=tn(vs[0],vs[2],vs[3]);push(vs[0][0],vs[0][1],vs[0][2],n1[0],n1[1],n1[2],isO,tc[0],tc[1],tc[2],ti);push(vs[2][0],vs[2][1],vs[2][2],n1[0],n1[1],n1[2],isO,tc[0],tc[1],tc[2],ti);push(vs[3][0],vs[3][1],vs[3][2],n1[0],n1[1],n1[2],isO,tc[0],tc[1],tc[2],ti);t2f[t++]=fi;}
  });
  return{pos,norm,occ,tcol,tidx,t2f};
}

function buildEdgeBuffers(faces){
  // Per-vertex: position, aOccupied, aTierColor
  const segs=[];const occArr=[];const tcolArr=[];
  const LIFT=1.004;
  faces.forEach(face=>{
    const vs=face.verts;const n=face.isQuad?4:3;
    const slot=face.slot;const isO=slot?.occ?1:0;const tier=slot?.tier;
    const tc=tier?hex3(TIER_COLOR[tier]||'#08f'):[0,0.5,0.8];
    for(let i=0;i<n;i++){
      const a=vs[i],b=vs[(i+1)%n];
      segs.push(a[0]*LIFT,a[1]*LIFT,a[2]*LIFT, b[0]*LIFT,b[1]*LIFT,b[2]*LIFT);
      occArr.push(isO,isO);tcolArr.push(...tc,...tc);
    }
  });
  return{pos:new Float32Array(segs),occ:new Float32Array(occArr),tcol:new Float32Array(tcolArr)};
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3D
// ─────────────────────────────────────────────────────────────────────────────

class Scene3D {
  constructor(c){Object.assign(this,{canvas:c,T:null,G:null,renderer:null,scene:null,camera:null,panelMesh:null,edges:[],starMesh:null,halos:[],coronaPts:null,starfield:null,nebula:null,raycaster:null,triToFace:null,faceSlots:[],rot:{x:0.15,y:0},vel:{x:0,y:0},isDragging:false,touchStart:null,pinchDist:null,zoomTarget:22,zoomCurrent:22,animId:null,transitioning:false,onFaceClick:null,_h:{},_t0:Date.now(),_pUni:null,_eUni:null,_sUni:null});}

  async init(THREE,GSAP){
    this.T=THREE;this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;
    const r=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(W,H,false);
    r.setClearColor(0x010209,1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;
    this.renderer=r;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x010209,0.010);
    this.camera=new THREE.PerspectiveCamera(42,W/H,0.1,600);this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();

    // Lights
    this.scene.add(new THREE.AmbientLight(0x020614,5.0));
    const sl=new THREE.PointLight(0xfff6cc,14,55,1.6);sl.position.set(0,0,0);this.scene.add(sl);this._sl=sl;
    const cl=new THREE.PointLight(0xff9900,5,38,2);cl.position.set(0,0,0);this.scene.add(cl);this._cl=cl;
    const fl=new THREE.DirectionalLight(0x1a2a7a,1.0);fl.position.set(-30,-12,-25);this.scene.add(fl);
    const rl=new THREE.PointLight(0x0044cc,0.8,100);rl.position.set(-12,-18,20);this.scene.add(rl);

    this._buildStarfield();this._buildNebula();this._buildStar();this._buildParticleHalo();
    this._bindEvents();this._animate();
  }

  _buildStarfield(){
    const T=this.T,N=5500;
    const pos=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=90+Math.random()*220;
      pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.sin(ph)*Math.sin(th);pos[i*3+2]=r*Math.cos(ph);
      const p=Math.random();
      if(p<0.22){col[i*3]=0.55;col[i*3+1]=0.72;col[i*3+2]=1.0;}
      else if(p<0.58){col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.93;}
      else if(p<0.82){col[i*3]=1.0;col[i*3+1]=0.85;col[i*3+2]=0.55;}
      else{col[i*3]=1.0;col[i*3+1]=0.5;col[i*3+2]=0.3;}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.starfield=new T.Points(geo,new T.PointsMaterial({size:0.22,vertexColors:true,transparent:true,opacity:0.88,sizeAttenuation:true,depthWrite:false}));
    this.scene.add(this.starfield);
  }

  _buildNebula(){
    const T=this.T,N=1400;
    const pos=new Float32Array(N*3),col=new Float32Array(N*3);
    const g=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
    const palettes=[[0.0,0.6,1.0],[0.4,0.1,0.9],[0.0,0.4,0.8],[0.1,0.7,0.9]];
    for(let i=0;i<N;i++){
      const cx=(Math.random()-0.5)*90,cy=(Math.random()-0.5)*55,cz=(Math.random()-0.5)*90;
      pos[i*3]=cx+g()*18;pos[i*3+1]=cy+g()*14;pos[i*3+2]=cz+g()*18;
      const p=palettes[Math.floor(Math.random()*palettes.length)];
      col[i*3]=p[0]*0.7;col[i*3+1]=p[1]*0.7;col[i*3+2]=p[2]*0.7;
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.nebula=new T.Points(geo,new T.PointsMaterial({size:2.2,vertexColors:true,transparent:true,opacity:0.09,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));
    this.scene.add(this.nebula);
  }

  _buildStar(){
    const T=this.T;
    const uni={uTime:{value:0}};this._sUni=uni;
    this.starMesh=new T.Mesh(new T.SphereGeometry(STAR_R,48,48),new T.ShaderMaterial({vertexShader:STAR_VERT,fragmentShader:STAR_FRAG,uniforms:uni,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
    this.scene.add(this.starMesh);

    // Halo layers (fake bloom)
    const hl=[{r:STAR_R*1.5,c:0xfffff0,o:0.50},{r:STAR_R*2.5,c:0xffdd66,o:0.24},{r:STAR_R*4.0,c:0xff8800,o:0.11},{r:STAR_R*7.0,c:0x440800,o:0.055},{r:STAR_R*13,c:0x110200,o:0.022}];
    this.halos=[];
    for(const h of hl){const m=new T.Mesh(new T.SphereGeometry(h.r,16,16),new T.MeshBasicMaterial({color:h.c,transparent:true,opacity:h.o,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending}));this.scene.add(m);this.halos.push(m);}
  }

  _buildParticleHalo(){
    const T=this.T;
    // Sphere surface particles — the "energy cloud" of the Dyson sphere
    const N=3200;
    const pos=new Float32Array(N*3),col=new Float32Array(N*3),sz=new Float32Array(N);
    this._haloBase=new Float32Array(N*3);this._haloLife=new Float32Array(N).map(()=>Math.random());this._haloSpeed=new Float32Array(N).map(()=>0.003+Math.random()*0.008);

    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
      const r=SPHERE_R*(0.92+Math.random()*0.20);
      const x=r*Math.sin(ph)*Math.cos(th),y=r*Math.sin(ph)*Math.sin(th),z=r*Math.cos(ph);
      this._haloBase[i*3]=x;this._haloBase[i*3+1]=y;this._haloBase[i*3+2]=z;
      pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;
      const bright=0.5+Math.random()*0.5;
      col[i*3]=bright*0.1;col[i*3+1]=bright*0.75;col[i*3+2]=bright*1.0;
      sz[i]=0.04+Math.random()*0.14;
    }

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.coronaPts=new T.Points(geo,new T.PointsMaterial({size:0.18,vertexColors:true,transparent:true,opacity:0.65,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));
    this._haloGeo=geo;
    this.scene.add(this.coronaPts);

    // Second outer particle ring — more diffuse
    const N2=1000;const pos2=new Float32Array(N2*3),col2=new Float32Array(N2*3);
    for(let i=0;i<N2;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
      const r=SPHERE_R*(1.05+Math.random()*0.35);
      pos2[i*3]=r*Math.sin(ph)*Math.cos(th);pos2[i*3+1]=r*Math.sin(ph)*Math.sin(th);pos2[i*3+2]=r*Math.cos(ph);
      col2[i*3]=0.05;col2[i*3+1]=0.5+Math.random()*0.3;col2[i*3+2]=0.9+Math.random()*0.1;
    }
    const geo2=new T.BufferGeometry();geo2.setAttribute('position',new T.BufferAttribute(pos2,3));geo2.setAttribute('color',new T.BufferAttribute(col2,3));
    const outerRing=new T.Points(geo2,new T.PointsMaterial({size:0.1,vertexColors:true,transparent:true,opacity:0.28,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));
    this._outerRing=outerRing;
    this.scene.add(outerRing);
  }

  _buildMesh(faces){
    const T=this.T;
    // Cleanup
    if(this.panelMesh){this.scene.remove(this.panelMesh);this.panelMesh.geometry.dispose();this.panelMesh.material.dispose();this.panelMesh=null;}
    for(const e of this.edges){this.scene.remove(e);e.geometry.dispose();e.material.dispose();}this.edges=[];
    if(!faces?.length)return;

    this.faceSlots=faces.map(f=>f.slot||null);
    const{pos,norm,occ,tcol,tidx,t2f}=buildPanelBuffers(faces);
    this.triToFace=t2f;

    // Panel mesh — transparent, custom shader
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('normal',new T.BufferAttribute(norm,3));
    geo.setAttribute('aOccupied',new T.BufferAttribute(occ,1));
    geo.setAttribute('aTierColor',new T.BufferAttribute(tcol,3));
    geo.setAttribute('aTierIdx',new T.BufferAttribute(tidx,1));
    const uni={uTime:{value:0}};this._pUni=uni;
    const mat=new T.ShaderMaterial({vertexShader:PANEL_VERT,fragmentShader:PANEL_FRAG,uniforms:uni,side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.NormalBlending});
    this.panelMesh=new T.Mesh(geo,mat);
    this.panelMesh.rotation.x=this.rot.x;this.panelMesh.rotation.y=this.rot.y;
    this.scene.add(this.panelMesh);

    // Edges — 3 passes: thick outer glow, medium, sharp core
    const eData=buildEdgeBuffers(faces);
    const edgePasses=[
      {scale:1.008,op:0.22,size:3.0},
      {scale:1.004,op:0.55,size:1.5},
      {scale:1.001,op:0.90,size:0.8},
    ];
    const eUni={uTime:{value:0}};this._eUni=eUni;

    for(const ep of edgePasses){
      const eg=new T.BufferGeometry();
      const sp=eData.pos.map((v,i)=>i%3===0||i%3===1||i%3===2?v:v); // copy
      const scaledPos=new Float32Array(eData.pos.length);
      for(let i=0;i<eData.pos.length;i+=3){
        scaledPos[i]=eData.pos[i]*ep.scale;scaledPos[i+1]=eData.pos[i+1]*ep.scale;scaledPos[i+2]=eData.pos[i+2]*ep.scale;
      }
      eg.setAttribute('position',new T.BufferAttribute(scaledPos,3));
      eg.setAttribute('aOccupied',new T.BufferAttribute(eData.occ,1));
      eg.setAttribute('aTierColor',new T.BufferAttribute(eData.tcol,3));
      const em=new T.ShaderMaterial({vertexShader:EDGE_VERT,fragmentShader:EDGE_FRAG,uniforms:eUni,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
      em.uniforms=eUni;
      const el=new T.LineSegments(eg,em);
      el.rotation.x=this.rot.x;el.rotation.y=this.rot.y;
      this.scene.add(el);this.edges.push(el);
    }
  }

  setFaces(faces,animate=false){
    if(!animate||this.transitioning){this._buildMesh(faces);return;}
    this.transitioning=true;
    const G=this.G;
    const doSwap=()=>{
      this._buildMesh(faces);
      const targets=[this.panelMesh?.scale,...this.edges.map(e=>e.scale)].filter(Boolean);
      if(targets.length){
        targets.forEach(s=>s.set(0,0,0));
        G.to(targets,{x:1,y:1,z:1,duration:0.55,ease:'back.out(1.4)',stagger:0.04,onComplete:()=>{this.transitioning=false;}});
      } else {this.transitioning=false;}
    };
    const targets=[this.panelMesh?.scale,...this.edges.map(e=>e.scale)].filter(Boolean);
    if(targets.length){G.to(targets,{x:0,y:0,z:0,duration:0.22,ease:'power3.in',onComplete:doSwap});}
    else{doSwap();}
  }

  zoom(dy){this.zoomTarget=Math.max(9,Math.min(55,this.zoomTarget+dy*0.012));}

  handleClick(cx,cy){
    if(!this.panelMesh||!this.onFaceClick)return;
    const rect=this.canvas.getBoundingClientRect();
    const x=((cx-rect.left)/rect.width)*2-1,y=-((cy-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera({x,y},this.camera);
    const hits=this.raycaster.intersectObject(this.panelMesh);
    if(hits.length){const fi=this.triToFace?.[hits[0].faceIndex]??hits[0].faceIndex;const s=this.faceSlots[fi];if(s)this.onFaceClick(s);}
  }

  _bindEvents(){
    const c=this.canvas,h=this._h;let lx=0,ly=0,mv=false;
    h.md=e=>{this.isDragging=true;mv=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0};};
    h.mm=e=>{if(!this.isDragging)return;const dx=e.clientX-lx,dy=e.clientY-ly;if(Math.abs(dx)>1||Math.abs(dy)>1)mv=true;this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.clientX;ly=e.clientY;};
    h.mu=e=>{if(!mv)this.handleClick(e.clientX,e.clientY);this.isDragging=false;};
    c.addEventListener('mousedown',h.md);window.addEventListener('mousemove',h.mm);window.addEventListener('mouseup',h.mu);
    h.ts=e=>{if(e.touches.length===1){this.isDragging=true;mv=false;lx=e.touches[0].clientX;ly=e.touches[0].clientY;this.touchStart={x:lx,y:ly};this.pinchDist=null;}else if(e.touches.length===2){this.isDragging=false;const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;this.pinchDist=Math.sqrt(dx*dx+dy*dy);}};
    h.tm=e=>{e.preventDefault();if(e.touches.length===1&&this.isDragging){const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;if(Math.abs(dx)>2||Math.abs(dy)>2)mv=true;this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.touches[0].clientX;ly=e.touches[0].clientY;}else if(e.touches.length===2&&this.pinchDist!=null){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const d=Math.sqrt(dx*dx+dy*dy);this.zoom((this.pinchDist-d)*3);this.pinchDist=d;}};
    h.te=e=>{if(e.changedTouches.length===1&&!mv&&this.touchStart)this.handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY);this.isDragging=false;};
    c.addEventListener('touchstart',h.ts,{passive:false});c.addEventListener('touchmove',h.tm,{passive:false});c.addEventListener('touchend',h.te);
  }

  _animate(){
    this.animId=requestAnimationFrame(()=>this._animate());
    const t=(Date.now()-this._t0)*0.001;

    if(!this.isDragging){this.rot.y+=this.vel.x;this.rot.x+=this.vel.y;this.vel.x*=0.94;this.vel.y*=0.94;this.rot.y+=0.00045;}
    const rx=this.rot.x,ry=this.rot.y;
    if(this.panelMesh){this.panelMesh.rotation.x=rx;this.panelMesh.rotation.y=ry;}
    for(const e of this.edges){e.rotation.x=rx;e.rotation.y=ry;}

    if(this._pUni)this._pUni.uTime.value=t;
    if(this._eUni)this._eUni.uTime.value=t;
    if(this._sUni)this._sUni.uTime.value=t;

    // Star pulse
    const sp=1+Math.sin(t*0.85)*0.18+Math.sin(t*2.3)*0.05;
    if(this._sl)this._sl.intensity=14*sp;
    if(this._cl)this._cl.intensity=5*sp;
    this.halos.forEach((h,i)=>h.scale.setScalar(1+Math.sin(t*0.38+i*0.7)*0.04));

    // Particle halo animation
    if(this._haloGeo){
      const pa=this._haloGeo.getAttribute('position');
      const N=pa.count;
      for(let i=0;i<N;i++){
        this._haloLife[i]+=this._haloSpeed[i];
        if(this._haloLife[i]>1)this._haloLife[i]=0;
        const life=this._haloLife[i];
        const fade=Math.sin(life*Math.PI);
        const r=SPHERE_R*(0.92+life*0.18);
        const bx=this._haloBase[i*3],by=this._haloBase[i*3+1],bz=this._haloBase[i*3+2];
        const l=Math.sqrt(bx*bx+by*by+bz*bz)||1;
        pa.array[i*3]=bx/l*r;pa.array[i*3+1]=by/l*r;pa.array[i*3+2]=bz/l*r;
      }
      pa.needsUpdate=true;
    }

    if(this.coronaPts)this.coronaPts.rotation.y=ry;this.coronaPts.rotation.x=rx;
    if(this._outerRing){this._outerRing.rotation.y=ry*0.7;this._outerRing.rotation.x=rx*0.7;}
    if(this.starfield){this.starfield.rotation.y=t*0.0008;this.starfield.rotation.x=Math.sin(t*0.0001)*0.015;}
    if(this.nebula){this.nebula.rotation.y=t*0.0004;this.nebula.rotation.x=Math.sin(t*0.0002)*0.02;}

    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.065;
    this.camera.position.z=this.zoomCurrent;
    this.renderer.render(this.scene,this.camera);
  }

  resize(){const W=this.canvas.clientWidth,H=this.canvas.clientHeight;if(!W||!H)return;this.camera.aspect=W/H;this.camera.updateProjectionMatrix();this.renderer.setSize(W,H,false);}

  destroy(){
    cancelAnimationFrame(this.animId);
    const h=this._h;
    this.canvas.removeEventListener('mousedown',h.md);window.removeEventListener('mousemove',h.mm);window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts);this.canvas.removeEventListener('touchmove',h.tm);this.canvas.removeEventListener('touchend',h.te);
    [this.panelMesh,...this.edges].forEach(m=>{if(m){m.geometry?.dispose();m.material?.dispose();}});
    this.renderer?.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR — tier stats panel (right side, matching screenshot)
// ─────────────────────────────────────────────────────────────────────────────

const TIER_TOTALS={epicenter:1,prestige:8,elite:50,business:176,standard:400,viral:671};

const TierSidebar=memo(function TierSidebar({slots,isLive,level}){
  const stats=useMemo(()=>{
    const counts={};
    TIER_ORDER.forEach(t=>{counts[t]=0;});
    (slots||[]).forEach(s=>{if(s?.occ&&counts[s.tier]!==undefined)counts[s.tier]++;});
    return counts;
  },[slots]);

  const total=Object.values(stats).reduce((s,v)=>s+v,0);

  return(
    <div style={{
      position:'absolute',top:0,right:0,bottom:0,width:220,
      background:'rgba(1,3,16,0.82)',backdropFilter:'blur(24px) saturate(150%)',
      borderLeft:'1px solid rgba(0,160,255,0.12)',
      display:'flex',flexDirection:'column',zIndex:20,
      boxShadow:'-20px 0 60px rgba(0,10,40,0.5)',
    }}>
      {/* Header */}
      <div style={{padding:'16px 18px 12px',borderBottom:'1px solid rgba(0,160,255,0.10)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:14,color:U.cyan}}>◎</span>
            <span style={{color:U.text,fontSize:13,fontWeight:800,fontFamily:F.h,letterSpacing:'0.08em'}}>COSMOS</span>
          </div>
          {isLive&&(
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'2px 8px',borderRadius:12,
              background:'rgba(0,255,120,0.10)',border:'1px solid rgba(0,255,120,0.25)'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#00ff88',boxShadow:'0 0 6px #00ff88',animation:'livePulse 1.5s ease-in-out infinite'}}/>
              <span style={{color:'#00ff88',fontSize:8,fontWeight:700,letterSpacing:'0.1em',fontFamily:F.b}}>LIVE</span>
            </div>
          )}
        </div>
        <div style={{color:U.muted,fontSize:9,fontFamily:F.b,letterSpacing:'0.06em'}}>
          {total} bloc{total>1?'s':''} actif{total>1?'s':''} · Niveau {level}
        </div>
      </div>

      {/* Tier rows */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 0'}}>
        {TIER_ORDER.filter(t=>TIER_COLOR[t]).map((tier,i)=>{
          const col=TIER_COLOR[tier];
          const occ=stats[tier]||0;
          const total=TIER_TOTALS[tier]||1;
          const pct=Math.round(occ/total*100);
          const isEpic=tier==='epicenter';
          return(
            <div key={tier} style={{padding:'10px 16px 10px 14px',borderLeft:`2px solid ${occ>0?col:'transparent'}`,marginLeft:4,marginBottom:2,transition:'all 0.3s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:7,height:7,borderRadius:isEpic?'50%':2,background:col,boxShadow:occ>0?`0 0 8px ${col}`:undefined,flexShrink:0}}/>
                  <span style={{color:occ>0?col:'rgba(160,180,220,0.5)',fontSize:10,fontWeight:700,fontFamily:F.b,letterSpacing:'0.05em'}}>
                    {(TIER_LABEL[tier]||tier).toUpperCase()}
                  </span>
                </div>
                <span style={{color:col,fontSize:9,fontWeight:700,fontFamily:F.b}}>€{fmt(tier)}/j</span>
              </div>

              {/* Progress bar */}
              <div style={{height:2,borderRadius:2,background:'rgba(255,255,255,0.05)',marginBottom:5,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,borderRadius:2,background:occ>0?`linear-gradient(90deg,${col}88,${col})`:'transparent',transition:'width 0.8s ease',boxShadow:occ>0?`0 0 6px ${col}88`:undefined}}/>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{color:'rgba(160,180,220,0.35)',fontSize:8,fontFamily:F.b,letterSpacing:'0.04em'}}>
                  {occ}/{total} {isEpic?'bloc':'blocs'}
                </span>
                <span style={{color:occ>0?`${col}cc`:'rgba(160,180,220,0.20)',fontSize:8,fontWeight:600,fontFamily:F.b}}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom total */}
      <div style={{padding:'12px 18px',borderTop:'1px solid rgba(0,160,255,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:U.muted,fontSize:9,fontFamily:F.b,letterSpacing:'0.06em'}}>REVENUS/JOUR</span>
          <span style={{color:U.accent,fontSize:12,fontWeight:800,fontFamily:F.h}}>
            €{TIER_ORDER.reduce((s,t)=>{const occ=stats[t]||0;return s+occ*(TIER_PRICE[t]||0)/100;},0).toLocaleString('fr-FR')}
          </span>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// OTHER UI
// ─────────────────────────────────────────────────────────────────────────────

const LevelDots=memo(function LevelDots({level,onLevel}){
  return(
    <div style={{position:'absolute',bottom:22,left:'calc(50% - 110px)',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:4,zIndex:30,padding:'6px 12px',borderRadius:40,background:'rgba(1,4,20,0.80)',backdropFilter:'blur(18px)',border:'1px solid rgba(0,160,255,0.12)',boxShadow:'0 4px 24px rgba(0,0,0,0.6)'}}>
      {LEVELS.map(lv=>{
        const act=lv.n===level,c=act?U.cyan:'rgba(100,160,220,0.25)';
        return(<button key={lv.n} onClick={()=>onLevel(lv.n)} title={`${lv.icon} ${lv.name}`}
          style={{width:act?30:17,height:act?30:17,borderRadius:'50%',border:`1.5px solid ${c}`,background:act?'rgba(0,180,255,0.12)':'transparent',color:c,fontSize:act?10:8,fontWeight:700,cursor:'pointer',transition:'all 0.28s cubic-bezier(.34,1.56,.64,1)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.b,padding:0,flexShrink:0,boxShadow:act?`0 0 18px ${U.cyan}88,0 0 6px ${U.cyan}44`:'none',outline:'none'}}>
          {act?lv.icon:lv.n}
        </button>);
      })}
      <div style={{marginLeft:4,paddingLeft:8,borderLeft:'1px solid rgba(0,160,255,0.15)',display:'flex',alignItems:'center'}}>
        <span style={{color:U.cyan,fontSize:10,fontWeight:700,fontFamily:F.h,letterSpacing:'0.06em'}}>+ {LEVELS[level]?.name}</span>
      </div>
    </div>
  );
});

function BlockOverlay({slot,onClose,onRent,onBuyout}){
  const [vis,setVis]=useState(false);
  useEffect(()=>{requestAnimationFrame(()=>setVis(true));},[]);
  if(!slot)return null;
  const col=TIER_COLOR[slot.tier]||U.accent;
  const label=TIER_LABEL[slot.tier]||slot.tier;
  return(
    <div onClick={onClose} style={{position:'absolute',inset:0,right:220,zIndex:50,background:'rgba(0,1,15,0.78)',backdropFilter:'blur(22px)',display:'flex',alignItems:'center',justifyContent:'center',opacity:vis?1:0,transition:'opacity 0.25s'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:300,borderRadius:22,overflow:'hidden',
        background:'linear-gradient(145deg,rgba(4,8,28,0.98),rgba(2,4,18,0.99))',
        border:`1px solid ${col}22`,
        boxShadow:`0 0 0 1px rgba(255,255,255,0.03),0 0 50px ${col}18,0 0 100px ${col}0c,0 36px 80px rgba(0,0,0,0.95)`,
        transform:vis?'scale(1) translateY(0)':'scale(0.96) translateY(16px)',transition:'transform 0.32s cubic-bezier(.34,1.56,.64,1)'}}>
        <div style={{height:3,background:`linear-gradient(90deg,transparent,${col},${col}88,transparent)`,boxShadow:`0 0 18px ${col}aa,0 0 36px ${col}44`}}/>
        <div style={{padding:'20px 22px 24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
            <div style={{display:'flex',alignItems:'center',gap:7,padding:'4px 12px',borderRadius:20,background:`${col}10`,border:`1px solid ${col}25`,boxShadow:`0 0 14px ${col}15`}}>
              <div style={{width:6,height:6,borderRadius:2,background:col,boxShadow:`0 0 8px ${col}`}}/>
              <span style={{color:col,fontSize:10,fontWeight:800,letterSpacing:'0.08em',fontFamily:F.b}}>{label.toUpperCase()}</span>
            </div>
            <button onClick={onClose} style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(180,200,255,0.45)',fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',outline:'none',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.09)';e.currentTarget.style.color='#fff';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(180,200,255,0.45)';}}>×</button>
          </div>
          <div style={{width:60,height:60,borderRadius:14,marginBottom:16,background:slot.occ?`linear-gradient(135deg,${col}20,${col}08)`:'rgba(255,255,255,0.02)',border:`1.5px solid ${col}${slot.occ?'44':'18'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:col,fontFamily:F.h,boxShadow:slot.occ?`0 0 28px ${col}28,inset 0 0 18px ${col}10`:'none'}}>
            {slot.tenant?.l||(slot.occ?'◉':'○')}
          </div>
          <div style={{color:U.text,fontSize:15,fontWeight:700,fontFamily:F.h,marginBottom:5,lineHeight:1.3}}>
            {slot.occ?(slot.tenant?.name||`Panneau ${label}`):`Panneau ${label} disponible`}
          </div>
          <div style={{color:U.muted,fontSize:11,marginBottom:18,fontFamily:F.b,lineHeight:1.6}}>
            {slot.occ?(slot.tenant?.cta||'Panneau actif · Dyson Sphere ADS-SQUARE'): `Visible de l'univers entier · À partir de €${fmt(slot.tier)}/jour`}
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:5,marginBottom:20,padding:'10px 14px',borderRadius:12,background:`${col}07`,border:`1px solid ${col}14`}}>
            <span style={{color:col,fontSize:26,fontWeight:800,fontFamily:F.h,lineHeight:1}}>€{fmt(slot.tier)}</span>
            <span style={{color:U.muted,fontSize:10,fontFamily:F.b}}>/jour</span>
            <span style={{marginLeft:'auto',color:'rgba(160,180,220,0.18)',fontSize:8,fontFamily:F.b,letterSpacing:'0.07em'}}>DYSON·SPHERE</span>
          </div>
          {!slot.occ?(
            <button onClick={()=>onRent(slot)} style={{width:'100%',padding:'13px',borderRadius:12,background:`linear-gradient(135deg,${col},${col}cc,${col}88)`,border:'none',color:'#050505',fontSize:13,fontWeight:800,fontFamily:F.b,cursor:'pointer',boxShadow:`0 0 28px ${col}50,0 10px 28px rgba(0,0,0,0.6)`,letterSpacing:'0.02em',outline:'none',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 0 40px ${col}70,0 14px 36px rgba(0,0,0,0.7)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 0 28px ${col}50,0 10px 28px rgba(0,0,0,0.6)`;}}
              >Réserver ce panneau →</button>
          ):(
            <button onClick={()=>onBuyout(slot)} style={{width:'100%',padding:'13px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:`1px solid ${col}20`,color:'rgba(180,200,255,0.4)',fontSize:12,fontWeight:600,fontFamily:F.b,cursor:'pointer',outline:'none',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${col}0d`;e.currentTarget.style.color=col;}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.color='rgba(180,200,255,0.4)';}}>
              Faire une offre de rachat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function View3D({slots=[],isLive=false,onGoAdvertiser,onWaitlist,onCheckout,onBuyout,ExistingPublicView}){
  const canvasRef=useRef(null),sceneRef=useRef(null);
  const [level,setLevel]=useState(6); // start at Cosmos level for max impact
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [focusSlot,setFocusSlot]=useState(null);

  const sorted=useMemo(()=>sortSlots(slots),[slots]);
  const assignedFaces=useMemo(()=>{
    if(level===0)return[];
    return sortByPole(getFacesForLevel(level)).map((f,i)=>({...f,slot:sorted[i]||null}));
  },[level,sorted]);

  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let sc;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([T,G])=>{sc=new Scene3D(canvasRef.current);sceneRef.current=sc;sc.onFaceClick=s=>setFocusSlot(s);return sc.init(T,G);})
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
      else if(e.key==='Escape')setFocusSlot(null);
    };
    window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);
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
    ro.observe(canvasRef.current);return()=>ro.disconnect();
  },[]);

  const goLevel=useCallback(n=>{setFocusSlot(null);setLevel(n);},[]);

  if(level===0){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <button onClick={()=>goLevel(6)} style={{position:'absolute',top:10,right:10,zIndex:100,display:'flex',alignItems:'center',gap:8,padding:'8px 18px',borderRadius:22,background:'rgba(1,4,20,0.92)',border:`1px solid ${U.cyan}40`,backdropFilter:'blur(16px)',color:U.cyan,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F.b,boxShadow:`0 0 28px ${U.cyan}25`,letterSpacing:'0.04em',outline:'none'}}>
          ◎ Dyson Sphere 3D
        </button>
        {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
      </div>
    );
  }

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:U.bg,display:'flex'}}>
      {/* Canvas zone — leaves room for sidebar */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',cursor:focusSlot?'default':'grab',opacity:loading?0:1,transition:'opacity 0.8s ease'}}/>

        {loading&&!error&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:U.bg}}>
            <div style={{position:'relative',width:64,height:64}}>
              <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'1.5px solid rgba(0,180,255,0.10)',borderTopColor:U.cyan,animation:'dSpin 1.1s linear infinite'}}/>
              <div style={{position:'absolute',inset:10,borderRadius:'50%',border:'1.5px solid rgba(0,180,255,0.06)',borderBottomColor:'rgba(0,200,255,0.40)',animation:'dSpin 2.2s linear infinite reverse'}}/>
              <div style={{position:'absolute',inset:22,borderRadius:'50%',border:'1.5px solid rgba(0,180,255,0.04)',borderLeftColor:'rgba(0,220,255,0.25)',animation:'dSpin 3.3s linear infinite'}}/>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#fffbe8',boxShadow:'0 0 14px #ffcc44,0 0 32px #ff8800,0 0 70px #ff440033'}}/>
              </div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{color:U.cyan,fontSize:11,fontWeight:700,letterSpacing:'0.16em',fontFamily:F.h,marginBottom:4}}>DYSON SPHERE</div>
              <div style={{color:U.muted,fontSize:8,letterSpacing:'0.14em',fontFamily:F.b}}>CONSTRUCTION EN COURS…</div>
            </div>
          </div>
        )}

        {error&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:24,background:U.bg}}>
            <div style={{color:U.err,fontSize:13,fontWeight:700}}>⚠ {error}</div>
            <button onClick={()=>goLevel(0)} style={{padding:'10px 22px',borderRadius:12,background:U.cyan,border:'none',color:'#000',fontWeight:700,cursor:'pointer',fontFamily:F.b}}>Grille 2D</button>
          </div>
        )}

        {/* Back to 2D */}
        <button onClick={()=>goLevel(0)} style={{position:'absolute',top:12,left:12,zIndex:30,display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:20,background:'rgba(1,4,20,0.82)',border:'1px solid rgba(0,160,255,0.14)',backdropFilter:'blur(12px)',color:U.muted,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:F.b,letterSpacing:'0.04em',outline:'none',transition:'color 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.color=U.text}
          onMouseLeave={e=>e.currentTarget.style.color=U.muted}>
          ◫ Vue 2D
        </button>

        {/* Level dots */}
        <LevelDots level={level} onLevel={goLevel}/>

        {/* Hint */}
        {!loading&&<div id="ds-hint" style={{position:'absolute',bottom:64,left:'40%',transform:'translateX(-50%)',color:'rgba(100,160,220,0.30)',fontSize:9,letterSpacing:'0.08em',fontFamily:F.b,pointerEvents:'none',whiteSpace:'nowrap'}}>↕ zoom · ⊙ rotation · clic = panneau</div>}

        {/* Block overlay — inset right: 220 to not cover sidebar */}
        {focusSlot&&<BlockOverlay slot={focusSlot} onClose={()=>setFocusSlot(null)} onRent={s=>{setFocusSlot(null);onCheckout?.(s);}} onBuyout={s=>{setFocusSlot(null);onBuyout?.(s);}}/>}
      </div>

      {/* Right sidebar */}
      <TierSidebar slots={slots} isLive={isLive} level={level}/>

      <style>{`
        @keyframes dSpin{to{transform:rotate(360deg);}}
        @keyframes livePulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(0,160,255,0.25);border-radius:2px;}
      `}</style>
    </div>
  );
}
