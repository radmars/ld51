export { FreezeBullet, Laser };

import { particleManager } from './scenes/Main';
import { constants } from './constants';

// Bullet code
//

abstract class Bullet extends Phaser.Physics.Arcade.Sprite {
  velX: number;
  velY: number;
  readonly speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, speedVal: number) {
    super(scene, x, y, texture);

    this.velX = 0;
    this.velY = 0;
    this.speed = Phaser.Math.GetSpeed(speedVal, 1);
  }

  fire(x: number, y: number, angle: number) {
    this.enableBody(true, x, y, true, true)
    this.setActive(true);
    this.setVisible(true);

    this.setRotation(angle);
    this.velX = this.speed * Math.sin(this.rotation);
    this.velY = this.speed * Math.cos(this.rotation);
  }

  update(time: number, delta: number) {
    super.update(time, delta);

    this.x += delta * this.velY;
    this.y += delta * this.velX;

    if (this.y < 0 || this.y > constants.height || this.x < 0 || this.x > constants.width) {
      this.kill();
    }
  }

  kill() {
    this.disableBody(true, true);
  }
}

class FreezeBullet extends Bullet {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'freezeBullet', constants.freezeSpeed);

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'freezeExplode', () => {
      this.kill();
  });
}

  fire(x: number, y: number, angle: number) {
    this.setCircle(8);
    super.fire(x, y, angle);
    this.scene.sound.play('freezeshot', { volume: 0.75 });
    this.play('freezeIdle');
  }

  explode() {
    this.disableBody();
    this.velX = 0;
    this.velY = 0;
    this.play('freezeExplode');
  }
}

class Laser extends Bullet {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'laser', constants.laserSpeed);

    this.emitter = particleManager.createEmitter({
      speed: [50, 200],
      lifespan: 1000,
      alpha: [1, 0],
      scale: { start: 0.5, end: 0 },
      blendMode: 'SCREEN',
    });
    this.emitter.startFollow(this);
  }

  fire(x: number, y: number, angle: number) {
    super.fire(x, y, angle);
    this.scene.sound.play('laser', { volume: 0.5 });
    this.emitter.start();
    // Need to do lots of adjustments of the bounding box because arcade physics and
    // rotated rectangles don't get along. Only the leading tip of the laser will
    // trigger a collision.
    this.setCircle(10);
    const yOffset = 55 * Math.sin(angle);
    const xOffset = 55 + 55 * Math.cos(angle);
    this.setOffset(xOffset, yOffset);
  }

  kill() {
    this.emitter.stop();
    super.kill();
  }
}
