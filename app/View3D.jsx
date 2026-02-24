'use client';
/**
 * ─── ADS·SQUARE — View3D ████████████████████████████████████████████████████
 *  COSMIC PREMIUM EDITION — Redesign UI/UX
 *
 * Niveau 0 : Grille 2D existante
 * Niveau 1 : Cube        →   6 faces
 * Niveau 2 : Octaèdre    →   8 faces
 * Niveau 3 : Icosaèdre   →  20 faces
 * Niveau 4 : Sphère I    →  80 faces
 * Niveau 5 : Sphère II   → 320 faces
 * Niveau 6 : Cosmos      → 1280 faces
 *
 * Molette = zoom | Dots / Touches 0–6 = changement de niveau
 * deps: npm install three gsap
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ── Design tokens ─────────────────────────────────────────────────────────────
const U = {
  bg: '#020408',
  bgDeep: '#010205',
  text: '#f0f4ff',
  muted: 'rgba(200,210,255,0.42)',
  mutedLo: 'rgba(200,210,255,0.22)',
  accent: '#d4a84b',
  accentBright: '#f0c060',
  accentFg: '#080808',
  border: 'rgba(255,255,255,0.06)',
  border2: 'rgba(255,255,255,0.12)',
  glass: 'rgba(4,8,20,0.82)',
  glassMid: 'rgba(6,10,28,0.72)',
  err: '#ff4d6d',
};
const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
  m: "'Courier New',monospace",
};
const priceEur = tier => ((TIER_PRICE[tier] || 100) / 100).toLocaleString('fr-FR');

// ── Tier ordering (pole → equator) ───────────────────────────────────────────
const TIER_ORDER = ['epicenter', 'prestige', 'elite', 'business', 'standard', 'viral'];

// ── Level config ──────────────────────────────────────────────────────────────
const LEVELS = [
  { n: 0, name: 'Grille 2D',   icon: '◫',  faces: 0    },
  { n: 1, name: 'Cube',        icon: '⬛',  faces: 6    },
  { n: 2, name: 'Octaèdre',    icon: '◆',  faces: 8    },
  { n: 3, name: 'Icosaèdre',   icon: '⬡',  faces: 20   },
  { n: 4, name: 'Sphère I',    icon: '◎',  faces: 80   },
  { n: 5, name: 'Sphère II',   icon: '◉',  faces: 320  },
  { n: 6, name: 'Cosmos',      icon: '✦',  faces: 1280 },
];

const SPHERE_R = 6;

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildCubeFaces() {
  const a = SPHERE_R / Math.sqrt(3);
  const raw = [
    [[-a, a,-a],[-a, a, a],[ a, a, a],[ a, a,-a]],
    [[ a,-a,-a],[ a,-a, a],[-a,-a, a],[-a,-a,-a]],
    [[-a,-a, a],[ a,-a, a],[ a, a, a],[-a, a, a]],
    [[ a,-a,-a],[-a,-a,-a],[-a, a,-a],[ a, a,-a]],
    [[ a,-a, a],[ a, a, a],[ a, a,-a],[ a,-a,-a]],
    [[-a,-a,-a],[-a, a,-a],[-a, a, a],[-a,-a, a]],
  ];
  return raw.map(vs => ({
    verts: vs,
    centroid: [vs.reduce((s,v)=>s+v[0],0)/4, vs.reduce((s,v)=>s+v[1],0)/4, vs.reduce((s,v)=>s+v[2],0)/4],
    isQuad: true,
  }));
}

function buildOctaFaces() {
  const R = SPHERE_R;
  const v = [[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];
  const fi = [[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]];
  return fi.map(([a,b,c]) => {
    const vs = [v[a],v[b],v[c]];
    return { verts: vs, centroid: [(vs[0][0]+vs[1][0]+vs[2][0])/3,(vs[0][1]+vs[1][1]+vs[2][1])/3,(vs[0][2]+vs[1][2]+vs[2][2])/3], isQuad: false };
  });
}

function midOnSphere(a, b) {
  const m = a.map((c,i) => (c+b[i])/2);
  const l = Math.hypot(...m);
  return m.map(c => c/l);
}

function buildIcoFaces(subdivisions) {
  const phi = (1+Math.sqrt(5))/2;
  const rawV = [[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v => { const l=Math.hypot(...v); return v.map(c=>c/l); });
  let faces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]].map(f=>f.map(i=>rawV[i]));
  for (let s=0;s<subdivisions;s++) {
    const next=[];
    for (const [a,b,c] of faces) {
      const ab=midOnSphere(a,b), bc=midOnSphere(b,c), ca=midOnSphere(c,a);
      next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);
    }
    faces=next;
  }
  const R=SPHERE_R;
  return faces.map(([a,b,c]) => {
    const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];
    return { verts:vs, centroid:[(vs[0][0]+vs[1][0]+vs[2][0])/3,(vs[0][1]+vs[1][1]+vs[2][1])/3,(vs[0][2]+vs[1][2]+vs[2][2])/3], isQuad:false };
  });
}

function getFacesForLevel(level) {
  switch(level) {
    case 1: return buildCubeFaces();
    case 2: return buildOctaFaces();
    case 3: return buildIcoFaces(0);
    case 4: return buildIcoFaces(1);
    case 5: return buildIcoFaces(2);
    case 6: return buildIcoFaces(3);
    default: return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT & COLOR HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function sortSlotsByTier(slots) {
  return [...(slots||[])].filter(Boolean).sort((a,b) => {
    const diff = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    if (diff!==0) return diff;
    return (b.occ?1:0)-(a.occ?1:0);
  });
}

function sortFacesByPole(faces) {
  return [...faces].sort((a,b) => b.centroid[1]-a.centroid[1]);
}

function hexToRgb(hex) {
  const h=(hex||'#888888').replace('#','');
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

function faceColor(slot) {
  if (!slot) return [0.010,0.012,0.022];
  const [r,g,b]=hexToRgb(TIER_COLOR[slot.tier]||'#555');
  const br=slot.occ?1.0:0.18;
  return [r*br, g*br, b*br];
}

// ─────────────────────────────────────────────────────────────────────────────
// BUFFER GEOMETRY BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildBufferData(assignedFaces) {
  let nTris=0;
  for (const f of assignedFaces) nTris += f.isQuad ? 2 : 1;
  const positions = new Float32Array(nTris*9);
  const colors    = new Float32Array(nTris*9);
  const triToFace = new Int32Array(nTris);
  let v=0, t=0;
  const push=(x,y,z,r,g,b)=>{
    const i=v*3;
    positions[i]=x; positions[i+1]=y; positions[i+2]=z;
    colors[i]=r;    colors[i+1]=g;    colors[i+2]=b;
    v++;
  };
  assignedFaces.forEach((face,fi)=>{
    const [r,g,b]=face.color;
    const vs=face.verts;
    push(vs[0][0],vs[0][1],vs[0][2],r,g,b);
    push(vs[1][0],vs[1][1],vs[1][2],r,g,b);
    push(vs[2][0],vs[2][1],vs[2][2],r,g,b);
    triToFace[t++]=fi;
    if (face.isQuad) {
      push(vs[0][0],vs[0][1],vs[0][2],r,g,b);
      push(vs[2][0],vs[2][1],vs[2][2],r,g,b);
      push(vs[3][0],vs[3][1],vs[3][2],r,g,b);
      triToFace[t++]=fi;
    }
  });
  return { positions, colors, triToFace };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3D CLASS — COSMIC PREMIUM EDITION
// ─────────────────────────────────────────────────────────────────────────────

class Scene3D {
  constructor(canvas) {
    this.canvas=canvas; this.T=null; this.G=null;
    this.renderer=null; this.scene=null; this.camera=null;
    this.mesh=null; this.wireframe=null; this.stars=null; this.atmo=null;
    this.ring1=null; this.ring2=null; this.ring3=null;
    this.epicLight=null; this.presLight=null; this.rimLight=null;
    this.raycaster=null; this.triToFace=null; this.faceSlots=[];
    this.rot={x:0.25,y:0}; this.vel={x:0,y:0};
    this.isDragging=false; this.touchStart=null; this.pinchDist=null;
    this.zoomTarget=22; this.zoomCurrent=22;
    this.animId=null; this.transitioning=false;
    this.onFaceClick=null; this._h={};
    this.hoveredFaceIdx = -1;
    this.mousePos = {x:0,y:0};
  }

  async init(THREE, GSAP) {
    this.T=THREE; this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;

    // Renderer — high quality
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas, antialias:true, alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2.5));
    this.renderer.setSize(W,H,false);
    this.renderer.setClearColor(0x010205, 1);
    this.renderer.shadowMap && (this.renderer.shadowMap.enabled = false);

    // Scene
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x010205, 0.012);

    // Camera
    this.camera=new THREE.PerspectiveCamera(42, W/H, 0.1, 800);
    this.camera.position.z=this.zoomCurrent;

    // Raycaster
    this.raycaster=new THREE.Raycaster();

    // ── Lights — cinematic rig ─────────────────────────────────────────────
    // Deep ambient — near black
    this.scene.add(new THREE.AmbientLight(0x05081a, 3.5));

    // Key light — warm off-white from upper-right
    const sun=new THREE.DirectionalLight(0xfff4e0, 3.2);
    sun.position.set(16, 22, 18);
    this.scene.add(sun);

    // Cold fill — blue-purple from lower-left
    const fill=new THREE.PointLight(0x1a3aff, 1.8, 200);
    fill.position.set(-26, -12, -18);
    this.scene.add(fill);

    // Rim/hair light — magenta from behind-below
    this.rimLight=new THREE.PointLight(0xff2090, 1.2, 120);
    this.rimLight.position.set(8, -20, -25);
    this.scene.add(this.rimLight);

    // Prestige pink light
    this.presLight=new THREE.PointLight(0xff4d8f, 0, 50);
    this.presLight.position.set(6, 7, 6);
    this.scene.add(this.presLight);

    // Epicenter gold light — north pole
    this.epicLight=new THREE.PointLight(0xf0c060, 0, 40);
    this.epicLight.position.set(0, 9, 0);
    this.scene.add(this.epicLight);

    // Extra accent — cyan from right
    const cyan=new THREE.PointLight(0x00d9f5, 0.6, 90);
    cyan.position.set(30, 0, 15);
    this.scene.add(cyan);

    this._buildStars();
    this._buildAtmosphere();
    this._buildOrbitRings();
    this._bindEvents();
    this._animate();
  }

  _buildStars() {
    const T=this.T;
    // Layer 1 — distant stars
    const N1=6000;
    const pos1=new Float32Array(N1*3), col1=new Float32Array(N1*3);
    for (let i=0;i<N1;i++) {
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      const r=120+Math.random()*280;
      pos1[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos1[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos1[i*3+2]=r*Math.cos(phi);
      const t=Math.random();
      // Mix of white-blue-gold stars
      if (t < 0.7) {
        col1[i*3]=0.65+t*0.35; col1[i*3+1]=0.72+t*0.18; col1[i*3+2]=0.90+t*0.10;
      } else if (t < 0.85) {
        col1[i*3]=1.0; col1[i*3+1]=0.92; col1[i*3+2]=0.65; // gold
      } else {
        col1[i*3]=0.80; col1[i*3+1]=0.55; col1[i*3+2]=1.0; // purple
      }
    }
    const geo1=new T.BufferGeometry();
    geo1.setAttribute('position',new T.BufferAttribute(pos1,3));
    geo1.setAttribute('color',new T.BufferAttribute(col1,3));
    this.stars=new T.Points(geo1,new T.PointsMaterial({size:0.18,vertexColors:true,transparent:true,opacity:0.92,sizeAttenuation:true}));
    this.scene.add(this.stars);

    // Layer 2 — closer bright stars
    const N2=400;
    const pos2=new Float32Array(N2*3), col2=new Float32Array(N2*3);
    for (let i=0;i<N2;i++) {
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      const r=70+Math.random()*60;
      pos2[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos2[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos2[i*3+2]=r*Math.cos(phi);
      col2[i*3]=1; col2[i*3+1]=0.95; col2[i*3+2]=0.8;
    }
    const geo2=new T.BufferGeometry();
    geo2.setAttribute('position',new T.BufferAttribute(pos2,3));
    geo2.setAttribute('color',new T.BufferAttribute(col2,3));
    this.stars2=new T.Points(geo2,new T.PointsMaterial({size:0.45,vertexColors:true,transparent:true,opacity:0.75,sizeAttenuation:true}));
    this.scene.add(this.stars2);
  }

  _buildAtmosphere() {
    const T=this.T;
    // Inner atmosphere — layered glows
    this.atmo=new T.Mesh(
      new T.SphereGeometry(SPHERE_R+0.18, 64, 64),
      new T.MeshBasicMaterial({color:0x0a1540, transparent:true, opacity:0.12, side:T.BackSide})
    );
    this.scene.add(this.atmo);

    // Outer halo layer 1 — blue
    const halo1=new T.Mesh(
      new T.SphereGeometry(SPHERE_R+1.2, 32, 32),
      new T.MeshBasicMaterial({color:0x0522aa, transparent:true, opacity:0.06, side:T.BackSide})
    );
    this.scene.add(halo1);

    // Outer halo layer 2 — very large subtle
    const halo2=new T.Mesh(
      new T.SphereGeometry(SPHERE_R+3.0, 24, 24),
      new T.MeshBasicMaterial({color:0x020820, transparent:true, opacity:0.04, side:T.BackSide})
    );
    this.scene.add(halo2);

    // Store refs
    this._halo1=halo1; this._halo2=halo2;
  }

  _buildOrbitRings() {
    const T=this.T;
    const makeRing=(innerR, outerR, color, opacity, tilt)=>{
      const geo=new T.RingGeometry(innerR, outerR, 128);
      const mat=new T.MeshBasicMaterial({color, transparent:true, opacity, side:T.DoubleSide});
      const ring=new T.Mesh(geo, mat);
      if (tilt) ring.rotation.x=tilt;
      return ring;
    };

    // Ring 1 — equatorial, gold, thin
    this.ring1=makeRing(SPHERE_R+0.9, SPHERE_R+1.05, 0xd4a84b, 0.18, Math.PI/2);
    this.scene.add(this.ring1);

    // Ring 2 — tilted, cyan, thinner
    this.ring2=makeRing(SPHERE_R+1.4, SPHERE_R+1.5, 0x00d9f5, 0.12, Math.PI/2);
    this.ring2.rotation.z=Math.PI/5;
    this.ring2.rotation.x=Math.PI/2.8;
    this.scene.add(this.ring2);

    // Ring 3 — perpendicular, magenta
    this.ring3=makeRing(SPHERE_R+2.0, SPHERE_R+2.08, 0xff4d8f, 0.08, 0);
    this.ring3.rotation.y=Math.PI/6;
    this.scene.add(this.ring3);
  }

  _buildMesh(assignedFaces) {
    const T=this.T;

    // Dispose old mesh + wireframe
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh=null;
    }
    if (this.wireframe) {
      this.scene.remove(this.wireframe);
      this.wireframe.geometry.dispose();
      this.wireframe.material.dispose();
      this.wireframe=null;
    }
    if (!assignedFaces?.length) return;

    this.faceSlots=assignedFaces.map(f=>f.slot||null);
    const {positions,colors,triToFace}=buildBufferData(assignedFaces);
    this.triToFace=triToFace;

    // Main mesh geometry
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(positions,3));
    geo.setAttribute('color',new T.BufferAttribute(colors,3));
    geo.computeVertexNormals();

    // Premium material — standard for more realistic shading
    const mat=new T.MeshPhongMaterial({
      vertexColors:true,
      flatShading:true,
      side:T.DoubleSide,
      shininess:90,
      specular:new T.Color(0x223366),
    });

    this.mesh=new T.Mesh(geo,mat);
    this.mesh.rotation.x=this.rot.x;
    this.mesh.rotation.y=this.rot.y;
    this.scene.add(this.mesh);

    // Wireframe overlay — subtle premium edge lines
    const wGeo=new T.EdgesGeometry(geo);
    const wMat=new T.LineBasicMaterial({
      color:0x4466cc,
      transparent:true,
      opacity:0.12,
    });
    this.wireframe=new T.LineSegments(wGeo, wMat);
    this.wireframe.rotation.x=this.rot.x;
    this.wireframe.rotation.y=this.rot.y;
    this.scene.add(this.wireframe);

    // Epicenter + prestige lights
    const hasEpic=assignedFaces[0]?.slot?.tier==='epicenter';
    const hasPrestige=assignedFaces.some(f=>f.slot?.tier==='prestige'&&f.slot?.occ);
    this.epicLight.intensity=hasEpic?2.2:0;
    this.presLight.intensity=hasPrestige?0.8:0;
  }

  setFaces(assignedFaces, animate=false) {
    if (!animate) { this._buildMesh(assignedFaces); return; }
    if (this.transitioning) { this._buildMesh(assignedFaces); return; }
    this.transitioning=true;
    const G=this.G;
    const doSwap=()=>{
      this._buildMesh(assignedFaces);
      if (this.mesh) {
        this.mesh.scale.set(0,0,0);
        if (this.wireframe) this.wireframe.scale.set(0,0,0);
        G.to(this.mesh.scale,{x:1,y:1,z:1,duration:0.55,ease:'back.out(1.6)',onComplete:()=>{this.transitioning=false;}});
        if (this.wireframe) G.to(this.wireframe.scale,{x:1,y:1,z:1,duration:0.55,ease:'back.out(1.6)'});
      } else { this.transitioning=false; }
    };
    if (this.mesh) {
      G.to(this.mesh.scale,{x:0,y:0,z:0,duration:0.25,ease:'power3.in',onComplete:doSwap});
      if (this.wireframe) G.to(this.wireframe.scale,{x:0,y:0,z:0,duration:0.25,ease:'power3.in'});
    } else { doSwap(); }
  }

  zoom(deltaY) {
    this.zoomTarget=Math.max(9,Math.min(48,this.zoomTarget+deltaY*0.013));
  }

  handleClick(cx,cy) {
    if (!this.mesh||!this.onFaceClick) return;
    const rect=this.canvas.getBoundingClientRect();
    const x=((cx-rect.left)/rect.width)*2-1;
    const y=-((cy-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera({x,y},this.camera);
    const hits=this.raycaster.intersectObject(this.mesh);
    if (hits.length>0) {
      const fi=this.triToFace?.[hits[0].faceIndex]??hits[0].faceIndex;
      const slot=this.faceSlots[fi]||null;
      if (slot) this.onFaceClick(slot);
    }
  }

  _bindEvents() {
    const canvas=this.canvas, h=this._h;
    let lx=0,ly=0,moved=false;

    h.md=(e)=>{ this.isDragging=true; moved=false; lx=e.clientX; ly=e.clientY; this.vel={x:0,y:0}; };
    h.mm=(e)=>{
      if (!this.isDragging) return;
      const dx=e.clientX-lx, dy=e.clientY-ly;
      if (Math.abs(dx)>1||Math.abs(dy)>1) moved=true;
      this.rot.y+=dx*0.005; this.rot.x+=dy*0.005;
      this.rot.x=Math.max(-1.4,Math.min(1.4,this.rot.x));
      this.vel={x:dx*0.005,y:dy*0.005};
      lx=e.clientX; ly=e.clientY;
    };
    h.mu=(e)=>{ if(!moved) this.handleClick(e.clientX,e.clientY); this.isDragging=false; };

    canvas.addEventListener('mousedown',h.md);
    window.addEventListener('mousemove',h.mm);
    window.addEventListener('mouseup',h.mu);

    h.ts=(e)=>{
      if (e.touches.length===1) {
        this.isDragging=true; moved=false;
        lx=e.touches[0].clientX; ly=e.touches[0].clientY;
        this.touchStart={x:lx,y:ly}; this.pinchDist=null;
      } else if (e.touches.length===2) {
        this.isDragging=false;
        const dx=e.touches[0].clientX-e.touches[1].clientX;
        const dy=e.touches[0].clientY-e.touches[1].clientY;
        this.pinchDist=Math.sqrt(dx*dx+dy*dy);
      }
    };
    h.tm=(e)=>{
      e.preventDefault();
      if (e.touches.length===1&&this.isDragging) {
        const dx=e.touches[0].clientX-lx, dy=e.touches[0].clientY-ly;
        if (Math.abs(dx)>2||Math.abs(dy)>2) moved=true;
        this.rot.y+=dx*0.005; this.rot.x+=dy*0.005;
        this.rot.x=Math.max(-1.4,Math.min(1.4,this.rot.x));
        this.vel={x:dx*0.005,y:dy*0.005};
        lx=e.touches[0].clientX; ly=e.touches[0].clientY;
      } else if (e.touches.length===2&&this.pinchDist!==null) {
        const dx=e.touches[0].clientX-e.touches[1].clientX;
        const dy=e.touches[0].clientY-e.touches[1].clientY;
        const d=Math.sqrt(dx*dx+dy*dy);
        this.zoom((this.pinchDist-d)*3);
        this.pinchDist=d;
      }
    };
    h.te=(e)=>{
      if (e.changedTouches.length===1&&!moved&&this.touchStart)
        this.handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY);
      this.isDragging=false;
    };

    canvas.addEventListener('touchstart',h.ts,{passive:false});
    canvas.addEventListener('touchmove',h.tm,{passive:false});
    canvas.addEventListener('touchend',h.te);
  }

  _animate() {
    this.animId=requestAnimationFrame(()=>this._animate());
    const t=Date.now()*0.001;

    if (!this.isDragging) {
      this.rot.y+=this.vel.x; this.rot.x+=this.vel.y;
      this.vel.x*=0.93; this.vel.y*=0.93;
      this.rot.y+=0.0006; // gentle auto-rotate
    }

    if (this.mesh) { this.mesh.rotation.x=this.rot.x; this.mesh.rotation.y=this.rot.y; }
    if (this.wireframe) { this.wireframe.rotation.x=this.rot.x; this.wireframe.rotation.y=this.rot.y; }
    if (this.atmo) this.atmo.rotation.y=t*0.0025;
    if (this.stars) { this.stars.rotation.y=t*0.0009; this.stars.rotation.x=Math.sin(t*0.00015)*0.03; }
    if (this.stars2) { this.stars2.rotation.y=-t*0.0014; }

    // Orbit rings — slow counter-rotating
    if (this.ring1) { this.ring1.rotation.z=t*0.08; }
    if (this.ring2) { this.ring2.rotation.z=this.ring2.rotation.z; this.ring2.rotation.y=t*0.06; }
    if (this.ring3) { this.ring3.rotation.z=-t*0.04; this.ring3.rotation.x=Math.sin(t*0.03)*0.1; }

    // Smooth zoom
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.07;
    this.camera.position.z=this.zoomCurrent;

    // Epicenter gold pulse
    if (this.epicLight?.intensity>0) {
      this.epicLight.intensity=1.8+Math.sin(t*1.6)*0.8;
    }
    // Prestige pulse — different frequency
    if (this.presLight?.intensity>0) {
      this.presLight.intensity=0.6+Math.sin(t*2.1+1.2)*0.4;
    }
    // Rim light subtle variation
    if (this.rimLight) {
      this.rimLight.intensity=1.0+Math.sin(t*0.7)*0.3;
    }

    // Wireframe opacity breathe
    if (this.wireframe) {
      this.wireframe.material.opacity=0.08+Math.sin(t*0.5)*0.04;
    }

    this.renderer.render(this.scene,this.camera);
  }

  resize() {
    const W=this.canvas.clientWidth, H=this.canvas.clientHeight;
    if (!W||!H) return;
    this.camera.aspect=W/H; this.camera.updateProjectionMatrix();
    this.renderer.setSize(W,H,false);
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    const h=this._h;
    this.canvas.removeEventListener('mousedown',h.md);
    window.removeEventListener('mousemove',h.mm);
    window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts);
    this.canvas.removeEventListener('touchmove',h.tm);
    this.canvas.removeEventListener('touchend',h.te);
    if (this.mesh) { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
    if (this.wireframe) { this.wireframe.geometry.dispose(); this.wireframe.material.dispose(); }
    if (this.renderer) this.renderer.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS — COSMIC PREMIUM
// ─────────────────────────────────────────────────────────────────────────────

// ── Cosmic Loader ──────────────────────────────────────────────────────────────
function CosmicLoader() {
  return (
    <div style={{
      position:'absolute',inset:0,display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',gap:28,
      background:'radial-gradient(ellipse 60% 50% at 50% 50%, #050c28 0%, #010205 100%)',
      zIndex:60,
    }}>
      {/* Orbital spinner */}
      <div style={{position:'relative',width:72,height:72}}>
        {/* Outer ring */}
        <div style={{
          position:'absolute',inset:0,borderRadius:'50%',
          border:'1px solid rgba(212,168,75,0.12)',
          borderTopColor:U.accent,
          animation:'cosmicSpin 1.4s linear infinite',
        }}/>
        {/* Middle ring */}
        <div style={{
          position:'absolute',inset:10,borderRadius:'50%',
          border:'1px solid rgba(0,217,245,0.10)',
          borderRightColor:'#00d9f5',
          animation:'cosmicSpin 0.95s linear infinite reverse',
        }}/>
        {/* Inner dot */}
        <div style={{
          position:'absolute',inset:'50%',
          width:8,height:8,
          marginLeft:-4,marginTop:-4,
          borderRadius:'50%',
          background:'radial-gradient(circle, #f0c060, #d4a84b)',
          boxShadow:'0 0 16px #d4a84b, 0 0 32px #d4a84b44',
          animation:'cosmicPulse 1.2s ease-in-out infinite',
        }}/>
      </div>

      {/* Label */}
      <div style={{textAlign:'center'}}>
        <div style={{
          color:U.accent,fontSize:10,fontWeight:700,letterSpacing:'0.22em',
          fontFamily:F.b,marginBottom:6,
          animation:'cosmicFade 1.8s ease-in-out infinite',
        }}>
          INITIALISATION COSMOS
        </div>
        <div style={{color:U.mutedLo,fontSize:9,letterSpacing:'0.12em',fontFamily:F.b}}>
          ADS · SQUARE
        </div>
      </div>
    </div>
  );
}

