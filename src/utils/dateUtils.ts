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
