// 설정의 '밝게 보기' 스위치. 고른 것은 이 폰(브라우저)에만 남는다. 처음 그릴 때는 theme.js 가 먼저 적용한다.
const KEY = 'famsos.theme';

export const theme = {
  get() {
    try {
      return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
  },
  set(value) {
    try {
      if (value === 'light') localStorage.setItem(KEY, 'light');
      else localStorage.removeItem(KEY);
    } catch {
      /* 이번 방문에서만 */
    }
    if (value === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'light' ? '#ffffff' : '#1b1b1b');
  },
};