// ── Level Dots — Premium pill bar ─────────────────────────────────────────────
const LevelDots = memo(function LevelDots({ level, onLevel }) {
  return (
    <div style={{
      position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
      display:'flex', alignItems:'center', gap:4, zIndex:30,
      padding:'8px 16px',
      borderRadius:50,
      background:U.glass,
      backdropFilter:'blur(20px)',
      border:'1px solid rgba(255,255,255,0.08)',
      boxShadow:'0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
    }}>
      {LEVELS.map((lv,i)=>{
        const active=lv.n===level;
        const isLeft=lv.n===0;
        return (
          <button
            key={lv.n}
            onClick={()=>onLevel(lv.n)}
            title={`${lv.icon} ${lv.name}${lv.faces?` · ${lv.faces} blocs`:''}`}
            style={{
              position:'relative',
              width: active ? 52 : 32,
              height:32,
              borderRadius:50,
              border: active ? `1px solid ${U.accent}55` : '1px solid rgba(255,255,255,0.08)',
              background: active
                ? `linear-gradient(135deg, ${U.accent}22, ${U.accent}10)`
                : 'transparent',
              color: active ? U.accentBright : U.mutedLo,
              fontSize: active ? 12 : 10,
              fontWeight: active ? 800 : 500,
              cursor:'pointer',
              transition:'all 0.28s cubic-bezier(.34,1.56,.64,1)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:4,
              fontFamily: F.b,
              boxShadow: active ? `0 0 20px ${U.accent}40, 0 0 0 1px ${U.accent}20 inset` : 'none',
              padding:'0 8px',
              flexShrink:0,
              overflow:'hidden',
            }}
          >
            {/* Active glow line */}
            {active && (
              <div style={{
                position:'absolute',bottom:0,left:'20%',right:'20%',height:2,
                borderRadius:2,
                background:`linear-gradient(90deg, transparent, ${U.accent}, transparent)`,
              }}/>
            )}
            <span style={{fontSize:active?11:9}}>{lv.icon}</span>
            {active && <span style={{fontSize:9,letterSpacing:'0.04em'}}>{lv.n}</span>}
          </button>
        );
      })}
    </div>
  );
});

