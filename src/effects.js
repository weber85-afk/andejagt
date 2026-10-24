import * as THREE from 'three';
import { material } from './models.js';

// Små partikler: fjer, røg, gnister og vandsprøjt.
export function createEffects(game) {
  const particles = [];
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  function burst(position, {
    count = 10,
    colors = [0xffffff],
    size = 0.15,
    speed = 3,
    up = 2,
    gravity = 6,
    life = 1.2,
    spread = 0.2,
    fade = false,   // gennemsigtig og forsvinder langsomt (til røg)
  } = {}) {
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const mat = fade ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }) : material(color);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * spread;
      mesh.position.y += (Math.random() - 0.5) * spread;
      mesh.position.z += (Math.random() - 0.5) * spread;
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      game.scene.add(mesh);
      particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          up + Math.random() * speed * 0.5,
          (Math.random() - 0.5) * speed,
        ),
        spin: (Math.random() - 0.5) * 8,
        gravity,
        life,
        maxLife: life,
        startScale: mesh.scale.x,
        fade,
      });
    }
  }

  return {
    burst,

    feathers(position) {
      burst(position, { count: 16, colors: [0xffffff, 0x8a5a2b, 0x2e7d32], size: 0.18, speed: 4, up: 1, gravity: 1.5, life: 1.8, spread: 0.5 });
    },

    smoke(position, dark = false) {
      burst(position, { count: 1, colors: [dark ? 0x333333 : 0xbbbbbb], size: 0.3, speed: 0.4, up: 0.9, gravity: 0, life: 2.2, fade: true });
    },

    sparks(position) {
      burst(position, { count: 1, colors: [0xffc400, 0xff7a00], size: 0.07, speed: 0.8, up: 2.5, gravity: 1, life: 0.9 });
    },

    splash(position) {
      burst(position, { count: 14, colors: [0xbfe9ff, 0xffffff], size: 0.14, speed: 3, up: 3, gravity: 12, life: 0.8, spread: 0.4 });
    },

    update(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          game.scene.remove(p.mesh);
          if (p.fade) p.mesh.material.dispose();
          particles.splice(i, 1);
          continue;
        }
        p.velocity.y -= p.gravity * dt;
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.rotation.x += p.spin * dt;
        p.mesh.rotation.y += p.spin * dt;
        const left = p.life / p.maxLife;
        if (p.fade) {
          p.mesh.scale.setScalar(p.startScale * (1 + (1 - left) * 2));
          p.mesh.material.opacity = 0.55 * left;
        } else {
          p.mesh.scale.setScalar(p.startScale * left);
        }
      }
    },
  };
}
