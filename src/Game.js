'use strict';

const Global = {
    size: 800,
    width: 800,
    height: 800,
    playerSpeed: Math.PI / 5 / 1000,
    freezeCooldown: 200,
    initialGerms: 4,
    maxGerms: 40,
    maxInitialGermSpeed: 0.1,
    germGravityFactor: 0.00001,
    freezeSpeed: 600,
    laserSpeed: 1200,
};

const center = {
    x: Global.width / 2,
    y: Global.height / 2,
}

let ticking = false; // Whether or not the 10-second timer is firing.
let cursors;
let player;
let freezeBullets;
let lasers;

let mouseX;
let mouseY;
let freezeLastFired = 0;
let laserReady = true;
let fireFreeze = false;
let fireLaser = false;

let germsBlue;
let germsGreen;
let germsOrange;
let germsPink;
let allGerms;
const poolMap = new Map();

let tenSecondTimer;
let countdownText;

class Main extends Phaser.Scene {
    constructor() {
        super();
    }

    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.image('player', 'assets/player.png');
        this.load.image('laser', 'assets/laser.png');
        this.load.image('germBlue', 'assets/germ_blue.png');
        this.load.image('germOrange', 'assets/germ_orange.png');
        this.load.image('germGreen', 'assets/germ_green.png');
        this.load.image('germPink', 'assets/germ_pink.png');

        // this.load.spritesheet('player', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });
        // this.load.spritesheet('germBlue', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });
        // this.load.spritesheet('germOrange', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });
        // this.load.spritesheet('germGreen', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });
        // this.load.spritesheet('germPink', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('freezeBullet', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });

