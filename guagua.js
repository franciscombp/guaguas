/* ══════════════════════════════════════════════════════════════
   Guagua de pan · el juego, en 3D y en tres actos
     1. Amasar: bolitas y chorizos de masa cruda, que se pegan
        donde caen. Hay moldes (guagua, caballito, chanchito, palomita,
        gallinita) para el que no quiera empezar de cero.
     2. Hornear: la masa se infla y se dora mientras corre el
        termómetro. Hay que sacarla a tiempo: antes queda blanca,
        después se quema.
     3. Decorar: manga de crema, rosetas, grageas, pasas y la
        carita. La cara es el mismo pan: se le pintan ojos, nariz y
        sonrisa con glaseado fino.

   Cómo está hecho:
     · Todo es una lista de números. La masa (`a`) son piezas; la
       decoración (`o`) son operaciones; la cocción (`k`) es un
       entero. Eso viaja comprimido en el enlace, después del `#`:
       quien lo abre vuelve a amasar, hornear y decorar la misma
       guagua en su teléfono. No hay servidor.
     · La crema es un tubo con sección de boquilla de estrella que
       se apoya sobre lo que tocaste, siguiendo la normal.
     · El mordisco y el horno los hace el shader: uno descarta lo
       que cae en la mordida, de lado a lado, y pinta de miga el revés; el otro
       mezcla la masa cruda con el dorado (y con el carbón).
   ══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import * as nube from './nube.js?v=2026.10.26.23';
import {
  dormida, DIRECCION, V, Q, ent, CREMAS, BOQUILLAS, BOQUILLA_LISA, ANCHOS, COBERTURA, FIGURAS, BANOS, GROSORES, MASAS, TAMANOS, GRAGEAS, MAX_BOCADOS, BOCADOS_TALLER, MAX_PIEZAS, MORDIDA, NOMBRES, MENSAJES, MENSAJES_MEMORIA, MENSAJE_GUAGUAU, VALES, enMemoria, echada, posturaDe, azar, elige, limita, bolita, chorizo, masaDe, iniPuntos, conMasa, SG, G, C, frenteDe, CUERPO, CABEZA, guaguaConBrazos, MOLDES, elipsoide, tubo, cinta, PISO, aplanar, geometriaPieza, moverPieza, base, b64, exprimir, PASOS, aDeltas, deDeltas, codificar, decodificar, deLaPrimeraHornada, sano, punto, tieneCara, queEs, nombreDe, puntoDeCrema, pn, caraPintada, chapitas, sorpresa, Sonda, amasarReceta,
} from './masa.js?v=2026.10.26.23';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* El toast del DS vive en <body>; un <dialog> abierto está en la capa de
   arriba y lo taparía, así que se mete dentro del diálogo mientras haya uno. */
const avisa = (t, tipo) => {
  const el = window.malDS && window.malDS.aviso ? window.malDS.aviso(t, tipo) : null;
  if (el) (document.querySelector('dialog[open]') || document.body).appendChild(el);
  return el;
};

/* ─── la despensa ──────────────────────────────────────────── */



/* ─── utilidades ───────────────────────────────────────────── */
function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ══════════════════ LA MASA ═════════════════════════════════
   Una pieza es un arreglo de enteros (centésimas):
     bolita   [0, x, y, z, rx, ry, rz, giro×100]
     chorizo  [1, grosor×100, x, y, z, x, y, z…]               */




/* ─── geometrías ───────────────────────────────────────────── */
/* Un tubo a lo largo de unos puntos, con las puntas redondas. Con
   `estrias` es crema de boquilla de estrella (y se retuerce un poco
   a lo largo); sin ellas, un chorizo de masa. Los marcos se
   transportan en paralelo, así que no se tuerce de golpe en las curvas. */
/* La masa se hornea acostada en la lata. La figura se arma de frente (x a lo
   ancho, y a lo largo, z hacia arriba) y todo lo que queda bajo z = PISO se
   aplasta contra la lata con una curva suave (softplus): la base queda plana
   y el canto se redondea, como la masa que se asienta con su propio peso. */
/* El dorado del horno, horneado en los vértices: más tostado en los
   cantos y en la base que tocó la lata, más claro arriba. */
const TONOS = MASAS.map((m) => [new THREE.Color(m.tostado), new THREE.Color(m.dorado)]);
function dorar(g, masa = 0, banio = null) {
  const n = g.attributes.normal, p = g.attributes.position;
  const col = new Float32Array(n.count * 3);
  const L = V(0.25, 0.55, 0.8).normalize(), c = new THREE.Color();
  const [TOSTADO, DORADO] = TONOS[masa] || TONOS[0];
  const capa = banio ? new THREE.Color(banio) : null;
  for (let i = 0; i < n.count; i++) {
    const t = 0.5 + 0.5 * (n.getX(i) * L.x + n.getY(i) * L.y + n.getZ(i) * L.z);
    const piso = limita((p.getZ(i) - PISO) / 0.3, 0, 1);
    if (capa) {                                     // la capa sigue el relieve: más clara arriba, más oscura abajo
      c.copy(capa).multiplyScalar(0.72 + 0.28 * THREE.MathUtils.smoothstep(t, 0.1, 0.95));
    } else c.copy(TOSTADO).lerp(DORADO, THREE.MathUtils.smoothstep(t, 0.1, 0.95) * (0.55 + 0.45 * piso));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/* ─── los poros del pan, en una textura que se repite ─────── */
let _poros = null;
function poros() {
  if (_poros) return _poros;
  const c = lienzo(256, 256), x = c.getContext('2d'), r = azar(7);
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    x.fillStyle = `rgba(120,60,20,${0.04 + r() * 0.12})`;
    x.beginPath(); x.arc(r() * 256, r() * 256, 0.6 + r() * 1.8, 0, Math.PI * 2); x.fill();
  }
  _poros = new THREE.CanvasTexture(c);
  _poros.wrapS = _poros.wrapT = THREE.RepeatWrapping;
  _poros.repeat.set(4, 3);
  _poros.colorSpace = THREE.SRGBColorSpace;
  return _poros;
}

/* ─── el mantel bordado, con flores en anillos ─────────────
   Se desvanece hacia el borde para fundirse con el fondo morado. */
let _mantel = null;
function mantel() {
  if (_mantel) return _mantel;
  const N = 1024, c = lienzo(N, N), x = c.getContext('2d'), M = N / 2;
  x.fillStyle = '#5a1c5e'; x.fillRect(0, 0, N, N);
  // las flores bordadas, de un solo tono y apenas más claras que el mantel: acompañan, no distraen
  const hilo = '#7c3277', centro = '#8e4588';
  for (let a = 1; a <= 9; a++) {
    const r = a * 54, n = Math.floor((Math.PI * 2 * r) / 52);
    if (a % 2) {
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2, fx = M + Math.cos(t) * r, fy = M + Math.sin(t) * r;
        x.fillStyle = hilo;
        for (let k = 0; k < 5; k++) {
          const q = (k / 5) * Math.PI * 2 + t;
          x.beginPath(); x.arc(fx + Math.cos(q) * 7, fy + Math.sin(q) * 7, 5, 0, Math.PI * 2); x.fill();
        }
        x.fillStyle = centro;
        x.beginPath(); x.arc(fx, fy, 3.5, 0, Math.PI * 2); x.fill();
      }
    } else {
      x.strokeStyle = 'rgba(255,201,60,.22)'; x.lineWidth = 3; x.setLineDash([9, 7]);
      x.beginPath(); x.arc(M, M, r, 0, Math.PI * 2); x.stroke();
      x.setLineDash([]);
    }
  }
  const g = x.createRadialGradient(M, M, M * 0.45, M, M, M);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in';
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  _mantel = new THREE.CanvasTexture(c);
  _mantel.colorSpace = THREE.SRGBColorSpace;
  _mantel.anisotropy = 8;
  return _mantel;
}

/* ─── la carita de yeso: solo para abrir enlaces de la primera versión ───────────────────────────────────────
   Sale en blanco: la cara se dibuja con el pincel y las pasas. Los
   estilos 1 a 3 son las caras pintadas de la primera versión, para
   que los enlaces que ya se mandaron se sigan viendo igual.       */
