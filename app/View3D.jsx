'use client';
/**
 * ─── ADS·SQUARE — View3D ████████████████████████████████████████████████████
 *  LUMINOUS SPHERE — Full DB Edition
 *
 *  ✦ Architecture visuelle : nuage de particules + nœuds Fibonacci
 *  ✦ Connexion DB : slots Supabase temps réel, tous tiers
 *  ✦ Tiers = bandes latitudinales : Épicentre au pôle → Viral à l'équateur
 *  ✦ Realtime subscription + recordClick tracking
 *  ✦ Overlay tenant complet : logo, slogan, image, CTA, couleur custom
 *
 *  deps: npm install three gsap @supabase/supabase-js
 */
'use client';
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';
import {
  fetchActiveSlots, subscribeToBookings, recordClick,
  isSupabaseConfigured,
} from '../lib/supabase';
import { buildStructuralGrid, mergeGridWithBookings } from '../lib/grid';

// ── Design tokens ─────────────────────────────────────────────────────────────
const U = {
  bg: '#010208', text: '#eef2ff',
  muted: 'rgba(180,195,255,0.48)', mutedLo: 'rgba(180,195,255,0.24)',
  accent: '#d4a84b', accentBright: '#f5c842', accentFg: '#05040a',
  glass: 'rgba(4,6,22,0.82)', border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.14)', err: '#ff4d6d', ok: '#00e8a2',
};
const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
  m: "'JetBrains Mono','Fira Code','Courier New',monospace",
};
const priceEur = tier => ((TIER_PRICE[tier] || 100) / 100).toLocaleString('fr-FR');
const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];

// Chaque tier a une bande latitudinale sur la sphère (pôle nord → équateur)
const TIER_LAT = {
  epicenter: { yMin:  0.85, yMax:  1.00 },  // pôle nord
  prestige:  { yMin:  0.55, yMax:  0.85 },
  elite:     { yMin:  0.20, yMax:  0.55 },
  business:  { yMin: -0.20, yMax:  0.20 },  // équateur
  standard:  { yMin: -0.55, yMax: -0.20 },
  viral:     { yMin: -1.00, yMax: -0.55 },  // pôle sud
};

const TIER_NODE_SIZE = {
  epicenter: 0.60, prestige: 0.36, elite: 0.24,
  business: 0.17, standard: 0.12, viral: 0.09,
};

const LEVELS = [
  { n:0, name:'Grille 2D',  icon:'◫', tiers: []                                             },
  { n:1, name:'Épicentre',  icon:'✦', tiers: ['epicenter']                                  },
  { n:2, name:'Prestige',   icon:'◈', tiers: ['epicenter','prestige']                       },
  { n:3, name:'Élite',      icon:'⬡', tiers: ['epicenter','prestige','elite']               },
  { n:4, name:'Business',   icon:'◎', tiers: ['epicenter','prestige','elite','business']    },
  { n:5, name:'Standard',   icon:'◉', tiers: ['epicenter','prestige','elite','business','standard'] },
  { n:6, name:'Cosmos',     icon:'✧', tiers: TIER_ORDER                                     },
];

