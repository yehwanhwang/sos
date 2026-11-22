// 우리 가족: 가족이 카톡의 링크를 누르면 이 화면이 열린다. 급할 때 여는 화면이라 가족 목록이 가장 위에 온다.
//
//   연결된 가족이 있을 때   받아 줄 사람 → 명절 점검 → 가족 → 기다리는 링크 → 내 비상연락처 → 남은 준비
//   아직 없을 때(처음)      받아 줄 사람 → 기다리는 링크 → 시작하기(다음 할 일 하나에만 버튼) → 내 비상연락처
//
// 준비는 세 가지다(내 비상연락처 → 가족 연결 → 급할 때 찾는 길). 끝낸 것은 다시 보여 주지 않고,
// 같은 일을 두 군데에 두지 않는다(비어 있는 '나'와 '가족'은 준비 카드가 대신한다).
import * as api from '../api.js';
import { h, fill, icon, avatar, phrases, sheet, run, toast, share, fmtDateTime } from '../ui.js';
import { checkedText, names, knockedText, siteUrl } from '../model.js';
import { row, addRow } from './forms.js';

export async function homeView(page, { home, from, refresh }) {
  const { me, people, requests, waiting, season } = home;
  const openLinks = home.open_links || 0;
  const connected = people.length > 0;
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
        title: phrases(`${r.name}님이`, '들어오려고 해요'), sub: `${fmtDateTime(r.at)} · 내 링크를 눌렀어요`, cls: 'ask-row',
      })))))
    : null;

  // ── 내가 누르고 기다리는 링크 ──
  const pending = waiting.filter((w) => w.status === 'pending');
  const waitingCard = waiting.length
    ? h('section', { class: 'card pad waits', 'aria-label': '받아 주길 기다리는 링크' },
      waiting.map((w) => (w.status === 'pending'
        ? h('div', { class: 'wait' },
          h('p', { class: 'wait-title' }, `${w.from}님이 받아 주면 열려요`),
          h('p', { class: 'muted' }, '링크를 눌렀다고 알려 주면 빨라요.'),
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
        h('span', { class: 'row-title' }, phrases(`${season.name}이에요.`, '비상연락망 점검할 때예요')),
        h('span', { class: 'row-sub' }, phrases('내 비상연락처가 그대로인지', '30초만 봐 주세요'))),
      icon('chevron', 'chev'))
    : null;

  // ── 준비: 남은 것만 ──
  // wait: 내가 할 일은 끝났고 가족을 기다리는 중(링크를 보냈거나, 받은 링크를 눌렀다). 다음 할 일로 치지 않는다.
  // label·hint 는 줄로 보일 때, ask·why·action 은 다음 할 일(버튼이 있는 칸)로 보일 때 쓴다.
  const steps = [
    {
      done: me.count > 0, href: '#/add', label: '내 비상연락처 넣기', hint: '가족이 전화해 볼 분 3~5명',
      ask: '내 비상연락처를 넣어 주세요', why: '연락이 안 될 때 가족이 전화해 볼 분 3~5명이에요.', action: '연락처 넣기',
    },
    {
      done: connected, href: '#/connect', label: '가족 연결하기', hint: '카톡으로 링크를 보내요',
      ask: '가족을 연결해 주세요', why: '카톡으로 링크를 보내고, 누른 가족을 받아 주면 서로의 비상연락처를 봐요.', action: '가족 연결하기',
      // 누가 기다리는지는 위의 카드가 이름으로 말한다. 여기서는 지금 어디까지 왔는지만.
      wait: requests.length ? '위에서 받아 주면 연결돼요'
        : pending.length ? '받아 주길 기다리고 있어요'
          : openLinks ? phrases('링크를 보냈어요.', '가족이 누르면 여기에 떠요') : '',
    },
    {
      done: me.prepared, href: '#/prepare', label: '급할 때 바로 찾게 해 두기', hint: '대화방 공지, 전화 앱에 저장',
      ask: '급할 때 바로 찾게 해 두세요', why: '카톡 대화방 공지와 전화 앱에 이 페이지로 오는 길을 만들어요.', action: '해 두기',
    },
  ];
  const todo = steps.filter((s) => !s.done);
  // 다음 할 일 하나에만 노란 버튼을 준다. 가족이 있으면 가족 목록이, 받아 줄 사람이 있으면 그 카드가 먼저라서 준비는 줄로만 둔다.
  const now = connected || requests.length ? null : todo.find((s) => !s.wait);
  // 가족이 없는 동안에는 차례가 있는 일이라 번호를 붙인다. 가족이 생긴 뒤의 '남은 준비'는 차례가 없으니 번호 없이, 한 단계 낮춰 그린다.
  const no = (s) => (connected ? null : h('span', { class: 'tick' }, String(steps.indexOf(s) + 1)));
  const setup = todo.length
    ? h('section', { class: `card checklist ${connected ? 'quiet' : ''}`.trim(), 'aria-label': connected ? '남은 준비' : '시작하기' },
      h('div', { class: 'card-head' },
        h('h2', null, connected ? '남은 준비' : '시작하기'),
        connected ? null : h('span', { class: 'count' }, h('b', null, String(steps.length - todo.length)), ` / ${steps.length}`)),
      h('ol', { class: 'list' }, todo.map((s) => h('li', null, s === now
        ? h('div', { class: 'step-now' },
          h('p', { class: 'row-title step-ask' }, no(s), h('span', null, s.ask)),
          h('p', { class: 'row-sub' }, s.why),
          h('a', { class: 'btn block', href: s.href }, s.action))
        : h('a', { class: `row step ${s.wait ? 'waiting' : ''}`.trim(), href: s.href },
          no(s),
          h('span', { class: 'row-text' },
            h('span', { class: 'row-title' }, s.label),
            h('span', { class: 'row-sub' }, s.wait || s.hint)),
          icon('chevron', 'chev'))))))
    : null;

  // ── 가족 ──
  const family = connected
    ? h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, '가족', h('span', { class: 'count' }, ` ${people.length}`)),
      h('div', { class: 'card' },
        h('ul', { class: 'list', 'aria-label': '연결된 가족' },
          people.map((p) => h('li', null, mark(row({
            href: `#/p/${p.id}`, lead: avatar(p.name), title: p.name, morph: true, cls: 'person',
            sub: p.count ? h('span', { class: p.checked.stale ? 'stale' : null }, checkedText(p.checked)) : '아직 비어 있어요',
            trail: p.count ? `${p.count}명` : null,
          }), p.id))),
          h('li', null, addRow('가족 연결하기', '#/connect', openLinks ? `보낸 링크 ${openLinks}개가 열려 있어요` : '')))))
    : null;

  // ── 내 비상연락처(비어 있으면 준비 카드의 '내 비상연락처 넣기'가 대신한다). 가족 줄과 같은 짜임이고, 한 단계 낮춰 그린다 ──
  const mine = me.count
    ? h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, '내 비상연락처'),
      h('div', { class: 'card quiet' }, h('ul', { class: 'list' }, h('li', null, mark(row({
        href: `#/p/${me.id}`, lead: avatar(me.name, 'me'), title: me.name, morph: true,
        sub: checkedText(me.checked), trail: `${me.count}명`,
      }), me.id)))))
    : null;

  fill(page,
    h('header', { class: 'top row-top' },
      h('div', { class: 'grow' },
        h('h1', null, '우리 가족'),
        connected ? h('p', { class: 'sub' }, '연락이 안 되는 가족을 누르세요') : null),
      h('a', { class: 'chip-btn', href: '#/manage' }, '설정')),
    asking,
    connected ? [checkCard, family, waitingCard, mine, setup] : [waitingCard, checkCard, setup, mine]);
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