// ── Tier Legend — Neon floating card ─────────────────────────────────────────
const TierLegend = memo(function TierLegend({ level, faceCount }) {
  return (
    <div style={{
      position:'absolute', top:16, right:16, zIndex:30,
      display:'flex', flexDirection:'column', gap:2,
    }}>
      {level>0 && (
        <div style={{
          padding:'5px 12px', borderRadius:24, marginBottom:6,
          background:U.glass,
          backdropFilter:'blur(16px)',
          border:`1px solid ${U.accent}30`,
          boxShadow:`0 0 20px ${U.accent}14, 0 4px 20px rgba(0,0,0,0.5)`,
          display:'flex',alignItems:'center',gap:7,justifyContent:'flex-end',
        }}>
          <span style={{color:U.accent,fontSize:13}}>{LEVELS[level]?.icon}</span>
          <span style={{color:U.accentBright,fontSize:10,fontWeight:800,letterSpacing:'0.08em',fontFamily:F.h}}>
            {LEVELS[level]?.name?.toUpperCase()}
          </span>
          <span style={{
            color:U.mutedLo,fontSize:9,fontWeight:500,letterSpacing:'0.04em',fontFamily:F.b,
            background:'rgba(255,255,255,0.05)',padding:'1px 7px',borderRadius:20,
            border:'1px solid rgba(255,255,255,0.07)',
          }}>
            {faceCount} blocs
          </span>
        </div>
      )}
      {TIER_ORDER.filter(t=>TIER_COLOR[t]).map((tier,i)=>(
        <div key={tier} style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'5px 12px', borderRadius:24,
          background:U.glass,
          backdropFilter:'blur(14px)',
          border:`1px solid ${TIER_COLOR[tier]}15`,
          boxShadow:`0 2px 12px rgba(0,0,0,0.4)`,
          transition:'all 0.2s',
        }}>
          {/* Animated dot */}
          <div style={{
            width:7,height:7,borderRadius:2,flexShrink:0,
            background:TIER_COLOR[tier],
            boxShadow:`0 0 8px ${TIER_COLOR[tier]}cc, 0 0 16px ${TIER_COLOR[tier]}44`,
          }}/>
          <span style={{
            color:'rgba(255,255,255,0.50)',fontSize:9,fontWeight:600,
            letterSpacing:'0.07em',fontFamily:F.b, flex:1,
          }}>
            {TIER_LABEL[tier]}
          </span>
          <span style={{
            color:TIER_COLOR[tier],fontSize:9,fontWeight:800,fontFamily:F.m,
            textShadow:`0 0 10px ${TIER_COLOR[tier]}99`,
          }}>
            €{priceEur(tier)}/j
          </span>
        </div>
      ))}
    </div>
  );
});

