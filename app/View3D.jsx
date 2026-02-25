'use client';
/**
 * ─── ADS·SQUARE — View3D "Dyson Sphere" ────────────────────────────────────
 *
 * Étoile centrale + panneaux publicitaires incrustés sur la sphère.
 * Chaque panneau = 1 bloc. Les gaps entre panneaux laissent voir l'étoile.
 *
 * Niveaux :
 *   0 → Grille 2D  |  1 → Cube (6)  |  2 → Octaèdre (8)
 *   3 → Ico (20)   |  4 → Sph I (80) |  5 → Sph II (320)  |  6 → Cosmos (1280)
 *
 * Controls : molette = zoom · drag = rotation · dots = niveau · clic = détail
 * deps: npm install three gsap
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ── Tokens ────────────────────────────────────────────────────────────────────
const U = {
  bg:'#00010a', text:'#f0f0f0', muted:'rgba(255,255,255,0.38)',
  accent:'#d4a84b', accentFg:'#080808',
  border2:'rgba(255,255,255,0.16)', err:'#e05252',
};
const F = { h:"'Clash Display','Syne',sans-serif", b:"'DM Sans','Inter',sans-serif" };
const fmt = tier => ((TIER_PRICE[tier]||100)/100).toLocaleString('fr-FR');
const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];

const LEVELS = [
  {n:0,name:'Grille 2D',  icon:'◫',faces:0},
  {n:1,name:'Cube',       icon:'⬛',faces:6},
  {n:2,name:'Octaèdre',   icon:'◆',faces:8},
  {n:3,name:'Icosaèdre',  icon:'⬡',faces:20},
  {n:4,name:'Sphère I',   icon:'◎',faces:80},
  {n:5,name:'Sphère II',  icon:'◉',faces:320},
  {n:6,name:'Cosmos',     icon:'●',faces:1280},
];

const SPHERE_R  = 6.5;   // rayon de la sphère Dyson
const PANEL_GAP = 0.88;  // 0.88 = 12% de gap entre panneaux (laisse voir l'étoile)
const STAR_R    = 1.2;   // rayon de l'étoile centrale

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY — builders
// ─────────────────────────────────────────────────────────────────────────────

/** Rétrécit une face vers son centroïde pour créer le gap Dyson */
function insetVerts(verts, centroid, factor) {
  return verts.map(v => [
    centroid[0] + (v[0]-centroid[0])*factor,
    centroid[1] + (v[1]-centroid[1])*factor,
    centroid[2] + (v[2]-centroid[2])*factor,
  ]);
}

function buildCubeFaces() {
  const a = SPHERE_R / Math.sqrt(3);
  const raw = [
    [[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],
    [[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],
    [[-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]],
    [[a,-a,-a],[-a,-a,-a],[-a,a,-a],[a,a,-a]],
    [[a,-a,a],[a,a,a],[a,a,-a],[a,-a,-a]],
    [[-a,-a,-a],[-a,a,-a],[-a,a,a],[-a,-a,a]],
  ];
  return raw.map(vs => {
    const c = [vs.reduce((s,v)=>s+v[0],0)/4, vs.reduce((s,v)=>s+v[1],0)/4, vs.reduce((s,v)=>s+v[2],0)/4];
    return { verts: insetVerts(vs,c,PANEL_GAP), centroid:c, isQuad:true };
  });
}

function buildOctaFaces() {
  const R=SPHERE_R, v=[[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];
  return [[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]]
    .map(([a,b,c]) => {
      const vs=[v[a],v[b],v[c]];
      const cnt = [(vs[0][0]+vs[1][0]+vs[2][0])/3,(vs[0][1]+vs[1][1]+vs[2][1])/3,(vs[0][2]+vs[1][2]+vs[2][2])/3];
      return { verts: insetVerts(vs,cnt,PANEL_GAP), centroid:cnt, isQuad:false };
    });
}

function midS(a,b){ const m=a.map((c,i)=>(c+b[i])/2), l=Math.hypot(...m); return m.map(c=>c/l); }

function buildIcoFaces(sub) {
  const phi=(1+Math.sqrt(5))/2;
  const rawV=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],
    [0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]]
    .map(v=>{ const l=Math.hypot(...v); return v.map(c=>c/l); });
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
    .map(f=>f.map(i=>rawV[i]));
  for(let s=0;s<sub;s++){
    const nx=[];
    for(const[a,b,c] of faces){ const ab=midS(a,b),bc=midS(b,c),ca=midS(c,a); nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]); }
    faces=nx;
  }
  const R=SPHERE_R;
  return faces.map(([a,b,c])=>{
    const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];
    const cnt=[(vs[0][0]+vs[1][0]+vs[2][0])/3,(vs[0][1]+vs[1][1]+vs[2][1])/3,(vs[0][2]+vs[1][2]+vs[2][2])/3];
    return { verts:insetVerts(vs,cnt,PANEL_GAP), centroid:cnt, isQuad:false };
  });
}