function ojo(ctx, x, y) {
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath(); ctx.ellipse(x, y, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 2, y - 3, 2.4, 0, Math.PI * 2); ctx.fill();
}
const _caras = {};
function texturaCara(n) {
  if (_caras[n]) return _caras[n];
  // La máscara es una esfera achatada: el frente cae en u = 0,25 y v = 0,5.
  const c = lienzo(1024, 512), ctx = c.getContext('2d');
  ctx.fillStyle = '#f2e0cc'; ctx.fillRect(0, 0, 1024, 512);
  const g = ctx.createRadialGradient(240, 230, 10, 256, 256, 200);
  g.addColorStop(0, '#fffaf2'); g.addColorStop(1, '#f2e0cc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256); ctx.scale(2.4, 2.4); ctx.translate(-300, -200);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(240,110,140,.3)';
  ctx.filter = 'blur(2px)';
  ctx.beginPath(); ctx.arc(262, 222, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(338, 222, 14, 0, Math.PI * 2); ctx.fill();
  ctx.filter = 'none';
  if (n >= 1) {
    ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(282, 142); ctx.quadraticCurveTo(300, 158, 300, 138);
    ctx.quadraticCurveTo(302, 158, 320, 144); ctx.stroke();
  }
  if (n === 1) {
    ojo(ctx, 278, 192); ojo(ctx, 322, 192);
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(278, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(322, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.fillStyle = '#d6264f';
    ctx.beginPath(); ctx.ellipse(300, 232, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (n === 2) {
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(278, 190, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(322, 190, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.fillStyle = '#c23a52';
    ctx.beginPath(); ctx.ellipse(300, 232, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (n === 3) {
    ojo(ctx, 278, 192);
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(312, 194); ctx.quadraticCurveTo(322, 184, 332, 194); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(280, 226); ctx.quadraticCurveTo(300, 242, 320, 226); ctx.stroke();
    ctx.fillStyle = '#ef6f8e';
    ctx.beginPath(); ctx.ellipse(306, 240, 8, 10, 0.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (_caras[n] = t);
}
const CARITA = V(0.4, 0.45, 0.15);   // la máscara, a tamaño 1
function caritaEn(p, n, tam) {
  const s = CARITA.clone().multiplyScalar(TAMANOS[tam] || 1);
  const b = base(n);
  return { s, b, centro: p.clone().addScaledVector(b.z, -s.z * 0.25) };
}

/* ══════════════════ LA CREMA ════════════════════════════════ */
function espiral(R) {                 // la roseta: un chorro que sube dando vueltas
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, a = t * 2.4 * Math.PI * 2, rad = R * (1 - t * 0.88);
    pts.push(V(Math.cos(a) * rad, Math.sin(a) * rad, R * 0.1 + t * R * 1.15));
  }
  return pts;
}

/* ─── los materiales, que se hornean y se pueden morder ───── */
function comestible(mat, U, horno) {
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBocados = U.uBocados;
    sh.uniforms.uNBocados = U.uNBocados;
    sh.uniforms.uBoca = U.uBoca;
    sh.uniforms.uCoccion = U.uCoccion;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 mundo = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mundo = instanceMatrix * mundo;
        #endif
        vMundo = (modelMatrix * mundo).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vMundo;
        uniform vec4 uBocados[${MAX_BOCADOS}];
        uniform int uNBocados;
        uniform mat3 uBoca;
        uniform float uCoccion;`)
      .replace('void main() {', `void main() {
        // el mordisco atraviesa el pan de lado a lado, con la marca de los dientes
        float bocado = 99.0;                         // cuán cerca del borde del mordisco más cercano (1: en el borde)
        // el pan es una cáscara: por el mordisco se vería su interior vacío. Lo que se
        // ve por dentro se pinta como la pared del corte: donde el rayo de la vista
        // toca el cilindro del bocado, con su normal, y así la miga se ve maciza
        float corteT = 1e9;
        vec3 corteP = vMundo, corteN = vec3(0.0);
        vec3 rd = normalize(vMundo - cameraPosition);
        float tf = length(vMundo - cameraPosition);
        for (int i = 0; i < ${MAX_BOCADOS}; i++) {
          if (i >= uNBocados) break;
          float w = uBocados[i].w;
          vec2 d = (uBoca * (vMundo - uBocados[i].xyz)).xy;
          // el borde no es un círculo: cada bocado tiene su forma (la semilla sale de dónde se mordió),
          // un óvalo torcido con las marcas de los dientes, unas más hondas que otras
          float s = fract(sin(dot(uBocados[i].xyz, vec3(41.3, 289.1, 113.7))) * 4375.85) * 6.2832;
          float th = atan(d.y, d.x);
          float dientes = 1.0 + 0.09 * sin(2.0 * th + s) + 0.06 * sin(3.0 * th + 1.7 * s)
            + 0.05 * sin(11.0 * th + s) * (0.6 + 0.4 * sin(5.0 * th + 2.3 * s)) + 0.025 * sin(23.0 * th + 3.1 * s);
          float r = length(d) / (w * dientes);
          if (r < 1.0) discard;
          bocado = min(bocado, r);
          vec2 o2 = (uBoca * (cameraPosition - uBocados[i].xyz)).xy, v2 = (uBoca * rd).xy;
          float qa = dot(v2, v2), qb = dot(o2, v2), qc = dot(o2, o2) - w * w, disc = qb * qb - qa * qc;
          if (qa > 1e-6 && disc > 0.0) {
            float t2 = (-qb + sqrt(disc)) / qa;      // la pared del fondo del bocado
            if (t2 > 0.0 && t2 < tf && t2 < corteT) {
              corteT = t2;
              corteP = cameraPosition + rd * t2;
              corteN = -normalize(transpose(uBoca) * vec3(o2 + v2 * t2, 0.0));
            }
          }
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${horno ? `
        vec3 cruda = mix(min(diffuseColor.rgb * 1.6, vec3(1.0)), vec3(0.86, 0.76, 0.56), 0.5);
        diffuseColor.rgb = mix(cruda, diffuseColor.rgb, smoothstep(0.05, 1.0, uCoccion));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.012, 0.006), smoothstep(1.1, 1.55, uCoccion) * 0.92);` : ''}
        if (!gl_FrontFacing) {
          // la miga: un color parejo con sus poros, como pan partido
          float g = fract(sin(dot(floor(corteP * 70.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          diffuseColor.rgb = vec3(0.95, 0.83, 0.6) * (0.86 + 0.14 * g);
        } else if (bocado < 1.07) {
          // el borde mordido: la corteza se ve, más tostada
          diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(1.0, 1.07, bocado));
        }`)
      // la miga se ilumina como la pared del corte, sin el relieve de la corteza
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (!gl_FrontFacing) normal = corteT < 1e8 ? normalize((viewMatrix * vec4(corteN, 0.0)).xyz) : vec3(0.0, 0.0, 1.0);`);
  };
  mat.customProgramCacheKey = () => (horno ? 'comestible-horno' : 'comestible');
  return mat;
}
function materiales(U) {
  return {
    pan: comestible(new THREE.MeshPhysicalMaterial({
      vertexColors: true, map: poros(), bumpMap: poros(), bumpScale: 0.5,
      roughness: 0.62, clearcoat: 0.22, clearcoatRoughness: 0.5,
    }), U, true),
    previa: new THREE.MeshPhysicalMaterial({ color: '#f1e4c8', roughness: 0.85, transparent: true, opacity: 0.75 }),
    cremas: CREMAS.map((c) => comestible(new THREE.MeshPhysicalMaterial({
      color: c.c, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.35,
    }), U)),
    grageas: comestible(new THREE.MeshStandardMaterial({ roughness: 0.3 }), U),
    pasa: comestible(new THREE.MeshPhysicalMaterial({ color: '#2e140a', roughness: 0.35, clearcoat: 0.6 }), U),
    // el baño de la brocha: una sola capa que sigue al pan; lo no pintado se descarta
    banio: comestible(new THREE.MeshPhysicalMaterial({ vertexColors: true, alphaTest: 0.5, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }), U),
    caras: {},
  };
}

/* ─── el entorno: una habitación difusa para los brillos ──── */
const _entornos = new WeakMap();
function entorno(renderer) {
  if (!_entornos.has(renderer)) {
    const pm = new THREE.PMREMGenerator(renderer);
    _entornos.set(renderer, pm.fromScene(new RoomEnvironment(), 0.04).texture);
    pm.dispose();
  }
  return _entornos.get(renderer);
}

/* ══════════════════ EL VISOR ════════════════════════════════
   Un lienzo con su guagua. Se gira arrastrando fuera de ella (o
   con el clic derecho), se acerca pellizcando o con la rueda. Lo
   que pasa al tocarla lo decide quien lo usa: el taller amasa o
   pinta, el regalo muerde, la vitrina solo deja mirar.           */
const esCobertura = (op) => !!op && op[0] === 8 && op[2] === COBERTURA;
const RADIO_BANIO = 0.18, GROSOR_BANIO = 0.012, RAMPA_BANIO = 0.16;
const _s = V(), _w = V(), _p = V();      // para no crear vectores en cada vértice
function distTramo(p, a, b) {
  _s.subVectors(b, a); _w.subVectors(p, a);
  const u = limita(_s.dot(_w) / Math.max(_s.lengthSq(), 1e-9), 0, 1);
  return _w.addScaledVector(_s, -u).length();
}
class Visor {
  constructor(canvas, op = {}) {
    this.op = op;
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!op.foto });
    r.setPixelRatio(op.foto ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.95;
    this.U = {
      uBocados: { value: Array.from({ length: MAX_BOCADOS }, () => new THREE.Vector4()) },
      uNBocados: { value: 0 },
      uBoca: { value: new THREE.Matrix3() },   // del mundo a los ejes de la figura
      uCoccion: { value: 1 },
    };
    this.mat = materiales(this.U);

    const s = this.scene = new THREE.Scene();
    s.environment = entorno(r);
    s.environmentIntensity = 0.5;
    this.cielo = new THREE.HemisphereLight('#fff1dc', '#5a1c50', 1.1);
    s.add(this.cielo);
    const sol = new THREE.DirectionalLight('#fff4e6', 2.3);
    sol.position.set(3, 7, 6);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 1, far: 20 });
    sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02; sol.shadow.radius = 4;
    s.add(sol);
    this.sol = sol;
    const contra = new THREE.DirectionalLight('#ffc4e1', 0.8);
    contra.position.set(-5, 3, -4);
    s.add(contra);
    this.brasa = new THREE.PointLight('#ff7a1a', 0, 12, 1.5);
    this.brasa.position.set(0, 0.6, 2.6);
    s.add(this.brasa);

    if (op.plato !== false) {
      // el plato, para decorar y para servir
      this.plato = new THREE.Group();
      const loza = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.4, 0.12, 72),
        new THREE.MeshPhysicalMaterial({ color: '#fbf7f2', roughness: 0.25, clearcoat: 0.8 }));
      loza.position.y = -0.06; loza.receiveShadow = true;
      const filete = new THREE.Mesh(new THREE.TorusGeometry(2.47, 0.025, 8, 96),
        new THREE.MeshStandardMaterial({ color: '#e01b6a', roughness: 0.4 }));
      filete.rotation.x = Math.PI / 2; filete.position.y = 0.005;
      this.plato.add(loza, filete);
      // la lata, para amasar y para el horno
      this.lata = new THREE.Group();
      const metal = new THREE.MeshStandardMaterial({ color: '#5b5f66', roughness: 0.45, metalness: 0.75 });
      const fondo = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 5), metal);
      fondo.position.y = -0.03; fondo.receiveShadow = true;
      this.lata.add(fondo);
      [[0, 2.5, 4.4, 0.06], [0, -2.5, 4.4, 0.06], [2.2, 0, 0.06, 5], [-2.2, 0, 0.06, 5]].forEach(([x, z, w, d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), metal);
        b.position.set(x, 0.02, z);
        this.lata.add(b);
      });
      this.mantel = new THREE.Mesh(new THREE.CircleGeometry(9, 96),
        new THREE.MeshStandardMaterial({ map: mantel(), transparent: true, roughness: 0.95, depthWrite: false }));
      this.mantel.rotation.x = -Math.PI / 2;
      this.mantel.position.y = -0.13;
      this.mantel.receiveShadow = true;
      s.add(this.mantel, this.plato, this.lata);
      this.ambiente('decorar');
    }

    this.camara = new THREE.PerspectiveCamera(30, 0.8, 0.1, 60);
    this.figura = new THREE.Group();
    this.pan = new THREE.Group();
    this.adornos = new THREE.Group();
    // `figura` gira como un plato giratorio; `acostada` es la masa boca arriba
    // sobre la lata: su z local apunta al cielo y su base (z = PISO) toca y = 0.
    this.acostada = new THREE.Group();
    this.acostada.rotation.x = -Math.PI / 2;
    this.acostada.position.set(0, -PISO, 1.6);
    this.banio = new THREE.Group();   // la cobertura pintada con la brocha
    this.acostada.add(this.pan, this.banio, this.adornos);
    this.figura.add(this.acostada);
    s.add(this.figura);

    this.objetivo = V(0, 1.9, 0);
    this.giro = op.giro != null ? op.giro : -0.25;
    this.capa = 0;                 // la capa de baño, un índice de BANOS (0: sin capa)
    this.cabeceo = 0.9;            // desde arriba y un poco de frente: así se mira una lata
    this.dist = 10.5;
    this.zoom = 1;
    // las medidas de la figura, para encuadrarla acostada o de pie
    this.medidas = { cx: 0, cy: 1.6, minY: 0, maxZ: 0.3, largo: 2.4, ancho: 2.4, grosor: 0.6 };
    this.dePie = 0;                // 0: acostada en la lata · 1: de pie en el plato
    this.margen = { arriba: 0, abajo: 0, derecha: 0 };   // lo que tapan la barra y el dock
    this.piezas = [];
    this.ops = []; this.objetos = []; this.extra = [];
    this.previa = null; this.piezaPrevia = null; this.previaBanio = null; this.trazosBanio = []; this.capas = [];
    this.raycaster = new THREE.Raycaster();

    if (!op.foto) {
      this.gestos();
      new ResizeObserver(() => this.medir()).observe(canvas);
      this.medir();
    }
  }

  medir() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
    this.dibujar();
  }
  /* Se amasa y se hornea en la lata; se decora y se sirve en el plato,
     sobre el mantel bordado. Dentro del horno no hay mantel. */
  ambiente(etapa) {
    if (!this.plato) return;
    this.plato.visible = etapa === 'decorar';
    this.lata.visible = etapa !== 'decorar';
    this.mantel.visible = etapa !== 'horno';
    if (this.acostada) this.dibujar();   // en el constructor todavía no hay figura
  }
  /* El horno: luz de brasa, la masa se infla y se dora. */
  hornear(k, encendido) {
    this.U.uCoccion.value = k;
    const inflado = 1 + 0.05 * limita(k, 0, 1);
    this.pan.scale.set(inflado, inflado, inflado);
    this.pan.position.z = PISO * (1 - inflado);      // se infla sin hundirse en la lata
    this.brasa.intensity = encendido ? 9 : 0;
    this.cielo.color.set(encendido ? '#ffb070' : '#fff1dc');
    this.dibujar();
  }

  /* ─── cargar una guagua entera ─────────────────────────── */
  vaciar(grupo) {
    grupo.children.slice().forEach((o) => {
      grupo.remove(o);
      o.traverse((x) => { if (x.geometry) x.geometry.dispose(); });
      if (o.isInstancedMesh) o.dispose();
    });
  }
  cargar(e, opciones = {}) {
    this.vaciar(this.adornos);
    this.ops = []; this.objetos = []; this.extra = []; this.previa = null;
    this.capa = e.capa || 0;
    this.ponerMasa(e.a);
    this.hornear(e.k / 100, false);
    this.previaBanio = null;
    e.o.forEach((op) => this.agregar(op, true));
    this.rehacerBanio();
    this.actualizarBocados();
    if (opciones.encuadrar !== false) this.encuadrar();
    this.dibujar();
  }
  /* Cambia la capa de baño: vuelve a pintar el pan con el color elegido. */
  ponerCapa(i) {
    this.capa = i;
    this.ponerMasa(this.piezas || []);
  }
  ponerMasa(piezas) {
    this.vaciar(this.pan);
    this.piezaPrevia = null;
    this.piezas = piezas.slice();
    this.piezas.forEach((p, i) => this.pan.add(this.mallaPieza(p, i)));
    this.dibujar();
  }
  mallaPieza(p, i) {
    const o = this.malla(dorar(geometriaPieza(p), masaDe(p), BANOS[this.capa].c), this.mat.pan);
    o.userData.pieza = i;
    return o;
  }
  cambiarPieza(i, p) {
    const vieja = this.pan.children.find((o) => o.userData.pieza === i);
    if (vieja) { this.pan.remove(vieja); vieja.geometry.dispose(); }
    this.piezas[i] = p;
    this.pan.add(this.mallaPieza(p, i));
    this.dibujar();
  }
  previaPieza(p) {
    if (this.piezaPrevia) { this.scene.remove(this.piezaPrevia); this.piezaPrevia.geometry.dispose(); this.piezaPrevia = null; }
    if (p) {
      this.piezaPrevia = new THREE.Mesh(geometriaPieza(p), this.mat.previa);
      this.piezaPrevia.castShadow = true;
      this.figura.updateMatrixWorld();
      this.piezaPrevia.applyMatrix4(this.acostada.matrixWorld);
      this.scene.add(this.piezaPrevia);
    }
    this.dibujar();
  }
  /* El encuadre sale del tamaño de lo que hay: un caballito pide más
     lejos que una gallinita. */
  encuadrar() {
    const caja = new THREE.Box3();
    this.piezas.forEach((p) => caja.union(new THREE.Box3().setFromBufferAttribute(geometriaPieza(p).attributes.position)));
    this.zoom = 1;
    if (caja.isEmpty()) { this.medidas = { cx: 0, cy: 1.6, minY: 0, maxZ: 0.3, largo: 2.4, ancho: 2.4, grosor: 0.6 }; return; }
    const c = caja.getCenter(V()), t = caja.getSize(V());
    this.medidas = {
      cx: c.x, cy: c.y, minY: caja.min.y, maxZ: caja.max.z,
      largo: t.y / 2 + 0.45, ancho: t.x / 2 + 0.45, grosor: (caja.max.z - PISO) / 2 + 0.35,
    };
  }
  /* Acostada en la lata para amasar y hornear; de pie en el plato para
     decorar, con la espalda plana que le dejó la lata. Con `animar` se
     levanta (o se acuesta) en medio segundo. */
  postura(dePie, animar) {
    if (!animar || quieto) { this.dePie = dePie; this.dibujar(); return; }
    const de = this.dePie, t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 650);
      this.dePie = de + (dePie - de) * (1 - (1 - k) ** 3);
      this.dibujar();
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  malla(g, m) {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true; o.receiveShadow = true;
    return o;
  }
  /* Las figuras se arman de frente, en el plano XY, con la z hacia afuera
     del pan; miden unos 0.2 de ancho, como una flor de mazapán de verdad. */
  mazapan(id, color) {
    const g = new THREE.Group(), cr = this.mat.cremas, c = cr[color] || cr[1];
    const bola = (x, y, z, sx, sy, sz, m) => {
      const e = new THREE.SphereGeometry(1, 16, 12); e.scale(sx, sy, sz);
      const o = this.malla(e, m); o.position.set(x, y, z); g.add(o); return o;
    };
    const plana = (forma, m) => {
      const e = new THREE.ExtrudeGeometry(forma, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 14 });
      g.add(this.malla(e, m));
    };
    if (id === 'flor') {
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        bola(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.012, 0.045, 0.032, 0.016, c).rotation.z = a;
      }
      bola(0, 0, 0.022, 0.026, 0.026, 0.018, color === 6 ? cr[0] : cr[6]);   // el centro, amarillo (o blanco si la flor es amarilla)
    } else if (id === 'hoja') {
      const f = new THREE.Shape();
      f.moveTo(0, -0.1); f.quadraticCurveTo(0.07, 0, 0, 0.1); f.quadraticCurveTo(-0.07, 0, 0, -0.1);
      plana(f, c);
    } else if (id === 'corazon') {
      const f = new THREE.Shape();
      f.moveTo(0, -0.08);
      f.bezierCurveTo(-0.1, -0.02, -0.09, 0.07, -0.045, 0.07);
      f.bezierCurveTo(-0.015, 0.07, 0, 0.045, 0, 0.03);
      f.bezierCurveTo(0, 0.045, 0.015, 0.07, 0.045, 0.07);
      f.bezierCurveTo(0.09, 0.07, 0.1, -0.02, 0, -0.08);
      plana(f, c);
    } else if (id === 'estrella') {
      const f = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? 0.04 : 0.09;
        if (i) f.lineTo(Math.cos(a) * r, Math.sin(a) * r); else f.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      f.closePath();
      plana(f, c);
    } else if (id === 'mono') {
      bola(-0.05, 0, 0.01, 0.05, 0.034, 0.016, c).rotation.z = 0.25;
      bola(0.05, 0, 0.01, 0.05, 0.034, 0.016, c).rotation.z = -0.25;
      bola(0, 0, 0.018, 0.02, 0.024, 0.018, c);
    } else if (id === 'uvas') {
      [[0, 0.05], [-0.028, 0.02], [0.028, 0.02], [-0.014, -0.01], [0.014, -0.01], [0, -0.04], [-0.04, -0.012], [0.04, -0.012]]
        .forEach(([x, y]) => bola(x, y, 0.018, 0.024, 0.024, 0.02, c));
      const f = new THREE.Shape();
      f.moveTo(0, 0.07); f.quadraticCurveTo(0.05, 0.11, 0.07, 0.09); f.quadraticCurveTo(0.04, 0.07, 0, 0.07);
      plana(f, cr[5]);
    }
    return g;
  }

  /* ─── la decoración ─────────────────────────────────────
     0 manga [0, crema, boquilla, x, y, z…]
     1 roseta [1, crema, boquilla, x, y, z, nx, ny, nz]
     2 grageas [2, semilla, x, y, z, nx, ny, nz…]
     3 mordisco [3, x, y, z]
     4 carita [4, tamaño, estilo, x, y, z, nx, ny, nz]
     5 pasa [5, x, y, z, nx, ny, nz]
     6 masa de colores [6, color, x, y, z, nx, ny, nz]
     7 glaseado plano [7, color, x, y, z, nx, ny, nz…]
     8 hilo o cobertura [8, color, grosor, x, y, z, nx, ny, nz…]
     9 figura de mazapán [9, figura, tamaño, color, x, y, z, nx, ny, nz] (las primeras, sin color)  */
  construir(op) {
    const t = op[0];
    const pn = (i) => [V(op[i], op[i + 1], op[i + 2]).divideScalar(Q), V(op[i + 3], op[i + 4], op[i + 5]).normalize()];
    if (t === 0) {
      const r = BOQUILLAS[op[2]];
      const pts = [];
      for (let i = 3; i < op.length; i += 3) pts.push(V(op[i] / Q, op[i + 1] / Q, op[i + 2] / Q));
      if (pts.length < 2) {                         // un toque: un copito
        const g = new THREE.SphereGeometry(r * 1.3, 24, 16);
        g.translate(pts[0].x, pts[0].y, pts[0].z);
        return this.malla(g, this.mat.cremas[op[1]]);
      }
      return this.malla(tubo(pts, r), this.mat.cremas[op[1]]);
    }
    if (t === 1) {
      const R = BOQUILLAS[op[2]] * 2.3;
      const o = this.malla(tubo(espiral(R), R * 0.45, 7), this.mat.cremas[op[1]]);
      const [p, n] = pn(3);
      o.quaternion.setFromUnitVectors(V(0, 0, 1), n);
      o.position.copy(p).addScaledVector(n, -R * 0.15);
      return o;
    }
    if (t === 2) {
      const rnd = azar(op[1]);
      const puntos = (op.length - 2) / 6;
      const g = new THREE.CapsuleGeometry(0.022, 0.075, 3, 8);
      const im = new THREE.InstancedMesh(g, this.mat.grageas, puntos * 3);
      im.castShadow = true;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), giro = new THREE.Quaternion(), c = new THREE.Color();
      let k = 0;
      for (let i = 2; i < op.length; i += 6) {
        const [p, n] = pn(i);
        const { x: t1, y: t2 } = base(n);
        for (let j = 0; j < 3; j++) {
          const a = rnd() * Math.PI * 2, d = rnd() * 0.11;
          const pos = p.clone().addScaledVector(t1, Math.cos(a) * d).addScaledVector(t2, Math.sin(a) * d).addScaledVector(n, 0.02);
          q.setFromUnitVectors(V(0, 1, 0), t1);      // acostada sobre el pan, en cualquier dirección
          giro.setFromAxisAngle(n, rnd() * Math.PI);
          q.premultiply(giro);
          m.compose(pos, q, V(1, 1, 1));
          im.setMatrixAt(k, m);
          im.setColorAt(k, c.set(GRAGEAS[Math.floor(rnd() * GRAGEAS.length)]));
          k++;
        }
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      return im;
    }
    if (t === 4) {
      const [p, n] = pn(3);
      const { s, b, centro } = caritaEn(p, n, op[1]);
      const estilo = op[2];
      if (!this.mat.caras[estilo]) {
        this.mat.caras[estilo] = comestible(new THREE.MeshPhysicalMaterial({
          map: texturaCara(estilo), roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3,
        }), this.U);
      }
      const g = new THREE.SphereGeometry(1, 48, 32);
      g.scale(s.x, s.y, s.z);
      const o = this.malla(g, this.mat.caras[estilo]);
      o.quaternion.setFromRotationMatrix(b.m);
      o.position.copy(centro);
      return o;
    }
    if (t === 5) {
      const [p, n] = pn(1);
      const g = new THREE.SphereGeometry(1, 16, 12);
      g.scale(0.065, 0.05, 0.035);
      const o = this.malla(g, this.mat.pasa);
      o.quaternion.setFromRotationMatrix(base(n).m);
      o.position.copy(p).addScaledVector(n, 0.012);
      return o;
    }
    if (t === 7) {                                  // el glaseado plano: una cinta sobre la superficie
      const pts = [], nor = [];
      for (let i = 2; i + 5 < op.length; i += 6) {
        pts.push(V(op[i], op[i + 1], op[i + 2]).divideScalar(Q));
        nor.push(V(op[i + 3], op[i + 4], op[i + 5]).normalize());
      }
      if (pts.length < 2) {                         // un toque: una gotita plana
        const g = new THREE.SphereGeometry(1, 18, 12);
        g.scale(0.06, 0.06, 0.018);                 // un punto de glaseado: ~1/12 del ancho del pan, como en las panaderías (z: la normal)
        const o = this.malla(g, this.mat.cremas[op[1]]);
        o.quaternion.setFromRotationMatrix(base(nor[0]).m);
        o.position.copy(pts[0]).addScaledVector(nor[0], 0.004);
        return o;
      }
      return this.malla(cinta(pts, nor, BOQUILLAS[BOQUILLA_LISA], 0.006), this.mat.cremas[op[1]]);
    }
    if (t === 9) {                                  // una figura de mazapán, apoyada sobre el pan
      const nuevo = op.length === 10;              // las primeras no traían color: el suyo de siempre
      const [p, n] = pn(nuevo ? 4 : 3);
      const o = this.mazapan(FIGURAS[op[1]].id, nuevo ? op[3] : FIGURAS[op[1]].color);
      o.scale.setScalar([1.3, 1.8, 2.4][op[2]]);
      o.quaternion.setFromRotationMatrix(base(n).m);
      o.position.copy(p).addScaledVector(n, 0.006);
      return o;
    }
    if (t === 8 && op[2] === COBERTURA) return new THREE.Object3D();   // la cobertura va en el baño
    if (t === 8) {                                  // el hilo con grosor
      const pts = [], nor = [];
      for (let i = 3; i + 5 < op.length; i += 6) {
        pts.push(V(op[i], op[i + 1], op[i + 2]).divideScalar(Q));
        nor.push(V(op[i + 3], op[i + 4], op[i + 5]).normalize());
      }
      const ancho = ANCHOS[op[2]], grosor = op[2] === COBERTURA ? 0.012 : 0.006;
      if (pts.length < 2) {
        const g = new THREE.SphereGeometry(1, 18, 12);
        g.scale(ancho * 0.6, ancho * 0.6, grosor * 2);
        const o = this.malla(g, this.mat.cremas[op[1]]);
        o.quaternion.setFromRotationMatrix(base(nor[0]).m);
        o.position.copy(pts[0]).addScaledVector(nor[0], 0.004);
        return o;
      }
      return this.malla(cinta(pts, nor, ancho, grosor), this.mat.cremas[op[1]]);
    }
    if (t === 6) {                                  // una bolita de masa de colores, como las que se hacen al amasar
      const [p, n] = pn(2);
      const g = new THREE.SphereGeometry(1, 18, 14);
      g.scale(0.11, 0.09, 0.09);
      const o = this.malla(g, this.mat.cremas[op[1]]);
      o.quaternion.setFromRotationMatrix(base(n).m);
      o.position.copy(p).addScaledVector(n, 0.05);
      return o;
    }
    return null;                                    // el mordisco no es un objeto
  }
  agregar(op, sinDibujar) {
    const o = this.construir(op);
    if (o) this.adornos.add(o);
    this.ops.push(op); this.objetos.push(o);
    if (op[0] === 3) this.actualizarBocados();
    if (esCobertura(op) && !sinDibujar) {
      if (op === this.previaBanio) { this.previaBanio = null; this.capas.forEach((cp) => cp.pd.fill(9)); }
      if (this.capas && this.capas.length) { this.pintarTrazo(op, false, 0); this.componerBanio(); } else this.rehacerBanio();
    }
    if (!sinDibujar) this.dibujar();
  }
  quitarUltimo() {
    const op = this.ops.pop(), o = this.objetos.pop();
    if (o) { this.adornos.remove(o); o.traverse((x) => { if (x.geometry) x.geometry.dispose(); }); if (o.isInstancedMesh) o.dispose(); }
    if (op && op[0] === 3) this.actualizarBocados();
    if (esCobertura(op)) this.rehacerBanio();
    this.dibujar();
  }
  vistaPrevia(op) {
    if (esCobertura(op)) { this.previaDeBanio(op); this.dibujar(); return; }   // la brocha pinta el baño mismo
    if (this.previaBanio && !op) return;           // al soltar, el trazo se suma al agregarlo
    if (this.previa) { this.adornos.remove(this.previa); this.previa.geometry.dispose(); this.previa = null; }
    if (op) { this.previa = this.construir(op); if (this.previa) this.adornos.add(this.previa); }
    this.dibujar();
  }
  morder(op) { this.extra.push(op); this.actualizarBocados(); this.dibujar(); }
  bocados() { return this.ops.concat(this.extra).filter((op) => op[0] === 3).slice(0, MAX_BOCADOS); }
  actualizarBocados() { this.U.uNBocados.value = this.bocados().length; }

  /* ─── tocar la guagua ──────────────────────────────────── */
  rayo(origen, dir, soloPan) {
    this.raycaster.set(origen, dir);
    const blancos = soloPan ? this.pan.children : this.pan.children.concat(this.adornos.children.filter((o) => !o.isInstancedMesh && o !== this.previa));
    const h = this.raycaster.intersectObjects(blancos, false)[0];
    if (!h) return null;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (n.dot(dir) > 0) n.negate();
    const inv = this.acostada.getWorldQuaternion(new THREE.Quaternion()).invert();
    const p = this.acostada.worldToLocal(h.point.clone());
    n.applyQuaternion(inv).normalize();
    if (!soloPan && this.cubre(p)) p.addScaledVector(n, GROSOR_BANIO);
    return { p, n, pieza: h.object.userData.pieza };
  }
  apuntar(ev) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.ubicar();
    this.raycaster.setFromCamera(ndc, this.camara);
    return this.raycaster.ray.clone();
  }
  /* ─── el baño de la brocha ──────────────────────────────
     Los trazos de cobertura no se dibujan uno encima de otro: juntos marcan
     qué parte del pan está bañada, y hay una sola capa que copia al pan un
     poco por fuera. Cada vértice guarda su distancia al trazo más cercano; el
     borde se interpola entre vértices y se corta justo en el radio, así sale
     redondo. El color es el del último trazo que lo cubre. Mientras se pinta,
     solo se calcula el tramo nuevo. */
  rehacerBanio() {
    this.vaciar(this.banio);
    this.capas = [];
    this.trazosBanio = [];
    this.previaN = 0;
    const ops = this.ops.filter(esCobertura);
    if (!ops.length && !this.previaBanio) return;
    this.pan.updateMatrix();
    const P = V(), N = V(), M = new THREE.Matrix4(), NM = new THREE.Matrix3();
    this.pan.children.forEach((pieza) => {
      pieza.updateMatrix();
      M.multiplyMatrices(this.pan.matrix, pieza.matrix);
      NM.getNormalMatrix(M);
      const g = pieza.geometry.clone();
      g.deleteAttribute('color');
      const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
      const sobre = new Float32Array(n * 3);          // el punto del pan, sin levantar
      for (let i = 0; i < n; i++) {
        P.fromBufferAttribute(pos, i).applyMatrix4(M);
        N.fromBufferAttribute(nor, i).applyMatrix3(NM).normalize();
        sobre.set([P.x, P.y, P.z], i * 3);
        P.addScaledVector(N, GROSOR_BANIO);
        pos.setXYZ(i, P.x, P.y, P.z);
        nor.setXYZ(i, N.x, N.y, N.z);
      }
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
      g.computeBoundingSphere();
      const mesh = this.malla(g, this.mat.banio);
      this.banio.add(mesh);
      this.capas.push({ mesh, sobre, n, d: new Float32Array(n).fill(9), rgb: new Float32Array(n * 3), pd: new Float32Array(n).fill(9) });
    });
    ops.forEach((op) => this.pintarTrazo(op, false, 0));
    if (this.previaBanio) { this.pintarTrazo(this.previaBanio, true, 0); this.previaN = this.puntosDe(this.previaBanio).length; }
    this.componerBanio();
  }
  puntosDe(op) {
    const pts = [];
    for (let i = 3; i + 5 < op.length; i += 6) pts.push(V(op[i], op[i + 1], op[i + 2]).divideScalar(Q));
    return pts;
  }
  /* Suma un trazo (desde el punto `desde`) a las distancias de cada vértice. */
  pintarTrazo(op, previa, desde) {
    const pts = this.puntosDe(op), c = new THREE.Color(CREMAS[op[1]].c), alcance = RADIO_BANIO + RAMPA_BANIO / 2;
    if (!previa) this.trazosBanio.push(pts);
    else this.colorPrevia = c;
    const caja = new THREE.Box3(), P = _p;
    const tramos = pts.length === 1 ? [[pts[0], pts[0]]] : [];
    for (let i = Math.max(1, desde); i < pts.length; i++) tramos.push([pts[i - 1], pts[i]]);
    if (desde > 0 && pts.length === 1) return;
    this.capas.forEach((cp) => {
      tramos.forEach(([a, b]) => {
        caja.makeEmpty().expandByPoint(a).expandByPoint(b).expandByScalar(alcance);
        for (let i = 0; i < cp.n; i++) {
          P.fromArray(cp.sobre, i * 3);
          if (!caja.containsPoint(P)) continue;
          const d = distTramo(P, a, b);
          if (previa) { if (d < cp.pd[i]) cp.pd[i] = d; continue; }
          if (d < cp.d[i]) cp.d[i] = d;
          if (d <= alcance) cp.rgb.set([c.r, c.g, c.b], i * 3);   // el último trazo que lo cubre pone el color
        }
      });
    });
  }
  componerBanio() {
    const alcance = RADIO_BANIO + RAMPA_BANIO / 2, pc = this.colorPrevia;
    this.capas.forEach((cp) => {
      const col = cp.mesh.geometry.attributes.color, a = col.array;
      for (let i = 0; i < cp.n; i++) {
        const D = Math.min(cp.d[i], cp.pd[i]);
        a[i * 4 + 3] = limita(0.5 + (RADIO_BANIO - D) / RAMPA_BANIO, 0, 1);
        if (cp.pd[i] <= alcance && pc) { a[i * 4] = pc.r; a[i * 4 + 1] = pc.g; a[i * 4 + 2] = pc.b; }
        else { a[i * 4] = cp.rgb[i * 3]; a[i * 4 + 1] = cp.rgb[i * 3 + 1]; a[i * 4 + 2] = cp.rgb[i * 3 + 2]; }
      }
      col.needsUpdate = true;
    });
  }
  /* La brocha mientras se arrastra: solo el tramo nuevo. */
  previaDeBanio(op) {
    if (!this.capas || !this.capas.length) { this.previaBanio = op; this.rehacerBanio(); return; }
    if (op !== this.previaBanio) { this.capas.forEach((cp) => cp.pd.fill(9)); this.previaN = 0; }
    this.previaBanio = op;
    if (op) {
      this.pintarTrazo(op, true, Math.max(0, this.previaN - 1));
      this.previaN = this.puntosDe(op).length;
    }
    this.componerBanio();
  }
  /* ¿Está bañado este punto? Lo que se pone encima queda sobre la capa. */
  cubre(p) {
    for (const pts of this.trazosBanio) {
      if (pts.length === 1 && p.distanceTo(pts[0]) <= RADIO_BANIO) return true;
      for (let i = 1; i < pts.length; i++) if (distTramo(p, pts[i - 1], pts[i]) <= RADIO_BANIO) return true;
    }
    return false;
  }
  tocar(ev, soloPan) {
    const ray = this.apuntar(ev);
    return this.rayo(ray.origin, ray.direction, soloPan);
  }
  /* Donde el dedo cruza el plano z = cte de la figura (para amasar en el aire). */
  alPlano(ev, z) {
    const ray = this.apuntar(ev).applyMatrix4(this.acostada.matrixWorld.clone().invert());
    return ray.intersectPlane(new THREE.Plane(V(0, 0, 1), -z), V());
  }
  /* Un rayo en coordenadas de la figura: sirve para amoldar la crema a la superficie. */
  rayoLocal(p, dir, soloPan) {
    this.figura.updateMatrixWorld();
    const o = this.acostada.localToWorld(p.clone());
    const d = dir.clone().applyQuaternion(this.acostada.getWorldQuaternion(new THREE.Quaternion())).normalize();
    return this.rayo(o, d, soloPan);
  }
  /* Para «Sorpréndeme»: tirar un rayo de frente, como si la figura no estuviera girada. */
  deFrente(x, y, soloPan = true) {
    return this.rayoLocal(V(x, y, 10), V(0, 0, -1), soloPan);
  }

  /* Los gestos, pensados para el dedo:
       · un dedo sobre la figura: amasa, pinta o muerde (lo decide `op.toca`);
       · un dedo fuera de ella: gira (salvo al amasar, que es de frente);
       · dos dedos: giran y acercan a la vez, como en cualquier app de 3D.
     El primer dedo espera un instante antes de pintar: si en ese rato
     llega el segundo, era un gesto y no se mancha nada. Con el ratón no
     se espera: el clic derecho gira y la rueda acerca.                 */
  gestos() {
    const c = this.canvas, ptrs = new Map();
    let modo = null, gesto = null, espera = null;
    const ESPERA = 110, HOLGURA = 9;
    const copia = (e) => ({ clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType });
    const par = () => {
      const [a, b] = [...ptrs.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)) };
    };
    const decidir = (e) => {
      if (espera) { clearTimeout(espera.t); espera = null; }
      if (this.op.toca && this.op.toca(e)) { modo = this.op.arrastra ? 'pinta' : 'nada'; return; }
      modo = this.fijo ? 'nada' : 'gira';
      if (modo === 'gira') c.classList.add('lienzo--girando');
    };
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        if (espera) { clearTimeout(espera.t); espera = null; }
        if (modo === 'pinta' && this.op.cancela) this.op.cancela();
        modo = 'dos'; gesto = Object.assign(par(), { zoom: this.zoom });
        return;
      }
      if (ptrs.size > 2) return;
      if (e.pointerType === 'mouse') {
        if (e.button === 2) { modo = this.fijo ? 'nada' : 'gira'; return; }
        decidir(e);
        return;
      }
      modo = 'espera';
      const ini = copia(e);
      espera = { e: ini, t: setTimeout(() => { if (modo === 'espera') decidir(ini); }, ESPERA) };
    });
    c.addEventListener('pointermove', (e) => {
      const prev = ptrs.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (modo === 'espera') {
        if (Math.hypot(e.clientX - espera.e.clientX, e.clientY - espera.e.clientY) < HOLGURA) return;
        decidir(espera.e);
        if (modo === 'pinta') this.op.arrastra(e);
        return;
      }
      if (modo === 'gira') {
        this.giro += dx * 0.012;
        this.cabeceo = limita(this.cabeceo + dy * 0.006, ...this.limitesCabeceo());
        this.dibujar();
      } else if (modo === 'pinta') {
        this.op.arrastra(e);
      } else if (modo === 'dos' && ptrs.size === 2) {
        const k = par();
        if (!this.fijo) {
          this.giro += (k.x - gesto.x) * 0.011;
          this.cabeceo = limita(this.cabeceo + (k.y - gesto.y) * 0.006, ...this.limitesCabeceo());
        }
        this.zoom = limita(gesto.zoom * gesto.d / k.d, 0.45, 1.7);
        gesto.x = k.x; gesto.y = k.y;
        this.dibujar();
      }
    });
    const suelta = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (modo === 'espera') {                        // fue un toque
        decidir(espera.e);
        if (modo === 'pinta' && this.op.suelta) this.op.suelta(e);
        modo = null;
      } else if (modo === 'pinta' && this.op.suelta) this.op.suelta(e);
      if (!ptrs.size) modo = null;
      else if (modo === 'dos') modo = 'nada';
      c.classList.remove('lienzo--girando');
    };
    c.addEventListener('pointerup', suelta);
    /* Si el navegador quita la captura sin mandar `pointerup` (pasa en Safari),
       el puntero quedaría registrado y la mesa seguiría girando sola. */
    c.addEventListener('lostpointercapture', suelta);
    c.addEventListener('pointercancel', (e) => {
      if (espera) { clearTimeout(espera.t); espera = null; }
      if (modo === 'pinta' && this.op.cancela) this.op.cancela();
      modo = 'nada';
      ptrs.delete(e.pointerId);
      if (!ptrs.size) modo = null;
    });
    /* La rueda acerca; el desplazamiento horizontal del trackpad (o la
       rueda con Shift) gira. Los deltas se acotan: el scroll suave y los
       trackpads mandan ráfagas que, sin tope, pegaban saltos. */
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
      const dy = limita(e.deltaY * k, -60, 60), dx = limita(e.deltaX * k, -60, 60);
      if (!e.ctrlKey && !this.fijo && (e.shiftKey || Math.abs(dx) > Math.abs(dy) * 1.5)) {
        this.giro += (Math.abs(dx) > Math.abs(dy) ? dx : dy) * 0.004;   // con Shift el navegador ya lo vuelve horizontal
      } else {
        this.zoom = limita(this.zoom * Math.exp(dy * 0.0016), 0.45, 1.7);
      }
      this.dibujar();
    }, { passive: false });
  }
  girar(a, absoluto) {
    const de = this.giro, hasta = absoluto ? a : de + a, t0 = performance.now(), dur = quieto ? 1 : 380;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      this.giro = de + (hasta - de) * (1 - (1 - k) ** 3);
      this.dibujar();
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ─── pintar ───────────────────────────────────────────── */
  /* La cámara encuadra lo que hay en el hueco que dejan libre la barra y
     el dock, no en toda la pantalla: el centro se corre con `setViewOffset`
     y la distancia crece lo que haga falta para que entre entero. */
  limitesCabeceo() {
    const t = this.dePie;
    return [0.3 + (-0.05 - 0.3) * t, 1.45 + (0.95 - 1.45) * t];
  }
  ubicar() {
    // la postura: de acostada (base sobre la lata) a parada (pies en el plato),
    // siempre con el centro de la figura sobre el eje del plato giratorio
    const md = this.medidas, t = this.dePie;
    this.acostada.rotation.x = -Math.PI / 2 * (1 - t);
    this.acostada.position.set(-md.cx, -PISO + (-md.minY + PISO) * t, md.cy + (-(PISO + md.maxZ) / 2 - md.cy) * t);
    this.objetivo.set(0, 0.3 + (md.cy - md.minY - 0.3) * t, 0);
    const o = this.objetivo;
    this.figura.rotation.y = this.giro;
    this.figura.updateMatrixWorld();
    const w = (this.op.foto ? this.canvas.width : this.canvas.clientWidth) || 800;
    const h = (this.op.foto ? this.canvas.height : this.canvas.clientHeight) || 1000;
    const m = this.margen;
    const libreW = Math.max(160, w - m.derecha), libreH = Math.max(160, h - m.arriba - m.abajo);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camara.fov / 2));
    // lo que se ve de alto depende de la postura y de cuán desde arriba se mire
    const { largo, ancho, grosor } = md;
    const sc = Math.sin(this.cabeceo), cc = Math.cos(this.cabeceo);
    const alto = (largo * sc + grosor * cc) * (1 - t) + (largo * cc + grosor * sc) * t;
    const radio = Math.max(largo, ancho) * (1 - t) + Math.max(ancho, grosor) * t;
    const dv = alto / tan * (h / libreH);
    const dh = radio / (tan * (w / h)) * (w / libreW);
    this.dist = Math.max(dv, dh) * this.zoom;
    if (m.arriba || m.abajo || m.derecha) this.camara.setViewOffset(w, h, m.derecha / 2, (m.abajo - m.arriba) / 2, w, h);
    else if (this.camara.view) this.camara.clearViewOffset();
    this.camara.position.set(o.x, o.y + Math.sin(this.cabeceo) * this.dist, o.z + Math.cos(this.cabeceo) * this.dist);
    this.camara.lookAt(o);
    // los mordiscos viven en la figura: se llevan al mundo en cada cuadro
    const e = this.acostada.matrixWorld.elements;
    const ex = V(e[0], e[1], e[2]).normalize(), ey = V(e[4], e[5], e[6]).normalize(), ez = V(e[8], e[9], e[10]).normalize();
    this.U.uBoca.value.set(ex.x, ex.y, ex.z, ey.x, ey.y, ey.z, ez.x, ez.y, ez.z);
    this.bocados().forEach((op, i) => {
      const p = this.acostada.localToWorld(V(op[1] / Q, op[2] / Q, op[3] / Q));
      this.U.uBocados.value[i].set(p.x, p.y, p.z, MORDIDA);
    });
  }
  dibujar() {
    if (this.op.foto) { this.ubicar(); this.renderer.render(this.scene, this.camara); return; }
    if (this._pendiente) return;
    this._pendiente = true;
    requestAnimationFrame(() => {
      this._pendiente = false;
      this.ubicar();
      this.renderer.render(this.scene, this.camara);
    });
  }
}

