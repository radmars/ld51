'use strict';

const Global = {
    width: 1200,
    height: 1200,
    rotateSpeed: 0.005,
    freezeCooldown: 200,
    initialGerms: 5,
    maxGerms: 20,
};

const center = {
    x: Global.width / 2,
    y: Global.height / 2,
}

let ticking = false;
let cursors;
let player;
let freezeBullets;

let germsBlue;
let germsGreen;
let germsOrange;
let germsPink;

let ticker;
let countdownText;
let freezeLastFired = 0;

function tenSecondTick() {
    ticking = true;
}

function freezeHit(bullet, germ) {
    bullet.disableBody(true, true);
    germ.disableBody(true, true);
}

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
            callback: tenSecondTick,
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

                this.velX = Phaser.Math.FloatBetween(-1, 1);
                this.velY = Phaser.Math.FloatBetween(-1, 1);
            }

            update(time, delta) {
                super.update(time, delta);
                // Pull toward the center
                this.velX += (center.x - this.x) * 0.0001;
                this.velY += (center.y - this.y) * 0.0001;
                this.x += this.velX;
                this.y += this.velY;
            }

        };

        class GermBlue extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germBlue');
            }
        };
        class GermGreen extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germGreen');
            }
        };
        class GermOrange extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germOrange');
            }
        };
        class GermPink extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germPink');
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

        const allGerms = [germsBlue, germsGreen, germsOrange, germsPink];
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

        class FreezeBullet extends Phaser.Physics.Arcade.Image {
            constructor(scene, x, y) {
                super(scene, x, y)

                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeBullet');

                this.speed = Phaser.Math.GetSpeed(600, 1);
                this.velX = 0;
                this.velY = 0;
            }

            fire(x, y, angle) {
                this.enableBody(true, x, y, true, true)
                this.setCircle(8);
                this.setRotation(angle);
                this.velX = this.speed * Math.sin(this.rotation);
                this.velY = this.speed * Math.cos(this.rotation);
            }

            update(time, delta) {
                super.update(time, delta);

                this.x += this.speed * delta * this.velY;
                this.y += this.speed * delta * this.velX;

                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width) {
                    this.setActive(false);
                    this.setVisible(false);
                }
            }
        };

        freezeBullets = this.physics.add.group({
            classType: FreezeBullet,
            maxSize: 5,
            runChildUpdate: true,
        });

        player = this.physics.add.image(400, 50, 'player').setDepth(1).setCircle(16);

        cursors = this.input.keyboard.createCursorKeys();

        //
        // Collision code
        //

        for (let i = 0; i < allGerms.length; i++) {
            // Allow germs to collide with others of the same type
            this.physics.add.collider(allGerms[i]);

            this.physics.add.collider(freezeBullets, allGerms[i], freezeHit);

            // Allow germs to collide with all other types
            for (let j = 1; j < allGerms.length; j++) {
                this.physics.add.collider(allGerms[i], allGerms[j]);
            }
        }
    }

    update(time, delta) {
        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, Global.rotateSpeed, 400);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg + 45; // should face the center point, and the source image is rotated 45 degrees.

        // Fire projectile on "up".
        if (cursors.up.isDown && time > freezeLastFired + Global.freezeCooldown) {
            let bullet = freezeBullets.get();

            if (bullet) {
                freezeLastFired = time;
                let angle = Phaser.Math.Angle.BetweenPoints(player, center);
                bullet.fire(player.x, player.y, angle);
            }
        }

        countdownText.setText(ticker.getRemainingSeconds().toString().substr(0, 4));

        ticking = false;
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
