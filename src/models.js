import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { texture } from './textures.js';

// Små hjælpere til at bygge blokkede figurer af kasser.

const materials = new Map();
// Materiale med farve og et pixel-mønster ('grain', 'planks', 'bark', 'leaves', 'stone', 'birch' ...)
export function material(color, pattern = 'grain') {
  const key = `${color}-${pattern}`;
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshLambertMaterial({ color, map: pattern ? texture(pattern) : null }));
  }
  return materials.get(key);
}

// Alle materialer med et bestemt mønster (bruges af årstiderne til at farve bladene)
export function materialsWithPattern(pattern) {
  return [...materials.entries()].filter(([key]) => key.endsWith(`-${pattern}`)).map(([key, m]) => ({ color: Number(key.split('-')[0]), material: m }));
}

// Laver en kasse: box(bredde, højde, dybde, farve, x, y, z, mønster)
export function box(w, h, d, color, x = 0, y = 0, z = 0, pattern) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, pattern));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Et materiale der lyser og gløder (bål, lamper, ildfluer). strength > 1 giver glød.
export function glow(color, strength = 2.5) {
  const m = new THREE.MeshBasicMaterial({ color });
  m.color.multiplyScalar(strength);
  return m;
}

// Samler mange ting der står stille (træer, sten, buske) i få store figurer,
// så computeren skal tegne meget færre ting. batch.add(gruppe) ... batch.build(scene)
export function createBatch() {
  const groups = new Map();   // materiale -> liste af figurer
  return {
    add(object) {
      object.updateMatrixWorld(true);
      object.traverse((m) => {
        if (!m.isMesh) return;
        if (!groups.has(m.material)) groups.set(m.material, []);
        groups.get(m.material).push(m.geometry.clone().applyMatrix4(m.matrixWorld));
      });
    },
    build(scene, { castShadow = true } = {}) {
      for (const [mat, geometries] of groups) {
        const mesh = new THREE.Mesh(mergeGeometries(geometries), mat);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
      groups.clear();
    },
  };
}

// En gruppe der kan rotere om et bestemt punkt (fx en arm om skulderen)
export function pivot(x, y, z, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(...children);
  return g;
}

// Et skilt med tekst på begge sider: textSign(['Linje 1', 'Linje 2'])
export function textSign(lines, { width = 2, height = 0.7, bg = '#7a4b25', color = '#fff8e8' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * height) / width);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  const list = Array.isArray(lines) ? lines : [lines];
  let size = Math.min(canvas.height / (list.length + 0.6), 110);
  const font = () => `bold ${size}px "Trebuchet MS", sans-serif`;
  ctx.font = font();
  while (size > 10 && list.some((l) => ctx.measureText(l).width > canvas.width - 50)) {
    size -= 4;
    ctx.font = font();
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  list.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - (list.length - 1) / 2) * size * 1.1);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({ map: texture });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  front.position.z = 0.035;
  const back = front.clone();
  back.position.z = -0.035;
  back.rotation.y = Math.PI;

  const sign = new THREE.Group();
  sign.add(box(width + 0.12, height + 0.12, 0.06, 0x5a3a1e), front, back);
  return sign;
}

// Et skilt på en pæl
export function signPost(lines, options) {
  const g = new THREE.Group();
  g.add(box(0.14, 1.9, 0.14, 0x6b4423, 0, 0.95, 0));
  const sign = textSign(lines, options);
  sign.position.y = 1.9 + ((options?.height ?? 0.7) / 2) - 0.2;
  g.add(sign);
  return g;
}

// Tilfældige tal der er de samme hver gang (så verden ser ens ud hver gang)
export function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
