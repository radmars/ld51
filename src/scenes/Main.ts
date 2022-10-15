import Phaser, { Scene } from 'phaser';
import { constants, center } from '../constants';
import { GermBlue, GermGreen, GermOrange, GermPink } from '../Germs';
import { StageVars } from '../StageVars';

let ticking = false; // Whether or not the 10-second timer is firing.
let player: Phaser.Physics.Arcade.Sprite;
let freezeBullets: Phaser.Physics.Arcade.Group;
let lasers: Phaser.Physics.Arcade.Group;

let mouseX: number;
let mouseY: number;
let freezeLastFired = 0;
let laserReady = true;
let fireFreeze = false;
let fireLaser = false;

let germsBlue: Phaser.Physics.Arcade.Group;
let germsGreen: Phaser.Physics.Arcade.Group;
let germsOrange: Phaser.Physics.Arcade.Group;
let germsPink: Phaser.Physics.Arcade.Group;
let allGerms: Phaser.Physics.Arcade.Group[];
export const germPoolMap = new Map();

let tenSecondTimer: Phaser.Time.TimerEvent;
let countdownText: Phaser.GameObjects.Text;
let gameOverText: Phaser.GameObjects.Text;
let stageText: Phaser.GameObjects.Text;

export let gameOver = false;
let clickToRestart = false;
let currentStage = 1;

export default class Main extends Phaser.Scene {
    constructor() {
        super('Main');
    }

