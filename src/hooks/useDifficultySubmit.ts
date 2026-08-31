/**
 * 난이도 전송 커스텀 훅
 *
 * 유저가 글을 읽고 선택한 난이도를 서버에 전송함.
 * 하루에 한 번만 전송 가능하며, 전송 여부를 AsyncStorage에 날짜로 기록해 관리함.
 */
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { submitDifficulty } from '../api/missionApi';
import { getUserInfo } from '../services/authService';
import { Difficulty } from '../components/DifficultySelectionModal';

/**
 * 마지막 난이도 전송 날짜를 저장하는 AsyncStorage 키
 * 하루 한 번 전송 제한에 사용됨
 */
export const DIFFICULTY_SUBMIT_KEY = '@difficulty_submit_date';

/** 신규 가입 계정은 이전 계정의 일일 제출 여부를 이어받지 않는다. */
export const resetDifficultySubmitStatus = async (): Promise<void> => {
  await AsyncStorage.removeItem(DIFFICULTY_SUBMIT_KEY);
};

/**
 * 화면용 난이도 타입 → API 요청 포맷 변환
 *
 * 화면에서는 소문자('easy' | 'normal' | 'hard')를 사용하고
 * API는 대문자('EASY' | 'MEDIUM' | 'HARD')를 요구하므로 변환 필요.
 * 'normal'은 API에서 'MEDIUM'으로 매핑됨.
 *
 * @param difficulty  화면용 난이도 값
 * @returns           API 요청용 난이도 값
 */
const convertDifficultyToApiFormat = (
  difficulty: Difficulty,
): 'EASY' | 'MEDIUM' | 'HARD' => {
  switch (difficulty) {
    case 'easy':
      return 'EASY';
    case 'normal':
      return 'MEDIUM'; // 'normal' → 'MEDIUM' 매핑
    case 'hard':
      return 'HARD';
    default:
      return 'EASY'; // 알 수 없는 값은 EASY로 처리
  }
};

/**
 * 오늘 난이도 전송이 가능한지 확인
 *
 * AsyncStorage에 저장된 마지막 전송 날짜와 오늘 날짜를 비교함.
 * 같은 날이면 false(전송 불가), 다른 날이면 true(전송 가능) 반환.
 *
 * @returns  전송 가능 여부 (에러 발생 시 true 반환 — 전송 허용으로 처리)
 */
export const checkCanSubmitDifficulty = async (): Promise<boolean> => {
  try {
    // UTC가 아닌 기기 현지 날짜를 사용해 자정 기준으로 일일 제한을 갱신한다.
    const today = dayjs().format('YYYY-MM-DD');
    const lastSubmitDate = await AsyncStorage.getItem(DIFFICULTY_SUBMIT_KEY);
    return lastSubmitDate !== today;
  } catch (error) {
    console.error('[useDifficultySubmit] 날짜 체크 실패:', error);
    return true; // 에러 시 전송 가능으로 처리 (사용자 경험 우선)
  }
};

/**
 * 난이도 전송 커스텀 훅
 *
 * [동작 방식]
 * 1. 유저 정보 조회 (userId 필요)
 * 2. 화면용 난이도를 API 포맷으로 변환
 * 3. submitDifficulty API 호출
 * 4. 성공 시 오늘 날짜를 AsyncStorage에 저장 (하루 한 번 제한)
 *
 * @returns submitDifficultyToServer  — 난이도 전송 함수 (성공: true, 실패: false)
 *          isSubmitting              — 전송 진행 중 여부
 *          checkCanSubmitDifficulty  — 오늘 전송 가능 여부 확인 함수
 */
export const useDifficultySubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 서버에 난이도 전송
   *
   * @param contentId   난이도를 전송할 콘텐츠 ID
   * @param difficulty  유저가 선택한 난이도
   * @returns           전송 성공 여부 (에러 발생 시 false 반환)
   */
  const submitDifficultyToServer = useCallback(
    async (contentId: number, difficulty: Difficulty): Promise<boolean> => {
      try {
        setIsSubmitting(true);

        const userInfo = await getUserInfo();
        if (!userInfo || !userInfo.userId) {
          console.error('[useDifficultySubmit] 사용자 정보 없음');
          return false;
        }

        // 화면용 난이도 → API 포맷 변환 후 전송
        const apiDifficulty = convertDifficultyToApiFormat(difficulty);
        const response = await submitDifficulty(
          userInfo.userId,
          contentId,
          apiDifficulty,
        );

        console.log('[useDifficultySubmit] 난이도 전송 성공:', response);

        // 전송 성공 시 오늘 날짜 기록 (하루 한 번 제한 적용)
        const today = dayjs().format('YYYY-MM-DD');
        await AsyncStorage.setItem(DIFFICULTY_SUBMIT_KEY, today);

        return true;
      } catch (error) {
        console.error('[useDifficultySubmit] 난이도 전송 실패:', error);
        return false; // 에러를 throw하지 않고 false 반환 (호출부에서 조용히 처리)
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return {
    submitDifficultyToServer,
    isSubmitting,
    checkCanSubmitDifficulty,
  };
};
