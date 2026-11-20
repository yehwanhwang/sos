// 앱의 시작점: 지금 상태에 맞는 화면을 고르고, 화면 사이를 옮겨 다닌다.
//
//   로그인 전          첫 화면(링크로 왔으면 누가 보냈는지 보여 준다)
//   이름을 정하기 전    이름 정하기(+ 링크를 만든 사람에게 받아 달라고 묻기)
//   링크를 들고 왔으면  이미 연결됐거나 이미 물어본 사람이면 곧장 가족 화면, 아니면 들어갈지 묻기
//   그 밖에            #/ 우리 가족, #/p/<id> 한 사람, #/add 넣기, #/connect 연결하기, #/manage 설정,
//                     #/check 점검(명절 점검 카드), #/prepare 급할 때 바로 찾게
//
// 링크는 #j=<토큰>. 토큰은 주소에서 바로 지우고, 로그인을 다녀오는 동안 기기에 잠깐 둔다.
// 링크를 보낸 사람이 화면을 열어 둔 동안에는 15초마다 새로 확인해서, 누가 누르면 곧 '들어오려고 해요'가 뜬다.
import * as api from './api.js';
import { h, clear, toast, errorText, closeAllSheets, takeSheetEntry } from './ui.js';
import { welcomeView, startView, joinView, peekInvite } from './views/welcome.js';
import { homeView } from './views/home.js';
import { personView } from './views/person.js';
import { addView } from './views/add.js';
import { connectView } from './views/connect.js';
import { manageView } from './views/manage.js';
import { checkView } from './views/check.js';
import { prepareView } from './views/prepare.js';

const root = document.getElementById('app');
const JOIN_KEY = 'famsos.join';
const NEXT_KEY = 'famsos.next';
let memory = {}; // 저장소를 못 쓰는 환경에서 대신 들고 있는 값

const keep = {
  get: (k) => {
    try {
      return localStorage.getItem(k) ?? memory[k] ?? null;
    } catch {
      return memory[k] ?? null;
    }
  },
  set: (k, v) => {
    memory[k] = v;
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 이번 방문에서만 쓴다 */
    }
  },
  del: (k) => {
    delete memory[k];
    try {
      localStorage.removeItem(k);
    } catch {
      /* 무시 */
    }
  },
};

const invite = {
  get: () => keep.get(JOIN_KEY),
  clear: () => keep.del(JOIN_KEY),
};

/** 주소가 초대 링크면 토큰을 챙기고 주소에서는 지운다. */
function captureInvite() {
  const m = /^#j=([A-Za-z0-9_-]{43})$/.exec(location.hash);
  if (!m) return false;
  keep.set(JOIN_KEY, m[1]);
  history.replaceState(null, '', location.pathname + location.search + '#/');
  return true;
}

