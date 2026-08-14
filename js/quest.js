/* ══════════════════════════════════════════
   quest.js — 하루 할 일 (낮 · 밤)

   플레이어가 «무엇을 해야 하는지» 늘 보이게 하는 곳입니다.
   ① 시작할 때 브리핑 카드 한 장 (며칠인지 · 누구인지 · 오늘 무엇을 하는지 · 조작)
   ② 게임 중에는 화면 왼쪽 위에 «지금 할 일» 이 늘 떠 있고
   ③ 하나 끝낼 때마다 완료 쪽지가 뜨고 다음 할 일로 넘어갑니다
   ④ 해가 지면(6분) 낮 할 일은 그대로 닫히고 밤 할 일로 넘어갑니다
   ⑤ 하루가 끝나면(10분) 오늘의 장부 — 세겔 · 소문 · 끝낸 일 · 놓친 일 — 를 셈합니다

   하루 한 덩이의 모양
     n      몇 일차인가. 날짜와 요일은 js/clock.js 가 숫자로 셈합니다 (1일차 = 유월절 D-8 목요일)
     day    낮(6분)에 할 일 — 해가 지면 남은 것은 «놓친 일» 로 닫힙니다
     night  밤(4분)에 할 일 — 해가 진 뒤에 열립니다
     dusk   해가 질 때 주인공의 혼잣말 · end 하루를 닫는 말

   할 일 한 줄의 모양
     goal   'look'   물건을 n개 살펴보기 (obj 를 적으면 그 물건만)
            'talk'   사람에게 n번 말 걸기
            'talkTo' at 장소의 npc 에게 말 걸기
            'visit'  at 장소로 가기
            'rumor'  소문 수첩을 n자락까지 채우기
            'game'   작은 판(js/mini.js) 한 판을 끝내기 — game 에 판 이름
     at     목표 장소(js/map.js 의 MAPS 열쇠). 지금 장소와 다르면 «→ 어디로» 가 뜹니다
     npc    목표 인물(js/map.js 의 npcs id). 머리 위에 금색 표지가 붙습니다
     title  할 일 한 줄 · how 조작 안내 · way 길 안내 · say 끝냈을 때 주인공의 혼잣말

   새 인물의 하루를 넣으려면 PLANS 에 인물 id(js/cast.js)로 한 덩이 더하면 됩니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  const PLANS = {
    asaph: {
      n: 1,                                    // 1일차 = 유월절 D-8 · 목요일
      who: '아삽 벤 요아스 · 34 · 성전 제물 상인',
      aim: '오늘은 성전 뜰과 시장을 돌며 소문을 모은다.',

      /* 왜 이 사람이 소문을 모으는가 — 인물의 목소리로.
         결말은 적지 않습니다(js/cast.js 의 ★). 지금 지고 있는 것만 적습니다 */
      role: '이방인의 뜰에서 제물을 파는 장사꾼. 아버지가 남긴 조합 빚 4,200 세겔이 내 몫이다.\n'
          + '값은 소문보다 늦게 움직인다 — 순례객이 몰린다는 말이 돌면 제물 값이 오르고,\n'
          + '성전이 시끄럽다는 말이 돌면 내린다. 그러니 남보다 먼저 들어야 한다.',

      /* 플레이어에게 «앞으로 무엇을 반복하게 되는가» 를 미리 알려 준다 */
      loop: '그래서 이 열이틀 동안 할 일은 대개 «사람에게 말을 거는 것» 입니다.\n'
          + '머리 위에 노란 « ! » 이 뜬 사람이 아직 못 들은 소문을 쥔 사람입니다 — 들은 것은 수첩(N)에 쌓입니다.',

      /* ── 낮 · 여섯 분 ── */
      day: [
        { goal:'look', obj:'x10_money_table', at:'temple',
          title:'환전 탁자를 살펴본다',
          how:'물건 바로 앞에 붙어 서서 SPACE (금색 표지가 붙어 있습니다)',
          way:'성전 뜰 아래쪽 좌판 줄',
          say:'성전세는 두로 은전으로만 받는다. 그 환전 수수료가 누구 몫인지는 다들 안다.' },

        { goal:'game', game:'blemish', obj:'x11_dove_cage', at:'temple',
          title:'좌판에 들일 제물을 흠 검사한다',
          how:'비둘기장 앞에서 SPACE — 다섯 마리. 그림에서 흠을 눈으로 찾고, 살펴보기 두 번으로 확인합니다',
          way:'환전 탁자 오른쪽 비둘기장',
          say:'흠 없는 것으로 드릴지니. 그 말대로면 이 성에 바칠 수 있는 건 몇 마리 안 된다.' },

        { goal:'talk', n:1, at:'temple',
          title:'성전 뜰에서 누구에게든 말을 건다',
          how:'사람 앞에 서면 머리 위에 말풍선이 뜹니다 — 그때 SPACE',
          way:'뜰 안 아무나 — 서기관 · 순례자 · 성전 경비',
          say:'말은 공짜다. 그래서 값보다 늘 먼저 움직인다.' },

        { goal:'rumor', n:3,
          title:'소문 세 자락을 듣는다',
          how:'머리 위에 노란 « ! » 이 뜬 사람에게 말을 걸면 한 자락씩 붙습니다',
          say:'세 자락. 아직 값을 움직일 만큼은 아니다.' },

        { goal:'visit', at:'market',
          title:'시장 광장으로 나간다',
          how:'길 끝으로 걸어 들어가면 저절로 넘어갑니다',
          way:'성전 뜰 위쪽 끝 길',
          say:'여기서 값이 정해진다. 성전이 아니라.' },

        { goal:'talkTo', at:'market', npc:'changer',
          title:'시장의 환전상을 만난다',
          how:'머리 위에 금색 표지가 붙은 사람입니다',
          way:'시장 광장 한가운데 탁자',
          say:'은전 서른 닢이라. 노예 한 몸값이군. 누구 몫인지는 아무도 모른다지.' },

        { goal:'talkTo', at:'gate', npc:'gatekeep',
          title:'성문 문지기에게 총독 소식을 묻는다',
          how:'머리 위에 금색 표지가 붙은 사람입니다',
          way:'시장 서쪽 → 하부 도시 골목 → 골목 위쪽 끝이 성문',
          say:'총독이 올라왔다. 병력이 늘면 값도 오른다. 늘 그랬다.' },

        { goal:'rumor', n:8,
          title:'해 지기 전에 소문 여덟 자락을 모은다',
          how:'아직 못 들은 소문을 쥔 사람은 « ! » 로 표시됩니다',
          say:'여덟. 이제 무언가 그려진다. 값이 어느 쪽으로 기우는지.' }
      ],

      /* ── 밤 · 네 분 ── */
      night: [
        { goal:'visit', at:'market',
          title:'파장한 시장을 지나간다',
          how:'밤에는 좌판이 걷히고 사람이 바뀝니다',
          way:'성전 뜰 위쪽 끝 길 → 시장 광장',
          say:'낮에 값을 부르던 자리에 아무도 없다. 값은 이런 데서 조용히 정해진다.' },

        { goal:'talkTo', at:'market', npc:'sweeper',
          title:'파장 청소꾼에게 오늘 값을 묻는다',
          how:'밤에만 나와 있는 사람입니다 — 금색 표지를 따라가세요',
          way:'낮에 천 장수가 앉던 좌판 자리',
          say:'쓸어 담은 지푸라기 값까지 안다. 하루 장사가 어땠는지는 이 사람이 제일 잘 안다.' },

        { goal:'talkTo', at:'roof', npc:'host2',
          title:'다락방 주인에게 방값을 묻는다',
          how:'골목의 다세대 주택 앞에서 SPACE — 공용 계단이 옥상으로 이어집니다',
          way:'시장 서쪽 → 하부 도시 골목 위쪽 다세대 주택',
          say:'방값이 두 배. 성이 몇 배로 부푼 것이다. 값은 사람 수를 먼저 따라간다.' },

        { goal:'visit', at:'grove',
          title:'성 밖 올리브 뜰까지 나가 본다',
          how:'성문 위쪽 문루 앞에서 SPACE — 문 밖이 올리브 뜰입니다',
          way:'골목 위쪽 끝 → 성문 → 문루',
          say:'밤마다 사람이 모인다는 곳. 장부에 적어 둘 만하다.' },

        { goal:'talkTo', at:'grove', npc:'torch',
          title:'횃불 든 사내에게 말을 건다',
          how:'불빛 가까이 가야 보입니다 — 밤에는 등불 둘레만 밝습니다',
          way:'올리브 뜰 동쪽, 불빛이 어른거리는 자리',
          say:'기드론 건너에서 밤을 새운다. 무리가 커지면 성이 조용할 리 없다.' },

        { goal:'rumor', n:12,
          title:'수첩을 다 채운다 — 열두 자락',
          how:'밤에는 낮에 없던 사람이 나옵니다. 등불 있는 곳을 훑으세요',
          say:'열둘. 값이 어디로 갈지 이제 셈이 선다.' }
      ],

      dusk: '해가 진다. 좌판을 걷을 때다.',
      end: {
        title: '첫날의 장부를 덮는다',
        say: '오늘은 여기까지. 다음 날들(D-7 금요일부터)은 아직 준비 중입니다.'
      }
    },

    /* ══════════════════════════════════════════
       0번 이야기 — 요엘 · 아홉 살 · 종려주일 하루 (튜토리얼)

       니산월 9일. 아사프의 첫날과 같은 날이고, 두 사람은 성문 앞에서 스칩니다.
       심부름 하나로 조작 여섯 가지를 가르칩니다 —
         이동·카메라 / 대화 / 채집 / 건네기 / 소문 노출 / 군중 속 이동

       동선은 되돌아오지 않는 한 줄입니다.
         집 → 골목 → 성문 → 성벽 밖 → 성문 → 골목 → 대로

       만나는 차례가 곧 인물 고르기 화면의 차례입니다(js/joel.js 의 SHEET).
       거절 → 무시 → 불가 → 받아줌 → 봄 으로 반응이 한 계단씩 좋아집니다.
       실패할 수 있는 구간은 하나도 없습니다 — 가지를 덜 꺾어도 하루는 그대로 굴러갑니다
       ══════════════════════════════════════════ */
    joel: {
      n: 4,                                  // 4일차 = 니산월 9일 · D-5 · 일요일(종려주일)
      /* 이 하루에는 밤이 없습니다. 낮 열 분 하나로 끝납니다 (js/clock.js 의 begin) */
      len: { day: 600, night: 0, dusk: 0 },
      who: '요엘 · 9 · 하부 도시에 사는 아이',
      aim: '어머니 심부름 — 종려 가지를 다섯 개 꺾어 오고, 오는 길에 만나는 사람한테 나눠 준다.',

      role: '아홉 살. 직업도 없고 아는 것도 없다.\n'
          + '오늘 성 안이 왜 이렇게 시끄러운지 모르고, 어른들이 무슨 말을 하는지도 모른다.\n'
          + '아는 것은 어머니가 시킨 것 하나뿐이다 — 가지 다섯 개.',

      loop: '그래서 오늘 할 일은 대개 «걷고, 말을 걸고, 가지를 건네는 것» 입니다.\n'
          + '틀릴 수 있는 것이 하나도 없습니다. 가지를 덜 꺾어도, 누가 안 받아 줘도 하루는 그대로 갑니다.',

      /* ── 낮 · 열 분. 기획안 4절의 비트 시트 그대로입니다 ── */
      day: [
        { goal:'talkTo', at:'roof', npc:'mother',
          title:'어머니가 시키는 것을 듣는다',
          how:'어머니 앞에 서서 SPACE — 넘길 때도 SPACE 입니다',
          way:'옥상 집. 바로 옆에 서 계신다',
          say:'가지 다섯 개. 오는 길에 나눠 주기.' },

        { goal:'hear', n:3, at:'lower',
          title:'골목을 지나며 어른들 말을 듣는다',
          how:'멈춰 설 것 없습니다 — 사람 곁을 지나가기만 하면 들립니다',
          way:'옥상에서 계단을 내려가면 하부 도시 골목',
          say:'무리가 온대. 갈릴리 사람이래. 무슨 소린지 모르겠다.' },

        { goal:'visit', at:'grove',
          title:'성문을 지나 성 밖으로 나간다',
          how:'성문 위쪽 문루 앞에서 SPACE — 문 밖이 올리브 뜰입니다',
          way:'골목 위쪽 끝이 성문, 성문 위쪽이 문루',
          say:'성 밖은 처음이다.' },

        { goal:'gather', n:5, at:'grove',
          title:'종려 가지를 다섯 개 꺾는다',
          how:'나무 앞에 서서 SPACE. 높은 가지 하나는 손이 안 닿습니다 — 돌을 주워 던지세요',
          way:'성문 밖. 나무는 셋, 아래쪽 왼편에 모여 있습니다',
          say:'다섯 개. 손에 다 안 잡힌다.' },

        /* ── 돌아오는 길 · 조우 사다리 ──
           손에 가지가 들어온 뒤에야 열립니다. 건넬 것이 있어야 건네는 장면이 되니까요.
           거절 → 야단 → 무시 → 불가 → 받아줌 으로 반응이 한 계단씩 좋아집니다 */
        { goal:'talkTo', at:'gate', npc:'asaph',
          title:'돌아오는 길 · 짐승 파는 사람',
          how:'가지를 건네 봅니다 — 앞에 서서 SPACE',
          way:'성문 안쪽, 좌판을 펴는 사람',
          say:'바쁘대. 안 받았다.' },

        { goal:'talkTo', at:'gate', npc:'nitssi',
          title:'문 지키는 사람',
          how:'앞에 서서 SPACE',
          way:'성문 한가운데',
          say:'뛰지 말래. 근데 가지는 받았다.' },

        { goal:'talkTo', at:'gate', npc:'longinus',
          title:'글씨 쓰는 군인',
          how:'앞에 서서 SPACE',
          way:'성문 곁에서 목판에 무언가 적고 있다',
          say:'나를 안 봤다.' },

        { goal:'talkTo', at:'lower', npc:'pguard',
          title:'제일 높은 사람',
          how:'창 든 병사 앞에서 SPACE — 저 뒤에 있는 사람에게는 닿을 수 없습니다',
          way:'골목 오른쪽 위. 행렬이 지나간다',
          say:'창 든 사람들이 못 가게 했다.' },

        { goal:'talkTo', at:'lower', npc:'peter',
          title:'제일 큰 아저씨',
          how:'앞에 서서 SPACE',
          way:'골목 한가운데, 덩치 큰 사람',
          say:'떨어뜨린 가지를 주워 줬다. 같이 흔들자고 했다.' },

        { goal:'visit', at:'market',
          title:'대로로 나가 앞줄을 잡는다',
          how:'사람 사이를 비집고 걸어 들어가면 됩니다 — 밀려나도 다시 가면 됩니다',
          way:'골목 오른쪽 끝이 대로',
          say:'앞줄. 다 보인다.' },

        { goal:'talkTo', at:'market', npc:'hosanna',
          title:'옆에 선 노인에게 묻는다',
          how:'앞에 서서 SPACE — 다들 뭐라고 외치는지 물어봅니다',
          way:'앞줄에 같이 서 있는 노인',
          say:'호산나. 구원해 달라는 말이래.' },

        { goal:'shout', n:6, at:'market',
          title:'박자에 맞춰 «호산나!» 를 외친다',
          how:'두 고리가 겹치는 순간에 H (휴대폰은 오른쪽 아래 «호산나»)',
          way:'빗나가면 오르지 않습니다 — 잃는 것도 없으니 박을 기다렸다 한 번 더',
          say:'지나가면서 나를 봤다. 진짜로 봤다.' }
      ],

      night: [],                             // 밤이 없는 하루입니다

      dusk: '',
      end: {
        title: '니산월 9일 · 종려주일',
        say: '엄마, 그 사람이 나 봤어.'
      }
    }
  };

  const Clock = () => NS.Clock;

  let plan = null;          // 지금 하루
  let ph = 'day';           // 'day' | 'night'
  let idx = 0;              // 몇 번째 할 일
  let prog = 0;             // 그 할 일의 진행 수
  let here = null;          // 지금 있는 장소
  let brief = false;        // 브리핑 카드가 떠 있나
  let over = false;         // 하루가 끝났나
  let pend = [];            // 아직 보여 주지 않은 카드 차례
  let now = null;           // 지금 떠 있는 카드 { kind, step }
  let cardT = 0;            // 저절로 넘어가기까지 남은 시간(초)
  const stat = new Map();   // 할 일 → 'done' | 'miss'
  const purse = { coin: 0, games: 0 };   // 좌판에서 번 세겔
  let el = {};

  const rd = id => document.getElementById(id);
  const list = () => (plan ? (ph === 'night' ? plan.night : plan.day) : []);
  const step = () => { const L = list(); return idx < L.length ? L[idx] : null; };
  const rumors = () => (NS.Dialogue ? NS.Dialogue.count() : 0);

  function init() {
    el = {
      goal: rd('goal'), no: rd('goalNo'), title: rd('goalTitle'),
      how: rd('goalHow'), way: rd('goalWay'),
      brief: rd('brief'), bDay: rd('briefDay'), bWho: rd('briefWho'),
      bAim: rd('briefAim'), bRole: rd('briefRole'), bLoop: rd('briefLoop'),
      bFirst: rd('briefFirst'), bClock: rd('briefClock'),
      card: rd('questCard'), qLab: rd('qcDoneLab'), qT: rd('qcDoneT'), qS: rd('qcDoneS'),
      next: rd('nextCard'), qnLab: rd('qnLab'), qnT: rd('qnT'), qnH: rd('qnH'), qnW: rd('qnW'),
      night: rd('nightCard'), ncS: rd('ncSay'), ncMiss: rd('ncMiss'),
      dayC: rd('dayCard'), dcLab: rd('dcLab'), dcT: rd('dcT'), dcS: rd('dcS'), dcL: rd('dcLedger'),
      list: rd('questList'), count: rd('questCount')
    };
    if (el.brief) el.brief.addEventListener('click', closeBrief);
    for (const k of ['card', 'next', 'night', 'dayC'])
      if (el[k]) el[k].addEventListener('click', closeCard);
  }

  /* 인물을 고르고 게임이 열릴 때 — js/cast.js 의 id 로 하루를 집는다 */
  function begin(castId, mapId) {
    plan = PLANS[castId] || null;
    ph = 'day'; idx = 0; prog = 0; here = mapId || null; sig = '';
    pend = []; now = null; cardT = 0; over = false;
    stat.clear(); purse.coin = 0; purse.games = 0;
    joelDone = false;
    if (!plan) { hideAll(); return; }
    if (Clock()) Clock().begin(plan.n, plan.len);   // len 을 적어 둔 하루는 마디 길이가 다릅니다
    buildList();
    openBrief();
    paint();
  }
  let joelDone = false;                             // 요엘의 엔딩을 이미 띄웠나

  /* ── 브리핑 카드 ── */
  function openBrief() {
    if (!el.brief || !plan) return;
    brief = true;
    const d = Clock() ? Clock().day() : null;
    el.bDay.textContent = d ? d.label : `${plan.n}일차`;
    el.bWho.textContent = plan.who;
    el.bAim.textContent = plan.aim;
    if (el.bRole) el.bRole.textContent = plan.role || '';
    if (el.bLoop) el.bLoop.textContent = plan.loop || '';
    el.bFirst.textContent = plan.day.length ? plan.day[0].title : '—';
    if (el.bClock) el.bClock.textContent = (plan.len && plan.len.night === 0)
      ? '오른쪽 위 도넛이 한 바퀴 차면 하루가 끝납니다. 오늘은 해가 지지 않습니다 — '
        + '틀릴 수 있는 것도, 놓쳐서 닫히는 일도 없습니다.'
      : '하루는 해가 있는 동안과 해가 진 뒤로 나뉩니다. 오른쪽 위 도넛이 한 바퀴 차면 하루가 끝납니다. '
        + '해가 지면 낮에 못 한 일은 그대로 닫힙니다.';
    el.brief.classList.add('is-on');
  }
  function closeBrief() {
    if (!brief) return;
    brief = false;
    el.brief.classList.remove('is-on');
    check();                                   // 카드를 보는 동안 이미 채워진 게 있으면 바로 넘긴다
  }

  /* ══════════════════════════════════════════
     알림 — main.js 가 무슨 일이 있었는지 알려 준다
     ══════════════════════════════════════════ */
  function on(kind, data) {
    if (kind === 'visit') here = data;
    const s = step();
    if (!s || brief || over) { paint(); return; }

    if (kind === 'talk') {
      if (s.goal === 'talk') prog++;
      else if (s.goal === 'talkTo' && data && data.id === s.npc && here === s.at) prog = 1;
    } else if (kind === 'look') {
      if (s.goal === 'look' && (!s.obj || (data && data.a === s.obj))) prog++;
    } else if (kind === 'game') {
      if (s.goal === 'game' && (!s.game || data === s.game)) prog = 1;
    } else if (kind === 'visit') {
      if (s.goal === 'visit' && data === s.at) prog = 1;
    }
    check();
  }

  /* 작은 판에서 번 세겔 — 하루 장부에 얹힌다 */
  function earn(res) {
    if (!res) return;
    purse.coin += res.coin || 0;
    purse.games++;
  }

  /* 루프마다 불립니다.
     busy — 대사창이 열려 있거나 장소를 넘어가는 중. 그동안은 카드를 띄우지 않고 기다립니다
            (대화 도중에 카드가 덮이면 하던 이야기를 못 읽으니까) */
  function tick(dt, busy) {
    if (now) {                                 // 카드가 떠 있는 동안은 판정을 멈춘다
      if (cardT > 0) { cardT -= dt; if (cardT <= 0) closeCard(); }
      return;
    }
    if (brief) return;
    if (!over) check();                        // 소문은 대사를 넘기는 사이에 늘어난다
    if (pend.length && !busy) openCard(pend.shift());
  }

  /* 이 할 일이 얼마나 찼나. 대개는 prog 가 세지만,
     소문과 요엘의 하루(가지·들은 말·외침)는 딴 곳에 쌓이므로 그쪽을 읽어 옵니다 */
  function progOf(s) {
    const J = NS.Joel;
    switch (s.goal) {
      case 'rumor':  return rumors();
      case 'gather': return J ? J.branches() : 0;      // 꺾은 종려 가지
      case 'hear':   return J ? J.heardCount() : 0;    // 골목에서 지나가며 들은 말
      case 'meet':   return J ? J.metCount() : 0;      // 수첩에 오른 사람
      case 'shout':  return J ? J.shoutCount() : 0;    // «호산나!»
      default:       return prog;
    }
  }

  function met(s) {
    if (!s) return false;
    switch (s.goal) {
      case 'gather': case 'hear': case 'meet': case 'shout':
        return progOf(s) >= (s.n || 1);
      case 'rumor':  return rumors() >= (s.n || 1);
      /* 이미 그 장소에 서 있으면 «가기» 는 끝난 것으로 봅니다 —
         해가 질 때 마침 그 장소에 있었다면 밖으로 나갔다 올 까닭이 없으니까 */
      case 'visit':  return prog >= 1 || here === s.at;
      case 'talkTo':
      case 'game':   return prog >= 1;
      default:       return prog >= (s.n || 1);
    }
  }

  /* 할 일을 다 했다고 마디가 저절로 끝나지는 않습니다.
     남은 시간은 «소문을 마저 줍는 시간» 이고, 접는 것은 플레이어의 몫입니다 —
     눈을 붙이거나(R) 시계가 다 돌거나 둘 중 하나입니다 */
  function check() {
    let s = step();
    while (s && met(s)) { finish(s); s = step(); }
    paint();
    /* 요엘의 하루는 밤도 장부도 없습니다 — 마지막 할 일이 끝나면 그대로 엔딩입니다 */
    if (!s && !joelDone && NS.Joel && NS.Joel.isRun()) {
      joelDone = true;
      pend.push({ kind: 'joelEnd' });
    }
  }

  function finish(s) {
    idx++; prog = 0;
    stat.set(s, 'done');
    /* 외치는 사이에 그 사람이 지나가며 본다 — 1.5초. 수첩 여섯째 칸이 여기서 찹니다.
       줌인도 음악 정지도 없습니다. 무게는 나중에 플레이어가 알아서 얹습니다 */
    if (s.goal === 'shout' && NS.Joel) NS.Joel.look();
    pend.push({ kind: 'done', step: s });      // 카드는 대화가 끝난 뒤 tick 이 띄웁니다
    buildList();                               // «그다음 할 일» 카드는 이걸 닫을 때 이어 붙습니다
  }

  /* ══════════════════════════════════════════
     해가 진다 — 낮 할 일을 닫고 밤 할 일로 넘어간다 (js/clock.js 가 알려 줍니다)
     ══════════════════════════════════════════ */
  function nightfall() {
    if (!plan || ph === 'night' || over) return;
    const missed = list().slice(idx);
    for (const s of missed) stat.set(s, 'miss');
    ph = 'night'; idx = 0; prog = 0;
    pend = pend.filter(c => c.kind !== 'done' && c.kind !== 'next');   // 낮의 쪽지는 여기서 접는다
    buildList();
    pend.push({ kind: 'night', missed });
    paint();
  }

  /* 하루가 끝난다 — 시계가 10분을 다 돌았을 때(main.js 의 'end').
     잠자리에 들어 끝낸 경우도 시곗바늘을 끝으로 옮긴 것이라 같은 길로 들어옵니다 */
  function endDay() {
    if (!plan || over) return;
    /* 요엘의 하루는 시간이 다 되어도 «놓친 일» 로 닫지 않습니다 — 실패 판정이 없는 하루입니다 */
    if (NS.Joel && NS.Joel.isRun()) {
      if (joelDone) return;
      joelDone = true;
      pend = [{ kind: 'joelEnd' }];
      return;
    }
    over = true;
    if (Clock()) Clock().finish();
    for (const s of list().slice(idx)) stat.set(s, 'miss');   // 밤에 못 한 일은 여기서 닫힌다
    pend = pend.filter(c => c.kind === 'night');
    pend.push({ kind: 'ledger' });
    buildList();
    paint();
  }

  /* ══════════════════════════════════════════
     카드 — ① 끝냈다 → ② 그다음 · 해 질 녘 · 하루 결산

     끝낸 일과 다음 할 일을 한 장에 붙여 두면 읽을 것이 많아 «다음»이 묻힙니다.
     그래서 두 장으로 나눕니다 — 먼저 끝낸 일을 한 장으로 매듭짓고,
     닫으면 «그다음 할 일» 한 장이 이어서 어디로 가서 무엇을 하는지만 짚어 줍니다.
     (이어 붙이는 곳은 closeCard 입니다)
     ══════════════════════════════════════════ */
  function openCard(c) {
    if (!plan) return;
    if (c.kind === 'done') return openDoneCard(c.step);
    if (c.kind === 'next') return openNextCard();
    if (c.kind === 'night') return openNightCard(c.missed);
    if (c.kind === 'ledger') return openLedger();
    /* 요엘의 엔딩 — 장부 대신 수첩을 펼칩니다 (js/joel.js) */
    if (c.kind === 'joelEnd') {
      over = true;
      if (Clock()) Clock().finish();
      paint();
      if (NS.Joel) NS.Joel.openEnd();
      return;
    }
  }

  /* ① 끝냈다 — 끝낸 일과 주인공의 혼잣말만 */
  function openDoneCard(s) {
    if (!el.card) return;
    now = { kind: 'done' }; cardT = 6;
    const L = ph === 'night' ? plan.night : plan.day;
    const nth = L.indexOf(s) + 1;
    el.qLab.textContent = `${ph === 'night' ? '밤' : '낮'} 할 일 ${nth}/${L.length} 완료`;
    el.qT.textContent = s.title;
    el.qS.textContent = s.say || '';
    el.card.classList.add('is-on');
    if (NS.Audio) NS.Audio.play('quest', 0.9);
  }

  /* ② 그다음 — 어디로 가서 무엇을 하는지만 */
  function openNextCard() {
    if (!el.next) return;
    now = { kind: 'next' }; cardT = 9;
    const s = step(), L = list();
    if (s) {
      el.qnLab.textContent = `다음 할 일  ${idx + 1}/${L.length}`;
      el.qnT.textContent = s.title;
      el.qnH.textContent = s.how || '';
      el.qnW.textContent = wayText(s);
    } else {                                   // 이 마디 몫을 다 했다 — 남은 시간은 소문 몫
      const w = waitText();
      el.qnLab.textContent = w.no;
      el.qnT.textContent = w.title;
      el.qnH.textContent = w.how;
      el.qnW.textContent = w.way;
    }
    el.next.classList.add('is-on');
  }

  /* 해 질 녘 — 낮에 놓친 일을 보여 준다 (밤의 첫 할 일은 뒤이어 오는 «그다음» 카드가 짚습니다) */
  function openNightCard(missed) {
    if (!el.night) return;
    now = { kind: 'night' }; cardT = 11;
    el.ncS.textContent = plan.dusk || '해가 진다.';
    el.ncMiss.textContent = (missed && missed.length)
      ? `해에 걸려 닫힌 낮 일 ${missed.length}가지 — ${missed.map(s => s.title).join(' · ')}`
      : '낮 몫은 모두 마쳤습니다.';
    el.ncMiss.className = 'qcard__miss' + (missed && missed.length ? ' is-miss' : '');
    el.night.classList.add('is-on');
    if (NS.Audio) NS.Audio.play('door', 0.8);
  }

  /* 하루 결산 — 상인의 장부 */
  function openLedger() {
    if (!el.dayC) return;
    now = { kind: 'ledger' }; cardT = 0;         // 저절로 닫히지 않습니다
    const d = Clock() ? Clock().day() : null;
    const all = plan.day.length + plan.night.length;
    let done = 0, miss = 0;
    for (const v of stat.values()) { if (v === 'done') done++; else miss++; }
    const total = NS.Dialogue ? NS.Dialogue.total : 12;

    el.dcLab.textContent = d ? `${d.label} — 장부를 덮는다` : '장부를 덮는다';
    el.dcT.textContent = plan.end ? plan.end.title : '오늘의 장부';
    el.dcS.textContent = plan.end ? plan.end.say : '';

    const rows = [
      ['좌판 셈', purse.games ? `${purse.coin >= 0 ? '+' : ''}${purse.coin} 세겔` : '— (흠 검사를 못 했다)'],
      ['들은 소문', `${rumors()} / ${total} 자락`],
      ['끝낸 일', `${done} / ${all} 가지`],
      ['놓친 일', miss ? `${miss} 가지` : '없음'],
      ['다음 날', d ? `${Clock().dayOf(d.n + 1).label}` : '—']
    ];
    el.dcL.innerHTML = '';
    for (const [k, v] of rows) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      el.dcL.appendChild(dt); el.dcL.appendChild(dd);
    }
    el.dayC.classList.add('is-on');
    if (NS.Audio) NS.Audio.play('quest', 0.9);
  }

  function closeCard() {
    if (!now) return;
    const kind = now.kind;
    now = null; cardT = 0;
    for (const k of ['card', 'next', 'night', 'dayC']) if (el[k]) el[k].classList.remove('is-on');

    /* 끝냈다 · 해가 졌다 뒤에는 «그다음 할 일» 한 장을 이어 붙입니다.
       한꺼번에 여러 가지가 끝났으면(소문 따위) 마지막 완료 쪽지 뒤에 한 번만 붙입니다 */
    if ((kind === 'done' || kind === 'night') && !over &&
        !pend.some(c => c.kind === 'done' || c.kind === 'night' || c.kind === 'ledger'))
      pend.push({ kind: 'next' });

    if (kind === 'next') flashGoal();           // 새 할 일이 들어왔다고 «할 일» 띠를 번쩍인다
    paint();
  }

  function flashGoal() {
    if (!el.goal) return;
    el.goal.classList.remove('is-new');
    void el.goal.offsetWidth;        // 애니메이션을 처음부터 다시 틀기 위해
    el.goal.classList.add('is-new');
  }

  /* ══════════════════════════════════════════
     화면에 그리기
     ══════════════════════════════════════════ */
  /* 루프마다 불리므로, 글이 그대로면 화면을 건드리지 않는다 */
  let sig = '';
  function paint() {
    if (!el.goal) return;
    if (!plan) { hideAll(); return; }
    const s = step();
    const L = list();
    let no, title, how, way;

    if (over) {
      no = '오늘 몫 · 하루가 끝났습니다';
      title = plan.end ? plan.end.title : '오늘의 장부';
      how = '';
      way = '';
    } else if (!s) {                            // 이 마디 할 일을 다 했다 — 남은 시간은 소문 몫
      const w = waitText();
      no = `${ph === 'night' ? '밤' : '낮'} 할 일 ${L.length}/${L.length} — ${w.no}`;
      title = w.title;
      how = w.how;
      way = w.way;
    } else {
      const n = s.n || 1;
      const cur = Math.min(progOf(s), n);
      no = `${ph === 'night' ? '밤' : '낮'} 할 일 ${idx + 1}/${L.length}`;
      title = n > 1 ? `${s.title}  (${cur}/${n})` : s.title;
      how = s.how || '';
      way = wayText(s);
    }

    const line = [no, title, how, way].join('|');
    if (line === sig) return;
    sig = line;
    el.goal.classList.add('is-on');
    el.goal.classList.toggle('is-night', ph === 'night');
    el.no.textContent = no;
    el.title.textContent = title;
    el.how.textContent = how;
    el.way.textContent = way;
    paintList();
  }

  /* 이 마디 할 일을 다 했을 때 — 남은 시간은 소문을 마저 줍는 시간입니다.
     접는 것은 플레이어의 몫이라, 어떻게 접는지를 늘 함께 적어 둡니다 */
  function waitText() {
    return ph === 'night'
      ? { no: '밤 몫을 다 했습니다',
          title: '잠자리에 들 수 있다',
          how: '남은 밤 동안 소문을 더 주울 수 있습니다',
          way: 'R · 오른쪽 위 «잠자리» 를 누르면 하루를 접습니다' }
      : { no: '낮 몫을 다 했습니다',
          title: '해가 지기를 기다린다',
          how: '남은 낮 동안 소문을 더 들어 둘 수 있습니다',
          way: 'R · 오른쪽 위 «눈 붙이기» 를 누르면 해 질 때까지 건너뜁니다' };
  }

  const mapName = id => (NS.World && NS.World.MAPS[id]) ? NS.World.MAPS[id].name : id;

  /* 다른 장소면 «→ 장소이름» 을 앞에 붙이고, 같은 장소면 길 안내만 보여 준다 */
  function wayText(s) {
    const far = (s.at && s.at !== here) ? mapName(s.at) : '';
    if (far) return `→ ${far}${s.way ? ' · ' + s.way : ''}`;
    return s.way ? `→ ${s.way}` : '';
  }

  /* 수첩의 «오늘 할 일» — 낮과 밤을 한 목록에 이어 붙입니다 */
  function buildList() {
    if (!el.list) return;
    el.list.innerHTML = '';
    if (!plan) return;
    for (const [key, label] of [['day', '낮 · 해 지기 전'], ['night', '밤 · 해가 진 뒤']]) {
      const sep = document.createElement('li');
      sep.className = 'quest__sep';
      sep.textContent = label;
      el.list.appendChild(sep);
      for (const s of plan[key]) {
        const li = document.createElement('li');
        li.dataset.ph = key;
        li.textContent = s.title;
        el.list.appendChild(li);
      }
    }
    paintList();
  }

  function statusOf(s, key) {
    const v = stat.get(s);
    if (v === 'done') return 'is-done';
    if (v === 'miss') return 'is-miss';
    if (!over && key === ph && s === step()) return 'is-now';
    if (key === 'night' && ph === 'day') return 'is-later';
    return '';
  }

  function paintList() {
    if (!el.count || !plan) return;
    let done = 0;
    for (const v of stat.values()) if (v === 'done') done++;
    const all = plan.day.length + plan.night.length;
    el.count.textContent = `${done}/${all}`;
    if (!el.list) return;
    let i = 0;
    for (const li of el.list.children) {
      if (li.className === 'quest__sep') { i = 0; continue; }
      const key = li.dataset.ph;
      li.className = statusOf(plan[key][i], key);
      i++;
    }
  }

  function hideAll() {
    brief = false; now = null; pend = [];
    if (el.goal) el.goal.classList.remove('is-on');
    for (const k of ['card', 'next', 'night', 'dayC', 'brief'])
      if (el[k]) el[k].classList.remove('is-on');
  }

  /* 지금 찾아가야 할 사람·물건 — main.js 가 그 위에 금색 표지를 붙일 때 씁니다 */
  function target() {
    const s = step();
    if (!s || brief || over || (!s.npc && !s.obj)) return null;
    return { map: s.at, npc: s.npc || null, obj: s.obj || null };
  }

  /* ══════════════════════════════════════════
     개발용 건너뛰기 — debug.html 오른쪽 계기판의 «건너뛰기» 단추가 부릅니다.
     판정을 흉내 내지 않고 «끝난 것으로 적어» 넘깁니다.
     게임 규칙(met·check)은 하나도 건드리지 않으므로, 이 함수를 지워도 게임은 그대로 돕니다
     ══════════════════════════════════════════ */
  const dev = {
    /* 지금 할 일 하나를 끝낸 것으로 친다 — 카드도 여느 때처럼 뜹니다 */
    step() {
      const s = step();
      if (!s || over) return false;
      finish(s);
      return true;
    },
    /* 이 마디(낮·밤) 남은 할 일을 모두 끝낸 것으로 친다 — 카드는 띄우지 않습니다 */
    phase() {
      if (!plan || over) return false;
      for (const s of list().slice(idx)) stat.set(s, 'done');
      idx = list().length; prog = 0;
      pend = pend.filter(c => c.kind !== 'done' && c.kind !== 'next');
      buildList(); paint();
      return true;
    }
  };

  /* 지금 «눈을 붙여» 남은 시간을 건너뛸 수 있나 —
     이 마디 할 일을 다 했을 때만입니다. 그래야 건너뛰어도 잃는 것이 없습니다 */
  /* 요엘의 하루는 열 분이 통째로 낮이라 «눈 붙이기» 가 없습니다 */
  const canRest = () => !!plan && !(plan.len && plan.len.night === 0)
                     && !over && !brief && !now && idx >= list().length;

  NS.Quest = { init, begin, on, tick, target, paint, earn, nightfall, endDay, canRest, dev,
               /* 지금 할 일 한 줄 그대로 — 작은 지도(js/minimap.js)가 «어느 장소인가 · 무엇을 하나» 를 읽습니다 */
               step: () => (brief || over ? null : step()),
               isBrief: () => brief, closeBrief,
               isCard: () => !!now, closeCard,
               busy: () => brief || !!now,          // 이게 참이면 성 안은 잠깐 멈춥니다
               phase: () => ph,
               isOver: () => over,
               active: () => !!plan };
})();
