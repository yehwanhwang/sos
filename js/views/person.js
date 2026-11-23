// 한 사람의 화면: 비상연락처.
//  가족의 목록  줄 어디를 눌러도 전화 앱이 그 번호로 열린다(급할 때 누를 곳이 크게). 고치는 것은 주인만 한다.
//  내 목록      줄을 누르면 바로 고치는 창이 열린다. 노란 전화 버튼은 없다(내 폰에 있는 번호들이다). 누가 봤는지도 본다.
// 목록 위에는 주인이 언제 확인했는지가 보이고, 오래됐거나 비어 있으면 카톡으로 부탁할 수 있다.
import * as api from '../api.js';
import { h, fill, icon, avatar, phrases, sheet, confirm, run, toast, errorText, fmtDateTime, share } from '../ui.js';
import { formatPhone, normalizePhone, telHref } from '../phone.js';
import { CONTACT_LIMIT, checkedText, askCheckText, askAddText, siteUrl } from '../model.js';
import { backLink, addRow, tagPicker, field, fieldError, clearFieldErrors, phoneError, phoneInput } from './forms.js';

export async function personView(page, { id, up, refresh }) {
  const p = await api.rpc('person_get', { id });
  const n = p.contacts.length;

  const list = h('ul', { class: 'list', 'aria-label': `${p.name}님의 비상연락처` },
    p.contacts.map((c) => contactRow(c, p.is_me, refresh)),
    // 가족의 빈 목록은 제목 아래에 이미 '아직 비상연락처가 없어요'가 있다. 같은 말을 한 번 더 하지 않는다.
    n ? null : h('li', { class: 'empty' },
      p.is_me ? h('p', { class: 'empty-title' }, '아직 넣은 분이 없어요') : null,
      h('p', null, p.is_me
        ? '직장 동료, 교회 분, 친한 친구처럼 나와 자주 만나는 분을 3~5명 넣어 주세요.'
        : `${p.name}님이 비상연락처를 넣으면 여기에 보여요.`)),
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
          ? phrases('연락이 안 될 때', '가족이 전화해 볼 분들이에요')
          : n ? phrases('연락이 안 되면', '이 분들께 전화해 보세요') : '아직 비상연락처가 없어요'))),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'section-title' }, p.is_me ? '내 비상연락처' : '비상연락처', n ? h('span', { class: 'count' }, ` ${n}`) : null),
        checked),
      h('div', { class: 'card' }, list),
      // 폰 연락처에서 고른 분은 이름과 번호만 들어온다. 어디 분인지는 여기서 줄을 눌러 적는다.
      p.is_me ? (p.contacts.some((c) => !c.tag) ? h('p', { class: 'fine tag-hint' }, '줄을 누르면 어디 분인지(회사, 교회 등) 적을 수 있어요.') : null)
        // 부탁 글의 링크는 그 일을 하는 화면으로 바로 간다(넣기, 점검). 받은 사람이 어디를 눌러야 할지 찾지 않게.
        : !n ? askButton(`${p.name}님에게 넣어 달라고 부탁하기`, askAddText(p.name), '#/add')
          : p.checked.stale ? askButton(`${p.name}님에게 확인 부탁하기`, askCheckText(p.name), '#/check') : null),
    p.is_me ? logSection(p.log) : null,
    p.is_me ? null : h('p', { class: 'note' }, icon('eye'), h('span', null, `내가 본 기록은 ${p.name}님에게 남아요.`)));
}

function contactLine(c) {
  return [c.tag ? h('span', { class: 'tag' }, c.tag) : null, h('span', { class: 'num' }, formatPhone(c.phone))];
}

function contactRow(c, mine, refresh) {
  const text = h('span', { class: 'row-text' },
    h('span', { class: 'row-title' }, c.name),
    h('span', { class: 'row-sub' }, contactLine(c)));
  return h('li', { class: 'contact' }, mine
    // 읽는 이름에 소속과 번호까지 넣는다(화면 읽기 프로그램으로도 번호를 듣게)
    ? h('button', { class: 'contact-main', type: 'button', 'aria-label': `${c.name} 고치기, ${c.tag ? `${c.tag}, ` : ''}${formatPhone(c.phone)}`, onclick: () => editSheet(c, refresh) },
      text, h('span', { class: 'edit-mark' }, icon('pencil'), '고치기'))
    // 줄 전체가 전화 링크다. 누르면 전화 앱이 이 번호로 열린다(바로 걸리지는 않는다).
    : h('a', { class: 'contact-main', href: telHref(c.phone), 'aria-label': `${c.name}님께 전화, ${c.tag ? `${c.tag}, ` : ''}${formatPhone(c.phone)}` },
      text, h('span', { class: 'call' }, icon('phone'), h('span', { class: 'label' }, '전화'))));
}

/** 오래됐거나 비어 있는 목록: 주인에게 카톡으로 부탁한다. where: 링크를 누르면 열릴 화면 */
function askButton(label, text, where) {
  const btn = h('button', {
    class: 'btn soft block ask-check', type: 'button',
    onclick: () => run(btn, async () => {
      const how = await share({ text, url: `${siteUrl()}${where}` });
      if (how === 'copied') toast('글을 복사했어요. 카톡 대화방에 붙여 넣어 주세요.');
    }),
  }, icon('chat'), label);
  return btn;
}

/** 내 연락처 한 분을 고치는 창 */
function editSheet(c, refresh) {
  return sheet('연락처 고치기', (close) => {
    const name = h('input', { class: 'input', id: 'edit-name', value: c.name, maxlength: 30, autocomplete: 'off' });
    const phone = phoneInput({ id: 'edit-phone', value: formatPhone(c.phone), autocomplete: 'off' });
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
          clearFieldErrors(e.currentTarget);
          const number = normalizePhone(phone.value);
          if (!number) {
            fieldError(phone, phoneError()); // 그 칸 바로 아래에
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
