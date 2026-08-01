/**
 * 난이도 제안 훅
 *
 * 난이도 제안 수락/거절 처리를 관리
 * - 제안 수락 처리: 난이도 변경 + 히스토리 초기화
 * - 제안 거절 처리: 히스토리 초기화
 *
 * 사용처: QuizScreen - LevelSuggestionModal
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { LevelCategory, LevelCategoryNames } from '../types/interests';
import { clearDifficultyFeedbackHistory } from '../services/difficultyFeedbackService';
import { updateUserLevel } from '../api/userApi';
import { getUserInfo } from '../services/authService';
import { useOnboardingStore } from '../store/onboardingStore';
import { trackEvent } from '../services/mixpanelService';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

interface UseDifficultySuggestionReturn {
  // 제안 수락 핸들러
  handleAcceptSuggestion: (suggestedLevel: LevelCategory) => Promise<void>;

  // 제안 거절 핸들러
  handleDeclineSuggestion: () => Promise<void>;

  // 로딩 상태
  isLoading: boolean;
}

// ──────────────────────────────────────────────
// 메인 훅
// ──────────────────────────────────────────────

/**
 * 난이도 제안 훅
 *
 * @returns 제안 관련 함수 및 상태
 */
export function useDifficultySuggestion(): UseDifficultySuggestionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const setDifficulty = useOnboardingStore(state => state.setDifficulty);

  /**
   * 제안 수락 핸들러 ("좋아요" 버튼)
   */
  const handleAcceptSuggestion = useCallback(
    async (suggestedLevel: LevelCategory): Promise<void> => {
      try {
        setIsLoading(true);

        // 1. 사용자 정보 조회
        const userInfo = await getUserInfo();
        if (!userInfo || !userInfo.userId) {
          Alert.alert(
            '오류',
            '사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.',
          );
          return;
        }

        // 2. 서버 api 호출 (난이도 업데이트)
        console.log(
          '[DifficultySuggestion] 난이도 업데이트 시작:',
          suggestedLevel,
        );
        await updateUserLevel(userInfo.userId, suggestedLevel);
        console.log('[DifficultySuggestion] 난이도 업데이트 성공');

        // Mixpanel: 난이도 실제 변경 (추천 수락 → 변경 성공 시 함께 발생)
        const difficultyBefore = useOnboardingStore.getState().difficulty;
        if (difficultyBefore !== suggestedLevel) {
          trackEvent('difficulty_changed', {
            difficulty_before: difficultyBefore
              ? LevelCategoryNames[difficultyBefore]
              : null,
            difficulty_after: LevelCategoryNames[suggestedLevel],
          });
        }

        //3. Zustand store 업데이트
        // onboardingStore.difficulty 변경
        // AsyncStorage @onboarding_difficulty 자동 동기화
        setDifficulty(suggestedLevel);

        // 4. 피드백 히스토리 초기화
        // AsyncStorage에서 @difficulty_feedback_history 삭제
        // 난이도 선택 카운트 리셋
        await clearDifficultyFeedbackHistory();
        console.log('[DifficultySuggestion] 피드백 히스토리 초기화 완료');
      } catch (error) {
        console.error('[DifficultySuggestion] 제안 수락 실패:', error);
        Alert.alert(
          '업데이트 실패',
          '난이도 업데이트에 실패했습니다. 다시 시도해주세요.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [setDifficulty],
  );

  /**
   * 제안 거절 핸들러 ("지금은 괜찮아요" 버튼)
   */
  const handleDeclineSuggestion = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      // 피드백 히스토리 초기화
      await clearDifficultyFeedbackHistory();

      console.log('[DifficultySuggestion] 제안 거절 완료');
      console.log('[DifficultySuggestion] 피드백 히스토리 초기화 완료');
    } catch (error) {
      console.error('[DifficultySuggestion] 제안 거절 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    handleAcceptSuggestion,
    handleDeclineSuggestion,
    isLoading,
  };
}
