// 서버와의 통신. 라이브러리 없이 fetch만 쓴다.
//  - 서버: 구글 Apps Script 웹 앱 하나(config.js 의 API_URL). 본문은 JSON 글이고, 답도 { ok, data | error } JSON.
//    text/plain 으로 보내 브라우저의 사전 요청(preflight) 없이 닿고, 쿠키는 보내지 않는다.
//  - 로그인: 카카오 로그인 화면으로 보냈다가, 돌아온 code 를 서버에 넘겨 로그인 토큰을 받는다.
//    로그인 토큰은 이 기기에만 두고(서버에는 해시만), 요청 본문에 실어 보낸다.

const cfg = () => globalThis.FAMSOS_CONFIG || {};
const SESSION_KEY = 'famsos.session';
const STATE_KEY = 'famsos.login';
const KAKAO_AUTH = 'https://kauth.kakao.com/oauth/authorize';
// 읽기만 하는 요청은 인터넷이 잠깐 끊겼을 때 한 번 더 해 본다(급할 때 여는 화면이라)
const READS = new Set(['home', 'person_get', 'invite_peek', 'connections']);

export class ApiError extends Error {
  constructor(code, detail = '', status = 0) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const local = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 저장소를 못 쓰는 환경에서는 이번 방문 동안만 */
    }
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* 무시 */
    }
  },
};

let session = null;
const listeners = new Set();
/** 로그인이 사라졌을 때(로그아웃, 로그인 만료) 부를 함수를 등록한다. */
export const onSignedOut = (fn) => listeners.add(fn);

function store(s) {
  session = s;
  if (s) local.set(SESSION_KEY, JSON.stringify(s));
  else local.del(SESSION_KEY);
}

function readStored() {
  try {
    const s = JSON.parse(local.get(SESSION_KEY) || 'null');
    return typeof s?.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(s.token) ? s : null;
  } catch {
    return null;
  }
}

export function loadSession() {
  session = readStored();
  return session;
}

export const getSession = () => session;

function dropSession() {
  const had = !!session;
  store(null);
  if (had) for (const fn of listeners) fn();
}

// 다른 탭에서 로그아웃하면 이 탭도 로그아웃한다.
globalThis.addEventListener?.('storage', (e) => {
  if (e.key === SESSION_KEY && !e.newValue && session) {
    session = null;
    for (const fn of listeners) fn();
  }
});

/** 서버에 한 번 다녀온다. 실패하면 ApiError('코드') 를 던진다(코드 뒤의 :칸이름 은 detail 로). */
async function post(body) {
  let res;
  try {
    res = await fetch(cfg().API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow', // Apps Script 는 답을 다른 주소로 넘겨서 준다
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('network');
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 서버가 JSON 이 아닌 화면을 돌려줬다(할당량 초과 등) */
  }
  if (!res.ok || !json || typeof json.ok !== 'boolean') throw new ApiError(res.status === 429 ? 'too_many_requests' : 'server_error', '', res.status);
  if (!json.ok) {
    const [code, detail = ''] = String(json.error || 'server_error').split(':');
    throw new ApiError(code, detail, res.status);
  }
  return json.data;
}

// ── 로그인(카카오) ───────────────────────────────────────────────────────────────

/** 카카오가 돌려보낼 주소: 지금 주소에서 ?와 #, 끝의 index.html 을 뗀 것. 카카오 앱에 등록한 리다이렉트 URI와 같아야 한다. */
const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');

/** 카카오 로그인 화면으로 보낸다. 카카오톡 안에서는 카카오톡 계정으로 바로 넘어간다. */
export async function startLogin() {
  const state = b64u(crypto.getRandomValues(new Uint8Array(24)));
  local.set(STATE_KEY, state);
  const u = new URL(cfg().KAKAO_AUTH_URL || KAKAO_AUTH, location.href);
  u.searchParams.set('client_id', cfg().KAKAO_REST_KEY);
  u.searchParams.set('redirect_uri', redirectUri());
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('state', state);
  // replace: 로그인 전 화면을 히스토리에 남기지 않는다(로그인 뒤 폰의 뒤로 버튼이 곧장 카톡 대화방으로 돌아가게).
  location.replace(u.toString());
}

/**
 * 카카오에서 돌아온 주소(?code=…&state=…)면 로그인 토큰으로 바꾼다.
 * @returns 'signed_in' | 'none'. 실패하면 ApiError('login_failed' | 'login_cancelled').
 */
export async function finishLoginIfRedirected() {
  const url = new URL(location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  if (!code && !err) return 'none';
  for (const k of ['code', 'state', 'error', 'error_description']) url.searchParams.delete(k);
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  if (err) throw new ApiError(err === 'access_denied' ? 'login_cancelled' : 'login_failed', err);

  const saved = local.get(STATE_KEY);
  local.del(STATE_KEY);
  if (!saved || saved !== state) {
    // 로그인한 뒤 '뒤로'를 눌러 카카오 화면을 다시 거쳐 온 경우: 이미 들어와 있으니 조용히 넘어간다.
    if (session) return 'none';
    throw new ApiError('login_failed', 'state');
  }
  const data = await post({ fn: 'login', p: { code, redirect_uri: redirectUri() } });
  store({ token: data.token, expires_at: data.expires_at });
  return 'signed_in';
}

/** 이 기기에서 로그아웃한다(다른 기기는 그대로). */
export async function signOut() {
  if (session?.token) {
    try {
      await post({ fn: 'logout', token: session.token });
    } catch {
      /* 서버에 닿지 않아도 이 기기에서는 로그아웃한다 */
    }
  }
  dropSession();
}

// ── 서버 함수 ────────────────────────────────────────────────────────────────────

/**
 * 서버 함수를 부른다.
 * @param opts.anon 로그인 없이(초대 링크 미리 보기)
 */
export async function rpc(fn, payload = {}, opts = {}) {
  const body = { fn, p: payload };
  if (!opts.anon) {
    if (!session) throw new ApiError('not_authenticated');
    body.token = session.token;
  }
  try {
    try {
      return await post(body);
    } catch (e) {
      if (e.code !== 'network' || !READS.has(fn)) throw e;
      await new Promise((r) => setTimeout(r, 800));
      return await post(body);
    }
  } catch (e) {
    if (e.code === 'not_authenticated' && !opts.anon) dropSession();
    throw e;
  }
}

const filled = (v) => typeof v === 'string' && v.trim() !== '' && !/YOUR[_-]/.test(v);
export const configured = () => filled(cfg().API_URL) && filled(cfg().KAKAO_REST_KEY);
