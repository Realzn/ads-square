'use client';
/**
 * ADS·SQUARE — DYSON COSMOS ✦ v6 — BILLBOARD RINGS + CAMERA FIX
 *
 * NOUVEAUTÉS v6 :
 *
 * ── FIX CAMÉRA ──────────────────────────────────────────────────────────────
 *   Les boutons TIERS/VUE ne déclenchent plus de drag.
 *   Mécanisme : `pendingDrag` ne devient `isDragging` qu'après >3px de mouvement,
 *   ET seulement si le mousedown vient directement du <canvas> (e.target===canvas).
 *   Les boutons UI flottants n'ont plus d'effet sur la rotation caméra.
 *
 * ── ANNEAUX BILLBOARD GÉANTS ────────────────────────────────────────────────
 *   Géométrie : ruban rectangulaire haut (section rect, pas torus circulaire)
 *   Hauteur : ×10 à ×15 vs avant (tR = SPHERE_R*0.22 à 0.32)
 *   Shader billboard :
 *     • Structure acier sci-fi (bords lumineux, nervures de renfort)
 *     • Séparateurs slot comme rainures métalliques
 *     • TICKER SCROLLANT procédural (glyphs animés par slot)
 *     • Ligne de scan animée pour slots occupés
 *     • Barre de progression en pied d'anneau
 *     • PBR spéculaire métal (roughness adaptative hover)
 *   Solid backing physique (MeshPhysicalMaterial, ombres)
 *
 * FIXES MÉMOIRE v5.1 (inchangés) :
 *   P0 next.config devtool, P1 StrictMode guard, P2 ShaderMaterial cache
 *
 *
 * ── P0 · next.config.js (À FAIRE MANUELLEMENT) ──────────────────────────────
 *   Ajoutez dans votre next.config.js pour supprimer les 84 MB de source maps :
 *
 *   const nextConfig = {
 *     productionBrowserSourceMaps: false,  // ← −84 MB prod
 *     webpack: (config, { dev }) => {
 *       if (dev) config.devtool = 'cheap-module-source-map'; // ← −70 MB dev
 *       return config;
 *     },
 *   };
 *
 * ── P1 · useEffect StrictMode guard ─────────────────────────────────────────
 *   `let mounted = true` bloque la création Three.js si le composant est
 *   démonté avant que la Promise se résolve → élimine les WebGLRenderer/Scene
 *   zombies (×2 dans le snapshot).
 *   `renderer.forceContextLoss()` dans destroy() libère le contexte GPU immédiatement.
 *
 * ── P2 · ShaderMaterial recyclé ─────────────────────────────────────────────
 *   `_panelMat` est créé une seule fois et réutilisé à chaque appel _buildMesh().
 *   Seuls les uniforms sont mis à jour. Élimine 193 copies GLSL dupliquées (246 KB).
 *   Même traitement pour _viralMat, _godRayMat.
 *
 * GAINS ESTIMÉS : −112 MB heap total (164 MB → ~53 MB)
 */
/**
 * ADS·SQUARE — DYSON COSMOS ✦ v5 GPU-OPTIMIZED AAA
 *
 * OPTIMISATIONS v5 :
 * ◈ Resolution Scaling adaptatif — 0.55× drag / 0.75× orbit / 1.0× repos + TAA-blend
 * ◈ LOD Tores Dyson — 3 niveaux (512/192/48 segs) par distance caméra
 * ◈ LOD Sphère panneaux — sub-3 → sub-2 → sub-1 selon distance
 * ◈ Frame throttle — 60fps repos / 45fps drag / 30fps background
 * ◈ God Rays — 400→128 shafts, geometry mergé, no rebuild
 * ◈ Post-process — SSAO désactivé en drag, CA seulement au repos
 * ◈ Starfield AAA — fond noir profond, 22 000 étoiles spectrales, SANS PIXELS
 * ◈ Événements cosmiques aléatoires ultra-lointains :
 *     • Nébuleuses volumétriques (billboard SDF gaussian)
 *     • Supernovas pulsantes (halo multi-couches)
 *     • Comètes hyperboliques (trail procédural)
 *     • Nuages de gaz interstellaires (billboards fbm)
 * ◈ Moons/Rings frustum culling manuel
 * ◈ Viral swarm — vertex shader optimisé (calcul GPU pur, 0 CPU)
 */
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { TIER_LABEL, TIER_PRICE } from '../lib/grid';

// ── Mobile detection hook ──────────────────────────────────────────────────────
function useIsMobile(breakpoint=768){
  const[mob,setMob]=useState(false);
  useEffect(()=>{
    const mq=window.matchMedia(`(max-width:${breakpoint}px)`);
    setMob(mq.matches);
    const fn=e=>setMob(e.matches);
    mq.addEventListener('change',fn);
    return()=>mq.removeEventListener('change',fn);
  },[breakpoint]);
  return mob;
}

// ── Palette réaliste AAA ──────────────────────────────────────────────────────
const DS = {
  void:'#01020A',
  glass:'rgba(10,10,16,0.97)',
  glassBrd:'rgba(255,255,255,0.08)',
  glassBrdHi:'rgba(255,255,255,0.14)',
  gold:'#E8A020',
  cyan:'#00C8E4',
  violet:'#8060C8',
  green:'#00D880',
  rose:'#D02848',
  amber:'#F07820',
  textHi:'#E8EEF8',
  textMid:'rgba(160,180,210,0.70)',
  textLo:'rgba(120,140,170,0.38)',
  panelBg:'rgba(8,8,14,0.98)',
  scanCol:'rgba(0,0,0,0)',
  bracket:'rgba(255,255,255,0.06)',
};

const TIER_NEON = {
  epicenter:'#C8922A', prestige:'#8A5A3A', elite:'#4A6888',
  business:'#3A6A55',  standard:'#505878', viral:'#3D5C3A',
};

const FILTER_PALETTES = {
  realist:  {
    // PLASMA — rendu stellaire lisible, contraste occ/dispo maximal
    epicenter:'#E8A020', prestige:'#A86848', elite:'#4A88B8', business:'#2A8A70', standard:'#4A6898', viral:'#2A7050',
    emissiveScale:0.80, bloomThreshold:0.92, bloomStrength:0.18, exposure:1.40,
    fogColor:0x01030A, fogDensity:0.00014, ambientCol:0x040710, ambientInt:1.4,
    sunCol:0xFFEEC8, sunInt:900, rimCol:0xE87010, rimInt:30,
    bgTop:'#01030C', bgBot:'#010510',
    lensColor:'rgba(0,0,0,0)', lensBlend:'normal', lensOpacity:0,
  },
  thermal:  {
    // FLUX-IR — chaleur lisible, gradient distinctif par tier
    epicenter:'#FF1800', prestige:'#FF4400', elite:'#FF8800', business:'#FFBB00', standard:'#CCDD00', viral:'#55DD00',
    emissiveScale:2.4, bloomThreshold:0.48, bloomStrength:1.40, exposure:1.65,
    fogColor:0x180300, fogDensity:0.00040, ambientCol:0x1C0300, ambientInt:1.2,
    sunCol:0xFF5500, sunInt:2000, rimCol:0xFF9900, rimInt:100,
    bgTop:'#0A0100', bgBot:'#160300',
    lensColor:'rgba(80,8,0,0.18)', lensBlend:'multiply', lensOpacity:1,
  },
  solar:    {
    // SOLAIRE — filtre polarisé ambré, anti-éblouissement, lunettes de soleil
    epicenter:'#C4881A', prestige:'#8C6C30', elite:'#607055', business:'#456050', standard:'#4C5848', viral:'#3A4832',
    emissiveScale:0.55, bloomThreshold:0.95, bloomStrength:0.14, exposure:0.82,
    fogColor:0x0A0804, fogDensity:0.00038, ambientCol:0x0E0A04, ambientInt:0.75,
    sunCol:0xC89040, sunInt:700, rimCol:0xA07030, rimInt:20,
    bgTop:'#060402', bgBot:'#0A0703',
    lensColor:'rgba(110,55,0,0.28)', lensBlend:'multiply', lensOpacity:1,
  },
  chromatic: {
    // CHROMATIQUE — monochrome bleu dot-matrix, lisibilité maximale façon Vercel
    epicenter:'#1E90FF', prestige:'#1675D6', elite:'#1060BC', business:'#0D4E9C', standard:'#0A3C7A', viral:'#082C58',
    emissiveScale:0.60, bloomThreshold:0.98, bloomStrength:0.06, exposure:1.10,
    fogColor:0x01050F, fogDensity:0.00008, ambientCol:0x010510, ambientInt:2.2,
    sunCol:0x4499FF, sunInt:800, rimCol:0x2277EE, rimInt:30,
    bgTop:'#010610', bgBot:'#010914',
    lensColor:'rgba(0,20,60,0.08)', lensBlend:'multiply', lensOpacity:1,
  },
};

const TIER_ROLE = {
  epicenter:{ icon:'◈', role:'Épicentre Absolu',    desc:"Le cœur cristallin. Votre marque rayonne depuis le noyau de la Sphère." },
  prestige: { icon:'◯', role:'Lune Orbitale',        desc:'Corps orbital premium. Présence sculpturale, visible depuis toute la sphère.' },
  elite:    { icon:'◎', role:'Anneau Dyson',         desc:'Anneau équatorial structurel. Architecture iconique de la mégastructure.' },
  business: { icon:'▣', role:'Panneau Structurel',   desc:'Segment de surface. Trafic qualifié haute densité, flux direct.' },
  standard: { icon:'▪', role:'Émetteur de Surface',  desc:'Présence confirmée sur la mégastructure. Visibilité orbitale complète.' },
  viral:    { icon:'⚡', role:'Drone Orbital',        desc:'Essaim de nano-drones. Présence diffuse maximale à 671 vecteurs.' },
};
const F = { ui:"'Rajdhani','Sora',system-ui,sans-serif", mono:"'JetBrains Mono','Fira Code',monospace", head:"'Rajdhani','Sora',system-ui,sans-serif" };
const TIER_ORDER   = ['epicenter','prestige','elite','business','standard','viral'];
const TIER_TOTALS  = { epicenter:1, prestige:8, elite:50, business:176, standard:400, viral:671 };

const SPHERE_R   = 45;
const PANEL_GAP  = 0.90;
const EPIC_R     = 2.2;

const fmt  = t => ((TIER_PRICE[t]||100)/100).toLocaleString('fr-FR');
const hex3 = h => { const s=(h||'#888').replace('#',''); return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]; };
const TIER_PANEL_SCALE = { epicenter:1.30, prestige:1.14, elite:0.98, business:0.80, standard:0.62, viral:0.30 };

// ── Anneaux Elite — BILLBOARD GÉANTS, distribution sphérique uniforme ────────
// 6 plans répartis comme les faces d'un gyroscope :
//   • 3 anneaux équatoriaux espacés de 120° (rZ = 0°, 120°, -120°), légère inclinaison
//   • 3 anneaux obliques à 54°/58° d'inclinaison, décalés de 60° entre eux
// → aucun regroupement visuel, chaque anneau coupe l'étoile depuis un côté différent
const ELITE_RING_CFG = [
  // ── RINGWORLD — anneau unique, loin de l'épicentre, section rectangulaire haute ──
  // Inspiré Ringworld (Larry Niven) : face interne = panneaux publicitaires / paysages
  //                                   face externe = coque industrielle greeblée
  // mR éloigné → anneau orbital majestueux encerclant l'étoile de loin
  // tR (demi-hauteur) tall → section bien visible de loin
  // thick (épaisseur radiale) fin par rapport à la hauteur
  {mR:SPHERE_R*3.60, tR:SPHERE_R*0.55, thick:SPHERE_R*0.18, rX:0.22, rZ:0.00, slots:8, col:'#00DDAA'},
];

// ── BRIDGES — 8 ponts structuraux reliant la sphère à l'anneau ──
const N_BRIDGES = 8;
const BRIDGE_RING_RX = 0.22;
const BRIDGE_INNER   = SPHERE_R*1.12;
const BRIDGE_OUTER   = SPHERE_R*3.40;
const BRIDGE_LEN     = BRIDGE_OUTER - BRIDGE_INNER;
const BRIDGE_W       = SPHERE_R*0.09;
const BRIDGE_H       = SPHERE_R*0.09;
const BRIDGE_PANEL_W = SPHERE_R*0.70;
const BRIDGE_PANEL_H = SPHERE_R*0.50;

// ── Post-processing shaders ──────────────────────────────────────────────────
const CA_GRAIN_SHADER = {
  uniforms: { tDiffuse:{value:null}, uTime:{value:0}, uCAStrength:{value:0.0008}, uGrainStr:{value:0.0}, uVigStr:{value:0.42}, uActive:{value:1.0} },
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    uniform sampler2D tDiffuse;uniform float uTime,uCAStrength,uGrainStr,uVigStr,uActive;varying vec2 vUv;
    float hash13(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
    void main(){
      vec2 uv=vUv,dir=uv-.5;float d=length(dir);
      vec4 base=texture2D(tDiffuse,uv);
      if(uActive<.5){
        float vig=1.-smoothstep(.40,1.10,d*uVigStr);
        gl_FragColor=vec4(base.rgb*vig,1.);return;
      }
      vec2 off=normalize(dir+.001)*d*d*uCAStrength;
      float r=texture2D(tDiffuse,uv+off*1.0).r;
      float g=texture2D(tDiffuse,uv+off*0.3).g;
      float b=texture2D(tDiffuse,uv-off*0.7).b;
      vec3 col=vec3(r,g,b);
      float grain=hash13(vec3(uv*1920.,uTime*.5))-.5;
      col+=grain*uGrainStr*(1.-dot(col,vec3(.2126,.7152,.0722))*.8);
      float vig=1.-smoothstep(.40,1.10,d*uVigStr);
      col*=vig;col=col/(col+vec3(.12));col*=1.12;
      gl_FragColor=vec4(clamp(col,0.,1.),1.);
    }`,
};

const SSAO_SHADER = {
  uniforms: { tDiffuse:{value:null}, uIntensity:{value:0.0} },
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    uniform sampler2D tDiffuse;uniform float uIntensity;varying vec2 vUv;
    void main(){
      vec4 col=texture2D(tDiffuse,vUv);
      if(uIntensity<.01){gl_FragColor=col;return;}
      float lum=dot(col.rgb,vec3(.2126,.7152,.0722));
      vec2 px=vec2(.0014,.0014);float ao=0.;
      for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){
        if(i==0&&j==0)continue;
        float l2=dot(texture2D(tDiffuse,vUv+vec2(float(i),float(j))*px).rgb,vec3(.2126,.7152,.0722));
        ao+=max(0.,lum-l2)*.12;
      }
      ao=clamp(ao*uIntensity,0.,.50);
      gl_FragColor=vec4(col.rgb*(1.-ao),col.a);
    }`,
};

// ── Panel shader (inchangé, déjà optimisé) ──────────────────────────────────
const PANEL_VERT = `
precision highp float;
attribute float aOccupied;attribute vec3 aTierColor;attribute float aTierIdx;
attribute float aFaceIdx;attribute vec3 aBary;
uniform float uTime,uHovered,uSelected,uTierFocus,uTierDim;
varying vec3 vN,vWP,vTC,vBary;
varying float vOcc,vTI,vFI,vFresnel,vHov,vSel,vDim;
void main(){
  vN=normalize(normalMatrix*normal);
  vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;
  vOcc=aOccupied;vTC=aTierColor;vTI=aTierIdx;vFI=aFaceIdx;vBary=aBary;
  vHov=step(abs(aFaceIdx-uHovered),.5);vSel=step(abs(aFaceIdx-uSelected),.5);
  vec3 vd=normalize(cameraPosition-wp.xyz);
  vFresnel=pow(clamp(1.-abs(dot(vN,vd)),0.,1.),2.8);
  vDim=uTierDim>0.5?(step(abs(vTI-uTierFocus),.5)>0.5?0.:1.):0.;
  vec3 pos=position;
  if(vSel>.5)pos+=normalize(position)*(.6+.15*sin(uTime*4.));
  else if(vHov>.5)pos+=normalize(position)*.3;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
}`;
const PANEL_FRAG = `
precision highp float;
uniform float uTime;
varying vec3 vN,vWP,vTC,vBary;
varying float vOcc,vTI,vFI,vFresnel,vHov,vSel,vDim;

float edgeF(float w){vec3 d=fwidth(vBary);vec3 a=smoothstep(vec3(0.),d*w,vBary);return 1.-min(min(a.x,a.y),a.z);}
float hash(float n){return fract(sin(n)*43758.5453);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

vec2 panelUV(vec3 wp, vec3 n, float scale){
  vec3 up = abs(n.y) < 0.95 ? vec3(0.,1.,0.) : vec3(1.,0.,0.);
  vec3 T  = normalize(cross(up, n));
  vec3 B  = cross(n, T);
  return vec2(dot(wp, T), dot(wp, B)) * scale;
}

// ── Grille PV lisible — cellules nettes, joints visibles ───────────────────
vec3 pvGrid(vec2 uv){
  float cellCols = 5.0, cellRows = 8.0;
  vec2  cellUV   = vec2(uv.x * cellCols, uv.y * cellRows);
  vec2  cellId   = floor(cellUV);
  vec2  cellFrac = fract(cellUV);
  float cellSeed = hash2(cellId * 0.317 + 1.7);
  float cellVar  = cellSeed * 0.18;  // variation réduite — lisibilité prime

  // Joints nets entre cellules (séparateur époxy dark)
  float jw = 0.055;
  float jx = smoothstep(0.0, jw, min(cellFrac.x, 1.0-cellFrac.x)*2.0);
  float jy = smoothstep(0.0, jw, min(cellFrac.y, 1.0-cellFrac.y)*2.0);
  float cellMask = jx * jy; // 1 = intérieur cellule, 0 = joint

  // Un seul busbar central horizontal (plus lisible que 3)
  float busW = 0.030;
  float busFrac = abs(fract(uv.y * 2.0) - 0.5);
  float busbar  = smoothstep(busW, 0.0, busFrac) * cellMask;

  // 3 micro-fingers par cellule
  float fw = 0.009;
  float fp = fract(cellFrac.x * 3.0);
  float finger = smoothstep(fw, 0.0, abs(fp - 0.5) - 0.5 + fw) * cellMask * (1.0 - busbar);

  return vec3(cellVar, busbar, finger);
}

void main(){
  float t   = uTime;
  bool  hov = vHov > 0.5, sel = vSel > 0.5, dim = vDim > 0.5;
  float seed  = hash(vFI * 13.7 + 2.3);
  // Pulse doux — seulement sur occupés
  float pulse = vOcc > 0.5 ? (0.92 + 0.08 * sin(t * (0.5 + seed * 0.15) + seed * 6.28)) : 1.0;
  float wire  = edgeF(0.7);   // contour principal net
  float wireW = edgeF(2.2);   // contour élargi pour glow doux

  vec3  nN  = normalize(vN);
  vec2  puv = panelUV(vWP, nN, 2.2);
  vec3  pv  = pvGrid(puv);
  float cellVar = pv.x;
  float busbar  = pv.y;
  float finger  = pv.z;

  if(gl_FrontFacing){

    // ── BASE — silicium uniforme, peu de bruit ─────────────────────────────
    // Bleu-nuit profond, cellVar minimal pour préserver la lisibilité
    vec3 siBase = vec3(0.018 + cellVar*0.008, 0.026 + cellVar*0.005, 0.055 + cellVar*0.010);

    // ── ÉCLAIRAGE SIMPLIFIÉ — un seul highlight directionnel ───────────────
    vec3 toStar  = normalize(-vWP);
    float NdotL  = max(0.0, dot(nN, toStar));
    // Reflet nacré busbars/fingers argentés
    vec3 metalCol = vec3(0.28, 0.30, 0.34) * (busbar * 0.9 + finger * 0.4) * NdotL;

    // ── CONTOUR DU PANNEAU — fine ligne tier-colorée ───────────────────────
    // Disponible : contour très fin, très sombre → presque invisible
    // Occupé    : contour net, lumineux, tier-coloré
    float edgeLum = vOcc > 0.5
      ? (sel ? 2.8 : (hov ? 1.8 : 0.55)) * pulse
      : (hov ? 0.35 : 0.04);
    vec3 edgeCol  = vTC * wire  * edgeLum;
    vec3 edgeSoft = vTC * wireW * edgeLum * 0.06; // halo léger

    // ── TEINTE PANNEAU (fill) ──────────────────────────────────────────────
    vec3 fillCol = vec3(0.0);
    if(vOcc > 0.5){
      // Occupé : fill tier clair et uniforme — pas de bruit excessif
      // On lit le tier index : 0=epic, 1=prestige, 2=elite, 3=biz, 4=std, 5=viral
      float tierAmp = mix(0.042, 0.014, clamp(vTI / 5.0, 0.0, 1.0));
      fillCol  = vTC * tierAmp * (1.0 + cellVar * 0.25) * pulse;
      // Busbars légèrement plus brillants sur panneaux occupés
      fillCol += vTC * busbar * 0.010 * pulse;
    } else {
      // Disponible : fill quasi nul — silicium éteint, quasi fantôme
      fillCol = vTC * 0.0025;
    }

    // ── FRESNEL — très subtil, annonce la courbure ──────────────────────────
    float rimStr = vOcc > 0.5 ? 0.016 * pulse : 0.003;
    vec3  rim    = vTC * pow(vFresnel, 3.0) * rimStr;

    // ── ASSEMBLAGE ─────────────────────────────────────────────────────────
    vec3 col = siBase + metalCol + edgeCol + edgeSoft + fillCol + rim;

    // Sélection : clignotement du contour tier-coloré
    if(sel) col += vTC * wire * 0.8 * (0.65 + 0.35 * sin(t * 7.0));

    // Focus tier : atténuation forte des autres tiers
    if(dim){ col = mix(col, vec3(0.004, 0.006, 0.010), 0.94); col *= 0.10; }

    gl_FragColor = vec4(col, 1.0);

  }else{
    // ── FACE INTÉRIEURE — hologramme hexagonal inchangé ───────────────────
    vec3  toE   = normalize(-vWP);
    float ir    = max(0.0, dot(-nN, toE));
    float pulse2 = 0.60 + 0.40 * sin(t * 1.2 + vFI * 0.38 + seed * 3.14);
    vec2  hUV   = vec2(dot(vWP, vec3(0.70, 0.42, 0.58)), dot(vWP, vec3(-0.40, 0.82, -0.40))) * 0.22;
    vec2  hq    = vec2(hUV.x * 1.1547, hUV.y + hUV.x * 0.5774) * 3.2;
    vec2  hpf   = fract(hq);
    float hv    = abs(hpf.x * 2.0 - 1.0), hh = abs(hpf.y * 2.0 - 1.0);
    float hex   = 1.0 - smoothstep(0.36, 0.46, max(hv, (hv + hh) * 0.5));
    float scan  = pow(max(0.0, sin(fract(dot(vWP, vec3(0.577, 0.577, 0.577)) * 0.14 - t * 0.06 + seed) * 3.14159)), 5.0) * 0.5;
    float energy = ir * (0.4 + 0.6 * sin(t * 0.8 + length(vWP.xy) * 0.15));
    vec3 inner  = vec3(0.004, 0.008, 0.018);
    inner += vTC * hex * 0.22 * energy * pulse2 + vTC * scan * 0.14 * energy;
    inner += mix(vec3(0.005, 0.010, 0.025), vTC * 0.08, ir * 0.7) * pulse2 + vTC * edgeF(2.5) * 0.25 * energy * pulse2;
    if(vOcc > 0.5) inner += vTC * 0.06 * ir * pulse2;
    inner += vTC * pow(vFresnel, 2.0) * 0.08 * pulse2;
    if(vOcc > 0.5) inner *= 1.15 + 0.10 * sin(t * 1.8 + vFI * 0.22);
    if(dim) inner = mix(inner, vec3(0.002, 0.004, 0.008), 0.92);
    gl_FragColor = vec4(inner, 1.0);
  }
}`;

const EPIC_VERT=`precision highp float;varying vec3 vN,vWP,vPos;void main(){vN=normalize(normalMatrix*normal);vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const EPIC_FRAG=`
precision highp float;uniform float uTime,uInsideBlend,uSelected,uEpicFocus;varying vec3 vN,vWP,vPos;
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.1+vec2(1.7,9.2);a*=.5;}return v;}

// Flower of Life — superposition de cercles sur grille hexagonale
float flowerOfLife(vec3 pos){
  // Projeter sur sphère en coordonnées UV sphériques
  vec3 np=normalize(pos);
  float u=atan(np.z,np.x)/(3.14159*2.)+.5;
  float v=asin(clamp(np.y,-1.,1.))/3.14159+.5;
  vec2 uv=vec2(u,v)*6.; // densité du motif
  float scale=3.0;
  vec2 p=uv*scale;
  // Grille hexagonale
  float ring=0.;
  // Centre + 6 cercles du 1er anneau Flower of Life
  vec2 centers[7];
  centers[0]=vec2(0.,0.);
  float r=1.0;
  for(int i=0;i<6;i++){
    float a=float(i)*3.14159/3.;
    centers[i+1]=vec2(cos(a)*r,sin(a)*r);
  }
  float R=1.0; // rayon de chaque cercle
  for(int i=0;i<7;i++){
    vec2 diff=p-floor(p/2.5)*2.5-centers[i];
    float dist=length(diff);
    // Ligne du cercle (épaisseur 0.06)
    float line=smoothstep(.06,.0,abs(dist-R*.92));
    ring=max(ring,line);
  }
  return ring;
}

