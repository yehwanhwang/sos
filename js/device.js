// 폰마다 다른 것: 연락처 고르기(안드로이드 크롬만), 카카오톡 안 화면, 바깥 브라우저로 열기.
import { normalizePhone } from './phone.js';

/** 폰의 연락처 화면을 띄워 고를 수 있는가(Contact Picker API). 지금은 안드로이드 크롬에만 있다. */
export const canPickContacts = () =>
  typeof navigator !== 'undefined' && 'contacts' in navigator && typeof navigator.contacts?.select === 'function';

export const isKakaoInApp = () => /KAKAOTALK/i.test(navigator.userAgent);
export const isAndroid = () => /Android/i.test(navigator.userAgent);
export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** 카카오톡 안 화면에서 기본 브라우저(크롬, 사파리)로 지금 주소를 연다. */
export const openExternalHref = (url = location.href) => `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;

const mobileFirst = (a, b) => Number(!a.startsWith('01')) - Number(!b.startsWith('01'));

/**
 * 폰 연락처에서 여러 명을 고른다. 고른 사람의 이름과 번호만 넘어온다.
 * @returns [{ name, phones: ['01012345678', …] }]  번호가 없는 사람은 뺀다. 휴대전화 번호가 앞에 온다.
 */
export async function pickContacts() {
  const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
  return picked
    .map((c) => ({
      name: String(c.name?.[0] ?? '').trim().slice(0, 30),
      phones: [...new Set((c.tel || []).map(normalizePhone).filter(Boolean))].sort(mobileFirst),
    }))
    .filter((c) => c.phones.length);
}
