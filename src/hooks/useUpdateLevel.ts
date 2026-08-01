import { useCallback } from 'react';
import { getUserInfo } from '../services/authService';
import { updateUserLevel } from '../api/userApi';
import { LevelCategory, LevelCategoryNames } from '../types/interests';
import { MyPageData } from '../api/userApi';
import { trackEvent } from '../services/mixpanelService';

/**
 * useUpdateLevel 훅에 주입하는 props
 *
 * @property setMyPageData - 마이페이지 로컬 상태 업데이트 함수 (API 성공 후 UI 즉시 반영용)
 * @property onSuccess     - 난이도 업데이트 성공 시 실행할 콜백 (예: 바텀시트 닫기)
 * @property onError       - 난이도 업데이트 실패 시 실행할 콜백 (예: 에러 토스트 표시)
 */
interface UseUpdateLevelProps {
  setMyPageData: React.Dispatch<React.SetStateAction<MyPageData | null>>;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  /** 변경 전 현재 난이도 (Mixpanel difficulty_changed 이벤트용) */
  currentLevel?: LevelCategory | null;
}

/**
 * 사용자 학습 난이도(레벨)를 업데이트하는 훅
 *
 * 처리 흐름:
 *   1. authService에서 현재 로그인한 사용자 정보(userId)를 가져온다
 *   2. userId가 유효한 경우 API를 호출해 서버의 난이도를 변경한다
 *   3. API 성공 시 로컬 마이페이지 상태(setMyPageData)를 동기화해 UI를 즉시 갱신한다
 *   4. 성공/실패에 따라 onSuccess / onError 콜백을 호출한다
 *
 * @returns handleUpdateLevel - 난이도 변경 처리 함수 (level: LevelCategory)
 */
export const useUpdateLevel = ({
  setMyPageData,
  onSuccess,
  onError,
  currentLevel,
}: UseUpdateLevelProps) => {
  /**
   * 선택된 난이도를 서버에 저장하고 로컬 상태를 동기화한다.
   *
   * @param level - 사용자가 선택한 새 난이도 (LevelCategory 타입)
   */
  const handleUpdateLevel = useCallback(
    async (level: LevelCategory) => {
      try {
        // 현재 로그인된 사용자 정보 조회
        const userInfo = await getUserInfo();

        // userId가 없으면 API 호출 불가 → 에러 콜백 실행 후 종료
        if (!userInfo || !userInfo.userId) {
          console.error('[마이페이지] 사용자 정보 없음');
          onError?.(new Error('사용자 정보 없음'));
          return;
        }

        // 서버에 난이도 변경 요청
        await updateUserLevel(userInfo.userId, level);

        // Mixpanel: 난이도 실제 변경 (마이페이지에서 변경 시)
        if (currentLevel && currentLevel !== level) {
          trackEvent('difficulty_changed', {
            difficulty_before: LevelCategoryNames[currentLevel],
            difficulty_after: LevelCategoryNames[level],
          });
        }

        // API 성공 시 로컬 state 즉시 반영 (재요청 없이 UI 갱신)
        setMyPageData(prev => {
          if (prev) {
            return { ...prev, level }; // 기존 데이터에서 level만 교체
          }
          return prev; // 이전 값이 null이면 그대로 유지
        });

        // 성공 콜백 실행 (예: 바텀시트 닫기, 완료 토스트 표시 등)
        onSuccess?.();
      } catch (error) {
        // 네트워크 오류, 서버 오류 등 예외 처리
        console.error('[마이페이지] 난이도 업데이트 실패:', error);
        onError?.(error);
      }
    },
    // setMyPageData, onSuccess, onError, currentLevel이 바뀔 때만 함수 재생성
    [setMyPageData, onSuccess, onError, currentLevel],
  );

  return { handleUpdateLevel };
};
