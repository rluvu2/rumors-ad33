/* ══════════════════════════════════════════
   audio.js — 배경음과 효과음

   assets/audio/ 에 아래 이름으로 파일을 넣으면 그때부터 소리가 납니다.
   없는 파일은 조용히 건너뜁니다(에러 없음).

     bgm_title.mp3   시작 화면 (지금 들어 있는 곡)
     bgm_alley.mp3   bgm_market.mp3  bgm_temple.mp3
     bgm_gate.mp3    bgm_grove.mp3   bgm_roof.mp3
     sfx_step.wav    sfx_talk.wav    sfx_door.wav

   장소가 바뀌면 곡은 곧바로 멈추고, 그 장소의 파일이 있으면 새로 겁니다.
   (파일이 아직 없는 장소는 조용해집니다)
   시작 영상(start.mp4)의 소리는 쓰지 않습니다 — 영상은 늘 음소거입니다.

   브라우저 정책상 사용자가 화면을 한 번 건드려야 소리가 시작됩니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR;
  const ROOT = 'assets/audio/';

  const BGM = {
    title:  'bgm_title.mp3',
    lower:  'bgm_alley.mp3',
    market: 'bgm_market.mp3',
    temple: 'bgm_temple.mp3',
    gate:   'bgm_gate.mp3',
    grove:  'bgm_grove.mp3',
    roof:   'bgm_roof.mp3'
  };
  const SFX = { step: 'sfx_step.wav', talk: 'sfx_talk.wav', door: 'sfx_door.wav' };

  const cache = {};                 // 파일 이름 -> Audio (없으면 null)
  let unlocked = false;             // 브라우저는 사용자가 한 번 건드려야 소리를 낸다
  let muted = false;
  let current = null, currentKey = null, pending = null;
  let told = false;
  const vol = { bgm: 0.45, sfx: 0.5 };   // 옵션 화면이 바꿔 준다

  const audible = () => unlocked && !muted;

  function setVolume(bgm, sfx) {
    if (bgm != null) vol.bgm = Math.max(0, Math.min(1, bgm));
    if (sfx != null) vol.sfx = Math.max(0, Math.min(1, sfx));
    if (current) current.volume = vol.bgm;
    if (pending) pending.volume = vol.bgm;
    // 볼륨이 0 이라 못 틀고 있던 곡은 다시 걸어 준다 (이미 흐르는 곡은 건드리지 않는다)
    if (currentKey && vol.bgm && !current && !pending) playBgm(currentKey, true);
  }

  function setMuted(on) {
    muted = !!on;
    if (current) current.muted = muted;
    if (!muted && currentKey) playBgm(currentKey, true);
    return muted;
  }
  const toggleMute = () => setMuted(!muted);
  const isOn = () => audible() && !!vol.bgm && !!current;

  function get(file) {
    if (file in cache) return cache[file];
    const a = new Audio(ROOT + file);
    a.preload = 'auto';
    a.addEventListener('error', () => {
      cache[file] = null;
      if (!told) {
        told = true;
        console.info('[audio] 없는 소리 파일은 건너뜁니다. assets/audio/README.md 를 보세요.');
      }
    });
    cache[file] = a;
    return a;
  }

  /* 첫 입력 때 한 번 불러 주면 그 뒤로 소리가 난다 */
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (currentKey) playBgm(currentKey, true);
  }

  /* play() 는 약속(Promise)이라 바로 울리지 않는다.
     그 사이에 장소가 또 바뀔 수 있으므로 요청마다 번호를 매겨 뒤늦게 울리는 곡을 막는다 */
  let reqId = 0;
  function silence() {
    reqId++;                                             // 시작 중이던 곡도 무효로 만든다
    if (current) { current.pause(); current = null; }
    if (pending) { pending.pause(); pending = null; }
  }

  /* 곡을 바꾼다. 장소가 바뀌면 옛 곡은 곧바로 멈춘다 —
     새 장소의 파일이 아직 없으면 그 장소는 조용하다 */
  function playBgm(key, force) {
    const file = BGM[key];
    if (!force && currentKey === key) return;
    currentKey = key;
    const a = (file && audible() && vol.bgm) ? get(file) : null;
    if (a && (a === current || a === pending)) return;   // 이미 흐르는 곡은 되감지 않는다
    silence();
    if (!a) return;
    const id = reqId;
    a.loop = true; a.muted = false; a.volume = vol.bgm;
    if (a.currentTime) a.currentTime = 0;
    pending = a;
    a.play().then(() => {
      if (id !== reqId) { a.pause(); return; }           // 우는 사이에 다른 곡으로 바뀌었다
      pending = null; current = a;
    }).catch(() => { if (id === reqId) pending = null; });  // 파일이 없거나 막히면 조용히
  }

  function stopBgm() { silence(); currentKey = null; }

  /* gain 은 소리마다의 세기(0~1). 옵션의 효과음 볼륨이 여기에 곱해진다 */
  function play(name, gain) {
    if (!audible() || !vol.sfx) return;
    const file = SFX[name];
    if (!file) return;
    const a = get(file);
    if (!a) return;
    const shot = a.cloneNode();                  // 겹쳐 나도 되도록 복제해서 쓴다
    shot.volume = Math.max(0, Math.min(1, (gain == null ? 1 : gain) * vol.sfx));
    shot.play().catch(() => {});
  }

  /* 걸음 소리는 걸음 수에 맞춰서 */
  let stepT = 0;
  function step(dt, moving, running) {
    if (!moving) { stepT = 0; return; }
    stepT += dt;
    if (stepT >= (running ? 0.24 : 0.36)) { stepT = 0; play('step', 0.7); }
  }

  NS.Audio = { unlock, playBgm, stopBgm, play, step, setVolume, setMuted, toggleMute, isOn,
               BGM, SFX, vol, nowPlaying: () => currentKey };
})();
