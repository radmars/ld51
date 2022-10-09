import Phaser from 'phaser';

export default class TitleScreen extends Phaser.Scene {
  constructor() {
      super('TitleScreen');
  }

  preload() {
      this.load.image('titlescreen', 'assets/splash.png');
      this.load.audio('intro', ['assets/ld51-intro.m4a', 'assets/ld51-intro.ogg']);
  }

  create() {
      this.cameras.main.fadeIn(1000);
      this.add.image(400, 400, 'titlescreen');
      this.sound.play('intro', { volume: 0.5 });

      this.input.on('pointerdown', (pointer) => {
          this.cameras.main.fadeOut(1000);
          this.time.addEvent({
              delay: 1000,
              callback: () => {
                  this.sound.stopAll();
                  this.scene.start('Main');
              }
          })

      });
  }
}
