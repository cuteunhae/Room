/* global Phaser, PLACES, SHORTCUTS, MainScene, PLAYER_ROWS */

// 사진관·학교·집은 같은 임시 방 장면을 사용하고 이름만 바꿉니다.
class InteriorScene extends Phaser.Scene {
  constructor() {
    super('InteriorScene');
  }

  init({ placeId }) {
    this.place = PLACES.find((place) => place.id === placeId && place.entrance);
  }

  create() {
    this.cameras.main.setBackgroundColor('#151921');
    this.add.rectangle(100, 120, 800, 680, 0x6b665c)
      .setOrigin(0, 0).setStrokeStyle(4, 0xd8ccb3);
    this.add.text(500, 60, this.place.name, {
      fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff',
    }).setOrigin(0.5);

    this.player = this.add.sprite(500, 700, 'player', 13);
    this.player.setOrigin(0.5, 0.97).setScale(42 / 256);
    this.facing = 'up';
    this.dialogueOpen = false;
    this.inventoryOpen = false;
    this.cursors = this.input.keyboard.addKeys({
      up: SHORTCUTS.up, down: SHORTCUTS.down,
      left: SHORTCUTS.left, right: SHORTCUTS.right,
    });

    this.add.rectangle(500, 770, 40, 24, 0x3cce78)
      .setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.leaveBuilding());
    this.add.text(500, 830, '초록색 출구를 클릭하면 밖으로 나갑니다.', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const ui = this.scene.get('DialogueScene');
    ui.worldSceneKey = 'InteriorScene';
    this.scene.bringToTop('DialogueScene');
  }

  update(time, delta) {
    // 야외와 동일한 속도·대각선 보정·걷기·인벤토리 이동 잠금을 사용합니다.
    MainScene.prototype.update.call(this, time, delta);
  }

  isBlocked(x, y) {
    // 방에서는 캐릭터 이미지 전체가 벽 안에 머물도록 제한합니다.
    const player = this.player;
    return x < 100 + player.displayWidth * player.originX
      || x > 900 - player.displayWidth * (1 - player.originX)
      || y < 120 + player.displayHeight * player.originY
      || y > 800 - player.displayHeight * (1 - player.originY);
  }

  leaveBuilding() {
    if (this.dialogueOpen || this.inventoryOpen) return;
    const outdoor = this.scene.get('MainScene');
    const { x, y } = this.place.entrance;
    outdoor.player.setPosition(x, y + 12);
    outdoor.facing = 'down';
    outdoor.player.anims.stop();
    outdoor.player.setFrame(PLAYER_ROWS.down * 4 + 1);
    outdoor.input.keyboard.resetKeys();
    this.input.keyboard.resetKeys();
    this.scene.get('DialogueScene').worldSceneKey = 'MainScene';
    this.scene.wake('MainScene');
    this.scene.bringToTop('DialogueScene');
    this.scene.stop();
  }
}
