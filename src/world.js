import * as THREE from 'three';
import { box, createBatch, seededRandom } from './models.js';
import { texture, flowerTexture } from './textures.js';
import { distanceToPath } from './areas.js';

// Verden: jord med bakker, vand, veje, træer, buske, sten, græs, blomster og skyer.
// Både lejren og Storskoven bygges her ud fra hvad der står om dem i areas.js og config.js.

// --- Træsorter ---
function oak(x, y, z, s, random) {
  const g = new THREE.Group();
  const trunkH = 2.6 * s;
  g.add(box(0.6 * s, trunkH, 0.6 * s, 0x7a4b25, 0, trunkH / 2, 0, 'bark'));
  const leaf = [0x2f8a3a, 0x3c9f45, 0x287a32][Math.floor(random() * 3)];
  g.add(box(2.6 * s, 1.6 * s, 2.6 * s, leaf, 0, trunkH + 0.5 * s, 0, 'leaves'));
  g.add(box(1.8 * s, 1.2 * s, 1.8 * s, leaf, 0, trunkH + 1.8 * s, 0, 'leaves'));
  g.add(box(0.9 * s, 0.8 * s, 0.9 * s, leaf, 0, trunkH + 2.7 * s, 0, 'leaves'));
  g.position.set(x, y, z);
  g.rotation.y = random() * Math.PI;
  return { group: g, radius: 0.55 * s };
}

function birch(x, y, z, s, random) {
  const g = new THREE.Group();
  const trunkH = 3.6 * s;
  g.add(box(0.4 * s, trunkH, 0.4 * s, 0xf2f0e6, 0, trunkH / 2, 0, 'birch'));
  const leaf = [0x7cc35a, 0x8fcf5f][Math.floor(random() * 2)];
  g.add(box(1.8 * s, 1.4 * s, 1.8 * s, leaf, 0, trunkH + 0.2 * s, 0, 'leaves'));
  g.add(box(1.2 * s, 1.1 * s, 1.2 * s, leaf, 0.2 * s, trunkH + 1.2 * s, 0.1 * s, 'leaves'));
  g.position.set(x, y, z);
  g.rotation.y = random() * Math.PI;
  return { group: g, radius: 0.4 * s };
}

function spruce(x, y, z, s, random) {
  const g = new THREE.Group();
  g.add(box(0.5 * s, 2 * s, 0.5 * s, 0x5a3a1e, 0, 1 * s, 0, 'bark'));
  const leaf = [0x1f5f3a, 0x24693f, 0x1a5233][Math.floor(random() * 3)];
  const layers = [3.2, 2.6, 2.0, 1.4, 0.8];
  layers.forEach((w, i) => g.add(box(w * s, 1.2 * s, w * s, leaf, 0, (1.8 + i * 1.1) * s, 0, 'leaves')));
  g.add(box(0.3 * s, 0.8 * s, 0.3 * s, leaf, 0, (1.8 + layers.length * 1.1) * s, 0, 'leaves'));
  g.position.set(x, y, z);
  g.rotation.y = random() * Math.PI;
  return { group: g, radius: 0.5 * s };
}

const TREES = { oak, birch, spruce };