function getFacesForLevel(n) {
  switch(n){ case 1:return buildCubeFaces(); case 2:return buildOctaFaces();
    case 3:return buildIcoFaces(0); case 4:return buildIcoFaces(1);
    case 5:return buildIcoFaces(2); case 6:return buildIcoFaces(3); default:return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// COLORS & SLOTS
// ─────────────────────────────────────────────────────────────────────────────

function sortSlots(slots){ return [...(slots||[])].filter(Boolean).sort((a,b)=>{ const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier); return d||((b.occ?1:0)-(a.occ?1:0)); }); }
function sortByPole(faces){ return [...faces].sort((a,b)=>b.centroid[1]-a.centroid[1]); }
function hex3(hex){ const h=(hex||'#888').replace('#',''); return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]; }

// ─────────────────────────────────────────────────────────────────────────────
// BUFFER DATA builder — génère positions, colors, emissive, triToFace
// ─────────────────────────────────────────────────────────────────────────────

function buildBuffers(assignedFaces) {
  let nTris=0;
  for(const f of assignedFaces) nTris+=f.isQuad?2:1;
  const pos=new Float32Array(nTris*9);
  const col=new Float32Array(nTris*9); // base diffuse (dark metal si vacant)
  const emi=new Float32Array(nTris*9); // emissive glow pour blocs occupés
  const triToFace=new Int32Array(nTris);
  let v=0, t=0;

  const push=(x,y,z, r,g,b, er,eg,eb)=>{
    const i=v*3;
    pos[i]=x;pos[i+1]=y;pos[i+2]=z;
    col[i]=r;col[i+1]=g;col[i+2]=b;
    emi[i]=er;emi[i+1]=eg;emi[i+2]=eb;
    v++;
  };

  assignedFaces.forEach((face,fi)=>{
    const slot=face.slot;
    const occ=slot?.occ;
    const tier=slot?.tier;
    const tc=tier?hex3(TIER_COLOR[tier]||'#555'):[0.5,0.5,0.5];

    // Diffuse : occupé = couleur tier moyennement lumineux, vacant = métal sombre
    const dr=occ?tc[0]*0.55:0.04, dg=occ?tc[1]*0.55:0.045, db=occ?tc[2]*0.55:0.06;
    // Emissive : occupé = éclat de la couleur, vacant = légère lueur bleuâtre (lumière de l'étoile réfléchie)
    const er=occ?tc[0]*0.70:0.01, eg=occ?tc[1]*0.70:0.012, eb=occ?tc[2]*0.70:0.022;

    const vs=face.verts;
    push(vs[0][0],vs[0][1],vs[0][2], dr,dg,db, er,eg,eb);
    push(vs[1][0],vs[1][1],vs[1][2], dr,dg,db, er,eg,eb);
    push(vs[2][0],vs[2][1],vs[2][2], dr,dg,db, er,eg,eb);
    triToFace[t++]=fi;
    if(face.isQuad){
      push(vs[0][0],vs[0][1],vs[0][2], dr,dg,db, er,eg,eb);
      push(vs[2][0],vs[2][1],vs[2][2], dr,dg,db, er,eg,eb);
      push(vs[3][0],vs[3][1],vs[3][2], dr,dg,db, er,eg,eb);
      triToFace[t++]=fi;
    }
  });
  return { pos, col, emi, triToFace };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3D — Three.js manager
// ─────────────────────────────────────────────────────────────────────────────

class Scene3D {
  constructor(canvas){
    this.canvas=canvas; this.T=null; this.G=null;
    this.renderer=null; this.scene=null; this.camera=null;
    this.panelMesh=null; this.gridLines=null;
    this.star=null; this.corona=[];
    this.stars=null;
    this.raycaster=null; this.triToFace=null; this.faceSlots=[];
    this.rot={x:0.18,y:0}; this.vel={x:0,y:0};
    this.isDragging=false; this.touchStart=null; this.pinchDist=null;
    this.zoomTarget=24; this.zoomCurrent=24;
    this.animId=null; this.transitioning=false;
    this.onFaceClick=null; this._h={};
    this._t0=Date.now();
  }

  async init(THREE,GSAP){
    this.T=THREE; this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;

    // Renderer
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(W,H,false);
    this.renderer.setClearColor(0x00010a,1);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.1;

    // Scene
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x00010a,0.014);

    // Camera
    this.camera=new THREE.PerspectiveCamera(42,W/H,0.1,600);
    this.camera.position.z=this.zoomCurrent;

    this.raycaster=new THREE.Raycaster();

    // Éclairage
    this.scene.add(new THREE.AmbientLight(0x060815,3.0));

    // Soleil central — lumières multiples pour simuler le rayonnement
    const starCore=new THREE.PointLight(0xfff4cc,6.0,50);
    starCore.position.set(0,0,0);
    this.scene.add(starCore);
    this._starCore=starCore;

    const corona1=new THREE.PointLight(0xff7700,2.5,35);
    corona1.position.set(0,0,0);
    this.scene.add(corona1);

    const corona2=new THREE.PointLight(0xffffff,1.5,60);
    corona2.position.set(0,0,0);
    this.scene.add(corona2);

    // Fill light bleu froid (cosmos)
    const fill=new THREE.DirectionalLight(0x1a3a7a,0.8);
    fill.position.set(-20,-10,-20);
    this.scene.add(fill);

    // Rim violet
    const rim=new THREE.PointLight(0x6600cc,0.6,80);
    rim.position.set(10,-18,18);
    this.scene.add(rim);

    this._buildStar();
    this._buildStarfield();
    this._bindEvents();
    this._animate();
  }

  _buildStar(){
    const T=this.T;

    // Noyau brillant
    const core=new T.Mesh(
      new T.SphereGeometry(STAR_R,32,32),
      new T.MeshBasicMaterial({color:0xfffff0})
    );
    this.scene.add(core);
    this.star=core;

    // Couches de corona (halos additifs de plus en plus grands)
    const coronaData=[
      {r:STAR_R*1.5, col:0xfff8cc, op:0.55},
      {r:STAR_R*2.2, col:0xffb300, op:0.28},
      {r:STAR_R*3.2, col:0xff6600, op:0.13},
      {r:STAR_R*4.8, col:0x441100, op:0.06},
    ];
    this.corona=[];
    for(const d of coronaData){
      const m=new T.Mesh(
        new T.SphereGeometry(d.r,24,24),
        new T.MeshBasicMaterial({color:d.col,transparent:true,opacity:d.op,side:T.BackSide,depthWrite:false})
      );
      this.scene.add(m);
      this.corona.push(m);
    }

    // Sphère interne de la Dyson — laisse voir la lumière dans les gaps
    // (on ne l'ajoute pas, la lumière des PointLights perce naturellement les gaps)
  }

  _buildStarfield(){
    const T=this.T, N=5000;
    const pos=new Float32Array(N*3), col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      const r=90+Math.random()*180;
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2]=r*Math.cos(phi);
      // Couleurs d'étoiles : bleu-blanc, blanc chaud, orange
      const p=Math.random();
      if(p<0.3){ col[i*3]=0.7;col[i*3+1]=0.82;col[i*3+2]=1.0; }
      else if(p<0.7){ col[i*3]=1.0;col[i*3+1]=0.98;col[i*3+2]=0.94; }
      else{ col[i*3]=1.0;col[i*3+1]=0.78;col[i*3+2]=0.55; }
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.stars=new T.Points(geo,new T.PointsMaterial({size:0.22,vertexColors:true,transparent:true,opacity:0.9,sizeAttenuation:true}));
    this.scene.add(this.stars);
  }

  _buildMesh(assignedFaces){
    const T=this.T;
    // Cleanup ancienne géométrie
    if(this.panelMesh){ this.scene.remove(this.panelMesh); this.panelMesh.geometry.dispose(); this.panelMesh.material.dispose(); this.panelMesh=null; }
    if(this.gridLines){ this.scene.remove(this.gridLines); this.gridLines.geometry.dispose(); this.gridLines.material.dispose(); this.gridLines=null; }
    if(!assignedFaces?.length) return;

    this.faceSlots=assignedFaces.map(f=>f.slot||null);
    const {pos,col,emi,triToFace}=buildBuffers(assignedFaces);
    this.triToFace=triToFace;

    // ── Panneaux principaux — MeshStandardMaterial métal ──
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    geo.setAttribute('emissive',new T.BufferAttribute(emi,3)); // on va l'utiliser dans le shader via onBeforeCompile
    geo.computeVertexNormals();

    // On simule emissive par vertex via onBeforeCompile
    const mat=new T.MeshStandardMaterial({
      vertexColors:true,
      flatShading:true,
      metalness:0.72,
      roughness:0.30,
      side:T.DoubleSide,
      envMapIntensity:0.5,
    });

    // Injecter le vertex emissive dans le shader
    mat.onBeforeCompile=(shader)=>{
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nattribute vec3 emissive;\nvarying vec3 vEmissive;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvEmissive=emissive;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>','#include <common>\nvarying vec3 vEmissive;')
        .replace('vec3 totalEmissiveRadiance = emissive;','vec3 totalEmissiveRadiance = emissive + vEmissive;');
    };
    mat.needsUpdate=true;

    this.panelMesh=new T.Mesh(geo,mat);
    this.panelMesh.rotation.x=this.rot.x;
    this.panelMesh.rotation.y=this.rot.y;
    this.scene.add(this.panelMesh);

    // ── Lignes de grille — armature de la sphère Dyson ──
    this._buildGrid(assignedFaces);
  }

  _buildGrid(assignedFaces){
    const T=this.T;
    // On trace les arêtes de chaque face légèrement en dehors du panneau
    const segments=[];
    const LIFT=1.008; // on soulève légèrement les lignes hors de la surface

    assignedFaces.forEach(face=>{
      const vs=face.verts;
      const n=face.isQuad?4:3;
      for(let i=0;i<n;i++){
        const a=vs[i], b=vs[(i+1)%n];
        segments.push(a[0]*LIFT,a[1]*LIFT,a[2]*LIFT, b[0]*LIFT,b[1]*LIFT,b[2]*LIFT);
      }
    });

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(segments,3));
    const mat=new T.LineBasicMaterial({color:0x1a3050,transparent:true,opacity:0.45,depthWrite:false});
    this.gridLines=new T.LineSegments(geo,mat);
    this.gridLines.rotation.x=this.rot.x;
    this.gridLines.rotation.y=this.rot.y;
    this.scene.add(this.gridLines);
  }

  setFaces(assignedFaces,animate=false){
    if(!animate||this.transitioning){ this._buildMesh(assignedFaces); return; }
    this.transitioning=true;
    const G=this.G;
    const doSwap=()=>{
      this._buildMesh(assignedFaces);
      if(this.panelMesh){
        this.panelMesh.scale.set(0,0,0);
        if(this.gridLines) this.gridLines.scale.set(0,0,0);
        G.to([this.panelMesh.scale, this.gridLines?.scale].filter(Boolean),{
          x:1,y:1,z:1,duration:0.5,ease:'back.out(1.6)',
          onComplete:()=>{this.transitioning=false;}
        });
      } else { this.transitioning=false; }
    };
    if(this.panelMesh){
      G.to([this.panelMesh.scale, this.gridLines?.scale].filter(Boolean),{
        x:0,y:0,z:0,duration:0.2,ease:'power2.in',onComplete:doSwap
      });
    } else { doSwap(); }
  }

  zoom(dy){ this.zoomTarget=Math.max(9,Math.min(52,this.zoomTarget+dy*0.013)); }

  handleClick(cx,cy){
    if(!this.panelMesh||!this.onFaceClick) return;
    const rect=this.canvas.getBoundingClientRect();
    const x=((cx-rect.left)/rect.width)*2-1, y=-((cy-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera({x,y},this.camera);
    const hits=this.raycaster.intersectObject(this.panelMesh);
    if(hits.length){
      const fi=this.triToFace?.[hits[0].faceIndex]??hits[0].faceIndex;
      const slot=this.faceSlots[fi]||null;
      if(slot) this.onFaceClick(slot);
    }
  }

  _bindEvents(){
    const c=this.canvas, h=this._h;
    let lx=0,ly=0,moved=false;

    h.md=(e)=>{ this.isDragging=true;moved=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0}; };
    h.mm=(e)=>{
      if(!this.isDragging)return;
      const dx=e.clientX-lx,dy=e.clientY-ly;
      if(Math.abs(dx)>1||Math.abs(dy)>1)moved=true;
      this.rot.y+=dx*0.005;this.rot.x+=dy*0.005;
      this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));
      this.vel={x:dx*0.005,y:dy*0.005};lx=e.clientX;ly=e.clientY;
    };
    h.mu=(e)=>{ if(!moved)this.handleClick(e.clientX,e.clientY); this.isDragging=false; };

    c.addEventListener('mousedown',h.md);
    window.addEventListener('mousemove',h.mm);
    window.addEventListener('mouseup',h.mu);

    h.ts=(e)=>{
      if(e.touches.length===1){ this.isDragging=true;moved=false;lx=e.touches[0].clientX;ly=e.touches[0].clientY;this.touchStart={x:lx,y:ly};this.pinchDist=null; }
      else if(e.touches.length===2){ this.isDragging=false; const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY; this.pinchDist=Math.sqrt(dx*dx+dy*dy); }
    };
    h.tm=(e)=>{
      e.preventDefault();
      if(e.touches.length===1&&this.isDragging){
        const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;
        if(Math.abs(dx)>2||Math.abs(dy)>2)moved=true;
        this.rot.y+=dx*0.005;this.rot.x+=dy*0.005;
        this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));
        this.vel={x:dx*0.005,y:dy*0.005};lx=e.touches[0].clientX;ly=e.touches[0].clientY;
      } else if(e.touches.length===2&&this.pinchDist!=null){
        const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
        const d=Math.sqrt(dx*dx+dy*dy); this.zoom((this.pinchDist-d)*3); this.pinchDist=d;
      }
    };
    h.te=(e)=>{ if(e.changedTouches.length===1&&!moved&&this.touchStart)this.handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY); this.isDragging=false; };

    c.addEventListener('touchstart',h.ts,{passive:false});
    c.addEventListener('touchmove',h.tm,{passive:false});
    c.addEventListener('touchend',h.te);
  }

  _animate(){
    this.animId=requestAnimationFrame(()=>this._animate());
    const t=(Date.now()-this._t0)*0.001;

    if(!this.isDragging){
      this.rot.y+=this.vel.x;this.rot.x+=this.vel.y;
      this.vel.x*=0.93;this.vel.y*=0.93;
      this.rot.y+=0.0006;
    }

    const rx=this.rot.x, ry=this.rot.y;
    if(this.panelMesh){ this.panelMesh.rotation.x=rx; this.panelMesh.rotation.y=ry; }
    if(this.gridLines){ this.gridLines.rotation.x=rx; this.gridLines.rotation.y=ry; }
    if(this.stars){ this.stars.rotation.y=t*0.001; this.stars.rotation.x=Math.sin(t*0.0003)*0.03; }

    // Pulsation de l'étoile centrale
    if(this._starCore){
      const pulse=1+Math.sin(t*0.9)*0.15+Math.sin(t*2.3)*0.06;
      this._starCore.intensity=6.0*pulse;
    }
    // Corona qui tourne doucement
    this.corona.forEach((m,i)=>{ m.rotation.y=t*(0.004+i*0.001); m.rotation.z=Math.sin(t*0.2+i)*0.04; });

    // Smooth zoom
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.07;
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
    this.canvas.removeEventListener('mousedown',h.md);
    window.removeEventListener('mousemove',h.mm);
    window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts);
    this.canvas.removeEventListener('touchmove',h.tm);
    this.canvas.removeEventListener('touchend',h.te);
    if(this.panelMesh){this.panelMesh.geometry.dispose();this.panelMesh.material.dispose();}
    if(this.gridLines){this.gridLines.geometry.dispose();this.gridLines.material.dispose();}
    if(this.renderer) this.renderer.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const LevelDots = memo(function LevelDots({level,onLevel}){
  return(
    <div style={{position:'absolute',bottom:22,left:'50%',transform:'translateX(-50%)',
      display:'flex',alignItems:'center',gap:5,zIndex:30,
      padding:'7px 15px',borderRadius:40,
      background:'rgba(0,1,10,0.82)',backdropFilter:'blur(16px)',
      border:'1px solid rgba(255,255,255,0.07)',
    }}>
      {LEVELS.map(lv=>{
        const act=lv.n===level, c=act?U.accent:'rgba(255,255,255,0.22)';
        return(
          <button key={lv.n} onClick={()=>onLevel(lv.n)}
            title={`${lv.icon} ${lv.name}${lv.faces?` · ${lv.faces} panneaux`:''}`}
            style={{width:act?28:16,height:act?28:16,borderRadius:'50%',border:`1.5px solid ${c}`,
              background:act?`${U.accent}1a`:'transparent',color:c,fontSize:act?10:8,fontWeight:700,
              cursor:'pointer',transition:'all 0.22s cubic-bezier(.34,1.56,.64,1)',
              display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.b,
              boxShadow:act?`0 0 16px ${U.accent}66`:'none',padding:0,flexShrink:0,
            }}
          >{act?lv.icon:lv.n}</button>
        );
      })}
    </div>
  );
});

