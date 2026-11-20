// 급할 때 바로 찾게: 가족이 전화를 안 받으면 사람은 카톡 대화방과 전화 앱을 먼저 연다.
// 그 두 곳에 들어가는 길을 미리 만들고(대화방 공지, 연락처 저장), 한 번 열어 본다.
import * as api from '../api.js';
import { h, fill, icon, run, toast } from '../ui.js';
import { isKakaoInApp } from '../device.js';
import { NAME, siteUrl, vcard } from '../model.js';
import { backLink } from './forms.js';

/** 이 페이지 주소를 '비상연락망'이라는 연락처로 저장한다(vCard 파일을 연다) */
function saveContact() {
  const blob = new Blob([vcard(siteUrl())], { type: 'text/vcard' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `${NAME}.vcf`, hidden: true });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export async function prepareView(page, { up }) {
  const item = (title, body, ...more) => h('section', { class: 'card pad prep' },
    h('h2', null, title),
    h('p', { class: 'muted' }, body),
    ...more);

  const save = h('button', {
    class: 'btn soft block', type: 'button',
    onclick: () => {
      saveContact();
      toast(`연락처 '${NAME}'을 저장해 주세요`);
    },
  }, icon('contacts'), `연락처에 '${NAME}' 저장`);

  const done = h('button', {
    class: 'btn tall block', type: 'button',
    onclick: () => run(done, async () => {
      await api.rpc('me_update', { prepared: true });
      toast('준비됐어요');
      up('/');
    }),
  }, '다 했어요');

  fill(page,
    backLink('우리 가족', '/', up),
    h('header', { class: 'top' },
      h('h1', null, '급할 때 바로 찾게'),
      h('p', { class: 'sub' }, '가족이 전화를 안 받으면 카톡 대화방과 전화 앱부터 열게 돼요. 그 두 곳에 길을 만들어 두세요.')),
    item('카톡 대화방 공지로 올리기',
      "가족에게 보낸 링크 메시지를 길게 눌러 '공지'로 올려요. 대화방 맨 위에 늘 보여요."),
    item('전화 앱에 저장하기',
      `'${NAME}'이라는 연락처로 이 페이지를 저장해요. 전화 앱에서 '비상'만 찾아도 나와요.`,
      save,
      isKakaoInApp() ? h('p', { class: 'fine' }, '카카오톡 안에서는 저장이 안 될 수 있어요. 크롬이나 사파리에서 열어 주세요.') : null),
    h('p', { class: 'fine' }, `공지가 없어도 카톡에서 '${NAME}'을 검색하면 링크가 나와요. 한 번 눌러서 열어 보면 급할 때 손이 먼저 가요.`),
    done);
}