const SPHERE_R = 6.2;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function sortSlotsByTier(slots) {
  return [...(slots||[])].filter(Boolean).sort((a,b) => {
    const d = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    return d !== 0 ? d : (b.occ?1:0) - (a.occ?1:0);
  });
}
function hexToVec3(hex) {
  const h = (hex||'#888').replace('#','');
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

/**
 * Positionne N points dans une bande latitudinale [yMin, yMax] de la sphère.
 * Distribution spirale de Fibonacci à l'intérieur de la bande.
 */
function bandedFibonacciSphere(slots, R) {
  // Grouper par tier
  const groups = {};
  for (const tier of TIER_ORDER) groups[tier] = [];
  slots.forEach(s => { if (s?.tier && groups[s.tier]) groups[s.tier].push(s); });

  const result = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (const tier of TIER_ORDER) {
    const band = TIER_LAT[tier];
    const items = groups[tier];
    if (!items.length) continue;

    const n = items.length;
    for (let i = 0; i < n; i++) {
      // y dans la bande [yMin, yMax]
      const t = n === 1 ? 0.5 : i / (n - 1);
      const y = band.yMin + t * (band.yMax - band.yMin);
      const rr = Math.sqrt(Math.max(0, 1 - y*y));
      // spirale fibonacci pour l'angle azimutal
      const theta = golden * (result.length);
      result.push({
        slot: items[i],
        pos: [Math.cos(theta)*rr*R, y*R, Math.sin(theta)*rr*R],
      });
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3D
// ─────────────────────────────────────────────────────────────────────────────
class Scene3D {
  constructor(canvas) {
    this.canvas = canvas; this.T = this.G = null;
    this.renderer = this.scene = this.camera = null;
    this._group = null;
    this.particleMesh = this._atmoHaze = null;
    this.nodeMesh = this._glowLayer = this._epicGlow = null;
    this.constellations = null;
    this.stars = this.stars2 = null;
    this.ring1 = this.ring2 = this.ring3 = null;
    this.raycaster = null;
    this.nodeData = []; // [{slot, pos}]
    this.onNodeClick = null;
    this.rot = {x:0.15,y:0}; this.vel = {x:0,y:0};
    this.isDragging = false; this.touchStart = this.pinchDist = null;
    this.zoomTarget = this.zoomCurrent = 22;
    this.animId = null; this.transitioning = false; this._h = {};
    this._t0 = Date.now();
  }

  async init(THREE, GSAP) {
    this.T = THREE; this.G = GSAP;
    const W = this.canvas.clientWidth  || window.innerWidth;
    const H = this.canvas.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({canvas:this.canvas, antialias:true, alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2.5));
    this.renderer.setSize(W, H, false);
    this.renderer.setClearColor(0x010208, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x010208, 0.008);

    this.camera = new THREE.PerspectiveCamera(38, W/H, 0.1, 1000);
    this.camera.position.z = this.zoomCurrent;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.45 };

    this.scene.add(new THREE.AmbientLight(0x030818, 5));

    // Rotation group
    this._group = new THREE.Group();
    this._group.rotation.x = this.rot.x;
    this.scene.add(this._group);

    this._buildStars();
    this._buildSphereParticles();
    this._buildRings();
    this._buildTierAuras();
    this._bindEvents();
    this._animate();
  }

  _buildStars() {
    const T = this.T;
    // Layer 1 — deep stars
    const N = 8000, pos = new Float32Array(N*3), col = new Float32Array(N*3);
    for (let i=0; i<N; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = 140 + Math.random()*380;
      pos[i*3] = r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2] = r*Math.cos(phi);
      const t = Math.random();
      if (t < 0.60)      { col[i*3]=0.55+t*0.45; col[i*3+1]=0.68+t*0.22; col[i*3+2]=1.0; }
      else if (t < 0.78) { col[i*3]=1.0;  col[i*3+1]=0.93; col[i*3+2]=0.62; }
      else               { col[i*3]=0.85; col[i*3+1]=0.55; col[i*3+2]=1.0; }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos,3));
    g.setAttribute('color',    new T.BufferAttribute(col,3));
    this.stars = new T.Points(g, new T.PointsMaterial({size:0.13, vertexColors:true, transparent:true, opacity:0.90, sizeAttenuation:true}));
    this.scene.add(this.stars);

    // Layer 2 — closer bright stars
    const N2=600, p2=new Float32Array(N2*3), c2=new Float32Array(N2*3);
    for (let i=0; i<N2; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = 68 + Math.random()*70;
      p2[i*3] = r*Math.sin(phi)*Math.cos(theta);
      p2[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      p2[i*3+2] = r*Math.cos(phi);
      c2[i*3]=1; c2[i*3+1]=0.95; c2[i*3+2]=0.82;
    }
    const g2 = new T.BufferGeometry();
    g2.setAttribute('position', new T.BufferAttribute(p2,3));
    g2.setAttribute('color',    new T.BufferAttribute(c2,3));
    this.stars2 = new T.Points(g2, new T.PointsMaterial({size:0.44, vertexColors:true, transparent:true, opacity:0.60, sizeAttenuation:true}));
    this.scene.add(this.stars2);
  }

  _buildSphereParticles() {
    const T = this.T;
    const N = 3600, pos = new Float32Array(N*3), col = new Float32Array(N*3);
    for (let i=0; i<N; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = SPHERE_R * (0.90 + Math.random()*0.18);
      pos[i*3]   = r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2] = r*Math.cos(phi);
      // color gradient: pole (blue-white) → equator (indigo)
      const lat = pos[i*3+1] / SPHERE_R; // -1..1
      const nord = (lat + 1) / 2; // 0..1 sud→nord
      col[i*3]   = 0.15 + nord * 0.40;
      col[i*3+1] = 0.28 + nord * 0.45;
      col[i*3+2] = 0.60 + nord * 0.38;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos,3));
    g.setAttribute('color',    new T.BufferAttribute(col,3));
    this.particleMesh = new T.Points(g, new T.PointsMaterial({
      size:0.038, vertexColors:true, transparent:true, opacity:0.32, sizeAttenuation:true,
    }));
    this._group.add(this.particleMesh);

    // Outer atmospheric haze
    const N2=1000, p2=new Float32Array(N2*3);
    for (let i=0; i<N2; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = SPHERE_R + 0.5 + Math.random()*2.0;
      p2[i*3]   = r*Math.sin(phi)*Math.cos(theta);
      p2[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      p2[i*3+2] = r*Math.cos(phi);
    }
    const g2 = new T.BufferGeometry();
    g2.setAttribute('position', new T.BufferAttribute(p2,3));
    this._atmoHaze = new T.Points(g2, new T.PointsMaterial({
      color:0x1a44ff, size:0.065, transparent:true, opacity:0.08, sizeAttenuation:true,
    }));
    this._group.add(this._atmoHaze);
  }

  _buildRings() {
    const T = this.T;
    const mk = (ir, or, color, opacity, rx=0, rz=0) => {
      const m = new T.Mesh(
        new T.RingGeometry(ir, or, 140),
        new T.MeshBasicMaterial({color, transparent:true, opacity, side:T.DoubleSide})
      );
      m.rotation.x = rx; m.rotation.z = rz; return m;
    };
    // Equatorial gold ring
    this.ring1 = mk(SPHERE_R+1.05, SPHERE_R+1.18, 0xd4a84b, 0.22, Math.PI/2);
    // Tilted cyan ring
    this.ring2 = mk(SPHERE_R+1.80, SPHERE_R+1.88, 0x00d9f5, 0.10, Math.PI/2, Math.PI/5);
    // Outer violet ring
    this.ring3 = mk(SPHERE_R+2.60, SPHERE_R+2.66, 0x9933ff, 0.07, Math.PI/4, -Math.PI/6);
    this._group.add(this.ring1);
    this._group.add(this.ring2);
    this._group.add(this.ring3);
  }

  _buildTierAuras() {
    // Horizontal disc halos for each tier band — very subtle
    const T = this.T;
    const tierAuraColors = {
      epicenter: 0xf0b429, prestige: 0xff4d8f,
      elite: 0xa855f7, business: 0x00d9f5,
    };
    this._tierAuras = [];
    for (const [tier, color] of Object.entries(tierAuraColors)) {
      const band = TIER_LAT[tier];
      const yMid = ((band.yMin + band.yMax) / 2) * SPHERE_R;
      const geo = new T.RingGeometry(SPHERE_R*0.1, SPHERE_R*1.05, 64);
      const mat = new T.MeshBasicMaterial({color, transparent:true, opacity:0.04, side:T.DoubleSide});
      const mesh = new T.Mesh(geo, mat);
      mesh.rotation.x = Math.PI/2;
      mesh.position.y = yMid;
      this._group.add(mesh);
      this._tierAuras.push(mesh);
    }
  }

  _clearNodes() {
    [this.nodeMesh, this._glowLayer, this._epicGlow, this.constellations].filter(Boolean).forEach(o => {
      this._group.remove(o); o.geometry?.dispose(); o.material?.dispose();
    });
    this.nodeMesh = this._glowLayer = this._epicGlow = this.constellations = null;
    this.nodeData = [];
  }

  _buildNodes(nodeData) {
    this._clearNodes();
    const n = nodeData.length; if (!n) return;
    this.nodeData = nodeData;

    const pos = new Float32Array(n*3), col = new Float32Array(n*3);
    for (let i=0; i<n; i++) {
      const {slot, pos: p} = nodeData[i];
      pos[i*3]=p[0]; pos[i*3+1]=p[1]; pos[i*3+2]=p[2];
      // Use tenant custom color if available
      const base = (slot?.occ && slot?.tenant?.c) ? slot.tenant.c : TIER_COLOR[slot?.tier] || '#334';
      const [r,g,b] = hexToVec3(base);
      const br = slot?.occ ? 1.0 : 0.22;
      col[i*3]=r*br; col[i*3+1]=g*br; col[i*3+2]=b*br;
    }

    const T = this.T;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos,3));
    geo.setAttribute('color',    new T.BufferAttribute(col,3));

    // Core nodes
    this.nodeMesh = new T.Points(geo, new T.PointsMaterial({
      vertexColors:true, size:0.26, sizeAttenuation:true,
      transparent:true, opacity:0.98,
      blending:T.AdditiveBlending, depthWrite:false,
    }));
    this._group.add(this.nodeMesh);

    // Glow halo
    const gGeo = new T.BufferGeometry();
    gGeo.setAttribute('position', new T.BufferAttribute(pos.slice(),3));
    gGeo.setAttribute('color',    new T.BufferAttribute(col.slice(),3));
    this._glowLayer = new T.Points(gGeo, new T.PointsMaterial({
      vertexColors:true, size:0.90, sizeAttenuation:true,
      transparent:true, opacity:0.14,
      blending:T.AdditiveBlending, depthWrite:false,
    }));
    this._group.add(this._glowLayer);

    // Ultra-glow for epicenter & prestige occupied
    const topItems = nodeData.filter(d => d.slot?.occ && (d.slot.tier==='epicenter'||d.slot.tier==='prestige'));
    if (topItems.length) {
      const tp = new Float32Array(topItems.length*3), tc = new Float32Array(topItems.length*3);
      topItems.forEach(({slot,pos:p},j) => {
        tp[j*3]=p[0]; tp[j*3+1]=p[1]; tp[j*3+2]=p[2];
        const c = hexToVec3((slot.tenant?.c)||TIER_COLOR[slot.tier]||'#fff');
        tc[j*3]=c[0]; tc[j*3+1]=c[1]; tc[j*3+2]=c[2];
      });
      const tGeo = new T.BufferGeometry();
      tGeo.setAttribute('position', new T.BufferAttribute(tp,3));
      tGeo.setAttribute('color',    new T.BufferAttribute(tc,3));
      this._epicGlow = new T.Points(tGeo, new T.PointsMaterial({
        vertexColors:true, size:2.4, sizeAttenuation:true,
        transparent:true, opacity:0.26,
        blending:T.AdditiveBlending, depthWrite:false,
      }));
      this._group.add(this._epicGlow);
    }

    this._buildConstellations(nodeData, T);
  }

  _buildConstellations(nodeData, T) {
    const MAX = SPHERE_R * 0.65;
    const lv = [], lc = [];
    for (let i=0; i<nodeData.length; i++) {
      const {slot:sA, pos:pA} = nodeData[i];
      let found = 0;
      for (let j=i+1; j<nodeData.length && found<3; j++) {
        const {slot:sB, pos:pB} = nodeData[j];
        const dx=pB[0]-pA[0], dy=pB[1]-pA[1], dz=pB[2]-pA[2];
        const dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
        if (dist < MAX) {
          const cA = hexToVec3((sA?.tenant?.c)||TIER_COLOR[sA?.tier]||'#223');
          const cB = hexToVec3((sB?.tenant?.c)||TIER_COLOR[sB?.tier]||'#223');
          const a = (sA?.occ && sB?.occ) ? 0.18 : (sA?.occ||sB?.occ) ? 0.07 : 0.025;
          lv.push(pA[0],pA[1],pA[2], pB[0],pB[1],pB[2]);
          lc.push(cA[0]*a,cA[1]*a,cA[2]*a, cB[0]*a,cB[1]*a,cB[2]*a);
          found++;
        }
      }
    }
    if (!lv.length) return;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(lv),3));
    geo.setAttribute('color',    new T.BufferAttribute(new Float32Array(lc),3));
    this.constellations = new T.LineSegments(geo, new T.LineBasicMaterial({
      vertexColors:true, transparent:true, opacity:1.0,
      blending:T.AdditiveBlending, depthWrite:false,
    }));
    this._group.add(this.constellations);
  }

  setNodes(nodeData, animate=false) {
    if (!animate || !this._group) { this._buildNodes(nodeData); return; }
    if (this.transitioning) { this._buildNodes(nodeData); return; }
    this.transitioning = true;
    const G = this.G;
    const doSwap = () => {
      this._buildNodes(nodeData);
      this._group.scale.set(0,0,0);
      G.to(this._group.scale, {x:1,y:1,z:1, duration:0.7, ease:'expo.out',
        onComplete:()=>{this.transitioning=false;}});
    };
    G.to(this._group.scale, {x:0,y:0,z:0, duration:0.24, ease:'power3.in', onComplete:doSwap});
  }

  zoom(delta) { this.zoomTarget = Math.max(9, Math.min(52, this.zoomTarget+delta*0.013)); }

  handleClick(cx, cy) {
    if (!this.nodeMesh || !this.onNodeClick) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((cx-rect.left)/rect.width)*2-1;
    const y = -((cy-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera({x,y}, this.camera);
    const hits = this.raycaster.intersectObject(this.nodeMesh);
    if (hits.length > 0) {
      const nd = this.nodeData[hits[0].index];
      if (nd?.slot) this.onNodeClick(nd.slot);
    }
  }

  _bindEvents() {
    const canvas = this.canvas, h = this._h;
    let lx=0, ly=0, moved=false;
    h.md = e => { this.isDragging=true; moved=false; lx=e.clientX; ly=e.clientY; this.vel={x:0,y:0}; };
    h.mm = e => {
      if (!this.isDragging) return;
      const dx=e.clientX-lx, dy=e.clientY-ly;
      if (Math.abs(dx)>1||Math.abs(dy)>1) moved=true;
      this.rot.y+=dx*0.005; this.rot.x+=dy*0.005;
      this.rot.x = Math.max(-1.5, Math.min(1.5, this.rot.x));
      this.vel={x:dx*0.005,y:dy*0.005}; lx=e.clientX; ly=e.clientY;
    };
    h.mu = e => { if (!moved) this.handleClick(e.clientX,e.clientY); this.isDragging=false; };
    canvas.addEventListener('mousedown', h.md);
    window.addEventListener('mousemove', h.mm);
    window.addEventListener('mouseup',   h.mu);
    h.ts = e => {
      if (e.touches.length===1) { this.isDragging=true; moved=false; lx=e.touches[0].clientX; ly=e.touches[0].clientY; this.touchStart={x:lx,y:ly}; this.pinchDist=null; }
      else if (e.touches.length===2) { this.isDragging=false; const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY; this.pinchDist=Math.sqrt(dx*dx+dy*dy); }
    };
    h.tm = e => {
      e.preventDefault();
      if (e.touches.length===1&&this.isDragging) {
        const dx=e.touches[0].clientX-lx, dy=e.touches[0].clientY-ly;
        if (Math.abs(dx)>2||Math.abs(dy)>2) moved=true;
        this.rot.y+=dx*0.005; this.rot.x+=dy*0.005;
        this.rot.x = Math.max(-1.5, Math.min(1.5, this.rot.x));
        this.vel={x:dx*0.005,y:dy*0.005}; lx=e.touches[0].clientX; ly=e.touches[0].clientY;
      } else if (e.touches.length===2&&this.pinchDist!==null) {
        const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
        const d=Math.sqrt(dx*dx+dy*dy); this.zoom((this.pinchDist-d)*3); this.pinchDist=d;
      }
    };
    h.te = e => { if (e.changedTouches.length===1&&!moved&&this.touchStart) this.handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY); this.isDragging=false; };
    canvas.addEventListener('touchstart', h.ts, {passive:false});
    canvas.addEventListener('touchmove',  h.tm, {passive:false});
    canvas.addEventListener('touchend',   h.te);
  }

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const t = (Date.now() - this._t0) * 0.001;

    if (!this.isDragging) {
      this.rot.y += this.vel.x; this.rot.x += this.vel.y;
      this.vel.x *= 0.93; this.vel.y *= 0.93;
      this.rot.y += 0.00055;
    }
    if (this._group) { this._group.rotation.x=this.rot.x; this._group.rotation.y=this.rot.y; }

    if (this.stars)  { this.stars.rotation.y=t*0.00065; this.stars.rotation.x=Math.sin(t*0.00011)*0.022; }
    if (this.stars2) { this.stars2.rotation.y=-t*0.00095; }
    if (this._atmoHaze) this._atmoHaze.rotation.y = -t*0.0011;

    // Rings orbit
    if (this.ring1) this.ring1.rotation.z = t*0.055;
    if (this.ring2) this.ring2.rotation.z = -t*0.033; this.ring2 && (this.ring2.rotation.y = t*0.022);
    if (this.ring3) this.ring3.rotation.z = t*0.019;

    // Breathe
    if (this.particleMesh) {
      const s = 1+Math.sin(t*0.26)*0.009;
      this.particleMesh.scale.set(s,s,s);
      this.particleMesh.material.opacity = 0.28+Math.sin(t*0.38)*0.06;
    }
    if (this._glowLayer) this._glowLayer.material.opacity = 0.11+Math.sin(t*0.65)*0.05;
    if (this._epicGlow)  this._epicGlow.material.opacity  = 0.20+Math.sin(t*1.3)*0.10;

    // Tier aura pulse — each slightly different phase
    if (this._tierAuras) {
      this._tierAuras.forEach((a,i) => { a.material.opacity = 0.03+Math.sin(t*0.8+i*1.2)*0.02; });
    }

    this.zoomCurrent += (this.zoomTarget - this.zoomCurrent) * 0.07;
    this.camera.position.z = this.zoomCurrent;

    this.renderer.render(this.scene, this.camera);
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
    this.canvas.removeEventListener('mousedown',h.md); window.removeEventListener('mousemove',h.mm); window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts); this.canvas.removeEventListener('touchmove',h.tm); this.canvas.removeEventListener('touchend',h.te);
    this._clearNodes(); this.renderer?.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK : DB slots (can operate standalone OR use parent slots)