void main(){
  float t=uTime;vec3 vd=normalize(cameraPosition-vWP);
  vec3 fn=normalize(floor(vN*4.+.5)/4.);
  float facet=pow(max(0.,dot(fn,vd)),3.5);
  float fresnel=pow(clamp(1.-abs(dot(vN,vd)),0.,1.),1.6);
  vec2 p1=vPos.xy*8.+vec2(sin(t*.22)*.8,cos(t*.18)*.6);
  vec2 p2=vPos.yz*12.-vec2(cos(t*.15)*.5,sin(t*.27)*.7);
  float plasma=fbm(p1)*.6+fbm(p2)*.4;
  float pulse=.88+.12*sin(t*1.8+plasma*5.);
  vec3 deep=vec3(.12,.06,.01),mid=vec3(1.00,.55,.10),bright=vec3(1.00,.88,.60),white=vec3(1.00,.96,.88);
  vec3 col=mix(deep,mid,plasma*.8);
  col=mix(col,bright,fresnel*.6);col=mix(col,white,facet*.7*pulse);
  col+=white*pow(fresnel,1.2)*1.8*(.9+.1*sin(t*2.2))+mid*facet*2.4*pulse;
  if(uSelected>.5){col=mix(col,white*2.,sin(t*8.)*.5+.5);col+=bright*.6*sin(t*12.+length(vPos)*8.);}
  // ── Flower of Life overlay ──
  float fol=flowerOfLife(vPos);
  // Couleur dorée/ambrée pour le motif sacré
  vec3 goldenLine=mix(vec3(.95,.72,.12),vec3(1.,.95,.6),fol);
  float folPulse=.6+.4*sin(t*.8+length(vPos.xy)*2.);
  col=mix(col,col+goldenLine*2.5*folPulse,fol*.75);
  float intensity=mix(2.8,.8,uInsideBlend*.5);
  intensity*=mix(1.0,4.2,uEpicFocus);
  col=mix(col,col+white*uEpicFocus*(.5+.5*sin(t*3.)),uEpicFocus);
  gl_FragColor=vec4(col*intensity*pulse,1.);
}`;

// ── Ring shader LOD-aware ─────────────────────────────────────────────────────
// ── Ring Billboard Shader — grand panneau publicitaire orbital ───────────────
// Section rectangulaire haute, ticker scrollant, structure acier sci-fi
const RING_VERT=`
precision highp float;
varying vec2 vUV;varying vec3 vN,vWP,vPos;
varying float vIsOuter;
void main(){
  vUV=uv;vN=normalize(normalMatrix*normal);
  vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;vPos=position;
  // Outer face: normal pointe radialement vers l'extérieur (dot ~ +1)
  // Inner face: normal pointe vers l'intérieur (dot ~ -1)
  vec3 worldNormal=normalize(mat3(modelMatrix)*normal);
  vec3 radial=normalize(vec3(wp.x,0.0,wp.z));
  float radialDot=dot(worldNormal,radial);
  vIsOuter=radialDot>0.3?1.0:0.0;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;
const RING_FRAG=`
precision highp float;
uniform float uTime,uHov,uDim,uSlots,uOccCount,uRingIdx,uScrollSpeed,uHasTex,uTexOffset;
uniform vec3 uCol,uBrandBg;
uniform sampler2D uBrandTex;
uniform sampler2D uBrandTex1,uBrandTex2,uBrandTex3,uBrandTex4,uBrandTex5,uBrandTex6,uBrandTex7,uBrandTex8;
uniform float uHasTex1,uHasTex2,uHasTex3,uHasTex4,uHasTex5,uHasTex6,uHasTex7,uHasTex8;
uniform float uTexOffset1,uTexOffset2,uTexOffset3,uTexOffset4,uTexOffset5,uTexOffset6,uTexOffset7,uTexOffset8;
varying vec2 vUV;varying vec3 vN,vWP,vPos;
varying float vIsOuter;

float hash(float n){return fract(sin(n)*43758.5453);}
float hash2d(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float noise2d(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2d(i),hash2d(i+vec2(1,0)),f.x),mix(hash2d(i+vec2(0,1)),hash2d(i+vec2(1,1)),f.x),f.y);}
float GGX(float NdotH,float rough){float a=rough*rough;float a2=a*a;float d=NdotH*NdotH*(a2-1.)+1.;return a2/(3.14159*d*d);}

void main(){
  if(uDim>.5){gl_FragColor=vec4(.003,.004,.007,1.);return;}
  float t=uTime;
  vec2 uv=vUV;

  // Slot segmentation
  float slotRaw=uv.x*uSlots;
  float slotIdx=floor(slotRaw);
  float slotFrac=fract(slotRaw);
  float seed=hash(slotIdx*.37+uRingIdx*5.13+2.1);
  float isOcc=step(slotIdx,uOccCount-.5);

  // Texture per slot
  float sid=slotIdx;
  float slotHasTex;
  if(sid<0.5)       slotHasTex=uHasTex1;
  else if(sid<1.5)  slotHasTex=uHasTex2;
  else if(sid<2.5)  slotHasTex=uHasTex3;
  else if(sid<3.5)  slotHasTex=uHasTex4;
  else if(sid<4.5)  slotHasTex=uHasTex5;
  else if(sid<5.5)  slotHasTex=uHasTex6;
  else if(sid<6.5)  slotHasTex=uHasTex7;
  else              slotHasTex=uHasTex8;
  float anyHasTex=max(max(max(max(uHasTex1,uHasTex2),max(uHasTex3,uHasTex4)),max(uHasTex5,uHasTex6)),max(uHasTex7,uHasTex8));
  float slotIsOcc=max(slotHasTex,isOcc);

  // PBR specular commun
  vec3 toStar=normalize(-vWP);vec3 viewDir=normalize(cameraPosition-vWP);
  vec3 H=normalize(toStar+viewDir);
  float NdotH=max(0.,dot(normalize(vN),H));
  float NdotL=max(0.,dot(normalize(vN),toStar))*.5+.5;
  float NdotV=abs(dot(normalize(vN),normalize(cameraPosition-vWP)));
  float roughMetal=uHov>.5?.06:.15;
  float spec=GGX(NdotH,roughMetal)*NdotL;

  vec3 col;
  float alpha;
  // Zone de contenu (hors bords cap haut/bas) — utilisée en face interne
  float edgeHc=.04;
  float contentY=smoothstep(edgeHc,edgeHc+.01,uv.y)*(1.-smoothstep(1.-edgeHc-.01,1.-edgeHc,uv.y));

  // ════════════════════════════════════════════════════════
  // FACE EXTERNE — coque métallique sci-fi (Space Station Hull)
  // ════════════════════════════════════════════════════════
  if(vIsOuter>.5){
    // ── COQUE EXTERNE RINGWORLD — industrielle, greebles lourds ──
    vec3 hullBase=vec3(.095,.110,.145);   // acier bleuté clair — visible de loin
    vec3 hullDark=vec3(.035,.040,.060);   // rainures / zones sombres
    vec3 hullLight=vec3(.180,.200,.260);  // reflets hauts
    vec3 hullAccent=vec3(.20,.32,.55);    // modules bleutés

    // ── Grandes plaques structurelles ──
    float pX=fract(uv.x*7.);float pY=fract(uv.y*3.);
    float plateX=smoothstep(.0,.03,min(pX,1.-pX));
    float plateY=smoothstep(.0,.03,min(pY,1.-pY));
    float plate=plateX*plateY;
    float plateGroove=1.-plate; // rainures entre plaques

    // ── Modules circulaires (style Ringworld) ──
    // Position centre du module = grille 3×2 sur chaque plaque
    float mX=fract(uv.x*7.*3.-.5);float mY=fract(uv.y*3.*2.-.5);
    float modDist=length(vec2(mX-.5,mY-.5)*vec2(1.2,1.8));
    float outerRim=smoothstep(.38,.35,modDist)-smoothstep(.35,.30,modDist); // bord anneau
    float innerRim=smoothstep(.22,.20,modDist)-smoothstep(.20,.15,modDist); // bord intérieur
    float innerFill=smoothstep(.15,.0,modDist)*.25; // fond sombre module
    float modGlow=outerRim+innerRim*.7;

    // ── Circuits / tracés sur les plaques ──
    float cX=fract(uv.x*42.);float cY=fract(uv.y*22.);
    float circH=step(.48,cX)*step(cX,.52)*.18; // lignes horizontales
    float circV=step(.48,cY)*step(cY,.52)*.18; // lignes verticales
    float circuit=(circH+circV)*plate;

    // ── Rivets sur les bords de plaque ──
    float rX2=fract(uv.x*7.*4.);float rY2=fract(uv.y*3.*4.);
    float rivet=smoothstep(.3,.0,length(vec2(rX2-.5,rY2-.5)))*.35*plateGroove;

    // ── Micro-détails noise ──
    float micro=noise2d(uv*50.+vec2(t*.008,0.))*.04;

    // ── Bandes de renfort horizontales en haut/bas ──
    float reinH=.08;
    float reinTop=smoothstep(reinH,.0,uv.y);
    float reinBot=smoothstep(1.-reinH,1.,uv.y);
    float reinforcement=max(reinTop,reinBot);

    // Assemblage couleur
    col=mix(hullDark,hullBase,plate*.75+micro+NdotL*.35);
    col=mix(col,hullDark*.6,plateGroove*.5);      // rainures sombres
    col+=hullLight*outerRim*.9;                    // bord module brillant
    col+=hullAccent*innerRim*.6;                   // anneau interne bleuté
    col+=hullDark*innerFill;
    col+=hullLight*circuit*.7;                     // circuits
    col+=hullLight*rivet;                          // rivets
    col+=hullLight*reinforcement*.5;               // renforts haut/bas
    // Spéculaire métal froid — fort
    col+=vec3(.55,.60,.75)*spec*2.5;
    // Reflet teal minimal sur bords (lumière interne)
    col+=vec3(.0,.70,.55)*reinforcement*.10*(1.+.3*sin(t*.5+uRingIdx));
    if(uHov>.5)col+=hullAccent*.25+vec3(.55,.60,.75)*spec*1.2;

    float angleFade=smoothstep(.0,.12,NdotV);
    alpha=(.90+rivet*.06)*angleFade;
    alpha=clamp(alpha,0.,1.);

  // ════════════════════════════════════════════════════════
  // FACE INTERNE — panneaux holographiques dashboard (Inner Ring)
  // ════════════════════════════════════════════════════════
  } else {
    // ── FACE INTERNE RINGWORLD — grands panneaux d'affichage bien délimités ──
    // Inspiré de l'image : panneaux rectangulaires côte à côte sur la face interne
    vec3 panelBg=vec3(.003,.008,.018);
    vec3 teal=vec3(.0,.92,.70);
    vec3 green=vec3(.10,.92,.35);
    vec3 amber=vec3(.92,.60,.05);
    vec3 blue=vec3(.12,.50,1.0);
    vec3 cyan=vec3(.0,.82,.95);

    // Accent par slot
    vec3 slotAccent=mix(teal,green,step(.35,seed));
    slotAccent=mix(slotAccent,amber,step(.68,seed));
    slotAccent=mix(slotAccent,blue,step(.82,seed));
    slotAccent=mix(slotAccent,cyan,step(.92,seed));

    // ── Cadre du panneau — bordure noire épaisse entre panneaux ──
    float frameW=.04;
    float fL=smoothstep(0.,frameW,slotFrac);
    float fR=smoothstep(1.,1.-frameW,slotFrac);
    float fT=smoothstep(0.,frameW,uv.y);
    float fB=smoothstep(1.,1.-frameW,uv.y);
    float frame=min(min(fL,fR),min(fT,fB)); // 1 = intérieur panneau, 0 = cadre
    float isFrame=step(.5,1.-frame);

    // ── Couleur de fond du panneau selon slot ──
    // Panneaux avec contenu : fond bleu-noir foncé
    // Panneaux vides : gris anthracite
    vec3 slotBg=mix(vec3(.008,.010,.018),vec3(.012,.016,.030),slotIsOcc);

    // ── Contenu dynamique du panneau ──
    // Scan lines horizontales (style affichage)
    float lineFreq=36.;
    float scanY=fract(uv.y*lineFreq+t*.05);
    float scanLines=(.85+.15*step(.5,scanY))*frame*contentY;

    // ── Barres de données animées (représentent le contenu publicitaire) ──
    float scrollRate=(1.0+seed*.5)*uScrollSpeed;
    float barN=5.;
    float barUX=fract(slotFrac*barN);
    float barIdx2=floor(slotFrac*barN);
    float bH2=fract(hash(barIdx2*3.7+slotIdx*11.3)*1.+t*scrollRate*.06);
    bH2=clamp(bH2*.8+.12,.12,.92);
    float bar=step(uv.y,bH2)*step(.05,barUX)*step(barUX,.88)*slotIsOcc*contentY*frame*(1.-isFrame);
    vec3 barCol=mix(slotAccent,teal,.4);
    float barPulse=.7+.3*sin(t*1.8+barIdx2+seed*4.);

    // ── Indicateur status top-right ──
    float dotX=abs(slotFrac-.88)*5.;float dotY=abs(uv.y-.88)*5.;
    float statusDot=smoothstep(.55,.0,length(vec2(dotX,dotY)))*.9*slotIsOcc*frame;
    float dotPulse=.55+.45*sin(t*3.5+slotIdx*1.1);

    // ── Bordure lumineuse du cadre ──
    float borderInner=smoothstep(0.,frameW*.5,frame)*(1.-smoothstep(frameW*.5,frameW,frame));
    borderInner+=isFrame*.15;

    // ── Glow central ──
    float cGlow=exp(-pow((uv.y-.5)*1.6,2.)*.7)*exp(-pow((slotFrac-.5)*1.6,2.)*.7);

    // ── Assemblage ──
    col=mix(panelBg*.4,slotBg,frame); // cadre sombre, fond panneau
    col+=slotBg*scanLines*.15*slotIsOcc;
    col+=slotAccent*borderInner*(1.0+.3*sin(t*2.+slotIdx*.5))*1.2;
    col+=barCol*bar*barPulse*2.2;
    col+=slotAccent*statusDot*dotPulse*3.;
    col+=slotAccent*cGlow*(.07+.05*slotIsOcc)*frame;

    // ── Texture de marque ──
    vec4 texSample=vec4(0.);
    float texV2=clamp(uv.y,0.,1.);
    if(uHasTex1>.5)      texSample=texture2D(uBrandTex1,vec2(fract(uv.x+uTexOffset1),texV2));
    else if(uHasTex2>.5) texSample=texture2D(uBrandTex2,vec2(fract(uv.x+uTexOffset2),texV2));
    else if(uHasTex3>.5) texSample=texture2D(uBrandTex3,vec2(fract(uv.x+uTexOffset3),texV2));
    else if(uHasTex4>.5) texSample=texture2D(uBrandTex4,vec2(fract(uv.x+uTexOffset4),texV2));
    else if(uHasTex5>.5) texSample=texture2D(uBrandTex5,vec2(fract(uv.x+uTexOffset5),texV2));
    else if(uHasTex6>.5) texSample=texture2D(uBrandTex6,vec2(fract(uv.x+uTexOffset6),texV2));
    else if(uHasTex7>.5) texSample=texture2D(uBrandTex7,vec2(fract(uv.x+uTexOffset7),texV2));
    else if(uHasTex8>.5) texSample=texture2D(uBrandTex8,vec2(fract(uv.x+uTexOffset8),texV2));

    if(anyHasTex>.5){
      col=mix(col,col*.05,anyHasTex*.96)*frame+(1.-frame)*col;
      col=mix(col,texSample.rgb*frame,anyHasTex*frame);
      col+=texSample.rgb*anyHasTex*frame*3.0;
    }

    if(uHov>.5) col+=slotAccent*(.28+cGlow*.5)*frame;
    col+=vec3(.4,.5,.6)*spec*.3;

    float angleFade=smoothstep(.0,.16,NdotV);
    float baseAlpha=isFrame>.5?.92:(slotHasTex>.5?.92:(slotIsOcc>.5?.78:.38));
    alpha=baseAlpha*angleFade;
    alpha=clamp(alpha,0.,1.);
  }

  gl_FragColor=vec4(col,clamp(alpha,0.,1.));
}`

// ── Bridge panel shader — panneau 1 slot sur chaque pont ──
const BRIDGE_PANEL_VERT=`
precision highp float;
varying vec2 vUV;varying vec3 vN,vWP;
void main(){
  vUV=uv;
  vN=normalize(normalMatrix*normal);
  vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;
const BRIDGE_PANEL_FRAG=`
precision highp float;
uniform float uTime,uOcc,uHov,uDim;
uniform vec3 uBrandCol;
uniform sampler2D uBrandTex;uniform float uHasTex,uTexOffset;
varying vec2 vUV;varying vec3 vN,vWP;
float hash(float n){return fract(sin(n)*43758.5453);}
float GGX(float NdotH,float rough){float a=rough*rough;float a2=a*a;float d=NdotH*NdotH*(a2-1.)+1.;return a2/(3.14159*d*d);}
void main(){
  if(uDim>.5){gl_FragColor=vec4(.003,.004,.007,1.);return;}
  float t=uTime;vec2 uv=vUV;
  // Cadre du panneau
  float fw=.045;
  float fL=smoothstep(0.,fw,uv.x);float fR=smoothstep(1.,1.-fw,uv.x);
  float fT=smoothstep(0.,fw,uv.y);float fB=smoothstep(1.,1.-fw,uv.y);
  float inner=min(min(fL,fR),min(fT,fB));
  float border=1.-inner;
  // Fond
  vec3 bg=vec3(.004,.010,.022);
  vec3 accent=uBrandCol;
  vec3 col=mix(bg*.3,bg,inner);
  // Bordure lumineuse
  float borderGlow=border*(1.5+.5*sin(t*2.2));
  col+=accent*borderGlow*.8;
  // Scan lines
  float scan=step(.5,fract(uv.y*30.))*.08*uOcc*inner;
  col+=accent*scan;
  // Glow central
  float cG=exp(-pow((uv.x-.5)*2.,2.))*exp(-pow((uv.y-.5)*2.,2.));
  col+=accent*cG*(.06+.04*uOcc)*(.8+.2*sin(t*1.2));
  // Barre de chargement
  float bar=step(uv.x,.15+uOcc*.70)*step(uv.y,.18)*step(.12,uv.y)*inner;
  col+=accent*bar*(.7+.3*sin(t*2.+uv.x*8.));
  // Texture de marque
  if(uHasTex>.5){
    vec4 tex=texture2D(uBrandTex,vec2(fract(uv.x+uTexOffset),uv.y));
    col=mix(col,col*.04,inner*.95);
    col=mix(col,tex.rgb*inner,inner);
    col+=tex.rgb*inner*3.0;
  }
  // Specular
  vec3 vd=normalize(cameraPosition-vWP);
  vec3 h2=normalize(-normalize(vWP)+vd);
  float NdotH=max(0.,dot(normalize(vN),h2));
  col+=vec3(.4,.5,.7)*GGX(NdotH,uHov>.5?.06:.18)*.6;
  if(uHov>.5)col+=accent*(.25+cG*.4);
  float NdotV=abs(dot(normalize(vN),vd));
  float alpha=mix(.05,.92,smoothstep(.0,.2,NdotV))*(uHasTex>.5?.98:(uOcc>.5?.82:.40));
  gl_FragColor=vec4(col,clamp(alpha,0.,1.));
}`;

const BILL_VERT=`varying vec2 vU;uniform float uScale;void main(){vU=uv;vec3 r=vec3(modelViewMatrix[0][0],modelViewMatrix[1][0],modelViewMatrix[2][0]);vec3 u=vec3(modelViewMatrix[0][1],modelViewMatrix[1][1],modelViewMatrix[2][1]);vec4 base=modelViewMatrix*vec4(0.,0.,0.,1.);gl_Position=projectionMatrix*(base+vec4(position.x*r+position.y*u,0.)*uScale);}`;

const GRAY_VERT=`varying float vR,vAlpha,vAng;attribute float aAlpha;void main(){vR=length(position);vAlpha=aAlpha;vAng=atan(position.y,length(position.xz));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const GRAY_FRAG=`
precision highp float;uniform float uTime,uInsideBlend;varying float vR,vAlpha,vAng;
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){
  float fade=1.-smoothstep(${(SPHERE_R*.08).toFixed(1)},${(SPHERE_R*1.15).toFixed(1)},vR);
  float turb=.55+.45*sin(uTime*.35+vR*.18+vAng*3.14)*sin(uTime*.22+vAng*2.7+vR*.12);
  float t=clamp(vR/${(SPHERE_R*1.0).toFixed(1)},0.,1.);
  vec3 col=mix(vec3(2.2,1.9,1.3),mix(vec3(1.8,.9,.18),vec3(1.2,.4,.06),t),t);
  float inside=mix(1.,.12,uInsideBlend);
  gl_FragColor=vec4(col*turb,vAlpha*fade*.70*inside);
}`;

const DECO_RING_VERT=`varying float vA;void main(){vA=atan(position.z,position.x);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const DECO_RING_FRAG=`
precision highp float;uniform float uTime;uniform vec3 uCol;uniform float uAlpha;varying float vA;
void main(){
  float pulse=.45+.55*sin(uTime*.9+vA*3.);
  float tv=fract(vA/6.28318+uTime*.08);
  float spark=pow(smoothstep(0.,.05,tv)*(1.-smoothstep(.12,.05,tv)),2.)*1.2;
  gl_FragColor=vec4(uCol*(pulse*1.8+spark*4.),uAlpha*(.15+pulse*.45+spark*.7));
}`;

// ── Viral swarm — calcul GPU pur ─────────────────────────────────────────────
const VIRAL_VERT=`
precision highp float;
attribute float aPhase,aSpeed,aAxis,aRadius;uniform float uTime,uDim;varying float vBright,vDimV;
void main(){
  float t=uTime*aSpeed+aPhase;
  float ca=cos(aAxis),sa=sin(aAxis),co=cos(t),si=sin(t);
  float r=aRadius*(1.+.08*sin(t*2.1+aPhase));
  vec3 pos=vec3(co*ca-si*sa*.35,si*.70,co*sa+si*ca*.35)*r;
  vBright=.35+.65*sin(t*2.2+aPhase*5.);vDimV=uDim;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
  gl_PointSize=clamp((1.+vBright*2.)*(260./gl_Position.w),1.,5.);
}`;
const VIRAL_FRAG=`
precision highp float;varying float vBright,vDimV;
void main(){
  vec2 c=gl_PointCoord-.5;if(length(c)>.5)discard;
  float g=1.-length(c)*2.;
  if(vDimV>.5){gl_FragColor=vec4(.005,.006,.010,g*g*.3);return;}
  vec3 col=mix(vec3(.30,.22,.08),vec3(.65,.50,.22),vBright);
  gl_FragColor=vec4(col*g*2.2,g*g*(.40+vBright*.45));
}`;

// ── STARFIELD AAA SHADER — fond noir pur, spectre stellaire réaliste ──────────
const STAR_VERT = `
precision highp float;
attribute vec3 aColor;attribute float aTwinkle,aSize;
uniform float uTime;
varying vec3 vCol;varying float vTwinkle;
void main(){
  // Scintillement GPU — chaque étoile a sa propre fréquence
  float twink=.72+.28*sin(uTime*aTwinkle+position.x*.0013+position.z*.0017);
  vCol=aColor*twink;
  vTwinkle=twink;
  vec4 mv=modelViewMatrix*vec4(position,1.);
  gl_Position=projectionMatrix*mv;
  // Taille proportionnelle à la distance — stars lointaines plus petites
  float dist=length(mv.xyz);
  gl_PointSize=clamp(aSize*(1200./dist)*twink,0.4,4.5);
}`;
const STAR_FRAG = `
precision highp float;varying vec3 vCol;varying float vTwinkle;
void main(){
  vec2 c=gl_PointCoord-.5;
  float d=length(c);
  if(d>.5)discard;
  // Gaussian soft — anti-aliasing naturel, 0 pixel carré
  float alpha=exp(-d*d*18.)*vTwinkle;
  // Diffraction spike subtile — croix très tenue sur les étoiles brillantes
  float spk=max(exp(-abs(c.x)*80.),exp(-abs(c.y)*80.))*.18;
  gl_FragColor=vec4(vCol+vCol*spk*vTwinkle,alpha);
}`;

// ── Nebula billboard shader ──────────────────────────────────────────────────
const NEBULA_VERT=`varying vec2 vU;uniform float uScale;void main(){vU=uv;vec3 r=vec3(modelViewMatrix[0][0],modelViewMatrix[1][0],modelViewMatrix[2][0]);vec3 u=vec3(modelViewMatrix[0][1],modelViewMatrix[1][1],modelViewMatrix[2][1]);vec4 base=modelViewMatrix*vec4(0.,0.,0.,1.);gl_Position=projectionMatrix*(base+vec4(position.x*r+position.y*u,0.)*uScale);}`;
const NEBULA_FRAG=`
precision highp float;
uniform float uTime,uSeed;uniform vec3 uCol;varying vec2 vU;
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1+uSeed,311.7+uSeed*.7)))*43758.5);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.1+vec2(1.7,9.2)*uSeed*.1;a*=.48;}return v;}
void main(){
  vec2 c=vU*2.-1.;float d=length(c);
  if(d>1.)discard;
  // SDF gaussien avec turbulence FBM
  float t=uTime*.018;
  float n=fbm(c*2.2+vec2(t,t*.7))*fbm(c*4.8-vec2(t*.5,t*1.2));
  float mask=exp(-d*d*2.2)*n*3.5;
  // Gradient couleur — cœur brillant, bords colorés
  vec3 core=vec3(1.,1.,1.);
  vec3 col=mix(uCol*.6,core,pow(mask*.8,1.8));
  // Bandes d'émission — filaments ionisés
  float stripes=sin(fbm(c*6.+vec2(t*.3,0.))*12.+t)*.5+.5;
  col+=uCol*stripes*mask*.35;
  gl_FragColor=vec4(col,clamp(mask*.55,0.,1.));
}`;

// ── Supernova shader ─────────────────────────────────────────────────────────
const SUPERNOVA_FRAG=`
precision highp float;
uniform float uTime,uPhase;uniform vec3 uCol;varying vec2 vU;
void main(){
  vec2 c=vU*2.-1.;float d=length(c);if(d>1.)discard;
  float t=uTime+uPhase;
  // Onde d'expansion — pulse lent
  float wave=fract(t*.04);
  float ring=exp(-pow(d-wave*.8,2.)*180.)*.9;
  // Cœur ultra-brillant
  float core=exp(-d*d*22.)*(.8+.2*sin(t*2.));
  // Rayons — 6 spikes rotatifs
  float ang=atan(c.y,c.x);
  float spk=pow(max(0.,sin(ang*3.+t*.3)*.5+.5),8.)*(1.-d)*exp(-d*5.)*1.4;
  vec3 col=uCol*ring+vec3(1.,.95,.8)*core+uCol*spk;
  gl_FragColor=vec4(col,clamp(ring*.6+core*.9+spk*.5,0.,1.));
}`;

// ── Comet shader ─────────────────────────────────────────────────────────────
const COMET_VERT=`
precision highp float;
attribute float aTPos;uniform float uTime;
varying float vT,vAlpha;
void main(){
  vT=aTPos;
  // Fade — queue s'atténue
  vAlpha=pow(1.-aTPos,1.8);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  gl_PointSize=max(.5,(1.-aTPos)*3.5*(180./gl_Position.w));
}`;
const COMET_FRAG=`
precision highp float;varying float vT,vAlpha;
uniform vec3 uCol;
void main(){
  vec2 c=gl_PointCoord-.5;if(length(c)>.5)discard;
  float g=exp(-length(c)*length(c)*14.);
  vec3 col=mix(vec3(1.,1.,.9),uCol,vT);
  gl_FragColor=vec4(col*g,g*vAlpha*.8);
}`;

// ── Gas cloud shader (diffus, très lointain) ─────────────────────────────────
const GAS_FRAG=`
precision highp float;
uniform float uTime,uSeed;uniform vec3 uCol;varying vec2 vU;
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1+uSeed,311.7)))*43758.5);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.1;a*=.5;}return v;}
void main(){
  vec2 c=vU*2.-1.;float d=length(c);if(d>1.)discard;
  float mask=fbm(c*2.8+uSeed)*exp(-d*d*1.8);
  gl_FragColor=vec4(uCol,clamp(mask*.25,0.,1.));
}`;

// ── Géométrie helpers ─────────────────────────────────────────────────────────
const ins=(vs,c,f)=>vs.map(v=>[c[0]+(v[0]-c[0])*f,c[1]+(v[1]-c[1])*f,c[2]+(v[2]-c[2])*f]);
const cN=vs=>[vs.reduce((s,v)=>s+v[0],0)/vs.length,vs.reduce((s,v)=>s+v[1],0)/vs.length,vs.reduce((s,v)=>s+v[2],0)/vs.length];
const mS=(a,b)=>{const m=a.map((c,i)=>(c+b[i])/2),l=Math.hypot(...m);return m.map(c=>c/l);};

function buildIcoFaces(sub){
  const phi=(1+Math.sqrt(5))/2;
  const rv=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(c=>c/l);});
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]].map(f=>f.map(i=>rv[i]));
  for(let s=0;s<sub;s++){const nx=[];for(const[a,b,c]of faces){const ab=mS(a,b),bc=mS(b,c),ca=mS(c,a);nx.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}faces=nx;}
  const R=SPHERE_R;
  return faces.map(([a,b,c])=>{const vs=[[a[0]*R,a[1]*R,a[2]*R],[b[0]*R,b[1]*R,b[2]*R],[c[0]*R,c[1]*R,c[2]*R]];const cnt=cN(vs);return{verts:ins(vs,cnt,PANEL_GAP),centroid:cnt,isQuad:false};});
}
function rescaleVerts(face,tier){const adj=(TIER_PANEL_SCALE[tier]||.82)/PANEL_GAP;const c=face.centroid;return face.verts.map(v=>[c[0]+(v[0]-c[0])*adj,c[1]+(v[1]-c[1])*adj,c[2]+(v[2]-c[2])*adj]);}
function buildPanelBufs(faces,tierColors){
  const nT=faces.length;
  const pos=new Float32Array(nT*9),nrm=new Float32Array(nT*9),occ=new Float32Array(nT*3),tc=new Float32Array(nT*9);
  const ti=new Float32Array(nT*3),fi=new Float32Array(nT*3),bary=new Float32Array(nT*9);
  const t2f=new Int32Array(nT);
  let v=0,t=0;
  const tn=(a,b,c)=>{const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l);};
  const push=(x,y,z,nx,ny,nz,o,r,g,b,tiv,fiv,bx,by,bz)=>{const i=v*3;pos[i]=x;pos[i+1]=y;pos[i+2]=z;nrm[i]=nx;nrm[i+1]=ny;nrm[i+2]=nz;occ[v]=o;tc[i]=r;tc[i+1]=g;tc[i+2]=b;ti[v]=tiv;fi[v]=fiv;bary[i]=bx;bary[i+1]=by;bary[i+2]=bz;v++;};
  faces.forEach((face,fI)=>{
    const s=face.slot;const isO=s?.occ?1:0;const tier=s?.tier||'viral';
    const col=tierColors?.[tier]||TIER_NEON[tier]||'#505878';const rgb=hex3(col);
    const tiv=TIER_ORDER.indexOf(tier)<0?5:TIER_ORDER.indexOf(tier);
    const vs=rescaleVerts(face,tier);const n0=tn(vs[0],vs[1],vs[2]);
    push(vs[0][0],vs[0][1],vs[0][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,1,0,0);
    push(vs[1][0],vs[1][1],vs[1][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,1,0);
    push(vs[2][0],vs[2][1],vs[2][2],n0[0],n0[1],n0[2],isO,rgb[0],rgb[1],rgb[2],tiv,fI,0,0,1);
    t2f[t++]=fI;
  });
  return{pos,nrm,occ,tc,ti,fi,bary,t2f};
}

const sortSlots=s=>[...(s||[])].filter(Boolean).sort((a,b)=>{const d=TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier);return d||((b.occ?1:0)-(a.occ?1:0));});
const sortPole=f=>[...f].sort((a,b)=>b.centroid[1]-a.centroid[1]);

// ── Événements cosmiques — catalogue procédural ──────────────────────────────
// Générés une seule fois, ultra-lointains (r=900..2200)
function generateCosmicEvents(seed=42){
  const rng=((s)=>{let x=s;return()=>{x=(x*1664525+1013904223)>>>0;return(x>>>0)/0xFFFFFFFF;}})(seed);
  const ev=[];

  // 8 nébuleuses à émission
  const nebCols=['#FF4060','#4060FF','#FF8820','#40FFAA','#AA40FF','#FF4088','#20AAFF','#FFAA40'];
  for(let i=0;i<8;i++){
    const phi=rng()*Math.PI*2,theta=Math.acos(2*rng()-1);
    const r=1100+rng()*900;
    ev.push({type:'nebula',x:r*Math.sin(theta)*Math.cos(phi),y:r*Math.cos(theta),z:r*Math.sin(theta)*Math.sin(phi),col:nebCols[i],size:r*(0.06+rng()*0.10),seed:rng()*100,speed:.008+rng()*.006});
  }

  // 5 supernovas
  const snCols=['#FFF0C8','#C8E8FF','#FFD0A0','#D0C8FF','#FFC8D0'];
  for(let i=0;i<5;i++){
    const phi=rng()*Math.PI*2,theta=Math.acos(2*rng()-1);
    const r=1400+rng()*700;
    ev.push({type:'supernova',x:r*Math.sin(theta)*Math.cos(phi),y:r*Math.cos(theta),z:r*Math.sin(theta)*Math.sin(phi),col:snCols[i],size:r*(0.018+rng()*0.025),phase:rng()*Math.PI*2});
  }

  // 4 nuages de gaz (très diffus, grands)
  const gasCols=['#2040A0','#A02060','#408020','#604080'];
  for(let i=0;i<4;i++){
    const phi=rng()*Math.PI*2,theta=Math.acos(2*rng()-1);
    const r=800+rng()*600;
    ev.push({type:'gas',x:r*Math.sin(theta)*Math.cos(phi),y:r*Math.cos(theta),z:r*Math.sin(theta)*Math.sin(phi),col:gasCols[i],size:r*(0.12+rng()*0.18),seed:rng()*200});
  }

  // 3 comètes (hyperboles traversantes, regénérées périodiquement)
  for(let i=0;i<3;i++){
    ev.push({type:'comet',phase:rng()*Math.PI*2,inc:rng()*Math.PI,speed:.0002+rng()*.00015,r:900+rng()*800,tailLen:180+rng()*220,col:'#C8E8FF',id:i});
  }

  return ev;
}

// ── Scene3D — GPU optimisée ──────────────────────────────────────────────────
class Scene3D{
  constructor(canvas){
    Object.assign(this,{
      canvas,T:null,G:null,renderer:null,scene:null,camera:null,
      composer:null,_bloomPass:null,_caPass:null,_ssaoPass:null,
      systemGroup:null,panelMesh:null,epicMesh:null,epicSlot:null,epicHalos:[],
      eliteRings:[],prestigeMoons:[],godRays:null,decoRings:[],viralSwarm:null,
      // Starfield AAA
      starfieldPoints:null,cosmicObjects:[],cometMeshes:[],
      raycaster:null,triToFace:null,faceSlots:[],_faces:null,
      rot:{x:.08,y:0},vel:{x:0,y:0},isDragging:false,pinchDist:null,
      zoomTarget:185,zoomCurrent:185,hovFace:-1,selFace:-1,
      animId:null,onHover:null,onClick:null,_h:{},
      _t0:Date.now(),_pU:null,_epU:null,_grU:null,_vU:null,
      _insideBlend:0,tierFocus:-1,_tierColors:null,
      _paused:false,
      // GPU optim state
      _lastRenderW:0,_lastRenderH:0,_dprScale:1.0,
      _targetDPR:1.0,_isBackground:false,_frameThrottle:0,
      _cosmicEvents:generateCosmicEvents(137),
      // LOD ring cache
      _ringGeoCache:{},
      // ── P2 FIX: Material cache — reuse instead of recreate ──
      _panelMat:null,     // ShaderMaterial panel (recycled across _buildMesh calls)
      _viralMat:null,     // ShaderMaterial viral swarm
      _godRayMat:null,    // ShaderMaterial god rays
      _epicMat:null,      // ShaderMaterial epicenter crystal
    });
  }

  async init(THREE,GSAP){
    this.T=THREE;this.G=GSAP;
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;

    const r=new THREE.WebGLRenderer({
      canvas:this.canvas,antialias:true,
      powerPreference:'high-performance',
      stencil:false,depth:true,logarithmicDepthBuffer:true,
    });
    // ★ Resolution scaling — DPR max 2.0 (pas 4), adaptatif en mouvement
    r.setPixelRatio(Math.min(window.devicePixelRatio||1,2.0));
    r.setSize(W,H,false);
    r.setClearColor(0x03040B,1);
    r.toneMapping=THREE.ACESFilmicToneMapping;
    r.toneMappingExposure=1.6;
    r.outputColorSpace=THREE.SRGBColorSpace;
    r.shadowMap.enabled=true;
    r.shadowMap.type=THREE.PCFShadowMap;
    r.shadowMap.autoUpdate=false; // ★ Manuel — update seulement si besoin
    this.renderer=r;

    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.FogExp2(0x03040B,.00028);
    this.camera=new THREE.PerspectiveCamera(40,W/H,.1,3000);
    this.camera.position.z=this.zoomCurrent;
    this.raycaster=new THREE.Raycaster();
    this.systemGroup=new THREE.Group();
    this.scene.add(this.systemGroup);

    // Lumières
    this._ambientLight=new THREE.AmbientLight(0x04060E,0.8);
    this.scene.add(this._ambientLight);
    this._sl=new THREE.PointLight(0xFFF0D0,1200,280,2.0);
    this._sl.castShadow=true;
    this._sl.shadow.mapSize.width=2048; // ★ 2048 au lieu de 4096 — 4× moins de VRAM
    this._sl.shadow.mapSize.height=2048;
    this._sl.shadow.camera.near=0.5;this._sl.shadow.camera.far=350;this._sl.shadow.bias=-0.0001;
    this.scene.add(this._sl);
    this._cl=new THREE.PointLight(0xFF6600,45,80,2.2);this.scene.add(this._cl);
    const dl=new THREE.DirectionalLight(0x060D28,.8);dl.position.set(-90,-35,-80);this.scene.add(dl);
    const dl2=new THREE.DirectionalLight(0x040820,.5);dl2.position.set(80,25,60);this.scene.add(dl2);

    this._tierColors={...TIER_NEON};

    this._buildStarfieldAAA();    // ★ Nouveau starfield AAA sans pixels
    this._buildCosmicEvents();    // ★ Événements cosmiques
    this._buildEpicenter();
    this._buildEliteRings();
    this._buildPrestigeMoons();
    this._buildGodRays();
    this._buildDecoRings();
    this._buildViralSwarm();

    await this._buildComposer(THREE,W,H);
    this._bindEvents();
    this._bindVisibilityChange();
    this._animate();
  }

  async _buildComposer(THREE,W,H){
    const[{EffectComposer},{RenderPass},{UnrealBloomPass},{ShaderPass},{SMAAPass}]=await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/ShaderPass.js'),
      import('three/examples/jsm/postprocessing/SMAAPass.js'),
    ]);
    const composer=new EffectComposer(this.renderer);
    composer.setSize(W,H);
    composer.addPass(new RenderPass(this.scene,this.camera));
    const bloom=new UnrealBloomPass(new THREE.Vector2(W,H),.55,.38,.82);
    composer.addPass(bloom);this._bloomPass=bloom;
    composer.addPass(new SMAAPass(W,H));
    const ssao=new ShaderPass(SSAO_SHADER);composer.addPass(ssao);this._ssaoPass=ssao;
    const ca=new ShaderPass(CA_GRAIN_SHADER);ca.renderToScreen=true;composer.addPass(ca);this._caPass=ca;
    this.composer=composer;
  }

  // ── Starfield AAA — fond noir pur, scintillement GPU, 0 pixel carré ────────
  _buildStarfieldAAA(){
    const T=this.T;
    const N=22000;
    const pos=new Float32Array(N*3);
    const col=new Float32Array(N*3);
    const twinkle=new Float32Array(N);   // fréquence scintillement par étoile
    const sizes=new Float32Array(N);     // taille intrinsèque

    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
      // ★ Distance distribuée — plus d'étoiles lointaines pour fond dense
      const r=450+Math.pow(Math.random(),0.6)*2000;
      pos[i*3]=r*Math.sin(ph)*Math.cos(th);
      pos[i*3+1]=r*Math.sin(ph)*Math.sin(th);
      pos[i*3+2]=r*Math.cos(ph);

      // Spectre stellaire O/B/A/F/G/K/M pondéré IMF
      const q=Math.random();
      let rc,gc,bc,sz;
      if(q<.004){rc=.5;gc=.6;bc=1.0;sz=3.8+Math.random();}        // O — très rare, bleu intense
      else if(q<.02){rc=.6;gc=.72;bc=1.0;sz=3.0+Math.random()*.8;}// B
      else if(q<.09){rc=.88;gc=.92;bc=1.0;sz=2.2+Math.random()*.6;}// A — Sirius-like
      else if(q<.25){rc=1.0;gc=.97;bc=.88;sz=1.8+Math.random()*.5;}// F
      else if(q<.52){rc=1.0;gc=.92;bc=.72;sz=1.5+Math.random()*.4;}// G — soleil
      else if(q<.78){rc=1.0;gc=.75;bc=.35;sz=1.3+Math.random()*.3;}// K orange
      else{rc=.80;gc=.32;bc=.10;sz=1.0+Math.random()*.25;}          // M — rouge

      // Magnitude — variation réaliste
      const mag=Math.pow(Math.random(),2.2);
      col[i*3]=rc*(.12+mag*.88);col[i*3+1]=gc*(.12+mag*.88);col[i*3+2]=bc*(.12+mag*.88);
      sizes[i]=sz*(0.3+mag*.7);
      twinkle[i]=0.4+Math.random()*3.2; // fréquence scintillement — GPU
    }

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));
    geo.setAttribute('aColor',new T.BufferAttribute(col,3));
    geo.setAttribute('aTwinkle',new T.BufferAttribute(twinkle,1));
    geo.setAttribute('aSize',new T.BufferAttribute(sizes,1));

    this.starfieldPoints=new T.Points(geo,new T.ShaderMaterial({
      vertexShader:STAR_VERT,fragmentShader:STAR_FRAG,
      uniforms:{uTime:{value:0}},
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    }));
    this.scene.add(this.starfieldPoints);
  }

  // ── Événements cosmiques ─────────────────────────────────────────────────
  _buildCosmicEvents(){
    const T=this.T;
    const evs=this._cosmicEvents;
    this.cosmicObjects=[];
    this.cometMeshes=[];

    const pl2=new T.PlaneGeometry(2,2);

    for(const ev of evs){
      if(ev.type==='nebula'){
        const[cr,cg,cb]=hex3(ev.col);
        const u={uTime:{value:0},uSeed:{value:ev.seed},uCol:{value:new T.Vector3(cr,cg,cb)},uScale:{value:1}};
        const m=new T.Mesh(pl2,new T.ShaderMaterial({
          vertexShader:NEBULA_VERT,fragmentShader:NEBULA_FRAG,uniforms:u,
          transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide
        }));
        m.position.set(ev.x,ev.y,ev.z);
        u.uScale.value=ev.size;
        this.scene.add(m);
        this.cosmicObjects.push({m,u,ev});
      }
      else if(ev.type==='supernova'){
        const[cr,cg,cb]=hex3(ev.col);
        const u={uTime:{value:0},uPhase:{value:ev.phase},uCol:{value:new T.Vector3(cr,cg,cb)},uScale:{value:1}};
        const m=new T.Mesh(pl2,new T.ShaderMaterial({
          vertexShader:NEBULA_VERT,fragmentShader:SUPERNOVA_FRAG,uniforms:u,
          transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide
        }));
        m.position.set(ev.x,ev.y,ev.z);
        u.uScale.value=ev.size;
        this.scene.add(m);
        this.cosmicObjects.push({m,u,ev});
      }
      else if(ev.type==='gas'){
        const[cr,cg,cb]=hex3(ev.col);
        const u={uTime:{value:0},uSeed:{value:ev.seed},uCol:{value:new T.Vector3(cr,cg,cb)},uScale:{value:1}};
        const m=new T.Mesh(pl2,new T.ShaderMaterial({
          vertexShader:NEBULA_VERT,fragmentShader:GAS_FRAG,uniforms:u,
          transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide
        }));
        m.position.set(ev.x,ev.y,ev.z);
        u.uScale.value=ev.size;
        this.scene.add(m);
        this.cosmicObjects.push({m,u,ev});
      }
      else if(ev.type==='comet'){
        // ★ Comète — trail de 80 points instanciés
        const N=80;
        const tPos=new Float32Array(N);
        const pts=new Float32Array(N*3);
        // Positions initiales — mises à jour en CPU chaque frame (légère)
        for(let i=0;i<N;i++){tPos[i]=i/(N-1);}
        const geo=new T.BufferGeometry();
        geo.setAttribute('position',new T.BufferAttribute(pts,3).setUsage(T.DynamicDrawUsage));
        geo.setAttribute('aTPos',new T.BufferAttribute(tPos,1));
        const[cr,cg,cb]=hex3(ev.col);
        const u={uCol:{value:new T.Vector3(cr,cg,cb)}};
        const m=new T.Points(geo,new T.ShaderMaterial({
          vertexShader:COMET_VERT,fragmentShader:COMET_FRAG,uniforms:u,
          transparent:true,depthWrite:false,blending:T.AdditiveBlending
        }));
        this.scene.add(m);
        this.cometMeshes.push({m,geo,ev,pts});
      }
    }
  }

  _buildEpicenter(){
    const T=this.T;
    const u={uTime:{value:0},uInsideBlend:{value:0},uSelected:{value:0},uEpicFocus:{value:0}};this._epU=u;
    this.epicMesh=new T.Mesh(new T.IcosahedronGeometry(EPIC_R,0),new T.ShaderMaterial({vertexShader:EPIC_VERT,fragmentShader:EPIC_FRAG,uniforms:u,side:T.FrontSide}));
    this.epicMesh.renderOrder=2;this.scene.add(this.epicMesh);
    this.epicHalos=[];
    for(const[sz,ri,gi,bi,str,spd]of[
      [EPIC_R*35,1.00,.72,.18,.018,.30],[EPIC_R*12,1.00,.84,.38,.055,.50],
      [EPIC_R*5,1.00,.92,.60,.140,.90],[EPIC_R*2.2,1.00,.96,.78,.320,1.50],[EPIC_R*1.4,1.00,.98,.92,.580,2.20],
    ]){
      const uH={uTime:{value:0},uInsideBlend:{value:0},uScale:{value:1}};
      const f=`precision highp float;uniform float uTime,uInsideBlend;varying vec2 vU;void main(){vec2 c=vU*2.-1.;float d=length(c);if(d>1.)discard;float halo=pow(1.-d,2.5)*(1.-pow(d,.5)*.5);float pulse=.85+.15*sin(uTime*${spd.toFixed(2)});float inside=mix(1.,.04,uInsideBlend);gl_FragColor=vec4(${ri.toFixed(2)},${gi.toFixed(2)},${bi.toFixed(2)},halo*${str.toFixed(3)}*pulse*inside);}`;
      const m=new T.Mesh(new T.PlaneGeometry(sz*2,sz*2),new T.ShaderMaterial({vertexShader:BILL_VERT,fragmentShader:f,uniforms:uH,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));
      this.scene.add(m);this.epicHalos.push({m,u:uH});
    }
  }

  // ── Elite rings avec LOD géométrie ─────────────────────────────────────────
  _getRingGeo(mR,tR,lodLevel){
    const key=`${mR.toFixed(1)}_${tR.toFixed(2)}_${lodLevel}`;
    if(this._ringGeoCache[key])return this._ringGeoCache[key];
    const T=this.T;
    // LOD : 0=high(512/128), 1=med(192/64), 2=low(48/16)
    const [ts,rs]=[[512,128],[192,64],[48,16]][lodLevel]||[192,64];
    const geo=new T.TorusGeometry(mR,tR,rs,ts);
    this._ringGeoCache[key]=geo;
    return geo;
  }

  // ── Géométrie billboard : ruban rectangulaire autour d'un cercle ─────────────
  // Crée un cylindre aplati (section rect) — bien plus haut que TorusGeometry
  _buildRingRibbonGeo(mR, halfH, thick, segments){
    const T=this.T;
    // 4 faces : extérieure, intérieure, haut, bas
    // On construit un tube rectangulaire replié en anneau
    const verts=[],normals=[],uvs=[],indices=[];
    const N=segments;
    // Faces externe et interne
    const addFaceRing=(r,normalDir,uOffset)=>{
      const startV=verts.length/3;
      for(let i=0;i<=N;i++){
        const a=i/N*Math.PI*2;
        const cx=Math.cos(a)*r, cz=Math.sin(a)*r;
        // Bas
        verts.push(cx,- halfH,cz);
        normals.push(Math.cos(a)*normalDir,0,Math.sin(a)*normalDir);
        uvs.push(i/N+uOffset,0);
        // Haut
        verts.push(cx,+halfH,cz);
        normals.push(Math.cos(a)*normalDir,0,Math.sin(a)*normalDir);
        uvs.push(i/N+uOffset,1);
      }
      for(let i=0;i<N;i++){
        const b=startV+i*2;
        indices.push(b,b+1,b+2, b+1,b+3,b+2);
      }
    };
    // Face cap haut et bas
    const addCapRing=(y,normalY)=>{
      const startV=verts.length/3;
      for(let i=0;i<=N;i++){
        const a=i/N*Math.PI*2;
        const cx=Math.cos(a), cz=Math.sin(a);
        // Intérieur
        verts.push(cx*(mR-thick),y,cz*(mR-thick));
        normals.push(0,normalY,0);
        uvs.push(i/N,0);
        // Extérieur
        verts.push(cx*(mR+thick),y,cz*(mR+thick));
        normals.push(0,normalY,0);
        uvs.push(i/N,1);
      }
      for(let i=0;i<N;i++){
        const b=startV+i*2;
        if(normalY>0) indices.push(b,b+2,b+1, b+1,b+2,b+3);
        else           indices.push(b,b+1,b+2, b+1,b+3,b+2);
      }
    };
    addFaceRing(mR+thick, 1, 0);  // face externe
    addFaceRing(mR-thick,-1, 0);  // face interne
    addCapRing(+halfH,+1);         // cap haut
    addCapRing(-halfH,-1);         // cap bas

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(verts),3));
    geo.setAttribute('normal',new T.BufferAttribute(new Float32Array(normals),3));
    geo.setAttribute('uv',new T.BufferAttribute(new Float32Array(uvs),2));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    return geo;
  }

  _buildEliteRings(){
    const T=this.T;this.eliteRings=[];let slotOffset=0;
    ELITE_RING_CFG.forEach((cfg,ringIdx)=>{
      const[cr,cg,cb]=hex3(cfg.col);
      const u={
        uTime:{value:0},
        uCol:{value:new T.Vector3(cr,cg,cb)},
        uBrandBg:{value:new T.Vector3(.008,.010,.020)},
        uSlots:{value:cfg.slots},
        uOccCount:{value:0},
        uHov:{value:0},
        uDim:{value:0},
        uRingIdx:{value:ringIdx},
        uScrollSpeed:{value:1.2+ringIdx*.15},
        uHasTex:{value:0},
        uBrandTex:{value:null},
        // ── Per-slot textures (max 9 slots) ──
        uBrandTex1:{value:null},uBrandTex2:{value:null},uBrandTex3:{value:null},
        uBrandTex4:{value:null},uBrandTex5:{value:null},uBrandTex6:{value:null},
        uBrandTex7:{value:null},uBrandTex8:{value:null},
        uHasTex1:{value:0},uHasTex2:{value:0},uHasTex3:{value:0},
        uHasTex4:{value:0},uHasTex5:{value:0},uHasTex6:{value:0},
        uHasTex7:{value:0},uHasTex8:{value:0},
        uTexOffset1:{value:0},uTexOffset2:{value:0},uTexOffset3:{value:0},
        uTexOffset4:{value:0},uTexOffset5:{value:0},uTexOffset6:{value:0},
        uTexOffset7:{value:0},uTexOffset8:{value:0},
        uTexOffset:{value:0},
      };

      // ── Géométrie ruban LOD (segments) ──
      const segsLOD=[256,128,48];
      const buildGeo=lod=>this._buildRingRibbonGeo(cfg.mR,cfg.tR,cfg.thick||cfg.mR*.015,segsLOD[lod]);
      const geo=buildGeo(1); // démarrer en LOD medium

      // Dummy 1×1 texture so WebGL never receives a null sampler
      const dummyTex=(()=>{
        const c=document.createElement('canvas');c.width=1;c.height=1;
        const ctx2d=c.getContext('2d');ctx2d.fillStyle='#000000';ctx2d.fillRect(0,0,1,1);
        const t2=new T.CanvasTexture(c);t2.needsUpdate=true;return t2;
      })();
      u.uBrandTex.value=dummyTex;
      u.uBrandTex1.value=dummyTex;u.uBrandTex2.value=dummyTex;u.uBrandTex3.value=dummyTex;
      u.uBrandTex4.value=dummyTex;u.uBrandTex5.value=dummyTex;u.uBrandTex6.value=dummyTex;
      u.uBrandTex7.value=dummyTex;u.uBrandTex8.value=dummyTex;

      const mat=new T.ShaderMaterial({
        vertexShader:RING_VERT,fragmentShader:RING_FRAG,uniforms:u,
        transparent:true,depthWrite:false,
        blending:T.AdditiveBlending,side:T.DoubleSide
      });
      const mesh=new T.Mesh(geo,mat);
      mesh.rotation.x=cfg.rX;mesh.rotation.z=cfg.rZ;mesh.renderOrder=3;
      this.systemGroup.add(mesh);

      // ── Solid backing — structure acier physique (opaque, ombre) ──
      const solidGeo=this._buildRingRibbonGeo(cfg.mR,cfg.tR*.96,cfg.thick*.6||cfg.mR*.01,64);
      const[sr,sg,sb]=hex3(cfg.col);
      const solidMesh=new T.Mesh(solidGeo,new T.MeshPhysicalMaterial({
        color:new T.Color(.008+sr*.04,.010+sg*.04,.018+sb*.04),
        metalness:0.95,roughness:0.18,
        transparent:true,opacity:0.55,
        envMapIntensity:1.0,
      }));
      solidMesh.rotation.x=cfg.rX;solidMesh.rotation.z=cfg.rZ;
      solidMesh.receiveShadow=true;solidMesh.castShadow=true;
      this.systemGroup.add(solidMesh);

      // ── Ligne orbitale décorative (trace de l'anneau) ──
      const pts=[];const N=256;
      for(let i=0;i<N;i++){
        const a=i/N*Math.PI*2,x=Math.cos(a)*cfg.mR,z=Math.sin(a)*cfg.mR;
        const ctx=Math.cos(cfg.rX),stx=Math.sin(cfg.rX),ctz=Math.cos(cfg.rZ),stz=Math.sin(cfg.rZ);
        const y2=-z*stx,z2=z*ctx;
        pts.push(new T.Vector3(x*ctz+z2*stz,y2,-x*stz+z2*ctz));
      }
      const trailLine=new T.LineLoop(
        new T.BufferGeometry().setFromPoints(pts),
        new T.LineBasicMaterial({color:new T.Color(cfg.col),transparent:true,opacity:.06,depthWrite:false})
      );
      this.systemGroup.add(trailLine);

      this.eliteRings.push({mesh,solidMesh,u,cfg,slotOffset,trailLine,_currentLOD:1,_segsLOD:segsLOD,_brandTex:null,_dummyTex:dummyTex});
      slotOffset+=cfg.slots;
    });
  }

  // ── LOD update rings ───────────────────────────────────────────────────────
  _updateRingLOD(){
    const camDist=this.camera.position.length();
    this.eliteRings.forEach(ring=>{
      const d=ring.cfg.mR;const relDist=camDist/d;
      const lod=relDist<0.8?0:(relDist<2.2?1:2);
      if(lod!==ring._currentLOD){
        const segs=ring._segsLOD?.[lod]||[256,128,48][lod]||128;
        const newGeo=this._buildRingRibbonGeo(ring.cfg.mR,ring.cfg.tR,ring.cfg.thick||ring.cfg.mR*.015,segs);
        ring.mesh.geometry.dispose();
        ring.mesh.geometry=newGeo;
        ring._currentLOD=lod;
      }
    });
  }

  _buildPrestigeMoons(){
    // ── BRIDGES — poutres rectilignes sphère ↔ anneau ──
    // Chaque pont = une poutre droite entre la surface de la sphère
    // et le bord interne de l'anneau, avec joints aux 2 extrémités.
    // 1 panneau publicitaire monté perpendiculairement au milieu.
    const T=this.T;this.prestigeMoons=[];
    const[pr,pg,pb]=hex3(TIER_NEON.prestige);

    const ringMR   = SPHERE_R*3.60;
    const ringTh   = SPHERE_R*0.18;
    const ringRX   = 0.22;                   // doit matcher ELITE_RING_CFG
    const rStart   = SPHERE_R;              // surface de la sphère
    const rEnd     = ringMR - ringTh;       // bord interne de l'anneau

    // matériau acier poutre — commun à tous les ponts
    const beamMat=new T.MeshPhysicalMaterial({
      color:new T.Color(.07,.082,.115),
      metalness:0.96,roughness:0.20,
      transparent:false,
    });
    const jointMat=new T.MeshPhysicalMaterial({
      color:new T.Color(.12,.14,.20),
      metalness:0.95,roughness:0.15,
      transparent:false,
    });
    // fil néon contour
    const wireMat=new T.LineBasicMaterial({color:new T.Color(0,.75,.55),transparent:true,opacity:.35,depthWrite:false});

    for(let idx=0;idx<N_BRIDGES;idx++){
      const angle=idx/N_BRIDGES*Math.PI*2;

      // Direction radiale dans le plan incliné de l'anneau (rotation rX autour de X)
      const dx= Math.cos(angle);
      const dy=-Math.sin(angle)*Math.sin(ringRX);
      const dz= Math.sin(angle)*Math.cos(ringRX);
      // Déjà normalisé (cos²+sin²=1)

      // Points d'ancrage
      const sx=dx*rStart, sy=dy*rStart, sz=dz*rStart;  // sphère
      const ex=dx*rEnd,   ey=dy*rEnd,   ez=dz*rEnd;    // anneau interne
      const bridgeLen=rEnd-rStart;
      const mx=(sx+ex)/2, my=(sy+ey)/2, mz=(sz+ez)/2;  // milieu

      // Quaternion : aligner l'axe Y du mesh (0,1,0) sur la direction (dx,dy,dz)
      const yAxis=new T.Vector3(0,1,0);
      const dir=new T.Vector3(dx,dy,dz).normalize();
      const quat=new T.Quaternion().setFromUnitVectors(yAxis,dir);

      // ── Poutre principale (section carrée) ──
      const bW=BRIDGE_W, bH=BRIDGE_H;
      const beamGeo=new T.BoxGeometry(bW,bridgeLen,bH);
      const beam=new T.Mesh(beamGeo,beamMat);
      beam.position.set(mx,my,mz);
      beam.setRotationFromQuaternion(quat);
      beam.castShadow=true;
      this.systemGroup.add(beam);

      // ── Joint d'ancrage côté sphère ──
      const j1=new T.Mesh(new T.BoxGeometry(bW*1.9,bW*1.9,bW*1.9),jointMat);
      j1.position.set(sx,sy,sz);
      this.systemGroup.add(j1);

      // ── Joint d'ancrage côté anneau ──
      const j2=new T.Mesh(new T.BoxGeometry(bW*1.9,bW*1.9,bW*1.9),jointMat);
      j2.position.set(ex,ey,ez);
      this.systemGroup.add(j2);

      // ── Fil néon de contour ──
      const hw=bW*0.5, hl=bridgeLen*0.5;
      const wirePts=[
        new T.Vector3(-hw,-hl,-hw),new T.Vector3( hw,-hl,-hw),
        new T.Vector3( hw,-hl, hw),new T.Vector3(-hw,-hl, hw),
        new T.Vector3(-hw,-hl,-hw), // bas
        new T.Vector3(-hw, hl,-hw),new T.Vector3( hw, hl,-hw),
        new T.Vector3( hw, hl, hw),new T.Vector3(-hw, hl, hw),
        new T.Vector3(-hw, hl,-hw), // haut
      ];
      const wireGeo=new T.BufferGeometry().setFromPoints(wirePts);
      const wire=new T.Line(wireGeo,wireMat);
      wire.position.set(mx,my,mz);
      wire.setRotationFromQuaternion(quat);
      this.systemGroup.add(wire);

      // ── Panneau slot ──
      // Normal du panneau = tangent perpendiculaire à la direction radiale
      // tangent = cross(dir, ring_normal)  →  ring_normal = (0, cos(rX), -sin(rX))
      const rn=new T.Vector3(0,Math.cos(ringRX),-Math.sin(ringRX));
      const tangent=new T.Vector3().crossVectors(dir,rn).normalize();

      const dummyTex=(()=>{
        const c=document.createElement('canvas');c.width=1;c.height=1;
        const ctx2=c.getContext('2d');ctx2.fillStyle='#000';ctx2.fillRect(0,0,1,1);
        return new T.CanvasTexture(c);
      })();
      const uP={
        uTime:{value:0},uOcc:{value:0},uHov:{value:0},uDim:{value:0},
        uBrandCol:{value:new T.Vector3(pr,pg,pb)},
        uBrandTex:{value:dummyTex},uHasTex:{value:0},uTexOffset:{value:0},
      };
      const panelMesh=new T.Mesh(
        new T.PlaneGeometry(BRIDGE_PANEL_W,BRIDGE_PANEL_H),
        new T.ShaderMaterial({
          vertexShader:BRIDGE_PANEL_VERT,fragmentShader:BRIDGE_PANEL_FRAG,
          uniforms:uP,transparent:true,depthWrite:false,
          blending:T.AdditiveBlending,side:T.DoubleSide
        })
      );
      // Positionner le panneau au milieu du pont,
      // décalé latéralement (tangent) pour être visible
      const panelOffset=bW*0.5+BRIDGE_PANEL_H*0.5+SPHERE_R*0.015;
      panelMesh.position.set(
        mx+tangent.x*panelOffset,
        my+tangent.y*panelOffset,
        mz+tangent.z*panelOffset
      );
      // Orienter le panneau : normal = tangent, up = dir radiale
      const panelQuat=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),tangent);
      panelMesh.setRotationFromQuaternion(panelQuat);
      panelMesh.renderOrder=4;
      this.systemGroup.add(panelMesh);

      this.prestigeMoons.push({
        moonMesh:panelMesh,beam,wire,j1,j2,
        haloMesh:panelMesh,u:uP,
        cfg:{angle,dx,dy,dz,mx,my,mz},
        slot:null,_dummyTex:dummyTex
      });
    }
  }

  _buildGodRays(){
    const T=this.T;
    const N=128; // ★ 400→128, même qualité visuelle car bloom compense
    const verts=[],alphas=[];
    for(let i=0;i<N;i++){
      const phi=Math.random()*Math.PI*2,theta=Math.acos(2*Math.random()-1);
      const dx=Math.sin(theta)*Math.cos(phi),dy=Math.cos(theta),dz=Math.sin(theta)*Math.sin(phi);
      let ux=0,uy=1,uz=0;if(Math.abs(dy)>.9){ux=1;uy=0;uz=0;}
      const px=uy*dz-uz*dy,py=uz*dx-ux*dz,pz=ux*dy-uy*dx;
      const pl=Math.sqrt(px*px+py*py+pz*pz)||1;
      const pxn=px/pl,pyn=py/pl,pzn=pz/pl;
      const w=.04+Math.random()*.18;const alpha=.08+Math.random()*.32;
      const nR=EPIC_R*2.5,fR=SPHERE_R*(1.0+Math.random()*.04),wF=w*.06;
      const p0=[dx*nR-pxn*w,dy*nR-pyn*w,dz*nR-pzn*w];
      const p1=[dx*nR+pxn*w,dy*nR+pyn*w,dz*nR+pzn*w];
      const p2=[dx*fR+pxn*wF,dy*fR+pyn*wF,dz*fR+pzn*wF];
      const p3=[dx*fR-pxn*wF,dy*fR-pyn*wF,dz*fR-pzn*wF];
      verts.push(...p0,...p1,...p2,...p0,...p2,...p3);
      for(let j=0;j<6;j++)alphas.push(alpha);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(verts),3));
    geo.setAttribute('aAlpha',new T.BufferAttribute(new Float32Array(alphas),1));
    const u={uTime:{value:0},uInsideBlend:{value:0}};this._grU=u;
    // ── P2 FIX: cache god ray material ──
    this._godRayMat=new T.ShaderMaterial({vertexShader:GRAY_VERT,fragmentShader:GRAY_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
    this.godRays=new T.Mesh(geo,this._godRayMat);
    this.godRays.renderOrder=1;this.systemGroup.add(this.godRays);
  }

  _buildDecoRings(){
    const T=this.T;this.decoRings=[];
    const cfgs=[{r:SPHERE_R*1.04,col:'#C8922A',alpha:.55,tX:.14,tY:0.},{r:SPHERE_R*1.06,col:'#4A6888',alpha:.38,tX:.62,tY:1.1},{r:SPHERE_R*1.08,col:'#3A6A55',alpha:.22,tX:1.15,tY:.55}];
    cfgs.forEach(({r,col,alpha,tX,tY})=>{
      const N=256;const p=new Float32Array(N*3); // ★ 512→256
      for(let i=0;i<N;i++){const a=i/N*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;const stx=Math.sin(tX),ctx=Math.cos(tX),sty=Math.sin(tY),cty=Math.cos(tY);const y2=-z*stx,z2=z*ctx;p[i*3]=x*cty+z2*sty;p[i*3+1]=y2;p[i*3+2]=-x*sty+z2*cty;}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(p,3));
      const[cr,cg,cb]=hex3(col);const u={uTime:{value:0},uCol:{value:new T.Vector3(cr,cg,cb)},uAlpha:{value:alpha}};
      const m=new T.LineLoop(geo,new T.ShaderMaterial({vertexShader:DECO_RING_VERT,fragmentShader:DECO_RING_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
      this.decoRings.push({m,u});this.systemGroup.add(m);
    });
  }

  _buildViralSwarm(){
    const T=this.T;const N=671;
    const phase=new Float32Array(N),speed=new Float32Array(N),axis=new Float32Array(N),radius=new Float32Array(N);
    for(let i=0;i<N;i++){phase[i]=Math.random()*Math.PI*2;speed[i]=.10+Math.random()*.38;axis[i]=Math.random()*Math.PI*2;radius[i]=SPHERE_R*(1.04+Math.random()*.10);}
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(N*3),3));
    geo.setAttribute('aPhase',new T.BufferAttribute(phase,1));geo.setAttribute('aSpeed',new T.BufferAttribute(speed,1));
    geo.setAttribute('aAxis',new T.BufferAttribute(axis,1));geo.setAttribute('aRadius',new T.BufferAttribute(radius,1));
    const u={uTime:{value:0},uDim:{value:0}};this._vU=u;
    // ── P2 FIX: cache viral material ──
    this._viralMat=new T.ShaderMaterial({vertexShader:VIRAL_VERT,fragmentShader:VIRAL_FRAG,uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    this.viralSwarm=new T.Points(geo,this._viralMat);
    this.scene.add(this.viralSwarm);
  }

  _buildMesh(faces){
    const T=this.T;
    // ── P2 FIX: dispose only geometry, RECYCLE material ──
    if(this.panelMesh){
      this.systemGroup.remove(this.panelMesh);
      this.panelMesh.geometry.dispose(); // geometry changes each time → dispose OK
      // DO NOT dispose material — we reuse it below
      this.panelMesh=null;
    }
    if(!faces?.length)return;
    this.faceSlots=faces.map(f=>f.slot||null);this._faces=faces;
    const{pos,nrm,occ,tc,ti,fi,bary,t2f}=buildPanelBufs(faces,this._tierColors);
    this.triToFace=t2f;
    const tfi=this.tierFocus>=0?this.tierFocus:-1;

    // ── Reuse or create material once ──
    if(!this._panelMat){
      const uni={uTime:{value:0},uHovered:{value:-1},uSelected:{value:-1},uTierFocus:{value:tfi},uTierDim:{value:tfi>=0?1:0}};
      this._pU=uni;
      this._panelMat=new T.ShaderMaterial({
        vertexShader:PANEL_VERT,fragmentShader:PANEL_FRAG,uniforms:uni,
        side:T.DoubleSide,transparent:true,depthWrite:true
      });
    }else{
      // Just update uniforms on the existing material
      this._pU=this._panelMat.uniforms;
      this._pU.uTime.value=0;
      this._pU.uHovered.value=-1;
      this._pU.uSelected.value=-1;
      this._pU.uTierFocus.value=tfi;
      this._pU.uTierDim.value=tfi>=0?1:0;
    }

    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nrm,3));
    geo.setAttribute('aOccupied',new T.BufferAttribute(occ,1));geo.setAttribute('aTierColor',new T.BufferAttribute(tc,3));
    geo.setAttribute('aTierIdx',new T.BufferAttribute(ti,1));geo.setAttribute('aFaceIdx',new T.BufferAttribute(fi,1));
    geo.setAttribute('aBary',new T.BufferAttribute(bary,3));
    this.panelMesh=new T.Mesh(geo,this._panelMat);
    this.panelMesh.receiveShadow=true;this.panelMesh.renderOrder=0;this.systemGroup.add(this.panelMesh);
  }

  setTierFocus(tierIdx){
    this.tierFocus=tierIdx;
    if(this._pU){this._pU.uTierFocus.value=tierIdx;this._pU.uTierDim.value=tierIdx>=0?1:0;}
    const focusIsElite=tierIdx===2;this.eliteRings.forEach(({u})=>{u.uDim.value=(tierIdx>=0&&!focusIsElite)?1:0;});
    const focusIsPrestige=tierIdx===1;this.prestigeMoons.forEach(({u})=>{u.uDim.value=(tierIdx>=0&&!focusIsPrestige)?1:0;});
    const focusIsViral=tierIdx===5;if(this._vU)this._vU.uDim.value=(tierIdx>=0&&!focusIsViral)?1:0;

    const isEpic = tierIdx===0;

    // ── Bloom ─────────────────────────────────────────────────────────────────
    if(this._bloomPass){
      this._bloomPass.threshold = isEpic ? 0.12 : (tierIdx>=0 ? 0.55 : 0.82);
      this._bloomPass.strength  = isEpic ? 2.80 : (tierIdx>=0 ? 0.90 : 0.55);
    }

    // ── Exposition scène : très sombre en mode EPIC, normal sinon ──────────
    if(this.G){
      const targetExp = isEpic ? 0.22 : 1.6;
      this.G.to(this.renderer,{toneMappingExposure:targetExp,duration:isEpic?.65:.45,ease:'power2.inOut'});
    } else {
      this.renderer.toneMappingExposure = isEpic ? 0.22 : 1.6;
    }

    // ── Épicentre : uniforms glow + halos amplifiés ────────────────────────
    if(this._epU){
      if(this.G){
        this.G.to(this._epU.uEpicFocus,{value:isEpic?1:0,duration:isEpic?.70:.40,ease:'power2.inOut'});
      } else {
        this._epU.uEpicFocus.value = isEpic ? 1 : 0;
      }
    }
    // Halos : scale ×2.2 en mode EPIC pour un rayonnement dramatique
    this.epicHalos.forEach(({u})=>{
      if(this.G) this.G.to(u.uScale,{value:isEpic?2.2:1.0,duration:isEpic?.80:.40,ease:'power2.inOut'});
      else u.uScale.value = isEpic ? 2.2 : 1.0;
    });
  }

  setFilterPalette(paletteName){
    const T=this.T;
    const pal=FILTER_PALETTES[paletteName]||FILTER_PALETTES.realist;
    this._activePalette=paletteName;
    this._tierColors={...pal};

    // ── Exposition + bloom ────────────────────────────────────────────────────
    if(this.G){
      this.G.to(this.renderer,{toneMappingExposure:pal.exposure||1.6,duration:.55,ease:'power2.inOut'});
    } else {
      this.renderer.toneMappingExposure=pal.exposure||1.6;
    }
    if(this._bloomPass){
      this._bloomPass.threshold=pal.bloomThreshold||.82;
      if(this.G){
        this.G.to(this._bloomPass,{strength:pal.bloomStrength||.55,duration:.55,ease:'power2.inOut'});
      } else {
        this._bloomPass.strength=pal.bloomStrength||.55;
      }
    }

    // ── Fog — couleur + densité dramatiquement différentes ───────────────────
    if(this.scene.fog){
      if(this.G){
        const fc=new T.Color(pal.fogColor||0x03040B);
        this.G.to(this.scene.fog.color,{r:fc.r,g:fc.g,b:fc.b,duration:.6,ease:'power2.inOut'});
        this.G.to(this.scene.fog,{density:pal.fogDensity||.00028,duration:.6,ease:'power2.inOut'});
      } else {
        this.scene.fog.color.set(pal.fogColor||0x03040B);
        this.scene.fog.density=pal.fogDensity||.00028;
      }
    }

    // ── Lumière ambiante ──────────────────────────────────────────────────────
    if(this._ambientLight){
      const ac=new T.Color(pal.ambientCol||0x04060E);
      if(this.G){
        this.G.to(this._ambientLight.color,{r:ac.r,g:ac.g,b:ac.b,duration:.5,ease:'power2.inOut'});
        this.G.to(this._ambientLight,{intensity:pal.ambientInt||.8,duration:.5,ease:'power2.inOut'});
      } else {
        this._ambientLight.color.set(ac);
        this._ambientLight.intensity=pal.ambientInt||.8;
      }
    }

    // ── Lumière solaire ───────────────────────────────────────────────────────
    if(this._sl){
      const sc=new T.Color(pal.sunCol||0xFFF0D0);
      if(this.G){
        this.G.to(this._sl.color,{r:sc.r,g:sc.g,b:sc.b,duration:.55,ease:'power2.inOut'});
        this.G.to(this._sl,{intensity:pal.sunInt||1200,duration:.55,ease:'power2.inOut'});
      } else {
        this._sl.color.set(sc);this._sl.intensity=pal.sunInt||1200;
      }
    }

    // ── Lumière de contour ────────────────────────────────────────────────────
    if(this._cl){
      const rc=new T.Color(pal.rimCol||0xFF6600);
      if(this.G){
        this.G.to(this._cl.color,{r:rc.r,g:rc.g,b:rc.b,duration:.5,ease:'power2.inOut'});
        this.G.to(this._cl,{intensity:pal.rimInt||45,duration:.5,ease:'power2.inOut'});
      } else {
        this._cl.color.set(rc);this._cl.intensity=pal.rimInt||45;
      }
    }

    // ── Matériaux sphère + anneaux + lunes ───────────────────────────────────
    if(this._faces)this._buildMesh(this._faces);
    this.eliteRings.forEach(({u,cfg})=>{const[r,g,b]=hex3(pal.elite||cfg.col);u.uCol.value.set(r,g,b);});
    const[pr,pg,pb]=hex3(pal.prestige||TIER_NEON.prestige);
    this.prestigeMoons.forEach(({u})=>{u.uBrandCol.value.set(pr,pg,pb);});
  }

  _buildBrandTexture(slot){
    const T=this.T;
    const tn = slot.tenant || slot;
    const bg    = tn.b   || slot.background_color || '#020c1a';
    const fg    = tn.c   || slot.primary_color    || '#00C8E4';
    const name  = tn.name   || slot.display_name  || 'ANNEAU DYSON';
    const slogan= tn.slogan || slot.slogan         || '';
    const url   = tn.url || tn.cta || slot.cta_url|| '';

    // ── Canvas compact : UNE seule unité de texte, WebGL tile avec wrapS ──
    // 2048×128 → texte lisible ~56px, une répétition naturelle via texture.repeat
    const H = 128;
    const cvs = document.createElement('canvas');
    cvs.height = H;

    // Mesure d'abord la largeur du texte pour dimensionner le canvas
    const tmpCtx = document.createElement('canvas').getContext('2d');
    const fontSz = Math.floor(H * 0.52); // ~66px
    const subSz  = Math.floor(H * 0.28); // ~36px
    const fontFace = "'Courier New', monospace";

    const mainText = `  ◈  ${name}${slogan ? '  ·  '+slogan : ''}  `;
    const subText  = `  ◆  ${url || name}  `;

    tmpCtx.font = `700 ${fontSz}px ${fontFace}`;
    const mainW = tmpCtx.measureText(mainText).width;
    tmpCtx.font = `500 ${subSz}px ${fontFace}`;
    const subW  = tmpCtx.measureText(subText).width;

    // Canvas = largeur du texte principal (+ petite marge)
    const W = Math.max(512, Math.ceil(Math.max(mainW, subW)) + 40);
    cvs.width = W;

    const ctx = cvs.getContext('2d');
    if(!ctx){console.error('[RINGS] canvas ctx failed');return null;}
    console.log('[RINGS] Texture:', W+'×'+H, 'text:', mainText);

    // 1. Fond opaque
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 2. Filets de bordure
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, W, 3);
    ctx.fillRect(0, H-3, W, 3);
    ctx.globalAlpha = 1;

    // 3. Texte principal — glow néon en 2 passes
    const drawLine = (text, font, y, color) => {
      ctx.font = font;
      ctx.textBaseline = 'middle';
      // Halo
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.shadowColor = color; ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.fillText(text, 8, y);
      ctx.restore();
      // Texte net blanc
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = color; ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 8, y);
      ctx.restore();
    };

    drawLine(mainText, `700 ${fontSz}px ${fontFace}`, H * 0.37, fg);
    drawLine(subText,  `500 ${subSz}px ${fontFace}`,  H * 0.75, fg);

    // 4. Texture Three.js — wrapS=Repeat, repeat.x contrôle le nb de tuiles autour de l'anneau
    const tex = new T.CanvasTexture(cvs);
    tex.wrapS     = T.RepeatWrapping;
    tex.wrapT     = T.ClampToEdgeWrapping;
    tex.repeat.set(3, 1); // 3 répétitions autour de l'anneau
    tex.minFilter = T.LinearFilter;
    tex.magFilter = T.LinearFilter;
    tex.anisotropy = Math.min(16, this.renderer?.capabilities?.getMaxAnisotropy?.()||8);
    tex.needsUpdate = true;
    return tex;
  }

  assignTierSlots(eliteSlots,prestigeSlots){
    const T=this.T;
    let ei=0;
    const SLOT_KEYS=['1','2','3','4','5','6','7','8'];
    console.log('[RINGS] assignTierSlots called — eliteSlots total:', eliteSlots?.length, '| occupied:', eliteSlots?.filter(s=>s?.occ).length);
    this.eliteRings.forEach(ring=>{
      const rs=eliteSlots.slice(ei,ei+ring.cfg.slots);
      ring.slotData=rs;
      ring.u.uOccCount.value=rs.filter(s=>s?.occ).length;
      console.log(`[RINGS] Ring#${ei} → ${rs.length} slots, ${rs.filter(s=>s?.occ).length} occupied. Names:`, rs.filter(s=>s?.occ).map(s=>s?.tenant?.name||s?.display_name||'?'));
      // Update brand color from first occupied slot
      const firstOcc=rs.find(s=>s?.occ);
      ring.firstOccSlot=firstOcc||null;
      if(firstOcc){
        const pc=firstOcc.tenant?.c||firstOcc.primary_color||firstOcc.tenant?.primaryColor||ring.cfg.col;
        const[r,g,b]=hex3(pc);
        ring.u.uCol.value.set(r,g,b);
        const bc=firstOcc.tenant?.b||firstOcc.background_color||'#0d1828';
        const[br,bg2,bb]=hex3(bc);
        if(ring.u.uBrandBg)ring.u.uBrandBg.value.set(br,bg2,bb);
      }else{
        const[r,g,b]=hex3(ring.cfg.col);
        ring.u.uCol.value.set(r,g,b);
        if(ring.u.uBrandBg)ring.u.uBrandBg.value.set(.008,.010,.020);
      }
      // ── Build per-slot textures — chaque slot occupé a sa propre texture scrollante ──
      // Dispose old slot textures
      if(!ring._slotTextures)ring._slotTextures=[];
      ring._slotTextures.forEach(t=>{if(t&&t!==ring._dummyTex)t.dispose();});
      ring._slotTextures=[];
      ring._slotOffsets=[];
      SLOT_KEYS.forEach((k,i)=>{
        const slot=rs[i];
        const uT=ring.u[`uBrandTex${k}`];
        const uH=ring.u[`uHasTex${k}`];
        const uO=ring.u[`uTexOffset${k}`];
        if(uT&&uH&&uO){
          if(slot?.occ){
            const tex=this._buildBrandTexture(slot);
            ring._slotTextures[i]=tex;
            ring._slotOffsets[i]=0;
            uT.value=tex;
            uH.value=1;
            uO.value=0;
            console.log(`[RINGS] ✅ Slot ${k} → texture built for "${slot?.tenant?.name||'?'}", uHasTex${k}=1`);
          }else{
            ring._slotTextures[i]=null;
            ring._slotOffsets[i]=0;
            uT.value=ring._dummyTex;
            uH.value=0;
            uO.value=0;
          }
        }
      });
      // Legacy uHasTex/uBrandTex — garder cohérent
      ring.u.uHasTex.value=rs.some(s=>s?.occ)?1:0;
      ring.u.uBrandTex.value=ring._slotTextures[0]||ring._dummyTex;
      ei+=ring.cfg.slots;
    });
    this.prestigeMoons.forEach((bridge,idx)=>{
      bridge.slot=prestigeSlots[idx]||null;
      const s=bridge.slot;
      bridge.u.uOcc.value=s?.occ?1:0;
      // Texture de marque sur le panneau
      if(s?.occ&&s?.img){
        const img=new Image();img.crossOrigin='anonymous';img.src=s.img;
        img.onload=()=>{
          const tex=new this.T.Texture(img);tex.needsUpdate=true;
          bridge.u.uBrandTex.value=tex;bridge.u.uHasTex.value=1;
        };
      } else {
        bridge.u.uBrandTex.value=bridge._dummyTex;bridge.u.uHasTex.value=0;
      }
    });
  }

  // Retourne la position 2D (écran) du centre d'un anneau + slot data
  getRingScreenData(ringIdx){
    const ring=this.eliteRings[ringIdx];
    if(!ring||!this.camera)return null;
    const T=this.T;
    // Centre de l'anneau = origine du systemGroup dans le repère monde
    // On projette un point à la périphérie haute de l'anneau
    const mR=ring.cfg.mR;
    // Point "nord" sur l'anneau dans son repère local
    const localPt=new T.Vector3(mR,0,0);
    localPt.applyEuler(new T.Euler(ring.mesh.rotation.x,0,ring.mesh.rotation.z,'XYZ'));
    this.systemGroup.localToWorld(localPt);
    const proj=localPt.clone().project(this.camera);
    const W=this.canvas.clientWidth||window.innerWidth;
    const H=this.canvas.clientHeight||window.innerHeight;
    return{
      x:(proj.x*.5+.5)*W,
      y:(-.5*proj.y+.5)*H,
      visible:proj.z<1&&proj.z>-1,
      slot:ring.firstOccSlot||null,
      occ:ring.u.uOccCount.value>0,
    };
  }

  setFaces(faces,eliteSlots,prestigeSlots,animate=false){
    this.hovFace=-1;this.selFace=-1;
    this.assignTierSlots(eliteSlots||[],prestigeSlots||[]);
    if(!animate){this._buildMesh(faces);return;}
    const G=this.G;const doSwap=()=>{this._buildMesh(faces);if(this.panelMesh){this.panelMesh.scale.set(0,0,0);const p={v:0};G.to(p,{v:1,duration:.55,ease:'back.out(1.4)',onUpdate:()=>this.panelMesh?.scale.set(p.v,p.v,p.v)});}};
    if(this.panelMesh){const p={v:1};G.to(p,{v:0,duration:.18,ease:'power3.in',onUpdate:()=>this.panelMesh?.scale.set(p.v,p.v,p.v),onComplete:doSwap});}else doSwap();
  }

  _ndc(cx,cy){const r=this.canvas.getBoundingClientRect();return{x:((cx-r.left)/r.width)*2-1,y:-((cy-r.top)/r.height)*2+1};}
  _cast(cx,cy){
    const{x,y}=this._ndc(cx,cy);this.raycaster.setFromCamera({x,y},this.camera);this.systemGroup.updateMatrixWorld(true);
    if(this.epicMesh&&this.raycaster.intersectObject(this.epicMesh).length)return -3;
    for(let i=0;i<this.prestigeMoons.length;i++){if(this.raycaster.intersectObject(this.prestigeMoons[i].moonMesh).length)return-(100+i);}
    for(let i=0;i<this.eliteRings.length;i++){
      const hits=this.raycaster.intersectObject(this.eliteRings[i].mesh);
      if(hits.length){
        // Détecter le slot via l'UV du point d'intersection
        const uv=hits[0].uv;
        if(uv){
          const ring=this.eliteRings[i];
          const slotIdx=Math.floor(uv.x*ring.cfg.slots);
          // Encoder : anneau i, slot s → -(1000 + i*100 + s)
          return -(1000+i*100+Math.min(slotIdx,ring.cfg.slots-1));
        }
        return-(10+i);
      }
    }
    if(this.panelMesh){const h=this.raycaster.intersectObject(this.panelMesh);if(h.length)return this.triToFace?.[h[0].faceIndex]??h[0].faceIndex;}
    return -1;
  }

  _setHov(fi){this.hovFace=fi;if(this._pU)this._pU.uHovered.value=fi;}
  _setSel(fi){this.selFace=fi;if(this._pU)this._pU.uSelected.value=fi;}

  togglePause(){this._paused=!this._paused;if(!this._paused)this._t0=Date.now()-this._lastT*1000;}
  get isPaused(){return this._paused;}

  zoomTo(target){if(!this.G)return;const T=this.T;this.G.to(this.camera.position,{x:target.x,y:target.y,z:target.z,duration:1.1,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(0,0,0))});this.G.to(this,{zoomTarget:target.z||68,duration:1.1,ease:'power3.inOut'});}
  resetCamera(){if(!this.G)return;const T=this.T;this.G.to(this.camera.position,{x:0,y:0,z:185,duration:.95,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(0,0,0))});this.G.to(this,{zoomTarget:185,duration:.95,ease:'power3.inOut'});}
  zoomToCenter(){if(!this.G)return;const T=this.T;this.G.to(this.camera.position,{x:0,y:0,z:0,duration:1.4,ease:'power3.inOut',onUpdate:()=>this.camera.lookAt(new T.Vector3(0,0,1))});this.G.to(this,{zoomTarget:0,duration:1.4,ease:'power3.inOut'});}
  zoom(dy){this.zoomTarget=Math.max(4,Math.min(450,this.zoomTarget+dy*.06));}

  // ★ Visibilité — stopper le rendu si onglet caché
  _bindVisibilityChange(){
    this._visHandler=()=>{this._isBackground=document.hidden;};
    document.addEventListener('visibilitychange',this._visHandler);
  }

  _bindEvents(){
    const c=this.canvas,h=this._h;let lx=0,ly=0,mv=false;
    // ── FIX CAMÉRA : isDragging ne devient true qu'après mouvement réel ──
    // Le mousedown sur les boutons UI (qui flottent sur le canvas) bubblait
    // jusqu'ici → la caméra démarrait un drag sur chaque clic de bouton.
    // Correction : on enregistre juste le point de départ, et isDragging
    // ne passe à true qu'après un déplacement de >3px (seuil humain).
    let pendingDrag=false; // mousedown enregistré mais pas encore confirmé
    h.md=e=>{
      // Ignorer si le clic part d'un élément interactif (bouton, lien…)
      if(e.target!==this.canvas)return;
      pendingDrag=true;mv=false;lx=e.clientX;ly=e.clientY;this.vel={x:0,y:0};
    };
    h.mm=e=>{
      if(pendingDrag&&!this.isDragging){
        const dx=e.clientX-lx,dy=e.clientY-ly;
        if(Math.abs(dx)>3||Math.abs(dy)>3){
          // Seuil franchi : confirmer le drag
          this.isDragging=true;
          this._setDPRScale(1.0);
        }
      }
      if(this.isDragging){
        const dx=e.clientX-lx,dy=e.clientY-ly;if(Math.abs(dx)>1||Math.abs(dy)>1)mv=true;
        this.rot.y+=dx*.004;this.rot.x+=dy*.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));
        this.vel={x:dx*.004,y:dy*.004};lx=e.clientX;ly=e.clientY;
      }else{
        const fi=this._cast(e.clientX,e.clientY);
        const isEpic=fi===-3;
        const isRingSlot=fi<=-1000;
        const isRing=!isRingSlot&&fi<=-10&&fi>-100;
        const isMoon=fi<=-100&&fi>-1000;
        let ringIdx=-1,ringSlotIdx=-1;
        if(isRingSlot){ringIdx=Math.floor((-fi-1000)/100);ringSlotIdx=(-fi-1000)%100;}
        else if(isRing){ringIdx=-fi-10;}
        const moonIdx=isMoon?(-fi-100):-1;
        // Hover highlight : slot spécifique sur l'anneau
        this.eliteRings.forEach((r,i)=>{
          if(i===ringIdx){
            r.u.uHov.value=1;
            // Stocker le slot survolé pour le shader (optionnel futur)
            r._hovSlot=ringSlotIdx;
          } else {
            r.u.uHov.value=0;r._hovSlot=-1;
          }
        });
        this.prestigeMoons.forEach((m,i)=>{m.u.uHov.value=i===moonIdx?1:0;});
        this._setHov(fi>=0?fi:-1);
        if(isEpic)this.onHover?.({tier:'epicenter',_isEpic:true});
        else if(isRingSlot||isRing){
          const ring=this.eliteRings[ringIdx];
          // Chercher le slot spécifique par slotOffset+slotIdx
          const absSlot=ring?.slotOffset+ringSlotIdx;
          const slot=ring?._slots?.[ringSlotIdx]||ring?.firstOccSlot||null;
          this.onHover?.({tier:'elite',_ringIdx:ringIdx,_slotIdx:ringSlotIdx,_ring:ring,slot,_hasOccupant:!!slot});
        }
        else if(isMoon)this.onHover?.(this.prestigeMoons[moonIdx].slot||{tier:'prestige',_moonIdx:moonIdx});
        else if(fi>=0)this.onHover?.(this.faceSlots[fi]);
        else this.onHover?.(null);
        c.style.cursor=(fi>=0||isEpic||isRingSlot||isRing||isMoon)?'pointer':'grab';
      }
    };
    h.mu=e=>{
      // ★ Restaurer résolution après drag
      this._setDPRScale(1.0);
      const wasDragging=this.isDragging;
      // Vrai clic sans mouvement ET sur le canvas seulement
      if(!mv&&!wasDragging&&e.target===this.canvas){
        const fi=this._cast(e.clientX,e.clientY);
        if(fi===-3){this._setSel(-1);if(this._epU)this._epU.uSelected.value=1;this.onClick?.(this.epicSlot||{tier:'epicenter'},'epic');}
        else if(fi<=-1000){
          // Ring + slot spécifique
          const ri=Math.floor((-fi-1000)/100);
          const si=(-fi-1000)%100;
          const ring=this.eliteRings[ri];
          const slot=ring?._slots?.[si]||ring?.firstOccSlot||null;
          this.onClick?.({tier:'elite',_ringIdx:ri,_slotIdx:si,_ring:ring,slot,...(slot||{})},'ring',ri);
        }
        else if(fi<=-10&&fi>-100){
          const ri=-fi-10;
          const ring=this.eliteRings[ri];
          const slot=ring?.firstOccSlot||null;
          this.onClick?.({tier:'elite',_ringIdx:ri,_ring:ring,slot,...(slot||{})},'ring',ri);
        }
        else if(fi<=-100&&fi>-1000){
          const mi=-fi-100;const bridge=this.prestigeMoons[mi];
          this.onClick?.(bridge.slot||{tier:'prestige'},'moon',mi);
          // Zoom vers le pont
          if(bridge){const cfg=bridge.cfg;this.zoomTo({x:cfg.dx*SPHERE_R*2.2,y:cfg.dy*SPHERE_R*2.2,z:cfg.dz*SPHERE_R*2.2});}
        }else if(fi>=0){
          this._setSel(fi);if(this._epU)this._epU.uSelected.value=0;
          const face=this._faces?.[fi];this.onClick?.(this.faceSlots[fi],'face',fi);
          if(face?.centroid){const T=this.T,dir=new T.Vector3(...face.centroid).normalize();this.zoomTo({x:dir.x*SPHERE_R*1.2,y:dir.y*SPHERE_R*1.2,z:dir.z*SPHERE_R*1.2+8});}
        }
      }
      pendingDrag=false;
      this.isDragging=false;
    };
    c.addEventListener('mousedown',h.md);window.addEventListener('mousemove',h.mm);window.addEventListener('mouseup',h.mu);
    h.ts=e=>{if(e.touches.length===1){this.isDragging=true;mv=false;lx=e.touches[0].clientX;ly=e.touches[0].clientY;this.pinchDist=null;this._setDPRScale(1.0);}else if(e.touches.length===2){this.isDragging=false;const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;this.pinchDist=Math.sqrt(dx*dx+dy*dy);}};
    h.tm=e=>{e.preventDefault();if(e.touches.length===1&&this.isDragging){const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;if(Math.abs(dx)>2||Math.abs(dy)>2)mv=true;this.rot.y+=dx*.004;this.rot.x+=dy*.004;this.rot.x=Math.max(-1.5,Math.min(1.5,this.rot.x));this.vel={x:dx*.004,y:dy*.004};lx=e.touches[0].clientX;ly=e.touches[0].clientY;}else if(e.touches.length===2&&this.pinchDist!=null){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const d=Math.sqrt(dx*dx+dy*dy);this.zoom((this.pinchDist-d)*3);this.pinchDist=d;}};
    h.te=e=>{this._setDPRScale(1.0);if(e.changedTouches.length===1){const fi=this._cast(e.changedTouches[0].clientX,e.changedTouches[0].clientY);if(fi>=0){this._setSel(fi);const face=this._faces?.[fi];this.onClick?.(this.faceSlots[fi],'face',fi);if(face?.centroid){const T=this.T,dir=new T.Vector3(...face.centroid).normalize();this.zoomTo({x:dir.x*SPHERE_R*1.2,y:dir.y*SPHERE_R*1.2,z:dir.z*SPHERE_R*1.2+8});}}}this.isDragging=false;};
    c.addEventListener('touchstart',h.ts,{passive:false});c.addEventListener('touchmove',h.tm,{passive:false});c.addEventListener('touchend',h.te);
  }

  // ★ Resolution scaling — adaptatif
  _setDPRScale(scale){
    this._targetDPR=scale;
  }

  _applyDPRScale(){
    const targetDPR=this._targetDPR*(this._isBackground?0.4:1.0);
    const baseDPR=Math.min(window.devicePixelRatio||1,2.0);
    const newDPR=Math.max(0.4,baseDPR*targetDPR);
    if(Math.abs(newDPR-this._dprScale)>.05){
      this._dprScale=newDPR;
      this.renderer.setPixelRatio(newDPR);
      const W=this.canvas.clientWidth,H=this.canvas.clientHeight;
      if(W&&H){this.renderer.setSize(W,H,false);if(this.composer)this.composer.setSize(W,H);}
    }
  }

  // ── Animation loop optimisée ──────────────────────────────────────────────
  _animate(){
    this.animId=requestAnimationFrame(()=>this._animate());

    // ★ Frame throttle — background → 30fps
    if(this._isBackground){
      this._frameThrottle=(this._frameThrottle+1)%2;
      if(this._frameThrottle!==0)return;
    }

    const t=(Date.now()-this._t0)*.001;
    this._lastT=t; // pour résumé après pause

    // ★ Pause globale — on rend juste le dernier frame
    if(this._paused){
      if(this.composer)this.composer.render();
      else this.renderer.render(this.scene,this.camera);
      return;
    }

    // ★ Apply resolution scaling smooth
    this._applyDPRScale();

    if(!this.isDragging){
      this.rot.y+=this.vel.x;this.rot.x+=this.vel.y;this.vel.x*=.92;this.vel.y*=.92;this.rot.y+=.00018;
    }
    this.systemGroup.rotation.x=this.rot.x;this.systemGroup.rotation.y=this.rot.y;

    const camDist=this.camera.position.length();
    const rawB=1.-Math.min(1.,Math.max(0.,(camDist-SPHERE_R*.78)/(SPHERE_R*.22)));
    this._insideBlend=this._insideBlend*.96+rawB*.04;
    const ib=this._insideBlend;

    // ★ Post-process adaptatif selon état
    if(this._bloomPass)this._bloomPass.strength=(.55+Math.sin(t*.5)*.04)*(1.-ib*.55);
    if(this._caPass?.uniforms){
      this._caPass.uniforms.uTime.value=t;
      // CA désactivé pendant drag (trop coûteux)
      this._caPass.uniforms.uActive.value=this.isDragging?0.0:1.0;
      this._caPass.uniforms.uVigStr.value=.55+ib*.30;
    }
    // SSAO — désactivé en drag, léger au repos
    if(this._ssaoPass?.uniforms?.uIntensity){
      this._ssaoPass.uniforms.uIntensity.value=this.isDragging?0.0:(.40+ib*.25);
    }

    const sp=1+Math.sin(t*.72)*.06;const ls=1.-ib*.88;
    if(this._sl){this._sl.intensity=1200*sp*ls;
      // ★ Shadow map — update seulement si pas en drag
      if(!this.isDragging&&this.renderer.shadowMap)this.renderer.shadowMap.needsUpdate=true;
    }
    if(this._cl)this._cl.intensity=45*sp*ls;

    if(this._epU){this._epU.uTime.value=t;this._epU.uInsideBlend.value=ib;}
    if(this.epicMesh){const es=1.+Math.sin(t*1.1)*.05;this.epicMesh.scale.setScalar(es);}
    this.epicHalos.forEach(({m,u})=>{if(u){u.uTime.value=t;u.uInsideBlend.value=ib;}});

    // ★ LOD rings — toutes les 60 frames environ
    if(Math.floor(t*60)%60===0)this._updateRingLOD();

    this.eliteRings.forEach((ring,i)=>{
      const{mesh,solidMesh,u,cfg,trailLine}=ring;
      u.uTime.value=t;
      const spin=t*0.032*(i%2?1:-1);
      mesh.rotation.x=cfg.rX+Math.sin(t*.08+i)*.005;mesh.rotation.z=cfg.rZ+spin;
      if(solidMesh){solidMesh.rotation.x=mesh.rotation.x;solidMesh.rotation.z=mesh.rotation.z;}
      if(trailLine){trailLine.rotation.x=mesh.rotation.x;trailLine.rotation.z=mesh.rotation.z;}
      // ── Scroll du ticker — bandeau continu : même direction+vitesse pour tout l'anneau ──
      // Scroll bandeau — vitesse réduite, effet billboard naturel
      if(ring._slotTextures){
        const SLOT_KEYS=['1','2','3','4','5','6','7','8'];
        const ringSpeed=0.0006*(1+i*0.05); // ~25s par tour, vitesse panneau pub
        SLOT_KEYS.forEach((k)=>{
          const uO=ring.u[`uTexOffset${k}`];
          if(uO) uO.value=(uO.value+ringSpeed)%1.0;
        });
      }
    });

    this.prestigeMoons.forEach(({u})=>{
      u.uTime.value=t;
    });

    if(this._grU){this._grU.uTime.value=t;this._grU.uInsideBlend.value=ib;}
    this.decoRings.forEach(({u})=>{u.uTime.value=t;});
    if(this._pU)this._pU.uTime.value=t;
    if(this._vU)this._vU.uTime.value=t;
    if(this.viralSwarm){this.viralSwarm.rotation.y=t*.028;this.viralSwarm.rotation.x=Math.sin(t*.020)*.18;}

    // ★ Starfield GPU — update uniforme temps + rotation lente
    if(this.starfieldPoints){
      this.starfieldPoints.material.uniforms.uTime.value=t;
      this.starfieldPoints.rotation.y=t*.00015;
      this.starfieldPoints.rotation.x=Math.sin(t*.00008)*.012;
    }

    // ★ Événements cosmiques — billboards + comètes
    this.cosmicObjects.forEach(({m,u,ev})=>{
      if(u.uTime)u.uTime.value=t;
      // Billboard face camera
      m.quaternion.copy(this.camera.quaternion);
    });

    // ★ Comètes — trajectoire parabolique CPU (légère, 3 comètes)
    this.cometMeshes.forEach(({geo,ev,pts})=>{
      const a=t*ev.speed+ev.phase;
      const dx=Math.cos(a)*Math.cos(ev.inc),dy=Math.sin(ev.inc),dz=Math.sin(a)*Math.cos(ev.inc);
      const N=pts.length/3;
      for(let i=0;i<N;i++){
        const f=i/(N-1);
        const r=ev.r*(1.-f*.85); // queue converge vers l'origine
        pts[i*3]=dx*r;pts[i*3+1]=dy*r*(1.-f*.4);pts[i*3+2]=dz*r;
      }
      geo.attributes.position.needsUpdate=true;
    });

    this.zoomCurrent+=(this.zoomTarget-this.zoomCurrent)*.055;
    this.camera.position.z=this.zoomCurrent;

    if(this.composer)this.composer.render();
    else this.renderer.render(this.scene,this.camera);
  }

  resize(){
    const W=this.canvas.clientWidth,H=this.canvas.clientHeight;if(!W||!H)return;
    this.camera.aspect=W/H;this.camera.updateProjectionMatrix();
    this.renderer.setSize(W,H,false);if(this.composer)this.composer.setSize(W,H);
  }

  destroy(){
    cancelAnimationFrame(this.animId);
    document.removeEventListener('visibilitychange',this._visHandler);
    const h=this._h;
    this.canvas.removeEventListener('mousedown',h.md);window.removeEventListener('mousemove',h.mm);window.removeEventListener('mouseup',h.mu);
    this.canvas.removeEventListener('touchstart',h.ts);this.canvas.removeEventListener('touchmove',h.tm);this.canvas.removeEventListener('touchend',h.te);

    // ── P2 FIX: dispose cached materials ──
    [this._panelMat,this._viralMat,this._godRayMat,this._epicMat].forEach(m=>m?.dispose());
    this._panelMat=this._viralMat=this._godRayMat=this._epicMat=null;

    [this.panelMesh,this.epicMesh,this.godRays,this.viralSwarm,this.starfieldPoints].forEach(m=>{if(m){m.geometry?.dispose();/* material already disposed above */}});
    this.cosmicObjects.forEach(({m})=>{m?.geometry?.dispose();m?.material?.dispose();});
    this.cometMeshes.forEach(({m})=>{m?.geometry?.dispose();m?.material?.dispose();});
    this.eliteRings.forEach(({mesh,solidMesh,trailLine,_brandTex,_dummyTex,_slotTextures})=>{
      mesh?.geometry?.dispose();mesh?.material?.dispose();
      solidMesh?.geometry?.dispose();solidMesh?.material?.dispose();
      trailLine?.geometry?.dispose();trailLine?.material?.dispose();
      _brandTex?.dispose();
      _dummyTex?.dispose();
      _slotTextures?.forEach(t=>t?.dispose());
    });
    Object.values(this._ringGeoCache).forEach(g=>g?.dispose());this._ringGeoCache={};
    this.prestigeMoons.forEach(({moonMesh,beam,wire,j1,j2,_dummyTex})=>{moonMesh?.geometry?.dispose();moonMesh?.material?.dispose();beam?.geometry?.dispose();beam?.material?.dispose();wire?.geometry?.dispose();wire?.material?.dispose();j1?.geometry?.dispose();j1?.material?.dispose();j2?.geometry?.dispose();j2?.material?.dispose();_dummyTex?.dispose();});
    this.epicHalos.forEach(({m})=>{m?.geometry?.dispose();m?.material?.dispose();});
    this.decoRings.forEach(({m})=>{m?.geometry?.dispose();m?.material?.dispose();});

    // ── P1 FIX: force WebGL context release ──
    this.composer?.passes?.forEach(p=>{p.fsQuad?.dispose?.();});
    this.composer?.dispose?.();
    this.renderer?.forceContextLoss?.(); // ← libère immédiatement le contexte GPU
    this.renderer?.dispose();
    this.renderer=null;
    this.scene=null;
    this.camera=null;
  }
}

