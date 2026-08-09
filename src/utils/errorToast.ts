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
import { Body_16M } from '../styles/typography';
import { ErrorToastInfoIcon } from '../icons';

/** A. 네트워크 오류 토스트 문구 */
const NETWORK_ERROR_MESSAGE = '네트워크 상태를 확인한 후\n다시 시도해주세요';

/** B. 일반 오류 토스트 문구 */
const GENERAL_ERROR_MESSAGE =
  '일시적인 오류가 발생했어요\n잠시 후 다시 시도해주세요';

/**
 * 에러 토스트 공통 스타일
 *
 * width 353, marginHorizontal 20
 * padding 18(상하) 20(좌우), radius 16, gap 12, background gray800
 * 테두리 없음
 * bottomOffset은 따로 지정하지 않고 ToastModal 공통 기본값(52)을 그대로 따름
 *
 * 아이콘: 디자인팀이 전달한 전용 "!" 에셋(assets/png/errorToast_Info.png)을
 * simpleImages.tsx에 24x24로 등록해 사용한다. PNG라 InfoIcon(SVG)과 달리
 * color prop으로 틴트할 수 없어, 크기만 등록 시점에 고정해서 그대로 쓴다.
 */
const ERROR_TOAST_STYLE = {
  icon: React.createElement(ErrorToastInfoIcon),
  position: 'bottom' as const,
  backgroundColor: COLORS.gray800,
  marginHorizontal: scaleWidth(20),
  paddingHorizontal: scaleWidth(20),
  paddingVertical: scaleWidth(18),
  borderRadius: BORDER_RADIUS[16],
  duration: 2500,
  messageStyle: {
    ...Body_16M,
    color: COLORS.white,
    textAlign: 'left' as const,
  },
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