// ── ZoomHint — Minimal floating tooltip ──────────────────────────────────────
function ZoomHint() {
  const [vis, setVis] = useState(true);
  useEffect(()=>{ const t=setTimeout(()=>setVis(false),5000); return()=>clearTimeout(t); },[]);
  if (!vis) return null;
  return (
    <div style={{
      position:'absolute', bottom:72, left:'50%', transform:'translateX(-50%)',
      display:'flex', alignItems:'center', gap:10,
      padding:'6px 16px',
      borderRadius:40,
      background:'rgba(4,8,20,0.75)',
      backdropFilter:'blur(10px)',
      border:'1px solid rgba(255,255,255,0.07)',
      color:'rgba(200,210,255,0.38)',
      fontSize:10,letterSpacing:'0.06em',
      zIndex:20, pointerEvents:'none', whiteSpace:'nowrap', fontFamily:F.b,
      opacity:vis?1:0, transition:'opacity 1.5s ease',
    }}>
      <span style={{opacity:0.6}}>↕</span> molette = zoom
      <span style={{color:'rgba(255,255,255,0.12)'}}>·</span>
      <span style={{opacity:0.6}}>⟳</span> glisser = tourner
      <span style={{color:'rgba(255,255,255,0.12)'}}>·</span>
      <span style={{opacity:0.6}}>◎</span> clic = détails
    </div>
  );
}

