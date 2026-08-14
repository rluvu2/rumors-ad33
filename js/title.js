/* ══════════════════════════════════════════
   title.js — 시작 화면과 옵션

   assets/videos/start.mp4 을 화면 칸에 깔고 그 위에 차림표를 얹습니다.
   같은 화면이 게임 도중 Esc 를 눌렀을 때 «잠시 멈춤» 으로도 쓰입니다.

   소리는 영상이 아니라 assets/audio/bgm_title.mp3 에서 나옵니다.
   영상은 늘 음소거로 돌아갑니다(그림만 씁니다).

   영상을 바꾸려면 index.html 의 <video src> 만 갈아 끼우면 됩니다.
   파일이 없으면 글자 제목이 대신 나오고 차림표는 그대로 뜹니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR;
  const KEY = 'jr.options';

  /* 기본 주인공은 인물 표(js/cast.js)의 첫 사람 */
  const firstCast = (NS.Cast && NS.Cast.first()) || null;
  const DEFAULTS = { bgm: 45, sfx: 50, mute: false, names: false, spec: false, video: true,
                     hero: (firstCast && firstCast.sprite) || 'g31_traveler' };
  const opt = Object.assign({}, DEFAULTS, read());

  let hooks = {};                 // { onStart, onResume, apply }
  let mode = 'title';             // 'title' | 'pause'
  let cur = 'main';               // 지금 보이는 쪽 (main · option · help · credit)
  let open = true, ready = false;
  let unlocked = false;           // 사용자가 화면을 한 번 건드렸나 (그래야 소리가 난다)
  let el = {};
  const items = [];               // 차림표 항목들
  let sel = 0;

  /* 음악은 «켜짐» 이 기본입니다. 여기서 보는 것은 설정이지 실제로 소리가 나고 있는지가 아닙니다 —
     브라우저가 첫 자동 재생을 막을 수 있어서, 그때는 화면을 한 번 건드리면 되살아납니다 */
  const soundOn = () => !opt.mute && opt.bgm > 0;

  /* 파일로 열면 저장이 막히는 브라우저가 있어 조용히 넘어간다 */
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(opt)); } catch (e) { /* 저장 못 해도 그만 */ }
  }

  const rd = id => document.getElementById(id);

  function init(h) {
    hooks = h || {};
    el = {
      root: rd('title'), vid: rd('titleVid'), tag: rd('titleTag'), hint: rd('titleHint'),
      start: rd('btnStart'), load: rd('titleLoad'), bar: rd('titleBar'),
      sound: rd('btnVidSound'),
      pages: { main: rd('pageMain'), char: rd('pageChar'), option: rd('pageOption'),
               help: rd('pageHelp'), credit: rd('pageCredit') },
      cast: rd('castList'), castName: rd('castName'), castRole: rd('castRole'),
      castLine: rd('castLine'), castBrief: rd('castBrief'), castSpan: rd('castSpan'),
      castGo: rd('btnCastGo')
    };
    buildCast();
    el.castGo.addEventListener('click', castGo);

    /* 차림표 — 누르거나, 방향키로 고르고 Enter */
    items.push(...document.querySelectorAll('#titleMenu .menu__item'));
    items.forEach((b, i) => {
      b.addEventListener('click', () => { sel = i; paintSel(); activate(b.dataset.act); });
      b.addEventListener('pointerenter', () => { sel = i; paintSel(); });
    });
    for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => page('main'));

    addEventListener('keydown', e => {
      if (!open) return;
      const k = e.code;
      if (cur === 'char') {                       // 인물 고르기 — 좌우로 옮기고 Enter 로 시작
        if (k === 'ArrowRight' || k === 'KeyD' || k === 'ArrowDown' || k === 'KeyS') { e.preventDefault(); moveCast(1); }
        else if (k === 'ArrowLeft' || k === 'KeyA' || k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); moveCast(-1); }
        else if (k === 'Enter' || k === 'Space') { e.preventDefault(); castGo(); }
        return;                                   // Esc 는 main.js 가 맡는다 (첫 화면으로 되돌림)
      }
      if (cur !== 'main') {                       // 하위 쪽에서는 Enter·Space 로도 되돌아간다
        if (k === 'Enter' || k === 'Space') { e.preventDefault(); page('main'); }
        return;
      }
      if (k === 'ArrowDown' || k === 'KeyS') { e.preventDefault(); move(1); }
      else if (k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); move(-1); }
      else if (k === 'Enter' || k === 'Space') { e.preventDefault(); activate(items[sel] && items[sel].dataset.act); }
    });

    /* 영상 — 그림만 쓴다. 소리는 언제나 꺼 둔다 */
    el.vid.muted = true;
    el.vid.addEventListener('error', () => {
      el.vid.classList.add('is-gone');
      el.root.classList.add('no-video');
      console.info('[title] 시작 영상을 불러오지 못했습니다: assets/videos/start.mp4');
    });

    /* 소리 단추 — 세 가지 경우를 가려 씁니다.
         꺼 뒀다        → 켠다
         켜 뒀는데 안 난다 → 브라우저가 막은 것이므로 되살린다 (여기서 끄면 두 번 눌러야 하니까)
         나고 있다      → 끈다 */
    el.sound.addEventListener('click', () => {
      if (!soundOn()) {
        opt.mute = false;
        if (!opt.bgm) opt.bgm = DEFAULTS.bgm;
        arm();
      } else if (!NS.Audio.isOn()) {
        arm(); NS.Audio.resume();
      } else {
        opt.mute = true;
      }
      save(); paintOptions(); apply(); paintSound();
    });

    /* 브라우저는 사용자가 한 번 건드려야 소리를 내준다.
       아래 arm() 으로 미리 한 번 걸어 두지만 막힐 수 있으므로, 첫 손길에 다시 살린다 */
    const firstTouch = () => {
      arm();
      NS.Audio.resume();
      paintSound();
      removeEventListener('pointerdown', firstTouch);
      removeEventListener('keydown', firstTouch);
    };
    addEventListener('pointerdown', firstTouch);
    addEventListener('keydown', firstTouch);

    /* 옵션 조작 */
    bindRange('optBgm', 'optBgmV', 'bgm');
    bindRange('optSfx', 'optSfxV', 'sfx');
    bindCheck('optNames', 'names');
    bindCheck('optSpec', 'spec');
    bindCheck('optVideo', 'video');
    rd('btnReset').addEventListener('click', () => {
      Object.assign(opt, DEFAULTS);
      save(); paintOptions(); apply();
    });

    paintOptions(); paintSound(); apply();
    // 음악은 켜진 채로 시작합니다 — 브라우저가 허락하면 바로 흐르고,
    // 막으면 첫 손길(firstTouch)에 되살아납니다
    arm();
    show('title');
  }

  function bindRange(id, outId, key) {
    const input = rd(id), out = rd(outId);
    input.addEventListener('input', () => {
      opt[key] = +input.value; out.textContent = input.value;
      save(); apply();
    });
  }
  function bindCheck(id, key) {
    rd(id).addEventListener('change', e => { opt[key] = e.target.checked; save(); apply(); });
  }

  /* ══════════════════════════════════════════
     인물 고르기 — START 를 누르면 나온다. 표는 js/cast.js
     ══════════════════════════════════════════ */
  const cast = () => (NS.Cast ? NS.Cast.all() : []);
  let castSel = 0;

  function buildCast() {
    const A = NS.Assets, list = cast();
    if (!el.cast || !list.length) return;
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cast__b' + (c.ready ? '' : ' is-locked');
      b.dataset.i = i;
      b.title = c.ready ? c.name : '준비 중';

      if (c.ready && c.sprite && A) {
        const img = document.createElement('img');
        img.src = A.pathOf(c.sprite); img.alt = c.name; img.loading = 'lazy'; img.draggable = false;
        b.appendChild(img);
      } else {
        const q = document.createElement('span');
        q.className = 'cast__face'; q.textContent = '?';
        b.appendChild(q);
      }
      const nm = document.createElement('span');
      nm.className = 'cast__nm'; nm.textContent = c.ready ? c.role : '???';
      b.appendChild(nm);

      /* 요엘을 해 본 사람에게만 — 아홉 살짜리가 그 사람에게 붙인 이름이 부제로 붙습니다.
         건너뛴 사람에게는 아무것도 붙지 않고 화면은 여느 때처럼 돕니다 (기획안 5절) */
      const sub = (NS.Joel && i > 0) ? NS.Joel.subtitleFor(i) : null;
      if (sub) {
        const s = document.createElement('small');
        s.className = 'cast__sub';
        s.textContent = sub.name;
        b.appendChild(s);
      }

      // 고른 칸을 한 번 더 누르면 바로 시작합니다
      b.addEventListener('click', () => { if (castSel === i && c.ready) castGo(); else pickCast(i); });
      el.cast.appendChild(b);
    });
    const on = list.findIndex(c => c.ready);
    castSel = on < 0 ? 0 : on;
    paintCast();
  }

  /* 요엘의 수첩이 새로 남았을 수 있으므로 칸이 열릴 때마다 부제를 다시 답니다 —
     요엘의 하루를 막 끝내고 돌아온 «바로 그 화면» 에서 여섯 줄이 보여야 하기 때문입니다 */
  function refreshSubs() {
    if (!el.cast || !NS.Joel) return;
    for (const b of el.cast.children) {
      const i = +b.dataset.i;
      const sub = i > 0 ? NS.Joel.subtitleFor(i) : null;
      let s = b.querySelector('.cast__sub');
      if (!sub) { if (s) s.remove(); continue; }
      if (!s) { s = document.createElement('small'); s.className = 'cast__sub'; b.appendChild(s); }
      s.textContent = sub.name;
    }
  }

  function pickCast(i) {
    castSel = i;
    paintCast();
  }
  function moveCast(d) {
    const n = cast().length;
    if (!n) return;
    pickCast((castSel + d + n) % n);
  }

  function paintCast() {
    const c = cast()[castSel];
    if (!el.cast || !c) return;
    for (const b of el.cast.children) b.classList.toggle('is-on', +b.dataset.i === castSel);
    el.castName.firstChild.nodeValue = c.ready ? c.name : '???';
    el.castRole.textContent = c.ready ? `${c.role} · ${c.age}세 · ${c.tag}` : `${c.tag}`;
    /* 요엘의 한 줄이 있으면 그 아이 말을 먼저 얹습니다 — 이 사람을 아이가 어떻게 봤는지 */
    const sub = (NS.Joel && castSel > 0) ? NS.Joel.subtitleFor(castSel) : null;
    el.castLine.textContent = sub ? `요엘의 수첩 — ${sub.line}` : (c.line || '');
    el.castLine.classList.toggle('is-joel', !!sub);
    el.castBrief.textContent = c.brief || '';
    el.castSpan.textContent = c.span || '';
    el.castGo.disabled = !c.ready;
    el.castGo.textContent = c.ready ? '이 사람으로 시작' : '준비 중';
    const b = el.cast.children[castSel];
    if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* 고른 사람으로 게임을 연다 */
  function castGo() {
    const c = cast()[castSel];
    if (!ready || !c || !c.ready) return;
    if (c.sprite) { opt.hero = c.sprite; save(); apply(); }
    hide();
    hooks.onStart && hooks.onStart(c);
  }

  function paintOptions() {
    rd('optBgm').value = opt.bgm; rd('optBgmV').textContent = opt.bgm;
    rd('optSfx').value = opt.sfx; rd('optSfxV').textContent = opt.sfx;
    rd('optNames').checked = opt.names;
    rd('optSpec').checked = opt.spec;
    rd('optVideo').checked = opt.video;
  }
  function paintSound() {
    if (!el.sound) return;
    const on = soundOn();
    el.sound.textContent = on ? '🔊' : '🔇';
    el.sound.title = el.sound.ariaLabel = on ? '소리 끄기' : '소리 켜기';
  }

  /* 첫 손길 — 이때부터 소리가 난다 */
  function arm() {
    if (unlocked) { paintSound(); return; }
    unlocked = true;
    NS.Audio.unlock();
    paintSound();
  }

  /* 설정을 소리와 게임 쪽에 넘긴다 */
  function apply() {
    if (NS.Audio) {
      NS.Audio.setVolume(opt.bgm / 100, opt.sfx / 100);
      NS.Audio.setMuted(opt.mute);
    }
    video(open && opt.video);
    paintSound();
    if (hooks.apply) hooks.apply(opt);
  }

  function video(play) {
    if (!el.vid || el.vid.classList.contains('is-gone')) return;
    if (play) { el.vid.play().catch(() => {}); return; }
    el.vid.autoplay = false;          // 아직 안 틀렸으면 뒤늦게 저절로 켜지지 않도록
    el.vid.pause();
  }

  function page(name) {
    cur = name;
    for (const k in el.pages) el.pages[k].classList.toggle('is-on', k === name);
    if (name === 'char') { refreshSubs(); paintCast(); }
  }

  const paintSel = () => items.forEach((b, i) => b.classList.toggle('is-sel', i === sel));
  function move(d) {
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    paintSel();
  }
  function activate(act) {
    if (act !== 'start') { if (act) page(act); return; }
    if (!ready) return;
    if (mode === 'pause') { hide(); hooks.onResume && hooks.onResume(); return; }
    page('char');            // 시작 = 곧바로 게임이 아니라 «누구의 눈으로 볼 것인가»
    refreshSubs(); paintCast();
  }

  /* ══════════════════════════════════════════
     열고 닫기
     ══════════════════════════════════════════ */
  function show(m) {
    mode = m || 'title';
    open = true;
    el.root.classList.remove('is-off');
    page('main');
    sel = 0; paintSel();
    el.tag.textContent = mode === 'pause'
      ? '잠시 멈췄습니다. 성 안은 그대로 있습니다.'
      : '유월절 D-8, 성 안에는 소문이 돈다.';
    el.hint.textContent = mode === 'pause' ? 'PRESS ESC TO RESUME' : 'PRESS START';
    if (mode === 'pause') { el.start.disabled = false; el.start.textContent = 'RESUME'; }
    else {
      if (ready) el.start.textContent = 'START GAME';
      NS.Audio.playBgm('title');            // 멈춤 화면에서는 흐르던 곡을 건드리지 않는다
    }
    video(opt.video);
  }

  function hide() {
    open = false;
    el.root.classList.add('is-off');
    video(false);
  }

  /* 그림 불러오는 동안 시작 항목에 진행률을 보여 준다 */
  function progress(done, total) {
    if (ready) return;
    const pct = total ? Math.round(done / total * 100) : 100;
    el.bar.style.width = pct + '%';
    el.start.textContent = `NOW LOADING ${pct}%`;
  }
  function markReady() {
    ready = true;
    el.start.disabled = false;
    el.start.textContent = mode === 'pause' ? 'RESUME' : 'START GAME';
    el.load.classList.add('is-done');
    el.root.classList.add('is-ready');       // 이때부터 PRESS START 가 깜빡인다
  }

  NS.Title = { init, show, hide, progress, markReady, page, opt,
               isOpen: () => open, mode: () => mode, current: () => cur };
})();
