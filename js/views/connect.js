// 가족 연결하기: 링크는 한 가지다. 한 사람에게 보내면 둘이서, 단톡방에 올리면 받아 준 사람끼리 서로 본다.
// 누른 사람은 바로 들어오지 않고, 링크를 만든 내가 받아 줘야 들어온다.
import * as api from '../api.js';
import { h, fill, icon, run, toast, errorText } from '../ui.js';
import { inviteUrl } from '../model.js';
import { backLink, linkSheet } from './forms.js';

export async function connectView(page, { home, up }) {
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
      linkSheet({ url: inviteUrl(inv.token), from: home.me.name, expiresAt: inv.expires_at });
    }),
  }, icon('link'), '링크 보내기');

  fill(page,
    backLink('우리 가족', '/', up),
    h('header', { class: 'top' },
      h('h1', null, '가족 연결하기'),
      h('p', { class: 'sub' }, '같이 봐도 되는 사람들에게는 링크 하나, 따로 봐야 하는 사람에게는 새 링크를 보내요.')),
    h('div', { class: 'card pad' },
      h('ol', { class: 'steps plain' },
        h('li', null, '카톡으로 링크를 보내요. 한 사람에게 보내도, 단톡방에 올려도 돼요.'),
        h('li', null, '받은 사람이 누르면 나에게 받아 달라고 물어봐요.'),
        h('li', null, '내가 받아 주면 서로의 비상연락처를 봐요.')),
      make),
    h('div', { class: 'card pad examples' },
      h('h2', null, '이렇게 보내요'),
      h('ul', { class: 'plain-list' },
        h('li', null, h('b', null, '엄마와 아빠가 서로 보면 안 될 때'), ' 엄마에게 하나, 아빠에게 새 링크 하나를 보내요.'),
        h('li', null, h('b', null, '처가 식구가 서로 다 볼 때'), ' 처가 단톡방에 링크 하나를 올려요.'))),
    h('p', { class: 'fine' }, '링크는 7일 동안 열려 있어요. 링크가 다른 사람에게 넘어가도 내가 받아 주지 않으면 아무것도 볼 수 없어요.'));
}
