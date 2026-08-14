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
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  const CAST = [
    {
      id: 'asaph',
      name: '아삽 벤 요아스',
      role: '성전 제물 상인',
      age: 34,
      tag: '첫 번째 이야기',
      /* 제물 상인 전용 그림이 아직 없어 성전 뜰 상거래 계열인 환전상 그림을 빌려 씁니다 */
      sprite: 'g13_money_changer',
      start: 'temple',
      line: '성전을 믿지 않는다. 다만 안다.',
      brief: '3대째 이방인의 뜰에서 제물을 파는 장사꾼. 흠 없는 짐승만 값이 되고, 그 값은 소문보다 늘 늦게 움직인다.\n'
           + '아버지가 남긴 조합 빚 4,200 세겔이 그의 몫이다. 유월절 대목의 값을 잘못 읽으면 좌판이 넘어간다.',
      /* 날짜는 js/clock.js 가 숫자로 셈합니다 — 1일차 = 유월절 D-8 · 목요일 */
      span: '유월절 D-8 목요일부터 열이틀 (D+3 월요일까지)',
      ready: true
    },
    {
      id: 'todo2', name: '???', role: '다음 사람', age: null, tag: '두 번째 이야기',
      sprite: null, start: null,
      line: '아직 성 안 어딘가에서 제 일을 하고 있다.',
      brief: '아삽의 열이틀이 끝나는 자리에서 다음 이야기가 시작됩니다.',
      span: '준비 중', ready: false
    },
    {
      id: 'todo3', name: '???', role: '다음 사람', age: null, tag: '세 번째 이야기',
      sprite: null, start: null,
      line: '아직 성 안 어딘가에서 제 일을 하고 있다.',
      brief: '',
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
