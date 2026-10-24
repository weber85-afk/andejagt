import * as THREE from 'three';

// Liv i naturen: ildfluer om natten og sommerfugle om dagen, altid lige omkring spilleren.
export function createLife(game) {
  const { scene } = game;

  // --- Ildfluer ---
  const fireflyCount = 70;
  const flies = [];
  const flyPositions = new Float32Array(fireflyCount * 3);
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPositions, 3));
  const flyMat = new THREE.PointsMaterial({ size: 0.18, transparent: true, depthWrite: false, opacity: 0 });
  flyMat.color.setRGB(3, 3.2, 1);   // lyser, så de gløder
  const fireflies = new THREE.Points(flyGeo, flyMat);
  fireflies.frustumCulled = false;
  scene.add(fireflies);
  for (let i = 0; i < fireflyCount; i++) flies.push({ offset: Math.random() * 100, x: 0, z: 0, placed: false });

  // --- Sommerfugle ---
  const butterflies = [];
  const colors = [0xffb13a, 0xffffff, 0x6fb6ff, 0xff6fa8];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide });
    const left = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12).translate(-0.08, 0, 0), mat);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12).translate(0.08, 0, 0), mat);
    left.rotation.x = right.rotation.x = -Math.PI / 2;
    const wingL = new THREE.Group().add(left);
    const wingR = new THREE.Group().add(right);
    g.add(wingL, wingR);
    scene.add(g);
    butterflies.push({ g, wingL, wingR, home: new THREE.Vector3(), phase: Math.random() * 10, placed: false });
  }

  const around = (target, radius) => {
    const { player } = game;
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * radius;
    target.x = player.position.x + Math.cos(a) * r;
    target.z = player.position.z + Math.sin(a) * r;
  };

  return {
    update(dt) {
      const t = game.time;
      const dark = 1 - game.dayNight.light;
      const p = game.player.position;

      // Ildfluer svæver langsomt rundt og blinker
      const warm = game.seasons?.id === 'summer' || game.seasons?.id === 'spring';
      flyMat.opacity = warm ? Math.min(1, dark * 1.5) * (game.weather.isRaining ? 0.2 : 1) : 0;
      fireflies.visible = flyMat.opacity > 0.02;
      if (fireflies.visible) {
        flies.forEach((f, i) => {
          if (!f.placed || Math.hypot(f.x - p.x, f.z - p.z) > 28) {
            around(f, 24);
            f.placed = true;
          }
          const o = f.offset;
          f.x += Math.sin(t * 0.3 + o) * dt * 0.4;
          f.z += Math.cos(t * 0.25 + o) * dt * 0.4;
          const blink = Math.sin(t * 2 + o * 3) > -0.3 ? 1 : 0;
          flyPositions[i * 3] = f.x;
          flyPositions[i * 3 + 1] = game.groundHeight(f.x, f.z) + 0.6 + Math.sin(t * 0.8 + o) * 0.4 + (blink ? 0 : -50);
          flyPositions[i * 3 + 2] = f.z;
        });
        flyGeo.attributes.position.needsUpdate = true;
      }

      // Sommerfugle flagrer om dagen
      const day = game.dayNight.light > 0.6 && !game.weather.isRaining && warm;
      for (const b of butterflies) {
        b.g.visible = day;
        if (!day) continue;
        if (!b.placed || b.home.distanceTo(p) > 30) {
          around(b.home, 20);
          b.placed = true;
        }
        b.phase += dt;
        const x = b.home.x + Math.sin(b.phase * 0.7) * 2;
        const z = b.home.z + Math.cos(b.phase * 0.5) * 2;
        b.g.position.set(x, game.groundHeight(x, z) + 0.8 + Math.sin(b.phase * 2) * 0.3, z);
        b.g.rotation.y = b.phase * 0.7;
        const flap = Math.sin(b.phase * 20) * 1.1;
        b.wingL.rotation.z = flap;
        b.wingR.rotation.z = -flap;
      }
    },
  };
}
