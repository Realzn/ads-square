'use client';
/**
 * ADS·SQUARE — DYSON SPHERE MARKETING COSMOS EDITION
 * Étoile centrale = source d'énergie absolue (Épicentre)
 * Prestige  = Capteurs Primaires or/rose — extrusion max, plasma hexagonal
 * Elite     = Cristaux Énergétiques violets — grille cristalline
 * Business  = Relais Technologiques cyan — grille tech propre
 * Standard  = Émetteurs discrets bleus
 * Viral     = 671 drones orbitaux verts (particules WebGL orbitales)
 * Rings     = Anneaux décoratifs or (Prestige) + violet (Elite)
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

const DS = {
  void:'#080A0F',deep:'#0B0D14',abyss:'#060709',
  glass:'rgba(8,10,18,0.76)',glassHi:'rgba(10,14,26,0.90)',
  glassBrd:'rgba(255,255,255,0.055)',glassBrdHi:'rgba(255,255,255,0.11)',
  cyan:'#00E5FF',violet:'#9D50FF',gold:'#FFB700',green:'#00FF94',rose:'#FF3D72',
  textHi:'#EEF2FF',textMid:'rgba(200,212,248,0.72)',textLo:'rgba(140,162,220,0.38)',
  err:'#FF3D5A',live:'#00FF94',
};

const TIER_NEON = {
  epicenter:'#FFB700',prestige:'#FF5E9C',elite:'#9D50FF',
  business:'#00D4FF',standard:'#38BEFF',viral:'#00FF94',
};

const TIER_ROLE = {
  epicenter:{ icon:'☀', role:'Source Absolue', desc:"L'étoile. Visibilité cosmos totale, marque gravée dans la sphère pour toujours." },
  prestige: { icon:'◈', role:'Capteurs Primaires', desc:'Les plus proches de l\'étoile. ROI maximal, audience premium, présence dominante.' },
  elite:    { icon:'◆', role:'Cristaux Énergétiques', desc:'Zone d\'élite. Exposition différenciée avec rendu cristallin unique.' },
  business: { icon:'▣', role:'Relais Technologiques', desc:'Réseau solide. Présence garantie sur la sphère, trafic qualifié constant.' },
  standard: { icon:'▪', role:'Émetteurs Standard', desc:'Entrée sur la sphère. Visibilité globale à coût optimisé.' },
  viral:    { icon:'⚡', role:'Drones Orbitaux', desc:'Les petites mains. Micro-tâches marketing en échange d\'énergie sphérique.' },
};

const F = { ui:"'Sora','DM Sans',system-ui,sans-serif", mono:"'JetBrains Mono','Fira Code',monospace" };

const TIER_ORDER  = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_TOTALS = { epicenter:1,prestige:8,elite:50,business:176,standard:400,viral:671 };
const LEVELS = [
  {n:0,name:'GRID 2D',icon:'▦',faces:0},{n:1,name:'CUBE',icon:'⬡',faces:6},
  {n:2,name:'OCTA',icon:'◆',faces:8},{n:3,name:'ICO',icon:'⬟',faces:20},
  {n:4,name:'SPHERE·I',icon:'◎',faces:80},{n:5,name:'SPHERE·II',icon:'◉',faces:320},
  {n:6,name:'COSMOS',icon:'✦',faces:1280},
];

const SPHERE_R=5.8, PANEL_GAP=0.82, STAR_R=1.1;
const fmt=t=>((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const hex3=h=>{const s=(h||'#08f').replace('#','');return[parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255];};

// ── GLSL: Vertex — extrusion hiérarchique par tier ────────────────────────────
const PANEL_VERT=`
precision highp float;
attribute float aOccupied; attribute vec3 aTierColor; attribute float aTierIdx; attribute float aFaceIdx; attribute vec3 aBary;
uniform float uTime,uHovered,uSelected;
varying vec3 vN,vWP; varying float vOcc,vTI,vFI,vFresnel,vHov,vSel; varying vec3 vTC,vBary;
void main(){
  vN=normalize(normalMatrix*normal);
  vec4 wp=modelMatrix*vec4(position,1.0); vWP=wp.xyz;
  vTI=aTierIdx; vOcc=aOccupied; vTC=aTierColor; vFI=aFaceIdx; vBary=aBary;
  vHov=step(abs(aFaceIdx-uHovered),0.5); vSel=step(abs(aFaceIdx-uSelected),0.5);
  vec3 vd=normalize(cameraPosition-wp.xyz);
  vFresnel=pow(clamp(1.0-abs(dot(vN,vd)),0.0,1.0),3.2);
  vec3 pos=position;
  // Extrusion hiérarchique — tiers premium ressortent de la sphère
  float extrude=0.0;
  if(aTierIdx<0.5)      extrude=0.42;
  else if(aTierIdx<1.5) extrude=0.25;
  else if(aTierIdx<2.5) extrude=0.14;
  else if(aTierIdx<3.5) extrude=0.06;
  if(vSel>0.5) pos+=normalize(position)*(extrude+0.24+0.07*sin(uTime*3.5));
  else if(vHov>0.5) pos+=normalize(position)*(extrude+0.11);
  else{
    pos+=normalize(position)*extrude;
    if(aTierIdx<0.5) pos+=normalize(position)*0.055*sin(uTime*1.8);
    else if(aTierIdx<1.5) pos+=normalize(position)*0.022*sin(uTime*1.1+aFaceIdx*0.4);
  }
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
}`;

// ── GLSL: Fragment — fills différenciés par tier ──────────────────────────────
const PANEL_FRAG=`
precision highp float;
#extension GL_OES_standard_derivatives : enable
uniform float uTime;
varying vec3 vN,vWP; varying float vOcc,vTI,vFI,vFresnel,vHov,vSel; varying vec3 vTC,vBary;
float wire(float w){vec3 d=fwidth(vBary);vec3 a=smoothstep(vec3(0.0),d*w,vBary);return 1.0-min(min(a.x,a.y),a.z);}
float hash(float n){return fract(sin(n)*43758.5453);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float hexGrid(vec2 p,float s){p/=s;vec2 r=vec2(1.0,1.732);vec2 h=r*0.5;vec2 a=mod(p,r)-h;vec2 b=mod(p-h,r)-h;return min(dot(a,a),dot(b,b));}
float crystal(vec3 wp,float t){float a=sin(wp.x*4.2+t*0.5)*sin(wp.y*3.8-t*0.3)*sin(wp.z*4.0+t*0.4);return smoothstep(0.0,0.15,abs(a));}
float techGrid(vec3 wp){float gx=step(0.92,fract(wp.x*4.0));float gy=step(0.92,fract(wp.y*4.0));return max(gx,gy)*0.55;}
void main(){
  float t=uTime; bool hov=vHov>0.5,sel=vSel>0.5;
  int ti=int(vTI+0.5);
  float wCore=wire(0.55),wBloom=wire(3.5),wAura=wire(8.5);
  float seed=hash(vFI*11.3+3.7);
  float pulse=0.68+0.32*sin(t*(0.5+vFI*0.0001)+seed*6.28);
  // Intensité glow par tier
  float tg=ti==0?2.9:(ti==1?2.1:(ti==2?1.65:(ti==3?1.25:(ti==4?0.88:0.55))));
  if(vOcc>0.5){
    float sc=step(0.95,fract(vWP.y*16.0-t*1.2))*0.22;
    float fb=0.0; vec3 pc=vTC;
    if(ti==0){float pl=hash2(vWP.xz*3.0+t*0.2)*0.4+hash2(vWP.yx*2.0-t*0.15)*0.3;fb=0.25+pl*0.38;pc=mix(vTC,vec3(1.0,0.4,0.0),0.4+pl*0.3);}
    else if(ti==1){float hx=hexGrid(vWP.xy,0.25);float hl=smoothstep(0.06,0.0,hx)*0.55;fb=0.07+hl*0.42+sc*0.5;pc=mix(vTC,vec3(1.0,0.6,0.8),hl*0.6);}
    else if(ti==2){float cr=crystal(vWP,t);fb=0.06+cr*0.32+sc*0.3;pc=mix(vTC,vec3(0.8,0.5,1.0),cr*0.5);}
    else if(ti==3){float tg2=techGrid(vWP);fb=0.05+tg2*0.28+sc*0.2;}
    else{fb=0.05+sc*0.15;}
    vec3 fill=pc*fb*pulse; float fa=0.07+vFresnel*0.14+fb*0.2;
    float wi,bi,ai;
    if(sel){wi=wCore*1.0*tg;bi=wBloom*0.5;ai=wAura*0.14;
      vec3 g2=ti==0?vec3(1.0,0.8,0.1):vec3(1.0,0.9,0.3);
      gl_FragColor=vec4(fill+vTC*wi+g2*bi+g2*ai+vTC*pow(vFresnel,1.4)*2.0*pulse,clamp(fa+wi*0.7+bi*0.35,0.0,0.96));}
    else if(hov){wi=wCore*0.9*tg;bi=wBloom*0.38;ai=wAura*0.10;
      gl_FragColor=vec4(fill+vTC*wi*1.6+vTC*bi+vTC*ai+vTC*pow(vFresnel,1.6)*1.4*pulse,clamp(fa+wi*0.65+bi*0.28,0.0,0.92));}
    else{wi=wCore*(0.55+0.35*pulse)*tg;bi=wBloom*0.22;ai=wAura*0.06;
      gl_FragColor=vec4(fill+vTC*wi+vTC*bi+vTC*ai+vTC*pow(vFresnel,2.0)*1.0*pulse,clamp(fa+wi*0.55+bi*0.20,0.0,0.88));}
  } else {
    vec3 ghost;
    if(ti==0) ghost=vec3(1.0,0.7,0.0);
    else if(ti==1) ghost=vec3(1.0,0.37,0.6);
    else if(ti==2) ghost=vec3(0.62,0.31,1.0);
    else if(ti==3) ghost=vec3(0.0,0.83,1.0);
    else if(ti==4) ghost=vec3(0.22,0.75,1.0);
    else ghost=vec3(0.0,1.0,0.58);
    float str=sel?0.9:(hov?0.6:(0.13+0.09*float(ti<3)));
    float wi=wCore*str*tg,bi=wBloom*str*0.3;
    float tv=fract(vWP.y*1.3-t*0.45);
    float sp2=pow(smoothstep(0.0,0.05,tv)*smoothstep(0.12,0.05,tv),2.0)*0.45;
    if(hov||sel) ghost=mix(ghost,vec3(0.6,1.0,0.95),0.3);
    gl_FragColor=vec4(ghost*(wi+bi)+ghost*sp2*(hov?0.5:0.18),clamp(0.011+vFresnel*0.04+wi*0.55+bi*0.18+sp2*0.14,0.0,0.88));
  }
}`;

// ── Edges avec tier glow ──────────────────────────────────────────────────────
const EDGE_VERT=`
precision highp float;
attribute float aOcc; attribute vec3 aTC; attribute float aFI; attribute float aTI;
uniform float uHovered,uSelected;
varying float vOcc,vHov,vSel,vPY,vTI; varying vec3 vTC;
void main(){
  vOcc=aOcc;vTC=aTC;vPY=position.y;vTI=aTI;
  vHov=step(abs(aFI-uHovered),0.5);vSel=step(abs(aFI-uSelected),0.5);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const EDGE_FRAG=`
precision highp float;
uniform float uTime;
varying float vOcc,vHov,vSel,vPY,vTI; varying vec3 vTC;
void main(){
  float t=uTime; int ti=int(vTI+0.5);
  float tg=ti==0?3.2:(ti==1?2.5:(ti==2?1.9:(ti==3?1.35:(ti==4?0.9:0.55))));
  float tv=fract(vPY*0.95-t*0.52);
  float sp=pow(smoothstep(0.0,0.055,tv)*smoothstep(0.13,0.055,tv),2.0);
  float pulse=0.60+0.40*sin(t*1.1+vPY*2.5);
  if(vSel>0.5){vec3 g=ti==0?vec3(1.0,0.80,0.08):vec3(1.0,0.82,0.3);gl_FragColor=vec4(g*(0.9+0.1*sin(t*5.0+vPY*6.0))*3.5+g*sp*3.0,0.99);}
  else if(vHov>0.5){vec3 cc=vOcc>0.5?vTC*2.0:vec3(0.2,0.96,1.0);gl_FragColor=vec4(cc*(0.85+0.15*sin(t*3.0+vPY*4.5))*tg+cc*sp,0.93);}
  else if(vOcc>0.5){gl_FragColor=vec4(vTC*pulse*tg+vTC*sp*tg*0.7,0.55+sp*0.40);}
  else{float a=(ti<3)?0.25:0.13;gl_FragColor=vec4(vTC*pulse*tg*1.5+vTC*sp,a*pulse+sp*0.22);}
}`;

// ── Étoile solaire plasma ─────────────────────────────────────────────────────
const STAR_VERT=`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const STAR_FRAG=`
precision highp float;
uniform float uTime; varying vec2 vU;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*h2(p);p*=2.2;a*=0.48;}return v;}
void main(){
  vec2 uv=vU*2.0-1.0;float r=length(uv);if(r>1.0)discard;
  vec2 uv2=uv+vec2(sin(uTime*0.28)*0.10,cos(uTime*0.22)*0.08);
  float t=fbm(uv2*4.5+uTime*0.18)+fbm(uv2*8.5-uTime*0.11)*0.45;
  float core=1.0-smoothstep(0.0,0.60,r),edge=1.0-smoothstep(0.50,1.0,r);
  float angle=atan(uv.y,uv.x);
  float ray=pow(max(0.0,sin(angle*8.0+uTime*1.2)*0.5+0.5),3.0)*0.3;
  vec3 plasma=mix(vec3(0.96,0.18,0.0),vec3(1.0,0.70,0.08),core+t*0.4);
  plasma=mix(plasma,vec3(1.0,0.98,0.80),core*core);
  plasma+=vec3(1.0,0.5,0.0)*ray*edge*0.5;
  gl_FragColor=vec4(plasma*4.8,edge*(0.92+t*0.08));
}`;

// ── Anneau ornemental ─────────────────────────────────────────────────────────
const RING_VERT=`varying float vA;void main(){vA=atan(position.z,position.x);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const RING_FRAG=`
precision highp float;
uniform float uTime; uniform vec3 uCol; uniform float uAlpha; varying float vA;
void main(){
  float pulse=0.55+0.45*sin(uTime*1.2+vA*3.0);
  float tv=fract(vA/6.28318+uTime*0.12);
  float sp=pow(smoothstep(0.0,0.06,tv)*smoothstep(0.14,0.06,tv),2.0);
  gl_FragColor=vec4(uCol*(pulse*1.8+sp*3.2),uAlpha*(pulse*0.65+sp*0.85+0.18));
}`;

// ── Viral swarm — drones orbitaux ─────────────────────────────────────────────
const VIRAL_VERT=`
precision highp float;
attribute float aPhase,aSpeed,aAxis,aRadius;
uniform float uTime;
varying float vBright;
void main(){
  float t=uTime*aSpeed+aPhase;
  float ca=cos(aAxis),sa=sin(aAxis),co=cos(t),si=sin(t);
  // Orbites inclinées + rayon variable
  float r=aRadius*(1.0+0.12*sin(t*1.7+aPhase));
  vec3 pos=vec3(co*ca-si*sa*0.35,si*0.75,co*sa+si*ca*0.35)*r;
  vBright=0.45+0.55*sin(t*2.3+aPhase*5.0);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  gl_PointSize=clamp((1.5+vBright*2.8)*(280.0/gl_Position.w),1.0,7.0);
}`;
const VIRAL_FRAG=`
precision highp float; varying float vBright;
void main(){
  vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;
  float glow=1.0-d*2.0;
  vec3 col=mix(vec3(0.0,0.85,0.52),vec3(0.45,1.0,0.72),vBright);
  gl_FragColor=vec4(col*glow*2.8,glow*glow*(0.48+vBright*0.52));
}`;

// ── Géométrie ─────────────────────────────────────────────────────────────────
const ins=(vs,c,f)=>vs.map(v=>[c[0]+(v[0]-c[0])*f,c[1]+(v[1]-c[1])*f,c[2]+(v[2]-c[2])*f]);
const cN=vs=>[vs.reduce((s,v)=>s+v[0],0)/vs.length,vs.reduce((s,v)=>s+v[1],0)/vs.length,vs.reduce((s,v)=>s+v[2],0)/vs.length];
const mS=(a,b)=>{const m=a.map((c,i)=>(c+b[i])/2),l=Math.hypot(...m);return m.map(c=>c/l);};
function buildCubeFaces(){const a=SPHERE_R/Math.sqrt(3);return[[[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],[[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],[[-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]],[[a,-a,-a],[-a,-a,-a],[-a,a,-a],[a,a,-a]],[[a,-a,a],[a,a,a],[a,a,-a],[a,-a,-a]],[[-a,-a,-a],[-a,a,-a],[-a,a,a],[-a,-a,a]]].map(vs=>{const c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:true};});}
function buildOctaFaces(){const R=SPHERE_R,v=[[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];return[[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]].map(fi=>{const vs=fi.map(i=>v[i]),c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:false};});}
function buildIcoFaces(sub){const phi=(1+Math.sqrt(5))/2;const rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(c=>c/l);});let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]].map(f=>f.map(i=>rv[i]));for(let s=0;s<sub;s++){const nx=[];for(const[a,b,c]of faces){const ab=mS(a,b),bc=mS(b,c),ca=mS(c,a);nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}faces=nx;}const R=SPHERE_R;return faces.map(([a,b,c])=>{const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];const cnt=cN(vs);return{verts:ins(vs,cnt,PANEL_GAP),centroid:cnt,isQuad:false};});}
function getFaces(n){switch(n){case 1:return buildCubeFaces();case 2:return buildOctaFaces();case 3:return buildIcoFaces(0);case 4:return buildIcoFaces(1);case 5:return buildIcoFaces(2);case 6:return buildIcoFaces(3);default:return[];}}

function buildPanelBufs(faces){
  let nT=0;for(const f of faces)nT+=f.isQuad?2:1;
  const pos=new Float32Array(nT*9),nrm=new Float32Array(nT*9),occ=new Float32Array(nT*3),tc=new Float32Array(nT*9),ti=new Float32Array(nT*3),fi=new Float32Array(nT*3),bary=new Float32Array(nT*9);
  const t2f=new Int32Array(nT);let v=0,t=0;
  const tn=(a,b,c)=>{const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l);};
  const push=(x,y,z,nx,ny,nz,o,r,g,b,tiv,fiv,bx,by,bz)=>{const i=v*3;pos[i]=x;pos[i+1]=y;pos[i+2]=z;nrm[i]=nx;nrm[i+1]=ny;nrm[i+2]=nz;occ[v]=o;tc[i]=r;tc[i+1]=g;tc[i+2]=b;ti[v]=tiv;fi[v]=fiv;bary[i]=bx;bary[i+1]=by;bary[i+2]=bz;v++;};
  faces.forEach((face,fI)=>{const s=face.slot;const isO=s?.occ?1:0;const tier=s?.tier;const rgb=hex3(tier?(TIER_NEON[tier]||TIER_COLOR[tier]||'#00E5FF'):'#00E5FF');const tiv=tier?TIER_ORDER.indexOf(tier):5;const vs=face.verts;const n0=tn(vs[0],vs[1],vs[2]);push(vs[0][0],vs[0][1],vs[0][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);push(vs[1][0],vs[1][1],vs[1][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);push(vs[2][0],vs[2][1],vs[2][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);t2f[t++]=fI;if(face.isQuad){const n1=tn(vs[0],vs[2],vs[3]);push(vs[0][0],vs[0][1],vs[0][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);push(vs[2][0],vs[2][1],vs[2][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);push(vs[3][0],vs[3][1],vs[3][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);t2f[t++]=fI;}});
  return{pos,nrm,occ,tc,ti,fi,bary,t2f};
}

function buildEdgeBufs(faces){
  const segs=[],occA=[],tcA=[],fiA=[],tiA=[];
  faces.forEach((face,fi)=>{const vs=face.verts,n=face.isQuad?4:3;const s=face.slot;const isO=s?.occ?1:0;const tier=s?.tier;const rgb=hex3(tier?(TIER_NEON[tier]||TIER_COLOR[tier]||'#00E5FF'):'#00E5FF');const tiv=tier?TIER_ORDER.indexOf(tier):5;for(let i=0;i<n;i++){const a=vs[i],b=vs[(i+1)%n];segs.push(a[0],a[1],a[2],b[0],b[1],b[2]);occA.push(isO,isO);tcA.push(...rgb,...rgb);fiA.push(fi,fi);tiA.push(tiv,tiv);}});
  return{pos:new Float32Array(segs),occ:new Float32Array(occA),tc:new Float32Array(tcA),fi:new Float32Array(fiA),ti:new Float32Array(tiA)};
}

const sortSlots=s=>[...(s||[])].filter(Boolean).sort((a,b)=>{const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);return d||((b.occ?1:0)-(a.occ?1:0));});
const sortPole=f=>[...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);

// ── Scene3D ───────────────────────────────────────────────────────────────────
class Scene3D{
  constructor(canvas){Object.assign(this,{canvas,T:null,G:null,renderer:null,scene:null,camera:null,panelMesh:null,edgeMeshes:[],starMesh:null,halos:[],coronaPts:null,starfield:null,viralSwarm:null,prestigeRing:null,eliteRing:null,eliteRing2:null,raycaster:null,triToFace:null,faceSlots:[],_faces:null,rot:{x:0.12,y:0},vel:{x:0,y:0},isDragging:false,pinchDist:null,touchStart:null,zoomTarget:22,zoomCurrent:22,hovFace:-1,selFace:-1,animId:null,transitioning:false,onHover:null,onClick:null,_h:{},_t0:Date.now(),_pU:null,_eU:null,_sU:null,_rU1:null,_rU2:null,_rU3:null,_vU:null});}

  async init(THREE,GSAP){
    this.T=THREE;this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth,H=this.canvas.clientHeight||window.innerHeight;
    const r=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(W,H,false);
    r.setClearColor(0x080A0F,1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.55;
    this.renderer=r;this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x080A0F,0.006);
    this.camera=new THREE.PerspectiveCamera(40,W/H,0.1,600);this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();
    this.scene.add(new THREE.AmbientLight(0x0A0F1C,8.0));
    this._sl=new THREE.PointLight(0xFFF8E0,28,90,1.3);this.scene.add(this._sl);
    this._cl=new THREE.PointLight(0xFF6600,10,65,1.8);this.scene.add(this._cl);
    const dl=new THREE.DirectionalLight(0x1A2888,1.2);dl.position.set(-20,-8,-18);this.scene.add(dl);
    const rl=new THREE.PointLight(0x9D50FF,1.1,120);rl.position.set(-15,-20,22);this.scene.add(rl);
    this._buildStarfield();this._buildStar();this._buildCorona();
    this._buildViralSwarm();this._buildOrbitRings();
    this._bindEvents();this._animate();
  }

  _buildStarfield(){
    const T=this.T,N=9000;const p=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=90+Math.random()*320;p[i*3]=r*Math.sin(ph)*Math.cos(th);p[i*3+1]=r*Math.sin(ph)*Math.sin(th);p[i*3+2]=r*Math.cos(ph);const q=Math.random();if(q<0.12){col[i*3]=0.52;col[i*3+1]=0.72;col[i*3+2]=1.0;}else if(q<0.48){col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.92;}else if(q<0.75){col[i*3]=1.0;col[i*3+1]=0.82;col[i*3+2]=0.44;}else{col[i*3]=0.76;col[i*3+1]=0.38;col[i*3+2]=1.0;}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(col,3));
    this.starfield=new T.Points(g,new T.PointsMaterial({size:0.22,vertexColors:true,transparent:true,opacity:0.88,sizeAttenuation:true,depthWrite:false}));this.scene.add(this.starfield);
  }

  _buildStar(){
    const T=this.T;const u={uTime:{value:0}};this._sU=u;
    this.starMesh=new T.Mesh(new T.SphereGeometry(STAR_R,64,64),new T.ShaderMaterial({vertexShader:STAR_VERT,fragmentShader:STAR_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.scene.add(this.starMesh);
    this.halos=[];
    for(const[r,col,op]of[[STAR_R*1.6,0xFFFFF0,0.62],[STAR_R*2.8,0xFFCC44,0.32],[STAR_R*5.0,0xFF8800,0.15],[STAR_R*9.5,0x440600,0.065],[STAR_R*15,0x220200,0.032]]){
      const m=new T.Mesh(new T.SphereGeometry(r,16,16),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending}));this.scene.add(m);this.halos.push(m);}
  }

  _buildCorona(){
    const T=this.T,N=3200;const p=new Float32Array(N*3),col=new Float32Array(N*3);
    this._hB=new Float32Array(N*3);this._hL=Array.from({length:N},()=>Math.random());this._hS=Array.from({length:N},()=>0.003+Math.random()*0.007);
    const pal=[[0,0.9,1],[0.62,0.31,1],[0,1,0.58],[1,0.72,0],[1,0.4,0.2]];
    for(let i=0;i<N;i++){const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=SPHERE_R*(0.87+Math.random()*0.24);const x=r*Math.sin(ph)*Math.cos(th),y=r*Math.sin(ph)*Math.sin(th),z=r*Math.cos(ph);this._hB[i*3]=x;this._hB[i*3+1]=y;this._hB[i*3+2]=z;p[i*3]=x;p[i*3+1]=y;p[i*3+2]=z;const pl=pal[Math.floor(Math.random()*pal.length)],br=0.4+Math.random()*0.6;col[i*3]=pl[0]*br;col[i*3+1]=pl[1]*br;col[i*3+2]=pl[2]*br;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(col,3));
    this.coronaPts=new T.Points(g,new T.PointsMaterial({size:0.12,vertexColors:true,transparent:true,opacity:0.55,sizeAttenuation:true,depthWrite:false,blending:T.AdditiveBlending}));this._hG=g;this.scene.add(this.coronaPts);
  }

  _buildViralSwarm(){
    const T=this.T,N=671;
    const phase=new Float32Array(N),speed=new Float32Array(N),axis=new Float32Array(N),radius=new Float32Array(N);
    for(let i=0;i<N;i++){phase[i]=Math.random()*Math.PI*2;speed[i]=0.16+Math.random()*0.58;axis[i]=Math.random()*Math.PI*2;radius[i]=SPHERE_R*(1.10+Math.random()*0.18);}
    const pos=new Float32Array(N*3);
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(pos,3));
    g.setAttribute('aPhase',new T.BufferAttribute(phase,1));
    g.setAttribute('aSpeed',new T.BufferAttribute(speed,1));
    g.setAttribute('aAxis',new T.BufferAttribute(axis,1));
    g.setAttribute('aRadius',new T.BufferAttribute(radius,1));
    const u={uTime:{value:0}};this._vU=u;
    this.viralSwarm=new T.Points(g,new T.ShaderMaterial({vertexShader:VIRAL_VERT,fragmentShader:VIRAL_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
    this.scene.add(this.viralSwarm);
  }

  _buildOrbitRings(){
    const T=this.T;
    const buildRing=(radius,col,alpha,tilt,rotY)=>{
      const N=300;const p=new Float32Array(N*3);
      for(let i=0;i<N;i++){const a=i/N*Math.PI*2;const x=Math.cos(a)*radius,z=Math.sin(a)*radius;const ct=Math.cos(tilt),st=Math.sin(tilt),cr=Math.cos(rotY),sr=Math.sin(rotY);p[i*3]=x*cr+z*sr;p[i*3+1]=-z*st;p[i*3+2]=-x*sr+z*cr;}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));
      const[cr2,cg2,cb2]=hex3(col);const u={uTime:{value:0},uCol:{value:new T.Vector3(cr2,cg2,cb2)},uAlpha:{value:alpha}};
      const m=new T.LineLoop(g,new T.ShaderMaterial({vertexShader:RING_VERT,fragmentShader:RING_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
      return{mesh:m,uni:u};
    };
    const pr=buildRing(SPHERE_R*1.19,'#FFB700',0.55,0.18,0.0);this.prestigeRing=pr.mesh;this._rU1=pr.uni;this.scene.add(this.prestigeRing);
    const el1=buildRing(SPHERE_R*1.14,'#9D50FF',0.42,0.52,1.0);this.eliteRing=el1.mesh;this._rU2=el1.uni;this.scene.add(this.eliteRing);
    const el2=buildRing(SPHERE_R*1.10,'#9D50FF',0.28,-0.38,2.1);this.eliteRing2=el2.mesh;this._rU3=el2.uni;this.scene.add(this.eliteRing2);
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
    geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nrm,3));
    geo.setAttribute('aOccupied',new T.BufferAttribute(occ,1));geo.setAttribute('aTierColor',new T.BufferAttribute(tc,3));
    geo.setAttribute('aTierIdx',new T.BufferAttribute(ti,1));geo.setAttribute('aFaceIdx',new T.BufferAttribute(fi,1));
    geo.setAttribute('aBary',new T.BufferAttribute(bary,3));
    this.panelMesh=new T.Mesh(geo,new T.ShaderMaterial({vertexShader:PANEL_VERT,fragmentShader:PANEL_FRAG,uniforms:uni,side:T.DoubleSide,transparent:true,depthWrite:false,extensions:{derivatives:true},blending:T.AdditiveBlending}));
    this.panelMesh.rotation.x=this.rot.x;this.panelMesh.rotation.y=this.rot.y;this.scene.add(this.panelMesh);
    const eD=buildEdgeBufs(faces);const eU={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1}};this._eU=eU;
    for(const[LIFT,opacity]of[[1.014,0.16],[1.006,0.44],[1.001,1.0]]){
      const sp=new Float32Array(eD.pos.length);for(let i=0;i<eD.pos.length;i+=3){sp[i]=eD.pos[i]*LIFT;sp[i+1]=eD.pos[i+1]*LIFT;sp[i+2]=eD.pos[i+2]*LIFT;}
      const eg=new T.BufferGeometry();eg.setAttribute('position',new T.BufferAttribute(sp,3));eg.setAttribute('aOcc',new T.BufferAttribute(eD.occ,1));eg.setAttribute('aTC',new T.BufferAttribute(eD.tc,3));eg.setAttribute('aFI',new T.BufferAttribute(eD.fi,1));eg.setAttribute('aTI',new T.BufferAttribute(eD.ti,1));
      const mat=new T.ShaderMaterial({vertexShader:EDGE_VERT,fragmentShader:EDGE_FRAG,uniforms:eU,transparent:true,depthWrite:false,blending:T.AdditiveBlending});mat.opacity=opacity;
      const em=new T.LineSegments(eg,mat);em.rotation.x=this.rot.x;em.rotation.y=this.rot.y;this.scene.add(em);this.edgeMeshes.push(em);
    }
  }

  setFaces(faces,animate=false){
    this.hovFace=-1;this.selFace=-1;
    if(!animate||this.transitioning){this._buildMesh(faces);return;}
    this.transitioning=true;
    const G=this.G,doSwap=()=>{this._buildMesh(faces);const ms=[this.panelMesh,...this.edgeMeshes].filter(Boolean);if(ms.length){ms.forEach(m=>m.scale.set(0,0,0));const p={v:0};G.to(p,{v:1,duration:0.58,ease:'back.out(1.4)',onUpdate:()=>ms.forEach(m=>m.scale.set(p.v,p.v,p.v)),onComplete:()=>{this.transitioning=false;}});}else{this.transitioning=false;}};
    const ms=[this.panelMesh,...this.edgeMeshes].filter(Boolean);
    if(ms.length){const p={v:1};G.to(p,{v:0,duration:0.20,ease:'power3.in',onUpdate:()=>ms.forEach(m=>m.scale.set(p.v,p.v,p.v)),onComplete:doSwap});}else{doSwap();}
  }

  _ndc(cx,cy){const r=this.canvas.getBoundingClientRect();return{x:((cx-r.left)/r.width)*2-1,y:-((cy-r.top)/r.height)*2+1};}
  _cast(cx,cy){if(!this.panelMesh)return-1;const{x,y}=this._ndc(cx,cy);this.raycaster.setFromCamera({x,y},this.camera);const h=this.raycaster.intersectObject(this.panelMesh);return h.length?this.triToFace?.[h[0].faceIndex]??h[0].faceIndex:-1;}
  _setHov(fi){this.hovFace=fi;if(this._pU)this._pU.uHovered.value=fi;if(this._eU)this._eU.uHovered.value=fi;}
  _setSel(fi){this.selFace=fi;if(this._pU)this._pU.uSelected.value=fi;if(this._eU)this._eU.uSelected.value=fi;}

  zoomToFace(centroid){
    if(!centroid||!this.G)return;const T=this.T,G=this.G;
    const v=new T.Vector3(...centroid);v.applyEuler(this.panelMesh.rotation);const dir=v.clone().normalize();
    G.to(this.camera.position,{x:dir.x*SPHERE_R*2.0,y:dir.y*SPHERE_R*2.0,z:dir.z*SPHERE_R*2.0+8,duration:1.1,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(dir.x*0.4,dir.y*0.4,dir.z*0.4))});
    G.to(this,{zoomTarget:12,duration:1.1,ease:'power3.inOut'});
  }
  resetCamera(){if(!this.G)return;const T=this.T;this.G.to(this.camera.position,{x:0,y:0,z:22,duration:0.95,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(0,0,0))});this.G.to(this,{zoomTarget:22,duration:0.95,ease:'power3.inOut'});}
  zoom(dy){this.zoomTarget=Math.max(7,Math.min(55,this.zoomTarget+dy*0.012));}

  _bindEvents(){
    const c=this.canvas,h=this._h;let lx=0,ly=0,mv=false;
    h.md=e=>{this.isDragging=true;mv=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0};};
    h.mm=e=>{if(this.isDragging){const dx=e.clientX-lx,dy=e.clientY-ly;if(Math.abs(dx)>1||Math.abs(dy)>1)mv=true;this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.clientX;ly=e.clientY;}else{const fi=this._cast(e.clientX,e.clientY);if(fi!==this.hovFace){this._setHov(fi);this.onHover?.(fi>=0?this.faceSlots[fi]:null,fi);}c.style.cursor=fi>=0?'pointer':'grab';}};
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
    if(!this.isDragging){this.rot.y+=this.vel.x;this.rot.x+=this.vel.y;this.vel.x*=0.94;this.vel.y*=0.94;this.rot.y+=0.00028;}
    const rx=this.rot.x,ry=this.rot.y;
    if(this.panelMesh){this.panelMesh.rotation.x=rx;this.panelMesh.rotation.y=ry;}
    for(const e of this.edgeMeshes){e.rotation.x=rx;e.rotation.y=ry;}
    if(this._pU)this._pU.uTime.value=t;if(this._eU)this._eU.uTime.value=t;if(this._sU)this._sU.uTime.value=t;
    if(this.viralSwarm){this.viralSwarm.rotation.y=t*0.038;this.viralSwarm.rotation.x=Math.sin(t*0.028)*0.18;if(this._vU)this._vU.uTime.value=t;}
    if(this.prestigeRing){this.prestigeRing.rotation.y=ry;this.prestigeRing.rotation.x=rx*0.4;if(this._rU1)this._rU1.uTime.value=t;}
    if(this.eliteRing){this.eliteRing.rotation.y=ry*1.1+t*0.009;this.eliteRing.rotation.x=rx;if(this._rU2)this._rU2.uTime.value=t;}
    if(this.eliteRing2){this.eliteRing2.rotation.y=ry*0.9-t*0.013;this.eliteRing2.rotation.x=rx;if(this._rU3)this._rU3.uTime.value=t;}
    const sp=1+Math.sin(t*0.88)*0.20+Math.sin(t*2.1)*0.06;
    if(this._sl)this._sl.intensity=28*sp;if(this._cl)this._cl.intensity=10*sp;
    if(this.starMesh)this.starMesh.scale.setScalar(1+Math.sin(t*1.1)*0.065);
    this.halos.forEach((h,i)=>h.scale.setScalar(1+Math.sin(t*0.34+i*0.70)*0.052));
    if(this._hG){const pa=this._hG.getAttribute('position'),N=pa.count;for(let i=0;i<N;i++){this._hL[i]+=this._hS[i];if(this._hL[i]>1)this._hL[i]=0;const l=this._hL[i],r=SPHERE_R*(0.87+l*0.24),bx=this._hB[i*3],by=this._hB[i*3+1],bz=this._hB[i*3+2],l2=Math.sqrt(bx*bx+by*by+bz*bz)||1;pa.array[i*3]=bx/l2*r;pa.array[i*3+1]=by/l2*r;pa.array[i*3+2]=bz/l2*r;}pa.needsUpdate=true;}
    if(this.coronaPts){this.coronaPts.rotation.x=rx;this.coronaPts.rotation.y=ry;}
    if(this.starfield){this.starfield.rotation.y=t*0.0004;this.starfield.rotation.x=Math.sin(t*0.00007)*0.009;}
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.065;this.camera.position.z=this.zoomCurrent;
    this.renderer.render(this.scene,this.camera);
  }
  resize(){const W=this.canvas.clientWidth,H=this.canvas.clientHeight;if(!W||!H)return;this.camera.aspect=W/H;this.camera.updateProjectionMatrix();this.renderer.setSize(W,H,false);}
  destroy(){cancelAnimationFrame(this.animId);const h=this._h;this.canvas.removeEventListener('mousedown',h.md);window.removeEventListener('mousemove',h.mm);window.removeEventListener('mouseup',h.mu);this.canvas.removeEventListener('touchstart',h.ts);this.canvas.removeEventListener('touchmove',h.tm);this.canvas.removeEventListener('touchend',h.te);[this.panelMesh,...this.edgeMeshes,this.viralSwarm,this.prestigeRing,this.eliteRing,this.eliteRing2].forEach(m=>{if(m){m.geometry?.dispose();m.material?.dispose();}});this.renderer?.dispose();}
}

// ── UI Components ─────────────────────────────────────────────────────────────
function GlassPanel({children,style={},glow,...p}){return(<div style={{background:DS.glass,backdropFilter:'blur(12px) saturate(155%)',WebkitBackdropFilter:'blur(12px) saturate(155%)',border:`0.5px solid ${glow?`${glow}38`:DS.glassBrd}`,boxShadow:glow?`0 0 0 1px ${glow}14,0 0 22px ${glow}14,inset 0 1px 0 rgba(255,255,255,0.05)`:`inset 0 1px 0 rgba(255,255,255,0.04),0 8px 28px rgba(0,0,0,0.55)`,...style}}{...p}>{children}</div>);}

function LumBtn({children,onClick,col=DS.cyan,style={},sm,...p}){const[hov,setHov]=useState(false);return(<button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov?`${col}0e`:'transparent',border:`0.5px solid ${col}${hov?'cc':'4a'}`,borderRadius:8,color:hov?col:`${col}99`,fontFamily:F.ui,fontSize:sm?10:12,fontWeight:600,padding:sm?'6px 12px':'10px 20px',cursor:'pointer',outline:'none',letterSpacing:'0.04em',boxShadow:hov?`0 0 18px ${col}28,inset 0 0 10px ${col}06`:'none',transition:'all 0.16s ease',display:'flex',alignItems:'center',justifyContent:'center',gap:7,...style}}{...p}>{children}</button>);}

function Tag({label,col,mono}){return(<span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 7px',borderRadius:4,border:`0.5px solid ${col}44`,background:`${col}0c`,color:col,fontSize:8.5,fontWeight:600,fontFamily:mono?F.mono:F.ui,letterSpacing:'0.10em'}}>{label}</span>);}
function LumSep({col=DS.cyan,style={}}){return <div style={{height:0.5,background:`linear-gradient(90deg,transparent,${col}55,transparent)`,boxShadow:`0 0 6px ${col}44`,...style}}/>;}

function ProductReveal({slot,onClose,onRent,onBuyout}){
  const[phase,setPhase]=useState(0);
  useEffect(()=>{const id=requestAnimationFrame(()=>setPhase(1));return()=>cancelAnimationFrame(id);},[]);
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const label=(TIER_LABEL[slot.tier]||slot.tier).toUpperCase();
  const price=fmt(slot.tier);
  const isEpic=slot.tier==='epicenter';
  const occ=slot.occ; const tenant=slot.tenant;
  const role=TIER_ROLE[slot.tier];
  return(
    <div style={{position:'absolute',top:0,bottom:0,right:226,width:360,display:'flex',alignItems:'center',justifyContent:'flex-end',padding:'0 14px',zIndex:45,pointerEvents:'none'}}>
      <div style={{width:338,pointerEvents:'auto',opacity:phase?1:0,transform:phase?'none':'translateX(18px) scale(0.96)',transition:'opacity 0.28s ease,transform 0.36s cubic-bezier(0.34,1.56,0.64,1)',borderRadius:14,background:DS.glass,backdropFilter:'blur(12px) saturate(180%)',WebkitBackdropFilter:'blur(12px) saturate(180%)',border:`0.5px solid ${col}44`,boxShadow:`0 0 0 1px ${col}14,0 0 36px ${col}18,0 0 72px ${col}08,inset 0 1px 0 rgba(255,255,255,0.06)`,overflow:'hidden'}}>
        <div style={{height:0.5,background:`linear-gradient(90deg,transparent,${col},transparent)`,boxShadow:`0 0 10px ${col}`}}/>
        <div style={{height:occ&&tenant?.img?136:118,position:'relative',overflow:'hidden',background:DS.abyss}}>
          {occ&&tenant?.img&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${tenant.img})`,backgroundSize:'cover',backgroundPosition:'center'}}/>}
          <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${col}08 0.5px,transparent 0.5px),linear-gradient(90deg,${col}08 0.5px,transparent 0.5px)`,backgroundSize:'18px 18px',pointerEvents:'none'}}/>
          <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,0.10) 0px,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 3px)',pointerEvents:'none'}}/>
          {[{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}].map((pos,i)=>(<div key={i} style={{position:'absolute',width:9,height:9,...pos,borderTop:i<2?`0.5px solid ${col}`:'none',borderBottom:i>=2?`0.5px solid ${col}`:'none',borderLeft:(i===0||i===2)?`0.5px solid ${col}`:'none',borderRight:(i===1||i===3)?`0.5px solid ${col}`:'none',boxShadow:`0 0 5px ${col}55`,zIndex:2}}/>))}
          {!(occ&&tenant?.img)&&(<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:2,gap:6}}><div style={{width:isEpic?72:56,height:isEpic?72:56,borderRadius:isEpic?'50%':10,border:`0.5px solid ${col}88`,background:`${col}08`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isEpic?28:20,fontWeight:700,color:col,fontFamily:F.mono,boxShadow:`0 0 30px ${col}38`}}>{role?.icon||'○'}</div><div style={{color:`${col}88`,fontSize:8,fontFamily:F.ui,letterSpacing:'0.12em'}}>{role?.role?.toUpperCase()}</div></div>)}
          <div style={{position:'absolute',top:9,left:9,zIndex:3}}><Tag label={label} col={col}/></div>
          <div style={{position:'absolute',top:9,right:9,zIndex:3}}><Tag label={occ?'● ACTIF':'○ LIBRE'} col={occ?col:DS.textLo}/></div>
          <button onClick={onClose} style={{position:'absolute',bottom:9,right:9,zIndex:3,width:22,height:22,borderRadius:5,background:'transparent',border:`0.5px solid ${DS.glassBrdHi}`,color:DS.textLo,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',outline:'none',transition:'all 0.14s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${DS.rose}88`;e.currentTarget.style.color=DS.rose;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=DS.glassBrdHi;e.currentTarget.style.color=DS.textLo;}}>✕</button>
        </div>
        <LumSep col={col} style={{opacity:0.5}}/>
        <div style={{padding:'14px 16px 18px'}}>
          <div style={{marginBottom:10}}><div style={{color:DS.textHi,fontSize:14,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.01em',marginBottom:3,lineHeight:1.3}}>{occ?(tenant?.name||`Panneau ${label}`):`Emplacement ${label}`}</div><div style={{color:DS.textLo,fontSize:9,fontFamily:F.ui,lineHeight:1.6}}>{role?.desc||'Sphère de Dyson · Marketing collaboratif'}</div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:12}}>{[{k:'TIER',v:label,c:col},{k:'PRIX/J',v:`€${price}`,c:DS.gold},{k:'RÔLE',v:(role?.role?.split(' ')[0]||'COSMOS'),c:DS.cyan}].map(({k,v,c})=>(<div key={k} style={{padding:'7px 5px',borderRadius:7,textAlign:'center',border:`0.5px solid ${DS.glassBrdHi}`,background:'transparent'}}><div style={{color:c,fontSize:10.5,fontWeight:700,fontFamily:F.mono,marginBottom:2}}>{v}</div><div style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>{k}</div></div>))}</div>
          {occ&&(tenant?.instagramUrl||tenant?.twitterUrl||tenant?.tiktokUrl||tenant?.websiteUrl)&&(<div style={{display:'flex',gap:5,marginBottom:12}}>{[['𝕏',tenant?.twitterUrl,'#1DA1F2'],['◎',tenant?.instagramUrl,'#E4405F'],['♪',tenant?.tiktokUrl,'#00f2ea'],['⬡',tenant?.websiteUrl,DS.cyan]].filter(([,u])=>u).map(([ic,u,ic_col])=>(<a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{flex:1,padding:'7px 4px',borderRadius:7,border:`0.5px solid ${ic_col}33`,color:`${ic_col}88`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',transition:'all 0.14s',outline:'none',background:'transparent'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${ic_col}88`;e.currentTarget.style.color=ic_col;e.currentTarget.style.boxShadow=`0 0 10px ${ic_col}22`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${ic_col}33`;e.currentTarget.style.color=`${ic_col}88`;e.currentTarget.style.boxShadow='none';}}>{ic}</a>))}</div>)}
          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12,padding:'9px 12px',borderRadius:9,border:`0.5px solid ${col}33`,position:'relative',overflow:'hidden'}}><div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(90deg,transparent,transparent 22px,${col}05 22px,${col}05 22.5px)`,pointerEvents:'none'}}/><span style={{color:col,fontSize:22,fontWeight:700,fontFamily:F.mono,lineHeight:1,textShadow:`0 0 18px ${col}66`}}>€{price}</span><span style={{color:DS.textLo,fontSize:9.5,fontFamily:F.ui}}>/jour · excl. taxes</span><span style={{marginLeft:'auto',color:`${col}33`,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.12em'}}>ADS·SQ</span></div>
          {!occ?<LumBtn onClick={()=>onRent(slot)} col={col} style={{width:'100%'}}><span>Réserver ce slot</span><span style={{opacity:0.45,fontSize:10}}>→</span></LumBtn>:<LumBtn onClick={()=>onBuyout(slot)} col={DS.textLo} style={{width:'100%',fontSize:11}}>Proposer un rachat</LumBtn>}
        </div>
      </div>
    </div>
  );
}

function HoverChip({slot}){
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const role=TIER_ROLE[slot.tier];
  return(
    <div style={{position:'absolute',bottom:64,left:'50%',transform:'translateX(-50%)',pointerEvents:'none',zIndex:35,animation:'hfadeUp 0.16s ease both'}}>
      <GlassPanel glow={col} style={{padding:'5px 13px',display:'flex',alignItems:'center',gap:9,borderRadius:8}}>
        <span style={{color:col,fontSize:12,lineHeight:1}}>{role?.icon||'○'}</span>
        <span style={{color:col,fontSize:9,fontWeight:600,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[slot.tier]||slot.tier).toUpperCase()}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrdHi}}/>
        <span style={{color:DS.textMid,fontSize:9,fontFamily:F.ui}}>{slot.occ?(slot.tenant?.name||'Occupé'):'Disponible'}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrdHi}}/>
        <span style={{color:DS.gold,fontSize:9,fontWeight:600,fontFamily:F.mono}}>€{fmt(slot.tier)}/j</span>
      </GlassPanel>
    </div>
  );
}

// ── Sidebar Marketing Cosmos ──────────────────────────────────────────────────
const Sidebar=memo(function Sidebar({slots,isLive,level}){
  const[tab,setTab]=useState('tiers');
  const stats=useMemo(()=>{const c={};TIER_ORDER.forEach(t=>{c[t]=0;});(slots||[]).forEach(s=>{if(s?.occ&&c[s.tier]!==undefined)c[s.tier]++;});return c;},[slots]);
  const rev=TIER_ORDER.reduce((s,t)=>s+(stats[t]||0)*(TIER_PRICE[t]||0)/100,0);
  const totalOcc=Object.values(stats).reduce((s,v)=>s+v,0);
  return(
    <div style={{width:226,flexShrink:0,background:DS.glass,backdropFilter:'blur(12px) saturate(155%)',WebkitBackdropFilter:'blur(12px) saturate(155%)',borderLeft:`0.5px solid ${DS.glassBrdHi}`,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'-1px 0 0 rgba(255,255,255,0.04),-14px 0 36px rgba(0,0,0,0.5)'}}>
      <div style={{padding:'13px 14px 10px',borderBottom:`0.5px solid ${DS.glassBrdHi}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{color:DS.gold,fontSize:14,textShadow:`0 0 14px ${DS.gold}`,lineHeight:1}}>☀</span>
            <span style={{color:DS.textHi,fontSize:11,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.09em'}}>DYSON SPHERE</span>
          </div>
          {isLive&&(<div style={{display:'flex',alignItems:'center',gap:4,padding:'2px 6px',borderRadius:4,border:`0.5px solid ${DS.green}44`,background:`${DS.green}08`}}><div style={{width:4,height:4,borderRadius:'50%',background:DS.green,boxShadow:`0 0 8px ${DS.green}`,animation:'hpulse 1.5s ease-in-out infinite'}}/><span style={{color:DS.green,fontSize:7,fontWeight:700,letterSpacing:'0.12em',fontFamily:F.ui}}>LIVE</span></div>)}
        </div>
        <div style={{color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.06em',marginBottom:9}}>{LEVELS[level]?.faces||0} PANNEAUX · LVL {level}</div>
        <div style={{display:'flex',gap:3}}>
          {[['tiers','TIERS'],['roles','RÔLES']].map(([id,label])=>(<button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'5px 0',background:'transparent',border:`0.5px solid ${tab===id?DS.gold:DS.glassBrd}`,borderRadius:5,color:tab===id?DS.gold:DS.textLo,fontSize:7.5,fontWeight:600,fontFamily:F.ui,letterSpacing:'0.08em',cursor:'pointer',outline:'none',boxShadow:tab===id?`0 0 8px ${DS.gold}22`:'none',transition:'all 0.14s'}}>{label}</button>))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'7px 0'}}>
        {tab==='tiers' ? TIER_ORDER.map(tier=>{
          const col=TIER_NEON[tier]||DS.cyan,occ=stats[tier]||0,tot=TIER_TOTALS[tier]||1,pct=Math.round(occ/tot*100);
          const role=TIER_ROLE[tier];
          return(<div key={tier} style={{padding:'6px 12px 6px 10px',borderLeft:`0.5px solid ${occ>0?col:'transparent'}`,marginLeft:2,borderRadius:'0 7px 7px 0',transition:'background 0.14s',cursor:'default'}} onMouseEnter={e=>{e.currentTarget.style.background=`${col}07`;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:11,lineHeight:1,color:col,textShadow:occ>0?`0 0 8px ${col}`:'none'}}>{role?.icon||'○'}</span><span style={{color:occ>0?col:DS.textLo,fontSize:7.5,fontWeight:600,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[tier]||tier).toUpperCase()}</span></div>
              <span style={{color:occ>0?col:DS.textLo,fontSize:8.5,fontWeight:600,fontFamily:F.mono}}>€{fmt(tier)}</span>
            </div>
            <div style={{height:1.5,borderRadius:1,background:DS.glassBrd,overflow:'hidden',marginBottom:3}}><div style={{height:'100%',width:`${pct}%`,borderRadius:1,background:occ>0?col:'transparent',boxShadow:occ>0?`0 0 6px ${col}`:'none',transition:'width 0.9s ease'}}/></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>{occ}/{tot}</span><span style={{color:occ>0?`${col}aa`:DS.textLo,fontSize:7,fontFamily:F.mono}}>{pct}%</span></div>
          </div>);
        }) : TIER_ORDER.map(tier=>{
          const col=TIER_NEON[tier]||DS.cyan;const role=TIER_ROLE[tier];
          return(<div key={tier} style={{padding:'9px 12px 9px 10px',borderBottom:`0.5px solid ${DS.glassBrd}`,cursor:'default'}} onMouseEnter={e=>{e.currentTarget.style.background=`${col}06`;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <div style={{width:24,height:24,borderRadius:tier==='epicenter'?'50%':5,border:`0.5px solid ${col}66`,background:`${col}10`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:col,flexShrink:0,boxShadow:`0 0 10px ${col}22`}}>{role?.icon||'○'}</div>
              <div><div style={{color:col,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.06em',lineHeight:1.2}}>{role?.role||tier.toUpperCase()}</div><div style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>€{fmt(tier)}/j · {TIER_TOTALS[tier]} slots</div></div>
            </div>
            <div style={{color:DS.textLo,fontSize:7.5,fontFamily:F.ui,lineHeight:1.55,paddingLeft:30}}>{role?.desc||''}</div>
          </div>);
        })}
      </div>

      <div style={{padding:'10px 14px',borderTop:`0.5px solid ${DS.glassBrdHi}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}><span style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>REVENUS/JOUR</span><span style={{color:DS.gold,fontSize:14,fontWeight:700,fontFamily:F.mono,textShadow:`0 0 14px ${DS.gold}55`}}>€{rev.toLocaleString('fr-FR')}</span></div>
        <LumSep col={DS.gold} style={{marginBottom:5,opacity:0.32}}/>
        {/* Barres énergie par tier */}
        <div style={{display:'flex',gap:3,marginBottom:5}}>{TIER_ORDER.slice(0,5).map(t=>{const col=TIER_NEON[t];const occ=stats[t]||0;const tot=TIER_TOTALS[t];return<div key={t} title={(TIER_LABEL[t]||t).toUpperCase()} style={{flex:1,height:3,borderRadius:2,background:occ>0?col:DS.glassBrd,opacity:0.35+0.65*(occ/tot),boxShadow:occ>0?`0 0 5px ${col}`:'none',transition:'all 0.6s'}}/>;})}</div>
        <div style={{textAlign:'center',color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.08em'}}>{totalOcc} ACTIFS · {671-totalOcc} LIBRES</div>
      </div>
    </div>
  );
});

