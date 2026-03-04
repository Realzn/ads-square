'use client';
// app/cinema/page.js — DYSON SPHERE CINEMA STUDIO ◈ VERSION AAA
// 1 296 panneaux sur la sphère complète · Étoile centrale · Anneaux orbitaux
// Vent solaire · Nébuleuse · Faisceaux énergie · Encodage HDR 4K

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { getSupabaseClient } from '../../lib/supabase';
import { TIER_COLOR, TIER_LABEL, getTier, GRID_COLS, GRID_ROWS } from '../../lib/grid';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTES
// ═══════════════════════════════════════════════════════════════════

const GOLD        = '#f0b429';
const BG          = '#03030c';
const SPHERE_R    = 9.4;
const PANEL_COUNT = GRID_COLS * GRID_ROWS; // 1 296

const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_META  = {
  epicenter:{ label:'ÉPICENTRE', price:'€1 000/j', icon:'☀' },
  prestige: { label:'PRESTIGE',  price:'€100/j',   icon:'◈' },
  elite:    { label:'ELITE',     price:'€50/j',     icon:'◆' },
  business: { label:'BUSINESS',  price:'€10/j',     icon:'◉' },
  standard: { label:'STANDARD',  price:'€3/j',      icon:'○' },
  viral:    { label:'VIRAL',     price:'€1/j',      icon:'·' },
};

const CAM_PRESETS = [
  { id:'overview', label:'VUE GLOBALE',  h:20,  v:18,  z:32, fov:42 },
  { id:'equator',  label:'ÉQUATEUR',     h:0,   v:0,   z:26, fov:38 },
  { id:'pole_n',   label:'PÔLE NORD',    h:0,   v:85,  z:24, fov:38 },
  { id:'pole_s',   label:'PÔLE SUD',     h:0,   v:-85, z:24, fov:38 },
  { id:'epic',     label:'ÉPICENTRE',    h:3,   v:2,   z:14, fov:28 },
  { id:'cinema',   label:'CINÉMA',       h:-28, v:22,  z:34, fov:30 },
  { id:'inside',   label:'INTÉRIEUR',    h:25,  v:10,  z:5,  fov:80 },
  { id:'pano',     label:'PANORAMA',     h:45,  v:30,  z:55, fov:55 },
  { id:'macro',    label:'MACRO PANEL',  h:5,   v:3,   z:12, fov:22 },
  { id:'dutch',    label:'DUTCH ANGLE',  h:30,  v:15,  z:30, fov:36 },
];

const VIDEO_FORMATS = [
  { id:'vp9_hdr', label:'VP9 WebM · HDR 10-bit', mime:'video/webm;codecs=vp9', ext:'webm', hdr:true,  mbps:80 },
  { id:'vp9_sdr', label:'VP9 WebM · SDR',         mime:'video/webm;codecs=vp9', ext:'webm', hdr:false, mbps:40 },
  { id:'vp8',     label:'VP8 WebM · Compatible',  mime:'video/webm;codecs=vp8', ext:'webm', hdr:false, mbps:20 },
  { id:'mp4',     label:'H.264 MP4',              mime:'video/mp4',             ext:'mp4',  hdr:false, mbps:16 },
];
const VIDEO_RES = [
  { id:'4k',   w:3840, h:2160, fps:30, label:'4K UHD'   },
  { id:'2k',   w:2560, h:1440, fps:60, label:'2K QHD'   },
  { id:'1080', w:1920, h:1080, fps:60, label:'1080p FHD' },
  { id:'720',  w:1280, h:720,  fps:60, label:'720p HD'   },
];

const ENVS = {
  cosmos:     { sky:'#000008', fog:null,      name:'COSMOS',        stars:true  },
  deep_nebula:{ sky:'#01000f', fog:'#01000f', fogD:0.006, name:'NÉBULEUSE',  stars:true  },
  void_black: { sky:'#000000', fog:null,      name:'VOID ABSOLU',   stars:false },
  nova_red:   { sky:'#0c0000', fog:'#0c0000', fogD:0.009, name:'NOVA ROUGE', stars:true  },
  cyber:      { sky:'#000d0d', fog:'#000d0d', fogD:0.007, name:'CYBER',      stars:true  },
  dawn:       { sky:'#050208', fog:null,      name:'AUBE VIOLETTE', stars:true  },
};

const LUTS = [
  { id:'none',     label:'AUCUN',         filter:'none' },
  { id:'cinema',   label:'CINÉMA',        filter:'contrast(1.12) saturate(0.88) sepia(0.07)' },
  { id:'scifi',    label:'SCI-FI',        filter:'saturate(1.4) hue-rotate(15deg) contrast(1.1)' },
  { id:'imax',     label:'IMAX',          filter:'contrast(1.2) brightness(1.06) saturate(1.15)' },
  { id:'coldwar',  label:'GUERRE FROIDE', filter:'saturate(0.6) contrast(1.3) sepia(0.12)' },
  { id:'neon',     label:'NEON',          filter:'saturate(2.0) hue-rotate(8deg) contrast(1.08)' },
  { id:'warmgold', label:'DORÉ CHAUD',    filter:'hue-rotate(-10deg) saturate(1.4) brightness(1.04)' },
];

const INIT = {
  cH:20, cV:18, zoom:32, fov:42, roll:0,
  autoRot:false, rotSpeed:0.25,
  dofOn:false, dofBlur:3,
  starI:8, starPulse:true, starColor:'#fff8cc',
  coronaI:1.4, coronaColor:'#ffaa22',
  ringsOn:true, ringSpeed:1, ringOpacity:0.65,
  panelGlow:1.2, waveOn:true, waveSpeed:0.8,
  beamsOn:true, beamOpacity:0.3,
  filterTier:'all',
  env:'cosmos', fogOn:true, nebulaOn:true,
  vignette:0.55, grain:0.18, chrAb:false,
  brightness:1, contrast:1, saturation:1, exposure:1.4, lut:'none',
  vidFmt:'vp9_hdr', vidRes:'4k', vidDur:15,
};

// ═══════════════════════════════════════════════════════════════════
//  SCENE BUILDERS
// ═══════════════════════════════════════════════════════════════════

function gridToSphere(gx, gy, r) {
  var R     = r !== undefined ? r : SPHERE_R;
  var theta = ((gx - 1 + 0.5) / GRID_COLS) * Math.PI * 2;
  var phi   = ((gy - 1 + 0.5) / GRID_ROWS) * Math.PI;
  var sinP  = Math.sin(phi);
  return { x: R*sinP*Math.cos(theta), y: R*Math.cos(phi), z: R*sinP*Math.sin(theta), phi: phi, sinPhi: sinP };
}

