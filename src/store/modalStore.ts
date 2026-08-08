/**
 * 모달 상태 관리 Store (modalStore.ts)
 *
 * Zustand를 사용하여 앱 전역에서 세 가지 타입의 모달을 관리한다:
 *   1. notification  : 제목, 설명, 이미지, 버튼이 있는 알림 모달 (중앙 팝업)
 *   2. bottomSheet   : 하단에서 올라오는 바텀시트 모달 (난이도 선택 등)
 *   3. toast         : 짧은 메시지를 표시하는 토스트 (화면 상단/하단)
 *
 * 설계 의도:
 *   - 단일 모달 상태만 관리 (한 번에 하나의 모달만 표시)
 *   - Union 타입으로 타입 안전성 보장 (잘못된 속성 조합 방지)
 *   - 편의 훅 제공으로 리렌더링 최적화
 */

import { create } from 'zustand';
import {
  ModalButton,
  NotificationModalProps,
} from '../components/NotificationModal';
import { StyleProp, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { ToastPosition } from '../components/ToastModal';

/**
 * 모달 타입 구분자
 */
export type ModalType = 'notification' | 'bottomSheet' | 'toast';

// ──────────────────────────────────────────────
// 모달 타입별 상태 인터페이스
// ──────────────────────────────────────────────

/**
 * 알림 모달 상태 (중앙 팝업)
 *
 * 사용 사례:
 *   - 경험치 획득 축하 모달
 *   - 출석 체크 완료 모달
 *   - 알림 권한 요청 모달
 *   - 에러 안내 모달
 */
interface NotificationModalState {
  type: 'notification';
  visible: boolean; // 모달 표시 여부
  title: string; // 모달 제목 (필수)
  description?: string; // 모달 설명 (선택)
  image?: NotificationModalProps['image']; // 상단 이미지 (React 컴포넌트)
  imageSize?: { width: number; height: number }; // 이미지 크기
  imageTopOffset?: number; // 이미지 상단 오프셋
  imagePaddingTop?: number; // 이미지 상단 패딩
  closeButton?: boolean; // X 버튼 표시 여부
  primaryButton?: ModalButton; // 주 버튼 (확인, 이동 등)
  secondaryButton?: ModalButton; // 보조 버튼 (취소, 닫기 등)
  children?: ReactNode; // 커스텀 콘텐츠 (ExperienceModalContent 등)
  titleDescriptionGapSize?: number; // 제목-설명 간격
  descriptionColor?: string; // 설명 텍스트 색상
  titleStyle?: StyleProp<TextStyle>; // 제목 스타일 커스터마이징
  closeOnBackdropPress?: boolean; // 배경 터치 시 모달 닫기 여부
  paddingHorizontal?: number; // 모달 좌우 패딩
}

/**
 * 바텀시트 모달 상태 (하단 슬라이드업)
 *
 * 사용 사례:
 *   - 난이도 선택 바텀시트
 *   - 옵션 메뉴
 *   - 필터 선택 UI
 */
interface BottomSheetModalState {
  type: 'bottomSheet';
  visible: boolean; // 모달 표시 여부
  children: ReactNode; // 바텀시트 내부 콘텐츠 (필수)
  closeOnBackdropPress?: boolean; // 배경 터치 시 모달 닫기 여부
  paddingHorizontal?: number; // 모달 좌우 패딩
}

/**
 * 토스트 모달 상태 (간단한 메시지)
 *
 * 사용 사례:
 *   - "저장되었습니다"
 *   - "네트워크 오류가 발생했습니다"
 *   - "퀴즈 제출 완료"
 *   - "난이도 설정이 완료되었어요" (아이콘 + 풀폭)
 */
interface ToastModalState {
  type: 'toast';
  visible: boolean; // 모달 표시 여부
  message: string; // 토스트 메시지 (필수)
  /** 메시지 왼쪽에 표시할 아이콘 (예: 체크 배지). 지정 시 가로 레이아웃으로 전환 */
  icon?: ReactNode;
  duration?: number; // 자동 숨김 시간 (ms, 기본값: 2000)
  position?: ToastPosition; // 표시 위치 ('top' | 'bottom')
  backgroundColor?: string; // 배경색
  opacity?: number; // 투명도
  height?: number; // 토스트 높이
  width?: number; // 토스트 너비
  /** width 미지정 시 화면 좌우 여백 기준 풀폭 너비 자동 계산 (아이콘 토스트 등) */
  marginHorizontal?: number;
  borderRadius?: number; // 모서리 둥글기
  /** 1px 테두리 색 (예: 글 열림 Toast Popup) */
  borderColor?: string;
  borderWidth?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  messageStyle?: StyleProp<TextStyle>;
  /** safe area bottom에 더할 오프셋 (기본: scaleWidth(52), Figma 공통 간격 기준) */
  bottomOffset?: number;
  onClose?: () => void; // 토스트 닫힐 때 실행할 콜백
}

/**
 * 모달 상태 Union 타입
 *
 * 세 가지 타입 중 하나만 활성화될 수 있도록 보장한다.
 * TypeScript의 판별 유니온(discriminated union)으로 타입 안전성을 확보한다.
 */
type ModalState =
  | NotificationModalState
  | BottomSheetModalState
  | ToastModalState;

// ──────────────────────────────────────────────
// Store 인터페이스
// ──────────────────────────────────────────────

/**
 * 모달 store 인터페이스
 */
interface ModalStore {
  /** 현재 활성화된 모달 상태 */
  modalState: ModalState;

  /** 알림 모달 표시 */
  showModal: (config: Omit<NotificationModalState, 'visible' | 'type'>) => void;

  /** 바텀시트 모달 표시 */
  showBottomSheetModal: (
    config: Omit<BottomSheetModalState, 'visible' | 'type'>,
  ) => void;

  /** 토스트 모달 표시 */
  showToastModal: (config: Omit<ToastModalState, 'visible' | 'type'>) => void;

  /** 모달 닫기 (타입 무관하게 모든 모달에 적용) */
  hideModal: () => void;
}

/**
 * 기본 모달 상태
 *
 * 초기 상태는 알림 모달 타입이며 visible: false로 설정되어 있다.
 * 모달이 없을 때의 기본값이다.
 */
const defaultModalState: ModalState = {
  type: 'notification',
  visible: false,
  title: '',
  titleStyle: undefined,
  paddingHorizontal: undefined,
};

// ──────────────────────────────────────────────
// Zustand Store 생성
// ──────────────────────────────────────────────

/**
 * 모달 상태 관리 Zustand store
 *
 * 사용 패턴:
 *   1. 모달 표시: showModal / showBottomSheetModal / showToastModal 호출
 *   2. 모달 닫기: hideModal 호출 (또는 버튼의 onPress에서 자동 호출)
 *
 * 주의사항:
 *   - 한 번에 하나의 모달만 표시된다 (새 모달 호출 시 기존 모달은 대체됨)
 *   - hideModal은 visible만 false로 변경하며, 나머지 상태는 유지된다
 *     (애니메이션 종료 후 컴포넌트 언마운트를 위함)
 */
export const useModalStore = create<ModalStore>(set => ({
  modalState: defaultModalState,

  /**
   * 알림 모달을 표시한다.
   *
   * 사용 예시:
   *   showModal({
   *     title: '축하합니다!',
   *     description: '경험치 10을 획득했습니다.',
   *     image: <Modal_IMG />,
   *     primaryButton: {
   *       title: '확인',
   *       onPress: () => hideModal(),
   *     },
   *   });
   *
   * @param config 모달 설정 (visible, type 제외)
   */
  showModal: config =>
    set({
      modalState: {
        ...config,
        type: 'notification',
        visible: true,
      } as NotificationModalState,
    }),

  /**
   * 바텀시트 모달을 표시한다.
   *
   * 사용 예시:
   *   showBottomSheetModal({
   *     children: <DifficultySelectionModal />,
   *     closeOnBackdropPress: true,
   *   });
   *
   * @param config 모달 설정 (visible, type 제외)
   */
  showBottomSheetModal: config =>
    set({
      modalState: {
        ...config,
        type: 'bottomSheet',
        visible: true,
      } as BottomSheetModalState,
    }),

  /**
   * 토스트 모달을 표시한다.
   *
   * 사용 예시:
   *   showToastModal({
   *     message: '저장되었습니다',
   *     duration: 2000,
   *     position: 'top',
   *   });
   *
   *   showToastModal({
   *     message: '난이도 설정이 완료되었어요',
   *     icon: <CheckBadge />,
   *     position: 'bottom',
   *     marginHorizontal: scaleWidth(20),
   *   });
   *
   * @param config 모달 설정 (visible, type 제외)
   */
  showToastModal: config =>
    set({
      modalState: {
        ...config,
        type: 'toast',
        visible: true,
      } as ToastModalState,
    }),

  /**
   * 현재 표시 중인 모달을 닫는다.
   *
   * visible만 false로 변경하며, 나머지 상태는 유지한다.
   * → 모달 컴포넌트의 애니메이션 종료 후 언마운트를 위함
   *
   * 모든 타입의 모달에 동일하게 적용 가능하다.
   */
  hideModal: () =>
    set(state => ({
      modalState: {
        ...state.modalState,
        visible: false,
      },
    })),
}));

// ──────────────────────────────────────────────
// 편의 훅 (Selector Hooks)
// ──────────────────────────────────────────────

/**
 * 편의 훅: showModal 함수만 필요한 경우
 *
 * 리렌더링 최적화를 위해 필요한 부분만 선택적으로 구독한다.
 * modalState 변경 시에도 showModal 함수는 재생성되지 않으므로
 * 이 훅을 사용하는 컴포넌트는 불필요한 리렌더링이 발생하지 않는다.
 *
 * @returns showModal 함수
 */
export const useShowModal = () => useModalStore(state => state.showModal);

/**
 * 편의 훅: showBottomSheetModal 함수만 필요한 경우
 *
 * @returns showBottomSheetModal 함수
 */
export const useShowBottomSheetModal = () =>
  useModalStore(state => state.showBottomSheetModal);

/**
 * 편의 훅: showToastModal 함수만 필요한 경우
 *
 * @returns showToastModal 함수
 */
export const useShowToastModal = () =>
  useModalStore(state => state.showToastModal);

/**
 * 편의 훅: hideModal 함수만 필요한 경우
 *
 * @returns hideModal 함수
 */
export const useHideModal = () => useModalStore(state => state.hideModal);

/**
 * 편의 훅: 모달 상태(modalState)만 필요한 경우
 *
 * 모달을 렌더링하는 컴포넌트(App.tsx의 RootModal 등)에서 사용한다.
 * modalState가 변경될 때만 리렌더링된다.
 *
 * @returns modalState (현재 활성화된 모달 상태)
 */
export const useModalState = () => useModalStore(state => state.modalState);
