'use client';
/**
 * ─── ADS·SQUARE — View3D ████████████████████████████████████████████████████
 *  ORBITAL NUCLEUS EDITION
 *
 *  ✦ Architecture : ÉPICENTRE = Noyau central (rayon 0) — pièce maîtresse
 *  ✦ Tiers = coquilles orbitales concentriques (plus le tier est cher → plus proche du noyau)
 *  ✦ Taille des noeuds ∝ prix (ÉPICENTRE max, VIRAL minimal)
 *  ✦ Anneaux orbitaux colorés par tier
 *  ✦ Noyau pulsant avec aura dorée pour ÉPICENTRE
 *  ✦ Particules d'énergie orbitant autour du noyau
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
  muted: 'rgba(180,195,255,0.52)', mutedLo: 'rgba(180,195,255,0.26)',
  accent: '#d4a84b', accentBright: '#f5c842', accentFg: '#05040a',
  glass: 'rgba(4,6,22,0.86)', border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.14)', err: '#ff4d6d', ok: '#00e8a2',
};
const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
  m: "'JetBrains Mono','Fira Code','Courier New',monospace",
};

const priceEur = tier => ((TIER_PRICE[tier] || 100) / 100).toLocaleString('fr-FR');
const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];

// ── Rayon orbital par tier ────────────────────────────────────────────────────
// ÉPICENTRE = 0 (noyau), chaque tier s'éloigne proportionnellement
const TIER_ORBIT_RADIUS = {
  epicenter: 0.0,
  prestige:  2.2,
  elite:     3.8,
  business:  5.2,
  standard:  6.5,
  viral:     8.0,
};

// Taille des noeuds (Points) par tier
const TIER_NODE_SIZE = {
  epicenter: 1.80,
  prestige:  0.70,
  elite:     0.42,
  business:  0.26,
  standard:  0.16,
  viral:     0.10,
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

// ─────────────────────────────────────────────────────────────────────────────
// TEXTURE FACTORY — génère des sprites circulaires avec aura douce
// Résout le problème des "carrés" WebGL de PointsMaterial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée une texture canvas ronde avec gradient radial exponentiel.
 * core  : rayon du point dur central (0..1)
 * falloff : puissance de l'exponentielle (plus haut = plus dur)
 * color : couleur hex optionnelle pour teinte (null = blanc pur → vertex color)
 */
