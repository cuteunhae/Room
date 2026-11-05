/* global Phaser, PLACES */

const PLAYER_SPEED = 120; // 초당 이동 거리. 이 값만 바꾸면 속도가 달라집니다.
const CAMERA_ZOOM = 2.5; // 2.5배 확대. 값이 클수록 캐릭터와 지도가 크게 보입니다.
const PLAYER_ROWS = { down: 0, left: 1, right: 2, up: 3 };

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('city-map', './에셋/city-of-light/assets/city-map.png');
    this.load.spritesheet('player', './에셋/city-of-light/assets/player-walk.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
  }

  create() {
    // 왼쪽 위를 기준으로 원본 크기(1000 × 900)의 지도를 배치합니다.
    this.add.image(0, 0, 'city-map').setOrigin(0, 0);

    // 임시 확인용 점: 나중에 이 반복문을 지우면 점만 제거됩니다.
    PLACES.forEach(({ x, y }) => {
      this.add.circle(x, y, 4, 0xff0000);
    });

    Object.entries(PLAYER_ROWS).forEach(([direction, row]) => {
      this.anims.create({
        key: `walk-${direction}`,
        frames: this.anims.generateFrameNumbers('player', {
          start: row * 4,
          end: row * 4 + 3,
        }),
        frameRate: 7,
        repeat: -1,
      });
    });

    this.player = this.add.sprite(500, 450, 'player', 1);
    this.player.setOrigin(0.5, 0.97).setScale(42 / 256);
    this.facing = 'down';
    this.cursors = this.input.keyboard.createCursorKeys();

    // 지도 밖이 보이지 않게 제한하고 캐릭터를 따라갑니다.
    const camera = this.cameras.main;
    camera.setBounds(0, 0, 1000, 900);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(this.player);
  }

  update(_time, delta) {
    const dx = Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);
    const dy = Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown);
    const length = Math.hypot(dx, dy);

    if (length === 0) {
      this.player.anims.stop();
      this.player.setFrame(PLAYER_ROWS[this.facing] * 4 + 1);
      return;
    }

    // 대각선도 이동 길이를 1로 맞추고, 경과 시간에 따라 이동합니다.
    const distance = PLAYER_SPEED * delta / 1000;
    const player = this.player;
    player.x = Phaser.Math.Clamp(
      player.x + dx / length * distance,
      player.displayWidth * player.originX,
      this.scale.width - player.displayWidth * (1 - player.originX),
    );
    player.y = Phaser.Math.Clamp(
      player.y + dy / length * distance,
      player.displayHeight * player.originY,
      this.scale.height - player.displayHeight * (1 - player.originY),
    );

    // 대각선 입력에서는 위/아래 방향의 모습을 우선합니다.
    this.facing = dy !== 0 ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
    player.play(`walk-${this.facing}`, true);
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