// ─────────────────────────────────────────────────────────────────────────────
function useView3DSlots(parentSlots) {
  // If Supabase is configured AND no parent slots, fetch independently
  // If parent slots passed (from page.js), use those directly + subscribe for live updates
  const structural = useMemo(() => buildStructuralGrid(), []);
  const [liveSlots, setLiveSlots] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    // Subscribe to live updates regardless of parent slots
    const unsub = subscribeToBookings(() => {
      fetchActiveSlots().then(({data, error}) => {
        if (!error && data) setLiveSlots(mergeGridWithBookings(structural, data));
      });
    });
    return unsub;
  }, [structural]);

  // Priority: live updates > parent slots > structural (empty)
  return liveSlots || parentSlots || structural;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function CosmicLoader() {
  return (
    <div style={{position:'absolute',inset:0,zIndex:60,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:32,background:'radial-gradient(ellipse 65% 55% at 50% 50%,#060e32 0%,#010208 100%)'}}>
      <div style={{position:'relative',width:90,height:90}}>
        {/* Outer gold */}
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'1px solid rgba(212,168,75,0.12)',borderTopColor:U.accent,animation:'vSpin 1.3s linear infinite'}}/>
        {/* Mid cyan */}
        <div style={{position:'absolute',inset:13,borderRadius:'50%',border:'1px solid rgba(0,217,245,0.08)',borderRightColor:'#00d9f5',animation:'vSpin 0.85s linear infinite reverse'}}/>
        {/* Inner violet */}
        <div style={{position:'absolute',inset:26,borderRadius:'50%',border:'1px solid rgba(168,85,247,0.10)',borderBottomColor:'#a855f7',animation:'vSpin 1.7s linear infinite'}}/>
        {/* Core dot */}
        <div style={{position:'absolute',inset:'50%',width:12,height:12,marginLeft:-6,marginTop:-6,borderRadius:'50%',background:`radial-gradient(circle,${U.accentBright},${U.accent})`,boxShadow:`0 0 24px ${U.accent},0 0 48px ${U.accent}55`,animation:'vPulse 1.4s ease-in-out infinite'}}/>
      </div>
      <div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:7}}>
        <span style={{color:U.accent,fontSize:11,fontWeight:700,letterSpacing:'0.24em',fontFamily:F.b,animation:'vFade 1.7s ease-in-out infinite'}}>CONNEXION COSMOS</span>
        <span style={{color:U.mutedLo,fontSize:9,letterSpacing:'0.16em',fontFamily:F.b}}>ADS · SQUARE</span>
      </div>
    </div>
  );
}

