export { devMode };

import Phaser from 'phaser';
import config from './config';
import RadmarsScreen from './scenes/RadmarsScreen';
import TitleScreen from './scenes/TitleScreen';
import { Main } from './scenes/Main';

const urlParams = new URLSearchParams(window.location.search);
const devMode = urlParams.get('dev') === 'true' ? true : false;

let scenes;
if (devMode) {
  scenes = [Main];
} else {
  scenes = [RadmarsScreen, TitleScreen, Main];
}

new Phaser.Game(
  Object.assign(config, {
    scene: scenes,
  })
);
