'use strict';

const Global = {
    width: 800,
    height: 600,
    rotateSpeed: 0.005,
    freezeCooldown: 200,
};

let ticking = false;
let cursors;
let player;
let freezeBullets;
let ticker;
let countdownText;
let freezeLastFired = 0;
let center;

function tenSecondTick() {
    ticking = true;
}

class Main extends Phaser.Scene
{
    constructor ()
    {
        super();

        center = {x: Global.width / 2, y: Global.height / 2};
    }

    preload ()
    {
        this.load.image('player', 'assets/ship.png');
        this.load.image('center', 'assets/bomb.png');
        this.load.image('freezeBullet', 'assets/freezeBullet.png');
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
            },

            update: function (time, delta)
            {
                this.x += this.speed * delta * Math.cos(this.rotation);
                this.y += this.speed * delta * Math.sin(this.rotation);

                // Pull toward the center

                // TODO: Use boundary collisions instead, or maybe just timed life.
                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width)
                {
                    this.setActive(false);
                    this.setVisible(false);
                }
            }
        })

        var FreezeBullet = new Phaser.Class({
            Extends: Phaser.GameObjects.Image,

            initialize:

            function FreezeBullet (scene)
            {
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeBullet');

                this.speed = Phaser.Math.GetSpeed(400, 1);
            },

            fire: function (x, y, angle)
            {
                this.setPosition(x, y);
                this.setRotation(angle);

                this.setActive(true);
                this.setVisible(true);
            },

            update: function (time, delta)
            {
                this.y += this.speed * delta * Math.sin(this.rotation);
                this.x += this.speed * delta * Math.cos(this.rotation);

                // TODO: Use boundary collisions instead, or maybe just timed life.
                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width)
                {
                    this.setActive(false);
                    this.setVisible(false);
                }
            },
        });

        freezeBullets = this.add.group({
            classType: FreezeBullet,
            maxSize: 5,
            runChildUpdate: true
        });

        this.add.image(center.x, center.y, 'center').setDepth(1);
        player = this.add.image(400, 50, 'player').setDepth(1);

        cursors = this.input.keyboard.createCursorKeys();
    }

    update (time, delta)
    {
        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, Global.rotateSpeed, 250);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg-90; // container should face the center point

        // Fire projectile on "up".
        if (cursors.up.isDown && time > freezeLastFired + Global.freezeCooldown)
        {
            let bullet = freezeBullets.get();

            if (bullet)
            {
                let angle = Phaser.Math.Angle.BetweenPoints(player, center)
                bullet.fire(player.x, player.y, angle);
                freezeLastFired = time;
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
};

const game = new Phaser.Game(config);