/* ─── la foto: la misma guagua, de frente y sin plato ─────── */
let estudio = null;
function foto(e, w, h, extra) {
  if (!estudio) estudio = new Visor(lienzo(w, h), { foto: true, plato: false, giro: 0 });
  estudio.renderer.setSize(w, h, false);
  estudio.camara.aspect = w / h;
  estudio.camara.updateProjectionMatrix();
  estudio.cabeceo = echada(e) ? 0.85 : 0.12;   // de frente, como en la panadería
  estudio.dePie = echada(e) ? 0 : 1;
  estudio.cargar(e);
  (extra || []).forEach((op) => estudio.extra.push(op));
  estudio.actualizarBocados();
  estudio.dibujar();
  const c = lienzo(w, h);
  c.getContext('2d').drawImage(estudio.canvas, 0, 0, w, h);
  return c;
}

/* ─── el bodegón: la guagua en su plato, con su colada (o su velita) ─── */
/* Una taza de colada morada de verdad, en 3D: loza con filete fucsia, la
   colada espesa encima y pedacitos de piña, frutilla y mortiño. */
function taza3d() {
  const g = new THREE.Group();
  // de barro, como los jarritos de la colada: mate y del color de la tierra, para que no le robe la mirada a la guagua
  const loza = new THREE.MeshStandardMaterial({ color: '#9b5a36', roughness: 0.88, side: THREE.DoubleSide });
  const perfil = [[0, 0], [0.5, 0], [0.56, 0.05], [0.6, 0.6], [0.64, 1.15], [0.62, 1.2], [0.58, 1.18], [0.55, 0.15], [0, 0.15]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), loza);
  const filete = new THREE.Mesh(new THREE.CylinderGeometry(0.627, 0.618, 0.08, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: '#7c4227', roughness: 0.9 }));   // una franja apenas más oscura, como pintada a mano
  filete.position.y = 0.82;
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.075, 16, 40, Math.PI), loza);
  asa.rotation.z = -Math.PI / 2; asa.position.set(0.6, 0.64, 0);
  const colada = new THREE.Mesh(new THREE.CircleGeometry(0.575, 64),
    new THREE.MeshStandardMaterial({ color: '#3d0a2e', roughness: 0.32, envMapIntensity: 0.25 }));
  colada.rotation.x = -Math.PI / 2; colada.position.y = 1.07;
  g.add(cuerpo, filete, asa, colada);
  const r = azar(11), frutas = ['#7a1f4f', '#8e1b2e', '#2b1d4f', '#5e1538', '#a3243a'];   // mortiño, mora y frutilla: solo morados y rojos oscuros
  for (let i = 0; i < 9; i++) {
    const c = frutas[i % frutas.length], a = r() * Math.PI * 2, d = 0.1 + r() * 0.36;
    const m = new THREE.Mesh(c === '#2b1d4f' ? new THREE.SphereGeometry(0.045, 12, 8) : new THREE.BoxGeometry(0.09, 0.05, 0.09),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
    m.position.set(Math.cos(a) * d, 1.085, Math.sin(a) * d); m.rotation.y = r() * 3;
    g.add(m);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.boca = V(0, 1.2, 0);          // de aquí sale el vapor
  return g;
}
/* La velita para las dedicadas: cera, pabilo y una llama que alumbra. */
function vela3d() {
  const g = new THREE.Group();
  const cera = new THREE.MeshStandardMaterial({ color: '#f4ead8', roughness: 0.55 });
  const platito = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: '#e01b6a', roughness: 0.4 }));
  platito.position.y = 0.04;
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.3, 40), cera);
  cuerpo.position.y = 0.73;
  const gota = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), cera);
  gota.scale.set(1, 2.2, 1); gota.position.set(0.17, 1.22, 0.1);
  const pabilo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), new THREE.MeshBasicMaterial({ color: '#2e0f36' }));
  pabilo.position.y = 1.43;
  const llama = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffb02e', toneMapped: false }));
  llama.scale.set(0.075, 0.19, 0.075); llama.position.y = 1.6;
  const centro = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff6d0', toneMapped: false }));
  centro.scale.set(0.035, 0.09, 0.035); centro.position.y = 1.55;
  const luz = new THREE.PointLight('#ffb347', 6, 5, 1.6);
  luz.position.y = 1.65;
  g.add(platito, cuerpo, gota, pabilo, llama, centro, luz);
  [platito, cuerpo, gota].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  g.userData.boca = V(0, 1.6, 0);          // aquí brilla la llama
  return g;
}
/* La canasta de mimbre, como las de juguete: tiras redondeadas que pasan por
   delante y por detrás de las varas, un borde de soga trenzada y un asa torcida.
   Se arma a medida: `R` es el radio de la boca y `alto` la altura del cesto; el asa
   sube `asa` por encima del borde y va un poco atrás, para no atravesar lo de adentro. */
function canasta3d(R, alto, asa) {
  const g = new THREE.Group();
  const mimbre = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 });
  const tono = ['#7e5132', '#74492b', '#86583a', '#6c4428'].map(mimbre);   // tostado: más oscuro que el pan, para que la guagua resalte
  const oscuro = mimbre('#4f2f18'), soga = mimbre('#6a4024');
  const rb = R * 0.74;                                   // el fondo es más angosto que la boca
  const radio = (t) => rb + (R - rb) * Math.pow(t, 0.75) + Math.sin(t * Math.PI) * R * 0.03;
  const N = 16, gruesa = R * 0.04, filas = Math.max(4, Math.round(alto / (gruesa * 2.9)));
  // las varas
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, pts = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, r = radio(t); pts.push(V(Math.cos(a) * r, t * alto, Math.sin(a) * r)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, gruesa * 0.7, 8), oscuro));
  }
  // las tiras: cada tramo entre dos varas va por fuera o por dentro, alternando
  for (let f = 0; f < filas; f++) {
    const t = (f + 0.6) / (filas + 0.3), y = t * alto, r = radio(t);
    for (let i = 0; i < N; i++) {
      const fuera = (i + f) % 2 ? gruesa * 1.1 : -gruesa * 0.5, pts = [];   // por fuera o por dentro de la vara
      for (let k = 0; k <= 6; k++) {
        const a = ((i + k / 6) / N) * Math.PI * 2, rr = r + fuera * Math.sin((k / 6) * Math.PI) + gruesa * 0.15;
        pts.push(V(Math.cos(a) * rr, y, Math.sin(a) * rr));
      }
      const tira = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, gruesa, 8), tono[(f + i * 3) % tono.length]);
      tira.scale.y = 1.25;
      tira.position.y = y * (1 - 1.25);                 // la tira se aplana hacia los lados, no se corre
      g.add(tira);
    }
  }
  // la soga: dos hebras torcidas alrededor de un círculo (el borde, y abajo el pie)
  const trenza = (rc, y, grosor, vueltas) => {
    [0, Math.PI].forEach((fase) => {
      const pts = [];
      for (let k = 0; k <= 360; k++) {
        const th = (k / 360) * Math.PI * 2, q = th * vueltas + fase;
        const rr = rc + Math.cos(q) * grosor * 0.7;
        pts.push(V(Math.cos(th) * rr, y + Math.sin(q) * grosor * 0.7, Math.sin(th) * rr));
      }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 720, grosor, 8, true), soga));
    });
  };
  trenza(radio(1) + gruesa * 0.4, alto + gruesa * 0.6, gruesa * 1.1, 70);
  trenza(rb + gruesa * 0.3, gruesa * 0.8, gruesa * 0.9, 60);
  const fondo = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb, gruesa, 48), oscuro);
  fondo.position.y = gruesa * 0.5;
  g.add(fondo);
  // el asa, torcida, un poco atrás
  const z = -R * 0.35, x = Math.sqrt(R * R - z * z) * 0.97;
  const camino = new THREE.CubicBezierCurve3(V(-x, alto, z), V(-x * 1.05, alto + asa * 1.3, z), V(x * 1.05, alto + asa * 1.3, z), V(x, alto, z));
  [0, Math.PI].forEach((fase) => {
    const pts = [];
    for (let k = 0; k <= 160; k++) {
      const t = k / 160, p = camino.getPoint(t), tg = camino.getTangent(t);
      const lado = V().crossVectors(tg, V(0, 0, 1)).normalize(), q = t * 26 + fase;
      p.addScaledVector(lado, Math.cos(q) * gruesa * 0.8).add(V(0, 0, Math.sin(q) * gruesa * 0.8));
      pts.push(p);
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, gruesa * 1.1, 8), mimbre('#5e3920')));
  });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
let bodega = null;
/* Las piezas del bodegón se renderizan por separado y sin plato, cada una
   recortada a lo que tiene: así la tarjeta las acomoda como mejor queden. */
