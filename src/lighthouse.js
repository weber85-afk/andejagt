import * as THREE from 'three';
import { box, glow } from './models.js';

// Fyrtårnet ved Havet: gå op i toppen (E) og se ud over havet. Om natten drejer lyset rundt.
export function createLighthouse(game) {
  const { config, scene, input, hud, player } = game;
  const sc = config.sea.center;
  const pos = new THREE.Vector3(sc.x + config.sea.lighthouse.x, 0, sc.z + config.sea.lighthouse.z);
  pos.y = game.groundHeight(pos.x, pos.z);
  const height = 16;

  const tower = new THREE.Group();
  tower.position.copy(pos);
  const rings = 8;
  for (let i = 0; i < rings; i++) {
    const w = 3.2 - i * 0.18;
    tower.add(box(w, height / rings, w, i % 2 ? 0xd8323c : 0xf2f2f2, 0, (i + 0.5) * (height / rings), 0));
  }
  tower.add(
    box(3.4, 0.2, 3.4, 0x333333, 0, height, 0),                // platform
    box(3.4, 0.6, 0.08, 0x333333, 0, height + 0.4, 1.66),
    box(3.4, 0.6, 0.08, 0x333333, 0, height + 0.4, -1.66),
    box(0.08, 0.6, 3.4, 0x333333, 1.66, height + 0.4, 0),
    box(0.08, 0.6, 3.4, 0x333333, -1.66, height + 0.4, 0),
    box(1.4, 1.6, 1.4, 0x8ad8ff, 0, height + 1.0, 0),          // lygtehus
    box(1.8, 0.4, 1.8, 0xd8323c, 0, height + 2.0, 0),
    box(0.9, 1.6, 0.1, 0x5a3a1e, 0, 0.8, 1.6),                 // dør
  );
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), glow(0xfff2c0, 1));
  lamp.position.y = height + 1;
  tower.add(lamp);
  const beam = new THREE.SpotLight(0xfff2c0, 0, 140, 0.18, 0.4, 0.6);
  beam.position.set(0, height + 1, 0);
  const beamTarget = new THREE.Object3D();
  beamTarget.position.set(30, height - 3, 0);
  tower.add(beam, beamTarget);
  beam.target = beamTarget;
  scene.add(tower);
  game.colliders.push({ x: pos.x, z: pos.z, r: 1.9 });

  const door = new THREE.Vector3(pos.x, 0, pos.z + 2.6);
  const top = {
    speed: 2,
    seatHeight: pos.y + height + 0.1,
    constrain(p) {
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 1.45) {
        p.x = pos.x + (dx / d) * 1.45;
        p.z = pos.z + (dz / d) * 1.45;
      } else if (d < 1.0 && d > 0.001) {
        // Lygtehuset i midten kan man ikke gå ind i
        p.x = pos.x + (dx / d) * 1.0;
        p.z = pos.z + (dz / d) * 1.0;
      }
    },
  };

  return {
    get isOnTop() { return player.vehicle === top; },

    update(dt) {
      if (game.area.id !== 'sea') return;
      const dark = 1 - game.dayNight.light;
      beam.intensity = 400 * dark;
      lamp.material.color.setRGB(1, 0.95, 0.75).multiplyScalar(1 + dark * 3);
      const a = game.time * 0.8;
      beamTarget.position.set(Math.cos(a) * 30, height - 4, Math.sin(a) * 30);

      if (player.vehicle === top) {
        hud.setPrompt('🗼 Flot udsigt! Tryk <b>E</b> for at gå ned');
        if (input.consume('KeyE')) {
          player.setVehicle(null);
          player.teleport(door.x, door.z + 0.5);
        }
      } else if (!player.vehicle && game.isPlayerNear(door, 1.8)) {
        hud.setPrompt('Tryk <b>E</b> for at gå op i fyrtårnet 🗼');
        if (input.consume('KeyE')) {
          player.teleport(pos.x, pos.z + 1.2);   // ude på platformen, ikke inde i lygtehuset
          player.setVehicle(top);
          game.message('🗼 Du er i toppen af fyrtårnet!');
        }
      }
    },
  };
}
