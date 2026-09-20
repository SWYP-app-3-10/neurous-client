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
const BottomCtaBar: React.FC<BottomCtaBarProps> = ({ children, style }) => {
  return <View style={[styles.container, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    // TODO(QA): Figma CTA 네비게이션(node 2-4003) 기준 상하/좌우 padding 값 확인 필요 (현재 글 상세 CTA 여백 기준 임시값)
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(12),
    paddingBottom: scaleWidth(8),
    backgroundColor: COLORS.white,
  },
});

export default BottomCtaBar;
