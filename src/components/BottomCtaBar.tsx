import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS, scaleWidth } from '../styles/global';

interface BottomCtaBarProps {
  /** 컨테이너 안에 들어갈 CTA 버튼 */
  children: React.ReactNode;
  /** 화면별로 여백 등을 덮어써야 할 때 사용 */
  style?: StyleProp<ViewStyle>;
}

/**
 * 하단 CTA 네비게이션 공통 컨테이너.
 * - 화면 하단 CTA 버튼을 감싸며, 좌우/상하 여백과 배경을 한 곳에서 관리한다.
 * - 상단 스트로크가 없는 형태가 기본이다.
 *   (글 상세 CTA, 하단 탭바는 상단 스트로크가 필요해 이 컴포넌트를 사용하지 않는다.)
 */
/**
 * CTA 컨테이너 여백 값
 * - 컨테이너 밖(예: CTA 위에 띄우는 토스트 위치 계산)에서도 같은 값을 쓰도록 export한다.
 */
export const BOTTOM_CTA_PADDING = {
  // TODO(QA): Figma CTA 네비게이션(node 2-4003) 기준 상하/좌우 padding 값 확인 필요 (현재 글 상세 CTA 여백 기준 임시값)
  horizontal: scaleWidth(20),
  top: scaleWidth(12),
  bottom: scaleWidth(8),
};

const BottomCtaBar: React.FC<BottomCtaBarProps> = ({ children, style }) => {
  return <View style={[styles.container, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: BOTTOM_CTA_PADDING.horizontal,
    paddingTop: BOTTOM_CTA_PADDING.top,
    paddingBottom: BOTTOM_CTA_PADDING.bottom,
    backgroundColor: COLORS.white,
  },
});

export default BottomCtaBar;
