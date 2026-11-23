// 여러 화면에서 쓰는 조각: 뒤로 링크, 목록의 한 줄, 입력 칸, 소속 고르기, 이름 받는 창, 링크 보내는 창.
import { h, icon, sheet, run, toast, errorText, share, canShare, copyText, flash } from '../ui.js';
import { TAGS, untilDay, inviteText } from '../model.js';
import { formatTyping } from '../phone.js';

let seq = 0;

/** 화면 위의 '‹ 우리 가족'. 히스토리를 쌓지 않고 위 화면으로 돌아간다. */
export function backLink(label, parent, up) {
  return h('a', {
    class: 'back', href: `#${parent}`,
    onclick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // 새 탭으로 열기는 그대로 둔다
      e.preventDefault();
      up(parent);
    },
  }, icon('back'), label);
}

/**
 * 목록의 한 줄. href 가 있으면 링크, onclick 이 있으면 버튼.
 * morph: 누르면 이 줄의 제목이 다음 화면의 제목으로 옮겨 간다(main.js).
 */
export function row({ href, onclick, lead = null, title, sub = '', trail = null, chevron = true, morph = false, cls = '' }) {
  const body = [
    lead,
    h('span', { class: 'row-text' },
      h('span', { class: 'row-title', 'data-morph-title': morph ? '' : null }, title),
      sub ? h('span', { class: 'row-sub' }, sub) : null),
    trail ? h('span', { class: 'row-trail' }, trail) : null,
    chevron ? icon('chevron', 'chev') : null,
  ];
  const cl = `row ${cls}`.trim();
  return href
    ? h('a', { class: cl, href, 'data-morph': morph ? '' : null }, body)
    : h('button', { class: cl, type: 'button', onclick }, body);
}

/** 목록 끝의 '＋ 무엇 하기' 줄. sub: 지금 상태 한 줄(예: 보낸 링크가 열려 있어요) */
export const addRow = (label, href, sub = '') => h('a', { class: 'row add', href },
  h('span', { class: 'add-mark' }, icon('plus')),
  h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, label), sub ? h('span', { class: 'row-sub' }, sub) : null));

/**
 * 이름표가 붙은 입력 칸. 도움말은 이름표와 따로 두고 aria-describedby 로 잇는다
 * (이름표 안에 넣으면 화면 읽기 프로그램이 도움말까지 칸 이름으로 읽는다).
 * 칸 바로 아래에 그 칸의 오류 자리가 있다(fieldError).
 */
export function field(label, input, hint = '') {
  if (!input.id) input.id = `f-${++seq}`;
  const help = hint ? h('p', { class: 'hint', id: `${input.id}-hint` }, hint) : null;
  const err = h('p', { class: 'error', id: `${input.id}-err`, role: 'alert', hidden: true });
  if (help) input.setAttribute('aria-describedby', help.id);
  return h('div', { class: 'field' }, h('label', { for: input.id }, label), input, err, help);
}

/** 전화번호 오류 문구. 예로 든 번호는 가운데서 줄을 바꾸지 않는다. */
/**
 * 전화번호 칸: 숫자만 눌러도 하이픈이 따라 들어간다.
 * 끝에서 적을 때만 고친다(가운데를 고치는 동안에는 커서가 튀지 않게 두고, 칸을 떠날 때 맞춘다).
 */
export function phoneInput(attrs) {
  const input = h('input', { class: 'input', type: 'tel', inputmode: 'tel', ...attrs });
  const tidy = () => {
    const next = formatTyping(input.value);
    if (next !== input.value) input.value = next;
  };
  input.addEventListener('input', () => {
    if (input.selectionStart === input.value.length) tidy();
  });
  input.addEventListener('change', tidy);
  return input;
}

export const phoneError = () => ['전화번호를 확인해 주세요. ', h('span', { class: 'nowrap' }, '예: 010-1234-5678')];

/** 그 칸 바로 아래에 오류를 보여 주고 칸으로 초점을 옮긴다. 칸에 aria-invalid 를 달고 오류 문구와 잇는다. */
export function fieldError(input, message) {
  const err = input.closest('.field')?.querySelector(':scope > .error');
  if (!err) return false;
  err.replaceChildren(...[message].flat());
  err.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && x !== err.id);
  input.setAttribute('aria-describedby', [err.id, ...ids].join(' '));
  input.focus();
  return true;
}

/** form 안의 칸 오류를 모두 지운다 */
export function clearFieldErrors(form) {
  for (const err of form.querySelectorAll('.field > .error')) {
    err.hidden = true;
    err.textContent = '';
  }
  for (const input of form.querySelectorAll('[aria-invalid]')) {
    input.removeAttribute('aria-invalid');
    const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && x !== `${input.id}-err`);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
  }
}

