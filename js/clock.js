/* ══════════════════════════════════════════
   clock.js — 날짜와 하루의 시간

   ① 달력 — 날짜를 «엿새 전» 같은 말 대신 숫자로 셉니다
        1일차 = 유월절 D-8 · 목요일 (니산 6일)
        D 는 유월절(니산 14일)까지 남은 날 수입니다. 지나가면 D+1 · D+2 …
        요일은 1일차의 목요일에서 하루씩 흘려 셈하므로 3일차는 토요일, 곧 안식일입니다.
      아래 START 한 줄만 고치면 온 게임의 날짜와 요일이 함께 움직입니다.

        일차   1    2    3    4    5    6    7    8    9   10   11   12
        D    D-8  D-7  D-6  D-5  D-4  D-3  D-2  D-1  D-0  D+1  D+2  D+3
        요일   목    금    토    일    월    화    수    목    금    토    일    월
                        안식일                              유월절        부활

   ② 시계 — 한 일차는 낮 6분 + 밤 4분 = 10분입니다 (아래 LEN)
        6분이 지나면 해가 지고(밤), 10분이 되면 하루가 끝납니다.
        해 지기 45초 전부터 하늘이 붉어집니다.
        분·초는 화면에 내보이지 않습니다 — 오른쪽 위 도넛이 하루를 한 바퀴로 보여 줄 뿐입니다.
      시간은 «성 안이 도는 동안» 만 흐릅니다 — 브리핑·완료 카드·수첩·멈춤 화면에서는
      멈춥니다(읽는 시간은 하루에 넣지 않습니다). 대사와 작은 판은 놀이이므로 흐릅니다.

   쓰는 곳
     Clock.dayOf(n)          n일차 한 덩이 { dtag:'D-8', wdName:'목요일', label … }
     Clock.begin(n)          그 일차의 시계를 0 부터 돌린다
     Clock.tick(dt, frozen)  넘어가는 순간에만 'dusk' | 'night' | 'end' 를 돌려준다
     Clock.dark()            밤의 짙기 0~1 — main.js 가 이 값으로 화면을 덮습니다
     Clock.hourText()        제3시 … 제12시 · 초경 … 사경 (유대식 시간)
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  /* ══════════════════════════════════════════
     ① 달력
     ══════════════════════════════════════════ */
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const START = { dday: 8, wd: 4 };   // 1일차 = 유월절 D-8 · 목요일(wd 4)
  const NISAN = 14;                   // 유월절 어린양을 잡는 니산 14일 = D-0
  const SPAN = 12;                    // 아삽의 열이틀

  /* n일차(1부터)의 날짜. 숫자로만 셈하므로 어디서든 같은 답이 나옵니다 */
  function dayOf(n) {
    const i = Math.max(1, n | 0) - 1;
    const dday = START.dday - i;                       // 8 … 0 … -3
    const wd = (START.wd + i) % 7;
    const dtag = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${-dday}`;
    const wdName = WD[wd] + '요일';
    const mark = dday === 0 ? ' · 유월절' : (wd === 6 ? ' · 안식일' : '');
    return {
      n: i + 1, dday, dtag, wd, wdName,
      sabbath: wd === 6,
      passover: dday === 0,
      nisan: NISAN - dday,                             // 니산 6일 …
      label: `${i + 1}일차 · 유월절 ${dtag} · ${wdName}${mark}`,
      short: `${i + 1}일차 · ${dtag} ${WD[wd]}`
    };
  }

  /* ══════════════════════════════════════════
     ② 하루의 시계
     ══════════════════════════════════════════ */
  /* 하루의 길이는 하루 덩이(js/quest.js 의 PLANS)가 정할 수 있습니다.
     적지 않으면 아래 기본값 — 낮 6분 + 밤 4분 = 10분입니다.

     요엘의 하루(0번 튜토리얼)는 종려주일 «낮 하루» 라 밤이 없습니다.
     night: 0 을 주면 해가 지지 않고, dusk: 0 이면 노을도 뜨지 않습니다 —
     열 시간을 통째로 낮으로 씁니다 */
  const DEF = { day: 360, night: 240, dusk: 45 };
  const LEN = { day: DEF.day, night: DEF.night };   // 밖으로 내보내는 칸이라 통째로 갈지 않고 안을 고칩니다
  let DUSK = DEF.dusk;                    // 해 지기 몇 초 전부터 노을이 지나
  const FADE = 12;                        // 밤이 다 내려앉기까지

  const HOURS = ['제3시', '제4시', '제5시', '제6시', '제7시',
                 '제8시', '제9시', '제10시', '제11시', '제12시'];
  const WATCH = ['초경', '이경', '삼경', '사경'];

  let dn = 1;                    // 몇 일차
  let t = 0;                     // 그 일차에서 흐른 시간(초)
  let ph = 'day';                // 'day' | 'night' | 'over'
  let run = false;
  let toldDusk = false;

  /* len — 하루 덩이가 적어 둔 마디 길이 { day, night, dusk }. 없으면 기본값 */
  function begin(n, len) {
    dn = Math.max(1, n | 0 || 1);
    LEN.day   = (len && len.day)   || DEF.day;
    LEN.night = (len && len.night  != null) ? len.night : DEF.night;
    DUSK      = (len && len.dusk   != null) ? len.dusk  : DEF.dusk;
    t = 0; ph = 'day'; run = true; toldDusk = false;
  }
  const stop = () => { run = false; };

  /* 루프마다 한 번. frozen 이면 시간이 멈춥니다(읽는 화면이 떠 있을 때) */
  function tick(dt, frozen) {
    if (!run || frozen || ph === 'over') return null;
    t += dt;
    if (t >= LEN.day + LEN.night) { ph = 'over'; run = false; return 'end'; }
    if (ph === 'day' && t >= LEN.day) { ph = 'night'; return 'night'; }
    if (ph === 'day' && !toldDusk && t >= LEN.day - DUSK) { toldDusk = true; return 'dusk'; }
    return null;
  }

  /* 하루를 여기서 끊는다 — 밤 할 일을 일찍 다 끝냈을 때 */
  function finish() { ph = 'over'; run = false; t = LEN.day + LEN.night; }

  /* 눈을 붙여 이 마디의 남은 시간을 건너뛴다 (main.js 의 «눈 붙이기»).
     시곗바늘만 마디 끝으로 옮겨 두면, 다음 tick 이 여느 때처럼 'night' · 'end' 를 알립니다 —
     넘어가는 처리를 두 벌로 두지 않기 위해서입니다 */
  function skip() {
    if (!run || ph === 'over') return false;
    t = ph === 'day' ? LEN.day : LEN.day + LEN.night;
    return true;
  }

  const phase = () => ph;
  const isNight = () => ph !== 'day';
  const isOver = () => ph === 'over';
  const day = () => dayOf(dn);

  /* 지금 마디(낮/밤)가 끝나기까지 남은 초.
     화면에는 내보이지 않습니다 — 숫자로 재촉하지 않는 게 이 게임의 시계입니다.
     만드는 동안 확인할 때만 씁니다 (콘솔에서 JR.Clock.leftText()) */
  function left() {
    if (ph === 'over') return 0;
    return Math.max(0, (ph === 'day' ? LEN.day : LEN.day + LEN.night) - t);
  }
  function leftText() {
    const s = Math.ceil(left());
    return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`;
  }
  /* 지금 마디(낮/밤)를 얼마나 지나왔나 0~1 */
  function ratio() {
    if (ph === 'over') return 1;
    return ph === 'day' ? Math.min(1, t / LEN.day)
                        : Math.min(1, (t - LEN.day) / LEN.night);
  }
  /* 하루 전체를 얼마나 지나왔나 0~1 — 화면의 도넛이 이 값으로 찹니다.
     낮에서 밤으로 넘어가도 되감기지 않으므로 «하루가 이만큼 갔다» 가 한 바퀴로 보입니다 */
  const dayRatio = () => Math.min(1, t / (LEN.day + LEN.night));

  /* 유대식 시간 — 낮은 제3시부터 제12시, 밤은 네 경(更) */
  function hourText() {
    if (ph === 'day') return HOURS[Math.min(HOURS.length - 1, (t / (LEN.day / HOURS.length)) | 0)];
    const i = Math.min(WATCH.length - 1, ((t - LEN.day) / (LEN.night / WATCH.length)) | 0);
    return WATCH[i];
  }

  /* 밤의 짙기 0~1 — 해가 진 뒤 FADE 초에 걸쳐 내려앉습니다 */
  function dark() {
    if (ph === 'day') return 0;
    return Math.min(1, (t - LEN.day) / FADE);
  }
  /* 노을의 붉기 0~1 — 해 지기 전에 차올랐다가 밤이 되면 식습니다 */
  function warm() {
    if (!DUSK) return 0;                  // 노을이 없는 하루 (요엘의 종려주일)
    if (ph === 'day') {
      const d = t - (LEN.day - DUSK);
      return d <= 0 ? 0 : Math.min(1, d / DUSK) * 0.85;
    }
    if (ph === 'night') return Math.max(0, 1 - (t - LEN.day) / FADE) * 0.85;
    return 0;
  }
  /* 해가 곧 진다 — 남은 시간이 이 안으로 들어오면 화면이 재촉합니다 */
  const isDusk = () => ph === 'day' && left() <= DUSK;

  NS.Clock = {
    WD, START, SPAN, LEN, dayOf, dusk: () => DUSK,
    /* 밤이 없는 하루인가 — 화면이 «해 질 녘» 을 셈할 때 봅니다 */
    hasNight: () => LEN.night > 0,
    begin, stop, tick, finish, skip,
    phase, isNight, isOver, isDusk, day, left, leftText, ratio, dayRatio, hourText, dark, warm,
    elapsed: () => t, dayNo: () => dn
  };
})();
