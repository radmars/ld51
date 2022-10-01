'use strict';

const Global = {
    width: 800,
    height: 600,
    rotateSpeed: 0.005,
};

class Main extends Phaser.Scene
{
    constructor ()
    {
        super();

        this.container;
        this.center = {x: Global.width / 2, y: Global.height / 2};
        this.rotateSpeed = Global.rotateSpeed;
    }

    preload ()
    {
        this.load.image('player', 'assets/star.png');
        this.load.image('center', 'assets/bomb.png');
    }

    create ()
    {
        this.add.sprite(this.center.x, this.center.y, 'center', 1);

        this.container = this.add.container(600, 300);

        const text = this.add.text(-25, -50, 'Pew Pew Pew');

        const player = this.add.sprite(0, 0, 'player', 1);

        this.container.add([player, text]);

        // stop rotation on click
        this.input.on('pointerdown', function() {
          if (this.rotateSpeed > 0) {
              this.rotateSpeed = 0;
          } else {
              this.rotateSpeed = Global.rotateSpeed;
          }
        }, this);
    }

    update ()
    {
        Phaser.Actions.RotateAroundDistance([this.container], this.center, this.rotateSpeed, 250);
        const angleDeg = Math.atan2(this.container.y - this.center.y, this.container.x - this.center.x) * 180 / Math.PI;
        this.container.angle = angleDeg+90; // container should face the center point
    }
}

const config = {
  type: Phaser.AUTO,
  width: Global.width,
  height: Global.height,
  scene: [ Main ],
};

const game = new Phaser.Game(config);
