// 배포 전에 이 값들을 채운다. 여기 적는 값은 모두 공개되어도 되는 값이다(비밀값은 넣지 않는다).
globalThis.FAMSOS_CONFIG = {
  // 구글 Apps Script → 배포 → 웹 앱 URL(…/exec 로 끝난다)
  API_URL: 'https://script.google.com/macros/s/AKfycbwvMWf8_glb6QJ9it-heRLI2OlQjUjUe6IY7ManGbJ5eO_-XwAmFJVZ988THJ-ANYFo8g/exec',
  // 카카오 개발자 → 앱 → 플랫폼 키 → REST API 키(로그인 주소에 그대로 드러나는 값이다. 클라이언트 시크릿은 여기 넣지 않는다)
  KAKAO_REST_KEY: 'YOUR_KAKAO_REST_API_KEY',
};