// ── AAA UI System — Star Citizen grade ───────────────────────────────────────

// Corner bracket helper — decorative angular UI corners
function Brackets({col=DS.bracket,size=8,thickness=1,style={}}){
  const s=(side,axis)=>({position:'absolute',[side]:0,[axis]:0,width:size,height:size,
    borderTop: (side==='top')?`${thickness}px solid ${col}`:'none',
    borderBottom:(side==='bottom')?`${thickness}px solid ${col}`:'none',
    borderLeft: (axis==='left')? `${thickness}px solid ${col}`:'none',
    borderRight:(axis==='right')?`${thickness}px solid ${col}`:'none',
    zIndex:10,pointerEvents:'none',
  });
  return(<>
    <div style={s('top','left')}/>
    <div style={s('top','right')}/>
    <div style={s('bottom','left')}/>
    <div style={s('bottom','right')}/>
  </>);
}

// Scan-line overlay — holographic raster effect
function ScanLines({col=DS.scanCol}){ return null; }

// Glass panel — clean card style
function Glass({children,style={},glow,brackets=false,scan=false,...p}){
  const c=glow||DS.cyan;
  return(
    <div style={{
      position:'relative',
      background:DS.glass,
      backdropFilter:'blur(16px)',
      WebkitBackdropFilter:'blur(16px)',
      border:`1px solid ${glow?c+'22':DS.glassBrd}`,
      boxShadow:'0 4px 24px rgba(0,0,0,0.6)',
      borderRadius:6,
      ...style
    }} {...p}>
      {children}
    </div>
  );
}

