'use client';
// app/cinema/page.js — CINEMA BLOCK STUDIO
// Vue cinéma immersive 3D pour la Sphère de Dyson
// Encodage vidéo HDR 4K via WebCodecs / MediaRecorder

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { getSupabaseClient } from '@/lib/supabase';
import { TIER_COLOR, TIER_LABEL } from '@/lib/grid';
import { CATEGORIES } from '@/lib/block-categories';

// ═══════════════════════════════════════════════════════
//  CONSTANTES DESIGN
// ═══════════════════════════════════════════════════════

const G  = '#f0b429';   // Gold
const BG = '#05060f';   // Background profond

const RANK_META = {
  elu:        { label: "L'Élu",        icon: '☀️', color: '#f0b429', tier: 'epicenter' },
  architecte: { label: "L'Architecte", icon: '🔵', color: '#ff4d8f', tier: 'prestige'  },
  gardien:    { label: "Le Gardien",   icon: '🟣', color: '#a855f7', tier: 'elite'     },
  batisseur:  { label: "Le Bâtisseur", icon: '🟡', color: '#00d9f5', tier: 'business'  },
  signal:     { label: "Le Signal",    icon: '⚪', color: '#00e8a2', tier: 'viral'     },
};

const ENVS = {
  void_studio: { bg: '#000000', fog: '#000005', den: 0.055, stars: false, name: 'VOID STUDIO'   },
  dark_studio: { bg: '#00000a', fog: '#00000f', den: 0.040, stars: true,  name: 'DARK STUDIO'   },
  neon_city:   { bg: '#01020e', fog: '#050118', den: 0.028, stars: true,  name: 'NEON CITY'     },
  cosmos:      { bg: '#000005', fog: '#000009', den: 0.006, stars: true,  name: 'COSMOS'        },
  luxe_or:     { bg: '#060400', fog: '#0d0900', den: 0.050, stars: false, name: 'LUXE ORÉ'      },
  arctique:    { bg: '#020a10', fog: '#030f1a', den: 0.032, stars: true,  name: 'ARCTIQUE'      },
  matrix:      { bg: '#000c00', fog: '#001500', den: 0.045, stars: false, name: 'MATRIX'        },
  inferno:     { bg: '#0c0000', fog: '#180000', den: 0.048, stars: false, name: 'INFERNO'       },
};

const CAM_PRESETS = [
  { id: 'face',    label: 'FACE',    h: 0,    v: 0,   z: 7.5, fov: 38 },
  { id: 'trois4',  label: '3/4',     h: 38,   v: 18,  z: 8,   fov: 36 },
  { id: 'cinema',  label: 'CINÉMA',  h: -24,  v: 16,  z: 9,   fov: 28 },
  { id: 'plongee', label: 'PLONGÉE', h: 8,    v: 55,  z: 8.5, fov: 40 },
  { id: 'macro',   label: 'MACRO',   h: 4,    v: 6,   z: 3.5, fov: 24 },
  { id: 'pano',    label: 'PANO',    h: 20,   v: 12,  z: 17,  fov: 58 },
  { id: 'low',     label: 'LOW',     h: -12,  v: -22, z: 8,   fov: 36 },
  { id: 'orbit',   label: 'ORBIT',   h: 135,  v: 28,  z: 9,   fov: 38 },
  { id: 'worm',    label: 'WORM',    h: 0,    v: -45, z: 7,   fov: 45 },
  { id: 'dutch',   label: 'DUTCH',   h: 25,   v: 8,   z: 8,   fov: 35 },
];

const VIDEO_FORMATS = [
  { id: 'webm_vp9',  label: 'WebM VP9 — HDR 10-bit', mime: 'video/webm;codecs=vp9', ext: 'webm', hdr: true  },
  { id: 'webm_vp8',  label: 'WebM VP8 — HD Standard', mime: 'video/webm;codecs=vp8', ext: 'webm', hdr: false },
  { id: 'webm_h264', label: 'MP4 H.264 — Compatible',  mime: 'video/mp4',             ext: 'mp4',  hdr: false },
];

const VIDEO_RES = [
  { id: '4k',   label: '4K UHD',  w: 3840, h: 2160, fps: 30, mbps: 80  },
  { id: '2k',   label: '2K QHD',  w: 2560, h: 1440, fps: 60, mbps: 40  },
  { id: '1080', label: '1080p',   w: 1920, h: 1080, fps: 60, mbps: 16  },
  { id: '720',  label: '720p',    w: 1280, h: 720,  fps: 60, mbps: 8   },
];

const ANIM_MODES = [
  { id: 'static',  label: 'STATIQUE',      icon: '◉' },
  { id: 'rotate',  label: 'ROTATION',      icon: '↻' },
  { id: 'float',   label: 'FLOTTEMENT',    icon: '~' },
  { id: 'flyby',   label: 'FLY-BY',        icon: '→' },
  { id: 'reveal',  label: 'RÉVÉLATION',    icon: '✦' },
  { id: 'keyframes', label: 'KEYFRAMES',   icon: '◆' },
];

const LUTS = [
  { id: 'none',     label: 'AUCUN',         filter: 'none' },
  { id: 'cinema',   label: 'CINÉMA',        filter: 'contrast(1.12) saturate(0.85) sepia(0.08)' },
  { id: 'neon',     label: 'NEON',          filter: 'saturate(1.6) hue-rotate(10deg) contrast(1.1)' },
  { id: 'teal_ora', label: 'TEAL & ORANGE', filter: 'saturate(1.3) hue-rotate(-8deg) contrast(1.15)' },
  { id: 'bw',       label: 'NOIR & BLANC',  filter: 'grayscale(1) contrast(1.2)' },
  { id: 'vintage',  label: 'VINTAGE',       filter: 'sepia(0.35) saturate(1.1) contrast(0.9) brightness(0.95)' },
  { id: 'cold',     label: 'FROID',         filter: 'hue-rotate(20deg) saturate(1.2) contrast(1.05)' },
  { id: 'warm',     label: 'CHAUD',         filter: 'hue-rotate(-12deg) saturate(1.3) brightness(1.05)' },
];

const COMP_GUIDES = [
  { id: 'none',   label: 'AUCUN'           },
  { id: 'thirds', label: 'RÈGLE DES TIERS' },
  { id: 'golden', label: 'NOMBRE D\'OR'    },
  { id: 'center', label: 'CENTRE'          },
];

