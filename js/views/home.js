// 우리 가족: 나, 그리고 내가 볼 수 있는 가족. 가족이 카톡의 링크를 누르면 이 화면이 열린다.
// 맨 위에는 지금 할 일이 먼저 온다: 받아 줄 사람, 받아 주길 기다리는 링크, 명절 점검.
// 처음 쓰는 사람에게는 할 일 네 가지를 차례로 보여 준다(이름 → 내 비상연락처 → 가족 연결 → 급할 때 찾는 길).
import * as api from '../api.js';
import { h, fill, icon, avatar, sheet, run, toast, share, fmtDateTime } from '../ui.js';
import { checkedText, names, knockedText, siteUrl } from '../model.js';
import { row, addRow } from './forms.js';

export async function homeView(page, { home, from, refresh }) {
  const { me, people, requests, waiting, season } = home;
  // 방금 보고 돌아온 사람의 줄: 제목이 이 줄의 이름으로 돌아온다
  const cameFrom = /^\/p\/([0-9a-f-]{36})$/.exec(from || '')?.[1];
  const mark = (el, id) => {
    if (id === cameFrom) el.querySelector('[data-morph-title]')?.classList.add('morph-src');
    return el;
  };

  // ── 받아 줄 사람(내 링크를 누른 사람) ──
  const asking = requests.length
    ? h('section', { class: 'card asks', 'aria-label': '들어오려는 사람' },
      h('ul', { class: 'list' }, requests.map((r) => h('li', null, row({
        onclick: () => answerSheet(r, refresh), lead: avatar(r.name, 'ask'),
        title: `${r.name}님이 들어오려고 해요`, sub: `${fmtDateTime(r.at)} · 내 링크를 눌렀어요`, cls: 'ask-row',
      })))))
    : null;

  // ── 내가 누르고 기다리는 링크 ──
  const pending = waiting.filter((w) => w.status === 'pending');
  const waitingCard = waiting.length
    ? h('section', { class: 'card pad waits', 'aria-label': '받아 주길 기다리는 링크' },
      waiting.map((w) => (w.status === 'pending'
        ? h('div', { class: 'wait' },
          h('p', { class: 'wait-title' }, `${w.from}님이 받아 주면 열려요`),
          h('p', { class: 'muted' }, '링크를 눌렀다고 카톡으로 알려 주세요. 기다리는 동안 내 비상연락처를 넣어 두면 좋아요.'),
          tellButton(w))
        : h('div', { class: 'wait' },
          h('p', { class: 'wait-title' }, `${w.from}님이 받지 않았어요`),
          h('p', { class: 'muted' }, `잘못 누른 거라면 ${w.from}님께 새 링크를 받아 주세요.`)))))
    : null;

  // ── 명절 점검 ──
  const checkCard = season && !season.checked && me.count > 0
    ? h('a', { class: 'card season', href: '#/check' },
      h('span', { class: 'tile accent' }, icon('check')),
      h('span', { class: 'row-text' },
        h('span', { class: 'row-title' }, `${season.name}이에요. 비상연락망 점검할 때예요`),
        h('span', { class: 'row-sub' }, '내 비상연락처가 그대로인지 30초만 봐 주세요')),
      icon('chevron', 'chev'))
    : null;

  // ── 시작하기 ──
  const steps = [
    { done: true, label: '이름 정하기' },
    { done: me.count > 0, label: '내 비상연락처 넣기', hint: '연락이 안 될 때 가족이 전화해 볼 분 3~5명', href: '#/add' },
    {
      done: people.length > 0, label: '가족 연결하기', href: '#/connect',
      hint: pending.length ? `${names(pending.map((w) => w.from))}님이 받아 주길 기다리고 있어요` : '카톡으로 링크를 보내요',
    },
    { done: me.prepared, label: '급할 때 바로 찾게 해 두기', hint: '대화방 공지, 전화 앱에 저장', href: '#/prepare' },
  ];
  const left = steps.filter((s) => !s.done).length;
  const checklist = left
    ? h('section', { class: 'card checklist', 'aria-label': '시작하기' },
      h('div', { class: 'card-head' },
        h('h2', null, '시작하기'),
        h('span', { class: 'count' }, h('b', null, String(steps.length - left)), ` / ${steps.length}`)),
      h('ol', { class: 'list' }, steps.map((s) => {
        const body = [
          h('span', { class: 'tick' }, s.done ? icon('check') : null),
          h('span', { class: 'row-text' },
            h('span', { class: 'row-title' }, s.label, s.done ? h('span', { class: 'sr' }, ' (마침)') : null),
            !s.done && s.hint ? h('span', { class: 'row-sub' }, s.hint) : null),
          s.done ? null : icon('chevron', 'chev'),
        ];
        return h('li', null, s.done ? h('div', { class: 'row step done' }, body) : h('a', { class: 'row step', href: s.href }, body));
      })))
    : null;

  const meRow = mark(row({
    href: `#/p/${me.id}`, lead: avatar(me.name, 'me'), title: me.name, morph: true,
    // 좁은 폰에서는 '내 비상연락처 3명 ·' / '10월 18일에 확인' 두 덩어리로만 나뉜다
    sub: me.count
      ? h('span', null, h('span', { class: 'keep' }, `내 비상연락처 ${me.count}명 ·`), ' ', h('span', { class: 'keep' }, checkedText(me.checked)))
      : '내 비상연락처가 아직 비어 있어요',
  }), me.id);

  const family = h('ul', { class: 'list', 'aria-label': '연결된 가족' },
    people.map((p) => h('li', null, mark(row({
      href: `#/p/${p.id}`, lead: avatar(p.name), title: p.name, morph: true,
      sub: p.count ? h('span', { class: p.checked.stale ? 'stale' : null }, checkedText(p.checked)) : '아직 비어 있어요',
      trail: p.count ? `${p.count}명` : null,
    }), p.id))),
    people.length ? null : h('li', { class: 'empty' },
      h('p', { class: 'empty-title' }, '아직 연결된 가족이 없어요'),
      h('p', null, '가족에게 카톡으로 링크를 보내 연결하세요. 연결된 사람끼리만 서로의 목록을 봐요.')),
    h('li', null, addRow('가족 연결하기', '#/connect')));

  fill(page,
    h('header', { class: 'top row-top' },
      h('div', { class: 'grow' },
        h('h1', null, '우리 가족'),
        people.length ? h('p', { class: 'sub' }, '연락이 안 되는 가족을 누르세요') : null),
      h('a', { class: 'chip-btn', href: '#/manage' }, '설정')),
    asking,
    waitingCard,
    checkCard,
    checklist,
    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, '나'),
      h('div', { class: 'card' }, h('ul', { class: 'list' }, h('li', null, meRow)))),
    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, '가족', people.length ? h('span', { class: 'count' }, ` ${people.length}`) : null),
      h('div', { class: 'card' }, family)));
}

