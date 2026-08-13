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

  const DEFAULTS = { bgm: 45, sfx: 50, mute: false, names: false, spec: false, video: true,
                     hero: 'g31_traveler' };
  const opt = Object.assign({}, DEFAULTS, read());

  let hooks = {};                 // { onStart, onResume, apply }
  let mode = 'title';             // 'title' | 'pause'
  let cur = 'main';               // 지금 보이는 쪽 (main · option · help · credit)
  let open = true, ready = false;
  let unlocked = false;           // 사용자가 화면을 한 번 건드렸나 (그래야 소리가 난다)
  let el = {};
  const items = [];               // 차림표 항목들
  let sel = 0;

  const soundOn = () => unlocked && !opt.mute && opt.bgm > 0;

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
      grid: rd('charGrid'), now: rd('charNow')
    };
    buildChars();

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
      if (cur !== 'main') {                       // 하위 쪽에서는 Enter·Space 로도 되돌아간다
        if (k === 'Enter' || k === 'Space') { e.preventDefault(); page('main'); }
        return;                                   // Esc 는 main.js 가 맡는다
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

    /* 소리 단추 — 꺼져 있으면 켜고, 켜져 있으면 끈다 */
    el.sound.addEventListener('click', () => {
      if (soundOn()) opt.mute = true;
      else {
        opt.mute = false;
        if (!opt.bgm) opt.bgm = DEFAULTS.bgm;
        arm();
      }
      save(); paintOptions(); apply(); paintSound();
    });

    /* 브라우저는 사용자가 한 번 건드려야 소리를 내준다 */
    const firstTouch = () => {
      arm();
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
      save(); paintOptions(); paintHero(); apply();
    });

    paintOptions(); paintSound(); apply();
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
     주인공 고르기 — assets 의 인물 표를 그대로 늘어놓는다
     ══════════════════════════════════════════ */
  function buildChars() {
    const A = NS.Assets;
    if (!el.grid || !A) return;
    if (!A.CHARS[opt.hero]) opt.hero = DEFAULTS.hero;      // 없는 키가 저장돼 있으면 되돌린다
    for (const key in A.CHARS) {
      const b = document.createElement('button');
      b.className = 'pick__b'; b.dataset.key = key;
      b.title = A.CHARS[key].name;
      const img = document.createElement('img');
      img.src = A.pathOf(key); img.alt = A.CHARS[key].name; img.loading = 'lazy';
      b.appendChild(img);
      b.addEventListener('click', () => pickHero(key));
      el.grid.appendChild(b);
    }
    paintHero();
  }

  function pickHero(key) {
    opt.hero = key;
    save(); paintHero(); apply();
  }

  function paintHero() {
    const A = NS.Assets;
    if (!el.grid || !A) return;
    for (const b of el.grid.children) b.classList.toggle('is-on', b.dataset.key === opt.hero);
    const m = A.CHARS[opt.hero];
    el.now.textContent = m ? m.name : '—';
    if (m) {
      const s = document.createElement('small');
      s.textContent = m.cat;
      el.now.appendChild(s);
    }
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
    hide();
    if (mode === 'pause') hooks.onResume && hooks.onResume();
    else hooks.onStart && hooks.onStart();
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
      : '유월절 엿새 전, 성 안에는 소문이 돈다.';
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
