import * as THREE from 'three';
import { seededRandom } from './models.js';

// Små pixel-mønstre (16 x 16), som gør blokkene mere levende, lidt ligesom i Minecraft.
// Mønstrene er gråtoner, så farven på blokken stadig bestemmer farven.

const SIZE = 16;
const cache = new Map();

function makeTexture(name, draw, { repeat = false, alpha = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(name.length * 7919 + name.charCodeAt(0));
  const px = (x, y, v, a = 1) => {
    ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
    ctx.fillRect(x, y, 1, 1);
  };
  if (!alpha) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
  draw(px, random, ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const patterns = {
  // Lidt prikket overflade til alt
  grain: (px, r) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) px(x, y, 225 + Math.floor(r() * 31));
  },
  leaves: (px, r) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const v = r();
      px(x, y, v < 0.15 ? 150 : v < 0.5 ? 205 : 240 + Math.floor(r() * 15));
    }
  },
  bark: (px, r) => {
    for (let x = 0; x < SIZE; x++) {
      const base = x % 4 === 0 ? 170 : 220 + Math.floor(r() * 30);
      for (let y = 0; y < SIZE; y++) px(x, y, r() < 0.12 ? base - 40 : base);
    }
  },
  birch: (px, r) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) px(x, y, 240 + Math.floor(r() * 15));
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(r() * SIZE);
      const x = Math.floor(r() * 12);
      for (let k = 0; k < 3 + r() * 3; k++) px(x + k, y, 40);
    }
  },
  planks: (px, r) => {
    for (let y = 0; y < SIZE; y++) {
      const line = y % 4 === 3;
      const offset = Math.floor(y / 4) * 5;
      for (let x = 0; x < SIZE; x++) {
        const seam = (x + offset) % 16 === 0;
        px(x, y, line || seam ? 150 : 215 + Math.floor(r() * 30));
      }
    }
  },
  stone: (px, r) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const crack = (x + Math.floor(y / 5) * 3) % 7 === 0 || y % 5 === 4;
      px(x, y, crack ? 160 : 205 + Math.floor(r() * 45));
    }
  },
  grass: (px, r) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const v = r();
      px(x, y, v < 0.1 ? 212 : v < 0.4 ? 230 : 240 + Math.floor(r() * 15));
    }
  },
  // Græsstrå med gennemsigtig baggrund
  blades: (px, r) => {
    for (let i = 0; i < 7; i++) {
      const x = 1 + Math.floor(r() * 14);
      const h = 6 + Math.floor(r() * 10);
      for (let y = SIZE - 1; y > SIZE - h; y--) px(x + (y < SIZE - h / 2 && i % 2 ? 1 : 0), y, 200 + Math.floor(r() * 55));
    }
  },
};

// Hent et mønster: texture('planks')
export function texture(name, options) {
  const key = name + JSON.stringify(options ?? {});
  if (!cache.has(key)) cache.set(key, makeTexture(name, patterns[name], options));
  return cache.get(key);
}

// En lille blomst med farve (gennemsigtig baggrund)
export function flowerTexture(color) {
  const key = `flower-${color}`;
  if (!cache.has(key)) {
    cache.set(key, makeTexture(key, (px, r, ctx) => {
      for (let y = 7; y < SIZE; y++) px(7, y, 120);
      px(6, 11, 120);
      px(8, 13, 120);
      ctx.fillStyle = color;
      ctx.fillRect(5, 3, 5, 5);
      ctx.fillStyle = '#ffe14d';
      ctx.fillRect(7, 5, 1, 1);
    }, { alpha: true }));
  }
  return cache.get(key);
}
