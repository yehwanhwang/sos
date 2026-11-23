// 폰마다 다른 것: 연락처 고르기(안드로이드 크롬만), 앱 안 화면(카카오톡 등), 바깥 브라우저로 열기.
import { normalizePhone } from './phone.js';

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '');

export const isKakaoInApp = () => /KAKAOTALK/i.test(ua());
export const isAndroid = () => /Android/i.test(ua());
export const isIOS = () =>
  /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** 다른 앱 안에 뜨는 화면(카카오톡, 네이버, 인스타그램 등의 웹뷰). 폰의 브라우저와 달리 연락처 고르기와 자동 완성이 없다. */
export const isInApp = () =>
  isKakaoInApp()
  || /; wv\)/.test(ua()) // 안드로이드 웹뷰
  || /NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|BAND\//i.test(ua())
  || (/iPhone|iPad|iPod/.test(ua()) && !/Safari\//.test(ua())); // 아이폰의 앱 안 화면은 'Safari/'가 없다

/**
 * 폰의 연락처 화면을 띄워 고를 수 있는가(Contact Picker API).
 * 실제로 되는 곳은 안드로이드 크롬뿐이다. 삼성 인터넷과 앱 안 화면(웹뷰)은 navigator.contacts 가 있어도
 * 연락처 화면이 열리지 않거나 고른 것이 돌아오지 않는다. 그래서 있는지만 보지 않고 되는 곳만 고른다.
 */
export const canPickContacts = () =>
  typeof navigator !== 'undefined' && 'contacts' in navigator && typeof navigator.contacts?.select === 'function'
  // 미리 보기는 어느 브라우저에서 열든 흉내 낸 연락처 화면을 쓴다
  && (!!globalThis.FAMSOS_CONFIG?.DEMO || (/Chrome\/\d/.test(ua()) && !isInApp() && !/SamsungBrowser|Whale|EdgA|Firefox/i.test(ua())));

/** 아이폰 사파리: 이름 칸의 키보드 위에 '연락처 자동 완성'이 뜬다. 앱 안 화면과 다른 브라우저에는 없다. */
export const hasContactAutofill = () => isIOS() && !isInApp() && !/CriOS|FxiOS|EdgiOS/.test(ua());

/** 카카오톡 안 화면에서 폰의 기본 브라우저로 지금 주소를 연다(아이폰은 사파리). */
export const openExternalHref = (url = location.href) => `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;

/**
 * 안드로이드에서 지금 주소를 크롬으로 연다(카카오톡 안 화면, 삼성 인터넷 어디서나).
 * 기본 브라우저가 삼성 인터넷인 폰이 많아서 '기본 브라우저로 열기'로는 연락처 고르기에 닿지 못한다.
 * 크롬이 없으면 지금 화면에 그대로 머문다(browser_fallback_url).
 */
export const openInChromeHref = (url = location.href) =>
  `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;

/**
 * 앱 안 화면에서 폰의 브라우저로 나가는 주소(앞에서부터 해 본다). 나갈 길이 없으면 [].
 *  안드로이드: 크롬으로. 카카오톡은 크롬이 안 열리면 기본 브라우저로.
 *  아이폰 카카오톡: 사파리로.
 */
export function waysOut(url = location.href) {
  if (isAndroid() && isInApp()) {
    const chrome = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    return isKakaoInApp() ? [chrome, openExternalHref(url)] : [chrome];
  }
  if (isKakaoInApp()) return [openExternalHref(url)];
  return [];
}

const mobileFirst = (a, b) => Number(!a.startsWith('01')) - Number(!b.startsWith('01'));

/**
 * 폰 연락처에서 여러 명을 고른다. 고른 사람의 이름과 번호만 넘어온다.
 * @returns [{ name, phones: ['01012345678', …] }]  고른 사람 모두. 쓸 수 있는 번호가 없으면 phones 가 비어 있다. 휴대전화 번호가 앞에 온다.
 */
export async function pickContacts() {
  const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
  return (Array.isArray(picked) ? picked : []).map((c) => ({
    name: String(c?.name?.[0] ?? '').trim().slice(0, 30),
    phones: [...new Set((c?.tel || []).map(normalizePhone).filter(Boolean))].sort(mobileFirst),
  }));
}
