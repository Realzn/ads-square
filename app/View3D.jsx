'use client';
/**
 * ─── ADS·SQUARE — View3D.jsx ───────────────────────────────────────────────
 *
 * Vue 3D interactive des 1296 blocs publicitaires.
 * Niveau 0 = grille 2D (composant PublicView existant)
 * Niveaux 1-6 = formes 3D progressivement plus complexes via Three.js
 *
 * Géométries :
 *   1 → Cube subdivisé (6 × 6×6 = 216 faces groupées)
 *   2 → Octaèdre subdivié (8 × 14 = ~112)
 *   3 → Icosaèdre (20 faces)
 *   4 → Icosphère ordre 1 (80 faces)
 *   5 → Icosphère ordre 2 (320 faces)
 *   6 → Icosphère ordre 3 (1280 faces ≈ 1296 blocs)
 *
 * Dépendances à installer :
 *   npm install three gsap
 *
 * Intégration dans app/page.js :
 *   import View3D from '../components/View3D';
 *   // Remplacer <PublicView ...> par <View3D slots={slots} isLive={isLive} ...>
 * ───────────────────────────────────────────────────────────────────────────
 */

import {
  useRef, useEffect, useState, useCallback, useMemo, memo,
} from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE, CENTER_X, CENTER_Y, GRID_COLS, GRID_ROWS } from '../lib/grid';
import { recordClick, fetchSlotStats } from '../lib/supabase';

// ─── Design tokens (mêmes que page.js) ────────────────────────────────────
const U = {
  bg: '#080808', s1: '#0f0f0f', s2: '#151515', card: '#1a1a1a',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)', faint: 'rgba(255,255,255,0.04)',
  accent: '#d4a84b', accentFg: '#080808', err: '#e05252',
};
const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
};
const priceEur = tier => (TIER_PRICE[tier] || 100) / 100;

// ─── Tier 3D scale & visual weight ───────────────────────────────────────
const TIER_3D_SCALE = {
  epicenter: 3.5, prestige: 2.2, elite: 1.5,
  business: 0.9, standard: 0.65, viral: 0.45,
};
const TIER_GLOW = {
  epicenter: 1.0, prestige: 0.7, elite: 0.5,
  business: 0.3, standard: 0.2, viral: 0.12,
};

// ─── Tier sort order (pole → equator) ────────────────────────────────────
const TIER_PRIORITY = {
  epicenter: 0, prestige: 1, elite: 2,
  business: 3, standard: 4, viral: 5,
};

// ─── Level descriptors ────────────────────────────────────────────────────
const LEVEL_INFO = [
  { name: 'Grille 2D',    shape: 'Carte',        icon: '◫' },
  { name: 'Cube',         shape: 'Cube',          icon: '⬛' },
  { name: 'Octaèdre',     shape: 'Octaèdre',     icon: '◆' },
  { name: 'Icosaèdre',    shape: 'Icosaèdre',    icon: '⬡' },
  { name: 'Sphère I',     shape: 'Sphère ×80',   icon: '◎' },
  { name: 'Sphère II',    shape: 'Sphère ×320',  icon: '◉' },
  { name: 'Sphère Dense', shape: '~1296 faces',  icon: '●' },
];

// ─────────────────────────────────────────────────────────────────────────
// GEOMETRY HELPERS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build icosphere face centroids, projected on unit sphere.
 * subdivision: 0→20 faces, 1→80, 2→320, 3→1280
 */
function buildIcosphereFaces(subdivisions) {
  const phi = (1 + Math.sqrt(5)) / 2;
  // 12 icosahedron vertices
  const verts = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ].map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return v.map(c => c / len);
  });

  // 20 icosahedron faces
  const faces = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
  ];

  function midpoint(a, b) {
    const m = [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2];
    const len = Math.sqrt(m[0]**2 + m[1]**2 + m[2]**2);
    return m.map(c => c / len);
  }

  let currentFaces = faces.map(f => f.map(i => verts[i]));

  for (let s = 0; s < subdivisions; s++) {
    const next = [];
    for (const [a, b, c] of currentFaces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    currentFaces = next;
  }

  // Return face centroids (average of 3 vertices, normalized)
  return currentFaces.map(([a, b, c]) => {
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    const cz = (a[2] + b[2] + c[2]) / 3;
    const len = Math.sqrt(cx**2 + cy**2 + cz**2);
    return { x: cx / len, y: cy / len, z: cz / len };
  });
}

