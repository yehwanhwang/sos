// 전화번호 정리. 저장은 숫자만(국내 번호는 0으로 시작, 해외 번호는 +로 시작), 표시는 하이픈을 넣는다.

/** 입력을 저장 형식으로. 전화번호로 볼 수 없으면 ''. */
export function normalizePhone(input) {
  let s = String(input ?? '').trim();
  if (!s) return '';
  const plus = s.startsWith('+') || s.startsWith('00');
  let d = s.replace(/\D/g, '');
  if (s.startsWith('00') && !s.startsWith('+')) d = d.slice(2);
  if (plus) {
    if (d.startsWith('82')) {
      d = d.slice(2).replace(/^0/, '');
      d = '0' + d;
    } else {
      return d.length >= 8 && d.length <= 15 ? '+' + d : '';
    }
  } else if (/^82(10|11|16|17|18|19|2|3\d|4\d|5\d|6\d|70)\d{6,8}$/.test(d)) {
    d = '0' + d.slice(2); // "82 10 1234 5678" 처럼 + 없이 적은 국가번호
  }
  if (/^01[016789]\d{7,8}$/.test(d)) return d; // 휴대전화
  if (/^02\d{7,8}$/.test(d)) return d; // 서울
  if (/^0[3-6]\d\d{7,8}$/.test(d)) return d; // 지역번호
  if (/^0(70|50\d|80)\d{7,8}$/.test(d)) return d; // 인터넷전화·안심번호
  if (/^1[5-9]\d{6}$/.test(d)) return d; // 대표번호 15XX-XXXX
  return '';
}

/** 저장 형식 → 보기 좋은 표기 */
export function formatPhone(p) {
  if (!p) return '';
  if (p.startsWith('+')) return p;
  let m;
  if ((m = /^(01\d)(\d{3,4})(\d{4})$/.exec(p))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(02)(\d{3,4})(\d{4})$/.exec(p))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(050\d)(\d{3,4})(\d{4})$/.exec(p))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(0\d\d)(\d{3,4})(\d{4})$/.exec(p))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(1\d{3})(\d{4})$/.exec(p))) return `${m[1]}-${m[2]}`;
  return p;
}

const LABELS = /(휴대전화|휴대폰|핸드폰|전화번호|연락처|전화|모바일|mobile|phone|tel|cell|이름|성명|name)\s*[:：]?/gi;

/**
 * 붙여넣은 글에서 이름과 번호를 찾는다.
 *  "홍길동 010-1234-5678", "010 1234 5678 홍길동", "홍길동\n휴대전화 010-1234-5678" 등
 */
export function extractContact(text) {
  const raw = String(text ?? '');
  const m = /(\+?\d[\d\s().-]{6,18}\d)/.exec(raw);
  if (!m) return { name: raw.trim().slice(0, 30), phone: '' };
  const phone = normalizePhone(m[1]);
  if (!phone) return { name: raw.trim().slice(0, 30), phone: '' };
  const name = (raw.slice(0, m.index) + ' ' + raw.slice(m.index + m[1].length))
    .replace(LABELS, ' ')
    .replace(/[\r\n\t,;|/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
  return { name, phone };
}

export const telHref = (p) => 'tel:' + p;
export const smsHref = (p) => 'sms:' + p;