function estudioBodegon(lado) {
  if (!bodega) {
    bodega = new Visor(lienzo(lado, lado), { foto: true, giro: 0 });
    bodega.plato.visible = false; bodega.lata.visible = false; bodega.mantel.visible = false;
    bodega.taza = taza3d(); bodega.vela = vela3d();
    bodega.scene.add(bodega.taza, bodega.vela);
    bodega.taza.position.set(0, -0.12, 0); bodega.vela.position.set(0, -0.12, 0);
    Object.assign(bodega.sol.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    bodega.sol.shadow.camera.updateProjectionMatrix();
    bodega.sol.shadow.mapSize.set(2048, 2048);
  }
  const b = bodega;
  b.renderer.setSize(lado, lado, false);
  b.camara.aspect = 1; b.camara.updateProjectionMatrix();
  b.plato.visible = false; b.lata.visible = false; b.mantel.visible = false;
  b.taza.visible = false; b.vela.visible = false;
  if (b.camara.view) b.camara.clearViewOffset();
  return b;
}
function encuadrarBodegon(b, objeto, cabeceo, holgura = 1.04) {
  const caja = new THREE.Box3().setFromObject(objeto);
  const centro = caja.getCenter(V(0, 0, 0)), radio = caja.getSize(V(0, 0, 0)).length() / 2;
  const d = radio / Math.sin(THREE.MathUtils.degToRad(b.camara.fov / 2)) * holgura;
  b.camara.position.set(centro.x, centro.y + Math.sin(cabeceo) * d, centro.z + Math.cos(cabeceo) * d);
  b.camara.lookAt(centro);
}
function recortado(b, lado) {
  const c = lienzo(lado, lado);
  c.getContext('2d').drawImage(b.canvas, 0, 0);
  const r = recorte(c);
  const out = lienzo(r.w, r.h);
  out.getContext('2d').drawImage(c, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return { img: out, r };
}
/* La guagua sola, de frente (o desde arriba si va echada), sin plato. */
function retrato(e, lado = 1400) {
  const b = estudioBodegon(lado);
  Object.assign(b, posturaDe(e));
  b.cabeceo = echada(e) ? 0.8 : 0.22;
  b.cargar(e);
  b.ubicar();
  encuadrarBodegon(b, b.figura, b.cabeceo);
  b.renderer.render(b.scene, b.camara);
  return recortado(b, lado).img;
}
/* La tarjeta en 3D: la guagua parada dentro de la canasta, la colada morada (o la
   velita) a su lado y unas flores de mazapán asomando. Todo en la misma escena, así
   el tejido tapa de verdad lo que va adentro y las sombras caen donde deben. Devuelve
   la imagen recortada y dónde queda la boca de la taza (para el vapor o el brillo). */
function enCanasta(e, memoria, opciones = {}, lado = 1600) {
  const conCanasta = opciones.canasta !== false, conColada = opciones.colada !== false;
  const b = estudioBodegon(lado);
  Object.assign(b, posturaDe(e));
  b.cabeceo = echada(e) ? 0.8 : 0.22;
  b.cargar(e);
  b.ubicar();
  b.figura.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(b.pan);
  const H = caja.max.y - caja.min.y, A = Math.max(caja.max.x - caja.min.x, caja.max.z - caja.min.z);
  const alto = H * (echada(e) ? 0.42 : 0.36);   // echada, la pared más baja para que se le vea la carita
  const cosa = memoria ? b.vela : b.taza;
  // sin canasta, la taza (o la vela) se mide contra la guagua: un poco más alta que su cintura
  const Ax = caja.max.x - caja.min.x, talla = Math.max(H, Math.min(A, Ax * 1.4) * 0.7);   // echada, la talla es su largo, no su alto
  const medida = H * (echada(e) ? 0.68 : 0.36);         // la taza no se achica con la canasta bajita del echado (y desde arriba se ve más chica)
  const k = (conCanasta ? medida * (memoria ? 1.5 : 1.15) : talla * (memoria ? 0.62 : 0.46)) / (memoria ? 1.65 : 1.2);
  /* Lado a lado y sin tocarse: la guagua a la izquierda, la taza (o la vela) a la
     derecha, con un respiro entre las dos; la canasta mide lo que ocupan juntas. */
  const ancho = conCanasta ? A : Ax;                    // sin canasta, la taza va junto al costado de la figura
  const rc = conColada ? (memoria ? 0.42 : 0.64) * k : 0, aire = conColada ? ancho * 0.08 : 0, fila = ancho + aire + 2 * rc;
  const R = Math.max(fila / 2 * 1.12, H * 0.5, A * 0.62);
  if (b.canasta) { b.scene.remove(b.canasta); b.vaciar(b.canasta); b.canasta = null; }
  const cx = (caja.min.x + caja.max.x) / 2, cz = (caja.min.z + caja.max.z) / 2;
  const medio = cx + fila / 2 - ancho / 2;              // el centro de lo que va junto
  if (conCanasta) {
    b.canasta = canasta3d(R, alto, H - alto + R * 0.25);
    b.canasta.position.set(medio, caja.min.y - R * 0.05, cz);
    b.scene.add(b.canasta);
    // un ramito de flores de mazapán asomando por atrás, entre la guagua y la taza
    const flores = new THREE.Group();
    [[-0.32, -0.5, 1.22, 2], [-0.12, -0.54, 1.4, 6], [0.08, -0.54, 1.52, 1], [0.28, -0.5, 1.42, 0],
      [0.46, -0.42, 1.26, 6], [-0.02, -0.42, 1.12, 0], [0.62, -0.32, 1.1, 2], [0.2, -0.4, 1.18, 2]].forEach(([fx, fz, fy, c]) => {
      const fl = b.mazapan('flor', memoria ? 6 : c);
      fl.scale.setScalar(R * 1.5);
      fl.position.set(medio + fx * R, caja.min.y + alto * fy, cz - R * 0.3 + fz * R);
      fl.lookAt(fl.position.clone().add(V(-0.3, 0.4, 1)));
      flores.add(fl);
    });
    b.canasta.add(flores); flores.position.sub(b.canasta.position);
  }
  if (conColada) {
    cosa.visible = true;
    cosa.scale.setScalar(k);
    cosa.rotation.y = memoria ? 0 : Math.PI * 0.38;        // el asa de la taza, hacia atrás y a la derecha
    cosa.position.set(medio + fila / 2 - rc, caja.min.y + (conCanasta ? R * 0.04 : 0), cz - (conCanasta ? R * 0.06 : 0));
  }
  const marco = new THREE.Box3().setFromObject(b.pan);
  if (conCanasta) marco.union(new THREE.Box3().setFromObject(b.canasta));
  if (conColada) marco.union(new THREE.Box3().setFromObject(cosa));
  const centro = marco.getCenter(V()), r = marco.getSize(V()).length() / 2;
  const d = r / Math.sin(THREE.MathUtils.degToRad(b.camara.fov / 2)) * 0.98;
  const mira = echada(e) ? 0.62 : 0.28;   // el perrito echado se ve mejor desde arriba: así asoma la cabeza
  b.camara.position.set(centro.x, centro.y + Math.sin(mira) * d, centro.z + Math.cos(mira) * d);
  b.camara.lookAt(centro);
  b.renderer.render(b.scene, b.camara);
  const boca = conColada ? cosa.localToWorld(cosa.userData.boca.clone()).project(b.camara) : null;
  const { img, r: rec } = recortado(b, lado);
  // la bodega queda como estaba: sin canasta, la taza y la vela en su lugar
  if (b.canasta) b.scene.remove(b.canasta);
  cosa.visible = false; cosa.scale.setScalar(1); cosa.position.set(0, -0.12, 0);
  return { img, boca: boca && { x: (boca.x + 1) / 2 * lado - rec.x, y: (1 - boca.y) / 2 * lado - rec.y } };
}
/* La taza de colada o la velita, solas, y dónde queda su boca en la imagen. */
function adorno(memoria, lado = 900) {
  const b = estudioBodegon(lado);
  b.vaciar(b.pan); b.vaciar(b.adornos);
  const cosa = memoria ? b.vela : b.taza;
  cosa.visible = true;
  cosa.rotation.y = memoria ? 0 : -0.5;
  encuadrarBodegon(b, cosa, memoria ? 0.2 : 0.42, 1.08);
  b.renderer.render(b.scene, b.camara);
  const boca = cosa.localToWorld(cosa.userData.boca.clone()).project(b.camara);
  const { img, r } = recortado(b, lado);
  return { img, boca: { x: (boca.x + 1) / 2 * lado - r.x, y: (1 - boca.y) / 2 * lado - r.y } };
}
/* El rectángulo con algo pintado (la sombra cuenta), con un margen. */
function recorte(c) {
  const { width: w, height: h } = c, px = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (px[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0) return { x: 0, y: 0, w, h };
  const m = 6;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w, x1 + m); y1 = Math.min(h, y1 + m);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/* ══════════════════ EL ENLACE ═══════════════════════════════ */

/* ─── el horno opina, y la panadera también ───────────────── */
function veredicto(e) {
  const cuenta = (t) => e.o.filter((op) => op[0] === t).length;
  const trazos = cuenta(0), rosetas = cuenta(1), grag = cuenta(2), bocados = cuenta(3);
  const colores = new Set(e.o.filter((op) => op[0] < 2).map((op) => op[1])).size;
  const k = e.k / 100, total = e.o.length;
  const cara = tieneCara(e);
  let frase;
  if (k > 1.25) frase = punto(k).f;
  else if (!total) frase = 'Le falta la decoración: con un poco de glaseado queda lista.';
  else if (bocados >= 3) frase = 'Ya tiene varios mordiscos. Se nota que estaba rica.';
  else if (bocados) frase = 'Tiene un mordisco: alguien no pudo esperar.';
  else if (k < 0.92) frase = punto(k).f;
  else if (total > 70) frase = 'Cuánto detalle. Quedó para la vitrina de la panadería.';
  else if (colores >= 6) frase = 'Muy colorida, como las de los mercados en noviembre.';
  else if (grag > trazos + rosetas) frase = 'Llena de grageas: alegre y de fiesta.';
  else if (colores === 1 && trazos > 4) frase = 'Sobria y elegante, de un solo color.';
  else if (e.f === 'libre' && e.a.length > 3) frase = 'Una figura propia, hecha a mano. Así empiezan las tradiciones.';
  else if (!cara && (e.f === 'guagua' || e.f === 'tradicional')) frase = 'Bonita, aunque le falta la carita. Toca su cara con Carita y píntale ojos y sonrisa.';
  else if (e.f === 'caballito') frase = 'Un caballito bien adornado, listo para la mesa.';
  else frase = elige([
    'Muy bonita. Así se decoraban en casa de la abuela.',
    'Quedó linda. Ahora solo falta la colada morada.',
    'Hecha con paciencia, y se nota.',
    'Una guagua como las de antes.',
  ]);
  const horno = k >= 0.92 && k <= 1.08 ? 1 : k > 1.25 || k < 0.75 ? -2 : 0;
  const nota = Math.max(1, Math.min(10, 4 + Math.min(colores, 3) + (rosetas ? 1 : 0) + (grag ? 1 : 0) + (cara ? 1 : 0) + horno - (total < 4 ? 2 : 0)));
  const razon = k > 1.25 ? 'porque se pasó de horno' : k < 0.92 ? 'porque le faltó horno' : 'porque falta la colada morada';
  const descuento = nota === 10 ? 'Diez de diez.' : `${nota}/10. Le bajé ${10 - nota} ${10 - nota === 1 ? 'punto' : 'puntos'} ${razon}.`;
  return { frase, nota, descuento };
}

/* ─── el calendario ────────────────────────────────────────── */
function faltan() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let fin = new Date(hoy.getFullYear(), 10, 2);
  if (hoy > fin) fin = new Date(hoy.getFullYear() + 1, 10, 2);
  return Math.round((fin - hoy) / 86400000);
}
function rotuloFinados() {
  const d = faltan();
  if (d === 0) return 'Hoy es Día de Difuntos';
  if (d === 1) return 'Mañana es Día de Difuntos';
  if (d > 300) return 'Finados ya pasó, pero una guagua siempre es bienvenida';
  return `Faltan ${d} días para Finados`;
}

/* ─── la tarjeta para compartir ──────────────────────────────
   Como las de Duolingo: una etiqueta, un titular, la escena con la guagua como
   protagonista, lo personal (para quién, un mensaje), la firma y el cierre. Nada
   más. Tres variantes (presúmela, envíasela a alguien, en memoria) y dos formatos:
   historia 9:16 (1080 × 1920, con ~250 px libres arriba y abajo para lo que pone la
   red encima) y cuadrado 1:1 (1080 × 1080, márgenes de 64 px). Los textos largos
   se achican o pasan a otra línea: nunca se cortan. */
const ETIQUETA = 'FINADOS · NOVIEMBRE 2026';
const CIERRE = 'Decora y comparte una guagua\u00a0de\u00a0pan en finados.una.red';
const SYNE = 'Syne, Inter, system-ui, sans-serif', INTER = 'Inter, system-ui, sans-serif';
/* Parte un texto en líneas que caben en `ancho`. Solo si `partir`, una palabra
   que sola no cabe se corta por letras (el último recurso, para un nombre larguísimo). */
function enLineas(ctx, texto, ancho, partir) {
  const lineas = [];
  let l = '';
  texto.split(/[ \t\n]+/).filter(Boolean).forEach((p) => {   // el espacio de no separación (\u00a0) no parte
    while (partir && ctx.measureText(p).width > ancho && p.length > 1) {
      if (l) { lineas.push(l); l = ''; }
      let k = p.length - 1;
      while (k > 1 && ctx.measureText(p.slice(0, k)).width > ancho) k--;
      lineas.push(p.slice(0, k)); p = p.slice(k);
    }
    const prueba = l ? l + ' ' + p : p;
    if (ctx.measureText(prueba).width > ancho && l) { lineas.push(l); l = p; } else l = prueba;
  });
  if (l) lineas.push(l);
  return lineas;
}
/* Dos líneas parejas: el corte entre palabras que deja la línea más larga lo más corta posible. */
function parejas(ctx, texto, ancho) {
  const p = texto.split(/[ \t\n]+/).filter(Boolean);
  let mejor = null;
  for (let i = 1; i < p.length; i++) {
    const ls = [p.slice(0, i).join(' '), p.slice(i).join(' ')];
    const w = Math.max(...ls.map((l) => ctx.measureText(l).width));
    if (w <= ancho && (!mejor || w < mejor.w)) mejor = { ls, w };
  }
  return mejor && mejor.ls;
}
/* El tamaño más grande (de `max` a `min`) con el que el texto cabe en `lineas` líneas sin
   partir palabras; con `una`, primero se intenta en una sola línea hasta `minUna`. Si ni
   al mínimo cabe, se queda en el mínimo con las líneas que hagan falta: nunca se corta. */
function ajustar(ctx, texto, { peso, familia, max, min, ancho, lineas = 2, estilo = '', una = false, minUna = min }) {
  const fuente = (t) => `${estilo}${peso} ${t}px ${familia}`;
  const cabe = (ls) => ls.every((l) => ctx.measureText(l).width <= ancho);
  if (una) {
    for (let t = max; t >= minUna; t -= 2) {
      ctx.font = fuente(t);
      if (ctx.measureText(texto).width <= ancho) return { t, ls: [texto], font: ctx.font };
    }
  }
  for (let t = max; t >= min; t -= 2) {
    ctx.font = fuente(t);
    let ls = enLineas(ctx, texto, ancho, false);
    if (ls.length <= lineas && cabe(ls)) {
      if (ls.length === 2) ls = parejas(ctx, texto, ancho) || ls;
      return { t, ls, font: ctx.font };
    }
  }
  ctx.font = fuente(min);
  return { t: min, ls: enLineas(ctx, texto, ancho, true), font: ctx.font };
}
/* La escena 3D es lo más lento: se guarda la última y solo se vuelve a armar si
   cambia la guagua (no si cambian los textos o el formato). */
let escenaGuardada = null;
function escenaDe(e, memoria, opciones = {}) {
  const clave = JSON.stringify([e.f, e.a, e.k, e.o, e.capa || 0, memoria, opciones.canasta !== false, opciones.colada !== false]);
  if (!escenaGuardada || escenaGuardada.clave !== clave) escenaGuardada = { clave, ...enCanasta(e, memoria, opciones) };
  return escenaGuardada;
}
const sustantivo = (e) => queEs(e).replace(/^(una|un) /, '');
/* «guagua de pan» (o «caballito de pan»…) va siempre junto: con espacios de no separación. */
const dePan = (e) => (sustantivo(e) + ' de pan').replace(/ /g, '\u00a0');
/* Los adornos que se ven: todo lo que se puso, menos los mordiscos y la cobertura. */
const contarAdornos = (e) => e.o.filter((op) => op[0] !== 3 && !(op[0] === 8 && op[2] === COBERTURA)).length;

/* El fondo no es plano: un grano fino de papel, el punteado del mantel, unas
   lucecitas desenfocadas (bokeh) y una viñeta suave que lleva la vista al centro.
   En memoria, menos luces, más tenues y tibias, como de vela. */
function fondoVivo(ctx, W, H, memoria, rnd) {
  // la luz de arriba, como una lámpara sobre la mesa
  const cielo = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, H * 0.75);
  cielo.addColorStop(0, memoria ? 'rgba(255,226,180,.07)' : 'rgba(255,150,210,.14)'); cielo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);
  // el punteado del mantel
  ctx.fillStyle = memoria ? 'rgba(255,236,200,.05)' : 'rgba(255,201,60,.1)';
  for (let y = 30; y < H; y += 54) for (let x = (y / 54 % 2) * 27 + 20; x < W; x += 54) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  // las lucecitas: círculos suaves de varios tamaños, más hacia los bordes
  const colores = memoria ? ['255,200,130'] : ['255,201,60', '255,120,180', '255,236,200'];
  const n = Math.round((memoria ? 9 : 22) * H / 1920 + (memoria ? 3 : 6));
  for (let i = 0; i < n; i++) {
    const lado = rnd() < 0.5 ? rnd() * 0.3 : 0.7 + rnd() * 0.3;
    const x = (rnd() < 0.7 ? lado : rnd()) * W, y = rnd() * H, r = 12 + rnd() * rnd() * 70;
    const a = (memoria ? 0.08 : 0.14) + rnd() * (memoria ? 0.08 : 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = colores[i % colores.length];
    g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(0.55, `rgba(${c},${a * 0.6})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // grano de papel: puntitos claros y oscuros, casi invisibles
  for (let i = 0; i < W * H / 260; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)';
    ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }
  // la viñeta: los bordes un poco más oscuros
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, memoria ? 'rgba(0,0,0,.32)' : 'rgba(10,0,20,.3)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
/* Apagada por ahora: no convenció. Con true vuelve la etiqueta y se va la línea «Para · De». */
const ETIQUETA_DE_REGALO = false;
/* La etiqueta de regalo, como en las canastas de verdad: cartulina crema con
   punta y ojalillo, «Para …» grande y «de …» chiquito. Va sobre el tejido de
   abajo a la izquierda, para no taparle la cara a la guagua. */
function etiquetaDeRegalo(ctx, e, ex, ey, ew, eh, cuadrada, conCanasta) {
  const para = 'Para ' + (e.p || '…'), de = e.d ? 'de ' + e.d : 'con cariño';
  const maxAncho = Math.max(ew * 0.56, ctx.canvas.width * 0.44);   // si la escena es chica, la etiqueta asoma hacia el margen
  let t1 = cuadrada ? 46 : 56, t2 = cuadrada ? 26 : 32;
  const medir = () => {
    ctx.font = `800 ${t1}px ${SYNE}`; const a1 = ctx.measureText(para).width;
    ctx.font = `600 ${t2}px ${INTER}`; const a2 = ctx.measureText(de).width;
    return Math.max(a1, a2);
  };
  let aTexto = medir();
  while (aTexto + t1 * 1.9 > maxAncho && t1 > 26) { t1 -= 2; t2 = Math.max(18, t2 - 1); aTexto = medir(); }
  const pad = t1 * 0.5, alto = t1 * 1.05 + t2 * 1.25 + pad * 1.4, punta = alto * 0.38;
  const ancho = Math.min(maxAncho, aTexto + pad * 2) + punta;
  const derecha = ex + ew * 0.06 + Math.min(ancho, ew * 0.56), izquierda = Math.max(40, derecha - ancho);
  const cx = izquierda + ancho / 2, cy = ey + eh * (conCanasta ? 0.8 : 0.84);
  const ang = -0.07;
  const ojo = { x: ancho / 2 - punta * 0.55, y: 0 };                 // el ojalillo, en la punta
  // el hilo: del ojalillo sube al borde de la canasta
  if (conCanasta) {
    const hx = cx + Math.cos(ang) * ojo.x, hy = cy + Math.sin(ang) * ojo.x;
    const fx = ex + ew * 0.5, fy = ey + eh * 0.6;
    ctx.strokeStyle = '#d63a22'; ctx.lineWidth = cuadrada ? 3 : 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + (fx - hx) * 0.2, fy + (hy - fy) * 0.15, fx, fy); ctx.stroke();
  }
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(ang);
  const x0 = -ancho / 2, x1 = ancho / 2 - punta, y0 = -alto / 2, y1 = alto / 2;
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fff6ea';
  ctx.beginPath(); ctx.moveTo(x0 + 10, y0); ctx.lineTo(x1, y0); ctx.lineTo(ancho / 2, 0); ctx.lineTo(x1, y1); ctx.lineTo(x0 + 10, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - 10); ctx.lineTo(x0, y0 + 10); ctx.quadraticCurveTo(x0, y0, x0 + 10, y0); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#d9c9b0'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#d9c9b0'; ctx.beginPath(); ctx.arc(ojo.x, ojo.y, alto * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = `800 ${t1}px ${SYNE}`; ctx.fillStyle = '#1b1033';
  ctx.fillText(para, x0 + pad, y0 + pad * 0.7 + t1 * 0.86, x1 - x0 - pad * 1.2);
  ctx.font = `600 ${t2}px ${INTER}`; ctx.fillStyle = '#6b5a7b';
  ctx.fillText(de, x0 + pad, y0 + pad * 0.7 + t1 * 1.05 + t2 * 0.95, x1 - x0 - pad * 1.2);
  ctx.restore();
  ctx.textAlign = 'center';
}
async function tarjeta(e, formato = 'historia', x = {}) {
  try { await Promise.all([document.fonts.load('800 80px Syne'), document.fonts.load('600 30px Inter'), document.fonts.load('italic 400 30px Inter')]); } catch (err) { /* sin fuentes, igual sale */ }
  const cuadrada = formato === 'cuadrada', W = 1080, H = cuadrada ? 1080 : 1920, M = 64, ancho = W - M * 2;
  const memoria = enMemoria(e), como = x.como || (memoria ? 'memoria' : e.p ? 'alguien' : 'presume');
  const c = lienzo(W, H), ctx = c.getContext('2d');
  // el fondo: noche de colada; en memoria, más sobrio (menos saturado, sin destellos)
  const fondo = ctx.createLinearGradient(0, 0, 0, H);
  if (memoria) { fondo.addColorStop(0, '#1e1826'); fondo.addColorStop(1, '#2d2434'); } else { fondo.addColorStop(0, '#2e0f36'); fondo.addColorStop(1, '#5a1c50'); }
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
  fondoVivo(ctx, W, H, memoria, azar(e.o.length + (cuadrada ? 3 : 5)));
  // vertical (historias): arriba, lo que tapa la barra de Instagram; abajo, un hueco libre para que
  // pongan el sticker del enlace sin tapar nada (y debajo, la barra de responder)
  const arriba = cuadrada ? M : 200, abajo = cuadrada ? H - M : H - 450;
  const dorado = memoria ? '#d9c39a' : '#ffc93c', crema = memoria ? '#efe6dc' : '#ffffff';
  ctx.textBaseline = 'alphabetic';

  // 1 · la etiqueta, arriba, y el cierre, abajo: el marco de la tarjeta
  ctx.textAlign = 'center'; ctx.fillStyle = dorado;
  ctx.font = `700 ${cuadrada ? 24 : 30}px ${INTER}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  const yEtiqueta = arriba + (cuadrada ? 22 : 28);
  ctx.fillText(ETIQUETA, W / 2, yEtiqueta);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  // abajo se lee: el cierre en 30–38 px y la firma en 34–42; en memoria, el cierre un paso más discreto
  const firma = como === 'memoria' ? (x.de ? 'Con cariño, ' + x.de : 'Con cariño') : '';
  // el cierre entra en una línea: si no cabe, baja de tamaño
  let tCierre = memoria ? (cuadrada ? 26 : 32) : (cuadrada ? 30 : 38);
  const pesoCierre = memoria ? 600 : 700;
  ctx.font = `${pesoCierre} ${tCierre}px ${INTER}`;
  while (ctx.measureText(CIERRE).width > ancho && tCierre > 20) { tCierre--; ctx.font = `${pesoCierre} ${tCierre}px ${INTER}`; }
  const fCierre = `${pesoCierre} ${tCierre}px ${INTER}`;
  const cCierre = memoria ? 'rgba(239,230,220,.72)' : dorado;
  const fFirma = `700 ${cuadrada ? 34 : 42}px ${INTER}`;
  let pisoZona;
  if (cuadrada) {
    // la franja de abajo: la firma a la izquierda y el cierre a la derecha, o el cierre debajo si no caben
    ctx.font = fCierre; const aC = ctx.measureText(CIERRE).width;
    ctx.font = fFirma; const aF = firma ? ctx.measureText(firma).width : 0;
    if (!firma || aF + aC + 40 <= ancho) {
      if (firma) { ctx.textAlign = 'left'; ctx.fillStyle = crema; ctx.fillText(firma, M, abajo); }
      ctx.font = fCierre; ctx.fillStyle = cCierre; ctx.textAlign = firma ? 'right' : 'center';
      ctx.fillText(CIERRE, firma ? W - M : W / 2, abajo);
      pisoZona = abajo - 36 - 26;
    } else {
      ctx.font = fCierre; ctx.fillStyle = cCierre; ctx.textAlign = 'left'; ctx.fillText(CIERRE, M, abajo);
      ctx.font = fFirma; ctx.fillStyle = crema; ctx.fillText(firma, M, abajo - 48, ancho);
      pisoZona = abajo - 48 - 36 - 26;
    }
    ctx.textAlign = 'center';
  } else {
    ctx.font = fCierre; ctx.fillStyle = cCierre; ctx.fillText(CIERRE, W / 2, abajo, ancho);
    pisoZona = abajo - (memoria ? 32 : 38) - 44;
  }
  const techoZona = yEtiqueta + (cuadrada ? 26 : 40);

  // 2 · lo que va apilado al centro: titular, escena, lo personal y (en historia) la firma.
  //     Se mide todo primero; la escena toma el espacio que queda y el grupo se centra.
  const pila = [];
  const texto = (b, color, il) => ({ alto: b.ls.length * b.t * il, dibujar(y0) { ctx.font = b.font; ctx.fillStyle = color; b.ls.forEach((l, i) => ctx.fillText(l, W / 2, y0 + b.t * 0.86 + i * b.t * il)); } });
  if (como === 'memoria') {
    const nombre = '«' + (e.p || '…') + '»', medio = cuadrada ? 44 : 60;
    ctx.font = `800 ${medio}px ${SYNE}`;
    const previo = 'Para recordar a ', anchoPrevio = ctx.measureText(previo).width;
    const n = ajustar(ctx, nombre, { peso: 800, familia: SYNE, max: cuadrada ? 104 : 150, min: cuadrada ? 52 : 64, ancho, lineas: 2, una: true, minUna: cuadrada ? 76 : 96 });
    ctx.font = n.font;
    const anchoNombre = ctx.measureText(nombre).width;
    if (cuadrada && n.ls.length === 1 && anchoPrevio + anchoNombre <= ancho) {
      // corto: «Para recordar a» y el nombre en la misma línea, cada uno con su tamaño
      pila.push({ alto: n.t * 1.02, dibujar(y0) {
        const x0 = W / 2 - (anchoPrevio + anchoNombre) / 2, yb = y0 + n.t * 0.86;
        ctx.textAlign = 'left';
        ctx.font = `800 ${medio}px ${SYNE}`; ctx.fillStyle = dorado; ctx.fillText(previo, x0, yb);
        ctx.font = n.font; ctx.fillStyle = crema; ctx.fillText(nombre, x0 + anchoPrevio, yb);
        ctx.textAlign = 'center';
      } });
    } else {
      pila.push({ alto: medio * 1.2, dibujar(y0) { ctx.font = `800 ${medio}px ${SYNE}`; ctx.fillStyle = dorado; ctx.fillText('Para recordar a', W / 2, y0 + medio * 0.86); } });
      pila.push(texto(n, crema, 1.0));
    }
  } else {
    const articulo = queEs(e).split(' ')[0];
    const titular = como === 'alguien' ? `Te regalo ${articulo} ${dePan(e)}` : `¡Ya tengo mi ${dePan(e)}!`;
    pila.push(texto(ajustar(ctx, titular, { peso: 800, familia: SYNE, max: cuadrada ? 76 : 100, min: cuadrada ? 44 : 56, ancho, lineas: 2 }), crema, 1.04));
  }
  const iEscena = pila.length;
  pila.push(null);                                    // el lugar de la escena
  // presúmela: los adornos, chiquito y como insignia, debajo de la escena
  const adornos = x.adornos != null ? x.adornos : contarAdornos(e);
  if (como === 'presume' && adornos > 0) {
    const ti = cuadrada ? 28 : 34, rotulo = adornos === 1 ? '1 adorno' : `${adornos} adornos`;
    ctx.font = `700 ${ti}px ${INTER}`;
    const aw = ctx.measureText(rotulo).width + ti * 1.6, ah = ti * 1.9;
    pila.push({ alto: ah, dibujar(y0) {
      ctx.fillStyle = 'rgba(255,201,60,.14)'; ctx.strokeStyle = 'rgba(255,201,60,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(W / 2 - aw / 2, y0, aw, ah, ah / 2); ctx.fill(); ctx.stroke();
      ctx.font = `700 ${ti}px ${INTER}`; ctx.fillStyle = dorado; ctx.fillText(rotulo, W / 2, y0 + ah / 2 + ti * 0.36);
    } });
  }
  if (como === 'alguien' && !ETIQUETA_DE_REGALO) {
    const pd = [`Para: ${e.p || '…'}`, e.d && `De: ${e.d}`].filter(Boolean).join(' · ');
    pila.push(texto(ajustar(ctx, pd, { peso: 700, familia: INTER, max: cuadrada ? 32 : 40, min: 26, ancho, lineas: 2 }), crema, 1.22));
  }
  // la dedicatoria manda sobre los nombres: más grande, y con aire arriba y abajo
  let iMensaje = -1;
  if (e.m) {
    iMensaje = pila.length;
    pila.push(texto(ajustar(ctx, '“' + e.m + '”', { peso: 500, estilo: 'italic ', familia: INTER, max: cuadrada ? 46 : 58, min: 30, ancho: ancho - 20, lineas: 3 }),
      memoria ? 'rgba(239,230,220,.92)' : 'rgba(255,255,255,.92)', 1.24));
  }
  if (!cuadrada && firma) pila.push(texto({ t: 42, ls: [firma], font: fFirma }, crema, 1.2));
  const hueco = (i) => (i === iMensaje || i === iMensaje + 1 ? (cuadrada ? 24 : 44)      // la dedicatoria, con aire
    : i === iEscena || i === iEscena + 1 ? (cuadrada ? 14 : 28) : 12);                     // más aire alrededor de la escena
  const fijo = pila.reduce((s2, p2, i) => s2 + (p2 ? p2.alto : 0) + (i ? hueco(i) : 0), 0);
  const { img: esc, boca } = escenaDe(e, memoria, { canasta: x.canasta, colada: x.colada });
  const altoLibre = Math.max(140, pisoZona - techoZona - fijo);
  const ke = Math.min((cuadrada ? ancho * 0.86 : ancho) / esc.width, (cuadrada ? Math.min(altoLibre, H * 0.52) : altoLibre) / esc.height);
  const ew = esc.width * ke, eh = esc.height * ke;
  const total = fijo + eh;
  let yy = techoZona + Math.max(0, (pisoZona - techoZona - total) / 2);
  const posiciones = pila.map((p2, i) => {
    if (i) yy += hueco(i);
    const y0 = yy;
    yy += i === iEscena ? eh : p2.alto;
    return y0;
  });
  const ex = W / 2 - ew / 2, ey = posiciones[iEscena];

  // 3 · la escena: la guagua en su canasta, protagonista
  // un resplandor tibio detrás (sin destellos en memoria)
  const cx2 = W / 2, cy2 = ey + eh * 0.55, luz = ctx.createRadialGradient(cx2, cy2, 30, cx2, cy2, eh * 0.75);
  luz.addColorStop(0, memoria ? 'rgba(255,214,150,.12)' : 'rgba(255,170,90,.26)'); luz.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = luz; ctx.fillRect(0, ey - eh * 0.3, W, eh * 1.6);
  if (!memoria) {
    const rnd = azar(e.o.length + 7);
    ctx.fillStyle = 'rgba(255,201,60,.55)';
    for (let i = 0; i < (cuadrada ? 8 : 14); i++) {
      const sx = M + rnd() * ancho, sy = ey + rnd() * eh * 0.8, r = 3 + rnd() * 5;
      if (Math.abs(sx - W / 2) < ew * 0.32) continue;     // los destellos, a los lados: la guagua manda
      ctx.beginPath();
      for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2, d = j % 2 ? r * 0.35 : r * 1.6; ctx.lineTo(sx + Math.cos(a) * d, sy + Math.sin(a) * d); }
      ctx.closePath(); ctx.fill();
    }
  }
  pila.forEach((p2, i) => { if (i !== iEscena) p2.dibujar(posiciones[i]); });
  ctx.drawImage(esc, ex, ey, ew, eh);
  // envíasela: la etiqueta de regalo, colgada del borde de la canasta (guardada para después; ver ETIQUETA_DE_REGALO)
  if (como === 'alguien' && ETIQUETA_DE_REGALO) etiquetaDeRegalo(ctx, e, ex, ey, ew, eh, cuadrada, x.canasta !== false);
  const px = boca ? ex + boca.x * ke : 0, py = boca ? ey + boca.y * ke : 0;
  if (!boca) { /* sin colada ni vela: ni vapor ni brillo */ } else if (memoria) {
    const brillo = ctx.createRadialGradient(px, py, 4, px, py, 120 * ke * 1.6);
    brillo.addColorStop(0, 'rgba(255,200,120,.32)'); brillo.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = brillo; ctx.beginPath(); ctx.arc(px, py, 120 * ke * 1.6, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = Math.max(3, 5 * ke * 1.4); ctx.lineCap = 'round';
    const v = Math.max(0.45, ke * 1.4);
    [-20, 0, 20].forEach((dx, i) => {
      const sx = px + dx * v, sy = py - 8 * v;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + 16 * v, sy - 26 * v, sx - 16 * v, sy - (52 + i * 8) * v, sx, sy - (84 + i * 10) * v); ctx.stroke();
    });
  }
  return c;
}
const aBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));