// ── Back to 2D button ─────────────────────────────────────────────────────────
function BackButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        position:'absolute',top:16,left:16,zIndex:30,
        display:'flex',alignItems:'center',gap:7,
        padding:'7px 16px',borderRadius:40,
        background: hov ? 'rgba(6,12,32,0.95)' : U.glass,
        backdropFilter:'blur(16px)',
        border: hov ? `1px solid ${U.border2}` : `1px solid ${U.border}`,
        color: hov ? U.text : U.muted,
        fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:F.b,letterSpacing:'0.06em',
        transition:'all 0.2s ease',
        boxShadow: hov ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{fontSize:12,opacity:0.7}}>◫</span>
      Vue 2D
    </button>
  );
}

// ── BlockOverlay3D — LUXURY MODAL ────────────────────────────────────────────
function BlockOverlay3D({ slot, onClose, onRent, onBuyout }) {
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),10); return()=>clearTimeout(t); },[]);

  if (!slot) return null;
  const color=TIER_COLOR[slot.tier]||U.accent;
  const label=TIER_LABEL[slot.tier]||slot.tier;
  const price=priceEur(slot.tier);
  const isEpic=slot.tier==='epicenter';

  return (
    <div
      onClick={onClose}
      style={{
        position:'absolute',inset:0,zIndex:50,
        background:'rgba(0,0,5,0.85)',
        backdropFilter:'blur(24px)',
        display:'flex',alignItems:'center',justifyContent:'center',
        opacity:mounted?1:0,
        transition:'opacity 0.28s ease',
      }}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width:320,
          borderRadius:28,
          overflow:'hidden',
          background:`linear-gradient(160deg, rgba(8,12,28,0.98), rgba(4,6,18,0.99))`,
          border:`1px solid ${color}30`,
          boxShadow:`
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 0 60px ${color}18,
            0 0 120px ${color}08,
            0 40px 80px rgba(0,0,0,0.9)
          `,
          transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
          transition:'transform 0.35s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {/* Top gradient bar */}
        <div style={{
          height:3,
          background:`linear-gradient(90deg, transparent, ${color}88, ${color}ff, ${color}88, transparent)`,
          boxShadow:`0 0 20px ${color}`,
        }}/>

        {/* Header area with tier badge */}
        <div style={{
          padding:'20px 22px 0',
          display:'flex',alignItems:'flex-start',justifyContent:'space-between',
        }}>
          {/* Tier badge */}
          <div style={{
            display:'inline-flex',alignItems:'center',gap:7,
            padding:'5px 14px',borderRadius:40,
            background:`${color}14`,
            border:`1px solid ${color}40`,
            boxShadow:`0 0 20px ${color}20`,
          }}>
            <div style={{
              width:8,height:8,borderRadius:2,background:color,
              boxShadow:`0 0 10px ${color}, 0 0 20px ${color}88`,
              animation:'glowPulse 2s ease-in-out infinite',
            }}/>
            <span style={{color,fontSize:10,fontWeight:900,letterSpacing:'0.12em',fontFamily:F.h}}>{label}</span>
          </div>

          {/* Close button */}
          <button onClick={onClose} style={{
            width:30,height:30,borderRadius:'50%',flexShrink:0,
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.10)',
            color:'rgba(255,255,255,0.40)',fontSize:16,
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            transition:'all 0.18s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.10)';e.currentTarget.style.color='rgba(255,255,255,0.8)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(255,255,255,0.40)';}}
          >×</button>
        </div>

        {/* Main content */}
        <div style={{padding:'18px 22px 24px'}}>

          {/* Logo / icon area */}
          <div style={{
            width:62,height:62,borderRadius:18,marginBottom:18,
            background: slot.occ
              ? `radial-gradient(circle at 35% 35%, ${color}28, ${color}08)`
              : 'rgba(255,255,255,0.02)',
            border:`1.5px solid ${color}${slot.occ?'50':'18'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:22,fontWeight:900,color,fontFamily:F.h,
            boxShadow: slot.occ ? `0 0 30px ${color}22, 0 0 0 4px ${color}08` : 'none',
          }}>
            {slot.tenant?.l||(slot.occ?'◉':'○')}
          </div>

          {/* Name */}
          <div style={{
            color:U.text,fontSize:17,fontWeight:800,fontFamily:F.h,
            marginBottom:5,letterSpacing:'-0.01em',lineHeight:1.2,
          }}>
            {slot.occ?(slot.tenant?.name||`Bloc ${label}`):`Emplacement ${label}`}
          </div>

          {/* Status line */}
          <div style={{
            display:'flex',alignItems:'center',gap:6,
            color:U.muted,fontSize:11,marginBottom:20,fontFamily:F.b,
          }}>
            <span style={{
              display:'inline-block',width:6,height:6,borderRadius:'50%',flexShrink:0,
              background: slot.occ ? '#00e8a2' : color,
              boxShadow: `0 0 8px ${slot.occ?'#00e8a2':color}`,
            }}/>
            {slot.occ
              ? (slot.tenant?.cta||'Actuellement occupé')
              : `Visible de toute la grille`}
          </div>

          {/* Divider */}
          <div style={{
            height:1,
            background:`linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)`,
            marginBottom:18,
          }}/>

          {/* Price display */}
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20}}>
            <div>
              <div style={{color:U.mutedLo,fontSize:9,fontWeight:600,letterSpacing:'0.1em',fontFamily:F.b,marginBottom:4}}>
                PRIX PAR JOUR
              </div>
              <div style={{display:'flex',alignItems:'baseline',gap:3}}>
                <span style={{
                  color,fontSize:30,fontWeight:900,fontFamily:F.h,
                  textShadow:`0 0 30px ${color}66`,
                  letterSpacing:'-0.02em',
                }}>
                  €{price}
                </span>
                <span style={{color:U.mutedLo,fontSize:11,fontFamily:F.b,marginBottom:2}}>/j</span>
              </div>
            </div>

            {/* Small stats */}
            {isEpic && (
              <div style={{
                textAlign:'right',
                padding:'6px 10px',borderRadius:10,
                background:`${color}10`,border:`1px solid ${color}25`,
              }}>
                <div style={{color:color,fontSize:9,fontWeight:700,letterSpacing:'0.08em',fontFamily:F.b}}>✦ ÉPICENTRE</div>
                <div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,marginTop:2}}>Position #1</div>
              </div>
            )}
          </div>

          {/* CTA Button */}
          {!slot.occ ? (
            <button
              onClick={()=>onRent(slot)}
              style={{
                width:'100%',padding:'14px 0',borderRadius:14,
                background:`linear-gradient(135deg, ${color}, ${color}bb)`,
                border:'none',
                color:'#080808',fontSize:13,fontWeight:900,
                fontFamily:F.b,cursor:'pointer',letterSpacing:'0.05em',
                boxShadow:`0 0 30px ${color}44, 0 8px 24px rgba(0,0,0,0.4)`,
                transition:'all 0.2s ease',
                position:'relative',overflow:'hidden',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 0 40px ${color}66, 0 12px 28px rgba(0,0,0,0.5)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 0 30px ${color}44, 0 8px 24px rgba(0,0,0,0.4)`;}}
            >
              Réserver ce bloc →
            </button>
          ) : (
            <button
              onClick={()=>onBuyout(slot)}
              style={{
                width:'100%',padding:'13px 0',borderRadius:14,
                background:`linear-gradient(135deg, ${color}12, ${color}06)`,
                border:`1px solid ${color}25`,
                color:U.muted,fontSize:12,fontWeight:700,
                fontFamily:F.b,cursor:'pointer',letterSpacing:'0.03em',
                transition:'all 0.2s ease',
              }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${color}1a`;e.currentTarget.style.color=color;}}
              onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${color}12,${color}06)`;e.currentTarget.style.color=U.muted;}}
            >
              Faire une offre de rachat
            </button>
          )}

          {/* Bottom note */}
          <div style={{
            marginTop:12,textAlign:'center',
            color:U.mutedLo,fontSize:9,fontFamily:F.b,letterSpacing:'0.04em',
          }}>
            Paiement sécurisé · Annulable 48h
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Return to 2D — float button for 2D mode ──────────────────────────────────
function CosmosButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        position:'absolute',top:12,right:12,zIndex:100,
        display:'flex',alignItems:'center',gap:8,
        padding:'8px 18px',borderRadius:40,
        background: hov ? 'rgba(8,10,28,0.97)' : 'rgba(4,6,20,0.85)',
        backdropFilter:'blur(16px)',
        border: hov ? `1px solid ${U.accent}60` : `1px solid ${U.accent}35`,
        color: hov ? U.accentBright : U.accent,
        fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:F.b,
        letterSpacing:'0.06em',
        boxShadow: hov
          ? `0 0 30px ${U.accent}30, 0 8px 24px rgba(0,0,0,0.5)`
          : `0 0 20px ${U.accent}18, 0 4px 16px rgba(0,0,0,0.4)`,
        transition:'all 0.22s ease',
      }}
    >
      <span style={{fontSize:10,animation: hov ? 'none' : 'cosmicPulse 2s ease-in-out infinite'}}>✦</span>
      Vue Cosmos 3D
    </button>
  );
}