function buildNebula() {
  var W = 2048, H = 1024;
  var cv = document.createElement('canvas'); cv.width=W; cv.height=H;
  var ctx = cv.getContext('2d');
  ctx.fillStyle='#000008'; ctx.fillRect(0,0,W,H);
  // Nebula clouds
  var clouds = [
    [400,300,500,350,'rgba(15,5,80,0.55)'],[1400,700,600,400,'rgba(50,0,30,0.45)'],
    [900,200,700,300,'rgba(0,10,60,0.40)'],[1700,300,400,500,'rgba(5,30,50,0.35)'],
    [300,750,450,300,'rgba(30,5,60,0.30)'],[1100,600,350,280,'rgba(0,40,40,0.28)'],
  ];
  clouds.forEach(function(c) {
    var g = ctx.createRadialGradient(c[0],c[1],0,c[0],c[1],Math.max(c[2],c[3]));
    g.addColorStop(0,c[4]); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.beginPath();
    ctx.ellipse(c[0],c[1],c[2],c[3],0,0,Math.PI*2); ctx.fill();
  });
  // Stars
  for (var i=0; i<3000; i++) {
    var x=Math.random()*W, y=Math.random()*H, r=Math.random()*1.1;
    var b=0.2+Math.random()*0.8;
    ctx.fillStyle='rgba('+(200+Math.round(Math.random()*55))+','+(200+Math.round(Math.random()*55))+','+(220+Math.round(Math.random()*35))+','+b.toFixed(2)+')';
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  // Bright stars
  for (var j=0; j<45; j++) {
    var bx=Math.random()*W, by=Math.random()*H, br=1.2+Math.random()*1.8;
    ctx.save(); ctx.shadowBlur=10; ctx.shadowColor='#aaccff';
    ctx.fillStyle='rgba(255,255,255,'+(0.5+Math.random()*0.5).toFixed(2)+')';
    ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  var geo = new THREE.SphereGeometry(100,32,32); geo.scale(-1,1,1);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(cv), side:THREE.BackSide, depthWrite:false }));
}

function buildStar() {
  var group = new THREE.Group();
  var coreMat = new THREE.MeshStandardMaterial({ color:'#ffffff', emissive:new THREE.Color('#fff8cc'), emissiveIntensity:10, roughness:1, metalness:0 });
  var core = new THREE.Mesh(new THREE.SphereGeometry(1.35,32,32), coreMat);
  group.add(core);
  var halo1 = new THREE.Mesh(new THREE.SphereGeometry(2.2,16,16),
    new THREE.MeshBasicMaterial({ color:'#ffee88', transparent:true, opacity:0.12, blending:THREE.AdditiveBlending, depthWrite:false }));
  group.add(halo1);
  var halo2 = new THREE.Mesh(new THREE.SphereGeometry(3.8,12,12),
    new THREE.MeshBasicMaterial({ color:'#ff8800', transparent:true, opacity:0.04, blending:THREE.AdditiveBlending, depthWrite:false }));
  group.add(halo2);
  var keyLight  = new THREE.PointLight('#fff5cc', 8, 120);
  var warmLight = new THREE.PointLight('#ff9944', 3, 55);
  group.add(keyLight, warmLight);
  return { group:group, core:core, halo1:halo1, halo2:halo2, keyLight:keyLight, warmLight:warmLight, coreMat:coreMat };
}

function buildDysonPanels(bookings) {
  var bks = bookings || [];
  var occMap = new Map(bks.map(function(b){ return [b.x+','+b.y, b]; }));
  var COUNT  = PANEL_COUNT;
  var panelGeo = new THREE.PlaneGeometry(1,1);
  var glowGeo  = new THREE.PlaneGeometry(1,1);
  var panelMat = new THREE.MeshStandardMaterial({ metalness:0.82, roughness:0.22 });
  var glowMat  = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending });
  var panels   = new THREE.InstancedMesh(panelGeo, panelMat, COUNT);
  var glows    = new THREE.InstancedMesh(glowGeo,  glowMat,  COUNT);
  var dummy    = new THREE.Object3D();
  var cP       = new THREE.Color();
  var cG       = new THREE.Color();
  var panelData = [];
  var idx = 0;
  for (var gy=1; gy<=GRID_ROWS; gy++) {
    for (var gx=1; gx<=GRID_COLS; gx++) {
      var sph  = gridToSphere(gx, gy);
      var tier = getTier(gx, gy);
      var occ  = occMap.get(gx+','+gy);
      var tC   = new THREE.Color(occ && occ.primary_color ? occ.primary_color : (TIER_COLOR[tier] || '#1a2040'));
      var latS = Math.max(0.06, sph.sinPhi) * 1.05;
      dummy.position.set(sph.x, sph.y, sph.z);
      dummy.lookAt(0,0,0); dummy.rotateY(Math.PI);
      dummy.scale.set(latS*0.90, 0.90, 1); dummy.updateMatrix();
      panels.setMatrixAt(idx, dummy.matrix);
      dummy.scale.set(latS*0.97, 0.97, 1); dummy.updateMatrix();
      glows.setMatrixAt(idx, dummy.matrix);
      cP.copy(tC).multiplyScalar(occ ? 0.55 : 0.12); panels.setColorAt(idx, cP);
      cG.copy(tC);                                    glows.setColorAt(idx, cG);
      panelData.push({ gx:gx, gy:gy, tier:tier, occ:!!occ, baseColor:tC.clone(), phi:sph.phi, idx:idx });
      idx++;
    }
  }
  panels.instanceMatrix.needsUpdate = true; panels.instanceColor.needsUpdate = true;
  glows.instanceMatrix.needsUpdate  = true; glows.instanceColor.needsUpdate  = true;
  return { panels:panels, glows:glows, panelData:panelData };
}

function buildOrbitalRings() {
  var cfgs = [
    { r:12.2, tube:0.038, segs:160, rot:[0,0,0],                         color:'#f0b429', alpha:0.70, speed:0.0028  },
    { r:11.5, tube:0.025, segs:140, rot:[Math.PI/4,0,0],                 color:'#ff4d8f', alpha:0.55, speed:-0.0042 },
    { r:13.0, tube:0.020, segs:160, rot:[0,Math.PI/5,Math.PI/6],         color:'#00d9f5', alpha:0.50, speed:0.0018  },
    { r:10.8, tube:0.016, segs:120, rot:[Math.PI/2,Math.PI/3,0],         color:'#a855f7', alpha:0.42, speed:-0.0060 },
    { r:14.0, tube:0.010, segs:180, rot:[Math.PI/6,Math.PI/4,Math.PI/3], color:'#00e8a2', alpha:0.30, speed:0.0012  },
  ];
  return cfgs.map(function(cfg) {
    var mat  = new THREE.MeshBasicMaterial({ color:cfg.color, transparent:true, opacity:cfg.alpha, blending:THREE.AdditiveBlending, depthWrite:false });
    var mesh = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, cfg.tube, 6, cfg.segs), mat);
    mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    mesh.userData.speed = cfg.speed; mesh.userData.baseOpacity = cfg.alpha;
    return mesh;
  });
}

function buildSolarWind(n) {
  var COUNT = n || 2500;
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(COUNT*3);
  var col = new Float32Array(COUNT*3);
  var vel = [];
  for (var i=0; i<COUNT; i++) {
    var r  = 1.5+Math.random()*11;
    var th = Math.random()*Math.PI*2, ph = Math.random()*Math.PI;
    var nx = Math.sin(ph)*Math.cos(th), ny = Math.cos(ph), nz = Math.sin(ph)*Math.sin(th);
    var spd = 0.012+Math.random()*0.028;
    pos[i*3]=nx*r; pos[i*3+1]=ny*r; pos[i*3+2]=nz*r;
    vel.push({ nx:nx,ny:ny,nz:nz,spd:spd,maxR:10+Math.random()*3 });
    var t2 = r/13; col[i*3]=1-t2*0.3; col[i*3+1]=0.8-t2*0.4; col[i*3+2]=0.3+t2*0.4;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col,3));
  var mat = new THREE.PointsMaterial({ size:0.038, vertexColors:true, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false });
  var pts = new THREE.Points(geo, mat); pts.userData.vel = vel;
  return pts;
}