/**
 * '어디 분이세요?' 고르기. 버튼 모양의 라디오 + '직접 쓰기' 칸. 고른 것을 한 번 더 누르면 풀린다.
 * @returns { el, value() }
 */
export function tagPicker(current = '', { legend = '어디 분이세요?' } = {}) {
  const group = `tag-${++seq}`;
  const custom = !!current && !TAGS.includes(current);
  const other = h('input', {
    class: 'input', type: 'text', maxlength: 20, value: custom ? current : '',
    placeholder: '예: 아파트 반장, 경로당', 'aria-label': '소속 직접 쓰기', hidden: !custom,
  });
  let was = null; // 지금 골라져 있는 칸
  const sync = () => {
    const picked = el.querySelector('input[type=radio]:checked')?.value;
    other.hidden = picked !== '*';
    if (picked === '*') other.focus();
  };
  const radio = (label, value, checked) => {
    const input = h('input', {
      type: 'radio', name: group, value, checked,
      onclick: () => {
        if (was === input) {
          input.checked = false; // 한 번 더 누르면 푼다
          was = null;
        } else was = input;
        sync();
      },
    });
    if (checked) was = input;
    return h('label', { class: 'chip' }, input, h('span', null, label));
  };
  const el = h('fieldset', { class: 'tags' },
    h('legend', null, legend),
    h('div', { class: 'chips' },
      TAGS.map((t) => radio(t, t, current === t)),
      radio('직접 쓰기', '*', custom)),
    other);
  return {
    el,
    value() {
      const picked = el.querySelector('input[type=radio]:checked')?.value || '';
      return picked === '*' ? other.value.trim() : picked;
    },
  };
}

/** 이름 하나를 받는 창(이름 바꾸기) */
export function nameSheet({ title, label, value = '', placeholder = '', hint = '', submitLabel = '저장', maxlength = 20, onSave }) {
  return sheet(title, (close) => {
    const input = h('input', { class: 'input big', id: `name-${++seq}`, value, placeholder, maxlength, autocomplete: 'off', autofocus: true });
    const err = h('p', { class: 'error', role: 'alert', hidden: true });
    const btn = h('button', { class: 'btn block', type: 'submit' }, submitLabel);
    return [
      h('form', {
        class: 'stack', novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          err.hidden = true;
          run(btn, async () => {
            try {
              await onSave(input.value, close);
            } catch (ex) {
              err.textContent = errorText(ex);
              err.hidden = false;
            }
          });
        },
      },
      field(label, input, hint),
      err,
      btn),
    ];
  });
}

/**
 * 만든 링크를 보내는 창.
 * 공유 창이 있는 폰에서는 '카톡으로 보내기'(보낼 앱에서 카카오톡을 고른다),
 * 없는 곳(카카오톡 안 화면 등)에서는 안내 글과 링크를 함께 복사한다.
 * 보내는 글에는 서비스 이름과 '연락이 안 될 때'가 들어 있어 나중에 카톡 검색으로 찾을 수 있다.
 */
export function linkSheet({ url, from, expiresAt, more = '' }) {
  const text = inviteText(from);
  return sheet('링크가 준비됐어요', () => {
    const sharing = canShare();
    const send = h('button', {
      class: 'btn block', type: 'button',
      onclick: () => run(send, async () => {
        const how = await share({ text, url });
        if (how === 'copied') toast('링크를 복사했어요. 카톡 대화방에 붙여 넣어 주세요.');
        else if (how === 'failed') toast('보내지 못했어요. 아래 링크를 길게 눌러 복사해 주세요.');
      }),
    }, icon('chat'), '카톡으로 보내기');
    const copy = h('button', {
      class: sharing ? 'btn soft block' : 'btn block', type: 'button',
      onclick: async () => {
        if (await copyText(sharing ? url : `${text}\n${url}`)) flash(copy, '복사했어요');
        else toast('복사하지 못했어요. 아래 링크를 길게 눌러 복사해 주세요.');
      },
    }, icon('copy'), sharing ? '링크만 복사' : '링크 복사하기');
    return [
      h('p', { class: 'muted' }, more || '한 사람에게 보내도 되고, 단톡방에 올려도 돼요. 누른 사람은 내가 받아 줘야 들어와요.'),
      h('div', { class: 'stack' }, sharing ? send : null, copy),
      h('p', { class: 'linkbox', 'aria-label': '링크' }, url),
      h('p', { class: 'fine' }, `보낸 다음 대화방에서 이 메시지를 길게 눌러 '공지'로 올려 두면 급할 때 바로 찾을 수 있어요. 링크는 ${untilDay(expiresAt)}까지 열려 있어요.`),
    ];
  });
}