// ── Corner decorations ─────────────────────────────────────────────────────────
function CornerAccents() {
  const corner = (pos) => (
    <div style={{
      position:'absolute', ...pos, width:40, height:40,
      border:`1px solid ${U.accent}18`,
      borderRadius: pos.top !== undefined && pos.left !== undefined ? '0 0 8px 0' :
                   pos.top !== undefined ? '0 0 0 8px' :
                   pos.left !== undefined ? '8px 0 0 0' : '8px 0 0 0',
      borderTop: (pos.top!==undefined) ? `1px solid ${U.accent}18` : 'none',
      borderBottom: (pos.bottom!==undefined) ? `1px solid ${U.accent}18` : 'none',
      borderLeft: (pos.left!==undefined) ? `1px solid ${U.accent}18` : 'none',
      borderRight: (pos.right!==undefined) ? `1px solid ${U.accent}18` : 'none',
      pointerEvents:'none',
    }}/>
  );

  return (
    <>
      {corner({top:12,left:12,borderRight:'none',borderBottom:'none',borderTopLeftRadius:8})}
      {corner({top:12,right:12,borderLeft:'none',borderBottom:'none',borderTopRightRadius:8})}
      {corner({bottom:12,left:12,borderRight:'none',borderTop:'none',borderBottomLeftRadius:8})}
      {corner({bottom:12,right:12,borderLeft:'none',borderTop:'none',borderBottomRightRadius:8})}
    </>
  );
}