/* ─── la vitrina ───────────────────────────────────────────── */
const CLAVE = 'guagua:vitrina3d', BORRADOR = 'guagua:borrador-amasado';
const almacen = {
  leer(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  poner(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
/* La vitrina vive en el navegador y, si hay cuenta, también en la nube.
   El navegador es la copia de siempre (funciona sin red); la nube es la
   que se ve cuando hay sesión, y la que sigue a la persona de un teléfono a otro. */
const vitrina = () => almacen.leer(CLAVE, []);
function guardarEnVitrina(item) {
  const lista = vitrina().filter((x) => x.id !== item.id && !(item.t === 'recibida' && x.e === item.e));
  lista.unshift(item);
  if (!almacen.poner(CLAVE, lista.slice(0, 80))) avisa('No hay espacio en la vitrina de este navegador.', 'error');
  if (nube.actual()) nube.guardar(item).catch((e) => avisa(nube.explicar(e), 'error'));
}
function sacarDeVitrina(id) {
  almacen.poner(CLAVE, vitrina().filter((x) => x.id !== id));
  if (nube.actual()) return nube.borrar(id).catch((e) => avisa(nube.explicar(e), 'error'));
}
async function listaVitrina() {
  if (nube.actual()) {
    try { return await nube.vitrina(); } catch (e) { avisa(nube.explicar(e), 'error'); }
  }
  return vitrina();
}
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* El enlace lleva la piel con la que se abrió (?marca=mercio), pero
   nunca el modo incrustado: quien lo recibe lo abre a pantalla entera. */
function direccion() {
  const m = new URLSearchParams(location.search).get('marca');
  return location.origin + location.pathname + (m ? '?marca=' + encodeURIComponent(m) : '');
}

/* ─── el sonido de morder ──────────────────────────────────── */
let audio = null;
function crunch() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const dur = 0.16, n = Math.floor(audio.sampleRate * dur);
    const buf = audio.createBuffer(1, n, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5) * (Math.random() < 0.3 ? 1 : 0.35);
    const src = audio.createBufferSource(); src.buffer = buf;
    const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1200; f.Q.value = 0.8;
    const g = audio.createGain(); g.gain.value = 0.35;
    src.connect(f).connect(g).connect(audio.destination);
    src.start();
  } catch (e) { /* sin audio, se come en silencio */ }
  if (navigator.vibrate) navigator.vibrate(18);
}
function ding() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 1320; o.type = 'sine';
    g.gain.setValueAtTime(0.25, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.9);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.9);
  } catch (e) { /* sin campanita */ }
}

/* ══════════════════ LAS PANTALLAS ═══════════════════════════
   La app empieza en tu canasta. El taller (amasar, hornear, decorar)
   se abre con «Amasar otra» y se cierra con la ✕, que vuelve a la canasta. */
function mostrar(cual) {
  $('#canasta').hidden = cual !== 'canasta';
  $('#taller').hidden = cual !== 'taller';
  if (cual === 'taller') {
    requestAnimationFrame(() => { taller.medir(); medirTaller(); });
  } else {
    apagarHorno();
    pintarVitrina();
    pintarPendiente();
  }
}
/* Las hojas: la ✕ y el fondo las cierran. Lo de adentro no deja pasar el
   clic, porque un paso que cambia de tamaño movería el borde bajo el dedo. */
function abrir(id) {
  const d = $(id);
  if (d && !d.open) d.showModal();
  return d;
}
function montarHojas() {
  $$('dialog.hoja').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    });
    $$('[data-cierra]', d).forEach((b) => b.addEventListener('click', () => d.close()));
  });
}

/* ══════════════════ EL TALLER ═══════════════════════════════ */
const estado = {
  etapa: 'amasar',
  f: 'guagua', a: [], k: 0, o: [],
  mano: 'bolita', grosor: 1, masa: 0,
  herramienta: 'manga', crema: 1, ancho: 2, tamano: 1, capa: 0,
  id: null, n: '', p: '', d: '', m: '', t: '', l: 0,
};
let taller = null;       // el visor del taller
let trazo = null;        // lo que el dedo está haciendo al decorar
let amase = null;        // …y al amasar
let historia = [];       // las masas de antes, para deshacer al amasar
let futuro = [];         // lo deshecho, para rehacer
const receta = () => Object.assign({ v: 3, f: estado.f, a: estado.a, k: estado.k, o: estado.o, n: estado.n, p: estado.p, d: estado.d, m: estado.m },
  estado.t === 'm' ? { t: 'm' } : estado.l ? { l: estado.l } : {}, estado.capa ? { capa: estado.capa } : {});

function guardarBorrador() {
  almacen.poner(BORRADOR, Object.assign(receta(), { id: estado.id, etapa: estado.etapa, guardada: !sinGuardar() }));
}
function actualizarEtiqueta() {
  const n = estado.etapa === 'amasar' ? estado.a.length : estado.o.length;
  const que = estado.etapa === 'amasar' ? `Masa cruda en 3D con ${n} ${n === 1 ? 'pieza' : 'piezas'}. Arrastra para poner bolitas y chorizos.`
    : `${queEs(estado)} de pan en 3D con ${n} ${n === 1 ? 'decoración' : 'decoraciones'}. Arrastra sobre ella para decorarla y con dos dedos para girarla.`;
  $('#lienzo').setAttribute('aria-label', que.charAt(0).toUpperCase() + que.slice(1));
  const puede = estado.etapa === 'amasar' ? historia.length > 0 : estado.etapa === 'decorar' && estado.o.length > 0;
  $$('[data-deshacer]').forEach((b) => { b.disabled = !puede; });
  $$('[data-rehacer]').forEach((b) => { b.disabled = estado.etapa === 'horno' || !futuro.length; });
}

/* ─── 1. amasar ───────────────────────────────────────────── */
/* La masa tal como salió del molde: si sigue igual, cambiar de molde o salir
   no pierde nada y no hace falta preguntar. */
let masaDelMolde = null;
const masaTocada = () => estado.a.length > 0 && JSON.stringify(estado.a) !== masaDelMolde;
function recordar() {
  historia.push(JSON.stringify(estado.a));
  if (historia.length > 50) historia.shift();
  futuro = [];
}
function cambiarMasa(a, molde) {
  estado.a = a;
  if (molde) estado.f = molde;
  guardarBorrador(); actualizarEtiqueta();
}
/* Al amasar no se gira: lo que cae en la lata se arma de frente. Lo
   que se pone encima de otra pieza se pega a su superficie. */
function tocarMasa(ev) {
  const mano = estado.mano;
  const hit = taller.tocar(ev, true);
  if (mano === 'mover' || mano === 'quitar') {
    if (!hit || hit.pieza == null) return true;
    if (mano === 'quitar') {
      recordar();
      const a = estado.a.filter((_, i) => i !== hit.pieza);
      taller.ponerMasa(a); cambiarMasa(a);
      return true;
    }
    const pz = estado.a[hit.pieza];
    const z = pz[pz[0] === 0 ? 3 : iniPuntos(pz) + 2] / Q;
    amase = { mano, i: hit.pieza, z, desde: taller.alPlano(ev, z), original: estado.a[hit.pieza], movido: false };
    return true;
  }
  if (estado.a.length >= MAX_PIEZAS) { avisa('Ya no cabe más masa en la lata.'); return true; }
  if (mano === 'bolita') {
    const c = hit ? hit.p.clone() : taller.alPlano(ev, 0);
    if (!c) return true;
    amase = { mano, c, sobre: !!hit, pieza: null };
    estirarBolita(c);
  } else {
    const r = GROSORES[estado.grosor];
    const p = hit ? hit.p.clone().addScaledVector(hit.n, -r * 0.35) : taller.alPlano(ev, PISO + r * 0.8);
    if (!p) return true;
    amase = { mano, r, pts: [p] };
    taller.previaPieza(chorizo(r, amase.pts));
  }
  return true;
}
function estirarBolita(q) {
  const { c } = amase;
  const dx = Math.abs(q.x - c.x), dy = Math.abs(q.y - c.y), d = Math.hypot(dx, dy);
  // hacia el lado se hace ancha; hacia arriba, alta; en diagonal, redonda
  const rx = Math.max(dx, d * 0.6, 0.12), ry = Math.max(dy, d * 0.6, 0.12);
  const rz = Math.min(0.75, Math.min(rx, ry) * 0.7);
  const z = amase.sobre ? c.z - rz * 0.35 : PISO + rz * 0.8;   // en la lata, apoyada
  amase.pieza = conMasa(bolita(V(c.x, c.y, z), V(rx, ry, rz)), estado.masa);
  taller.previaPieza(amase.pieza);
}
function arrastrarMasa(ev) {
  if (!amase) return;
  if (amase.mano === 'bolita') {
    const q = taller.alPlano(ev, amase.c.z);
    if (q && Math.hypot(q.x - amase.c.x, q.y - amase.c.y) > 0.06) { amase.estirada = true; estirarBolita(q); }
  } else if (amase.mano === 'chorizo') {
    const hit = taller.tocar(ev, true);
    const ultimo = amase.pts[amase.pts.length - 1];
    const p = hit ? hit.p.clone().addScaledVector(hit.n, -amase.r * 0.35) : taller.alPlano(ev, PISO + amase.r * 0.8);
    if (!p || p.distanceTo(ultimo) < amase.r * 0.5 || amase.pts.length > 120) return;
    amase.pts.push(p);
    taller.previaPieza(chorizo(amase.r, amase.pts));
  } else if (amase.mano === 'mover') {
    const q = taller.alPlano(ev, amase.z);
    if (!q || !amase.desde) return;
    if (!amase.movido) { recordar(); amase.movido = true; }
    const p = moverPieza(amase.original, ent(q.x - amase.desde.x), ent(q.y - amase.desde.y));
    estado.a[amase.i] = p;
    taller.cambiarPieza(amase.i, p);
  }
}
function soltarMasa() {
  if (!amase) return;
  const m = amase; amase = null;
  taller.previaPieza(null);
  if (m.mano === 'bolita' && m.pieza) {
    recordar();
    // un toque, sin estirar: una bolita mediana
    const pieza = m.estirada ? m.pieza : (() => { const r = 0.3, z = m.sobre ? m.c.z - r * 0.25 : PISO + r * 0.6; return conMasa(bolita(V(m.c.x, m.c.y, z), V(r, r, r * 0.75)), estado.masa); })();
    vibra();
    const a = estado.a.concat([pieza]);
    taller.ponerMasa(a); cambiarMasa(a);
  } else if (m.mano === 'chorizo') {
    recordar();
    const p = conMasa(m.pts.length > 1 ? chorizo(m.r, m.pts) : bolita(m.pts[0], V(m.r * 1.3, m.r * 1.3, m.r * 1.1)), estado.masa);
    vibra();
    const a = estado.a.concat([p]);
    taller.ponerMasa(a); cambiarMasa(a);
  } else if (m.mano === 'mover' && m.movido) {
    cambiarMasa(estado.a);
  }
}

/* ─── 2. hornear ──────────────────────────────────────────── */
let horneando = null;
const KMAX = 1.6, SEGUNDOS = 6;       // en 6 s llega al punto; después se quema
function prenderHorno() {
  if (!estado.a.length) { avisa('Primero pon algo de masa en la lata.'); return; }
  irA('horno');
  estado.k = 0; estado.o = [];
  taller.cargar(estado);
  $('#horno-fin').hidden = true;
  $('#sacar').hidden = false;
  $('#taller').classList.add('en-horno');
  const t0 = performance.now();
  const paso = (t) => {
    if (!horneando) return;
    const k = Math.min(KMAX, ((t - t0) / 1000) / SEGUNDOS);
    estado.k = Math.round(k * 100);
    taller.hornear(k, true);
    if (!quieto) taller.giro += 0.004;
    termometro(k);
    if (k >= KMAX) { sacarDelHorno(); return; }
    horneando = requestAnimationFrame(paso);
  };
  horneando = requestAnimationFrame(paso);
}
function termometro(k) {
  $('#termo').style.width = (k / KMAX * 100) + '%';
  $('#termo').parentElement.setAttribute('aria-valuenow', Math.round(k * 100));
}
/* Al sacarla, la instrucción de arriba dice cómo salió. */
function sacarDelHorno() {
  if (!horneando) return;
  cancelAnimationFrame(horneando);
  horneando = null;
  ding();
  const k = estado.k / 100;
  taller.hornear(k, false);
  $('#taller').classList.remove('en-horno');
  $('#sacar').hidden = true;
  $('#horno-fin').hidden = false;
  $('#a-decorar').hidden = estado.k < 50;
  $('#intro-t').textContent = punto(k).t;
  $('#intro-p').textContent = punto(k).f;
  $('#intro').classList.remove('oculta');
  guardarBorrador();
}
function apagarHorno() {
  if (horneando) cancelAnimationFrame(horneando);
  horneando = null;
  $('#taller').classList.remove('en-horno');
}

/* ─── 3. decorar ──────────────────────────────────────────── */
const vibra = () => { if (navigator.vibrate) navigator.vibrate(8); };
function fijar(op) {
  estado.o.push(op);
  futuro = [];
  if (op[0] !== 0 && op[0] !== 8) vibra();
  taller.agregar(op);
  guardarBorrador();
  actualizarEtiqueta();
}
/* Todo es glaseado: el hilo, los puntos y la cobertura, que se pinta a mano
   con la brocha. La carita no se tapa con nada: se toca el centro de la cara
   y salen ojos, naricita, sonrisa y chapitas, amoldados a la cabeza. */
function tocarDecorar(ev) {
  const hit = taller.tocar(ev);
  if (!hit) return false;
  if (colocando) { ponerEn(hit); return true; }
  const h = estado.herramienta;
  if (h === 'manga' || h === 'cobertura') {
    trazo = [8, estado.crema, h === 'cobertura' ? COBERTURA : estado.ancho, ...pn(hit)];
    taller.vistaPrevia(trazo);
  } else if (h === 'pastelera') {               // la manga pastelera: un chorro en relieve con boquilla de estrella
    const boq = 1 + estado.ancho, q = puntoDeCrema(hit, BOQUILLAS[boq]);
    trazo = [0, estado.crema, boq, ent(q.x), ent(q.y), ent(q.z)];
    taller.vistaPrevia(trazo);
  } else if (h === 'puntos') {                  // un punto de glaseado: una gotita plana
    fijar([7, estado.crema, ...pn(hit)]);
  }
  return true;
}
/* ─── poner algo: carita, mordisco o una figura de mazapán ────
   No son herramientas de la bandeja: como los stickers del Marcado, se eligen
   en el +, se ponen con un toque y quedan elegidas con su propia barra
   (tamaño, otra, quitar, listo). Tocar otra vez el pan las cambia de lugar. */
