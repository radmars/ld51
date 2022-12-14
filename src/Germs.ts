export { Germ, GermBlue, GermGreen, GermOrange, GermPink };

import { constants, center } from './constants';
import { StageVars } from './StageVars';
import { germPoolMap, gameOver } from './scenes/Main';

abstract class Germ extends Phaser.Physics.Arcade.Sprite {
    unfreezeTimer: Phaser.Time.TimerEvent | null = null;
    readyToReproduce = false;
    freezeLevel = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);
        this.unfreeze();
    }

    abstract color(): string

    die() {
        this.disableBody(true, true);
        this.setActive(false);

        // Also clean up the object in preparation for its reuse from the pool.
        this.readyToReproduce = false;
        this.unfreeze();
    }

    frozen(): boolean {
        return this.freezeLevel > 0;
    }

    freeze() {
        this.unfreezeTimer?.destroy();
        this.freezeLevel++;
        this.scene.sound.play('hit', { volume: 0.75 });

        if (this.freezeLevel >= constants.fatalFreeze) {
            this.die();
            return;
        }

        this.scene.sound.play('ice1');
        const dimness = 128 - (96 / constants.fatalFreeze) * this.freezeLevel;
        this.setTint(Phaser.Display.Color.GetColor(dimness, dimness, 255));
        this.stop();
        this.unfreezeTimer = this.scene.time.addEvent({
            delay: 5000,
            callback: () => {
                this.unfreeze();
            },
            callbackScope: this,
            loop: false,
        });
    }

    unfreeze() {
        this.unfreezeTimer?.destroy();
        this.freezeLevel = 0;
        this.setTint(0xffffff);
        if (this.readyToReproduce) {
            this.play(`germ${this.color()}Splitting`);
        }
        else {
            this.play(`germ${this.color()}Idle`);
        }
    }

    // Initializer for new germ produced via reproduction.
    spawn(parent: Germ) {
        this.readyToReproduce = false;
        this.unfreeze();

        const x = parent.x;
        const y = parent.y;
        this.enableBody(true, x, y, true, true);
        this.setCircle(16);
    }

    tickBehavior() {
        if (!this.active) {
            return;
        }

        if (this.frozen()) {
            return;
        }

        if (this.readyToReproduce) {
            this.readyToReproduce = false;
            this.play(`germ${this.color()}Idle`);

            const germ = germPoolMap.get(this.constructor.name).get();

            if (germ) {
                germ.spawn(this);
                this.scene.sound.play('split');
            }
        } else {
            if (Phaser.Math.FloatBetween(0.0, 1.0) <= StageVars.spawnChance) {
                this.readyToReproduce = true;
                this.play(`germ${this.color()}Splitting`);
            }
        }
    }
}

class GermBlue extends Germ {
    velX: number;
    velY: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'germBlue');
        this.velX = Phaser.Math.FloatBetween(-StageVars.maxInitialGermSpeed, StageVars.maxInitialGermSpeed);
        this.velY = Phaser.Math.FloatBetween(-StageVars.maxInitialGermSpeed, StageVars.maxInitialGermSpeed);
        this.play('germBlueIdle');
    }

    color() {
        return 'Blue';
    }

    update(time: number, delta: number) {
        if (gameOver) {
            this.stop();
            return;
        }

        super.update(time, delta);
        if (this.frozen()) {
            return;
        }
        // Pull toward the center
        this.velX += (center.x - this.x) * constants.germGravityFactor;
        this.velY += (center.y - this.y) * constants.germGravityFactor;
        this.x += this.velX * delta;
        this.y += this.velY * delta;
    }

    spawn(parent: GermBlue) {
        this.velX = parent.velX;
        this.velY = parent.velY;
        super.spawn(parent);
    }
}

class GermGreen extends Germ {
    velX: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'germGreen');
        this.velX = Phaser.Math.FloatBetween(-2 * StageVars.maxInitialGermSpeed, 2 * StageVars.maxInitialGermSpeed);
        this.play('germGreenIdle');
    }

    color() {
        return 'Green';
    }

    update(time: number, delta: number) {
        if (gameOver) {
            this.stop();
            return;
        }

        super.update(time, delta);
        if (this.frozen()) {
            return;
        }
        this.velX += (center.x - this.x) * 2 * constants.germGravityFactor;
        this.x += this.velX * delta;
    }

    spawn(parent: GermGreen) {
        this.velX = parent.velX;
        super.spawn(parent);
    }
}

class GermOrange extends Germ {
    velY: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'germOrange');
        this.velY = Phaser.Math.FloatBetween(-2 * StageVars.maxInitialGermSpeed, 2 * StageVars.maxInitialGermSpeed);
        this.play('germOrangeIdle');
    }

    color() {
        return 'Orange';
    }

    update(time: number, delta: number) {
        if (gameOver) {
            this.stop();
            return;
        }

        super.update(time, delta);
        if (this.frozen()) {
            return;
        }
        this.velY += (center.y - this.y) * 2 * constants.germGravityFactor;
        this.y += this.velY * delta;
    }

    spawn(parent: GermOrange) {
        this.velY = parent.velY;
        super.spawn(parent);
    }
}

class GermPink extends Germ {
    velR: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'germPink');
        this.velR = Phaser.Math.FloatBetween(-0.012 * StageVars.maxInitialGermSpeed, 0.012 * StageVars.maxInitialGermSpeed);
        this.play('germPinkIdle');
    }

    color() {
        return 'Pink';
    }

    update(time: number, delta: number) {
        if (gameOver) {
            this.stop();
            return;
        }

        super.update(time, delta);
        if (this.frozen()) {
            return;
        }
        // Rotate around center
        Phaser.Actions.RotateAroundDistance([this], center, this.velR * delta, Phaser.Math.Distance.BetweenPoints(center, this));
    }

    spawn(parent: GermPink) {
        this.velR = parent.velR;
        super.spawn(parent);
    }
}
