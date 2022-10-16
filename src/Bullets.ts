export { FreezeBullet, Laser };

import { constants } from './constants';

// Bullet code
//

abstract class Bullet extends Phaser.Physics.Arcade.Sprite {
  velX: number;
  velY: number;
  abstract speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)

    this.velX = 0;
    this.velY = 0;
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
      this.disableBody(true, true);
    }
  }
}

class FreezeBullet extends Bullet {
  speed = Phaser.Math.GetSpeed(constants.freezeSpeed, 1);
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)

    Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeBullet');
  }

  fire(x: number, y: number, angle: number) {
    this.setCircle(8);
    super.fire(x, y, angle);
    this.scene.sound.play('freezeshot', { volume: 0.75 });
    this.play('freezeIdle');
  }

  explode() {
    this.disableBody();
    // Feels like an event listener would be best for this, but it keeps triggering after the animation completes.
    // this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    //     this.setActive(false);
    //     this.setVisible(false);
    // })
    this.scene.time.addEvent({
      delay: 300,
      callback: () => {
        this.setActive(false);
        this.setVisible(false);
      },
    });
    this.velX = 0;
    this.velY = 0;
    this.play('freezeExplode');
  }
}

class Laser extends Bullet {
  speed = Phaser.Math.GetSpeed(constants.laserSpeed, 1);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)

    this.play('laser');
  }

  fire(x: number, y: number, angle: number) {
    super.fire(x, y, angle);
    this.scene.sound.play('laser', { volume: 0.5 });
    // Need to do lots of adjustments of the bounding box because arcade physics and
    // rotated rectangles don't get along. Only the leading tip of the laser will
    // trigger a collision.
    this.setCircle(10);
    const yOffset = 55 * Math.sin(angle);
    const xOffset = 55 + 55 * Math.cos(angle);
    this.setOffset(xOffset, yOffset);
  }
}
