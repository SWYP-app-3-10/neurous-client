/**
 * 레벨업 감지 전역 Store (levelUpStore.ts)
 *
 * 보상을 지급하는 화면(퀴즈 제출 등)이 API 응답에서 레벨업 정보를 받으면 이 store에 기록해둔다.
 * 각 화면은 자신의 경험치 획득 모달(RewardModal)을 띄우기 직전에 이 store를 확인해서,
 * 레벨업이면 폭죽 UI 대신 레벨업 UI (캐릭터 이미지 + "축하해요! 레벨 업!")로 바꿔서 보여준다.
 * 리워드 칩/버튼 구성과 동작은 레벨업 여부와 무관하게 그대로 유지된다.
 *
 * 지금은 퀴즈 제출(submitQuiz) 응답만 레벨업 정보(userLevelInformation)를 내려주지만,
 * 출석/완독 API도 같은 정보를 내려주기 시작하면 그 화면들도 이 store를 그대로 재사용하면 된다.
 * — 레벨업 감지/소비 로직을 화면마다 새로 만들 필요가 없다.
 */
import { create } from 'zustand';

/** 레벨업 발생 시 모달에 필요한 최소 정보 */
export interface PendingLevelUpInfo {
  /** 레벨 코드 (예: "LEVEL_3") — 숫자만 추출해 로컬 levelList 조회에 사용 */
  levelCode: string;
  /** 새 레벨 캐릭터 이름 (서버 표기 — 로컬 levelList 조회 실패 시 폴백용) */
  characterName: string;
}

interface LevelUpStore {
  /** 아직 화면에 보여주지 않은 레벨업 정보. 없으면 null. */
  pendingLevelUp: PendingLevelUpInfo | null;

  /** 보상 API 응답에 레벨업 정보가 있을 때 기록한다. */
  setPendingLevelUp: (info: PendingLevelUpInfo) => void;

  /** 레벨업 모달에 반영한 뒤 소비 처리(초기화)한다. */
  clearPendingLevelUp: () => void;
}

export const useLevelUpStore = create<LevelUpStore>(set => ({
  pendingLevelUp: null,

  setPendingLevelUp: info => {
    try {
      set({ pendingLevelUp: info });
    } catch (error) {
      console.error('레벨업 정보 저장 실패:', error);
    }
  },

  clearPendingLevelUp: () => {
    try {
      set({ pendingLevelUp: null });
    } catch (error) {
      console.error('레벨업 정보 초기화 실패:', error);
    }
  },
}));
