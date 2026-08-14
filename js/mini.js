/* ══════════════════════════════════════════
   mini.js — 작은 판 · «흠 검사»

   레위기 22:20-25 — 제물은 흠 없는 것이어야 합니다.

   ① 먼저 «눈으로» 봅니다.
      짐승 그림을 여섯 배로 키워 놓고, 흠이 있는 부위에는 **픽셀 한 점**을 상처로 찍습니다.
      눈에 낀 백태는 검은 눈동자가 뿌옇게 뜨고, 부러진 뿔은 밝은 살결이 드러나는 식으로
      그 자리 본래 색과 반대쪽 색을 씁니다(MARKS). 자세히 보면 보이고, 흘려보면 놓칩니다.
   ② 그다음 «살펴보기» 로 확인합니다 — 한 마리에 **두 번**뿐입니다.
      살펴본 곳은 글로 확실히 알려 주고, 그때 «비로소» 그림에 초록·붉은 상자가 붙습니다.
      고른 부위를 그림에 미리 표시해 주지는 않습니다 — 어느 자리가 눈이고 뿔인지는
      스스로 가늠해야 합니다. 미리 짚어 주면 찾을 것도 없이 쉬워집니다.
   ③ 사들이거나 물립니다.
      ┌ 사들인다 ─ 흠이 없으면 제값, 있으면 성전 검사관에게 발려나가 크게 물립니다
      └ 물린다  ─ 흠이 있으면 손실을 피하고, 없으면 남는 장사를 놓칩니다
      확신이 없으면 물리는 쪽이 덜 잃습니다. 그게 이 장사의 셈입니다.

   상처 자리(MARKS)는 그림의 32×32 픽셀 좌표입니다. 짐승 그림을 새로 그리면
   그 좌표만 다시 잡아 주면 됩니다 — box 는 부위를 가리키는 상자(칸 단위 x,y,너비,높이).

   여는 곳: js/map.js 의 오브젝트에 game:"blemish" 를 적으면 그 앞에서 SPACE 로 열립니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  /* ── 검사하는 여섯 부위 (3×2 로 깔립니다) ── */
  const PARTS = [
    { id:'eye',  name:'눈',     flaw:'눈에 백태가 끼었다' },
    { id:'ear',  name:'귀',     flaw:'귀 끝이 찢겨 있다' },
    { id:'horn', name:'뿔',     flaw:'뿔이 부러졌다' },
    { id:'back', name:'등',     flaw:'등에 혹이 났다' },
    { id:'fore', name:'앞다리', flaw:'앞다리를 절뚝인다' },
    { id:'hind', name:'뒷다리', flaw:'뒷다리 털이 벗겨졌다' }
  ];
  const COLS = 3;

  /* 검사하는 짐승 — 32×32 짜리 그림을 여섯 배로 키워 씁니다 */
  const BEASTS = [
    { key:'x16_sheep', name:'어린 양' },
    { key:'x17_goat',  name:'염소' }
  ];
  const S = 6;               // 확대 배율 (32 × 6 = 192)

  /* ── 부위마다의 상처 자리 ──
     px    그림 안에서 색을 갈아엎을 픽셀 (32×32 좌표)
     color 그 자리에 찍을 색 — 본래 색과 반대쪽으로 골라야 «보입니다»
     box   부위를 가리키는 상자 [x, y, 너비, 높이]
     양은 흰 몸이라 상처가 어둡게, 염소는 검은 몸이라 상처가 밝게 찍힙니다.
     (본래 색은 assets/images/7_expansion/x1/*.png 에서 재어 둔 값입니다) */
  const MARKS = {
    x16_sheep: {                                            // 오른쪽을 보는 흰 양
      eye:  { px:[[27, 19]], color:'#EFEBDD', box:[24, 16,  6, 6] },   // 검은 눈이 뿌옇게
      ear:  { px:[[22, 17]], color:'#3A2C22', box:[20, 15,  5, 5] },   // 귀 끝에 찢긴 자국
      horn: { px:[[24, 15]], color:'#4A3828', box:[22, 13,  6, 5] },   // 부러진 자리
      back: { px:[[13, 12]], color:'#A9614A', box:[10, 10,  8, 5] },   // 등에 붉은 혹
      /* 다리는 어두운 바탕(그림자) 위에 가는 기둥 하나뿐이라, 어두운 상처는 묻힙니다.
         그래서 다리만은 살결이 드러난 밝은 자국으로 찍습니다 */
      fore: { px:[[23, 27]], color:'#E0CBA8', box:[21, 24,  5, 6] },   // 앞다리
      hind: { px:[[10, 27]], color:'#E0CBA8', box:[ 8, 24,  5, 6] }    // 뒷다리
    },
    x17_goat: {                                             // 오른쪽을 보는 검은 염소
      eye:  { px:[[27, 15]], color:'#E8E2D2', box:[24, 12,  6, 6] },
      ear:  { px:[[24, 12]], color:'#2A2018', box:[22, 10,  6, 5] },
      horn: { px:[[18, 12]], color:'#C6B79C', box:[16,  9,  5, 6] },   // 어두운 뿔에 밝은 단면
      back: { px:[[12, 16]], color:'#38251A', box:[ 9, 14,  8, 5] },
      fore: { px:[[18, 27]], color:'#B79A7C', box:[16, 24,  5, 6] },
      hind: { px:[[ 8, 27]], color:'#B79A7C', box:[ 6, 24,  5, 6] }
    }
  };

  const ROUNDS = 5;          // 한 판에 다섯 마리
  const LOOKS  = 2;          // 한 마리에 두 번만 — 나머지는 눈으로 찾습니다
  const FLAW_ODDS = 0.6;     // 열에 여섯은 흠이 있다
  const PAY = {              // 세겔
    cleanBuy:  10,           // 흠 없는 것을 사들였다 — 제값에 팔린다
    flawBuy:  -15,           // 흠 있는 것을 사들였다 — 검사관에게 발려나간다
    flawPass:   4,           // 흠 있는 것을 물렸다 — 손실을 피했다
    cleanPass: -3            // 흠 없는 것을 물렸다 — 남는 장사를 놓쳤다
  };

  let el = {}, cards = [];
  let open = false, done = null;              // done — 판이 끝나면 부를 것
  let round = 0, coin = 0, right = 0;
  let beast = null, flaws = null, seen = null, looks = 0, sel = 0;
  let phase = 'look';                          // 'look' | 'result' | 'end'

  const rd = id => document.getElementById(id);
  const pick = a => a[(Math.random() * a.length) | 0];

  function init() {
    el = {
      root: rd('mini'), n: rd('miniN'), coin: rd('miniCoin'),
      pic: rd('miniPic'), beast: rd('miniBeast'), looks: rd('miniLooks'), tip: rd('miniTip'),
      grid: rd('miniGrid'), res: rd('miniRes'),
      ask: rd('miniAsk'), buy: rd('miniBuy'), no: rd('miniNo'),
      go: rd('miniGo'), hint: rd('miniHint')
    };
    if (!el.grid) return;
    PARTS.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mini__p';
      const nm = document.createElement('b'); nm.textContent = p.name;
      const st = document.createElement('span');
      b.appendChild(nm); b.appendChild(st);
      b.addEventListener('click', () => { sel = i; look(); paint(); });
      el.grid.appendChild(b); cards.push({ b, st });
    });
    el.buy.addEventListener('click', () => judge(true));
    el.no.addEventListener('click', () => judge(false));
    el.go.addEventListener('click', next);
  }

  /* ══════════════════════════════════════════
     열고 닫기
     ══════════════════════════════════════════ */
  function start(onDone) {
    if (!el.root) return;
    open = true; done = onDone || null;
    round = 0; coin = 0; right = 0;
    el.root.classList.add('is-on');
    newRound();
  }

  function close(finished) {
    if (!open) return;
    open = false;
    el.root.classList.remove('is-on');
    const cb = done; done = null;
    if (finished && cb) cb({ coin, right, rounds: ROUNDS });
  }

  function newRound() {
    round++;
    beast = pick(BEASTS);
    flaws = new Set();
    if (Math.random() < FLAW_ODDS) {
      const pool = PARTS.map(p => p.id);
      const n = Math.random() < 0.72 ? 1 : 2;
      for (let i = 0; i < n && pool.length; i++)
        flaws.add(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    }
    seen = {}; looks = LOOKS; sel = 0; phase = 'look';
    paint();
  }

  /* ══════════════════════════════════════════
     짐승 그림 — 여섯 배로 키워 그리고, 흠이 있으면 그 자리 픽셀을 갈아엎는다
     ══════════════════════════════════════════ */
  function drawBeast() {
    const cv = el.pic;
    if (!cv || !cv.getContext || !beast) return;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#0E1310';
    g.fillRect(0, 0, cv.width, cv.height);

    const img = NS.Assets && NS.Assets.IMG[beast.key];
    if (img && img.complete && !img.broken) g.drawImage(img, 0, 0, 32, 32, 0, 0, 32 * S, 32 * S);
    else { g.fillStyle = '#3A443D'; g.fillRect(6 * S, 10 * S, 20 * S, 14 * S); }

    const M = MARKS[beast.key];
    if (!M) return;
    const done = phase !== 'look';

    /* ① 상처 — 픽셀 한 점. 처음부터 그려져 있으므로 «눈으로» 찾을 수 있습니다 */
    for (const p of PARTS) {
      const m = M[p.id];
      if (!m || !flaws.has(p.id)) continue;
      g.fillStyle = m.color;
      for (const [x, y] of m.px) g.fillRect(x * S, y * S, S, S);
    }

    /* ② 부위 상자 — «살펴본 곳» 과, 판정한 뒤의 «흠이 있던 곳» 에만 붙습니다.
       고른 부위를 그림에 미리 표시해 주면 어디를 볼지 알려 주는 셈이라 너무 쉬워집니다.
       어느 자리가 어느 부위인지는 스스로 가늠해야 하고, 살펴본 뒤에야 상자로 확인됩니다 */
    for (const p of PARTS) {
      const m = M[p.id];
      if (!m) continue;
      const s = seen[p.id];
      let color = null;
      if (s === 'ok') color = '#5FA07E';
      if (s === 'bad') color = '#E0665A';
      if (done && flaws.has(p.id)) color = '#E0665A';
      if (!color) continue;
      const [bx, by, bw, bh] = m.box;
      g.lineWidth = 1;
      g.strokeStyle = color;
      g.strokeRect(bx * S + 1, by * S + 1, bw * S - 2, bh * S - 2);
    }
  }

  /* ── 한 부위 살펴보기 ── */
  function look() {
    if (phase !== 'look' || looks <= 0) return;
    const p = PARTS[sel];
    if (seen[p.id]) return;                    // 같은 곳을 두 번 보지는 않는다
    seen[p.id] = flaws.has(p.id) ? 'bad' : 'ok';
    looks--;
    if (NS.Audio) NS.Audio.play('talk', 0.5);
  }

  /* ── 사들이거나 물리거나 ── */
  function judge(buy) {
    if (phase !== 'look') return;
    const bad = flaws.size > 0;
    const ok = buy ? !bad : bad;
    if (ok) right++;
    coin += buy ? (bad ? PAY.flawBuy : PAY.cleanBuy)
                : (bad ? PAY.flawPass : PAY.cleanPass);

    const list = PARTS.filter(p => flaws.has(p.id)).map(p => p.flaw).join(' · ');
    if (buy && !bad)  el.res.textContent = `흠 없는 것이었다. 제값에 팔린다.  +${PAY.cleanBuy} 세겔`;
    if (buy && bad)   el.res.textContent = `검사관 아사랴가 발려냈다 — ${list}.  ${PAY.flawBuy} 세겔`;
    if (!buy && bad)  el.res.textContent = `잘 보았다 — ${list}.  +${PAY.flawPass} 세겔`;
    if (!buy && !bad) el.res.textContent = `흠 없는 것을 놓쳤다. 뒷사람이 사 갔다.  ${PAY.cleanPass} 세겔`;
    el.res.className = 'mini__res ' + (ok ? 'is-ok' : 'is-bad');

    phase = 'result';
    if (NS.Audio) NS.Audio.play(ok ? 'quest' : 'door', 0.8);
    paint();
  }

  /* ── 다음 마리 · 결산 · 닫기 ── */
  function next() {
    if (phase === 'result') {
      if (round >= ROUNDS) { phase = 'end'; paintEnd(); return; }
      newRound(); return;
    }
    if (phase === 'end') { close(true); return; }
  }

  function paintEnd() {
    el.res.className = 'mini__res ' + (coin >= 0 ? 'is-ok' : 'is-bad');
    el.res.textContent =
      `${ROUNDS}마리 · 맞게 본 것 ${right} / 놓친 것 ${ROUNDS - right} · 오늘 몫 ${coin >= 0 ? '+' : ''}${coin} 세겔\n` +
      '「흠 없는 것으로 드릴지니」 — 그 말대로면 이 성에 바칠 수 있는 건 몇 마리 안 된다.';
    paint();
  }

  /* ══════════════════════════════════════════
     화면
     ══════════════════════════════════════════ */
  function paint() {
    if (!el.root) return;
    const end = phase === 'end', res = phase === 'result';

    el.n.textContent = `${Math.min(round, ROUNDS)} / ${ROUNDS} 마리`;
    el.coin.textContent = `${coin >= 0 ? '+' : ''}${coin} 세겔`;
    el.coin.className = 'mini__coin ' + (coin < 0 ? 'is-bad' : 'is-ok');
    el.beast.textContent = beast ? beast.name : '';
    el.looks.textContent = res || end ? '' : `살펴보기 ${looks}번 남음`;
    if (el.tip) {
      el.tip.textContent = end ? ''
        : res ? '흠이 있던 자리에 붉은 상자가 붙었습니다. 그림의 그 점이 흠입니다.'
        : looks > 0 ? `그림을 눈으로 훑어 흠을 찾으세요. 살펴본 곳에만 상자가 붙습니다 — 지금 고른 곳은 «${PARTS[sel].name}» (SPACE).`
                    : '더 살펴볼 수 없습니다. 눈으로 본 것만 믿고 셈하세요.';
    }
    drawBeast();

    cards.forEach(({ b, st }, i) => {
      const p = PARTS[i];
      const s = seen[p.id];
      const shown = s || ((res || end) ? (flaws.has(p.id) ? 'bad' : 'ok') : null);
      b.className = 'mini__p'
        + (i === sel && !res && !end ? ' is-sel' : '')
        + (shown === 'bad' ? ' is-bad' : shown === 'ok' ? ' is-ok' : '')
        + (!s && (res || end) ? ' is-late' : '');       // 못 보고 넘어간 곳
      st.textContent = shown === 'bad' ? p.flaw : shown === 'ok' ? '이상 없다' : '아직 못 봤다';
      b.disabled = res || end || !!s || looks <= 0;
    });

    el.res.classList.toggle('is-on', res || end);
    el.ask.classList.toggle('is-off', res || end);
    el.go.classList.toggle('is-off', !res && !end);
    el.go.textContent = end ? 'SPACE — 좌판으로 돌아간다'
                            : (round >= ROUNDS ? 'SPACE — 오늘 몫을 셈한다' : 'SPACE — 다음 마리');
    el.hint.textContent = res || end ? ''
      : (looks > 0 ? 'WASD·방향키로 부위를 옮기고 SPACE 로 살펴봅니다 (두 번뿐) · 1 사들인다 · 2 물린다'
                   : '더 볼 수 없습니다 · 1 사들인다 · 2 물린다');
  }

  /* ══════════════════════════════════════════
     조작 — main.js 가 눌린 열쇠를 그대로 넘겨 준다
     ══════════════════════════════════════════ */
  function key(k) {
    if (!open) return;
    if (phase === 'look') {
      let col = sel % COLS, row = (sel / COLS) | 0;
      const rows = Math.ceil(PARTS.length / COLS);
      if (k === 'KeyA') col = (col + COLS - 1) % COLS;
      else if (k === 'KeyD') col = (col + 1) % COLS;
      else if (k === 'KeyW') row = (row + rows - 1) % rows;
      else if (k === 'KeyS') row = (row + 1) % rows;
      else if (k === 'Space') { look(); paint(); return; }
      else if (k === 'Digit1') { judge(true); return; }
      else if (k === 'Digit2') { judge(false); return; }
      else return;
      sel = Math.min(row * COLS + col, PARTS.length - 1);
      paint();
      return;
    }
    if (k === 'Space' || k === 'Digit1' || k === 'Digit2') next();
  }

  NS.Mini = {
    init, key, close,
    has: name => name === 'blemish',
    open: (name, onDone) => { if (name === 'blemish') start(onDone); },
    isOpen: () => open
  };
})();