/** Build cube face positions: N×N grid on each face, all positions normalized to sphere */
function buildCubeFaces(n) {
  const positions = [];
  // 6 faces: ±X, ±Y, ±Z
  const faces = [
    { u: [0,0,1], v: [0,1,0], n: [1,0,0], sign: 1 },
    { u: [0,0,1], v: [0,1,0], n: [1,0,0], sign: -1 },
    { u: [1,0,0], v: [0,0,1], n: [0,1,0], sign: 1 },
    { u: [1,0,0], v: [0,0,1], n: [0,1,0], sign: -1 },
    { u: [1,0,0], v: [0,1,0], n: [0,0,1], sign: 1 },
    { u: [1,0,0], v: [0,1,0], n: [0,0,1], sign: -1 },
  ];
  for (const face of faces) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const s = (i / (n - 1)) * 2 - 1;
        const t = (j / (n - 1)) * 2 - 1;
        const x = face.n[0] * face.sign + face.u[0] * s + face.v[0] * t;
        const y = face.n[1] * face.sign + face.u[1] * s + face.v[1] * t;
        const z = face.n[2] * face.sign + face.u[2] * s + face.v[2] * t;
        // Project onto sphere surface
        const len = Math.sqrt(x**2 + y**2 + z**2);
        positions.push({ x: x/len, y: y/len, z: z/len });
      }
    }
  }
  return positions;
}

/** Build octahedron face positions */
function buildOctahedronFaces(subdiv) {
  const v = [
    [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]
  ];
  const faces = [
    [0,2,4],[0,4,3],[0,3,5],[0,5,2],
    [1,4,2],[1,3,4],[1,5,3],[1,2,5],
  ];
  function mid(a, b) {
    const m = [(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
    const l = Math.sqrt(m[0]**2+m[1]**2+m[2]**2);
    return m.map(c=>c/l);
  }
  let curr = faces.map(f=>f.map(i=>v[i]));
  for (let s=0;s<subdiv;s++){
    const next=[];
    for(const[a,b,c] of curr){
      const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
      next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);
    }
    curr=next;
  }
  return curr.map(([a,b,c])=>{
    const cx=(a[0]+b[0]+c[0])/3,cy=(a[1]+b[1]+c[1])/3,cz=(a[2]+b[2]+c[2])/3;
    const l=Math.sqrt(cx**2+cy**2+cz**2);
    return{x:cx/l,y:cy/l,z:cz/l};
  });
}

// ─────────────────────────────────────────────────────────────────────────
// BLOCK POSITION MAPPING
// ─────────────────────────────────────────────────────────────────────────

/**
 * Sort slots by tier priority (epicenter first, viral last)
 * Returns slots in order that maps to "sphere top → bottom"
 */
function sortSlotsByTierAndPosition(slots) {
  return [...slots].sort((a, b) => {
    const tp = TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier];
    if (tp !== 0) return tp;
    // Within tier: sort by distance from center
    const da = Math.abs(a.x - CENTER_X) + Math.abs(a.y - CENTER_Y);
    const db = Math.abs(b.x - CENTER_X) + Math.abs(b.y - CENTER_Y);
    return da - db;
  });
}

/**
 * Sort sphere positions by Y (top→bottom), then by angle
 * Maps epicenter to top pole, viral to equator/bottom
 */
function sortPosByPole(positions) {
  return [...positions].sort((a, b) => {
    // Sort by y descending (top first), then by angle
    if (Math.abs(a.y - b.y) > 0.01) return b.y - a.y;
    return Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x);
  });
}

/**
 * Compute all 7 level target positions for each slot.
 * Returns Float32Array of length 1296 × 7 × 3 (x, y, z per level per slot)
 * Plus scale array: Float32Array of length 1296 × 7
 */