// ── Scanline overlay for premium depth ────────────────────────────────────────
function ScanlineOverlay() {
  return (
    <div style={{
      position:'absolute',inset:0,pointerEvents:'none',zIndex:1,
      backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px)`,
    }}/>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function View3D({
  slots=[], isLive=false,
  onGoAdvertiser, onWaitlist, onCheckout, onBuyout,
  ExistingPublicView,
}) {
  const canvasRef  = useRef(null);
  const sceneRef   = useRef(null);
  const [level, setLevel]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [focusSlot, setFocusSlot] = useState(null);

  const sortedSlots = useMemo(()=>sortSlotsByTier(slots),[slots]);

  const assignedFaces = useMemo(()=>{
    if (level===0) return [];
    const poleFaces=sortFacesByPole(getFacesForLevel(level));
    return poleFaces.map((face,i)=>({
      ...face,
      slot:sortedSlots[i]||null,
      color:faceColor(sortedSlots[i]||null),
    }));
  },[level,sortedSlots]);

  useEffect(()=>{
    if (level===0||!canvasRef.current) return;
    let scene;
    Promise.all([
      import('three'),
      import('gsap').then(m=>m.gsap||m.default),
    ]).then(([THREE,GSAP])=>{
      scene=new Scene3D(canvasRef.current);
      sceneRef.current=scene;
      scene.onFaceClick=(slot)=>setFocusSlot(slot);
      return scene.init(THREE,GSAP);
    }).then(()=>{
      sceneRef.current.setFaces(assignedFaces,false);
      setLoading(false);
    }).catch(err=>{
      console.error('View3D:',err);
      setError('Three.js non disponible — npm install three gsap');
      setLoading(false);
    });
    return ()=>{ if(scene){scene.destroy();} sceneRef.current=null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{
    if (!sceneRef.current||level===0) return;
    sceneRef.current.setFaces(assignedFaces,true);
  },[assignedFaces,level]);

  useEffect(()=>{
    const fn=(e)=>{
      if (e.key>='0'&&e.key<='6') setLevel(parseInt(e.key));
      else if (e.key==='ArrowRight'||e.key==='ArrowUp')  setLevel(l=>Math.min(6,l+1));
      else if (e.key==='ArrowLeft' ||e.key==='ArrowDown') setLevel(l=>Math.max(1,l-1));
      else if (e.key==='Escape') setFocusSlot(null);
    };
    window.addEventListener('keydown',fn);
    return()=>window.removeEventListener('keydown',fn);
  },[]);

  useEffect(()=>{
    const fn=(e)=>{ e.preventDefault(); sceneRef.current?.zoom(e.deltaY); };
    const canvas=canvasRef.current;
    if (canvas) canvas.addEventListener('wheel',fn,{passive:false});
    return()=>{ if(canvas) canvas.removeEventListener('wheel',fn); };
  },[level]);

  useEffect(()=>{
    if (!canvasRef.current) return;
    const ro=new ResizeObserver(()=>sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return()=>ro.disconnect();
  },[]);

  const handleLevel = useCallback((n)=>{ setFocusSlot(null); setLevel(n); },[]);

  // ── Level 0: 2D view ──────────────────────────────────────────────────────
  if (level===0) {
    return (
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <CosmosButton onClick={()=>handleLevel(1)}/>
        {ExistingPublicView&&(
          <ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>
        )}
      </div>
    );
  }

  // ── Levels 1–6: Three.js 3D ───────────────────────────────────────────────
  const faceCount=LEVELS[level]?.faces||0;

  return (
    <div style={{
      flex:1, position:'relative', overflow:'hidden',
      background:'radial-gradient(ellipse 80% 70% at 50% 40%, #040c24 0%, #010205 100%)',
    }}>
      {/* WebGL canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width:'100%',height:'100%',display:'block',outline:'none',
          cursor:focusSlot?'default':'grab',
          opacity:loading?0:1,
          transition:'opacity 0.6s ease',
        }}
      />

      {/* Subtle vignette */}
      <div style={{
        position:'absolute',inset:0,pointerEvents:'none',zIndex:2,
        background:`radial-gradient(ellipse 75% 75% at 50% 50%, transparent 50%, rgba(1,2,5,0.55) 100%)`,
      }}/>

      {/* Scanlines for depth */}
      <ScanlineOverlay/>

      {/* Corner accents */}
      <CornerAccents/>

      {/* Cosmic loader */}
      {loading&&!error&&<CosmicLoader/>}

      {/* Error state */}
      {error&&(
        <div style={{
          position:'absolute',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',gap:16,padding:24,
          background:'rgba(1,2,5,0.95)',zIndex:60,
        }}>
          <div style={{
            padding:'8px 16px',borderRadius:12,
            background:'rgba(255,77,109,0.10)',border:'1px solid rgba(255,77,109,0.25)',
            color:U.err,fontSize:12,fontWeight:700,fontFamily:F.b,
          }}>
            ⚠ {error}
          </div>
          <button onClick={()=>handleLevel(0)} style={{
            padding:'10px 24px',borderRadius:40,
            background:U.accent,border:'none',
            color:U.accentFg,fontWeight:800,cursor:'pointer',fontFamily:F.b,
            fontSize:12,letterSpacing:'0.04em',
          }}>
            Revenir à la grille 2D
          </button>
        </div>
      )}

      {/* Back to 2D — top-left */}
      <BackButton onClick={()=>handleLevel(0)}/>

      {/* Tier legend + level badge — top-right */}
      <TierLegend level={level} faceCount={faceCount}/>

      {/* Level dots — bottom center */}
      <LevelDots level={level} onLevel={handleLevel}/>

      {/* Zoom/interaction hint */}
      {!loading&&<ZoomHint/>}

      {/* Block detail overlay */}
      {focusSlot&&(
        <BlockOverlay3D
          slot={focusSlot}
          onClose={()=>setFocusSlot(null)}
          onRent={(s)=>{ setFocusSlot(null); onCheckout?.(s); }}
          onBuyout={(s)=>{ setFocusSlot(null); onBuyout?.(s); }}
        />
      )}

      <style>{`
        @keyframes cosmicSpin { to { transform: rotate(360deg); } }
        @keyframes cosmicPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.6; transform:scale(0.85); }
        }
        @keyframes cosmicFade {
          0%,100% { opacity:0.9; }
          50% { opacity:0.45; }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
          50% { box-shadow: 0 0 6px currentColor, 0 0 12px currentColor; }
        }
        @keyframes spin3d { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}