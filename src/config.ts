import Phaser from 'phaser';
import { constants } from './constants';

export default {
  type: Phaser.AUTO,
  width: constants.width,
  height: constants.height,
  physics: {
    default: 'arcade',
  },
};
