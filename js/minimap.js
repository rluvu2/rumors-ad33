/* ══════════════════════════════════════════
   minimap.js — 작은 지도

   화면 오른쪽 위에 손바닥만 하게 떠 있습니다. 보여 주는 것은 넷입니다.
     ① 지금 장소의 생김새 — 막힌 곳(벽·건물)과 걸을 수 있는 곳, 물
     ② 나(흰 점, 보는 쪽에 수염이 붙습니다) · 사람들(회색 점)
        아직 못 들은 소문을 쥔 사람은 노란 점입니다
     ③ 지금 할 일이 있는 자리 — 금색 ◆. 같은 장소면 나에게서 그리로 점선이 이어집니다
     ④ 나가는 길 — 초록 네모. 할 일이 다른 장소에 있으면
        그리로 가는 길목 하나만 금색으로 켜지고, 아래에 «→ 어디로» 가 적힙니다

   장소와 장소는 js/map.js 의 두 가지로 이어져 있습니다.
     portals   밟으면 저절로 넘어가는 칸 (길 끝·계단)
     objs 의 to  문 — 앞에 서서 SPACE 를 눌러야 열립니다
   이 이음새를 그래프로 훑어서(BFS) «여기서 다음에 어느 길로 나가야 하는지» 를 찾습니다.
   두 장소 건너에 있어도 바로 앞 길목만 짚어 주므로, 따라가다 보면 닿습니다.

   지도는 장소마다 한 번만 구워서(bake) 두고, 매 판마다 그 위에 점만 얹습니다.
   글씨는 캔버스가 아니라 index.html 의 칸에 넣습니다 — 화면이 커져도 흐려지지 않게.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  const TILE = 32;
  const CW = 120, CH = 88;          // 지도 칸의 속 크기. 화면에 크게 붙는 것은 style.css 몫입니다

  const COL = {
    floor: '#2B3931', wall: '#161D19', water: '#1D4053',
    me:    '#F2F5EF', npc:  '#6E7A72', news:  '#E3C273',
    goal:  '#F2C86B', exit: '#8ECDAE'
  };
  /* 밤에는 지도도 등불 빛으로 — 오른쪽 위 시계와 같은 색을 씁니다 */
  const NIGHT = { floor: '#232C3C', wall: '#141926', water: '#1B3550' };

  const W = () => NS.World;

  let el = null, ctx = null, ready = false, on = true, live = false;

  const KEY = 'jr.minimap';
  const load = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };
  const save = () => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* 못 적어도 그만 */ } };

  function init(els) {
    el = els || {};
    if (!el.cv) return;
    el.cv.width = CW; el.cv.height = CH;
    ctx = el.cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    on = load();
    ready = true;
    paintShell();
  }

  /* 지도 칸을 보이거나 감춘다. live 는 «게임이 시작되었나» — 시작 화면에서는 뜨지 않습니다 */
  function paintShell() {
    if (!ready || !el.root) return;
    el.root.classList.toggle('is-on', on && live);
    if (el.btn) el.btn.classList.toggle('is-off', !on);
  }
  const show = v => { live = !!v; paintShell(); };
  const toggle = () => { on = !on; save(); paintShell(); return on; };
  const isOn = () => on;

  /* ══════════════════════════════════════════
     1. 장소 굽기 — 막힌 칸과 걸을 수 있는 칸을 한 장으로

     충돌 격자(js/map.js 의 bake 가 만들어 둔 solid)를 그대로 씁니다.
     건물·좌판의 발판도 거기 이미 찍혀 있으므로 덩어리로 보입니다
     ══════════════════════════════════════════ */
  function bakeOf(w, night) {
    const want = night ? 'night' : 'day';
    if (w.mmap && w.mmap.mode === want) return w.mmap;

    const s = Math.max(2, Math.min(Math.floor(CW / w.w), Math.floor(CH / w.h)));
    const cv = document.createElement('canvas');
    cv.width = w.w * s; cv.height = w.h * s;
    const c = cv.getContext('2d');
    const P = night ? NIGHT : COL;

    c.fillStyle = P.floor;
    c.fillRect(0, 0, cv.width, cv.height);
    for (let r = 0; r < w.h; r++)
      for (let i = 0; i < w.w; i++) {
        const k = r * w.w + i;
        if (!w.solid[k]) continue;
        c.fillStyle = w.wet.has(k) ? P.water : P.wall;
        c.fillRect(i * s, r * s, s, s);
      }

    w.mmap = { cv, s, mode: want, ox: Math.floor((CW - cv.width) / 2), oy: Math.floor((CH - cv.height) / 2) };
    return w.mmap;
  }

  /* ══════════════════════════════════════════
     2. 장소와 장소의 이음새 — 어느 길이 어디로 나가는가

     kind 'walk' 는 밟으면 넘어가는 칸, 'door' 는 앞에서 SPACE 를 눌러야 하는 문입니다.
     문은 그림 한복판이 아니라 «앞에 서는 칸»(발판의 앞줄)을 자리로 씁니다
     ══════════════════════════════════════════ */
  const exitCache = new Map();

  function exitsOf(id) {
    if (exitCache.has(id)) return exitCache.get(id);
    const m = W().MAPS[id], out = [];
    if (m) {
      for (const p of m.portals) out.push({ to: p.to, kind: 'walk', c: p.c, r: p.r });
      for (const o of m.objs) {
        if (!o.to) continue;
        const f = W().footOf(o);
        out.push({ to: o.to, kind: 'door',
                   c: f ? f.c + (f.w - 1) / 2 : o.c, r: f ? f.r + f.h - 1 : o.r });
      }
    }
    exitCache.set(id, out);
    return out;
  }

  /* 여기서 저기로 가려면 «바로 다음» 에 어느 장소로 넘어가야 하나 (너비 우선 탐색) */
  const routeCache = new Map();

  function route(from, to) {
    if (!from || !to || from === to) return null;
    const key = from + '>' + to;
    if (routeCache.has(key)) return routeCache.get(key);

    const from2 = { [from]: null };      // 어디에서 왔는지를 적어 두고 나중에 되짚습니다
    const q = [from];
    let found = false;
    while (q.length && !found) {
      const cur = q.shift();
      for (const e of exitsOf(cur)) {
        if (e.to in from2) continue;
        from2[e.to] = cur;
        if (e.to === to) { found = true; break; }
        q.push(e.to);
      }
    }
    let next = null;
    if (found) { next = to; while (from2[next] !== from) next = from2[next]; }
    routeCache.set(key, next);
    return next;
  }

  const mapName = id => (W().MAPS[id] ? W().MAPS[id].name : id);

  /* ══════════════════════════════════════════
     3. 지금 할 일이 어디에 있나

     js/quest.js 의 지금 할 일 한 줄을 받아 «어느 장소인가 · 누구인가 · 무엇인가» 로 풉니다
     ══════════════════════════════════════════ */
  function aim(w) {
    const Q = NS.Quest;
    if (!Q || !Q.active || !Q.active() || Q.isOver()) return null;
    const s = Q.step ? Q.step() : null;
    const tg = Q.target();
    const at = (s && s.at) || (tg && tg.map) || null;
    if (!s && !tg) return null;
    return { at, npc: tg ? tg.npc : null, obj: tg ? tg.obj : null, goal: s ? s.goal : null };
  }

  /* 할 일의 표적이 이 장소 어디에 서 있나 — 칸 자리로 돌려줍니다 */
  function aimSpot(w, a) {
    if (!a) return null;
    if (a.npc)
      for (const n of w.npcs)
        if (n.id === a.npc && !n.off) return { c: (n.x + n.w / 2) / TILE, r: (n.y + n.h / 2) / TILE };
    if (a.obj) {
      for (const o of w.objs) {
        if (o.a !== a.obj || !(o.talk || o.to)) continue;
        const f = W().footOf(o);
        return f ? { c: f.c + f.w / 2, r: f.r + f.h - 0.5 } : { c: o.c, r: o.r };
      }
    }
    return null;
  }

  /* 할 일 한 줄이 시키는 «몸짓» — 지도 아래에 한 줄로 적어 둡니다 */
  const ACT = {
    talkTo: '앞에 서서 SPACE — 말을 겁니다',
    talk:   '앞에 서서 SPACE — 말을 겁니다',
    look:   '앞에 서서 SPACE — 살펴봅니다',
    game:   '앞에 서서 SPACE — 판을 엽니다',
    visit:  '그 자리로 걸어 들어갑니다',
    rumor:  '머리 위 « ! » 인 사람에게 SPACE'
  };

  /* ══════════════════════════════════════════
     4. 그리기
     ══════════════════════════════════════════ */
  const dot = (x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2, r * 2);
  };

  /* 금색 ◆ — 할 일이 있는 자리. 숨 쉬듯 커졌다 작아집니다 */
  function diamond(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
    ctx.closePath(); ctx.fill();
  }

  /* 나에게서 할 일까지 — 어느 쪽으로 걸어야 하는지가 한눈에 */
  function trail(x0, y0, x1, y1, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5);
    ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function paint(w, player, t) {
    if (!ready || !on || !live || !w) return;
    const night = NS.Clock ? NS.Clock.isNight() : false;
    if (el.root) el.root.classList.toggle('is-night', night);
    const b = bakeOf(w, night);
    const s = b.s, ox = b.ox, oy = b.oy;
    const X = c => ox + c * s, Y = r => oy + r * s;

    ctx.clearRect(0, 0, CW, CH);
    ctx.drawImage(b.cv, ox, oy);

    const a = aim(w);
    const spot = aimSpot(w, a);
    const far = a && a.at && a.at !== w.id ? a.at : null;
    const next = far ? route(w.id, far) : null;
    const pulse = 0.62 + 0.38 * Math.sin(t * 4);

    /* ── 나가는 길. 할 일이 딴 장소에 있으면 그리로 가는 길목만 금색으로 켠다 ── */
    let door = null;                                   // 금색으로 켠 길목 하나 (아래 글월에 씁니다)
    for (const e of exitsOf(w.id)) {
      const hot = !!next && e.to === next;
      const x = X(e.c + 0.5), y = Y(e.r + 0.5);
      if (hot) {
        if (!door) door = e;
        ctx.globalAlpha = pulse;
        dot(x, y, s * 0.5 + 1.5, COL.goal);
        ctx.globalAlpha = 1;
      }
      dot(x, y, Math.max(1.5, s * 0.5), hot ? COL.goal : COL.exit);
    }

    /* ── 길잡이 점선 — 같은 장소면 할 일까지, 딴 장소면 나가는 길목까지 ── */
    const px = X((player.x + player.w / 2) / TILE), py = Y((player.y + player.h / 2) / TILE);
    const lead = spot ? { x: X(spot.c), y: Y(spot.r) }
               : door ? { x: X(door.c + 0.5), y: Y(door.r + 0.5) } : null;
    if (lead) trail(px, py, lead.x, lead.y, COL.goal);

    /* ── 사람들. 아직 못 들은 소문을 쥔 사람은 노란 점 ── */
    const Dlg = NS.Dialogue;
    for (const n of w.npcs) {
      if (n.off) continue;
      const news = Dlg && Dlg.hasNews(n);
      dot(X((n.x + n.w / 2) / TILE), Y((n.y + n.h / 2) / TILE), news ? 1.5 : 1, news ? COL.news : COL.npc);
    }

    /* ── 할 일이 있는 자리 ── */
    if (spot) {
      ctx.globalAlpha = pulse;
      diamond(lead.x, lead.y, 4.5, COL.goal);
      ctx.globalAlpha = 1;
      diamond(lead.x, lead.y, 2.5, COL.goal);
    }

    /* ── 나 — 흰 점에, 보고 있는 쪽으로 수염 하나 ── */
    dot(px, py, 2, COL.me);
    const o = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[player.dir] || [0, 1];
    ctx.fillStyle = COL.me;
    ctx.fillRect(Math.round(px - 1 + o[0] * 3), Math.round(py - 1 + o[1] * 3), 2, 2);

    paintWords(w, a, far, next, door, spot);
  }

  /* 지도 아래 두 줄 — «어디로» 와 «무엇을» */
  let sig = '';
  function paintWords(w, a, far, next, door, spot) {
    let go = '', act = '';

    if (!a) {
      // 할 일을 다 했거나 하루가 끝났다 — 남은 시간에 무엇을 할 수 있는지만 적어 둔다
      go = '';
      act = (NS.Quest && NS.Quest.isOver())
        ? '하루가 끝났습니다'
        : '노란 « ! » 인 사람에게 말을 걸어 소문을 줍습니다';
    } else if (far && next) {
      // 두 장소 건너에 있으면 바로 앞 길목부터 짚어 준다
      go = next === far ? `→ ${mapName(far)}` : `→ ${mapName(next)}  (그다음 ${mapName(far)})`;
      act = door
        ? (door.kind === 'door' ? '금색 자리의 문 앞에서 SPACE' : '금색 자리로 걸어 들어갑니다')
        : '';
    } else if (far) {
      go = `→ ${mapName(far)}`;
      act = '';
    } else if (spot) {
      go = '이 지도 안 — 금색 ◆ 자리';
      act = ACT[a.goal] || '';
    } else {
      go = '이 지도 안';
      act = ACT[a.goal] || '';
    }

    const line = go + '|' + act;
    if (line === sig) return;                     // 글자는 바뀔 때만 손댑니다
    sig = line;
    if (el.where) el.where.textContent = w.def.name;
    if (el.go) el.go.textContent = go;
    if (el.act) el.act.textContent = act;
  }

  /* 장소를 옮기면 이름과 글월을 곧바로 갈아 끼운다 */
  function onTravel(w) {
    sig = '';
    if (ready && el.where && w) el.where.textContent = w.def.name;
  }

  NS.Minimap = { init, paint, show, toggle, isOn, onTravel, route, mapName };
})();
