/* ══════════════════════════════════════════
   main.js — 전체를 엮고 루프를 돌린다

   순서:  에셋 로드 → 장소 굽기 → 매 프레임 update → render
   그리는 순서: 바닥 → 붙박이 조각 → (건물·소품·사람을 기준선으로 정렬) → 어둠 → 규격 표시
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR;
  const A = NS.Assets, W = NS.World, Actors = NS.Actors, Dlg = NS.Dialogue, Snd = NS.Audio, Title = NS.Title;
  const TILE = A.TILE;

  const PLAYER_CHAR = 'g31_traveler';       // 주인공 기본 그림 (assets/images/8_characters)

  const cv = document.getElementById('screen');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const VW = cv.width, VH = cv.height;
  const rd = id => document.getElementById(id);

  /* ── 판 위의 상태 ── */
  const player = Actors.createPlayer(PLAYER_CHAR);
  let mapId = 'lower', heroImg = null, sheetMode = false, started = false;
  const cam = { x: 0, y: 0 };
  let elapsed = 0, portalLock = false, cardT = 0;
  const trans = { phase: 'none', a: 0, dest: null };
  const show = { foot: false, door: false, sprite: false, base: false, name: false };
  const world = () => W.get(mapId);

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
    if (held.has(k)) return;
    held.add(k); paintCaps();
    if (k === 'Space') onAction();
    if (k === 'KeyG') {                       // 규격 표시 한 번에 켜고 끄기
      const on = !(show.foot && show.door && show.sprite && show.base);
      for (const id of ['ckFoot', 'ckDoor', 'ckSprite', 'ckBase']) rd(id).checked = on;
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
    const k = ALIAS[e.code] || e.code;
    if (!Title.isOpen() && ['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','KeyG'].includes(k)) e.preventDefault();
    press(e.code);
  });
  addEventListener('keyup', e => release(e.code));
  addEventListener('blur', () => { held.clear(); escDown = false; paintCaps(); });
  for (const b of document.querySelectorAll('[data-pad]')) {
    const code = b.dataset.pad;
    b.addEventListener('pointerdown', e => { e.preventDefault(); press(code); });
    b.addEventListener('pointerup', e => { e.preventDefault(); release(code); });
    b.addEventListener('pointerleave', () => release(code));
    b.addEventListener('pointercancel', () => release(code));
  }
  cv.addEventListener('pointerdown', () => { cv.focus(); Snd.unlock(); });

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
    for (const n of world().npcs) {
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
      return;
    }
    const o = facingObj();
    if (o) {
      const a = A.ATLAS[o.a];
      Dlg.lookAt(a.name, o.talk || [a.note || '…'], o.to ? o : null);
      return;
    }
    const f = frontCell();
    if (W.isWet(world(), f.c, f.r))
      Dlg.lookAt('물', ['수조에 고인 물이다. 바닥이 비쳐 보인다.'], null);
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
  }
  function jumpTo(id) {
    if (trans.phase !== 'none') return;
    trans.phase = 'out'; trans.a = 0;
    trans.dest = { to: id, at: W.MAPS[id].spawn, dir: 'down' };
  }

  /* ══════════════════════════════════════════
     4-b. 시작 화면 · 잠시 멈춤
     ══════════════════════════════════════════ */
  function start() {
    if (started) return;
    started = true;
    Snd.unlock();
    travel('lower', W.MAPS.lower.spawn, 'down');
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
      rd('ckName').checked = o.names;
    }
    if (o.spec !== applied.spec) {
      applied.spec = o.spec;
      for (const [id, key] of [['ckFoot','foot'],['ckDoor','door'],['ckSprite','sprite'],['ckBase','base']]) {
        rd(id).checked = o.spec; show[key] = o.spec;
      }
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
    const npcs = w.npcs;
    const free = !Dlg.isOpen() && trans.phase === 'none';
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
  function drawBubble(sx, sy, w, t) {
    const x = Math.round(sx + w / 2 - 7), y = Math.round(sy - 13 + Math.sin(t * 4) * 1.5);
    ctx.fillStyle = 'rgba(18,22,19,.86)';
    ctx.fillRect(x, y, 14, 10); ctx.fillRect(x + 5, y + 10, 4, 2);
    ctx.fillStyle = '#8ECDAE';
    ctx.fillRect(x + 3, y + 4, 2, 2); ctx.fillRect(x + 6, y + 4, 2, 2); ctx.fillRect(x + 9, y + 4, 2, 2);
  }

  function label(text, cx, by, color) {
    ctx.font = '600 10px "IBM Plex Sans KR", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(16,20,17,.82)';
    ctx.fillRect(Math.round(cx - w / 2), Math.round(by - 10), Math.round(w), 13);
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(cx), Math.round(by - 3));
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
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
    for (const e of [player, ...w.npcs]) draws.push({ base: e.y + e.h, ent: e });
    draws.sort((p, q) => (p.base - q.base) || ((p.obj ? 0 : 1) - (q.obj ? 0 : 1)));

    const near = Dlg.isOpen() ? null : nearbyNpc();
    const opt = { heroImg, sheetMode };
    for (const d of draws) {
      if (d.obj) A.draw(ctx, d.obj.a, d.dx, d.dy);
      else {
        Actors.draw(ctx, d.ent, d.ent.x - ox, d.ent.y - oy, opt);
        if (d.ent === near) drawBubble(d.ent.x - ox, d.ent.y - oy, d.ent.w, t);
      }
    }

    if (w.def.dark) {                                  // 좁은 골목·실내의 어둠
      const px = player.x + player.w / 2 - ox, py = player.y + player.h / 2 - oy;
      const g = ctx.createRadialGradient(px, py, 20, px, py, 160);
      g.addColorStop(0, 'rgba(6,8,10,0)');
      g.addColorStop(1, `rgba(6,8,10,${w.def.dark})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }

    drawSpecOverlay(w, ox, oy);

    if (show.name) for (const n of w.npcs) label(n.name, n.x - ox + n.w / 2, n.y - oy - 6, '#8ECDAE');

    if (cardT > 0) {                                   // 장소 이름표
      ctx.globalAlpha = Math.min(1, cardT * 2.2);
      ctx.fillStyle = '#DCD6C6'; ctx.fillRect(VW / 2 - 72, 14, 144, 24);
      ctx.fillStyle = '#28302B';
      ctx.font = '600 13px "IBM Plex Sans KR", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(w.def.name, VW / 2, 27);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    if (trans.a > 0) { ctx.fillStyle = `rgba(8,10,9,${trans.a})`; ctx.fillRect(0, 0, VW, VH); }
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
      update(dt); render(elapsed);
      fpsAcc += dt; fpsN++;
      if (fpsAcc >= 0.35) { readout(); fpsAcc = 0; fpsN = 0; }
    }
    requestAnimationFrame(frame);
  }

  function readout() {
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
     8. 오른쪽 계기판
     ══════════════════════════════════════════ */
  const jumpBox = rd('jump');
  for (const id in W.MAPS) {
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = W.MAPS[id].name.split(' ')[0]; b.dataset.map = id;
    b.title = W.MAPS[id].name;
    b.addEventListener('click', () => { jumpTo(id); cv.focus(); });
    jumpBox.appendChild(b);
  }
  function updateJump() {
    for (const b of jumpBox.children) b.classList.toggle('is-here', b.dataset.map === mapId);
  }

  for (const [id, key] of [['ckFoot','foot'],['ckDoor','door'],['ckSprite','sprite'],['ckBase','base'],['ckName','name']])
    rd(id).addEventListener('change', e => { show[key] = e.target.checked; });

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
    Title.init({ onStart: start, onResume: resume, apply: applyOptions });
    W.buildAll();

    // 시작 화면이 떠 있는 동안 뒤에서 그림을 받는다
    // (인물 키는 로더가 정면·측면·후면 세 장으로 알아서 늘려 받습니다)
    const keys = [...W.usedKeys(), PLAYER_CHAR];
    loadingScreen(0, keys.length);
    const res = await A.load(keys, (d, t) => { loadingScreen(d, t); Title.progress(d, t); });
    rd('cntAsset').textContent = res.loaded;
    Title.markReady();
  }

  boot();
})();
