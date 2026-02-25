'use client';
/**
 * ─── ADS·SQUARE — Dyson Sphere 4K HDR ──────────────────────────────────────
 * Custom PBR shaders · Corona particles · Fake bloom multi-layer
 * Iridescent metallic panels · Holographic UI · Ultra-smooth GSAP
 *
 * Niveaux : 0=2D · 1=Cube(6) · 2=Octa(8) · 3=Ico(20)
 *           4=Sph×80 · 5=Sph×320 · 6=Cosmos×1280
 *
 * npm install three gsap
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ── Design tokens ─────────────────────────────────────────────────────────────
const U = {
  bg:'#00010c', text:'#f4f4ff', muted:'rgba(220,225,255,0.38)',
  accent:'#d4a84b', accentFg:'#050505',
  border:'rgba(180,200,255,0.07)', border2:'rgba(180,200,255,0.14)',
  err:'#ff4466', s1:'rgba(4,6,20,0.88)',
};
const F = { h:"'Clash Display','Syne',sans-serif", b:"'DM Sans','Inter',system-ui,sans-serif" };
const fmt = t => ((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];
const LEVELS = [
  {n:0,name:'Grille 2D',  icon:'◫', faces:0},
  {n:1,name:'Cube',       icon:'⬡', faces:6},
  {n:2,name:'Octaèdre',   icon:'◆', faces:8},
  {n:3,name:'Icosaèdre',  icon:'⬟', faces:20},
  {n:4,name:'Sphère I',   icon:'◎', faces:80},
  {n:5,name:'Sphère II',  icon:'◉', faces:320},
  {n:6,name:'Cosmos',     icon:'●', faces:1280},
];

const SPHERE_R  = 6.8;
const PANEL_GAP = 0.84;   // 16 % de gap → lumière de l'étoile visible
const STAR_R    = 1.1;

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

const inset = (verts, c, f) =>
  verts.map(v => [c[0]+(v[0]-c[0])*f, c[1]+(v[1]-c[1])*f, c[2]+(v[2]-c[2])*f]);
const centN = vs => [vs.reduce((s,v)=>s+v[0],0)/vs.length, vs.reduce((s,v)=>s+v[1],0)/vs.length, vs.reduce((s,v)=>s+v[2],0)/vs.length];

function buildCubeFaces() {
  const a=SPHERE_R/Math.sqrt(3);
  return [
    [[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],
    [[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],
    [[-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]],
    [[a,-a,-a],[-a,-a,-a],[-a,a,-a],[a,a,-a]],
    [[a,-a,a],[a,a,a],[a,a,-a],[a,-a,-a]],
    [[-a,-a,-a],[-a,a,-a],[-a,a,a],[-a,-a,a]],
  ].map(vs=>{ const c=centN(vs); return {verts:inset(vs,c,PANEL_GAP),centroid:c,isQuad:true}; });
}
function buildOctaFaces() {
  const R=SPHERE_R, v=[[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];
  return [[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]]
    .map(fi=>{ const vs=fi.map(i=>v[i]), c=centN(vs); return {verts:inset(vs,c,PANEL_GAP),centroid:c,isQuad:false}; });
}
const midS = (a,b)=>{ const m=a.map((c,i)=>(c+b[i])/2), l=Math.hypot(...m); return m.map(c=>c/l); };
function buildIcoFaces(sub) {
  const phi=(1+Math.sqrt(5))/2;
  const rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]]
    .map(v=>{ const l=Math.hypot(...v); return v.map(c=>c/l); });
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
    .map(f=>f.map(i=>rv[i]));
  for(let s=0;s<sub;s++){ const nx=[]; for(const[a,b,c] of faces){ const ab=midS(a,b),bc=midS(b,c),ca=midS(c,a); nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]); } faces=nx; }
  const R=SPHERE_R;
  return faces.map(([a,b,c])=>{
    const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];
    const cnt=centN(vs);
    return {verts:inset(vs,cnt,PANEL_GAP),centroid:cnt,isQuad:false};
  });
}
function getFacesForLevel(n){
  switch(n){ case 1:return buildCubeFaces(); case 2:return buildOctaFaces();
    case 3:return buildIcoFaces(0); case 4:return buildIcoFaces(1);
    case 5:return buildIcoFaces(2); case 6:return buildIcoFaces(3); default:return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHADERS
// ─────────────────────────────────────────────────────────────────────────────

const PANEL_VERT = /* glsl */`
  precision highp float;

  attribute float aOccupied;
  attribute vec3  aTierColor;
  attribute float aTierIdx;

  uniform float uTime;
  uniform float uTransition; // 0→1 morph in

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vOccupied;
  varying vec3  vTierColor;
  varying float vFresnel;
  varying float vTierIdx;

  void main(){
    vNormal    = normalize(normalMatrix * normal);
    vec4 wp    = modelMatrix * vec4(position, 1.0);
    vWorldPos  = wp.xyz;
    vOccupied  = aOccupied;
    vTierColor = aTierColor;
    vTierIdx   = aTierIdx;

    vec3 viewDir = normalize(cameraPosition - wp.xyz);
    float raw    = 1.0 - abs(dot(vNormal, viewDir));
    vFresnel     = pow(clamp(raw, 0.0, 1.0), 1.8);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PANEL_FRAG = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uTransition;

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vOccupied;
  varying vec3  vTierColor;
  varying float vFresnel;
  varying float vTierIdx;

  // Hash for pseudo-random per-panel variation
  float hash(float n){ return fract(sin(n)*43758.5453); }

  // Iridescent spectrum shift
  vec3 iridescent(float t){
    return 0.5 + 0.5*cos(6.28318*(t + vec3(0.0, 0.333, 0.667)));
  }

  void main(){
    float t = uTime;
    float panelSeed = hash(vWorldPos.x*13.7 + vWorldPos.y*9.3 + vWorldPos.z*7.1);
    float phaseOff  = panelSeed * 6.28318;

    // ── Occupied panel ──────────────────────────────────────────────────────
    if(vOccupied > 0.5){
      // Pulse animation (tier-based speed)
      float speed  = 0.8 + vTierIdx * 0.3;
      float pulse  = 0.75 + 0.25*sin(t*speed + phaseOff);

      // Base diffuse — rich color
      vec3 base = vTierColor * 0.38 * pulse;

      // Emissive glow
      vec3 emissive = vTierColor * 0.85 * pulse;

      // Holographic scanlines
      float scan = sin(vWorldPos.y*28.0 - t*3.5)*0.5+0.5;
      scan = pow(scan, 3.0);
      emissive += vTierColor * scan * 0.25;

      // Iridescent fresnel rim
      float iriShift = vFresnel * 0.6 + t*0.08 + panelSeed;
      vec3 iri = iridescent(iriShift) * vTierColor;
      vec3 rim = iri * pow(vFresnel, 1.5) * 1.4;

      // Star inner face glow — inner face of sphere faces center (0,0,0)
      vec3 toStar = normalize(-vWorldPos);
      float starFace = max(0.0, dot(vNormal, toStar));
      vec3 starGlow  = vec3(1.0, 0.88, 0.55) * starFace * 0.45;

      vec3 col = base + emissive + rim + starGlow;

      // Subtle vignette from world position (distance from pole = tier position)
      float vig = 1.0 - smoothstep(0.0, 6.0, length(vWorldPos)*0.8);
      col += vTierColor * 0.12 * vig;

      gl_FragColor = vec4(col, 1.0);

    // ── Vacant panel ────────────────────────────────────────────────────────
    } else {
      // Dark metallic carbon-fiber look
      vec3 base = vec3(0.03, 0.04, 0.07);

      // Subtle hex-grid shimmer (time-based)
      float shimmer = sin(vWorldPos.x*8.0 + vWorldPos.y*8.0 + t*0.4)*0.5+0.5;
      shimmer = pow(shimmer, 5.0) * 0.06;
      base += vec3(0.2,0.4,0.8)*shimmer;

      // Iridescent rim (blue-violet — reflected starlight)
      float iriShift = vFresnel*0.5 + t*0.04 + panelSeed;
      vec3 iri = iridescent(iriShift);
      vec3 rim = mix(vec3(0.2,0.35,1.0), iri, 0.4) * pow(vFresnel,2.0) * 0.55;

      // Star inner glow through gap
      vec3 toStar = normalize(-vWorldPos);
      float starFace = max(0.0, dot(vNormal, toStar));
      vec3 starGlow  = vec3(1.0, 0.85, 0.45) * starFace * 0.28;

      gl_FragColor = vec4(base + rim + starGlow, 1.0);
    }
  }
`;

