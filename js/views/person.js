// 한 사람의 화면: 비상연락처와 노란 전화 버튼.
// 내 목록이면 줄을 눌러 고치고 빼고, 누가 봤는지 본다. 가족의 목록이면 보고 전화만 한다(고치는 것은 주인만).
// 목록 위에는 주인이 언제 확인했는지가 보이고, 오래됐으면 '확인 부탁하기'로 카톡을 보낼 수 있다.
import * as api from '../api.js';
import { h, fill, icon, avatar, sheet, confirm, run, toast, errorText, fmtDateTime, share } from '../ui.js';
import { formatPhone, normalizePhone, telHref } from '../phone.js';
import { CONTACT_LIMIT, checkedText, askCheckText, siteUrl } from '../model.js';
import { backLink, addRow, tagPicker, field } from './forms.js';

export async function personView(page, { id, up, refresh }) {
  const p = await api.rpc('person_get', { id });
  const n = p.contacts.length;

  const list = h('ul', { class: 'list', 'aria-label': `${p.name}님의 비상연락처` },
    p.contacts.map((c) => contactRow(c, p.is_me, refresh)),
    n ? null : h('li', { class: 'empty' },
      h('p', { class: 'empty-title' }, '아직 넣은 분이 없어요'),
      h('p', null, p.is_me
        ? '직장 동료, 교회 분, 친한 친구처럼 나와 자주 만나는 분을 3~5명 넣어 주세요.'
        : `${p.name}님에게 넣어 달라고 부탁해 주세요.`)),
    !p.is_me ? null
      : n >= CONTACT_LIMIT
        ? h('li', { class: 'list-note' }, `${CONTACT_LIMIT}명이 다 찼어요. 새로 넣으려면 먼저 한 분을 빼 주세요.`)
        : h('li', null, addRow('연락처 넣기', '#/add')));

  const checked = n ? h('p', { class: `checked ${p.checked.stale ? 'stale' : ''}`.trim() },
    icon(p.checked.stale ? 'info' : 'check'), h('span', null, checkedText(p.checked))) : null;

  fill(page,
    backLink('우리 가족', '/', up),
    h('header', { class: 'top person-top' },
      avatar(p.name, p.is_me ? 'lg me' : 'lg'),
      h('div', { class: 'grow' },
        h('div', { class: 'title-line' },
          h('h1', { class: 'morph-dst' }, p.name),
          p.is_me ? h('span', { class: 'me-tag' }, '나') : null),
        h('p', { class: 'sub' }, p.is_me
          ? '연락이 안 될 때 가족이 전화해 볼 분들이에요'
          : n ? '연락이 안 되면 이 분들께 전화해 보세요' : '아직 비상연락처가 없어요'))),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'section-title' }, p.is_me ? '내 비상연락처' : '비상연락처', n ? h('span', { class: 'count' }, ` ${n}`) : null),
        checked),
      h('div', { class: 'card' }, list),
      !p.is_me && n && p.checked.stale ? askButton(p) : null),
    p.is_me ? logSection(p.log) : null,
    p.is_me ? null : h('p', { class: 'note' }, icon('eye'), h('span', null, `내가 본 기록은 ${p.name}님에게 남아요.`)));
}

function contactLine(c) {
  return [c.tag ? h('span', { class: 'tag' }, c.tag) : null, h('span', { class: 'num' }, formatPhone(c.phone))];
}

function contactRow(c, mine, refresh) {
  return h('li', { class: 'contact' },
    h('button', { class: 'contact-main', type: 'button', onclick: () => contactSheet(c, mine, refresh) },
      h('span', { class: 'row-title' }, c.name),
      h('span', { class: 'row-sub' }, contactLine(c))),
    h('a', { class: 'call', href: telHref(c.phone), 'aria-label': `${c.name}님께 전화` }, icon('phone'), h('span', null, '전화')));
}

