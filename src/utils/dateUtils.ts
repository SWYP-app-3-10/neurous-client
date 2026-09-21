/**
 * 날짜 유틸 함수
 */

/**
 * 알림 목록의 날짜 표시 문자열을 화면용으로 변환
 *
 * 서버가 `displayDate`를 이미 표시용 문자열("0일 전", "1일 전", "09.17" 등)로
 * 내려주므로 날짜 계산은 하지 않는다. 오늘 받은 알림("0일 전")만 "오늘"로
 * 바꾸고, 나머지는 서버에서 받은 값을 그대로 반환한다.
 *
 * @param displayDate 서버가 내려준 표시용 날짜 문자열
 * @returns "오늘" 또는 서버 값 그대로 ("1일 전", "09.17", ...)
 */
export function formatNotificationDate(displayDate: string): string {
  return displayDate === '0일 전' ? '오늘' : displayDate;
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