// Grid edge shader — neon seams between panels
const GRID_VERT = /* glsl */`
  precision highp float;
  uniform float uTime;
  void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const GRID_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  void main(){
    float pulse = 0.5 + 0.5*sin(uTime*1.2);
    gl_FragColor = vec4(0.12, 0.25, 0.55, 0.35 + pulse*0.15);
  }
`;

// Star core shader
const STAR_VERT = `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const STAR_FRAG = `
  precision highp float;
  uniform float uTime;
  varying vec2 vUv;

  float noise(vec2 p){
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
  }
  float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }

  void main(){
    vec2 uv = vUv*2.0-1.0;
    float r  = length(uv);
    if(r>1.0){ discard; }

    // Turbulent surface
    float turb = fbm(uv*4.0 + uTime*0.15)*0.5;
    float core  = 1.0 - smoothstep(0.0, 0.85, r);
    float edge  = 1.0 - smoothstep(0.6, 1.0, r);

    // Color: white core → orange → dark red edge
    vec3 c1 = vec3(1.00, 0.98, 0.90); // white
    vec3 c2 = vec3(1.00, 0.65, 0.10); // orange
    vec3 c3 = vec3(0.80, 0.20, 0.02); // red
    vec3 col = mix(c3, mix(c2,c1, core+turb*0.3), edge);

    // Sunspot
    float spot = noise(uv*6.0 + uTime*0.05);
    col -= vec3(0.15,0.08,0.0)*step(0.72,spot)*core;

    float alpha = edge * (1.0 - r*0.5);
    gl_FragColor = vec4(col*2.5, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sortSlots = s => [...(s||[])].filter(Boolean).sort((a,b)=>{
  const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);
  return d||((b.occ?1:0)-(a.occ?1:0));
});
const sortByPole = f => [...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);
const hex3 = h=>{ const s=(h||'#888').replace('#',''); return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]; };

// ─────────────────────────────────────────────────────────────────────────────
// BUFFER DATA
// ─────────────────────────────────────────────────────────────────────────────