function tickSolarWind(pts) {
  var pos = pts.geometry.attributes.position;
  var vel = pts.userData.vel;
  for (var i=0; i<vel.length; i++) {
    var v = vel[i];
    pos.array[i*3]  +=v.nx*v.spd; pos.array[i*3+1]+=v.ny*v.spd; pos.array[i*3+2]+=v.nz*v.spd;
    var r2 = pos.array[i*3]*pos.array[i*3]+pos.array[i*3+1]*pos.array[i*3+1]+pos.array[i*3+2]*pos.array[i*3+2];
    if (r2>v.maxR*v.maxR) {
      var r0=1.2+Math.random()*0.8; pos.array[i*3]=v.nx*r0; pos.array[i*3+1]=v.ny*r0; pos.array[i*3+2]=v.nz*r0;
    }
  }
  pos.needsUpdate=true;
}

function buildEnergyBeams(bookings) {
  if (!bookings || !bookings.length) return null;
  var pts=[], cols=[];
  var warm = new THREE.Color('#ffe8aa');
  bookings.forEach(function(b) {
    var sph = gridToSphere(b.x||1, b.y||1, SPHERE_R*0.96);
    var tc  = new THREE.Color(b.primary_color || TIER_COLOR[getTier(b.x||1,b.y||1)] || GOLD);
    pts.push(0,0,0); cols.push(warm.r,warm.g,warm.b);
    pts.push(sph.x,sph.y,sph.z); cols.push(tc.r*0.8,tc.g*0.8,tc.b*0.8);
  });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(cols,3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false }));
}

function buildCosmicDust() {
  var n=800, pos=new Float32Array(n*3);
  for (var i=0; i<n; i++) {
    var r=15+Math.random()*20, th=Math.random()*Math.PI*2, ph=Math.random()*Math.PI;
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.cos(ph); pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
  }
  var geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color:'#3a4070',size:0.06,transparent:true,opacity:0.4,blending:THREE.AdditiveBlending,depthWrite:false }));
}

// ═══════════════════════════════════════════════════════════════════
//  UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Sl({ label, value, min, max, step, unit, onChange, accent }) {
  var a = accent || GOLD, s = step || 0.01, u = unit || '';
  var disp = s < 1 ? value.toFixed(2) : Math.round(value);
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:8.5, color:'#3e4468', letterSpacing:1, fontFamily:'monospace' }}>{label}</span>
        <span style={{ fontSize:8.5, color:a, fontFamily:'monospace' }}>{disp}{u}</span>
      </div>
      <input type="range" min={min} max={max} step={s} value={value}
        onChange={function(e){ onChange(parseFloat(e.target.value)); }}
        style={{ width:'100%', accentColor:a, cursor:'pointer', height:3 }} />
    </div>
  );
}

function Tog({ label, value, onChange, accent }) {
  var a = accent || GOLD;
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <span style={{ fontSize:8.5, color:'#3e4468', letterSpacing:1, fontFamily:'monospace' }}>{label}</span>
      <button onClick={function(){ onChange(!value); }} style={{
        background: value ? a+'22' : 'transparent', border:'1px solid '+(value?a:'#181c30'),
        color: value ? a : '#2c3058', fontSize:8, padding:'3px 11px',
        cursor:'pointer', fontFamily:'monospace', letterSpacing:1, borderRadius:2 }}>
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function Cp({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <span style={{ fontSize:8.5, color:'#3e4468', letterSpacing:1, fontFamily:'monospace' }}>{label}</span>
      <div style={{ display:'flex', gap:7, alignItems:'center' }}>
        <span style={{ fontSize:8, color:'#222544', fontFamily:'monospace' }}>{value}</span>
        <input type="color" value={value} onChange={function(e){ onChange(e.target.value); }}
          style={{ width:26, height:18, border:'1px solid #141828', borderRadius:2, cursor:'pointer', padding:1, background:'none' }} />
      </div>
    </div>
  );
}

function Sec({ title, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:7.5, color:'#222540', letterSpacing:2.5, marginBottom:9, paddingBottom:5, borderBottom:'1px solid #090b18', fontFamily:'monospace' }}>{title}</div>
      {children}
    </div>
  );
}

