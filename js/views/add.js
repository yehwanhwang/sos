// 연락처 넣기. 폰마다 방법이 다르다.
//  안드로이드 크롬   폰의 연락처 화면을 띄워 여러 명을 고른다(Contact Picker). 고른 사람만 넘어온다.
//  아이폰 사파리     이름 칸을 누르면 키보드 위의 '연락처 자동 완성'으로 한 명씩 채운다.
//  카카오톡 안 화면  고르기가 안 되므로 바깥 브라우저로 여는 버튼을 보여 준다.
//  어디서나          직접 적거나, 카톡으로 받은 "이름 010-…" 글을 이름 칸에 붙여 넣는다.
// 한 사람에 20명까지다. 남은 자리보다 많이 고르면 앞에서부터 남은 자리만큼만 가져온다.
// 이 화면은 person_get 을 부르지 않는다(보기 기록을 남기지 않으려고). 이름과 지금 수는 첫 화면 정보에서 찾는다.
import * as api from '../api.js';
import { h, fill, clear, icon, run, flash, toast, errorText } from '../ui.js';
import { normalizePhone, formatPhone, extractContact } from '../phone.js';
import { canPickContacts, pickContacts, isKakaoInApp, isIOS, openExternalHref } from '../device.js';
import { CONTACT_LIMIT } from '../model.js';
import { backLink, tagPicker, field } from './forms.js';