function buildBuffers(faces) {
  let nTris=0;
  for(const f of faces) nTris+=f.isQuad?2:1;

  const pos  = new Float32Array(nTris*9);
  const norm = new Float32Array(nTris*9);
  const occ  = new Float32Array(nTris*3);
  const tcol = new Float32Array(nTris*9);
  const tidx = new Float32Array(nTris*3);
  const t2f  = new Int32Array(nTris);
  let v=0, t=0;

  const triNorm=(a,b,c)=>{
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
    const l=Math.hypot(...n)||1; return n.map(x=>x/l);
  };

  const push=(x,y,z, nx,ny,nz, o, r,g,b, ti)=>{
    const i=v*3;
    pos[i]=x;pos[i+1]=y;pos[i+2]=z;
    norm[i]=nx;norm[i+1]=ny;norm[i+2]=nz;
    occ[v]=o; tcol[i]=r;tcol[i+1]=g;tcol[i+2]=b;
    tidx[v]=ti; v++;
  };

  faces.forEach((face,fi)=>{
    const slot=face.slot;
    const isOcc=slot?.occ?1:0;
    const tier=slot?.tier;
    const tc=tier?hex3(TIER_COLOR[tier]||'#555'):[0.5,0.5,0.5];
    const ti=tier?TIER_ORDER.indexOf(tier):5;
    const vs=face.verts;
    const n0=triNorm(vs[0],vs[1],vs[2]);

    push(vs[0][0],vs[0][1],vs[0][2], n0[0],n0[1],n0[2], isOcc, tc[0],tc[1],tc[2], ti);
    push(vs[1][0],vs[1][1],vs[1][2], n0[0],n0[1],n0[2], isOcc, tc[0],tc[1],tc[2], ti);
    push(vs[2][0],vs[2][1],vs[2][2], n0[0],n0[1],n0[2], isOcc, tc[0],tc[1],tc[2], ti);
    t2f[t++]=fi;

    if(face.isQuad){
      const n1=triNorm(vs[0],vs[2],vs[3]);
      push(vs[0][0],vs[0][1],vs[0][2], n1[0],n1[1],n1[2], isOcc, tc[0],tc[1],tc[2], ti);
      push(vs[2][0],vs[2][1],vs[2][2], n1[0],n1[1],n1[2], isOcc, tc[0],tc[1],tc[2], ti);
      push(vs[3][0],vs[3][1],vs[3][2], n1[0],n1[1],n1[2], isOcc, tc[0],tc[1],tc[2], ti);
      t2f[t++]=fi;
    }
  });
  return {pos,norm,occ,tcol,tidx,t2f};
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3D
// ─────────────────────────────────────────────────────────────────────────────

class Scene3D {
  constructor(canvas){
    Object.assign(this,{
      canvas,T:null,G:null,renderer:null,scene:null,camera:null,
      panelMesh:null,gridLines:null,
      starMesh:null,coronaParticles:[],
      nebulaPoints:null,starfield:null,
      raycaster:null,triToFace:null,faceSlots:[],
      rot:{x:0.18,y:0},vel:{x:0,y:0},
      isDragging:false,touchStart:null,pinchDist:null,
      zoomTarget:26,zoomCurrent:26,
      animId:null,transitioning:false,
      onFaceClick:null,_h:{},
      _t0:Date.now(),_shaderUniforms:null,_gridUniforms:null,
    });
  }

  async init(THREE,GSAP){
    this.T=THREE; this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;

    // ── Renderer ──────────────────────────────────────────────────────────
    const r=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,logarithmicDepthBuffer:false,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(devicePixelRatio,2));
    r.setSize(W,H,false);
    r.setClearColor(0x00010c,1);
    r.toneMapping=THREE.ACESFilmicToneMapping;
    r.toneMappingExposure=1.25;
    this.renderer=r;

    // ── Scene ─────────────────────────────────────────────────────────────
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x00010c,0.012);
    this.camera=new THREE.PerspectiveCamera(42,W/H,0.1,800);
    this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();

    // ── Lights ────────────────────────────────────────────────────────────
    this.scene.add(new THREE.AmbientLight(0x04060f,4.0));

    this._starPointLight=new THREE.PointLight(0xfff3cc,12,60,1.5);
    this._starPointLight.position.set(0,0,0);
    this.scene.add(this._starPointLight);

    const coronaLight=new THREE.PointLight(0xff8800,4,40,2);
    coronaLight.position.set(0,0,0);
    this.scene.add(coronaLight);
    this._coronaLight=coronaLight;

    const fill=new THREE.DirectionalLight(0x1a2a6a,1.2);
    fill.position.set(-30,-12,-25); this.scene.add(fill);

    const rim=new THREE.PointLight(0x5500bb,1.0,100);
    rim.position.set(15,-20,22); this.scene.add(rim);

    // ── Build universe ────────────────────────────────────────────────────
    this._buildStarfield();
    this._buildNebula();
    this._buildStar();
    this._buildCoronaParticles();
    this._bindEvents();
    this._animate();
  }

  _buildStarfield(){
    const T=this.T, N=6000;
    const pos=new Float32Array(N*3), col=new Float32Array(N*3), sz=new Float32Array(N);
    for(let i=0;i<N;i++){
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      const r=100+Math.random()*250;
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2]=r*Math.cos(phi);
      const p=Math.random();
      if(p<0.25){ col[i*3]=0.6;col[i*3+1]=0.75;col[i*3+2]=1.0; }      // O-type blue
      else if(p<0.55){ col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.92; } // white
      else if(p<0.80){ col[i*3]=1.0;col[i*3+1]=0.88;col[i*3+2]=0.6; }  // orange
      else{ col[i*3]=1.0;col[i*3+1]=0.5;col[i*3+2]=0.35; }             // red giant
      sz[i]=0.08+Math.random()*0.28;
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.starfield=new T.Points(geo,new T.PointsMaterial({
      size:0.25,vertexColors:true,transparent:true,opacity:0.92,
      sizeAttenuation:true,depthWrite:false,
    }));
    this.scene.add(this.starfield);
  }

  _buildNebula(){
    const T=this.T, N=1800;
    const pos=new Float32Array(N*3), col=new Float32Array(N*3);
    const colors=[
      [0.5,0.1,0.9],[0.1,0.4,0.9],[0.9,0.2,0.4],[0.1,0.7,0.6],[0.8,0.5,0.1]
    ];
    for(let i=0;i<N;i++){
      // Gaussian distribution for cloud clusters
      const g=()=>{ let u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
      const cx=(Math.random()-0.5)*80, cy=(Math.random()-0.5)*50, cz=(Math.random()-0.5)*80;
      pos[i*3]=cx+g()*15; pos[i*3+1]=cy+g()*12; pos[i*3+2]=cz+g()*15;
      const c=colors[Math.floor(Math.random()*colors.length)];
      col[i*3]=c[0]*0.7; col[i*3+1]=c[1]*0.7; col[i*3+2]=c[2]*0.7;
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.nebulaPoints=new T.Points(geo,new T.PointsMaterial({
      size:1.8,vertexColors:true,transparent:true,opacity:0.12,
      sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending,
    }));
    this.scene.add(this.nebulaPoints);
  }

  _buildStar(){
    const T=this.T;
    // Animated star shader
    const mat=new T.ShaderMaterial({
      vertexShader:STAR_VERT, fragmentShader:STAR_FRAG,
      uniforms:{uTime:{value:0}},
      transparent:true, depthWrite:false,
      blending:T.AdditiveBlending, side:T.FrontSide,
    });
    this.starMesh=new T.Mesh(new T.SphereGeometry(STAR_R,48,48),mat);
    this.scene.add(this.starMesh);
    this._starUni=mat.uniforms;

    // Halo layers (additive spheres — fake bloom)
    const halos=[
      {r:STAR_R*1.4,col:0xfffff0,op:0.45},
      {r:STAR_R*2.2,col:0xffdd88,op:0.22},
      {r:STAR_R*3.5,col:0xff8800,op:0.10},
      {r:STAR_R*5.5,col:0x441100,op:0.055},
      {r:STAR_R*9.0,col:0x220800,op:0.025},
    ];
    this._halos=[];
    for(const h of halos){
      const m=new T.Mesh(
        new T.SphereGeometry(h.r,16,16),
        new T.MeshBasicMaterial({color:h.col,transparent:true,opacity:h.op,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending})
      );
      this.scene.add(m); this._halos.push(m);
    }
  }

  _buildCoronaParticles(){
    const T=this.T, N=800;
    const pos=new Float32Array(N*3), vel=new Float32Array(N*3), col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      // Random position on star surface
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      pos[i*3]=STAR_R*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=STAR_R*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2]=STAR_R*Math.cos(phi);
      // Velocity outward
      const speed=0.002+Math.random()*0.005;
      vel[i*3]=pos[i*3]*speed; vel[i*3+1]=pos[i*3+1]*speed; vel[i*3+2]=pos[i*3+2]*speed;
      // Color gradient: white→orange→transparent
      const t=Math.random();
      col[i*3]=1.0; col[i*3+1]=0.6+t*0.3; col[i*3+2]=0.2*t;
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos.slice(),3)); // displayed pos
    this._coronaGeo=geo;
    this._coronaPos=pos;
    this._coronaVel=vel;
    this._coronaLife=new Float32Array(N).map(()=>Math.random());

    geo.setAttribute('color',new T.BufferAttribute(col,3));
    const pts=new T.Points(geo,new T.PointsMaterial({
      size:0.12,vertexColors:true,transparent:true,opacity:0.7,
      sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending,
    }));
    this.scene.add(pts);
    this._coronaPts=pts;
  }

  _buildMesh(faces){
    const T=this.T;
    if(this.panelMesh){ this.scene.remove(this.panelMesh); this.panelMesh.geometry.dispose(); this.panelMesh.material.dispose(); this.panelMesh=null; }
    if(this.gridLines){ this.scene.remove(this.gridLines); this.gridLines.geometry.dispose(); this.gridLines.material.dispose(); this.gridLines=null; }
    if(!faces?.length) return;

    this.faceSlots=faces.map(f=>f.slot||null);
    const {pos,norm,occ,tcol,tidx,t2f}=buildBuffers(faces);
    this.triToFace=t2f;

    // ── Panel mesh — custom shader ─────────────────────────────────────────
    const geo=new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos,3));
    geo.setAttribute('normal',   new T.BufferAttribute(norm,3));
    geo.setAttribute('aOccupied',new T.BufferAttribute(occ,1));
    geo.setAttribute('aTierColor',new T.BufferAttribute(tcol,3));
    geo.setAttribute('aTierIdx', new T.BufferAttribute(tidx,1));

    const uni={uTime:{value:0},uTransition:{value:0}};
    this._shaderUniforms=uni;

    const mat=new T.ShaderMaterial({
      vertexShader:PANEL_VERT, fragmentShader:PANEL_FRAG,
      uniforms:uni, side:T.DoubleSide,
    });
    this.panelMesh=new T.Mesh(geo,mat);
    this.panelMesh.rotation.x=this.rot.x;
    this.panelMesh.rotation.y=this.rot.y;
    this.scene.add(this.panelMesh);

    // ── Grid lines — glowing seams ─────────────────────────────────────────
    const segs=[]; const LIFT=1.006;
    faces.forEach(f=>{
      const vs=f.verts, n=f.isQuad?4:3;
      for(let i=0;i<n;i++){
        const a=vs[i],b=vs[(i+1)%n];
        segs.push(a[0]*LIFT,a[1]*LIFT,a[2]*LIFT, b[0]*LIFT,b[1]*LIFT,b[2]*LIFT);
      }
    });
    const gGeo=new T.BufferGeometry();
    gGeo.setAttribute('position',new T.Float32BufferAttribute(segs,3));
    const gUni={uTime:{value:0}};
    this._gridUniforms=gUni;
    this.gridLines=new T.LineSegments(gGeo,new T.ShaderMaterial({
      vertexShader:GRID_VERT,fragmentShader:GRID_FRAG,
      uniforms:gUni,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    }));
    this.gridLines.rotation.x=this.rot.x;
    this.gridLines.rotation.y=this.rot.y;
    this.scene.add(this.gridLines);
  }

  setFaces(faces,animate=false){
    if(!animate||this.transitioning){ this._buildMesh(faces); return; }
    this.transitioning=true;
    const G=this.G;
    const doSwap=()=>{
      this._buildMesh(faces);
      if(this.panelMesh){
        this.panelMesh.scale.set(0,0,0);
        if(this.gridLines) this.gridLines.scale.set(0,0,0);
        G.to([this.panelMesh.scale,this.gridLines?.scale].filter(Boolean),{
          x:1,y:1,z:1,duration:0.6,ease:'back.out(1.5)',
          onComplete:()=>{this.transitioning=false;}
        });
      } else { this.transitioning=false; }
    };
    if(this.panelMesh){
      G.to([this.panelMesh.scale,this.gridLines?.scale].filter(Boolean),{
        x:0,y:0,z:0,duration:0.25,ease:'power3.in',onComplete:doSwap
      });
    } else { doSwap(); }
  }

  zoom(dy){ this.zoomTarget=Math.max(9,Math.min(55,this.zoomTarget+dy*0.012)); }

  handleClick(cx,cy){
    if(!this.panelMesh||!this.onFaceClick) return;
    const rect=this.canvas.getBoundingClientRect();
    const x=((cx-rect.left)/rect.width)*2-1, y=-((cy-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera({x,y},this.camera);
    const hits=this.raycaster.intersectObject(this.panelMesh);
    if(hits.length){ const fi=this.triToFace?.[hits[0].faceIndex]??hits[0].faceIndex; const slot=this.faceSlots[fi]; if(slot) this.onFaceClick(slot); }
  }

  _bindEvents(){
    const c=this.canvas, h=this._h;
    let lx=0,ly=0,moved=false;
    h.md=e=>{ this.isDragging=true;moved=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0}; };
    h.mm=e=>{
      if(!this.isDragging)return;
      const dx=e.clientX-lx,dy=e.clientY-ly;
      if(Math.abs(dx)>1||Math.abs(dy)>1)moved=true;
      this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;
      this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));
      this.vel={x:dx*0.004,y:dy*0.004};lx=e.clientX;ly=e.clientY;
    };
    h.mu=e=>{ if(!moved)this.handleClick(e.clientX,e.clientY); this.isDragging=false; };
    c.addEventListener('mousedown',h.md);
    window.addEventListener('mousemove',h.mm);
    window.addEventListener('mouseup',h.mu);

    h.ts=e=>{
      if(e.touches.length===1){ this.isDragging=true;moved=false;lx=e.touches[0].clientX;ly=e.touches[0].clientY;this.touchStart={x:lx,y:ly};this.pinchDist=null; }
      else if(e.touches.length===2){ this.isDragging=false; const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY; this.pinchDist=Math.sqrt(dx*dx+dy*dy); }
    };
    h.tm=e=>{
      e.preventDefault();
      if(e.touches.length===1&&this.isDragging){ const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly; if(Math.abs(dx)>2||Math.abs(dy)>2)moved=true; this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.touches[0].clientX;ly=e.touches[0].clientY; }
      else if(e.touches.length===2&&this.pinchDist!=null){ const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY; const d=Math.sqrt(dx*dx+dy*dy); this.zoom((this.pinchDist-d)*3); this.pinchDist=d; }
    };
    h.te=e=>{ if(e.changedTouches.length===1&&!moved&&this.touchStart)this.handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY); this.isDragging=false; };
    c.addEventListener('touchstart',h.ts,{passive:false});
    c.addEventListener('touchmove',h.tm,{passive:false});
    c.addEventListener('touchend',h.te);
  }

  _animate(){
    this.animId=requestAnimationFrame(()=>this._animate());
    const t=(Date.now()-this._t0)*0.001;

    if(!this.isDragging){
      this.rot.y+=this.vel.x; this.rot.x+=this.vel.y;
      this.vel.x*=0.935; this.vel.y*=0.935;
      this.rot.y+=0.0005;
    }
    const rx=this.rot.x, ry=this.rot.y;
    if(this.panelMesh){ this.panelMesh.rotation.x=rx; this.panelMesh.rotation.y=ry; }
    if(this.gridLines){ this.gridLines.rotation.x=rx; this.gridLines.rotation.y=ry; }

    // Update panel shader time
    if(this._shaderUniforms) this._shaderUniforms.uTime.value=t;
    if(this._gridUniforms)   this._gridUniforms.uTime.value=t;
    if(this._starUni)        this._starUni.uTime.value=t;

    // Star pulsation
    const starPulse=1+Math.sin(t*0.85)*0.18+Math.sin(t*2.1)*0.06;
    if(this._starPointLight) this._starPointLight.intensity=12*starPulse;
    if(this._coronaLight)    this._coronaLight.intensity=4*starPulse;
    this._halos?.forEach((h,i)=>{ h.scale.setScalar(1+Math.sin(t*0.4+i*0.8)*0.03); });

    // Animate corona particles
    if(this._coronaPos&&this._coronaGeo){
      const p=this._coronaPos, v=this._coronaVel, l=this._coronaLife;
      const N=p.length/3;
      const dp=this._coronaGeo.getAttribute('position');
      for(let i=0;i<N;i++){
        l[i]+=0.003+Math.random()*0.002;
        if(l[i]>1){ l[i]=0; const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1); p[i*3]=STAR_R*Math.sin(ph)*Math.cos(th);p[i*3+1]=STAR_R*Math.sin(ph)*Math.sin(th);p[i*3+2]=STAR_R*Math.cos(ph); }
        const fade=1-l[i];
        dp.array[i*3]=p[i*3]+v[i*3]*l[i]*60;
        dp.array[i*3+1]=p[i*3+1]+v[i*3+1]*l[i]*60;
        dp.array[i*3+2]=p[i*3+2]+v[i*3+2]*l[i]*60;
        // Implicit opacity via scale would need instancedMesh; we just move them
      }
      dp.needsUpdate=true;
    }

    // Nebula drift
    if(this.nebulaPoints){ this.nebulaPoints.rotation.y=t*0.0005; this.nebulaPoints.rotation.x=Math.sin(t*0.0002)*0.02; }
    if(this.starfield){ this.starfield.rotation.y=t*0.0008; this.starfield.rotation.x=Math.sin(t*0.0001)*0.015; }

    // Smooth zoom
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.06;
    this.camera.position.z=this.zoomCurrent;

    this.renderer.render(this.scene,this.camera);
  }

  resize(){
    const W=this.canvas.clientWidth,H=this.canvas.clientHeight;
    if(!W||!H)return;
    this.camera.aspect=W/H; this.camera.updateProjectionMatrix();
    this.renderer.setSize(W,H,false);
  }

  destroy(){
    cancelAnimationFrame(this.animId);
    const h=this._h;
    this.canvas.removeEventListener('mousedown',h.md); window.removeEventListener('mousemove',h.mm); window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts); this.canvas.removeEventListener('touchmove',h.tm); this.canvas.removeEventListener('touchend',h.te);
    [this.panelMesh,this.gridLines].forEach(m=>{ if(m){m.geometry?.dispose();m.material?.dispose();} });
    this.renderer?.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS — Ultra-premium 2026