/** 오래된 목록: 주인에게 확인을 부탁하는 카톡 */
function askButton(p) {
  const btn = h('button', {
    class: 'btn soft block ask-check', type: 'button',
    onclick: () => run(btn, async () => {
      const how = await share({ text: askCheckText(p.name), url: siteUrl() });
      if (how === 'copied') toast('글을 복사했어요. 카톡 대화방에 붙여 넣어 주세요.');
    }),
  }, icon('chat'), `${p.name}님에게 확인 부탁하기`);
  return btn;
}

/** 한 분의 창: 전화하기. 내 목록이면 '고치기'를 누르면 같은 창이 입력 칸으로 바뀐다. */
function contactSheet(c, mine, refresh) {
  let editing = false;
  const s = sheet(c.name, (close, rerender) => {
    if (!editing) {
      return [
        h('p', { class: 'contact-line' }, contactLine(c)),
        h('a', { class: 'btn call-wide block', href: telHref(c.phone) }, icon('phone'), '전화하기'),
        mine
          ? h('button', {
            class: 'btn soft block', type: 'button',
            onclick: () => {
              editing = true;
              s.retitle('연락처 고치기');
              rerender();
              document.getElementById('edit-name')?.focus();
            },
          }, icon('pencil'), '고치기')
          : null,
      ];
    }

    const name = h('input', { class: 'input', id: 'edit-name', value: c.name, maxlength: 30, autocomplete: 'off' });
    const phone = h('input', { class: 'input', id: 'edit-phone', type: 'tel', inputmode: 'tel', value: formatPhone(c.phone), autocomplete: 'off' });
    const tags = tagPicker(c.tag);
    const err = h('p', { class: 'error', role: 'alert', hidden: true });
    const save = h('button', { class: 'btn block', type: 'submit' }, '저장');
    const remove = h('button', {
      class: 'btn text danger-text block', type: 'button',
      onclick: async () => {
        const ok = await confirm({ title: `${c.name}님을 뺄까요?`, body: '내 비상연락처에서 지워요.', confirmLabel: '빼기', danger: true });
        if (!ok) return;
        await run(remove, async () => {
          await api.rpc('contact_remove', { id: c.id });
          close();
          toast(`${c.name}님을 뺐어요`);
          refresh();
        });
      },
    }, '이 분 빼기');
    return [
      h('form', {
        class: 'stack', novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          err.hidden = true;
          const number = normalizePhone(phone.value);
          if (!number) {
            err.textContent = '전화번호를 확인해 주세요.';
            err.hidden = false;
            phone.focus();
            return;
          }
          run(save, async () => {
            try {
              await api.rpc('contact_update', { id: c.id, name: name.value, phone: number, tag: tags.value() });
            } catch (ex) {
              err.textContent = errorText(ex);
              err.hidden = false;
              return;
            }
            close();
            refresh();
          });
        },
      },
      field('이름', name),
      field('전화번호', phone),
      tags.el,
      err,
      save),
      remove,
    ];
  });
}

function logSection(log) {
  const SHOW = 6;
  const item = (e) => h('li', null, h('span', { class: 'what' }, `${e.actor || '나간 사람'}님이 봤어요`), h('span', { class: 'when' }, fmtDateTime(e.at)));
  const list = h('ol', { class: 'log' }, log.slice(0, SHOW).map(item));
  const more = log.length > SHOW
    ? h('button', {
      class: 'btn text small', type: 'button',
      onclick: () => {
        list.append(...log.slice(SHOW).map(item));
        more.remove();
      },
    }, `더 보기 (${log.length - SHOW})`)
    : null;
  return h('section', { class: 'section' },
    h('h2', { class: 'section-title' }, '누가 봤나요'),
    h('div', { class: 'card pad' },
      log.length ? list : h('p', { class: 'muted' }, '아직 본 가족이 없어요.'),
      more,
      h('p', { class: 'fine' }, '이 기록은 나에게만 보여요.')));
}