export async function addView(page, { home, up }) {
  const target = home.me;
  const id = target.id;
  const canPick = canPickContacts();
  const added = [];
  let room = CONTACT_LIMIT - target.count; // 더 넣을 수 있는 수
  const done = () => up(`/p/${id}`);

  const head = [
    backLink('내 비상연락처', `/p/${id}`, up),
    h('header', { class: 'top' },
      h('h1', null, '연락처 넣기'),
      h('p', { class: 'sub' }, '연락이 안 될 때 가족이 전화해 볼 분을 넣어요')),
  ];
  const fullCard = () => h('div', { class: 'card pad' },
    h('p', { class: 'empty-title' }, `${CONTACT_LIMIT}명이 다 찼어요`),
    h('p', { class: 'muted' }, '새로 넣으려면 목록에서 먼저 한 분을 빼 주세요.'));

  if (room <= 0) {
    fill(page, head, fullCard(), h('button', { class: 'btn block', type: 'button', onclick: done }, '목록으로'));
    return;
  }

  // ── 폰 연락처에서 고르기 ──
  const picked = h('section', { class: 'section picked', hidden: true });
  const pickBtn = h('button', {
    class: 'btn block tall', type: 'button',
    onclick: () => run(pickBtn, async () => {
      let list;
      try {
        list = await pickContacts();
      } catch {
        toast(errorText({ code: 'picker_failed' }));
        return;
      }
      if (list.length) showPicked(list);
    }),
  }, icon('contacts'), h('span', { class: 'pick-label' }, '폰 연락처에서 고르기'));
  // 고른 뒤에는 아래의 'N명 넣기'가 할 일이다. 이 버튼은 한 걸음 물러나 '다시 고르기'가 된다.
  const setPicked = (on) => {
    pickBtn.classList.toggle('soft', on);
    pickBtn.classList.toggle('tall', !on);
    pickBtn.querySelector('.pick-label').textContent = on ? '다시 고르기' : '폰 연락처에서 고르기';
  };

  function showPicked(all) {
    const cut = all.length - room;
    const list = all.slice(0, room);
    const rows = list.map((c, i) => {
      const nameIn = h('input', { class: 'input', id: `pick-name-${i}`, value: c.name, maxlength: 30, autocomplete: 'off', 'aria-label': '이름' });
      const phoneSel = c.phones.length > 1
        ? h('select', { class: 'select', 'aria-label': `${c.name || '이 분'}의 번호` }, c.phones.map((p) => h('option', { value: p }, formatPhone(p))))
        : null;
      const tags = tagPicker('');
      const li = h('li', { class: 'pick-card' },
        h('div', { class: 'pick-head' },
          nameIn,
          h('button', {
            class: 'x', type: 'button', 'aria-label': `${c.name || '이 분'} 빼기`,
            onclick: () => {
              li.remove();
              rows.splice(rows.indexOf(entry), 1);
              sync();
            },
          }, icon('x'))),
        phoneSel || h('p', { class: 'num' }, formatPhone(c.phones[0])),
        tags.el);
      const entry = { li, value: () => ({ name: nameIn.value, phone: phoneSel ? phoneSel.value : c.phones[0], tag: tags.value() }) };
      return entry;
    });
    const save = h('button', {
      class: 'btn block', type: 'button',
      onclick: () => run(save, async () => {
        const blank = rows.find((r) => !r.value().name.trim());
        if (blank) {
          toast('이름이 빈 분이 있어요. 이름을 넣어 주세요.');
          blank.li.querySelector('input').focus();
          return;
        }
        try {
          const res = await api.rpc('contacts_add', { items: rows.map((r) => r.value()) });
          toast(!res.added ? '고른 분은 모두 이미 넣었어요' : res.skipped ? `${res.added}명을 넣었어요. ${res.skipped}명은 이미 있어요.` : `${res.added}명을 넣었어요`);
          done();
        } catch (e) {
          toast(errorText(e));
        }
      }),
    });
    const bar = h('div', { class: 'savebar' }, save);
    const sync = () => {
      save.textContent = `${rows.length}명 넣기`;
      save.disabled = !rows.length;
      const count = picked.querySelector('.section-title .count');
      if (count) count.textContent = ` ${rows.length}`;
      if (!rows.length) {
        picked.hidden = true;
        manual.hidden = false;
        setPicked(false);
      }
    };
    sync();
    manual.hidden = true; // 고른 분을 넣는 동안에는 한 가지 일만 보이게 한다
    picked.hidden = false;
    setPicked(true);
    clear(picked,
      h('h2', { class: 'section-title' }, '고른 분', h('span', { class: 'count' }, ` ${rows.length}`)),
      cut > 0 ? h('p', { class: 'note' }, icon('info'), h('span', null, `한 사람에 ${CONTACT_LIMIT}명까지라서 앞의 ${rows.length}명만 가져왔어요.`)) : null,
      h('p', { class: 'muted' }, '어디 분인지 하나씩 눌러 주세요. 모르면 비워 둬도 돼요.'),
      h('ul', { class: 'pick-cards' }, rows.map((r) => r.li)),
      bar);
    picked.querySelector('h2').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── 직접 적기(아이폰 자동 완성, 붙여 넣기) ──
  const name = h('input', { class: 'input', id: 'add-name', name: 'name', autocomplete: 'name', maxlength: 30, autofocus: !canPick && !isKakaoInApp() });
  const phone = h('input', { class: 'input', id: 'add-phone', name: 'tel', type: 'tel', inputmode: 'tel', autocomplete: 'tel' });
  // 카톡으로 받은 "홍길동 010-1234-5678" 을 이름 칸에 붙여 넣으면 둘로 나눈다
  name.addEventListener('paste', (e) => {
    const got = extractContact(e.clipboardData?.getData('text') || '');
    if (!got.phone) return;
    e.preventDefault();
    name.value = got.name;
    phone.value = formatPhone(got.phone);
  });
  let tags = tagPicker('');
  const tagSlot = h('div', null, tags.el);
  const err = h('p', { class: 'error', role: 'alert', hidden: true });
  const addBtn = h('button', { class: canPick ? 'btn soft block' : 'btn block', type: 'submit' }, '넣기');
  const addedList = h('p', { class: 'added', hidden: true });
  const doneBtn = h('button', { class: 'btn soft block', type: 'button', onclick: done }, '다 됐어요');

  const form = h('form', {
    class: 'stack', novalidate: true, autocomplete: 'on',
    onsubmit: (e) => {
      e.preventDefault();
      err.hidden = true;
      const fail = (msg, el) => {
        err.textContent = msg;
        err.hidden = false;
        el.focus();
      };
      if (!name.value.trim()) return fail('이름을 넣어 주세요.', name);
      const number = normalizePhone(phone.value);
      if (!number) return fail('전화번호를 확인해 주세요. 예: 010-1234-5678', phone);
      run(addBtn, async () => {
        let res;
        try {
          res = await api.rpc('contacts_add', { items: [{ name: name.value, phone: number, tag: tags.value() }] });
        } catch (ex) {
          return fail(errorText(ex), name);
        }
        if (res.skipped) return fail('이미 넣은 번호예요.', phone);
        added.push(name.value.trim());
        room -= 1;
        flash(addBtn, '넣었어요'); // 알림 대신 누른 자리에서 알려 준다. 누가 들어갔는지는 아래 '방금 넣은 분'에 남는다
        addedList.hidden = false;
        addedList.replaceChildren(h('b', null, '방금 넣은 분 '), added.join(', '));
        if (room <= 0) {
          // 20명이 찼다: 더 넣을 칸을 치운다
          manual.replaceChildren(fullCard(), addedList, doneBtn);
          pickSection?.remove();
          return;
        }
        name.value = '';
        phone.value = '';
        tags = tagPicker('');
        tagSlot.replaceChildren(tags.el);
        name.focus();
      });
    },
  },
  isIOS() && !canPick
    ? h('p', { class: 'hint-box' }, '아이폰은 이름 칸을 누르고 키보드 위의 ', h('b', null, '연락처 자동 완성'), '을 누른 다음 ', h('b', null, '다른 연락처'), '에서 고르면 이름과 번호가 채워져요.')
    : null,
  field('이름', name, "카톡으로 받은 '이름 010-…' 글을 여기에 붙여 넣어도 돼요."),
  field('전화번호', phone),
  tagSlot,
  err,
  addBtn);

  const manual = h('section', { class: 'section' },
    canPick ? h('h2', { class: 'section-title' }, '한 명씩 적기') : null,
    h('div', { class: 'card pad' }, form),
    addedList,
    doneBtn);

  const pickSection = canPick
    ? h('section', { class: 'section' },
      pickBtn,
      h('p', { class: 'fine' }, '고른 분의 이름과 번호만 넘어와요. 폰 연락처 전체를 가져가지 않아요.'))
    : null;

  fill(page,
    head,
    pickSection,
    isKakaoInApp() && !canPick
      ? h('div', { class: 'card pad stack' },
        h('p', null, isIOS()
          ? '카카오톡 안에서는 연락처 자동 완성이 안 될 수 있어요. 사파리에서 열면 연락처에서 골라 넣을 수 있어요.'
          : '카카오톡 안에서는 폰 연락처를 고를 수 없어요. 크롬에서 열면 여러 명을 한 번에 골라 넣을 수 있어요.'),
        h('a', { class: 'btn soft block', href: openExternalHref() }, icon('external'), isIOS() ? '사파리에서 열기' : '크롬에서 열기'),
        h('p', { class: 'fine' }, '카카오로 한 번 더 들어가야 할 수 있어요.'))
      : null,
    picked,
    manual);
}
