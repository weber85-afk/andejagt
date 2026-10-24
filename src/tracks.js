import * as THREE from 'three';

// Spor på jorden efter store dyr (hjort, vildsvin, bjørn). De gamle forsvinder, når der kommer nye.
export function createTracks(game) {
  const max = 400;
  const geometry = new THREE.BoxGeometry(0.14, 0.02, 0.2);
  const material = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.count = 0;
  mesh.frustumCulled = false;
  game.scene.add(mesh);
  let next = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const size = { deer: 1, boar: 1.1, bear: 1.8 };

  return {
    add(x, z, heading, type) {
      const s = size[type] ?? 1;
      for (const side of [-1, 1]) {
        const px = x + Math.cos(heading) * 0.12 * side * s;
        const pz = z - Math.sin(heading) * 0.12 * side * s;
        q.setFromAxisAngle(up, heading);
        m.compose(new THREE.Vector3(px, game.groundHeight(px, pz) + 0.03, pz), q, new THREE.Vector3(s, 1, s));
        mesh.setMatrixAt(next, m);
        next = (next + 1) % max;
        mesh.count = Math.max(mesh.count, next === 0 ? max : next);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
