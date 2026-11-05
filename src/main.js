/* global Phaser, PLACES */

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('city-map', './에셋/city-of-light/assets/city-map.png');
  }

  create() {
    // 왼쪽 위를 기준으로 원본 크기(1000 × 900)의 지도를 배치합니다.
    this.add.image(0, 0, 'city-map').setOrigin(0, 0);

    // 임시 확인용 점: 나중에 이 반복문을 지우면 점만 제거됩니다.
    PLACES.forEach(({ x, y }) => {
      this.add.circle(x, y, 4, 0xff0000);
    });
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