const LevelNav=memo(function LevelNav({level,onLevel}){
  return(<div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:30}}><GlassPanel glow={DS.cyan} style={{padding:'5px 9px',display:'flex',alignItems:'center',gap:3,borderRadius:10}}>{LEVELS.map(lv=>{const act=lv.n===level;const col=act?DS.cyan:DS.textLo;return(<button key={lv.n} onClick={()=>onLevel(lv.n)} title={lv.name} style={{width:act?30:15,height:act?30:15,borderRadius:'50%',border:`0.5px solid ${col}${act?'cc':'44'}`,background:act?`${DS.cyan}12`:'transparent',color:col,fontSize:act?10:7.5,fontWeight:700,cursor:'pointer',transition:'all 0.26s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.ui,padding:0,flexShrink:0,boxShadow:act?`0 0 16px ${DS.cyan}55,0 0 4px ${DS.cyan}33`:'none',outline:'none'}}>{act?lv.icon:lv.n}</button>);})}<div style={{marginLeft:6,paddingLeft:8,borderLeft:`0.5px solid ${DS.glassBrdHi}`,display:'flex',flexDirection:'column',gap:1}}><span style={{color:DS.cyan,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em',lineHeight:1.1}}>{LEVELS[level]?.name}</span><span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono,letterSpacing:'0.06em'}}>{LEVELS[level]?.faces} PANELS</span></div></GlassPanel></div>);
});

