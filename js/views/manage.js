// 설정: 내 이름, 연결, 보낸 링크, 급할 때, 밝게 보기, 로그아웃과 지우기.
// 화면에는 줄만 두고, 내보내기·나가기 같은 일은 줄을 눌러 열리는 창 안에 둔다(잘못 누르지 않게).
import * as api from '../api.js';
import { h, fill, icon, avatar, sheet, confirm, run, toast, fmtDay } from '../ui.js';
import { inviteUrl, untilDay } from '../model.js';
import { backLink, row, addRow, linkSheet, nameSheet } from './forms.js';
import { theme } from '../theme-switch.js';

/** 확인을 받은 다음 서버 함수를 부르는 버튼 */
function actionButton(label, cls, ask, fn) {
  const btn = h('button', {
    class: cls, type: 'button',
    onclick: async () => {
      if (ask && !(await confirm(ask))) return;
      await run(btn, fn);
    },
  }, label);
  return btn;
}

const tile = (name) => h('span', { class: 'tile' }, icon(name));

/** "오늘", "어제", "11월 16일에" */
const madeOn = (iso) => {
  const day = fmtDay(iso);
  return day === '오늘' || day === '어제' ? day : `${day}에`;
};

export async function manageView(page, { refresh, go, up }) {
  const c = await api.rpc('connections');
  const me = c.me.name;
  const others = (x) => x.members.filter((m) => !m.me);

  const rename = () => nameSheet({
    title: '이름 바꾸기', label: '내 이름', value: me, hint: '연결된 가족 화면에 이 이름으로 보여요.',
    onSave: async (name, close) => {
      await api.rpc('me_update', { name });
      close();
      refresh();
    },
  });

  // ── 연결 ──
  const circleSheet = (x) => sheet(`${others(x).map((m) => m.name).join(', ')}`, (close) => {
    const rest = others(x);
    const more = h('button', {
      class: 'btn soft block', type: 'button',
      onclick: () => run(more, async () => {
        const inv = await api.rpc('invite_create', { circle_id: x.id });
        close();
        linkSheet({
          url: inviteUrl(inv.token), from: me, expiresAt: inv.expires_at,
          more: `누른 사람을 받아 주면 ${rest.map((m) => m.name).join(', ')}님과도 서로 봐요. 새 링크를 보내면 이 연결의 앞 링크는 닫혀요.`,
        });
        refresh();
      }),
    }, icon('link'), '이 연결에 더 초대하기');

    const removePeople = () => sheet('내보내기', (closeInner) => [
      h('p', { class: 'muted' }, '내보낸 사람은 이 연결 사람들의 목록을 더 이상 보지 못해요.'),
      h('ul', { class: 'list in-sheet' }, rest.map((m) => h('li', null,
        h('div', { class: 'row static' }, avatar(m.name), h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, m.name)),
          actionButton('내보내기', 'btn soft small',
            { title: `${m.name}님을 내보낼까요?`, body: `${m.name}님은 이 연결 사람들의 목록을 더 이상 보지 못해요.`, confirmLabel: '내보내기', danger: true },
            async () => {
              await api.rpc('circle_remove', { id: x.id, person_id: m.id });
              closeInner();
              close();
              toast(`${m.name}님을 내보냈어요`);
              refresh();
            }))))),
    ]);

    return [
      h('p', { class: 'muted' }, rest.length === 1
        ? `${rest[0].name}님과 나, 두 사람이 서로의 비상연락처를 봐요.`
        : '여기 있는 사람끼리 모두 서로의 비상연락처를 봐요.'),
      h('ul', { class: 'member-chips', 'aria-label': '이 연결에 있는 사람' },
        x.members.map((m) => h('li', { class: m.me ? 'me' : null }, m.me ? '나' : m.name))),
      h('p', { class: 'fine' }, x.owner ? '내가 받아 준 연결이에요.' : `${x.owner_name}님이 받아 준 연결이에요.`),
      x.owner
        ? h('div', { class: 'stack' },
          x.link ? h('p', { class: 'fine' }, `더 초대하는 링크가 ${untilDay(x.link.expires_at)}까지 열려 있어요.`) : null,
          more,
          h('div', { class: 'row-actions' },
            x.link
              ? actionButton('링크 닫기', 'btn soft small', null, async () => {
                await api.rpc('invite_revoke', { id: x.link.id });
                close();
                toast('링크를 닫았어요');
                refresh();
              })
              : null,
            rest.length > 1 ? h('button', { class: 'btn soft small', type: 'button', onclick: removePeople }, '내보내기') : null))
        : null,
      actionButton('이 연결에서 나가기', 'btn text danger-text block',
        {
          title: '이 연결에서 나갈까요?',
          body: rest.length === 1
            ? `나가면 ${rest[0].name}님과 서로의 목록이 안 보여요. 다시 보려면 새 링크가 필요해요.`
            : '나가면 이 연결 사람들과 서로의 목록이 안 보여요. 다른 연결로 이어진 사람은 그대로 보여요.',
          confirmLabel: '나가기', danger: true,
        },
        async () => {
          await api.rpc('circle_leave', { id: x.id });
          close();
          toast('연결에서 나왔어요');
          refresh();
        }),
    ];
  });

  // ── 아직 아무도 받아 주지 않은 링크 ──
  const linkRowSheet = (l) => sheet('보낸 링크', (close) => [
    h('p', { class: 'muted' }, `${madeOn(l.created_at)} 만든 링크예요. ${untilDay(l.expires_at)}까지 열려 있어요. 보낸 적이 없거나 잘못 보냈다면 거둬 주세요.`),
    actionButton('링크 거두기', 'btn block', null, async () => {
      await api.rpc('invite_revoke', { id: l.id });
      close();
      toast('링크를 거뒀어요. 이제 그 링크로는 들어올 수 없어요.');
      refresh();
    }),
  ]);

  // ── 밝게 보기(이 폰에만) ──
  const light = h('input', {
    type: 'checkbox', role: 'switch', id: 'light-mode', checked: theme.get() === 'light',
    onchange: () => theme.set(light.checked ? 'light' : 'dark'),
  });

  const logout = h('button', {
    class: 'btn text small', type: 'button',
    onclick: () => run(logout, async () => {
      await api.signOut();
      go('/', { replace: true });
    }),
  }, '로그아웃');

  const wipe = actionButton('내 정보 모두 지우기', 'btn text small danger-text',
    {
      title: '내 정보를 모두 지울까요?',
      body: '내 이름, 비상연락처, 연결, 기록이 모두 지워지고 되돌릴 수 없어요.',
      confirmLabel: '모두 지우기', danger: true,
    },
    async () => {
      await api.rpc('account_delete', { confirm: 'delete' });
      await api.signOut();
      toast('모두 지웠어요');
      go('/', { replace: true });
    });

  const section = (title, count, items, empty) => h('section', { class: 'section' },
    h('h2', { class: 'section-title' }, title, count ? h('span', { class: 'count' }, ` ${count}`) : null),
    h('div', { class: 'card' },
      h('ul', { class: 'list' }, items.length ? items.map((x) => h('li', null, x)) : h('li', { class: 'empty' }, h('p', null, empty)))));

  fill(page,
    backLink('우리 가족', '/', up),
    h('header', { class: 'top' }, h('h1', null, '설정')),
    section('내 이름', 0, [row({ onclick: rename, lead: avatar(me, 'me'), title: me, sub: '가족에게 보이는 이름', trail: '바꾸기' })]),
    section('연결', c.circles.length,
      c.circles.map((x) => {
        const rest = others(x);
        return row({
          onclick: () => circleSheet(x), lead: rest.length > 1 ? tile('group') : avatar(rest[0].name),
          title: rest.map((m) => m.name).join(', '),
          sub: rest.length > 1 ? `${rest.length + 1}명이 서로 봐요` : '둘이서 봐요',
        });
      }),
      '연결된 가족이 없어요.'),
    c.links.length
      ? section('보낸 링크', c.links.length,
        c.links.map((l) => row({
          onclick: () => linkRowSheet(l), lead: tile('link'), title: `${madeOn(l.created_at)} 만든 링크`,
          sub: l.waiting ? `${l.waiting}명이 받아 주길 기다려요` : `${untilDay(l.expires_at)}까지 열려 있어요`,
        })), '')
      : null,
    h('div', { class: 'card' }, h('ul', { class: 'list' }, h('li', null, addRow('가족 연결하기', '#/connect')))),
    section('급할 때', 0, [
      row({ href: '#/prepare', lead: tile('info'), title: '급할 때 바로 찾게', sub: '대화방 공지, 전화 앱에 저장, 한 번 열어 보기' }),
    ]),
    section('화면', 0, [
      h('label', { class: 'row switch-row', for: 'light-mode' },
        tile('eye'),
        h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, '밝게 보기'), h('span', { class: 'row-sub' }, '햇빛 아래에서 잘 안 보일 때. 이 폰에만 적용돼요.')),
        light),
    ]),
    h('div', { class: 'row-actions center' }, logout, wipe),
    h('p', { class: 'fine center' }, h('a', { class: 'link', href: 'privacy.html' }, '개인정보 처리방침')));
}
