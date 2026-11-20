// 밝게 보기: 설정에서 고른 폰에서만 밝은 화면이 된다(기본은 어두운 화면).
// 화면을 그리기 전에 적용해야 깜빡이지 않으므로 <head> 에서 모듈보다 먼저 읽는다.
(function () {
  try {
    if (localStorage.getItem('famsos.theme') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
    }
  } catch (e) {
    /* 저장소를 못 쓰면 기본(어두운 화면) */
  }
})();
