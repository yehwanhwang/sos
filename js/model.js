// 화면에 쓰는 말과 작은 규칙들: 소속 버튼, 확인한 날, 링크 주소, 보내는 글.

/** 한 사람의 비상연락처는 20명까지(서버의 private.lim('contacts') 와 같다) */
export const CONTACT_LIMIT = 20;

/** 서비스 이름. 카톡 메시지, 대화방 공지, 저장하는 연락처에 똑같이 쓴다(카톡 검색으로 찾게). */
export const NAME = '비상연락망';

/** '어디 분이세요?' 버튼. 이 밖의 말은 '직접 쓰기'로 적는다. */
export const TAGS = ['회사', '교회', '동네', '친구', '동창', '운동·취미', '친척'];

/** 이 페이지의 주소(링크·연락처 저장에 쓴다) */
export const siteUrl = () => `${location.origin}${location.pathname}`;

/** 링크 주소. 토큰은 # 뒤에 두어 서버 기록이나 Referer 에 남지 않게 한다. */
export const inviteUrl = (token) => `${siteUrl()}#j=${token}`;

/** 링크를 보낼 때 함께 가는 글. 서비스 이름과 '연락이 안 될 때'를 넣어 카톡 검색에 걸리게 한다. */
export const inviteText = (from) =>
  `[${NAME}] ${from}님이 보낸 링크예요. 연락이 안 될 때 서로 전화해 볼 사람들을 적어 두는 곳이에요. 눌러서 들어와 주세요.`;

/** 링크가 닫히는 날 "11월 22일" */
export function untilDay(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 확인한 날 → "2026년 추석에 확인", "11월 17일에 확인", "확인한 지 오래됐어요". checked = 서버의 checked_info */
export function checkedText(checked, now = new Date()) {
  if (!checked?.at) return '확인한 적이 없어요';
  if (checked.stale) return '확인한 지 오래됐어요';
  if (checked.season) return `${checked.season}에 확인`;
  const d = new Date(checked.at);
  const year = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}년 `;
  return `${year}${d.getMonth() + 1}월 ${d.getDate()}일에 확인`;
}

/** 확인 부탁 글(오래된 목록을 본 가족이 보낸다) */
export const askCheckText = (name) =>
  `[${NAME}] ${name}님, 연락이 안 될 때 전화할 분들이 그대로인지 한 번 봐 주세요. 링크를 누르면 바로 열려요.`;

/** 받아 주기를 기다리는 사람이 보내는 글 */
export const knockedText = (from) => `[${NAME}] ${from}님, 보내 준 링크를 눌렀어요. 받아 주세요.`;

/** "김영숙", "김영숙·이장인", "김영숙·이장인 외 2명" */
export function names(list, max = 2) {
  if (list.length <= max) return list.join('·');
  return `${list.slice(0, max).join('·')} 외 ${list.length - max}명`;
}

/** 저장할 연락처(vCard). 전화 앱에서 '비상연락망'을 찾으면 이 페이지 주소가 나온다. */
export function vcard(url) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${NAME};;;`,
    `FN:${NAME}`,
    'NOTE:가족이 전화를 안 받을 때 여세요',
    `URL:${url}`,
    'END:VCARD',
    '',
  ].join('\r\n');
}
