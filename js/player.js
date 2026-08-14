/* ══════════════════════════════════════════
   player.js — 사람과 짐승의 이동·애니메이션

   주인공과 NPC 는 몸통 상자(w×h, 발치 기준)로 부딪히고,
   그림은 그 상자의 발치 중앙에 맞춰 얹습니다.
   인물 그림은 32×48 한 장짜리라, 걸을 때 한 픽셀 들썩이는 것으로 걸음을 냅니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR;
  const A = NS.Assets;
  const TILE = A.TILE;

  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };   // 업로드한 4×4 시트의 줄 순서

  /* ══════════════════════════════════════════
     1. 만들기
     ══════════════════════════════════════════ */
  function createPlayer(charKey) {
    return {
      isPlayer: true, name: '나그네', char: charKey || null, sprite: null,
      x: 0, y: 0, w: 18, h: 12, drawH: 34,
      speed: 78, run: 1.9, dir: 'down', moving: false, animT: 0, frame: 0,
      pal: ['#DDD2BC', '#E2C199', '#3A3128', '#9E5B45']
    };
  }

  function createNpc(d, mapKey) {
    const sp = d.sprite ? A.ATLAS[d.sprite] : null;
    const w = sp ? Math.max(12, sp.fw * TILE - 8) : 16;   // 짐승은 그림 발판만큼 자리를 먹는다
    const h = 12;
    const x = d.at[0] * TILE + (TILE - w) / 2;
    const y = d.at[1] * TILE + TILE - h - 6;
    return {
      key: mapKey + ':' + d.id, id: d.id, map: mapKey, name: d.name, lines: d.lines,
      rumors: d.rumors || [],
      only: d.only || null, off: false,        // only:"day"|"night" — 낮에만·밤에만 나오는 사람
      who: d.who || null,                      // who:"joel" — 그 사람의 회차에만 나오는 사람
      say: d.say || null,                      // 주고받는 대사 (요엘의 조우 사다리)
      meet: d.meet || null,                    // 만나면 요엘의 수첩 몇 번 칸이 채워지나
      murmur: d.murmur || null,                // 곁을 지나가면 들리는 한 마디 (요엘의 골목)
      real: d.real || null,                    // 만나고 나면 드러나는 진짜 이름
      needs: d.needs || null,                  // needs:"branch" — 손에 가지가 있어야 말이 걸린다
      reveals: d.reveals || null,              // 이 사람을 만나면 저 사람의 이름이 드러난다 (병사 → 빌라도)
      crowd: !!d.crowd,                        // 박자에 맞춰 «호산나» 를 외치는 무리
      mode: d.mode || 'wander', char: d.char || null, sprite: d.sprite || null,
      x, y, w, h, drawH: sp ? sp.h : 48,
      homeX: x, homeY: y, radius: (d.radius || 3) * TILE, speed: d.speed || 24,
      path: (d.path || []).map(([c, r]) => ({
        x: c * TILE + (TILE - w) / 2, y: r * TILE + TILE - h - 6
      })),
      pathIdx: 0, dir: d.dir || 'down', vx: 0, vy: 0,
      state: 'pause', timer: Math.random() * 1.4,
      moving: false, animT: 0, frame: 0, busy: false,
      pal: d.pal || ['#B8A487', '#E2C199', '#3A3128', '#8C6E4E']
    };
  }

  /* ══════════════════════════════════════════
     2. 이동 — 벽과 다른 인물을 함께 본다
     ══════════════════════════════════════════ */
  function hitsEntity(x, y, w, h, self, list) {
    for (const o of list) {
      if (o === self) continue;
      if (x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y) return true;
    }
    return false;
  }

  function moveEntity(world, e, dx, dy, blockers, snap) {
    const solidRect = NS.World.solidRect;
    let moved = false;
    if (dx) {
      const nx = e.x + dx;
      if (hitsEntity(nx, e.y, e.w, e.h, e, blockers)) { /* 막힘 */ }
      else if (!solidRect(world, nx, e.y, e.w, e.h)) { e.x = nx; moved = true; }
      else if (snap) {                                  // 벽에 딱 붙여 주기
        const prev = e.x;
        e.x = dx > 0 ? Math.floor((nx + e.w - 0.01) / TILE) * TILE - e.w - 0.01
                     : (Math.floor(nx / TILE) + 1) * TILE + 0.01;
        if (solidRect(world, e.x, e.y, e.w, e.h) || hitsEntity(e.x, e.y, e.w, e.h, e, blockers)) e.x = prev;
        else moved = true;
      }
    }
    if (dy) {
      const ny = e.y + dy;
      if (hitsEntity(e.x, ny, e.w, e.h, e, blockers)) { /* 막힘 */ }
      else if (!solidRect(world, e.x, ny, e.w, e.h)) { e.y = ny; moved = true; }
      else if (snap) {
        const prev = e.y;
        e.y = dy > 0 ? Math.floor((ny + e.h - 0.01) / TILE) * TILE - e.h - 0.01
                     : (Math.floor(ny / TILE) + 1) * TILE + 0.01;
        if (solidRect(world, e.x, e.y, e.w, e.h) || hitsEntity(e.x, e.y, e.w, e.h, e, blockers)) e.y = prev;
        else moved = true;
      }
    }
    return moved;
  }

  /* ══════════════════════════════════════════
     3. 주인공
     ══════════════════════════════════════════ */
  /* input 은 두 가지로 들어옵니다.
       열쇠판 — left·right·up·down 참거짓
       조이스틱 — ax·ay 에 길이 1로 맞춘 방향 (main.js 가 기울인 만큼 재서 넘깁니다)
     둘 다 run 으로 달립니다 (조이스틱은 끝까지 밀면 run 이 켜집니다) */
  function updatePlayer(world, p, dt, input, blockers) {
    let vx = 0, vy = 0;
    const stick = (input.ax || input.ay);
    if (stick) {
      vx = input.ax; vy = input.ay;
    } else {
      if (input.left)  vx -= 1;
      if (input.right) vx += 1;
      if (input.up)    vy -= 1;
      if (input.down)  vy += 1;
    }

    p.moving = (vx !== 0 || vy !== 0);
    if (!p.moving) { p.animT = 0; p.frame = 0; return false; }

    // 열쇠판의 대각선만 보정합니다 (조이스틱은 이미 길이가 1입니다)
    if (!stick && vx && vy) { const k = Math.SQRT1_2; vx *= k; vy *= k; }
    const spd = p.speed * (input.run ? p.run : 1) * dt;
    // 더 많이 기운 축으로 몸을 돌린다 (같으면 좌우가 이깁니다 — 열쇠판 때와 같게)
    if (Math.abs(vx) >= Math.abs(vy)) p.dir = vx < 0 ? 'left' : 'right';
    else p.dir = vy < 0 ? 'up' : 'down';

    const a = moveEntity(world, p, vx * spd, 0, blockers, true);
    const b = moveEntity(world, p, 0, vy * spd, blockers, true);
    p.animT += dt * (input.run ? 11 : 7);
    p.frame = Math.floor(p.animT) % 4;
    return a || b;
  }

  /* ══════════════════════════════════════════
     4. NPC — 제자리 · 어슬렁 · 순찰
     ══════════════════════════════════════════ */
  function faceFrom(n, vx, vy) {
    if (vx < 0) n.dir = 'left'; else if (vx > 0) n.dir = 'right';
    else if (vy < 0) n.dir = 'up'; else if (vy > 0) n.dir = 'down';
  }
  function pickWanderDir(n) {
    const dx = n.homeX - n.x, dy = n.homeY - n.y;
    if (Math.hypot(dx, dy) > n.radius) {                 // 너무 멀어지면 제자리로 돌아온다
      if (Math.abs(dx) > Math.abs(dy)) { n.vx = Math.sign(dx); n.vy = 0; }
      else { n.vx = 0; n.vy = Math.sign(dy); }
      return;
    }
    const o = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0];
    n.vx = o[0]; n.vy = o[1];
  }

  function updateNpc(world, n, dt, blockers) {
    if (n.busy) { n.moving = false; n.animT = 0; n.frame = 0; return; }   // 말 거는 동안은 멈춘다
    if (n.mode === 'idle') { n.moving = false; return; }
    n.timer -= dt;

    if (n.mode === 'patrol' && n.path.length) {
      const t = n.path[n.pathIdx];
      const dx = t.x - n.x, dy = t.y - n.y;
      if (Math.hypot(dx, dy) < 2.5) {
        n.x = t.x; n.y = t.y;
        n.pathIdx = (n.pathIdx + 1) % n.path.length;
        n.timer = 0.5 + Math.random() * 0.6; n.state = 'pause'; n.moving = false; return;
      }
      if (n.timer > 0 && n.state === 'pause') { n.moving = false; return; }
      n.state = 'walk';
      let mx = 0, my = 0;
      if (Math.abs(dx) > 1) mx = Math.sign(dx); else if (Math.abs(dy) > 1) my = Math.sign(dy);
      const ok = moveEntity(world, n, mx * n.speed * dt, my * n.speed * dt, blockers, false);
      faceFrom(n, mx, my);
      n.moving = ok;
      if (!ok) { n.state = 'pause'; n.timer = 0.35; }
    } else {
      if (n.timer <= 0) {
        if (n.state === 'walk') { n.state = 'pause'; n.timer = 0.5 + Math.random() * 1.7; n.vx = n.vy = 0; }
        else { n.state = 'walk'; n.timer = 0.4 + Math.random() * 1.1; pickWanderDir(n); }
      }
      if (n.state === 'walk' && (n.vx || n.vy)) {
        const ok = moveEntity(world, n, n.vx * n.speed * dt, n.vy * n.speed * dt, blockers, false);
        faceFrom(n, n.vx, n.vy);
        n.moving = ok;
        if (!ok) { n.state = 'pause'; n.timer = 0.25; }
      } else n.moving = false;
    }
    if (n.moving) { n.animT += dt * 6; n.frame = Math.floor(n.animT) % 4; }
    else { n.animT = 0; n.frame = 0; }
  }

  /* ══════════════════════════════════════════
     5. 그리기
     ══════════════════════════════════════════ */
  function shadow(ctx, footX, footY, w) {
    ctx.fillStyle = 'rgba(0,0,0,.26)';
    ctx.beginPath();
    ctx.ellipse(footX, footY - 1, w / 2 + 1, 3.5, 0, 0, 6.2832);
    ctx.fill();
  }

  /* 걸을 때 한 픽셀 들썩임 */
  const bobOf = e => (e.moving && (e.frame === 1 || e.frame === 3)) ? 1 : 0;

  function draw(ctx, e, sx, sy, opt) {
    const footX = sx + e.w / 2, footY = sy + e.h;
    const bob = bobOf(e);

    // 업로드한 주인공 그림이 있으면 그것부터
    if (e.isPlayer && opt && opt.heroImg) {
      shadow(ctx, footX, footY, e.w);
      const img = opt.heroImg;
      if (opt.sheetMode) {                       // 4×4 걷기 시트
        const fw = img.width / 4, fh = img.height / 4;
        const dh = e.drawH, dw = dh * (fw / fh);
        ctx.drawImage(img, e.frame * fw, DIR_ROW[e.dir] * fh, fw, fh,
                      Math.round(footX - dw / 2), Math.round(footY - dh + 2 - bob), dw, dh);
      } else {
        const dh = e.drawH, dw = dh * (img.width / img.height);
        ctx.drawImage(img, Math.round(footX - dw / 2), Math.round(footY - dh + 2 - bob), dw, dh);
      }
      return;
    }

    // assets 의 인물 그림 (32×48, 발치 중앙 기준)
    // 보는 방향에 따라 정면·측면·후면 중 한 장을 골라 준다
    if (e.char) {
      shadow(ctx, footX, footY, e.w);
      const m = A.CHARS[e.char];
      const dx = Math.round(footX - m.w / 2), dy = Math.round(footY - m.h + 2 - bob);
      A.drawChar(ctx, e.char, e.dir, dx, dy);
      return;
    }

    // 짐승 등 아틀라스 그림
    if (e.sprite) {
      const m = A.ATLAS[e.sprite];
      const dx = Math.round(footX - m.w / 2), dy = Math.round(footY - m.h + 2 - bob);
      if (e.dir === 'left') A.drawFlipped(ctx, e.sprite, dx, dy);
      else A.draw(ctx, e.sprite, dx, dy);
      return;
    }

    // 그림이 아직 없을 때 쓰는 도트 대역
    shadow(ctx, footX, footY, e.w);
    const [cloth, skin, hair] = e.pal, accent = e.pal[3];
    const x = Math.round(footX - 8), y = Math.round(footY - 27 + bob);
    ctx.fillStyle = '#4A4038'; ctx.fillRect(x + 3, y + 22, 4, 4); ctx.fillRect(x + 9, y + 22, 4, 4);
    ctx.fillStyle = cloth;  ctx.fillRect(x + 2, y + 11, 12, 12);
    ctx.fillStyle = accent; ctx.fillRect(x + 2, y + 17, 12, 3);
    ctx.fillStyle = skin;   ctx.fillRect(x + 3, y + 3, 10, 9);
    ctx.fillStyle = hair;
    if (e.dir === 'up') ctx.fillRect(x + 2, y + 1, 12, 10);
    else { ctx.fillRect(x + 2, y + 1, 12, 5); ctx.fillRect(x + 1, y + 5, 2, 6); ctx.fillRect(x + 13, y + 5, 2, 6); }
    ctx.fillStyle = '#2A2723';
    if (e.dir === 'down') { ctx.fillRect(x + 5, y + 7, 2, 2); ctx.fillRect(x + 10, y + 7, 2, 2); }
    else if (e.dir === 'left') ctx.fillRect(x + 4, y + 7, 2, 2);
    else if (e.dir === 'right') ctx.fillRect(x + 11, y + 7, 2, 2);
  }

  NS.Actors = { createPlayer, createNpc, moveEntity, updatePlayer, updateNpc, draw, DIR_ROW };
})();
