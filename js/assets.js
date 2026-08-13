/* ══════════════════════════════════════════
   assets.js — 그림 규격표와 이미지 로더

   ATLAS : 오브젝트 한 종류가 몇 칸을 차지하는지(cols·rows),
           그중 실제로 막히는 발판이 몇 칸인지(fw·fh),
           건물이면 어느 앞줄 칸이 출입구인지(front) 를 적어 둔 표.
   CHARS : 인물 스프라이트(32×48, 발판 1칸, 하단 중앙 정렬) 표.
           인물 한 명은 정면·측면·후면 세 장이 한 벌입니다.
             g01_laborer.png       정면 — 아래를 볼 때
             g01_laborer_side.png  측면 — 오른쪽 기준. 왼쪽을 볼 땐 뒤집어 씁니다
             g01_laborer_back.png  후면 — 위를 볼 때
           CHARS 에는 대표 키 하나만 적고, 나머지 두 장은 로더가 알아서 챙깁니다.

   그림은 assets/images/<묶음>/x1/<키>.png 낱장을 그대로 불러옵니다.
   키 이름이 곧 파일 이름이라, 그림을 갈아 끼우면 코드는 건드릴 게 없습니다.
   ══════════════════════════════════════════ */
(() => {
  'use strict';
  const NS = window.JR = window.JR || {};

  const TILE = 32;
  const ROOT = 'assets/images/';

  /* 키 앞머리로 어느 묶음 폴더에서 온 그림인지 정한다 */
  const FOLDER = [
    [/^f\d\d_/,    '2_floors'],
    [/^n\d\d_/,    '4_nature'],
    [/^w_[mrs]_/,  '5_wall_kit'],
    [/^(cw|tr)_/,  '7_expansion'],
    [/^x\d\d_/,    '7_expansion'],
    [/^[bg]\d\d_/, '8_characters'],
    [/^\d\d_/,     '1_buildings'],
  ];
  function pathOf(key) {
    for (const [re, dir] of FOLDER) if (re.test(key)) return ROOT + dir + '/x1/' + key + '.png';
    return ROOT + key + '.png';
  }

  /* ── 오브젝트 규격표 ── */
  const ATLAS = {
    "f01_packed_dirt": { name:"다져진 흙바닥", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"골목·마당의 기본 바닥. 맵의 대부분을 채우는 바탕 타일로 쓰세요." },
    "f02_dirt_gravel": { name:"자갈 섞인 흙길", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"수레가 지나다니는 길목. 기본 흙바닥과 섞어 통행로를 자연스럽게 표시합니다." },
    "f03_mud_puddle": { name:"진흙 웅덩이", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"악센트용. 3~4칸에 한 번씩만 흩뿌려야 반복 티가 나지 않습니다." },
    "f04_straw_dirt": { name:"밀짚 흩어진 바닥", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"가축·마구간 주변, 짐 부리는 자리. 시장 진입로에 깔면 좋습니다." },
    "f05_rough_cobble": { name:"거친 돌포장", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"시장 광장의 기본 포장석. 상업 구역의 바탕 타일입니다." },
    "f06_cobble_worn": { name:"닳고 잡초 낀 포장", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"돌이 빠지고 잡초가 낀 변형. 같은 포장 안에 섞어 단조로움을 깹니다." },
    "f07_drain_channel": { name:"중앙 배수 도랑", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"골목 한가운데를 지나는 배수 도랑. 가로로만 이어 붙이세요." },
    "f08_market_spill": { name:"곡물·향신료 자국", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"곡물·향신료를 쏟은 자국. 노점 바로 앞 1~2칸에만 배치합니다." },
    "f09_limestone_slab": { name:"석회암 판석", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"상부 도시 주택가의 다듬은 판석. 저택 주변 골목용." },
    "f10_roman_flagstone": { name:"로마식 대형 판석", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"차가운 회색 대형 판석. 안토니아 요새 안뜰과 병영 주변 전용." },
    "f11_marble_checker": { name:"대리석 정방형 포장", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"저택 안뜰·현관의 정방형 대리석 포장." },
    "f12_mosaic_geometric": { name:"기하 문양 모자이크", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"저택 실내 모자이크. 유대 관습상 인물상이 금지되어 기하 문양만 사용했습니다." },
    "f13_temple_white_slab": { name:"성전 뜰 백색 석판", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"성전 뜰의 대형 백색 석판. 회랑 타일과 붙이면 스케일이 살아납니다." },
    "f14_temple_border": { name:"성전 뜰 경계 문양띠", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"성전 뜰 경계를 두르는 뇌문(meander) 띠. 가로로만 이어 붙이세요." },
    "f15_stone_step": { name:"돌계단", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"돌계단. 세로로 반복하면 계단참이 연속됩니다. 상·하부 도시 고저차 연결용." },
    "f16_rooftop_clay": { name:"평지붕 옥상 바닥", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"평지붕 옥상 씬 전용 바닥. 유월절 순례객이 머무는 옥상 연출에 씁니다." },
    "f17_cistern_water": { name:"수조·못 물", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"수조·못. 실로암 못이나 저수조 표현용." },
    "f18_dry_grass": { name:"마른 풀·올리브 뜰", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"성 밖 감람산·올리브 뜰 방면의 마른 풀밭." },
    "f19_temple_court_dirt": { name:"성전 뜰 석회 바닥", kind:"floor", cols:1, rows:1, fw:0, fh:0, front:[], note:"성전 뜰 바깥의 다져진 흰 석회 바닥. 백색 석판과 흙바닥 사이를 잇는 중간 톤." },
    "01_basic_mudbrick_house": { name:"기본 흙벽돌집", kind:"building", cols:2, rows:3, fw:2, fh:2, front:[0], note:"진흙벽돌 조적 + 평지붕. 신명기 22:8에 따라 지붕 난간(흉벽)을 둘렀고, 옥상행 외부 돌계단을 측면에 붙였습니다. 창은 방범·단열 때문에 작고 높게." },
    "02_tenement_block": { name:"확장형 다세대 주택", kind:"building", cols:4, rows:4, fw:4, fh:3, front:[1, 2], note:"두 채가 앞뒤로 붙어 자란 형태. 공용 외부계단과 옥상의 임시 천막은 유월절 순례 인파를 재우던 실제 관습입니다. 좌우로 이어 붙이면 미로형 골목이 됩니다." },
    "03_awning_house": { name:"낡은 차양을 덧댄 집", kind:"building", cols:2, rows:3, fw:2, fh:2, front:[0, 1], note:"마른 나뭇가지 위에 낡은 아마포를 얹은 차양. 기본 흙벽돌집과 섞어 배치해 단조로움을 깹니다." },
    "04_bakery_with_oven": { name:"화덕이 있는 빵집", kind:"building", cols:2, rows:3, fw:2, fh:2, front:[0, 1], note:"외벽에 돌출된 둥근 흙 화덕(타누르). 연료 그을음과 지붕 연기구멍, 앞쪽 빵 진열대 포함." },
    "05_open_workshop": { name:"반개방형 공방", kind:"building", cols:3, rows:3, fw:3, fh:2, front:[0, 1, 2], note:"1층 전면 개방. 목재 기둥·상인방, 작업대와 톱·자귀, 쌓아둔 목재. 목공소/대장간 겸용." },
    "06_arched_warehouse": { name:"아치형 창고 건물", kind:"building", cols:2, rows:3, fw:2, fh:2, front:[0, 1], note:"창이 없는 석조 창고. 홍예석 아치와 철 보강대를 덧댄 두꺼운 나무문으로 향신료·곡물을 보관." },
    "07_noble_marble_mansion": { name:"고위층 대리석 저택", kind:"building", cols:4, rows:4, fw:4, fh:3, front:[1, 2], note:"다듬은 백색 석회암(대리석 톤) 2층. 쌍기둥 현관과 격자 창살, 코니스·난간으로 상부 도시 특권층 저택을 표현." },
    "08_roman_barracks": { name:"로마 주둔군 병영", kind:"building", cols:4, rows:3, fw:4, fh:2, front:[1, 2], note:"차가운 회색 석재로 통일. 총안 흉벽, 아치 성문, 붉은 군단 깃발과 세워둔 필룸. 안토니아 요새 내부용." },
    "09_watchtower": { name:"수직 망루와 감시탑", kind:"building", cols:2, rows:4, fw:2, fh:2, front:[0, 1], note:"2x4로 극단적으로 길쭉한 실루엣. 돌출 감시대와 좁은 화살 구멍이 아래를 내려다봐 압박감을 줍니다." },
    "10_synagogue": { name:"동네 지역 회당", kind:"building", cols:3, rows:4, fw:3, fh:3, front:[0, 1, 2], note:"주택보다 층고가 높고, 갈릴리형 회당처럼 정면 3출입구와 장식 상인방·정면 계단을 갖춘 엄숙한 파사드." },
    "11_temple_colonnade": { name:"성전 뜰의 대리석 회랑", kind:"building", cols:4, rows:3, fw:4, fh:1, front:[], note:"성전 뜰 회랑의 한 구간. 가로로 이어 붙이면 기둥이 끝없이 이어지며 압도적 스케일이 만들어집니다." },
    "n01_olive_tree": { name:"올리브 나무", kind:"prop", cols:3, rows:3, fw:1, fh:1, front:[], note:"수관은 통과, 줄기 1칸만 충돌" },
    "n02_date_palm": { name:"대추야자 나무", kind:"prop", cols:2, rows:4, fw:1, fh:1, front:[], note:"잎 3칸은 겹쳐 지나감" },
    "n03_fig_tree": { name:"무화과 나무", kind:"prop", cols:3, rows:3, fw:1, fh:1, front:[], note:"수관은 통과, 줄기 1칸만 충돌" },
    "n04_cypress": { name:"사이프러스", kind:"prop", cols:1, rows:4, fw:1, fh:1, front:[], note:"세로로 길어 원경 실루엣용" },
    "n05_shrub": { name:"관목 덤불", kind:"prop", cols:1, rows:1, fw:1, fh:1, front:[], note:"낮아 가림 없음" },
    "n06_dry_thistle": { name:"마른 엉겅퀴", kind:"prop", cols:1, rows:1, fw:0, fh:0, front:[], note:"장식용, 충돌 없음" },
    "n07_boulder": { name:"큰 바위", kind:"prop", cols:2, rows:2, fw:2, fh:1, front:[], note:"앞 1줄만 충돌" },
    "n08_rock_cluster": { name:"작은 돌무더기", kind:"prop", cols:1, rows:1, fw:1, fh:1, front:[], note:"넘어갈 수 없는 낮은 장애물" },
    "n09_vine_trellis": { name:"포도 시렁", kind:"prop", cols:3, rows:2, fw:3, fh:1, front:[], note:"기둥 줄만 충돌, 아래 통행 가능" },
    "n10_stone_well": { name:"돌 우물", kind:"prop", cols:2, rows:2, fw:2, fh:1, front:[], note:"정면 1줄 충돌 + 상호작용" },
    "n11_jar_cluster": { name:"항아리 더미", kind:"prop", cols:1, rows:1, fw:1, fh:1, front:[], note:"치우거나 깨뜨릴 수 있는 소품" },
    "n12_olive_press": { name:"올리브 압착기", kind:"prop", cols:2, rows:2, fw:2, fh:1, front:[], note:"겟세마네·기름틀 연출용" },
    "cw_cap_mid": { name:"성벽 총안(반복)", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"cw_cap_mid.png" },
    "cw_cap_left": { name:"성벽 총안 좌측", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"cw_cap_left.png" },
    "cw_cap_right": { name:"성벽 총안 우측", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"cw_cap_right.png" },
    "cw_wall_mid": { name:"성벽면(반복)", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"cw_wall_mid.png" },
    "cw_wall_left": { name:"성벽면 좌단", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"cw_wall_left.png" },
    "cw_wall_right": { name:"성벽면 우단", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"cw_wall_right.png" },
    "cw_base_mid": { name:"성벽 경사 기단(탈루스)", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"cw_base_mid.png" },
    "tr_cap_mid": { name:"축대 윗면 가장자리", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"tr_cap_mid.png" },
    "tr_face_mid": { name:"축대 벽면(반복)", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"tr_face_mid.png" },
    "tr_face_left": { name:"축대 좌단", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"tr_face_left.png" },
    "tr_face_right": { name:"축대 우단", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"tr_face_right.png" },
    "tr_stair_mid": { name:"축대 관통 계단", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"tr_stair_mid.png" },
    "tr_stair_cap": { name:"계단 진입부", kind:"wallpart", cols:1, rows:1, fw:0, fh:0, front:[], note:"tr_stair_cap.png" },
    "w_m_cap_left": { name:"난간 좌측 마감", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_cap_left.png" },
    "w_m_cap_mid": { name:"지붕 난간 상단", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_cap_mid.png" },
    "w_m_cap_right": { name:"난간 우측 마감", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_cap_right.png" },
    "w_m_wall_left": { name:"벽면 왼쪽 모서리", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_wall_left.png" },
    "w_m_wall_mid": { name:"벽면 (가로·세로 반복)", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_wall_mid.png" },
    "w_m_wall_right": { name:"벽면 오른쪽 모서리", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_wall_right.png" },
    "w_m_base_left": { name:"밑단 왼쪽 끝", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_base_left.png" },
    "w_m_base_mid": { name:"벽 밑단(접지)", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_base_mid.png" },
    "w_m_base_right": { name:"밑단 오른쪽 끝", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_base_right.png" },
    "w_m_side_cap_l": { name:"좌측면 난간", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_side_cap_l.png" },
    "w_m_side_face_l": { name:"좌측면 (세로 골목용)", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_side_face_l.png" },
    "w_m_corner_inner_l": { name:"오목 모퉁이 (좌에서 꺾임)", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_corner_inner_l.png" },
    "w_m_side_cap_r": { name:"우측면 난간", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_side_cap_r.png" },
    "w_m_side_face_r": { name:"우측면 (세로 골목용)", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_side_face_r.png" },
    "w_m_corner_inner_r": { name:"오목 모퉁이 (우에서 꺾임)", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_corner_inner_r.png" },
    "w_m_door": { name:"출입문 (맨 아랫줄에 배치)", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_door.png" },
    "w_m_window": { name:"작은 고창", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_window.png" },
    "w_m_alley_gap": { name:"집과 집 사이 좁은 틈", kind:"wallmod", cols:1, rows:1, fw:0, fh:0, front:[], note:"w_m_alley_gap.png" },
    "x01_city_gate": { name:"성문(아치 이중 문루)", kind:"sprite", cols:4, rows:5, fw:4, fh:2, front:[], note:"성벽 키트와 이어 붙임. 문 앞 2칸이 통과 지점" },
    "x02_alley_arch": { name:"골목 위 아치 통로", kind:"sprite", cols:3, rows:3, fw:0, fh:0, front:[], note:"좌우 1칸씩만 충돌, 가운데는 통행 가능" },
    "x03_market_stall": { name:"시장 노점 천막", kind:"sprite", cols:3, rows:2, fw:3, fh:1, front:[], note:"차양 아래 앞줄에서 상인과 대화" },
    "x04_fruit_table": { name:"과일·채소 좌판", kind:"sprite", cols:2, rows:1, fw:2, fh:1, front:[], note:"노점 앞에 붙여 배치" },
    "x05_basket_pile": { name:"바구니 더미", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"골목 구석 채움용" },
    "x06_water_jar": { name:"물 항아리", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"우물가·집 앞에 배치" },
    "x07_campfire": { name:"화톳불", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"야간 씬 광원. 병사 야영·순례객 모닥불" },
    "x08_oil_lamp_stand": { name:"등잔대", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"실내·회당 조명" },
    "x09_laundry_line": { name:"빨랫줄", kind:"sprite", cols:2, rows:1, fw:0, fh:0, front:[], note:"옥상·골목 상단에 걸침, 충돌 없음" },
    "x10_money_table": { name:"환전상 탁자", kind:"sprite", cols:2, rows:1, fw:2, fh:1, front:[], note:"성전 뜰 바깥에 배치" },
    "x11_dove_cage": { name:"비둘기 새장", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"제물용 비둘기 판매대" },
    "x12_cart": { name:"짐수레", kind:"sprite", cols:2, rows:1, fw:2, fh:1, front:[], note:"시장 진입로·성문 앞" },
    "x13_grain_sacks": { name:"곡물 자루 더미", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"창고·시장 소품" },
    "x14_scroll_shelf": { name:"두루마리 선반", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"회당 실내" },
    "x15_donkey": { name:"당나귀", kind:"sprite", cols:2, rows:2, fw:2, fh:1, front:[], note:"짐 나르는 가축. 골목·성문 앞" },
    "x16_sheep": { name:"양", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"제물·목축. 무리로 배치" },
    "x17_goat": { name:"염소", kind:"sprite", cols:1, rows:1, fw:1, fh:1, front:[], note:"제물·목축. 양과 섞어 배치" },
  };

  /* ── 인물 규격표 ── */
  const CHARS = {
    "g01_laborer": { name:"남성 일용직 노동자", cat:"서민·노동", note:"시장·건축 현장 등 어디에나 배치하는 기본 군중" },
    "g02_housewife": { name:"여성 가정주부", cat:"서민·노동", note:"우물가·골목에서 물동이를 나르는 일상 인물" },
    "g03_fisherman": { name:"어부", cat:"서민·노동", note:"갈릴리 출신 서민. 그물을 손질하는 자세" },
    "g04_shepherd": { name:"목자", cat:"서민·노동", note:"들판·성문 밖 배치. 지팡이와 어린 양을 함께 든 모습" },
    "g05_old_man": { name:"노인 남성", cat:"서민·노동", note:"골목 어귀에 앉아 있는 배경 인물" },
    "g06_old_woman": { name:"노파", cat:"서민·노동", note:"베일을 쓴 연장자 여성" },
    "g07_beggar": { name:"거지", cat:"서민·노동", note:"성전 문·성문 앞에 배치하는 구제 대상 인물" },
    "g08_boy": { name:"아이(소년)", cat:"서민·노동", note:"골목을 뛰어다니는 배경 군중용" },
    "g09_girl": { name:"아이(소녀)", cat:"서민·노동", note:"골목을 뛰어다니는 배경 군중용" },
    "g10_bread_seller": { name:"빵장수", cat:"상업·시장", note:"빵집·시장 좌판 앞에 배치" },
    "g11_spice_merchant": { name:"향신료 상인", cat:"상업·시장", note:"시장 좌판 상인. 값비싼 사프란 톤 옷감" },
    "g12_cloth_merchant": { name:"옷감 상인", cat:"상업·시장", note:"염색 옷감을 파는 부유한 시장 상인" },
    "g13_money_changer": { name:"환전상", cat:"상업·시장", note:"성전 뜰 바깥 환전상 탁자와 짝지어 배치" },
    "g14_potter": { name:"도공", cat:"상업·시장", note:"공방 타일과 함께 배치하는 장인" },
    "g15_blacksmith": { name:"대장장이", cat:"상업·시장", note:"반개방형 공방 타일과 짝지어 배치" },
    "g16_pharisee": { name:"바리새인", cat:"종교 계층", note:"넓은 술(tzitzit) 장식 옷단이 특징인 율법 준수자" },
    "g17_sadducee": { name:"사두개인", cat:"종교 계층", note:"제사장 귀족 계층. 값비싼 청색 옷" },
    "g18_scribe": { name:"서기관(율법학자)", cat:"종교 계층", note:"기록·낭독 담당. 필기구 상자를 든 모습" },
    "g19_temple_priest": { name:"성전 제사장", cat:"종교 계층", note:"출애굽기 제사장 예복(세마포+청홍자색)을 단순화해 표현" },
    "g20_levite": { name:"레위인(성전 봉사자)", cat:"종교 계층", note:"성전 음악·잡무를 맡은 봉사 계층. 나팔을 든 모습" },
    "g21_synagogue_leader": { name:"회당장/랍비", cat:"종교 계층", note:"동네 회당에서 가르치는 인물. 토라 두루마리" },
    "g22_legionary": { name:"로마 군단병", cat:"로마·통제", note:"안토니아 요새·성문 경비용 기본 병사" },
    "g23_centurion": { name:"백부장", cat:"로마·통제", note:"붉은 지휘관 망토를 두른 백인대장" },
    "g24_roman_official": { name:"로마 관리(행정관)", cat:"로마·통제", note:"자주색 단(purple stripe) 토가를 입은 문관" },
    "g25_praetorium_guard": { name:"프라이토리움 근위병", cat:"로마·통제", note:"총독 관저 경비. 창 대신 검+방패로 단순화" },
    "g26_wealthy_merchant": { name:"부유한 상인", cat:"상류층", note:"자주색 옷을 입을 수 있을 만큼 부유한 상인" },
    "g27_sanhedrin_member": { name:"산헤드린 공회원", cat:"상류층", note:"공회에 참석하는 원로. 왕자색 예복" },
    "g28_noblewoman": { name:"귀부인", cat:"상류층", note:"상부 도시 저택 거주자" },
    "g29_pilgrim_father": { name:"순례자 아버지", cat:"순례자", note:"유월절 순례 인파. 지팡이를 짚은 가장" },
    "g30_pilgrim_mother": { name:"순례자 어머니", cat:"순례자", note:"가족 단위 순례객" },
    "g31_traveler": { name:"나그네(여행자)", cat:"순례자", note:"먼 길을 걸어온 여행자. 지팡이" },
    "g32_diaspora_pilgrim": { name:"디아스포라 순례자", cat:"순례자", note:"사도행전 2장의 여러 민족 순례객을 반영한 짙은 피부톤" },
    "b01_jesus": { name:"나사렛 예수", cat:"성경 인물", note:"흰 세마포+청색 겉옷, 얇은 금테 후광으로 표현" },
    "b02_mary_mother": { name:"마리아(예수의 모친)", cat:"성경 인물", note:"전통적 도상학의 청색 베일" },
    "b03_mary_magdalene": { name:"막달라 마리아", cat:"성경 인물", note:"향유 옥합을 든 모습(누가복음 7장/요한복음 12장 참조)" },
    "b04_john_baptist": { name:"세례 요한", cat:"성경 인물", note:"낙타털 옷과 가죽띠(마태복음 3:4)를 거친 질감으로 표현" },
    "b05_peter": { name:"시몬 베드로", cat:"성경 인물", note:"천국 열쇠(마태복음 16:19)를 든 수제자" },
    "b06_andrew": { name:"안드레", cat:"성경 인물", note:"베드로의 형제. 본래 어부" },
    "b07_james_zebedee": { name:"야고보(세베대의 아들)", cat:"성경 인물", note:"요한의 형제. 어부 출신" },
    "b08_john_apostle": { name:"사도 요한", cat:"성경 인물", note:"최연소 제자. 전통적으로 수염 없이 묘사" },
    "b09_philip": { name:"빌립", cat:"성경 인물", note:"벳새다 출신 제자" },
    "b10_bartholomew": { name:"바돌로매(나다나엘)", cat:"성경 인물", note:"'간사한 것이 없는' 제자(요한복음 1:47)" },
    "b11_thomas": { name:"도마", cat:"성경 인물", note:"의심 많은 도마로 알려진 제자" },
    "b12_matthew": { name:"마태", cat:"성경 인물", note:"전 세리(레위). 장부를 든 모습으로 직업을 표현" },
    "b13_james_alphaeus": { name:"야고보(알패오의 아들)", cat:"성경 인물", note:"'작은 야고보'로도 불리는 제자" },
    "b14_thaddaeus": { name:"다대오(유다)", cat:"성경 인물", note:"유다 다대오. 가룟 유다와 구분되는 제자" },
    "b15_simon_zealot": { name:"열심당원 시몬", cat:"성경 인물", note:"반로마 열심당 출신으로 알려진 제자" },
    "b16_judas_iscariot": { name:"가룟 유다", cat:"성경 인물", note:"공동체의 돈궤를 맡았던 제자(요한복음 12:6)" },
    "b17_pontius_pilate": { name:"본디오 빌라도", cat:"성경 인물", note:"유대 총독. 로마 토가와 진홍 망토" },
    "b18_caiaphas": { name:"대제사장 가야바", cat:"성경 인물", note:"그 해의 대제사장. 금색 관과 세마포 예복" },
    "b19_annas": { name:"안나스", cat:"성경 인물", note:"가야바의 장인. 전 대제사장 원로" },
    "b20_herod_antipas": { name:"헤롯 안디바", cat:"성경 인물", note:"갈릴리 분봉왕. 금색 관과 왕자색 망토" },
    "b21_nicodemus": { name:"니고데모", cat:"성경 인물", note:"산헤드린 공회원이자 은밀한 제자(요한복음 3장)" },
    "b22_joseph_arimathea": { name:"아리마대 요셉", cat:"성경 인물", note:"예수의 시신을 수습한 부유한 공회원" },
    "b23_simon_cyrene": { name:"구레네 시몬", cat:"성경 인물", note:"북아프리카 키레네 출신 디아스포라 유대인" },
    "b24_barabbas": { name:"바라바", cat:"성경 인물", note:"사면받은 죄수. 거친 자루옷" },
  };

  for (const k in ATLAS) {
    const a = ATLAS[k];
    a.key = k; a.w = a.cols * TILE; a.h = a.rows * TILE;
  }
  for (const k in CHARS) {
    const c = CHARS[k];
    c.key = k; c.kind = 'char'; c.cols = 1; c.rows = 1.5;
    c.fw = 1; c.fh = 1; c.w = 32; c.h = 48;
  }
  /* 규격을 물을 때 g01_laborer_side 같은 방향 그림은 대표 키로 되돌려 본다 */
  function meta(key) {
    return ATLAS[key] || CHARS[key] || CHARS[key.replace(/_(side|back)$/, '')] || null;
  }

  /* ══════════════════════════════════════════
     방향 — 인물이 어느 쪽을 보느냐에 따라 어느 장을 쓸지
     ══════════════════════════════════════════ */
  const POSE = { down: '', up: '_back', left: '_side', right: '_side' };
  const poseKeys = key => (CHARS[key] ? [key, key + '_side', key + '_back'] : [key]);
  const usable = key => { const i = IMG[key]; return !!i && !i.broken; };

  /* 측면 그림은 오른쪽을 보고 있으므로 왼쪽으로 갈 때만 뒤집는다.
     측면·후면이 없는 인물은 정면 그림으로 대신한다. */
  function poseOf(key, dir) {
    const suf = POSE[dir] || '';
    const flip = dir === 'left';
    if (suf && usable(key + suf)) return { key: key + suf, flip };
    return { key, flip };
  }

  /* ══════════════════════════════════════════
     이미지 로더 — 낱장 PNG 를 미리 다 받아 둔다
     ══════════════════════════════════════════ */
  const IMG = {};
  const missing = [];

  function load(keys, onProgress) {
    // 인물 키 하나를 넣으면 정면·측면·후면 세 장을 함께 받는다
    const list = [...new Set(keys.flatMap(poseKeys))].filter(k => !IMG[k]);
    const total = list.length;
    let done = 0;
    const result = () => ({ total, loaded: total - missing.length, missing });
    return new Promise(resolve => {
      if (!total) { resolve(result()); return; }
      for (const key of list) {
        const img = new Image();
        img.onload = () => {
          const m = meta(key);
          if (m && (img.naturalWidth !== m.w || img.naturalHeight !== m.h)) {
            console.warn(`[assets] ${key}: 규격표는 ${m.w}×${m.h} 인데 파일은 ${img.naturalWidth}×${img.naturalHeight} 입니다.`);
          }
          tick();
        };
        img.onerror = () => {
          img.broken = true;
          missing.push(key);
          console.warn(`[assets] 그림을 찾지 못했습니다: ${pathOf(key)}`);
          tick();
        };
        IMG[key] = img;
        img.src = pathOf(key);
      }
      function tick() {
        done++;
        if (onProgress) onProgress(done, total);
        if (done >= total) resolve(result());
      }
    });
  }

  /* 못 찾은 그림은 자홍색 칸으로 그려서 눈에 띄게 둔다 */
  function stub(ctx, dx, dy, w, h) {
    ctx.fillStyle = 'rgba(226,60,180,.55)';
    ctx.fillRect(dx, dy, w, h);
    ctx.strokeStyle = '#E23CB4';
    ctx.strokeRect(dx + .5, dy + .5, w - 1, h - 1);
  }

  /* 규격표 크기 그대로 한 장 찍기 */
  function draw(ctx, key, dx, dy) {
    const img = IMG[key], m = meta(key);
    if (!m) return;
    if (!img || img.broken || !img.complete) { stub(ctx, dx, dy, m.w, m.h); return; }
    ctx.drawImage(img, dx, dy);
  }

  /* 좌우 뒤집어 찍기 — 인물이 왼쪽을 볼 때 */
  function drawFlipped(ctx, key, dx, dy) {
    const img = IMG[key], m = meta(key);
    if (!m) return;
    if (!img || img.broken || !img.complete) { stub(ctx, dx, dy, m.w, m.h); return; }
    ctx.save();
    ctx.translate(dx + m.w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /* 방향까지 맞춰 한 장 찍기 — 인물 전용 */
  function drawChar(ctx, key, dir, dx, dy) {
    const p = poseOf(key, dir);
    if (p.flip) drawFlipped(ctx, p.key, dx, dy);
    else draw(ctx, p.key, dx, dy);
  }

  NS.Assets = { TILE, ROOT, ATLAS, CHARS, IMG, meta, pathOf, poseOf, poseKeys,
                load, draw, drawFlipped, drawChar, missing };
})();