const TABS = [
  { id:'cam',   icon:'◎', label:'CAM'   },
  { id:'star',  icon:'☀', label:'ÉTOILE'},
  { id:'sphere',icon:'◈', label:'SPHÈRE'},
  { id:'env',   icon:'✦', label:'ENV'   },
  { id:'fx',    icon:'✧', label:'FX'    },
  { id:'rec',   icon:'⏺', label:'REC'   },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function CinemaPage() {
  var canvasRef    = useRef(null);
  var rendRef      = useRef(null);
  var sceneRef     = useRef(null);
  var camRef       = useRef(null);
  var starRef      = useRef(null);
  var panelsRef    = useRef(null);
  var glowsRef     = useRef(null);
  var pdataRef     = useRef([]);
  var ringsRef     = useRef([]);
  var windRef      = useRef(null);
  var beamsRef     = useRef(null);
  var nebulaRef    = useRef(null);
  var frameRef     = useRef(null);
  var tRef         = useRef(0);
  var sRef         = useRef(INIT);
  var drag         = useRef({ on:false, x0:0, y0:0, h0:0, v0:0 });
  var recRef       = useRef(null);
  var recChunks    = useRef([]);
  var fpsTimer     = useRef({ f:0, t:Date.now() });

  var [s, setS]            = useState(INIT);
  var [tab, setTab]        = useState('cam');
  var [bookings, setBook]  = useState([]);
  var [stats, setStats]    = useState({ total:PANEL_COUNT, occupied:0, byTier:{} });
  var [fps, setFps]        = useState(0);
  var [recState, setRec]   = useState('idle');
  var [recDur, setRecDur]  = useState(0);
  var [recProg, setRecP]   = useState(0);
  var [exporting, setExp]  = useState(false);
  var [notif, setNotif]    = useState(null);

  useEffect(function(){ sRef.current = s; }, [s]);
  var upd   = useCallback(function(k,v){ setS(function(p){ return Object.assign({},p,{[k]:typeof v==='function'?v(p[k]):v}); }); }, []);
  var multi = useCallback(function(obj){ setS(function(p){ return Object.assign({},p,obj); }); }, []);
  var toast = useCallback(function(msg,c){ setNotif({msg:msg,c:c||GOLD}); setTimeout(function(){setNotif(null);},2800); }, []);

  // ── SUPABASE ──────────────────────────────────────────────────────
  useEffect(function() {
    async function load() {
      var sb = getSupabaseClient();
      var data = null;
      if (sb) {
        var res = await sb.from('active_slots').select('x,y,booking_id,primary_color,display_name,tier').eq('is_occupied',true);
        data = res && res.data && res.data.length ? res.data : null;
      }
      var bks = data || buildDemoBookings();
      setBook(bks);
      var byTier = {};
      TIER_ORDER.forEach(function(tid){ byTier[tid] = bks.filter(function(b){ return getTier(b.x||1,b.y||1)===tid; }).length; });
      setStats({ total:PANEL_COUNT, occupied:bks.length, byTier:byTier });
    }
    load();
  }, []);

  // ── INIT THREE.JS ─────────────────────────────────────────────────
  useEffect(function() {
    var canvas = canvasRef.current;
    if (!canvas) return;

    var renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true, preserveDrawingBuffer:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = INIT.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendRef.current = renderer;

    var scene = new THREE.Scene();
    sceneRef.current = scene;
    var camera = new THREE.PerspectiveCamera(INIT.fov, 1, 0.1, 400);
    camRef.current = camera;

    var neb = buildNebula(); scene.add(neb); nebulaRef.current = neb;
    var star = buildStar(); scene.add(star.group); starRef.current = star;

    var built = buildDysonPanels([]);
    scene.add(built.panels, built.glows);
    panelsRef.current = built.panels; glowsRef.current = built.glows; pdataRef.current = built.panelData;

    var rings = buildOrbitalRings(); rings.forEach(function(r){ scene.add(r); }); ringsRef.current = rings;
    var wind = buildSolarWind(2500); scene.add(wind); windRef.current = wind;
    scene.add(buildCosmicDust());
    scene.background = new THREE.Color(ENVS.cosmos.sky);

    var resize = function() {
      var w=canvas.clientWidth, h=canvas.clientHeight;
      renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
    };
    resize();
    var ro = new ResizeObserver(resize); ro.observe(canvas);

    var cTmp = new THREE.Color();

    var animate = function() {
      frameRef.current = requestAnimationFrame(animate);
      tRef.current += 0.005;
      var t = tRef.current;
      var cs = sRef.current;

      // FPS
      fpsTimer.current.f++;
      var now = Date.now();
      if (now - fpsTimer.current.t > 900) {
        setFps(Math.round(fpsTimer.current.f / ((now-fpsTimer.current.t)/1000)));
        fpsTimer.current = { f:0, t:now };
      }

      // Camera
      var cH = cs.cH;
      if (cs.autoRot) { var next=(cs.cH+cs.rotSpeed*0.18)%360; setS(function(p){ return Object.assign({},p,{cH:next}); }); cH=next; }
      var hR=cH*Math.PI/180, vR=cs.cV*Math.PI/180;
      camera.position.set(cs.zoom*Math.sin(hR)*Math.cos(vR), cs.zoom*Math.sin(vR), cs.zoom*Math.cos(hR)*Math.cos(vR));
      camera.up.set(Math.sin(cs.roll*Math.PI/180), Math.cos(cs.roll*Math.PI/180), 0);
      camera.lookAt(0,0,0); camera.fov=cs.fov; camera.updateProjectionMatrix();

      // Star pulse
      if (starRef.current) {
        var star2=starRef.current, pulse=cs.starPulse?1+Math.sin(t*1.8)*0.12:1;
        star2.coreMat.emissiveIntensity = cs.starI*pulse;
        star2.halo1.material.opacity    = 0.10*pulse*(cs.coronaI/1.4);
        star2.halo2.material.opacity    = 0.035*pulse;
        star2.keyLight.intensity        = cs.starI*pulse;
        star2.warmLight.intensity       = cs.coronaI*pulse;
        star2.coreMat.emissive.set(cs.starColor);
        star2.halo1.material.color.set(cs.coronaColor);
        star2.warmLight.color.set(cs.coronaColor);
      }

      // Rings
      ringsRef.current.forEach(function(ring) {
        if (cs.ringsOn) { ring.rotation.z+=ring.userData.speed*cs.ringSpeed; ring.material.opacity=ring.userData.baseOpacity*cs.ringOpacity; ring.visible=true; }
        else { ring.visible=false; }
      });

      // Solar wind
      if (windRef.current) tickSolarWind(windRef.current);

      // Panel wave
      if (cs.waveOn && panelsRef.current && pdataRef.current.length) {
        var panels2=panelsRef.current, glows2=glowsRef.current, data=pdataRef.current;
        for (var i=0; i<data.length; i++) {
          var d=data[i];
          var wave = Math.sin(d.phi*5 - t*cs.waveSpeed*2.5)*0.5+0.5;
          var show = cs.filterTier==='all'||cs.filterTier===d.tier;
          if (show) {
            cTmp.copy(d.baseColor).multiplyScalar(d.occ?(0.45+wave*0.35):(0.08+wave*0.07));
            panels2.setColorAt(i,cTmp);
            if(glows2){ cTmp.copy(d.baseColor).multiplyScalar(d.occ?(0.6+wave*0.6):0.05); glows2.setColorAt(i,cTmp); }
          } else {
            cTmp.setScalar(0.015); panels2.setColorAt(i,cTmp);
            if(glows2){ cTmp.setScalar(0); glows2.setColorAt(i,cTmp); }
          }
        }
        panels2.instanceColor.needsUpdate=true;
        if(glows2) glows2.instanceColor.needsUpdate=true;
      }

      // Beams
      if (beamsRef.current) {
        beamsRef.current.material.opacity = cs.beamsOn ? cs.beamOpacity*(0.7+Math.sin(t*3)*0.3) : 0;
        beamsRef.current.visible = cs.beamsOn;
      }

      renderer.toneMappingExposure = cs.exposure;
      renderer.render(scene, camera);
    };
    animate();

    return function() { cancelAnimationFrame(frameRef.current); ro.disconnect(); renderer.dispose(); };
  }, []);

  // ── REBUILD ON BOOKINGS ───────────────────────────────────────────
  useEffect(function() {
    var scene = sceneRef.current;
    if (!scene || !bookings.length) return;
    if (panelsRef.current) scene.remove(panelsRef.current);
    if (glowsRef.current)  scene.remove(glowsRef.current);
    if (beamsRef.current)  scene.remove(beamsRef.current);
    var built = buildDysonPanels(bookings);
    scene.add(built.panels, built.glows);
    panelsRef.current = built.panels; glowsRef.current = built.glows; pdataRef.current = built.panelData;
    var beams = buildEnergyBeams(bookings);
    if (beams) { scene.add(beams); beamsRef.current = beams; }
  }, [bookings]);

  // ── ENVIRONMENT ───────────────────────────────────────────────────
  useEffect(function() {
    var scene = sceneRef.current;
    if (!scene) return;
    var env = ENVS[s.env];
    scene.background = new THREE.Color(env.sky);
    scene.fog = (s.fogOn && env.fog) ? new THREE.FogExp2(env.fog, env.fogD||0.006) : null;
    if (nebulaRef.current) nebulaRef.current.visible = s.nebulaOn;
  }, [s.env, s.fogOn, s.nebulaOn]);

  // ── MOUSE ─────────────────────────────────────────────────────────
  var onDown  = useCallback(function(e){ drag.current={on:true,x0:e.clientX,y0:e.clientY,h0:sRef.current.cH,v0:sRef.current.cV}; },[]);
  var onMove  = useCallback(function(e){
    if(!drag.current.on) return;
    var dx=e.clientX-drag.current.x0, dy=e.clientY-drag.current.y0;
    setS(function(p){ return Object.assign({},p,{cH:drag.current.h0-dx*0.38,cV:Math.max(-89,Math.min(89,drag.current.v0+dy*0.28))}); });
  },[]);
  var onUp    = useCallback(function(){ drag.current.on=false; },[]);
  var onWheel = useCallback(function(e){ e.preventDefault(); setS(function(p){ return Object.assign({},p,{zoom:Math.max(3,Math.min(80,p.zoom+e.deltaY*0.018))}); }); },[]);

  // ── EXPORT ────────────────────────────────────────────────────────
  var export4K = useCallback(function() {
    var renderer=rendRef.current, scene=sceneRef.current, cam=camRef.current;
    if(!renderer||!scene||!cam) return;
    setExp(true);
    setTimeout(function(){
      var res=VIDEO_RES.find(function(r){ return r.id===sRef.current.vidRes; })||VIDEO_RES[0];
      renderer.setSize(res.w,res.h,false); cam.aspect=res.w/res.h; cam.updateProjectionMatrix();
      renderer.render(scene,cam);
      var a=document.createElement('a'); a.download='dyson-sphere-'+res.w+'x'+res.h+'-'+Date.now()+'.png';
      a.href=renderer.domElement.toDataURL('image/png'); a.click();
      var cv=canvasRef.current; renderer.setSize(cv.clientWidth,cv.clientHeight,false);
      cam.aspect=cv.clientWidth/cv.clientHeight; cam.updateProjectionMatrix();
      setExp(false); toast('✦ Screenshot '+res.w+'×'+res.h+' sauvegardé','#00e8a2');
    },80);
  },[toast]);

  // ── RECORD ────────────────────────────────────────────────────────
  var startRec = useCallback(function() {
    var canvas=canvasRef.current; if(!canvas) return;
    var fmt=VIDEO_FORMATS.find(function(f){ return f.id===s.vidFmt; })||VIDEO_FORMATS[0];
    var res=VIDEO_RES.find(function(r){ return r.id===s.vidRes; })||VIDEO_RES[0];
    recChunks.current=[];
    try {
      var stream=canvas.captureStream(res.fps);
      var mime=MediaRecorder.isTypeSupported(fmt.mime)?fmt.mime:'video/webm;codecs=vp8';
      var rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:fmt.mbps*1000000});
      rec.ondataavailable=function(e){ if(e.data.size>0) recChunks.current.push(e.data); };
      rec.onstop=function(){
        setRec('encoding');
        setTimeout(function(){
          var blob=new Blob(recChunks.current,{type:mime});
          var url=URL.createObjectURL(blob);
          var a=document.createElement('a'); a.download='dyson-sphere-'+res.w+'x'+res.h+'-'+s.vidDur+'s-'+Date.now()+'.'+fmt.ext;
          a.href=url; a.click(); URL.revokeObjectURL(url);
          setRec('idle'); setRecP(0); setRecDur(0);
          toast('⏺ Vidéo '+res.w+'×'+res.h+' encodée !','#00e8a2');
        },400);
      };
      rec.start(100); recRef.current=rec; setRec('recording'); setRecDur(0);
      var dur=s.vidDur*1000;
      var tick=setInterval(function(){ setRecDur(function(p){ var n=p+100; setRecP(Math.min(100,n/dur*100)); return n; }); },100);
      setTimeout(function(){ clearInterval(tick); if(rec.state==='recording') rec.stop(); },dur);
    } catch(e){ toast('⚠ Erreur enregistrement','#ff4444'); }
  },[s.vidFmt,s.vidRes,s.vidDur,toast]);

  var stopRec = useCallback(function(){ if(recRef.current&&recRef.current.state==='recording') recRef.current.stop(); },[]);

  // ── CSS FILTER ────────────────────────────────────────────────────
  var activeLut = LUTS.find(function(l){ return l.id===s.lut; })||LUTS[0];
  var cssFilter = [
    activeLut.filter!=='none'?activeLut.filter:'',
    s.brightness!==1?'brightness('+s.brightness+')':'',
    s.contrast!==1?'contrast('+s.contrast+')':'',
    s.saturation!==1?'saturate('+s.saturation+')':'',
  ].filter(Boolean).join(' ')||'none';

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div style={{width:'100%',height:'100vh',display:'flex',background:BG,overflow:'hidden',fontFamily:"'Courier New',monospace"}}>

      {/* CANVAS */}
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        {s.dofOn && (
          <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:3,
            boxShadow:'inset 0 0 '+(s.dofBlur*32)+'px '+(s.dofBlur*10)+'px rgba(0,0,0,0.95)',
            backdropFilter:'blur('+(s.dofBlur*0.55)+'px)',
            WebkitMaskImage:'radial-gradient(ellipse 48% 48% at center,transparent 45%,black 100%)',
            maskImage:'radial-gradient(ellipse 48% 48% at center,transparent 45%,black 100%)'}}/>
        )}
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',cursor:'crosshair',filter:cssFilter}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel}/>

        {/* Vignette */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1,
          background:'radial-gradient(ellipse at center,transparent 22%,rgba(0,0,0,'+s.vignette+') 100%)'}}/>

        {/* Grain */}
        {s.grain>0 && (
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:2,opacity:s.grain,mixBlendMode:'overlay'}}>
            <filter id="fn"><feTurbulence type="fractalNoise" baseFrequency="0.88" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
            <rect width="100%" height="100%" filter="url(#fn)" opacity="0.4"/>
          </svg>
        )}
        {s.chrAb && <>
          <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:3,background:'linear-gradient(135deg,rgba(255,0,0,0.03) 0%,transparent 40%)',mixBlendMode:'screen'}}/>
          <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:3,background:'linear-gradient(-45deg,rgba(0,0,255,0.03) 0%,transparent 40%)',mixBlendMode:'screen'}}/>
        </>}

        {/* Lens flare glow at center */}
        <div style={{position:'absolute',top:'50%',left:'50%',width:2,height:2,transform:'translate(-50%,-50%)',
          pointerEvents:'none',zIndex:4,
          boxShadow:'0 0 80px 40px rgba(255,240,160,0.07),0 0 160px 80px rgba(255,200,80,0.03)',borderRadius:'50%'}}/>

        {/* Camera presets */}
        <div style={{position:'absolute',top:12,left:12,display:'flex',gap:4,flexWrap:'wrap',zIndex:10}}>
          {CAM_PRESETS.map(function(p){
            return (
              <button key={p.id} onClick={function(){ multi({cH:p.h,cV:p.v,zoom:p.z,fov:p.fov}); }}
                style={{background:'rgba(0,0,0,0.82)',backdropFilter:'blur(6px)',border:'1px solid #141828',
                  color:'#2c3055',fontSize:7.5,padding:'3px 8px',cursor:'pointer',borderRadius:2,
                  letterSpacing:0.8,transition:'all 0.15s'}}
                onMouseEnter={function(e){e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.color=GOLD;}}
                onMouseLeave={function(e){e.currentTarget.style.borderColor='#141828';e.currentTarget.style.color='#2c3055';}}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{position:'absolute',top:12,right:12,zIndex:10}}>
          <div style={{background:'rgba(0,0,0,0.82)',backdropFilter:'blur(6px)',border:'1px solid #141828',
            padding:'9px 13px',borderRadius:2,fontSize:8,color:'#2c3055',fontFamily:'monospace',lineHeight:1.9}}>
            <div style={{color:GOLD+'90',letterSpacing:1,marginBottom:2}}>◈ SPHÈRE DE DYSON</div>
            <div>{stats.occupied} <span style={{color:'#1c2038'}}>/ {PANEL_COUNT}</span></div>
            <div>{Math.round(stats.occupied/PANEL_COUNT*100)}% <span style={{color:'#1c2038'}}>CHARGÉ</span></div>
            <div style={{color:'#1c2038'}}>{fps} FPS</div>
          </div>
        </div>

        {/* Tier filter pills */}
        <div style={{position:'absolute',bottom:14,left:12,zIndex:10,display:'flex',gap:5,flexWrap:'wrap'}}>
          {TIER_ORDER.map(function(tid){
            var sel = s.filterTier===tid;
            return (
              <button key={tid} onClick={function(){ upd('filterTier',sel?'all':tid); }}
                style={{background:sel?TIER_COLOR[tid]+'22':'rgba(0,0,0,0.75)',
                  border:'1px solid '+(sel?TIER_COLOR[tid]:'#141828'),
                  color:sel?TIER_COLOR[tid]:'#2c3055',
                  fontSize:7,padding:'3px 8px',cursor:'pointer',fontFamily:'monospace',
                  borderRadius:2,letterSpacing:0.8,backdropFilter:'blur(4px)'}}>
                <span style={{fontSize:9}}>{TIER_META[tid].icon}</span> {tid.toUpperCase()}
                {stats.byTier[tid]>0&&<span style={{color:TIER_COLOR[tid]+'80',marginLeft:4}}>{stats.byTier[tid]}</span>}
              </button>
            );
          })}
        </div>

        {/* REC indicator */}
        {recState==='recording' && <>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
            zIndex:20,pointerEvents:'none',border:'1px solid rgba(255,0,34,0.5)',
            padding:'2px 8px',background:'rgba(0,0,0,0.7)',color:'#ff2233',fontSize:8,letterSpacing:2}}>
            ⏺ REC {(recDur/1000).toFixed(1)}s
          </div>
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'#060810',zIndex:10}}>
            <div style={{height:'100%',width:recProg+'%',background:GOLD,transition:'width 0.1s'}}/>
          </div>
        </>}

        {/* Notification */}
        {notif && (
          <div style={{position:'absolute',bottom:52,left:'50%',transform:'translateX(-50%)',zIndex:20,
            background:'rgba(0,0,0,0.92)',border:'1px solid '+notif.c,color:notif.c,
            padding:'8px 20px',fontSize:9,letterSpacing:1.5,borderRadius:2,backdropFilter:'blur(8px)'}}>
            {notif.msg}
          </div>
        )}

        {/* Branding */}
        <div style={{position:'absolute',bottom:44,right:12,zIndex:10,color:'#181c35',fontSize:8,letterSpacing:1,textAlign:'right'}}>
          <div style={{color:GOLD+'45'}}>◈ ADS SQUARE</div>
          <div>SPHÈRE DE DYSON · CINEMA AAA</div>
        </div>
      </div>

      {/* PANEL */}
      <div style={{width:272,background:'#050610',borderLeft:'1px solid #090b15',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'13px 14px 10px',borderBottom:'1px solid #090b15',background:'#06070f'}}>
          <div style={{color:GOLD,fontSize:11,letterSpacing:2,fontWeight:700}}>◈ DYSON CINEMA</div>
          <div style={{color:'#181c35',fontSize:7.5,marginTop:3,letterSpacing:1}}>SPHÈRE COMPLÈTE · 1 296 PANNEAUX · AAA</div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1px solid #090b15'}}>
          {TABS.map(function(t){
            return (
              <button key={t.id} onClick={function(){ setTab(t.id); }} style={{
                flex:1,background:tab===t.id?'#090b18':'transparent',
                border:'none',borderBottom:'2px solid '+(tab===t.id?GOLD:'transparent'),
                color:tab===t.id?GOLD:'#202445',fontSize:6.5,
                padding:'8px 2px 6px',cursor:'pointer',letterSpacing:0.3,transition:'all 0.12s'}}>
                <div style={{fontSize:11,marginBottom:2}}>{t.icon}</div>
                <div>{t.label}</div>
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:'auto',padding:'12px 13px',scrollbarWidth:'thin',scrollbarColor:'#0e1025 transparent'}}>

          {/* ═══ CAM ═══ */}
          {tab==='cam' && (<>
            <Sec title="POSITION">
              <Sl label="HORIZONTAL" value={s.cH} min={-180} max={180} step={1} unit="°" onChange={function(v){upd('cH',v);}}/>
              <Sl label="VERTICAL"   value={s.cV} min={-89}  max={89}  step={1} unit="°" onChange={function(v){upd('cV',v);}}/>
              <Sl label="DISTANCE"   value={s.zoom} min={3}  max={80}  step={0.1} onChange={function(v){upd('zoom',v);}}/>
            </Sec>
            <Sec title="OPTIQUE">
              <Sl label="FOCALE (FOV)" value={s.fov}  min={10} max={100} step={1} unit="°" onChange={function(v){upd('fov',v);}}/>
              <Sl label="ROLL"         value={s.roll} min={-30} max={30} step={0.5} unit="°" onChange={function(v){upd('roll',v);}}/>
            </Sec>
            <Sec title="DOF">
              <Tog label="PROFONDEUR DE CHAMP" value={s.dofOn} onChange={function(v){upd('dofOn',v);}}/>
              {s.dofOn&&<Sl label="BLUR" value={s.dofBlur} min={0.5} max={10} step={0.1} onChange={function(v){upd('dofBlur',v);}}/>}
            </Sec>
            <Sec title="AUTO-ROTATION">
              <Tog label="ACTIF"   value={s.autoRot}  onChange={function(v){upd('autoRot',v);}}/>
              {s.autoRot&&<Sl label="VITESSE" value={s.rotSpeed} min={0.05} max={2} step={0.05} onChange={function(v){upd('rotSpeed',v);}}/>}
            </Sec>
          </>)}

          {/* ═══ ÉTOILE ═══ */}
          {tab==='star' && (<>
            <Sec title="ÉTOILE CENTRALE">
              <Cp  label="COULEUR" value={s.starColor}   onChange={function(v){upd('starColor',v);}}/>
              <Sl  label="INTENSITÉ" value={s.starI}       min={0} max={20} step={0.1} onChange={function(v){upd('starI',v);}}/>
              <Tog label="PULSATION" value={s.starPulse}   onChange={function(v){upd('starPulse',v);}}/>
            </Sec>
            <Sec title="CORONA">
              <Cp label="COULEUR"   value={s.coronaColor} onChange={function(v){upd('coronaColor',v);}}/>
              <Sl label="INTENSITÉ" value={s.coronaI}     min={0} max={6} step={0.05} onChange={function(v){upd('coronaI',v);}}/>
            </Sec>
            <Sec title="ANNEAUX ORBITAUX">
              <Tog label="VISIBLES" value={s.ringsOn}      onChange={function(v){upd('ringsOn',v);}}/>
              <Sl  label="VITESSE"  value={s.ringSpeed}    min={0} max={5} step={0.05} onChange={function(v){upd('ringSpeed',v);}}/>
              <Sl  label="OPACITÉ"  value={s.ringOpacity}  min={0} max={1} step={0.02} onChange={function(v){upd('ringOpacity',v);}}/>
            </Sec>
            <Sec title="TYPES D'ÉTOILE">
              {[
                { n:'SOLEIL',       v:{starColor:'#fff5cc',starI:8,  coronaColor:'#ff8800',coronaI:1.4} },
                { n:'ÉTOILE BLEUE', v:{starColor:'#ccddff',starI:11, coronaColor:'#4488ff',coronaI:2.0} },
                { n:'GÉANTE ROUGE', v:{starColor:'#ff6644',starI:7,  coronaColor:'#cc2200',coronaI:2.2} },
                { n:'NAINE BLANCHE',v:{starColor:'#ffffff',starI:14, coronaColor:'#aaddff',coronaI:0.8} },
                { n:'PULSAR',       v:{starColor:'#00ffdd',starI:16, coronaColor:'#00aaff',coronaI:3.0,starPulse:true} },
                { n:'HYPERGÉANTE', v:{starColor:'#ffcc44',starI:18, coronaColor:'#ff4400',coronaI:4.0} },
              ].map(function(p){
                return (
                  <button key={p.n} onClick={function(){multi(p.v);}}
                    style={{width:'100%',textAlign:'left',background:'transparent',border:'1px solid #141828',
                      color:'#2c3055',fontSize:8,padding:'7px 10px',cursor:'pointer',fontFamily:'monospace',
                      marginBottom:4,borderRadius:2,letterSpacing:0.8,transition:'all 0.14s'}}
                    onMouseEnter={function(e){e.currentTarget.style.borderColor=GOLD+'80';e.currentTarget.style.color=GOLD;}}
                    onMouseLeave={function(e){e.currentTarget.style.borderColor='#141828';e.currentTarget.style.color='#2c3055';}}>
                    ☀ {p.n}
                  </button>
                );
              })}
            </Sec>
          </>)}

          {/* ═══ SPHÈRE ═══ */}
          {tab==='sphere' && (<>
            <Sec title="PANNEAUX">
              <Sl label="INTENSITÉ GLOW"   value={s.panelGlow}  min={0} max={4} step={0.05} onChange={function(v){upd('panelGlow',v);}}/>
              <Tog label="ONDE ÉNERGÉTIQUE" value={s.waveOn}    onChange={function(v){upd('waveOn',v);}}/>
              {s.waveOn&&<Sl label="VITESSE ONDE" value={s.waveSpeed} min={0.1} max={3} step={0.05} onChange={function(v){upd('waveSpeed',v);}}/>}
            </Sec>
            <Sec title="FAISCEAUX D'ÉNERGIE">
              <Tog label="VISIBLES" value={s.beamsOn}     onChange={function(v){upd('beamsOn',v);}}/>
              <Sl  label="OPACITÉ"  value={s.beamOpacity} min={0} max={1} step={0.02} onChange={function(v){upd('beamOpacity',v);}}/>
            </Sec>
            <Sec title="FILTRE PAR TIER">
              <button onClick={function(){upd('filterTier','all');}}
                style={{width:'100%',textAlign:'left',marginBottom:4,
                  background:s.filterTier==='all'?GOLD+'18':'transparent',
                  border:'1px solid '+(s.filterTier==='all'?GOLD:'#141828'),
                  color:s.filterTier==='all'?GOLD:'#2c3055',fontSize:8,
                  padding:'6px 10px',cursor:'pointer',fontFamily:'monospace',borderRadius:2,letterSpacing:1}}>
                {s.filterTier==='all'?'◈':'○'} TOUS ({PANEL_COUNT})
              </button>
              {TIER_ORDER.map(function(tid){
                var sel=s.filterTier===tid, tc=TIER_COLOR[tid];
                return (
                  <button key={tid} onClick={function(){upd('filterTier',tid);}}
                    style={{width:'100%',textAlign:'left',display:'flex',justifyContent:'space-between',marginBottom:4,
                      background:sel?tc+'18':'transparent',border:'1px solid '+(sel?tc:'#141828'),
                      color:sel?tc:'#2c3055',fontSize:8,padding:'6px 10px',cursor:'pointer',fontFamily:'monospace',borderRadius:2,letterSpacing:0.8}}>
                    <span>{sel?'◈':'○'} {TIER_META[tid].label}</span>
                    <span style={{fontSize:7,opacity:0.7}}>{stats.byTier[tid]||0} occ</span>
                  </button>
                );
              })}
            </Sec>
            <Sec title="STATS SPHÈRE">
              <div style={{fontSize:8,color:'#2c3055',lineHeight:1.95,fontFamily:'monospace'}}>
                <div>TOTAL <span style={{color:GOLD}}>{PANEL_COUNT}</span></div>
                <div>OCCUPÉS <span style={{color:'#00e8a2'}}>{stats.occupied}</span></div>
                <div>LIBRES <span style={{color:'#38bdf8'}}>{PANEL_COUNT-stats.occupied}</span></div>
                <div style={{marginTop:6,borderTop:'1px solid #0e1025',paddingTop:6}}>
                  {TIER_ORDER.map(function(tid){
                    return (
                      <div key={tid} style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                        <span style={{color:TIER_COLOR[tid]+'90'}}>{TIER_META[tid].icon} {tid.toUpperCase()}</span>
                        <span style={{color:TIER_COLOR[tid]}}>{stats.byTier[tid]||0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Sec>
          </>)}

          {/* ═══ ENV ═══ */}
          {tab==='env' && (<>
            <Sec title="ESPACE">
              {Object.entries(ENVS).map(function(entry){
                var id=entry[0], env=entry[1];
                return (
                  <button key={id} onClick={function(){upd('env',id);}}
                    style={{width:'100%',textAlign:'left',marginBottom:4,
                      background:s.env===id?'#0a0c1e':'transparent',border:'1px solid '+(s.env===id?GOLD:'#141828'),
                      color:s.env===id?GOLD:'#2c3055',fontSize:8,padding:'8px 10px',cursor:'pointer',
                      fontFamily:'monospace',borderRadius:2,display:'flex',justifyContent:'space-between',letterSpacing:0.8}}>
                    <span>{s.env===id?'◈':'○'} {env.name}</span>
                    {env.stars&&<span style={{fontSize:7,color:'#222540'}}>★ STARS</span>}
                  </button>
                );
              })}
            </Sec>
            <Sec title="ATMOSPHÈRE">
              <Tog label="NÉBULEUSE" value={s.nebulaOn} onChange={function(v){upd('nebulaOn',v);}}/>
              <Tog label="BROUILLARD" value={s.fogOn}   onChange={function(v){upd('fogOn',v);}}/>
            </Sec>
          </>)}

          {/* ═══ FX ═══ */}
          {tab==='fx' && (<>
            <Sec title="EXPOSITION">
              <Sl label="EXPOSITION"  value={s.exposure}   min={0.2} max={4}   step={0.02} onChange={function(v){upd('exposure',v);}}/>
              <Sl label="LUMINOSITÉ"  value={s.brightness} min={0.4} max={2.5} step={0.02} onChange={function(v){upd('brightness',v);}}/>
              <Sl label="CONTRASTE"   value={s.contrast}   min={0.5} max={2.5} step={0.02} onChange={function(v){upd('contrast',v);}}/>
              <Sl label="SATURATION"  value={s.saturation} min={0}   max={3}   step={0.05} onChange={function(v){upd('saturation',v);}}/>
            </Sec>
            <Sec title="CINÉMA">
              <Sl  label="VIGNETTE"   value={s.vignette} min={0} max={1}   step={0.02} onChange={function(v){upd('vignette',v);}}/>
              <Sl  label="GRAIN FILM" value={s.grain}    min={0} max={0.9} step={0.01} onChange={function(v){upd('grain',v);}}/>
              <Tog label="ABERRATION CHROMATIQUE" value={s.chrAb} onChange={function(v){upd('chrAb',v);}}/>
              <Tog label="DOF" value={s.dofOn} onChange={function(v){upd('dofOn',v);}}/>
            </Sec>
            <Sec title="LUT">
              {LUTS.map(function(l){
                return (
                  <button key={l.id} onClick={function(){upd('lut',l.id);}}
                    style={{width:'100%',textAlign:'left',background:s.lut===l.id?GOLD+'18':'transparent',
                      border:'1px solid '+(s.lut===l.id?GOLD:'#141828'),color:s.lut===l.id?GOLD:'#2c3055',
                      fontSize:8,padding:'6px 10px',cursor:'pointer',fontFamily:'monospace',marginBottom:4,borderRadius:2,letterSpacing:0.8}}>
                    {s.lut===l.id?'◈ ':''}{l.label}
                  </button>
                );
              })}
            </Sec>
            <Sec title="PRESETS CINÉMA">
              {[
                { n:'INTERSTELLAR',   v:{vignette:0.65,grain:0.3,exposure:1.3,contrast:1.2,saturation:0.9,lut:'cinema',chrAb:false} },
                { n:'BLADE RUNNER',   v:{vignette:0.75,grain:0.45,exposure:1.1,contrast:1.3,saturation:1.5,lut:'neon',chrAb:true} },
                { n:'2001 ODYSSÉE',   v:{vignette:0.5,grain:0.15,exposure:1.5,contrast:1.1,saturation:0.95,lut:'none',chrAb:false} },
                { n:'DUNE',           v:{vignette:0.7,grain:0.25,exposure:1.4,contrast:1.15,saturation:1.2,lut:'warmgold',chrAb:false} },
                { n:'GHOST IN SHELL', v:{vignette:0.8,grain:0.5,exposure:1.0,contrast:1.35,saturation:1.8,lut:'scifi',chrAb:true} },
              ].map(function(p){
                return (
                  <button key={p.n} onClick={function(){multi(p.v);}}
                    style={{width:'100%',textAlign:'left',background:'transparent',border:'1px solid #141828',
                      color:'#2c3055',fontSize:8,padding:'7px 10px',cursor:'pointer',fontFamily:'monospace',
                      marginBottom:4,borderRadius:2,letterSpacing:0.8,transition:'all 0.14s'}}
                    onMouseEnter={function(e){e.currentTarget.style.borderColor=GOLD+'80';e.currentTarget.style.color=GOLD;}}
                    onMouseLeave={function(e){e.currentTarget.style.borderColor='#141828';e.currentTarget.style.color='#2c3055';}}>
                    ✧ {p.n}
                  </button>
                );
              })}
            </Sec>
          </>)}

          {/* ═══ REC ═══ */}
          {tab==='rec' && (<>
            <Sec title="FORMAT">
              {VIDEO_FORMATS.map(function(f){
                return (
                  <button key={f.id} onClick={function(){upd('vidFmt',f.id);}}
                    style={{width:'100%',textAlign:'left',background:s.vidFmt===f.id?GOLD+'18':'transparent',
                      border:'1px solid '+(s.vidFmt===f.id?GOLD:'#141828'),color:s.vidFmt===f.id?GOLD:'#2c3055',
                      fontSize:8,padding:'8px 10px',cursor:'pointer',fontFamily:'monospace',marginBottom:4,
                      borderRadius:2,display:'flex',justifyContent:'space-between',letterSpacing:0.7}}>
                    <span>{s.vidFmt===f.id?'◈ ':''}{f.label}</span>
                    {f.hdr&&<span style={{fontSize:7,color:'#e8c000',border:'1px solid #e8c00055',padding:'1px 4px'}}>HDR</span>}
                  </button>
                );
              })}
            </Sec>
            <Sec title="RÉSOLUTION">
              {VIDEO_RES.map(function(r){
                return (
                  <button key={r.id} onClick={function(){upd('vidRes',r.id);}}
                    style={{width:'100%',textAlign:'left',background:s.vidRes===r.id?GOLD+'18':'transparent',
                      border:'1px solid '+(s.vidRes===r.id?GOLD:'#141828'),color:s.vidRes===r.id?GOLD:'#2c3055',
                      fontSize:8,padding:'8px 10px',cursor:'pointer',fontFamily:'monospace',marginBottom:4,
                      borderRadius:2,display:'flex',justifyContent:'space-between',letterSpacing:0.7}}>
                    <span>{s.vidRes===r.id?'◈ ':''}{r.label} ({r.w}×{r.h})</span>
                    <span style={{fontSize:7,color:'#222540'}}>{r.fps}fps</span>
                  </button>
                );
              })}
            </Sec>
            <Sec title="DURÉE">
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {[5,10,15,20,30,60].map(function(d){
                  return (
                    <button key={d} onClick={function(){upd('vidDur',d);}}
                      style={{background:s.vidDur===d?GOLD+'22':'transparent',border:'1px solid '+(s.vidDur===d?GOLD:'#141828'),
                        color:s.vidDur===d?GOLD:'#2c3055',fontSize:8,padding:'4px 10px',cursor:'pointer',fontFamily:'monospace',borderRadius:2}}>
                      {d}s
                    </button>
                  );
                })}
              </div>
            </Sec>
            {recState==='recording'&&(
              <Sec title="PROGRESSION">
                <div style={{background:'#090b18',borderRadius:2,overflow:'hidden',marginBottom:7}}>
                  <div style={{height:5,background:GOLD,width:recProg+'%',transition:'width 0.1s'}}/>
                </div>
                <div style={{fontSize:8,color:'#404870',fontFamily:'monospace'}}>⏺ {(recDur/1000).toFixed(1)}s / {s.vidDur}s</div>
              </Sec>
            )}
          </>)}
        </div>

        {/* Actions */}
        <div style={{padding:'8px 12px 12px',borderTop:'1px solid #090b15',background:'#06070f',display:'flex',flexDirection:'column',gap:6}}>
          {recState==='idle'?(
            <button onClick={startRec} style={{background:'linear-gradient(135deg,#bb0018 0%,#770010 100%)',
              border:'none',color:'#fff',fontSize:8.5,fontWeight:700,padding:'10px',cursor:'pointer',
              fontFamily:'monospace',letterSpacing:1.5,borderRadius:2,display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#ff3344',display:'inline-block'}}/>
              ⏺ ENREGISTRER HDR
            </button>
          ):recState==='recording'?(
            <button onClick={stopRec} style={{background:'#160406',border:'1px solid #ff2233',
              color:'#ff3344',fontSize:8.5,fontWeight:700,padding:'10px',cursor:'pointer',fontFamily:'monospace',letterSpacing:1.5,borderRadius:2}}>
              ⏹ STOP ({(recDur/1000).toFixed(1)}s)
            </button>
          ):(
            <button disabled style={{background:'#0e1020',border:'1px solid #1a1e38',color:'#2c3055',fontSize:8.5,padding:'10px',fontFamily:'monospace',letterSpacing:1.5,borderRadius:2}}>
              ⚙ ENCODAGE...
            </button>
          )}
          <button onClick={export4K} disabled={exporting} style={{
            background:exporting?'#0e1020':'linear-gradient(135deg,'+GOLD+' 0%,#cc8800 100%)',
            border:'none',color:exporting?'#2c3055':'#000',fontSize:8.5,fontWeight:800,
            padding:'10px',cursor:exporting?'wait':'pointer',fontFamily:'monospace',letterSpacing:1.5,borderRadius:2}}>
            {exporting?'⏳ EXPORT...':'↓ SCREENSHOT 4K'}
          </button>
        </div>
      </div>

      <style>{`
        input[type=range]{-webkit-appearance:none;appearance:none}
        input[type=range]::-webkit-slider-runnable-track{background:#0c0e22;height:3px;border-radius:2px}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;margin-top:-3.5px;cursor:pointer}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#0e1025;border-radius:2px}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DEMO DATA
// ═══════════════════════════════════════════════════════════════════

function buildDemoBookings() {
  var bks = [];
  var prob = { epicenter:1, prestige:0.88, elite:0.72, business:0.45, standard:0.28, viral:0.12 };
  for (var gy=1; gy<=GRID_ROWS; gy++) {
    for (var gx=1; gx<=GRID_COLS; gx++) {
      var tier = getTier(gx,gy);
      if (Math.random() < prob[tier]) {
        bks.push({ x:gx, y:gy, primary_color:TIER_COLOR[tier], display_name:'BLOC '+gx+'-'+gy, tier:tier });
      }
    }
  }
  return bks;
}