function makeGlowTexture(THREE, { size=128, core=0.18, falloff=2.2, color=null }={}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2, r = size / 2;

  // Gradient radial : blanc au centre → transparent au bord
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

  if (color) {
    // Teinte colorée : utile pour les halos de tier
    const hex = color.replace('#','');
    const ri = parseInt(hex.slice(0,2),16);
    const gi = parseInt(hex.slice(2,4),16);
    const bi = parseInt(hex.slice(4,6),16);
    grad.addColorStop(0,           `rgba(${ri},${gi},${bi},1.0)`);
    grad.addColorStop(core,        `rgba(${ri},${gi},${bi},0.92)`);
    grad.addColorStop(core + 0.12, `rgba(${ri},${gi},${bi},0.55)`);
    grad.addColorStop(core + 0.35, `rgba(${ri},${gi},${bi},0.18)`);
    grad.addColorStop(1.0,         `rgba(${ri},${gi},${bi},0.0)`);
  } else {
    // Blanc pur — la couleur vient du vertexColor
    grad.addColorStop(0,           'rgba(255,255,255,1.0)');
    grad.addColorStop(core,        'rgba(255,255,255,0.95)');
    grad.addColorStop(core + 0.14, 'rgba(255,255,255,0.60)');
    grad.addColorStop(core + 0.38, 'rgba(255,255,255,0.18)');
    grad.addColorStop(core + 0.60, 'rgba(255,255,255,0.05)');
    grad.addColorStop(1.0,         'rgba(255,255,255,0.0)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Texture anneau lumineux — pour l'aura externe des noeuds occupés
 */
function makeRingTexture(THREE, { size=128, ringR=0.72, ringW=0.08 }={}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size/2, cy = size/2, r = size/2;

  const inner = (ringR - ringW/2) * r;
  const outer = (ringR + ringW/2) * r;
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  grad.addColorStop(0,   'rgba(255,255,255,0.0)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.7)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Layout orbital : épicentre au centre, tiers sur coquilles sphériques concentriques.
 */
function orbitalShellLayout(slots) {
  const groups = {};
  for (const tier of TIER_ORDER) groups[tier] = [];
  slots.forEach(s => { if (s?.tier && groups[s.tier]) groups[s.tier].push(s); });

  const result = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (const tier of TIER_ORDER) {
    const items = groups[tier];
    if (!items.length) continue;
    const R = TIER_ORBIT_RADIUS[tier];

    if (tier === 'epicenter') {
      const n = items.length;
      items.forEach((slot, i) => {
        if (n === 1) {
          result.push({ slot, pos: [0, 0, 0] });
        } else {
          const angle = (i / n) * Math.PI * 2;
          result.push({ slot, pos: [Math.cos(angle)*0.55, Math.sin(angle)*0.28, Math.sin(angle)*0.55] });
        }
      });
      continue;
    }

    const n = items.length;
    items.forEach((slot, i) => {
      const y = 1 - (i / (Math.max(n-1,1))) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - y*y));
      const theta = golden * i;
      result.push({
        slot,
        pos: [Math.cos(theta)*rr*R, y*R, Math.sin(theta)*rr*R],
      });
    });
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
    this._orbitalRings = [];
    this._nucleus = null;
    this._nucleusGlow = null;
    this._nucleusAura = null;
    this._corona = null;
    this._energyParticles = null;
    this._energyPhase = null;
    this._nuclearLight = null;
    this.raycaster = null;
    this.nodeData = [];
    this.onNodeClick = null;
    this.rot = {x:0.12,y:0}; this.vel = {x:0,y:0};
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
    this.scene.fog = new THREE.FogExp2(0x010208, 0.006);

    this.camera = new THREE.PerspectiveCamera(38, W/H, 0.1, 1000);
    this.camera.position.z = this.zoomCurrent;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.55 };

    this.scene.add(new THREE.AmbientLight(0x030818, 5));

    // Pré-construire les textures sprites une seule fois
    // nodeTex  : sprite de base (point dur + aura douce)
    // glowTex  : halo large très diffus
    // ringTex  : anneau lumineux pour noeuds occupés
    this._nodeTex  = makeGlowTexture(THREE, { size:256, core:0.14, falloff:2.5 });
    this._glowTex  = makeGlowTexture(THREE, { size:256, core:0.04, falloff:1.4 });
    this._ringTex  = makeRingTexture(THREE, { size:256, ringR:0.68, ringW:0.12 });

    this._group = new THREE.Group();
    this._group.rotation.x = this.rot.x;
    this.scene.add(this._group);

    // Lumière ponctuelle dorée au noyau
    this._nuclearLight = new THREE.PointLight(0xf0b429, 2.8, 14);
    this._nuclearLight.position.set(0,0,0);
    this._group.add(this._nuclearLight);

    this._buildStars();
    this._buildNucleus();
    this._buildOrbitalRings();
    this._buildEnergyParticles();
    this._buildAtmosphere();
    this._bindEvents();
    this._animate();
  }

  _buildStars() {
    const T = this.T;
    const N = 9000, pos = new Float32Array(N*3), col = new Float32Array(N*3);
    for (let i=0; i<N; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = 140 + Math.random()*400;
      pos[i*3] = r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2] = r*Math.cos(phi);
      const t = Math.random();
      if (t < 0.60)      { col[i*3]=0.52+t*0.48; col[i*3+1]=0.65+t*0.25; col[i*3+2]=1.0; }
      else if (t < 0.78) { col[i*3]=1.0;  col[i*3+1]=0.93; col[i*3+2]=0.60; }
      else               { col[i*3]=0.88; col[i*3+1]=0.52; col[i*3+2]=1.0; }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos,3));
    g.setAttribute('color',    new T.BufferAttribute(col,3));
    this.stars = new T.Points(g, new T.PointsMaterial({size:0.12, vertexColors:true, transparent:true, opacity:0.90, sizeAttenuation:true}));
    this.scene.add(this.stars);

    const N2=700, p2=new Float32Array(N2*3), c2=new Float32Array(N2*3);
    for (let i=0; i<N2; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = 62 + Math.random()*78;
      p2[i*3] = r*Math.sin(phi)*Math.cos(theta);
      p2[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      p2[i*3+2] = r*Math.cos(phi);
      c2[i*3]=1; c2[i*3+1]=0.95; c2[i*3+2]=0.80;
    }
    const g2 = new T.BufferGeometry();
    g2.setAttribute('position', new T.BufferAttribute(p2,3));
    g2.setAttribute('color',    new T.BufferAttribute(c2,3));
    this.stars2 = new T.Points(g2, new T.PointsMaterial({size:0.42, vertexColors:true, transparent:true, opacity:0.55, sizeAttenuation:true}));
    this.scene.add(this.stars2);
  }

  _buildNucleus() {
    const T = this.T;

    // Sphère centrale solide — ÉPICENTRE
    const geo = new T.SphereGeometry(0.42, 32, 32);
    const mat = new T.MeshStandardMaterial({
      color: 0xf0b429,
      emissive: 0xf0a020,
      emissiveIntensity: 3.5,
      roughness: 0.06,
      metalness: 0.96,
    });
    this._nucleus = new T.Mesh(geo, mat);
    this._group.add(this._nucleus);

    // Halo intermédiaire
    const geo2 = new T.SphereGeometry(0.72, 28, 28);
    const mat2 = new T.MeshBasicMaterial({ color: 0xf5c842, transparent: true, opacity: 0.10, side: T.BackSide });
    this._nucleusGlow = new T.Mesh(geo2, mat2);
    this._group.add(this._nucleusGlow);

    // Aura externe
    const geo3 = new T.SphereGeometry(1.15, 28, 28);
    const mat3 = new T.MeshBasicMaterial({ color: 0xd4a84b, transparent: true, opacity: 0.04, side: T.BackSide });
    this._nucleusAura = new T.Mesh(geo3, mat3);
    this._group.add(this._nucleusAura);

    // Corona (particules dorées autour du noyau)
    const N = 200;
    const cp = new Float32Array(N*3), cc = new Float32Array(N*3);
    for (let i=0; i<N; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = 0.82 + Math.random()*0.60;
      cp[i*3]   = r*Math.sin(phi)*Math.cos(theta);
      cp[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      cp[i*3+2] = r*Math.cos(phi);
      const br = 0.55 + Math.random()*0.45;
      cc[i*3]=br; cc[i*3+1]=br*0.76; cc[i*3+2]=br*0.16;
    }
    const cg = new T.BufferGeometry();
    cg.setAttribute('position', new T.BufferAttribute(cp,3));
    cg.setAttribute('color',    new T.BufferAttribute(cc,3));
    this._corona = new T.Points(cg, new T.PointsMaterial({
      map: this._nodeTex,
      vertexColors:true, size:0.07, transparent:true, opacity:0.52,
      blending:T.AdditiveBlending, depthWrite:false, sizeAttenuation:true,
      alphaTest: 0.001,
    }));
    this._group.add(this._corona);

    // Anneau de halo autour du noyau — sprite circulaire large
    const ringGeo = new T.BufferGeometry();
    ringGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([0,0,0]),3));
    ringGeo.setAttribute('color',    new T.BufferAttribute(new Float32Array([1,0.82,0.22]),3));
    this._nucleusRingSprite = new T.Points(ringGeo, new T.PointsMaterial({
      map: this._ringTex,
      vertexColors: true,
      size: 3.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      blending: T.AdditiveBlending,
      depthWrite: false,
      alphaTest: 0.001,
    }));
    this._group.add(this._nucleusRingSprite);

    // Mega halo diffus autour du noyau
    const megaGeo = new T.BufferGeometry();
    megaGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([0,0,0]),3));
    megaGeo.setAttribute('color',    new T.BufferAttribute(new Float32Array([1,0.78,0.15]),3));
    this._nucleusMegaSprite = new T.Points(megaGeo, new T.PointsMaterial({
      map: this._glowTex,
      vertexColors: true,
      size: 6.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.18,
      blending: T.AdditiveBlending,
      depthWrite: false,
      alphaTest: 0.001,
    }));
    this._group.add(this._nucleusMegaSprite);
  }

  _buildOrbitalRings() {
    const T = this.T;
    this._orbitalRings = [];

    const defs = [
      { R: TIER_ORBIT_RADIUS.prestige,  color:0xff4d8f, op:0.14, w:0.04 },
      { R: TIER_ORBIT_RADIUS.elite,     color:0xa855f7, op:0.10, w:0.04 },
      { R: TIER_ORBIT_RADIUS.business,  color:0x00d9f5, op:0.08, w:0.03 },
      { R: TIER_ORBIT_RADIUS.standard,  color:0x38bdf8, op:0.06, w:0.03 },
      { R: TIER_ORBIT_RADIUS.viral,     color:0x00e8a2, op:0.04, w:0.025 },
    ];

    for (const def of defs) {
      const geo = new T.RingGeometry(def.R - def.w, def.R + def.w, 120);
      const mat = new T.MeshBasicMaterial({color:def.color, transparent:true, opacity:def.op, side:T.DoubleSide});
      const ring = new T.Mesh(geo, mat);
      ring.rotation.x = Math.PI/2;
      this._group.add(ring);

      const geo2 = new T.RingGeometry(def.R - def.w*0.6, def.R + def.w*0.6, 120);
      const mat2 = new T.MeshBasicMaterial({color:def.color, transparent:true, opacity:def.op*0.45, side:T.DoubleSide});
      const ring2 = new T.Mesh(geo2, mat2);
      ring2.rotation.x = Math.PI/4; ring2.rotation.z = Math.PI/6;
      this._group.add(ring2);

      this._orbitalRings.push({ ring, ring2, baseOp:def.op });
    }
  }

  _buildEnergyParticles() {
    const T = this.T;
    const N = 300;
    const pos = new Float32Array(N*3), col = new Float32Array(N*3), phase = new Float32Array(N);
    for (let i=0; i<N; i++) {
      const orbitR = 1.1 + Math.random()*2.6;
      const theta = Math.random()*Math.PI*2, phi = (Math.random()-0.5)*0.85;
      pos[i*3]   = orbitR*Math.cos(theta)*Math.cos(phi);
      pos[i*3+1] = orbitR*Math.sin(phi);
      pos[i*3+2] = orbitR*Math.sin(theta)*Math.cos(phi);
      phase[i] = Math.random()*Math.PI*2;
      const br = 0.45+Math.random()*0.55;
      col[i*3]=br; col[i*3+1]=br*0.80; col[i*3+2]=br*0.20;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos,3));
    geo.setAttribute('color',    new T.BufferAttribute(col,3));
    this._energyParticles = new T.Points(geo, new T.PointsMaterial({
      map: this._nodeTex,
      vertexColors:true, size:0.07, transparent:true, opacity:0.42,
      blending:T.AdditiveBlending, depthWrite:false, sizeAttenuation:true,
      alphaTest: 0.001,
    }));
    this._energyPhase = phase;
    this._group.add(this._energyParticles);
  }

  _buildAtmosphere() {
    const T = this.T;
    const maxR = TIER_ORBIT_RADIUS.viral + 1.5;
    const N = 2400, pos = new Float32Array(N*3), col = new Float32Array(N*3);
    for (let i=0; i<N; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = maxR * (0.92 + Math.random()*0.14);
      pos[i*3]   = r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2] = r*Math.cos(phi);
      col[i*3]   = 0.10 + Math.random()*0.18;
      col[i*3+1] = 0.20 + Math.random()*0.26;
      col[i*3+2] = 0.44 + Math.random()*0.44;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos,3));
    g.setAttribute('color',    new T.BufferAttribute(col,3));
    this.particleMesh = new T.Points(g, new T.PointsMaterial({
      size:0.030, vertexColors:true, transparent:true, opacity:0.20, sizeAttenuation:true,
    }));
    this._group.add(this.particleMesh);

    const N2=600, p2=new Float32Array(N2*3);
    for (let i=0; i<N2; i++) {
      const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
      const r = maxR + 0.5 + Math.random()*2.5;
      p2[i*3]   = r*Math.sin(phi)*Math.cos(theta);
      p2[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
      p2[i*3+2] = r*Math.cos(phi);
    }
    const g2 = new T.BufferGeometry();
    g2.setAttribute('position', new T.BufferAttribute(p2,3));
    this._atmoHaze = new T.Points(g2, new T.PointsMaterial({
      color:0x1a44ff, size:0.06, transparent:true, opacity:0.06, sizeAttenuation:true,
    }));
    this._group.add(this._atmoHaze);
  }

  _clearNodes() {
    [this.nodeMesh, this._glowLayer, this._epicGlow, this._megaGlow, this.constellations].filter(Boolean).forEach(o => {
      this._group.remove(o); o.geometry?.dispose(); o.material?.dispose();
    });
    this.nodeMesh = this._glowLayer = this._epicGlow = this._megaGlow = this.constellations = null;
    this.nodeData = [];
  }

  _buildNodes(nodeData) {
    this._clearNodes();
    const n = nodeData.length; if (!n) return;
    this.nodeData = nodeData;

    const T = this.T;
    const otherItems = nodeData.filter(d => d.slot?.tier !== 'epicenter');
    const epicItems  = nodeData.filter(d => d.slot?.tier === 'epicenter');

    if (otherItems.length) {
      const no = otherItems.length;

      // Taille de sprite par tier (world-units)
      const NODE_SZ = { prestige:0.58, elite:0.38, business:0.24, standard:0.16, viral:0.10 };
      // Halo diffus (2.5× le sprite dur)
      const HALO_SZ = { prestige:1.80, elite:1.15, business:0.70, standard:0.44, viral:0.28 };
      // Anneau d'aura pour noeuds occupés
      const RING_SZ = { prestige:1.20, elite:0.76, business:0.50, standard:0.34, viral:0.22 };

      const pos  = new Float32Array(no*3);
      const col  = new Float32Array(no*3);   // couleur saturée × brightess
      const colH = new Float32Array(no*3);   // couleur halo (même teinte, plus douce)
      const sz   = new Float32Array(no);     // taille noeud dur
      const szH  = new Float32Array(no);     // taille halo
      const szR  = new Float32Array(no);     // taille anneau

      for (let i=0; i<no; i++) {
        const {slot, pos:p} = otherItems[i];
        pos[i*3]=p[0]; pos[i*3+1]=p[1]; pos[i*3+2]=p[2];

        const tier = slot?.tier || 'viral';
        const base = (slot?.occ && slot?.tenant?.c) ? slot.tenant.c : TIER_COLOR[tier] || '#334';
        const [r,g,b] = hexToVec3(base);

        // Noeud occupé = pleine luminosité ; vide = très atténué
        const br  = slot?.occ ? 1.0  : 0.30;
        const brH = slot?.occ ? 0.65 : 0.12;
        col[i*3]=r*br;   col[i*3+1]=g*br;   col[i*3+2]=b*br;
        colH[i*3]=r*brH; colH[i*3+1]=g*brH; colH[i*3+2]=b*brH;

        sz[i]  = (NODE_SZ[tier] || 0.12) * (slot?.occ ? 1.0 : 0.7);
        szH[i] = (HALO_SZ[tier] || 0.30) * (slot?.occ ? 1.0 : 0.5);
        szR[i] = (RING_SZ[tier] || 0.22);
      }

      // ── Couche 1 : halo diffus large (rendu en premier, blending additif) ──
      const hGeo = new T.BufferGeometry();
      hGeo.setAttribute('position', new T.BufferAttribute(pos.slice(),3));
      hGeo.setAttribute('color',    new T.BufferAttribute(colH,3));
      // On encode la taille dans un attribute custom pour un "pseudo size per-point"
      // Three.js PointsMaterial ne supporte pas size per-point nativement,
      // on utilise donc 3 passes avec tailles moyennées par tier
      this._glowLayer = new T.Points(hGeo, new T.PointsMaterial({
        map: this._glowTex,
        vertexColors: true,
        size: 1.40,              // taille monde du halo diffus (grande)
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.22,
        blending: T.AdditiveBlending,
        depthWrite: false,
        alphaTest: 0.001,
      }));
      this._group.add(this._glowLayer);

      // ── Couche 2 : noeud dur circulaire avec sprite glow ──
      const nGeo = new T.BufferGeometry();
      nGeo.setAttribute('position', new T.BufferAttribute(pos,3));
      nGeo.setAttribute('color',    new T.BufferAttribute(col,3));
      this.nodeMesh = new T.Points(nGeo, new T.PointsMaterial({
        map: this._nodeTex,
        vertexColors: true,
        size: 0.30,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1.0,
        blending: T.AdditiveBlending,
        depthWrite: false,
        alphaTest: 0.001,
      }));
      this._group.add(this.nodeMesh);

      // ── Couche 3 : anneau aura pour les noeuds OCCUPÉS (prestige+) ──
      const occItems = otherItems.filter(d => d.slot?.occ &&
        (d.slot.tier==='prestige'||d.slot.tier==='elite'));
      if (occItems.length) {
        const tp = new Float32Array(occItems.length*3);
        const tc = new Float32Array(occItems.length*3);
        occItems.forEach(({slot,pos:p},j) => {
          tp[j*3]=p[0]; tp[j*3+1]=p[1]; tp[j*3+2]=p[2];
          const c = hexToVec3((slot.tenant?.c)||TIER_COLOR[slot.tier]||'#fff');
          // anneau plus brillant pour prestige
          const br = slot.tier==='prestige' ? 0.85 : 0.55;
          tc[j*3]=c[0]*br; tc[j*3+1]=c[1]*br; tc[j*3+2]=c[2]*br;
        });
        const rGeo = new T.BufferGeometry();
        rGeo.setAttribute('position', new T.BufferAttribute(tp,3));
        rGeo.setAttribute('color',    new T.BufferAttribute(tc,3));
        this._epicGlow = new T.Points(rGeo, new T.PointsMaterial({
          map: this._ringTex,
          vertexColors: true,
          size: 1.60,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.55,
          blending: T.AdditiveBlending,
          depthWrite: false,
          alphaTest: 0.001,
        }));
        this._group.add(this._epicGlow);
      }

      // ── Couche 4 : méga-halo très diffus pour prestige occupés ──
      const megaItems = otherItems.filter(d => d.slot?.occ && d.slot.tier==='prestige');
      if (megaItems.length) {
        const mp = new Float32Array(megaItems.length*3);
        const mc = new Float32Array(megaItems.length*3);
        megaItems.forEach(({slot,pos:p},j) => {
          mp[j*3]=p[0]; mp[j*3+1]=p[1]; mp[j*3+2]=p[2];
          const c = hexToVec3((slot.tenant?.c)||TIER_COLOR[slot.tier]||'#fff');
          mc[j*3]=c[0]*0.4; mc[j*3+1]=c[1]*0.4; mc[j*3+2]=c[2]*0.4;
        });
        const mGeo = new T.BufferGeometry();
        mGeo.setAttribute('position', new T.BufferAttribute(mp,3));
        mGeo.setAttribute('color',    new T.BufferAttribute(mc,3));
        this._megaGlow = new T.Points(mGeo, new T.PointsMaterial({
          map: this._glowTex,
          vertexColors: true,
          size: 3.80,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.14,
          blending: T.AdditiveBlending,
          depthWrite: false,
          alphaTest: 0.001,
        }));
        this._group.add(this._megaGlow);
      }

      this._buildConstellations(otherItems, T);
    }

    // Mettre à jour l'intensité du noyau selon occupation épicentre
    const hasOccEpic = epicItems.some(d => d.slot?.occ);
    if (this._nucleus) this._nucleus.material.emissiveIntensity = hasOccEpic ? 5.0 : 3.2;
    if (this._nucleusGlow) this._nucleusGlow.material.opacity = hasOccEpic ? 0.16 : 0.08;
  }

  _buildConstellations(nodeData, T) {
    if (!nodeData.length) return;
    const lv = [], lc = [];
    for (let i=0; i<nodeData.length; i++) {
      const {slot:sA, pos:pA} = nodeData[i];
      const maxDist = (TIER_ORBIT_RADIUS[sA?.tier] || 3) * 1.0 + 2;
      let found = 0;
      for (let j=i+1; j<nodeData.length && found<2; j++) {
        const {slot:sB, pos:pB} = nodeData[j];
        if (sB?.tier !== sA?.tier) continue;
        const dx=pB[0]-pA[0], dy=pB[1]-pA[1], dz=pB[2]-pA[2];
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < maxDist) {
          const cA = hexToVec3((sA?.tenant?.c)||TIER_COLOR[sA?.tier]||'#223');
          const cB = hexToVec3((sB?.tenant?.c)||TIER_COLOR[sB?.tier]||'#223');
          const a = (sA?.occ && sB?.occ) ? 0.22 : (sA?.occ||sB?.occ) ? 0.09 : 0.03;
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

    // Noyau pulse
    if (this._nucleus) {
      const ps = 1 + Math.sin(t*1.8)*0.09;
      this._nucleus.scale.setScalar(ps);
    }
    if (this._nucleusGlow) {
      this._nucleusGlow.material.opacity = 0.08 + Math.sin(t*1.2)*0.055;
      this._nucleusGlow.rotation.y = t * 0.4;
    }
    if (this._nucleusAura) {
      this._nucleusAura.material.opacity = 0.03 + Math.sin(t*0.7)*0.022;
      this._nucleusAura.rotation.y = -t*0.22;
      this._nucleusAura.rotation.x = t*0.14;
    }
    if (this._nucleusRingSprite) {
      this._nucleusRingSprite.material.opacity = 0.42 + Math.sin(t*1.4)*0.20;
      const rs = 1.0 + Math.sin(t*1.8)*0.08;
      this._nucleusRingSprite.scale.setScalar(rs);
    }
    if (this._nucleusMegaSprite) {
      this._nucleusMegaSprite.material.opacity = 0.12 + Math.sin(t*0.6)*0.06;
      const ms = 1.0 + Math.sin(t*0.9)*0.05;
      this._nucleusMegaSprite.scale.setScalar(ms);
    }
    if (this._corona) {
      this._corona.rotation.y = t*0.35;
      this._corona.material.opacity = 0.40 + Math.sin(t*2.1)*0.18;
    }
    if (this._nuclearLight) {
      this._nuclearLight.intensity = 2.0 + Math.sin(t*1.8)*0.80;
    }

    // Anneaux orbitaux
    if (this._orbitalRings) {
      this._orbitalRings.forEach(({ring,ring2},i) => {
        ring.rotation.z  = t*(0.04+i*0.008)*(i%2===0?1:-1);
        ring.rotation.x  = Math.PI/2 + Math.sin(t*0.1+i)*0.04;
        ring2.rotation.z = -t*(0.028+i*0.006);
        ring2.rotation.x = Math.PI/4 + t*0.015;
      });
    }

    // Particules d'énergie
    if (this._energyParticles && this._energyPhase) {
      const pos = this._energyParticles.geometry.attributes.position.array;
      const phase = this._energyPhase;
      const N = phase.length;
      for (let i=0; i<N; i++) {
        const phi2 = phase[i] + t*(0.38+(i%7)*0.08);
        const theta2 = phase[i]*1.618 + t*(0.27+(i%5)*0.06);
        const orbitR = 1.1 + ((i%5)/4)*1.6;
        pos[i*3]   = orbitR*Math.cos(phi2)*Math.cos(theta2);
        pos[i*3+1] = orbitR*Math.sin(phi2)*0.58;
        pos[i*3+2] = orbitR*Math.sin(theta2)*Math.cos(phi2*0.5);
      }
      this._energyParticles.geometry.attributes.position.needsUpdate = true;
      this._energyParticles.material.opacity = 0.32 + Math.sin(t*0.9)*0.14;
    }

    if (this.particleMesh) {
      const s = 1+Math.sin(t*0.22)*0.007;
      this.particleMesh.scale.set(s,s,s);
      this.particleMesh.material.opacity = 0.17+Math.sin(t*0.35)*0.05;
    }
    if (this._glowLayer) this._glowLayer.material.opacity = 0.18+Math.sin(t*0.65)*0.06;
    if (this._epicGlow)  this._epicGlow.material.opacity  = 0.45+Math.sin(t*1.8)*0.18;
    if (this._megaGlow)  this._megaGlow.material.opacity  = 0.10+Math.sin(t*0.9)*0.06;

    this.zoomCurrent += (this.zoomTarget - this.zoomCurrent) * 0.07;
    this.camera.position.z = this.zoomCurrent;

    this.renderer.render(this.scene, this.camera);
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

  zoom(delta) { this.zoomTarget = Math.max(6, Math.min(55, this.zoomTarget+delta*0.013)); }

  handleClick(cx, cy) {
    if (!this.onNodeClick) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((cx-rect.left)/rect.width)*2-1;
    const y = -((cy-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera({x,y}, this.camera);

    // Vérifier le noyau en premier
    if (this._nucleus) {
      const hits = this.raycaster.intersectObject(this._nucleus);
      if (hits.length > 0) {
        const epicNode = this.nodeData.find(nd => nd.slot?.tier === 'epicenter');
        if (epicNode?.slot) { this.onNodeClick(epicNode.slot); return; }
      }
    }

    if (!this.nodeMesh) return;
    const hits = this.raycaster.intersectObject(this.nodeMesh);
    if (hits.length > 0) {
      const nonEpic = this.nodeData.filter(nd => nd.slot?.tier !== 'epicenter');
      const nd = nonEpic[hits[0].index];
      if (nd?.slot) this.onNodeClick(nd.slot);
    }
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
    try {
      this.canvas?.removeEventListener('mousedown',h.md);
      window.removeEventListener('mousemove',h.mm);
      window.removeEventListener('mouseup',h.mu);
      this.canvas?.removeEventListener('touchstart',h.ts);
      this.canvas?.removeEventListener('touchmove',h.tm);
      this.canvas?.removeEventListener('touchend',h.te);
    } catch(e){}
    this._clearNodes(); this.renderer?.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK : DB slots
// ─────────────────────────────────────────────────────────────────────────────
function useView3DSlots(parentSlots) {
  const structural = useMemo(() => buildStructuralGrid(), []);
  const [liveSlots, setLiveSlots] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsub = subscribeToBookings(() => {
      fetchActiveSlots().then(({data, error}) => {
        if (!error && data) setLiveSlots(mergeGridWithBookings(structural, data));
      });
    });
    return unsub;
  }, [structural]);

  return liveSlots || parentSlots || structural;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function CosmicLoader() {
  return (
    <div style={{position:'absolute',inset:0,zIndex:60,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:32,background:'radial-gradient(ellipse 65% 55% at 50% 50%,#060e32 0%,#010208 100%)'}}>
      <div style={{position:'relative',width:90,height:90}}>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'1px solid rgba(212,168,75,0.12)',borderTopColor:U.accent,animation:'vSpin 1.3s linear infinite'}}/>
        <div style={{position:'absolute',inset:13,borderRadius:'50%',border:'1px solid rgba(0,217,245,0.08)',borderRightColor:'#00d9f5',animation:'vSpin 0.85s linear infinite reverse'}}/>
        <div style={{position:'absolute',inset:26,borderRadius:'50%',border:'1px solid rgba(168,85,247,0.10)',borderBottomColor:'#a855f7',animation:'vSpin 1.7s linear infinite'}}/>
        <div style={{position:'absolute',inset:'50%',width:12,height:12,marginLeft:-6,marginTop:-6,borderRadius:'50%',background:`radial-gradient(circle,${U.accentBright},${U.accent})`,boxShadow:`0 0 24px ${U.accent},0 0 48px ${U.accent}55`,animation:'vPulse 1.4s ease-in-out infinite'}}/>
      </div>
      <div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:7}}>
        <span style={{color:U.accent,fontSize:11,fontWeight:700,letterSpacing:'0.24em',fontFamily:F.b,animation:'vFade 1.7s ease-in-out infinite'}}>INITIALISATION DU NOYAU</span>
        <span style={{color:U.mutedLo,fontSize:9,letterSpacing:'0.16em',fontFamily:F.b}}>ADS · SQUARE</span>
      </div>
    </div>
  );
}

function LiveDot({ isLive }) {
  if (!isLive) return null;
  return (
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'rgba(0,232,162,0.08)',border:'1px solid rgba(0,232,162,0.20)'}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:U.ok,boxShadow:`0 0 8px ${U.ok}`,animation:'vPulse 2s ease-in-out infinite'}}/>
      <span style={{color:U.ok,fontSize:8,fontWeight:700,letterSpacing:'0.10em',fontFamily:F.b}}>LIVE</span>
    </div>
  );
}

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

