/* global ITEMS */
// 진행 상태는 이 파일에서만 보관합니다. 새로고침하면 초기화됩니다.
const GameState = (() => {
  const state = {
    photoCollected: false,
    schoolDeskDiscovered: false,
    noticeBookCollected: false, // 학교 알림장
    crayonCollected: false,
    registrySolved: false,
    carouselSolved: false,
    balloonCollected: false,
    swingUsed: false,
    seesawUsed: false,
    slideUsed: false,
    bubbleToyCollected: false,
    bearCollected: false,
    cabinetSolved: false,
    bedroomUnlocked: false,
    diaryDiscovered: false, // 집 일기장
    endingCompleted: false,
    testInvestigated: false, // 임시 상자 조사 여부
    inventory: [], // 가진 아이템 ID 목록. 수량 제한과 버리기 기능은 없습니다.
  };

  function get(key) {
    if (!Object.hasOwn(state, key)) throw new Error(`알 수 없는 상태: ${key}`);
    // 복사본을 돌려줘 외부에서 배열을 직접 바꾸지 못하게 합니다.
    return key === 'inventory' ? [...state.inventory] : state[key];
  }

  function set(key, value) {
    if (!Object.hasOwn(state, key)) throw new Error(`알 수 없는 상태: ${key}`);
    if (key === 'inventory') throw new Error('아이템은 addItem()으로 추가해 주세요.');
    if (typeof value !== 'boolean') throw new TypeError('진행 상태에는 true 또는 false를 넣어 주세요.');
    state[key] = value;
  }

  function hasItem(id) {
    return state.inventory.includes(id);
  }

  function addItem(id) {
    if (!ITEMS.some((item) => item.id === id)) throw new Error(`알 수 없는 아이템: ${id}`);
    if (hasItem(id)) return;
    state.inventory.push(id);
  }

  return Object.freeze({ get, set, addItem, hasItem });
})();
