/* ══════════════════════════════════════════
   dialogue.js — 대사와 소문

   말을 걸면 그 사람의 고정 대사가 먼저 나오고,
   아직 못 들은 소문을 쥔 사람이면 마지막 줄에 소문 한 자락이 붙습니다.
   들은 소문은 수첩에 쌓이고, 다른 사람들이 그 소문을 옮겨 말하기 시작합니다.

   소문을 하나 더 넣으려면 RUMORS 에 한 줄 적고,
   js/map.js 의 인물에게 rumors:['r13'] 처럼 물려 주면 됩니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR;

  /* ── 소문 목록 ── */
  const RUMORS = {
    r01: { text: '빵값이 또 올랐어. 명절만 되면 늘 이 모양이지.',                 short: '빵값이 또 올랐다',           from: '시장' },
    r02: { text: '총독이 가이사랴에서 올라왔다더군. 명절엔 늘 병력을 늘려.',       short: '총독이 성에 올라왔다',       from: '성문' },
    r03: { text: '갈릴리에서 온 선생이 성전 뜰에서 환전상 탁자를 엎었다는군.',     short: '성전 뜰에서 탁자가 엎어졌다', from: '성전' },
    r04: { text: '밤마다 순찰이 두 배야. 무언가 있는 게 분명해.',                 short: '밤 순찰이 두 배가 되었다',   from: '골목' },
    r05: { text: '기드론 골짜기 건너 올리브 뜰에 사람들이 모여 밤을 샌다더라.',     short: '올리브 뜰에 사람이 모인다',   from: '올리브 뜰' },
    r06: { text: '산헤드린이 한밤중에 급히 모였다는 이야기를 들었네.',             short: '산헤드린이 한밤에 모였다',   from: '성전' },
    r07: { text: '순례자가 성안 사람 수의 몇 배래. 지붕까지 사람이 잔다니까.',      short: '순례자가 성을 메웠다',       from: '성문' },
    r08: { text: '다락방을 빌리려는 사람이 많아 방값이 두 배로 뛰었어.',           short: '다락방 값이 두 배다',        from: '골목' },
    r09: { text: '제사장들이 유월절 어린양 값을 두고 언성을 높였다더군.',           short: '어린양 값으로 다툰다',       from: '시장' },
    r10: { text: '은전 서른 닢이 오갔다는 말이 돌아. 누구 몫인지는 아무도 몰라.',   short: '은전 서른 닢이 오갔다',      from: '시장' },
    r11: { text: '성 밖 언덕에 기둥 세울 자리를 미리 파 두었다더라.',              short: '성 밖에 자리를 파 두었다',   from: '성문' },
    r12: { text: '새벽에 횃불 든 무리가 골짜기로 내려가는 걸 봤다는 사람이 있어.',  short: '횃불 든 무리가 내려갔다',    from: '올리브 뜰' }
  };
  const TOTAL = Object.keys(RUMORS).length;

  const learned = [];                       // 들은 순서대로 소문 id
  const has = id => learned.includes(id);

  let el = null;                            // 화면 요소 묶음
  const state = { open: false, who: '', me: '', lines: [], idx: 0, target: null, door: null, learnAt: -1, learnId: null };

  /* 주인공의 이름 — 주고받는 대사에서 «내가 말하는 줄» 을 가려내는 데 씁니다 (js/main.js 가 적어 줍니다) */
  const setMe = name => { state.me = name || ''; };

  function init(els) {
    el = els;
    renderNotes();
  }

  /* ══════════════════════════════════════════
     대사창
     ══════════════════════════════════════════ */
  function open(who, lines, target, door, learnId) {
    state.open = true;
    state.who = who;
    state.lines = lines; state.idx = 0;
    state.target = target; state.door = door;
    state.learnId = learnId || null;
    state.learnAt = learnId ? lines.length - 1 : -1;
    render();
    el.box.classList.add('is-open');
    // 말을 거는 동안에는 발이 묶이므로, 터치 기기에서는 십자키를 감춥니다 (style.css 의 body.is-talk)
    document.body.classList.add('is-talk');
  }

  /* 한 줄은 글월 하나이거나, 말하는 사람이 붙은 { w:'요엘', t:'…' } 입니다.
     주고받는 대사(요엘의 조우 사다리)는 줄마다 이름표가 바뀌어야 합니다 */
  const lineText = l => (l && typeof l === 'object') ? l.t : l;
  const lineWho  = l => (l && typeof l === 'object' && l.w) ? l.w : null;

  function render() {
    const l = state.lines[state.idx];
    el.text.textContent = lineText(l);
    const isRumor = state.idx === state.learnAt;
    const who = lineWho(l) || state.who;
    el.box.classList.toggle('is-rumor', isRumor);
    el.box.classList.toggle('is-me', lineWho(l) === state.me);   // 주인공이 말하는 줄
    el.who.textContent = isRumor ? '소문 · ' + who : who;
    const last = state.idx >= state.lines.length - 1;
    el.more.textContent = last ? (state.door ? 'SPACE 들어가기' : 'SPACE 닫기') : 'SPACE 계속';
    if (isRumor && state.learnId) learn(state.learnId);
  }

  /* SPACE 한 번 = 다음 줄. 마지막 줄이면 닫고, 출입구였으면 그 문을 돌려준다 */
  function advance() {
    if (state.idx < state.lines.length - 1) { state.idx++; render(); return null; }
    const door = state.door;
    close();
    return door;
  }

  function close() {
    if (state.target) state.target.busy = false;
    state.open = false; state.target = null; state.door = null;
    state.learnAt = -1; state.learnId = null;
    el.box.classList.remove('is-open', 'is-rumor');
    document.body.classList.remove('is-talk');
  }

  /* ══════════════════════════════════════════
     말 걸기 — 고정 대사 뒤에 소문 한 자락
     ══════════════════════════════════════════ */
  function talkTo(npc) {
    /* say — 주고받는 대사. 요엘의 조우 사다리는 요엘이 먼저 말을 걸므로 줄마다 이름표가 바뀝니다.
       한 번 주고받은 뒤에는 여느 사람처럼 lines 로 돌아갑니다 */
    if (npc.say && !npc.said) {
      npc.said = true;
      open(npc.name, npc.say.slice(), npc, null, null);
      return;
    }
    const lines = npc.lines.slice();
    const fresh = npc.rumors.find(id => RUMORS[id] && !has(id));
    if (fresh) {
      lines.push(RUMORS[fresh].text);
      open(npc.name, lines, npc, null, fresh);
      return;
    }
    const echo = pickEcho(npc);
    if (echo) lines.push(echo);
    open(npc.name, lines, npc, null, null);
  }

  /* 이미 퍼진 소문은 아무나 옮겨 말한다 */
  function pickEcho(npc) {
    if (!learned.length || Math.random() > 0.45) return null;
    const id = learned[(Math.random() * learned.length) | 0];
    if (npc.rumors.includes(id)) return null;             // 원래 주인은 빼고
    const tail = ['…라는 말, 자네도 들었나?', '…그런 말이 여기까지 왔어.', '…다들 그 얘기뿐이야.'];
    return RUMORS[id].short + tail[(Math.random() * tail.length) | 0];
  }

  function lookAt(name, lines, door) {
    open(name, lines, null, door || null, null);
  }

  /* ══════════════════════════════════════════
     소문 수첩
     ══════════════════════════════════════════ */
  function learn(id) {
    if (has(id)) return;
    learned.push(id);
    renderNotes();
  }

  function renderNotes() {
    if (!el || !el.list) return;
    el.count.textContent = `${learned.length}/${TOTAL}`;
    if (!learned.length) {
      el.list.innerHTML = '<li class="notes__none">아직 들은 소문이 없습니다.</li>';
      return;
    }
    el.list.innerHTML = '';
    learned.forEach((id, i) => {
      const r = RUMORS[id];
      const li = document.createElement('li');
      if (i === learned.length - 1) li.className = 'is-new';
      li.textContent = r.short;
      const src = document.createElement('small');
      src.textContent = `${r.from} · ${id}`;
      li.appendChild(src);
      el.list.appendChild(li);
    });
    el.list.lastChild.scrollIntoView({ block: 'nearest' });
  }

  /* 아직 못 들은 소문을 쥐고 있는 사람인가 — 머리 위 «!» 표시에 씁니다 */
  const hasNews = npc => !!npc.rumors && npc.rumors.some(id => RUMORS[id] && !has(id));

  /* 개발용 — debug.html 의 «소문 전부» 단추. 열두 자락을 한꺼번에 들은 것으로 칩니다 */
  const learnAll = () => { for (const id in RUMORS) learn(id); };

  NS.Dialogue = {
    RUMORS, learned, init, open, advance, close, talkTo, lookAt, learn, learnAll, hasNews, setMe,
    isOpen: () => state.open,
    target: () => state.target,          // 지금 말을 걸고 있는 사람 (요엘의 수첩이 봅니다)
    count: () => learned.length,
    total: TOTAL
  };
})();
