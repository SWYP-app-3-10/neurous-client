/**
 * 공통 에러 토스트 헬퍼 (errorToast.ts)
 *
 * 앱 전역에서 공통으로 사용하는 두 가지 에러 토스트를 정의한다.
 *   A. showNetworkErrorToast : 인터넷 연결 불안정 / 요청 타임아웃 / 서버 무응답 등
 *      네트워크·통신 관련 실패
 *   B. showGeneralErrorToast : 예기치 않은 오류 / 앱 내부 오류 / 원인을
 *      특정하기 어려운 실패
 *
 * MVP 단계에서는 이 두 가지만으로 대부분의 예외 상황을 커버하고,
 * 서비스 운영 중 필요한 케이스가 생기면 그때 상황에 맞게 추가한다.
 * (Figma: Toast_Error_Network / Toast_Error_Default)
 *
 * 문구·스타일을 이 파일 한 곳에서만 관리해, 화면마다 에러 토스트를
 * 제각각 구현하면서 문구·디자인이 어긋나는 것을 방지한다.
 *
 * 주의: client.ts(axios 인터셉터)처럼 React 컴포넌트 바깥에서도 호출해야
 * 하므로, 훅(useShowToastModal)이 아니라 zustand 스토어를 직접
 * getState()로 꺼내 호출한다.
 */
import React from 'react';
import { useModalStore } from '../store/modalStore';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { InfoIcon } from '../icons';

/** A. 네트워크 오류 토스트 문구 */
const NETWORK_ERROR_MESSAGE = '네트워크 상태를 확인한 후\n다시 시도해주세요';

/** B. 일반 오류 토스트 문구 */
const GENERAL_ERROR_MESSAGE =
  '일시적인 오류가 발생했어요\n잠시 후 다시 시도해주세요';

/**
 * 에러 토스트 공통 스타일
 *
 * gray800 배경 + gray800Stroke 1px 테두리는 기존에 ArticleDetailScreen의
 * 토스트에서 이미 쓰이던 "Toast Popup" 조합(styles/global.ts 참고)을
 * 그대로 재사용한 것 — 앱 전체 에러 토스트의 기준 스타일로 삼는다.
 */
const ERROR_TOAST_STYLE = {
  icon: React.createElement(InfoIcon, { color: COLORS.white }),
  position: 'bottom' as const,
  backgroundColor: COLORS.gray800,
  borderColor: COLORS.gray800Stroke,
  borderWidth: 1,
  marginHorizontal: scaleWidth(20),
  paddingHorizontal: scaleWidth(20),
  paddingVertical: scaleWidth(14),
  borderRadius: BORDER_RADIUS[16],
  duration: 2500,
};

/**
 * A. 네트워크 오류 토스트 표시
 *
 * 사용 시점: 인터넷 연결 불안정, 요청 타임아웃, 서버 무응답 등
 * axios가 응답 자체를 받지 못한 경우 (client.ts 참고)
 */
export const showNetworkErrorToast = () => {
  useModalStore.getState().showToastModal({
    message: NETWORK_ERROR_MESSAGE,
    ...ERROR_TOAST_STYLE,
  });
};

/**
 * B. 일반 오류 토스트 표시
 *
 * 사용 시점: 예기치 않은 오류, 원인을 특정하기 어려운 실패 등
 * 위 네트워크 오류에 해당하지 않는 그 외 모든 실패의 기본값(fallback)
 */
export const showGeneralErrorToast = () => {
  useModalStore.getState().showToastModal({
    message: GENERAL_ERROR_MESSAGE,
    ...ERROR_TOAST_STYLE,
  });
};
