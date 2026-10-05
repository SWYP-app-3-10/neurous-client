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
};

/** 팝업 하단 버튼 높이 */
export const POPUP_BUTTON_HEIGHT = scaleWidth(48);

/** 팝업 내부 여백 */
export const POPUP_PADDING = {
  horizontal: scaleWidth(20),
  bottom: scaleWidth(24),
};
