'use client';
/**
 * ADS·SQUARE — DYSON SPHERE ✦ 4K HDR MEGASTRUCTURE EDITION
 *
 * Rendu Hollywood-grade, qualité jeu-vidéo AAA :
 * ─ PBR metallic panels avec iridescence, microdetails, anisotropy
 * ─ Post-processing : bloom multi-pass, chromatic aberration, film grain
 * ─ Vignette cinématique + tone mapping ACES Filmic
 * ─ Plasma stellaire ultra-réaliste (corona, spicules, chromosphere)
 * ─ Nébuleuse volumétrique de fond multi-couleur
 * ─ God rays exponentiels avec diffusion atmosphérique
 * ─ Légers flares sur les arêtes des panneaux (iridescent coating)
 * ─ Starfield haute densité avec effets de scintillement
 * ─ Rendu HDR via RenderTarget 16-bit + composition final
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_COLOR, TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ── Design System ──────────────────────────────────────────────────────────────
const DS = {
  void:'#05060A', glass:'rgba(6,8,14,0.82)', glassBrd:'rgba(255,255,255,0.06)',
  glassBrdHi:'rgba(255,255,255,0.12)', gold:'#FFB700', cyan:'#00D4FF',
  violet:'#9D50FF', green:'#00FF94', rose:'#FF3D72',
  textHi:'#EEF2FF', textMid:'rgba(200,212,248,0.70)', textLo:'rgba(140,162,220,0.36)',
};
const TIER_NEON = {
  epicenter:'#FFD060', prestige:'#80C8FF', elite:'#60A0E8',
  business:'#4888CC', standard:'#3068A8', viral:'#50D0B0',
};
const TIER_ROLE = {
  epicenter:{ icon:'☀', role:'Source Absolue',      desc:"L'étoile. Votre marque EST l'épicentre. Impossible à ignorer." },
  prestige: { icon:'◈', role:'Capteurs Primaires',   desc:'Panneaux géants, proches de l\'étoile. ROI maximal.' },
  elite:    { icon:'◆', role:'Cristaux Énergétiques',desc:'Zone élite. Grands panneaux, fort rayonnement.' },
  business: { icon:'▣', role:'Relais Technologiques',desc:'Présence solide sur la sphère. Trafic qualifié.' },
  standard: { icon:'▪', role:'Émetteurs Standard',   desc:'Entrée sur la sphère. Visibilité globale.' },
  viral:    { icon:'⚡', role:'Drones Orbitaux',      desc:'Micro-fragments qui orbitent. Tâches marketing.' },
};
const F = { ui:"'Sora','DM Sans',system-ui,sans-serif", mono:"'JetBrains Mono','Fira Code',monospace" };
const TIER_ORDER  = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_TOTALS = { epicenter:1, prestige:8, elite:50, business:176, standard:400, viral:671 };
const LEVELS = [
  {n:0,name:'GRID 2D',icon:'▦',faces:0}, {n:1,name:'CUBE',icon:'⬡',faces:6},
  {n:2,name:'OCTA',icon:'◆',faces:8},   {n:3,name:'ICO',icon:'⬟',faces:20},
  {n:4,name:'SPHERE·I',icon:'◎',faces:80}, {n:5,name:'SPHERE·II',icon:'◉',faces:320},
  {n:6,name:'COSMOS',icon:'✦',faces:1280},
];

const SPHERE_R  = 5.8;
const PANEL_GAP = 0.82; // base contraction
const STAR_R    = 1.15;
const fmt  = t => ((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const hex3 = h => { const s=(h||'#aaa').replace('#',''); return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]; };

// Taille réelle des panneaux par tier — la différence DOIT être dramatique
const TIER_PANEL_SCALE = {
  epicenter: 1.22,  // panneau quasi-plein (gap=0.82*1.22≈1.0 → immense)
  prestige:  1.05,  // très grand
  elite:     0.88,  // grand
  business:  0.70,  // moyen
  standard:  0.52,  // petit
  viral:     0.26,  // minuscule (beaucoup d'espace vide autour)
};

// ── GLSL : PBR Panels 4K HDR ────────────────────────────────────────────────────
const PANEL_VERT = `
precision highp float;
attribute float aOccupied; attribute vec3 aTierColor; attribute float aTierIdx;
attribute float aFaceIdx;  attribute vec3 aBary;
uniform float uTime, uHovered, uSelected;
varying vec3  vN, vWP, vTC, vBary, vViewDir;
varying float vOcc, vTI, vFI, vFresnel, vHov, vSel, vDepth;
void main(){
  vN  = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;
  vOcc=aOccupied; vTC=aTierColor; vTI=aTierIdx; vFI=aFaceIdx; vBary=aBary;
  vHov = step(abs(aFaceIdx-uHovered), 0.5);
  vSel = step(abs(aFaceIdx-uSelected),0.5);
  vec3 vd = normalize(cameraPosition - wp.xyz);
  vViewDir = vd;
  float cosA = clamp(dot(vN,vd), 0.0, 1.0);
  vFresnel = pow(1.0 - cosA, 4.2);
  vec3 pos = position;
  if(vSel>0.5)      pos += normalize(position)*(0.22+0.08*sin(uTime*3.5));
  else if(vHov>0.5) pos += normalize(position)*0.13;
  vec4 mvp = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vDepth = mvp.z / mvp.w;
  gl_Position = mvp;
}`;

const PANEL_FRAG = `
precision highp float;
#extension GL_OES_standard_derivatives : enable
uniform float uTime;
varying vec3  vN, vWP, vTC, vBary, vViewDir;
varying float vOcc, vTI, vFI, vFresnel, vHov, vSel, vDepth;

float edgeF(float w){ vec3 d=fwidth(vBary); vec3 a=smoothstep(vec3(0.0),d*w,vBary); return 1.0-min(min(a.x,a.y),a.z); }
float hash(float n){ return fract(sin(n)*43758.5453); }

// GGX specular
float GGX(float NdotH, float roughness){
  float a2 = roughness*roughness*roughness*roughness;
  float d  = NdotH*NdotH*(a2-1.0)+1.0;
  return a2/(3.14159265*d*d);
}

// Photovoltaic cell grid — replicates real solar panel look
float solarCells(vec3 wp, float cellSize){
  // World-space UV projected onto panel face
  vec2 uv = vec2(dot(wp, vec3(1.0,0.0,0.4)), dot(wp, vec3(0.0,1.0,0.3)));
  uv *= cellSize;
  vec2 cell = fract(uv);
  // Cell border (metallic busbar lines)
  float bx = smoothstep(0.92, 1.0, cell.x) + smoothstep(0.08, 0.0, cell.x);
  float by = smoothstep(0.92, 1.0, cell.y) + smoothstep(0.08, 0.0, cell.y);
  float border = clamp(bx + by, 0.0, 1.0);
  // Sub-cell finger lines (thin metallic conductors)
  float fx = step(0.97, fract(uv.x * 3.0)) * 0.5;
  float fy = step(0.97, fract(uv.y * 3.0)) * 0.5;
  return clamp(border*1.0 + fx + fy, 0.0, 1.0);
}

// Anisotropic brushed metal (for structural frame)
float brushedMetal(vec3 wp, float seed){
  float grain = fract(sin(dot(wp.xy + seed, vec2(18.9898, 78.233))) * 43758.5);
  float streaks = abs(sin(wp.x * 120.0 + seed)) * 0.5 + 0.5;
  return mix(grain * 0.5 + 0.5, streaks, 0.4);
}

void main(){
  float t = uTime;
  int   ti = int(vTI+0.5);
  bool  hov = vHov>0.5, sel = vSel>0.5;

  float seed   = hash(vFI*13.7+2.3);
  float pulse  = 0.88 + 0.12*sin(t*(0.45+seed*0.25)+seed*6.28);
  float pulseF = 0.92 + 0.08*sin(t*1.4+seed*3.0);
  float edge1  = edgeF(0.8);
  float edge4  = edgeF(5.0);
  float edge12 = edgeF(16.0);

  // PBR — roughness/metalness by tier
  float roughness = ti==0?0.05:(ti==1?0.10:(ti==2?0.16:(ti==3?0.26:(ti==4?0.38:0.50))));
  float metalness = ti==0?0.92:(ti==1?0.88:(ti==2?0.80:(ti==3?0.70:0.58)));

  if(gl_FrontFacing){
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PHOTOVOLTAIC SOLAR PANEL SURFACE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Panel size drives cell density: big panels have bigger visible cells
    float cellDensity = ti==0?3.5:(ti==1?5.0:(ti==2?7.0:(ti==3?9.0:(ti==4?11.0:14.0))));

    // PV cell base color: deep cobalt-blue / dark blue-black semiconductor
    // Real monocrystalline silicon: very dark navy with subtle blue sheen
    vec3 cellBase = mix(
      vec3(0.015, 0.022, 0.048),   // monocrystalline dark (top tiers)
      vec3(0.025, 0.038, 0.075),   // polycrystalline slightly lighter (lower tiers)
      float(ti) / 5.0
    );

    // Anti-reflective coating: thin-film blue-purple interference
    // The characteristic blue of solar panels comes from this AR coating
    float cosA = clamp(dot(vN, vViewDir), 0.0, 1.0);
    float coating = pow(1.0 - cosA, 1.6);
    vec3 arCoating = mix(
      vec3(0.04, 0.08, 0.22),   // deep blue at normal incidence
      vec3(0.12, 0.18, 0.40),   // violet-blue at grazing
      coating
    );
    cellBase += arCoating * 0.65;

    // Cell grid pattern
    float cells = solarCells(vWP, cellDensity);
    // Busbars (metallic silver lines between cells)
    vec3 busbar = vec3(0.62, 0.68, 0.75) * cells;
    // Add subtle reflection variation per cell (real PV panels look slightly non-uniform)
    float cellVar = hash(seed + floor(vWP.x*cellDensity)*53.0 + floor(vWP.y*cellDensity)*17.0);
    cellBase += vec3(0.008, 0.012, 0.025) * cellVar;

    // ── Star light from center — warm directional
    vec3 toStar = normalize(-vWP);
    float nDotL = max(0.0, dot(vN, toStar));
    vec3 h = normalize(toStar + vViewDir);
    float nDotH = max(0.0, dot(vN, h));

    // Specular reflection on glass cover (low roughness glass surface)
    float specGlass = GGX(nDotH, 0.08) * 0.65 * nDotL;
    vec3 starColor  = mix(vec3(1.0,0.95,0.78), vec3(1.0,0.88,0.55), 0.4);
    vec3 glassRefl  = starColor * specGlass * (1.5 + float(5-ti)*0.15);

    // Fresnel rim — glass/frame edge glow from stellar light
    vec3 rimLight = mix(starColor*0.8, vec3(0.6,0.75,1.0), 0.35);
    vec3 rim = rimLight * pow(vFresnel, 2.0) * (0.8 + float(5-ti)*0.15) * pulse;

    // ── Structural frame between panels — metallic silver/gold
    // Wide edge = frame structure (aluminum alloy)
    float frame = edge4;
    float frameBase = brushedMetal(vWP*0.8, seed);
    // Frame color: weathered aluminum (silver-warm) with solar heating on top tiers
    vec3 frameColor = mix(
      vec3(0.35, 0.38, 0.42),    // standard aluminum
      vec3(0.60, 0.52, 0.28),    // gold-heated titanium (top tier)
      max(0.0, 1.0 - float(ti)*0.22)
    );
    frameColor *= (0.82 + frameBase*0.36);
    // Frame specular from star
    float frameSpec = GGX(nDotH, 0.12) * metalness * nDotL * 2.0;
    frameColor += starColor * frameSpec * 0.8;

    // Inner frame edge glow (structural joints — tiny cyan/blue light seeping)
    float innerEdge = edge1;
    vec3 structureGlow = mix(vec3(0.3,0.6,1.0), vec3(0.5,0.8,1.0), vFresnel) * innerEdge
                       * (0.6 + float(5-ti)*0.12) * pulse;

    // ── Occupied panel: brand color tint on AR coating
    vec3 brandMod = vec3(0.0);
    if(vOcc > 0.5){
      // Subtle tint on the glass — like a colored filter layer
      float tintStr = ti==0?0.18:(ti==1?0.13:(ti==2?0.09:(ti==3?0.06:0.04)));
      brandMod = vTC * tintStr * pulse;

      if(ti==0){ // Epicenter: energy resonance on cells
        float hex_u = fract(vWP.x*4.2+vWP.z*2.1);
        float hex_v = fract(vWP.y*4.2-vWP.z*2.1);
        float hexCell = max(step(0.88,hex_u), step(0.88,hex_v));
        brandMod += vTC * hexCell * 0.12 * pulse;
      } else if(ti==1){ // Prestige: pulse wave across panel surface
        float wave = sin(vWP.x*8.0+vWP.y*6.0-t*1.5)*0.5+0.5;
        brandMod += vTC * pow(wave,4.0) * 0.08;
      }
    }

    // ── Selection / hover highlights
    vec3 hovGlow  = vec3(0.0);
    if(sel){
      // Bright frame selection with subtle color flash
      hovGlow = mix(vec3(1.0,0.92,0.5), vTC, 0.5) * edge4 * (1.5 + 0.5*sin(t*5.0));
      hovGlow += vTC * edge12 * (0.3 + 0.3*sin(t*5.0));
    } else if(hov){
      hovGlow = mix(vec3(0.6,0.8,1.0), vTC, 0.3) * edge4 * 0.8;
    }

    // ── Composite: cell body + busbars + frame + glow
    vec3 panelSurface = cellBase + busbar * 0.25;
    vec3 color = mix(panelSurface, frameColor, frame * 0.75)
               + glassRefl + rim + structureGlow + brandMod + hovGlow;

    gl_FragColor = vec4(color, 1.0);

  } else {
    // ── Inner face: thermal absorber — intense orange-red-white
    vec3 starDir  = normalize(-vWP);
    float diffuse = max(0.0, dot(-vN, starDir));
    float hotspot = exp(-dot(vWP,vWP)*0.04);

    vec3 cold  = vec3(0.65,0.20,0.0);
    vec3 hot   = vec3(1.0, 0.75,0.25);
    vec3 white = vec3(1.0, 0.96,0.88);
    vec3 inner = mix(cold, hot, diffuse);
    inner      = mix(inner, white, pow(diffuse,2.5)*hotspot);

    // Thermal cell backside (back-contact solar cells glow intensely)
    float cellBack = solarCells(vWP, 8.0);
    inner += mix(vec3(1.0,0.4,0.0), vec3(1.0,0.85,0.3), diffuse) * (1.0-cellBack) * 0.4 * diffuse;

    inner *= (0.65 + diffuse*0.9) * (1.0+hotspot*0.5);
    if(vOcc>0.5) inner = mix(inner, vTC*2.0, 0.30);
    gl_FragColor = vec4(inner, 1.0);
  }
}`;

// ── GLSL : Sphère interne — lueur solaire volumétrique HDR ───────────────────
const IGLOW_VERT = `varying vec3 vN; varying vec3 vWP;
void main(){ vN=normalize(normalMatrix*normal); vec4 wp=modelMatrix*vec4(position,1.0); vWP=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const IGLOW_FRAG = `
precision highp float;
uniform float uTime; varying vec3 vN; varying vec3 vWP;
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){
  vec3 vd = normalize(cameraPosition - vWP);
  float cosA = clamp(dot(vN,vd),0.0,1.0);
  float fresnel = pow(1.0-cosA, 1.2);
  float pulse = 0.75+0.25*sin(uTime*0.65+hash(dot(vN,vec3(1.0)))*3.14);
  // Temperature layers: white core -> orange -> deep crimson
  vec3 hotCore   = vec3(1.0, 0.98, 0.90);
  vec3 midFlare  = vec3(1.0, 0.55, 0.08);
  vec3 outerGlow = vec3(0.95, 0.18, 0.02);
  vec3 col = mix(hotCore, midFlare, fresnel);
  col      = mix(col, outerGlow, pow(fresnel,0.6));
  // Surface convection cells
  float phase = uTime*0.18;
  float cell = 0.5+0.5*sin(vWP.x*8.5+phase)*sin(vWP.y*8.5+phase*1.3)*sin(vWP.z*8.5+phase*0.7);
  col += vec3(0.4,0.15,0.0)*cell*0.3*(1.0-fresnel);
  float alpha = (0.22 + fresnel*0.65)*pulse;
  gl_FragColor = vec4(col*2.2, clamp(alpha,0.0,0.95));
}`;

// ── GLSL : God ray shafts — diffusion atmosphérique exponentielle ─────────────
const GRAY_VERT = `varying float vR; varying float vAlpha; varying vec3 vPos;
attribute float aAlpha;
void main(){ vR=length(position); vAlpha=aAlpha; vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const GRAY_FRAG = `
precision highp float;
uniform float uTime; varying float vR; varying float vAlpha; varying vec3 vPos;
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){
  // Exponential atmospheric scattering — density falloff
  float density = exp(-vR * 0.12);
  float fade  = smoothstep(${(SPHERE_R*1.18).toFixed(2)}, 0.8, vR) * density;
  
  // Multi-frequency pulsation for each shaft
  float shaft_id = hash(floor(dot(vPos, vec3(1.0,7.0,13.0))*0.01));
  float pulse = 0.55 + 0.30*sin(uTime*0.38+shaft_id*6.28) + 0.15*sin(uTime*1.2+shaft_id*3.14);
  
  // Color temperature: white-hot near star, cools to orange/crimson
  float t = clamp(vR / ${(SPHERE_R*1.1).toFixed(2)}, 0.0, 1.0);
  vec3 col = mix(vec3(1.0,0.97,0.82), vec3(1.0,0.42,0.04), t);
  col = mix(col, vec3(0.8,0.10,0.0), t*t);
  
  // Dust mote scintillation
  float mote = hash(vPos.x*31.0+vPos.y*17.0+uTime*0.5)*0.18;
  col += mote * vec3(1.0,0.85,0.6);
  
  gl_FragColor = vec4(col*pulse, vAlpha*fade*0.65);
}`;

// ── GLSL : Étoile plasma — rendu stellaire cinématique ───────────────────────
const STAR_VERT = `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const STAR_FRAG = `
precision highp float;
uniform float uTime; varying vec2 vU;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<8;i++){v+=a*h2(p);p*=2.1;a*=0.50;} return v; }
float fbm2(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*(2.0*h2(p)-1.0);p*=2.3;a*=0.52;} return v; }

void main(){
  vec2 uv=vU*2.0-1.0; float r=length(uv); if(r>1.0)discard;
  float t=uTime;
  
  // Chromosphere turbulence (multiple scales)
  vec2 uv2=uv+vec2(sin(t*0.25)*0.12,cos(t*0.19)*0.09);
  float noise1 = fbm(uv2*3.8 + t*0.14);
  float noise2 = fbm(uv2*7.5 - t*0.09)*0.55;
  float noise3 = fbm(uv2*16.0 + t*0.22)*0.22;
  float turbulence = noise1 + noise2 + noise3;
  
  // Solar prominences / spicules
  float angle = atan(uv.y, uv.x);
  float spicule_phase = angle*7.0 + t*1.1 + fbm2(uv*2.0)*2.0;
  float spicules = pow(max(0.0, sin(spicule_phase)*0.5+0.5), 5.0);
  float proms = spicules * smoothstep(0.75, 0.98, r) * 0.8;
  
  // Granulation cells (convection)
  float gran_noise = fbm(uv*22.0 + vec2(t*0.08,-t*0.06));
  float granules   = smoothstep(0.38, 0.62, gran_noise);
  
  // Sunspot regions
  float spot = fbm(uv*5.0 + vec2(t*0.04, t*0.03));
  float spotMask = smoothstep(0.72, 0.60, spot) * (1.0-r*0.8);
  
  // Radial structure
  float core     = 1.0 - smoothstep(0.0, 0.60, r);
  float chromos  = smoothstep(0.50, 0.98, r); // Chromosphere
  float corona   = smoothstep(0.80, 1.0,  r); // Corona edge
  
  // Temperature zones: white-hot core -> yellow photosphere -> orange edge (G-type star like screenshot)
  vec3 whiteCore  = vec3(1.0,  0.98, 0.92);   // Near-white hot center
  vec3 photoSph   = vec3(1.0,  0.88, 0.45);   // Yellow photosphere
  vec3 chromoSph  = vec3(1.0,  0.52, 0.10);   // Orange-red chromosphere
  vec3 coroCol    = vec3(0.85, 0.25, 0.02);   // Deep red corona edge
  
  vec3 plasma = mix(whiteCore, photoSph, smoothstep(0.0, 0.55, r));
  plasma      = mix(plasma,   chromoSph, smoothstep(0.48, 0.82, r));
  plasma      = mix(plasma,   coroCol,   smoothstep(0.78, 0.98, r));
  
  // Add turbulence tinting
  plasma += vec3(0.3,0.05,0.0)*turbulence*0.5*(1.0-r);
  // Granulation brightening
  plasma += vec3(0.15,0.10,0.05)*granules*(1.0-r);
  // Sunspot darkening
  plasma -= vec3(0.25,0.18,0.05)*spotMask;
  
  // Prominence glows
  plasma += mix(chromoSph, vec3(1.0,0.25,0.0), 0.5) * proms;
  
  // Corona rays (outward spikes)
  float ray = pow(max(0.0, sin(angle*9.0+t*0.8+turbulence*3.14)*0.5+0.5),4.0)*0.45;
  plasma += vec3(1.0,0.55,0.1) * ray * corona * 0.5;
  
  // Intensity HDR boost
  float intensity = (2.8+core*5.5) * (0.9 + turbulence*0.3);
  float edge = (1.0-smoothstep(0.82,1.0,r)) * (0.88 + noise1*0.12);
  gl_FragColor = vec4(plasma*intensity, edge);
}`;

// ── GLSL : Nébuleuse volumétrique de fond ─────────────────────────────────────
const NEBULA_VERT = `varying vec3 vWP; void main(){ vWP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const NEBULA_FRAG = `
precision mediump float;
uniform float uTime; varying vec3 vWP;
float hash(float n){return fract(sin(n)*43758.5453);}
float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*hash(dot(p,vec3(1.0,57.0,113.0)));p*=2.1;a*=0.5;} return v; }
void main(){
  vec3 d = normalize(vWP);
  float t = uTime*0.03;

  float n1 = fbm(d*2.5 + t);
  float n2 = fbm(d*6.0 - t*0.5);
  float n3 = fbm(d*14.0 + t*1.1);
  float cloud = smoothstep(0.38, 0.70, n1) * 0.65 + smoothstep(0.44, 0.65, n2) * 0.25;

  // Deep space color palette matching screenshot — dark blue-black, subtle cyan/teal hints
  vec3 deepBlue  = vec3(0.01, 0.04, 0.12);   // deep cosmic blue
  vec3 deepCyan  = vec3(0.02, 0.10, 0.20);   // teal nebula (faint)
  vec3 dustGray  = vec3(0.04, 0.05, 0.08);   // dust clouds
  vec3 coldBlue  = vec3(0.03, 0.08, 0.18);   // cold starfield regions

  float blend1 = 0.5+0.5*d.x;
  float blend2 = 0.5+0.5*d.y;
  vec3 nebColor = mix(deepBlue, deepCyan, blend1*0.6);
  nebColor = mix(nebColor, dustGray, blend2*0.3);
  nebColor = mix(nebColor, coldBlue, n3*0.35);

  float alpha = cloud * 0.045;
  gl_FragColor = vec4(nebColor, alpha);
}`;

// ── GLSL : Post-process — Bloom + Vignette + Film Grain + Chromatic Aberration
const POST_VERT = `varying vec2 vU; void main(){ vU=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const POST_FRAG = `
precision highp float;
uniform sampler2D uScene;
uniform float uTime;
uniform vec2 uRes;
varying vec2 vU;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

void main(){
  vec2 uv = vU;
  vec2 fromCenter = uv - 0.5;

  // ── Subtle chromatic aberration (less aggressive than before)
  float aberr = length(fromCenter)*length(fromCenter)*0.006;
  vec2 rUV = uv + fromCenter*aberr*0.9;
  vec2 bUV = uv - fromCenter*aberr*0.6;
  float r = texture2D(uScene, rUV).r;
  float g = texture2D(uScene, uv).g;
  float b = texture2D(uScene, bUV).b;
  vec3 color = vec3(r,g,b);

  // ── Bloom — targeted at bright star/glare areas
  vec3 bloom = vec3(0.0);
  float thresh = 0.95;
  for(int i=0;i<12;i++){
    float fi = float(i);
    float angle = fi * 2.399963;
    float dist  = sqrt(fi+0.5)*0.018;
    vec2 off = vec2(cos(angle), sin(angle))*dist;
    vec3 s = texture2D(uScene, uv+off).rgb;
    vec3 bright = max(s - thresh, 0.0);
    bloom += bright * (1.0 - dist*20.0);
  }
  bloom /= 12.0;
  bloom *= 2.2;
  color += bloom;

  // ── ACES Filmic Tone Mapping
  vec3 x = color;
  float a=2.51, b2=0.03, c2=2.43, d2=0.59, e2=0.14;
  color = clamp((x*(a*x+b2))/(x*(c2*x+d2)+e2), 0.0, 1.0);

  // ── Color grade: subtle cool steel-blue tint (matches screenshot)
  // Shadows: push toward blue-black
  // Highlights: keep warm star glow
  float luma = dot(color, vec3(0.2126,0.7152,0.0722));
  vec3 shadows   = vec3(0.85, 0.92, 1.05);   // cool blue in darks
  vec3 highlights = vec3(1.02, 1.00, 0.96);  // warm in brights
  vec3 grade = mix(shadows, highlights, luma);
  color *= grade;

  // ── Film grain (fine, cinematic)
  float grain_t = uTime * 0.08;
  float grain = hash(uv + fract(grain_t))*0.022 - 0.011;
  color += grain;

  // ── Vignette (wide, soft — deep space feel)
  float vign = length(fromCenter)*1.25;
  vign = pow(clamp(1.0 - vign*vign*0.48, 0.0, 1.0), 1.6);
  color *= vign;

  // ── Central star lens flare halo (subtle)
  float lf_dist = length(uv - vec2(0.5, 0.5));
  float lf_halo = smoothstep(0.10, 0.0, lf_dist)*0.035;
  color += vec3(1.0,0.95,0.80)*lf_halo;

  gl_FragColor = vec4(max(color, 0.0), 1.0);
}`;

// ── GLSL : Anneau structural ──────────────────────────────────────────────────
const RING_VERT = `varying float vA; varying vec3 vWP;
void main(){ vA=atan(position.z,position.x); vWP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const RING_FRAG = `
precision highp float;
uniform float uTime; uniform vec3 uCol; uniform float uAlpha; uniform float uWidth;
varying float vA; varying vec3 vWP;
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){
  float pulse = 0.55+0.45*sin(uTime*1.1+vA*4.0);
  float tv    = fract(vA/6.28318+uTime*0.10);
  float spark = pow(smoothstep(0.0,0.06,tv)*smoothstep(0.16,0.06,tv),2.0)*1.8;
  // Secondary sparks for more dynamism
  float tv2   = fract(vA/6.28318+uTime*0.17+0.5);
  float spark2= pow(smoothstep(0.0,0.04,tv2)*smoothstep(0.10,0.04,tv2),2.0)*0.8;
  float glow  = pulse*1.8 + spark*4.0 + spark2*2.0;
  // Energy segments
  float seg = step(0.86, fract(vA*8.0))*0.25*pulse;
  vec3  col  = uCol + vec3(0.2,0.1,0.0)*spark*0.5;
  gl_FragColor = vec4(col*glow, uAlpha*(0.25+pulse*0.55+spark*0.9+seg));
}`;

// ── GLSL : Essaim viral ───────────────────────────────────────────────────────
const VIRAL_VERT = `
precision highp float;
attribute float aPhase,aSpeed,aAxis,aRadius;
uniform float uTime; varying float vBright;
void main(){
  float t=uTime*aSpeed+aPhase;
  float ca=cos(aAxis),sa=sin(aAxis),co=cos(t),si=sin(t);
  float r=aRadius*(1.0+0.10*sin(t*1.9+aPhase));
  vec3 pos=vec3(co*ca-si*sa*0.35, si*0.72, co*sa+si*ca*0.35)*r;
  vBright=0.40+0.60*sin(t*2.5+aPhase*5.0);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  gl_PointSize=clamp((1.2+vBright*2.5)*(260.0/gl_Position.w),1.0,6.0);
}`;
const VIRAL_FRAG = `
precision highp float; varying float vBright;
void main(){
  vec2 c=gl_PointCoord-0.5; float dist=length(c); if(dist>0.5)discard;
  // Soft glow disk with bright core
  float g = 1.0 - dist*2.0;
  float core = smoothstep(0.3, 0.0, dist)*1.8;
  // Color: cyan-green with bright white core
  vec3 outer = mix(vec3(0.0,0.80,0.48),vec3(0.35,1.0,0.65),vBright);
  vec3 inner = mix(outer, vec3(0.82,1.0,0.9), core*vBright);
  float alpha = (g*g + core*0.5)*(0.50+vBright*0.50);
  gl_FragColor=vec4(inner*(1.5+vBright*1.5), alpha);
}`;

// ── Géométrie ─────────────────────────────────────────────────────────────────
const ins=(vs,c,f)=>vs.map(v=>[c[0]+(v[0]-c[0])*f,c[1]+(v[1]-c[1])*f,c[2]+(v[2]-c[2])*f]);
const cN =vs=>[vs.reduce((s,v)=>s+v[0],0)/vs.length,vs.reduce((s,v)=>s+v[1],0)/vs.length,vs.reduce((s,v)=>s+v[2],0)/vs.length];
const mS =(a,b)=>{const m=a.map((c,i)=>(c+b[i])/2),l=Math.hypot(...m);return m.map(c=>c/l);};
function buildCubeFaces(){const a=SPHERE_R/Math.sqrt(3);return[[[-a,a,-a],[-a,a,a],[a,a,a],[a,a,-a]],[[a,-a,-a],[a,-a,a],[-a,-a,a],[-a,-a,-a]],[[-a,-a,a],[a,-a,a],[a,a,a],[-a,a,a]],[[a,-a,-a],[-a,-a,-a],[-a,a,-a],[a,a,-a]],[[a,-a,a],[a,a,a],[a,a,-a],[a,-a,-a]],[[-a,-a,-a],[-a,a,-a],[-a,a,a],[-a,-a,a]]].map(vs=>{const c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:true};});}
function buildOctaFaces(){const R=SPHERE_R,v=[[R,0,0],[-R,0,0],[0,R,0],[0,-R,0],[0,0,R],[0,0,-R]];return[[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]].map(fi=>{const vs=fi.map(i=>v[i]),c=cN(vs);return{verts:ins(vs,c,PANEL_GAP),centroid:c,isQuad:false};});}
function buildIcoFaces(sub){const phi=(1+Math.sqrt(5))/2;const rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(c=>c/l);});let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]].map(f=>f.map(i=>rv[i]));for(let s=0;s<sub;s++){const nx=[];for(const[a,b,c]of faces){const ab=mS(a,b),bc=mS(b,c),ca=mS(c,a);nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}faces=nx;}const R=SPHERE_R;return faces.map(([a,b,c])=>{const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];const cnt=cN(vs);return{verts:ins(vs,cnt,PANEL_GAP),centroid:cnt,isQuad:false};});}
function getFaces(n){switch(n){case 1:return buildCubeFaces();case 2:return buildOctaFaces();case 3:return buildIcoFaces(0);case 4:return buildIcoFaces(1);case 5:return buildIcoFaces(2);case 6:return buildIcoFaces(3);default:return[];}}

// Rescale les verts d'un face depuis son centroïde avec le facteur tier
function rescaleVerts(face, tier){
  const adj = (TIER_PANEL_SCALE[tier] || 0.82) / PANEL_GAP;
  const c   = face.centroid;
  return face.verts.map(v=>[
    c[0]+(v[0]-c[0])*adj,
    c[1]+(v[1]-c[1])*adj,
    c[2]+(v[2]-c[2])*adj,
  ]);
}

function buildPanelBufs(faces){
  let nT=0;for(const f of faces)nT+=f.isQuad?2:1;
  const pos=new Float32Array(nT*9),nrm=new Float32Array(nT*9);
  const occ=new Float32Array(nT*3),tc=new Float32Array(nT*9);
  const ti=new Float32Array(nT*3),fi=new Float32Array(nT*3),bary=new Float32Array(nT*9);
  const t2f=new Int32Array(nT);
  let v=0,t=0;
  const tn=(a,b,c)=>{const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l);};
  const push=(x,y,z,nx,ny,nz,o,r,g,b,tiv,fiv,bx,by,bz)=>{const i=v*3;pos[i]=x;pos[i+1]=y;pos[i+2]=z;nrm[i]=nx;nrm[i+1]=ny;nrm[i+2]=nz;occ[v]=o;tc[i]=r;tc[i+1]=g;tc[i+2]=b;ti[v]=tiv;fi[v]=fiv;bary[i]=bx;bary[i+1]=by;bary[i+2]=bz;v++;};
  faces.forEach((face,fI)=>{
    const s=face.slot; const isO=s?.occ?1:0; const tier=s?.tier||'viral';
    const rgb=hex3(TIER_NEON[tier]||'#00FF94');
    const tiv=TIER_ORDER.indexOf(tier)<0?5:TIER_ORDER.indexOf(tier);
    const vs = rescaleVerts(face, tier); // tier-specific panel size!
    const n0=tn(vs[0],vs[1],vs[2]);
    push(vs[0][0],vs[0][1],vs[0][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);
    push(vs[1][0],vs[1][1],vs[1][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);
    push(vs[2][0],vs[2][1],vs[2][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);
    t2f[t++]=fI;
    if(face.isQuad){const n1=tn(vs[0],vs[2],vs[3]);push(vs[0][0],vs[0][1],vs[0][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);push(vs[2][0],vs[2][1],vs[2][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);push(vs[3][0],vs[3][1],vs[3][2],n1[0],n1[1],n1[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);t2f[t++]=fI;}
  });
  return{pos,nrm,occ,tc,ti,fi,bary,t2f};
}

const sortSlots=s=>[...(s||[])].filter(Boolean).sort((a,b)=>{const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);return d||((b.occ?1:0)-(a.occ?1:0));});
const sortPole =f=>[...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);

// ── Scene3D ────────────────────────────────────────────────────────────────────
class Scene3D{
  constructor(canvas){
    Object.assign(this,{
      canvas,T:null,G:null,renderer:null,scene:null,camera:null,
      panelMesh:null,starMesh:null,halos:[],innerGlow:null,
      godRays:null,rings:[],viralSwarm:null,starfield:null,nebulaField:null,
      _rtHDR:null,_postScene:null,_postCam:null,_postUni:null,
      raycaster:null,triToFace:null,faceSlots:[],_faces:null,
      rot:{x:0.12,y:0},vel:{x:0,y:0},isDragging:false,
      pinchDist:null,touchStart:null,
      zoomTarget:22,zoomCurrent:22,hovFace:-1,selFace:-1,
      animId:null,transitioning:false,onHover:null,onClick:null,_h:{},
      _t0:Date.now(),_pU:null,_sU:null,_igU:null,_grU:null,_vU:null,_nebU:null,_rUs:[],
    });
  }

  async init(THREE,GSAP){
    this.T=THREE; this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;
    const r=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance',alpha:false,stencil:false});
    r.setPixelRatio(Math.min(devicePixelRatio,2.5));  // Boost for 4K screens
    r.setSize(W,H,false);
    r.setClearColor(0x010408,1);  // Deep space black-blue
    r.toneMapping=THREE.ACESFilmicToneMapping;
    r.toneMappingExposure=1.75;   // Calibrated for solar panel realism
    r.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    this.renderer=r;

    // HDR render target for post-processing
    const rtW=W*Math.min(devicePixelRatio,2);
    const rtH=H*Math.min(devicePixelRatio,2);
    this._rtHDR = new THREE.WebGLRenderTarget(rtW, rtH, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType || THREE.UnsignedByteType,
    });

    // Post-process scene (fullscreen quad)
    this._postScene = new THREE.Scene();
    this._postCam   = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const postUni   = { uScene:{value:this._rtHDR.texture}, uTime:{value:0}, uRes:{value:new THREE.Vector2(W,H)} };
    this._postUni   = postUni;
    const postMesh  = new THREE.Mesh(
      new THREE.PlaneGeometry(2,2),
      new THREE.ShaderMaterial({vertexShader:POST_VERT,fragmentShader:POST_FRAG,uniforms:postUni,depthWrite:false})
    );
    this._postScene.add(postMesh);

    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x010408,0.003);  // Very subtle deep space fog
    this.camera=new THREE.PerspectiveCamera(40,W/H,0.1,600);
    this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();

    // Enhanced lighting — warm star center + cool deep-space blue fill
    this.scene.add(new THREE.AmbientLight(0x04080F,3.5));              // Deep space ambient
    this._sl=new THREE.PointLight(0xFFF5E0,60,160,1.0); this.scene.add(this._sl);  // Central star — warm white
    this._cl=new THREE.PointLight(0xFF6010,14,75,1.7);  this.scene.add(this._cl);  // Orange corona
    // Cool blue backlight — space atmosphere
    const dl=new THREE.DirectionalLight(0x0A1840,1.8); dl.position.set(-28,-12,-25); this.scene.add(dl);
    // Subtle blue-teal rim from below (reflected starlight off space)
    const dl2=new THREE.DirectionalLight(0x061520,0.6); dl2.position.set(5,-35,8); this.scene.add(dl2);

    this._buildNebula();
    this._buildStarfield();
    this._buildStar();
    this._buildInnerGlow();
    this._buildGodRays();
    this._buildRings();
    this._buildViralSwarm();
    this._bindEvents();
    this._animate();
  }

  _buildNebula(){
    const T=this.T;
    // Large sphere for nebula background
    const geo=new T.SphereGeometry(420,24,16);
    const u={uTime:{value:0}};
    this._nebU=u;
    this.nebulaField=new T.Mesh(geo,new T.ShaderMaterial({
      vertexShader:NEBULA_VERT, fragmentShader:NEBULA_FRAG, uniforms:u,
      transparent:true, depthWrite:false, side:T.BackSide,
      blending:T.AdditiveBlending,
    }));
    this.nebulaField.renderOrder=-2;
    this.scene.add(this.nebulaField);
  }

  _buildStarfield(){
    const T=this.T,N=18000; // More stars for 4K
    const p=new Float32Array(N*3),col=new Float32Array(N*3),sz=new Float32Array(N);
    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=90+Math.random()*360;
      p[i*3]=r*Math.sin(ph)*Math.cos(th); p[i*3+1]=r*Math.sin(ph)*Math.sin(th); p[i*3+2]=r*Math.cos(ph);
      const q=Math.random();
      // Realistic stellar colors: O,B blue -> A,F white -> G yellow -> K orange -> M red
      if(q<0.06){col[i*3]=0.42;col[i*3+1]=0.62;col[i*3+2]=1.0; sz[i]=0.28;}        // O/B blue
      else if(q<0.22){col[i*3]=0.82;col[i*3+1]=0.90;col[i*3+2]=1.0; sz[i]=0.22;}   // A white
      else if(q<0.55){col[i*3]=1.0;col[i*3+1]=0.97;col[i*3+2]=0.88; sz[i]=0.18;}   // G yellow-white
      else if(q<0.78){col[i*3]=1.0;col[i*3+1]=0.72;col[i*3+2]=0.28; sz[i]=0.15;}   // K orange
      else{col[i*3]=0.9;col[i*3+1]=0.22;col[i*3+2]=0.12; sz[i]=0.12;}             // M red
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(p,3));
    g.setAttribute('color',  new T.BufferAttribute(col,3));
    g.setAttribute('size',   new T.BufferAttribute(sz,1));
    this.starfield=new T.Points(g,new T.PointsMaterial({size:0.22,vertexColors:true,transparent:true,opacity:0.95,sizeAttenuation:true,depthWrite:false}));
    this.scene.add(this.starfield);
  }

  _buildStar(){
    const T=this.T;
    const u={uTime:{value:0}}; this._sU=u;
    this.starMesh=new T.Mesh(
      new T.SphereGeometry(STAR_R,96,96),  // More geometry for smoother corona
      new T.ShaderMaterial({vertexShader:STAR_VERT,fragmentShader:STAR_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending})
    );
    this.scene.add(this.starMesh);
    this.halos=[];
    // Enhanced layered corona halos
    for(const[r,col,op,seg]of[
      [STAR_R*1.6, 0xFFFFFF,  0.85, 24],  // bright inner corona
      [STAR_R*2.5, 0xFFF8D0,  0.50, 16],  // white-gold halo
      [STAR_R*4.5, 0xFFCC44,  0.28, 12],  // warm gold
      [STAR_R*8.5, 0xFF7700,  0.14, 8],   // orange outer
      [STAR_R*16,  0x550800,  0.06, 6],   // deep crimson corona
    ]){
      const m=new T.Mesh(new T.SphereGeometry(r,seg,seg),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending}));
      this.scene.add(m); this.halos.push(m);
    }
  }

  // Sphère interne lumineuse — ses faces sont visibles UNIQUEMENT à travers les gaps des panneaux solides
  _buildInnerGlow(){
    const T=this.T;
    const u={uTime:{value:0}}; this._igU=u;
    // Sphère légèrement plus petite que la sphère de panneaux
    this.innerGlow=new T.Mesh(
      new T.SphereGeometry(SPHERE_R*0.90,48,48),
      new T.ShaderMaterial({
        vertexShader:IGLOW_VERT, fragmentShader:IGLOW_FRAG, uniforms:u,
        transparent:true, depthWrite:false,
        depthTest:true,   // CRUCIAL : occulté par les panneaux solides
        blending:T.AdditiveBlending,
        side:T.FrontSide,
      })
    );
    // Rendu APRÈS les panneaux opaques grâce au système de passes de Three.js
    this.innerGlow.renderOrder=1;
    this.scene.add(this.innerGlow);
  }

  // God rays : shafts radiales depuis le centre vers l'extérieur
  _buildGodRays(){
    const T=this.T;
    const N=160;
    const verts=[],alphas=[];

    for(let i=0;i<N;i++){
      const phi=Math.random()*Math.PI*2;
      const theta=Math.acos(2*Math.random()-1);
      const dx=Math.sin(theta)*Math.cos(phi);
      const dy=Math.cos(theta);
      const dz=Math.sin(theta)*Math.sin(phi);

      // Perpendiculaire
      let ux=0,uy=1,uz=0;
      if(Math.abs(dy)>0.9){ux=1;uy=0;uz=0;}
      const px=uy*dz-uz*dy, py=uz*dx-ux*dz, pz=ux*dy-uy*dx;
      const pl=Math.sqrt(px*px+py*py+pz*pz)||1;
      const pxn=px/pl,pyn=py/pl,pzn=pz/pl;

      const w    = 0.04+Math.random()*0.12;
      const nearR= STAR_R*1.5;
      const farR = SPHERE_R*(1.05+Math.random()*0.15);
      const alpha= 0.08+Math.random()*0.22;
      const wFar = w*0.15; // shaft se rétrécit en s'éloignant

      const p0=[dx*nearR-pxn*w,  dy*nearR-pyn*w,  dz*nearR-pzn*w];
      const p1=[dx*nearR+pxn*w,  dy*nearR+pyn*w,  dz*nearR+pzn*w];
      const p2=[dx*farR +pxn*wFar,dy*farR +pyn*wFar,dz*farR +pzn*wFar];
      const p3=[dx*farR -pxn*wFar,dy*farR -pyn*wFar,dz*farR -pzn*wFar];

      verts.push(...p0,...p1,...p2,...p0,...p2,...p3);
      for(let j=0;j<6;j++) alphas.push(alpha);
    }

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(verts),3));
    geo.setAttribute('aAlpha',  new T.BufferAttribute(new Float32Array(alphas),1));

    const u={uTime:{value:0}}; this._grU=u;
    this.godRays=new T.Mesh(geo,new T.ShaderMaterial({
      vertexShader:GRAY_VERT, fragmentShader:GRAY_FRAG, uniforms:u,
      transparent:true, depthWrite:false,
      depthTest:true,   // visible uniquement à travers les gaps
      blending:T.AdditiveBlending, side:T.DoubleSide,
    }));
    this.godRays.renderOrder=1;
    this.scene.add(this.godRays);
  }

  // Anneaux structurels massifs (style image 3)
  _buildRings(){
    const T=this.T;
    const configs=[
      {r:SPHERE_R*1.22, col:'#FFB700', alpha:0.75, tiltX:0.16, tiltY:0.0,  width:0.055},
      {r:SPHERE_R*1.17, col:'#9D50FF', alpha:0.52, tiltX:0.55, tiltY:1.05, width:0.040},
      {r:SPHERE_R*1.13, col:'#9D50FF', alpha:0.35, tiltX:-0.42,tiltY:2.20, width:0.028},
      {r:SPHERE_R*1.26, col:'#00D4FF', alpha:0.28, tiltX:1.10, tiltY:0.55, width:0.022},
    ];
    this.rings=[]; this._rUs=[];
    configs.forEach(({r,col,alpha,tiltX,tiltY,width})=>{
      const N=400;
      const p=new Float32Array(N*3);
      for(let i=0;i<N;i++){
        const a=i/N*Math.PI*2;
        const x=Math.cos(a)*r, z=Math.sin(a)*r;
        const ctx=Math.cos(tiltX), stx=Math.sin(tiltX);
        const cty=Math.cos(tiltY), sty=Math.sin(tiltY);
        // Rotation X then Y
        const y2=-z*stx, z2=z*ctx;
        p[i*3]=x*cty+z2*sty; p[i*3+1]=y2; p[i*3+2]=-x*sty+z2*cty;
      }
      const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(p,3));
      const[cr,cg,cb]=hex3(col);
      const u={uTime:{value:0},uCol:{value:new T.Vector3(cr,cg,cb)},uAlpha:{value:alpha},uWidth:{value:width}};
      this._rUs.push(u);
      const mesh=new T.LineLoop(geo,new T.ShaderMaterial({
        vertexShader:RING_VERT,fragmentShader:RING_FRAG,uniforms:u,
        transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      }));
      this.rings.push(mesh); this.scene.add(mesh);
    });
  }

  _buildViralSwarm(){
    const T=this.T, N=671;
    const phase=new Float32Array(N),speed=new Float32Array(N),axis=new Float32Array(N),radius=new Float32Array(N);
    for(let i=0;i<N;i++){phase[i]=Math.random()*Math.PI*2;speed[i]=0.14+Math.random()*0.52;axis[i]=Math.random()*Math.PI*2;radius[i]=SPHERE_R*(1.12+Math.random()*0.22);}
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(N*3),3));
    geo.setAttribute('aPhase', new T.BufferAttribute(phase,1));
    geo.setAttribute('aSpeed', new T.BufferAttribute(speed,1));
    geo.setAttribute('aAxis',  new T.BufferAttribute(axis,1));
    geo.setAttribute('aRadius',new T.BufferAttribute(radius,1));
    const u={uTime:{value:0}}; this._vU=u;
    this.viralSwarm=new T.Points(geo,new T.ShaderMaterial({
      vertexShader:VIRAL_VERT,fragmentShader:VIRAL_FRAG,uniforms:u,
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    }));
    this.scene.add(this.viralSwarm);
  }

  _buildMesh(faces){
    const T=this.T;
    if(this.panelMesh){this.scene.remove(this.panelMesh);this.panelMesh.geometry.dispose();this.panelMesh.material.dispose();this.panelMesh=null;}
    if(!faces?.length)return;
    this.faceSlots=faces.map(f=>f.slot||null);
    this._faces=faces;
    const{pos,nrm,occ,tc,ti,fi,bary,t2f}=buildPanelBufs(faces);
    this.triToFace=t2f;
    const uni={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1}};
    this._pU=uni;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',  new T.BufferAttribute(pos,3));
    geo.setAttribute('normal',    new T.BufferAttribute(nrm,3));
    geo.setAttribute('aOccupied', new T.BufferAttribute(occ,1));
    geo.setAttribute('aTierColor',new T.BufferAttribute(tc,3));
    geo.setAttribute('aTierIdx',  new T.BufferAttribute(ti,1));
    geo.setAttribute('aFaceIdx',  new T.BufferAttribute(fi,1));
    geo.setAttribute('aBary',     new T.BufferAttribute(bary,3));
    this.panelMesh=new T.Mesh(geo,new T.ShaderMaterial({
      vertexShader:PANEL_VERT, fragmentShader:PANEL_FRAG, uniforms:uni,
      side:T.DoubleSide,
      transparent:false, // OPAQUE — bloque le inner glow
      extensions:{derivatives:true},
    }));
    this.panelMesh.rotation.x=this.rot.x;
    this.panelMesh.rotation.y=this.rot.y;
    this.panelMesh.renderOrder=0; // Avant inner glow
    this.scene.add(this.panelMesh);
  }

  setFaces(faces,animate=false){
    this.hovFace=-1; this.selFace=-1;
    if(!animate||this.transitioning){this._buildMesh(faces);return;}
    this.transitioning=true;
    const G=this.G;
    const doSwap=()=>{
      this._buildMesh(faces);
      if(this.panelMesh){
        this.panelMesh.scale.set(0,0,0);
        const p={v:0};
        G.to(p,{v:1,duration:0.55,ease:'back.out(1.4)',
          onUpdate:()=>this.panelMesh?.scale.set(p.v,p.v,p.v),
          onComplete:()=>{this.transitioning=false;}});
      }else{this.transitioning=false;}
    };
    if(this.panelMesh){
      const p={v:1};
      G.to(p,{v:0,duration:0.18,ease:'power3.in',
        onUpdate:()=>this.panelMesh?.scale.set(p.v,p.v,p.v),
        onComplete:doSwap});
    }else{doSwap();}
  }

  _ndc(cx,cy){const r=this.canvas.getBoundingClientRect();return{x:((cx-r.left)/r.width)*2-1,y:-((cy-r.top)/r.height)*2+1};}
  _cast(cx,cy){if(!this.panelMesh)return-1;const{x,y}=this._ndc(cx,cy);this.raycaster.setFromCamera({x,y},this.camera);const h=this.raycaster.intersectObject(this.panelMesh);return h.length?this.triToFace?.[h[0].faceIndex]??h[0].faceIndex:-1;}
  _setHov(fi){this.hovFace=fi;if(this._pU){this._pU.uHovered.value=fi;}}
  _setSel(fi){this.selFace=fi;if(this._pU){this._pU.uSelected.value=fi;}}

  zoomToFace(centroid){
    if(!centroid||!this.G)return;
    const T=this.T,G=this.G;
    const v=new T.Vector3(...centroid);v.applyEuler(this.panelMesh.rotation);
    const dir=v.clone().normalize();
    G.to(this.camera.position,{x:dir.x*SPHERE_R*2.1,y:dir.y*SPHERE_R*2.1,z:dir.z*SPHERE_R*2.1+9,duration:1.1,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(dir.x*0.4,dir.y*0.4,dir.z*0.4))});
    G.to(this,{zoomTarget:12,duration:1.1,ease:'power3.inOut'});
  }
  resetCamera(){
    if(!this.G)return;
    const T=this.T;
    this.G.to(this.camera.position,{x:0,y:0,z:22,duration:0.95,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(0,0,0))});
    this.G.to(this,{zoomTarget:22,duration:0.95,ease:'power3.inOut'});
  }
  zoom(dy){this.zoomTarget=Math.max(7,Math.min(55,this.zoomTarget+dy*0.012));}

  _bindEvents(){
    const c=this.canvas,h=this._h;let lx=0,ly=0,mv=false;
    h.md=e=>{this.isDragging=true;mv=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0};};
    h.mm=e=>{
      if(this.isDragging){const dx=e.clientX-lx,dy=e.clientY-ly;if(Math.abs(dx)>1||Math.abs(dy)>1)mv=true;this.rot.y+=dx*0.004;this.rot.x+=dy*0.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*0.004,y:dy*0.004};lx=e.clientX;ly=e.clientY;}
      else{const fi=this._cast(e.clientX,e.clientY);if(fi!==this.hovFace){this._setHov(fi);this.onHover?.(fi>=0?this.faceSlots[fi]:null,fi);}c.style.cursor=fi>=0?'pointer':'grab';}
    };
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
    if(!this.isDragging){
      this.rot.y+=this.vel.x; this.rot.x+=this.vel.y;
      this.vel.x*=0.93; this.vel.y*=0.93;
      this.rot.y+=0.00025; // slow auto-rotation
    }
    const rx=this.rot.x,ry=this.rot.y;
    if(this.panelMesh){this.panelMesh.rotation.x=rx;this.panelMesh.rotation.y=ry;}
    if(this.innerGlow){this.innerGlow.rotation.x=rx*0.08;this.innerGlow.rotation.y=ry*0.08;}
    if(this.godRays){this.godRays.rotation.x=rx;this.godRays.rotation.y=ry;}
    this.rings.forEach((ring,i)=>{ring.rotation.x=rx+(i%2?0.004:-0.004)*t;ring.rotation.y=ry+(i%2?0.007:-0.007)*t;});
    if(this.nebulaField){this.nebulaField.rotation.y=t*0.0002;}
    if(this._pU)this._pU.uTime.value=t;
    if(this._sU)this._sU.uTime.value=t;
    if(this._igU)this._igU.uTime.value=t;
    if(this._grU)this._grU.uTime.value=t;
    if(this._vU)this._vU.uTime.value=t;
    if(this._nebU)this._nebU.uTime.value=t;
    this._rUs.forEach(u=>{ if(u)u.uTime.value=t; });
    // Enhanced star pulse (solar cycle simulation)
    const sp=1+Math.sin(t*0.82)*0.22+Math.sin(t*2.1)*0.08+Math.sin(t*0.18)*0.05;
    if(this._sl)this._sl.intensity=55*sp;
    if(this._cl)this._cl.intensity=18*sp;
    if(this.starMesh)this.starMesh.scale.setScalar(1+Math.sin(t*1.1)*0.08+Math.sin(t*2.8)*0.03);
    this.halos.forEach((h,i)=>h.scale.setScalar(1+Math.sin(t*0.32+i*0.75)*0.06+Math.sin(t*1.4+i)*0.02));
    // Swarm rotation
    if(this.viralSwarm){this.viralSwarm.rotation.y=t*0.032;this.viralSwarm.rotation.x=Math.sin(t*0.022)*0.22;}
    // Nebula drift
    if(this.starfield){this.starfield.rotation.y=t*0.0002;}
    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*0.065;
    this.camera.position.z=this.zoomCurrent;

    // ── HDR Post-Processing Render ──────────────────────────────────────────
    if(this._rtHDR && this._postScene && this._postCam && this._postUni){
      // Pass 1: Render scene to HDR render target
      this.renderer.setRenderTarget(this._rtHDR);
      this.renderer.render(this.scene,this.camera);
      // Pass 2: Post-process + composite to screen
      this.renderer.setRenderTarget(null);
      this._postUni.uTime.value=t;
      this.renderer.render(this._postScene,this._postCam);
    } else {
      this.renderer.render(this.scene,this.camera);
    }
  }

  resize(){const W=this.canvas.clientWidth,H=this.canvas.clientHeight;if(!W||!H)return;this.camera.aspect=W/H;this.camera.updateProjectionMatrix();this.renderer.setSize(W,H,false);if(this._rtHDR)this._rtHDR.setSize(W*Math.min(devicePixelRatio,2),H*Math.min(devicePixelRatio,2));if(this._postUni)this._postUni.uRes.value.set(W,H);}
  destroy(){
    cancelAnimationFrame(this.animId);
    const h=this._h;
    this.canvas.removeEventListener('mousedown',h.md);
    window.removeEventListener('mousemove',h.mm);
    window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts);
    this.canvas.removeEventListener('touchmove',h.tm);
    this.canvas.removeEventListener('touchend',h.te);
    [this.panelMesh,this.innerGlow,this.godRays,...this.rings,this.viralSwarm,this.nebulaField].forEach(m=>{if(m){m.geometry?.dispose();m.material?.dispose();}});
    if(this._rtHDR)this._rtHDR.dispose();
    this.renderer?.dispose();
  }
}

// ── UI Components ─────────────────────────────────────────────────────────────
function Glass({children,style={},glow,...p}){return(<div style={{background:DS.glass,backdropFilter:'blur(14px) saturate(160%)',WebkitBackdropFilter:'blur(14px) saturate(160%)',border:`0.5px solid ${glow?glow+'38':DS.glassBrd}`,boxShadow:glow?`0 0 0 1px ${glow}12,0 0 24px ${glow}14,inset 0 1px 0 rgba(255,255,255,0.05)`:`inset 0 1px 0 rgba(255,255,255,0.04),0 8px 32px rgba(0,0,0,0.6)`,...style}}{...p}>{children}</div>);}

function LumBtn({children,onClick,col=DS.cyan,style={},sm}){const[hov,setHov]=useState(false);return(<button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov?`${col}0e`:'transparent',border:`0.5px solid ${col}${hov?'cc':'44'}`,borderRadius:8,color:hov?col:`${col}88`,fontFamily:F.ui,fontSize:sm?10:12,fontWeight:600,padding:sm?'6px 12px':'10px 20px',cursor:'pointer',outline:'none',letterSpacing:'0.04em',boxShadow:hov?`0 0 20px ${col}28`:'none',transition:'all 0.16s ease',display:'flex',alignItems:'center',justifyContent:'center',gap:7,...style}}>{children}</button>);}

function Sep({col=DS.gold,style={}}){return<div style={{height:0.5,background:`linear-gradient(90deg,transparent,${col}55,transparent)`,boxShadow:`0 0 6px ${col}33`,...style}}/>;}

// Chip hover sur panneau
function HoverChip({slot}){
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const role=TIER_ROLE[slot.tier];
  return(
    <div style={{position:'absolute',bottom:64,left:'50%',transform:'translateX(-50%)',pointerEvents:'none',zIndex:35,animation:'hfadeUp 0.16s ease both'}}>
      <Glass glow={col} style={{padding:'5px 14px',display:'flex',alignItems:'center',gap:9,borderRadius:8}}>
        <span style={{color:col,fontSize:13,lineHeight:1}}>{role?.icon||'○'}</span>
        <span style={{color:col,fontSize:9,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[slot.tier]||slot.tier).toUpperCase()}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrd}}/>
        <span style={{color:DS.textMid,fontSize:9,fontFamily:F.ui}}>{slot.occ?(slot.tenant?.name||'Occupé'):'Disponible'}</span>
        <div style={{width:0.5,height:9,background:DS.glassBrd}}/>
        <span style={{color:DS.gold,fontSize:9,fontWeight:600,fontFamily:F.mono}}>€{fmt(slot.tier)}/j</span>
      </Glass>
    </div>
  );
}

// Panel détail slot sélectionné
function SlotReveal({slot,onClose,onRent,onBuyout}){
  const[ph,setPh]=useState(0);
  useEffect(()=>{const id=requestAnimationFrame(()=>setPh(1));return()=>cancelAnimationFrame(id);},[]);
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const label=(TIER_LABEL[slot.tier]||slot.tier).toUpperCase();
  const price=fmt(slot.tier);
  const occ=slot.occ; const tenant=slot.tenant;
  const role=TIER_ROLE[slot.tier];
  const isEpic=slot.tier==='epicenter';
  return(
    <div style={{position:'absolute',top:0,bottom:0,right:228,width:355,display:'flex',alignItems:'center',justifyContent:'flex-end',padding:'0 14px',zIndex:45,pointerEvents:'none'}}>
      <div style={{width:334,pointerEvents:'auto',opacity:ph?1:0,transform:ph?'none':'translateX(20px) scale(0.95)',transition:'opacity 0.26s ease,transform 0.34s cubic-bezier(0.34,1.56,0.64,1)',borderRadius:14,background:DS.glass,backdropFilter:'blur(14px) saturate(180%)',WebkitBackdropFilter:'blur(14px) saturate(180%)',border:`0.5px solid ${col}44`,boxShadow:`0 0 0 1px ${col}12,0 0 40px ${col}16,inset 0 1px 0 rgba(255,255,255,0.06)`,overflow:'hidden'}}>
        {/* Top accent bar */}
        <div style={{height:2,background:`linear-gradient(90deg,transparent 0%,${col} 40%,${col}88 100%)`,boxShadow:`0 0 12px ${col}`}}/>
        {/* Hero */}
        <div style={{height:120,position:'relative',overflow:'hidden',background:'rgba(4,5,9,0.9)'}}>
          {occ&&tenant?.img&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${tenant.img})`,backgroundSize:'cover',backgroundPosition:'center',opacity:0.7}}/>}
          {/* Grid overlay */}
          <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${col}10 1px,transparent 1px),linear-gradient(90deg,${col}10 1px,transparent 1px)`,backgroundSize:'20px 20px',pointerEvents:'none'}}/>
          {/* Scanlines */}
          <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,0.12) 0px,rgba(0,0,0,0.12) 1px,transparent 1px,transparent 3px)',pointerEvents:'none'}}/>
          {/* Corner marks */}
          {[{t:8,l:8},{t:8,r:8},{b:8,l:8},{b:8,r:8}].map(({t,r,b,l},i)=>(
            <div key={i} style={{position:'absolute',width:10,height:10,top:t,right:r,bottom:b,left:l,borderTop:i<2?`1.5px solid ${col}`:'none',borderBottom:i>=2?`1.5px solid ${col}`:'none',borderLeft:(i===0||i===2)?`1.5px solid ${col}`:'none',borderRight:(i===1||i===3)?`1.5px solid ${col}`:'none',zIndex:2,boxShadow:`0 0 6px ${col}66`}}/>
          ))}
          {/* Icon central */}
          {!(occ&&tenant?.img)&&(
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,zIndex:2}}>
              <div style={{width:isEpic?76:60,height:isEpic?76:60,borderRadius:isEpic?'50%':12,border:`1.5px solid ${col}88`,background:`${col}0c`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isEpic?32:22,color:col,boxShadow:`0 0 32px ${col}44,inset 0 0 20px ${col}08`}}>
                {role?.icon}
              </div>
              <div style={{color:`${col}99`,fontSize:8,fontFamily:F.ui,letterSpacing:'0.14em',fontWeight:600}}>{role?.role?.toUpperCase()}</div>
            </div>
          )}
          {/* Badges */}
          <div style={{position:'absolute',top:9,left:9,zIndex:3}}><span style={{padding:'2px 7px',borderRadius:4,border:`0.5px solid ${col}44`,background:`${col}0c`,color:col,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.10em'}}>{label}</span></div>
          <div style={{position:'absolute',top:9,right:9,zIndex:3}}><span style={{padding:'2px 7px',borderRadius:4,border:`0.5px solid ${occ?col:DS.textLo}44`,background:`${occ?col:DS.textLo}0c`,color:occ?col:DS.textLo,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{occ?'● ACTIF':'○ LIBRE'}</span></div>
          {/* Close */}
          <button onClick={onClose} style={{position:'absolute',bottom:9,right:9,zIndex:3,width:22,height:22,borderRadius:5,background:'transparent',border:`0.5px solid ${DS.glassBrd}`,color:DS.textLo,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',outline:'none',transition:'all 0.14s'}} onMouseEnter={e=>{e.currentTarget.style.color=DS.rose;e.currentTarget.style.borderColor=DS.rose+'88';}} onMouseLeave={e=>{e.currentTarget.style.color=DS.textLo;e.currentTarget.style.borderColor=DS.glassBrd;}}>✕</button>
        </div>

        <Sep col={col} style={{opacity:0.6}}/>
        <div style={{padding:'13px 15px 16px'}}>
          <div style={{marginBottom:10}}>
            <div style={{color:DS.textHi,fontSize:14,fontWeight:700,fontFamily:F.ui,marginBottom:3,lineHeight:1.3}}>{occ?(tenant?.name||`Panneau ${label}`):`Emplacement ${label}`}</div>
            <div style={{color:DS.textLo,fontSize:8.5,fontFamily:F.ui,lineHeight:1.6}}>{role?.desc||'Sphère de Dyson · Marketing collaboratif'}</div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:11}}>
            {[['TIER',label,col],['PRIX/J',`€${price}`,DS.gold],['RÔLE',role?.role?.split(' ')[0]||'COSMOS',DS.cyan]].map(([k,v,c])=>(
              <div key={k} style={{padding:'7px 5px',borderRadius:6,textAlign:'center',border:`0.5px solid ${DS.glassBrd}`,background:'rgba(255,255,255,0.02)'}}>
                <div style={{color:c,fontSize:10,fontWeight:700,fontFamily:F.mono,marginBottom:2}}>{v}</div>
                <div style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>{k}</div>
              </div>
            ))}
          </div>

          {/* Social links */}
          {occ&&(tenant?.instagramUrl||tenant?.twitterUrl||tenant?.tiktokUrl||tenant?.websiteUrl)&&(
            <div style={{display:'flex',gap:5,marginBottom:11}}>
              {[['𝕏',tenant?.twitterUrl,'#1DA1F2'],['◎',tenant?.instagramUrl,'#E4405F'],['♪',tenant?.tiktokUrl,'#00f2ea'],['⬡',tenant?.websiteUrl,DS.cyan]].filter(([,u])=>u).map(([ic,u,c])=>(
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{flex:1,padding:'7px 4px',borderRadius:6,border:`0.5px solid ${c}33`,color:`${c}77`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',background:'transparent',transition:'all 0.14s',outline:'none'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${c}99`;e.currentTarget.style.color=c;e.currentTarget.style.background=`${c}08`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${c}33`;e.currentTarget.style.color=`${c}77`;e.currentTarget.style.background='transparent';}}>{ic}</a>
              ))}
            </div>
          )}

          {/* Prix */}
          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:11,padding:'9px 12px',borderRadius:8,border:`0.5px solid ${col}28`,background:`${col}06`,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(90deg,transparent,transparent 24px,${col}04 24px,${col}04 24.5px)`,pointerEvents:'none'}}/>
            <span style={{color:col,fontSize:24,fontWeight:700,fontFamily:F.mono,lineHeight:1,textShadow:`0 0 20px ${col}66`}}>€{price}</span>
            <span style={{color:DS.textLo,fontSize:9,fontFamily:F.ui}}>/jour · excl. taxes</span>
            <span style={{marginLeft:'auto',color:`${col}33`,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.12em'}}>ADS·SQ</span>
          </div>

          {/* CTA */}
          {!occ
            ?<LumBtn onClick={()=>onRent(slot)} col={col} style={{width:'100%'}}><span>Réserver ce slot</span><span style={{opacity:0.5,fontSize:10}}>→</span></LumBtn>
            :<LumBtn onClick={()=>onBuyout(slot)} col={DS.textLo} style={{width:'100%',fontSize:11}}>Proposer un rachat</LumBtn>
          }
        </div>
      </div>
    </div>
  );
}

// Sidebar
const Sidebar=memo(function Sidebar({slots,isLive,level}){
  const[tab,setTab]=useState('tiers');
  const stats=useMemo(()=>{const c={};TIER_ORDER.forEach(t=>{c[t]=0;});(slots||[]).forEach(s=>{if(s?.occ&&c[s.tier]!==undefined)c[s.tier]++;});return c;},[slots]);
  const rev=TIER_ORDER.reduce((s,t)=>s+(stats[t]||0)*(TIER_PRICE[t]||0)/100,0);
  const totalOcc=Object.values(stats).reduce((s,v)=>s+v,0);
  return(
    <div style={{width:228,flexShrink:0,background:DS.glass,backdropFilter:'blur(14px) saturate(160%)',WebkitBackdropFilter:'blur(14px) saturate(160%)',borderLeft:`0.5px solid ${DS.glassBrdHi}`,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'-16px 0 40px rgba(0,0,0,0.55)'}}>
      {/* Header */}
      <div style={{padding:'13px 14px 10px',borderBottom:`0.5px solid ${DS.glassBrd}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{color:DS.gold,fontSize:15,textShadow:`0 0 16px ${DS.gold}`,lineHeight:1}}>☀</span>
            <span style={{color:DS.textHi,fontSize:11,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.09em'}}>DYSON SPHERE</span>
          </div>
          {isLive&&(<div style={{display:'flex',alignItems:'center',gap:4,padding:'2px 7px',borderRadius:4,border:`0.5px solid ${DS.green}44`,background:`${DS.green}08`}}><div style={{width:4,height:4,borderRadius:'50%',background:DS.green,boxShadow:`0 0 8px ${DS.green}`,animation:'hpulse 1.5s ease-in-out infinite'}}/><span style={{color:DS.green,fontSize:7,fontWeight:700,letterSpacing:'0.12em',fontFamily:F.ui}}>LIVE</span></div>)}
        </div>
        <div style={{color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.06em',marginBottom:9}}>{LEVELS[level]?.faces||0} PANNEAUX · LVL {level}</div>
        <div style={{display:'flex',gap:3}}>
          {[['tiers','TIERS'],['roles','RÔLES']].map(([id,label])=>(<button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'5px 0',background:'transparent',border:`0.5px solid ${tab===id?DS.gold:DS.glassBrd}`,borderRadius:5,color:tab===id?DS.gold:DS.textLo,fontSize:7.5,fontWeight:600,fontFamily:F.ui,letterSpacing:'0.08em',cursor:'pointer',outline:'none',boxShadow:tab===id?`0 0 10px ${DS.gold}22`:'none',transition:'all 0.14s'}}>{label}</button>))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
        {tab==='tiers'
          ? TIER_ORDER.map(tier=>{
              const col=TIER_NEON[tier],occ=stats[tier]||0,tot=TIER_TOTALS[tier],pct=Math.round(occ/tot*100);
              const role=TIER_ROLE[tier];
              const scale=TIER_PANEL_SCALE[tier];
              return(<div key={tier} style={{padding:'7px 12px 7px 10px',borderLeft:`1.5px solid ${occ>0?col:'transparent'}`,marginLeft:2,borderRadius:'0 7px 7px 0',transition:'background 0.14s'}} onMouseEnter={e=>{e.currentTarget.style.background=`${col}08`;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:12,color:col,textShadow:occ>0?`0 0 10px ${col}`:'none'}}>{role?.icon}</span>
                    <span style={{color:occ>0?col:DS.textLo,fontSize:7.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em'}}>{(TIER_LABEL[tier]||tier).toUpperCase()}</span>
                  </div>
                  <span style={{color:occ>0?col:DS.textLo,fontSize:8.5,fontWeight:600,fontFamily:F.mono}}>€{fmt(tier)}</span>
                </div>
                {/* Indicateur taille panneau */}
                <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                  <div style={{flex:1,height:3,borderRadius:2,background:DS.glassBrd,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.round(scale/1.22*100)}%`,background:occ>0?col:`${col}44`,borderRadius:2,boxShadow:occ>0?`0 0 5px ${col}`:'none',transition:'width 0.6s'}}/>
                  </div>
                  <span style={{color:DS.textLo,fontSize:6.5,fontFamily:F.mono,width:24,textAlign:'right'}}>{Math.round(scale/1.22*100)}%</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>{occ}/{tot} slots</span>
                  <span style={{color:occ>0?`${col}aa`:DS.textLo,fontSize:7,fontFamily:F.mono}}>{pct}% occ.</span>
                </div>
              </div>);
            })
          : TIER_ORDER.map(tier=>{
              const col=TIER_NEON[tier];const role=TIER_ROLE[tier];
              return(<div key={tier} style={{padding:'9px 12px 9px 10px',borderBottom:`0.5px solid ${DS.glassBrd}`,transition:'background 0.14s'}} onMouseEnter={e=>{e.currentTarget.style.background=`${col}06`;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                  <div style={{width:26,height:26,borderRadius:tier==='epicenter'?'50%':6,border:`1.5px solid ${col}55`,background:`${col}0e`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:col,flexShrink:0,boxShadow:`0 0 12px ${col}22`}}>{role?.icon}</div>
                  <div><div style={{color:col,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.06em'}}>{role?.role}</div><div style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>€{fmt(tier)}/j · {TIER_TOTALS[tier]} slots</div></div>
                </div>
                <div style={{color:DS.textLo,fontSize:7.5,fontFamily:F.ui,lineHeight:1.55,paddingLeft:33}}>{role?.desc}</div>
              </div>);
            })
        }
      </div>

      <div style={{padding:'10px 14px',borderTop:`0.5px solid ${DS.glassBrd}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
          <span style={{color:DS.textLo,fontSize:7,fontFamily:F.ui,letterSpacing:'0.10em'}}>REVENUS/JOUR</span>
          <span style={{color:DS.gold,fontSize:15,fontWeight:700,fontFamily:F.mono,textShadow:`0 0 16px ${DS.gold}55`}}>€{rev.toLocaleString('fr-FR')}</span>
        </div>
        <Sep col={DS.gold} style={{marginBottom:6,opacity:0.30}}/>
        {/* Mini energy bars */}
        <div style={{display:'flex',gap:2,marginBottom:5}}>
          {TIER_ORDER.map(t=>{const c=TIER_NEON[t],o=stats[t]||0,tot=TIER_TOTALS[t];return<div key={t} title={(TIER_LABEL[t]||t).toUpperCase()+` (${o}/${tot})`} style={{flex:1,height:2.5,borderRadius:2,background:o>0?c:DS.glassBrd,opacity:0.3+0.7*(o/tot),boxShadow:o>0?`0 0 4px ${c}`:'none',transition:'all 0.5s'}}/>;} )}
        </div>
        <div style={{textAlign:'center',color:DS.textLo,fontSize:7.5,fontFamily:F.mono,letterSpacing:'0.08em'}}>{totalOcc} ACTIFS · {671-totalOcc} LIBRES</div>
      </div>
    </div>
  );
});

const LevelNav=memo(function LevelNav({level,onLevel}){
  return(
    <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:30}}>
      <Glass glow={DS.cyan} style={{padding:'5px 9px',display:'flex',alignItems:'center',gap:3,borderRadius:10}}>
        {LEVELS.map(lv=>{const act=lv.n===level;const col=act?DS.cyan:DS.textLo;return(
          <button key={lv.n} onClick={()=>onLevel(lv.n)} title={lv.name} style={{width:act?30:15,height:act?30:15,borderRadius:'50%',border:`0.5px solid ${col}${act?'cc':'44'}`,background:act?`${DS.cyan}12`:'transparent',color:col,fontSize:act?10:7.5,fontWeight:700,cursor:'pointer',transition:'all 0.26s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.ui,padding:0,flexShrink:0,boxShadow:act?`0 0 16px ${DS.cyan}55`:'none',outline:'none'}}>
            {act?lv.icon:lv.n}
          </button>);
        })}
        <div style={{marginLeft:6,paddingLeft:8,borderLeft:`0.5px solid ${DS.glassBrd}`,display:'flex',flexDirection:'column',gap:1}}>
          <span style={{color:DS.cyan,fontSize:8.5,fontWeight:700,fontFamily:F.ui,letterSpacing:'0.08em',lineHeight:1.1}}>{LEVELS[level]?.name}</span>
          <span style={{color:DS.textLo,fontSize:7,fontFamily:F.mono}}>{LEVELS[level]?.faces} PANELS</span>
        </div>
      </Glass>
    </div>
  );
});

function HUDLoader(){
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28,background:DS.void}}>
      <div style={{position:'relative',width:90,height:90}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{position:'absolute',inset:i*10,borderRadius:'50%',border:`0.5px solid rgba(${['255,183,0','255,93,156','157,80,255','0,212,255'][i]},${0.08-i*0.01})`,borderTopColor:`rgba(${['255,183,0','255,93,156','157,80,255','0,212,255'][i]},${0.90-i*0.18})`,animation:`hspin ${0.9+i*0.75}s linear infinite ${i%2?'reverse':''}`}}/>
        ))}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:14,height:14,borderRadius:'50%',background:'#FFF8E0',boxShadow:'0 0 20px #FFCC44,0 0 45px #FF8800,0 0 80px #FF440015'}}/>
        </div>
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{color:DS.gold,fontSize:10,fontWeight:600,letterSpacing:'0.30em',fontFamily:F.ui,marginBottom:5,textShadow:`0 0 24px ${DS.gold}`}}>DYSON SPHERE</div>
        <div style={{color:DS.textLo,fontSize:7.5,letterSpacing:'0.18em',fontFamily:F.mono,marginBottom:10}}>CHARGEMENT MÉGASTRUCTURE…</div>
        <div style={{display:'flex',justifyContent:'center',gap:6}}>
          {TIER_ORDER.map((t,i)=>(<div key={t} style={{width:4,height:4,borderRadius:'50%',background:TIER_NEON[t],boxShadow:`0 0 8px ${TIER_NEON[t]}`,animation:`hpulse ${0.7+i*0.15}s ease-in-out infinite`}}/>))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function View3D({slots=[],isLive=false,onGoAdvertiser,onWaitlist,onCheckout,onBuyout,ExistingPublicView}){
  const canvasRef=useRef(null), sceneRef=useRef(null);
  const[level,setLevel]=useState(6);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(null);
  const[selSlot,setSelSlot]=useState(null);
  const[hovSlot,setHovSlot]=useState(null);
  const hovTimer=useRef(null);

  const sorted=useMemo(()=>sortSlots(slots),[slots]);
  const assignedFaces=useMemo(()=>{
    if(level===0)return[];
    return sortPole(getFaces(level)).map((f,i)=>({...f,slot:sorted[i]||null}));
  },[level,sorted]);

  useEffect(()=>{
    if(level===0||!canvasRef.current)return;
    let sc;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([T,G])=>{
        sc=new Scene3D(canvasRef.current); sceneRef.current=sc;
        sc.onHover=slot=>{clearTimeout(hovTimer.current);if(slot){hovTimer.current=setTimeout(()=>setHovSlot(slot),80);}else setHovSlot(null);};
        sc.onClick=slot=>setSelSlot(slot||null);
        return sc.init(T,G);
      })
      .then(()=>{sceneRef.current.setFaces(assignedFaces,false);setLoading(false);})
      .catch(e=>{console.error(e);setError('npm install three gsap');setLoading(false);});
    return()=>{if(sc)sc.destroy();sceneRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level===0]);

  useEffect(()=>{if(!sceneRef.current||level===0)return;sceneRef.current.setFaces(assignedFaces,true);},[assignedFaces,level]);

  useEffect(()=>{
    const fn=e=>{
      if(e.key>='0'&&e.key<='6')setLevel(+e.key);
      else if(e.key==='ArrowRight'||e.key==='ArrowUp')setLevel(l=>Math.min(6,l+1));
      else if(e.key==='ArrowLeft'||e.key==='ArrowDown')setLevel(l=>Math.max(1,l-1));
      else if(e.key==='Escape'){setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();}
    };
    window.addEventListener('keydown',fn);
    return()=>window.removeEventListener('keydown',fn);
  },[]);

  useEffect(()=>{
    const fn=e=>{e.preventDefault();sceneRef.current?.zoom(e.deltaY);};
    const c=canvasRef.current;
    if(c)c.addEventListener('wheel',fn,{passive:false});
    return()=>{if(c)c.removeEventListener('wheel',fn);};
  },[level]);

  useEffect(()=>{
    if(!canvasRef.current)return;
    const ro=new ResizeObserver(()=>sceneRef.current?.resize());
    ro.observe(canvasRef.current);
    return()=>ro.disconnect();
  },[]);

  const goLevel=useCallback(n=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();setLevel(n);},[]);
  const handleClose=useCallback(()=>{setSelSlot(null);sceneRef.current?._setSel(-1);sceneRef.current?.resetCamera();},[]);

  if(level===0){
    return(
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <LumBtn onClick={()=>goLevel(6)} col={DS.gold} sm style={{position:'absolute',top:10,right:10,zIndex:100,letterSpacing:'0.08em'}}>
          ☀ DYSON SPHERE
        </LumBtn>
        {ExistingPublicView&&<ExistingPublicView slots={slots} isLive={isLive} onGoAdvertiser={onGoAdvertiser} onWaitlist={onWaitlist}/>}
      </div>
    );
  }

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:DS.void,display:'flex'}}>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',outline:'none',opacity:loading?0:1,transition:'opacity 0.80s ease'}}/>
        {loading&&!error&&<HUDLoader/>}
        {error&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,background:DS.void}}>
            <div style={{color:'#FF3D5A',fontSize:11,fontWeight:600,fontFamily:F.mono}}>⚠ {error}</div>
            <LumBtn onClick={()=>goLevel(0)} col={DS.cyan} sm>Vue 2D</LumBtn>
          </div>
        )}

        {/* Retour 2D */}
        <Glass style={{position:'absolute',top:11,left:11,zIndex:30,borderRadius:7}}>
          <button onClick={()=>goLevel(0)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'none',border:'none',color:DS.textLo,fontSize:8.5,fontWeight:600,cursor:'pointer',fontFamily:F.ui,letterSpacing:'0.06em',outline:'none',transition:'color 0.14s'}} onMouseEnter={e=>e.currentTarget.style.color=DS.textHi} onMouseLeave={e=>e.currentTarget.style.color=DS.textLo}>
            ▦ VUE 2D
          </button>
        </Glass>

        {/* Badge viral */}
        {!loading&&(
          <Glass glow={TIER_NEON.viral} style={{position:'absolute',top:11,right:11,zIndex:30,borderRadius:7,padding:'4px 10px',display:'flex',alignItems:'center',gap:6,pointerEvents:'none'}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:TIER_NEON.viral,boxShadow:`0 0 10px ${TIER_NEON.viral}`,animation:'hpulse 2s ease-in-out infinite'}}/>
            <span style={{color:TIER_NEON.viral,fontSize:7.5,fontFamily:F.ui,fontWeight:600,letterSpacing:'0.08em'}}>⚡ {TIER_TOTALS.viral} DRONES ORBITAUX</span>
          </Glass>
        )}

        {hovSlot&&!selSlot&&<HoverChip slot={hovSlot}/>}
        {!loading&&!selSlot&&(
          <div style={{position:'absolute',bottom:54,left:'50%',transform:'translateX(-50%)',color:DS.textLo,fontSize:7.5,letterSpacing:'0.12em',fontFamily:F.mono,pointerEvents:'none',whiteSpace:'nowrap',opacity:0.45}}>
            CLIC · ZOOM · DRAG · ⌨ 0-6
          </div>
        )}

        <LevelNav level={level} onLevel={goLevel}/>

        {selSlot&&(
          <SlotReveal slot={selSlot} onClose={handleClose}
            onRent={s=>{handleClose();onCheckout?.(s);}}
            onBuyout={s=>{handleClose();onBuyout?.(s);}}/>
        )}
      </div>

      <Sidebar slots={slots} isLive={isLive} level={level}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes hspin { to { transform: rotate(360deg); } }
        @keyframes hpulse { 0%,100%{opacity:1;} 50%{opacity:0.20;} }
        @keyframes hfadeUp { from{opacity:0;transform:translateX(-50%) translateY(6px);}to{opacity:1;transform:translateX(-50%) translateY(0);} }
        ::-webkit-scrollbar{width:1.5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,183,0,0.15);border-radius:1px;}
        canvas{cursor:grab;} canvas:active{cursor:grabbing;}
      `}</style>
    </div>
  );
}