// ─────────────────────────────────────────────────────────────────────────────

/** Floating glassmorphism pill */
const Glass = ({children,style={},...p}) => (
  <div style={{
    background:'rgba(4,6,22,0.72)',backdropFilter:'blur(20px) saturate(180%)',
    border:'1px solid rgba(160,180,255,0.10)',borderRadius:40,
    boxShadow:'0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
    ...style,
  }} {...p}>{children}</div>
);

const LevelDots = memo(function LevelDots({level,onLevel}){
  return (
    <Glass style={{
      position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',
      display:'flex',alignItems:'center',gap:4,padding:'6px 12px',zIndex:30,
    }}>
      {LEVELS.map(lv=>{
        const act=lv.n===level;
        const tc=act?U.accent:'rgba(200,210,255,0.20)';
        return(
          <button key={lv.n} onClick={()=>onLevel(lv.n)}
            title={`${lv.icon} ${lv.name}`}
            style={{
              width:act?32:18,height:act?32:18,borderRadius:'50%',
              border:`1.5px solid ${tc}`,
              background:act?`rgba(212,168,75,0.15)`:'transparent',
              color:tc,fontSize:act?11:8,fontWeight:700,
              cursor:'pointer',
              transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:F.b,padding:0,flexShrink:0,
              boxShadow:act?`0 0 18px ${U.accent}80,0 0 6px ${U.accent}40`:'none',
              outline:'none',
            }}
          >{act?lv.icon:lv.n}</button>
        );
      })}
    </Glass>
  );
});