function computeAllLevelPositions(slots) {
  const N = slots.length; // 1296
  const SPHERE_R = 7;

  // Build all target position sets, sorted pole-first
  const pos = {
    flat:   sortSlotsByTierAndPosition(slots), // original
    cube:   sortPosByPole(buildCubeFaces(15).slice(0, Math.max(N, 1350))),
    octa:   sortPosByPole(buildOctahedronFaces(3)), // 8×64=512 < 1296, repeat
    ico:    sortPosByPole(buildIcosphereFaces(2)), // 320 faces, tile
    ico1:   sortPosByPole(buildIcosphereFaces(3)), // 1280 faces
    ico2:   sortPosByPole(buildIcosphereFaces(3)), // same, larger R
  };

  // Level 0: flat 2D grid positions
  // Level 1-6: sphere projections at increasing radius
  const LEVELS_CONFIG = [
    { key: 'flat',  R: 0,        flat: true  },  // L0: 2D
    { key: 'cube',  R: SPHERE_R, flat: false },   // L1: Cube
    { key: 'octa',  R: SPHERE_R, flat: false },   // L2: Octa
    { key: 'ico',   R: SPHERE_R, flat: false },   // L3: Ico20
    { key: 'ico1',  R: SPHERE_R * 0.9, flat: false }, // L4: Ico80 (smaller)
    { key: 'ico1',  R: SPHERE_R, flat: false },   // L5: Ico320
    { key: 'ico1',  R: SPHERE_R, flat: false },   // L6: Ico1280
  ];

  const sortedSlots = sortSlotsByTierAndPosition(slots);

  // For each slot, store its sorted-rank
  const rankMap = {};
  sortedSlots.forEach((slot, rank) => { rankMap[slot.id] = rank; });

  // Build result arrays indexed by slot index (0..N-1)
  // positions[slotIndex][level] = {x,y,z}
  const positions = slots.map((slot, slotIdx) => {
    const rank = rankMap[slot.id];
    const levelPositions = [];

    for (let lvl = 0; lvl < 7; lvl++) {
      if (lvl === 0) {
        // Flat 2D: use grid coordinates centered at origin
        const scale = 0.18;
        levelPositions.push({
          x: (slot.x - CENTER_X) * scale,
          y: -(slot.y - CENTER_Y) * scale,
          z: 0,
        });
      } else {
        const cfg = LEVELS_CONFIG[lvl];
        let shapePosArr;
        if (cfg.key === 'cube') shapePosArr = pos.cube;
        else if (cfg.key === 'octa') shapePosArr = pos.octa;
        else if (cfg.key === 'ico') {
          // For L3 (icosahedron 20 faces), tile positions
          shapePosArr = buildIcosphereFaces(0); // 20 faces
        }
        else shapePosArr = pos.ico1;

        // Map rank → sphere position, wrapping if needed
        const p = shapePosArr[rank % shapePosArr.length];
        levelPositions.push({
          x: p.x * cfg.R,
          y: p.y * cfg.R,
          z: p.z * cfg.R,
        });
      }
    }
    return levelPositions;
  });

  return positions; // positions[slotIdx][level] = {x,y,z}
}

// ─────────────────────────────────────────────────────────────────────────
// THREE.JS SCENE MANAGER
// ─────────────────────────────────────────────────────────────────────────

class Scene3D {
  constructor(canvas, slots, allLevelPositions) {
    this.canvas = canvas;
    this.slots = slots;
    this.allLevelPositions = allLevelPositions;
    this.currentLevel = 1;
    this.targetLevel = 1;
    this.lerpT = 1;
    this.THREE = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.instancedMesh = null;
    this.instancedMeshGlow = null;
    this.animFrame = null;
    this.destroyed = false;

    // Interaction state
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.rotation = { x: 0.3, y: 0 };
    this.pivot = null;

    // Callbacks
    this.onBlockClick = null;
    this.onLevelChange = null;

    // GSAP ref
    this.gsap = null;
  }

  async init() {
    // Dynamic imports (Next.js compatible)
    const [threeModule, gsapModule] = await Promise.all([
      import('three'),
      import('gsap').catch(() => null),
    ]);
    this.THREE = threeModule;
    this.gsap = gsapModule?.gsap || gsapModule?.default || null;

    const THREE = this.THREE;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080808);
    this.scene.fog = new THREE.FogExp2(0x080808, 0.03);