// Live indicator dot
function LiveDot({ isLive }) {
  if (!isLive) return null;
  return (
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'rgba(0,232,162,0.08)',border:'1px solid rgba(0,232,162,0.20)'}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:U.ok,boxShadow:`0 0 8px ${U.ok}`,animation:'vPulse 2s ease-in-out infinite'}}/>
      <span style={{color:U.ok,fontSize:8,fontWeight:700,letterSpacing:'0.10em',fontFamily:F.b}}>LIVE</span>
    </div>
  );
}

// Stats bar
function StatsBar({ slots, level }) {
  const tiers = LEVELS[level]?.tiers || [];
  const visible = slots.filter(s => tiers.includes(s.tier));
  const occ = visible.filter(s => s.occ).length;
  const total = visible.length;
  const pct = total ? Math.round(occ/total*100) : 0;
  if (!total) return null;
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 11px',borderRadius:20,background:'rgba(4,6,22,0.78)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.06)'}}>
      <span style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,letterSpacing:'0.06em'}}>{occ}/{total}</span>
      <div style={{width:42,height:3,borderRadius:2,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,borderRadius:2,background:`linear-gradient(90deg,${U.accent},${U.accentBright})`,transition:'width 0.5s ease'}}/>
      </div>
      <span style={{color:U.accent,fontSize:8,fontWeight:700,fontFamily:F.m}}>{pct}%</span>
    </div>
  );
}