const Legend = memo(function Legend({level,faceCount,occCount}){
  return(
    <div style={{position:'absolute',top:12,right:12,zIndex:30,display:'flex',flexDirection:'column',gap:3,alignItems:'flex-end'}}>
      {level>0&&(
        <Glass style={{padding:'6px 14px',marginBottom:6,borderRadius:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:U.accent,fontSize:11,fontWeight:800,fontFamily:F.h,letterSpacing:'0.06em'}}>
              {LEVELS[level]?.icon} {LEVELS[level]?.name}
            </span>
            <span style={{width:1,height:12,background:'rgba(255,255,255,0.1)'}}/>
            <span style={{color:U.muted,fontSize:10,fontFamily:F.b}}>{faceCount} panneaux</span>
            {occCount>0&&<><span style={{width:1,height:12,background:'rgba(255,255,255,0.1)'}}/>
            <span style={{color:'#44ff99',fontSize:10,fontFamily:F.b,fontWeight:600}}>◉ {occCount} actifs</span></>}
          </div>
        </Glass>
      )}
      {TIER_ORDER.filter(t=>TIER_COLOR[t]).map(tier=>{
        const col=TIER_COLOR[tier];
        return(
          <Glass key={tier} style={{padding:'4px 11px',borderRadius:20,border:`1px solid ${col}18`}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:6,height:6,borderRadius:2,background:col,boxShadow:`0 0 8px ${col}`,flexShrink:0}}/>
              <span style={{color:'rgba(220,225,255,0.40)',fontSize:9,fontWeight:600,letterSpacing:'0.04em'}}>{TIER_LABEL[tier]}</span>
              <span style={{color:col,fontSize:9,fontWeight:700,fontFamily:F.b}}>€{fmt(tier)}/j</span>
            </div>
          </Glass>
        );
      })}
    </div>
  );
});

