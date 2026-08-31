import { describe, expect, it } from '@jest/globals';
import { analyzeDifficultyFeedback } from '../difficultyAnalysis';
import { DifficultyFeedback } from '../../services/difficultyFeedbackService';
import { LevelCategory } from '../../types/interests';

const createHistory = (
  feedback: DifficultyFeedback['feedback'],
  count: number,
): DifficultyFeedback[] =>
  Array.from({ length: count }, (_, index) => ({
    contentId: index + 1,
    userLevel: LevelCategory.BEGINNER,
    feedback,
    timestamp: new Date(2026, 0, index + 1).toISOString(),
  }));

describe('analyzeDifficultyFeedback', () => {
  it('쉬움 평가가 13회면 난이도를 한 단계 올려 제안한다', () => {
    const result = analyzeDifficultyFeedback(
      createHistory('easy', 13),
      LevelCategory.BEGINNER,
    );

    expect(result.shouldSuggest).toBe(true);
    expect(result.suggestedLevel).toBe(LevelCategory.INTERMEDIATE);
  });

  it('어려움 평가가 8회면 난이도를 한 단계 낮춰 제안한다', () => {
    const result = analyzeDifficultyFeedback(
      createHistory('hard', 8),
      LevelCategory.INTERMEDIATE,
    );

    expect(result.shouldSuggest).toBe(true);
    expect(result.suggestedLevel).toBe(LevelCategory.BEGINNER);
  });

  it('보통 평가가 9회면 현재 난이도를 유지한다', () => {
    const result = analyzeDifficultyFeedback(
      createHistory('normal', 9),
      LevelCategory.INTERMEDIATE,
    );

    expect(result.shouldSuggest).toBe(false);
    expect(result.reason).toBe('normal');
  });

  it('최고 난이도에서는 상향 제안을 하지 않는다', () => {
    const result = analyzeDifficultyFeedback(
      createHistory('easy', 13),
      LevelCategory.ADVANCED,
    );

    expect(result.shouldSuggest).toBe(false);
    expect(result.suggestedLevel).toBeNull();
  });

  it('최저 난이도에서는 하향 제안을 하지 않는다', () => {
    const result = analyzeDifficultyFeedback(
      createHistory('hard', 8),
      LevelCategory.BEGINNER,
    );

    expect(result.shouldSuggest).toBe(false);
    expect(result.suggestedLevel).toBeNull();
  });
});
