/* global Phaser, PLACES, COLLISION */

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

    // 기존 (500, 450)은 건물 안이므로 바로 오른쪽 빈 공간에서 시작합니다.
    this.player = this.add.sprite(510, 450, 'player', 1);
    this.player.setOrigin(0.5, 0.97).setScale(42 / 256);
    this.facing = 'down';
    this.cursors = this.input.keyboard.createCursorKeys();
    this.createCollisionOverlay();
    this.input.keyboard.on('keydown-C', (event) => {
      if (!event.repeat) this.collisionOverlay.setVisible(!this.collisionOverlay.visible);
    });

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
    // 작은 간격으로 나눠 검사해 얇은 장애물을 뛰어넘지 않게 합니다.
    const steps = Math.max(1, Math.ceil(distance / COLLISION.footRadius));
    const stepX = dx / length * distance / steps;
    const stepY = dy / length * distance / steps;
    for (let i = 0; i < steps; i += 1) {
      // 축별로 검사하면 벽을 향해 비스듬히 걸을 때 벽을 따라 이동합니다.
      if (!this.isBlocked(player.x + stepX, player.y)) player.x += stepX;
      if (!this.isBlocked(player.x, player.y + stepY)) player.y += stepY;
    }

    // 대각선 입력에서는 위/아래 방향의 모습을 우선합니다.
    this.facing = dy !== 0 ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
    player.play(`walk-${this.facing}`, true);
  }

  isBlocked(x, y, radius = COLLISION.footRadius) {
    const points = COLLISION.island;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[j];
      const [bx, by] = points[i];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) {
        inside = !inside;
      }
      const vx = bx - ax;
      const vy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
      if (Math.hypot(x - ax - t * vx, y - ay - t * vy) <= radius) return true;
    }
    if (!inside) return true;
    return COLLISION.buildings.some((rect) => {
      const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
      const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
      return Math.hypot(x - nearestX, y - nearestY) <= radius;
    });
  }

  createCollisionOverlay() {
    const overlay = this.add.graphics().setDepth(10).setVisible(false);
    overlay.fillStyle(0xff0000, 0.35);
    // 해안 다각형을 가로줄로 잘라 바다 부분만 표시합니다.
    for (let y = 0; y < COLLISION.height; y += 1) {
      const crossings = [0, COLLISION.width];
      const points = COLLISION.island;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[j];
        const [bx, by] = points[i];
        if ((ay > y + 0.5) !== (by > y + 0.5)) {
          crossings.push(ax + (bx - ax) * (y + 0.5 - ay) / (by - ay));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i < crossings.length; i += 2) {
        overlay.fillRect(crossings[i], y, crossings[i + 1] - crossings[i], 1);
      }
    }
    COLLISION.buildings.forEach(({ x, y, width, height }) => overlay.fillRect(x, y, width, height));
    this.collisionOverlay = overlay;
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