        this.load.audio('music', ['assets/ld51-main-v1.mp3']);
        this.load.audio('ice1', ['assets/sfx/ice1.m4a', 'assets/sfx/ice1.ogg']);
        this.load.audio('ice2', ['assets/sfx/ice2.m4a', 'assets/sfx/ice2.ogg']);
        this.load.audio('freezeshot', ['assets/sfx/freezeshot.m4a', 'assets/sfx/freezeshot.ogg']);
        this.load.audio('laser', ['assets/sfx/laser.m4a', 'assets/sfx/laser.ogg']);
        this.load.audio('laserfail', ['assets/sfx/laserfail.m4a', 'assets/sfx/laserfail.ogg']);
        this.load.audio('reload', ['assets/sfx/reload.m4a', 'assets/sfx/reload.ogg']);
        this.load.audio('split', ['assets/sfx/split.m4a', 'assets/sfx/split.ogg']);
    }

    create() {
        //
        // Sound
        //
        this.sound.pasueOnBlur = false;
        let music = this.sound.add('music');
        music.play();

        //
        // Global state
        //

        this.add.image(400, 400, 'background');
        tenSecondTimer = this.time.addEvent({
            delay: 10000,
            callback: () => {
                ticking = true;
            },
            callbackScope: this,
            loop: true,
        })

        countdownText = this.add.text(0, 0, '10.0', { fill: '#00ff00' });

        //
        // Germ code
        //

        class Germ extends Phaser.Physics.Arcade.Image {
            constructor(scene, x, y) {
                super(scene, x, y);
                // Constructor is only used for initial setup, and we don't want germs immediately reproducing
                this.readyToReproduce = false;
                this.frozen = false;
                this.setTint(0xffffff);
            }

            freeze() {
                this.frozen = true;
                this.setTint(0x5555ff);
                this.scene.sound.play('ice1');
            }

            // Initializer for new germ produced via reproduction.
            spawn(parent) {
                this.readyToReproduce = false;
                this.frozen = false;
                this.setTint(0xffffff);

                let x = parent.x;
                let y = parent.y;
                this.enableBody(true, x, y, true, true);
                this.setCircle(16);
            }

            tickBehavior() {
                if (!this.active) {
                    return;
                }
                if (this.frozen) {
                    this.frozen = false;
                    this.setTint(0xffffff);
                    return;
                }

                if (this.readyToReproduce) {
                    this.readyToReproduce = false;

                    let germ = poolMap.get(this.constructor.name).get();

                    if (germ) {
                        germ.spawn(this);
                        this.scene.sound.play('split');
                    }
                } else {
                    if (Phaser.Math.Between(0, 4) === 0) {
                        this.readyToReproduce = true;
                    }
                }
            }
        };

        class GermBlue extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germBlue');
                this.velX = Phaser.Math.FloatBetween(-Global.maxInitialGermSpeed, Global.maxInitialGermSpeed);
                this.velY = Phaser.Math.FloatBetween(-Global.maxInitialGermSpeed, Global.maxInitialGermSpeed);
            }

            update(time, delta) {
                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                // Pull toward the center
                this.velX += (center.x - this.x) * Global.germGravityFactor;
                this.velY += (center.y - this.y) * Global.germGravityFactor;
                this.x += this.velX * delta;
                this.y += this.velY * delta;
            }

            spawn(parent) {
                this.velX = parent.velX;
                this.velY = parent.velY;
                super.spawn(parent);
            }
        };
        class GermGreen extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germGreen');
                this.velX = Phaser.Math.FloatBetween(-2 * Global.maxInitialGermSpeed, 2 * Global.maxInitialGermSpeed);
            }

            update(time, delta) {
                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                this.velX += (center.x - this.x) * 2 * Global.germGravityFactor;
                this.x += this.velX * delta;
            }

            spawn(parent) {
                this.velX = parent.velX;
                super.spawn(parent);
            }
        };
        class GermOrange extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germOrange');
                this.velY = Phaser.Math.FloatBetween(-2 * Global.maxInitialGermSpeed, 2 * Global.maxInitialGermSpeed);
            }

            update(time, delta) {
                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                this.velY += (center.y - this.y) * 2 * Global.germGravityFactor;
                this.y += this.velY * delta;
            }

            spawn(parent) {
                this.velY = parent.velY;
                super.spawn(parent);
            }
        };
        class GermPink extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germPink');
                this.velR = Phaser.Math.FloatBetween(-0.012 * Global.maxInitialGermSpeed, 0.012 * Global.maxInitialGermSpeed);
            }

            update(time, delta) {
                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                // Rotate around center
                Phaser.Actions.RotateAroundDistance([this], center, this.velR * delta, Phaser.Math.Distance.BetweenPoints(center, this));
            }

            spawn(parent) {
                this.velR = parent.velR;
                super.spawn(parent);
            }
        };

        germsBlue = this.physics.add.group({
            classType: GermBlue,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });
        germsGreen = this.physics.add.group({
            classType: GermGreen,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });
        germsOrange = this.physics.add.group({
            classType: GermOrange,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });
        germsPink = this.physics.add.group({
            classType: GermPink,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });

        poolMap.set('GermBlue', germsBlue);
        poolMap.set('GermGreen', germsGreen);
        poolMap.set('GermOrange', germsOrange);
        poolMap.set('GermPink', germsPink);

        germsBlue.createMultiple({
            key: 'germBlue', // Not sure why I need to specify this
            quantity: Global.initialGerms,
            active: true,
            visible: true,
        });
        germsGreen.createMultiple({
            key: 'germGreen',
            quantity: Global.initialGerms,
            active: true,
            visible: true,
        });
        germsOrange.createMultiple({
            key: 'germOrange',
            quantity: Global.initialGerms,
            active: true,
            visible: true,
        });
        germsPink.createMultiple({
            key: 'germPink',
            quantity: Global.initialGerms,
            active: true,
            visible: true,
        });

        allGerms = [germsBlue, germsGreen, germsOrange, germsPink];
        const placementCircle = new Phaser.Geom.Circle(Global.width / 2, Global.height / 2, 300);
        allGerms.forEach((i) => {
            // Can't find a way to do this globally, so will need to do this for each germ spawned afterward.
            // Also, the germs only collide with themselves after this is set for some reason.
            i.children.each((germ) => {
                germ.setCircle(16);
            });

            // Put germs randomly within a central circle
            Phaser.Actions.RandomCircle(i.getChildren(), placementCircle);
        })

        //
        // Bullet code
        //

        class Bullet extends Phaser.Physics.Arcade.Sprite {
            constructor(scene, x, y) {
                super(scene, x, y)

                this.velX = 0;
                this.velY = 0;
            }

            fire(x, y, angle) {
                this.enableBody(true, x, y, true, true)
                this.setRotation(angle);
                this.velX = this.speed * Math.sin(this.rotation);
                this.velY = this.speed * Math.cos(this.rotation);
            }

            update(time, delta) {
                super.update(time, delta);

                this.x += delta * this.velY;
                this.y += delta * this.velX;

                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width) {
                    this.disableBody(true, true);
                }
            }
        };

        class FreezeBullet extends Bullet {
            constructor(scene, x, y) {
                super(scene, x, y)

                this.speed = Phaser.Math.GetSpeed(Global.freezeSpeed, 1);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeBullet');
            }

            fire(x, y, angle) {
                this.setCircle(8);
                super.fire(x, y, angle);
                this.scene.sound.play('freezeshot');
            }
        };

        class Laser extends Bullet {
            constructor(scene, x, y) {
                super(scene, x, y)

                this.speed = Phaser.Math.GetSpeed(Global.laserSpeed, 1);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'laser');
            }

            fire(x, y, angle) {
                super.fire(x, y, angle);
                this.scene.sound.play('laser');
                // Need to do lots of adjustments of the bounding box because arcade physics and
                // rotated rectangles don't get along. Only the leading tip of the laser will
                // trigger a collision.
                this.setCircle(10);
                // const yOffset = Math.sin(Math.PI - angle) * 32;
                // const xOffset = Math.cos(Math.PI - angle) * 128
                // this.setOffset(xOffset, yOffset);
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

        player = this.physics.add.image(Global.width / 2, 50, 'player').setDepth(1).setCircle(16);

        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', (pointer) => {
            mouseX = pointer.x;
            mouseY = pointer.y;

            if (pointer.rightButtonDown()) {
                fireLaser = true;
            }
            else {
                fireFreeze = true;
            }
        });
        cursors = this.input.keyboard.createCursorKeys();

        //
        // Collision code
        //

        for (let i = 0; i < allGerms.length; i++) {
            // Allow germs to collide with others of the same type
            this.physics.add.collider(allGerms[i]);

            this.physics.add.collider(freezeBullets, allGerms[i], (bullet, germ) => {
                bullet.disableBody(true, true);
                // I thought that disableBody would set this to false as well, but it doesn't appear to.
                bullet.setActive(false);
                germ.freeze();
            });
            this.physics.add.collider(lasers, allGerms[i], (laser, germ) => {
                germ.disableBody(true, true);
                germ.setActive(false);
            });

            // Allow germs to collide with all other types
            for (let j = 1; j < allGerms.length; j++) {
                this.physics.add.collider(allGerms[i], allGerms[j]);
            }
        }
    }

    update(time, delta) {
        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, Global.playerSpeed * delta, Global.size / 2 - 50);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg + 45; // should face the center point, and the source image is rotated 45 degrees.

        if (fireFreeze) {
            fireFreeze = false;

            if (time > freezeLastFired + Global.freezeCooldown) {
                let bullet = freezeBullets.get();

                if (bullet) {
                    freezeLastFired = time;
                    let angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    bullet.fire(player.x, player.y, angle);
                }
            }
        } else if (cursors.down.isDown && !laserReady) {
            this.sound.play('laserfail');
        }

        if (fireLaser) {
            fireLaser = false;

            if (laserReady) {
                laserReady = true; // TODO: set to false. true for testing.

                let laser = lasers.get();

                if (laser) {
                    let angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    laser.fire(player.x, player.y, angle);
                }
            }
        }

        countdownText.setText(tenSecondTimer.getRemainingSeconds().toString().substr(0, 4));

        if (ticking) {
            laserReady = true;
            this.sound.play('reload');

            allGerms.forEach(i => {
                i.getChildren().forEach(j => {
                    j.tickBehavior();
                })
            })

            ticking = false;
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: Global.width,
    height: Global.height,
    scene: [Main],
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
        },
    },
};

const game = new Phaser.Game(config);