    // Camera
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 18);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffd4a8, 1.2);
    sun.position.set(5, 10, 8);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x4488ff, 0.6);
    rim.position.set(-8, -5, -10);
    this.scene.add(rim);

    // Stars background
    this._buildStars();

    // Instanced mesh (1 per slot)
    this._buildInstancedMesh();

    // Pivot for rotation
    this.pivot = new THREE.Group();
    this.pivot.add(this.instancedMesh);
    if (this.instancedMeshGlow) this.pivot.add(this.instancedMeshGlow);
    this.scene.add(this.pivot);

    // Set initial positions (level 1)
    this._applyPositions(1, 1);

    // Events
    this._bindEvents();

    // Start loop
    this._loop();
  }

  _buildStars() {
    const THREE = this.THREE;
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, transparent: true, opacity: 0.5,
    });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  _buildInstancedMesh() {
    const THREE = this.THREE;
    const N = this.slots.length;
    // Block geometry: rounded box
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.04, 1, 1, 1);

    // Per-instance color material
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: false,
      roughness: 0.3,
      metalness: 0.6,
      envMapIntensity: 1.0,
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, N);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Set per-instance color
    const color = new THREE.Color();
    this.slots.forEach((slot, i) => {
      const hex = TIER_COLOR[slot.tier] || '#ffffff';
      color.set(hex);
      // Occupied blocks are brighter
      if (slot.occ) {
        color.multiplyScalar(1.3);
      } else {
        color.multiplyScalar(0.35);
      }
      this.instancedMesh.setColorAt(i, color);
    });
    this.instancedMesh.instanceColor.needsUpdate = true;

    // Glow mesh (additive blend, slightly larger)
    const glowGeo = new THREE.BoxGeometry(0.22, 0.22, 0.06);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.instancedMeshGlow = new THREE.InstancedMesh(glowGeo, glowMat, N);
    this.instancedMeshGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Set glow color
    this.slots.forEach((slot, i) => {
      const hex = TIER_COLOR[slot.tier] || '#ffffff';
      color.set(hex);
      this.instancedMeshGlow.setColorAt(i, color);
    });
    this.instancedMeshGlow.instanceColor.needsUpdate = true;
  }

  _applyPositions(fromLevel, toLevel, t = 1.0) {
    const THREE = this.THREE;
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    this.slots.forEach((slot, i) => {
      const fromPos = this.allLevelPositions[i][Math.round(fromLevel)];
      const toPos = this.allLevelPositions[i][Math.round(toLevel)];

      // Lerp positions
      const x = fromPos.x + (toPos.x - fromPos.x) * t;
      const y = fromPos.y + (toPos.y - fromPos.y) * t;
      const z = fromPos.z + (toPos.z - fromPos.z) * t;

      const baseScale = TIER_3D_SCALE[slot.tier] * 0.5;
      const s = baseScale * (0.7 + 0.3 * t);

      // Orient outward from origin (for sphere levels)
      if (toLevel > 0 && t > 0.3) {
        const forward = new THREE.Vector3(toPos.x, toPos.y, toPos.z).normalize();
        rot.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
        matrix.compose(
          pos.set(x, y, z),
          rot,
          scl.set(s, s, s * 0.3)
        );
      } else {
        matrix.compose(
          pos.set(x, y, z),
          rot.identity(),
          scl.set(s, s, s * 0.3)
        );
      }

      this.instancedMesh.setMatrixAt(i, matrix);
      this.instancedMeshGlow.setMatrixAt(i, matrix);
    });

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMeshGlow.instanceMatrix.needsUpdate = true;
  }

  _loop() {
    if (this.destroyed) return;
    this.animFrame = requestAnimationFrame(() => this._loop());

    // Apply inertia
    if (!this.isDragging) {
      this.rotation.x += this.velocity.x;
      this.rotation.y += this.velocity.y;
      this.velocity.x *= 0.94;
      this.velocity.y *= 0.94;
    }

    // Clamp X rotation
    this.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.rotation.x));

    // Apply rotation to pivot
    if (this.pivot) {
      this.pivot.rotation.x = this.rotation.x;
      this.pivot.rotation.y = this.rotation.y;
    }

    // Auto-rotation when no drag input
    if (!this.isDragging && Math.abs(this.velocity.x) < 0.001 && Math.abs(this.velocity.y) < 0.001) {
      this.rotation.y += 0.002;
    }

    // Lerp level transitions
    if (this.lerpT < 1) {
      this.lerpT = Math.min(1, this.lerpT + 0.04);
      this._applyPositions(this.currentLevel, this.targetLevel, this._ease(this.lerpT));
      if (this.lerpT >= 1) {
        this.currentLevel = this.targetLevel;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  _ease(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  transitionToLevel(newLevel) {
    if (newLevel === this.targetLevel) return;
    this.currentLevel = this.targetLevel;
    this.targetLevel = newLevel;
    this.lerpT = 0;
    if (this.onLevelChange) this.onLevelChange(newLevel);
  }

  /**
   * Raycast click: find which block was clicked, call onBlockClick
   */
  raycast(clientX, clientY) {
    if (!this.camera || !this.instancedMesh) return null;
    const THREE = this.THREE;
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const hits = raycaster.intersectObject(this.instancedMesh);
    if (hits.length > 0) {
      const idx = hits[0].instanceId;
      if (idx !== undefined && this.slots[idx]) {
        return this.slots[idx];
      }
    }
    return null;
  }

  /**
   * Zoom camera to face a specific slot (GSAP-powered)
   */
  zoomToSlot(slotIdx) {
    if (!this.camera || !this.allLevelPositions[slotIdx]) return;
    const THREE = this.THREE;
    const targetPos = this.allLevelPositions[slotIdx][this.targetLevel];
    if (!targetPos) return;

    // Direction from origin to block position
    const dir = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z).normalize();
    const distance = 12;
    const camTarget = dir.multiplyScalar(distance);

    if (this.gsap) {
      this.gsap.to(this.camera.position, {
        x: camTarget.x, y: camTarget.y, z: camTarget.z,
        duration: 1.2,
        ease: 'power3.inOut',
        onUpdate: () => this.camera.lookAt(0, 0, 0),
      });
    } else {
      this.camera.position.set(camTarget.x, camTarget.y, camTarget.z);
      this.camera.lookAt(0, 0, 0);
    }
  }

  resetCamera() {
    if (this.gsap) {
      this.gsap.to(this.camera.position, {
        x: 0, y: 0, z: 18,
        duration: 0.9,
        ease: 'power2.inOut',
        onUpdate: () => this.camera.lookAt(0, 0, 0),
      });
    } else {
      this.camera.position.set(0, 0, 18);
      this.camera.lookAt(0, 0, 0);
    }
  }

  _bindEvents() {
    const canvas = this.canvas;

    // Mouse
    canvas.addEventListener('mousedown', this._onMouseDown = (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.velocity = { x: 0, y: 0 };
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', this._onMouseMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.rotation.y += dx * 0.008;
      this.rotation.x += dy * 0.008;
      this.velocity.x = dy * 0.003;
      this.velocity.y = dx * 0.003;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', this._onMouseUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      canvas.style.cursor = 'grab';

      // Check if it was a click (not a drag)
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
        const slot = this.raycast(e.clientX, e.clientY);
        if (slot && this.onBlockClick) this.onBlockClick(slot);
      }
    });

    // Touch
    canvas.addEventListener('touchstart', this._onTouchStart = (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.velocity = { x: 0, y: 0 };
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', this._onTouchMove = (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouse.x;
      const dy = e.touches[0].clientY - this.lastMouse.y;
      this.rotation.y += dx * 0.008;
      this.rotation.x += dy * 0.008;
      this.velocity.x = dy * 0.003;
      this.velocity.y = dx * 0.003;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    canvas.addEventListener('touchend', this._onTouchEnd = (e) => {
      this.isDragging = false;
      if (e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const slot = this.raycast(t.clientX, t.clientY);
        if (slot && this.onBlockClick) this.onBlockClick(slot);
      }
    });

    // Resize
    window.addEventListener('resize', this._onResize = () => {
      if (!this.canvas || !this.camera || !this.renderer) return;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animFrame);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('resize', this._onResize);
    this.renderer?.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// OVERLAY: Block Detail Modal (2D sur le canvas 3D)
// ─────────────────────────────────────────────────────────────────────────

function BlockOverlay3D({ slot, onClose, onRent, onBuyout }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!slot) return null;
  const c = TIER_COLOR[slot.tier];
  const price = priceEur(slot.tier);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(12px)',
        opacity: entered ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(92vw, 380px)',
          background: U.s1,
          border: `1px solid ${c}30`,
          borderRadius: 20,
          padding: '32px 28px 28px',
          boxShadow: `0 0 60px ${c}20, 0 32px 80px rgba(0,0,0,0.8)`,
          transform: entered ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(12px)',
          transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: '50%',
            border: `1px solid ${U.border}`, background: U.faint,
            color: U.muted, cursor: 'pointer', fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>

        {/* Tier badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', borderRadius: 20,
          background: `${c}15`, border: `1px solid ${c}30`,
          color: c, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          marginBottom: 16,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: 1, background: c }} />
          {TIER_LABEL[slot.tier].toUpperCase()}
        </div>

        {/* Block visual */}
        <div style={{
          width: 72, height: 72, borderRadius: 14, margin: '0 auto 20px',
          background: slot.occ ? (slot.tenant?.b || U.s2) : `${c}12`,
          border: `2px solid ${c}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 32px ${c}30`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {slot.occ && slot.tenant?.img && (
            <img src={slot.tenant.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          )}
          <span style={{ color: c, fontSize: 28, fontWeight: 900, fontFamily: F.h, position: 'relative', zIndex: 1 }}>
            {slot.occ ? slot.tenant?.l : '+'}
          </span>
        </div>

        {/* Info */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {slot.occ ? (
            <>
              <div style={{ color: U.text, fontWeight: 700, fontSize: 18, fontFamily: F.h, marginBottom: 6 }}>
                {slot.tenant?.name || 'Annonceur'}
              </div>
              {slot.tenant?.slogan && (
                <div style={{ color: U.muted, fontSize: 13, lineHeight: 1.5 }}>{slot.tenant.slogan}</div>
              )}
            </>
          ) : (
            <>
              <div style={{ color: U.text, fontWeight: 700, fontSize: 18, fontFamily: F.h, marginBottom: 6 }}>
                Bloc disponible
              </div>
              <div style={{ color: U.muted, fontSize: 13 }}>
                Position ({slot.x}, {slot.y})
              </div>
            </>
          )}
        </div>

        {/* Price tag */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10,
          background: `${c}08`, border: `1px solid ${c}20`,
          marginBottom: 20,
        }}>
          <span style={{ color: c, fontWeight: 800, fontSize: 22, fontFamily: F.h }}>€{price}</span>
          <span style={{ color: U.muted, fontSize: 11 }}>/jour</span>
          <span style={{ color: U.muted, opacity: 0.4 }}>·</span>
          <span style={{ color: U.muted, fontSize: 11 }}>({slot.x},{slot.y})</span>
        </div>

        {/* CTA */}
        {slot.occ ? (
          <>
            {slot.tenant?.url && (
              <a
                href={slot.tenant.url}
                target="_blank" rel="noopener noreferrer"
                onClick={() => recordClick(slot.x, slot.y, slot.tenant?.bookingId)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: c, color: U.accentFg, fontWeight: 700, fontSize: 13,
                  textDecoration: 'none', fontFamily: F.b, marginBottom: 8,
                  boxShadow: `0 0 20px ${c}40`,
                }}
              >
                {slot.tenant.cta || 'Visiter'} →
              </a>
            )}
            <button
              onClick={() => onBuyout?.(slot)}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                background: 'transparent', border: `1px solid ${U.border2}`,
                color: U.muted, fontFamily: F.b, cursor: 'pointer', fontSize: 12,
              }}
            >
              Faire une offre de rachat
            </button>
          </>
        ) : (
          <button
            onClick={() => onRent?.(slot)}
            style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: c, border: 'none', color: U.accentFg,
              fontWeight: 700, fontSize: 14, fontFamily: F.b, cursor: 'pointer',
              boxShadow: `0 0 22px ${c}50`,
            }}
          >
            Réserver ce bloc →
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LEVEL NAVIGATION HUD
// ─────────────────────────────────────────────────────────────────────────

function LevelHUD({ level, onLevelChange, onBack2D }) {
  return (
    <div style={{
      position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      zIndex: 10, pointerEvents: 'none',
    }}>
      {/* Level name */}
      <div style={{
        padding: '5px 14px', borderRadius: 20,
        background: 'rgba(0,0,0,0.75)', border: `1px solid rgba(255,255,255,0.12)`,
        backdropFilter: 'blur(10px)',
        color: U.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        pointerEvents: 'none',
      }}>
        {LEVEL_INFO[level]?.icon} {LEVEL_INFO[level]?.name}
      </div>

      {/* Level dots */}
      <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
        {LEVEL_INFO.map((info, idx) => (
          <button
            key={idx}
            onClick={() => onLevelChange(idx)}
            title={info.name}
            style={{
              width: idx === level ? 28 : 8,
              height: 8,
              borderRadius: 4,
              background: idx === level ? U.accent : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: idx === level ? `0 0 10px ${U.accent}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <div style={{
        fontSize: 9, color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.08em', pointerEvents: 'none',
      }}>
        MOLETTE · FLÈCHES · GLISSER
      </div>
    </div>
  );
}

function LevelArrows({ level, maxLevel, onLevelChange }) {
  return (
    <>
      {level > 1 && (
        <button
          onClick={() => onLevelChange(level - 1)}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%', zIndex: 10,
            background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(255,255,255,0.12)`,
            backdropFilter: 'blur(10px)',
            color: U.text, fontSize: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>
      )}
      {level < maxLevel && (
        <button
          onClick={() => onLevelChange(level + 1)}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%', zIndex: 10,
            background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(255,255,255,0.12)`,
            backdropFilter: 'blur(10px)',
            color: U.text, fontSize: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >›</button>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: View3D
// ─────────────────────────────────────────────────────────────────────────

/**
 * View3D — drop-in replacement for PublicView in app/page.js
 *
 * Props:
 *   slots      — from useGridData() (same as PublicView)
 *   isLive     — boolean
 *   onGoAdvertiser — () => void
 *   onWaitlist    — () => void
 *   onCheckout    — (slot) => void
 *   onBuyout      — (slot) => void
 *   ExistingPublicView — the original PublicView component (passed in)
 */
export default function View3D({
  slots,
  isLive,
  onGoAdvertiser,
  onWaitlist,
  onCheckout,
  onBuyout,
  ExistingPublicView,
}) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const positionsRef = useRef(null);
  const [level, setLevel] = useState(1);        // 0=2D, 1-6=3D
  const [focusSlot, setFocusSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Compute level positions once when slots are ready
  const computedPositions = useMemo(() => {
    if (!slots || slots.length === 0) return null;
    try {
      return computeAllLevelPositions(slots);
    } catch (e) {
      console.error('View3D: position computation failed', e);
      return null;
    }
  }, [slots.length]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!computedPositions || !canvasRef.current || level === 0) return;

    setLoading(true);
    const scene = new Scene3D(canvasRef.current, slots, computedPositions);
    scene.onBlockClick = (slot) => setFocusSlot(slot);
    scene.onLevelChange = (lvl) => setLevel(lvl);

    scene.init()
      .then(() => {
        sceneRef.current = scene;
        positionsRef.current = computedPositions;
        setLoading(false);
      })
      .catch(err => {
        console.error('View3D init error:', err);
        setError('Three.js unavailable — npm install three gsap');
        setLoading(false);
      });

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [computedPositions, level === 0]);

  // Sync level changes to scene
  useEffect(() => {
    if (sceneRef.current && level > 0) {
      sceneRef.current.transitionToLevel(level);
    }
  }, [level]);

  // Keyboard navigation
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        setLevel(l => Math.min(6, l + 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        setLevel(l => Math.max(0, l - 1));
      }
      if (e.key === 'Escape') {
        setFocusSlot(null);
        sceneRef.current?.resetCamera();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Mouse wheel navigation between levels
  const wheelTimeout = useRef(null);
  useEffect(() => {
    const fn = (e) => {
      if (focusSlot) return;
      e.preventDefault();
      clearTimeout(wheelTimeout.current);
      wheelTimeout.current = setTimeout(() => {
        setLevel(l => e.deltaY > 0 ? Math.min(6, l + 1) : Math.max(0, l - 1));
      }, 60);
    };
    const canvas = canvasRef.current;
    if (canvas) canvas.addEventListener('wheel', fn, { passive: false });
    return () => {
      if (canvas) canvas.removeEventListener('wheel', fn);
    };
  }, [focusSlot]);

  const handleLevelChange = useCallback((newLevel) => {
    setFocusSlot(null);
    sceneRef.current?.resetCamera();
    setLevel(newLevel);
  }, []);

  const handleBlockClick = useCallback((slot) => {
    setFocusSlot(slot);
    // Find slot index to zoom camera
    const idx = slots.findIndex(s => s.id === slot.id);
    if (idx !== -1) sceneRef.current?.zoomToSlot(idx);
  }, [slots]);

  const handleCloseOverlay = useCallback(() => {
    setFocusSlot(null);
    sceneRef.current?.resetCamera();
  }, []);

  // ── Level 0: render existing PublicView ─────────────────────────────
  if (level === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {/* Switch to 3D button */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 100,
        }}>
          <button
            onClick={() => setLevel(1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 20,
              background: 'rgba(0,0,0,0.8)', border: `1px solid ${U.accent}40`,
              backdropFilter: 'blur(10px)',
              color: U.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: F.b, boxShadow: `0 0 20px ${U.accent}20`,
            }}
          >
            ● Vue 3D
          </button>
        </div>

        {/* Existing 2D grid — pass all original props through */}
        {ExistingPublicView && (
          <ExistingPublicView
            slots={slots}
            isLive={isLive}
            onGoAdvertiser={onGoAdvertiser}
            onWaitlist={onWaitlist}
          />
        )}
      </div>
    );
  }

  // ── Levels 1-6: Three.js canvas ────────────────────────────────────────
  return (
    <div style={{
      flex: 1, position: 'relative', overflow: 'hidden', background: U.bg,
    }}>
      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: '100%', display: 'block',
          cursor: 'grab', outline: 'none',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Loading state */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: `3px solid ${U.border2}`, borderTopColor: U.accent,
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ color: U.muted, fontSize: 12, letterSpacing: '0.06em' }}>
            INITIALISATION 3D…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 24,
        }}>
          <div style={{ color: U.err, fontSize: 14, fontWeight: 700 }}>⚠ {error}</div>
          <button onClick={() => setLevel(0)} style={{
            padding: '10px 20px', borderRadius: 10,
            background: U.accent, border: 'none', color: U.accentFg,
            fontWeight: 700, cursor: 'pointer', fontFamily: F.b,
          }}>
            Revenir à la grille 2D
          </button>
        </div>
      )}

      {/* Top-left: return to 2D */}
      <button
        onClick={() => handleLevelChange(0)}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 20,
          background: 'rgba(0,0,0,0.7)', border: `1px solid ${U.border2}`,
          backdropFilter: 'blur(10px)',
          color: U.muted, fontSize: 10, fontWeight: 600, cursor: 'pointer',
          fontFamily: F.b, letterSpacing: '0.04em',
        }}
      >
        ◫ 2D
      </button>

      {/* Top-right: tier legend */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {Object.entries(TIER_COLOR).map(([tier, color]) => (
          tier !== 'corner_ten' && (
            <div key={tier} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
              border: `1px solid ${color}25`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}` }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>
                {TIER_LABEL[tier]}
              </span>
              <span style={{ color: color, fontSize: 9, fontWeight: 700 }}>
                €{priceEur(tier)}/j
              </span>
            </div>
          )
        ))}
      </div>

      {/* Arrow navigation */}
      <LevelArrows
        level={level}
        maxLevel={6}
        onLevelChange={handleLevelChange}
      />

      {/* Bottom HUD */}
      <LevelHUD
        level={level}
        onLevelChange={handleLevelChange}
        onBack2D={() => handleLevelChange(0)}
      />

      {/* Block detail overlay */}
      {focusSlot && (
        <BlockOverlay3D
          slot={focusSlot}
          onClose={handleCloseOverlay}
          onRent={(slot) => {
            handleCloseOverlay();
            onCheckout?.(slot);
          }}
          onBuyout={(slot) => {
            handleCloseOverlay();
            onBuyout?.(slot);
          }}
        />
      )}

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
