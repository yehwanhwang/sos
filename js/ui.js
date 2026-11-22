// 화면을 만드는 작은 도구들: 요소 만들기, 아이콘, 얼굴(이름 두 글자), 시트, 알림, 공유, 조사, 시간 표기, 오류 문구.
// 프레임워크 없이 DOM을 직접 만든다. CSP 때문에 style 속성은 쓰지 않는다.

/** h('button', { class: 'btn', onclick: fn }, '저장') */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected') el[k] = !!v;
    else if (k === 'autofocus') el.dataset.autofocus = '1'; // 화면을 그린 쪽에서 직접 초점을 준다(브라우저의 자동 초점은 첫 화면에만 통한다)
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** el 끝에 붙인다. null·false 는 건너뛴다(DOM의 append 는 null 을 "null" 글자로 붙인다). */
export function fill(el, ...children) {
  append(el, children);
  return el;
}

export function clear(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

// ── 아이콘(24×24, 선) ────────────────────────────────────────────────────────────

const ICONS = {
  phone: 'M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  copy: 'M9 9h9.5A1.5 1.5 0 0 1 20 10.5V19a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 19V9.5M15.5 6V5A1.5 1.5 0 0 0 14 3.5H5.5A1.5 1.5 0 0 0 4 5v8.5A1.5 1.5 0 0 0 5.5 15H6',
  contacts: 'M6 4.5h11A1.5 1.5 0 0 1 18.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6zM6 4.5v15M3.5 8H6M3.5 12H6M3.5 16H6M12.2 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 16c.3-1.8 1.5-2.8 3.2-2.8s2.9 1 3.2 2.8',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  group: 'M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5M5 12a2.2 2.2 0 1 0 0-4.4M2.5 17.5c0-2 1.2-3.4 3-3.8M19 12a2.2 2.2 0 1 0 0-4.4M21.5 17.5c0-2-1.2-3.4-3-3.8',
  person: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20c0-3.6 3.1-6 7-6s7 2.4 7 6',
  info: 'M12 11v5.5M12 7.5h0M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
  chat: 'M12 4.5c4.7 0 8.5 3 8.5 6.8s-3.8 6.8-8.5 6.8c-.7 0-1.4-.1-2.1-.2L6 20.5l.7-3.6c-1.9-1.3-3.2-3.3-3.2-5.6C3.5 7.5 7.3 4.5 12 4.5z',
  external: 'M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5A1.5 1.5 0 0 1 15.5 20h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10',
  pencil: 'M4 20h4L19.5 8.5l-4-4L4 16v4zM13.5 6.5l4 4',
  // 서비스 표식: 가운데 한 사람과 이어진 세 사람
  mark: 'M12 9.9V7.2M14.2 13.6l2.5 1.5M9.8 13.6l-2.5 1.5M14.5 12.4a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM13.9 5.3a1.9 1.9 0 1 1-3.8 0 1.9 1.9 0 0 1 3.8 0zM20.2 16.1a1.9 1.9 0 1 1-3.8 0 1.9 1.9 0 0 1 3.8 0zM7.6 16.1a1.9 1.9 0 1 1-3.8 0 1.9 1.9 0 0 1 3.8 0z',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name, cls = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `icon ${cls}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name] || ICONS.info);
  svg.append(path);
  return svg;
}

/**
 * 동그라미에 넣을 글자. 가족은 성이 같으므로 성이 아니라 이름을 쓴다: '황예환' → '예환', '황철수' → '철수'.
 * 한글 두 글자 이름('이솔')은 그대로, 한글이 아니면 앞의 두 글자('Mom' → 'Mo').
 */
export function initials(name) {
  const word = [...(String(name || '').trim().split(/\s+/)[0] || '')];
  if (!word.length) return '?';
  const hangul = word.every((ch) => /[가-힣]/.test(ch));
  return (hangul && word.length > 2 ? word.slice(-2) : word.slice(0, 2)).join('');
}

/** 이름 두 글자를 넣은 동그라미. 사람 줄을 한눈에 구분하게 한다. */
export function avatar(name, cls = '') {
  return h('span', { class: `avatar ${cls}`.trim(), 'aria-hidden': 'true' }, initials(name));
}

/** 줄이 바뀌어도 되는 자리를 정한다. 덩어리 안에서는 끊기지 않는다: phrases('링크를 보냈어요.', '가족이 누르면 여기에 떠요') */
export const phrases = (...parts) => parts.flatMap((part, i) => [i ? ' ' : null, h('span', { class: 'keep' }, part)]);

// ── 알림(화면 아래쪽에 잠깐) ──────────────────────────────────────────────────────
// 위쪽에 두면 '‹ 뒤로'와 화면 제목을 가린다. 그래서 아래쪽에 두되, 아래에 붙은 버튼 줄(고른 분 넣기)이 있으면 그 위로,
// 창이 열려 있으면 창을 가리지 않게 화면 위쪽(가려진 화면 쪽)에 띄운다. 알림은 누르는 것을 막지 않는다.
// 알림 자리는 처음부터 만들어 둔다(화면 읽기 프로그램은 미리 있던 자리에 들어온 글만 읽어 준다).

const toastHost = typeof document?.createElement === 'function' && document.body
  ? h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' })
  : null; // 화면이 없는 곳(미리 보기 규칙 테스트)에서는 만들지 않는다
if (toastHost) document.body.append(toastHost);
let toastTimer = 0;

/** 알림 자리를 정한다: 창이 열려 있으면 위, 아니면 아래(아래에 붙은 버튼 줄이 보이면 그 위) */
function placeToasts() {
  if (!toastHost) return;
  toastHost.classList.toggle('over-sheet', openSheets.length > 0);
  let lift = 0;
  for (const bar of document.querySelectorAll('.savebar')) {
    const r = bar.getBoundingClientRect();
    if (r.height && r.top < innerHeight && r.bottom > innerHeight - 4) lift = Math.max(lift, innerHeight - r.top);
  }
  toastHost.style.setProperty('--toast-lift', `${Math.round(lift)}px`);
}

export function toast(message, ms = 3200) {
  if (!toastHost) return;
  clearTimeout(toastTimer);
  placeToasts();
  const el = h('div', { class: 'toast' }, message);
  toastHost.replaceChildren(el);
  toastTimer = setTimeout(() => el.remove(), ms);
}

// ── 시트(아래에서 올라오는 창) ────────────────────────────────────────────────────
//
// 시트를 열면 브라우저 히스토리에 항목을 하나 넣는다. 그래서 폰의 뒤로 버튼(안드로이드)이나
// 뒤로 쓸기(아이폰)는 화면을 떠나지 않고 시트만 닫는다.

const openSheets = [];
let unpopped = 0; // 닫았지만 아직 히스토리에서 빼지 않은 시트 항목 수

/** 시트를 닫고 곧바로 다른 화면으로 갈 때, 남은 히스토리 항목을 그 화면이 이어 쓴다. */
export function takeSheetEntry() {
  if (unpopped === 0 || !history.state?.famsosSheet) return false;
  unpopped -= 1;
  return true;
}

globalThis.addEventListener?.('popstate', (e) => {
  const depth = e.state?.famsosSheet || 0; // 뒤로 간 자리에 열려 있어야 할 시트 수
  while (openSheets.length > depth) openSheets.at(-1).close(undefined, { popped: true });
});

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let sheetSeq = 0;

/**
 * @param build (close, rerender) => Node[]   시트 내용을 만든다
 * @returns { close, closed: Promise<any>, rerender, retitle }
 */
export function sheet(title, build, { dismissable = true } = {}) {
  let resolve;
  const closed = new Promise((r) => (resolve = r));
  const prevFocus = document.activeElement;

  const close = (value, { popped = false } = {}) => {
    if (!openSheets.includes(entry)) return;
    openSheets.splice(openSheets.indexOf(entry), 1);
    placeToasts();
    document.removeEventListener('keydown', onKey);
    // 닫히는 동안에는 화면 읽기 프로그램과 테스트에 보이지 않게 한다.
    panel.removeAttribute('role');
    backdrop.inert = true;
    if (reducedMotion()) backdrop.remove();
    else {
      backdrop.classList.add('closing');
      setTimeout(() => backdrop.remove(), 200);
    }
    if (!popped) {
      unpopped += 1;
      setTimeout(() => {
        if (unpopped === 0) return; // 다음 시트나 다음 화면이 이 항목을 이어 썼다
        unpopped -= 1;
        if (history.state?.famsosSheet) history.back();
      }, 0);
    }
    if (prevFocus instanceof HTMLElement && prevFocus.isConnected) prevFocus.focus({ preventScroll: true });
    resolve(value);
  };

  const onKey = (e) => {
    if (openSheets.at(-1) !== entry) return;
    if (e.key === 'Escape' && dismissable) close();
    if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0];
      const last = f.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const heading = h('h2', { id: `sheet-${++sheetSeq}` }, title);
  const body = h('div', { class: 'sheet-body' });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': heading.id },
    h('div', { class: 'sheet-head' }, heading,
      dismissable ? h('button', { class: 'x', type: 'button', 'aria-label': '닫기', onclick: () => close() }, icon('x')) : null),
    body);
  const backdrop = h('div', { class: 'backdrop', onclick: (e) => e.target === backdrop && dismissable && close() }, panel);
  const entry = { close };
  openSheets.push(entry);
  placeToasts();
  if (unpopped > 0 && history.state?.famsosSheet) unpopped -= 1; // 방금 닫은 시트의 히스토리 항목을 이어 쓴다
  else history.pushState({ ...(history.state || {}), famsosSheet: openSheets.length }, '');
  document.body.append(backdrop);
  document.addEventListener('keydown', onKey);

  const render = () => clear(body, build(close, render));
  render();
  const auto = panel.querySelector('[data-autofocus]') || panel.querySelector('.sheet-body button, .sheet-body a') || panel.querySelector('button');
  auto?.focus({ preventScroll: true });
  return { close, closed, rerender: render, retitle: (t) => (heading.textContent = t) };
}

export const closeAllSheets = () => [...openSheets].reverse().forEach((x) => x.close());

/** 확인 창. 확인하면 true. */
export function confirm({ title, body, confirmLabel = '확인', cancelLabel = '취소', danger = false }) {
  return sheet(title, (close) => [
    typeof body === 'string' ? h('p', { class: 'muted' }, body) : body,
    h('div', { class: 'actions' },
      h('button', { class: 'btn soft', type: 'button', onclick: () => close(false) }, cancelLabel),
      h('button', { class: `btn ${danger ? 'danger' : ''}`.trim(), type: 'button', onclick: () => close(true) }, confirmLabel)),
  ]).closed.then((v) => v === true);
}

/** 버튼을 누른 동안 중복 실행을 막고, 실패하면 오류 문구를 알림으로 보여 준다. */
export async function run(button, fn, { quiet = false } = {}) {
  if (button?.getAttribute('aria-busy') === 'true') return;
  button?.setAttribute('aria-busy', 'true');
  if (button) button.disabled = true;
  try {
    return await fn();
  } catch (e) {
    if (!quiet && e?.message !== 'cancelled') toast(errorText(e));
    if (quiet) throw e;
  } finally {
    if (button) {
      button.removeAttribute('aria-busy');
      button.disabled = false;
    }
  }
}

/**
 * 버튼을 잠깐 "✓ 됐어요"로 바꿨다가 되돌린다("링크 복사하기" → "복사했어요").
 * 알림을 띄우지 않고 누른 자리에서 알려 준다. 바뀐 동안에도 버튼은 눌린다.
 */
export function flash(button, label, ms = 1600) {
  clearTimeout(button.flashTimer);
  button.flashBefore ??= [...button.childNodes];
  button.dataset.flash = '1';
  button.replaceChildren(icon('check'), label);
  button.flashTimer = setTimeout(() => {
    delete button.dataset.flash;
    button.replaceChildren(...button.flashBefore);
    button.flashBefore = null;
  }, ms);
}

// ── 공유 ─────────────────────────────────────────────────────────────────────────

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { class: 'sr', readonly: true });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/** 기기에 공유 창이 있는가(카카오톡 안 화면에는 보통 없다) */
export const canShare = () => typeof navigator.share === 'function';

/** 기기의 공유 창을 연다. 없으면 복사한다. 'shared' | 'cancelled' | 'copied' | 'failed' */
export async function share({ text, url }) {
  const full = url ? `${text}\n${url}` : text;
  if (canShare()) {
    try {
      await navigator.share({ text: full });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyText(full)) ? 'copied' : 'failed';
}

// ── 조사 ─────────────────────────────────────────────────────────────────────────

/**
 * 받침에 맞는 조사를 붙인다. josa('영숙', '과/와') → '영숙과', josa('할머니', '을/를') → '할머니를'
 * 한글이 아닌 글자로 끝나면 받침이 없는 것으로 본다.
 */
export function josa(word, pair) {
  const [withFinal, without] = pair.split('/');
  const text = String(word).trim();
  const code = text.charCodeAt(text.length - 1);
  const jong = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
  const plain = jong === 0 || (withFinal === '으로' && jong === 8); // '로'는 ㄹ 받침 뒤에도 쓴다
  return text + (plain ? without : withFinal);
}

// ── 시간 ─────────────────────────────────────────────────────────────────────────

const pad2 = (n) => String(n).padStart(2, '0');

export function fmtDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${d.getFullYear() === today.getFullYear() ? '' : d.getFullYear() + '년 '}${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export const fmtClock = (iso) => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const fmtDateTime = (iso) => `${fmtDay(iso)} ${fmtClock(iso)}`;

// ── 오류 문구 ────────────────────────────────────────────────────────────────────

const MESSAGES = {
  network: '인터넷에 연결되지 않았어요. 연결을 확인하고 다시 해 주세요.',
  not_authenticated: '로그인이 풀렸어요. 카카오로 다시 들어와 주세요.',
  login_failed: '카카오로 들어오지 못했어요. 다시 해 주세요.',
  login_cancelled: '카카오 로그인을 마치지 않았어요. 들어오려면 다시 눌러 주세요.',
  not_configured: '서버 설정이 아직 덜 됐어요. 만든 사람에게 알려 주세요.',
  busy: '지금 사람이 많아요. 잠시 뒤 다시 해 주세요.',
  no_account: '이름을 아직 정하지 않았어요. 처음 화면으로 돌아가 주세요.',
  not_found: '찾을 수 없어요. 연결이 끊겼거나 이미 지워졌을 수 있어요.',
  name_required: '이름을 넣어 주세요.',
  name_too_long: '이름이 너무 길어요. 조금 줄여 주세요.',
  bad_phone: '전화번호를 확인해 주세요.',
  duplicate_phone: '이미 넣은 번호예요.',
  too_many_contacts: '한 사람에 20명까지 넣을 수 있어요.',
  too_many_people: '연결할 수 있는 사람 수(50명)를 넘었어요.',
  too_many_circles: '한 사람이 들어갈 수 있는 연결(30개)을 넘었어요.',
  too_many_links: '열어 둔 링크가 너무 많아요. 설정에서 안 쓴 링크를 거둬 주세요.',
  too_many_knocks: '이 링크를 누르고 기다리는 사람이 너무 많아요. 보낸 분께 새 링크를 받아 주세요.',
  circle_full: '이 연결은 20명이 다 찼어요.',
  not_owner: '연결을 만든 사람만 할 수 있어요.',
  use_leave: "나는 '이 연결에서 나가기'로 나와 주세요.",
  request_gone: '이미 답했거나 7일이 지난 요청이에요.',
  invite_gone: '닫힌 링크예요. 보낸 분이 거뒀어요.',
  invite_expired: '7일이 지나 닫힌 링크예요. 보낸 분께 새 링크를 받아 주세요.',
  own_invite: '내가 보낸 링크예요. 가족에게 보내 주세요.',
  picker_failed: '폰 연락처를 열지 못했어요. 아래 칸에 직접 적어 주세요.',
  server_error: '서버에서 처리하지 못했어요. 잠시 뒤 다시 해 주세요.',
  too_many_requests: '요청이 너무 잦아요. 잠시 뒤 다시 해 주세요.',
  bad_request: '보낸 값이 올바르지 않아요.',
};

export function errorText(e) {
  const code = e?.code || e?.message || '';
  return MESSAGES[code] || MESSAGES.server_error;
}
