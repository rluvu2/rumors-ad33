/* ══════════════════════════════════════════
   cast.js — 고를 수 있는 주인공 표

   한 사람이 한 시나리오를 짊어집니다.
   START 를 누르면 이 표가 화면에 깔리고, 고른 사람이 그 회차의 눈이 됩니다.

   ★ 소개 글에는 «결말» 을 적지 않습니다.
     이 사람이 무엇을 보게 되는지, 무엇의 증인이 되는지는 열이틀 끝에서 드러날 몫입니다.
     여기에는 «지금 이 사람이 무엇을 지고 있는가» 만 적습니다 — 빚 · 좌판 · 값.
     그래야 플레이어가 결말을 향해 걸어가는 맛이 남습니다.

   name   — 이름
   role   — 직함 (카드에 적히는 글)
   sprite — 지금 쓰는 그림 열쇠 (js/assets.js 의 CHARS).
            전용 그림이 나오면 이 한 줄만 갈아 끼우면 됩니다
   start  — 첫 장면의 장소 (js/map.js 의 MAPS 열쇠). 없으면 lower 에서 시작합니다
   ready  — false 면 칸은 보이되 고를 수 없습니다 (다음 회차 자리)
   dist   — 예수와의 거리 ┐ 일곱 사람을 한 줄에 세우는 잣대입니다.
   knows  — 그가 아는 것  ┘ 아직 화면에 뜨지는 않고, 차례를 정하는 표로만 씁니다

   ── 그림 짝짓기 (assets/images/8_characters/protagonists_meta.json) ──
     요엘·아사프·닛시·롱기누스 넷은 전용 그림 p0~p3 이 있습니다.
     빌라도·베드로는 전용 그림이 없어 성경 인물 그림(b17·b05)을 그대로 빌려 씁니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  /* 아직 못 여는 사람의 카드에 뜨는 글.
     이름·직함은 카드에서 «???» 로 가려지므로(js/title.js), 여기서도 누구인지 밝히지 않습니다 —
     명단은 아래 표에 적어 두되 플레이어에게는 차례가 와야 열립니다 */
  const SOON = '아직 성 안 어딘가에서 제 일을 하고 있다.';

  const CAST = [
    {
      id: 'joel', name: '요엘', role: '아이', age: null, tag: '첫 번째 이야기',
      sprite: 'p0_joel', start: null,
      dist: '군중 속에서 1.5초 눈이 마주침',
      knows: '이름도 모른다',
      line: SOON, brief: '',
      span: '준비 중', ready: false
    },
    {
      id: 'asaph',
      name: '아삽 벤 요아스',
      role: '성전 제물 상인',
      age: 34,
      tag: '두 번째 이야기',
      /* 전용 그림 p1_asaph — 그전에는 환전상 그림(g13_money_changer)을 빌려 썼습니다 */
      sprite: 'p1_asaph',
      start: 'temple',
      dist: '좌판 너머, 원한의 거리',
      knows: '이름과 원한',
      line: '성전을 믿지 않는다. 다만 안다.',
      brief: '3대째 이방인의 뜰에서 제물을 파는 장사꾼. 흠 없는 짐승만 값이 되고, 그 값은 소문보다 늘 늦게 움직인다.\n'
           + '아버지가 남긴 조합 빚 4,200 세겔이 그의 몫이다. 유월절 대목의 값을 잘못 읽으면 좌판이 넘어간다.',
      /* 날짜는 js/clock.js 가 숫자로 셈합니다 — 1일차 = 유월절 D-8 · 목요일 */
      span: '유월절 D-8 목요일부터 열이틀 (D+3 월요일까지)',
      ready: true
    },
    {
      id: 'nitssi', name: '닛시', role: '성전 경비병', age: null, tag: '세 번째 이야기',
      sprite: 'p2_nitssi', start: null,
      dist: '체포하는 손 · 무덤을 지킴',
      knows: '죄수 번호로 안다',
      line: SOON, brief: '',
      span: '준비 중', ready: false
    },
    {
      id: 'longinus', name: '롱기누스', role: '로마 군인', age: null, tag: '네 번째 이야기',
      sprite: 'p3_longinus', start: null,
      dist: '몇 달째 미행 · 감시 보고서 작성',
      knows: '행적 전부. 의미는 모름',
      line: SOON, brief: '',
      span: '준비 중', ready: false
    },
    {
      id: 'pilate', name: '빌라도', role: '로마 총독', age: null, tag: '다섯 번째 이야기',
      /* 전용 그림 없음 — 성경 인물 그림을 그대로 빌려 씁니다 */
      sprite: 'b17_pontius_pilate', start: null,
      dist: '마주 앉아 심문 · 판결',
      knows: '얼굴을 마주보고도 «진리가 무엇이냐»',
      line: SOON, brief: '',
      span: '준비 중', ready: false
    },
    {
      id: 'peter', name: '베드로', role: '사도', age: null, tag: '여섯 번째 이야기',
      /* 전용 그림 없음 — 성경 인물 그림을 그대로 빌려 씁니다 */
      sprite: 'b05_peter', start: null,
      dist: '3년 동행 · 그리고 부인',
      knows: '전부 알고도 모른다 한다',
      line: SOON, brief: '',
      span: '준비 중', ready: false
    },
    {
      id: 'todo7', name: '???', role: '다음 사람', age: null, tag: '일곱 번째 이야기',
      sprite: null, start: null,
      dist: null, knows: null,
      line: SOON, brief: '',
      span: '준비 중', ready: false
    }
  ];

  const all = () => CAST;
  const byId = id => CAST.find(c => c.id === id) || null;
  const first = () => CAST.find(c => c.ready) || CAST[0];
  /* 시작 화면이 떠 있는 동안 미리 받아 둘 그림들 */
  const sprites = () => CAST.filter(c => c.ready && c.sprite).map(c => c.sprite);

  NS.Cast = { all, byId, first, sprites };
})();
