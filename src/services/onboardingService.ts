/**
 * 온보딩 상태 관리 서비스 (onboardingService.ts)
 *
 * AsyncStorage를 통해 온보딩 진행 상태, 관심분야, 난이도 선택 정보를 저장/조회한다.
 *
 * AsyncStorage 키 구조:
 *   @onboarding_completed : 'true' | null (온보딩 완료 여부)
 *   @onboarding_step      : 'login' | 'interests' | 'difficulty' | 'completed'
 *   @onboarding_interests : JSON 문자열 (Record<string, number>)
 *   @onboarding_difficulty: JSON 문자열 (LevelCategory)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LevelCategory } from '../types/interests';
import { getAuthToken } from './authService';

// ──────────────────────────────────────────────
// AsyncStorage 키 상수
// ──────────────────────────────────────────────
const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';
const ONBOARDING_STEP_KEY = '@onboarding_step';
const INTERESTS_KEY = '@onboarding_interests';
const DIFFICULTY_KEY = '@onboarding_difficulty';

export type OnboardingStep = 'login' | 'interests' | 'difficulty' | 'completed';

export type InterestsData = Record<string, number>;

export interface OnboardingData {
  isCompleted: boolean;
  step: OnboardingStep;
  interests: InterestsData | null;
  difficulty: LevelCategory | null;
}

// ──────────────────────────────────────────────
// 온보딩 상태 조회
// ──────────────────────────────────────────────

export const getOnboardingStatus = async (): Promise<OnboardingData> => {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    const step = (await AsyncStorage.getItem(
      ONBOARDING_STEP_KEY,
    )) as OnboardingStep | null;
    const interestsStr = await AsyncStorage.getItem(INTERESTS_KEY);
    const difficultyStr = await AsyncStorage.getItem(DIFFICULTY_KEY);

    const difficulty: LevelCategory | null = difficultyStr
      ? (JSON.parse(difficultyStr) as LevelCategory)
      : null;

    const interests: InterestsData | null = interestsStr
      ? JSON.parse(interestsStr)
      : null;

    // ── CASE 1. 온보딩 완료 상태
    if (completed === 'true') {
      return {
        isCompleted: true,
        step: 'completed',
        interests,
        difficulty,
      };
    }

    // ── CASE 2. 데이터 불일치 감지 (토큰은 있는데 온보딩 정보 없음)
    const token = await getAuthToken();
    if (token && (!interests || !difficulty)) {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);

      if (!step || step === 'completed') {
        await AsyncStorage.setItem(ONBOARDING_STEP_KEY, 'interests');
      }

      return {
        isCompleted: false,
        step: step === 'difficulty' ? 'difficulty' : 'interests',
        interests,
        difficulty,
      };
    }

    // ── CASE 3. 온보딩 진행 중
    if (step) {
      return {
        isCompleted: false,
        step,
        interests,
        difficulty,
      };
    }

    // ── CASE 4. 온보딩 시작 전 (초기 상태)
    return {
      isCompleted: false,
      step: 'login',
      interests: null,
      difficulty: null,
    };
  } catch (error) {
    console.error('온보딩 상태 조회 실패:', error);
    return {
      isCompleted: false,
      step: 'login',
      interests: null,
      difficulty: null,
    };
  }
};

// ──────────────────────────────────────────────
// 온보딩 상태 저장
// ──────────────────────────────────────────────

/**
 * 온보딩 완료 처리
 *
 * multiSet으로 2개 키를 한 번에 저장한다. (기존: setItem x2 순차)
 */
export const completeOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      [ONBOARDING_COMPLETED_KEY, 'true'],
      [ONBOARDING_STEP_KEY, 'completed'],
    ]);
  } catch (error) {
    console.error('온보딩 완료 저장 실패:', error);
    throw error;
  }
};

export const saveOnboardingStep = async (
  step: OnboardingStep,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_STEP_KEY, step);
  } catch (error) {
    console.error('온보딩 단계 저장 실패:', error);
    throw error;
  }
};

export const saveInterests = async (
  interests: InterestsData,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
  } catch (error) {
    console.error('관심분야 저장 실패:', error);
    throw error;
  }
};

export const saveDifficulty = async (
  difficulty: LevelCategory,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(DIFFICULTY_KEY, JSON.stringify(difficulty));
  } catch (error) {
    console.error('난이도 저장 실패:', error);
    throw error;
  }
};

// ──────────────────────────────────────────────
// 온보딩 상태 초기화
// ──────────────────────────────────────────────

/**
 * 온보딩 관련 모든 AsyncStorage 키를 삭제한다.
 *
 * multiRemove로 4개 키를 한 번에 삭제한다. (기존: removeItem x4 순차)
 */
export const resetOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      ONBOARDING_COMPLETED_KEY,
      ONBOARDING_STEP_KEY,
      INTERESTS_KEY,
      DIFFICULTY_KEY,
    ]);
  } catch (error) {
    console.error('온보딩 상태 초기화 실패:', error);
    throw error;
  }
};