// AAA Button — chamfered-corner holographic
function LumBtn({children,onClick,col=DS.cyan,style={},sm,active,icon}){
  const[hov,setHov]=useState(false);
  const on=active||hov;
  const pad=sm?'5px 12px':'10px 22px';
  const fs=sm?9:11;
  return(
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background:on?`${col}18`:'transparent',
        border:`1px solid ${col}${on?'55':'22'}`,
        borderRadius:5,
        color:on?col:`${col}66`,
        fontFamily:F.ui,fontSize:fs,fontWeight:600,
        padding:pad,letterSpacing:'0.08em',
        cursor:'pointer',outline:'none',
        boxShadow:'none',
        transition:'all 0.15s ease',
        display:'flex',alignItems:'center',justifyContent:'center',gap:5,
        textTransform:'uppercase',
        ...style
      }}>
      {children}
    </button>
  );
}

// Separator
function Sep({col=DS.gold,style={}}){
  return <div style={{height:'1px',background:'rgba(255,255,255,0.06)',...style}}/>;
}

// Label badge — data-chip
function Badge({children,col=DS.cyan,style={}}){
  return(
    <span style={{
      display:'inline-flex',alignItems:'center',gap:3,
      padding:'1.5px 6px',
      background:`${col}0e`,
      border:`0.5px solid ${col}33`,
      color:`${col}cc`,
      fontFamily:F.mono,fontSize:7,fontWeight:600,
      letterSpacing:'.14em',textTransform:'uppercase',
      ...style
    }}>{children}</span>
  );
}