const LevelDots = memo(function LevelDots({ level, onLevel }) {
  return (
    <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:3,zIndex:30,padding:'6px 10px',borderRadius:50,background:'rgba(4,6,22,0.84)',backdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 10px 48px rgba(0,0,0,0.75)'}}>
      {LEVELS.map(lv => {
        const a = lv.n===level;
        return (
          <button key={lv.n} onClick={()=>onLevel(lv.n)} title={`${lv.icon} ${lv.name}`}
            style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:a?'5px 14px':'5px 10px',height:32,borderRadius:40,border:a?`1px solid ${U.accent}55`:'1px solid transparent',background:a?`linear-gradient(135deg,${U.accent}1e,${U.accent}0c)`:'transparent',color:a?U.accentBright:'rgba(180,195,255,0.28)',fontSize:11,fontWeight:a?800:500,cursor:'pointer',transition:'all 0.26s cubic-bezier(.34,1.56,.64,1)',fontFamily:F.b,boxShadow:a?`0 0 20px ${U.accent}38`:'none',flexShrink:0,overflow:'hidden'}}>
            {a&&<div style={{position:'absolute',bottom:0,left:'15%',right:'15%',height:1.5,background:`linear-gradient(90deg,transparent,${U.accent},transparent)`,borderRadius:2}}/>}
            <span style={{fontSize:10}}>{lv.icon}</span>
            {a&&<span style={{fontSize:9,letterSpacing:'0.05em'}}>{lv.name}</span>}
          </button>
        );
      })}
    </div>
  );
});

const TierLegend = memo(function TierLegend({ level, slots, isLive }) {
  const tiers = LEVELS[level]?.tiers || TIER_ORDER;
  const counts = {};
  for (const t of tiers) counts[t] = {total:0,occ:0};
  slots.filter(s=>tiers.includes(s.tier)).forEach(s=>{ if(counts[s.tier]){counts[s.tier].total++;if(s.occ)counts[s.tier].occ++;}});

  return (
    <div style={{position:'absolute',top:16,right:16,zIndex:30,display:'flex',flexDirection:'column',gap:2}}>
      {/* Header row */}
      <div style={{display:'flex',alignItems:'center',gap:7,justifyContent:'flex-end',padding:'5px 12px',borderRadius:30,marginBottom:5,background:'rgba(4,6,22,0.84)',backdropFilter:'blur(16px)',border:`1px solid ${U.accent}28`,boxShadow:`0 0 22px ${U.accent}12`}}>
        <span style={{color:U.accent,fontSize:14}}>{LEVELS[level]?.icon}</span>
        <span style={{color:U.accentBright,fontSize:10,fontWeight:800,letterSpacing:'0.09em',fontFamily:F.h}}>{LEVELS[level]?.name?.toUpperCase()}</span>
        <LiveDot isLive={isLive}/>
      </div>

      {/* Tier rows — only visible tiers */}
      {TIER_ORDER.filter(t=>TIER_COLOR[t]&&tiers.includes(t)).map(tier=>{
        const cnt = counts[tier]||{total:0,occ:0};
        const color = TIER_COLOR[tier];
        return (
          <div key={tier} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 12px',borderRadius:30,background:'rgba(4,6,22,0.78)',backdropFilter:'blur(12px)',border:`1px solid ${color}14`,transition:'border-color 0.3s'}}>
            <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:color,boxShadow:`0 0 9px ${color},0 0 18px ${color}55`}}/>
            <span style={{color:'rgba(180,195,255,0.46)',fontSize:9,fontWeight:600,letterSpacing:'0.07em',fontFamily:F.b,flex:1}}>{TIER_LABEL[tier]}</span>
            {cnt.total>0&&<span style={{color:U.mutedLo,fontSize:8,fontFamily:F.m}}>{cnt.occ}/{cnt.total}</span>}
            <span style={{color,fontSize:9,fontWeight:800,fontFamily:F.m,textShadow:`0 0 12px ${color}88`}}>€{priceEur(tier)}/j</span>
          </div>
        );
      })}
    </div>
  );
});

function ZoomHint() {
  const [vis,setVis]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setVis(false),5500);return()=>clearTimeout(t);},[]);
  if(!vis)return null;
  return (
    <div style={{position:'absolute',bottom:72,left:'50%',transform:'translateX(-50%)',padding:'5px 20px',borderRadius:40,background:'rgba(4,6,22,0.74)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.06)',color:'rgba(180,195,255,0.33)',fontSize:10,letterSpacing:'0.06em',fontFamily:F.b,zIndex:20,pointerEvents:'none',whiteSpace:'nowrap'}}>
      ↕ zoom · ⟳ tourner · ✦ cliquer un nœud
    </div>
  );
}