function HintBar({visible}){
  return(
    <div style={{
      position:'absolute',bottom:72,left:'50%',transform:'translateX(-50%)',
      opacity:visible?0.45:0,transition:'opacity 1.5s ease',
      color:'rgba(200,210,255,0.8)',fontSize:10,letterSpacing:'0.08em',
      fontFamily:F.b,pointerEvents:'none',whiteSpace:'nowrap',
      textShadow:'0 0 20px rgba(100,150,255,0.5)',
    }}>
      ↕ molette = zoom &nbsp;·&nbsp; ⊙ glisser = rotation &nbsp;·&nbsp; clic = détails
    </div>
  );
}

function BlockOverlay({slot,onClose,onRent,onBuyout}){
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{ requestAnimationFrame(()=>setMounted(true)); },[]);

  if(!slot)return null;
  const col=TIER_COLOR[slot.tier]||U.accent;
  const label=TIER_LABEL[slot.tier]||slot.tier;

  return(
    <div onClick={onClose} style={{
      position:'absolute',inset:0,zIndex:50,
      background:'rgba(0,1,15,0.75)',backdropFilter:'blur(24px) saturate(150%)',
      display:'flex',alignItems:'center',justifyContent:'center',
      opacity:mounted?1:0,transition:'opacity 0.3s ease',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:300,borderRadius:24,overflow:'hidden',
        background:'linear-gradient(145deg,rgba(6,8,28,0.98),rgba(3,4,18,0.99))',
        border:`1px solid ${col}22`,
        boxShadow:`0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${col}18, 0 0 120px ${col}0c, 0 40px 100px rgba(0,0,0,0.95)`,
        transform:mounted?'translateY(0) scale(1)':'translateY(20px) scale(0.97)',
        transition:'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Top accent bar with glow */}
        <div style={{height:3,background:`linear-gradient(90deg,transparent,${col},${col}88,transparent)`,
          boxShadow:`0 0 20px ${col}aa, 0 0 40px ${col}44`}}/>

        <div style={{padding:'22px 24px 26px'}}>
          {/* Row 1: badge + close */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:7,
              padding:'5px 13px',borderRadius:22,
              background:`${col}12`,border:`1px solid ${col}28`,
              boxShadow:`0 0 16px ${col}18`}}>
              <div style={{width:6,height:6,borderRadius:2,background:col,boxShadow:`0 0 8px ${col}`}}/>
              <span style={{color:col,fontSize:10,fontWeight:800,letterSpacing:'0.08em',fontFamily:F.b}}>{label}</span>
            </div>
            <button onClick={onClose} style={{
              width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
              background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
              color:'rgba(200,210,255,0.5)',fontSize:16,cursor:'pointer',outline:'none',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='rgba(200,210,255,0.5)'; }}
            >×</button>
          </div>

          {/* Panel icon */}
          <div style={{
            width:64,height:64,borderRadius:16,marginBottom:18,
            background:slot.occ
              ?`linear-gradient(135deg,${col}22,${col}0a)`
              :'rgba(255,255,255,0.02)',
            border:`1.5px solid ${col}${slot.occ?'44':'18'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:24,fontWeight:900,color:col,fontFamily:F.h,
            boxShadow:slot.occ?`0 0 32px ${col}30, inset 0 0 20px ${col}10`:'none',
          }}>
            {slot.tenant?.l||(slot.occ?'◉':'○')}
          </div>

          <div style={{color:U.text,fontSize:15,fontWeight:700,fontFamily:F.h,marginBottom:6,lineHeight:1.3}}>
            {slot.occ?(slot.tenant?.name||`Panneau ${label}`):`Panneau ${label} disponible`}
          </div>
          <div style={{color:U.muted,fontSize:11,marginBottom:20,fontFamily:F.b,lineHeight:1.6}}>
            {slot.occ
              ?(slot.tenant?.cta||'Panneau actif sur la Dyson Sphere')
              :`Visible depuis tout l'univers · À partir de €${fmt(slot.tier)}/jour`}
          </div>

          {/* Price display */}
          <div style={{
            display:'flex',alignItems:'baseline',gap:5,marginBottom:22,
            padding:'12px 16px',borderRadius:14,
            background:`${col}08`,border:`1px solid ${col}15`,
          }}>
            <span style={{color:col,fontSize:28,fontWeight:800,fontFamily:F.h,lineHeight:1}}>€{fmt(slot.tier)}</span>
            <span style={{color:U.muted,fontSize:11,fontFamily:F.b}}>/jour</span>
            <span style={{marginLeft:'auto',color:'rgba(255,255,255,0.18)',fontSize:9,fontFamily:F.b,letterSpacing:'0.06em'}}>
              DYSON·SPHERE
            </span>
          </div>

          {/* CTA */}
          {!slot.occ?(
            <button onClick={()=>onRent(slot)} style={{
              width:'100%',padding:'14px',borderRadius:14,
              background:`linear-gradient(135deg,${col} 0%,${col}cc 50%,${col}88 100%)`,
              border:'none',color:'#050505',fontSize:13,fontWeight:800,fontFamily:F.b,cursor:'pointer',
              boxShadow:`0 0 30px ${col}55, 0 12px 30px rgba(0,0,0,0.6)`,
              letterSpacing:'0.02em',outline:'none',
              transition:'all 0.2s ease',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 0 40px ${col}77, 0 16px 40px rgba(0,0,0,0.7)`; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=`0 0 30px ${col}55, 0 12px 30px rgba(0,0,0,0.6)`; }}
            >
              Réserver ce panneau →
            </button>
          ):(
            <button onClick={()=>onBuyout(slot)} style={{
              width:'100%',padding:'14px',borderRadius:14,
              background:'rgba(255,255,255,0.03)',
              border:`1px solid ${col}22`,color:'rgba(200,210,255,0.45)',
              fontSize:12,fontWeight:600,fontFamily:F.b,cursor:'pointer',outline:'none',
              transition:'all 0.2s',letterSpacing:'0.02em',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background=`${col}0f`; e.currentTarget.style.color=col; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.color='rgba(200,210,255,0.45)'; }}
            >
              Faire une offre de rachat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function View3D({
  slots=[],isLive=false,
  onGoAdvertiser,onWaitlist,onCheckout,onBuyout,
  ExistingPublicView,
}){
  const canvasRef=useRef(null), sceneRef=useRef(null);
  const [level,setLevel]=useState(1);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [focusSlot,setFocusSlot]=useState(null);
  const [hint,setHint]=useState(true);

  const sorted=useMemo(()=>sortSlots(slots),[slots]);

  const assignedFaces=useMemo(()=>{
    if(level===0)return[];
    return sortByPole(getFacesForLevel(level)).map((f,i)=>({...f,slot:sorted[i]||null}));
  },[level,sorted]);

  const occCount=useMemo(()=>assignedFaces.filter(f=>f.slot?.occ).length,[assignedFaces]);

  // Hide hint after 6s
  useEffect(()=>{ const t=setTimeout(()=>setHint(false),6000); return()=>clearTimeout(t); },[]);

  // Init Three.js
  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let sc;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([T,G])=>{ sc=new Scene3D(canvasRef.current); sceneRef.current=sc; sc.onFaceClick=s=>setFocusSlot(s); return sc.init(T,G); })
      .then(()=>{ sceneRef.current.setFaces(assignedFaces,false); setLoading(false); })
      .catch(e=>{ console.error(e); setError('npm install three gsap'); setLoading(false); });
    return()=>{ if(sc)sc.destroy(); sceneRef.current=null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{ if(!sceneRef.current||level===0)return; sceneRef.current.setFaces(assignedFaces,true); },[assignedFaces,level]);

  useEffect(()=>{
    const fn=e=>{
      if(e.key>='0'&&e.key<='6')setLevel(+e.key);
      else if(e.key==='ArrowRight'||e.key==='ArrowUp')setLevel(l=>Math.min(6,l+1));
      else if(e.key==='ArrowLeft'||e.key==='ArrowDown')setLevel(l=>Math.max(1,l-1));
      else if(e.key==='Escape')setFocusSlot(null);
    };
    window.addEventListener('keydown',fn);
    return()=>window.removeEventListener('keydown',fn);
  },[]);

  useEffect(()=>{
    const fn=e=>{ e.preventDefault(); sceneRef.current?.zoom(e.deltaY); };
    const c=canvasRef.current;
    if(c)c.addEventListener('wheel',fn,{passive:false});
    return()=>{ if(c)c.removeEventListener('wheel',fn); };
  },[level]);

  useEffect(()=>{
    if(!canvasRef.current)return;
    const ro=new ResizeObserver(()=>sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return()=>ro.disconnect();
  },[]);

  const goLevel=useCallback(n=>{ setFocusSlot(null); setLevel(n); },[]);

  // ── Level 0 : 2D ───────────────────────────────────────────────────────────
  if(level===0){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <button onClick={()=>goLevel(1)} style={{
          position:'absolute',top:10,right:10,zIndex:100,
          display:'flex',alignItems:'center',gap:8,padding:'8px 18px',borderRadius:22,
          background:'rgba(0,1,15,0.92)',border:`1px solid ${U.accent}40`,
          backdropFilter:'blur(16px)',color:U.accent,fontSize:11,fontWeight:700,cursor:'pointer',
          fontFamily:F.b,boxShadow:`0 0 28px ${U.accent}25,0 0 80px ${U.accent}0a`,
          letterSpacing:'0.04em',outline:'none',transition:'all 0.2s',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 0 40px ${U.accent}45,0 0 100px ${U.accent}15`; }}
        onMouseLeave={e=>{ e.currentTarget.style.boxShadow=`0 0 28px ${U.accent}25,0 0 80px ${U.accent}0a`; }}
        >◎ Dyson Sphere 3D</button>
        {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
      </div>
    );
  }

  // ── Levels 1–6 : Three.js ─────────────────────────────────────────────────
  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:U.bg}}>
      <canvas ref={canvasRef} style={{
        width:'100%',height:'100%',display:'block',outline:'none',
        cursor:focusSlot?'default':'grab',
        opacity:loading?0:1,transition:'opacity 0.8s ease',
      }}/>

      {/* Loading — animated dyson ring */}
      {loading&&!error&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:U.bg}}>
          <div style={{position:'relative',width:60,height:60}}>
            <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'1.5px solid rgba(180,200,255,0.08)',borderTopColor:U.accent,animation:'dysonSpin 1.2s cubic-bezier(0.4,0,0.2,1) infinite'}}/>
            <div style={{position:'absolute',inset:8,borderRadius:'50%',border:'1.5px solid rgba(180,200,255,0.05)',borderBottomColor:'rgba(212,168,75,0.5)',animation:'dysonSpin 2s cubic-bezier(0.4,0,0.2,1) infinite reverse'}}/>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#fffbe0',boxShadow:'0 0 16px #ffcc44, 0 0 40px #ff8800, 0 0 80px #ff440044'}}/>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{color:U.accent,fontSize:11,fontWeight:700,letterSpacing:'0.16em',fontFamily:F.h}}>DYSON SPHERE</div>
            <div style={{color:U.muted,fontSize:9,letterSpacing:'0.12em',fontFamily:F.b}}>INITIALISATION EN COURS…</div>
          </div>
        </div>
      )}

      {error&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:24,background:U.bg}}>
          <div style={{color:U.err,fontSize:13,fontWeight:700}}>⚠ {error}</div>
          <button onClick={()=>goLevel(0)} style={{padding:'10px 22px',borderRadius:12,background:U.accent,border:'none',color:U.accentFg,fontWeight:700,cursor:'pointer',fontFamily:F.b}}>
            Revenir à la grille 2D
          </button>
        </div>
      )}

      {/* Top-left : retour 2D */}
      <Glass style={{position:'absolute',top:12,left:12,zIndex:30}}>
        <button onClick={()=>goLevel(0)} style={{
          display:'flex',alignItems:'center',gap:6,padding:'7px 14px',
          background:'none',border:'none',color:U.muted,fontSize:10,fontWeight:600,
          cursor:'pointer',fontFamily:F.b,letterSpacing:'0.04em',outline:'none',
          transition:'color 0.15s',
        }}
        onMouseEnter={e=>e.currentTarget.style.color=U.text}
        onMouseLeave={e=>e.currentTarget.style.color=U.muted}
        >◫ Vue 2D</button>
      </Glass>

      {/* Top-right : légende */}
      <Legend level={level} faceCount={LEVELS[level]?.faces||0} occCount={occCount}/>

      {/* Bottom : dots de niveau */}
      <LevelDots level={level} onLevel={goLevel}/>

      {/* Hint */}
      <HintBar visible={hint&&!loading}/>

      {/* Overlay bloc */}
      {focusSlot&&(
        <BlockOverlay slot={focusSlot}
          onClose={()=>setFocusSlot(null)}
          onRent={s=>{ setFocusSlot(null); onCheckout?.(s); }}
          onBuyout={s=>{ setFocusSlot(null); onBuyout?.(s); }}
        />
      )}

      <style>{`
        @keyframes dysonSpin { to { transform:rotate(360deg); } }
        * { -webkit-font-smoothing:antialiased; }
      `}</style>
    </div>
  );
}