function HUDLoader(){
  return(<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:26,background:DS.void}}>
    <div style={{position:'relative',width:82,height:82}}>
      {[0,1,2,3].map(i=>(<div key={i} style={{position:'absolute',inset:i*10,borderRadius:'50%',border:`0.5px solid rgba(${i===0?'255,183,0':i===1?'255,93,156':i===2?'157,80,255':'0,229,255'},${0.08-i*0.01})`,borderTopColor:`rgba(${i===0?'255,183,0':i===1?'255,93,156':i===2?'157,80,255':'0,229,255'},${0.88-i*0.18})`,animation:`hspin ${0.9+i*0.75}s linear infinite ${i%2?'reverse':''}`}}/>))}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:13,height:13,borderRadius:'50%',background:'#FFF8E0',boxShadow:'0 0 18px #FFCC44,0 0 40px #FF8800,0 0 70px #FF440018'}}/></div>
    </div>
    <div style={{textAlign:'center'}}>
      <div style={{color:DS.gold,fontSize:10,fontWeight:600,letterSpacing:'0.30em',fontFamily:F.ui,marginBottom:5,textShadow:`0 0 22px ${DS.gold}`}}>DYSON SPHERE</div>
      <div style={{color:DS.textLo,fontSize:7.5,letterSpacing:'0.20em',fontFamily:F.mono,marginBottom:8}}>INITIALISATION…</div>
      <div style={{display:'flex',justifyContent:'center',gap:5}}>{TIER_ORDER.map((t,i)=>(<div key={t} style={{width:4,height:4,borderRadius:'50%',background:TIER_NEON[t],boxShadow:`0 0 8px ${TIER_NEON[t]}`,animation:`hpulse ${0.8+i*0.15}s ease-in-out infinite`}}/>))}</div>
    </div>
  </div>);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
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
      .then(([T,G])=>{sc=new Scene3D(canvasRef.current);sceneRef.current=sc;sc.onHover=slot=>{clearTimeout(hovTimer.current);if(slot){hovTimer.current=setTimeout(()=>setHovSlot(slot),80);}else setHovSlot(null);};sc.onClick=slot=>setSelSlot(slot||null);return sc.init(T,G);})
      .then(()=>{sceneRef.current.setFaces(assignedFaces,false);setLoading(false);})
      .catch(e=>{console.error(e);setError('npm install three gsap');setLoading(false);});
    return()=>{if(sc)sc.destroy();sceneRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{if(!sceneRef.current||level===0)return;sceneRef.current.setFaces(assignedFaces,true);},[assignedFaces,level]);
  useEffect(()=>{const fn=e=>{if(e.key>='0'&&e.key<='6')setLevel(+e.key);else if(e.key==='ArrowRight'||e.key==='ArrowUp')setLevel(l=>Math.min(6,l+1));else if(e.key==='ArrowLeft'||e.key==='ArrowDown')setLevel(l=>Math.max(1,l-1));else if(e.key==='Escape'){setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[]);
  useEffect(()=>{const fn=e=>{e.preventDefault();sceneRef.current?.zoom(e.deltaY);};const c=canvasRef.current;if(c)c.addEventListener('wheel',fn,{passive:false});return()=>{if(c)c.removeEventListener('wheel',fn);};},[level]);
  useEffect(()=>{if(!canvasRef.current)return;const ro=new ResizeObserver(()=>sceneRef.current?.resize());ro.observe(canvasRef.current);return()=>ro.disconnect();},[]);

  const goLevel=useCallback(n=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();setLevel(n);},[]);
  const handleClose=useCallback(()=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();},[]);

  if(level===0){return(<div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}><LumBtn onClick={()=>goLevel(6)} col={DS.gold} sm style={{position:'absolute',top:10,right:10,zIndex:100,letterSpacing:'0.08em'}}>☀ DYSON SPHERE</LumBtn>{ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}</div>);}

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:DS.void,display:'flex'}}>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',opacity:loading?0:1,transition:'opacity 0.75s ease'}}/>
        {loading&&!error&&<HUDLoader/>}
        {error&&(<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,background:DS.void}}><div style={{color:DS.err,fontSize:11,fontWeight:600,fontFamily:F.mono,letterSpacing:'0.06em'}}>⚠ {error}</div><LumBtn onClick={()=>goLevel(0)} col={DS.cyan} sm>Vue 2D</LumBtn></div>)}

        <GlassPanel style={{position:'absolute',top:11,left:11,zIndex:30,borderRadius:7}}>
          <button onClick={()=>goLevel(0)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'none',border:'none',color:DS.textLo,fontSize:8.5,fontWeight:600,cursor:'pointer',fontFamily:F.ui,letterSpacing:'0.06em',outline:'none',transition:'color 0.14s'}} onMouseEnter={e=>e.currentTarget.style.color=DS.textHi} onMouseLeave={e=>e.currentTarget.style.color=DS.textLo}>▦ VUE 2D</button>
        </GlassPanel>

        {/* Badge drones orbitaux */}
        {!loading&&<GlassPanel glow={TIER_NEON.viral} style={{position:'absolute',top:11,right:11,zIndex:30,borderRadius:7,padding:'4px 10px',display:'flex',alignItems:'center',gap:6,pointerEvents:'none'}}><div style={{width:5,height:5,borderRadius:'50%',background:TIER_NEON.viral,boxShadow:`0 0 10px ${TIER_NEON.viral}`,animation:'hpulse 2s ease-in-out infinite'}}/><span style={{color:TIER_NEON.viral,fontSize:7.5,fontFamily:F.ui,fontWeight:600,letterSpacing:'0.08em'}}>⚡ {TIER_TOTALS.viral} DRONES ORBITAUX</span></GlassPanel>}

        {hovSlot&&!selSlot&&<HoverChip slot={hovSlot}/>}
        {!loading&&!selSlot&&(<div style={{position:'absolute',bottom:54,left:'50%',transform:'translateX(-50%)',color:DS.textLo,fontSize:7.5,letterSpacing:'0.12em',fontFamily:F.mono,pointerEvents:'none',whiteSpace:'nowrap',opacity:0.48}}>CLIC · ZOOM · DRAG · ⌨ 0-6</div>)}

        <LevelNav level={level} onLevel={goLevel}/>
        {selSlot&&<ProductReveal slot={selSlot} onClose={handleClose} onRent={s=>{handleClose();onCheckout?.(s);}} onBuyout={s=>{handleClose();onBuyout?.(s);}}/>}
      </div>

      <Sidebar slots={slots} isLive={isLive} level={level}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes hspin{to{transform:rotate(360deg);}}
        @keyframes hpulse{0%,100%{opacity:1;}50%{opacity:0.25;}}
        @keyframes hfadeUp{from{opacity:0;transform:translateX(-50%) translateY(5px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        ::-webkit-scrollbar{width:1.5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,183,0,0.18);border-radius:1px;}
        canvas{cursor:grab;} canvas:active{cursor:grabbing;}
      `}</style>
    </div>
  );
}