function BackButton({ onClick }) {
  const [h,sH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{position:'absolute',top:16,left:16,zIndex:30,display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:40,background:h?'rgba(8,12,36,0.97)':'rgba(4,6,22,0.82)',backdropFilter:'blur(16px)',borderWidth:1,borderStyle:'solid',borderColor:h?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.07)',color:h?U.text:U.muted,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:F.b,letterSpacing:'0.06em',transition:'all 0.18s ease',boxShadow:h?'0 8px 28px rgba(0,0,0,0.65)':'0 2px 12px rgba(0,0,0,0.4)'}}>
      <span style={{opacity:0.6}}>◫</span> Vue 2D
    </button>
  );
}

function CosmosButton({ onClick }) {
  const [h,sH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{position:'absolute',top:12,right:12,zIndex:100,display:'flex',alignItems:'center',gap:8,padding:'8px 18px',borderRadius:40,background:h?'rgba(8,10,28,0.97)':'rgba(4,6,20,0.85)',backdropFilter:'blur(16px)',border:`1px solid ${h?U.accent+'72':U.accent+'38'}`,color:h?U.accentBright:U.accent,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:F.b,letterSpacing:'0.06em',boxShadow:h?`0 0 32px ${U.accent}35`:`0 0 18px ${U.accent}16`,transition:'all 0.2s ease'}}>
      <span style={{animation:'vPulse 2s ease-in-out infinite'}}>✦</span> Vue Cosmos 3D
    </button>
  );
}

