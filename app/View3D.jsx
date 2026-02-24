'use client';
/**
 * ─── ADS·SQUARE — View3D ████████████████████████████████████████████████████
 *  LUMINOUS SPHERE EDITION — zero geometric faces
 *
 *  Architecture visuelle :
 *  • Sphère en nuage de particules (aucune face plate)
 *  • Nœuds lumineux positionnés par spirale de Fibonacci
 *  • Lignes de constellation entre nœuds voisins
 *  • Chaque nœud = 1 slot publicitaire cliquable
 *
 *  Niveau 1 →    6 nœuds  (Épicentre + Prestige)
 *  Niveau 2 →   14 nœuds
 *  Niveau 3 →   34 nœuds
 *  Niveau 4 →   94 nœuds
 *  Niveau 5 →  320 nœuds
 *  Niveau 6 → 1280 nœuds (Cosmos complet)
 *
 *  deps: npm install three gsap
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

const U = {
  bg: '#010208', text: '#eef2ff',
  muted: 'rgba(180,195,255,0.45)', mutedLo: 'rgba(180,195,255,0.22)',
  accent: '#d4a84b', accentBright: '#f5c842', accentFg: '#06050a',
  glass: 'rgba(4,6,22,0.80)', border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)', err: '#ff4d6d',
};
const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
  m: "'JetBrains Mono','Fira Code','Courier New',monospace",
};
const priceEur = tier => ((TIER_PRICE[tier] || 100) / 100).toLocaleString('fr-FR');
const TIER_ORDER = ['epicenter','prestige','elite','business','standard','viral'];

const LEVELS = [
  { n:0, name:'Grille 2D', icon:'◫', count:0    },
  { n:1, name:'Focus',     icon:'◎', count:6    },
  { n:2, name:'Éclat',     icon:'◈', count:14   },
  { n:3, name:'Réseau',    icon:'⬡', count:34   },
  { n:4, name:'Sphère',    icon:'◉', count:94   },
  { n:5, name:'Galaxy',    icon:'✦', count:320  },
  { n:6, name:'Cosmos',    icon:'✧', count:1280 },
];
const SPHERE_R = 6.2;
const TIER_POINT_SIZE = { epicenter:0.38, prestige:0.26, elite:0.20, business:0.15, standard:0.11, viral:0.08 };

function fibonacciSphere(n, R) {
  const pts=[], golden=Math.PI*(3-Math.sqrt(5));
  for (let i=0;i<n;i++) {
    const y=1-(i/Math.max(n-1,1))*2, rr=Math.sqrt(1-y*y), theta=golden*i;
    pts.push([Math.cos(theta)*rr*R, y*R, Math.sin(theta)*rr*R]);
  }
  return pts;
}
function sortSlotsByTier(slots) {
  return [...(slots||[])].filter(Boolean).sort((a,b)=>{
    const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);
    return d!==0?d:(b.occ?1:0)-(a.occ?1:0);
  });
}
function hexToVec3(hex) {
  const h=(hex||'#888').replace('#','');
  return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];
}

class Scene3D {
  constructor(canvas) {
    this.canvas=canvas; this.T=this.G=null;
    this.renderer=this.scene=this.camera=null;
    this.particleMesh=this._atmoHaze=this._glowLayer=this._epicGlow=this.constellations=null;
    this.nodeMesh=null; this.stars=this.stars2=null;
    this.ring1=this.ring2=null; this._group=null;
    this.raycaster=null; this.nodePositions=[]; this.nodeSlots=[];
    this.onFaceClick=null;
    this.rot={x:0.18,y:0}; this.vel={x:0,y:0};
    this.isDragging=false; this.touchStart=this.pinchDist=null;
    this.zoomTarget=this.zoomCurrent=22;
    this.animId=null; this.transitioning=false; this._h={};
  }

  async init(THREE,GSAP) {
    this.T=THREE; this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(W,H,false);
    this.renderer.setClearColor(0x010208,1);
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x010208,0.009);
    this.camera=new THREE.PerspectiveCamera(40,W/H,0.1,800);
    this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();
    this.raycaster.params.Points={threshold:0.35};
    this.scene.add(new THREE.AmbientLight(0x040820,4));
    this._group=new THREE.Group();
    this._group.rotation.x=this.rot.x;
    this.scene.add(this._group);
    this._buildStars();
    this._buildSphereParticles();
    this._buildRings();
    this._bindEvents();
    this._animate();
  }

  _buildStars() {
    const T=this.T,N=7000;
    const pos=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      const r=130+Math.random()*350;
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2]=r*Math.cos(phi);
      const t=Math.random();
      if(t<0.65){col[i*3]=0.6+t*0.4;col[i*3+1]=0.7+t*0.2;col[i*3+2]=0.95;}
      else if(t<0.82){col[i*3]=1.0;col[i*3+1]=0.92;col[i*3+2]=0.65;}
      else{col[i*3]=0.82;col[i*3+1]=0.60;col[i*3+2]=1.0;}
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('color',new T.BufferAttribute(col,3));
    this.stars=new T.Points(geo,new T.PointsMaterial({size:0.15,vertexColors:true,transparent:true,opacity:0.92,sizeAttenuation:true}));
    this.scene.add(this.stars);
    const N2=500,pos2=new Float32Array(N2*3),col2=new Float32Array(N2*3);
    for(let i=0;i<N2;i++){
      const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      const r=70+Math.random()*65;
      pos2[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos2[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos2[i*3+2]=r*Math.cos(phi);
      col2[i*3]=1;col2[i*3+1]=0.95;col2[i*3+2]=0.8;
    }
    const geo2=new T.BufferGeometry();
    geo2.setAttribute('position',new T.BufferAttribute(pos2,3));
    geo2.setAttribute('color',new T.BufferAttribute(col2,3));
    this.stars2=new T.Points(geo2,new T.PointsMaterial({size:0.40,vertexColors:true,transparent:true,opacity:0.65,sizeAttenuation:true}));
    this.scene.add(this.stars2);
  }

  _buildSphereParticles() {
    const T=this.T,N1=3200;
    const pos1=new Float32Array(N1*3),col1=new Float32Array(N1*3);
    for(let i=0;i<N1;i++){
      const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      const r=SPHERE_R*(0.92+Math.random()*0.16);
      pos1[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos1[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos1[i*3+2]=r*Math.cos(phi);
      const lat=Math.abs(pos1[i*3+1])/SPHERE_R;
      col1[i*3]=0.22+lat*0.35;col1[i*3+1]=0.32+lat*0.42;col1[i*3+2]=0.68+lat*0.32;
    }
    const geo1=new T.BufferGeometry();
    geo1.setAttribute('position',new T.BufferAttribute(pos1,3));
    geo1.setAttribute('color',new T.BufferAttribute(col1,3));
    this.particleMesh=new T.Points(geo1,new T.PointsMaterial({size:0.040,vertexColors:true,transparent:true,opacity:0.35,sizeAttenuation:true}));
    this._group.add(this.particleMesh);
    const N2=900,pos2=new Float32Array(N2*3);
    for(let i=0;i<N2;i++){
      const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      const r=SPHERE_R+0.4+Math.random()*1.6;
      pos2[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos2[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos2[i*3+2]=r*Math.cos(phi);
    }
    const geo2=new T.BufferGeometry();
    geo2.setAttribute('position',new T.BufferAttribute(pos2,3));
    this._atmoHaze=new T.Points(geo2,new T.PointsMaterial({color:0x2244ff,size:0.06,transparent:true,opacity:0.10,sizeAttenuation:true}));
    this._group.add(this._atmoHaze);
  }

  _buildRings() {
    const T=this.T;
    const mk=(ir,or,color,opacity,rx,rz)=>{
      const m=new T.Mesh(new T.RingGeometry(ir,or,120),new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide}));
      m.rotation.x=rx||0;m.rotation.z=rz||0;return m;
    };
    this.ring1=mk(SPHERE_R+1.1,SPHERE_R+1.22,0xd4a84b,0.20,Math.PI/2);
    this.ring2=mk(SPHERE_R+1.9,SPHERE_R+1.97,0x4499ff,0.10,Math.PI/2,Math.PI/4);
    this._group.add(this.ring1);this._group.add(this.ring2);
  }

  _clearNodes() {
    [this.nodeMesh,this._glowLayer,this._epicGlow,this.constellations].filter(Boolean).forEach(o=>{
      this._group.remove(o);o.geometry?.dispose();o.material?.dispose();
    });
    this.nodeMesh=this._glowLayer=this._epicGlow=this.constellations=null;
    this.nodePositions=[];this.nodeSlots=[];
  }

  _buildNodes(slots) {
    this._clearNodes();
    const n=slots.length;if(!n)return;
    const positions=fibonacciSphere(n,SPHERE_R);
    this.nodePositions=positions;this.nodeSlots=slots;
    const pos=new Float32Array(n*3),col=new Float32Array(n*3);
    for(let i=0;i<n;i++){
      const[x,y,z]=positions[i];
      pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;
      const slot=slots[i];
      if(slot){
        const[r,g,b]=hexToVec3(TIER_COLOR[slot.tier]||'#888');
        const br=slot.occ?1.0:0.28;
        col[i*3]=r*br;col[i*3+1]=g*br;col[i*3+2]=b*br;
      }else{col[i*3]=0.12;col[i*3+1]=0.15;col[i*3+2]=0.28;}
    }
    const geo=new this.T.BufferGeometry();
    geo.setAttribute('position',new this.T.BufferAttribute(pos,3));
    geo.setAttribute('color',new this.T.BufferAttribute(col,3));
    this.nodeMesh=new this.T.Points(geo,new this.T.PointsMaterial({vertexColors:true,size:0.24,sizeAttenuation:true,transparent:true,opacity:0.96,blending:this.T.AdditiveBlending,depthWrite:false}));
    this._group.add(this.nodeMesh);
    const gGeo=new this.T.BufferGeometry();
    gGeo.setAttribute('position',new this.T.BufferAttribute(pos.slice(),3));
    gGeo.setAttribute('color',new this.T.BufferAttribute(col.slice(),3));
    this._glowLayer=new this.T.Points(gGeo,new this.T.PointsMaterial({vertexColors:true,size:0.80,sizeAttenuation:true,transparent:true,opacity:0.16,blending:this.T.AdditiveBlending,depthWrite:false}));
    this._group.add(this._glowLayer);
    const topIdx=slots.map((s,i)=>[s,i]).filter(([s])=>s&&(s.tier==='epicenter'||s.tier==='prestige'));
    if(topIdx.length){
      const tp=new Float32Array(topIdx.length*3),tc=new Float32Array(topIdx.length*3);
      topIdx.forEach(([s,i],j)=>{
        tp[j*3]=positions[i][0];tp[j*3+1]=positions[i][1];tp[j*3+2]=positions[i][2];
        const[r,g,b]=hexToVec3(TIER_COLOR[s.tier]||'#fff');
        tc[j*3]=r;tc[j*3+1]=g;tc[j*3+2]=b;
      });
      const tGeo=new this.T.BufferGeometry();
      tGeo.setAttribute('position',new this.T.BufferAttribute(tp,3));
      tGeo.setAttribute('color',new this.T.BufferAttribute(tc,3));
      this._epicGlow=new this.T.Points(tGeo,new this.T.PointsMaterial({vertexColors:true,size:2.0,sizeAttenuation:true,transparent:true,opacity:0.28,blending:this.T.AdditiveBlending,depthWrite:false}));
      this._group.add(this._epicGlow);
    }
    this._buildConstellations(positions,slots);
  }

  _buildConstellations(positions,slots) {
    const MAX=SPHERE_R*0.72,lv=[],lc=[];
    for(let i=0;i<positions.length;i++){
      const[ax,ay,az]=positions[i];const sA=slots[i];let f=0;
      for(let j=i+1;j<positions.length;j++){
        if(f>=2)break;
        const[bx,by,bz]=positions[j];
        const d=Math.sqrt((bx-ax)**2+(by-ay)**2+(bz-az)**2);
        if(d<MAX){
          const sB=slots[j];
          const cA=hexToVec3((sA&&TIER_COLOR[sA.tier])||'#334');
          const cB=hexToVec3((sB&&TIER_COLOR[sB.tier])||'#334');
          const a=sA?.occ&&sB?.occ?0.14:0.04;
          lv.push(ax,ay,az,bx,by,bz);
          lc.push(cA[0]*a,cA[1]*a,cA[2]*a,cB[0]*a,cB[1]*a,cB[2]*a);
          f++;
        }
      }
    }
    if(lv.length){
      const geo=new this.T.BufferGeometry();
      geo.setAttribute('position',new this.T.BufferAttribute(new Float32Array(lv),3));
      geo.setAttribute('color',new this.T.BufferAttribute(new Float32Array(lc),3));
      this.constellations=new this.T.LineSegments(geo,new this.T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:1.0,blending:this.T.AdditiveBlending,depthWrite:false}));
      this._group.add(this.constellations);
    }
  }

  setNodes(slots,animate=false){
    if(!animate){this._buildNodes(slots);return;}
    if(this.transitioning){this._buildNodes(slots);return;}
    this.transitioning=true;
    const G=this.G;
    const doSwap=()=>{
      this._buildNodes(slots);
      if(this._group){
        this._group.scale.set(0,0,0);
        G.to(this._group.scale,{x:1,y:1,z:1,duration:0.65,ease:'expo.out',onComplete:()=>{this.transitioning=false;}});
      }else{this.transitioning=false;}
    };
    G.to(this._group.scale,{x:0,y:0,z:0,duration:0.22,ease:'power3.in',onComplete:doSwap});
  }

  zoom(delta){this.zoomTarget=Math.max(10,Math.min(50,this.zoomTarget+delta*0.013));}

  handleClick(cx,cy){
    if(!this.nodeMesh||!this.onFaceClick)return;
    const rect=this.canvas.getBoundingClientRect();
    const x=((cx-rect.left)/rect.width)*2-1;
    const y=-((cy-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera({x,y},this.camera);
    const hits=this.raycaster.intersectObject(this.nodeMesh);
    if(hits.length>0){
      const slot=this.nodeSlots[hits[0].index]||null;
      if(slot)this.onFaceClick(slot);
    }
  }

  _bindEvents(){
    const canvas=this.canvas,h=this._h;
    let lx=0,ly=0,moved=false;
    h.md=e=>{this.isDragging=true;moved=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0};};
    h.mm=e=>{
      if(!this.isDragging)return;
      const dx=e.clientX-lx,dy=e.clientY-ly;
      if(Math.abs(dx)>1||Math.abs(dy)>1)moved=true;
      this.rot.y+=dx*0.005;this.rot.x+=dy*0.005;
      this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));
      this.vel={x:dx*0.005,y:dy*0.005};lx=e.clientX;ly=e.clientY;
    };
    h.mu=e=>{if(!moved)this.handleClick(e.clientX,e.clientY);this.isDragging=false;};
    canvas.addEventListener('mousedown',h.md);
    window.addEventListener('mousemove',h.mm);
    window.addEventListener('mouseup',h.mu);
    h.ts=e=>{
      if(e.touches.length===1){this.isDragging=true;moved=false;lx=e.touches[0].clientX;ly=e.touches[0].clientY;this.touchStart={x:lx,y:ly};this.pinchDist=null;}
      else if(e.touches.length===2){this.isDragging=false;const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;this.pinchDist=Math.sqrt(dx*dx+dy*dy);}
    };
    h.tm=e=>{
      e.preventDefault();
      if(e.touches.length===1&&this.isDragging){
        const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;
        if(Math.abs(dx)>2||Math.abs(dy)>2)moved=true;
        this.rot.y+=dx*0.005;this.rot.x+=dy*0.005;
        this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));
        this.vel={x:dx*0.005,y:dy*0.005};lx=e.touches[0].clientX;ly=e.touches[0].clientY;
      }else if(e.touches.length===2&&this.pinchDist!==null){
        const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
        const d=Math.sqrt(dx*dx+dy*dy);this.zoom((this.pinchDist-d)*3);this.pinchDist=d;
      }
    };
    h.te=e=>{if(e.changedTouches.length===1&&!moved&&this.touchStart)this.handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY);this.isDragging=false;};
    canvas.addEventListener('touchstart',h.ts,{passive:false});
    canvas.addEventListener('touchmove',h.tm,{passive:false});
    canvas.addEventListener('touchend',h.te);
  }

  _animate(){
    this.animId=requestAnimationFrame(()=>this._animate());
    const t=Date.now()*0.001;
    if(!this.isDragging){
      this.rot.y+=this.vel.x;this.rot.x+=this.vel.y;
      this.vel.x*=0.93;this.vel.y*=0.93;
      this.rot.y+=0.0006;
    }
    if(this._group){this._group.rotation.x=this.rot.x;this._group.rotation.y=this.rot.y;}
    if(this.stars){this.stars.rotation.y=t*0.0007;this.stars.rotation.x=Math.sin(t*0.00012)*0.025;}
    if(this.stars2)this.stars2.rotation.y=-t*0.0011;
    if(this._atmoHaze)this._atmoHaze.rotation.y=-t*0.0012;
    if(this.ring1)this.ring1.rotation.z=t*0.06;
    if(this.ring2)this.ring2.rotation.z=-t*0.035;
    if(this.particleMesh){
      const s=1.0+Math.sin(t*0.28)*0.008;
      this.particleMesh.scale.set(s,s,s);
      this.particleMesh.material.opacity=0.30+Math.sin(t*0.4)*0.06;
    }
    if(this._glowLayer)this._glowLayer.material.opacity=0.12+Math.sin(t*0.7)*0.06;
    if(this._epicGlow)this._epicGlow.material.opacity=0.22+Math.sin(t*1.4)*0.12;
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.07;
    this.camera.position.z=this.zoomCurrent;
    this.renderer.render(this.scene,this.camera);
  }

  resize(){
    const W=this.canvas.clientWidth,H=this.canvas.clientHeight;
    if(!W||!H)return;
    this.camera.aspect=W/H;this.camera.updateProjectionMatrix();
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
    this._clearNodes();
    this.renderer?.dispose();
  }
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

function CosmicLoader() {
  return (
    <div style={{position:'absolute',inset:0,zIndex:60,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:32,background:'radial-gradient(ellipse 70% 60% at 50% 50%, #060d2e 0%, #010208 100%)'}}>
      <div style={{position:'relative',width:80,height:80}}>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'1px solid rgba(212,168,75,0.10)',borderTopColor:U.accent,animation:'vSpin 1.2s linear infinite'}}/>
        <div style={{position:'absolute',inset:12,borderRadius:'50%',border:'1px solid rgba(68,153,255,0.08)',borderRightColor:'#4499ff',animation:'vSpin 0.8s linear infinite reverse'}}/>
        <div style={{position:'absolute',inset:24,borderRadius:'50%',border:'1px solid rgba(180,80,255,0.10)',borderBottomColor:'#b450ff',animation:'vSpin 1.6s linear infinite'}}/>
        <div style={{position:'absolute',inset:'50%',width:10,height:10,marginLeft:-5,marginTop:-5,borderRadius:'50%',background:U.accent,boxShadow:`0 0 20px ${U.accent},0 0 40px ${U.accent}66`,animation:'vPulse 1.4s ease-in-out infinite'}}/>
      </div>
      <div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:6}}>
        <span style={{color:U.accent,fontSize:11,fontWeight:700,letterSpacing:'0.22em',fontFamily:F.b,animation:'vFade 1.6s ease-in-out infinite'}}>CHARGEMENT COSMOS</span>
        <span style={{color:U.mutedLo,fontSize:9,letterSpacing:'0.14em',fontFamily:F.b}}>ADS · SQUARE</span>
      </div>
    </div>
  );
}

const LevelDots = memo(function LevelDots({ level, onLevel }) {
  return (
    <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:3,zIndex:30,padding:'6px 10px',borderRadius:50,background:'rgba(4,6,22,0.82)',backdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 8px 40px rgba(0,0,0,0.7)'}}>
      {LEVELS.map(lv => {
        const active=lv.n===level;
        return (
          <button key={lv.n} onClick={()=>onLevel(lv.n)} title={`${lv.icon} ${lv.name}${lv.count?` · ${lv.count} nœuds`:''}`} style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:active?'5px 14px':'5px 10px',height:32,borderRadius:40,border:active?`1px solid ${U.accent}55`:'1px solid transparent',background:active?`linear-gradient(135deg,${U.accent}1e,${U.accent}0d)`:'transparent',color:active?U.accentBright:'rgba(180,195,255,0.30)',fontSize:11,fontWeight:active?800:500,cursor:'pointer',transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',fontFamily:F.b,boxShadow:active?`0 0 18px ${U.accent}35`:'none',flexShrink:0,overflow:'hidden'}}>
            {active&&<div style={{position:'absolute',bottom:0,left:'15%',right:'15%',height:1.5,background:`linear-gradient(90deg,transparent,${U.accent},transparent)`,borderRadius:2}}/>}
            <span style={{fontSize:10}}>{lv.icon}</span>
            {active&&<span style={{fontSize:9,letterSpacing:'0.05em'}}>{lv.name}</span>}
          </button>
        );
      })}
    </div>
  );
});

const TierLegend = memo(function TierLegend({ level, nodeCount }) {
  return (
    <div style={{position:'absolute',top:16,right:16,zIndex:30,display:'flex',flexDirection:'column',gap:2}}>
      {level>0&&(
        <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end',padding:'5px 12px',borderRadius:30,marginBottom:6,background:'rgba(4,6,22,0.82)',backdropFilter:'blur(16px)',border:`1px solid ${U.accent}28`,boxShadow:`0 0 22px ${U.accent}12`}}>
          <span style={{color:U.accent,fontSize:14}}>{LEVELS[level]?.icon}</span>
          <span style={{color:U.accentBright,fontSize:10,fontWeight:800,letterSpacing:'0.09em',fontFamily:F.h}}>{LEVELS[level]?.name?.toUpperCase()}</span>
          <span style={{color:U.mutedLo,fontSize:9,fontFamily:F.b,background:'rgba(255,255,255,0.04)',padding:'1px 8px',borderRadius:20,border:'1px solid rgba(255,255,255,0.06)'}}>{nodeCount} nœuds</span>
        </div>
      )}
      {TIER_ORDER.filter(t=>TIER_COLOR[t]).map(tier=>(
        <div key={tier} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',borderRadius:30,background:'rgba(4,6,22,0.76)',backdropFilter:'blur(12px)',border:`1px solid ${TIER_COLOR[tier]}12`}}>
          <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:TIER_COLOR[tier],boxShadow:`0 0 8px ${TIER_COLOR[tier]},0 0 16px ${TIER_COLOR[tier]}55`}}/>
          <span style={{color:'rgba(180,195,255,0.45)',fontSize:9,fontWeight:600,letterSpacing:'0.07em',fontFamily:F.b,flex:1}}>{TIER_LABEL[tier]}</span>
          <span style={{color:TIER_COLOR[tier],fontSize:9,fontWeight:800,fontFamily:F.m,textShadow:`0 0 12px ${TIER_COLOR[tier]}88`}}>€{priceEur(tier)}/j</span>
        </div>
      ))}
    </div>
  );
});

function ZoomHint() {
  const [vis,setVis]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setVis(false),5000);return()=>clearTimeout(t);},[]);
  if(!vis)return null;
  return (
    <div style={{position:'absolute',bottom:72,left:'50%',transform:'translateX(-50%)',padding:'5px 18px',borderRadius:40,background:'rgba(4,6,22,0.72)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.06)',color:'rgba(180,195,255,0.35)',fontSize:10,letterSpacing:'0.06em',fontFamily:F.b,zIndex:20,pointerEvents:'none',whiteSpace:'nowrap'}}>
      ↕ zoom · ⟳ tourner · ● cliquer un nœud
    </div>
  );
}

function BackButton({ onClick }) {
  const [h,sH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{position:'absolute',top:16,left:16,zIndex:30,display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:40,background:h?'rgba(8,12,36,0.97)':'rgba(4,6,22,0.80)',backdropFilter:'blur(16px)',borderWidth:1,borderStyle:'solid',borderColor:h?'rgba(255,255,255,0.16)':'rgba(255,255,255,0.07)',color:h?U.text:U.muted,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:F.b,letterSpacing:'0.06em',transition:'all 0.18s ease',boxShadow:h?'0 6px 24px rgba(0,0,0,0.6)':'0 2px 12px rgba(0,0,0,0.4)'}}>
      <span style={{fontSize:11,opacity:0.6}}>◫</span> Vue 2D
    </button>
  );
}

function CosmosButton({ onClick }) {
  const [h,sH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{position:'absolute',top:12,right:12,zIndex:100,display:'flex',alignItems:'center',gap:8,padding:'8px 18px',borderRadius:40,background:h?'rgba(8,10,28,0.97)':'rgba(4,6,20,0.85)',backdropFilter:'blur(16px)',border:`1px solid ${h?U.accent+'70':U.accent+'35'}`,color:h?U.accentBright:U.accent,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:F.b,letterSpacing:'0.06em',boxShadow:h?`0 0 30px ${U.accent}30`:`0 0 18px ${U.accent}14`,transition:'all 0.2s ease'}}>
      <span style={{animation:'vPulse 2s ease-in-out infinite'}}>✦</span> Vue Cosmos 3D
    </button>
  );
}

function BlockOverlay3D({ slot, onClose, onRent, onBuyout }) {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setMounted(true),12);return()=>clearTimeout(t);},[]);
  if(!slot)return null;
  const color=TIER_COLOR[slot.tier]||U.accent;
  const label=TIER_LABEL[slot.tier]||slot.tier;
  const price=priceEur(slot.tier);
  const isTop=slot.tier==='epicenter'||slot.tier==='prestige';

  return (
    <div onClick={onClose} style={{position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,8,0.88)',backdropFilter:'blur(28px)',display:'flex',alignItems:'center',justifyContent:'center',opacity:mounted?1:0,transition:'opacity 0.25s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:330,borderRadius:28,overflow:'hidden',background:'linear-gradient(160deg,rgba(7,10,28,0.99),rgba(3,4,14,0.99))',border:`1px solid ${color}28`,boxShadow:`0 0 0 1px rgba(255,255,255,0.04) inset,0 0 80px ${color}18,0 50px 100px rgba(0,0,0,0.95)`,transform:mounted?'scale(1) translateY(0)':'scale(0.90) translateY(24px)',transition:'transform 0.38s cubic-bezier(.34,1.56,.64,1)'}}>
        <div style={{height:2,background:`linear-gradient(90deg,transparent 0%,${color}60 20%,${color} 50%,${color}60 80%,transparent 100%)`,boxShadow:`0 0 24px ${color}88`}}/>
        <div style={{position:'absolute',top:2,left:0,right:0,height:120,pointerEvents:'none',background:`radial-gradient(ellipse 60% 80% at 50% 0%,${color}0e 0%,transparent 70%)`}}/>
        <div style={{padding:'22px 24px 26px',position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'5px 14px',borderRadius:40,background:`${color}14`,border:`1px solid ${color}40`,boxShadow:`0 0 20px ${color}20`}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:color,boxShadow:`0 0 10px ${color},0 0 20px ${color}88`,animation:'vPulse 2.4s ease-in-out infinite'}}/>
              <span style={{color,fontSize:10,fontWeight:900,letterSpacing:'0.13em',fontFamily:F.h}}>{label}</span>
            </div>
            <button onClick={onClose} style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.10)',color:'rgba(255,255,255,0.38)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.09)';e.currentTarget.style.color='rgba(255,255,255,0.8)';}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='rgba(255,255,255,0.38)';}}>×</button>
          </div>
          <div style={{width:66,height:66,borderRadius:20,marginBottom:20,background:slot.occ?`radial-gradient(circle at 35% 35%,${color}30,${color}08)`:'rgba(255,255,255,0.025)',border:`1.5px solid ${color}${slot.occ?'55':'15'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color,fontFamily:F.h,boxShadow:slot.occ?`0 0 32px ${color}28,0 0 0 5px ${color}08`:'none'}}>
            {slot.tenant?.l||(slot.occ?'◉':'○')}
          </div>
          <div style={{marginBottom:20}}>
            <div style={{color:U.text,fontSize:18,fontWeight:800,fontFamily:F.h,marginBottom:5,letterSpacing:'-0.01em',lineHeight:1.2}}>
              {slot.occ?(slot.tenant?.name||`Bloc ${label}`):`Emplacement ${label}`}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:7,color:U.muted,fontSize:11,fontFamily:F.b}}>
              <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',flexShrink:0,background:slot.occ?'#00e8a2':color,boxShadow:`0 0 8px ${slot.occ?'#00e8a2':color}`}}/>
              {slot.occ?(slot.tenant?.cta||'Actuellement occupé'):'Emplacement disponible · Visible de toute la grille'}
            </div>
          </div>
          <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)',marginBottom:20}}/>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:22}}>
            <div>
              <div style={{color:U.mutedLo,fontSize:9,fontWeight:600,letterSpacing:'0.12em',fontFamily:F.b,marginBottom:5}}>TARIF / JOUR</div>
              <div style={{display:'flex',alignItems:'baseline',gap:3}}>
                <span style={{color,fontSize:34,fontWeight:900,fontFamily:F.h,letterSpacing:'-0.02em',textShadow:`0 0 40px ${color}66`}}>€{price}</span>
                <span style={{color:U.mutedLo,fontSize:12,fontFamily:F.b,marginBottom:3}}>/j</span>
              </div>
            </div>
            {isTop&&(
              <div style={{padding:'7px 12px',borderRadius:12,background:`${color}12`,border:`1px solid ${color}28`,textAlign:'center'}}>
                <div style={{color,fontSize:9,fontWeight:800,letterSpacing:'0.1em',fontFamily:F.b}}>✦ PREMIUM</div>
                <div style={{color:U.mutedLo,fontSize:8,fontFamily:F.b,marginTop:3}}>{slot.tier==='epicenter'?'#1 mondial':'Top tier'}</div>
              </div>
            )}
          </div>
          {!slot.occ?(
            <button onClick={()=>onRent(slot)} style={{width:'100%',padding:'15px 0',borderRadius:14,background:`linear-gradient(135deg,${color},${color}cc)`,border:'none',color:'#060408',fontSize:13,fontWeight:900,fontFamily:F.b,cursor:'pointer',letterSpacing:'0.06em',boxShadow:`0 0 36px ${color}55,0 10px 28px rgba(0,0,0,0.5)`,transition:'all 0.2s ease'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 0 50px ${color}77,0 14px 36px rgba(0,0,0,0.6)`;}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 0 36px ${color}55,0 10px 28px rgba(0,0,0,0.5)`;}}>
              Réserver ce nœud →
            </button>
          ):(
            <button onClick={()=>onBuyout(slot)} style={{width:'100%',padding:'14px 0',borderRadius:14,background:`${color}0f`,border:`1px solid ${color}22`,color:U.muted,fontSize:12,fontWeight:700,fontFamily:F.b,cursor:'pointer',letterSpacing:'0.03em',transition:'all 0.2s ease'}} onMouseEnter={e=>{e.currentTarget.style.background=`${color}1e`;e.currentTarget.style.color=color;}} onMouseLeave={e=>{e.currentTarget.style.background=`${color}0f`;e.currentTarget.style.color=U.muted;}}>
              Faire une offre de rachat
            </button>
          )}
          <div style={{marginTop:12,textAlign:'center',color:U.mutedLo,fontSize:9,fontFamily:F.b,letterSpacing:'0.04em'}}>Paiement sécurisé · Résiliation à tout moment</div>
        </div>
      </div>
    </div>
  );
}

function HUDCorners() {
  const s=U.accent+'28';
  const tl={position:'absolute',top:14,left:14,width:22,height:22,borderTop:`1.5px solid ${s}`,borderLeft:`1.5px solid ${s}`,borderRadius:'4px 0 0 0',pointerEvents:'none'};
  const tr={position:'absolute',top:14,right:14,width:22,height:22,borderTop:`1.5px solid ${s}`,borderRight:`1.5px solid ${s}`,borderRadius:'0 4px 0 0',pointerEvents:'none'};
  const bl={position:'absolute',bottom:14,left:14,width:22,height:22,borderBottom:`1.5px solid ${s}`,borderLeft:`1.5px solid ${s}`,borderRadius:'0 0 0 4px',pointerEvents:'none'};
  const br={position:'absolute',bottom:14,right:14,width:22,height:22,borderBottom:`1.5px solid ${s}`,borderRight:`1.5px solid ${s}`,borderRadius:'0 0 4px 0',pointerEvents:'none'};
  return <>{[tl,tr,bl,br].map((st,i)=><div key={i} style={st}/>)}</>;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function View3D({ slots=[], isLive=false, onGoAdvertiser, onWaitlist, onCheckout, onBuyout, ExistingPublicView }) {
  const canvasRef=useRef(null);const sceneRef=useRef(null);
  const [level,setLevel]=useState(1);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [focusSlot,setFocusSlot]=useState(null);
  const sortedSlots=useMemo(()=>sortSlotsByTier(slots),[slots]);
  const levelSlots=useMemo(()=>{
    if(level===0)return[];
    return sortedSlots.slice(0,LEVELS[level]?.count||6);
  },[level,sortedSlots]);

  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let scene;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)]).then(([THREE,GSAP])=>{
      scene=new Scene3D(canvasRef.current);sceneRef.current=scene;
      scene.onFaceClick=(slot)=>setFocusSlot(slot);
      return scene.init(THREE,GSAP);
    }).then(()=>{sceneRef.current.setNodes(levelSlots,false);setLoading(false);})
    .catch(err=>{console.error('View3D:',err);setError('Three.js non disponible — npm install three gsap');setLoading(false);});
    return()=>{if(scene)scene.destroy();sceneRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{if(!sceneRef.current||level===0)return;sceneRef.current.setNodes(levelSlots,true);},[levelSlots,level]);

  useEffect(()=>{
    const fn=e=>{
      if(e.key>='0'&&e.key<='6')setLevel(parseInt(e.key));
      else if(e.key==='ArrowRight'||e.key==='ArrowUp')setLevel(l=>Math.min(6,l+1));
      else if(e.key==='ArrowLeft'||e.key==='ArrowDown')setLevel(l=>Math.max(1,l-1));
      else if(e.key==='Escape')setFocusSlot(null);
    };
    window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);
  },[]);

  useEffect(()=>{
    const fn=e=>{e.preventDefault();sceneRef.current?.zoom(e.deltaY);};
    const canvas=canvasRef.current;
    if(canvas)canvas.addEventListener('wheel',fn,{passive:false});
    return()=>{if(canvas)canvas.removeEventListener('wheel',fn);};
  },[level]);

  useEffect(()=>{
    if(!canvasRef.current)return;
    const ro=new ResizeObserver(()=>sceneRef.current?.resize());
    ro.observe(canvasRef.current);return()=>ro.disconnect();
  },[]);

  const handleLevel=useCallback(n=>{setFocusSlot(null);setLevel(n);},[]);

  if(level===0)return(
    <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      <CosmosButton onClick={()=>handleLevel(1)}/>
      {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
    </div>
  );

  return (
    <div style={{flex:1,position:'relative',overflow:'hidden',background:'radial-gradient(ellipse 90% 80% at 50% 45%,#060d2e 0%,#01020a 70%,#010208 100%)'}}>
      <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',cursor:focusSlot?'default':'grab',opacity:loading?0:1,transition:'opacity 0.7s ease'}}/>
      {/* Vignette */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:3,background:'radial-gradient(ellipse 80% 80% at 50% 50%,transparent 45%,rgba(1,2,8,0.65) 100%)'}}/>
      {/* Scanlines */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.014) 2px,rgba(0,0,0,0.014) 4px)'}}/>
      <HUDCorners/>
      {loading&&!error&&<CosmicLoader/>}
      {error&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:24,background:'rgba(1,2,8,0.96)',zIndex:60}}>
          <div style={{padding:'8px 18px',borderRadius:12,background:'rgba(255,77,109,0.10)',border:'1px solid rgba(255,77,109,0.25)',color:U.err,fontSize:12,fontWeight:700,fontFamily:F.b}}>⚠ {error}</div>
          <button onClick={()=>handleLevel(0)} style={{padding:'10px 24px',borderRadius:40,background:U.accent,border:'none',color:U.accentFg,fontWeight:800,cursor:'pointer',fontFamily:F.b,fontSize:12}}>Revenir à la grille 2D</button>
        </div>
      )}
      <BackButton onClick={()=>handleLevel(0)}/>
      <TierLegend level={level} nodeCount={levelSlots.length}/>
      <LevelDots level={level} onLevel={handleLevel}/>
      {!loading&&<ZoomHint/>}
      {focusSlot&&<BlockOverlay3D slot={focusSlot} onClose={()=>setFocusSlot(null)} onRent={s=>{setFocusSlot(null);onCheckout?.(s);}} onBuyout={s=>{setFocusSlot(null);onBuyout?.(s);}}/>}
      <style>{`@keyframes vSpin{to{transform:rotate(360deg)}}@keyframes vPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82)}}@keyframes vFade{0%,100%{opacity:.9}50%{opacity:.4}}`}</style>
    </div>
  );
}