/* global Phaser, PLACES, COLLISION, GameState, ITEMS, InteriorScene */

const PLAYER_SPEED = 120; // 초당 이동 거리. 이 값만 바꾸면 속도가 달라집니다.
const CAMERA_ZOOM = 2.5; // 2.5배 확대. 값이 클수록 캐릭터와 지도가 크게 보입니다.
const ENTRANCE_DISTANCE = 30; // 입구를 클릭해 들어갈 수 있는 거리(지도 픽셀).
const PLAYER_ROWS = { down: 0, left: 1, right: 2, up: 3 };
// 단축키를 바꿀 때는 이 객체만 수정합니다.
const SHORTCUTS = Object.freeze({
  inventory: 'I', collision: 'C',
  up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
});

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
    this.cursors = this.input.keyboard.addKeys({
      up: SHORTCUTS.up, down: SHORTCUTS.down,
      left: SHORTCUTS.left, right: SHORTCUTS.right,
    });
    this.createCollisionOverlay();
    this.input.keyboard.on(`keydown-${SHORTCUTS.collision}`, (event) => {
      if (!event.repeat) this.collisionOverlay.setVisible(!this.collisionOverlay.visible);
    });

    // 지도 밖이 보이지 않게 제한하고 캐릭터를 따라갑니다.
    const camera = this.cameras.main;
    camera.setBounds(0, 0, 1000, 900);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(this.player);

    this.dialogueOpen = false;
    this.inventoryOpen = false;
    this.scene.launch('DialogueScene');

    PLACES.filter((place) => place.entrance).forEach((place) => {
      const { x, y } = place.entrance;
      this.add.rectangle(x, y, 8, 8, 0x267dff)
        .setStrokeStyle(1, 0xffffff).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.enterBuilding(place));
    });

    // 시작점 오른쪽의 임시 조사 상자. 클릭 거리는 아직 제한하지 않습니다.
    const testBox = this.add.rectangle(540, 460, 16, 12, 0xa56a37)
      .setStrokeStyle(1, 0x58391f)
      .setInteractive({ useHandCursor: true });
    testBox.on('pointerdown', () => {
      if (this.dialogueOpen || this.inventoryOpen) return;
      const firstInvestigation = !GameState.get('testInvestigated');
      const message = firstInvestigation ? '테스트 아이템을 얻었다' : '이미 조사했다';
      if (firstInvestigation) GameState.addItem('ITM-TEST');
      GameState.set('testInvestigated', true);
      this.scene.get('DialogueScene').showDialogue(message);
    });
  }

  enterBuilding(place) {
    if (!place.entrance || this.dialogueOpen || this.inventoryOpen) return;
    const { x, y } = place.entrance;
    if (Math.hypot(this.player.x - x, this.player.y - y) > ENTRANCE_DISTANCE) return;
    this.player.anims.stop();
    this.input.keyboard.resetKeys();
    // 야외는 잠들게 해 조사 상자와 지도 상태를 그대로 보존합니다.
    this.scene.launch('InteriorScene', { placeId: place.id });
    this.scene.sleep();
  }

  update(_time, delta) {
    if (this.dialogueOpen || this.inventoryOpen) {
      this.player.anims.stop();
      this.player.setFrame(PLAYER_ROWS[this.facing] * 4 + 1);
      return;
    }
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

// 별도 화면용 장면: 지도의 카메라 확대·이동에 영향을 받지 않습니다.
class DialogueScene extends Phaser.Scene {
  constructor() {
    super('DialogueScene');
  }

  create() {
    this.worldSceneKey = 'MainScene';
    const width = this.scale.width;
    const height = this.scale.height;
    // 투명한 전체 화면 입력막으로 대사 뒤의 상자가 클릭되지 않게 합니다.
    const clickArea = this.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0, 0).setInteractive();
    const panel = this.add.rectangle(24, height - 164, width - 48, 140, 0x151921, 0.95)
      .setOrigin(0, 0).setStrokeStyle(2, 0xe9dfc8);
    this.dialogueText = this.add.text(48, height - 136, '', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff',
      wordWrap: { width: width - 96 },
    });
    this.dialogue = this.add.container(0, 0, [clickArea, panel, this.dialogueText])
      .setVisible(false);
    clickArea.on('pointerdown', (_pointer, _x, _y, event) => {
      event.stopPropagation();
      this.dialogue.setVisible(false);
      this.scene.get(this.worldSceneKey).dialogueOpen = false;
    });
    this.inventory = this.add.container(0, 0).setVisible(false);
    this.selectedItemId = null;
    this.input.keyboard.on(`keydown-${SHORTCUTS.inventory}`, (event) => {
      if (!event.repeat) this.toggleInventory();
    });
  }

  toggleInventory() {
    const main = this.scene.get(this.worldSceneKey);
    if (main.dialogueOpen) return;
    main.inventoryOpen = !main.inventoryOpen;
    if (main.inventoryOpen) {
      this.renderInventory();
      this.scene.bringToTop();
    }
    this.inventory.setVisible(main.inventoryOpen);
  }

  renderInventory() {
    this.inventory.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0, 0).setInteractive();
    // 빈 곳을 클릭해도 뒤의 조사 상자로 입력이 전달되지 않습니다.
    backdrop.on('pointerdown', (_p, _x, _y, event) => event.stopPropagation());
    const panel = this.add.rectangle(40, 100, width - 80, height - 200, 0x151921, 0.98)
      .setOrigin(0, 0).setStrokeStyle(2, 0xe9dfc8);
    const title = this.add.text(64, 126, `인벤토리 · ${SHORTCUTS.inventory} 키로 닫기`, {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff',
    });
    this.inventory.add([backdrop, panel, title]);
    const ids = GameState.get('inventory');
    if (ids.length === 0) {
      this.inventory.add(this.add.text(64, 200, '아직 가진 아이템이 없습니다.', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#c8c8c8',
      }));
    }
    // 현재 아이템 목록 전체를 담을 수 있도록 행 수에 맞춰 칸 높이를 조정합니다.
    const columns = 4;
    const cellWidth = (width - 128) / columns;
    const cellHeight = Math.min(150, (height - 330) / Math.max(1, Math.ceil(ids.length / columns)));
    ids.forEach((id, index) => {
      const x = 64 + index % columns * cellWidth;
      const y = 190 + Math.floor(index / columns) * cellHeight;
      const selected = this.selectedItemId === id;
      const slot = this.add.rectangle(x, y, cellWidth - 12, cellHeight - 12, 0x29313d)
        .setOrigin(0, 0).setStrokeStyle(selected ? 4 : 1, selected ? 0xffd166 : 0x788391)
        .setInteractive({ useHandCursor: true });
      const item = ITEMS.find((entry) => entry.id === id);
      const label = this.add.text(x + (cellWidth - 12) / 2, y + (cellHeight - 12) / 2, item.name, {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff',
        align: 'center', wordWrap: { width: cellWidth - 32 },
      }).setOrigin(0.5);
      slot.on('pointerdown', (_p, _x, _y, event) => {
        event.stopPropagation();
        this.selectedItemId = this.selectedItemId === id ? null : id;
        this.renderInventory();
      });
      this.inventory.add([slot, label]);
    });
  }

  showDialogue(message) {
    this.dialogueText.setText(message);
    this.scene.get(this.worldSceneKey).dialogueOpen = true;
    this.dialogue.setVisible(true);
    this.scene.bringToTop();
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
  scene: [MainScene, DialogueScene, InteriorScene],
};

new Phaser.Game(config);