// ═══════════════════════════════════════════════════════
//  THREE.JS HELPERS
// ═══════════════════════════════════════════════════════

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function buildBlockTexture(cfg) {
  const { title, slogan, pColor, bgColor, tier, rank, bW, bH, texQ } = cfg;
  const RES = texQ || 2048;
  const H   = Math.round(RES * (bH / bW));
  const cv  = document.createElement('canvas');
  cv.width  = RES; cv.height = H;
  const ctx = cv.getContext('2d');

  // — BG
  const lbg = ctx.createLinearGradient(0, 0, RES, H);
  lbg.addColorStop(0, bgColor);
  lbg.addColorStop(1, shiftColor(bgColor, -20));
  ctx.fillStyle = lbg;
  ctx.fillRect(0, 0, RES, H);

  // — Grid lines subtle
  ctx.strokeStyle = pColor + '18';
  ctx.lineWidth = 1;
  for (let x = 0; x < RES; x += RES / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H;   y += H / 6)   { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(RES, y); ctx.stroke(); }

  // — Vignette inner
  const vig = ctx.createRadialGradient(RES/2, H*0.45, 0, RES/2, H/2, RES*0.75);
  vig.addColorStop(0, 'rgba(255,255,255,0.04)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, RES, H);

  // — Border neon
  const PAD = 24;
  ctx.save();
  ctx.shadowBlur = 60; ctx.shadowColor = pColor;
  ctx.strokeStyle = pColor; ctx.lineWidth = 4;
  // rounded rect stroke
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(PAD+r, PAD);
  ctx.lineTo(RES-PAD-r, PAD);
  ctx.quadraticCurveTo(RES-PAD, PAD, RES-PAD, PAD+r);
  ctx.lineTo(RES-PAD, H-PAD-r);
  ctx.quadraticCurveTo(RES-PAD, H-PAD, RES-PAD-r, H-PAD);
  ctx.lineTo(PAD+r, H-PAD);
  ctx.quadraticCurveTo(PAD, H-PAD, PAD, H-PAD-r);
  ctx.lineTo(PAD, PAD+r);
  ctx.quadraticCurveTo(PAD, PAD, PAD+r, PAD);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // — Corner brackets
  const BL = 60, BT = 5;
  ctx.strokeStyle = pColor; ctx.lineWidth = BT;
  [[PAD, PAD, 1, 1], [RES-PAD, PAD, -1, 1], [RES-PAD, H-PAD, -1, -1], [PAD, H-PAD, 1, -1]]
    .forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx+dx*BL, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy+dy*BL);
      ctx.stroke();
    });

  // — Rank badge (if rank)
  if (rank && RANK_META[rank]) {
    const rm = RANK_META[rank];
    ctx.fillStyle = rm.color + '30';
    ctx.fillRect(PAD, PAD, 200, 50);
    ctx.fillStyle = rm.color;
    ctx.font = `bold 24px 'Courier New', monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${rm.icon} ${rm.label.toUpperCase()}`, PAD+12, PAD+25);
  }

  // — Tier badge top-right
  if (tier && TIER_COLOR[tier]) {
    const tc = TIER_COLOR[tier];
    ctx.fillStyle = tc + '28';
    ctx.fillRect(RES-PAD-180, PAD, 180, 50);
    ctx.fillStyle = tc;
    ctx.font = `bold 22px 'Courier New', monospace`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(`◈ ${(TIER_LABEL[tier] || tier).toUpperCase()}`, RES-PAD-10, PAD+25);
  }

  // — Main title
  ctx.save();
  ctx.shadowBlur = 50; ctx.shadowColor = pColor;
  ctx.fillStyle = '#ffffff';
  let fs = Math.round(RES * 0.13);
  ctx.font = `900 ${fs}px 'Arial Black', 'Impact', sans-serif`;
  while (ctx.measureText(title.toUpperCase()).width > RES*0.84 && fs > 24) {
    fs -= 3; ctx.font = `900 ${fs}px 'Arial Black', 'Impact', sans-serif`;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(title.toUpperCase(), RES/2, H*0.44);
  ctx.restore();

  // — Divider
  const lY = H * 0.6;
  const grd = ctx.createLinearGradient(PAD*4, lY, RES-PAD*4, lY);
  grd.addColorStop(0, 'transparent');
  grd.addColorStop(0.25, pColor+'88');
  grd.addColorStop(0.75, pColor+'88');
  grd.addColorStop(1, 'transparent');
  ctx.strokeStyle = grd; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD*4, lY); ctx.lineTo(RES-PAD*4, lY); ctx.stroke();

  // — Slogan
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `${Math.round(RES*0.038)}px 'Arial', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(slogan, RES/2, H*0.71);

  // — Scan line subtle
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y2 = 0; y2 < H; y2 += 4) ctx.fillRect(0, y2, RES, 2);

  // — Bottom band
  const barH = H * 0.11;
  const bg2 = ctx.createLinearGradient(0, H-barH, 0, H);
  bg2.addColorStop(0, 'rgba(0,0,0,0)');
  bg2.addColorStop(1, pColor+'44');
  ctx.fillStyle = bg2; ctx.fillRect(0, H-barH, RES, barH);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `bold ${Math.round(barH*0.34)}px 'Courier New', monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('◈ ADS SQUARE · SPHÈRE DE DYSON', RES/2, H-barH/2);

  return new THREE.CanvasTexture(cv);
}

function shiftColor(hex, shift) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + shift));
  const g = Math.max(0, Math.min(255, ((n >>  8) & 0xff) + shift));
  const b = Math.max(0, Math.min(255, ((n)       & 0xff) + shift));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function buildBlock3D(cfg) {
  const { bW, bH, bD, bR, pColor, bgColor, glowI } = cfg;
  const group = new THREE.Group();

  // — Halo glow
  const haloShape = roundedRectShape(bW+0.06, bH+0.06, bR+0.03);
  const haloMesh  = new THREE.Mesh(
    new THREE.ExtrudeGeometry(haloShape, { depth: 0.01, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: pColor, emissive: pColor, emissiveIntensity: glowI * 2.2, transparent: true, opacity: 0.7 })
  );
  haloMesh.position.z = -bD/2 - 0.02;
  group.add(haloMesh);

  // — Body
  const bodyShape = roundedRectShape(bW, bH, bR);
  const bodyMesh  = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bodyShape, { depth: bD, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: bgColor, metalness: 0.72, roughness: 0.28, emissive: pColor, emissiveIntensity: 0.04 })
  );
  bodyMesh.castShadow = true;
  bodyMesh.position.z = -bD/2;
  group.add(bodyMesh);

  // — Front face
  const tex   = buildBlockTexture(cfg);
  const face  = new THREE.Mesh(
    new THREE.PlaneGeometry(bW, bH),
    new THREE.MeshStandardMaterial({ map: tex, metalness: 0.1, roughness: 0.5, emissiveMap: tex, emissive: new THREE.Color(pColor), emissiveIntensity: 0.045 })
  );
  face.position.z = bD/2 + 0.001;
  group.add(face);

  // — Edge glow strips
  const eC = new THREE.Color(pColor);
  [
    { w: bW, h: 0.009, x: 0,       y: bH/2  },
    { w: bW, h: 0.009, x: 0,       y: -bH/2 },
    { w: 0.009, h: bH, x: -bW/2,   y: 0     },
    { w: 0.009, h: bH, x: bW/2,    y: 0     },
  ].forEach(({ w, h, x, y }) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: eC, emissive: eC, emissiveIntensity: glowI * 3, transparent: true, opacity: 0.92 })
    );
    m.position.set(x, y, bD/2+0.002);
    group.add(m);
  });

  return group;
}

function buildReflectivePlane() {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: '#000014', metalness: 0.9, roughness: 0.88, transparent: true, opacity: 0.82 })
  );
}

function buildStarField(n = 700) {
  const geo  = new THREE.BufferGeometry();
  const pos  = new Float32Array(n*3);
  const col  = new Float32Array(n*3);
  const size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = 20 + Math.random()*14, phi = Math.random()*Math.PI*2, th = Math.random()*Math.PI;
    pos[i*3]   = r*Math.sin(th)*Math.cos(phi);
    pos[i*3+1] = r*Math.sin(th)*Math.sin(phi);
    pos[i*3+2] = r*Math.cos(th);
    const b = 0.3 + Math.random()*0.7;
    col[i*3]=b; col[i*3+1]=b; col[i*3+2]=b;
    size[i] = Math.random()*0.07+0.015;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.85 }));
}

function buildParticles(pColor, n = 120) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n*3);
  const vel = [];
  for (let i = 0; i < n; i++) {
    pos[i*3]   = (Math.random()-0.5)*12;
    pos[i*3+1] = (Math.random()-0.5)*8;
    pos[i*3+2] = (Math.random()-0.5)*6;
    vel.push({ x: (Math.random()-0.5)*0.006, y: Math.random()*0.004+0.001, z: (Math.random()-0.5)*0.003 });
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: pColor, size: 0.04, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat);
  pts.userData.vel = vel;
  return pts;
}

function tickParticles(pts) {
  if (!pts) return;
  const pos = pts.geometry.attributes.position;
  const vel = pts.userData.vel;
  for (let i = 0; i < vel.length; i++) {
    pos.array[i*3]   += vel[i].x;
    pos.array[i*3+1] += vel[i].y;
    pos.array[i*3+2] += vel[i].z;
    if (pos.array[i*3+1] > 5)  pos.array[i*3+1] = -4;
    if (Math.abs(pos.array[i*3])   > 7) vel[i].x *= -1;
    if (Math.abs(pos.array[i*3+2]) > 4) vel[i].z *= -1;
  }
  pos.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════
//  COMPOSANTS UI RÉUTILISABLES
// ═══════════════════════════════════════════════════════

function Slider({ label, value, min, max, step = 0.01, unit = '', fmt, onChange, accent = G }) {
  const display = fmt ? fmt(value) : (step < 1 ? value.toFixed(2) : Math.round(value));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:9, color:'#4a4f70', letterSpacing:1, fontFamily:'monospace' }}>{label}</span>
        <span style={{ fontSize:9, color:accent, fontFamily:'monospace' }}>{display}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:accent, cursor:'pointer', height:3, outline:'none', background:'transparent' }} />
    </div>
  );
}

function ColorPick({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:11 }}>
      <span style={{ fontSize:9, color:'#4a4f70', letterSpacing:1, fontFamily:'monospace' }}>{label}</span>
      <div style={{ display:'flex', gap:7, alignItems:'center' }}>
        <span style={{ fontSize:9, color:'#2e3355', fontFamily:'monospace' }}>{value}</span>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width:28, height:20, border:'1px solid #141826', borderRadius:3, cursor:'pointer', padding:1, background:'none' }} />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, accent = G }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <span style={{ fontSize:9, color:'#4a4f70', letterSpacing:1, fontFamily:'monospace' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        background: value ? accent+'22' : 'transparent',
        border:`1px solid ${value ? accent : '#1c2035'}`,
        color: value ? accent : '#333855',
        fontSize:8, padding:'3px 11px', cursor:'pointer',
        fontFamily:'monospace', borderRadius:2, letterSpacing:1,
      }}>{value ? 'ON' : 'OFF'}</button>
    </div>
  );
}

function Sec({ title, children, accent = '#2a3060' }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:8, color:accent, letterSpacing:2.5, marginBottom:10, paddingBottom:6, borderBottom:'1px solid #0a0c18', fontFamily:'monospace' }}>{title}</div>
      {children}
    </div>
  );
}