let colocando = null;         // { tipo, figura, tam, hit, n }: n es cuántos trazos puso
const nombreFigura = (f) => (f === 'pasa' ? 'la pasa' : 'la ' + FIGURAS[f].n.toLowerCase()).replace('la moño', 'el moño');
function empezarColocar(tipo, figura) {
  colocando = { tipo, figura, tam: 1, hit: null, n: 0, color: tipo === 'figura' && figura !== 'pasa' ? FIGURAS[figura].color : null };
  $('#intro').classList.add('oculta');
  pintarContexto();
}
function opsDe(c, hit) {
  if (c.tipo === 'carita') return chapitas(hit, c.tam, caraPintada(hit, c.tam, taller), taller);
  if (c.tipo === 'mordisco') return [[3, ent(hit.p.x), ent(hit.p.y), ent(hit.p.z)]];
  if (c.figura === 'pasa') return [[5, ...pn(hit)]];
  return [[9, c.figura, c.tam, c.color, ...pn(hit)]];
}
function quitarPuesta() {
  for (let i = 0; i < colocando.n; i++) { estado.o.pop(); taller.quitarUltimo(); }
  colocando.n = 0;
}
function ponerEn(hit) {
  if (colocando.tipo === 'mordisco' && !colocando.n && estado.o.filter((op) => op[0] === 3).length >= BOCADOS_TALLER) {
    avisa('Ya tiene suficientes mordiscos. Deja algo para quien la reciba.');
    return;
  }
  if (colocando.n) quitarPuesta();
  const ops = opsDe(colocando, hit);
  ops.forEach((op) => fijar(op));
  colocando.hit = hit; colocando.n = ops.length;
  if (colocando.tipo === 'mordisco') crunch();
  pintarContexto();
}
function terminarColocar() {
  colocando = null;
  $('#contexto').hidden = true;
  guardarBorrador(); actualizarEtiqueta();
}
function pintarContexto() {
  const c = colocando, puesta = c.n > 0;
  $('#contexto').hidden = false;
  $('#contexto').classList.toggle('contexto--puesta', puesta);
  $('#contexto-msg').textContent = c.tipo === 'carita' ? 'Toca el centro de la cara'
    : c.tipo === 'mordisco' ? 'Toca donde le das el mordisco' : 'Toca donde va ' + nombreFigura(c.figura);
  $('#contexto-msg').hidden = puesta;
  // la carita y las figuras tienen tamaño; la pasa y el mordisco, no
  $('#contexto-tam').hidden = !puesta || c.tipo === 'mordisco' || c.figura === 'pasa';
  $$('#contexto-tam [data-ctam]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.ctam === c.tam)));
  $('#contexto-otra').hidden = !puesta || c.tipo !== 'figura';
  // las figuras (no la pasa) eligen su color, como el texto en el Marcado
  $('#contexto-color').hidden = !puesta || c.color == null;
  if (c.color != null) $('#contexto-color i').style.background = CREMAS[c.color].c;
  $('#contexto-quitar').hidden = !puesta;
  $('#contexto-listo').textContent = puesta ? 'Listo' : 'Cancelar';
}
function montarColocar() {
  $$('[data-colocar]').forEach((b) => b.addEventListener('click', () => { $('#d-mas').close(); empezarColocar(b.dataset.colocar); }));
  $('#abrir-figuras').addEventListener('click', () => { $('#d-mas').close(); abrir('#d-figuras'); });
  $$('[data-figura]').forEach((b) => b.addEventListener('click', () => {
    $('#d-figuras').close();
    empezarColocar('figura', b.dataset.figura === 'pasa' ? 'pasa' : +b.dataset.figura);
  }));
  $$('[data-ctam]').forEach((b) => b.addEventListener('click', () => {
    colocando.tam = +b.dataset.ctam;
    if (colocando.hit) ponerEn(colocando.hit); else pintarContexto();
  }));
  $('#contexto-color').addEventListener('click', () => abrirColor(true));
  $('#contexto-otra').addEventListener('click', () => { colocando.n = 0; colocando.hit = null; pintarContexto(); });
  $('#contexto-quitar').addEventListener('click', () => { quitarPuesta(); terminarColocar(); });
  $('#contexto-listo').addEventListener('click', terminarColocar);
}
function arrastrarDecorar(ev) {
  if (!trazo) return;
  const hit = taller.tocar(ev);
  if (!hit) return;
  const op = trazo;
  if (op[0] === 0) {                                // la pastelera: puntos sin normal, levantados medio grosor
    const r = BOQUILLAS[op[2]], q = puntoDeCrema(hit, r);
    const u = V(op[op.length - 3], op[op.length - 2], op[op.length - 1]).divideScalar(Q);
    const d = q.distanceTo(u);
    if (d < Math.max(r * 0.6, 0.025)) return;
    if (d > 0.7 || op.length > 1200) { fijar(op); trazo = [0, op[1], op[2], ent(q.x), ent(q.y), ent(q.z)]; }   // saltó a otra pieza: otro chorro
    else op.push(ent(q.x), ent(q.y), ent(q.z));
    taller.vistaPrevia(trazo);
    return;
  }
  const u = V(op[op.length - 6], op[op.length - 5], op[op.length - 4]).divideScalar(Q);
  const paso = op[2] === COBERTURA ? 0.05 : 0.03;
  if (hit.p.distanceTo(u) < paso) return;
  if (hit.p.distanceTo(u) > 0.7 || op.length > 600) { fijar(op); trazo = [8, op[1], op[2], ...pn(hit)]; }   // saltó a otra pieza: otro trazo
  else op.push(...pn(hit));
  taller.vistaPrevia(trazo);
}
function soltarDecorar() {
  if (!trazo) return;
  const op = trazo; trazo = null;
  taller.vistaPrevia(null);
  fijar(op);
}

/* ─── las etapas ──────────────────────────────────────────── */
/* La instrucción de cada paso, como en Airbnb: sale la primera vez y se
   desvanece con el primer toque en el lienzo, para dejar más espacio. */
const INTROS = {
  amasar: ['Amasa tu guagua', 'Arrastra sobre la lata: al lado sale ancha, hacia arriba sale alta'],
  horno: ['Sácala doradita', 'Se dora en seis segundos: sácala cuando la aguja entre al marco blanco'],
  decorar: ['Decórala', 'Elige una manga y dibuja con el dedo sobre el pan'],
};
const PASOS_TALLER = { amasar: ['Amasa', 1], horno: ['Hornea', 2], decorar: ['Decora', 3] };
function pintarIntro(etapa) {
  const [t, p] = INTROS[etapa];
  $('#intro-t').textContent = t;
  $('#intro-p').textContent = p;
  const vistas = almacen.leer('guagua:intros', {});
  $('#intro').classList.toggle('oculta', etapa !== 'horno' && !!vistas[etapa]);
}
function esconderIntro() {
  if (estado.etapa === 'horno' || $('#intro').classList.contains('oculta')) return;
  const vistas = almacen.leer('guagua:intros', {});
  vistas[estado.etapa] = 1;
  almacen.poner('guagua:intros', vistas);
  $('#intro').classList.add('oculta');
}
/* Lo que tapan la barra y el dock, para que la cámara encuadre en el hueco. */
function margenes(canvas, arriba, abajo) {
  const c = canvas.getBoundingClientRect();
  const m = { arriba: 0, abajo: 0, derecha: 0 };
  if (!c.width) return m;
  if (arriba) m.arriba = Math.max(0, arriba.getBoundingClientRect().bottom - c.top);
  if (abajo && !abajo.hidden) m.abajo = Math.max(0, c.bottom - abajo.getBoundingClientRect().top);
  return m;
}
function medirTaller() {
  if (!taller) return;
  taller.margen = margenes($('#lienzo'), $('#barra'), $(`.dock[data-etapa="${estado.etapa}"]`));
  taller.dibujar();
}
function irA(etapa) {
  if (colocando) terminarColocar();
  if (etapa !== 'horno') apagarHorno();
  estado.etapa = etapa;
  futuro = [];
  const t = $('#taller');
  t.dataset.etapa = etapa;
  t.dataset.herramienta = etapa === 'amasar' ? estado.mano : estado.herramienta;
  $$('.dock[data-etapa]').forEach((s) => { s.hidden = s.dataset.etapa !== etapa; });
  // la píldora del paso, y el listo solo al decorar: la masa cruda no se guarda
  const [nombre, n] = PASOS_TALLER[etapa];
  $('#paso-nombre').textContent = nombre;
  $('#paso-num').textContent = n + ' de 3';
  $('#abrir-info').setAttribute('aria-label', `${nombre}, paso ${n} de 3. Ver cómo se hace cada paso`);
  $('#listo').classList.toggle('invisible', etapa !== 'decorar');
  $$('.pasos-ayuda li').forEach((li, i) => {
    li.classList.toggle('actual', li.dataset.paso === etapa);
    li.classList.toggle('hecha', i < n - 1);
  });
  pintarIntro(etapa);
  taller.fijo = etapa === 'amasar';
  taller.ambiente(etapa);
  if (etapa === 'amasar') {
    taller.hornear(0, false);
    taller.postura(0, taller.dePie > 0);
    taller.cabeceo = 1.3;          // casi desde arriba, como sobre la mesa
    taller.girar(0, true);
  } else if (etapa === 'horno') {
    taller.postura(0);
    taller.cabeceo = 0.95;
  } else if (etapa === 'decorar') {
    taller.hornear(estado.k / 100, false);
    const { dePie, cabeceo } = posturaDe(estado);
    taller.postura(dePie, true);   // sale del horno y se levanta: se decora de pie (o echada)
    taller.cabeceo = cabeceo;
    // derecha otra vez (el horno la deja dando vueltas), por el camino corto
    taller.girar(Math.round(taller.giro / (Math.PI * 2)) * Math.PI * 2, true);
  }
  requestAnimationFrame(medirTaller);
  guardarBorrador(); actualizarEtiqueta();
}
function volverAAmasar() {
  if (estado.etapa === 'amasar') return;
  if (estado.o.length && !confirm('Si vuelves a amasar, se borra la decoración y la masa vuelve a estar cruda. ¿Continuar?')) return;
  estado.o = []; estado.k = 0;
  taller.cargar(estado, { encuadrar: false });
  irA('amasar');
}
function aDecorar() {
  if (estado.k < 50) return;
  taller.cargar(estado);
  // el dormilón llega dormido: con su carita ya puesta
  if (dormida(estado) && !estado.o.length) {
    estado.o = sorpresa(estado, taller, { soloCara: true });
    taller.cargar(estado);
  }
  irA('decorar');
}
/* La bandeja: hilo, puntos y cobertura. Elegir una termina lo que se estaba poniendo. */
function elegirHerramienta(h) {
  if (colocando) terminarColocar();
  estado.herramienta = h;
  $('#taller').dataset.herramienta = h;
  $$('.bandeja .manga').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.herramienta === h)));
  $('#grosor-fila').hidden = h !== 'manga' && h !== 'pastelera';
}
let colorDeFigura = false;
function abrirColor(deFigura) {
  colorDeFigura = deFigura && !!colocando;
  const actual = colorDeFigura ? colocando.color : estado.crema;
  $('#d-color-t').textContent = colorDeFigura ? 'Color de la figura' : 'Color del glaseado';
  $('#grosor-fila').hidden = colorDeFigura || (estado.herramienta !== 'manga' && estado.herramienta !== 'pastelera');
  $$('#cremas .color').forEach((x, j) => x.setAttribute('aria-pressed', String(j === actual)));
  abrir('#d-color');
}
function pintarAro() {
  $('#aro-color').style.background = CREMAS[estado.crema].c;
  $('.bandeja').style.setProperty('--manga', CREMAS[estado.crema].c);   // las mangas llevan el glaseado elegido
  $('#abrir-color').setAttribute('aria-label', 'Color: ' + CREMAS[estado.crema].n.toLowerCase());
}

function montarTaller() {
  try {
    taller = new Visor($('#lienzo'), {
      toca: (ev) => (estado.etapa === 'amasar' ? tocarMasa(ev) : estado.etapa === 'decorar' ? tocarDecorar(ev) : false),
      arrastra: (ev) => (estado.etapa === 'amasar' ? arrastrarMasa(ev) : arrastrarDecorar(ev)),
      suelta: () => (estado.etapa === 'amasar' ? soltarMasa() : soltarDecorar()),
      cancela: () => { trazo = null; amase = null; taller.vistaPrevia(null); if (taller.previaBanio) taller.previaDeBanio(null); taller.previaPieza(null); },
    });
  } catch (err) {
    $('#sin-3d').hidden = false;
    return false;
  }
  $('#lienzo').addEventListener('pointerdown', esconderIntro);
  // solo botones: el <main> también lleva data-herramienta, para el CSS
  const grupoDe = (attr, clave, num) => $$(`button[${attr}]`).forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute(attr);
    estado[clave] = num ? +v : v;
    $$(`button[${attr}]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (clave === 'mano') $('#taller').dataset.herramienta = estado.mano;
    requestAnimationFrame(medirTaller);
  }));
  grupoDe('data-mano', 'mano');
  grupoDe('data-grosor', 'grosor', true);
  grupoDe('data-ancho', 'ancho', true);
  $$('.bandeja .manga').forEach((b) => b.addEventListener('click', () => elegirHerramienta(b.dataset.herramienta)));
  montarColocar();
  const cremas = $('#cremas');
  CREMAS.forEach((cr, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'color';
    b.style.setProperty('--gota', cr.c);
    b.setAttribute('aria-pressed', String(i === estado.crema));
    b.innerHTML = '<i aria-hidden="true"></i>';
    b.append(cr.n);
    b.addEventListener('click', () => {
      $$('.color', cremas).forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
      if (colorDeFigura && colocando) {           // pinta la figura que se está poniendo
        colocando.color = i;
        if (colocando.hit) ponerEn(colocando.hit); else pintarContexto();
        $('#d-color').close();
        return;
      }
      estado.crema = i;
      pintarAro();
    });
    cremas.appendChild(b);
  });
  $('#abrir-color').addEventListener('click', () => abrirColor(false));
  $('#abrir-mas').addEventListener('click', () => abrir('#d-mas'));
  $('#abrir-moldes').addEventListener('click', () => abrir('#d-moldes'));
  $$('[data-molde]').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.molde;
    if (masaTocada() && !confirm(f === 'libre' ? '¿Vaciar la lata?' : 'Se reemplaza la masa que tienes. ¿Continuar?')) return;
    recordar();
    const a = MOLDES[f]();
    taller.ponerMasa(a); cambiarMasa(a, f);
    masaDelMolde = JSON.stringify(a);
    taller.encuadrar(); taller.dibujar();
    $('#d-moldes').close();
  }));
  $('#sorpresa-molde').addEventListener('click', () => {
    const f = elige(['guagua', 'tradicional', 'guaguau', 'caballito', 'chanchito', 'gallinita', 'palomita'].filter((x) => x !== estado.f));
    $(`[data-molde="${f}"]`).click();
  });
  $('#sorpresa').addEventListener('click', () => {
    sorpresa(estado, taller).forEach((op) => { estado.o.push(op); taller.agregar(op, true); });
    futuro = [];
    taller.dibujar(); guardarBorrador(); actualizarEtiqueta();
    $('#d-mas').close();
  });
  $('#al-horno').addEventListener('click', prenderHorno);
  $('#sacar').addEventListener('click', sacarDelHorno);
  $('#a-decorar').addEventListener('click', aDecorar);
  $('#otra-vez').addEventListener('click', volverAAmasar);
  // arriba: cerrar, el paso (la ayuda) y listo
  $('#abrir-info').addEventListener('click', () => abrir('#d-info'));
  $('#cerrar-taller').addEventListener('click', cerrarTaller);
  $('#listo').addEventListener('click', () => abrirNombre('guardada'));
  $('#compartir').addEventListener('click', () => abrirNombre('compartir'));
  const raiz = document.documentElement;
  if (raiz.requestFullscreen && document.fullscreenEnabled) {
    const boton = $('#pantalla');
    boton.hidden = false;
    boton.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else raiz.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      boton.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
    });
  }
  // la cámara se vuelve a encuadrar cuando cambia lo que tapa la pantalla
  const ro = new ResizeObserver(() => medirTaller());
  ro.observe($('#barra'));
  $$('.dock').forEach((d) => ro.observe(d));
  window.addEventListener('resize', medirTaller);
  $$('[data-deshacer]').forEach((b) => b.addEventListener('click', deshacer));
  $$('[data-rehacer]').forEach((b) => b.addEventListener('click', rehacer));
  document.addEventListener('keydown', (ev) => {
    if (ev.target.closest('input,textarea') || $('#taller').hidden) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) rehacer(); else deshacer(); }
  });
  $('#lienzo').addEventListener('keydown', (ev) => {
    if (taller.fijo) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); taller.girar(-Math.PI / 8); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); taller.girar(Math.PI / 8); }
  });
  // salir del taller
  $('#salir-sin').addEventListener('click', () => {
    $('#d-salir').close();
    almacen.poner(BORRADOR, null);
    mostrar('canasta');
  });
  $('#salir-guardar').addEventListener('click', () => { $('#d-salir').close(); abrirNombre('salir'); });
  $('#nombre-guardar').addEventListener('click', guardarConNombre);
  $('#r-nombre').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); guardarConNombre(); } });
  // ya está guardada: cerrar esta hoja (la ✕, el fondo o Esc) lleva a tu canasta, no deja en el editor
  let sigueEnGuardada = false;
  $('#d-guardada').addEventListener('close', () => { if (!sigueEnGuardada) mostrar('canasta'); sigueEnGuardada = false; });
  $('#g-otra').addEventListener('click', () => { sigueEnGuardada = true; $('#d-guardada').close(); nueva(); });
  $('#g-compartir').addEventListener('click', () => { sigueEnGuardada = true; $('#d-guardada').close(); abrirCompartir(); });
  return true;
}

function deshacer() {
  if (colocando) { colocando.n = 0; terminarColocar(); }
  if (estado.etapa === 'amasar') {
    if (!historia.length) return;
    futuro.push(JSON.stringify(estado.a));
    const a = JSON.parse(historia.pop());
    taller.ponerMasa(a); cambiarMasa(a);
    return;
  }
  if (estado.etapa !== 'decorar' || !estado.o.length) return;
  futuro.push(estado.o.pop());
  taller.quitarUltimo();
  guardarBorrador(); actualizarEtiqueta();
}
function rehacer() {
  if (colocando) terminarColocar();
  if (!futuro.length) return;
  if (estado.etapa === 'amasar') {
    historia.push(JSON.stringify(estado.a));
    const a = JSON.parse(futuro.pop());
    taller.ponerMasa(a); cambiarMasa(a);
    return;
  }
  if (estado.etapa !== 'decorar') return;
  const op = futuro.pop();
  estado.o.push(op);
  taller.agregar(op);
  guardarBorrador(); actualizarEtiqueta();
}
/* Guardar: la guagua sale del taller con nombre y entra en tu canasta. */
/* Lo que se pierde al salir es la guagua (masa, horno y decoración); los
   datos del regalo se piden otra vez al regalarla. */
let ultimaGuardada = null;
const huella = () => JSON.stringify([estado.f, estado.a, estado.k, estado.o]);
const sinGuardar = () => estado.o.length > 0 && huella() !== ultimaGuardada;
/* La ✕ vuelve a tu canasta. Si hay algo que se perdería, avisa antes:
   la decoración se puede guardar; la masa cruda no se guarda. */
function cerrarTaller() {
  if (colocando) terminarColocar();
  const cruda = estado.etapa !== 'decorar';
  const hayAlgo = cruda ? masaTocada() || estado.k > 0 : sinGuardar();
  if (!hayAlgo) { mostrar('canasta'); return; }
  $('#d-salir-t').textContent = cruda ? '¿Salir y dejar la masa?' : '¿Salir sin guardar?';
  $('#d-salir-p').textContent = cruda ? 'La masa cruda no se guarda: si sales, se perderá.' : 'Si no la guardas, se perderán tus cambios.';
  $('#salir-guardar').hidden = cruda;
  $('#salir-sin').classList.toggle('b--pri', cruda);
  $('#salir-sin').classList.toggle('b--sec', !cruda);
  abrir('#d-salir');
}
const fotoDe = (img, e) => { img.src = foto(e, 240, 300).toDataURL(); };
/* Ponle nombre: sale al tocar listo, regalar o guardar antes de salir. */
let trasNombre = 'guardada';
function abrirNombre(despues) {
  if (colocando) terminarColocar();
  trasNombre = despues;
  $('#r-nombre').value = estado.n || nombrePorDefecto();
  $('#nombre-guardar').textContent = despues === 'compartir' ? 'Siguiente' : 'Guardar';
  fotoDe($('#nombre-foto'), receta());
  abrir('#d-nombre');
}
/* El nombre que se propone sale de lo que se amasó: Guagua, Caballito, Guaguau…
   y si ya hay una con ese nombre en tu canasta, lleva número: «Caballito 2». */
function nombrePorDefecto() {
  const base = nombreDe({ f: estado.f, n: '' });
  const usados = new Set(vitrina().filter((x) => x.t === 'mia' && x.id !== estado.id).map((x) => x.n).filter(Boolean));
  if (!usados.has(base)) return base;
  let k = 2;
  while (usados.has(`${base} ${k}`)) k++;
  return `${base} ${k}`;
}
async function guardarConNombre() {
  estado.n = $('#r-nombre').value.trim().slice(0, 40) || nombrePorDefecto();
  await guardarYa();
  $('#d-nombre').close();
  if (trasNombre === 'compartir') abrirCompartir();
  else if (trasNombre === 'salir') mostrar('canasta');
  else { fotoDe($('#guardada-foto'), receta()); abrir('#d-guardada'); }
}
async function guardarYa() {
  await guardarMia();
  ultimaGuardada = huella();
  guardarBorrador();
}
function nueva(molde = 'guagua') {
  Object.assign(estado, { a: MOLDES[molde](), f: molde, k: 0, o: [], id: null, n: '', p: '', m: '', t: '', l: 0, capa: 0 });
  masaDelMolde = JSON.stringify(estado.a);
  historia = []; futuro = [];
  ultimaGuardada = null;
  sincronizarControles();
  taller.cargar(estado);
  irA('amasar');
  mostrar('taller');
}
/* Una que quedó a medio decorar: se retoma desde la canasta. */
function cargarEnTaller(e, id) {
  Object.assign(estado, { f: e.f, a: e.a, k: e.k, o: e.o.slice(), n: e.n, p: e.p, d: e.d, m: e.m, t: e.t, l: e.l || 0, capa: e.capa || 0, id });
  historia = []; futuro = [];
  sincronizarControles();
  taller.cargar(estado);
  irA('decorar');
}
function pintarPendiente() {
  const b = almacen.leer(BORRADOR, null);
  const hay = !!(b && b.etapa === 'decorar' && Array.isArray(b.o) && b.o.length && !b.guardada);
  $('#seguir-borrador').hidden = !hay;
  if (hay) $('#seguir-borrador-d').textContent = (b.n || 'Tu guagua') + ', a medio decorar';
}
async function guardarMia(regalo) {
  if (!estado.id) estado.id = nuevoId();
  const item = { id: estado.id, t: 'mia', n: estado.n, e: await codificar(receta()), f: Date.now() };
  if (regalo) item.g = regalo;
  guardarEnVitrina(item);
  pintarVitrina();
}
function sincronizarControles() {
  const marcar = (attr, v) => $$(`button[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(v))));
  marcar('data-mano', estado.mano);
  marcar('data-grosor', estado.grosor);
  marcar('data-ancho', estado.ancho);
  $$('#cremas .color').forEach((x, j) => x.setAttribute('aria-pressed', String(j === estado.crema)));
  elegirHerramienta(estado.herramienta);
  pintarAro();
}


