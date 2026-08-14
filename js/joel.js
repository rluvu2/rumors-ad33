/* ══════════════════════════════════════════
   joel.js — 0번 이야기 «요엘» 의 하루 (튜토리얼)

   니산월 9일 · 종려주일. 아홉 살짜리의 심부름 하나로 열 가지 조작을 가르칩니다.
   아사프의 첫날과 같은 날이고, 두 사람은 성문 앞에서 실제로 스칩니다.

   이 파일이 맡는 것은 넷입니다.

     ① 가지 채집   성벽 밖 종려나무에서 가지를 꺾습니다 (js/map.js 의 pick).
                   높은 가지 하나는 손이 안 닿아 돌을 주워 던져야 합니다 — 이 하루의 유일한 퍼즐
     ② 만난 사람   여섯 칸짜리 요엘의 수첩. «가지를 받았나» 가 아니라 «나를 봤나» 를 적습니다.
                   가지를 안 받아도 채워집니다 — 실패할 수 있는 구간이 하나도 없습니다
     ③ 호산나      노인에게 뜻을 배우기 «전까지» 는 외칠 수 없습니다.
                   뜻을 아는 것이 곧 조작 해금입니다. 튜토리얼과 주제가 같은 자리에서 만납니다
     ④ 엔딩        수첩을 펼치고 잠듭니다. 그 화면이 그대로 인물 고르기로 이어집니다

   연출 원칙(기획안 1절) — 죽음·정치·돈은 한 줄도 나오지 않습니다. 아이의 눈에는 안 보이는 것들입니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  const ID = 'joel';                       // js/cast.js 의 인물 id
  const BRANCH = 5;                        // 어머니가 시킨 가지 수
  const SHOUT = 6;                         // 박에 맞춰 몇 번을 외쳐야 목이 트이나

  /* ── 만난 사람 수첩 ──
     요엘이 붙인 이름과, 요엘이 적은 한 줄입니다.
     여섯 줄 전부 아이 말투로만 씁니다 — 어른의 감상을 한 글자도 섞지 않습니다.
     ③④⑥ 이 굵게 남는 이유는 그 셋이 «나를 봤나» 에 답하기 때문입니다 */
  const SHEET = {
    1: { name: '짐승 파는 아저씨', line: '가지 안 받았다. 바쁘대.' },
    2: { name: '문 지키는 아저씨', line: '맨날 뛰지 말래. 근데 가지는 받았다.' },
    3: { name: '글씨 쓰는 군인',   line: '나를 안 봤다.', keep: true },
    4: { name: '제일 높은 사람',   line: '창 든 사람들이 못 가게 했다.', keep: true },
    5: { name: '제일 큰 아저씨',   line: '내가 떨어뜨린 가지 주워서 같이 흔들었다.' },
    6: { name: '나귀 탄 사람',     line: '나를 봤다.', keep: true },
    /* [선택] 그냥 지나쳐도 무방한 셋 — 만나면 뒷줄에 붙습니다 */
    7: { name: '먼 데서 온 아저씨', line: '짐이 엄청 무겁대.', side: true },
    8: { name: '손 없는 아주머니',  line: '손이 없어서 짐 위에 얹어줬다.', side: true },
    9: { name: '양 세는 아저씨',    line: '양이 스물셋이래. 내가 세보니까 스물넷이던데.', side: true }
  };
  const CORE = [1, 2, 3, 4, 5, 6];         // 여섯 칸이 본줄입니다

  /* 새로 배운 말 — 수첩 뒷장 한 칸. 최종장에서 다시 펼쳐집니다 */
  const WORD = {
    w: '호산나',
    a: '큰일 났을 때 살려달라는 말.',
    b: '근데 지금 큰일 안 난 것 같은데.'
  };

  let on = false;                          // 지금 요엘의 회차인가
  let branch = 0, stone = 0, heard = 0, shouts = 0;
  let word = false, shoutOn = false, seen = false;
  const met = new Set();                   // 만난 사람 (SHEET 의 열쇠)
  const picked = new Map();                // 나무마다 몇 개나 꺾었나
  const murmured = new Set();              // 골목에서 이미 들은 말
  let el = null, ending = false, endT = 0;

  const isRun = () => on;

  function init(els) {
    el = els || {};
    if (el.endGo) el.endGo.addEventListener('click', closeEnd);
  }

  /* 게임이 열릴 때 — 요엘의 회차면 가지와 수첩을 새로 깝니다 */
  function begin(castId) {
    on = castId === ID;
    branch = 0; stone = 0; heard = 0; shouts = 0;
    word = false; shoutOn = false; seen = false; ending = false; endT = 0;
    met.clear(); picked.clear(); murmured.clear(); reveal.length = 0;
    beat.live = false; beat.t = 0; beat.off = 0;
    beat.combo = 0; beat.best = 0; beat.hit = 0; beat.miss = 0; beat.lock = 0;
    if (el.book) el.book.classList.toggle('is-joel', on);
    if (el.tab) el.tab.classList.toggle('is-off', !on);
    paintSheet();
    paintShout();
  }

  /* ══════════════════════════════════════════
     ① 가지 채집 — 성벽 밖 종려나무

     낮은 가지는 그냥 꺾입니다. 높은 가지 하나는 손이 안 닿아,
     돌무더기에서 돌을 하나 주워 와야 떨어집니다 (20초짜리 유일한 퍼즐).
     다섯 개를 다 못 채워도 하루는 그대로 굴러갑니다 — 나눠 줄 사람 수만 줄어듭니다
     ══════════════════════════════════════════ */
  const canPick = o => on && !!o && (o.pick > 0 || o.stone);

  /* 돌려주는 값이 곧 대사창에 뜨는 글월입니다 (없으면 여느 살펴보기로 넘어갑니다) */
  function pick(o) {
    if (!on || !o) return null;

    if (o.stone) {                                    // 돌무더기
      if (stone > 0) return { who: '돌무더기', lines: ['돌은 이미 하나 쥐고 있다.'] };
      stone = 1;
      return { who: '돌무더기', lines: ['주먹만 한 돌을 하나 주웠다.'] };
    }
    if (!o.pick) return null;

    const got = picked.get(o) || 0;
    if (got >= o.pick) return { who: '종려나무', lines: ['이 나무에서 꺾을 만한 가지는 다 꺾었다.'] };

    if (o.high) {                                     // 안 닿는 가지 — 돌이 있어야 한다
      if (!stone) return { who: '종려나무',
        lines: ['가지가 높다. 발끝을 세워도 손이 안 닿는다.', '무언가 던져서 떨어뜨려야 할 것 같다.'] };
      stone = 0;
      picked.set(o, got + 1);
      return { got: ++branch, who: '종려나무',
        lines: ['돌을 던졌다. 가지가 툭 떨어진다.', `종려 가지 ${branch}개.`] };
    }
    picked.set(o, got + 1);
    return { got: ++branch, who: '종려나무', lines: [`가지를 하나 꺾었다. 종려 가지 ${branch}개.`] };
  }

  /* ══════════════════════════════════════════
     ② 만난 사람 — 여섯 칸짜리 수첩

     가지를 받았는지는 «판정하지 않습니다». 만나기만 하면 채워집니다.
     아이가 적은 건 «누가 가지를 받았나» 가 아니라 «누가 나를 봤나» 입니다
     ══════════════════════════════════════════ */
  function meet(no) {
    if (!on || !no || !SHEET[no] || met.has(no)) return false;
    met.add(no);
    paintSheet();
    return true;
  }
  /* 말을 건 사람이 수첩에 오를 사람인가 — main.js 가 대사 뒤에 부릅니다.

     만나고 나면 머리 위 이름표가 진짜 이름으로 바뀝니다 —
     «글씨 쓰는 군인» 이 «롱기누스» 가 되는 식입니다. 아이는 이름을 못 들었지만
     플레이어는 이제 압니다. 수첩에는 아이가 붙인 이름 그대로 남습니다.
     ⑥ 나귀 탄 사람만은 끝까지 이름이 없습니다 — 요엘은 «이름도 모른다» 가 그 사람의 자리입니다 */
  function meetNpc(npc) {
    if (!on || !npc) return false;
    if (npc.real) npc.name = npc.real;
    if (npc.reveals) reveal.push(npc.reveals);       // 병사를 만나면 그 뒤의 빌라도 이름이 드러납니다
    return npc.meet ? meet(npc.meet) : false;
  }
  /* 이름이 드러나기를 기다리는 사람들 — main.js 가 판마다 훑어 갈아 끼웁니다 */
  const reveal = [];
  function applyReveal(npcs) {
    if (!on || !reveal.length || !npcs) return;
    for (const n of npcs) {
      const i = reveal.indexOf(n.id);
      if (i < 0) continue;
      if (n.real) n.name = n.real;
      reveal.splice(i, 1);
    }
  }

  const metCount = () => CORE.filter(n => met.has(n)).length;

  function paintSheet() {
    if (!el.sheet) return;
    if (el.count) el.count.textContent = `${metCount()}/${CORE.length}`;
    if (!on) {
      el.sheet.innerHTML = '<li class="met__none">요엘의 하루에서만 쓰는 수첩입니다.</li>';
      return;
    }
    el.sheet.innerHTML = '';
    for (const no of [...CORE, 7, 8, 9]) {
      const s = SHEET[no];
      if (s.side && !met.has(no)) continue;           // 선택 셋은 만났을 때만 줄이 생깁니다
      const li = document.createElement('li');
      const has = met.has(no);
      li.className = (has ? 'is-met' : '') + (s.side ? ' is-side' : '') + (has && s.keep ? ' is-keep' : '');
      const b = document.createElement('b');
      b.textContent = has ? s.name : '아직 못 만났다';
      li.appendChild(b);
      const p = document.createElement('span');
      p.textContent = has ? s.line : '';
      li.appendChild(p);
      el.sheet.appendChild(li);
    }
    /* 새로 배운 말 — 뒷장 한 칸 */
    if (word) {
      const li = document.createElement('li');
      li.className = 'is-word';
      const b = document.createElement('b');
      b.textContent = WORD.w;
      li.appendChild(b);
      const p = document.createElement('span');
      p.textContent = WORD.a + '\n' + WORD.b;
      li.appendChild(p);
      el.sheet.appendChild(li);
    }
  }

  /* ══════════════════════════════════════════
     ③ 골목에 도는 말 · 호산나
     ══════════════════════════════════════════ */
  /* 지나가며 들린다 — 대사창을 열지 않습니다. 소문 수첩도 열리지 않습니다.
     시스템이 있다는 사실조차 알려 주지 않는 것이 이 장면의 몫입니다 */
  function overhear(npc) {
    if (!on || !npc || !npc.murmur || murmured.has(npc.id)) return false;
    murmured.add(npc.id);
    heard++;
    return true;
  }
  const heardCount = () => heard;

  /* 노인에게 뜻을 배웠다 — 이 순간에 외치기가 열립니다 */
  function learnWord() {
    if (!on || word) return false;
    word = true; shoutOn = true;
    paintSheet(); paintShout();
    return true;
  }
  const canShout = () => on && shoutOn;
  const shoutCount = () => shouts;

  /* ══════════════════════════════════════════
     ③-b 함께 외치기 — 박자 판

     대로에 모인 사람들이 BEAT 초마다 «호산나!» 를 함께 터뜨립니다.
     그 박에 맞춰 누르면 «같이 외친» 것으로 칩니다.

     실패 판정은 없습니다(기획안 1절). 빗맞아도 잃는 것이 없고,
     세 번 빗맞으면 군중이 한 번 메워 줍니다. 오래 서 있기만 해도 결국 채워집니다 —
     아홉 살짜리가 목청껏 외치는 장면에서 «틀렸습니다» 가 뜰 수는 없으니까요
     ══════════════════════════════════════════ */
  const BEAT = 0.86;                       // 한 박
  const WINDOW = 0.15;                     // 이 안에 누르면 «맞춰 외쳤다» (한 박의 3분의 1쯤)
  const LOCK = 0.34;                       // 한 번 누른 뒤 이만큼은 안 받습니다 — 마구 눌러서는 안 됩니다
  const beat = { t: 0, off: 0, combo: 0, best: 0, live: false,
                 hit: 0, miss: 0, lock: 0 };

  const beatOn = () => on && beat.live;
  /* 0~1 — 지금 박의 어디쯤인가. 0 이 박의 한복판입니다 (화면의 박자 판이 씁니다) */
  const beatPhase = () => (beat.t % BEAT) / BEAT;
  /* 방금 박이 터졌나 — 군중의 «호산나!» 를 띄울 때 씁니다 */
  const beatPulse = () => Math.max(0, 1 - (beat.t % BEAT) / 0.3);

  const startBeat = () => { if (on && !beat.live) { beat.live = true; beat.t = 0; beat.n = 0; } };
  const stopBeat = () => { beat.live = false; };

  /* 루프마다. 박이 넘어가는 순간을 알려 줍니다 (군중이 그때 외칩니다) */
  function beatTick(dt) {
    if (!beatOn()) return false;
    const was = Math.floor(beat.t / BEAT);
    beat.t += dt;
    if (beat.hit > 0) beat.hit -= dt;
    if (beat.miss > 0) beat.miss -= dt;
    if (beat.lock > 0) beat.lock -= dt;
    return Math.floor(beat.t / BEAT) !== was;
  }

  /* 박에서 얼마나 벗어났나 (초) */
  function offBeat() {
    const p = beat.t % BEAT;
    return Math.min(p, BEAT - p);
  }

  /* 눌렀다 — 'hit'(맞춰 외쳤다) · 'off'(빗나갔다, 한 번 더) · null(아직 못 외치거나 손이 덜 떨어졌다)

     빗나가면 아무것도 오르지 않습니다. 잃는 것도 없으니 그냥 한 번 더 외치면 됩니다.
     한 번 누른 뒤 LOCK 동안은 받지 않으므로 마구 두드려서는 채워지지 않습니다 */
  function shout() {
    if (!canShout()) return null;
    if (!beat.live) startBeat();
    if (beat.lock > 0) return null;                // 아직 손이 덜 떨어졌다
    beat.lock = LOCK;
    if (offBeat() <= WINDOW) {
      beat.combo++;
      beat.best = Math.max(beat.best, beat.combo);
      beat.hit = 0.34; beat.miss = 0;
      shouts++;
      paintShout();
      return 'hit';
    }
    beat.combo = 0;
    beat.off++;
    beat.miss = 0.34; beat.hit = 0;
    return 'off';
  }

  function paintShout() {
    if (!el.shout) return;
    el.shout.classList.toggle('is-on', canShout() && !ending);
  }

  /* ══════════════════════════════════════════
     ④ 그 사람이 지나가며 본다 — 1.5초

     줌인도 음악 정지도 슬로우도 없습니다. 군중 소음 그대로,
     그냥 잠깐 시선이 맞습니다. 아이 입장에선 대단한 일이 아닙니다
     ══════════════════════════════════════════ */
  function look() {
    if (!on || seen) return false;
    seen = true;
    meet(6);
    return true;
  }
  const wasSeen = () => seen;

  /* ══════════════════════════════════════════
     ⑤ 엔딩 — 수첩을 펼치고 잠든다
     ══════════════════════════════════════════ */
  const END_SAY = [
    { w: '요엘',   t: '엄마, 그 사람이 나 봤어.' },
    { w: '어머니', t: '그래, 그랬겠지.' },
    { w: '요엘',   t: '아니 진짜로 봤어.' }
  ];

  /* ── 수첩을 브라우저에 남긴다 ──
     기획안 5절 «수첩의 최종 용도» — 이 여섯 줄이 다음에 열리는 인물 고르기 화면의 부제가 됩니다.
     요엘을 건너뛴 사람에게는 아무것도 남지 않고, 화면은 실명만으로 여느 때처럼 돕니다 */
  const SAVE = 'jr.joel.sheet';
  function keep() {
    try { localStorage.setItem(SAVE, JSON.stringify([...met])); } catch (e) { /* 못 적어도 그만 */ }
  }
  function saved() {
    try {
      const v = JSON.parse(localStorage.getItem(SAVE));
      return Array.isArray(v) ? v : null;
    } catch (e) { return null; }
  }
  /* 인물 고르기 화면이 묻습니다 — «이 칸에 요엘이 붙인 이름이 있나» */
  function subtitleFor(no) {
    const v = saved();
    if (!v || !v.includes(no) || !SHEET[no]) return null;
    return { name: SHEET[no].name, line: SHEET[no].line };
  }

  function openEnd() {
    if (!on || ending || !el.end) return;
    ending = true; endT = 0;
    keep();
    paintShout();
    if (el.endSay) {
      el.endSay.innerHTML = '';
      for (const s of END_SAY) {
        const p = document.createElement('p');
        const b = document.createElement('b');
        b.textContent = s.w;
        p.appendChild(b);
        p.appendChild(document.createTextNode(s.t));
        el.endSay.appendChild(p);
      }
    }
    if (el.endSheet) {
      el.endSheet.innerHTML = '';
      for (const no of CORE) {
        const s = SHEET[no];
        const li = document.createElement('li');
        li.className = met.has(no) ? 'is-met' : '';
        const b = document.createElement('b');
        b.textContent = met.has(no) ? s.name : '—';
        li.appendChild(b);
        const p = document.createElement('span');
        p.textContent = met.has(no) ? s.line : '';
        li.appendChild(p);
        el.endSheet.appendChild(li);
      }
    }
    if (el.endWord) el.endWord.classList.toggle('is-on', word);
    el.end.classList.add('is-on');
  }
  const isEnd = () => ending;

  /* 닫으면 인물 고르기 화면으로 — 수첩 여섯 칸이 그대로 그 화면이 됩니다 */
  let onClose = null;
  function closeEnd() {
    if (!ending) return;
    ending = false;
    if (el.end) el.end.classList.remove('is-on');
    if (onClose) onClose();
  }

  NS.Joel = {
    ID, BRANCH, SHOUT, SHEET, WORD, CORE,
    init, begin, isRun,
    canPick, pick, branches: () => branch, hasStone: () => stone > 0,
    meet, meetNpc, applyReveal, met: () => met, metCount, paintSheet,
    overhear, heardCount,
    learnWord, canShout, shout, shoutCount, knowsWord: () => word,
    /* 박자 판 */
    BEAT, startBeat, stopBeat, beatTick, beatOn, beatPhase, beatPulse,
    combo: () => beat.combo, bestCombo: () => beat.best, misses: () => beat.off,
    hitGlow: () => beat.hit, missGlow: () => beat.miss,
    look, wasSeen,
    openEnd, closeEnd, isEnd, saved, subtitleFor,
    onEnd: fn => { onClose = fn; }
  };
})();
