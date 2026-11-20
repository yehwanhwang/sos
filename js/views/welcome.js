// 처음 들어오는 화면들.
//  welcomeView  로그인 전. 링크로 왔으면 누가 보냈는지 보여 준다.
//  startView    카카오로 들어온 뒤 이름 정하기. 링크를 들고 왔으면 이름을 정하면서 바로 문을 두드린다.
//  joinView     이미 쓰던 사람이 남의 새 링크를 열었을 때 들어갈지 묻는다.
// 링크를 누르면 바로 들어오지 않는다. 링크를 만든 사람이 받아 줘야 연결된다(엄마가 링크를 외삼촌에게 넘겨도 합쳐지지 않게).
// 이미 연결된 사람이 대화방의 링크를 다시 누른 경우는 여기까지 오지 않고 곧장 가족 화면이 열린다(main.js).
import * as api from '../api.js';
import { h, fill, icon, run, toast, errorText } from '../ui.js';
import { NAME } from '../model.js';
import { field } from './forms.js';

export async function peekInvite(token) {
  try {
    return await api.rpc('invite_peek', { token }, { anon: !api.getSession() });
  } catch (e) {
    return { status: 'error', error: e };
  }
}

/** 열려 있는 링크: 누가 보냈는지, 누르면 어떻게 되는지 */
function inviteCard(peek) {
  return h('div', { class: 'invite-card' },
    h('p', { class: 'invite-title' }, `${peek.from}님이 보낸 링크예요`),
    h('p', null, `들어가면 ${peek.from}님에게 받아 달라고 물어봐요. 받아 주면 서로의 비상연락처를 봐요.`));
}

/**
 * 닫힌 링크. 아직 누구인지 모를 때(로그인 전, 이름 정하기 전)에는 겁주지 않는다:
 * 닫힌 링크를 누른 사람은 대개 전에 그 링크로 연결한 바로 그 사람이다.
 */
function closedCard(peek, { known = false } = {}) {
  if (peek.status === 'error') {
    return h('div', { class: 'invite-card closed' }, h('p', { class: 'invite-title' }, '링크를 확인하지 못했어요'), h('p', null, errorText(peek.error)));
  }
  const why = peek.status === 'expired' ? '7일이 지나 닫힌 링크예요.' : '보낸 분이 거둔 링크예요.';
  return h('div', { class: 'invite-card closed' },
    h('p', { class: 'invite-title' }, '닫힌 링크예요'),
    h('p', null, known
      ? `${why} 들어가려면 보낸 분께 새 링크를 받아 주세요.`
      : '전에 이 링크로 연결했다면 카카오로 들어가면 가족 목록이 바로 열려요. 처음이라면 보낸 분께 새 링크를 받아 주세요.'));
}

const usable = (peek) => peek?.status === 'open' && !peek.mine && !peek.already;

/** 문 두드리기. 결과에 맞는 알림을 띄운다. */
async function knock(token, peek) {
  const res = await api.rpc('invite_knock', { token });
  if (res.status === 'pending') toast(`${peek.from}님에게 물어봤어요. 받아 주면 열려요.`);
  else if (res.status === 'no') toast(`${peek.from}님이 받지 않은 링크예요.`);
  return res;
}

export async function welcomeView(page, { token, login }) {
  const peek = token ? await peekInvite(token) : null;
  const start = h('button', { class: 'btn kakao block', type: 'button', onclick: () => run(start, login) },
    icon('chat'), '카카오로 들어가기');
  fill(page,
    h('div', { class: 'welcome' },
      h('span', { class: 'mark' }, icon('mark')),
      h('h1', null, NAME),
      h('p', { class: 'lead' }, '연락이 안 될 때 가족이 전화해 볼 사람을 적어 두는 곳이에요.'),
      !peek
        ? h('ol', { class: 'steps' },
          h('li', null, '폰 연락처에서 3~5명을 골라 어디 분인지 적어요.'),
          h('li', null, '가족에게 카톡으로 링크를 보내 연결해요.'),
          h('li', null, '연락이 안 되면 가족이 그 분들께 바로 전화해요.'))
        : peek.status === 'open' ? inviteCard(peek) : closedCard(peek),
      h('div', { class: 'welcome-foot' },
        start,
        h('p', { class: 'fine' }, '처음 한 번만 카카오로 들어오면, 다음부터는 받은 링크만 눌러도 열려요.'),
        h('p', { class: 'fine' }, h('a', { class: 'link', href: 'privacy.html' }, '개인정보 처리방침')))));
}

export async function startView(page, { token, suggested, invite, go }) {
  const peek = token ? await peekInvite(token) : null;
  const canJoin = usable(peek);
  const name = h('input', {
    class: 'input big', id: 'my-name', name: 'name', value: suggested || '', maxlength: 20,
    autocomplete: 'name', required: true, autofocus: !suggested,
  });
  const err = h('p', { class: 'error', role: 'alert', hidden: true });
  const submit = h('button', { class: 'btn block', type: 'submit' }, '시작하기');
  const form = h('form', {
    class: 'stack', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      err.hidden = true;
      run(submit, async () => {
        try {
          await api.rpc('account_create', { name: name.value });
        } catch (ex) {
          err.textContent = errorText(ex);
          err.hidden = false;
          name.focus();
          return;
        }
        if (token) {
          invite.clear();
          if (canJoin) {
            try {
              await knock(token, peek);
            } catch (ex) {
              toast(errorText(ex));
            }
          }
        }
        go('/');
      });
    },
  },
  field('내 이름', name, '예: 김영숙. 나중에 바꿀 수 있어요.'),
  err,
  submit);

  fill(page,
    h('header', { class: 'top' },
      h('h1', null, '가족에게 보일 이름을 정해 주세요'),
      h('p', { class: 'sub' }, canJoin ? `이 이름으로 ${peek.from}님에게 받아 달라고 물어봐요.` : '연결된 가족 화면에 이 이름으로 보여요.')),
    !peek ? null : peek.status === 'open' ? inviteCard(peek) : closedCard(peek),
    h('div', { class: 'card pad' }, form));
}

export async function joinView(page, { token, peek, invite, go }) {
  const done = () => {
    invite.clear();
    go('/');
  };

  if (!usable(peek)) {
    // 연결되지 않은 사람이 닫힌 링크를 연 경우(내가 보낸 링크는 main.js 가 곧장 가족 화면으로 보낸다)
    fill(page,
      closedCard(peek, { known: true }),
      h('button', { class: 'btn block', type: 'button', onclick: done }, '확인'));
    return;
  }

  const yes = h('button', {
    class: 'btn block', type: 'button',
    onclick: () => run(yes, async () => {
      try {
        await knock(token, peek);
      } catch (e) {
        toast(errorText(e));
      }
      done();
    }),
  }, '들어가기');

  fill(page,
    h('header', { class: 'top' },
      h('h1', null, `${peek.from}님이 보낸 링크예요`)),
    inviteCard(peek),
    h('p', { class: 'note' }, icon('eye'), h('span', null, '서로 볼 수 있는 것은 비상연락처뿐이에요. 내 목록은 나만 고쳐요.')),
    h('div', { class: 'stack' },
      yes,
      h('button', { class: 'btn soft block', type: 'button', onclick: done }, '들어가지 않기')));
}
