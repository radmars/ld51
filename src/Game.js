'use strict';

const Global = {
    width: 1200,
    height: 1200,
    maxPlayerSpeed: 0.001,
    freezeCooldown: 200,
    initialGerms: 4,
    maxGerms: 40,
    maxInitialGermSpeed: 0.1,
    germGravityFactor: 0.00001,
};

const center = {
    x: Global.width / 2,
    y: Global.height / 2,
}

let ticking = false;
let cursors;
let player;
let freezeBullets;
let lasers;

let germsBlue;
let germsGreen;
let germsOrange;
let germsPink;
let allGerms;
const poolMap = new Map();

let ticker;
let countdownText;
let freezeLastFired = 0;
let laserReady = true;

class Main extends Phaser.Scene {
    constructor() {
        super();
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('laser', 'assets/laser.png');
        this.load.image('germBlue', 'assets/germ_blue.png');
        this.load.image('germOrange', 'assets/germ_orange.png');
        this.load.image('germGreen', 'assets/germ_green.png');
        this.load.image('germPink', 'assets/germ_pink.png');

        this.load.spritesheet('freezeBullet', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });

        this.load.audio('music', ['assets/ld51-main-v1.mp3'])
    }

    create() {
        // Sound
        this.sound.pasueOnBlur = false;
        let music = this.sound.add('music');
        music.play();

        ticker = this.time.addEvent({
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
            }

            // Initializer for new germ produced via reproduction.
            spawn(parent) {
                this.readyToReproduce = false;
                let x = parent.x;
                let y = parent.y;
                this.enableBody(true, x, y, true, true);
                this.setCircle(16);
            }

            tickBehavior() {
                if (!this.active) {
                    return;
                }

                if (this.readyToReproduce) {
                    this.readyToReproduce = false;

                    let germ = poolMap.get(this.constructor.name).get();

                    if (germ) {
                        germ.spawn(this);
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

        class Bullet extends Phaser.Physics.Arcade.Image {
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

                this.speed = Phaser.Math.GetSpeed(600, 1);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeBullet');
            }

            fire(x, y, angle) {
                this.setCircle(8);
                super.fire(x, y, angle);
            }
        };

        class Laser extends Bullet {
            constructor(scene, x, y) {
                super(scene, x, y)

                this.speed = Phaser.Math.GetSpeed(1200, 1);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'laser');
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
        // Player code
        //

        player = this.physics.add.image(400, 50, 'player').setDepth(1).setCircle(16);

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
                germ.disableBody(true, true);
                germ.setActive(false);
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
        Phaser.Actions.RotateAroundDistance([player], center, Global.maxPlayerSpeed * delta, 400);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg + 45; // should face the center point, and the source image is rotated 45 degrees.

        // Fire freeze bullet on "up".
        if (cursors.up.isDown && time > freezeLastFired + Global.freezeCooldown) {
            let bullet = freezeBullets.get();

            if (bullet) {
                freezeLastFired = time;
                let angle = Phaser.Math.Angle.BetweenPoints(player, center);
                bullet.fire(player.x, player.y, angle);
            }
        }
        // Fire laser on "down". Probably want a different button later (like space.)
        if (cursors.down.isDown && laserReady) {
            laserReady = true; // TODO: set to false. true for testing.

            let laser = lasers.get();

            if (laser) {
                let angle = Phaser.Math.Angle.BetweenPoints(player, center);
                laser.fire(player.x, player.y, angle);
            }
        }

        countdownText.setText(ticker.getRemainingSeconds().toString().substr(0, 4));

        if (ticking) {
            laserReady = true;

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
