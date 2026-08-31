/** 서버 표기 편차를 화면에서 사용하는 카테고리명으로 통일한다. */
export const normalizeCategoryName = (category?: string | null): string => {
  const trimmed = category?.trim();

  if (!trimmed) {
    return '전체';
  }

  // 일부 콘텐츠가 IT 또는 "IT/"로 내려오는 경우에도 정식 명칭으로 표시한다.
  if (/^it\s*\/?\s*(과학)?$/i.test(trimmed)) {
    return 'IT/과학';
  }

  return trimmed;
};
