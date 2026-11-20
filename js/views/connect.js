// 가족 연결하기: 링크는 한 가지다. 한 사람에게 보내면 둘이서, 단톡방에 올리면 받아 준 사람끼리 서로 본다.
// 누른 사람은 바로 들어오지 않고, 링크를 만든 내가 받아 줘야 들어온다.
import * as api from '../api.js';
import { h, fill, clear, icon, run, toast, errorText } from '../ui.js';
import { inviteUrl } from '../model.js';
import { backLink, linkSheet } from './forms.js';

export async function connectView(page, { home, up }) {
  let open = home.open_links || 0; // 지금 열려 있는 내 링크 수(이 화면에서 만든 것을 더한다)
  const status = h('p', { class: 'note', hidden: !open });
  const sync = () => {
    status.hidden = !open;
    clear(status, icon('link'), h('span', null, `보낸 링크 ${open}개가 열려 있어요. 가족이 누르면 우리 가족 화면 맨 위에 떠요.`));
  };
  sync();

  const make = h('button', {
    class: 'btn tall block', type: 'button',
    onclick: () => run(make, async () => {
      let inv;
      try {
        inv = await api.rpc('invite_create', {});
      } catch (e) {
        toast(errorText(e));
        return;
      }
      open += 1;
      sync();
      linkSheet({ url: inviteUrl(inv.token), from: home.me.name, expiresAt: inv.expires_at });
    }),
  }, icon('link'), '링크 보내기');

  fill(page,
    backLink('우리 가족', '/', up),
    h('header', { class: 'top' },
      h('h1', null, '가족 연결하기'),
      h('p', { class: 'sub' }, '카톡으로 링크를 보내요. 누른 사람을 내가 받아 주면 서로의 비상연락처를 봐요.')),
    make,
    status,
    h('div', { class: 'card pad examples' },
      h('h2', null, '누구에게 보내나요'),
      h('ul', { class: 'plain-list' },
        h('li', null, h('b', null, '서로 봐도 되는 가족'), '링크 하나를 단톡방에 올려요. 받아 준 사람끼리 서로 봐요.'),
        h('li', null, h('b', null, '서로 보면 안 되는 가족'), '한 사람마다 새 링크를 보내요. 예: 엄마에게 하나, 아빠에게 하나.'))),
    h('p', { class: 'fine' }, '링크는 7일 동안 열려 있어요. 다른 사람에게 넘어가도 내가 받아 주지 않으면 아무것도 볼 수 없어요.'));
}
