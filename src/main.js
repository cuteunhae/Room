/* global Phaser */

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create() {
    // 기획서 지도 좌표계: 가로 1000 × 세로 900.
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#222222',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1000,
    height: 900,
  },
  scene: [MainScene],
};

new Phaser.Game(config);