// ── Block Overlay — full DB data display ──────────────────────────────────
function BlockOverlay3D({ slot, onClose, onRent, onBuyout }) {
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),12); return()=>clearTimeout(t); },[]);
  if (!slot) return null;

  // Use tenant custom color if available
  const color   = (slot.occ && slot.tenant?.c) ? slot.tenant.c : (TIER_COLOR[slot.tier]||U.accent);
  const label   = TIER_LABEL[slot.tier]||slot.tier;
  const price   = priceEur(slot.tier);
  const isTop   = slot.tier==='epicenter'||slot.tier==='prestige';
  const tenant  = slot.tenant;

  const handleRent = () => {
    // Record impression/click event
    if (slot.occ && tenant?.bookingId) {
      recordClick({slotX:slot.x, slotY:slot.y, bookingId:tenant.bookingId, event:'view'});
    }
    onRent(slot);
  };

  const handleCTA = () => {
    if (tenant?.url) {
      recordClick({slotX:slot.x, slotY:slot.y, bookingId:tenant.bookingId, event:'click'});
      window.open(tenant.url, '_blank', 'noopener');
    }
  };

  return (
    <div onClick={onClose} style={{position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,8,0.90)',backdropFilter:'blur(30px)',display:'flex',alignItems:'center',justifyContent:'center',opacity:mounted?1:0,transition:'opacity 0.26s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:340,maxHeight:'88vh',borderRadius:28,overflow:'hidden auto',background:'linear-gradient(155deg,rgba(8,11,30,0.99),rgba(3,4,15,0.99))',border:`1px solid ${color}2c`,boxShadow:`0 0 0 1px rgba(255,255,255,0.04) inset,0 0 90px ${color}1c,0 60px 120px rgba(0,0,0,0.96)`,transform:mounted?'scale(1) translateY(0)':'scale(0.88) translateY(28px)',transition:'transform 0.40s cubic-bezier(.34,1.56,.64,1)'}}>

        {/* Accent bar */}
        <div style={{height:2,background:`linear-gradient(90deg,transparent,${color}65,${color},${color}65,transparent)`,boxShadow:`0 0 28px ${color}`}}/>
        {/* Radial top glow */}
        <div style={{position:'absolute',top:2,left:0,right:0,height:140,pointerEvents:'none',background:`radial-gradient(ellipse 55% 75% at 50% 0%,${color}10,transparent 70%)`}}/>

        <div style={{padding:'22px 24px 28px',position:'relative'}}>
          {/* Header: badge + close */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:7,padding:'5px 14px',borderRadius:40,background:`${color}14`,border:`1px solid ${color}42`,boxShadow:`0 0 22px ${color}1c`}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:color,boxShadow:`0 0 12px ${color},0 0 24px ${color}88`,animation:'vPulse 2.6s ease-in-out infinite'}}/>
              <span style={{color,fontSize:10,fontWeight:900,letterSpacing:'0.14em',fontFamily:F.h}}>{label}</span>
            </div>
            {/* Tier coords */}
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              {slot.x!==undefined&&<span style={{color:U.mutedLo,fontSize:8,fontFamily:F.m}}>({slot.x},{slot.y})</span>}
              <button onClick={onClose} style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.10)',color:'rgba(255,255,255,0.38)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.10)';e.currentTarget.style.color='rgba(255,255,255,0.80)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(255,255,255,0.38)';}}>×</button>
            </div>
          </div>

          {/* If occupied — show tenant content */}
          {slot.occ && tenant ? (
            <>
              {/* Tenant image (if any) */}
              {tenant.img && (
                <div style={{width:'100%',height:120,borderRadius:16,marginBottom:16,overflow:'hidden',background:`${color}10`,border:`1px solid ${color}20`}}>
                  <img src={tenant.img} alt={tenant.name} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                    onError={e=>{e.currentTarget.style.display='none';}}/>
                </div>
              )}

              {/* Logo + name row */}
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
                <div style={{width:54,height:54,flexShrink:0,borderRadius:16,background:`radial-gradient(circle at 35% 35%,${color}2e,${color}0a)`,border:`1.5px solid ${color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color,fontFamily:F.h,boxShadow:`0 0 28px ${color}28,0 0 0 4px ${color}0a`}}>
                  {tenant.l || tenant.name?.charAt(0)?.toUpperCase() || '✦'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:U.text,fontSize:16,fontWeight:800,fontFamily:F.h,letterSpacing:'-0.01em',lineHeight:1.2,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {tenant.name}
                  </div>
                  {tenant.slogan && (
                    <div style={{color:U.muted,fontSize:10,fontFamily:F.b,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                      {tenant.slogan}
                    </div>
                  )}
                </div>
              </div>

              {/* Status pill */}
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:18}}>
                <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:U.ok,boxShadow:`0 0 8px ${U.ok}`,flexShrink:0}}/>
                <span style={{color:U.muted,fontSize:11,fontFamily:F.b}}>
                  {tenant.cta || 'Espace publicitaire actif'}
                </span>
                {tenant.badge && <span style={{marginLeft:'auto',padding:'2px 8px',borderRadius:20,background:`${color}18`,border:`1px solid ${color}30`,color,fontSize:8,fontWeight:800,fontFamily:F.b,letterSpacing:'0.08em'}}>{tenant.badge}</span>}
              </div>

              <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)',marginBottom:18}}/>

              {/* Price */}
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20}}>
                <div>
                  <div style={{color:U.mutedLo,fontSize:9,fontWeight:600,letterSpacing:'0.12em',fontFamily:F.b,marginBottom:4}}>TARIF / JOUR</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:3}}>
                    <span style={{color,fontSize:32,fontWeight:900,fontFamily:F.h,letterSpacing:'-0.02em',textShadow:`0 0 40px ${color}66`}}>€{price}</span>
                    <span style={{color:U.mutedLo,fontSize:12,fontFamily:F.b,marginBottom:2}}>/j</span>
                  </div>
                </div>
                {isTop&&<div style={{padding:'7px 12px',borderRadius:12,background:`${color}12`,border:`1px solid ${color}28`,textAlign:'center'}}><div style={{color,fontSize:9,fontWeight:800,letterSpacing:'0.10em',fontFamily:F.b}}>✦ PREMIUM</div><div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,marginTop:2}}>{slot.tier==='epicenter'?'#1 mondial':'Top tier'}</div></div>}
              </div>

              {/* CTAs */}
              {tenant.url && (
                <button onClick={handleCTA} style={{width:'100%',padding:'14px 0',borderRadius:14,background:`linear-gradient(135deg,${color},${color}cc)`,border:'none',color:'#050408',fontSize:13,fontWeight:900,fontFamily:F.b,cursor:'pointer',letterSpacing:'0.05em',boxShadow:`0 0 36px ${color}55,0 10px 28px rgba(0,0,0,0.5)`,transition:'all 0.2s ease',marginBottom:8}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 0 50px ${color}77,0 14px 36px rgba(0,0,0,0.6)`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 0 36px ${color}55,0 10px 28px rgba(0,0,0,0.5)`;}}>
                  {tenant.cta || 'Visiter'} →
                </button>
              )}
              <button onClick={()=>onBuyout(slot)} style={{width:'100%',padding:'12px 0',borderRadius:14,background:`${color}0d`,border:`1px solid ${color}20`,color:U.muted,fontSize:12,fontWeight:700,fontFamily:F.b,cursor:'pointer',letterSpacing:'0.03em',transition:'all 0.2s ease'}}
                onMouseEnter={e=>{e.currentTarget.style.background=`${color}1c`;e.currentTarget.style.color=color;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${color}0d`;e.currentTarget.style.color=U.muted;}}>
                Faire une offre de rachat
              </button>
            </>
          ) : (
            /* Empty slot */
            <>
              <div style={{width:66,height:66,borderRadius:20,marginBottom:18,background:'rgba(255,255,255,0.025)',border:`1.5px solid ${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color:`${color}66`,fontFamily:F.h}}>○</div>
              <div style={{color:U.text,fontSize:18,fontWeight:800,fontFamily:F.h,marginBottom:6,letterSpacing:'-0.01em'}}>Emplacement {label}</div>
              <div style={{display:'flex',alignItems:'center',gap:6,color:U.muted,fontSize:11,fontFamily:F.b,marginBottom:20}}>
                <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:color,boxShadow:`0 0 8px ${color}`,flexShrink:0}}/>
                Disponible · Visible de toute la grille
              </div>
              <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)',marginBottom:20}}/>
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:22}}>
                <div>
                  <div style={{color:U.mutedLo,fontSize:9,fontWeight:600,letterSpacing:'0.12em',fontFamily:F.b,marginBottom:4}}>TARIF / JOUR</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:3}}>
                    <span style={{color,fontSize:32,fontWeight:900,fontFamily:F.h,letterSpacing:'-0.02em',textShadow:`0 0 40px ${color}66`}}>€{price}</span>
                    <span style={{color:U.mutedLo,fontSize:12,fontFamily:F.b,marginBottom:2}}>/j</span>
                  </div>
                </div>
                {isTop&&<div style={{padding:'7px 12px',borderRadius:12,background:`${color}12`,border:`1px solid ${color}28`,textAlign:'center'}}><div style={{color,fontSize:9,fontWeight:800,letterSpacing:'0.10em',fontFamily:F.b}}>✦ PREMIUM</div><div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,marginTop:2}}>{slot.tier==='epicenter'?'#1 mondial':'Top tier'}</div></div>}
              </div>
              <button onClick={handleRent} style={{width:'100%',padding:'15px 0',borderRadius:14,background:`linear-gradient(135deg,${color},${color}cc)`,border:'none',color:'#050408',fontSize:13,fontWeight:900,fontFamily:F.b,cursor:'pointer',letterSpacing:'0.06em',boxShadow:`0 0 36px ${color}55,0 10px 28px rgba(0,0,0,0.5)`,transition:'all 0.2s ease'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 0 50px ${color}77,0 14px 36px rgba(0,0,0,0.6)`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 0 36px ${color}55,0 10px 28px rgba(0,0,0,0.5)`;}}>
                Réserver ce nœud →
              </button>
            </>
          )}

          <div style={{marginTop:12,textAlign:'center',color:U.mutedLo,fontSize:9,fontFamily:F.b,letterSpacing:'0.04em'}}>Paiement sécurisé · Résiliation à tout moment</div>
        </div>
      </div>
    </div>
  );
}

function HUDCorners() {
  const s = `${U.accent}25`;
  const corner = (pos, bdr) => <div key={JSON.stringify(pos)} style={{position:'absolute',width:20,height:20,pointerEvents:'none',...pos,...bdr}}/>;
  return <>
    {corner({top:14,left:14},  {borderTop:`1.5px solid ${s}`,borderLeft:`1.5px solid ${s}`,borderRadius:'4px 0 0 0'})}
    {corner({top:14,right:14}, {borderTop:`1.5px solid ${s}`,borderRight:`1.5px solid ${s}`,borderRadius:'0 4px 0 0'})}
    {corner({bottom:14,left:14},  {borderBottom:`1.5px solid ${s}`,borderLeft:`1.5px solid ${s}`,borderRadius:'0 0 0 4px'})}
    {corner({bottom:14,right:14}, {borderBottom:`1.5px solid ${s}`,borderRight:`1.5px solid ${s}`,borderRadius:'0 0 4px 0'})}
  </>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function View3D({
  slots: parentSlots=[],
  isLive: parentIsLive=false,
  onGoAdvertiser, onWaitlist, onCheckout, onBuyout,
  ExistingPublicView,
}) {
  const canvasRef   = useRef(null);
  const sceneRef    = useRef(null);
  const [level,     setLevel]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [focusSlot, setFocusSlot] = useState(null);
  const [realtimePing, setRealtimePing] = useState(0);

  // Use live slots (DB subscription > parent)
  const allSlots = useView3DSlots(parentSlots);
  const isLive   = parentIsLive || (allSlots !== parentSlots);

  // Sort all slots by tier
  const sortedSlots = useMemo(() => sortSlotsByTier(allSlots), [allSlots]);

  // Filter slots for current level's tiers, then build node data
  const nodeData = useMemo(() => {
    if (level === 0) return [];
    const tiers = new Set(LEVELS[level]?.tiers || []);
    const filtered = sortedSlots.filter(s => tiers.has(s.tier) && !s.isGhost);
    return bandedFibonacciSphere(filtered, SPHERE_R);
  }, [level, sortedSlots]);

  // Init Three.js once
  useEffect(() => {
    if (level === 0 || !canvasRef.current) return;
    let scene;
    Promise.all([
      import('three'),
      import('gsap').then(m => m.gsap || m.default),
    ]).then(([THREE, GSAP]) => {
      scene = new Scene3D(canvasRef.current);
      sceneRef.current = scene;
      scene.onNodeClick = (slot) => setFocusSlot(slot);
      return scene.init(THREE, GSAP);
    }).then(() => {
      sceneRef.current.setNodes(nodeData, false);
      setLoading(false);
    }).catch(err => {
      console.error('View3D:', err);
      setError('Three.js non disponible — npm install three gsap');
      setLoading(false);
    });
    return () => { if (scene) scene.destroy(); sceneRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level === 0]);

  // Update nodes when level / slots change
  useEffect(() => {
    if (!sceneRef.current || level === 0) return;
    sceneRef.current.setNodes(nodeData, true);
  }, [nodeData, level]);

  // Realtime subscription — refresh nodes on DB change
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const structural = buildStructuralGrid();
    const unsub = subscribeToBookings(() => {
      fetchActiveSlots().then(({data, error}) => {
        if (!error && data) setRealtimePing(p => p+1);
      });
    });
    return unsub;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const fn = e => {
      if (e.key>='0'&&e.key<='6') setLevel(parseInt(e.key));
      else if (e.key==='ArrowRight'||e.key==='ArrowUp')   setLevel(l=>Math.min(6,l+1));
      else if (e.key==='ArrowLeft'||e.key==='ArrowDown')  setLevel(l=>Math.max(1,l-1));
      else if (e.key==='Escape') setFocusSlot(null);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const fn = e => { e.preventDefault(); sceneRef.current?.zoom(e.deltaY); };
    const canvas = canvasRef.current;
    if (canvas) canvas.addEventListener('wheel', fn, {passive:false});
    return () => { if (canvas) canvas.removeEventListener('wheel', fn); };
  }, [level]);

  // Resize observer
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(() => sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  const handleLevel = useCallback(n => { setFocusSlot(null); setLevel(n); }, []);

  // ── Level 0: 2D grid ────────────────────────────────────────────────────────
  if (level === 0) return (
    <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      <CosmosButton onClick={()=>handleLevel(1)}/>
      {ExistingPublicView && <ExistingPublicView slots={allSlots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
    </div>
  );

  // ── Levels 1–6: 3D sphere ───────────────────────────────────────────────────
  return (
    <div style={{flex:1,position:'relative',overflow:'hidden',background:'radial-gradient(ellipse 90% 80% at 50% 42%,#060e32 0%,#01020c 65%,#010208 100%)'}}>

      <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',cursor:focusSlot?'default':'grab',opacity:loading?0:1,transition:'opacity 0.7s ease'}}/>

      {/* Vignette */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:3,background:'radial-gradient(ellipse 82% 82% at 50% 50%,transparent 44%,rgba(1,2,8,0.68) 100%)'}}/>
      {/* Scanlines */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.012) 2px,rgba(0,0,0,0.012) 4px)'}}/>

      <HUDCorners/>

      {loading && !error && <CosmicLoader/>}

      {error && (
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:24,background:'rgba(1,2,8,0.96)',zIndex:60}}>
          <div style={{padding:'8px 18px',borderRadius:12,background:'rgba(255,77,109,0.10)',border:'1px solid rgba(255,77,109,0.25)',color:U.err,fontSize:12,fontWeight:700,fontFamily:F.b}}>⚠ {error}</div>
          <button onClick={()=>handleLevel(0)} style={{padding:'10px 24px',borderRadius:40,background:U.accent,border:'none',color:U.accentFg,fontWeight:800,cursor:'pointer',fontFamily:F.b,fontSize:12}}>
            Revenir à la grille 2D
          </button>
        </div>
      )}

      {/* Top-left: Back to 2D */}
      <BackButton onClick={()=>handleLevel(0)}/>

      {/* Top-left below: stats */}
      {!loading && (
        <div style={{position:'absolute',top:56,left:16,zIndex:30}}>
          <StatsBar slots={allSlots} level={level}/>
        </div>
      )}

      {/* Top-right: tier legend */}
      <TierLegend level={level} slots={allSlots} isLive={isLive}/>

      {/* Bottom: level dots */}
      <LevelDots level={level} onLevel={handleLevel}/>

      {!loading && <ZoomHint/>}

      {focusSlot && (
        <BlockOverlay3D
          slot={focusSlot}
          onClose={()=>setFocusSlot(null)}
          onRent={s=>{ setFocusSlot(null); onCheckout?.(s); }}
          onBuyout={s=>{ setFocusSlot(null); onBuyout?.(s); }}
        />
      )}

      <style>{`
        @keyframes vSpin  { to { transform: rotate(360deg); } }
        @keyframes vPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.52;transform:scale(.80)} }
        @keyframes vFade  { 0%,100%{opacity:.9} 50%{opacity:.38} }
      `}</style>
    </div>
  );
}