// ── TIER CONFIG — couleurs vives, identité forte ─────────────────────────────
const TIER_CONFIG = {
  all:       { id:-1, key:'all',       label:'TOUS',      short:'ALL',  sub:'Vue système complète',         icon:'◉', col:'#4488CC', price:null,  slots:1296, desc:'Tous les tiers simultanément — vue système complète de la mégastructure.' },
  epicenter: { id:0,  key:'epicenter', label:'ÉPICENTRE', short:'EPIC', sub:'1 noyau · cœur absolu',        icon:'✦', col:'#FFB040', price:1000, slots:1,    desc:'Le cœur cristallin de la Sphère. Un seul annonceur. Présence totale, rayonnement absolu.' },
  prestige:  { id:1,  key:'prestige',  label:'LUNES',     short:'PRES', sub:'8 corps orbitaux',             icon:'◯', col:'#FF6040', price:100,  slots:8,    desc:'Huit lunes orbitales sculpturales. Chaque corps visible depuis l\'ensemble de la sphère.' },
  elite:     { id:2,  key:'elite',     label:'ANNEAUX',   short:'ÉLITE',sub:'50 slots · 6 anneaux Dyson',   icon:'⊕', col:'#40AAFF', price:50,   slots:50,   desc:'Six anneaux équatoriaux Dyson. Architecture iconique, trafic haute densité orbital.' },
  business:  { id:3,  key:'business',  label:'PANNEAUX',  short:'BIZ',  sub:'176 slots · panneaux surface',  icon:'▣', col:'#20DDA0', price:10,   slots:176,  desc:'Panneaux structurels de surface. Flux direct, trafic qualifié haute densité.' },
  standard:  { id:4,  key:'standard',  label:'ÉMETTEURS', short:'STD',  sub:'400 slots · surface complète',  icon:'▪', col:'#7060FF', price:3,    slots:400,  desc:'Émetteurs de surface. Présence diffuse sur l\'ensemble de la mégastructure.' },
  viral:     { id:5,  key:'viral',     label:'DRONES',    short:'VIRAL',sub:'671 nano-vecteurs orbitaux',    icon:'⚡', col:'#40FF80', price:1,    slots:671,  desc:'Essaim de nano-drones. Présence maximale diffuse — 671 vecteurs simultanés.' },
};
const TIER_LIST = ['all','epicenter','prestige','elite','business','standard','viral'];

const VUE_CONFIG = {
  realist:  {
    label:'PLASMA',   short:'PLM', icon:'◉', col:'#E8A020',
    desc:'Rendu stellaire natif',
    lore:'La Sphère telle qu\'elle est — matières vivantes, éclat des métaux, lumière solaire brute.',
    reveal:'Aspect naturel · Tiers dorés · Matériaux PBR',
  },
  thermal:  {
    label:'FLUX-IR',  short:'IR',  icon:'⬡', col:'#FF4400',
    desc:'Rayonnement thermique des Éclats',
    lore:'Chaque Éclat actif rayonne. Les zones chaudes pulsent — les silences refroidissent.',
    reveal:'Activité publicitaire · Zones saturées · Éclats live',
  },
  solar:    {
    label:'SOLAIRE',  short:'SOL', icon:'◐', col:'#C4881A',
    desc:'Filtre polarisé ambré',
    lore:'Les lentilles s\'assombrissent. L\'éblouissement de l\'étoile s\'efface — la structure se révèle.',
    reveal:'Vision anti-éblouissement · Confort orbital · Structure nette',
  },
  chromatic:{
    label:'CHROMATIQUE', short:'CHR', icon:'⬤', col:'#1E90FF',
    desc:'Vue dot-matrix lisibilité max',
    lore:'Le regard analytique. Chaque slot, un point. Chaque tier, une intensité. Zéro bruit — signal pur.',
    reveal:'Monochrome bleu · Dot-matrix · Contraste maximal',
  },
};

// ── Radial Arc SVG pour occupation ───────────────────────────────────────────
function OccArc({ pct, col, size=80, stroke=6 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct, 1);
  const bgDash = circ * 0.75; // 270° arc
  const rot = -225; // start bottom-left
  return (
    <svg width={size} height={size} style={{transform:'rotate(0deg)',overflow:'visible'}}>
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke={`${col}16`} strokeWidth={stroke}
        strokeDasharray={`${bgDash} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        style={{transform:`rotate(${rot}deg)`,transformOrigin:'50% 50%'}}
      />
      {/* Fill */}
      {pct > 0 && <circle cx={cx} cy={cy} r={r}
        fill="none" stroke={col} strokeWidth={stroke}
        strokeDasharray={`${dash * 0.75} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        style={{transform:`rotate(${rot}deg)`,transformOrigin:'50% 50%',filter:`drop-shadow(0 0 ${stroke*1.5}px ${col}88)`,transition:'stroke-dasharray .6s cubic-bezier(.16,1,.3,1)'}}
      />}
      {/* Center */}
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
        fill={col} fontSize={size*0.22} fontFamily="'JetBrains Mono',monospace" fontWeight="700">
        {Math.round(pct*100)}%
      </text>
      <text x={cx} y={cy+size*0.18} textAnchor="middle" dominantBaseline="middle"
        fill={`${col}55`} fontSize={size*0.10} fontFamily="'JetBrains Mono',monospace" letterSpacing=".1em">
        OCC
      </text>
    </svg>
  );
}

// ── SlotGrid — visualisation occupation en mini carrés ────────────────────────
function SlotGrid({ total, occupied, col }) {
  const max = Math.min(total, 48);
  const cols = Math.ceil(Math.sqrt(max * 2));
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:2}}>
      {Array.from({length:max},(_,i)=>{
        const fill = i < Math.round((occupied/total)*max);
        return <div key={i} style={{
          width:6,height:6,
          background: fill ? col : `${col}16`,
          boxShadow: fill ? `0 0 4px ${col}80` : 'none',
          transition:'background .3s',
          clipPath: fill ? 'none' : undefined,
        }}/>;
      })}
      {total > max && <div style={{color:`${col}44`,fontFamily:F.mono,fontSize:7,alignSelf:'center',marginLeft:2}}>+{total-max}</div>}
    </div>
  );
}

