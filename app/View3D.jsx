'use client';
/**
 * ─── ADS·SQUARE — View3D ────────────────────────────────────────────────────
 * Sphère Évolutive Cosmique — 1 face = 1 bloc
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
  bg: '#020408', text: '#f0f0f0', muted: 'rgba(255,255,255,0.38)',
  accent: '#d4a84b', accentFg: '#080808',
  border: 'rgba(255,255,255,0.09)', border2: 'rgba(255,255,255,0.16)',
  err: '#e05252',
};
const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
};
const priceEur = tier => ((TIER_PRICE[tier] || 100) / 100).toLocaleString('fr-FR');

// ── Tier ordering (pole → equator) ───────────────────────────────────────────
const TIER_ORDER = ['epicenter', 'prestige', 'elite', 'business', 'standard', 'viral'];

// ── Level config ──────────────────────────────────────────────────────────────
const LEVELS = [
  { n: 0, name: 'Grille 2D',   icon: '◫', faces: 0    },
  { n: 1, name: 'Cube',        icon: '⬛', faces: 6    },
  { n: 2, name: 'Octaèdre',    icon: '◆', faces: 8    },
  { n: 3, name: 'Icosaèdre',   icon: '⬡', faces: 20   },
  { n: 4, name: 'Sphère I',    icon: '◎', faces: 80   },
  { n: 5, name: 'Sphère II',   icon: '◉', faces: 320  },
  { n: 6, name: 'Cosmos',      icon: '●', faces: 1280 },
];

const SPHERE_R = 6;

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY BUILDERS
// Chaque builder retourne un tableau de { verts, centroid, isQuad }
// ─────────────────────────────────────────────────────────────────────────────

function buildCubeFaces() {
  const a = SPHERE_R / Math.sqrt(3);
  // 6 faces en quads — ordonnées par centroid.y décroissant (top = epicenter)
  const raw = [
    [[-a, a,-a],[-a, a, a],[ a, a, a],[ a, a,-a]],   // +Y top
    [[ a,-a,-a],[ a,-a, a],[-a,-a, a],[-a,-a,-a]],   // -Y bottom
    [[-a,-a, a],[ a,-a, a],[ a, a, a],[-a, a, a]],   // +Z front
    [[ a,-a,-a],[-a,-a,-a],[-a, a,-a],[ a, a,-a]],   // -Z back
    [[ a,-a, a],[ a, a, a],[ a, a,-a],[ a,-a,-a]],   // +X right
    [[-a,-a,-a],[-a, a,-a],[-a, a, a],[-a,-a, a]],   // -X left
  ];
  return raw.map(vs => ({
    verts: vs,
    centroid: [
      vs.reduce((s,v)=>s+v[0],0)/4,
      vs.reduce((s,v)=>s+v[1],0)/4,
      vs.reduce((s,v)=>s+v[2],0)/4,
    ],
    isQuad: true,
  }));
}

function buildOctaFaces() {
  const R = SPHERE_R;
  const v = [
    [ R, 0, 0], [-R, 0, 0], // 0=+X  1=-X
    [ 0, R, 0], [ 0,-R, 0], // 2=+Y  3=-Y
    [ 0, 0, R], [ 0, 0,-R], // 4=+Z  5=-Z
  ];
  const fi = [
    [2,0,4],[2,4,1],[2,1,5],[2,5,0],  // upper (+Y)
    [3,4,0],[3,1,4],[3,5,1],[3,0,5],  // lower (-Y)
  ];
  return fi.map(([a,b,c]) => {
    const vs = [v[a],v[b],v[c]];
    return {
      verts: vs,
      centroid: [(vs[0][0]+vs[1][0]+vs[2][0])/3, (vs[0][1]+vs[1][1]+vs[2][1])/3, (vs[0][2]+vs[1][2]+vs[2][2])/3],
      isQuad: false,
    };
  });
}

function midOnSphere(a, b) {
  const m = a.map((c,i) => (c+b[i])/2);
  const l = Math.hypot(...m);
  return m.map(c => c/l);
}

function buildIcoFaces(subdivisions) {
  const phi = (1+Math.sqrt(5))/2;
  const rawV = [
    [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
    [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
    [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
  ].map(v => { const l=Math.hypot(...v); return v.map(c=>c/l); });

  let faces = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
  ].map(f => f.map(i => rawV[i]));

  for (let s=0; s<subdivisions; s++) {
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
    return {
      verts: vs,
      centroid: [(vs[0][0]+vs[1][0]+vs[2][0])/3,(vs[0][1]+vs[1][1]+vs[2][1])/3,(vs[0][2]+vs[1][2]+vs[2][2])/3],
      isQuad: false,
    };
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
  if (!slot) return [0.012,0.015,0.025];
  const [r,g,b]=hexToRgb(TIER_COLOR[slot.tier]||'#555');
  const br=slot.occ?1.0:0.15;
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
// SCENE 3D CLASS
// ─────────────────────────────────────────────────────────────────────────────

class Scene3D {
  constructor(canvas) {
    this.canvas=canvas; this.T=null; this.G=null;
    this.renderer=null; this.scene=null; this.camera=null;
    this.mesh=null; this.stars=null; this.atmo=null; this.epicLight=null;
    this.raycaster=null; this.triToFace=null; this.faceSlots=[];
    this.rot={x:0.25,y:0}; this.vel={x:0,y:0};
    this.isDragging=false; this.touchStart=null; this.pinchDist=null;
    this.zoomTarget=22; this.zoomCurrent=22;
    this.animId=null; this.transitioning=false;
    this.onFaceClick=null; this._h={};
  }

  async init(THREE, GSAP) {
    this.T=THREE; this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;

    // Renderer
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(W,H,false);
    this.renderer.setClearColor(0x020408,1);

    // Scene + fog
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x020408,0.015);

    // Camera
    this.camera=new THREE.PerspectiveCamera(45,W/H,0.1,600);
    this.camera.position.z=this.zoomCurrent;

    // Raycaster
    this.raycaster=new THREE.Raycaster();

    // Lights
    this.scene.add(new THREE.AmbientLight(0x080c1a,2.5));

    const sun=new THREE.DirectionalLight(0xffffff,2.0);
    sun.position.set(12,18,14);
    this.scene.add(sun);

    const fill=new THREE.PointLight(0x2244bb,1.0,140);
    fill.position.set(-20,-8,-15);
    this.scene.add(fill);

    const rim=new THREE.PointLight(0x7722cc,0.7,90);
    rim.position.set(5,-15,20);
    this.scene.add(rim);

    // Epicenter gold light — north pole
    this.epicLight=new THREE.PointLight(0xd4a84b,0,35);
    this.epicLight.position.set(0,8,0);
    this.scene.add(this.epicLight);

    this._buildStars();
    this._buildAtmosphere();
    this._bindEvents();
    this._animate();
  }

  _buildStars() {
    const T=this.T, N=4500;
    const pos=new Float32Array(N*3), col=new Float32Array(N*3);
    for (let i=0;i<N;i++) {
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      const r=80+Math.random()*160;
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2]=r*Math.cos(phi);
      const t=Math.random();
      col[i*3]=0.7+t*0.3; col[i*3+1]=0.75+t*0.15; col[i*3+2]=0.88+t*0.12;
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.stars=new T.Points(geo,new T.PointsMaterial({
      size:0.2,vertexColors:true,transparent:true,opacity:0.88,sizeAttenuation:true,
    }));
    this.scene.add(this.stars);
  }

  _buildAtmosphere() {
    const T=this.T;
    // Inner glow sphere
    this.atmo=new T.Mesh(
      new T.SphereGeometry(SPHERE_R+0.22,48,48),
      new T.MeshBasicMaterial({color:0x1a3080,transparent:true,opacity:0.10,side:T.BackSide})
    );
    this.scene.add(this.atmo);
    // Outer halo
    this.scene.add(new T.Mesh(
      new T.SphereGeometry(SPHERE_R+1.4,24,24),
      new T.MeshBasicMaterial({color:0x080d28,transparent:true,opacity:0.05,side:T.BackSide})
    ));
  }

  _buildMesh(assignedFaces) {
    const T=this.T;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh=null;
    }
    if (!assignedFaces?.length) return;

    this.faceSlots=assignedFaces.map(f=>f.slot||null);
    const {positions,colors,triToFace}=buildBufferData(assignedFaces);
    this.triToFace=triToFace;

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(positions,3));
    geo.setAttribute('color',new T.BufferAttribute(colors,3));
    geo.computeVertexNormals();

    const mat=new T.MeshPhongMaterial({
      vertexColors:true,
      flatShading:true,
      side:T.DoubleSide,
      shininess:50,
      specular:new T.Color(0x1a2840),
    });

    this.mesh=new T.Mesh(geo,mat);
    this.mesh.rotation.x=this.rot.x;
    this.mesh.rotation.y=this.rot.y;
    this.scene.add(this.mesh);

    // Epicenter pulse light
    const hasEpic=assignedFaces[0]?.slot?.tier==='epicenter';
    this.epicLight.intensity=hasEpic?1.5:0;
  }

  setFaces(assignedFaces,animate=false) {
    if (!animate) { this._buildMesh(assignedFaces); return; }
    if (this.transitioning) { this._buildMesh(assignedFaces); return; }
    this.transitioning=true;
    const G=this.G;

    const doSwap=()=>{
      this._buildMesh(assignedFaces);
      if (this.mesh) {
        this.mesh.scale.set(0,0,0);
        G.to(this.mesh.scale,{x:1,y:1,z:1,duration:0.45,ease:'back.out(1.7)',
          onComplete:()=>{this.transitioning=false;}});
      } else { this.transitioning=false; }
    };

    if (this.mesh) {
      G.to(this.mesh.scale,{x:0,y:0,z:0,duration:0.22,ease:'power2.in',onComplete:doSwap});
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
      this.rot.y+=0.0007; // auto-rotate
    }

    if (this.mesh) { this.mesh.rotation.x=this.rot.x; this.mesh.rotation.y=this.rot.y; }
    if (this.atmo)  this.atmo.rotation.y=t*0.003;
    if (this.stars) { this.stars.rotation.y=t*0.0012; this.stars.rotation.x=Math.sin(t*0.0002)*0.04; }

    // Smooth zoom
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.07;
    this.camera.position.z=this.zoomCurrent;

    // Epicenter pulse
    if (this.epicLight?.intensity>0) {
      this.epicLight.intensity=1.2+Math.sin(t*1.8)*0.6;
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
    if (this.renderer) this.renderer.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const LevelDots = memo(function LevelDots({ level, onLevel }) {
  return (
    <div style={{
      position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
      display:'flex', alignItems:'center', gap:5, zIndex:30,
      padding:'7px 14px', borderRadius:40,
      background:'rgba(2,4,8,0.78)', backdropFilter:'blur(14px)',
      border:'1px solid rgba(255,255,255,0.07)',
    }}>
      {LEVELS.map(lv=>{
        const active=lv.n===level;
        const c=active?U.accent:'rgba(255,255,255,0.25)';
        return (
          <button key={lv.n} onClick={()=>onLevel(lv.n)}
            title={`${lv.icon} ${lv.name}${lv.faces?` · ${lv.faces} blocs`:''}`}
            style={{
              width:active?28:17, height:active?28:17,
              borderRadius:'50%', border:`1.5px solid ${c}`,
              background:active?`${U.accent}18`:'transparent',
              color:c, fontSize:active?10:8, fontWeight:700,
              cursor:'pointer', transition:'all 0.22s cubic-bezier(.34,1.56,.64,1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:F.b, boxShadow:active?`0 0 14px ${U.accent}55`:'none',
              padding:0, flexShrink:0,
            }}
          >
            {active?lv.icon:lv.n}
          </button>
        );
      })}
    </div>
  );
});

const TierLegend = memo(function TierLegend({ level, faceCount }) {
  return (
    <div style={{ position:'absolute', top:12, right:12, zIndex:30, display:'flex', flexDirection:'column', gap:3 }}>
      {level>0 && (
        <div style={{
          padding:'3px 10px', borderRadius:20, marginBottom:4,
          background:'rgba(2,4,8,0.78)', backdropFilter:'blur(10px)',
          border:`1px solid ${U.accent}28`,
          color:U.accent, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textAlign:'right',
        }}>
          {LEVELS[level]?.icon} {LEVELS[level]?.name}
          <span style={{color:U.muted,fontWeight:400}}> · {faceCount} blocs</span>
        </div>
      )}
      {TIER_ORDER.filter(t=>TIER_COLOR[t]).map(tier=>(
        <div key={tier} style={{
          display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:20,
          background:'rgba(2,4,8,0.72)', backdropFilter:'blur(8px)',
          border:`1px solid ${TIER_COLOR[tier]}18`,
        }}>
          <div style={{width:7,height:7,borderRadius:2,background:TIER_COLOR[tier],boxShadow:`0 0 5px ${TIER_COLOR[tier]}99`,flexShrink:0}} />
          <span style={{color:'rgba(255,255,255,0.42)',fontSize:9,fontWeight:600,letterSpacing:'0.05em'}}>{TIER_LABEL[tier]}</span>
          <span style={{color:TIER_COLOR[tier],fontSize:9,fontWeight:700}}>€{priceEur(tier)}/j</span>
        </div>
      ))}
    </div>
  );
});

function ZoomHint() {
  const [vis, setVis] = useState(true);
  useEffect(()=>{ const t=setTimeout(()=>setVis(false),4500); return()=>clearTimeout(t); },[]);
  return (
    <div style={{
      position:'absolute', bottom:60, left:'50%', transform:'translateX(-50%)',
      color:'rgba(255,255,255,0.3)', fontSize:10, letterSpacing:'0.06em', zIndex:20,
      opacity:vis?1:0, transition:'opacity 1s', fontFamily:F.b, pointerEvents:'none',
      whiteSpace:'nowrap',
    }}>
      ↕ molette = zoom · glisser = tourner · clic = détails
    </div>
  );
}

function BlockOverlay3D({ slot, onClose, onRent, onBuyout }) {
  if (!slot) return null;
  const color=TIER_COLOR[slot.tier]||U.accent;
  const label=TIER_LABEL[slot.tier]||slot.tier;
  const price=priceEur(slot.tier);

  return (
    <div onClick={onClose} style={{
      position:'absolute', inset:0, zIndex:50,
      background:'rgba(0,0,0,0.78)', backdropFilter:'blur(20px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:288, borderRadius:22, overflow:'hidden',
        background:'rgba(8,10,20,0.97)',
        border:`1px solid ${color}28`,
        boxShadow:`0 0 70px ${color}18, 0 28px 70px rgba(0,0,0,0.8)`,
      }}>
        {/* Color bar */}
        <div style={{height:5,background:`linear-gradient(90deg,${color},${color}44)`}} />

        <div style={{padding:'18px 20px 22px'}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:6,
              padding:'3px 11px',borderRadius:20,
              background:`${color}12`,border:`1px solid ${color}30`,
            }}>
              <div style={{width:7,height:7,borderRadius:2,background:color,boxShadow:`0 0 6px ${color}`}} />
              <span style={{color,fontSize:10,fontWeight:800,letterSpacing:'0.07em',fontFamily:F.b}}>{label}</span>
            </div>
            <button onClick={onClose} style={{
              width:26,height:26,borderRadius:'50%',
              background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.10)',
              color:U.muted,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            }}>×</button>
          </div>

          {/* Icon */}
          <div style={{
            width:54,height:54,borderRadius:14,marginBottom:14,
            background:slot.occ?`${color}15`:'rgba(255,255,255,0.025)',
            border:`2px solid ${color}${slot.occ?'45':'18'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:20,fontWeight:900,color,fontFamily:F.h,
            boxShadow:slot.occ?`0 0 22px ${color}28`:'none',
          }}>
            {slot.tenant?.l||(slot.occ?'◉':'○')}
          </div>

          <div style={{color:U.text,fontSize:14,fontWeight:700,fontFamily:F.h,marginBottom:4}}>
            {slot.occ?(slot.tenant?.name||`Bloc ${label}`):`Emplacement ${label} disponible`}
          </div>
          <div style={{color:U.muted,fontSize:11,marginBottom:16,fontFamily:F.b}}>
            {slot.occ?(slot.tenant?.cta||'Bloc occupé'): `Visible de toute la grille · À partir de €${price}/jour`}
          </div>

          {/* Price */}
          <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:18}}>
            <span style={{color,fontSize:24,fontWeight:800,fontFamily:F.h}}>€{price}</span>
            <span style={{color:U.muted,fontSize:11,fontFamily:F.b}}>/jour</span>
          </div>

          {/* CTA */}
          {!slot.occ ? (
            <button onClick={()=>onRent(slot)} style={{
              width:'100%',padding:'12px 0',borderRadius:12,
              background:`linear-gradient(135deg,${color},${color}99)`,
              border:'none',color:U.accentFg,fontSize:13,fontWeight:800,
              fontFamily:F.b,cursor:'pointer',boxShadow:`0 0 24px ${color}45`,
            }}>
              Réserver ce bloc →
            </button>
          ) : (
            <button onClick={()=>onBuyout(slot)} style={{
              width:'100%',padding:'12px 0',borderRadius:12,
              background:'rgba(255,255,255,0.04)',
              border:`1px solid ${color}25`,color:U.muted,
              fontSize:12,fontWeight:600,fontFamily:F.b,cursor:'pointer',
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
  slots=[], isLive=false,
  onGoAdvertiser, onWaitlist, onCheckout, onBuyout,
  ExistingPublicView,
}) {
  const canvasRef  = useRef(null);
  const sceneRef   = useRef(null);
  const [level, setLevel]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [focusSlot, setFocusSlot] = useState(null);

  // Slots triés une fois
  const sortedSlots = useMemo(()=>sortSlotsByTier(slots),[slots]);

  // Faces assignées pour le niveau courant
  const assignedFaces = useMemo(()=>{
    if (level===0) return [];
    const poleFaces=sortFacesByPole(getFacesForLevel(level));
    return poleFaces.map((face,i)=>({
      ...face,
      slot:sortedSlots[i]||null,
      color:faceColor(sortedSlots[i]||null),
    }));
  },[level,sortedSlots]);

  // Init Three.js (une seule fois quand on passe en mode 3D)
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

  // Mettre à jour les faces quand niveau ou slots changent
  useEffect(()=>{
    if (!sceneRef.current||level===0) return;
    sceneRef.current.setFaces(assignedFaces,true);
  },[assignedFaces,level]);

  // Clavier
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

  // Molette = zoom uniquement
  useEffect(()=>{
    const fn=(e)=>{ e.preventDefault(); sceneRef.current?.zoom(e.deltaY); };
    const canvas=canvasRef.current;
    if (canvas) canvas.addEventListener('wheel',fn,{passive:false});
    return()=>{ if(canvas) canvas.removeEventListener('wheel',fn); };
  },[level]);

  // Resize observer
  useEffect(()=>{
    if (!canvasRef.current) return;
    const ro=new ResizeObserver(()=>sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return()=>ro.disconnect();
  },[]);

  const handleLevel = useCallback((n)=>{ setFocusSlot(null); setLevel(n); },[]);

  // ── Niveau 0 : grille 2D ────────────────────────────────────────────────────
  if (level===0) {
    return (
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <button onClick={()=>handleLevel(1)} style={{
          position:'absolute',top:10,right:10,zIndex:100,
          display:'flex',alignItems:'center',gap:7,
          padding:'7px 16px',borderRadius:20,
          background:'rgba(0,0,0,0.88)',border:`1px solid ${U.accent}40`,
          backdropFilter:'blur(10px)',color:U.accent,
          fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F.b,
          boxShadow:`0 0 22px ${U.accent}25`,
        }}>
          ● Vue Cosmos 3D
        </button>
        {ExistingPublicView&&(
          <ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>
        )}
      </div>
    );
  }

  // ── Niveaux 1–6 : Three.js ──────────────────────────────────────────────────
  const faceCount=LEVELS[level]?.faces||0;

  return (
    <div style={{flex:1,position:'relative',overflow:'hidden',background:U.bg}}>
      <canvas
        ref={canvasRef}
        style={{
          width:'100%',height:'100%',display:'block',outline:'none',
          cursor:focusSlot?'default':'grab',
          opacity:loading?0:1,transition:'opacity 0.5s ease',
        }}
      />

      {/* Loading */}
      {loading&&!error&&(
        <div style={{
          position:'absolute',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',gap:16,background:U.bg,
        }}>
          <div style={{
            width:36,height:36,borderRadius:'50%',
            border:'2px solid rgba(255,255,255,0.07)',borderTopColor:U.accent,
            animation:'spin3d 0.9s linear infinite',
          }}/>
          <div style={{color:U.muted,fontSize:11,letterSpacing:'0.1em',fontFamily:F.b}}>INITIALISATION COSMOS…</div>
        </div>
      )}

      {/* Error */}
      {error&&(
        <div style={{
          position:'absolute',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',gap:12,padding:24,background:U.bg,
        }}>
          <div style={{color:U.err,fontSize:13,fontWeight:700}}>⚠ {error}</div>
          <button onClick={()=>handleLevel(0)} style={{
            padding:'10px 20px',borderRadius:10,background:U.accent,
            border:'none',color:U.accentFg,fontWeight:700,cursor:'pointer',fontFamily:F.b,
          }}>Revenir à la grille 2D</button>
        </div>
      )}

      {/* Top-left: retour 2D */}
      <button onClick={()=>handleLevel(0)} style={{
        position:'absolute',top:12,left:12,zIndex:30,
        display:'flex',alignItems:'center',gap:6,
        padding:'6px 13px',borderRadius:20,
        background:'rgba(2,4,8,0.78)',border:`1px solid ${U.border2}`,
        backdropFilter:'blur(10px)',color:U.muted,
        fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:F.b,letterSpacing:'0.04em',
      }}>
        ◫ Vue 2D
      </button>

      {/* Légende tiers + nom du niveau */}
      <TierLegend level={level} faceCount={faceCount}/>

      {/* Dots de navigation */}
      <LevelDots level={level} onLevel={handleLevel}/>

      {/* Hint zoom (disparaît après 4.5s) */}
      {!loading&&<ZoomHint/>}

      {/* Overlay détail bloc */}
      {focusSlot&&(
        <BlockOverlay3D
          slot={focusSlot}
          onClose={()=>setFocusSlot(null)}
          onRent={(s)=>{ setFocusSlot(null); onCheckout?.(s); }}
          onBuyout={(s)=>{ setFocusSlot(null); onBuyout?.(s); }}
        />
      )}

      <style>{`@keyframes spin3d{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}