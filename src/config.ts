import Phaser from 'phaser';
import { Global } from './constants';

export default {
  type: Phaser.AUTO,
  width: Global.width,
  height: Global.height,
  physics: {
    default: 'arcade',
  },
};
