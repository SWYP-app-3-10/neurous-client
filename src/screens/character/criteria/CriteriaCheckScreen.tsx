// CriteriaCheckScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LevelCriteriaScreen from './level/LevelCriteriaScreen';
import PointCriteriaScreen from './expAndPoint/PointCriteriaScreen';
import Header from '../../../components/Header';

// 공통 디자인 시스템
import { COLORS, BORDER_RADIUS, scaleWidth } from '../../../styles/global';
import { Body_16SB, Heading_16B } from '../../../styles/typography';
import { logEvent } from '../../../services/analyticsService';
import { trackEvent } from '../../../services/mixpanelService';

/** 상단 세그먼트 탭 키 */
type TabKey = 'LEVEL' | 'POINT';

/**
 * CriteriaCheckScreen
 *
 * - "기준 확인하기" 진입 화면
 * - 상단: 공통 Header (뒤로가기 아이콘 + 타이틀)
 * - 중단: 세그먼트 탭(레벨 / 경험치·포인트)
 * - 하단: 탭에 따라 LevelCriteriaScreen 또는 PointCriteriaScreen 렌더링
 */
const CriteriaCheckScreen = () => {
  /** 현재 선택된 탭 상태 */
  const [tab, setTab] = useState<TabKey>('LEVEL');

  /**
   * Mixpanel: 성장 가이드 화면 진입 (탭 변경 시에도 발생)
   *
   * tab 값 매핑: LEVEL → level (레벨 가이드), POINT → xp_point (경험치·포인트 가이드)
   */
  useEffect(() => {
    trackEvent('growth_guide_view', {
      tab: tab === 'LEVEL' ? 'level' : 'xp_point',
    });
  }, [tab]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 공통 헤더 */}
      <Header
        title="기준 확인하기"
        backEventName={
          tab === 'LEVEL'
            ? 'Back_ConfirmStandard_Level'
            : 'Back_ConfirmStandard_Xp_P'
        }
      />

      {/* 세그먼트 탭 */}
      <View style={styles.segmentWrap}>
        {/* 레벨 탭 */}
        <Pressable
          onPress={() => {
            setTab('LEVEL');
            logEvent('Level_ConfirmLevelStandard');
          }}
          style={[
            styles.segmentBtn,
            tab === 'LEVEL' && styles.segmentBtnActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              tab === 'LEVEL' && styles.segmentTextActive,
            ]}
          >
            레벨
          </Text>
        </Pressable>

        {/* 경험치 / 포인트 탭 */}
        <Pressable
          onPress={() => {
            setTab('POINT');
            logEvent('XpP_ConfirmLevelStandard');
          }}
          style={[
            styles.segmentBtn,
            tab === 'POINT' && styles.segmentBtnActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              tab === 'POINT' && styles.segmentTextActive,
            ]}
          >
            경험치 / 포인트
          </Text>
        </Pressable>
      </View>

      {/* 탭별 콘텐츠 영역 */}
      <View style={styles.body}>
        {tab === 'LEVEL' ? <LevelCriteriaScreen /> : <PointCriteriaScreen />}
      </View>
    </SafeAreaView>
  );
};

export default CriteriaCheckScreen;

const styles = StyleSheet.create({
  // 화면 전체 컨테이너
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingBottom: scaleWidth(48),
  },

  // 헤더 래퍼
  headerWrap: {
    position: 'relative', // 중앙 타이틀 오버레이 기준
  },

  // 헤더 중앙 타이틀 오버레이 래퍼
  headerCenterTitleWrap: {
    position: 'absolute', // 헤더 위에 덮기
    left: 0, // 좌측 기준
    right: 0, // 우측 기준
    top: scaleWidth(8), // Header의 marginTop(8)과 맞춤
    height: scaleWidth(52), // Header 높이와 맞춤
    alignItems: 'center', // 가로 중앙
    justifyContent: 'center', // 세로 중앙
  },

  // 헤더 중앙 타이틀 텍스트
  headerCenterTitle: {
    ...Heading_16B, // 타이틀 타이포
    color: COLORS.black, // 타이틀 색상
  },

  // 세그먼트 탭 래퍼
  segmentWrap: {
    marginHorizontal: scaleWidth(20),
    marginTop: scaleWidth(8),
    height: scaleWidth(52),
    borderRadius: BORDER_RADIUS[12],
    backgroundColor: COLORS.gray100,
    flexDirection: 'row',
    padding: scaleWidth(8),
  },

  // 세그먼트 버튼
  segmentBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS[10] ?? scaleWidth(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 활성화된 세그먼트 버튼
  segmentBtnActive: {
    backgroundColor: COLORS.white,
  },

  // 세그먼트 텍스트
  segmentText: {
    ...Body_16SB,
    color: COLORS.gray500,
  },

  // 활성 세그먼트 텍스트
  segmentTextActive: {
    color: COLORS.black,
  },

  // 하단 콘텐츠 영역
  body: {
    flex: 1,
    marginTop: scaleWidth(0),
  },
});
