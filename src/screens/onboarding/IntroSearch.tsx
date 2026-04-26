/**
 * 온보딩 인트로 3 - 탐색 소개 화면 (IntroSearch.tsx)
 *
 * 온보딩 인트로의 세 번째이자 마지막 화면으로,
 * 다양한 주제의 글을 탐색하는 기능을 소개한다.
 *
 * 주요 기능:
 *   - 글 탐색 기능 안내
 *   - 진행 상태 표시 (3/3)
 *   - 관심분야 선택 화면으로 이동
 *
 * 처리 흐름:
 *   IntroCardList → IntroFunction → IntroSearch (현재) → Interests → Difficulty → Main
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteNames } from '../../../routes';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../styles/global';
import { OnboardingStackParamList } from '../../navigation/types';
import Header from '../../components/Header';
import Spacer from '../../components/Spacer';
import ActivityIndicator from '../../components/ActivityIndicator';
import {
  Body_15M,
  Heading_18EB_Round,
  Heading_24EB_Round,
} from '../../styles/typography';
import { Intro_Search } from '../../icons/commonIcons/simpleImages';
import { logEvent } from '../../services/analyticsService';
import { useOnboardingStore } from '../../store/onboardingStore';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const IntroSearch = () => {
  const navigation = useNavigation<NavigationProp>();
  const setOnboardingStep = useOnboardingStore(
    state => state.setOnboardingStep,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 뒤로가기 버튼 */}
      <Header />

      <View style={{ flex: 1 }}>
        {/* 제목 및 설명 */}
        <View style={{ paddingHorizontal: scaleWidth(20) }}>
          <Text style={[Heading_24EB_Round, { color: COLORS.black }]}>
            다양한 주제의 글을 탐색하며
            {'\n'}낯선 글에 도전해보세요
          </Text>
          <Spacer num={20} />
          <Text style={[Body_15M, { color: COLORS.gray600 }]}>
            관심 있는 주제부터 새로운 분야까지,
            {'\n'}다양한 글을 탐색해보세요
          </Text>
          <Spacer num={86} />
        </View>

        {/* 일러스트레이션 및 진행 상태 */}
        <View
          style={{
            paddingHorizontal: scaleWidth(41),
          }}
        >
          <Intro_Search />
          <Spacer num={124} />
          {/* 진행 상태: 3/3 */}
          <ActivityIndicator activeIndex={2} />
        </View>
      </View>

      {/* 다음 버튼 */}
      <TouchableOpacity
        style={{
          height: scaleWidth(56),
          borderRadius: BORDER_RADIUS[16],
          backgroundColor: COLORS.puple.main,
          marginHorizontal: scaleWidth(20),
        }}
        onPress={async () => {
          // 온보딩 단계를 'interests'로 설정하고 관심분야 선택 화면으로 이동
          await setOnboardingStep('interests');
          navigation.navigate(RouteNames.INTERESTS, {});
          logEvent('Next_Onboarding_Function03_Explore');
        }}
      >
        <Text style={[Heading_18EB_Round, { color: COLORS.white }]}>다음</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
});

export default IntroSearch;