    preload() {
        this.load.image('background', 'assets/background.png');

        this.load.spritesheet('player', 'assets/player.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germBlue', 'assets/germ_blue.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germOrange', 'assets/germ_orange.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germGreen', 'assets/germ_green.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germPink', 'assets/germ_pink.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('freezeBullet', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('laser', 'assets/laser.png', { frameWidth: 128, frameHeight: 32 });

        this.load.audio('music', ['assets/ld51-main.m4a', 'assets/ld51-main.ogg']);
        this.load.audio('gameover', ['assets/ld51-gameover.m4a', 'assets/ld51-gameover.ogg']);
        this.load.audio('ice1', ['assets/sfx/ice1.m4a', 'assets/sfx/ice1.ogg']);
        this.load.audio('ice2', ['assets/sfx/ice2.m4a', 'assets/sfx/ice2.ogg']);
        this.load.audio('freezeshot', ['assets/sfx/freezeshot.m4a', 'assets/sfx/freezeshot.ogg']);
        this.load.audio('laser', ['assets/sfx/laser.m4a', 'assets/sfx/laser.ogg']);
        this.load.audio('laserfail', ['assets/sfx/laserfail.m4a', 'assets/sfx/laserfail.ogg']);
        this.load.audio('reload', ['assets/sfx/reload.m4a', 'assets/sfx/reload.ogg']);
        this.load.audio('split', ['assets/sfx/split.m4a', 'assets/sfx/split.ogg']);
        this.load.audio('hit', ['assets/sfx/hit.m4a', 'assets/sfx/hit.ogg']);

    }

    addGerms() {
        for (let i = 0; i < StageVars.initialGerms; i++) {
            germsBlue.get();
            germsGreen.get();
            germsOrange.get();
            germsPink.get();
        }
        const placementCircle = new Phaser.Geom.Circle(constants.width / 2, constants.height / 2, 250);
        allGerms.forEach((i) => {
            // Can't find a way to do this globally, so will need to do this for each germ spawned afterward.
            // Also, the germs only collide with themselves after this is set for some reason.
            i.children.each((germ) => {
                germ.setCircle(16);
                germ.setActive(true);
                germ.enableBody(true, 0.0, 0.0, true, true);
                germ.readyToReproduce = false;
                germ.unfreeze();
            });

            // Put germs randomly within a central circle
            Phaser.Actions.RandomCircle(i.getChildren(), placementCircle);
        });
    }

    create() {
        this.cameras.main.fadeIn(1000);
        gameOver = false;
        clickToRestart = false;
        this.sound.stopAll();

        StageVars.spawnChance = constants.spawnChance;
        StageVars.maxInitialGermSpeed = constants.maxInitialGermSpeed;
        StageVars.initialGerms = constants.initialGerms;
        currentStage = 1;

        //
        // Sound
        //
        this.sound.pauseOnBlur = false;
        let music = this.sound.add('music', { volume: 0.75, loop: true });
        music.play();

        //
        // Global state
        //

        this.input.setDefaultCursor('url(assets/reticle.png), pointer');
        this.add.image(400, 400, 'background');
        tenSecondTimer = this.time.addEvent({
            delay: 10000,
            callback: () => {
                ticking = true;
            },
            callbackScope: this,
            loop: true,
        })

        //
        // Animations
        //

        this.anims.create({
            key: 'playerLaserReady',
            frames: [{ key: 'player', frame: 0 }],
        })
        this.anims.create({
            key: 'playerLaserEmpty',
            frames: [{ key: 'player', frame: 1 }],
        })
        this.anims.create({
            key: 'freezeIdle',
            frames: [{ key: 'freezeBullet', frame: 0 }],
        })
        this.anims.create({
            key: 'freezeExplode',
            frames: this.anims.generateFrameNumbers('freezeBullet', { start: 1, end: 2 }),
            frameRate: 7,
        });
        this.anims.create({
            key: 'laser',
            frames: this.anims.generateFrameNumbers('laser', {}),
            frameRate: 20,
            repeat: -1,
        });
        ['Blue', 'Green', 'Orange', 'Pink'].forEach(i => {
            this.anims.create({
                key: `germ${i}Idle`,
                frames: this.anims.generateFrameNumbers(`germ${i}`, { start: 0, end: 1 }),
                frameRate: 3,
                repeat: -1,
            });
            this.anims.create({
                key: `germ${i}Splitting`,
                frames: this.anims.generateFrameNumbers(`germ${i}`, { start: 2, end: 3 }),
                frameRate: 3,
                repeat: -1,
            });
        });

        countdownText = this.add.text(0, 0, '10.0', { fill: '#00ff00' });
        stageText = this.add.text(0, 0, 'Stage 1', { fill: '#00ff00' });
        stageText.x = constants.width - stageText.width - 20;
        // dumb hack to make it taller because it doesn't know how to deal with descenders apparently
        stageText.setFixedSize(stageText.width + 10, stageText.height + 10);

        germsBlue = this.physics.add.group({
            classType: GermBlue,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });
        germsGreen = this.physics.add.group({
            classType: GermGreen,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });
        germsOrange = this.physics.add.group({
            classType: GermOrange,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });
        germsPink = this.physics.add.group({
            classType: GermPink,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });

        germPoolMap.set('GermBlue', germsBlue);
        germPoolMap.set('GermGreen', germsGreen);
        germPoolMap.set('GermOrange', germsOrange);
        germPoolMap.set('GermPink', germsPink);

        allGerms = [germsBlue, germsGreen, germsOrange, germsPink];

        this.addGerms();

        //
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
        };

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
                let that = this;
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
                        that.setVisible(false);
                    },
                });
                this.velX = 0;
                this.velY = 0;
                this.play('freezeExplode');
            }
        };

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
        };

        freezeBullets = this.physics.add.group({
            classType: FreezeBullet,
            maxSize: 5,
            runChildUpdate: true,
        });

        lasers = this.physics.add.group({
            classType: Laser,
            maxSize: 2, // In case player fires at the end of a timer and then at the beginning of the next.
            runChildUpdate: true,
        });

        //
        // Player code + controls
        //

        player = this.physics.add.sprite(constants.width / 2, 50, 'player').setDepth(1).setCircle(16);

        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            mouseX = pointer.x;
            mouseY = pointer.y;

            if (pointer.rightButtonDown()) {
                fireLaser = true;
            }
            else {
                if (clickToRestart) {
                    this.scene.start('Main');
                }
                fireFreeze = true;
            }
        });

        //
        // Collision code
        //

        for (let i = 0; i < allGerms.length; i++) {
            // Allow germs to collide with others of the same type
            this.physics.add.collider(allGerms[i]);

            this.physics.add.collider(freezeBullets, allGerms[i], (bullet, germ) => {
                bullet.explode();
                germ.freeze();
            });
            this.physics.add.collider(lasers, allGerms[i], (laser, germ) => {
                germ.die();
                this.sound.play('hit', { volume: 0.75 });
            });
            this.physics.add.collider(player, allGerms[i], (player, germ) => {
                if (!germ.frozen) {
                    this.endGame(false);
                }
            });

            // Allow germs to collide with all other types
            for (let j = 1; j < allGerms.length; j++) {
                this.physics.add.collider(allGerms[i], allGerms[j]);
            }
        }
    }

    update(time: number, delta: number) {
        if (gameOver) {
            return;
        }

        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, constants.playerSpeed * delta, constants.size / 2 - 50);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg + 45; // should face the center point, and the source image is rotated 45 degrees.

        if (fireFreeze) {
            fireFreeze = false;

            if (time > freezeLastFired + constants.freezeCooldown) {
                let bullet = freezeBullets.get();

                if (bullet) {
                    freezeLastFired = time;
                    let angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    bullet.fire(player.x, player.y, angle);
                }
            }
        }

        if (fireLaser) {
            fireLaser = false;

            if (laserReady) {
                laserReady = false;
                player.play('playerLaserEmpty');

                let laser = lasers.get();

                if (laser) {
                    let angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    laser.fire(player.x, player.y, angle);
                }
            }
            else {
                this.sound.play('laserfail');
            }
        }

        countdownText.setText(tenSecondTimer.getRemainingSeconds().toString().substr(0, 4));

        if (ticking) {
            laserReady = true;
            player.play('playerLaserReady');
            this.sound.play('reload');

            allGerms.forEach(i => {
                i.getChildren().forEach(j => {
                    j.tickBehavior();
                })
            })

            ticking = false;
        }

        let anyAlive = false;
        allGerms.forEach(group => {
            group.getChildren().forEach(germ => {
                if (germ.active == true) {
                    anyAlive = true;
                }
            });
        });
        if (anyAlive == false) {
            this.nextStage();
        }
    }

    endGame(didWin: boolean) {
        gameOver = true;
        gameOverText = this.add.text(
            constants.width / 2 - 250,
            constants.height / 2 - 250,
            didWin ? 'YOU WIN!' : 'GAME OVER',
            {
                fill: '#00ff00',
                fontSize: '96px',
                fontStyle: 'bold',
            },
        );
        gameOverText.setDepth(10);

        this.time.addEvent({
            delay: 2000,
            callback: () => {
                clickToRestart = true;
            },
            callbackScope: this,
            loop: false,
        });

        if (!didWin) {
            this.sound.stopAll();
            this.sound.play('gameover', { volume: 0.5 });
        }
    }

    nextStage() {
        currentStage++;
        if (currentStage == 6) {
            this.endGame(true);
            return;
        }
        StageVars.maxInitialGermSpeed += 0.05;

        if (StageVars.spawnChance < 0.8) {
            StageVars.spawnChance += 0.05;
        }

        StageVars.initialGerms++;

        stageText.setText('Stage ' + currentStage);
        this.addGerms();
    }
}