function Pills({ options, value, onChange, small }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
      {options.map(o => {
        const id = typeof o === 'string' ? o : o.id;
        const label = typeof o === 'string' ? o : (o.label || o.name || id);
        const sel = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            background: sel ? G+'22' : 'transparent',
            border:`1px solid ${sel ? G : '#1c2035'}`,
            color: sel ? G : '#2e3355',
            fontSize: small ? 7 : 8, padding: small ? '2px 6px' : '3px 8px',
            cursor:'pointer', fontFamily:'monospace', borderRadius:2, letterSpacing: small ? 0.3 : 0.8,
          }}>{sel ? '◈ ' : ''}{label}</button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ÉTAT INITIAL
// ═══════════════════════════════════════════════════════

const INIT = {
  // Camera
  cH:0, cV:0, zoom:7.5, fov:38, autoRot:false, rotSpeed:0.4, rollAng:0,
  dofEnabled:false, dofBlur:3,
  // Lights
  ambI:0.12, ambC:'#0a0e2a',
  keyI:2.5, keyC:'#ffffff', kX:5, kY:9, kZ:5,
  filI:0.6, filC:'#0033dd', fX:-5, fY:2.5, fZ:4,
  rimI:1.1, rimC:'#ff3300', rX:0.5, rY:-3, rZ:-7,
  topI:0.5, topC:'#8800ff', tX:0, tY:12, tZ:0,
  hemI:0.25, hemC:'#001155', hemGC:'#000000',
  shadowI:0.65, floorRefl:true,
  // Block
  pColor:'#f0b429', bgColor:'#0d1828',
  title:'BRAND NAME', slogan:'Votre tagline Sphère de Dyson', tier:'prestige', rank:'architecte',
  bW:3.4, bH:2.2, bD:0.19, bR:0.13, glowI:1.2, texQ:2048,
  particles:true, flicker:false,
  // Environment
  env:'dark_studio', fogOn:true,
  // Post FX
  vignette:0.6, grain:0.28, chrAb:false, lut:'none',
  brightness:1, contrast:1.0, saturation:1,
  bloom:0.0, compGuide:'none',
  exposure:1.3,
  // Animation
  animMode:'float', animSpeed:1,
  // Video
  vidFmt:'webm_vp9', vidRes:'4k', vidDur:10,
};

// ═══════════════════════════════════════════════════════
//  PANEL TABS
// ═══════════════════════════════════════════════════════

const TABS = [
  { id:'cam',   icon:'◎', label:'CAM'    },
  { id:'light', icon:'✦', label:'LIGHT'  },
  { id:'bloc',  icon:'⬡', label:'BLOC'   },
  { id:'env',   icon:'◈', label:'ENV'    },
  { id:'fx',    icon:'✧', label:'FX'     },
  { id:'rec',   icon:'⏺', label:'REC'    },
];

// ═══════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════

export default function CinemaPage() {
  const canvasRef     = useRef(null);
  const rendRef       = useRef(null);
  const sceneRef      = useRef(null);
  const camRef        = useRef(null);
  const blockRef      = useRef(null);
  const lightsRef     = useRef({});
  const particlesRef  = useRef(null);
  const starsRef      = useRef(null);
  const frameRef      = useRef(null);
  const tRef          = useRef(0);
  const sRef          = useRef(INIT);
  const drag          = useRef({ on:false, x0:0, y0:0, h0:0, v0:0 });
  const recRef        = useRef(null);
  const recChunks     = useRef([]);
  const kfRef         = useRef([]);  // keyframes

  const [s, setS]           = useState(INIT);
  const [tab, setTab]       = useState('cam');
  const [blocks, setBlocks] = useState([]);     // blocs Supabase
  const [selBlock, setSel]  = useState(null);   // bloc sélectionné
  const [recState, setRec]  = useState('idle'); // idle | recording | encoding
  const [recProgress, setRecProg] = useState(0);
  const [recDuration, setRecDur]  = useState(0);
  const [fps, setFps]       = useState(0);
  const [isExporting, setExp] = useState(false);
  const [kfList, setKfList] = useState([]);
  const [notification, setNotif] = useState(null);
  const fpsTimer = useRef({ frames: 0, last: Date.now() });

  // ─── sync sRef
  useEffect(() => { sRef.current = s; }, [s]);

  const upd = useCallback((k, v) => setS(p => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v })), []);
  const multi = useCallback(obj => setS(p => ({ ...p, ...obj })), []);

  const notify = useCallback((msg, color = G) => {
    setNotif({ msg, color });
    setTimeout(() => setNotif(null), 2800);
  }, []);

  // ─── CHARGER BLOCS SUPABASE ─────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = getSupabaseClient();
      if (!sb) {
        // Demo blocks si Supabase non configuré
        setBlocks(DEMO_BLOCKS);
        return;
      }
      try {
        const { data } = await sb.from('active_slots').select('*').eq('is_occupied', true).limit(50);
        if (data?.length) {
          setBlocks(data.map(b => ({
            id: b.booking_id,
            name: b.display_name,
            tier: b.tier,
            pColor: b.primary_color || TIER_COLOR[b.tier] || G,
            bgColor: b.background_color || '#0d1828',
            slogan: b.slogan || '',
            rank: getRankFromTier(b.tier),
          })));
        } else {
          setBlocks(DEMO_BLOCKS);
        }
      } catch { setBlocks(DEMO_BLOCKS); }
    }
    load();
  }, []);

  // ─── APPLIQUER UN BLOC SUPABASE ─────────────────────────
  const applyBlock = useCallback((blk) => {
    setSel(blk.id);
    multi({
      title:   blk.name    || 'BRAND',
      slogan:  blk.slogan  || 'Sphère de Dyson',
      pColor:  blk.pColor  || G,
      bgColor: blk.bgColor || '#0d1828',
      tier:    blk.tier    || 'prestige',
      rank:    blk.rank    || 'architecte',
    });
    notify(`◈ Bloc "${blk.name}" chargé`);
  }, [multi, notify]);

  // ─── INIT THREE.JS ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, preserveDrawingBuffer:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = INIT.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(INIT.fov, 1, 0.05, 400);
    camRef.current = camera;

    // — Lights
    const ambient   = new THREE.AmbientLight(INIT.ambC, INIT.ambI);
    const hemi      = new THREE.HemisphereLight(INIT.hemC, INIT.hemGC, INIT.hemI);
    const keyLight  = new THREE.DirectionalLight(INIT.keyC, INIT.keyI);
    keyLight.position.set(INIT.kX, INIT.kY, INIT.kZ);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(4096, 4096);
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.bias = -0.0002;
    const fillLight = new THREE.PointLight(INIT.filC, INIT.filI, 35);
    fillLight.position.set(INIT.fX, INIT.fY, INIT.fZ);
    const rimLight  = new THREE.PointLight(INIT.rimC, INIT.rimI, 28);
    rimLight.position.set(INIT.rX, INIT.rY, INIT.rZ);
    const topLight  = new THREE.SpotLight(INIT.topC, INIT.topI, 35, Math.PI/4, 0.35);
    topLight.position.set(INIT.tX, INIT.tY, INIT.tZ);
    topLight.target.position.set(0,0,0);
    scene.add(ambient, hemi, keyLight, fillLight, rimLight, topLight, topLight.target);
    lightsRef.current = { ambient, hemi, keyLight, fillLight, rimLight, topLight };

    // — Floor
    const floor = buildReflectivePlane();
    floor.rotation.x = -Math.PI/2;
    floor.position.y = -2.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // — Block
    const blk = buildBlock3D(INIT);
    scene.add(blk);
    blockRef.current = blk;

    // — Stars
    const stars = buildStarField(700);
    scene.add(stars);
    starsRef.current = stars;

    // — Particles
    const pts = buildParticles(INIT.pColor, 130);
    scene.add(pts);
    particlesRef.current = pts;

    // — Environment
    const env = ENVS[INIT.env];
    scene.background = new THREE.Color(env.bg);
    scene.fog = new THREE.FogExp2(env.fog, env.den);

    // — Resize
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w/h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // — Animation loop
    let flickerTimer = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      tRef.current += 0.004;
      const t  = tRef.current;
      const cs = sRef.current;

      // FPS
      fpsTimer.current.frames++;
      const now = Date.now();
      if (now - fpsTimer.current.last > 800) {
        setFps(Math.round(fpsTimer.current.frames / ((now - fpsTimer.current.last) / 1000)));
        fpsTimer.current = { frames:0, last: now };
      }

      // Camera
      let cH = cs.cH;
      if (cs.autoRot) {
        setS(p => ({ ...p, cH: (p.cH + cs.rotSpeed * 0.15) % 360 }));
        cH = cs.cH;
      }

      // Animation mode
      let extraH = 0, extraV = 0, extraZ = 0;
      switch (cs.animMode) {
        case 'float':   extraV = Math.sin(t * cs.animSpeed) * 1.5; break;
        case 'flyby':   extraH = t * cs.animSpeed * 12 % 360; break;
        case 'reveal':  extraZ = Math.max(0, 14 - t * cs.animSpeed * 2.5); break;
        case 'rotate':  setS(p => ({ ...p, cH: (p.cH + cs.animSpeed * 0.3) % 360 })); break;
        default: break;
      }

      const hR = ((cH + extraH) * Math.PI) / 180;
      const vR = ((cs.cV + extraV) * Math.PI) / 180;
      const zoom = cs.zoom + extraZ;
      camera.position.x = zoom * Math.sin(hR) * Math.cos(vR);
      camera.position.y = zoom * Math.sin(vR);
      camera.position.z = zoom * Math.cos(hR) * Math.cos(vR);
      camera.up.set(Math.sin(cs.rollAng*Math.PI/180), Math.cos(cs.rollAng*Math.PI/180), 0);
      camera.lookAt(0, 0, 0);
      camera.fov = cs.fov; camera.updateProjectionMatrix();

      // Block bob
      if (blockRef.current) {
        blockRef.current.position.y = cs.animMode === 'static' ? 0 : Math.sin(t * cs.animSpeed) * 0.08;
        // Flicker
        if (cs.flicker) {
          flickerTimer++;
          if (flickerTimer % 18 === 0) {
            blockRef.current.traverse(obj => {
              if (obj.isMesh && obj.material.emissiveIntensity !== undefined) {
                obj.material.emissiveIntensity *= 0.5 + Math.random();
              }
            });
          }
        }
      }

      // Stars
      if (starsRef.current) starsRef.current.rotation.y = t * 0.012;

      // Particles
      if (particlesRef.current && cs.particles) {
        tickParticles(particlesRef.current);
        particlesRef.current.visible = true;
      } else if (particlesRef.current) {
        particlesRef.current.visible = false;
      }

      renderer.toneMappingExposure = cs.exposure;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      renderer.dispose();
    };
  }, []);

  // ─── UPDATE LIGHTS ──────────────────────────────────────
  useEffect(() => {
    const L = lightsRef.current;
    if (!L.ambient) return;
    L.ambient.color.set(s.ambC);     L.ambient.intensity = s.ambI;
    L.hemi.color.set(s.hemC);        L.hemi.groundColor.set(s.hemGC); L.hemi.intensity = s.hemI;
    L.keyLight.color.set(s.keyC);    L.keyLight.intensity = s.keyI;   L.keyLight.position.set(s.kX, s.kY, s.kZ);
    L.fillLight.color.set(s.filC);   L.fillLight.intensity = s.filI;  L.fillLight.position.set(s.fX, s.fY, s.fZ);
    L.rimLight.color.set(s.rimC);    L.rimLight.intensity = s.rimI;   L.rimLight.position.set(s.rX, s.rY, s.rZ);
    L.topLight.color.set(s.topC);    L.topLight.intensity = s.topI;   L.topLight.position.set(s.tX, s.tY, s.tZ);
    if (L.keyLight.shadow) L.keyLight.shadow.intensity = s.shadowI;
  }, [s.ambC, s.ambI, s.hemC, s.hemGC, s.hemI,
      s.keyC, s.keyI, s.kX, s.kY, s.kZ,
      s.filC, s.filI, s.fX, s.fY, s.fZ,
      s.rimC, s.rimI, s.rX, s.rY, s.rZ,
      s.topC, s.topI, s.tX, s.tY, s.tZ, s.shadowI]);

  // ─── REBUILD BLOCK ──────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current || !blockRef.current) return;
    sceneRef.current.remove(blockRef.current);
    blockRef.current.traverse(obj => {
      if (obj.isMesh) { obj.geometry.dispose(); if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
    });
    const nb = buildBlock3D(s);
    sceneRef.current.add(nb);
    blockRef.current = nb;
    // Update particle color
    if (particlesRef.current) particlesRef.current.material.color.set(s.pColor);
  }, [s.pColor, s.bgColor, s.title, s.slogan, s.tier, s.rank, s.bW, s.bH, s.bD, s.bR, s.glowI, s.texQ]);

  // ─── UPDATE ENVIRONMENT ─────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const env = ENVS[s.env];
    scene.background = new THREE.Color(env.bg);
    scene.fog = s.fogOn ? new THREE.FogExp2(env.fog, env.den) : null;
    if (starsRef.current) starsRef.current.visible = env.stars;
  }, [s.env, s.fogOn]);

  // ─── MOUSE CONTROLS ─────────────────────────────────────
  const onMouseDown = useCallback(e => {
    drag.current = { on:true, x0:e.clientX, y0:e.clientY, h0:sRef.current.cH, v0:sRef.current.cV };
  }, []);
  const onMouseMove = useCallback(e => {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.x0;
    const dy = e.clientY - drag.current.y0;
    setS(p => ({ ...p,
      cH: drag.current.h0 - dx * 0.4,
      cV: Math.max(-88, Math.min(88, drag.current.v0 + dy * 0.3)),
    }));
  }, []);
  const onMouseUp   = useCallback(() => { drag.current.on = false; }, []);
  const onWheel     = useCallback(e => {
    e.preventDefault();
    setS(p => ({ ...p, zoom: Math.max(1.2, Math.min(25, p.zoom + e.deltaY*0.009)) }));
  }, []);

  // ─── KEYFRAMES ──────────────────────────────────────────
  const addKf = useCallback(() => {
    const kf = { cH:s.cH, cV:s.cV, zoom:s.zoom, fov:s.fov, t:Date.now() };
    setKfList(p => [...p, kf]);
    kfRef.current = [...kfRef.current, kf];
    notify(`◆ Keyframe #${kfRef.current.length} sauvegardé`);
  }, [s.cH, s.cV, s.zoom, s.fov, notify]);

  const clearKf = useCallback(() => { setKfList([]); kfRef.current = []; }, []);

  // ─── EXPORT IMAGE 4K ────────────────────────────────────
  const export4K = useCallback(() => {
    const renderer = rendRef.current, scene = sceneRef.current, cam = camRef.current;
    if (!renderer || !scene || !cam) return;
    setExp(true);
    setTimeout(() => {
      const res = VIDEO_RES.find(r => r.id === s.vidRes) || VIDEO_RES[0];
      const W = res.w, H = res.h;
      renderer.setSize(W, H, false);
      cam.aspect = W/H; cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      const link = document.createElement('a');
      link.download = `dyson-sphere-block-${W}x${H}-${Date.now()}.png`;
      link.href = renderer.domElement.toDataURL('image/png');
      link.click();
      // restore
      const cw = canvasRef.current.clientWidth, ch = canvasRef.current.clientHeight;
      renderer.setSize(cw, ch, false);
      cam.aspect = cw/ch; cam.updateProjectionMatrix();
      setExp(false);
      notify(`✦ Image ${W}×${H} exportée`, '#00e8a2');
    }, 80);
  }, [s.vidRes, notify]);

  // ─── ENREGISTREMENT VIDÉO HDR ───────────────────────────
  const startRec = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Sélectionner le codec
    const fmt  = VIDEO_FORMATS.find(f => f.id === s.vidFmt) || VIDEO_FORMATS[0];
    const res  = VIDEO_RES.find(r => r.id === s.vidRes) || VIDEO_RES[0];

    // Tenter WebCodecs HDR si disponible et VP9
    const useWebCodecs = typeof VideoEncoder !== 'undefined' && s.vidFmt === 'webm_vp9';

    recChunks.current = [];
    let mediaRec = null;

    try {
      const stream = canvas.captureStream(res.fps);
      const mimeType = fmt.mime;
      const supported = MediaRecorder.isTypeSupported(mimeType);
      const actualMime = supported ? mimeType : 'video/webm;codecs=vp8';

      mediaRec = new MediaRecorder(stream, {
        mimeType: actualMime,
        videoBitsPerSecond: res.mbps * 1_000_000,
      });

      mediaRec.ondataavailable = e => { if (e.data.size > 0) recChunks.current.push(e.data); };
      mediaRec.onstop = () => {
        setRec('encoding');
        setTimeout(() => {
          const blob = new Blob(recChunks.current, { type: actualMime });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.download = `dyson-cinema-${res.w}x${res.h}-${s.vidDur}s-${Date.now()}.${fmt.ext}`;
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
          setRec('idle'); setRecProg(0); setRecDur(0);
          notify(`⏺ Vidéo ${res.w}×${res.h} encodée !`, '#00e8a2');
        }, 500);
      };

      mediaRec.start(100); // collect every 100ms
      recRef.current = mediaRec;
      setRec('recording');
      setRecDur(0);

      // Timer + progress
      const dur = s.vidDur * 1000;
      const tick = setInterval(() => {
        setRecDur(p => {
          const next = p + 100;
          setRecProg(Math.min(100, (next / dur) * 100));
          return next;
        });
      }, 100);

      setTimeout(() => {
        clearInterval(tick);
        if (mediaRec.state === 'recording') mediaRec.stop();
      }, dur);

    } catch(err) {
      console.error('[Cinema] Recording error:', err);
      notify('⚠ Erreur enregistrement', '#ff4444');
    }
  }, [s.vidFmt, s.vidRes, s.vidDur, notify]);

  const stopRec = useCallback(() => {
    if (recRef.current?.state === 'recording') recRef.current.stop();
  }, []);

  // ═══════════════════════════════════════════════════════
  //  RENDU
  // ═══════════════════════════════════════════════════════

  // Filter CSS pour LUT + post-fx
  const activeLut = LUTS.find(l => l.id === s.lut) || LUTS[0];
  const canvasFilter = [
    activeLut.filter !== 'none' ? activeLut.filter : '',
    s.brightness !== 1 ? `brightness(${s.brightness})` : '',
    s.contrast   !== 1 ? `contrast(${s.contrast})`     : '',
    s.saturation !== 1 ? `saturate(${s.saturation})`   : '',
    s.bloom > 0 ? `drop-shadow(0 0 ${Math.round(s.bloom*28)}px rgba(${hexToRgb(s.pColor)},0.75))` : '',
  ].filter(Boolean).join(' ') || 'none';

  return (
    <div style={{ width:'100%', height:'100vh', display:'flex', background:BG, overflow:'hidden', fontFamily:"'Courier New', monospace" }}>

      {/* ─── CANVAS ─────────────────────────────────────── */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

        {/* DOF blur ring */}
        {s.dofEnabled && (
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:2,
            boxShadow:`inset 0 0 ${s.dofBlur * 28}px ${s.dofBlur * 12}px rgba(0,0,0,0.9)`,
            backdropFilter:`blur(${s.dofBlur * 0.6}px)`,
            mask:'radial-gradient(ellipse 55% 55% at center, transparent 50%, black 100%)',
            WebkitMask:'radial-gradient(ellipse 55% 55% at center, transparent 50%, black 100%)',
          }} />
        )}

        <canvas ref={canvasRef}
          style={{ width:'100%', height:'100%', display:'block', cursor:'crosshair', filter:canvasFilter }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove}
          onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel} />

        {/* Vignette */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1,
          background:`radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,${s.vignette}) 100%)` }} />

        {/* Grain */}
        {s.grain > 0 && (
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:2, opacity:s.grain * 0.9, mixBlendMode:'overlay' }}>
            <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
            <rect width="100%" height="100%" filter="url(#g)" opacity="0.45"/>
          </svg>
        )}

        {/* Chromatic aberration */}
        {s.chrAb && (
          <>
            <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3, background:'linear-gradient(135deg, rgba(255,0,0,0.03) 0%, transparent 45%)', mixBlendMode:'screen' }}/>
            <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3, background:'linear-gradient(-45deg, rgba(0,0,255,0.03) 0%, transparent 45%)', mixBlendMode:'screen' }}/>
          </>
        )}

        {/* Composition guide */}
        {s.compGuide === 'thirds' && <GuideThirds />}
        {s.compGuide === 'golden' && <GuideGolden />}
        {s.compGuide === 'center' && <GuideCenter />}

        {/* Camera presets */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:4, flexWrap:'wrap', zIndex:10 }}>
          {CAM_PRESETS.map(p => (
            <button key={p.id}
              onClick={() => multi({ cH:p.h, cV:p.v, zoom:p.z, fov:p.fov })}
              style={{ background:'rgba(0,0,0,0.78)', backdropFilter:'blur(4px)',
                border:'1px solid #181c2e', color:'#383d5a',
                fontSize:8, padding:'4px 9px', cursor:'pointer', borderRadius:2,
                letterSpacing:1, transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=G; e.currentTarget.style.color=G; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#181c2e'; e.currentTarget.style.color='#383d5a'; }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* FPS + REC indicator */}
        <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:8, alignItems:'center', zIndex:10 }}>
          {recState === 'recording' && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,0,0,0.8)', padding:'4px 10px', borderRadius:2, border:'1px solid #ff2233' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#ff0022', animation:'pulse 1s infinite' }}/>
              <span style={{ color:'#ff2233', fontSize:8, letterSpacing:1 }}>REC {(recDuration/1000).toFixed(1)}s</span>
            </div>
          )}
          <div style={{ background:'rgba(0,0,0,0.75)', padding:'4px 9px', borderRadius:2, border:'1px solid #181c2e', color:'#2a3050', fontSize:8, letterSpacing:1 }}>
            {fps} FPS
          </div>
        </div>

        {/* Progress bar */}
        {recState === 'recording' && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'#0a0c18', zIndex:10 }}>
            <div style={{ height:'100%', width:`${recProgress}%`, background:G, transition:'width 0.1s' }}/>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:20,
            background:'rgba(0,0,0,0.9)', border:`1px solid ${notification.color}`,
            color: notification.color, padding:'8px 20px', fontSize:10, letterSpacing:1.5,
            borderRadius:2, backdropFilter:'blur(8px)', fontFamily:'monospace' }}>
            {notification.msg}
          </div>
        )}

        {/* Bottom watermark */}
        <div style={{ position:'absolute', bottom:16, left:16, zIndex:10, color:'#1e2240', fontSize:9, lineHeight:1.6, letterSpacing:1 }}>
          <div style={{ color:G+'60' }}>◈ SPHÈRE DE DYSON — ADS SQUARE</div>
          <div>DRAG ORBIT · SCROLL ZOOM · {selBlock ? 'BLOC CHARGÉ' : 'MODE DEMO'}</div>
        </div>
      </div>

      {/* ─── PANNEAU DE CONTRÔLE ─────────────────────────── */}
      <div style={{ width:275, background:'#05060f', borderLeft:'1px solid #0a0c18', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'13px 15px 11px', borderBottom:'1px solid #0a0c18', background:'#060710' }}>
          <div style={{ color:G, fontSize:11, letterSpacing:2, fontWeight:700 }}>◈ CINEMA STUDIO</div>
          <div style={{ color:'#1e2245', fontSize:8, marginTop:3, letterSpacing:1 }}>SPHÈRE DE DYSON · HDR 4K ENGINE</div>
        </div>

        {/* Bloc selector */}
        <div style={{ padding:'10px 14px', borderBottom:'1px solid #0a0c18', background:'#060711' }}>
          <div style={{ fontSize:8, color:'#2a304a', letterSpacing:2, marginBottom:8 }}>◈ BLOCS ACTIFS ({blocks.length})</div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', maxHeight:72, overflowY:'auto' }}>
            {blocks.map(b => (
              <button key={b.id} onClick={() => applyBlock(b)}
                style={{ background: selBlock===b.id ? (TIER_COLOR[b.tier]||G)+'22' : 'transparent',
                  border:`1px solid ${selBlock===b.id ? (TIER_COLOR[b.tier]||G) : '#181c30'}`,
                  color: selBlock===b.id ? (TIER_COLOR[b.tier]||G) : '#2e3560',
                  fontSize:7, padding:'3px 7px', cursor:'pointer', fontFamily:'monospace',
                  borderRadius:2, letterSpacing:0.5, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {b.name?.substring(0,12) || b.id?.substring(0,8)}
                </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #0a0c18', flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, background: tab===t.id ? '#0a0c1a' : 'transparent',
              border:'none', borderBottom:`2px solid ${tab===t.id ? G : 'transparent'}`,
              color: tab===t.id ? G : '#252848',
              fontSize:6.5, padding:'8px 2px 6px', cursor:'pointer', letterSpacing:0.3, transition:'all 0.12s',
            }}>
              <div style={{ fontSize:11, marginBottom:2 }}>{t.icon}</div>
              <div>{t.label}</div>
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', padding:'13px 13px 5px',
          scrollbarWidth:'thin', scrollbarColor:'#101325 transparent' }}>

          {/* ═══ CAMERA ═══ */}
          {tab === 'cam' && (<>
            <Sec title="POSITION & ORBITE">
              <Slider label="HORIZONTAL" value={s.cH} min={-180} max={180} step={1} unit="°" onChange={v=>upd('cH',v)} />
              <Slider label="VERTICAL"   value={s.cV} min={-88}  max={88}  step={1} unit="°" onChange={v=>upd('cV',v)} />
              <Slider label="ZOOM"       value={s.zoom} min={1.2} max={25} step={0.05} onChange={v=>upd('zoom',v)} />
            </Sec>
            <Sec title="OPTIQUE">
              <Slider label="FOCALE (FOV)" value={s.fov} min={10} max={100} step={1} unit="°" onChange={v=>upd('fov',v)} />
              <Slider label="ROLL"         value={s.rollAng} min={-30} max={30} step={0.5} unit="°" onChange={v=>upd('rollAng',v)} />
            </Sec>
            <Sec title="PROFONDEUR DE CHAMP">
              <Toggle label="DOF ACTIVÉ" value={s.dofEnabled} onChange={v=>upd('dofEnabled',v)} />
              {s.dofEnabled && <Slider label="BLUR INTENSITÉ" value={s.dofBlur} min={0.5} max={8} step={0.1} onChange={v=>upd('dofBlur',v)} />}
            </Sec>
            <Sec title="AUTO-MOUVEMENT">
              <Toggle label="ROTATION AUTO" value={s.autoRot} onChange={v=>upd('autoRot',v)} />
              {s.autoRot && <Slider label="VITESSE" value={s.rotSpeed} min={0.05} max={2.5} step={0.05} onChange={v=>upd('rotSpeed',v)} />}
            </Sec>
            <Sec title="MODE ANIMATION">
              <Pills options={ANIM_MODES.map(a => ({ id:a.id, label:`${a.icon} ${a.label}` }))} value={s.animMode} onChange={v=>upd('animMode',v)} small />
              {s.animMode !== 'static' && <Slider label="VITESSE" value={s.animSpeed} min={0.1} max={3} step={0.05} onChange={v=>upd('animSpeed',v)} />}
              {s.animMode === 'keyframes' && (
                <div>
                  <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                    <button onClick={addKf} style={{ flex:1, background:'transparent', border:`1px solid ${G}`, color:G, fontSize:8, padding:'5px', cursor:'pointer', fontFamily:'monospace', letterSpacing:1 }}>◆ + KF</button>
                    <button onClick={clearKf} style={{ flex:1, background:'transparent', border:'1px solid #ff4444', color:'#ff4444', fontSize:8, padding:'5px', cursor:'pointer', fontFamily:'monospace', letterSpacing:1 }}>✕ CLEAR</button>
                  </div>
                  {kfList.map((kf, i) => (
                    <div key={i} style={{ fontSize:8, color:'#2e3a5a', padding:'4px 8px', border:'1px solid #101428', marginBottom:3, fontFamily:'monospace' }}>
                      KF {i+1} — H:{Math.round(kf.cH)}° V:{Math.round(kf.cV)}° Z:{kf.zoom.toFixed(1)}
                    </div>
                  ))}
                </div>
              )}
            </Sec>
          </>)}

          {/* ═══ LUMIÈRE ═══ */}
          {tab === 'light' && (<>
            <Sec title="AMBIANTE & HÉMISPHÈRE">
              <ColorPick label="AMBIANTE" value={s.ambC} onChange={v=>upd('ambC',v)} />
              <Slider label="INTENSITÉ AMBIANTE" value={s.ambI} min={0} max={2} onChange={v=>upd('ambI',v)} />
              <ColorPick label="HÉMISPHÈRE SKY" value={s.hemC} onChange={v=>upd('hemC',v)} />
              <ColorPick label="HÉMISPHÈRE GROUND" value={s.hemGC} onChange={v=>upd('hemGC',v)} />
              <Slider label="INTENSITÉ HÉMIS." value={s.hemI} min={0} max={1.5} onChange={v=>upd('hemI',v)} />
            </Sec>
            <Sec title="KEY LIGHT ★ PRINCIPALE">
              <ColorPick label="COULEUR" value={s.keyC} onChange={v=>upd('keyC',v)} />
              <Slider label="INTENSITÉ" value={s.keyI} min={0} max={8}   onChange={v=>upd('keyI',v)} />
              <Slider label="X" value={s.kX} min={-15} max={15} step={0.1} onChange={v=>upd('kX',v)} />
              <Slider label="Y" value={s.kY} min={-5}  max={18} step={0.1} onChange={v=>upd('kY',v)} />
              <Slider label="Z" value={s.kZ} min={-15} max={15} step={0.1} onChange={v=>upd('kZ',v)} />
              <Slider label="OMBRE" value={s.shadowI} min={0} max={1} onChange={v=>upd('shadowI',v)} />
            </Sec>
            <Sec title="FILL LIGHT — REMPLISSAGE">
              <ColorPick label="COULEUR" value={s.filC} onChange={v=>upd('filC',v)} />
              <Slider label="INTENSITÉ" value={s.filI} min={0} max={5}   onChange={v=>upd('filI',v)} />
              <Slider label="X" value={s.fX} min={-15} max={15} step={0.1} onChange={v=>upd('fX',v)} />
              <Slider label="Y" value={s.fY} min={-8}  max={15} step={0.1} onChange={v=>upd('fY',v)} />
              <Slider label="Z" value={s.fZ} min={-15} max={15} step={0.1} onChange={v=>upd('fZ',v)} />
            </Sec>
            <Sec title="RIM LIGHT — CONTOUR">
              <ColorPick label="COULEUR" value={s.rimC} onChange={v=>upd('rimC',v)} />
              <Slider label="INTENSITÉ" value={s.rimI} min={0} max={5}   onChange={v=>upd('rimI',v)} />
              <Slider label="X" value={s.rX} min={-15} max={15} step={0.1} onChange={v=>upd('rX',v)} />
              <Slider label="Y" value={s.rY} min={-10} max={10} step={0.1} onChange={v=>upd('rY',v)} />
              <Slider label="Z" value={s.rZ} min={-15} max={15} step={0.1} onChange={v=>upd('rZ',v)} />
            </Sec>
            <Sec title="SPOT ZÉNITH">
              <ColorPick label="COULEUR" value={s.topC} onChange={v=>upd('topC',v)} />
              <Slider label="INTENSITÉ" value={s.topI} min={0} max={4}   onChange={v=>upd('topI',v)} />
              <Slider label="X" value={s.tX} min={-10} max={10} step={0.1} onChange={v=>upd('tX',v)} />
              <Slider label="Y" value={s.tY} min={3}   max={22} step={0.1} onChange={v=>upd('tY',v)} />
            </Sec>
            <Sec title="PRESETS ÉCLAIRAGE">
              {[
                { n:'CINÉMA NOIR', v:{ keyC:'#fff5e0', keyI:3.5, filC:'#001a66', filI:0.35, rimC:'#440000', rimI:0.8, ambI:0.06 } },
                { n:'NEON NIGHT',  v:{ keyC:'#ff00aa', keyI:1.8, filC:'#0000ff', filI:1.2, rimC:'#00ffaa', rimI:1.5, ambI:0.08 } },
                { n:'GOLDEN HOUR', v:{ keyC:'#ffaa44', keyI:3.0, filC:'#ff6600', filI:0.9, rimC:'#ffeeaa', rimI:0.7, ambI:0.18 } },
                { n:'ARCTIC',      v:{ keyC:'#ddeeff', keyI:2.8, filC:'#0055ff', filI:0.8, rimC:'#aaccff', rimI:1.0, ambI:0.20 } },
              ].map(p => (
                <button key={p.n} onClick={() => multi(p.v)} style={{ width:'100%', textAlign:'left',
                  background:'transparent', border:'1px solid #141828', color:'#2e3560',
                  fontSize:8, padding:'7px 10px', cursor:'pointer', fontFamily:'monospace',
                  marginBottom:5, borderRadius:2, letterSpacing:1, transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=G+'80'; e.currentTarget.style.color=G; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#141828'; e.currentTarget.style.color='#2e3560'; }}>
                  ✦ {p.n}
                </button>
              ))}
            </Sec>
          </>)}

          {/* ═══ BLOC ═══ */}
          {tab === 'bloc' && (<>
            <Sec title="CONTENU">
              {[
                { label:'TITRE',  key:'title',  placeholder:'BRAND NAME' },
                { label:'SLOGAN', key:'slogan', placeholder:'Sphère de Dyson' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:8, color:'#3a4065', letterSpacing:1, marginBottom:5 }}>{label}</div>
                  <input value={s[key]} onChange={e => upd(key, e.target.value)}
                    placeholder={placeholder}
                    style={{ width:'100%', background:'#0a0c1c', border:'1px solid #141828',
                      color: key==='title' ? G : '#8090aa', fontSize:key==='title'?11:10, padding:'7px 9px',
                      boxSizing:'border-box', fontFamily:'monospace', outline:'none', letterSpacing:1 }} />
                </div>
              ))}
            </Sec>
            <Sec title="RANG SPHÈRE DE DYSON">
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {Object.entries(RANK_META).map(([id, rm]) => (
                  <button key={id} onClick={() => upd('rank', id)} style={{
                    textAlign:'left', display:'flex', alignItems:'center', gap:8,
                    background: s.rank===id ? rm.color+'18' : 'transparent',
                    border:`1px solid ${s.rank===id ? rm.color : '#141828'}`,
                    color: s.rank===id ? rm.color : '#2e3560',
                    fontSize:8, padding:'7px 10px', cursor:'pointer', fontFamily:'monospace', borderRadius:2, letterSpacing:0.8,
                  }}>
                    <span>{rm.icon}</span>
                    <span>{rm.label.toUpperCase()}</span>
                    <span style={{ marginLeft:'auto', fontSize:7, opacity:0.6 }}>{rm.tier}</span>
                  </button>
                ))}
              </div>
            </Sec>
            <Sec title="TIER">
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {Object.entries(TIER_COLOR).map(([id, col]) => (
                  <button key={id} onClick={() => upd('tier',id)} style={{
                    background: s.tier===id ? col+'22' : 'transparent',
                    border:`1px solid ${s.tier===id ? col : '#141828'}`,
                    color: s.tier===id ? col : '#2e3560',
                    fontSize:7, padding:'3px 7px', cursor:'pointer', fontFamily:'monospace', borderRadius:2, letterSpacing:0.5,
                  }}>{id.toUpperCase()}</button>
                ))}
              </div>
            </Sec>
            <Sec title="COULEURS">
              <ColorPick label="COULEUR PRINCIPALE" value={s.pColor}  onChange={v=>upd('pColor',v)} />
              <ColorPick label="FOND DU BLOC"        value={s.bgColor} onChange={v=>upd('bgColor',v)} />
            </Sec>
            <Sec title="DIMENSIONS">
              <Slider label="LARGEUR"    value={s.bW} min={1}    max={8}    step={0.05} onChange={v=>upd('bW',v)} />
              <Slider label="HAUTEUR"    value={s.bH} min={0.5}  max={7}    step={0.05} onChange={v=>upd('bH',v)} />
              <Slider label="ÉPAISSEUR"  value={s.bD} min={0.04} max={0.8}  step={0.01} onChange={v=>upd('bD',v)} />
              <Slider label="ARRONDI"    value={s.bR} min={0}    max={0.4}  step={0.005} onChange={v=>upd('bR',v)} />
            </Sec>
            <Sec title="EFFETS BLOC">
              <Slider label="GLOW INTENSITÉ"  value={s.glowI} min={0} max={4} step={0.05} onChange={v=>upd('glowI',v)} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontSize:8, color:'#3a4065', letterSpacing:1 }}>QUALITÉ TEXTURE</span>
                <Pills options={[{id:1024,label:'1K'},{id:2048,label:'2K'},{id:4096,label:'4K'}]} value={s.texQ} onChange={v=>upd('texQ',v)} small />
              </div>
              <Toggle label="PARTICULES AMBIANTES" value={s.particles} onChange={v=>upd('particles',v)} />
              <Toggle label="EFFET FLICKER"         value={s.flicker}   onChange={v=>upd('flicker',v)} />
            </Sec>
          </>)}

          {/* ═══ ENVIRONNEMENT ═══ */}
          {tab === 'env' && (<>
            <Sec title="ENVIRONNEMENT 3D">
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {Object.entries(ENVS).map(([id, env]) => (
                  <button key={id} onClick={() => upd('env',id)} style={{
                    textAlign:'left', background: s.env===id ? '#0c0e1e' : 'transparent',
                    border:`1px solid ${s.env===id ? G : '#141828'}`,
                    color: s.env===id ? G : '#2e3560',
                    fontSize:8, padding:'8px 10px', cursor:'pointer', fontFamily:'monospace',
                    borderRadius:2, display:'flex', justifyContent:'space-between', letterSpacing:1,
                  }}>
                    <span>{s.env===id ? '◈' : '○'} {env.name}</span>
                    {env.stars && <span style={{ fontSize:7, color:'#2a3555' }}>★ STARS</span>}
                  </button>
                ))}
              </div>
            </Sec>
            <Sec title="ATMOSPHÈRE">
              <Toggle label="BROUILLARD VOLUMÉTRIQUE" value={s.fogOn} onChange={v=>upd('fogOn',v)} />
              <Toggle label="RÉFLEXION SOL"            value={s.floorRefl} onChange={v=>upd('floorRefl',v)} />
            </Sec>
          </>)}

          {/* ═══ FX POST-PROD ═══ */}
          {tab === 'fx' && (<>
            <Sec title="EXPOSITION & TONEMAP">
              <Slider label="EXPOSITION"   value={s.exposure}    min={0.2} max={4}   step={0.02} onChange={v=>upd('exposure',v)} />
              <Slider label="LUMINOSITÉ"   value={s.brightness}  min={0.4} max={2.2} step={0.02} onChange={v=>upd('brightness',v)} />
              <Slider label="CONTRASTE"    value={s.contrast}    min={0.5} max={2.5} step={0.02} onChange={v=>upd('contrast',v)} />
              <Slider label="SATURATION"   value={s.saturation}  min={0}   max={3}   step={0.05} onChange={v=>upd('saturation',v)} />
            </Sec>
            <Sec title="EFFETS CINÉMA">
              <Slider label="VIGNETTE"          value={s.vignette} min={0} max={1}   step={0.02} onChange={v=>upd('vignette',v)} />
              <Slider label="GRAIN FILM"         value={s.grain}    min={0} max={0.9} step={0.01} onChange={v=>upd('grain',v)} />
              <Slider label="BLOOM / GLOW"       value={s.bloom}    min={0} max={1}   step={0.02} onChange={v=>upd('bloom',v)} />
              <Toggle label="ABERRATION CHROM."  value={s.chrAb}    onChange={v=>upd('chrAb',v)} />
            </Sec>
            <Sec title="LUT — COLOR GRADING">
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {LUTS.map(l => (
                  <button key={l.id} onClick={() => upd('lut',l.id)} style={{
                    textAlign:'left', background: s.lut===l.id ? G+'18' : 'transparent',
                    border:`1px solid ${s.lut===l.id ? G : '#141828'}`,
                    color: s.lut===l.id ? G : '#2e3560',
                    fontSize:8, padding:'6px 10px', cursor:'pointer', fontFamily:'monospace', borderRadius:2, letterSpacing:0.8,
                  }}>{s.lut===l.id?'◈ ':''}{l.label}</button>
                ))}
              </div>
            </Sec>
            <Sec title="COMPOSITION">
              <Pills options={COMP_GUIDES} value={s.compGuide} onChange={v=>upd('compGuide',v)} small />
            </Sec>
            <Sec title="PRESETS CINÉMA">
              {[
                { n:'BLOCKBUSTER',  v:{ vignette:0.7, grain:0.35, exposure:1.2, contrast:1.25, saturation:1.3, bloom:0.2, lut:'teal_ora', chrAb:true } },
                { n:'NOIR ABSOLU',  v:{ vignette:0.9, grain:0.6,  exposure:0.85, contrast:1.4, saturation:0.5, bloom:0, lut:'bw', chrAb:false } },
                { n:'NEON DREAMS',  v:{ vignette:0.6, grain:0.3,  exposure:1.1, contrast:1.1, saturation:2.2, bloom:0.5, lut:'neon', chrAb:true } },
                { n:'GOLDEN ERA',   v:{ vignette:0.55, grain:0.25, exposure:1.4, contrast:0.95, saturation:1.1, bloom:0.15, lut:'warm', chrAb:false } },
              ].map(p => (
                <button key={p.n} onClick={() => multi(p.v)} style={{ width:'100%', textAlign:'left',
                  background:'transparent', border:'1px solid #141828', color:'#2e3560',
                  fontSize:8, padding:'7px 10px', cursor:'pointer', fontFamily:'monospace',
                  marginBottom:5, borderRadius:2, letterSpacing:1, transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=G+'80'; e.currentTarget.style.color=G; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#141828'; e.currentTarget.style.color='#2e3560'; }}>
                  ✧ {p.n}
                </button>
              ))}
            </Sec>
          </>)}

          {/* ═══ ENREGISTREMENT ═══ */}
          {tab === 'rec' && (<>
            <Sec title="FORMAT VIDÉO">
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
                {VIDEO_FORMATS.map(f => (
                  <button key={f.id} onClick={() => upd('vidFmt',f.id)} style={{
                    textAlign:'left', background: s.vidFmt===f.id ? G+'18' : 'transparent',
                    border:`1px solid ${s.vidFmt===f.id ? G : '#141828'}`,
                    color: s.vidFmt===f.id ? G : '#2e3560',
                    fontSize:8, padding:'8px 10px', cursor:'pointer', fontFamily:'monospace',
                    borderRadius:2, display:'flex', justifyContent:'space-between',
                  }}>
                    <span>{s.vidFmt===f.id?'◈ ':''}{f.label}</span>
                    {f.hdr && <span style={{ fontSize:7, color:'#e8c000', border:'1px solid #e8c00055', padding:'1px 5px' }}>HDR</span>}
                  </button>
                ))}
              </div>
            </Sec>
            <Sec title="RÉSOLUTION">
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
                {VIDEO_RES.map(r => (
                  <button key={r.id} onClick={() => upd('vidRes',r.id)} style={{
                    textAlign:'left', background: s.vidRes===r.id ? G+'18' : 'transparent',
                    border:`1px solid ${s.vidRes===r.id ? G : '#141828'}`,
                    color: s.vidRes===r.id ? G : '#2e3560',
                    fontSize:8, padding:'8px 10px', cursor:'pointer', fontFamily:'monospace',
                    borderRadius:2, display:'flex', justifyContent:'space-between',
                  }}>
                    <span>{s.vidRes===r.id?'◈ ':''}{r.label} ({r.w}×{r.h})</span>
                    <span style={{ fontSize:7, color:'#2e3560' }}>{r.fps}fps · {r.mbps}Mbps</span>
                  </button>
                ))}
              </div>
            </Sec>
            <Sec title="DURÉE">
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {[5,10,20,30,60].map(d => (
                  <button key={d} onClick={() => upd('vidDur',d)} style={{
                    background: s.vidDur===d ? G+'22' : 'transparent',
                    border:`1px solid ${s.vidDur===d ? G : '#141828'}`,
                    color: s.vidDur===d ? G : '#2e3560',
                    fontSize:8, padding:'4px 10px', cursor:'pointer', fontFamily:'monospace', borderRadius:2,
                  }}>{d}s</button>
                ))}
              </div>
            </Sec>
            <Sec title="INFO ENCODAGE">
              <div style={{ fontSize:8, color:'#2e3560', lineHeight:1.9, fontFamily:'monospace' }}>
                {(() => {
                  const r = VIDEO_RES.find(x=>x.id===s.vidRes)||VIDEO_RES[0];
                  const f = VIDEO_FORMATS.find(x=>x.id===s.vidFmt)||VIDEO_FORMATS[0];
                  const estimMB = Math.round(r.mbps * s.vidDur / 8);
                  return (<>
                    <div style={{ color:'#3a4570' }}>RÉSOLUTION <span style={{ color:G }}>{r.w}×{r.h}</span></div>
                    <div style={{ color:'#3a4570' }}>FRAMERATE  <span style={{ color:G }}>{r.fps} FPS</span></div>
                    <div style={{ color:'#3a4570' }}>DÉBIT      <span style={{ color:G }}>{r.mbps} Mbps</span></div>
                    <div style={{ color:'#3a4570' }}>DURÉE      <span style={{ color:G }}>{s.vidDur}s</span></div>
                    <div style={{ color:'#3a4570' }}>TAILLE ~   <span style={{ color:G }}>{estimMB} MB</span></div>
                    {f.hdr && <div style={{ color:'#e8c00080' }}>⚡ HDR 10-bit VP9</div>}
                    <div style={{ marginTop:6, color:'#2a2e50', fontSize:7 }}>
                      WebCodecs disponible: <span style={{ color: typeof VideoEncoder!=='undefined'?'#00e8a2':'#ff4444' }}>{typeof VideoEncoder!=='undefined'?'OUI':'NON'}</span>
                    </div>
                  </>);
                })()}
              </div>
            </Sec>
            {/* REC progress */}
            {recState !== 'idle' && (
              <Sec title="PROGRESSION">
                <div style={{ background:'#0a0c18', borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:6, background: recState==='encoding'?'#00e8a2':G, width:`${recProgress}%`, transition:'width 0.1s' }}/>
                </div>
                <div style={{ fontSize:8, color:'#3a4570', fontFamily:'monospace' }}>
                  {recState==='recording' ? `⏺ ENREGISTREMENT... ${(recDuration/1000).toFixed(1)}s / ${s.vidDur}s` : '⚙ ENCODAGE...'}
                </div>
              </Sec>
            )}
          </>)}
        </div>

        {/* ─── ACTIONS BOTTOM ─────────────────────────────── */}
        <div style={{ padding:'9px 13px 13px', borderTop:'1px solid #0a0c18', background:'#060710', display:'flex', flexDirection:'column', gap:6 }}>

          {/* Record / Stop */}
          {recState === 'idle' ? (
            <button onClick={startRec} style={{
              background:'linear-gradient(135deg, #cc0020 0%, #880010 100%)',
              border:'none', color:'#fff', fontSize:9, fontWeight:700,
              padding:'10px', cursor:'pointer', fontFamily:'monospace',
              letterSpacing:1.5, borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff4455', display:'inline-block' }}/>
              ⏺ ENREGISTRER VIDÉO HDR
            </button>
          ) : recState === 'recording' ? (
            <button onClick={stopRec} style={{
              background:'#1a0608', border:'1px solid #ff2233', color:'#ff4455',
              fontSize:9, fontWeight:700, padding:'10px', cursor:'pointer', fontFamily:'monospace', letterSpacing:1.5, borderRadius:2,
            }}>⏹ ARRÊTER ({(recDuration/1000).toFixed(1)}s)</button>
          ) : (
            <button disabled style={{ background:'#111328', border:'1px solid #2a3050', color:'#3a4570', fontSize:9, padding:'10px', fontFamily:'monospace', letterSpacing:1.5, borderRadius:2 }}>
              ⚙ ENCODAGE...
            </button>
          )}

          {/* Export image */}
          <button onClick={export4K} disabled={isExporting} style={{
            background: isExporting ? '#111328' : `linear-gradient(135deg, ${G} 0%, #cc8800 100%)`,
            border:'none', color: isExporting ? '#3a4570' : '#000',
            fontSize:9, fontWeight:800, padding:'10px', cursor: isExporting ? 'wait' : 'pointer',
            fontFamily:'monospace', letterSpacing:1.5, borderRadius:2,
          }}>
            {isExporting ? '⏳ EXPORT...' : '↓ SCREENSHOT 4K'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input[type=range]::-webkit-slider-runnable-track { background:#0e1028; border-radius:1px; }
        input[type=range]::-webkit-slider-thumb { width:10px; height:10px; border-radius:50%; margin-top:-3.5px; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:#101325; border-radius:2px; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  GUIDES DE COMPOSITION
// ═══════════════════════════════════════════════════════

function GuideThirds() {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:5, opacity:0.25 }}>
      <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="#fff" strokeWidth="0.5"/>
      <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="#fff" strokeWidth="0.5"/>
      <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="#fff" strokeWidth="0.5"/>
      <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="#fff" strokeWidth="0.5"/>
      {[['33.33%','33.33%'],['66.66%','33.33%'],['33.33%','66.66%'],['66.66%','66.66%']].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="4" fill="none" stroke="#f0b429" strokeWidth="1" opacity="0.7"/>
      ))}
    </svg>
  );
}

function GuideGolden() {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:5, opacity:0.22 }}>
      <line x1="38.2%" y1="0" x2="38.2%" y2="100%" stroke="#f0b429" strokeWidth="0.5"/>
      <line x1="61.8%" y1="0" x2="61.8%" y2="100%" stroke="#f0b429" strokeWidth="0.5"/>
      <line x1="0" y1="38.2%" x2="100%" y2="38.2%" stroke="#f0b429" strokeWidth="0.5"/>
      <line x1="0" y1="61.8%" x2="100%" y2="61.8%" stroke="#f0b429" strokeWidth="0.5"/>
      <ellipse cx="50%" cy="50%" rx="23%" ry="15%" fill="none" stroke="#f0b429" strokeWidth="0.5"/>
    </svg>
  );
}

