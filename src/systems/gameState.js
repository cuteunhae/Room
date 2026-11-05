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
  };

  function get(key) {
    if (!Object.hasOwn(state, key)) throw new Error(`알 수 없는 상태: ${key}`);
    return state[key];
  }

  function set(key, value) {
    if (!Object.hasOwn(state, key)) throw new Error(`알 수 없는 상태: ${key}`);
    if (typeof value !== 'boolean') throw new TypeError('진행 상태에는 true 또는 false를 넣어 주세요.');
    state[key] = value;
  }

  return Object.freeze({ get, set });
})();