const Legend = memo(function Legend({level,faceCount}){
  return(
    <div style={{position:'absolute',top:12,right:12,zIndex:30,display:'flex',flexDirection:'column',gap:3}}>
      {level>0&&(
        <div style={{padding:'4px 11px',borderRadius:20,marginBottom:4,
          background:'rgba(0,1,10,0.85)',backdropFilter:'blur(10px)',
          border:`1px solid ${U.accent}30`,color:U.accent,fontSize:9,fontWeight:700,
          letterSpacing:'0.08em',textAlign:'right',
        }}>
          {LEVELS[level]?.icon} {LEVELS[level]?.name}
          <span style={{color:U.muted,fontWeight:400}}> · {faceCount} panneaux</span>
        </div>
      )}
      {TIER_ORDER.filter(t=>TIER_COLOR[t]).map(tier=>(
        <div key={tier} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 10px',
          borderRadius:20,background:'rgba(0,1,10,0.80)',backdropFilter:'blur(8px)',
          border:`1px solid ${TIER_COLOR[tier]}20`,
        }}>
          <div style={{width:7,height:7,borderRadius:2,background:TIER_COLOR[tier],
            boxShadow:`0 0 6px ${TIER_COLOR[tier]}`,flexShrink:0}} />
          <span style={{color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:600,letterSpacing:'0.05em'}}>{TIER_LABEL[tier]}</span>
          <span style={{color:TIER_COLOR[tier],fontSize:9,fontWeight:700}}>€{fmt(tier)}/j</span>
        </div>
      ))}
    </div>
  );
});

