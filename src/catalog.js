import * as THREE from 'three';
import { box } from './models.js';
import { makeDuckModel } from './ducks.js';

// Figurer af vildt der ligger stille: i bunken ved bålet, eller når hundene bærer det.
// makeCarcass('pheasant') giver en fasan, der ligger på siden.
export function makeCarcass(type) {
  if (type === 'duck') {
    const { mesh, feet, wingL, wingR } = makeDuckModel();
    feet.visible = true;
    wingL.rotation.z = 0.3;
    wingR.rotation.z = -0.3;
    mesh.rotation.z = Math.PI;
    return mesh;
  }
  const g = new THREE.Group();
  if (type === 'pheasant') {
    g.add(
      box(0.4, 0.35, 0.65, 0xa0522d),
      box(0.22, 0.22, 0.22, 0x2e7d32, 0, 0.15, 0.4),
      box(0.12, 0.1, 0.06, 0xd8323c, 0, 0.12, 0.52),
      box(0.08, 0.06, 0.7, 0x7a4b25, 0, 0.08, -0.6),
    );
  } else if (type === 'goose') {
    g.add(
      box(0.6, 0.48, 0.95, 0x9a9a9a),
      box(0.15, 0.15, 0.5, 0x222222, 0, 0.15, 0.65),
      box(0.22, 0.2, 0.25, 0x222222, 0, 0.18, 0.95),
      box(0.23, 0.1, 0.12, 0xffffff, 0, 0.14, 0.92),
    );
  } else if (type === 'hare') {
    g.add(
      box(0.4, 0.38, 0.7, 0x9b7a55),
      box(0.28, 0.28, 0.3, 0x9b7a55, 0, 0.1, 0.42),
      box(0.08, 0.35, 0.12, 0x8a6a45, -0.08, 0.38, 0.38),
      box(0.08, 0.35, 0.12, 0x8a6a45, 0.08, 0.38, 0.38),
      box(0.14, 0.14, 0.12, 0xffffff, 0, 0.05, -0.38),
    );
  } else if (type === 'fish') {
    g.add(
      box(0.16, 0.28, 0.65, 0x9fb8c8),
      box(0.04, 0.3, 0.2, 0x7f98a8, 0, 0, -0.4),
      box(0.17, 0.08, 0.3, 0x5f7888, 0, 0.17, 0),
    );
  } else {
    // Bjørnekød på et ben
    g.add(box(0.7, 0.45, 0.5, 0xb5473a), box(0.15, 0.15, 0.5, 0xf2ead2, 0, 0, 0.45), box(0.25, 0.22, 0.12, 0xf2ead2, 0, 0, 0.72));
  }
  g.rotation.z = Math.PI / 2;
  return g;
}