function GuideCenter() {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:5, opacity:0.2 }}>
      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#fff" strokeWidth="0.5"/>
      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#fff" strokeWidth="0.5"/>
      <circle cx="50%" cy="50%" r="4" fill="none" stroke="#f0b429" strokeWidth="1.5" opacity="0.8"/>
      <circle cx="50%" cy="50%" r="20%" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.4"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#',''), 16);
  return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
}

function getRankFromTier(tier) {
  return { epicenter:'elu', prestige:'architecte', elite:'gardien', business:'batisseur', standard:'batisseur', viral:'signal' }[tier] || 'signal';
}

// Demo blocks si Supabase non connecté
const DEMO_BLOCKS = [
  { id:'d1', name:'Nike Global',   tier:'epicenter', pColor:'#f0b429', bgColor:'#080400', slogan:'Just Do It', rank:'elu'       },
  { id:'d2', name:'Dior Paris',    tier:'prestige',  pColor:'#ff4d8f', bgColor:'#0d0818', slogan:'Savoir-Faire', rank:'architecte' },
  { id:'d3', name:'Rolex SA',      tier:'elite',     pColor:'#a855f7', bgColor:'#060010', slogan:'Perpetual Excellence', rank:'gardien' },
  { id:'d4', name:'OpenAI',        tier:'business',  pColor:'#00d9f5', bgColor:'#020a10', slogan:'AGI for humanity', rank:'batisseur' },
  { id:'d5', name:'SoundCloud',    tier:'standard',  pColor:'#38bdf8', bgColor:'#020810', slogan:'Discover Music', rank:'batisseur' },
  { id:'d6', name:'Indie Studio',  tier:'viral',     pColor:'#00e8a2', bgColor:'#00100a', slogan:'Make it loud', rank:'signal' },
];