function ZoomHint(){
  const [v,setV]=useState(true);
  useEffect(()=>{ const t=setTimeout(()=>setV(false),5000); return()=>clearTimeout(t); },[]);
  return(
    <div style={{position:'absolute',bottom:62,left:'50%',transform:'translateX(-50%)',
      color:'rgba(255,255,255,0.25)',fontSize:10,letterSpacing:'0.06em',zIndex:20,
      opacity:v?1:0,transition:'opacity 1.2s',fontFamily:F.b,pointerEvents:'none',whiteSpace:'nowrap',
    }}>
      ↕ molette = zoom · glisser = rotation · clic = détails
    </div>
  );
}

function BlockOverlay({slot,onClose,onRent,onBuyout}){
  if(!slot)return null;
  const color=TIER_COLOR[slot.tier]||U.accent;
  const label=TIER_LABEL[slot.tier]||slot.tier;
  const price=fmt(slot.tier);
  return(
    <div onClick={onClose} style={{position:'absolute',inset:0,zIndex:50,
      background:'rgba(0,0,5,0.82)',backdropFilter:'blur(22px)',
      display:'flex',alignItems:'center',justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{width:290,borderRadius:22,overflow:'hidden',
        background:'linear-gradient(160deg,rgba(5,8,20,0.98),rgba(2,4,14,0.99))',
        border:`1px solid ${color}30`,
        boxShadow:`0 0 80px ${color}1a,0 0 160px ${color}0d,0 32px 80px rgba(0,0,0,0.9)`,
      }}>
        {/* Barre couleur + glow */}
        <div style={{height:4,background:`linear-gradient(90deg,${color},${color}66)`,
          boxShadow:`0 0 20px ${color}88`}} />

        <div style={{padding:'20px 22px 24px'}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',
              borderRadius:20,background:`${color}12`,border:`1px solid ${color}35`,
            }}>
              <div style={{width:7,height:7,borderRadius:2,background:color,boxShadow:`0 0 7px ${color}`}} />
              <span style={{color,fontSize:10,fontWeight:800,letterSpacing:'0.07em',fontFamily:F.b}}>{label}</span>
            </div>
            <button onClick={onClose} style={{width:28,height:28,borderRadius:'50%',
              background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',
              color:U.muted,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            }}>×</button>
          </div>

          {/* Panneau visuel */}
          <div style={{width:60,height:60,borderRadius:14,marginBottom:16,
            background:slot.occ?`linear-gradient(135deg,${color}20,${color}08)`:'rgba(255,255,255,0.02)',
            border:`2px solid ${color}${slot.occ?'50':'1a'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:22,fontWeight:900,color,fontFamily:F.h,
            boxShadow:slot.occ?`0 0 30px ${color}35,inset 0 0 20px ${color}12`:'none',
          }}>
            {slot.tenant?.l||(slot.occ?'◉':'○')}
          </div>

          <div style={{color:U.text,fontSize:15,fontWeight:700,fontFamily:F.h,marginBottom:5}}>
            {slot.occ?(slot.tenant?.name||`Panneau ${label}`):`Panneau ${label} disponible`}
          </div>
          <div style={{color:U.muted,fontSize:11,marginBottom:18,fontFamily:F.b,lineHeight:1.5}}>
            {slot.occ?(slot.tenant?.cta||'Panneau actif · Dyson Sphere ADS-SQUARE')
              :`Visible de l'univers entier · À partir de €${price}/jour`}
          </div>

          <div style={{display:'flex',alignItems:'baseline',gap:5,marginBottom:20}}>
            <span style={{color,fontSize:26,fontWeight:800,fontFamily:F.h}}>€{price}</span>
            <span style={{color:U.muted,fontSize:11,fontFamily:F.b}}>/jour</span>
          </div>

          {!slot.occ?(
            <button onClick={()=>onRent(slot)} style={{width:'100%',padding:'13px 0',borderRadius:12,
              background:`linear-gradient(135deg,${color},${color}99)`,border:'none',color:U.accentFg,
              fontSize:13,fontWeight:800,fontFamily:F.b,cursor:'pointer',
              boxShadow:`0 0 28px ${color}50,0 8px 24px rgba(0,0,0,0.5)`,
            }}>
              Réserver ce panneau →
            </button>
          ):(
            <button onClick={()=>onBuyout(slot)} style={{width:'100%',padding:'13px 0',borderRadius:12,
              background:'rgba(255,255,255,0.03)',border:`1px solid ${color}25`,
              color:U.muted,fontSize:12,fontWeight:600,fontFamily:F.b,cursor:'pointer',
            }}>
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

  const sorted=useMemo(()=>sortSlots(slots),[slots]);

  const assignedFaces=useMemo(()=>{
    if(level===0)return[];
    return sortByPole(getFacesForLevel(level)).map((face,i)=>({
      ...face, slot:sorted[i]||null,
    }));
  },[level,sorted]);

  // Init Three.js
  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let sc;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([THREE,GSAP])=>{
        sc=new Scene3D(canvasRef.current);
        sceneRef.current=sc;
        sc.onFaceClick=slot=>setFocusSlot(slot);
        return sc.init(THREE,GSAP);
      }).then(()=>{ sceneRef.current.setFaces(assignedFaces,false); setLoading(false); })
      .catch(err=>{ console.error('View3D:',err); setError('npm install three gsap'); setLoading(false); });
    return()=>{ if(sc){sc.destroy();} sceneRef.current=null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{ if(!sceneRef.current||level===0)return; sceneRef.current.setFaces(assignedFaces,true); },[assignedFaces,level]);

  // Clavier
  useEffect(()=>{
    const fn=e=>{
      if(e.key>='0'&&e.key<='6') setLevel(parseInt(e.key));
      else if(e.key==='ArrowRight'||e.key==='ArrowUp') setLevel(l=>Math.min(6,l+1));
      else if(e.key==='ArrowLeft'||e.key==='ArrowDown') setLevel(l=>Math.max(1,l-1));
      else if(e.key==='Escape') setFocusSlot(null);
    };
    window.addEventListener('keydown',fn);
    return()=>window.removeEventListener('keydown',fn);
  },[]);

  // Molette = zoom
  useEffect(()=>{
    const fn=e=>{ e.preventDefault(); sceneRef.current?.zoom(e.deltaY); };
    const c=canvasRef.current;
    if(c) c.addEventListener('wheel',fn,{passive:false});
    return()=>{ if(c)c.removeEventListener('wheel',fn); };
  },[level]);

  // Resize
  useEffect(()=>{
    if(!canvasRef.current)return;
    const ro=new ResizeObserver(()=>sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return()=>ro.disconnect();
  },[]);

  const goLevel=useCallback(n=>{ setFocusSlot(null); setLevel(n); },[]);

  // Niveau 0 : 2D
  if(level===0){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <button onClick={()=>goLevel(1)} style={{
          position:'absolute',top:10,right:10,zIndex:100,
          display:'flex',alignItems:'center',gap:7,padding:'7px 16px',borderRadius:20,
          background:'rgba(0,1,10,0.92)',border:`1px solid ${U.accent}45`,
          backdropFilter:'blur(12px)',color:U.accent,fontSize:11,fontWeight:700,cursor:'pointer',
          fontFamily:F.b,boxShadow:`0 0 24px ${U.accent}28`,
        }}>◎ Dyson Sphere 3D</button>
        {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
      </div>
    );
  }

  // Niveaux 1-6 : Three.js
  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:U.bg}}>
      <canvas ref={canvasRef} style={{
        width:'100%',height:'100%',display:'block',outline:'none',
        cursor:focusSlot?'default':'grab',
        opacity:loading?0:1,transition:'opacity 0.6s ease',
      }}/>

      {loading&&!error&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',gap:18,background:U.bg}}>
          <div style={{
            position:'relative',width:48,height:48,display:'flex',alignItems:'center',justifyContent:'center',
          }}>
            <div style={{position:'absolute',width:48,height:48,borderRadius:'50%',
              border:`2px solid rgba(255,255,255,0.05)`,borderTopColor:U.accent,
              animation:'dysonSpin 1s linear infinite'}} />
            <div style={{width:10,height:10,borderRadius:'50%',background:'#fff9cc',
              boxShadow:`0 0 20px #ffcc44,0 0 40px #ff8800`}} />
          </div>
          <div style={{color:U.muted,fontSize:11,letterSpacing:'0.12em',fontFamily:F.b}}>CONSTRUCTION DE LA SPHÈRE DE DYSON…</div>
        </div>
      )}

      {error&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',gap:12,padding:24,background:U.bg}}>
          <div style={{color:U.err,fontSize:13,fontWeight:700}}>⚠ {error}</div>
          <button onClick={()=>goLevel(0)} style={{padding:'10px 20px',borderRadius:10,
            background:U.accent,border:'none',color:U.accentFg,fontWeight:700,cursor:'pointer',fontFamily:F.b,
          }}>Grille 2D</button>
        </div>
      )}

      {/* Retour 2D */}
      <button onClick={()=>goLevel(0)} style={{
        position:'absolute',top:12,left:12,zIndex:30,
        display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:20,
        background:'rgba(0,1,10,0.82)',border:`1px solid ${U.border2}`,
        backdropFilter:'blur(10px)',color:U.muted,fontSize:10,fontWeight:600,
        cursor:'pointer',fontFamily:F.b,letterSpacing:'0.04em',
      }}>◫ Vue 2D</button>

      <Legend level={level} faceCount={LEVELS[level]?.faces||0}/>
      <LevelDots level={level} onLevel={goLevel}/>
      {!loading&&<ZoomHint/>}

      {focusSlot&&(
        <BlockOverlay slot={focusSlot}
          onClose={()=>setFocusSlot(null)}
          onRent={s=>{ setFocusSlot(null); onCheckout?.(s); }}
          onBuyout={s=>{ setFocusSlot(null); onBuyout?.(s); }}
        />
      )}

      <style>{`
        @keyframes dysonSpin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}