const orbitLabel = {
  epicenter: 'NOYAU',
  prestige:  'ORBITE 1',
  elite:     'ORBITE 2',
  business:  'ORBITE 3',
  standard:  'ORBITE 4',
  viral:     'PÉRIPHÉRIE',
};

const TierLegend = memo(function TierLegend({ level, slots, isLive }) {
  const tiers = LEVELS[level]?.tiers || TIER_ORDER;
  const counts = {};
  for (const t of tiers) counts[t] = {total:0,occ:0};
  slots.filter(s=>tiers.includes(s.tier)).forEach(s=>{ if(counts[s.tier]){counts[s.tier].total++;if(s.occ)counts[s.tier].occ++;}});

  return (
    <div style={{position:'absolute',top:16,right:16,zIndex:30,display:'flex',flexDirection:'column',gap:2}}>
      <div style={{display:'flex',alignItems:'center',gap:7,justifyContent:'flex-end',padding:'5px 12px',borderRadius:30,marginBottom:5,background:'rgba(4,6,22,0.86)',backdropFilter:'blur(16px)',border:`1px solid ${U.accent}28`,boxShadow:`0 0 22px ${U.accent}12`}}>
        <span style={{color:U.accent,fontSize:14}}>{LEVELS[level]?.icon}</span>
        <span style={{color:U.accentBright,fontSize:10,fontWeight:800,letterSpacing:'0.09em',fontFamily:F.h}}>{LEVELS[level]?.name?.toUpperCase()}</span>
        <LiveDot isLive={isLive}/>
      </div>

      {TIER_ORDER.filter(t=>TIER_COLOR[t]&&tiers.includes(t)).map(tier=>{
        const cnt = counts[tier]||{total:0,occ:0};
        const color = TIER_COLOR[tier];
        const isNucleus = tier === 'epicenter';
        return (
          <div key={tier} style={{
            display:'flex',alignItems:'center',gap:7,padding:isNucleus?'7px 12px':'5px 12px',
            borderRadius:30,
            background: isNucleus
              ? `radial-gradient(ellipse at left,${color}18,rgba(4,6,22,0.92))`
              : 'rgba(4,6,22,0.80)',
            backdropFilter:'blur(12px)',
            border:`1px solid ${color}${isNucleus?'30':'14'}`,
            boxShadow: isNucleus ? `0 0 18px ${color}22` : 'none',
          }}>
            {isNucleus
              ? <div style={{width:9,height:9,borderRadius:'50%',flexShrink:0,background:`radial-gradient(circle,${U.accentBright},${color})`,boxShadow:`0 0 12px ${color},0 0 24px ${color}88`,animation:'vPulse 2s ease-in-out infinite'}}/>
              : <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:color,boxShadow:`0 0 9px ${color},0 0 18px ${color}55`}}/>
            }
            <div style={{flex:1,minWidth:0}}>
              <span style={{color:isNucleus?U.accentBright:'rgba(180,195,255,0.50)',fontSize:isNucleus?10:9,fontWeight:isNucleus?800:600,letterSpacing:'0.07em',fontFamily:F.b,display:'block'}}>
                {TIER_LABEL[tier]}
              </span>
              <span style={{color:isNucleus?`${color}99`:U.mutedLo,fontSize:7,fontFamily:F.m,letterSpacing:'0.04em'}}>
                {orbitLabel[tier]}
              </span>
            </div>
            {cnt.total>0&&<span style={{color:U.mutedLo,fontSize:8,fontFamily:F.m}}>{cnt.occ}/{cnt.total}</span>}
            <span style={{color:isNucleus?U.accentBright:color,fontSize:isNucleus?10:9,fontWeight:800,fontFamily:F.m,textShadow:`0 0 12px ${color}88`}}>
              €{priceEur(tier)}/j
            </span>
          </div>
        );
      })}
    </div>
  );
});

