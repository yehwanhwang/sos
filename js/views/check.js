// 점검: "이 분들 그대로인가요?" 설과 추석 알림의 버튼, 첫 화면의 점검 카드가 여기로 온다.
// '그대로예요'를 누르면 확인한 날이 찍히고 가족에게 "2027년 설에 확인"처럼 보인다.
import * as api from '../api.js';
import { h, fill, icon, run, toast } from '../ui.js';
import { formatPhone } from '../phone.js';
import { checkedText } from '../model.js';
import { backLink, addRow } from './forms.js';

export async function checkView(page, { home, up, go }) {
  const p = await api.rpc('person_get', { id: home.me.id });
  const n = p.contacts.length;

  const same = h('button', {
    class: 'btn tall block', type: 'button',
    onclick: () => run(same, async () => {
      const res = await api.rpc('check_done');
      toast(`확인했어요. 가족에게 '${checkedText(res.checked)}'으로 보여요.`);
      up('/');
    }),
  }, icon('check'), '그대로예요');
  const change = h('button', { class: 'btn soft block', type: 'button', onclick: () => go(`/p/${p.id}`) }, icon('pencil'), '고칠게요');

  fill(page,
    backLink('우리 가족', '/', up),
    h('header', { class: 'top' },
      h('h1', null, n ? '이 분들 그대로인가요?' : '내 비상연락처가 비어 있어요'),
      h('p', { class: 'sub' }, n
        ? '연락이 안 될 때 가족이 전화할 분들이에요. 번호가 바뀌었거나 요즘 덜 만나는 분이 있는지 봐 주세요.'
        : '연락이 안 될 때 가족이 전화해 볼 분을 3~5명 넣어 주세요.')),
    n
      ? h('div', { class: 'card' },
        h('ul', { class: 'list', 'aria-label': '내 비상연락처' }, p.contacts.map((c) => h('li', null,
          h('div', { class: 'row static' },
            h('span', { class: 'row-text' },
              h('span', { class: 'row-title' }, c.name),
              h('span', { class: 'row-sub' }, c.tag ? h('span', { class: 'tag' }, c.tag) : null, h('span', { class: 'num' }, formatPhone(c.phone)))))))))
      : null,
    n ? h('div', { class: 'stack' }, same, change) : null,
    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, '요즘 자주 연락하는 분이 생겼나요?'),
      h('div', { class: 'card' }, h('ul', { class: 'list' }, h('li', null, addRow('연락처 넣기', '#/add'))))),
    n ? h('p', { class: 'fine' }, `지난 확인: ${checkedText(p.checked)}`) : null);
}
