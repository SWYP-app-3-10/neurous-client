import { ComponentProps } from 'react';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../styles/global';
import { Body_16M } from '../styles/typography';
import ToastModal from './ToastModal';

/** showToastModal에 펼쳐서(spread) 사용하는 토스트 스타일 프리셋 타입 */
export type ToastPreset = Omit<
  ComponentProps<typeof ToastModal>,
  'visible' | 'message' | 'onClose'
>;

/**
 * 완료 토스트 (아이콘 + 문구, 알약 모양)
 * - 난이도 설정 완료, 문의 전달 완료 등 "처리 완료" 안내에 공통으로 사용한다.
 * - 사용 예: showToastModal({ ...SUCCESS_TOAST_PRESET, message, icon: <LevelChangeCheckIcon /> })
 */
export const SUCCESS_TOAST_PRESET: ToastPreset = {
  position: 'bottom',
  // TODO(QA): Figma 난이도 변경 토스트(node 2-2560) 기준 좌우 margin, padding, radius 값 확인 필요
  marginHorizontal: scaleWidth(20),
  paddingHorizontal: scaleWidth(20),
  paddingVertical: scaleWidth(14),
  borderRadius: BORDER_RADIUS[99],
  duration: 2000,
};

/**
 * 안내 토스트 (문구만, 둥근 사각형)
 * - 최대 선택 개수 안내, 열람권 사용 안내 등 텍스트만 보여주는 토스트에 공통으로 사용한다.
 * - 하단 위치(bottomOffset)는 화면마다 CTA 유무가 달라 호출부에서 지정한다.
 */
export const NOTICE_TOAST_PRESET: ToastPreset = {
  position: 'bottom',
  backgroundColor: COLORS.gray800,
  // TODO(QA): Figma 텍스트 토스트 기준 좌우 margin, padding, radius 값 확인 필요
  marginHorizontal: scaleWidth(20),
  paddingHorizontal: scaleWidth(20),
  paddingVertical: scaleWidth(14),
  borderRadius: BORDER_RADIUS[16],
  messageStyle: {
    ...Body_16M,
    color: COLORS.white,
    textAlign: 'left',
  },
};
