'use strict';

const Global = {
    width: 1200,
    height: 1200,
    rotateSpeed: 0.005,
    freezeCooldown: 200,
};

const center = {
    x: Global.width / 2,
    y: Global.height / 2,
}

let ticking = false;
let cursors;
let player;
let freezeBullets;
let germBlue;
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

class Main extends Phaser.Scene
{
    constructor ()
    {
        super();
    }

    preload ()
    {
        this.load.image('player', 'assets/player.png');
        this.load.image('laser', 'assets/laser.png');
        this.load.image('germBlue', 'assets/germ_blue.png');
        this.load.image('germOrange', 'assets/germ_orange.png');
        this.load.image('germGreen', 'assets/germ_green.png');
        this.load.image('germPink', 'assets/germ_pink.png');

        this.load.spritesheet('freezeBullet', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });

        this.load.audio('music', ['assets/ld51-main-v1.mp3'])
    }

    create ()
    {
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

        class Germ extends Phaser.Physics.Arcade.Image {
            constructor (scene, x, y)
            {
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
            constructor(scene, x, y)
            {
                super(scene, x, y);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'germBlue');
            }
        };

        let FreezeBullet = new Phaser.Class({
            Extends: Phaser.Physics.Arcade.Image,

            initialize:

            function FreezeBullet (scene)
            {
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeBullet');

                this.speed = Phaser.Math.GetSpeed(600, 1);
                this.velX = 0;
                this.velY = 0;
            },

            fire: function (x, y, angle)
            {
                this.enableBody(true, x, y, true, true)
                this.setCircle(8);
                this.setRotation(angle);
                this.velX = this.speed * Math.sin(this.rotation);
                this.velY = this.speed * Math.cos(this.rotation);
            },

            update: function (time, delta)
            {
                this.x += this.speed * delta * this.velY;
                this.y += this.speed * delta * this.velX;

                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width)
                {
                    this.setActive(false);
                    this.setVisible(false);
                }
            },
        });

        freezeBullets = this.physics.add.group({
            classType: FreezeBullet,
            maxSize: 5,
            runChildUpdate: true,
        });

        germBlue = this.physics.add.group({
            classType: GermBlue,
            maxSize: 50,
            runChildUpdate: true,
        })
        germBlue.createMultiple({
            key: 'germBlue', // Not sure why I need to specify this
            quantity: 10,
            active: true,
            visible: true,
        });
        // Can't find a way to do this globally, so will need to do this for each germ spawned afterward.
        // Also, the germs only collide with themselves after this is set for some reason.
        germBlue.children.each((germ) => {
            germ.setCircle(16);
        });

        // Put germs randomly within a central circle
        const circle = new Phaser.Geom.Circle(Global.width / 2, Global.height / 2, 300);
        Phaser.Actions.RandomCircle(germBlue.getChildren(), circle);

        player = this.physics.add.image(400, 50, 'player').setDepth(1).setCircle(16);

        cursors = this.input.keyboard.createCursorKeys();

        this.physics.add.collider(freezeBullets, germBlue, freezeHit);
        this.physics.add.collider(germBlue); // Allow blue germs to collide w/ each other.
    }

    update (time, delta)
    {
        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, Global.rotateSpeed, 400);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg + 45; // should face the center point, and the source image is rotated 45 degrees.

        // Fire projectile on "up".
        if (cursors.up.isDown && time > freezeLastFired + Global.freezeCooldown)
        {
            let bullet = freezeBullets.get();

            if (bullet)
            {
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
  scene: [ Main ],
  physics: {
    default: 'arcade',
    arcade: {
        debug: true,
    },
  },
};

const game = new Phaser.Game(config);