/** "카톡으로 알리기": 링크를 보낸 사람에게 눌렀다고 알린다 */
function tellButton(w) {
  const btn = h('button', {
    class: 'btn soft small', type: 'button',
    onclick: () => run(btn, async () => {
      const how = await share({ text: knockedText(w.from), url: siteUrl() });
      if (how === 'copied') toast('글을 복사했어요. 카톡 대화방에 붙여 넣어 주세요.');
    }),
  }, icon('chat'), '카톡으로 알리기');
  return btn;
}

/**
 * 받아 주기 창. 이 링크로 먼저 들어온 사람이 없으면 받기 / 안 받기 둘,
 * 있으면 함께 보기 / 나하고만 보기 / 안 받기 셋 가운데 고른다(어느 것도 미리 골라 두지 않는다).
 */
function answerSheet(r, refresh) {
  const answer = (btn, value, done) => run(btn, async () => {
    await api.rpc('request_answer', { id: r.id, answer: value });
    s.close();
    toast(done);
    refresh();
  });
  const s = sheet(`${r.name}님이 들어오려고 해요`, () => {
    if (!r.with.length) {
      const yes = h('button', { class: 'btn block', type: 'button', onclick: () => answer(yes, 'together', `${r.name}님을 받았어요`) }, '받기');
      const no = h('button', { class: 'btn soft block', type: 'button', onclick: () => answer(no, 'no', '받지 않았어요') }, '안 받기');
      return [
        h('p', { class: 'muted' }, `받으면 나와 ${r.name}님이 서로의 비상연락처를 봐요. 모르는 사람이면 받지 마세요.`),
        h('div', { class: 'stack' }, yes, no),
      ];
    }
    const choice = (value, title, sub, done) => {
      const b = row({ onclick: () => answer(b, value, done), title, sub, cls: 'choice' });
      return h('li', null, b);
    };
    return [
      h('p', { class: 'muted' }, `이 링크로 먼저 들어온 사람: ${r.with.join(', ')}`),
      h('ul', { class: 'list in-sheet choices' },
        choice('together', `${names(r.with)}님과 함께 보기`, `${r.name}님과 ${names(r.with)}님도 서로의 목록을 봐요`, `${r.name}님을 받았어요`),
        r.connected ? null : choice('alone', '나하고만 보기', `${r.name}님은 나만 봐요`, `${r.name}님을 받았어요`),
        choice('no', '안 받기', `${r.name}님은 아무것도 못 봐요`, '받지 않았어요')),
    ];
  });
  return s;
}
