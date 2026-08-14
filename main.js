/* ══════════════════════════════════════════
   main.js — 전체를 엮고 루프를 돌린다

   순서:  에셋 로드 → 장소 굽기 → 매 프레임 update → render
   그리는 순서: 바닥 → 붙박이 조각 → (건물·소품·사람을 기준선으로 정렬) → 어둠 → 규격 표시
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR;
  const A = NS.Assets, W = NS.World, Actors = NS.Actors, Dlg = NS.Dialogue, Snd = NS.Audio,
        Title = NS.Title, Cast = NS.Cast, Quest = NS.Quest, Mini = NS.Mini, Clock = NS.Clock;
  const TILE = A.TILE;

  /* 주인공 기본 그림 — 인물 표(js/cast.js)의 첫 사람. 시작 화면에서 고르면 바뀝니다 */
  const PLAYER_CHAR = (Cast.first() && Cast.first().sprite) || 'g31_traveler';

  const cv = document.getElementById('screen');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const VW = cv.width, VH = cv.height;
  const rd = id => document.getElementById(id);

  /* 창이 두 가지입니다.
       index.html — 진짜 게임 화면. 화면 칸 하나뿐이고 수첩은 화면 안 단추로 엽니다
       debug.html — 오른쪽에 계기판(판독·장소 이동·규격 표시)이 붙은 개발용 창
     계기판 쪽 요소는 index.html 에 없으므로, 있을 때만 손대야 합니다 */
  const DBG = !!document.querySelector('.rail');

  /* ── 판 위의 상태 ── */
  const player = Actors.createPlayer(PLAYER_CHAR);
  let mapId = 'lower', heroImg = null, sheetMode = false, started = false;
  const cam = { x: 0, y: 0 };
  let elapsed = 0, portalLock = false, cardT = 0;
  const trans = { phase: 'none', a: 0, dest: null };
  const show = { foot: false, door: false, sprite: false, base: false, name: false };
  const world = () => W.get(mapId);

  /* 지금 성 안에 나와 있는 사람들.
     js/map.js 에서 only:"day" 를 단 사람은 밤에 들어가고, only:"night" 는 밤에만 나옵니다 */
  const live = (w) => (w || world()).npcs.filter(n => !n.off);

  /* 해가 뜨고 지는 순간에 한 번 — 모든 장소의 사람을 낮 몫 · 밤 몫으로 갈아 끼운다 */
  function applyPhase() {
    const night = Clock.isNight();
    let gone = false;
    for (const id in W.worlds)
      for (const n of W.worlds[id].npcs) {
        const off = n.only ? ((n.only === 'night') !== night) : false;
        if (off && !n.off) { n.busy = false; gone = true; }
        n.off = off;
      }
    if (gone && Dlg.isOpen()) Dlg.close();      // 말을 걸고 있던 사람이 자리를 떴을 수 있다
  }

  /* ══════════════════════════════════════════
     1. 입력
     ══════════════════════════════════════════ */
  const held = new Set();
  const ALIAS = { ArrowUp:'KeyW', ArrowLeft:'KeyA', ArrowDown:'KeyS', ArrowRight:'KeyD',
                  ShiftRight:'ShiftLeft', KeyE:'Space', Enter:'Space' };
  const capEls = [...document.querySelectorAll('.key')];
  const paintCaps = () => capEls.forEach(el => el.classList.toggle('is-down', held.has(el.dataset.key)));
  let escDown = false;                          // 눌린 채로 두어도 한 번만 먹도록

  function press(code) {
    const k = ALIAS[code] || code;
    Snd.unlock();
    if (k === 'Escape') { if (!escDown) { escDown = true; onEscape(); } return; }
    if (Title.isOpen()) return;                 // 시작 화면이 떠 있는 동안은 게임이 입력을 안 받는다
    if (Mini.isOpen()) { Mini.key(k); return; } // 작은 판이 열려 있으면 열쇠를 그쪽에 넘긴다
    // 브리핑·완료 카드를 보는 동안도 마찬가지 — SPACE 한 번이면 카드를 닫고 이어 갑니다
    if (Quest.isBrief()) { if (k === 'Space') Quest.closeBrief(); return; }
    if (Quest.isCard()) { if (k === 'Space') Quest.closeCard(); return; }
    // 수첩이 펼쳐져 있으면 같은 열쇠로 덮는다
    if (bookOn) { if (k === 'Space' || k === 'KeyT' || k === 'KeyN') closeBook(); return; }
    if (held.has(k)) return;
    held.add(k); paintCaps();
    if (k === 'Space') onAction();
    if (k === 'KeyT') openBook('tasks');       // 오늘 할 일
    if (k === 'KeyN') openBook('notes');       // 소문 수첩
    if (k === 'KeyR') startNap();              // 눈 붙이기 — 할 일을 다 했을 때만 열립니다
    if (k === 'KeyG') {                        // 규격 표시 한 번에 켜고 끄기
      const on = !(show.foot && show.door && show.sprite && show.base);
      for (const id of ['ckFoot', 'ckDoor', 'ckSprite', 'ckBase']) { const b = rd(id); if (b) b.checked = on; }
      show.foot = show.door = show.sprite = show.base = on;
    }
  }
  const release = code => {
    const k = ALIAS[code] || code;
    if (k === 'Escape') escDown = false;
    held.delete(k); paintCaps();
  };

  // e.code 를 쓰므로 한글 입력 상태에서도 그대로 동작합니다
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // Ctrl+R(새로 고침) 따위를 게임 열쇠로 읽지 않도록
    const k = ALIAS[e.code] || e.code;
    if (!Title.isOpen() && ['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','KeyG'].includes(k)) e.preventDefault();
    // 카드·작은 판은 «누르고 있기» 로 넘겨지면 안 된다 — 대사를 넘기던 손가락에 그대로 지워진다
    if (e.repeat && (Mini.isOpen() || Quest.isBrief() || Quest.isCard())) return;
    press(e.code);
  });
  addEventListener('keyup', e => release(e.code));
  addEventListener('blur', () => { held.clear(); escDown = false; paintCaps(); padClear(); });

  /* ── 터치 십자키 ──
     휴대폰에서 오래 누르면 글자가 잡히면서 «복사 · 모두 선택» 상자가 뜨던 문제 때문에
     기본 동작(선택 · 끌기 · 문맥 차림표 · 두 번 눌러 확대)을 전부 막고 손으로 다룹니다.
     터치는 처음 누른 단추에 이벤트가 묶이므로(암묵적 포인터 캡처) 그 묶음을 풀고,
     손가락이 지금 어느 칸 위에 있는지는 좌표로 직접 찾습니다 — 그래야 십자키 위에서
     손가락을 미끄러뜨려 방향을 바꿀 수 있고, 칸 밖으로 빠져나가면 확실히 떼어집니다 */
  const padHeld = new Map();                   // pointerId → 누르고 있는 단추
  const padAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest('[data-pad]') : null;
  };
  function padDown(b, id) {
    padHeld.set(id, b);
    b.classList.add('is-down');
    press(b.dataset.pad);
  }
  function padUp(id) {
    const b = padHeld.get(id);
    if (!b) return;
    padHeld.delete(id);
    for (const other of padHeld.values()) if (other === b) return;  // 다른 손가락이 아직 같은 칸 위에 있다
    b.classList.remove('is-down');
    release(b.dataset.pad);
  }
  const padClear = () => { for (const id of [...padHeld.keys()]) padUp(id); };

  for (const b of document.querySelectorAll('[data-pad]')) {
    b.addEventListener('pointerdown', e => {
      e.preventDefault();                       // 선택 시작 · 단추 초점 잡기를 막는다
      if (padHeld.has(e.pointerId)) return;
      if (b.hasPointerCapture && b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
      padDown(b, e.pointerId);
    });
    // 길게 누르기로 뜨는 문맥 차림표 · 확대경까지 두 겹으로 막는다
    b.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('dragstart', e => e.preventDefault());
  }
  addEventListener('pointermove', e => {
    if (!padHeld.has(e.pointerId)) return;
    const b = padAt(e.clientX, e.clientY);
    if (b === padHeld.get(e.pointerId)) return;
    padUp(e.pointerId);
    if (b) padDown(b, e.pointerId);
  });
  addEventListener('pointerup', e => padUp(e.pointerId));
  addEventListener('pointercancel', e => padUp(e.pointerId));
  document.addEventListener('visibilitychange', () => { if (document.hidden) padClear(); });

  cv.addEventListener('pointerdown', () => { cv.focus(); Snd.unlock(); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  rd('btnPause').addEventListener('click', () => pause());   // 터치 기기에는 Esc 가 없다

  /* ══════════════════════════════════════════
     1-b. 수첩 — 오늘 할 일과 소문을 화면 안에서 펼쳐 본다
          index.html 에는 계기판이 없으므로 여기가 유일한 확인 창구입니다.
          내용은 js/quest.js 와 js/dialogue.js 가 같은 칸에 채워 넣습니다
     ══════════════════════════════════════════ */
  const book = rd('book');
  let bookOn = false;

  function setBookTab(name) {
    if (!book) return;
    for (const b of book.querySelectorAll('[data-tab]')) b.classList.toggle('is-on', b.dataset.tab === name);
    for (const p of book.querySelectorAll('[data-page]')) p.classList.toggle('is-on', p.dataset.page === name);
  }
  function openBook(tab) {
    if (!book || Title.isOpen() || Mini.isOpen() || Quest.busy()) return;
    bookOn = true;
    setBookTab(tab || 'tasks');
    book.classList.add('is-on');
    held.clear(); padClear(); paintCaps();     // 펼쳐 보는 동안 발이 묶인다
  }
  function closeBook() {
    if (!bookOn) return;
    bookOn = false;
    book.classList.remove('is-on');
    cv.focus();
  }
  if (book) {
    for (const b of book.querySelectorAll('[data-tab]'))
      b.addEventListener('click', () => setBookTab(b.dataset.tab));
    rd('btnBookClose').addEventListener('click', closeBook);
    rd('btnTasks').addEventListener('click', () => openBook('tasks'));
    rd('btnNotes').addEventListener('click', () => openBook('notes'));
  }

  /* ══════════════════════════════════════════
     2. 눈앞의 것 집어내기
     ══════════════════════════════════════════ */
  function frontCell() {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const o = { down:[0,1], up:[0,-1], left:[-1,0], right:[1,0] }[player.dir];
    return { c: Math.floor((cx + o[0] * TILE * 0.7) / TILE),
             r: Math.floor((cy + o[1] * TILE * 0.7) / TILE),
             x: cx + o[0] * TILE * 0.7, y: cy + o[1] * TILE * 0.7 };
  }
  function nearbyNpc() {
    const f = frontCell();
    let best = null, bd = 26;
    for (const n of live()) {
      const d = Math.hypot(n.x + n.w / 2 - f.x, n.y + n.h / 2 - f.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  const facingObj = () => { const f = frontCell(); return W.interactAt(world(), f.c, f.r); };

  /* ══════════════════════════════════════════
     3. SPACE — 말 걸기 · 살펴보기 · 들어가기
     ══════════════════════════════════════════ */
  function onAction() {
    if (trans.phase !== 'none') return;
    if (Dlg.isOpen()) {
      const door = Dlg.advance();
      Quest.on('advance');                       // 소문은 대사를 넘기는 사이에 늘어난다
      if (door) enterDoor(door);
      return;
    }
    const n = nearbyNpc();
    if (n) {
      n.busy = true;
      const dx = player.x - n.x, dy = player.y - n.y;
      if (Math.abs(dx) > Math.abs(dy)) n.dir = dx > 0 ? 'right' : 'left';
      else n.dir = dy > 0 ? 'down' : 'up';
      Snd.play('talk', 0.8);
      Dlg.talkTo(n);
      Quest.on('talk', n);
      return;
    }
    const o = facingObj();
    if (o) {
      if (o.game && Mini.has(o.game)) { openMini(o.game); return; }   // 좌판의 작은 판
      const a = A.ATLAS[o.a];
      Dlg.lookAt(a.name, o.talk || [a.note || '…'], o.to ? o : null);
      Quest.on('look', o);
      return;
    }
    const f = frontCell();
    if (W.isWet(world(), f.c, f.r))
      Dlg.lookAt('물', ['수조에 고인 물이다. 바닥이 비쳐 보인다.'], null);
  }

  /* ══════════════════════════════════════════
     3-b. 눈 붙이기 — 할 일을 다 하고 남은 시간을 건너뛴다

     낮 몫을 일찍 끝내 놓고 해가 지기만 기다리는 일이 없도록,
     좌판 그늘에서 눈을 붙여 해 질 때까지 시곗바늘을 옮깁니다.
     «할 일을 다 했을 때만» 열리므로 건너뛰어도 잃는 것이 없습니다 (js/quest.js 의 canRest).
     ══════════════════════════════════════════ */
  const NAP = { out: 0.7, hold: 0.35, in: 0.8 };        // 어두워지고 · 머물고 · 밝아지고
  const NAP_ALL = NAP.out + NAP.hold + NAP.in;
  const nap = { on: false, t: 0, done: false, say: '' };

  const canRest = () => Quest.canRest() && !Mini.isOpen() && !bookOn &&
                        !Dlg.isOpen() && trans.phase === 'none' && !nap.on;

  function startNap() {
    if (!canRest()) return;
    nap.on = true; nap.t = 0; nap.done = false;
    nap.say = Clock.isNight() ? '잠자리에 든다…' : '좌판 그늘에서 눈을 붙인다…';
    held.clear(); padClear(); paintCaps();
    Snd.play('door', 0.5);
    paintRest();
  }

  function napTick(dt) {
    if (!nap.on) return;
    nap.t += dt;
    if (!nap.done && nap.t >= NAP.out) { nap.done = true; Clock.skip(); }   // 가장 어두울 때 넘긴다
    if (nap.t >= NAP_ALL) { nap.on = false; nap.t = 0; }
  }

  function napAlpha() {
    if (!nap.on) return 0;
    if (nap.t < NAP.out) return nap.t / NAP.out;
    if (nap.t < NAP.out + NAP.hold) return 1;
    return Math.max(0, 1 - (nap.t - NAP.out - NAP.hold) / NAP.in);
  }

  /* 오른쪽 위 «눈 붙이기» 단추 — 건너뛸 수 있을 때만 나옵니다 (index.html 에만 있습니다) */
  const restBtn = rd('btnRest'), restLab = rd('restLab');
  if (restBtn) restBtn.addEventListener('click', () => { startNap(); cv.focus(); });
  function paintRest() {
    if (!restBtn) return;
    const on = canRest();
    restBtn.classList.toggle('is-on', on);
    if (on && restLab) restLab.textContent = Clock.isNight() ? '잠자리' : '눈 붙이기';
  }

  /* 작은 판을 연다 — 판이 도는 동안 성 안은 멈추고 열쇠는 그쪽이 받는다 */
  function openMini(name) {
    held.clear(); padClear(); paintCaps();
    Snd.play('door', 0.6);
    Mini.open(name, res => { Quest.earn(res); Quest.on('game', name); });   // 번 세겔은 하루 장부로
  }

  /* ══════════════════════════════════════════
     4. 장소 넘나들기
     ══════════════════════════════════════════ */
  function enterDoor(d) {
    trans.phase = 'out'; trans.a = 0;
    trans.dest = { to: d.to, at: d.at, dir: d.dir };
    Snd.play('door', 0.9);
  }
  function checkPortal() {
    const c = Math.floor((player.x + player.w / 2) / TILE);
    const r = Math.floor((player.y + player.h / 2) / TILE);
    const p = W.portalAt(world(), c, r);
    if (!p) { portalLock = false; return; }        // 칸에서 내려와야 다시 발동
    if (portalLock || trans.phase !== 'none') return;
    trans.phase = 'out'; trans.a = 0; trans.dest = p;
  }
  function travel(to, at, dir) {
    mapId = to;
    player.x = at[0] * TILE + (TILE - player.w) / 2;
    player.y = at[1] * TILE + TILE - player.h - 6;
    player.dir = dir || 'down'; player.animT = 0; player.frame = 0;
    portalLock = true; cardT = 1.8;
    Dlg.close();
    for (const n of world().npcs) n.busy = false;
    Snd.playBgm(mapId);
    updateJump(); snapCam();
    Quest.on('visit', mapId);
  }
  function jumpTo(id) {
    if (trans.phase !== 'none') return;
    trans.phase = 'out'; trans.a = 0;
    trans.dest = { to: id, at: W.MAPS[id].spawn, dir: 'down' };
  }

  /* ══════════════════════════════════════════
     4-b. 시작 화면 · 잠시 멈춤
     ══════════════════════════════════════════ */
  /* 시작 화면에서 고른 인물(js/cast.js)을 받아 그 사람의 첫 장소에서 연다 */
  function start(who) {
    if (started) return;
    started = true;
    Snd.unlock();
    if (who && who.sprite && A.CHARS[who.sprite]) { player.char = who.sprite; applied.hero = who.sprite; }
    if (who && who.name) player.name = who.name;   // 이름표는 빌려 쓴 그림이 아니라 고른 사람 이름으로
    const first = (who && who.start && W.MAPS[who.start]) ? who.start : 'lower';
    travel(first, W.MAPS[first].spawn, 'down');
    Quest.begin(who ? who.id : null, first);     // 오늘 할 일을 깔고 브리핑 카드를 띄운다
    applyPhase();                                // 낮 몫 사람들을 세운다
    if (clockEl.root) clockEl.root.classList.add('is-on');
    paintClock();
    cardT = 1.8;
    cv.focus();
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function pause() {
    if (!started || Title.isOpen()) return;
    held.clear(); paintCaps();
    Title.show('pause');
  }
  function resume() {
    Title.hide();
    last = performance.now();
    cv.focus();
  }
  /* Esc — 옵션·조작법에서는 첫 화면으로, 멈춤 화면에서는 이어하기, 게임 중에는 멈춤 */
  function onEscape() {
    if (Mini.isOpen()) { Mini.close(false); return; }   // 작은 판은 도중에 그만둘 수 있다
    if (bookOn) { closeBook(); return; }
    if (Title.isOpen()) {
      if (Title.current() !== 'main') { Title.page('main'); return; }
      if (Title.mode() === 'pause') resume();
      return;
    }
    if (started) pause();
  }

  /* 옵션 화면이 값을 바꿀 때마다 불린다. 바뀐 것만 반영해서
     계기판에서 손으로 켜 둔 표시를 볼륨 조절 따위가 되돌리지 않게 한다 */
  const applied = {};
  function applyOptions(o) {
    if (o.names !== applied.names) {
      applied.names = show.name = o.names;
      const b = rd('ckName'); if (b) b.checked = o.names;      // 계기판은 debug.html 에만 있다
    }
    if (o.spec !== applied.spec) {
      applied.spec = o.spec;
      for (const [id, key] of [['ckFoot','foot'],['ckDoor','door'],['ckSprite','sprite'],['ckBase','base']]) {
        const b = rd(id); if (b) b.checked = o.spec;
        show[key] = o.spec;
      }
    }
    // 주인공 그림 — 정면·측면·후면을 받아 둔 다음에 갈아 끼운다
    if (o.hero && o.hero !== applied.hero && A.CHARS[o.hero]) {
      applied.hero = o.hero;
      A.load([o.hero]).then(() => { player.char = o.hero; });
    }
  }

  /* ══════════════════════════════════════════
     5. 갱신
     ══════════════════════════════════════════ */
  function snapCam() {
    const w = world();
    cam.x = w.W <= VW ? (w.W - VW) / 2 : Math.max(0, Math.min(w.W - VW, player.x + player.w / 2 - VW / 2));
    cam.y = w.H <= VH ? (w.H - VH) / 2 : Math.max(0, Math.min(w.H - VH, player.y + player.h / 2 - VH / 2));
  }

  function update(dt) {
    if (trans.phase === 'out') {
      trans.a += dt / 0.2;
      if (trans.a >= 1) { trans.a = 1; travel(trans.dest.to, trans.dest.at, trans.dest.dir); trans.phase = 'in'; }
    } else if (trans.phase === 'in') {
      trans.a -= dt / 0.3;
      if (trans.a <= 0) { trans.a = 0; trans.phase = 'none'; }
    }
    if (cardT > 0) cardT -= dt;

    const w = world();
    const npcs = live(w);
    // 대사창·장소 이동·브리핑·완료 카드·작은 판·수첩이 떠 있는 동안은 발이 묶인다
    napTick(dt);
    const free = !Dlg.isOpen() && trans.phase === 'none' && !Quest.busy() && !Mini.isOpen()
                 && !bookOn && !nap.on;
    const input = {
      left:  free && held.has('KeyA'), right: free && held.has('KeyD'),
      up:    free && held.has('KeyW'), down:  free && held.has('KeyS'),
      run:   held.has('ShiftLeft')
    };
    Actors.updatePlayer(w, player, dt, input, npcs);
    Snd.step(dt, player.moving, input.run);

    const all = [player, ...npcs];
    for (const n of npcs) Actors.updateNpc(w, n, dt, all);
    if (trans.phase === 'none') checkPortal();
    snapCam();
  }

  /* ══════════════════════════════════════════
     6. 그리기
     ══════════════════════════════════════════ */
  /* ══════════════════════════════════════════
     6-b. 머리 위 표시 — 이름표 · 말 걸 수 있음 · 새 소문
     ══════════════════════════════════════════ */
  const TAG_NEAR = 90, TAG_FAR = 165;        // 이 사이에서 이름표가 스며들듯 나타난다

  /* 분류마다 이름 색을 달리해 누가 누구인지 한눈에 */
  const TAG_COLOR = {
    '로마·통제': '#E0836F', '종교 계층': '#E3C273', '상류층': '#C6A6D8',
    '상업·시장': '#8ECDAE', '순례자': '#A8C4DE', '서민·노동': '#E4E7E1',
    '성경 인물': '#F2E6C4'
  };
  const tagColor = e => (e.char && TAG_COLOR[A.CHARS[e.char].cat]) || (e.sprite ? '#A9B1A4' : '#E4E7E1');

  /* 그림 꼭대기 — 이름표를 얹을 높이 */
  function headTop(e) {
    if (e.isPlayer && heroImg) return e.y + e.h - e.drawH + 2;
    if (e.char) return e.y + e.h - A.CHARS[e.char].h + 2;
    if (e.sprite) return e.y + e.h - A.ATLAS[e.sprite].h + 2;
    return e.y + e.h - 27;
  }

  const distTo = e => Math.hypot(e.x + e.w / 2 - (player.x + player.w / 2),
                                 e.y + e.h / 2 - (player.y + player.h / 2));

  /* 멀면 옅고 가까우면 진하게. 옵션에서 «늘 보여 주기» 를 켜면 항상 1 */
  function tagAlpha(e) {
    if (e.isPlayer) return playerTagAlpha();
    if (show.name) return 1;
    const d = distTo(e);
    if (d <= TAG_NEAR) return 1;
    if (d >= TAG_FAR) return 0;
    return (TAG_FAR - d) / (TAG_FAR - TAG_NEAR);
  }

  /* 내 이름표는 옆에 사람이 붙으면 비켜 준다 — 두 이름표가 포개지면 둘 다 못 읽는다 */
  function playerTagAlpha() {
    if (Dlg.isOpen()) return 0;
    let near = Infinity;
    for (const n of live()) near = Math.min(near, distTo(n));
    if (near < 44) return 0;
    if (near < 74) return (near - 44) / 30 * 0.75;
    return 0.75;
  }

  function nameplate(text, cx, by, color, focused) {
    ctx.font = '600 9px "IBM Plex Sans KR", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.ceil(ctx.measureText(text).width) + 9;
    const x = Math.round(cx - w / 2), y = Math.round(by - 12);
    ctx.fillStyle = 'rgba(10,14,11,.82)';
    ctx.fillRect(x, y, w, 12);
    if (focused) {                                  // 지금 말 걸 수 있는 사람
      ctx.strokeStyle = '#E3C273'; ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, y + .5, w - 1, 11);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(cx), y + 6.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  /* 말풍선 — 지금 SPACE 로 말 걸 수 있는 사람 위에 */
  function drawBubble(cx, by, t) {
    const x = Math.round(cx - 7), y = Math.round(by - 12 + Math.sin(t * 4) * 1.5);
    ctx.fillStyle = 'rgba(18,22,19,.86)';
    ctx.fillRect(x, y, 14, 10); ctx.fillRect(x + 5, y + 10, 4, 2);
    ctx.fillStyle = '#8ECDAE';
    ctx.fillRect(x + 3, y + 4, 2, 2); ctx.fillRect(x + 6, y + 4, 2, 2); ctx.fillRect(x + 9, y + 4, 2, 2);
  }

  /* 지금 찾아가야 할 사람·물건 위에 붙는 금색 표지.
     top 은 표지가 놓일 위쪽 자리 — 이름표·«!» 보다 한 줄 더 위에 얹습니다 */
  function drawMark(cx, top, t) {
    const x = Math.round(cx), y = Math.round(top + Math.sin(t * 3.6) * 2);
    ctx.fillStyle = 'rgba(10,14,11,.62)';
    ctx.fillRect(x - 6, y - 2, 12, 10);
    ctx.fillStyle = '#F2C86B';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 4 + i, y + i, 8 - i * 2, 1);   // 아래를 가리키는 ▼
  }

  /* 목표가 화면 밖일 때 가장자리에 세우는 방향 화살표 — 어디로 가야 하는지 늘 보이게 */
  function edgeArrow(tx, ty, t) {
    const m = 15;
    if (tx > m && tx < VW - m && ty > m && ty < VH - m) return;   // 화면 안이면 필요 없다
    const cx = VW / 2, cy = VH / 2;
    const ang = Math.atan2(ty - cy, tx - cx), dx = Math.cos(ang), dy = Math.sin(ang);
    const sx = dx ? ((dx > 0 ? VW - m : m) - cx) / dx : Infinity;
    const sy = dy ? ((dy > 0 ? VH - m : m) - cy) / dy : Infinity;
    const s = Math.min(sx, sy);

    ctx.save();
    ctx.translate(Math.round(cx + dx * s), Math.round(cy + dy * s));
    ctx.rotate(ang);
    const k = 1 + Math.sin(t * 4) * 0.09;
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = '#F2C86B'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(8,11,9,.85)'; ctx.stroke();
    ctx.restore();
  }

  /* 아직 못 들은 소문을 쥔 사람 위에 뜨는 «!» */
  function drawNews(cx, by, t) {
    const x = Math.round(cx - 2), y = Math.round(by - 12 + Math.sin(t * 3.4) * 1.6);
    ctx.fillStyle = 'rgba(10,14,11,.72)';
    ctx.fillRect(x - 2, y - 1, 8, 12);
    ctx.fillStyle = '#F2C86B';
    ctx.fillRect(x, y, 4, 6);        // 몸통
    ctx.fillRect(x, y + 8, 4, 3);    // 점
  }

  /* 사람 하나의 머리 위를 통째로 그린다 */
  function drawTags(e, ox, oy, focused, t) {
    const a = tagAlpha(e);
    if (a <= 0.02) return;
    const cx = e.x - ox + e.w / 2;
    let by = headTop(e) - oy - 3;

    ctx.globalAlpha = a;
    nameplate(e.name, cx, by, tagColor(e), focused);
    by -= 13;

    if (focused) drawBubble(cx, by, t);
    else if (!e.isPlayer && Dlg.hasNews(e)) drawNews(cx, by, t);
    ctx.globalAlpha = 1;
  }

  /* ══════════════════════════════════════════
     6-c. 노을과 밤 (js/clock.js 가 짙기를 셈합니다)

     밤은 화면을 통째로 덮은 다음, 등불이 있는 자리만 도로 «파내서» 만듭니다.
     파내기(destination-out)는 그 아래 그림까지 지워 버리므로
     어둠은 딴 칸(nightCv)에서 만들어 놓고 한 장으로 얹습니다.
     ══════════════════════════════════════════ */
  const LIGHT = { x07_campfire: 68, x08_oil_lamp_stand: 48 };   // 불빛이 닿는 반지름
  const NIGHT_A = 0.78;                                          // 한밤의 짙기
  const nightCv = document.createElement('canvas');
  nightCv.width = VW; nightCv.height = VH;
  const nctx = nightCv.getContext('2d');

  /* 이 장소의 등불 자리 — 한 번만 골라 두고 계속 씁니다 */
  function lightsOf(w) {
    if (!w.lights) w.lights = w.objs.filter(o => LIGHT[o.a]);
    return w.lights;
  }

  function drawDusk(t) {
    const k = Clock.warm();
    if (k <= 0.01) return;
    ctx.fillStyle = `rgba(198,104,44,${0.24 * k})`;
    ctx.fillRect(0, 0, VW, VH);
  }

  function drawNight(w, ox, oy, t) {
    const k = Clock.dark();
    if (k <= 0.01) return;

    nctx.globalCompositeOperation = 'source-over';
    nctx.clearRect(0, 0, VW, VH);
    nctx.fillStyle = `rgba(8,13,34,${NIGHT_A * k})`;
    nctx.fillRect(0, 0, VW, VH);

    // 파낼 자리 — 주인공이 든 등불과 성 안의 불들
    nctx.globalCompositeOperation = 'destination-out';
    const px = player.x + player.w / 2 - ox, py = player.y + player.h / 2 - oy - 8;
    hole(px, py, 92, 0.96);
    for (const o of lightsOf(w)) {
      const a = A.ATLAS[o.a];
      const lx = o.c * TILE - ox + a.w / 2, ly = o.r * TILE - oy + a.h / 2;
      if (lx < -120 || ly < -120 || lx > VW + 120 || ly > VH + 120) continue;
      hole(lx, ly, LIGHT[o.a] * (1 + Math.sin(t * 2.7 + o.c) * 0.05), 1);
    }
    nctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(nightCv, 0, 0);

    // 불빛의 온기 — 파낸 자리에 주황을 얹어 «불» 로 보이게
    ctx.globalCompositeOperation = 'lighter';
    for (const o of lightsOf(w)) {
      const a = A.ATLAS[o.a];
      const lx = o.c * TILE - ox + a.w / 2, ly = o.r * TILE - oy + a.h / 2;
      if (lx < -120 || ly < -120 || lx > VW + 120 || ly > VH + 120) continue;
      const r = LIGHT[o.a] * (1 + Math.sin(t * 2.7 + o.c) * 0.05);
      glow(lx, ly, r, `rgba(240,158,68,${0.20 * k})`);
    }
    glow(px, py, 70, `rgba(236,190,110,${0.11 * k})`);
    ctx.globalCompositeOperation = 'source-over';
  }

  function hole(x, y, r, s) {
    const g = nctx.createRadialGradient(x, y, r * 0.14, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${s})`);
    g.addColorStop(0.52, `rgba(0,0,0,${s * 0.52})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    nctx.fillStyle = g;
    nctx.beginPath(); nctx.arc(x, y, r, 0, 6.2832); nctx.fill();
  }
  function glow(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  function render(t) {
    const w = world(), ox = Math.round(cam.x), oy = Math.round(cam.y);
    ctx.fillStyle = '#0E1210'; ctx.fillRect(0, 0, VW, VH);

    const c0 = Math.max(0, Math.floor(ox / TILE)), c1 = Math.min(w.w - 1, Math.ceil((ox + VW) / TILE));
    const r0 = Math.max(0, Math.floor(oy / TILE)), r1 = Math.min(w.h - 1, Math.ceil((oy + VH) / TILE));

    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        A.draw(ctx, w.floor[r][c], c * TILE - ox, r * TILE - oy);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const d = w.deco[r * w.w + c];
        if (d) A.draw(ctx, d, c * TILE - ox, r * TILE - oy);
      }

    // 규격서의 빨간 기준선으로 앞뒤 정렬
    const draws = [];
    for (const o of w.objs) {
      const a = A.ATLAS[o.a];
      const dx = o.c * TILE - ox, dy = o.r * TILE - oy;
      if (dx > VW || dy > VH || dx + a.w < 0 || dy + a.h < 0) continue;
      draws.push({ base: o.base, obj: o, dx, dy, a });
    }
    for (const e of [player, ...live(w)]) draws.push({ base: e.y + e.h, ent: e });
    draws.sort((p, q) => (p.base - q.base) || ((p.obj ? 0 : 1) - (q.obj ? 0 : 1)));

    const near = Dlg.isOpen() ? null : nearbyNpc();
    const opt = { heroImg, sheetMode };
    for (const d of draws) {
      if (d.obj) A.draw(ctx, d.obj.a, d.dx, d.dy);
      else Actors.draw(ctx, d.ent, d.ent.x - ox, d.ent.y - oy, opt);
    }
    if (w.def.dark) {                                  // 좁은 골목·실내의 어둠
      const px = player.x + player.w / 2 - ox, py = player.y + player.h / 2 - oy;
      const g = ctx.createRadialGradient(px, py, 20, px, py, 160);
      g.addColorStop(0, 'rgba(6,8,10,0)');
      g.addColorStop(1, `rgba(6,8,10,${w.def.dark})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    drawDusk(t);                                       // 노을
    drawNight(w, ox, oy, t);                           // 밤 — 등불 둘레만 밝다

    // 머리 위 표시는 사람들을 다 그린 뒤, 어둠보다도 위에 얹는다
    for (const d of draws) if (d.ent) drawTags(d.ent, ox, oy, d.ent === near, t);

    // 지금 찾아가야 할 사람·물건 — 이름표가 옅어져도 표지가 남고,
    // 화면 밖에 있으면 가장자리에 방향 화살표가 선다
    const tg = Quest.target();
    if (tg && (!tg.map || tg.map === mapId)) {
      let mx = null, my = 0, npcTarget = false;
      if (tg.npc)
        for (const n of live(w))
          if (n.id === tg.npc) { mx = n.x - ox + n.w / 2; my = headTop(n) - oy; npcTarget = true; }
      if (mx === null && tg.obj)
        for (const o of w.objs) {
          if (o.a !== tg.obj || !(o.talk || o.to)) continue;
          const a = A.ATLAS[o.a];
          mx = o.c * TILE - ox + a.w / 2; my = o.r * TILE - oy;
          break;
        }
      if (mx !== null) {
        drawMark(mx, my - (npcTarget ? 41 : 12), t);
        edgeArrow(mx, my, t);
      }
    }

    drawSpecOverlay(w, ox, oy);

    // 장소 이름표 — 화면 왼쪽 위 «할 일» 띠와 겹치지 않게 아래쪽 가운데에 둔다
    if (cardT > 0) {
      ctx.globalAlpha = Math.min(1, cardT * 2.2);
      ctx.fillStyle = '#DCD6C6'; ctx.fillRect(VW / 2 - 72, VH - 42, 144, 24);
      ctx.fillStyle = '#28302B';
      ctx.font = '600 13px "IBM Plex Sans KR", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(w.def.name, VW / 2, VH - 29);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    if (trans.a > 0) { ctx.fillStyle = `rgba(8,10,9,${trans.a})`; ctx.fillRect(0, 0, VW, VH); }

    // 눈 붙이기 — 어두워졌다가 밝아지는 사이에 시곗바늘이 옮겨집니다
    const na = napAlpha();
    if (na > 0) {
      ctx.fillStyle = `rgba(5,7,6,${na})`;
      ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = Math.max(0, (na - 0.55) / 0.45);
      ctx.fillStyle = '#C9D2C6';
      ctx.font = '600 13px "IBM Plex Sans KR", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(nap.say, VW / 2, VH / 2);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }

  /* 규격서 범례와 같은 색으로 겹쳐 그리는 확인용 표시 */
  function drawSpecOverlay(w, ox, oy) {
    if (!(show.sprite || show.foot || show.door || show.base)) return;
    ctx.lineWidth = 1;
    for (const o of w.objs) {
      const a = A.ATLAS[o.a];
      const dx = o.c * TILE - ox, dy = o.r * TILE - oy;
      if (dx > VW || dy > VH || dx + a.w < 0 || dy + a.h < 0) continue;
      if (show.sprite) { ctx.strokeStyle = '#63a8e8'; ctx.strokeRect(dx + .5, dy + .5, a.w - 1, a.h - 1); }
      const f = W.footOf(o);
      if (f) {
        const fx = f.c * TILE - ox, fy = f.r * TILE - oy;
        if (show.foot) {
          ctx.fillStyle = 'rgba(95,192,106,.28)';
          ctx.fillRect(fx, fy, f.w * TILE, f.h * TILE);
          ctx.strokeStyle = '#5fc06a'; ctx.strokeRect(fx + .5, fy + .5, f.w * TILE - 1, f.h * TILE - 1);
        }
        if (show.door && (o.talk || o.to)) {
          const list = (a.kind === 'building') ? a.front : Array.from({ length: f.w }, (_, i) => i);
          ctx.fillStyle = 'rgba(232,154,60,.42)';
          for (const i of list) ctx.fillRect(fx + i * TILE, fy + (f.h - 1) * TILE, TILE, TILE);
        }
      }
      if (show.base) {
        ctx.strokeStyle = '#e05c5c'; ctx.beginPath();
        ctx.moveTo(dx, dy + a.h - .5); ctx.lineTo(dx + a.w, dy + a.h - .5); ctx.stroke();
      }
    }
    if (show.foot) {
      ctx.strokeStyle = '#e05c5c';
      ctx.strokeRect(player.x - ox + .5, player.y - oy + .5, player.w, player.h);
    }
  }

  /* ══════════════════════════════════════════
     7. 루프와 판독
     ══════════════════════════════════════════ */
  let last = performance.now(), fpsAcc = 0, fpsN = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!Title.isOpen()) {                       // 멈춰 있는 동안은 성 안도 멈춘다
      elapsed += dt;
      // 하루의 시계 — 낮 6분이 지나면 해가 지고, 10분이 되면 하루가 끝난다.
      // 읽는 화면(브리핑·카드·수첩)이 떠 있는 동안은 시간이 흐르지 않는다
      const ev = Clock.tick(dt, Quest.busy() || bookOn);
      if (ev === 'night') { applyPhase(); Quest.nightfall(); }
      else if (ev === 'end') Quest.endDay();
      else if (ev === 'dusk') Snd.play('quest', 0.5);
      update(dt); render(elapsed);
      // 대화·장소 이동·작은 판·수첩·눈 붙이기 중이면 완료 카드는 끝날 때까지 기다린다
      Quest.tick(dt, Dlg.isOpen() || trans.phase !== 'none' || Mini.isOpen() || bookOn || nap.on);
      fpsAcc += dt; fpsN++;
      if (fpsAcc >= 0.35) { paintClock(); paintRest(); readout(); fpsAcc = 0; fpsN = 0; }
    }
    requestAnimationFrame(frame);
  }

  /* 오른쪽 위 시계 — 며칠인지와, 하루가 얼마나 흘렀는지.
     도넛(둘레 CIRC)이 한 바퀴 차면 하루가 끝납니다. 남은 시간을 숫자로 세지는 않습니다 */
  const clockEl = { root: rd('clock'), day: rd('clockDay'), hour: rd('clockHour'),
                    arc: rd('clockArc'), ico: rd('clockIcon') };
  const CIRC = 2 * Math.PI * 15.5;              // viewBox 36×36, r=15.5 인 원의 둘레
  if (clockEl.arc) clockEl.arc.style.strokeDasharray = CIRC.toFixed(2);

  function paintClock() {
    if (!clockEl.root || !started) return;
    const night = Clock.isNight(), over = Clock.isOver();
    clockEl.day.textContent = Clock.day().short;             // 1일차 · D-8 목
    clockEl.hour.textContent = over ? '하루 끝' : Clock.hourText();   // 제6시 · 이경
    clockEl.ico.textContent = night ? '☾' : '☀';
    clockEl.arc.style.strokeDashoffset = (CIRC * (1 - Clock.dayRatio())).toFixed(2);
    clockEl.root.classList.toggle('is-night', night);
    clockEl.root.classList.toggle('is-dusk', Clock.isDusk());
    clockEl.root.classList.toggle('is-over', over);
  }

  function readout() {
    if (!DBG) return;                          // 판독 칸은 debug.html 에만 있다
    const w = world();
    const c = Math.floor((player.x + player.w / 2) / TILE);
    const r = Math.floor((player.y + player.h / 2) / TILE);
    rd('rdFps').textContent = Math.round(fpsN / fpsAcc);
    rd('rdMap').textContent = w.def.name;
    rd('rdTile').textContent = `${c}, ${r}`;
    const fk = W.floorAt(w, c, r);
    rd('rdFloor').textContent = fk ? A.ATLAS[fk].name : '—';

    const n = nearbyNpc(), o = n ? null : facingObj();
    if (n) {
      rd('lookName').textContent = n.name;
      if (n.char) {
        const m = A.CHARS[n.char];
        rd('lookSpec').textContent = `${m.name} · ${m.cat} · SPACE 로 말 걸기`;
      } else if (n.sprite) {
        const m = A.ATLAS[n.sprite];
        rd('lookSpec').textContent = `${m.name} · 스프라이트 ${m.cols}×${m.rows}칸`;
      } else {
        rd('lookSpec').textContent = '사람 · SPACE 로 말 걸기';
      }
    } else if (o) {
      const a = A.ATLAS[o.a];
      rd('lookName').textContent = a.name;
      rd('lookSpec').textContent =
        `스프라이트 ${a.cols}×${a.rows}칸 · 발판 ${a.fw ? a.fw + '×' + a.fh + '칸' : '없음'}` +
        (a.rows - a.fh > 0 && a.fh ? ` · 오버행 ${a.rows - a.fh}칸` : '');
    } else {
      rd('lookName').textContent = '바라보는 대상 없음';
      rd('lookSpec').textContent = '';
    }
  }

  /* ══════════════════════════════════════════
     8. 오른쪽 계기판 — debug.html 에만 있습니다.
        진짜 게임 화면(index.html)에서는 이 칸이 통째로 없으므로 건너뜁니다
     ══════════════════════════════════════════ */
  const jumpBox = rd('jump');
  function updateJump() {
    if (!jumpBox) return;
    for (const b of jumpBox.children) b.classList.toggle('is-here', b.dataset.map === mapId);
  }

  if (DBG) {
    for (const id in W.MAPS) {
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = W.MAPS[id].name.split(' ')[0]; b.dataset.map = id;
      b.title = W.MAPS[id].name;
      b.addEventListener('click', () => { jumpTo(id); cv.focus(); });
      jumpBox.appendChild(b);
    }

    for (const [id, key] of [['ckFoot','foot'],['ckDoor','door'],['ckSprite','sprite'],['ckBase','base'],['ckName','name']])
      rd(id).addEventListener('change', e => { show[key] = e.target.checked; });

    /* 건너뛰기 — 하루를 손으로 밀어 보며 뒷부분을 확인할 때 씁니다.
       게임 규칙은 건드리지 않고 «끝난 것으로 적기» 만 합니다 (js/quest.js 의 dev) */
    for (const [id, fn] of [
      ['devStep',  () => Quest.dev.step()],
      ['devPhase', () => Quest.dev.phase()],
      ['devRumor', () => { Dlg.learnAll(); Quest.paint(); }],
      ['devSkip',  () => Clock.skip()]
    ]) {
      const b = rd(id);
      if (b) b.addEventListener('click', () => { fn(); paintClock(); paintRest(); cv.focus(); });
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*';
    rd('btnHero').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => { heroImg = img; rd('btnHero').textContent = '주인공 그림 바꾸기'; };
      img.src = URL.createObjectURL(f);
      fileInput.value = '';
    });
    rd('ckSheet').addEventListener('change', e => { sheetMode = e.target.checked; });
  }

  /* ══════════════════════════════════════════
     9. 시작
     ══════════════════════════════════════════ */
  function loadingScreen(done, total) {
    ctx.fillStyle = '#0E1210'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#8ECDAE';
    ctx.font = '600 12px "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`그림 불러오는 중… ${done} / ${total}`, VW / 2, VH / 2 - 12);
    const bw = 220, bx = (VW - bw) / 2, by = VH / 2;
    ctx.strokeStyle = '#5A7768'; ctx.strokeRect(bx + .5, by + .5, bw, 7);
    ctx.fillRect(bx + 1, by + 1, Math.round((bw - 1) * (total ? done / total : 1)), 6);
    ctx.textAlign = 'left';
  }

  async function boot() {
    Dlg.init({
      box: rd('talk'), who: rd('talkWho'), text: rd('talkText'), more: rd('talkMore'),
      list: rd('rumorList'), count: rd('rumorCount')
    });
    Mini.init();
    Quest.init();
    Title.init({ onStart: start, onResume: resume, apply: applyOptions });
    W.buildAll();

    // 시작 화면이 떠 있는 동안 뒤에서 그림을 받는다
    // (인물 키는 로더가 정면·측면·후면 세 장으로 알아서 늘려 받습니다)
    // 고를 수 있는 사람들의 그림도 함께 받아 둬야 고른 즉시 갈아 끼워집니다
    const keys = [...new Set([...W.usedKeys(), PLAYER_CHAR, ...Cast.sprites()])];
    loadingScreen(0, keys.length);
    const res = await A.load(keys, (d, t) => { loadingScreen(d, t); Title.progress(d, t); });
    const cnt = rd('cntAsset'); if (cnt) cnt.textContent = res.loaded;   // 아래 설명글은 debug.html 에만
    Title.markReady();
  }

  boot();
})();
