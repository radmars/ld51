import Phaser from 'phaser';
import config from './config';
import RadmarsScreen from './scenes/RadmarsScreen';
import TitleScreen from './scenes/TitleScreen';
import Main from './scenes/Main';

new Phaser.Game(
  Object.assign(config, {
    scene: [RadmarsScreen, TitleScreen, Main],
  })
);
