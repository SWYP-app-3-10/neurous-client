import { scaleWidth } from './global';
import { Caption_14R } from './typography';

/**
 * 팝업(모달) 공통 스타일 값
 * - NotificationModal, LevelSuggestionModal 등 모든 팝업 컴포넌트가 같은 값을 쓰도록 한 곳에서 관리한다.
 * - 디자인 QA로 수치가 바뀌면 이 파일만 수정하면 전체 팝업에 반영된다.
 */

/** 팝업 서브 설명 텍스트 (제목 아래 설명 문구) */
export const POPUP_DESCRIPTION_TEXT = {
  ...Caption_14R,
  // TODO(QA): Figma 팝업(Modal_Account_Confirm) 기준 서브 설명 행간(lineHeight) 값 확인 필요 (현재 14px * 150% 임시값)
  lineHeight: scaleWidth(21),
  // TODO(QA): Figma 팝업(Modal_Account_Confirm) 기준 서브 설명 자간(letterSpacing) 값 확인 필요
  letterSpacing: 0,
};

/** 팝업 하단 버튼 높이 */
// TODO(QA): Figma 팝업(Modal_Account_Confirm) 기준 버튼 높이 값 확인 필요
export const POPUP_BUTTON_HEIGHT = scaleWidth(48);

/** 팝업 내부 여백 */
export const POPUP_PADDING = {
  // TODO(QA): Figma 팝업(Modal_Account_Confirm) 기준 좌우 padding 값 확인 필요
  horizontal: scaleWidth(24),
  // TODO(QA): Figma 팝업(Modal_Account_Confirm) 기준 하단 padding 값 확인 필요
  bottom: scaleWidth(24),
};