// ── TIER PANEL — panneau gauche immersif ──────────────────────────────────────
function TierPanel({ activeTier, slots, onClose, onCheckout, dockLeftActive=false }) {
  const tierKey = TIER_LIST[activeTier + 1] || 'all';
  const cfg = TIER_CONFIG[tierKey];
  const col = cfg.col;
  const[booking,setBooking]=useState({days:7,total:0,billing:getBilling(7)});
  const isMobile = useIsMobile();

  const occ  = slots.filter(s => s?.tier === cfg.key && s?.occ).length;
  const tot  = cfg.slots || 0;
  const free = tot - occ;
  const pct  = tot > 0 ? occ / tot : 0;

  // Pick first available (free) slot of this tier to pass x/y to CheckoutModal
  const freeSlot = slots.find(s => s?.tier === cfg.key && !s?.occ);

  if (activeTier === -1) return null;

  // Layout unique par tier
  const isEpic = cfg.key === 'epicenter';
  const isViral = cfg.key === 'viral';

  return (
    <div key={tierKey} style={
      isMobile ? {
        position:'absolute', left:0, right:0, bottom:0,
        height:'72vh', zIndex:45, pointerEvents:'auto',
        animation:'panelRevealBottom .40s cubic-bezier(.16,1,.3,1) both',
        borderRadius:'16px 16px 0 0',
        overflow:'hidden',
      } : {
        position:'absolute', left: dockLeftActive ? 224 : 0, top:0, bottom:0,
        width:260, zIndex:45, pointerEvents:'auto',
        animation:'panelReveal .40s cubic-bezier(.16,1,.3,1) both',
      }
    }>
      {/* Fond */}
      <div style={{
        position:'absolute',inset:0,
        background:`rgba(8,8,14,0.98)`,
        borderRight:`1px solid rgba(255,255,255,0.07)`,
        backdropFilter:'blur(20px)',
      }}/>

      {/* Bande couleur latérale gauche */}
      <div style={{
        position:'absolute',left:0,top:0,bottom:0,width:2,
        background:col,
        opacity:0.5,
      }}/>

      {/* Watermark géant du tier */}
      <div style={{
        position:'absolute',bottom:-20,right:-10,
        fontSize:180,lineHeight:1,
        color:`${col}07`,
        fontFamily:F.mono,fontWeight:700,
        pointerEvents:'none',userSelect:'none',
        letterSpacing:'-0.05em',
      }}>{cfg.icon}</div>

      {/* Contenu */}
      <div style={{position:'relative',zIndex:2,height:'100%',display:'flex',flexDirection:'column',padding:'18px 20px 20px 22px',overflow:'hidden'}}>

        {/* Close */}
        <button onClick={onClose} style={{
          position:'absolute',top:12,right:12,
          width:22,height:22,
          border:`0.5px solid ${col}30`,background:'transparent',
          color:`${col}60`,fontFamily:F.mono,fontSize:11,
          cursor:'pointer',outline:'none',
          display:'flex',alignItems:'center',justifyContent:'center',
          transition:'all .15s',borderRadius:2,
        }}
        onMouseEnter={e=>{e.currentTarget.style.background=`${col}18`;e.currentTarget.style.color=col;e.currentTarget.style.borderColor=`${col}80`;}}
        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=`${col}60`;e.currentTarget.style.borderColor=`${col}30`;}}
        >✕</button>

        {/* Header */}
        <div style={{marginBottom:20,paddingBottom:16,borderBottom:`0.5px solid ${col}18`}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:col,opacity:0.8}}/>
            <span style={{color:`${col}70`,fontFamily:F.mono,fontSize:8,letterSpacing:'.20em'}}>TIER·ACTIF</span>
          </div>
          <div style={{
            fontSize: isEpic ? 28 : 22,
            fontWeight:700,fontFamily:F.mono,
            color:col,letterSpacing:'.06em',lineHeight:1,
            marginBottom:6,
            textShadow:`0 0 30px ${col}60`,
          }}>{cfg.label}</div>
          <div style={{color:`${col}55`,fontFamily:F.mono,fontSize:9,letterSpacing:'.10em'}}>{cfg.sub}</div>
        </div>

        {/* Section principale — unique par tier */}
        {isEpic ? (
          // EPIC: minimaliste, prix dominant, prestige total
          <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:16}}>
            <div style={{
              width:100,height:100,borderRadius:'50%',
              border:`2px solid ${col}50`,
              background:`radial-gradient(circle at 35% 35%, ${col}20, transparent 60%)`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:40,color:col,
              boxShadow:"none",
              animation:'hspin 12s linear infinite',
            }}>{cfg.icon}</div>
            <div style={{textAlign:'center'}}>
              <div style={{color:`${col}44`,fontFamily:F.mono,fontSize:9,letterSpacing:'.16em',marginBottom:6}}>TARIF EXCLUSIF</div>
              <div style={{color:col,fontFamily:F.mono,fontSize:48,fontWeight:700,lineHeight:1,textShadow:"none"}}>€{cfg.price}</div>
              <div style={{color:`${col}55`,fontFamily:F.mono,fontSize:10,letterSpacing:'.12em'}}>PAR JOUR</div>
            </div>
            {free > 0
              ? <div style={{padding:'4px 16px',background:`${col}12`,border:`0.5px solid ${col}40`,color:`${col}cc`,fontFamily:F.mono,fontSize:9,letterSpacing:'.12em'}}>DISPONIBLE</div>
              : <div style={{padding:'4px 16px',background:`rgba(208,40,72,0.10)`,border:`0.5px solid rgba(208,40,72,0.40)`,color:'#D02848',fontFamily:F.mono,fontSize:9,letterSpacing:'.12em'}}>OCCUPÉ</div>
            }
          </div>
        ) : isViral ? (
          // VIRAL: dense, grille de dots, impression de masse
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{color:col,fontFamily:F.mono,fontSize:32,fontWeight:700,lineHeight:1}}>{occ}</div>
                <div style={{color:`${col}50`,fontFamily:F.mono,fontSize:8,letterSpacing:'.12em'}}>ACTIFS</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{color:`${col}80`,fontFamily:F.mono,fontSize:32,fontWeight:700,lineHeight:1}}>{free}</div>
                <div style={{color:`${col}50`,fontFamily:F.mono,fontSize:8,letterSpacing:'.12em'}}>LIBRES</div>
              </div>
            </div>
            <div style={{flex:1,overflow:'hidden'}}>
              <SlotGrid total={tot} occupied={occ} col={col}/>
            </div>
            <div style={{color:`${col}50`,fontFamily:F.mono,fontSize:8,lineHeight:1.7,letterSpacing:'.04em'}}>{cfg.desc}</div>
          </div>
        ) : (
          // DEFAULT: arc progress + stats + desc
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <OccArc pct={pct} col={col} size={88} stroke={7}/>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[{v:tot,l:'TOTAL'},{v:occ,l:'ACTIFS'},{v:free,l:'LIBRES',highlight:free>0}].map(({v,l,highlight})=>(
                  <div key={l}>
                    <div style={{color:highlight?DS.green:col,fontFamily:F.mono,fontSize:16,fontWeight:700,lineHeight:1}}>{v}</div>
                    <div style={{color:`${col}45`,fontFamily:F.mono,fontSize:7,letterSpacing:'.12em'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Barre segmentée */}
            <div style={{display:'flex',gap:1,height:4,borderRadius:2,overflow:'hidden'}}>
              {Array.from({length:20},(_,i)=>(
                <div key={i} style={{flex:1,background:i<Math.round(pct*20)?col:`${col}14`,transition:'background .5s',boxShadow:i<Math.round(pct*20)?`0 0 6px ${col}80`:undefined}}/>
              ))}
            </div>

            <div style={{color:`${col}50`,fontFamily:F.mono,fontSize:8.5,lineHeight:1.75,letterSpacing:'.04em',flex:1}}>{cfg.desc}</div>
          </div>
        )}

        {/* Séparateur */}
        <div style={{height:.5,background:`linear-gradient(90deg,transparent,${col}40,${col}60,${col}40,transparent)`,boxShadow:`0 0 8px ${col}30`,margin:'16px 0'}}/>

        {/* Prix + CTA — scrollable pour accueillir le picker */}
        <div style={{overflowY:'auto',flexShrink:0}}>
          {cfg.key !== 'all' && free > 0 && (
            <DurationPicker
              pricePerDay={cfg.price ? cfg.price*100 : (TIER_PRICE[cfg.key]||100)}
              col={col}
              onChange={b=>setBooking(b)}
            />
          )}
          {cfg.key !== 'all' && free > 0 && (
            <button onClick={()=>onCheckout?.({
                tier:cfg.key,
                x: freeSlot?.x,
                y: freeSlot?.y,
                days:booking.days,
                total:booking.total,
                billing:booking.billing,
              })} style={{
              width:'100%',padding:'12px 16px',
              background:`linear-gradient(135deg,${col}28,${col}14)`,
              border:`1px solid ${col}60`,
              color:col,fontFamily:F.mono,fontSize:10,fontWeight:700,
              letterSpacing:'.12em',cursor:'pointer',outline:'none',
              transition:'all .18s',
              borderRadius:5,
              boxShadow:`0 0 24px ${col}18`,
            }}
            onMouseEnter={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${col}45,${col}28)`;e.currentTarget.style.boxShadow='none';}}
            onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${col}28,${col}14)`;e.currentTarget.style.boxShadow=`0 0 24px ${col}18`;}}
            >
              ◈ RÉSERVER · {booking.days}J · {(booking.total/100).toLocaleString('fr-FR',{minimumFractionDigits:2})} €
            </button>
          )}
          {cfg.key !== 'all' && free === 0 && (
            <div style={{textAlign:'center',padding:'10px',color:'rgba(208,40,72,0.7)',fontFamily:F.mono,fontSize:9,letterSpacing:'.14em',border:`0.5px solid rgba(208,40,72,0.25)`}}>
              TIER COMPLET
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── VUE MODES — Scanner de lecture de la Sphère ──────────────────────────────
function VueDial({ activeFilter, onFilterSelect }) {
  const [hovered, setHovered] = useState(null);
  const isMobile = useIsMobile();
  const entries  = Object.entries(VUE_CONFIG);
  const active   = VUE_CONFIG[activeFilter] || VUE_CONFIG.realist;
  const hovCfg   = hovered ? VUE_CONFIG[hovered] : null;
  const displayCfg = hovCfg || active;

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position:'absolute', top:10, right:10, zIndex:40,
        display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5,
      }}>
        <div style={{
          display:'flex', flexDirection:'row', gap:4, alignItems:'center',
          background:'rgba(0,2,12,0.92)',
          border:`0.5px solid ${active.col}28`,
          borderRadius:20,
          padding:'4px 8px',
          backdropFilter:'blur(20px)',
        }}>
          <span style={{
            color:`${active.col}55`, fontFamily:F.mono, fontSize:7,
            letterSpacing:'.18em', marginRight:2,
          }}>CAPTEUR·SCAN</span>
          {entries.map(([id,cfg])=>{
            const on = activeFilter === id;
            return (
              <button key={id} onClick={()=>onFilterSelect(id)}
                style={{
                  width: on ? 26 : 20, height: on ? 26 : 20,
                  borderRadius:'50%',
                  background: on
                    ? `radial-gradient(circle at 35% 35%, ${cfg.col}ee, ${cfg.col}66)`
                    : `${cfg.col}14`,
                  border:`1.5px solid ${on ? cfg.col : cfg.col+'25'}`,
                  boxShadow: on ? `0 0 10px ${cfg.col}70` : 'none',
                  cursor:'pointer', outline:'none',
                  transition:'all .2s cubic-bezier(.16,1,.3,1)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: on ? 11 : 9,
                  color: on ? '#000' : cfg.col,
                  flexShrink:0,
                }}
              >{cfg.icon}</button>
            );
          })}
        </div>
        <div style={{
          background:'rgba(0,2,12,0.88)',
          border:`0.5px solid ${active.col}30`,
          borderRadius:8,
          padding:'3px 8px',
          display:'flex', alignItems:'center', gap:5,
        }}>
          <span style={{color:active.col, fontFamily:F.mono, fontSize:8, fontWeight:700, letterSpacing:'.14em'}}>{active.label}</span>
          <span style={{color:`${active.col}50`, fontFamily:F.mono, fontSize:7}}>·</span>
          <span style={{color:`${active.col}60`, fontFamily:F.mono, fontSize:7}}>{active.desc}</span>
        </div>
      </div>
    );
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position:'absolute', right:14, bottom:110, zIndex:40,
      display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8,
      userSelect:'none',
    }}>
      {/* Panneau info mode actif / survolé */}
      <div style={{
        width:200,
        background:'rgba(10,10,16,0.97)',
        border:`1px solid rgba(255,255,255,0.08)`,
        borderLeft:`2px solid ${displayCfg.col}66`,
        padding:'10px 12px',
        transition:'border-color .25s',
        backdropFilter:'blur(16px)',
        borderRadius:6,
      }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6,
        }}>
          <span style={{color:`${displayCfg.col}55`, fontFamily:F.mono, fontSize:8, letterSpacing:'.12em', fontWeight:600}}>CAPTEUR · SCAN</span>
          <span style={{
            color:displayCfg.col, fontFamily:F.mono, fontSize:8, letterSpacing:'.08em',
            background:`${displayCfg.col}12`, border:`1px solid ${displayCfg.col}33`, padding:'1px 6px', borderRadius:3,
          }}>{displayCfg.short}</span>
        </div>
        <div style={{
          color:displayCfg.col, fontFamily:F.ui, fontSize:15, fontWeight:700,
          letterSpacing:'.04em', lineHeight:1.1, marginBottom:4,
        }}>{displayCfg.label}</div>
        <div style={{
          color:`${displayCfg.col}70`, fontFamily:F.mono, fontSize:8,
          letterSpacing:'.04em', lineHeight:1.5, marginBottom:7,
        }}>{displayCfg.desc}</div>
        <div style={{height:'1px', background:'rgba(255,255,255,0.06)', marginBottom:7}}/>
        <div style={{
          color:`${displayCfg.col}44`, fontFamily:F.mono, fontSize:7.5,
          letterSpacing:'.04em', lineHeight:1.7, fontStyle:'italic', marginBottom:7,
        }}>{displayCfg.lore}</div>
        <div style={{
          display:'flex', alignItems:'flex-start', gap:5,
          background:`${displayCfg.col}08`, border:`1px solid ${displayCfg.col}18`, padding:'5px 7px', borderRadius:4,
        }}>
          <span style={{color:`${displayCfg.col}55`, fontFamily:F.mono, fontSize:7, flexShrink:0, marginTop:.5}}>◈</span>
          <span style={{color:`${displayCfg.col}66`, fontFamily:F.mono, fontSize:7, letterSpacing:'.04em', lineHeight:1.6}}>{displayCfg.reveal}</span>
        </div>
      </div>

      {/* Boutons 5 modes */}
      <div style={{display:'flex', flexDirection:'column', gap:3, alignItems:'flex-end'}}>
        {entries.map(([id, cfg], idx) => {
          const on  = activeFilter === id;
          const hov = hovered === id;
          return (
            <button key={id}
              onClick={()=>onFilterSelect(id)}
              onMouseEnter={()=>setHovered(id)}
              onMouseLeave={()=>setHovered(null)}
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding: on ? '5px 10px 5px 12px' : '4px 8px 4px 10px',
                background: on ? `${cfg.col}16` : hov ? `${cfg.col}0a` : 'transparent',
                border:`1px solid ${on ? cfg.col+'44' : hov ? cfg.col+'22' : 'rgba(255,255,255,0.06)'}`,
                borderRight: on ? `2px solid ${cfg.col}88` : undefined,
                borderRadius:5,
                cursor:'pointer', outline:'none',
                transition:'all .15s ease',
                minWidth: on ? 110 : 90,
              }}
            >
              <span style={{
                fontSize: on ? 13 : 10, color: on ? cfg.col : `${cfg.col}55`,
                transition:'all .15s', flexShrink:0,
              }}>{cfg.icon}</span>
              <span style={{
                fontFamily:F.mono, fontSize: on ? 9 : 8, fontWeight:on?700:500, letterSpacing:'.08em',
                color: on ? cfg.col : `${cfg.col}55`,
                transition:'all .15s', flexGrow:1,
              }}>{cfg.label}</span>
              {on && <span style={{
                width:4, height:4, borderRadius:'50%',
                background:cfg.col, opacity:0.7,
              }}/>}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes panelFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ── TIER COMMAND BAR — barre du bas, identité forte ───────────────────────────
function TierCommandBar({ activeTier, onTierSelect, slots }) {
  const stats = useMemo(()=>{
    const c={};TIER_LIST.forEach(k=>{c[k]=0;});
    (slots||[]).forEach(s=>{if(s?.occ&&c[s.tier]!==undefined)c[s.tier]++;});
    return c;
  },[slots]);
  const isMobile = useIsMobile();

  return (
    <div style={{
      display:'flex',alignItems:'stretch',gap:1,
      background:'rgba(8,8,14,0.97)',
      backdropFilter:'blur(20px)',
      border:'1px solid rgba(255,255,255,0.08)',
      boxShadow:'0 4px 24px rgba(0,0,0,0.7)',
      padding:'4px',
      borderRadius:8,
      ...(isMobile ? {
        overflowX:'auto',
        WebkitOverflowScrolling:'touch',
        scrollbarWidth:'none',
        maxWidth:'calc(100vw - 24px)',
      } : {}),
    }}>
      {TIER_LIST.map((key,i) => {
        const cfg = TIER_CONFIG[key];
        const on = activeTier === cfg.id;
        const col = cfg.col;
        const occ = stats[key] || 0;
        const tot = cfg.slots || 0;
        const pct = tot > 0 ? occ / tot : 0;
        const isAll = key === 'all';

        return (
          <button key={key} onClick={() => onTierSelect(on && !isAll ? -1 : cfg.id)}
            style={{
              position:'relative',
              padding: isMobile ? (on ? '8px 12px' : '6px 9px') : (on ? '10px 18px' : '7px 12px'),
              minWidth: isMobile ? (on ? 60 : (isAll ? 36 : 42)) : (on ? 80 : (isAll ? 48 : 52)),
              flexShrink: 0,
              background: on ? `${col}18` : 'transparent',
              border: `1px solid ${on ? col+'44' : 'transparent'}`,
              borderRadius: 6,
              color: on ? col : `${col}55`,
              cursor:'pointer',outline:'none',
              transition:'all .18s ease',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:isMobile?2:4,
              overflow:'hidden',
            }}
            onMouseEnter={e=>{if(!on){e.currentTarget.style.background=`${col}10`;e.currentTarget.style.color=`${col}88`;}}}
            onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.color=`${col}55`;}}}
          >
            {/* Active indicator line */}
            {on && <div style={{position:'absolute',top:0,left:'20%',right:'20%',height:1.5,background:col,borderRadius:1,opacity:0.8}}/>}

            {/* Icône */}
            <span style={{
              fontSize: isMobile ? (on ? 14 : 11) : (on ? 18 : 13),
              lineHeight:1,
              transition:'all .18s',
            }}>{cfg.icon}</span>

            {/* Label */}
            <span style={{fontFamily:F.mono,fontSize: isMobile ? (on ? 7 : 6) : (on ? 8 : 7),fontWeight:on?700:500,letterSpacing:'.06em',lineHeight:1,whiteSpace:'nowrap'}}>
              {cfg.short}
            </span>

            {/* Prix quand actif */}
            {on && cfg.price && !isMobile && (
              <span style={{fontFamily:F.mono,fontSize:9,color:`${col}80`,letterSpacing:'.04em',fontWeight:400}}>
                €{cfg.price}/j
              </span>
            )}

            {/* Barre occupation sous le bouton */}
            {!isAll && tot > 0 && (
              <div style={{width:'100%',height:1.5,borderRadius:1,background:'rgba(255,255,255,0.06)',overflow:'hidden',position:'relative'}}>
                <div style={{
                  position:'absolute',left:0,top:0,bottom:0,
                  width:`${pct*100}%`,
                  background:col,
                  opacity:0.7,
                  transition:'width .6s ease',
                }}/>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Helper hex → rgb
function hexToRgb(hex) {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ── DurationPicker ─────────────────────────────────────────────────────────────
function getBilling(days){
  if(days>=90)return{type:'annuel',   label:'ANNUEL',        short:'ANNUEL',   icon:'◈', discount:0.15, color:DS.gold,   desc:'−15% · engagement 90j'};
  if(days>=30)return{type:'mensuel',  label:'MENSUEL',       short:'MENSUEL',  icon:'◎', discount:0.10, color:DS.cyan,   desc:'−10% · engagement 30j+'};
  if(days>=7) return{type:'hebdo',    label:'HEBDOMADAIRE',  short:'HEBDO',    icon:'▣', discount:0.05, color:DS.violet, desc:'−5% · engagement 7j+'};
  return          {type:'comptant',   label:'COMPTANT',      short:'COMPTANT', icon:'▪', discount:0,    color:DS.textMid,desc:'Paiement unique'};
}

function DurationPicker({pricePerDay, col, onChange}){
  const[days,setDays]=useState(7);
  const billing=getBilling(days);
  const raw=pricePerDay*days;
  const total=Math.round(raw*(1-billing.discount));
  const saved=raw-total;

  useEffect(()=>{ onChange?.({days,total,billing}); },[days]);// eslint-disable-line

  const pct=((days-1)/89)*100;
  const trackGrad=`linear-gradient(90deg, ${col} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`;

  const SNAP=[1,7,30,90];

  return(
    <div style={{position:'relative',padding:'12px 14px',background:`${col}06`,border:`0.5px solid ${col}20`,marginBottom:10}}>
      <Brackets col={col} size={4} thickness={.5}/>

      {/* Titre */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <span style={{color:DS.textLo,fontFamily:F.mono,fontSize:6.5,letterSpacing:'.16em'}}>DURÉE·D'OCCUPATION</span>
        <div style={{
          display:'flex',alignItems:'center',gap:5,
          padding:'2px 8px',
          background:`${billing.color}14`,
          border:`0.5px solid ${billing.color}44`,
          borderRadius:4,
        }}>
          <span style={{fontSize:8,color:billing.color}}>{billing.icon}</span>
          <span style={{color:billing.color,fontFamily:F.mono,fontSize:7,fontWeight:700,letterSpacing:'.10em'}}>{billing.short}</span>
        </div>
      </div>

      {/* Slider */}
      <div style={{position:'relative',marginBottom:8}}>
        {/* Track */}
        <div style={{position:'relative',height:3,borderRadius:2,background:trackGrad,boxShadow:`0 0 6px ${col}30`,marginBottom:6}}/>
        <input type="range" min={1} max={90} value={days}
          onChange={e=>setDays(Number(e.target.value))}
          style={{
            position:'absolute',top:-5,left:0,width:'100%',
            WebkitAppearance:'none',appearance:'none',
            background:'transparent',outline:'none',cursor:'pointer',
            margin:0,padding:0,height:14,
          }}
          className="dur-slider"
        />
      </div>

      {/* Snap points labels */}
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,paddingTop:2}}>
        {SNAP.map(d=>(
          <button key={d} onClick={()=>setDays(d)}
            style={{
              background:'transparent',border:'none',outline:'none',cursor:'pointer',
              color:days===d?col:DS.textLo,
              fontFamily:F.mono,fontSize:6,letterSpacing:'.08em',
              padding:'2px 4px',
              borderBottom:`1px solid ${days===d?col:'transparent'}`,
              transition:'all .12s',
            }}
          >{d===1?'1J':d===7?'7J':d===30?'30J':'90J'}</button>
        ))}
      </div>

      {/* Valeur centrale */}
      <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:8}}>
        <span style={{color:col,fontFamily:F.mono,fontSize:30,fontWeight:700,lineHeight:1,textShadow:`0 0 20px ${col}60`}}>{days}</span>
        <span style={{color:`${col}55`,fontFamily:F.mono,fontSize:10,letterSpacing:'.10em'}}>JOUR{days>1?'S':''}</span>
        {billing.discount>0&&(
          <span style={{marginLeft:'auto',color:DS.green,fontFamily:F.mono,fontSize:8,letterSpacing:'.06em'}}>
            ÉCONOMIE·{(billing.discount*100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Prix total */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'7px 10px',
        background:`rgba(0,0,0,0.4)`,
        border:`0.5px solid ${col}18`,
        borderRadius:4,
      }}>
        <div>
          <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.12em',marginBottom:1}}>TOTAL HT</div>
          <div style={{color:DS.gold,fontFamily:F.mono,fontSize:18,fontWeight:700,letterSpacing:'.02em'}}>
            {(total/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €
          </div>
        </div>
        {saved>0&&(
          <div style={{textAlign:'right'}}>
            <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.12em',marginBottom:1}}>ÉCONOMIE</div>
            <div style={{color:DS.green,fontFamily:F.mono,fontSize:11,fontWeight:700}}>
              −{(saved/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} €
            </div>
          </div>
        )}
        <div style={{textAlign:'right'}}>
          <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.12em',marginBottom:1}}>MODE</div>
          <div style={{color:billing.color,fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.08em'}}>{billing.short}</div>
          <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:5.5}}>{billing.desc}</div>
        </div>
      </div>

      {/* CSS slider thumb */}
      <style>{`
        .dur-slider::-webkit-slider-thumb{
          -webkit-appearance:none;width:14px;height:14px;
          background:${col};border:1.5px solid ${col};
          clip-path:polygon(15% 0,85% 0,100% 15%,100% 85%,85% 100%,15% 100%,0 85%,0 15%);
          cursor:pointer;
          box-shadow:0 0 10px ${col},0 0 20px ${col}60;
          transition:box-shadow .12s;
        }
        .dur-slider::-moz-range-thumb{
          width:14px;height:14px;
          background:${col};border:1.5px solid ${col};
          clip-path:polygon(15% 0,85% 0,100% 15%,100% 85%,85% 100%,15% 100%,0 85%,0 15%);
          cursor:pointer;
          box-shadow:0 0 10px ${col},0 0 20px ${col}60;
        }
      `}</style>
    </div>
  );
}



// Hover data chip — minimal holographic readout
function HoverChip({info}){
  if(!info?.slot)return null;
  const{slot}=info;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const role=TIER_ROLE[slot.tier];
  return(
    <div style={{position:'absolute',bottom:58,left:'50%',transform:'translateX(-50%)',pointerEvents:'none',zIndex:35,animation:'hfadeUp .12s ease both'}}>
      <div style={{
        position:'relative',
        background:'rgba(0,6,18,0.96)',
        border:`0.5px solid ${col}44`,
        borderRadius:5,
        padding:'8px 16px',
        display:'flex',alignItems:'center',gap:12,
        boxShadow:`0 0 30px ${col}18,inset 0 0 30px rgba(0,200,240,0.02)`,
      }}>
        <ScanLines/>
        <Brackets col={col} size={6}/>
        {/* Icon */}
        <div style={{
          width:28,height:28,
          border:`1px solid ${col}44`,
          background:`${col}0a`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:14,color:col,flexShrink:0,
          borderRadius:4,
        }}>{role?.icon}</div>
        {/* Data */}
        <div style={{display:'flex',flexDirection:'column',gap:2,zIndex:2}}>
          <div style={{color:col,fontFamily:F.mono,fontSize:9,fontWeight:700,letterSpacing:'.14em'}}>
            {(TIER_LABEL[slot.tier]||slot.tier).toUpperCase()}
          </div>
          <div style={{color:DS.textLo,fontFamily:F.ui,fontSize:7,letterSpacing:'.06em'}}>
            {role?.role}
          </div>
        </div>
        {/* Divider */}
        <div style={{width:.5,height:24,background:`${col}28`}}/>
        {/* Price */}
        <div style={{display:'flex',flexDirection:'column',gap:2,alignItems:'flex-end',zIndex:2}}>
          <div style={{color:slot.occ?DS.green:DS.textMid,fontFamily:F.mono,fontSize:7,letterSpacing:'.10em'}}>
            {slot.occ?(slot.tenant?.name||'OCCUPÉ'):'DISPONIBLE'}
          </div>
          <div style={{color:DS.gold,fontFamily:F.mono,fontSize:10,fontWeight:700,letterSpacing:'.05em'}}>
            €{fmt(slot.tier)}<span style={{fontSize:7,opacity:.6}}>/J</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slot reveal panel — full holographic detail card
function SlotReveal({slot,onClose,onRent,onBuyout,onViewSlot,user}){
  const[ph,setPh]=useState(0);
  const[tick,setTick]=useState(0);
  const[booking,setBooking]=useState({days:7,total:0,billing:getBilling(7)});
  const isMobile=useIsMobile();
  useEffect(()=>{const id=requestAnimationFrame(()=>setPh(1));return()=>cancelAnimationFrame(id);},[]);
  useEffect(()=>{const id=setInterval(()=>setTick(t=>(t+1)%4),600);return()=>clearInterval(id);},[]);
  if(!slot)return null;
  const col=TIER_NEON[slot.tier]||DS.cyan;
  const label=(TIER_LABEL[slot.tier]||slot.tier).toUpperCase();
  const occ=slot.occ;const tenant=slot.tenant;const role=TIER_ROLE[slot.tier];
  const dots='....'.slice(0,tick+1);
  return(
    <div style={isMobile ? {
      position:'absolute', left:0, right:0, bottom:0,
      zIndex:45, pointerEvents:'none',
      display:'flex', alignItems:'flex-end',
    } : {
      position:'absolute',top:0,bottom:0,right:240,width:340,
      display:'flex',alignItems:'center',justifyContent:'flex-end',
      padding:'0 10px',zIndex:45,pointerEvents:'none',
    }}>
      <div style={isMobile ? {
        width:'100%', pointerEvents:'auto',
        opacity:ph?1:0,
        transform:ph?'none':'translateY(20px)',
        transition:'opacity .20s ease,transform .28s ease',
        position:'relative',
        background:'rgba(8,8,14,0.99)',
        border:`1px solid rgba(255,255,255,0.08)`,
        borderTop:`1px solid ${col}33`,
        borderBottom:'none',
        borderRadius:'16px 16px 0 0',
        boxShadow:`0 -8px 32px rgba(0,0,0,0.8)`,
        overflow:'hidden',
        maxHeight:'75vh',
        overflowY:'auto',
      } : {
        width:320,pointerEvents:'auto',
        opacity:ph?1:0,
        transform:ph?'none':'translateX(20px)',
        transition:'opacity .20s ease,transform .28s ease',
        position:'relative',
        background:'rgba(8,8,14,0.99)',
        border:`1px solid rgba(255,255,255,0.08)`,
        borderLeft:`2px solid ${col}55`,
        borderRadius:8,
        boxShadow:`0 8px 32px rgba(0,0,0,0.8)`,
        overflow:'hidden',
      }}>
        {/* Top accent bar */}
        <div style={{height:2,background:col,opacity:0.5}}/>

        {/* Header */}
        <div style={{padding:'12px 16px 10px',position:'relative',zIndex:2,borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{
                width:32,height:32,
                border:`1px solid ${col}33`,
                background:`${col}0c`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:16,color:col,
                borderRadius:6,
              }}>{role?.icon}</div>
              <div>
                <div style={{color:col,fontFamily:F.ui,fontSize:12,fontWeight:700,letterSpacing:'.04em'}}>{label}</div>
                <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:9,letterSpacing:'.06em',marginTop:2}}>{role?.role}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{
                padding:'3px 8px',
                border:`1px solid ${occ?DS.green:DS.textLo}22`,
                background:`${occ?DS.green:DS.textLo}08`,
                color:occ?DS.green:DS.textLo,
                fontFamily:F.mono,fontSize:8,letterSpacing:'.08em',
                display:'flex',alignItems:'center',gap:5,
                borderRadius:4,
              }}>
                <div style={{width:5,height:5,borderRadius:'50%',background:occ?DS.green:DS.textLo,opacity:occ?0.9:0.4}}/>
                {occ?'Actif':'Libre'}
              </div>
              <button onClick={onClose} style={{
                width:24,height:24,
                background:'transparent',
                border:`1px solid rgba(255,255,255,0.10)`,
                color:`rgba(255,255,255,0.4)`,
                fontFamily:F.mono,fontSize:11,
                cursor:'pointer',outline:'none',
                display:'flex',alignItems:'center',justifyContent:'center',
                borderRadius:4,
                transition:'all .12s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,0.8)';e.currentTarget.style.borderColor='rgba(255,255,255,0.25)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.4)';e.currentTarget.style.borderColor='rgba(255,255,255,0.10)';}}>✕</button>
            </div>
          </div>
          {/* Image zone */}
          {occ&&tenant?.img&&(
            <div style={{height:70,borderRadius:4,overflow:'hidden',position:'relative',border:`1px solid rgba(255,255,255,0.08)`}}>
              <div style={{position:'absolute',inset:0,backgroundImage:`url(${tenant.img})`,backgroundSize:'cover',backgroundPosition:'center',opacity:.5}}/>
              <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${col}08,transparent)`}}/>
            </div>
          )}
        </div>

        {/* Data grid */}
        <div style={{padding:'12px 16px',position:'relative',zIndex:2}}>
          {/* Description du tier */}
          <div style={{
            color:DS.textMid,fontFamily:F.ui,fontSize:10,lineHeight:1.6,
            marginBottom:10,paddingBottom:8,
            borderBottom:`1px solid rgba(255,255,255,0.05)`,
          }}>{role?.desc}</div>

          {occ && tenant ? (
            /* ── SLOT LOUÉ : afficher le contenu promu ── */
            <>
              {/* Nom + slogan de l'annonceur */}
              <div style={{marginBottom:10}}>
                <div style={{color:col,fontFamily:F.mono,fontSize:13,fontWeight:700,letterSpacing:'.04em',marginBottom:3}}>
                  {tenant.name}
                </div>
                {tenant.slogan&&<div style={{color:DS.textMid,fontFamily:F.ui,fontSize:9,lineHeight:1.55}}>{tenant.slogan}</div>}
              </div>

              {/* Stats — uniquement si connecté en tant qu'annonceur */}
              {user && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,marginBottom:10}}>
                  {[
                    ['TIER', label, col],
                    ['PRIX/J', `€${fmt(slot.tier)}`, DS.gold],
                    ['STATUT', 'ACTIF', DS.green],
                  ].map(([k,v,c])=>(
                    <div key={k} style={{
                      padding:'7px 6px',background:`${c}06`,
                      border:`0.5px solid ${c}1a`,textAlign:'center',position:'relative',
                    }}>
                      <Brackets col={c} size={4} thickness={.5}/>
                      <div style={{color:c,fontFamily:F.mono,fontSize:10,fontWeight:700,letterSpacing:'.04em',marginBottom:2}}>{v}</div>
                      <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.12em'}}>{k}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA principal → lien promu */}
              {tenant.url && tenant.url !== '#' && (
                <a
                  href={tenant.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                    padding:'11px 14px',marginBottom:8,width:'100%',
                    background:`${col}18`,border:`0.5px solid ${col}55`,
                    color:col,fontFamily:F.mono,fontSize:10,fontWeight:700,
                    letterSpacing:'.08em',textDecoration:'none',cursor:'pointer',
                    borderRadius:5,
                    boxShadow:`0 0 20px ${col}18`,
                  }}
                >
                  {tenant.cta||'VISITER'} <span style={{opacity:.6}}>→</span>
                </a>
              )}

              {/* Bouton Vue détaillée */}
              <LumBtn onClick={()=>onViewSlot?.(slot)} col={col}
                style={{width:'100%',marginBottom:8,borderRadius:5}}>
                VOIR LA PROMOTION
              </LumBtn>

              {/* RACHAT — toujours disponible */}
              <LumBtn onClick={()=>onBuyout(slot)} col={DS.textLo}
                style={{width:'100%',fontSize:9,borderRadius:5}}>
                PROPOSER UN RACHAT
              </LumBtn>
            </>
          ) : (
            /* ── SLOT LIBRE : afficher le picker de réservation ── */
            <>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,marginBottom:10}}>
                {[
                  ['TIER', label, col],
                  ['PRIX/J', `€${fmt(slot.tier)}`, DS.gold],
                  ['STATUT', 'LIBRE', DS.textLo],
                ].map(([k,v,c])=>(
                  <div key={k} style={{
                    padding:'7px 6px',background:`${c}06`,
                    border:`0.5px solid ${c}1a`,textAlign:'center',position:'relative',
                  }}>
                    <Brackets col={c} size={4} thickness={.5}/>
                    <div style={{color:c,fontFamily:F.mono,fontSize:10,fontWeight:700,letterSpacing:'.04em',marginBottom:2}}>{v}</div>
                    <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.12em'}}>{k}</div>
                  </div>
                ))}
              </div>

              <DurationPicker
                pricePerDay={TIER_PRICE[slot.tier]||100}
                col={col}
                onChange={b=>setBooking(b)}
              />

              <LumBtn onClick={()=>onRent({...slot,days:booking.days,total:booking.total,billing:booking.billing})} col={col} style={{width:'100%',borderRadius:6}}>
                Réserver · {booking.days}j · {(booking.total/100).toLocaleString('fr-FR',{minimumFractionDigits:2})} € →
              </LumBtn>
            </>
          )}
        </div>

        <div style={{height:1,background:'rgba(255,255,255,0.04)'}}/>
      </div>
    </div>
  );
}

// Sidebar — full Star Citizen mission panel
const Sidebar=memo(function Sidebar({slots,isLive,activeTier,onTierSelect,onViewSlot}){
  const[tab,setTab]=useState('cosmos');
  const[tick,setTick]=useState(0);
  const stats=useMemo(()=>{const c={};TIER_ORDER.forEach(t=>{c[t]=0;});(slots||[]).forEach(s=>{if(s?.occ&&c[s.tier]!==undefined)c[s.tier]++;});return c;},[slots]);
  const rev=TIER_ORDER.reduce((s,t)=>s+(stats[t]||0)*(TIER_PRICE[t]||0)/100,0);
  const totalOcc=Object.values(stats).reduce((s,v)=>s+v,0);
  useEffect(()=>{const id=setInterval(()=>setTick(t=>(t+1)%60),1000);return()=>clearInterval(id);},[]);

  return(
    <div style={{
      width:240,flexShrink:0,
      background:'rgba(8,8,14,0.98)',
      backdropFilter:'blur(20px)',
      WebkitBackdropFilter:'blur(20px)',
      borderLeft:`1px solid rgba(255,255,255,0.07)`,
      display:'flex',flexDirection:'column',
      zIndex:20,
      boxShadow:'-8px 0 32px rgba(0,0,0,0.7)',
      position:'relative',
      overflow:'hidden',
    }}>

      {/* Header */}
      <div style={{padding:'14px 16px 12px',borderBottom:`1px solid rgba(255,255,255,0.06)`,position:'relative',zIndex:2}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{
              width:28,height:28,
              border:`1px solid ${DS.gold}33`,
              background:`${DS.gold}0a`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:14,color:DS.gold,
              borderRadius:4,
            }}>◈</div>
            <div>
              <div style={{color:DS.textHi,fontFamily:F.ui,fontSize:12,fontWeight:700,letterSpacing:'.06em'}}>DYSON</div>
              <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:9,letterSpacing:'.08em',marginTop:1}}>COSMOS · MK VII</div>
            </div>
          </div>
          {isLive&&(
            <div style={{
              display:'flex',alignItems:'center',gap:5,
              padding:'3px 8px',
              border:`1px solid ${DS.green}33`,
              background:`${DS.green}0a`,
              borderRadius:4,
            }}>
              <div style={{width:5,height:5,borderRadius:'50%',background:DS.green,animation:'hpulse 1.4s ease-in-out infinite'}}/>
              <span style={{color:DS.green,fontFamily:F.mono,fontSize:9,fontWeight:600,letterSpacing:'.08em'}}>LIVE</span>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          {/* Row 1 : COSMOS + TIERS */}
          <div style={{display:'flex',gap:2}}>
            {[['cosmos','Cosmos'],['tiers','Tiers']].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                flex:1,padding:'6px 0',
                background:tab===id?`${DS.cyan}14`:'transparent',
                border:`1px solid ${tab===id?DS.cyan+'44':'rgba(255,255,255,0.06)'}`,
                borderRadius:5,
                color:tab===id?DS.cyan:DS.textLo,
                fontFamily:F.ui,fontSize:11,fontWeight:tab===id?700:500,
                letterSpacing:'.04em',cursor:'pointer',outline:'none',
                transition:'all .12s',
              }}>{lbl}</button>
            ))}
          </div>
          {/* Row 2 : ACTIFS + DISPONIBLES */}
          <div style={{display:'flex',gap:2}}>
            {[['actifs','Actifs',DS.green],['dispo','Disponibles',DS.gold]].map(([id,lbl,col])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                flex:1,padding:'6px 0',
                background:tab===id?`${col}12`:'transparent',
                border:`1px solid ${tab===id?col+'44':'rgba(255,255,255,0.06)'}`,
                borderRadius:5,
                color:tab===id?col:DS.textLo,
                fontFamily:F.ui,fontSize:11,fontWeight:tab===id?700:500,
                letterSpacing:'.04em',cursor:'pointer',outline:'none',
                transition:'all .12s',
                display:'flex',alignItems:'center',justifyContent:'center',gap:5,
              }}>
                {tab===id&&<div style={{width:5,height:5,borderRadius:'50%',background:col,flexShrink:0,opacity:0.9}}/>}
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',position:'relative',zIndex:2}}>
        {(()=>{
          /* ── COSMOS ── */
          if(tab==='cosmos') return (
            <div>
              {[
                {tier:'epicenter',label:'ÉPICENTRE',    sub:'1 slot · noyau',      extra:'Icosaèdre cristallin'},
                {tier:'prestige', label:'LUNES',         sub:'8 corps orbitaux',    extra:'Planétoïdes PBR'},
                {tier:'elite',    label:'ANNEAUX DYSON', sub:'6 anneaux · 50 slots',extra:'Mégastructures orbitales'},
                {tier:'business', label:'PANNEAUX',      sub:'176 slots · sphère',  extra:'Faces ico sub-3'},
                {tier:'standard', label:'ÉMETTEURS',     sub:'400 slots · sphère',  extra:'Maillage complet'},
                {tier:'viral',    label:'DRONES',        sub:'671 nano-vecteurs',   extra:'Essaim orbital'},
              ].map(({tier,label,sub,extra})=>{
                const col=TIER_NEON[tier];
                const occ=stats[tier]||0;
                const tot=TIER_TOTALS[tier];
                const role=TIER_ROLE[tier];
                const isFocus=activeTier===TIER_ORDER.indexOf(tier);
                const segs=Math.min(tot,12);
                return(
                  <div key={tier}
                    onClick={()=>onTierSelect(isFocus?-1:TIER_ORDER.indexOf(tier))}
                    style={{
                      padding:'8px 14px 8px 10px',
                      borderLeft:`2px solid ${isFocus?col:'transparent'}`,
                      borderBottom:`1px solid rgba(255,255,255,0.04)`,
                      cursor:'pointer',
                      background:isFocus?`${col}08`:'transparent',
                      transition:'all .12s',
                      position:'relative',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background=`${col}06`}
                    onMouseLeave={e=>e.currentTarget.style.background=isFocus?`${col}08`:'transparent'}
                  >
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                      <div style={{
                        width:24,height:24,flexShrink:0,
                        border:`1px solid ${col}${isFocus?'44':'1a'}`,
                        background:`${col}${isFocus?'10':'06'}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:11,color:`${col}${isFocus?'ee':'55'}`,
                        borderRadius:4,
                        borderRadius:tier==='epicenter'?'50%':0,
                      }}>{role?.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:isFocus?col:DS.textMid,fontFamily:F.mono,fontSize:8.5,fontWeight:700,letterSpacing:'.08em'}}>{label}</div>
                        <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.06em'}}>{sub}</div>
                      </div>
                      <div style={{fontFamily:F.mono,fontSize:8,fontWeight:700,color:isFocus?col:DS.textLo,letterSpacing:'.02em'}}>
                        €{fmt(tier)}
                      </div>
                    </div>
                    <div style={{paddingLeft:29}}>
                      <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
                        <div style={{flex:1,display:'flex',gap:1}}>
                          {Array.from({length:segs},(_,si)=>{
                            const filled=si<Math.round(occ/tot*segs);
                            return <div key={si} style={{flex:1,height:2,background:filled?col:`${col}18`,transition:'background .4s'}}/>;
                          })}
                        </div>
                        <span style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.05em'}}>{occ}/{tot}</span>
                      </div>
                      <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.06em',opacity:.7}}>{extra}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );

          /* ── TIERS ── */
          if(tab==='tiers') return (
            <div>
              {TIER_ORDER.map(tier=>{
                const col=TIER_NEON[tier];
                const occ=stats[tier]||0;
                const tot=TIER_TOTALS[tier];
                const role=TIER_ROLE[tier];
                return(
                  <div key={tier} style={{
                    padding:'9px 14px',
                    borderBottom:`0.5px solid rgba(0,200,240,0.05)`,
                    transition:'background .10s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${col}05`}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                      <div style={{
                        width:24,height:24,flexShrink:0,
                        border:`1px solid ${col}44`,
                        background:`${col}0a`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:12,color:`${col}88`,
                        borderRadius:4,
                        borderRadius:tier==='epicenter'?'50%':0,
                      }}>{role?.icon}</div>
                      <div>
                        <div style={{color:`${col}cc`,fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.10em'}}>{role?.role}</div>
                        <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6.5}}>€{fmt(tier)}/j · {tot} slots</div>
                      </div>
                    </div>
                    <div style={{color:DS.textMid,fontFamily:F.ui,fontSize:7.5,lineHeight:1.6,paddingLeft:31,marginBottom:3}}>{role?.desc}</div>
                    <div style={{display:'flex',justifyContent:'space-between',paddingLeft:31}}>
                      <span style={{color:DS.textLo,fontFamily:F.mono,fontSize:6}}>{occ}/{tot} OCCUPÉS</span>
                      <span style={{color:occ>0?`${col}88`:DS.textLo,fontFamily:F.mono,fontSize:6}}>{Math.round(occ/tot*100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );

          /* ── ACTIFS ── */
          if(tab==='actifs'){
            const occupied=(slots||[]).filter(s=>s?.occ&&s?.tenant);
            if(occupied.length===0) return(
              <div style={{padding:'32px 14px',textAlign:'center'}}>
                <div style={{fontSize:22,marginBottom:10,opacity:.4}}>◯</div>
                <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:8,letterSpacing:'.12em'}}>AUCUN SLOT ACTIF</div>
              </div>
            );
            return(
              <div>
                <div style={{padding:'7px 14px',borderBottom:`0.5px solid rgba(0,200,240,0.06)`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:DS.textLo,fontFamily:F.mono,fontSize:6.5,letterSpacing:'.12em'}}>{occupied.length} SLOTS ACTIFS</span>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <div style={{width:4,height:4,borderRadius:'50%',background:DS.green,animation:'hpulse 1.4s ease-in-out infinite'}}/>
                    <span style={{color:DS.green,fontFamily:F.mono,fontSize:6,letterSpacing:'.10em'}}>LIVE</span>
                  </div>
                </div>
                {occupied.map((slot,i)=>{
                  const col=TIER_NEON[slot.tier]||DS.cyan;
                  const tn=slot.tenant;
                  const name=tn?.name||tn?.title||'—';
                  const url=tn?.url||'';
                  const type=tn?.t||'';
                  const tierLabel=TIER_LABEL[slot.tier]||slot.tier;
                  const typeIcon={video:'▶',image:'◻',link:'⌖',social:'⊕',music:'♪',app:'⬡',brand:'⬟',text:'≡'}[type]||'◈';
                  return(
                    <div key={slot.id||i}
                      onClick={()=>onViewSlot&&onViewSlot(slot)}
                      style={{
                        padding:'7px 14px 7px 10px',
                        borderLeft:`2px solid ${col}${onViewSlot?'70':'40'}`,
                        borderBottom:`0.5px solid rgba(0,200,240,0.04)`,
                        transition:'background .10s',
                        cursor:onViewSlot?'pointer':'default',
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${col}0e`;if(onViewSlot)e.currentTarget.style.borderLeftColor=`${col}cc`;}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderLeftColor=`${col}${onViewSlot?'70':'40'}`;}}
                    >
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                        <div style={{
                          width:18,height:18,flexShrink:0,
                          background:`${col}12`,
                          border:`0.5px solid ${col}33`,
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:9,color:`${col}cc`,
                          borderRadius:4,
                        }}>{typeIcon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:DS.textHi,fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.04em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
                          {url&&<div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.04em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{url.replace(/^https?:\/\/(www\.)?/,'')}</div>}
                        </div>
                        <div style={{padding:'1px 5px',background:`${col}14`,border:`0.5px solid ${col}33`,color:col,fontFamily:F.mono,fontSize:5.5,fontWeight:700,letterSpacing:'.10em',flexShrink:0,borderRadius:3}}>{tierLabel.toUpperCase()}</div>
                        {onViewSlot&&<span style={{color:`${col}55`,fontSize:8,flexShrink:0,marginLeft:2}}>›</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          /* ── DISPONIBLES ── */
          if(tab==='dispo'){
            const freeByTier=TIER_ORDER.map(tier=>({
              tier,
              free:TIER_TOTALS[tier]-(stats[tier]||0),
              tot:TIER_TOTALS[tier],
              occ:stats[tier]||0,
            })).filter(t=>t.free>0);
            return(
              <div>
                <div style={{padding:'7px 14px',borderBottom:`0.5px solid rgba(0,200,240,0.06)`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:DS.textLo,fontFamily:F.mono,fontSize:6.5,letterSpacing:'.12em'}}>{freeByTier.reduce((s,t)=>s+t.free,0)} SLOTS LIBRES</span>
                  <span style={{color:DS.gold,fontFamily:F.mono,fontSize:6,letterSpacing:'.10em'}}>RÉSERVABLES</span>
                </div>
                {freeByTier.map(({tier,free,tot,occ})=>{
                  const col=TIER_NEON[tier]||DS.cyan;
                  const role=TIER_ROLE[tier];
                  const pct=Math.round(free/tot*100);
                  const cfg=TIER_CONFIG[tier];
                  return(
                    <div key={tier}
                      onClick={()=>onTierSelect(TIER_ORDER.indexOf(tier))}
                      style={{padding:'9px 14px 9px 10px',borderLeft:`2px solid ${DS.gold}55`,borderBottom:`0.5px solid rgba(0,200,240,0.04)`,cursor:'pointer',transition:'background .10s'}}
                      onMouseEnter={e=>e.currentTarget.style.background=`${DS.gold}06`}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                        <div style={{width:20,height:20,flexShrink:0,border:`1px solid ${DS.gold}40`,background:`${DS.gold}0a`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:`${DS.gold}88`,borderRadius:4,borderRadius:tier==='epicenter'?'50%':0}}>{role?.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:DS.textMid,fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.08em'}}>{(cfg?.label||tier).toUpperCase()}</div>
                          <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6}}>€{fmt(tier)}/j</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{color:DS.gold,fontFamily:F.mono,fontSize:11,fontWeight:700,letterSpacing:'.02em',lineHeight:1}}>{free}</div>
                          <div style={{color:`${DS.gold}55`,fontFamily:F.mono,fontSize:5.5,letterSpacing:'.06em'}}>LIBRES</div>
                        </div>
                      </div>
                      <div style={{paddingLeft:27}}>
                        <div style={{display:'flex',gap:1,marginBottom:3}}>
                          {Array.from({length:Math.min(tot,16)},(_,si)=>{
                            const usedCount=Math.round(occ/tot*Math.min(tot,16));
                            return <div key={si} style={{flex:1,height:2,background:si>=usedCount?`${DS.gold}60`:`${col}25`,transition:'background .3s'}}/>;
                          })}
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <span style={{color:`${DS.gold}70`,fontFamily:F.mono,fontSize:6,letterSpacing:'.06em'}}>{pct}% DISPONIBLE</span>
                          <span style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.04em'}}>{occ}/{tot} OCC</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return null;
        })()}
      </div>

      {/* Footer — revenue */}
      <div style={{padding:'10px 14px',borderTop:`0.5px solid rgba(0,200,240,0.10)`,position:'relative',zIndex:2}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
          <span style={{color:DS.textLo,fontFamily:F.mono,fontSize:6.5,letterSpacing:'.14em'}}>REVENUS·/·JOUR</span>
          <span style={{color:DS.gold,fontFamily:F.mono,fontSize:15,fontWeight:700,letterSpacing:'.02em'}}>{rev.toLocaleString('fr-FR')} €</span>
        </div>
        <Sep col={DS.gold} style={{marginBottom:5,opacity:.3}}/>
        {/* Multi-tier bar */}
        <div style={{display:'flex',gap:1.5,marginBottom:5}}>
          {TIER_ORDER.map(t=>{
            const c=TIER_NEON[t],o=stats[t]||0,tot=TIER_TOTALS[t];
            return <div key={t} title={`${t}: ${o}/${tot}`} style={{flex:1,height:2,background:o>0?c:DS.glassBrd,opacity:.15+.85*(o/tot||0),transition:'all .5s'}}/>;
          })}
        </div>
        <div style={{
          display:'flex',justifyContent:'space-between',
          color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.10em',
        }}>
          <span>{totalOcc} ACTIFS</span>
          <span>SYS·{String(tick).padStart(2,'0')}</span>
          <span>{1306-totalOcc} LIBRES</span>
        </div>
      </div>
    </div>
  );
});

// Inside chip — danger overlay
function InsideChip(){
  return(
    <div style={{position:'absolute',top:11,left:'50%',transform:'translateX(-50%)',zIndex:30,animation:'hfadeUp .3s ease both'}}>
      <div style={{
        position:'relative',
        display:'flex',alignItems:'center',gap:6,
        padding:'4px 14px',
        background:'rgba(0,4,18,0.95)',
        border:`0.5px solid ${DS.violet}55`,
        borderRadius:5,
        boxShadow:`0 0 20px ${DS.violet}22`,
      }}>
        <ScanLines/>
        <div style={{width:5,height:5,borderRadius:'50%',background:DS.violet,animation:'hpulse 1.8s ease-in-out infinite'}}/>
        <span style={{color:`${DS.violet}cc`,fontFamily:F.mono,fontSize:7,fontWeight:700,letterSpacing:'.18em',zIndex:2}}>VUE·INTÉRIEURE · DYSON·COSMOS</span>
      </div>
    </div>
  );
}

// HUD Loader — Star Citizen boot sequence
function HUDLoader(){
  const[step,setStep]=useState(0);
  const[pct,setPct]=useState(0);
  const lines=[
    'INIT DYSON·COSMOS PIPELINE v7',
    'CHARGEMENT STARFIELD AAA [22 000 ÉTOILES]',
    'COMPILATION SHADERS GPU HAUTE FIDÉLITÉ',
    'CONSTRUCTION SPHÈRE DYSON [SUB·3]',
    'DÉPLOIEMENT ANNEAUX ORBITAUX [×6]',
    'SYNCHRONISATION LUNES PRESTIGE [×8]',
    'CALIBRATION POST·PROCESS BLOOM+SSAO',
    'SYSTÈME PRÊT',
  ];
  useEffect(()=>{
    const id=setInterval(()=>{
      setPct(p=>{
        const np=Math.min(100,p+Math.random()*8+2);
        setStep(Math.floor(np/100*lines.length));
        return np;
      });
    },120);
    return()=>clearInterval(id);
  },[]);
  return(
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28,background:DS.void,zIndex:50}}>
      <ScanLines col='rgba(0,200,240,0.03)'/>
      {/* Hexagonal spinner */}
      <div style={{position:'relative',width:90,height:90}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{
            position:'absolute',inset:i*11,
            border:`0.5px solid rgba(${['232,160,32','0,200,230','128,96,200','0,216,128'][i]},.${['55','40','25','15'][i]})`,
            borderRadius:'50%',
            animation:`hspin ${[1.2,1.8,2.6,3.4][i]}s linear infinite ${i%2?'reverse':''}`,
          }}/>
        ))}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{
            width:14,height:14,
            border:`1.5px solid ${DS.gold}`,
            borderRadius:'50%',
            background:`${DS.gold}18`,
            animation:'hpulse 1.5s ease-in-out infinite',
          }}/>
        </div>
      </div>

      {/* Boot text */}
      <div style={{textAlign:'center',width:280}}>
        <div style={{color:DS.gold,fontFamily:F.mono,fontSize:11,fontWeight:700,letterSpacing:'.28em',marginBottom:4}}>DYSON·COSMOS</div>
        <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.20em',marginBottom:14}}>ADVERTISING MEGASTRUCTURE SYSTEM</div>

        {/* Progress bar */}
        <div style={{
          position:'relative',
          height:2,
          background:'rgba(0,200,240,0.08)',
          border:`0.5px solid ${DS.cyan}22`,
          marginBottom:10,
          overflow:'hidden',
        }}>
          <div style={{
            position:'absolute',left:0,top:0,bottom:0,
            width:`${pct}%`,
            background:`linear-gradient(90deg,${DS.cyan}88,${DS.cyan})`,
            boxShadow:`0 0 8px ${DS.cyan}`,
            transition:'width .1s linear',
          }}/>
        </div>

        {/* Boot lines */}
        <div style={{textAlign:'left',height:50,overflow:'hidden'}}>
          {lines.slice(Math.max(0,step-3),step+1).map((l,i)=>(
            <div key={i} style={{
              color:i===lines.slice(Math.max(0,step-3),step+1).length-1?DS.cyan:DS.textLo,
              fontFamily:F.mono,fontSize:6.5,letterSpacing:'.08em',
              marginBottom:2,
              opacity:i===lines.slice(Math.max(0,step-3),step+1).length-1?1:0.4,
            }}>
              <span style={{color:DS.gold,marginRight:6}}>{'>'}</span>{l}
              {i===lines.slice(Math.max(0,step-3),step+1).length-1&&<span style={{animation:'hpulse .8s ease-in-out infinite'}}>_</span>}
            </div>
          ))}
        </div>

        <div style={{color:DS.textLo,fontFamily:F.mono,fontSize:6,letterSpacing:'.14em',marginTop:4}}>
          {Math.floor(pct)}% · PIPELINE v7 GPU
        </div>
      </div>
    </div>
  );
}



// ══════════════════════════════════════════════════════════════════════════════
// FLATVIEW 2D — Vue Orbitale · Vercel-inspired flat map
// Transition 3D→2D : perspective fold + morphing scale
// ══════════════════════════════════════════════════════════════════════════════

const TIER_RING_CONFIG = {
  epicenter: { ringR:0.00, dotR:18, total:1    },
  prestige:  { ringR:0.09, dotR:12, total:8    },
  elite:     { ringR:0.17, dotR: 8, total:50   },
  business:  { ringR:0.30, dotR: 5, total:176  },
  standard:  { ringR:0.46, dotR: 3, total:400  },
  viral:     { ringR:0.63, dotR: 2, total:671  },
};

function FlatView2D({ slots=[], onSlotSelect, activeFilter, visible=false }) {
  const canvasRef  = useRef(null);
  const hovRef     = useRef(null);
  const layoutRef  = useRef([]);
  const [hov, setHov]     = useState(null);
  const [entered, setEntered] = useState(false);
  const pal = FILTER_PALETTES[activeFilter] || FILTER_PALETTES.realist;

  const slotsByTier = useMemo(() => {
    const m = {};
    TIER_ORDER.forEach(t => { m[t] = []; });
    slots.forEach(s => { if (m[s.tier]) m[s.tier].push(s); });
    return m;
  }, [slots]);

  // Staggered entry on visible change
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setEntered(true), 40);
      return () => clearTimeout(t);
    } else {
      setEntered(false);
    }
  }, [visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, t0 = performance.now();

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function buildLayout() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      const cx = W * 0.5, cy = H * 0.5;
      const maxR = Math.min(W, H) * 0.44;
      const layout = [];
      TIER_ORDER.forEach(tier => {
        const cfg   = TIER_RING_CONFIG[tier];
        const tSlots = slotsByTier[tier] || [];
        const total = cfg.total;
        const ringR = cfg.ringR * maxR * 2.5;
        if (tier === 'epicenter') {
          const slot = tSlots[0] || null;
          layout.push({ tier, x:cx, y:cy, r:cfg.dotR, slot, occ: !!(slot?.occ ?? slot?.status==='active') });
          return;
        }
        const gapFactor = tier === 'viral' ? 2.0 : tier === 'standard' ? 2.2 : 2.6;
        const dotsPerRing = Math.max(1, Math.floor((2 * Math.PI * ringR) / (cfg.dotR * 2 * gapFactor)));
        const rings = Math.ceil(total / dotsPerRing);
        let idx = 0;
        for (let ring = 0; ring < rings && idx < total; ring++) {
          const r = ringR + ring * cfg.dotR * 2.6;
          const count = Math.min(dotsPerRing, total - idx);
          const offsetAngle = (ring % 2) * (Math.PI / count);
          for (let i = 0; i < count; i++, idx++) {
            const angle = (i / count) * Math.PI * 2 + offsetAngle - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            const slot = tSlots[idx] || null;
            layout.push({ tier, x, y, r:cfg.dotR, slot, occ: !!(slot?.occ ?? (slot?.status === 'active')), angle, ring });
          }
        }
      });
      return layout;
    }

    function hexColor(hex, alpha) {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function drawDotGrid(W, H) {
      // Vercel-style subtle dot grid background
      const spacing = 24;
      ctx.fillStyle = 'rgba(255,255,255,0.018)';
      for (let x = spacing; x < W; x += spacing) {
        for (let y = spacing; y < H; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function draw() {
      const t = (performance.now() - t0) / 1000;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // ── Background — deep black with radial vignette ──
      ctx.fillStyle = '#000810';
      ctx.fillRect(0, 0, W, H);
      const vignette = ctx.createRadialGradient(W*.5, H*.5, 0, W*.5, H*.5, Math.max(W,H)*.65);
      vignette.addColorStop(0, 'rgba(0,12,28,0)');
      vignette.addColorStop(1, 'rgba(0,4,10,0.6)');
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);

      // ── Dot grid ──
      drawDotGrid(W, H);

      const layout = buildLayout();
      layoutRef.current = layout;
      const hovItem = hovRef.current;
      const cx = W*.5, cy = H*.5, maxR = Math.min(W,H)*.44;

      // ── Ring guide lines — dashed, minimal ──
      TIER_ORDER.forEach(tier => {
        if (tier === 'epicenter') return;
        const cfg = TIER_RING_CONFIG[tier];
        const ringR = cfg.ringR * maxR * 2.5;
        const col = pal[tier] || TIER_NEON[tier];
        ctx.save();
        ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI*2);
        ctx.strokeStyle = hexColor(col, 0.07);
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // ── Central glow behind epicenter ──
      const epicGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.6);
      const epicCol = pal.epicenter || TIER_NEON.epicenter;
      epicGlow.addColorStop(0, hexColor(epicCol, 0.04));
      epicGlow.addColorStop(0.4, hexColor(epicCol, 0.012));
      epicGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = epicGlow;
      ctx.fillRect(cx - maxR, cy - maxR, maxR * 2, maxR * 2);

      // ── Dots ──
      layout.forEach(({ tier, x, y, r, slot, occ }) => {
        const col = pal[tier] || TIER_NEON[tier];
        const isHov = hovItem && slot && (hovItem.slot?.id || hovItem.slot?._id) && 
                      (hovItem.slot?.id || hovItem.slot?._id) === (slot?.id || slot?._id);

        if (occ) {
          // Pulse phase — unique per position for organic feel
          const phase = (x * 0.019 + y * 0.013) % (Math.PI * 2);
          const pulse = 0.93 + 0.07 * Math.sin(t * 1.2 + phase);
          const rr = r * pulse * (isHov ? 1.45 : 1.0);

          // Outer glow — only for larger dots (prestige+)
          if (r >= 5) {
            const glowR = rr * (isHov ? 4.5 : 3.2);
            const grd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            grd.addColorStop(0, hexColor(col, isHov ? 0.22 : 0.14));
            grd.addColorStop(0.5, hexColor(col, isHov ? 0.08 : 0.04));
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI*2);
            ctx.fillStyle = grd; ctx.fill();
          }

          // Mid ring halo for hovered items
          if (isHov && r >= 3) {
            ctx.beginPath(); ctx.arc(x, y, rr * 2.2, 0, Math.PI*2);
            ctx.strokeStyle = hexColor(col, 0.25);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }

          // Main dot — gradient fill for depth
          const dotGrd = ctx.createRadialGradient(x - rr*0.3, y - rr*0.3, 0, x, y, rr);
          dotGrd.addColorStop(0, hexColor(col, isHov ? 1.0 : 0.90));
          dotGrd.addColorStop(0.6, hexColor(col, isHov ? 0.85 : 0.68));
          dotGrd.addColorStop(1, hexColor(col, isHov ? 0.60 : 0.40));
          ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI*2);
          ctx.fillStyle = dotGrd; ctx.fill();

          // Crisp border
          ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI*2);
          ctx.strokeStyle = hexColor(col, isHov ? 1.0 : 0.70);
          ctx.lineWidth = isHov ? 1.5 : 0.8;
          ctx.stroke();

          // Epicenter crosshair
          if (tier === 'epicenter') {
            ctx.save();
            ctx.strokeStyle = hexColor(col, 0.55);
            ctx.lineWidth = 1.2;
            const arm = rr * 0.7;
            ctx.beginPath(); ctx.moveTo(x-arm, y); ctx.lineTo(x+arm, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y-arm); ctx.lineTo(x, y+arm); ctx.stroke();
            // Outer ring
            ctx.beginPath(); ctx.arc(x, y, rr + 5, 0, Math.PI*2);
            ctx.strokeStyle = hexColor(col, 0.30);
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
          }

          // Name label for large enough dots
          if (r >= 10 && slot?.display_name) {
            ctx.save();
            ctx.shadowColor = hexColor(col, 0.6);
            ctx.shadowBlur = 4;
            ctx.font = `700 ${Math.max(6.5, r * 0.52)}px "JetBrains Mono",monospace`;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(slot.display_name.toUpperCase().slice(0, 6), x, y);
            ctx.restore();
          }

          // Inline label for smaller hovered dots
          if (isHov && r < 10 && slot?.display_name) {
            const side = x > W * .5 ? 1 : -1;
            const lx = x + side * (rr + 10);
            ctx.save();
            ctx.shadowColor = hexColor(col, 0.5);
            ctx.shadowBlur = 6;
            ctx.font = `700 8px "JetBrains Mono",monospace`;
            ctx.fillStyle = hexColor(col, 0.95);
            ctx.textAlign = side > 0 ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(slot.display_name.toUpperCase().slice(0, 14), lx, y);
            ctx.restore();
            // Connector line
            ctx.beginPath();
            ctx.moveTo(x + side * rr, y);
            ctx.lineTo(lx + side * -4, y);
            ctx.strokeStyle = hexColor(col, 0.25);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

        } else {
          // Empty slot — minimal ghost dot
          const dotR = Math.max(r * 0.32, 1.0);
          ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI*2);
          ctx.fillStyle = hexColor(col, isHov ? 0.28 : 0.07);
          ctx.fill();
        }
      });

      // ── Tier ring labels — right side, clean alignment ──
      const labelX = cx + maxR * 2.5 + 14;
      let labelStack = []; // collect for smart Y positioning
      TIER_ORDER.forEach(tier => {
        if (tier === 'epicenter') return;
        const cfg  = TIER_RING_CONFIG[tier];
        const ringR = cfg.ringR * maxR * 2.5;
        const col  = pal[tier] || TIER_NEON[tier];
        const occ  = (slotsByTier[tier] || []).filter(s => s.occ || s.status==='active').length;
        const total = cfg.total;
        const pct = total > 0 ? occ / total : 0;

        // Label on the right of the outermost ring edge
        const lx = cx + ringR + 10;
        const ly = cy;

        // Tier name
        ctx.font = `600 7px "JetBrains Mono",monospace`;
        ctx.fillStyle = hexColor(col, 0.55);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(tier.toUpperCase(), lx, ly - 5);

        // Count
        ctx.font = `500 6.5px "JetBrains Mono",monospace`;
        ctx.fillStyle = hexColor(col, 0.32);
        ctx.fillText(`${occ}/${total}`, lx, ly + 5);
      });

      // Epicenter label
      {
        const col = pal.epicenter || TIER_NEON.epicenter;
        const occ = (slotsByTier.epicenter || []).filter(s => s.occ || s.status==='active').length;
        ctx.font = `700 7px "JetBrains Mono",monospace`;
        ctx.fillStyle = hexColor(col, 0.50);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`ÉPICENTRE · ${occ}/1`, cx, cy + TIER_RING_CONFIG.epicenter.dotR + 10);
      }

      // ── Bottom watermark ──
      ctx.font = `500 7px "JetBrains Mono",monospace`;
      ctx.fillStyle = 'rgba(0,200,240,0.08)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('DYSON · COSMOS · ORBITAL MAP · v7', W * .5, H - 12);

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [slots, activeFilter, slotsByTier, pal]);

  function handleMouseMove(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found = null;
    for (const item of layoutRef.current) {
      if (Math.hypot(mx - item.x, my - item.y) <= Math.max(item.r * 1.9, 6)) { found = item; break; }
    }
    hovRef.current = found; setHov(found);
  }
  function handleClick(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const item of layoutRef.current) {
      if (Math.hypot(mx - item.x, my - item.y) <= Math.max(item.r * 1.9, 6)) {
        onSlotSelect && onSlotSelect(item.slot || { tier: item.tier }); return;
      }
    }
  }

  const hovCol = hov ? (pal[hov.tier] || TIER_NEON[hov.tier] || '#00C8E4') : '#00C8E4';
  const cW = canvasRef.current?.offsetWidth || 0;

  return (
    <div style={{
      position:'absolute', inset:0,
      opacity: entered ? 1 : 0,
      transform: entered ? 'perspective(1800px) rotateX(0deg) scale(1)' : 'perspective(1800px) rotateX(8deg) scale(0.97)',
      transition: 'opacity 0.55s cubic-bezier(.16,1,.3,1), transform 0.55s cubic-bezier(.16,1,.3,1)',
      transformOrigin: '50% 40%',
    }}>
      <canvas
        ref={canvasRef}
        style={{ width:'100%', height:'100%', display:'block', cursor: hov?.occ ? 'pointer' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => { hovRef.current = null; setHov(null); }}
      />

      {/* ── Vercel-style tier legend — bottom left ── */}
      <div style={{
        position:'absolute', bottom:28, left:20,
        display:'flex', flexDirection:'column', gap:5,
        pointerEvents:'none',
      }}>
        {TIER_ORDER.map(tier => {
          const col = pal[tier] || TIER_NEON[tier];
          const occ = (slotsByTier[tier] || []).filter(s => s?.occ || s?.status==='active').length;
          const tot = TIER_RING_CONFIG[tier].total;
          const pct = tot > 0 ? occ / tot : 0;
          return (
            <div key={tier} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: col,
                opacity: occ > 0 ? 0.85 : 0.20,
                boxShadow: occ > 0 ? `0 0 5px ${col}60` : 'none',
              }}/>
              <span style={{
                fontFamily:'"JetBrains Mono",monospace', fontSize:7,
                color: occ > 0 ? `${col}90` : 'rgba(255,255,255,0.18)',
                letterSpacing:'.10em', fontWeight: 600,
                minWidth: 52,
              }}>{tier.toUpperCase()}</span>
              {/* Mini progress bar */}
              <div style={{ width:40, height:2, background:'rgba(255,255,255,0.06)', position:'relative', overflow:'hidden' }}>
                <div style={{
                  position:'absolute', left:0, top:0, bottom:0,
                  width:`${pct * 100}%`,
                  background: col, opacity: 0.6,
                  transition:'width .5s ease',
                }}/>
              </div>
              <span style={{
                fontFamily:'"JetBrains Mono",monospace', fontSize:6.5,
                color:'rgba(255,255,255,0.22)', letterSpacing:'.04em',
                minWidth:28, textAlign:'right',
              }}>{occ}<span style={{opacity:.5}}>/{tot}</span></span>
            </div>
          );
        })}
      </div>

      {/* ── Hover tooltip — Vercel-style card ── */}
      {hov?.occ && (
        <div style={{
          position:'absolute',
          left: hov.x > cW * .55 ? 'auto' : hov.x + Math.max(hov.r, 8) + 16,
          right: hov.x > cW * .55 ? cW - hov.x + Math.max(hov.r, 8) + 16 : 'auto',
          top: Math.max(12, hov.y - 42),
          pointerEvents:'none', zIndex:60,
          animation:'flatHovIn 0.15s cubic-bezier(.16,1,.3,1) both',
        }}>
          {/* Card */}
          <div style={{
            background:'rgba(4,8,20,0.97)',
            border:`1px solid ${hovCol}28`,
            borderTop:`1px solid ${hovCol}50`,
            borderRadius:8,
            padding:'10px 14px',
            minWidth:140, maxWidth:220,
            boxShadow:`0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px ${hovCol}18`,
            backdropFilter:'blur(12px)',
          }}>
            {/* Tier badge */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7,
            }}>
              <div style={{
                fontFamily:'"JetBrains Mono",monospace', fontSize:7.5, letterSpacing:'.14em',
                color: hovCol, fontWeight:700,
                background:`${hovCol}14`, border:`0.5px solid ${hovCol}30`,
                padding:'2px 7px', borderRadius:3,
              }}>{hov.tier.toUpperCase()}</div>
              <div style={{
                display:'flex', alignItems:'center', gap:4,
                fontFamily:'"JetBrains Mono",monospace', fontSize:7,
                color: hov.occ ? '#00D880' : 'rgba(255,255,255,0.25)',
              }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background: hov.occ ? '#00D880' : 'rgba(255,255,255,0.20)' }}/>
                {hov.occ ? 'ACTIF' : 'LIBRE'}
              </div>
            </div>

            {/* Name */}
            {hov.slot?.display_name && (
              <div style={{
                fontFamily:'"JetBrains Mono",monospace', fontSize:11.5, fontWeight:700,
                color:'rgba(230,240,255,0.95)', marginBottom:4, letterSpacing:'.04em',
                lineHeight:1.2,
              }}>{hov.slot.display_name.toUpperCase()}</div>
            )}

            {/* Tenant */}
            {hov.slot?.tenant?.slogan && (
              <div style={{
                fontFamily:'Rajdhani,system-ui,sans-serif', fontSize:9,
                color:'rgba(180,200,230,0.55)', lineHeight:1.5, marginBottom:6,
              }}>{hov.slot.tenant.slogan}</div>
            )}

            {/* Price */}
            <div style={{
              display:'flex', alignItems:'baseline', gap:4, paddingTop:6,
              borderTop:`0.5px solid rgba(255,255,255,0.06)`,
            }}>
              <span style={{ color:'#E8A020', fontFamily:'"JetBrains Mono",monospace', fontSize:13, fontWeight:700 }}>
                €{fmt(hov.tier)}
              </span>
              <span style={{ color:'rgba(255,255,255,0.25)', fontFamily:'"JetBrains Mono",monospace', fontSize:7 }}>/JOUR</span>
            </div>
          </div>
          {/* Arrow pointer */}
          <div style={{
            position:'absolute',
            [hov.x > cW * .55 ? 'right' : 'left']: -5,
            top:'50%', transform:'translateY(-50%)',
            width:5, height:8,
            background:'rgba(4,8,20,0.97)',
            clipPath: hov.x > cW * .55
              ? 'polygon(100% 0, 0 50%, 100% 100%)'
              : 'polygon(0 0, 100% 50%, 0 100%)',
            opacity: 0.9,
          }}/>
        </div>
      )}

      {/* ── Grid mode label ── */}
      <div style={{
        position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
        display:'flex', alignItems:'center', gap:8,
        padding:'4px 14px',
        background:'rgba(0,4,18,0.70)',
        border:'0.5px solid rgba(0,200,240,0.10)',
        borderRadius:20,
        backdropFilter:'blur(8px)',
        pointerEvents:'none',
      }}>
        <span style={{ fontSize:8, color:'rgba(0,200,240,0.40)' }}>⊞</span>
        <span style={{
          fontFamily:'"JetBrains Mono",monospace', fontSize:7.5, letterSpacing:'.20em',
          color:'rgba(0,200,240,0.35)', fontWeight:600,
        }}>ORBITAL·MAP · 2D</span>
      </div>

      <style>{`
        @keyframes flatHovIn {
          from { opacity:0; transform:translateY(-4px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CONTROL PANEL — panneau latéral unifié · lecture améliorée
// ══════════════════════════════════════════════════════════════════════════════

function ControlPanel({ slots, isLive, activeTier, onTierSelect, activeFilter, onFilterSelect, viewMode, onViewToggle, onViewSlot, visible, onClose }) {
  const [tab, setTab] = useState('tiers');
  const isMobile = useIsMobile();

  const stats = useMemo(() => {
    const c = {}; TIER_LIST.forEach(k => { c[k] = 0; });
    (slots||[]).forEach(s => { if (s?.occ && c[s.tier] !== undefined) c[s.tier]++; });
    return c;
  }, [slots]);

  const occupied = slots?.filter(s => s?.occ && s?.tenant) || [];
  const totalOcc = slots?.filter(s => s?.occ).length || 0;
  const totalSlots = 1306;
  const globalPct = totalOcc / totalSlots;

  if (!visible) return null;

  return (
    <div style={{
      position:'absolute', right:0, top:0, bottom:0,
      width: isMobile ? '100%' : 252,
      zIndex:40,
      display:'flex', flexDirection:'column',
      background:'rgba(3,5,14,0.99)',
      borderLeft:`1px solid rgba(255,255,255,0.06)`,
      backdropFilter:'blur(28px)',
      WebkitBackdropFilter:'blur(28px)',
      boxShadow:'-16px 0 48px rgba(0,0,0,0.75)',
      animation:'panelIn .28s cubic-bezier(.16,1,.3,1) both',
      overflow:'hidden',
    }}>

      {/* ── Accent line top ── */}
      <div style={{ height:1.5, background:`linear-gradient(90deg, transparent, ${DS.cyan}60, ${DS.gold}40, transparent)` }}/>

      {/* ── Header ── */}
      <div style={{
        padding:'14px 16px 12px',
        borderBottom:`1px solid rgba(255,255,255,0.05)`,
        flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{
                width:22, height:22, flexShrink:0,
                border:`1px solid ${DS.gold}40`,
                background:`${DS.gold}0e`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, color:DS.gold, borderRadius:4,
              }}>◈</div>
              <span style={{ color:'rgba(230,240,255,0.85)', fontFamily:F.mono, fontSize:11, fontWeight:700, letterSpacing:'.12em' }}>DYSON·COSMOS</span>
            </div>
            {isLive && (
              <div style={{ display:'flex', alignItems:'center', gap:5, paddingLeft:30 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:DS.green, animation:'hpulse 1.4s ease-in-out infinite' }}/>
                <span style={{ color:DS.green, fontFamily:F.mono, fontSize:7.5, letterSpacing:'.12em', fontWeight:600 }}>LIVE</span>
                <span style={{ color:'rgba(255,255,255,0.14)', fontFamily:F.mono, fontSize:7 }}>·</span>
                <span style={{ color:`${DS.green}70`, fontFamily:F.mono, fontSize:7 }}>{totalOcc} ACTIFS</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width:24, height:24, background:'transparent', flexShrink:0,
            border:`1px solid rgba(0,200,240,0.12)`,
            color:'rgba(0,200,240,0.35)', fontFamily:F.mono, fontSize:10,
            cursor:'pointer', outline:'none', borderRadius:4,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .12s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,200,240,0.08)';e.currentTarget.style.color=DS.cyan;e.currentTarget.style.borderColor='rgba(0,200,240,0.30)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(0,200,240,0.35)';e.currentTarget.style.borderColor='rgba(0,200,240,0.12)';}}>
            ✕
          </button>
        </div>

        {/* Global occupancy bar */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
            <span style={{ color:'rgba(255,255,255,0.22)', fontFamily:F.mono, fontSize:6.5, letterSpacing:'.12em' }}>OCCUPATION GLOBALE</span>
            <span style={{ color:DS.gold, fontFamily:F.mono, fontSize:9, fontWeight:700 }}>{Math.round(globalPct * 100)}%</span>
          </div>
          <div style={{ height:2, background:'rgba(255,255,255,0.06)', borderRadius:1, overflow:'hidden', position:'relative' }}>
            <div style={{
              position:'absolute', left:0, top:0, bottom:0,
              width:`${globalPct * 100}%`,
              background:`linear-gradient(90deg, ${DS.cyan}88, ${DS.gold})`,
              transition:'width .6s ease', borderRadius:1,
            }}/>
          </div>
        </div>

        {/* 3D / 2D toggle */}
        <div style={{ display:'flex', gap:3 }}>
          {[{ id:'3d', icon:'◎', label:'SPHÈRE 3D' }, { id:'2d', icon:'⊞', label:'MAP 2D' }].map(({ id, icon, label }) => {
            const on = viewMode === id;
            return (
              <button key={id} onClick={() => onViewToggle(id)} style={{
                flex:1, padding:'8px 6px',
                background: on ? 'rgba(0,200,240,0.10)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${on ? 'rgba(0,200,240,0.30)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius:5,
                color: on ? DS.cyan : 'rgba(255,255,255,0.28)',
                fontFamily:F.mono, fontSize:8, fontWeight:on?700:500, letterSpacing:'.10em',
                cursor:'pointer', outline:'none',
                transition:'all .18s cubic-bezier(.4,0,.2,1)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                position:'relative', overflow:'hidden',
              }}>
                {on && <div style={{ position:'absolute', bottom:0, left:'15%', right:'15%', height:1.5, background:DS.cyan, borderRadius:1 }}/>}
                <span style={{ fontSize:12 }}>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', borderBottom:`1px solid rgba(255,255,255,0.05)`, flexShrink:0 }}>
        {[
          { id:'tiers', label:'TIERS', count: null },
          { id:'vue',   label:'VUE',   count: null },
          { id:'actifs',label:'ACTIFS',count: occupied.length || null },
        ].map(({ id, label, count }) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              flex:1, padding:'10px 4px 9px',
              background:'transparent', border:'none',
              borderBottom: `2px solid ${on ? DS.cyan : 'transparent'}`,
              color: on ? DS.cyan : 'rgba(255,255,255,0.28)',
              fontFamily:F.mono, fontSize:8, fontWeight:on?700:500, letterSpacing:'.10em',
              cursor:'pointer', outline:'none', transition:'all .14s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            }}>
              <span>{label}</span>
              {count !== null && (
                <span style={{
                  background: on ? `${DS.cyan}22` : 'rgba(255,255,255,0.07)',
                  border: `0.5px solid ${on ? DS.cyan+'40' : 'rgba(255,255,255,0.10)'}`,
                  color: on ? DS.cyan : 'rgba(255,255,255,0.40)',
                  fontSize:6.5, padding:'1px 5px', borderRadius:10, fontWeight:700,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, overflowY:'auto' }}>

        {/* TIERS */}
        {tab === 'tiers' && (
          <div>
            {TIER_LIST.filter(k => k !== 'all').map(key => {
              const cfg = TIER_CONFIG[key];
              const col = cfg.col;
              const occ = stats[key] || 0;
              const tot = cfg.slots || 0;
              const free = tot - occ;
              const pct = tot > 0 ? occ / tot : 0;
              const isActive = activeTier === cfg.id;
              return (
                <div key={key}
                  onClick={() => onTierSelect(isActive ? -1 : cfg.id)}
                  style={{
                    padding:'12px 16px',
                    borderLeft:`2.5px solid ${isActive ? col : 'transparent'}`,
                    borderBottom:`1px solid rgba(255,255,255,0.03)`,
                    background: isActive ? `${col}08` : 'transparent',
                    cursor:'pointer', transition:'all .16s ease', position:'relative',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isActive ? `${col}0c` : `${col}04`}
                  onMouseLeave={e => e.currentTarget.style.background = isActive ? `${col}08` : 'transparent'}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
                    <div style={{
                      width:26, height:26, flexShrink:0, borderRadius: key === 'epicenter' ? '50%' : 4,
                      border:`1px solid ${col}${isActive?'50':'20'}`,
                      background:`${col}${isActive?'12':'06'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, color:`${col}${isActive?'ee':'50'}`, transition:'all .16s',
                    }}>{cfg.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        color: isActive ? col : 'rgba(200,215,235,0.75)',
                        fontFamily:F.mono, fontSize:10.5, fontWeight:700, letterSpacing:'.07em',
                        transition:'color .16s', marginBottom:2,
                      }}>{cfg.short}</div>
                      <div style={{ color:'rgba(255,255,255,0.20)', fontFamily:F.mono, fontSize:7, letterSpacing:'.06em' }}>{cfg.sub}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {cfg.price && <div style={{
                        color: isActive ? col : 'rgba(232,160,32,0.65)',
                        fontFamily:F.mono, fontSize:10, fontWeight:700, letterSpacing:'.02em',
                      }}>€{cfg.price}<span style={{ fontSize:7, opacity:.6, fontWeight:400 }}>/j</span></div>}
                      <div style={{
                        color: free > 0 ? `${DS.green}80` : 'rgba(255,255,255,0.18)',
                        fontFamily:F.mono, fontSize:7, letterSpacing:'.04em', marginTop:1,
                      }}>{free} libres</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:1.5, height:3, borderRadius:2, overflow:'hidden' }}>
                    {Array.from({length: Math.min(tot, 20)}, (_,si) => {
                      const filled = si < Math.round(pct * Math.min(tot, 20));
                      return <div key={si} style={{
                        flex:1, background: filled ? col : `${col}12`,
                        boxShadow: filled ? `0 0 4px ${col}50` : 'none',
                        transition:'background .4s',
                      }}/>;
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ color:`${col}50`, fontFamily:F.mono, fontSize:6.5 }}>{occ} actifs</span>
                    <span style={{ color:'rgba(255,255,255,0.15)', fontFamily:F.mono, fontSize:6.5 }}>{Math.round(pct*100)}%</span>
                  </div>
                  {isActive && <div style={{ position:'absolute', top:0, left:'2.5px', right:0, height:1, background:`linear-gradient(90deg, ${col}60, transparent)` }}/>}
                </div>
              );
            })}
          </div>
        )}

        {/* VUE */}
        {tab === 'vue' && (
          <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:5 }}>
            {Object.entries(VUE_CONFIG).map(([id, cfg]) => {
              const on = activeFilter === id;
              return (
                <button key={id} onClick={() => onFilterSelect(id)} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'11px 12px',
                  background: on ? `${cfg.col}12` : 'rgba(255,255,255,0.02)',
                  border:`1px solid ${on ? cfg.col+'40' : 'rgba(255,255,255,0.05)'}`,
                  borderLeft: on ? `3px solid ${cfg.col}` : '3px solid transparent',
                  borderRadius:6, color: on ? cfg.col : 'rgba(200,215,235,0.55)',
                  fontFamily:F.mono, fontSize:9, cursor:'pointer', outline:'none',
                  transition:'all .16s ease', textAlign:'left', width:'100%',
                }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{cfg.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, letterSpacing:'.08em', marginBottom:2.5 }}>{cfg.label}</div>
                    <div style={{ fontSize:7, color:on?`${cfg.col}65`:'rgba(255,255,255,0.20)', letterSpacing:'.05em', lineHeight:1.4 }}>{cfg.desc}</div>
                  </div>
                  {on && <div style={{ width:5, height:5, borderRadius:'50%', background:cfg.col, flexShrink:0, opacity:0.8, boxShadow:`0 0 6px ${cfg.col}` }}/>}
                </button>
              );
            })}
          </div>
        )}

        {/* ACTIFS */}
        {tab === 'actifs' && (
          <div>
            <div style={{
              padding:'8px 16px 7px', borderBottom:`1px solid rgba(255,255,255,0.04)`,
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <span style={{ color:'rgba(255,255,255,0.28)', fontFamily:F.mono, fontSize:7, letterSpacing:'.10em' }}>{occupied.length} SLOTS ACTIFS</span>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:4.5, height:4.5, borderRadius:'50%', background:DS.green, animation:'hpulse 1.4s ease-in-out infinite' }}/>
                <span style={{ color:DS.green, fontFamily:F.mono, fontSize:6.5, letterSpacing:'.10em', fontWeight:600 }}>EN DIRECT</span>
              </div>
            </div>
            {occupied.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center' }}>
                <div style={{ fontSize:20, marginBottom:10, opacity:.3, color:DS.textMid }}>◯</div>
                <div style={{ color:'rgba(255,255,255,0.20)', fontFamily:F.mono, fontSize:8, letterSpacing:'.12em' }}>AUCUN SLOT ACTIF</div>
              </div>
            ) : (
              occupied.map((slot, i) => {
                const col = TIER_NEON[slot.tier] || DS.cyan;
                const name = (slot.tenant?.name || slot.display_name || '—').toUpperCase();
                return (
                  <div key={slot.id || i}
                    onClick={() => onViewSlot && onViewSlot(slot)}
                    style={{
                      padding:'10px 16px', borderBottom:`1px solid rgba(255,255,255,0.03)`,
                      cursor:'pointer', transition:'background .12s',
                      display:'flex', alignItems:'center', gap:10,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${col}08`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width:7, height:7, borderRadius:'50%', background:col, flexShrink:0, boxShadow:`0 0 7px ${col}70` }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        color:'rgba(225,235,250,0.88)', fontFamily:F.mono, fontSize:9, fontWeight:700,
                        letterSpacing:'.05em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2,
                      }}>{name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:5, color:`${col}65`, fontFamily:F.mono, fontSize:7 }}>
                        <span style={{ background:`${col}12`, border:`0.5px solid ${col}30`, padding:'0.5px 5px', borderRadius:2, fontSize:6.5 }}>
                          {slot.tier.toUpperCase()}
                        </span>
                        {slot.tenant?.slogan && <span style={{ opacity:.7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{slot.tenant.slogan.slice(0,30)}</span>}
                      </div>
                    </div>
                    <span style={{ color:`${col}40`, fontSize:9, flexShrink:0 }}>→</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Footer — Revenue KPI ── */}
      <div style={{
        padding:'11px 16px 13px', borderTop:`1px solid rgba(255,255,255,0.05)`,
        flexShrink:0, background:'rgba(0,0,0,0.25)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
          <span style={{ color:'rgba(255,255,255,0.22)', fontFamily:F.mono, fontSize:7, letterSpacing:'.12em' }}>REVENUS·/·JOUR</span>
          <span style={{ color:DS.gold, fontFamily:F.mono, fontSize:16, fontWeight:700, letterSpacing:'.02em' }}>
            {TIER_ORDER.reduce((s,t)=>s+(stats[t]||0)*(TIER_PRICE[t]||0)/100,0).toLocaleString('fr-FR')} €
          </span>
        </div>
        <div style={{ display:'flex', gap:2, height:2.5, borderRadius:1.5, overflow:'hidden', marginBottom:7 }}>
          {TIER_ORDER.map(t => {
            const c = TIER_NEON[t], o = stats[t]||0, tot = TIER_TOTALS[t];
            return <div key={t} style={{ flex:1, background: o>0 ? c : 'rgba(255,255,255,0.06)', opacity:0.15+0.85*(o/tot||0), transition:'all .5s' }}/>;
          })}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,0.18)', fontFamily:F.mono, fontSize:6.5 }}>
          <span>{totalOcc} ACTIFS</span>
          <span>{totalSlots - totalOcc} LIBRES</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN VIEW3D — Export principal
// ══════════════════════════════════════════════════════════════════════════════

export default function View3D({slots=[],isLive=false,onCheckout,onBuyout,onViewSlot,user=null}){
  const canvasRef=useRef(null),sceneRef=useRef(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(null);
  const[selSlot,setSelSlot]=useState(null);
  const[hovInfo,setHovInfo]=useState(null);
  const[isInside,setIsInside]=useState(false);
  const[activeTier,setActiveTier]=useState(-1);
  const[activeFilter,setActiveFilter]=useState('realist');
  const[viewMode,setViewMode]=useState('3d');
  const[showPanel,setShowPanel]=useState(false);
  const[hovRing,setHovRing]=useState(null);
  const[isPaused,setIsPaused]=useState(false);
  const isMobile=useIsMobile();
  const insideTimer=useRef(null);
  const hovTimer=useRef(null);
  const activePal = FILTER_PALETTES[activeFilter] || FILTER_PALETTES.realist;

  const handleTogglePause=useCallback(()=>{
    if(!sceneRef.current)return;
    sceneRef.current.togglePause();
    setIsPaused(sceneRef.current.isPaused);
  },[]);

  const sorted=useMemo(()=>sortSlots(slots),[slots]);
  const epicSlot=useMemo(()=>sorted.find(s=>s?.tier==='epicenter')||null,[sorted]);
  const prestigeSlots=useMemo(()=>sorted.filter(s=>s?.tier==='prestige'),[sorted]);
  const eliteSlots=useMemo(()=>sorted.filter(s=>s?.tier==='elite'),[sorted]);
  const sphereSlots=useMemo(()=>sorted.filter(s=>!['epicenter','prestige','elite'].includes(s?.tier)),[sorted]);
  const cosmosFaces=useMemo(()=>sortPole(buildIcoFaces(3)).map((f,i)=>({...f,slot:sphereSlots[i]||null})),[sphereSlots]);

  const handleTierSelect=useCallback(idx=>{
    setActiveTier(idx);
    sceneRef.current?.setTierFocus(idx);
  },[]);
  const handleFilterSelect=useCallback(f=>{
    setActiveFilter(f);
    sceneRef.current?.setFilterPalette(f);
  },[]);
  const handleViewToggle=useCallback(mode=>{
    setViewMode(mode);
  },[]);

  useEffect(()=>{
    if(!canvasRef.current)return;
    let sc;let mounted=true;
    Promise.all([import('three'),import('gsap').then(m=>m.gsap||m.default)])
      .then(([T,G])=>{
        if(!mounted)return;
        sc=new Scene3D(canvasRef.current);sceneRef.current=sc;sc.epicSlot=epicSlot;
        sc.onHover=info=>{
          clearTimeout(hovTimer.current);
          if(info?.tier==='elite'){setHovRing(info);setHovInfo(null);}
          else{setHovRing(null);if(info){hovTimer.current=setTimeout(()=>setHovInfo({slot:info}),80);}else setHovInfo(null);}
        };
        sc.onClick=(slot,type,idx)=>{
          if(type==='epic')setSelSlot(epicSlot||{tier:'epicenter'});
          else if(type==='ring'&&idx!=null)setSelSlot({...slot,tier:'elite',_ring:sc.eliteRings[idx]});
          else if(type==='moon')setSelSlot(slot||{tier:'prestige'});
          else setSelSlot(slot||null);
        };
        return sc.init(T,G);
      })
      .then(()=>{
        if(!mounted)return;
        const s=sceneRef.current;s.setFaces(cosmosFaces,eliteSlots,prestigeSlots,false);setLoading(false);
        insideTimer.current=setInterval(()=>{
          if(!sceneRef.current)return;
          setIsInside(p=>{const n=sceneRef.current._insideBlend>.30;return p!==n?n:p;});
        },80);
      })
      .catch(e=>{if(!mounted)return;console.error(e);setError('PIPELINE·v7·GPU·FAULT');setLoading(false);});
    return()=>{mounted=false;clearInterval(insideTimer.current);sc?.destroy();sceneRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{if(!sceneRef.current)return;sceneRef.current.setFaces(cosmosFaces,eliteSlots,prestigeSlots,true);sceneRef.current.epicSlot=epicSlot;},[cosmosFaces,eliteSlots,prestigeSlots,epicSlot]);
  useEffect(()=>{const fn=e=>{if(e.key==='Escape'){setSelSlot(null);sceneRef.current?._setSel(-1);if(sceneRef.current?._epU)sceneRef.current._epU.uSelected.value=0;sceneRef.current?.resetCamera();setActiveTier(-1);sceneRef.current?.setTierFocus(-1);}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[]);
  useEffect(()=>{const fn=e=>{e.preventDefault();sceneRef.current?.zoom(e.deltaY);};const c=canvasRef.current;if(c)c.addEventListener('wheel',fn,{passive:false});return()=>{if(c)c.removeEventListener('wheel',fn);};},[]);
  useEffect(()=>{if(!canvasRef.current)return;const ro=new ResizeObserver(()=>sceneRef.current?.resize());ro.observe(canvasRef.current);return()=>ro.disconnect();},[]);
  useEffect(()=>{
    if(viewMode==='3d'&&sceneRef.current){
      setTimeout(()=>{sceneRef.current?.resize();sceneRef.current?.setFilterPalette(activeFilter);},50);
    }
  },[viewMode]);

  const handleClose=useCallback(()=>{setSelSlot(null);sceneRef.current?._setSel(-1);if(sceneRef.current?._epU)sceneRef.current._epU.uSelected.value=0;sceneRef.current?.eliteRings?.forEach(r=>{r.u.uHov.value=0;});sceneRef.current?.resetCamera();},[]);

  // Compute occupied count for badge
  const occupiedCount = useMemo(() => slots.filter(s => s?.occ).length, [slots]);

  return(
    <div style={{flex:1,position:'relative',overflow:'hidden',background:DS.void,display:'flex'}}>
      <div style={{
        flex:1, position:'relative', overflow:'hidden',
        background:`linear-gradient(160deg, ${activePal.bgTop||'#01020A'} 0%, ${activePal.bgBot||'#020408'} 100%)`,
        transition:'background 0.6s ease',
      }}>

        {/* Canvas 3D — always in DOM */}
        <canvas ref={canvasRef} style={{
          width:'100%', height:'100%', display:'block', outline:'none',
          opacity: (loading || viewMode==='2d') ? 0 : 1,
          pointerEvents: viewMode==='2d' ? 'none' : 'auto',
          transform: viewMode==='2d'
            ? 'perspective(1200px) rotateX(-12deg) scale(0.93)'
            : 'perspective(1200px) rotateX(0deg) scale(1)',
          transformOrigin: '50% 50%',
          transition:'opacity 0.50s cubic-bezier(.4,0,.2,1), transform 0.55s cubic-bezier(.16,1,.3,1)',
          position: viewMode==='2d' ? 'absolute' : 'relative',
          filter: viewMode==='2d' ? 'blur(2px)' : 'blur(0px)',
        }}/>

        {/* FlatView 2D — Vercel-style perspective fold in */}
        <div style={{
          position:'absolute', inset:0,
          opacity: viewMode==='2d' ? 1 : 0,
          transform: viewMode==='2d'
            ? 'perspective(1200px) rotateX(0deg) scale(1)'
            : 'perspective(1200px) rotateX(14deg) scale(0.94)',
          transformOrigin: '50% 55%',
          transition:'opacity 0.50s cubic-bezier(.4,0,.2,1), transform 0.55s cubic-bezier(.16,1,.3,1)',
          pointerEvents: viewMode==='2d' ? 'auto' : 'none',
          filter: viewMode==='2d' ? 'blur(0px)' : 'blur(3px)',
        }}>
          <FlatView2D slots={slots} onSlotSelect={setSelSlot} activeFilter={activeFilter} visible={viewMode==='2d'}/>
        </div>

        {/* Lens overlay */}
        {!loading && (() => {
          const pal = FILTER_PALETTES[activeFilter] || FILTER_PALETTES.realist;
          if (!pal.lensOpacity) return null;
          return (
            <div style={{
              position:'absolute', inset:0, pointerEvents:'none', zIndex:2,
              background: pal.lensColor || 'transparent',
              mixBlendMode: pal.lensBlend || 'normal',
              opacity: pal.lensOpacity || 0,
              transition:'background .6s ease, opacity .6s ease',
            }}/>
          );
        })()}

        {loading&&!error&&<HUDLoader/>}
        {error&&(
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:DS.void}}>
            <div style={{color:DS.rose,fontFamily:F.mono,fontSize:9,letterSpacing:'.14em'}}>⚠ {error}</div>
          </div>
        )}

        {/* ── HUD Top-left: badge identité ── */}
        {!loading&&(
          <div style={{position:'absolute',top:12,left:12,zIndex:30,pointerEvents:'none'}}>
            <div style={{
              display:'flex',alignItems:'center',gap:8,
              padding: isMobile ? '4px 10px' : '5px 10px',
              background:'rgba(4,6,18,0.94)',
              border:`0.5px solid rgba(0,200,240,0.10)`,
            }}>
              <span style={{color:DS.gold,fontSize: isMobile ? 11 : 12}}>◈</span>
              <div style={{color:DS.textHi,fontFamily:F.mono,fontSize:isMobile?8:8.5,fontWeight:700,letterSpacing:'.16em'}}>
                DYSON·COSMOS
              </div>
            </div>
          </div>
        )}

        {/* ── HUD Top-right: boutons compacts ── */}
        {!loading&&(
          <div style={{position:'absolute',top:12,right:12,zIndex:30,display:'flex',gap:4,alignItems:'center'}}>
            {!isMobile && viewMode==='3d' && <>
              <button onClick={handleTogglePause} style={{
                padding:'4px 10px',
                background: isPaused ? 'rgba(208,40,72,0.12)' : 'transparent',
                border:`0.5px solid ${isPaused ? 'rgba(208,40,72,0.40)' : 'rgba(0,200,240,0.14)'}`,
                color: isPaused ? DS.rose : DS.textMid,
                fontFamily:F.mono, fontSize:8, cursor:'pointer', outline:'none',
                transition:'all .12s',
              }}>
                {isPaused ? '▶' : '⏸'}
              </button>
              <button onClick={()=>{sceneRef.current?.resetCamera();setActiveTier(-1);sceneRef.current?.setTierFocus(-1);}} style={{
                padding:'4px 10px', background:'transparent',
                border:`0.5px solid rgba(0,200,240,0.14)`,
                color:DS.textMid, fontFamily:F.mono, fontSize:8, cursor:'pointer', outline:'none',
                transition:'all .12s',
              }}>↺</button>
            </>}

            {/* Panel toggle — avec badge occupancy */}
            <button onClick={() => setShowPanel(v => !v)} style={{
              padding:'4px 12px',
              background: showPanel ? 'rgba(0,200,240,0.12)' : 'rgba(4,6,18,0.92)',
              border:`0.5px solid ${showPanel ? 'rgba(0,200,240,0.40)' : 'rgba(0,200,240,0.14)'}`,
              color: showPanel ? DS.cyan : DS.textMid,
              fontFamily:F.mono, fontSize:8, fontWeight:700, letterSpacing:'.10em',
              cursor:'pointer', outline:'none', transition:'all .15s',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <span style={{ fontSize:11 }}>{showPanel ? '✕' : '≡'}</span>
              <span>{showPanel ? 'FERMER' : 'PANEL'}</span>
              {!showPanel && occupiedCount > 0 && (
                <span style={{
                  background:'rgba(0,200,240,0.15)', color:DS.cyan,
                  border:'0.5px solid rgba(0,200,240,0.30)',
                  fontSize:7, padding:'0 5px', fontWeight:700, letterSpacing:'.06em',
                }}>{occupiedCount}</span>
              )}
            </button>
          </div>
        )}

        {/* ── TierCommandBar (bottom center) — seulement en vue 3D ── */}
        {!loading && viewMode==='3d' && (
          <div style={{
            position:'absolute', bottom:isMobile?12:18, left:'50%', transform:'translateX(-50%)',
            zIndex:30, transition:'opacity 0.3s ease',
          }}>
            <TierCommandBar activeTier={activeTier} onTierSelect={handleTierSelect} slots={slots}/>
          </div>
        )}

        {/* ── TierPanel (slide gauche) ── */}
        {!loading&&activeTier>=0&&(
          <TierPanel
            activeTier={activeTier}
            slots={slots}
            onClose={()=>{setActiveTier(-1);sceneRef.current?.setTierFocus(-1);}}
            onCheckout={onCheckout}
            dockLeftActive={false}
          />
        )}

        {/* ── Hints ── */}
        {!loading&&!selSlot&&!isMobile&&(
          <div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',color:DS.textLo,fontSize:6,letterSpacing:'.14em',fontFamily:F.mono,pointerEvents:'none',whiteSpace:'nowrap',opacity:.25}}>
            {viewMode==='3d' ? 'DRAG · SCROLL · CLIC' : 'SURVOL POUR DÉTAIL · CLIC POUR OUVRIR'}
          </div>
        )}

        {/* ── Modals / overlays ── */}
        {hovRing&&!selSlot&&hovRing.slot&&(
          <SlotReveal slot={hovRing.slot} onClose={()=>setHovRing(null)}
            onRent={s=>{setHovRing(null);handleClose();onCheckout?.(s);}}
            onBuyout={s=>{setHovRing(null);handleClose();onBuyout?.(s);}}
          />
        )}
        {isInside&&<InsideChip/>}
        {hovInfo&&!selSlot&&!hovRing&&<HoverChip info={hovInfo}/>}
        {selSlot&&(<SlotReveal slot={selSlot} onClose={handleClose} user={user}
          onRent={s=>{handleClose();onCheckout?.(s);}}
          onBuyout={s=>{handleClose();onBuyout?.(s);}}
          onViewSlot={s=>{handleClose();onViewSlot?.(s);}}
        />)}

        {/* ── Control Panel (right slide) ── */}
        <ControlPanel
          slots={slots} isLive={isLive}
          activeTier={activeTier} onTierSelect={handleTierSelect}
          activeFilter={activeFilter} onFilterSelect={handleFilterSelect}
          viewMode={viewMode} onViewToggle={handleViewToggle}
          onViewSlot={onViewSlot}
          visible={showPanel}
          onClose={() => setShowPanel(false)}
        />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes hspin{to{transform:rotate(360deg);}}
        @keyframes hpulse{0%,100%{opacity:1;}50%{opacity:.15;}}
        @keyframes hfadeUp{from{opacity:0;transform:translateX(-50%) translateY(6px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        @keyframes scanMove{0%{transform:translateY(-100%);}100%{transform:translateY(100vh);}}
        @keyframes panelReveal{from{opacity:0;transform:translateX(-100%);}to{opacity:1;transform:translateX(0);}}
        @keyframes panelRevealBottom{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translateY(0);}}
        @keyframes panelIn{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:translateX(0);}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:1.5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(0,200,240,.10);border-radius:0;}
        canvas{cursor:grab;}canvas:active{cursor:grabbing;}
        .tier-bar-scroll::-webkit-scrollbar{display:none;}
      `}</style>
    </div>
  );
}
