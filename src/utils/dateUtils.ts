/**
 * 날짜 유틸 함수
 */

/**
 * ISO 날짜를 "n일 전" 형식으로 변환
 *
 * @param isoDateString ISO 8601 형식 날짜
 * @returns "오늘", "1일 전", "2일 전", ...
 */
export function formatRelativeDate(isoDateString: string): string {
  const now = new Date();
  const targetDate = new Date(isoDateString);

  // 시간 제거 (날짜만 비교)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  // 일 수 차이 계산
  const diffTime = todayStart.getTime() - targetStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '오늘';
  } else if (diffDays === 1) {
    return '1일 전';
  } else if (diffDays > 1) {
    return `${diffDays}일 전`;
  } else {
    return '오늘';
  }
}

/**
 * Date 객체를 기기 로컬 기준 "YYYY-MM-DD" 문자열로 변환
 *
 * `Date.toISOString()`은 UTC 기준이라, 한국(UTC+9) 등에서는 자정~오전 9시 사이에
 * 실제 로컬 날짜와 하루 어긋나는 문제가 있다. 출석 체크처럼 "오늘"을 로컬 날짜
 * 기준으로 판단해야 하는 곳에서는 이 함수를 사용한다.
 *
 * @param date 변환할 Date 객체 (기본값: 현재 시각)
 * @returns "2026-08-09" 형식의 로컬 날짜 문자열
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ISO 날짜를 "M월 D일" 형식으로 변환
 *
 * @param isoDateString ISO 8601 형식 날짜
 * @returns "3월 10일"
 */
export function formatMonthDay(isoDateString: string): string {
  const date = new Date(isoDateString);
  const month = date.getMonth() + 1;
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}월 ${day}일`;
}
