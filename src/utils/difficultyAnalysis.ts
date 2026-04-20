/**
 * 난이도 분석 유틸
 *
 * 최근 피드백을 분석하여 난이도 제안 여부를 결정
 *
 * - 쉬움 >= 13회 -> 상향 제안
 * - 보통 >= 9회 -> 유지 (팝업 안 띄움)
 * - 어려움 >= 8회 -> 하향 제안
 */

import { DifficultyFeedback } from '../services/difficultyFeedbackService';
import { LevelCategory } from '../types/interests';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/* 난이도 분석 결과 */
export interface DifficultyAnalysisResult {
  shouldSuggest: boolean; // 제안 표시 여부
  suggestedLevel: LevelCategory | null; // 제안할 난이도
  reason: 'easy' | 'hard' | 'normal' | null; // 제안 이유

  // 피드백 선택 횟수
  stats: {
    easyCount: number;
    normalCount: number;
    hardCount: number;
    total: number;
  };
}

// ──────────────────────────────────────────────
// 난이도 레벨 상승/하강 헬퍼
// ──────────────────────────────────────────────

/**
 * 다음 난이도 레벨 계산 (상향)
 *
 * @param currentLevel 현재 레벨
 * @return 한 단계 높은 난이도, 최고 레벨이면 null
 */
function getNextLevel(currentLevel: LevelCategory): LevelCategory | null {
  if (currentLevel === LevelCategory.BEGINNER) {
    return LevelCategory.INTERMEDIATE;
  }
  if (currentLevel === LevelCategory.INTERMEDIATE) {
    return LevelCategory.ADVANCED;
  }
  return null; // 이미 최고 레벨
}

/**
 * 이전 난이도 레벨 계산 (하향)
 *
 * @param currentLevel 현재 난이도
 * @returns 한 단계 낮은 난이도, 최저 레벨이면 null
 */
function getPreviousLevel(currentLevel: LevelCategory): LevelCategory | null {
  if (currentLevel === LevelCategory.ADVANCED) {
    return LevelCategory.INTERMEDIATE;
  }
  if (currentLevel === LevelCategory.INTERMEDIATE) {
    return LevelCategory.BEGINNER;
  }
  return null; // 이미 최저 레벨
}

// ──────────────────────────────────────────────
// 메인 분석 함수
// ──────────────────────────────────────────────

/**
 * 난이도 피드백 분석
 * - 최근 피드백을 분석하여 난이도 제안 여부를 결정
 *
 * @param history 피드백 히스토리
 * @param currentLevel 현재 사용자 레벨
 * @return 분석 결과
 */
export function analyzeDifficultyFeedback(
  history: DifficultyFeedback[],
  currentLevel: LevelCategory,
): DifficultyAnalysisResult {
  // 1. 최근 20개 추출 (20개 미만이어도 분석 진행)
  const recent20 = history.slice(-20);

  // 2. 피드백 통계 집계
  const easyCount = recent20.filter(f => f.feedback === 'easy').length;
  const normalCount = recent20.filter(f => f.feedback === 'normal').length;
  const hardCount = recent20.filter(f => f.feedback === 'hard').length;

  const stats = {
    easyCount,
    normalCount,
    hardCount,
    total: recent20.length,
  };

  console.log('[DifficultyAnalysis] 통계:', stats);

  // 3. 규칙 적용

  // 3-1. 쉬움 피드백이 13회 이상 -> 상향 제안
  // TODO: 테스트용으로 2회 시 모달 띄우도록 임시 변경
  if (easyCount >= 2) {
    // 2 -> 13 원복 예정
    const nextLevel = getNextLevel(currentLevel);

    if (nextLevel) {
      console.log('[DifficultyAnalysis] 제안: 난이도 상향 ->', nextLevel);
      return {
        shouldSuggest: true,
        suggestedLevel: nextLevel,
        reason: 'easy',
        stats,
      };
    }
    console.log('[DifficultyAnalysis] 이미 최고 레벨, 제안 안 함');
    return {
      shouldSuggest: false,
      suggestedLevel: null,
      reason: null,
      stats,
    };
  }

  // 3-2. 어려움 피드백이 8회 이상 -> 하향 제안
  // TODO: 테스트용으로 2회 시 모달 띄우도록 임시 변경
  if (hardCount >= 2) {
    // 2 -> 8 원복 예정
    const previousLevel = getPreviousLevel(currentLevel);

    if (previousLevel) {
      console.log('[DifficultyAnalysis] 제안: 난이도 하향 →', previousLevel);
      return {
        shouldSuggest: true,
        suggestedLevel: previousLevel,
        reason: 'hard',
        stats,
      };
    }

    console.log('[DifficultyAnalysis] 이미 최저 레벨, 제안 안 함');
    return {
      shouldSuggest: false,
      suggestedLevel: null,
      reason: null,
      stats,
    };
  }

  // 3-3. 적정 피드백이 9회 이상 -> 유지 (제안 안 함)
  if (normalCount >= 9) {
    console.log('[DifficultyAnalysis] 적정 난이도 유지, 팝업 안 띄움');
    return {
      shouldSuggest: false,
      suggestedLevel: null,
      reason: 'normal',
      stats,
    };
  }

  // 3-4. 그 외에는 제안 안 함
  console.log('[DifficultyAnalysis] 제안 조건 미달, 팝업 안 띄움');
  return {
    shouldSuggest: false,
    suggestedLevel: null,
    reason: null,
    stats,
  };
}