export function createWorld(game) {
  const { scene, config } = game;
  const water = [];   // vandflader der skal bølge
  const decorations = [];   // græs og blomster (skjules med hurtig grafik og om vinteren)
  const grounds = [];       // jorden i hvert område (bliver hvid om vinteren)
  let lowQuality = false;
  const clouds = new THREE.Group();

  scene.background = new THREE.Color(config.world.skyColor);
  scene.fog = new THREE.Fog(config.world.skyColor, 45, 130);

  // --- Lys ---
  const hemi = new THREE.HemisphereLight(0xdff3ff, 0x5a7a3a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const sunDirection = new THREE.Vector3(0.6, 1, 0.4).normalize();

  // --- Ét område ---
  function buildArea(area, options) {
    const random = seededRandom(area.id === 'home' ? 42 : 99);
    const c = area.center;
    const half = area.size / 2;
    const batch = createBatch();
    const colliders = [];

    // Jorden: et net af punkter, hvor højden kommer fra groundHeight
    const groundSize = area.size + 140;
    const segments = Math.round(groundSize / 2);
    const geo = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const col = new THREE.Color();
    const [grassA, grassB] = options.grass.map((g) => new THREE.Color(g));
    const sand = new THREE.Color(0xe6d49a);
    const highland = new THREE.Color(options.highland);
    const snow = new THREE.Color(0xf4f7fb);
    const rock = new THREE.Color(0x8a8a86);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + c.x;
      const z = pos.getZ(i) + c.z;
      const h = game.groundHeight(x, z);
      pos.setY(i, h);
      col.copy(grassA).lerp(grassB, random());
      col.lerp(highland, Math.max(0, Math.min(1, h / (area.hills * 2 + 0.01))) * 0.5);
      const wd = game.waterDistance(x, z);
      if (wd < (options.beach ?? 2.2)) col.copy(sand);
      if (options.snowLine) {
        if (h > options.snowLine) col.copy(snow).lerp(rock, random() * 0.15);
        else if (h > options.snowLine - 2.5) col.lerp(rock, 0.6);
      }
      colors.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const groundTexture = texture('grass', { repeat: true });
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * groundSize / 3, uv.getY(i) * groundSize / 3);
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: groundTexture }));
    ground.position.set(c.x, 0, c.z);
    ground.receiveShadow = true;
    scene.add(ground);
    grounds.push(ground);

    // Vand
    for (const w of area.water) {
      let wg;
      if (w.type === 'lake') {
        wg = new THREE.RingGeometry(0.01, w.r + 0.6, 48, 10).rotateX(-Math.PI / 2);
        wg.translate(w.x, 0, w.z);
      } else if (w.type === 'sea') {
        // Havet går helt ud til horisonten
        const width = area.size + 200;
        const depth = 260;
        wg = new THREE.PlaneGeometry(width, depth, 70, 50).rotateX(-Math.PI / 2);
        wg.translate(c.x, 0, w.shore - 12 + depth / 2);
      } else {
        wg = stripGeometry(w.points, w.width + 1.2, 2, 3, () => 0);
      }
      const mesh = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({
        color: w.type === 'sea' ? 0x1f6fb8 : 0x2f8fd6, specular: 0xbfe6ff, shininess: 80, flatShading: true, transparent: true, opacity: 0.86,
      }));
      mesh.userData.waves = w.type === 'sea' ? 0.12 : 0.035;
      mesh.userData.area = area.id;
      mesh.position.y = game.waterLevel;
      mesh.receiveShadow = true;
      mesh.userData.base = wg.attributes.position.array.slice();
      scene.add(mesh);
      water.push(mesh);
    }

    // Grusvej
    const road = new THREE.Mesh(
      stripGeometry(area.road, 5, 1.5, 4, (x, z) => game.groundHeight(x, z) + 0.06),
      new THREE.MeshLambertMaterial({ color: 0xb59a6a, map: texture('stone'), polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    road.receiveShadow = true;
    scene.add(road);

    function isFree(x, z, spacing = 3) {
      if (game.waterDistance(x, z) < 3) return false;
      if (options.snowLine && game.groundHeight(x, z) > options.snowLine - 1) return false;   // ingen træer i sneen
      if (area.flat.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 1)) return false;
      if (distanceToPath(area.road, x, z) < 5) return false;
      return colliders.every((o) => Math.hypot(x - o.x, z - o.z) > spacing);
    }

    function randomSpot(spacing, margin = 4) {
      for (let tries = 0; tries < 60; tries++) {
        const x = c.x + (random() - 0.5) * (area.size - margin * 2);
        const z = c.z + (random() - 0.5) * (area.size - margin * 2);
        if (isFree(x, z, spacing)) return { x, z };
      }
      return null;
    }

    function plantTree(kind, x, z, s) {
      const { group, radius } = TREES[kind](x, game.groundHeight(x, z) - 0.1, z, s, random);
      batch.add(group);
      colliders.push({ x, z, r: radius });
    }

    const pickKind = () => {
      const r = random();
      let sum = 0;
      for (const [kind, share] of Object.entries(options.treeMix)) {
        sum += share;
        if (r < sum) return kind;
      }
      return 'oak';
    };

    for (let i = 0; i < options.trees; i++) {
      const spot = randomSpot(options.treeSpacing);
      if (spot) plantTree(pickKind(), spot.x, spot.z, 0.8 + random() * 0.6);
    }

    // En tæt skov hele vejen rundt om kanten (med hul til vejen)
    for (let side = 0; side < 4; side++) {
      for (let t = -half; t < half; t += 3.5) {
        const inward = half + 2 + random() * 6;
        const along = t + random() * 2;
        const [dx, dz] = [[along, -inward], [along, inward], [-inward, along], [inward, along]][side];
        const x = c.x + dx;
        const z = c.z + dz;
        if (distanceToPath(area.road, x, z) < 6) continue;
        plantTree(random() < 0.6 ? options.edgeTree : pickKind(), x, z, 1 + random() * 0.6);
      }
    }

    // Buske og sten
    for (let i = 0; i < options.bushes; i++) {
      const spot = randomSpot(2.5);
      if (!spot) continue;
      const g = new THREE.Group();
      g.add(box(1.2, 0.8, 1.1, 0x3d9440, 0, 0.4, 0, 'leaves'));
      g.add(box(0.8, 0.6, 0.8, 0x4caa4c, 0.4, 0.7, 0.2, 'leaves'));
      if (random() < 0.4) g.add(box(0.15, 0.15, 0.15, 0xd8323c, 0.3, 0.85, 0.55));
      g.position.set(spot.x, game.groundHeight(spot.x, spot.z) - 0.05, spot.z);
      g.rotation.y = random() * Math.PI;
      batch.add(g);
    }
    for (let i = 0; i < options.rocks; i++) {
      const spot = randomSpot(3);
      if (!spot) continue;
      const s = 0.5 + random() * 0.9;
      const rock = box(s * 1.3, s * 0.8, s, 0x8d8d8d, spot.x, game.groundHeight(spot.x, spot.z) + s * 0.3, spot.z, 'stone');
      rock.rotation.y = random() * Math.PI;
      batch.add(rock);
      colliders.push({ x: spot.x, z: spot.z, r: s * 0.6 });
    }
    // Svampe (kun i Storskoven)
    for (let i = 0; i < (options.mushrooms ?? 0); i++) {
      const spot = randomSpot(1);
      if (!spot) continue;
      const g = new THREE.Group();
      const s = 0.6 + random() * 0.6;
      g.add(box(0.12 * s, 0.25 * s, 0.12 * s, 0xf2ead2, 0, 0.12 * s, 0), box(0.38 * s, 0.14 * s, 0.38 * s, 0xd8323c, 0, 0.3 * s, 0));
      g.add(box(0.06 * s, 0.03, 0.06 * s, 0xffffff, 0.08 * s, 0.38 * s, 0.05 * s));
      g.position.set(spot.x, game.groundHeight(spot.x, spot.z), spot.z);
      batch.add(g);
    }

    batch.build(scene);
    game.colliders.push(...colliders);

    // Græstotter og blomster (mange små figurer tegnet på én gang)
    scatter(options.grassTufts, crossGeometry(0.7), new THREE.MeshLambertMaterial({
      map: texture('blades', { alpha: true }), alphaTest: 0.5, side: THREE.DoubleSide,
    }), options.tufts, 0.6, 1.3, 'tuft');
    const perColor = Math.round(options.flowers / 4);
    for (const color of ['#e84a5f', '#ffd23a', '#f2f2f2', '#8a6fe8']) {
      scatter(perColor, crossGeometry(0.45), new THREE.MeshLambertMaterial({
        map: flowerTexture(color), alphaTest: 0.5, side: THREE.DoubleSide,
      }), [0xffffff], 0.8, 1.2, 'flower');
    }

    function scatter(count, geometry, mat, tints, minScale, maxScale, kind) {
      const mesh = new THREE.InstancedMesh(geometry, mat, count);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const tint = new THREE.Color();
      let n = 0;
      for (let i = 0; i < count * 3 && n < count; i++) {
        const x = c.x + (random() - 0.5) * area.size;
        const z = c.z + (random() - 0.5) * area.size;
        if (game.waterDistance(x, z) < 1.5 || distanceToPath(area.road, x, z) < 3) continue;
        const s = minScale + random() * (maxScale - minScale);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI);
        m.compose(new THREE.Vector3(x, game.groundHeight(x, z), z), q, new THREE.Vector3(s, s, s));
        mesh.setMatrixAt(n, m);
        mesh.setColorAt(n, tint.set(tints[n % tints.length]));
        n++;
      }
      mesh.count = n;
      mesh.receiveShadow = true;
      mesh.userData.kind = kind;
      scene.add(mesh);
      decorations.push(mesh);
    }
  }

  // Et bånd langs en sti (vej eller å). height(x, z) giver højden for hvert punkt.
  function stripGeometry(points, width, step, across, height) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.z)));
    const samples = Math.max(2, Math.round(curve.getLength() / step));
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      for (let j = 0; j <= across; j++) {
        const o = (j / across - 0.5) * width;
        const x = p.x + side.x * o;
        const z = p.z + side.z * o;
        positions.push(x, height(x, z), z);
        uvs.push(j / across * width / 3, t * samples * step / 3);
      }
    }
    for (let i = 0; i < samples; i++) {
      for (let j = 0; j < across; j++) {
        const a = i * (across + 1) + j;
        const b = a + across + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function crossGeometry(size) {
    const a = new THREE.PlaneGeometry(size, size).translate(0, size / 2, 0);
    const b = a.clone().rotateY(Math.PI / 2);
    const merged = new THREE.BufferGeometry();
    const pa = a.attributes.position.array;
    const pb = b.attributes.position.array;
    merged.setAttribute('position', new THREE.Float32BufferAttribute([...pa, ...pb], 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute([...a.attributes.normal.array, ...b.attributes.normal.array].map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute([...a.attributes.uv.array, ...b.attributes.uv.array], 2));
    merged.setIndex([...a.index.array, ...[...b.index.array].map((i) => i + 4)]);
    return merged;
  }

  buildArea(game.areas.home, {
    grass: [0x6abf4b, 0x58a83f],
    highland: 0x9ccf5a,
    tufts: [0x8fd86a, 0x9fe27a, 0x7cc85a],
    trees: config.world.trees,
    treeSpacing: 3,
    treeMix: { oak: 0.65, birch: 0.35 },
    edgeTree: 'oak',
    bushes: config.world.bushes,
    rocks: 14,
    grassTufts: config.world.grassTufts,
    flowers: config.world.flowers,
  });

  buildArea(game.areas.forest, {
    grass: [0x4a8f3a, 0x41823a],
    highland: 0x6f9a3a,
    tufts: [0x6fb85a, 0x7cc35a, 0x5fa84a],
    trees: config.forest.trees,
    treeSpacing: 2.6,
    treeMix: { spruce: 0.6, oak: 0.25, birch: 0.15 },
    edgeTree: 'spruce',
    bushes: 60,
    rocks: 40,
    grassTufts: config.forest.grassTufts,
    flowers: config.forest.flowers,
    mushrooms: config.forest.mushrooms,
  });

  buildArea(game.areas.mountain, {
    grass: [0x6a9a4a, 0x5a8a42],
    highland: 0x8a9a6a,
    snowLine: config.mountain.snowLine,
    tufts: [0x8fb86a, 0x9fc27a],
    trees: config.mountain.trees,
    treeSpacing: 3,
    treeMix: { spruce: 0.9, birch: 0.1 },
    edgeTree: 'spruce',
    bushes: 8,
    rocks: 120,
    grassTufts: config.mountain.grassTufts,
    flowers: config.mountain.flowers,
  });

  buildArea(game.areas.sea, {
    grass: [0x7ac25a, 0x6ab24a],
    highland: 0xa8d26a,
    beach: 9,
    tufts: [0x9fd87a, 0xafe28a],
    trees: config.sea.trees,
    treeSpacing: 3,
    treeMix: { oak: 0.5, birch: 0.5 },
    edgeTree: 'oak',
    bushes: 20,
    rocks: 25,
    grassTufts: config.sea.grassTufts,
    flowers: config.sea.flowers,
  });

  buildArea(game.areas.moor, {
    grass: [0x7a8a4a, 0x6a7a3a],
    highland: 0x8a9a5a,
    beach: 1.5,
    tufts: [0x9aaa5a, 0x8a9a4a, 0xaab86a],
    trees: config.moor.trees,
    treeSpacing: 4,
    treeMix: { birch: 0.7, spruce: 0.3 },
    edgeTree: 'birch',
    bushes: 40,
    rocks: 10,
    grassTufts: config.moor.grassTufts,
    flowers: config.moor.flowers,
  });

  // --- Skyer (følger med til det område man er i) ---
  const cloudRandom = seededRandom(7);
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const w = 6 + cloudRandom() * 8;
    g.add(box(w, 1.2, w * 0.6, 0xffffff, 0, 0, 0, null));
    g.add(box(w * 0.6, 1, w * 0.4, 0xffffff, w * 0.15, 0.8, 0, null));
    g.add(box(w * 0.4, 0.8, w * 0.3, 0xffffff, -w * 0.25, 0.5, 0.1, null));
    g.children.forEach((m) => { m.castShadow = false; });
    g.position.set((cloudRandom() - 0.5) * 240, 34 + cloudRandom() * 14, (cloudRandom() - 0.5) * 240);
    clouds.add(g);
  }
  scene.add(clouds);

  // Græs og blomster vises kun med flot grafik, og ikke når årstiden skjuler dem
  function refreshDecorations() {
    for (const m of decorations) m.visible = !lowQuality && !m.userData.seasonHidden;
  }

  return {
    sun,
    hemi,
    decorations,
    water,
    grounds,
    refreshDecorations,
    set lowQuality(v) {
      lowQuality = v;
      refreshDecorations();
    },
    // Retningen solen (eller månen) lyser fra. Sættes af dayNight.
    sunDirection,

    update(dt) {
      for (const cloud of clouds.children) {
        cloud.position.x += dt * 1.2;
        if (cloud.position.x > 120) cloud.position.x = -120;
      }
      const area = game.area;
      clouds.position.set(area.center.x, 0, area.center.z);

      // Solens skygger følger efter spilleren
      const p = game.player?.position;
      if (p) {
        sun.position.copy(p).addScaledVector(sunDirection, 70);
        sun.target.position.copy(p);
      }

      // Vandet bølger (kun i det område man er i, og ikke når det er frosset)
      for (const mesh of water) {
        if (mesh.userData.area !== area.id || mesh.userData.frozen) continue;
        const amp = mesh.userData.waves;
        const posAttr = mesh.geometry.attributes.position;
        const base = mesh.userData.base;
        for (let i = 0; i < posAttr.count; i++) {
          const x = base[i * 3];
          const z = base[i * 3 + 2];
          posAttr.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(x * 0.7 + game.time * 1.6) * amp + Math.cos(z * 0.6 + game.time * 1.3) * amp;
        }
        posAttr.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
    },
  };
}
