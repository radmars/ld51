'use strict';

const Global = {
    width: 800,
    height: 600,
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
let bacteria;
let ticker;
let countdownText;
let freezeLastFired = 0;

function tenSecondTick() {
    ticking = true;
}

class Main extends Phaser.Scene
{
    constructor ()
    {
        super();
    }

    preload ()
    {
        this.load.image('player', 'assets/ship.png');
        this.load.image('freezeBullet', 'assets/freezeBullet.png');
        this.load.image('killBullet', 'assets/killBullet.png');
        this.load.image('bacteria', 'assets/star.png');
    }

    create ()
    {
        ticker = this.time.addEvent({
            delay: 10000,
            callback: tenSecondTick,
            callbackScope: this,
            loop: true,
        })

        countdownText = this.add.text(0, 0, '10.0', { fill: '#00ff00' });

        var Bacteria = new Phaser.Class({
            Extends: Phaser.GameObjects.Image,

            initialize:

            function Bacteria (scene)
            {
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'bacteria');

                this.velX = Phaser.Math.FloatBetween(-1, 1);
                this.velY = Phaser.Math.FloatBetween(-1, 1);
            },

            update: function (time, delta)
            {
                // Pull toward the center
                this.velX += (center.x - this.x) * 0.0001;
                this.velY += (center.y - this.y) * 0.0001;
                this.x += this.velX;
                this.y += this.velY;

                // TODO: Use boundary collisions instead, or maybe just timed life.
                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width)
                {
                    this.setActive(false);
                    this.setVisible(false);
                }
            },

            split: function()
            {
                // TODO
            },

            freeze: function()
            {
                // TODO
            },

            die: function()
            {
                // TODO
            },
        })

        var FreezeBullet = new Phaser.Class({
            Extends: Phaser.GameObjects.Image,

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
                this.setPosition(x, y);
                this.setRotation(angle);
                this.velX = this.speed * Math.sin(this.rotation);
                this.velY = this.speed * Math.cos(this.rotation);

                this.setActive(true);
                this.setVisible(true);
            },

            update: function (time, delta)
            {
                this.x += this.speed * delta * this.velY;
                this.y += this.speed * delta * this.velX;

                // TODO: Use boundary collisions instead, or maybe just timed life.
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

        bacteria = this.physics.add.group({
            classType: Bacteria,
            maxSize: 50,
            runChildUpdate: true,
        })
        bacteria.createMultiple({
            key: 'bacteria', // Not sure why I need to specify this
            quantity: 10,
            active: true,
            visible: true,
        });

        // Put bacteria randomly within a central circle
        const circle = new Phaser.Geom.Circle(Global.width / 2, Global.height / 2, 150);
        Phaser.Actions.RandomCircle(bacteria.getChildren(), circle);

        player = this.physics.add.image(400, 50, 'player').setDepth(1);

        cursors = this.input.keyboard.createCursorKeys();
    }

    update (time, delta)
    {
        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, Global.rotateSpeed, 250);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg - 90; // should face the center point.

        // Fire projectile on "up".
        if (cursors.up.isDown && time > freezeLastFired + Global.freezeCooldown)
        {
            let bullet = freezeBullets.get();

            if (bullet)
            {
                freezeLastFired = time;
                let angle = Phaser.Math.Angle.BetweenPoints(player, center);
                bullet.fire(player.x, player.y, angle);
                this.physics.add.collider(bullet, bacteria, () => {
                    console.log("Collision!")
                });
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