/* ─── regalar ──────────────────────────────────────────────── */
/* Compartir tiene que ocurrir en el mismo toque: Safari y Chrome solo dejan
   abrir la hoja de compartir (o WhatsApp en otra pestaña) si no se esperó
   antes a la red ni a renderizar. Por eso la tarjeta, el archivo y el enlace
   se preparan apenas cambia algo, y el botón solo usa lo que ya está listo. */
let preparado = null, turnoTarjeta = 0, reloj = null, relojNube = null;
const publicados = new Map();      // receta → id del regalo, para no publicar dos veces la misma
/* ─── compartir ────────────────────────────────────────────
   ✓ guarda; Compartir es todo lo demás. Se le pone nombre y se elige cómo y en
   qué formato; cada camino pide solo lo suyo y la tarjeta cambia en vivo:
   El formato va solo: vertical para presumir y recordar, cuadrado para regalar (va
   por chat); un botoncito junto a la vista previa lo cambia.
   · presúmela: tu creación; se comparte desde el primer paso
     (sin @usuario: el de la app podría no ser el de sus redes).
   · envíasela a alguien: para (obligatorio), de y un mensaje; en cuadrado, porque va por chat.
   · en memoria de alguien: a quién recuerdas (obligatorio) y un mensaje; en cuadrado. */
let como = 'presume', pasoC = 'como', formatoC = 'historia';
// la canasta y la colada: van por defecto, salvo la canasta para las figuras echadas (el guaguau no cabe bien)
let conCanasta = true, conColada = true;
const FORMATO_DE = { presume: 'historia', alguien: 'cuadrada', memoria: 'historia' };
const OBLIGATORIO = { alguien: '#r-para', memoria: '#s-memoria' };
const ACCIONES = ['#c-mandar', '#c-recordar', '[data-copiar]', '[data-descargar]'];
/* Lo que se escribe se limpia antes de dibujarlo o mandarlo: sin caracteres de
   control ni de dirección, espacios simples, el largo justo, apóstrofes y comillas
   tipográficos, y sin « » propias (la tarjeta pone las suyas al nombre). */
function limpiar(v, max) {
  return String(v || '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ').trim()
    .replace(/(\w)'(\w)/g, '$1’$2').replace(/'/g, '’')
    .replace(/"([^"]*)"/g, '“$1”').replace(/"/g, '”')
    .slice(0, max).trim();
}
/* Google trae el nombre completo; para firmar basta el primero (se cambia en Tu cuenta). */
const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';
function quienSoy() {
  const u = nube.actual && nube.actual();
  return estado.d || almacen.leer('guagua:firma', '') || primerNombre(u && u.nombre);
}
function pintarComo() {
  $$('#d-compartir [data-como]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.como === como)));
  const otro = formatoC === 'cuadrada' ? 'historia' : 'cuadrada';
  $('#c-formato').dataset.formato = otro;
  $('#c-formato').setAttribute('aria-label', otro === 'cuadrada' ? 'Cambiar a cuadrado' : 'Cambiar a vertical');
  $('#c-formato').title = $('#c-formato').getAttribute('aria-label');
  $('#c-canasta').setAttribute('aria-pressed', String(conCanasta));
  $('#c-colada').setAttribute('aria-pressed', String(conColada));
  $('#c-canasta').title = conCanasta ? 'Quitar la canasta' : 'Poner la canasta';
  const cosa = como === 'memoria' ? 'la vela' : 'la colada';
  $('#c-colada').title = (conColada ? 'Quitar ' : 'Poner ') + cosa;
  $('#c-colada').setAttribute('aria-label', 'Con ' + cosa);
  $('#c-colada use').setAttribute('href', como === 'memoria' ? '#x-vela' : '#x-taza');
  $('#c-seguir').textContent = como === 'presume' ? 'Compartir' : 'Siguiente';
  $('#c-extra-presume').hidden = como !== 'presume';
  $('#c-galeria-fila').hidden = como !== 'presume' || !nube.disponible();
  $('#c-galeria').checked = almacen.leer(GALERIA_SI, true);
  if (pasoC === 'como') $('#c-paso').textContent = como === 'presume' ? '' : '1 de 2';
  const vista = $('#c-vista');
  vista.classList.toggle('compartir__vista--cuadrada', formatoC === 'cuadrada');
  vista.width = 1080; vista.height = formatoC === 'cuadrada' ? 1080 : 1920;
  // lo obligatorio: sin nombre no se envía
  const falta = OBLIGATORIO[como] && !limpiar($(OBLIGATORIO[como]).value, 24);
  $('#c-falta-para').hidden = !(como === 'alguien' && falta);
  $('#c-falta-memoria').hidden = !(como === 'memoria' && falta);
}
function irPasoC(p) {
  pasoC = p;
  $$('#d-compartir .compartir__paso').forEach((x) => { x.hidden = x.dataset.paso !== p; });
  $('#c-paso').textContent = p === 'como' ? (como === 'presume' ? '' : '1 de 2') : '2 de 2';
  $('#c-vista').classList.toggle('compartir__vista--chica', p !== 'como');
  pintarComo();
  refrescarTarjeta();
}
function elegirComo(c) {
  como = c;
  formatoC = FORMATO_DE[c];                       // el formato que más se usa para ese camino
  pintarComo(); refrescarTarjeta();
}
function abrirCompartir() {
  // si la guagua ya tenía enlace (guardado en la canasta, quizá desde otro teléfono), se reusa
  const enlaces = almacen.leer(ENLACES, {});
  const guardada = estado.id && !enlaces[estado.id] && vitrina().find((x) => x.id === estado.id && x.g);
  if (guardada) { enlaces[estado.id] = { g: guardada.g, compartida: true }; almacen.poner(ENLACES, enlaces); }
  // cada camino arranca de lo que ya tenía la guagua
  como = estado.t === 'm' ? 'memoria' : estado.p ? 'alguien' : 'presume';
  formatoC = FORMATO_DE[como];
  $('#r-para').value = estado.t === 'm' ? '' : estado.p;
  $('#r-de').value = quienSoy();
  $('#s-memoria').value = estado.t === 'm' ? estado.p : '';
  $('#r-mensaje').value = estado.t === 'm' ? '' : estado.m;
  $('#s-mensaje').value = estado.t === 'm' ? estado.m : '';
  conCanasta = !echada(estado); conColada = true;
  $('#c-vista').removeAttribute('src');
  abrir('#d-compartir');
  irPasoC('como');
}
/* Lee los campos del camino elegido y devuelve lo que la tarjeta necesita aparte de la receta. */
function leerFormulario() {
  if (como === 'memoria') {
    Object.assign(estado, { t: 'm', p: limpiar($('#s-memoria').value, 24), m: limpiar($('#s-mensaje').value, 120), l: 0 });
  } else if (como === 'alguien') {
    Object.assign(estado, { t: '', p: limpiar($('#r-para').value, 24), m: limpiar($('#r-mensaje').value, 120), l: 0 });
    const d = limpiar($('#r-de').value, 24);
    estado.d = d;
    if (d) almacen.poner('guagua:firma', d);
  } else {
    Object.assign(estado, { t: '', p: '', m: '', l: 0 });   // presúmela: tu creación, sin destinatario
  }
  return { como, de: quienSoy(), canasta: conCanasta, colada: conColada };
}
function botonesListos(listo) {
  const falta = OBLIGATORIO[como] && !limpiar($(OBLIGATORIO[como]).value, 24);
  ACCIONES.forEach((sel) => $$(sel).forEach((b) => { b.disabled = !listo || falta; b.setAttribute('aria-busy', String(!listo)); }));
}
async function refrescarTarjeta() {
  const extra = leerFormulario();
  const turno = ++turnoTarjeta;
  preparado = null; botonesListos(false);
  const r = receta();
  const cod = await codificar(r);
  const c = await tarjeta(r, formatoC, extra);
  if (turno !== turnoTarjeta) return;
  $('#c-vista').src = c.toDataURL('image/jpeg', 0.85);
  const blob = await aBlob(c);
  if (turno !== turnoTarjeta) return;
  const nombre = 'guagua-' + (estado.n || 'de-pan').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '-') + (formatoC === 'cuadrada' ? '-cuadrada' : '-historia') + '.png';
  preparado = { cod, blob, archivo: new File([blob], nombre, { type: 'image/png' }), nombre, url: direccion() + '#r=' + cod, id: null, texto: textoRegalo() };
  guardarBorrador();
  botonesListos(true);
  enlaceCorto(preparado);
}
/* El enlace corto: la guagua se publica en /guaguas (con cuenta o sin ella) en
   cuanto la tarjeta se queda quieta un momento. Si la nube no responde a tiempo,
   se comparte el largo (#r=…), que también sirve.
   Cada guagua tiene UN enlace: la primera vez se crea y, si después cambia el
   nombre, la dedicatoria o el mensaje, se actualiza el mismo (quien ya lo tiene ve
   la versión nueva). Si nunca se compartió y se cierra Compártela, se borra. */
const ENLACES = 'guagua:enlaces';                  // id de la guagua → { g: id del enlace, compartida }
let colaNube = Promise.resolve();                  // de a uno: dos publicaciones a la vez duplicarían
async function publicarVersion(pr, idGuagua) {
  const mapa = almacen.leer(ENLACES, {}), ya = mapa[idGuagua];
  let id = null;
  if (ya) {
    try { await nube.actualizarRegalo(ya.g, pr.cod); id = ya.g; } catch (e) {
      // no se pudo actualizar (otra sesión, o ya no existe): uno nuevo, y el viejo sin compartir se va
      if (!ya.compartida) nube.borrarRegalo(ya.g).catch(() => {});
    }
  }
  if (!id) {
    id = await nube.publicarRegalo(pr.cod);
    mapa[idGuagua] = { g: id, compartida: !!(ya && ya.compartida) };
    almacen.poner(ENLACES, mapa);
  }
  publicados.set(pr.cod, id);
  pr.id = id; pr.url = direccion() + '#g=' + id;
}
function enlaceCorto(pr) {
  if (!nube.disponible()) return;
  if (!estado.id) estado.id = nuevoId();
  const ya = publicados.get(pr.cod);
  if (ya) { pr.id = ya; pr.url = direccion() + '#g=' + ya; return; }
  clearTimeout(relojNube);
  const idGuagua = estado.id;
  relojNube = setTimeout(() => {
    colaNube = colaNube.then(() => (pr === preparado ? publicarVersion(pr, idGuagua) : null)).catch(() => { /* se queda el enlace largo */ });
  }, 900);
}
/* Compartida de verdad: su enlace ya está afuera y no se borra al cerrar. */
function marcarCompartida(idGuagua) {
  const mapa = almacen.leer(ENLACES, {});
  if (mapa[idGuagua]) { mapa[idGuagua].compartida = true; almacen.poner(ENLACES, mapa); }
}
function olvidarSinCompartir(idGuagua) {
  const mapa = almacen.leer(ENLACES, {}), ya = mapa[idGuagua];
  if (!ya || ya.compartida) return;
  colaNube = colaNube.then(() => nube.borrarRegalo(ya.g)).catch(() => {});
  publicados.forEach((v, k) => { if (v === ya.g) publicados.delete(k); });
  delete mapa[idGuagua];
  almacen.poner(ENLACES, mapa);
}
/* El texto que acompaña al enlace: corto y con ganas de abrirlo y de hacer la propia. */
const textoRegalo = (e = estado) => {
  const que = queEs(e) + ' de pan';
  if (enMemoria(e)) return `🕯️ Decoré ${que} para recordar a «${e.p}». Decora y comparte la tuya:`;
  if (!e.p) {
    const n = contarAdornos(e);
    return `🍞 ¡Ya tengo mi ${dePan(e)}${n > 1 ? `, con ${n} adornos` : ''}! Decora y comparte la tuya:`;
  }
  return `🧺 ${e.p}, te regalo ${queEs(e).split(' ')[0]} ${dePan(e)}${e.d ? ' (' + e.d + ')' : ''}. ${e.m || '¿Compartimos una colada de verdad este finados?'} Ábrela aquí:`;
};
/* Copiar responde en el mismo botón («¡Copiado!») y con el toast. */
async function copiar(texto, boton) {
  const listo = () => {
    avisa('Enlace copiado. Pégalo donde quieras.', 'ok');
    if (!boton) return;
    const antes = boton.textContent;
    boton.textContent = '¡Copiado!';
    setTimeout(() => { boton.textContent = antes; }, 1800);
  };
  try { await navigator.clipboard.writeText(texto); listo(); }
  catch (e) {
    // sin permiso de portapapeles: un campo seleccionado para copiar a mano
    const t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px';
    (document.querySelector('dialog[open]') || document.body).appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { /* nada */ }
    t.remove();
    if (ok) listo(); else prompt('Copia el enlace de tu guagua:', texto);
  }
}
function montarRegalo() {
  // escribir cambia la tarjeta, un momento después (la escena 3D no se vuelve a armar)
  $$('#d-compartir input, #d-compartir textarea').forEach((x) => x.addEventListener('input', () => {
    preparado = null; botonesListos(false);
    pintarComo();
    clearTimeout(reloj);
    reloj = setTimeout(refrescarTarjeta, 300);
  }));
  $('#d-compartir').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.target.blur(); }
  });
  $$('#d-compartir [data-como]').forEach((b) => b.addEventListener('click', () => { if (como !== b.dataset.como) elegirComo(b.dataset.como); }));
  // el botoncito junto a la vista previa: cambia entre vertical y cuadrado
  $('#c-canasta').addEventListener('click', () => { conCanasta = !conCanasta; pintarComo(); refrescarTarjeta(); });
  $('#c-colada').addEventListener('click', () => { conColada = !conColada; pintarComo(); refrescarTarjeta(); });
  $('#c-formato').addEventListener('click', () => {
    formatoC = formatoC === 'cuadrada' ? 'historia' : 'cuadrada';
    pintarComo(); refrescarTarjeta();
  });
  $('#c-atras').addEventListener('click', () => { if (pasoC === 'como') $('#d-compartir').close(); else irPasoC('como'); });
  $('#c-seguir').addEventListener('click', () => { if (como === 'presume') enviar(); else irPasoC(como); });
  // lo que pasa después de compartir no hace esperar a la hoja de compartir
  /* Ya se compartió: queda guardada en tu canasta, se cierra todo y vuelves a ella. */
  const despues = (pr) => {
    marcarCompartida(estado.id);
    const guardada = guardarMia(pr.id);
    if (como === 'presume' && $('#c-galeria').checked && nube.disponible()) alaGaleria().catch(() => {});
    guardada.catch(() => {}).then(() => {
      ultimaGuardada = huella();
      guardarBorrador();
      setTimeout(() => {
        $$('dialog[open]').forEach((d) => d.close());
        pestana = 'mia';
        mostrar('canasta');
      }, 450);                                   // un respiro para leer el «¡Copiado!»
    });
  };
  const descargar = (pr) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pr.blob);
    a.download = pr.nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  /* Se comparte la imagen con su texto y su enlace (WhatsApp, mensajes, redes);
     si el navegador no tiene hoja de compartir, la imagen se descarga. */
  const enviar = () => {
    const pr = preparado;
    if (!pr) return;
    const titulo = 'Una guagua de pan';
    let promesa = null;
    if (navigator.canShare && navigator.canShare({ files: [pr.archivo] })) {
      promesa = navigator.share({ files: [pr.archivo], title: titulo, text: pr.texto + ' ' + pr.url });
    } else if (navigator.share) {
      promesa = navigator.share({ title: titulo, text: pr.texto, url: pr.url });
    }
    if (!promesa) { descargar(pr); despues(pr); return; }
    promesa.then(() => despues(pr)).catch((e) => {
      if (e && e.name === 'AbortError') return;
      descargar(pr); despues(pr);
    });
  };
  ['#c-mandar', '#c-recordar'].forEach((sel) => $(sel).addEventListener('click', enviar));
  $$('#d-compartir [data-copiar]').forEach((b) => b.addEventListener('click', () => { if (preparado) { copiar(preparado.url, b); despues(preparado); } }));
  $$('#d-compartir [data-descargar]').forEach((b) => b.addEventListener('click', () => { if (preparado) { descargar(preparado); despues(preparado); } }));
  $('#c-datos').addEventListener('click', () => abrir('#d-datos'));
  // apagar el interruptor también la quita de la galería, si ya estaba
  $('#c-galeria').addEventListener('change', (ev) => {
    almacen.poner(GALERIA_SI, ev.target.checked);
    if (!ev.target.checked && estado.id) sacarDeGaleria(estado.id);
  });
  // se cerró sin compartir: lo publicado de antemano no se queda en la nube
  $('#d-compartir').addEventListener('close', () => { if (estado.id) olvidarSinCompartir(estado.id); });
}

/* ══════════════════ LA GALERÍA ══════════════════════════════ */
/* Las que se presumen pueden ir a la galería (el interruptor de Compártela,
   encendido por defecto y recordado). Va solo la guagua y su nombre: la receta
   sube sin para quién, de quién, mensaje ni vale; aparte va tu firma (la de Tu cuenta, o la del último «De»). Cada guagua de tu canasta
   tiene a lo más una en la galería; si cambió, la nueva reemplaza a la vieja. */
const GALERIA_SI = 'guagua:galeria', EN_GALERIA = 'guagua:en-galeria';
async function alaGaleria() {
  if (!estado.id) return;
  const cod = await codificar(Object.assign(receta(), { p: '', d: '', m: '' }, { t: undefined, l: undefined }));
  const firma = limpiar(quienSoy(), 24), huellaG = cod + '|' + firma;
  const mapa = almacen.leer(EN_GALERIA, {}), ya = mapa[estado.id];
  if (ya && ya.h === huellaG) return;
  // con reglas viejas (sin «firma») la firma no pasa: entonces va sin ella
  const id = await nube.publicarEnGaleria(cod, estado.n || nombreDe(estado), estado.f, firma)
    .catch((e) => { if (firma && e.code === 'permission-denied') return nube.publicarEnGaleria(cod, estado.n || nombreDe(estado), estado.f); throw e; });
  if (ya) nube.quitarDeGaleria(ya.g).catch(() => {});
  mapa[estado.id] = { g: id, h: huellaG };
  almacen.poner(EN_GALERIA, mapa);
}
function sacarDeGaleria(idGuagua) {
  const mapa = almacen.leer(EN_GALERIA, {}), ya = mapa[idGuagua];
  if (!ya) return;
  nube.quitarDeGaleria(ya.g).catch(() => {});
  delete mapa[idGuagua];
  almacen.poner(EN_GALERIA, mapa);
}
let cursorGaleria = null;
async function pintarGaleria(turno, mas = false) {
  const rej = $('#vitrina-rej'), vacia = $('#vitrina-vacia'), boton = $('#galeria-mas');
  if (!mas) { rej.textContent = ''; cursorGaleria = null; vacia.hidden = false; vacia.textContent = 'Abriendo la galería…'; }
  boton.hidden = true;
  let pagina;
  try {
    if (!(await nube.iniciar())) throw Object.assign(new Error('sin nube'), { code: 'unavailable' });
    pagina = await nube.leerGaleria(mas ? cursorGaleria : null);
  } catch (err) {
    if (turno !== turnoVitrina) return;
    vacia.hidden = false;
    vacia.textContent = err && err.code === 'permission-denied'
      ? 'La galería todavía no está abierta. Vuelve pronto.'
      : 'No se pudo abrir la galería. Revisa tu conexión y vuelve a intentarlo.';
    return;
  }
  if (turno !== turnoVitrina) return;
  cursorGaleria = pagina.cursor;
  if (!mas) {
    vacia.hidden = !!pagina.items.length;
    vacia.textContent = 'Todavía no hay guaguas en la galería. Presume la tuya y sé quien la estrene.';
  }
  const mio = nube.miUid();
  for (const g of pagina.items) {
    let e;
    try { e = await decodificar(g.receta); } catch (err) { continue; }
    if (turno !== turnoVitrina) return;
    if (!e.a.length) continue;
    const cuando = g.creada && g.creada.toDate ? g.creada.toDate().getTime() : Date.now();
    const item = { t: 'galeria', gid: g.id, f: cuando, tuya: !!mio && g.dueno === mio, firma: typeof g.firma === 'string' ? g.firma.slice(0, 24) : '' };
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pieza';
    const c = foto(e, 240, 300);
    c.className = 'pieza__img'; c.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span'); t.className = 'pieza__nombre';
    t.textContent = nombreDe(e);
    const s = document.createElement('span'); s.className = 'pieza__meta';
    s.textContent = (item.firma ? 'de ' + item.firma + ' · ' : item.tuya ? 'la tuya · ' : '') + fecha(cuando);
    b.append(c, t, s);
    b.addEventListener('click', () => abrirPieza(item, e));
    rej.appendChild(b);
  }
  boton.hidden = !cursorGaleria;
  if (!mas && !rej.children.length) {
    vacia.hidden = false;
    vacia.textContent = 'Todavía no hay guaguas en la galería. Presume la tuya y sé quien la estrene.';
  }
}

