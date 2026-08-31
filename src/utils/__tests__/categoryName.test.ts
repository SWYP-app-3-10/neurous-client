import { normalizeCategoryName } from '../categoryName';

describe('normalizeCategoryName', () => {
  it.each(['IT', 'IT/', 'IT/과학', ' IT / 과학 '])(
    '%s를 IT/과학으로 표시한다',
    category => {
      expect(normalizeCategoryName(category)).toBe('IT/과학');
    },
  );

  it('다른 카테고리명은 공백만 정리해 유지한다', () => {
    expect(normalizeCategoryName(' 경제 ')).toBe('경제');
  });

  it('빈 카테고리는 전체로 표시한다', () => {
    expect(normalizeCategoryName('')).toBe('전체');
  });
});
