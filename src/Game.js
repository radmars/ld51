'use strict';

const Global = {
    width: 800,
    height: 600,
    rotateSpeed: 0.005,
    freezeCooldown: 50,
};

class Main extends Phaser.Scene
{
    constructor ()
    {
        super();

        this.cursors;
        this.player;
        this.freezeBullets;
        this.freezeLastFired = 0;
        this.center = {x: Global.width / 2, y: Global.height / 2};
        this.rotateSpeed = Global.rotateSpeed;
    }

    preload ()
    {
        this.load.image('player', 'assets/star.png');
        this.load.image('center', 'assets/bomb.png');
        this.load.image('freezeShot', 'assets/bomb.png');
    }

    create ()
    {
        var FreezeBullet = new Phaser.Class({
            Extends: Phaser.GameObjects.Image,

            initialize:

            function FreezeBullet (scene)
            {
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeShot');

                this.speed = Phaser.Math.GetSpeed(400, 1);
                this.angle;
            },

            fire: function (x, y, angle)
            {
                this.setPosition(x, y);
                this.angle = angle;

                this.setActive(true);
                this.setVisible(true);
            },

            update: function (time, delta)
            {
                this.y += this.speed * delta * Math.sin(this.angle);
                this.x += this.speed * delta * Math.cos(this.angle);

                // TODO: Use boundary collisions instead
                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width)
                {
                    this.setActive(false);
                    this.setVisible(false);
                }
            }
        })

        this.freezeBullets = this.add.group({
            classType: FreezeBullet,
            maxSize: 5,
            runChildUpdate: true
        });

        this.add.sprite(this.center.x, this.center.y, 'center', 1);
        this.player = this.add.sprite(400, 50, 'player', 1);

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update (time, delta)
    {
        // Rotate around center
        Phaser.Actions.RotateAroundDistance([this.player], this.center, this.rotateSpeed, 250);
        const angleDeg = Math.atan2(this.player.y - this.center.y, this.player.x - this.center.x) * 180 / Math.PI;
        this.player.angle = angleDeg+90; // container should face the center point

        // Fire projectile on "up"
        if (this.cursors.up.isDown && time > this.freezeLastFired + Global.freezeCooldown)
        {
            let bullet = this.freezeBullets.get();

            if (bullet)
            {
                let angle = Phaser.Math.Angle.BetweenPoints(this.player, this.center)
                bullet.fire(this.player.x, this.player.y, angle);
                this.freezeLastFired = time;
            }
        }
    }
}

const config = {
  type: Phaser.AUTO,
  width: Global.width,
  height: Global.height,
  scene: [ Main ],
};

const game = new Phaser.Game(config);