/* ══════════════════ TU CANASTA ══════════════════════════════ */
let pestana = 'mia', visorPieza = null, piezaActual = null;
const fecha = (t) => new Date(t).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
let turnoVitrina = 0;
async function pintarVitrina(cual) {
  if (cual) pestana = cual;
  const turno = ++turnoVitrina;          // si llega otra pintada mientras se espera a la nube, gana la última
  $$('[data-vitrina]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vitrina === pestana)));
  const rej = $('#vitrina-rej');
  $('#galeria-mas').hidden = true;
  $('.canasta__sub').textContent = pestana === 'galeria'
    ? 'Las guaguas que la gente presumió este Finados. Toca una para verla de cerca.'
    : 'Aquí están las guaguas que has creado y las que te han regalado';
  const todas = await listaVitrina();
  if (turno !== turnoVitrina) return;
  if (pestana === 'galeria') {
    $('#cuenta-mia').textContent = todas.filter((x) => x.t === 'mia').length;
    $('#cuenta-recibida').textContent = todas.filter((x) => x.t === 'recibida').length;
    pintarCuentaBarra();
    return pintarGaleria(turno);
  }
  const lista = todas.filter((x) => x.t === pestana);
  pintarCuentaBarra();
  $('#cuenta-mia').textContent = todas.filter((x) => x.t === 'mia').length;
  $('#cuenta-recibida').textContent = todas.filter((x) => x.t === 'recibida').length;
  rej.textContent = '';
  $('#vitrina-vacia').hidden = !!lista.length;
  $('#vitrina-vacia').textContent = pestana === 'mia'
    ? 'Aquí se guardan las que amasas. Todavía no hay ninguna.'
    : 'Aquí aparecen las que te regalan. Regala una: quizá te devuelvan el gesto.';
  for (const item of lista) {
    let e;
    try { e = await decodificar(item.e); } catch (err) { continue; }
    if (turno !== turnoVitrina) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pieza';
    const c = foto(e, 240, 300);
    c.className = 'pieza__img'; c.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span'); t.className = 'pieza__nombre';
    t.textContent = nombreDe(e);
    const s = document.createElement('span'); s.className = 'pieza__meta';
    const para = e.p ? (enMemoria(e) ? 'en memoria de ' : 'para ') + e.p + ' · ' : '';
    s.textContent = item.t === 'recibida' ? (e.d ? 'de ' + e.d : 'regalada') + ' · ' + fecha(item.f) : para + fecha(item.f);
    b.append(c, t, s);
    b.addEventListener('click', () => abrirPieza(item, e));
    rej.appendChild(b);
  }
}
function abrirPieza(item, e) {
  piezaActual = { item, e };
  $('#p-titulo').textContent = nombreDe(e);
  const quien = [e.p && (enMemoria(e) ? 'En memoria de ' : 'Para ') + e.p, e.d && 'de ' + e.d].filter(Boolean).join(' · ');
  $('#p-quien').textContent = quien;
  $('#p-quien').hidden = !quien;
  $('#p-mensaje').textContent = e.m || '';
  $('#p-mensaje').hidden = !e.m;
  const enGaleria = item.t === 'galeria';
  if (enGaleria) {
    $('#p-quien').textContent = (item.firma ? 'De ' + item.firma + (item.tuya ? ' (tú)' : '') + ', en la galería · ' : item.tuya ? 'La tuya, en la galería · ' : 'En la galería · ') + fecha(item.f);
    $('#p-quien').hidden = false;
  }
  $('#p-editar').hidden = item.t !== 'mia';
  $('#p-compartir').textContent = item.t === 'mia' ? 'Compartirla' : enGaleria ? 'Decorar una igual' : 'Reenviarla';
  $('#p-borrar').textContent = enGaleria ? 'Quitarla de la galería' : 'Sacar de la canasta';
  $('#p-borrar').hidden = enGaleria && !item.tuya;
  abrir('#d-pieza');
  if (!visorPieza) visorPieza = new Visor($('#p-lienzo'));
  visorPieza.giro = -0.25; Object.assign(visorPieza, posturaDe(e));
  visorPieza.cargar(e);
  visorPieza.medir();
}
function montarVitrina() {
  $$('[data-vitrina]').forEach((b) => b.addEventListener('click', () => pintarVitrina(b.dataset.vitrina)));
  $('#galeria-mas').addEventListener('click', () => pintarGaleria(turnoVitrina, true));
  $('#amasar-otra').addEventListener('click', () => nueva());
  $('#seguir-borrador').addEventListener('click', () => {
    const b = almacen.leer(BORRADOR, null);
    if (!b) return;
    cargarEnTaller(sano(b), typeof b.id === 'string' ? b.id : null);
    mostrar('taller');
  });
  $('#abrir-cuenta').addEventListener('click', () => abrirCuenta());
  $('#p-editar').addEventListener('click', () => {
    const { item, e } = piezaActual;
    cargarEnTaller(e, item.id);
    ultimaGuardada = huella();
    $('#d-pieza').close();
    mostrar('taller');
  });
  // las tuyas se comparten como cualquiera recién hecha; las que te regalaron se reenvían tal cual
  $('#p-compartir').addEventListener('click', () => {
    const { item, e } = piezaActual;
    $('#d-pieza').close();
    if (item.t === 'mia') {
      cargarEnTaller(e, item.id);
      ultimaGuardada = huella();
      abrirCompartir();
      return;
    }
    if (item.t === 'galeria') {             // una copia para ti: la decoras a tu gusto y es tuya
      cargarEnTaller(Object.assign({}, e, { n: '', p: '', d: '', m: '' }), null);
      masaDelMolde = JSON.stringify(e.a);
      mostrar('taller');
      return;
    }
    const enlace = direccion() + (item.g ? '#g=' + item.g : '#r=' + item.e);
    if (navigator.share) {
      navigator.share({ title: 'Una guagua de pan', text: textoRegalo(e), url: enlace })
        .catch((err) => { if (!err || err.name !== 'AbortError') copiar(enlace); });
    } else copiar(enlace);
  });
  $('#p-borrar').addEventListener('click', () => {
    if (piezaActual.item.t === 'galeria') {
      if (!confirm('¿Quitar esta guagua de la galería? En tu canasta se queda.')) return;
      const gid = piezaActual.item.gid, mapa = almacen.leer(EN_GALERIA, {});
      Object.keys(mapa).forEach((k) => { if (mapa[k].g === gid) delete mapa[k]; });
      almacen.poner(EN_GALERIA, mapa);
      nube.quitarDeGaleria(gid).then(() => pintarVitrina()).catch((err) => avisa(nube.explicar(err), 'error'));
      $('#d-pieza').close();
      return;
    }
    if (!confirm('¿Sacar esta guagua de tu canasta? No se puede deshacer.')) return;
    sacarDeVitrina(piezaActual.item.id);
    sacarDeGaleria(piezaActual.item.id);           // si estaba en la galería, también se va de ahí
    if (estado.id === piezaActual.item.id) estado.id = null;
    $('#d-pieza').close();
    pintarVitrina();
  });
}

/* ══════════════════ CUANDO TE LLEGA UNA ═════════════════════ */
let recibida = null, visorRegalo = null, mordidas = 0;
async function recibir(cod, regalo) {
  let e;
  try { e = await decodificar(cod); }
  catch (err) { avisa('No se pudo abrir esta guagua. Pide que te la envíen otra vez.', 'error'); return; }
  recibida = e; mordidas = 0;
  $$('dialog[open]').forEach((d) => d.close());   // lo que llega va encima de todo
  document.body.classList.add('modo-regalo');
  $('#regalo').hidden = false;
  const memoria = enMemoria(e), vale = memoria ? null : VALES[e.l];
  const que = queEs(e);
  const regalada = !memoria && !!e.p;           // sin destinatario: alguien la compartió en sus redes
  $('#regalo-kicker').textContent = memoria ? 'Una guagua para recordar' : regalada ? 'Te llegó una guagua' : 'Una guagua de Finados';
  $('#regalo-titulo').textContent = memoria
    ? `${e.d ? e.d + ' amasó ' + que : que.charAt(0).toUpperCase() + que.slice(1)} en memoria de ${e.p || 'quienes ya no están'}`
    : regalada ? (e.d ? `${e.d} te regaló ${que}` : `Te regalaron ${que}`) : `${e.d ? e.d + ' amasó' : 'Mira'} ${que}`;
  $('#regalo-nombre').textContent = nombreDe(e);
  $('#regalo-para').textContent = !memoria && e.p ? 'Para ' + e.p : '';
  $('#regalo-para').hidden = memoria || !e.p;
  $('#regalo-mensaje').textContent = e.m || '';
  $('#regalo-mensaje').hidden = !e.m;
  $('#regalo-vale').hidden = !vale;
  if (vale) {
    $('#regalo-vale-t').textContent = vale.titulo;
    $('#regalo-vale-d').textContent = vale.detalle;
    $('#regalo-cobrar-t').textContent = vale.boton || '';
  }
  // un solo botón principal: cobrar el vale si trae uno; si no, devolver el gesto
  const cobra = !!(vale && vale.boton);
  $('#regalo-cobrar').hidden = !cobra;
  $('#regalo-devolver').classList.toggle('b--pri', !cobra);
  $('#regalo-devolver').classList.toggle('b--sec', cobra);
  $('#regalo-pista').textContent = memoria
    ? 'En Finados se comparte el pan con los que recordamos. Tócala para darle un mordisco.'
    : 'Gírala con dos dedos. Tócala para darle un mordisco.';
  $('#regalo-devolver-t').textContent = memoria ? 'Dedica una tú también' : e.l === 3 ? 'Pasarla a alguien más' : regalada ? 'Amasar una de vuelta' : 'Amasa la tuya';
  $('#regalo-devolver').classList.toggle('latido', e.l === 3);
  if (!visorRegalo) {
    visorRegalo = new Visor($('#regalo-lienzo'), {
      toca(ev) {
        const hit = visorRegalo.tocar(ev);
        if (!hit) return false;
        if (visorRegalo.bocados().length >= MAX_BOCADOS) return true;
        visorRegalo.morder([3, ent(hit.p.x), ent(hit.p.y), ent(hit.p.z)]);
        crunch();
        mordidas++;
        const pista = $('#regalo-pista');
        if (visorRegalo.bocados().length >= MAX_BOCADOS || mordidas === 9) {
          pista.textContent = enMemoria(recibida) ? 'Se acabó. ¿A quién recuerdas tú? Dedícale una.' : 'Se acabó. Ahora te toca amasar una para alguien más.';
          $('#regalo-devolver').classList.add('latido');
        } else if (mordidas === 1) pista.textContent = 'Crocante por fuera, suave por dentro.';
        else if (mordidas === 4) pista.textContent = 'Va por la mitad. Con colada morada sabría mejor.';
        else if (mordidas === 6) pista.textContent = 'Guarda un poco para compartir.';
        return true;
      },
    });
  }
  visorRegalo.giro = -0.25; Object.assign(visorRegalo, posturaDe(e));
  visorRegalo.ambiente('decorar');
  visorRegalo.cargar(e);
  visorRegalo.medir();
  const medirRegalo = () => { visorRegalo.margen = margenes($('#regalo-lienzo'), $('.regalo__arriba'), $('#regalo-tarjeta')); visorRegalo.dibujar(); };
  requestAnimationFrame(medirRegalo);
  if (!visorRegalo._observa) { visorRegalo._observa = new ResizeObserver(medirRegalo); visorRegalo._observa.observe($('#regalo-tarjeta')); }
  const item = { id: nuevoId(), t: 'recibida', e: cod, f: Date.now() };
  if (regalo) item.g = regalo;
  guardarEnVitrina(item);
  pintarVitrina('recibida');
}
function montarRecibir() {
  $('#regalo-devolver').addEventListener('click', () => {
    const e = recibida || {};
    // a quien te la regaló se la devuelves; una dedicada o una que se pasa, a alguien más
    const para = !enMemoria(e) && e.l !== 3 ? e.d : '';
    cerrarRegalo();
    nueva(e.f === 'guaguau' ? 'guaguau' : 'guagua');
    estado.p = para || '';
    estado.t = enMemoria(e) ? 'm' : '';
    guardarBorrador();
    avisa(enMemoria(e) ? '¿A quién quieres recordar? Amasa su guagua.'
      : para ? `Amasa una para ${para}.` : e.l === 3 ? 'Amasa una para alguien más y que siga la cadena.' : 'Amasa la tuya.', 'ok');
  });
  $('#regalo-cobrar').addEventListener('click', () => {
    const vale = recibida && VALES[recibida.l];
    if (!vale || !vale.cobrar) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(vale.cobrar(recibida.d)), '_blank', 'noopener');
  });
  $('#regalo-taller').addEventListener('click', () => { cerrarRegalo(); mostrar('canasta'); });
}
function cerrarRegalo() {
  document.body.classList.remove('modo-regalo');
  $('#regalo').hidden = true;
  history.replaceState(null, '', location.pathname + location.search);
}

/* ─── arranque ─────────────────────────────────────────────── */
/* Cuando sale una versión nueva, la página se recarga sola una vez: así nadie
   se queda con el juego viejo por el caché del navegador. La versión va en
   el <meta> y en los ?v= de cada archivo; version.json se pide sin caché. */
function vigilarVersion() {
  const mia = (document.querySelector('meta[name="guagua-version"]') || {}).content;
  if (!mia || !navigator.onLine) return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((d) => {
    if (!d || d.v === mia) return;
    const clave = 'guagua:recargada';
    if (sessionStorage.getItem(clave) === d.v) return;   // ya se recargó por esta: no insistir
    sessionStorage.setItem(clave, d.v);
    location.reload();
  }).catch(() => { /* sin red o sin archivo: nada */ });
}
/* Moldes secretos: no salen en la fila hasta que alguien abre el juego con
   su llave (?llave=dormilon); el navegador la recuerda. Los regalos hechos
   con ellos se ven igual: lo secreto es poder amasarlos, no recibirlos. */
function abrirSecretos() {
  const llaves = new Set(almacen.leer('guagua:llaves', []));
  const q = new URLSearchParams(location.search), llave = q.get('llave');
  if (llave && MOLDES[llave]) {
    llaves.add(llave);
    almacen.poner('guagua:llaves', [...llaves]);
    q.delete('llave');
    const resto = q.toString();
    history.replaceState(null, '', location.pathname + (resto ? '?' + resto : '') + location.hash);
    avisa('Molde secreto desbloqueado: ' + llave.charAt(0).toUpperCase() + llave.slice(1) + '.', 'ok');
  }
  $$('[data-molde][data-secreto]').forEach((b) => { b.hidden = !llaves.has(b.dataset.molde); });
}
/* El teclado: iOS no achica la página, la empuja. Las hojas que ocupan toda la
   pantalla se ajustan al área que queda visible (visualViewport), y mientras se
   escribe se esconde lo secundario: queda el campo y el botón principal a la vista. */
function seguirTeclado() {
  const vv = window.visualViewport;
  if (!vv) return;
  const raiz = document.documentElement;
  const ajustar = () => {
    raiz.style.setProperty('--vv', vv.height + 'px');
    raiz.style.setProperty('--vv-arriba', vv.offsetTop + 'px');
    raiz.classList.toggle('con-teclado', window.innerHeight - vv.height > 120);
  };
  vv.addEventListener('resize', ajustar);
  vv.addEventListener('scroll', ajustar);
  ajustar();
}
function arrancar() {
  vigilarVersion();
  seguirTeclado();
  abrirSecretos();
  $('#cuenta').textContent = rotuloFinados();
  montarHojas();
  if (!montarTaller()) { mostrar('taller'); return; }
  montarRegalo(); montarVitrina(); montarRecibir();
  $$('dialog.hoja > *').forEach((x) => x.addEventListener('click', (e) => e.stopPropagation()));
  // la app empieza en tu canasta; si todavía no hay ninguna tuya, directo a amasar
  sincronizarControles();
  const encargo = new URLSearchParams(location.search);
  const porEnlace = !!location.hash || encargo.has('molde') || encargo.has('para') || encargo.has('dedicada');
  if (!porEnlace && !vitrina().some((x) => x.t === 'mia') && !almacen.leer(BORRADOR, null)) nueva();
  else mostrar('canasta');
  const arranqueNube = nube.iniciar().then((hay) => {
    if (hay) nube.alCambiar(alCambiarCuenta);
    return hay;
  });
  const leerHash = async () => {
    const largo = location.hash.match(/^#r=([zj][A-Za-z0-9_-]+)$/);
    if (largo) { recibir(largo[1]); return; }
    const corto = location.hash.match(/^#g=([A-Za-z0-9]{6,40})$/);
    if (!corto) return;
    if (!(await arranqueNube)) { avisa('Para abrir este regalo hace falta conexión con la nube.', 'error'); return; }
    try {
      const cod = await nube.leerRegalo(corto[1]);
      if (cod) recibir(cod, corto[1]);
      else avisa('Esta guagua ya no está disponible. Pide que te la envíen otra vez.', 'error');
    } catch (e) { avisa(nube.explicar(e), 'error'); }
  };
  // un enlace por encargo (?molde=…&para=…): se amasa aquí mismo y se abre como regalo
  if (encargo.has('molde') || encargo.has('para') || encargo.has('dedicada')) {
    const args = Object.fromEntries(encargo.entries());
    codificar(amasarReceta(args)).then((cod) => {
      const limpia = new URLSearchParams(location.search);
      ['molde', 'nombre', 'para', 'de', 'mensaje', 'dedicada', 'vale', 'coccion', 'decoracion', 'colores', 'semilla'].forEach((k) => limpia.delete(k));
      const q = limpia.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + '#r=' + cod);
      leerHash();
    });
  } else leerHash();
  window.addEventListener('hashchange', leerHash);
  montarCuenta();
}

/* ══════════════════ LA CUENTA ═══════════════════════════════
   Entrar es opcional: sin cuenta todo funciona en este navegador. Con
   cuenta, la canasta se guarda en la nube y los regalos llevan enlace corto. */
let modoCuenta = 'entrar';
function abrirCuenta() {
  vistaCuenta('entrar');
  abrir('#d-cuenta');
}
/* Entrar y recuperar contraseña son pantallas distintas: la de recuperar
   solo pide el correo; la de entrar pide correo y contraseña. */
function vistaCuenta(v) {
  const recuperar = v === 'recuperar';
  $('#d-cuenta-t').textContent = recuperar ? 'Recuperar contraseña' : 'Tu cuenta';
  $('#cuenta-recuperar').hidden = !recuperar;
  $('#cuenta-fuera').hidden = recuperar || !!nube.actual();
  $('#cuenta-dentro').hidden = recuperar || !nube.actual();
  $('.cuenta__app').hidden = recuperar;
  $('#c-error').textContent = '';
  $('#c-recuperar-error').textContent = '';
}
/* El botón de la cuenta, en la canasta: con sesión lleva un punto verde. */
function pintarCuentaBarra() {
  const u = nube.actual();
  $('#cuenta-punto').hidden = !u;
  $('#abrir-cuenta').setAttribute('aria-label', u ? `Tu cuenta: ${u.nombre || u.correo}` : 'Tu cuenta: entrar');
}
async function alCambiarCuenta(u) {
  $('#cuenta-fuera').hidden = !!u;
  $('#cuenta-dentro').hidden = !u;
  if (u) {
    $('#c-nombre').textContent = u.nombre || u.correo;
    if (document.activeElement !== $('#c-apodo')) $('#c-apodo').value = almacen.leer('guagua:firma', '') || primerNombre(u.nombre);
    $('#c-correo').textContent = u.nombre ? '(' + u.correo + ')' : '';
    // lo que estaba guardado solo en este navegador sube a la cuenta, una sola vez
    const clave = 'guagua:subidas:' + u.uid;
    const subidas = new Set(almacen.leer(clave, []));
    const pendientes = vitrina().filter((x) => !subidas.has(x.id));
    for (const item of pendientes) {
      try { await nube.guardar(item); subidas.add(item.id); } catch (e) { break; }
    }
    almacen.poner(clave, [...subidas]);
    if (pendientes.length) avisa('Tus guaguas de este navegador ya están en tu cuenta.', 'ok');
  }
  pintarVitrina();
}
function montarCuenta() {
  const error = (e) => { $('#c-error').textContent = typeof e === 'string' ? e : nube.explicar(e); };
  const ocupado = (si) => $$('#d-cuenta button, #d-cuenta input').forEach((x) => { x.disabled = si; });
  const intentar = async (fn) => {
    error('');
    ocupado(true);
    try { await fn(); } catch (e) { error(e); } finally { ocupado(false); }
  };
  const ponerModo = (m) => {
    modoCuenta = m;
    $('#c-campo-nombre').hidden = m !== 'crear';
    $('#c-enviar').textContent = m === 'crear' ? 'Crear la cuenta' : 'Entrar';
    $('#c-cambiar').textContent = m === 'crear' ? 'Ya tengo cuenta' : 'Crear una cuenta';
    $('#c-clave').autocomplete = m === 'crear' ? 'new-password' : 'current-password';
    error('');
  };
  $('#c-cambiar').addEventListener('click', () => ponerModo(modoCuenta === 'crear' ? 'entrar' : 'crear'));
  // con Google, la primera vez se queda abierta para elegir cómo firmar (viene el nombre completo)
  $('#c-google').addEventListener('click', () => intentar(async () => {
    await nube.entrarConGoogle();
    if (almacen.leer('guagua:firma', '')) { $('#d-cuenta').close(); avisa('Listo, entraste con Google.', 'ok'); return; }
    avisa('Listo, entraste. Elige cómo firmas tus guaguas.', 'ok');
    setTimeout(() => { $('#c-apodo').focus(); $('#c-apodo').select(); }, 50);
  }));
  $('#c-apodo-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const apodo = limpiar($('#c-apodo').value, 24);
    if (!apodo) { $('#c-apodo').focus(); return; }
    almacen.poner('guagua:firma', apodo);
    intentar(async () => {
      await nube.cambiarNombre(apodo);
      $('#d-cuenta').close();
      avisa('Listo: firmas como ' + apodo + '.', 'ok');
    });
  });
  $('#c-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const correo = $('#c-correo-in').value.trim(), clave = $('#c-clave').value;
    intentar(async () => {
      if (modoCuenta === 'crear') {
        const apodo = limpiar($('#c-nombre-in').value, 24);
        if (apodo) almacen.poner('guagua:firma', apodo);
        await nube.crearCuenta(correo, clave, apodo);
      }
      else await nube.entrarConCorreo(correo, clave);
      $('#c-clave').value = '';
      $('#d-cuenta').close();
      avisa(modoCuenta === 'crear' ? 'Tu cuenta está lista.' : 'Listo, entraste.', 'ok');
    });
  });
  $('#c-olvido').addEventListener('click', () => {
    $('#c-recuperar-correo').value = $('#c-correo-in').value.trim();
    vistaCuenta('recuperar');
    $('#c-recuperar-correo').focus();
  });
  $('#c-volver').addEventListener('click', () => vistaCuenta('entrar'));
  $('#c-recuperar-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const correo = $('#c-recuperar-correo').value.trim();
    const err = $('#c-recuperar-error');
    err.textContent = '';
    if (!correo) { err.textContent = 'Escribe el correo de tu cuenta.'; return; }
    ocupado(true);
    try {
      await nube.recuperarClave(correo);
      vistaCuenta('entrar');
      avisa('Te enviamos un enlace a ' + correo + '.', 'ok');
    } catch (e) {
      err.textContent = nube.explicar(e);
    } finally { ocupado(false); }
  });
  $('#c-salir').addEventListener('click', () => intentar(async () => {
    await nube.salir();
    $('#d-cuenta').close();
    avisa('Saliste de tu cuenta. Tu canasta de este navegador sigue aquí.', 'ok');
  }));
  ponerModo('entrar');
  pintarCuentaBarra();
}

window.guagua = {
  tarjeta, foto, codificar, decodificar, veredicto, receta, estado, MOLDES, sorpresa: () => sorpresa(estado, taller),
  enCanasta, fondoVivo,      // para armar la portada del sitio (og.jpg) con la misma escena de las tarjetas
  irA, prenderHorno, sacarDelHorno, aDecorar, get taller() { return taller; },
};
arrancar();