const currentPath = () => location.hash.replace(/^#/, '') || '/';

// ── 히스토리 ─────────────────────────────────────────────────────────────────────
// 화면마다 번호(idx)를 히스토리 항목에 적어 두고, 번호별 경로를 기억한다.
// 화면 위의 '‹ 뒤로' 링크는 바로 앞 항목이 그 화면이면 history.back() 으로 돌아간다.
// 그래서 히스토리가 쌓이지 않고, 폰의 뒤로 버튼을 가족 화면에서 누르면 카톡 대화방으로 돌아간다.

let idx = 0;
const stack = [];

function syncHistory(path) {
  const st = history.state;
  if (typeof st?.idx === 'number') idx = st.idx; // 뒤로·앞으로로 온 항목, 또는 바꿔 끼운 항목
  else {
    idx += 1; // 새로 생긴 항목
    stack.length = idx;
    history.replaceState({ ...(st || {}), idx }, '');
  }
  stack[idx] = path;
}

/** 다른 화면으로. replace 면 지금 항목을 바꿔 끼운다(뒤로 가기에 남기지 않는다). */
function go(path, { replace = false } = {}) {
  if (currentPath() !== path) {
    if (takeSheetEntry()) {
      // 방금 닫은 시트가 남긴 항목을 새 화면이 이어 쓴다.
      history.replaceState({ idx: idx + 1 }, '', `#${path}`);
      stack.length = idx + 1;
    } else if (replace) {
      history.replaceState({ idx }, '', `#${path}`);
    } else {
      location.hash = path; // hashchange 가 화면을 고른다
      return;
    }
  }
  route(); // 기다리지 않는다(화면 고르기 안에서 불려도 서로 기다리다 멈추지 않게)
}

/** 위 화면(parent)으로 돌아간다. */
function up(parent) {
  if (idx > 0 && stack[idx - 1] === parent) history.back();
  else go(parent, { replace: true });
}

/** 카카오 로그인을 다녀온 뒤 돌아갈 화면을 기억해 두고 로그인으로 보낸다. */
async function login() {
  const path = currentPath();
  if (path !== '/') keep.set(NEXT_KEY, path);
  await api.startLogin('kakao');
}

// ── 화면 바꾸기 ──────────────────────────────────────────────────────────────────

let shown = null; // 지금 그려진 화면의 경로(또는 'welcome' 같은 이름)
const depth = (p) => (p?.startsWith('/') ? p.split('/').filter(Boolean).length : 0);
const motionOk = () => typeof document.startViewTransition === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;

const ctx = { go, up, login, invite, refresh: () => route({ keepScroll: true }) };

// 화면 고르기는 한 번에 하나씩(불러오는 중에 주소가 또 바뀌어도 겹치지 않게).
let routing = Promise.resolve();
function route(opts = {}) {
  routing = routing.then(() => routeOnce(opts));
  return routing;
}

/**
 * 화면을 다 그린 다음에 바꿔 끼운다. 불러오는 동안에는 앞 화면이 그대로 있고 위쪽에 진행 표시만 뜬다.
 * 화면 전환(View Transition)이 되는 브라우저에서는 누른 이름이 다음 화면의 제목으로 옮겨 간다.
 */
async function show(view, props = {}, name = currentPath(), scrollY = 0) {
  const page = h('main', { class: 'app' });
  await view(page, { ...props, ...ctx, from: shown });
  const dir = name === shown ? 'same' : depth(name) > depth(shown) ? 'forward' : depth(name) < depth(shown) ? 'back' : 'fade';
  const swap = () => {
    if (name !== shown) closeAllSheets(); // 같은 화면을 다시 그릴 때는 열려 있는 창을 그대로 둔다
    clear(root, page);
    scrollTo(0, scrollY);
    shown = name;
    page.querySelector('[data-autofocus]')?.focus({ preventScroll: true });
  };
  if (!motionOk() || document.hidden) return swap();
  document.documentElement.dataset.nav = dir;
  const t = document.startViewTransition(swap);
  // 전환이 건너뛰어져도(다른 전환이 시작됐거나 탭이 숨겨졌을 때) 화면은 이미 바뀌어 있다.
  t.ready.catch(() => {});
  t.finished.catch(() => {}).then(() => {
    for (const el of root.querySelectorAll('.morph-src')) el.classList.remove('morph-src');
  });
  await t.updateCallbackDone.catch(() => {});
}

function message(title, body, actionLabel = '처음으로', action = () => go('/', { replace: true })) {
  return show((page) => {
    clear(page,
      h('div', { class: 'notice-page' },
        h('h1', null, title),
        h('p', { class: 'lead' }, body),
        h('button', { class: 'btn block', type: 'button', onclick: action }, actionLabel)));
  }, {}, 'message');
}

async function routeOnce({ keepScroll = false } = {}) {
  const y = keepScroll ? scrollY : 0;
  document.body.classList.add('busy');
  try {
    await routeInner(y);
  } catch (e) {
    if (e?.code === 'not_authenticated') {
      route(); // onSignedOut 이 세션을 지웠다. 첫 화면으로
    } else if (e?.code === 'not_found') {
      await message('볼 수 없는 목록이에요', '연결이 끊겼거나 지워진 것 같아요.');
    } else {
      console.error(e);
      await message('잠시 문제가 생겼어요', errorText(e), '다시 해 보기', () => route());
    }
  } finally {
    document.body.classList.remove('busy');
  }
}

async function routeInner(y) {
  const token = invite.get();
  if (!api.getSession()) return show(welcomeView, { token }, 'welcome');

  const home = await api.rpc('home');
  lastHome = home;
  if (!home.exists) return show(startView, { token, suggested: home.suggested_name }, 'start');

  if (token) {
    const peek = await peekInvite(token);
    if (peek.status === 'error') throw peek.error;
    // 이미 연결된 사람이 카톡 대화방의 그 링크를 다시 눌렀다(가장 흔한 경우), 또는 이미 물어보고 기다리는 중이다:
    // 묻지 않고 가족 화면을 연다(기다리는 중이면 거기에 '받아 주면 열려요'가 보인다).
    // 내가 보낸 링크도 막지 않는다. 대화방 공지의 링크는 보낸 사람에게도 급할 때 들어오는 길이다.
    if (peek.mine) {
      invite.clear();
      if (peek.status === 'open') toast('내가 보낸 링크예요. 누가 누르면 여기에 "들어오려고 해요"가 떠요.');
    } else if (peek.already || peek.request) invite.clear();
    else return show(joinView, { token, peek }, 'join');
  }

  const next = keep.get(NEXT_KEY);
  if (next) {
    keep.del(NEXT_KEY);
    if (currentPath() !== next) return go(next, { replace: true });
  }

  const path = currentPath();
  syncHistory(path);
  let m;
  if (path === '/') return show(homeView, { home }, path, y);
  if ((m = /^\/p\/([0-9a-f-]{36})$/.exec(path))) return show(personView, { id: m[1], home }, path, y);
  if (path === '/add') return show(addView, { home }, path, y);
  if (path === '/connect') return show(connectView, { home }, path, y);
  if (path === '/manage') return show(manageView, { home }, path, y);
  if (path === '/check') return show(checkView, { home }, path, y);
  if (path === '/prepare') return show(prepareView, { home }, path, y);
  return go('/', { replace: true });
}

// ── 받아 주기를 바로 알기 ─────────────────────────────────────────────────────────
// 푸시 알림이 없으므로, 열어 둔 링크가 있거나 내가 누르고 기다리는 링크가 있는 동안에는 15초마다 첫 화면 정보를 다시 읽는다.
// 우리 가족 화면이면 바로 다시 그리고, 다른 화면이면 알림으로 알려 준다.

let lastHome = null;
// 서버(구글 Apps Script)는 한 번에 1~2초가 걸리고 실행 횟수에 한도가 있어서 15초마다 묻는다.
const POLL_MS = Number(globalThis.FAMSOS_POLL_MS) || 15000;
const sig = (x) => JSON.stringify([x.requests.map((r) => r.id), x.waiting.map((w) => `${w.id}:${w.status}`), x.people.map((p) => p.id)]);

async function watch() {
  const before = lastHome;
  if (document.hidden || !api.getSession() || !before?.exists) return;
  if (!(before.open_links > 0 || before.waiting.some((w) => w.status === 'pending'))) return;
  let now;
  try {
    now = await api.rpc('home');
  } catch {
    return; // 다음에 다시
  }
  if (!now.exists || sig(now) === sig(before) || lastHome !== before) return;
  if (shown === '/' && !document.querySelector('.backdrop')) {
    route({ keepScroll: true }); // 다시 그리면서 lastHome 도 새로 읽는다
    return;
  }
  if (shown === '/') return; // 창이 열려 있으면 닫힌 뒤에 다시 본다
  lastHome = now;
  const asked = now.requests.find((r) => !before.requests.some((x) => x.id === r.id));
  const joined = now.people.find((p) => !before.people.some((x) => x.id === p.id));
  if (asked) toast(`${asked.name}님이 들어오려고 해요. 우리 가족 화면에서 받아 주세요.`);
  else if (joined) toast(`${joined.name}님과 연결됐어요`);
}

async function boot() {
  // 다른 사이트가 이 화면을 틀(iframe) 안에 넣고 누르게 꾸미지 못하게 한다(GitHub Pages 는 frame-ancestors 헤더를 달 수 없다).
  // 미리 보기(DEMO)는 claude.ai 의 틀 안에서 열린다.
  if (window.top !== window.self && !globalThis.FAMSOS_CONFIG?.DEMO) {
    return message('새 창에서 열어 주세요', '비상연락망은 다른 페이지 안에서는 열리지 않아요.', '새 창에서 열기',
      () => window.open(location.href, '_blank', 'noopener'));
  }
  captureInvite();
  if (!api.configured()) {
    return message('설정이 필요해요', 'config.js 에 Apps Script 웹 앱 주소(API_URL)와 카카오 REST API 키를 넣어 주세요. 방법은 README에 있어요.', '다시 열기', () => location.reload());
  }
  api.onSignedOut(() => route());
  addEventListener('hashchange', () => {
    if (/^#j=/.test(location.hash)) captureInvite(); // 앱이 열린 탭에서 초대 링크를 연 경우
    closeAllSheets();
    route();
  });
  // 누른 사람의 이름이 다음 화면의 제목으로 옮겨 가도록 표시해 둔다(화면 전환이 되는 브라우저에서만 보인다).
  root.addEventListener('click', (e) => {
    const row = e.target.closest?.('[data-morph]');
    if (!row) return;
    for (const el of root.querySelectorAll('.morph-src')) el.classList.remove('morph-src');
    row.querySelector('[data-morph-title]')?.classList.add('morph-src');
  });
  // 오래 다른 앱에 있다가 돌아오면 가족이 고친 내용을 다시 읽는다(시트를 열어 둔 동안은 두고).
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 60_000 && !document.querySelector('.backdrop') && api.getSession()) {
      route({ keepScroll: true });
    }
  });

  setInterval(watch, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) watch(); // 카톡에서 링크를 보내고 돌아왔을 때
  });

  api.loadSession();
  try {
    await api.finishLoginIfRedirected(); // 로그인에서 막 돌아왔다면 새 세션이 위의 것을 덮어쓴다
  } catch (e) {
    toast(errorText(e));
  }
  if (!location.hash) history.replaceState(history.state, '', '#/'); // 주소를 한 모양으로(같은 화면이 히스토리에 두 번 쌓이지 않게)
  await route();
}

boot();