const LevelDots = memo(function LevelDots({ level, onLevel }) {
  return (
    <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:3,zIndex:30,padding:'6px 10px',borderRadius:50,background:'rgba(4,6,22,0.86)',backdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 10px 48px rgba(0,0,0,0.75)'}}>
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

function ZoomHint() {
  const [vis,setVis]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setVis(false),5500);return()=>clearTimeout(t);},[]);
  if(!vis)return null;
  return (
    <div style={{position:'absolute',bottom:72,left:'50%',transform:'translateX(-50%)',padding:'5px 20px',borderRadius:40,background:'rgba(4,6,22,0.74)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.06)',color:'rgba(180,195,255,0.33)',fontSize:10,letterSpacing:'0.06em',fontFamily:F.b,zIndex:20,pointerEvents:'none',whiteSpace:'nowrap'}}>
      ↕ zoom · ⟳ tourner · ✦ cliquer · ◎ noyau au centre
    </div>
  );
}

// Indicateur de statut du noyau
function NucleusIndicator({ slots }) {
  const epic = slots.find(s => s.tier === 'epicenter');
  const color = TIER_COLOR.epicenter;
  const isOcc = epic?.occ;
  return (
    <div style={{position:'absolute',bottom:80,left:16,zIndex:30,display:'flex',alignItems:'center',gap:9,padding:'7px 14px',borderRadius:20,background:'rgba(4,6,22,0.88)',backdropFilter:'blur(16px)',border:`1px solid ${color}${isOcc?'40':'18'}`,boxShadow:isOcc?`0 0 24px ${color}28`:'none',transition:'all 0.4s ease'}}>
      <div style={{width:10,height:10,borderRadius:'50%',background:`radial-gradient(circle,${U.accentBright},${color})`,boxShadow:`0 0 14px ${color},0 0 28px ${color}66`,animation:'vPulse 2s ease-in-out infinite',flexShrink:0}}/>
      <div>
        <div style={{color:U.accentBright,fontSize:9,fontWeight:800,letterSpacing:'0.12em',fontFamily:F.b}}>NOYAU ÉPICENTRE</div>
        <div style={{color:isOcc?color:U.mutedLo,fontSize:8,fontFamily:F.m,marginTop:1}}>
          {isOcc ? `${epic?.tenant?.name || 'Occupé'} · €1 000/j` : 'Disponible · €1 000/j'}
        </div>
      </div>
      {isOcc && <div style={{width:6,height:6,borderRadius:'50%',background:U.ok,boxShadow:`0 0 8px ${U.ok}`,animation:'vPulse 1.5s ease-in-out infinite',flexShrink:0}}/>}
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

function HUDCorners() {
  const s = `${U.accent}22`;
  const corner = (pos, bdr) => <div key={JSON.stringify(pos)} style={{position:'absolute',width:22,height:22,pointerEvents:'none',...pos,...bdr}}/>;
  return <>
    {corner({top:14,left:14},  {borderTop:`1.5px solid ${s}`,borderLeft:`1.5px solid ${s}`,borderRadius:'4px 0 0 0'})}
    {corner({top:14,right:14}, {borderTop:`1.5px solid ${s}`,borderRight:`1.5px solid ${s}`,borderRadius:'0 4px 0 0'})}
    {corner({bottom:14,left:14},  {borderBottom:`1.5px solid ${s}`,borderLeft:`1.5px solid ${s}`,borderRadius:'0 0 0 4px'})}
    {corner({bottom:14,right:14}, {borderBottom:`1.5px solid ${s}`,borderRight:`1.5px solid ${s}`,borderRadius:'0 0 4px 0'})}
  </>;
}

// ── BlockOverlay3D ────────────────────────────────────────────────────────────
function BlockOverlay3D({ slot, onClose, onRent, onBuyout }) {
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),12); return()=>clearTimeout(t); },[]);
  if (!slot) return null;

  const color   = (slot.occ && slot.tenant?.c) ? slot.tenant.c : (TIER_COLOR[slot.tier]||U.accent);
  const label   = TIER_LABEL[slot.tier]||slot.tier;
  const price   = priceEur(slot.tier);
  const isNucleus = slot.tier === 'epicenter';
  const isTop   = slot.tier==='epicenter'||slot.tier==='prestige';
  const tenant  = slot.tenant;

  const orbitInfoMap = {
    epicenter: { title:'Le Noyau — Position Suprême', sub:'#1 mondial · Pièce maîtresse d\'ADS·SQUARE', icon:'✦', badge:'NOYAU' },
    prestige:  { title:'Orbite Prestige', sub:'Rang 1 · Proximité maximale du noyau', icon:'◈', badge:'ORBITE 1' },
    elite:     { title:'Orbite Élite',    sub:'Rang 2 · Haute visibilité orbitale', icon:'⬡', badge:'ORBITE 2' },
    business:  { title:'Orbite Business', sub:'Rang 3 · Large exposition', icon:'◎', badge:'ORBITE 3' },
    standard:  { title:'Orbite Standard', sub:'Rang 4 · Large couverture', icon:'◉', badge:'ORBITE 4' },
    viral:     { title:'Zone Virale',     sub:'Périphérie · Portée maximale', icon:'✧', badge:'PÉRIPH.' },
  };
  const oi = orbitInfoMap[slot.tier] || { title:label, sub:'', icon:'○', badge:'NŒUD' };

  const handleRent = () => {
    if (slot.occ && tenant?.bookingId) recordClick({slotX:slot.x, slotY:slot.y, bookingId:tenant.bookingId, event:'view'});
    onRent(slot);
  };
  const handleCTA = () => {
    if (tenant?.url) { recordClick({slotX:slot.x, slotY:slot.y, bookingId:tenant.bookingId, event:'click'}); window.open(tenant.url,'_blank','noopener'); }
  };

  return (
    <div style={{position:'absolute',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:20,pointerEvents:'none'}}>
      <div style={{
        pointerEvents:'all',
        maxWidth:340,width:'100%',maxHeight:'90vh',overflowY:'auto',
        borderRadius:24,
        background:`radial-gradient(ellipse at top left,${color}0e 0%,rgba(4,6,22,0.96) 55%)`,
        backdropFilter:'blur(32px)',
        border:`1.5px solid ${color}${isNucleus?'40':'22'}`,
        boxShadow:`0 0 ${isNucleus?'80px':'40px'} ${color}${isNucleus?'28':'14'},0 0 0 1px rgba(255,255,255,0.03),0 40px 80px rgba(0,0,0,0.8)`,
        padding:26,
        transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(16px)',
        opacity: mounted ? 1 : 0,
        transition:'transform 0.35s cubic-bezier(.34,1.56,.64,1),opacity 0.28s ease',
      }}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,gap:12}}>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8,flexWrap:'wrap'}}>
              <div style={{padding:'3px 10px',borderRadius:20,background:isNucleus?`linear-gradient(135deg,${color}35,${color}18)`:`${color}16`,border:`1px solid ${color}${isNucleus?'40':'25'}`,display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:9}}>{oi.icon}</span>
                <span style={{color:isNucleus?U.accentBright:color,fontSize:8,fontWeight:800,letterSpacing:'0.12em',fontFamily:F.b}}>{oi.badge}</span>
              </div>
              <span style={{color:color,fontSize:11,fontWeight:800,fontFamily:F.b,letterSpacing:'0.06em'}}>{label}</span>
            </div>
            <div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b}}>{oi.sub}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
            {slot.x!==undefined&&<span style={{color:U.mutedLo,fontSize:8,fontFamily:F.m}}>({slot.x},{slot.y})</span>}
            <button onClick={onClose} style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.10)',color:'rgba(255,255,255,0.38)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.10)';e.currentTarget.style.color='rgba(255,255,255,0.80)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(255,255,255,0.38)';}}>×</button>
          </div>
        </div>

        {slot.occ && tenant ? (
          <>
            {tenant.img && (
              <div style={{width:'100%',height:120,borderRadius:16,marginBottom:16,overflow:'hidden',background:`${color}10`,border:`1px solid ${color}20`}}>
                <img src={tenant.img} alt={tenant.name} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={e=>{e.currentTarget.style.display='none';}}/>
              </div>
            )}
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
              <div style={{width:54,height:54,flexShrink:0,borderRadius:16,background:`radial-gradient(circle at 35% 35%,${color}2e,${color}0a)`,border:`1.5px solid ${color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color,fontFamily:F.h,boxShadow:`0 0 28px ${color}28,0 0 0 4px ${color}0a`}}>
                {tenant.l || tenant.name?.charAt(0)?.toUpperCase() || '✦'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:U.text,fontSize:16,fontWeight:800,fontFamily:F.h,letterSpacing:'-0.01em',lineHeight:1.2,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tenant.name}</div>
                {tenant.slogan && <div style={{color:U.muted,fontSize:10,fontFamily:F.b,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{tenant.slogan}</div>}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:18}}>
              <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:U.ok,boxShadow:`0 0 8px ${U.ok}`,flexShrink:0}}/>
              <span style={{color:U.muted,fontSize:11,fontFamily:F.b}}>{tenant.cta || 'Espace publicitaire actif'}</span>
              {tenant.badge && <span style={{marginLeft:'auto',padding:'2px 8px',borderRadius:20,background:`${color}18`,border:`1px solid ${color}30`,color,fontSize:8,fontWeight:800,fontFamily:F.b,letterSpacing:'0.08em'}}>{tenant.badge}</span>}
            </div>
            <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)',marginBottom:18}}/>
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <div style={{color:U.mutedLo,fontSize:9,fontWeight:600,letterSpacing:'0.12em',fontFamily:F.b,marginBottom:4}}>TARIF / JOUR</div>
                <div style={{display:'flex',alignItems:'baseline',gap:3}}>
                  <span style={{color,fontSize:32,fontWeight:900,fontFamily:F.h,letterSpacing:'-0.02em',textShadow:`0 0 40px ${color}66`}}>€{price}</span>
                  <span style={{color:U.mutedLo,fontSize:12,fontFamily:F.b,marginBottom:2}}>/j</span>
                </div>
              </div>
              {isNucleus && <div style={{padding:'8px 14px',borderRadius:14,background:`${color}18`,border:`1px solid ${color}35`,textAlign:'center',boxShadow:`0 0 24px ${color}18`}}><div style={{color:U.accentBright,fontSize:9,fontWeight:800,letterSpacing:'0.12em',fontFamily:F.b}}>✦ NOYAU</div><div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,marginTop:2}}>#1 MONDIAL</div></div>}
              {!isNucleus&&isTop&&<div style={{padding:'7px 12px',borderRadius:12,background:`${color}12`,border:`1px solid ${color}28`,textAlign:'center'}}><div style={{color,fontSize:9,fontWeight:800,letterSpacing:'0.10em',fontFamily:F.b}}>◈ PREMIUM</div><div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,marginTop:2}}>Top tier</div></div>}
            </div>
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
          <>
            {isNucleus ? (
              <div style={{textAlign:'center',padding:'16px 0',marginBottom:8}}>
                <div style={{width:72,height:72,borderRadius:'50%',margin:'0 auto 16px',background:`radial-gradient(circle,${color}28,${color}08)`,border:`2px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 40px ${color}28`,animation:'vPulse 2s ease-in-out infinite'}}>
                  <span style={{fontSize:28,color:U.accentBright}}>✦</span>
                </div>
                <div style={{color:U.text,fontSize:18,fontWeight:900,fontFamily:F.h,marginBottom:6,letterSpacing:'-0.02em'}}>{oi.title}</div>
                <div style={{color:U.muted,fontSize:11,fontFamily:F.b,lineHeight:1.55}}>
                  L'emplacement #1 mondial d'ADS·SQUARE.<br/>Visibilité absolue, au cœur de toutes les orbites.
                </div>
              </div>
            ) : (
              <>
                <div style={{width:66,height:66,borderRadius:20,marginBottom:18,background:'rgba(255,255,255,0.025)',border:`1.5px solid ${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color:`${color}66`,fontFamily:F.h}}>○</div>
                <div style={{color:U.text,fontSize:18,fontWeight:800,fontFamily:F.h,marginBottom:6,letterSpacing:'-0.01em'}}>Emplacement {label}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,color:U.muted,fontSize:11,fontFamily:F.b,marginBottom:20}}>
                  <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:color,boxShadow:`0 0 8px ${color}`,flexShrink:0}}/>
                  Disponible · {orbitLabel[slot.tier]}
                </div>
              </>
            )}
            <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)',marginBottom:20}}/>
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:22}}>
              <div>
                <div style={{color:U.mutedLo,fontSize:9,fontWeight:600,letterSpacing:'0.12em',fontFamily:F.b,marginBottom:4}}>TARIF / JOUR</div>
                <div style={{display:'flex',alignItems:'baseline',gap:3}}>
                  <span style={{color,fontSize:32,fontWeight:900,fontFamily:F.h,letterSpacing:'-0.02em',textShadow:`0 0 40px ${color}66`}}>€{price}</span>
                  <span style={{color:U.mutedLo,fontSize:12,fontFamily:F.b,marginBottom:2}}>/j</span>
                </div>
              </div>
              {isNucleus && <div style={{padding:'8px 14px',borderRadius:14,background:`${color}14`,border:`1px solid ${color}30`,textAlign:'center'}}><div style={{color:U.accentBright,fontSize:9,fontWeight:800,letterSpacing:'0.12em',fontFamily:F.b}}>✦ NOYAU</div><div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,marginTop:2}}>#1 MONDIAL</div></div>}
            </div>
            <button onClick={handleRent} style={{width:'100%',padding:'15px 0',borderRadius:14,background:isNucleus?`linear-gradient(135deg,${U.accentBright},${color})`:`linear-gradient(135deg,${color},${color}cc)`,border:'none',color:'#050408',fontSize:isNucleus?14:13,fontWeight:900,fontFamily:F.b,cursor:'pointer',letterSpacing:'0.06em',boxShadow:isNucleus?`0 0 50px ${color}77,0 14px 40px rgba(0,0,0,0.6)`:`0 0 36px ${color}55,0 10px 28px rgba(0,0,0,0.5)`,transition:'all 0.2s ease'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';}}>
              {isNucleus ? '✦ Acquérir le Noyau →' : 'Réserver ce nœud →'}
            </button>
          </>
        )}

        <div style={{marginTop:12,textAlign:'center',color:U.mutedLo,fontSize:9,fontFamily:F.b,letterSpacing:'0.04em'}}>Paiement sécurisé · Résiliation à tout moment</div>
      </div>
    </div>
  );
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

  const allSlots = useView3DSlots(parentSlots);
  const isLive   = parentIsLive || (allSlots !== parentSlots);
  const sortedSlots = useMemo(() => sortSlotsByTier(allSlots), [allSlots]);

  const nodeData = useMemo(() => {
    if (level === 0) return [];
    const tiers = new Set(LEVELS[level]?.tiers || []);
    const filtered = sortedSlots.filter(s => tiers.has(s.tier) && !s.isGhost);
    return orbitalShellLayout(filtered);
  }, [level, sortedSlots]);

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

  useEffect(() => {
    if (!sceneRef.current || level === 0) return;
    sceneRef.current.setNodes(nodeData, true);
  }, [nodeData, level]);

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

  useEffect(() => {
    const fn = e => { e.preventDefault(); sceneRef.current?.zoom(e.deltaY); };
    const canvas = canvasRef.current;
    if (canvas) canvas.addEventListener('wheel', fn, {passive:false});
    return () => { if (canvas) canvas.removeEventListener('wheel', fn); };
  }, [level]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(() => sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  const handleLevel = useCallback(n => { setFocusSlot(null); setLevel(n); }, []);

  if (level === 0) return (
    <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      <CosmosButton onClick={()=>handleLevel(1)}/>
      {ExistingPublicView && <ExistingPublicView slots={allSlots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
    </div>
  );

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

      <BackButton onClick={()=>handleLevel(0)}/>

      {!loading && (
        <div style={{position:'absolute',top:56,left:16,zIndex:30}}>
          <StatsBar slots={allSlots} level={level}/>
        </div>
      )}

      <TierLegend level={level} slots={allSlots} isLive={isLive}/>
      <LevelDots level={level} onLevel={handleLevel}/>
      {!loading && <NucleusIndicator slots={allSlots}/>}
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