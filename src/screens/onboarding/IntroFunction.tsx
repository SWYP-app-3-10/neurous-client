import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteNames } from '../../../routes';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../styles/global';
import { OnboardingStackParamList } from '../../navigation/types';
import Spacer from '../../components/Spacer';
import ActivityIndicator from '../../components/ActivityIndicator';
import {
  Body_15M,
  Heading_18EB_Round,
  Heading_24EB_Round,
} from '../../styles/typography';
import { Intro_Fuction } from '../../icons/commonIcons/simpleImages';
import { logEvent } from '../../services/analyticsService';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

/** 온보딩 인트로 2/3 - 캐릭터 성장 소개 */

const IntroFuction = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrapper}>
        {/* 제목 및 설명 영역 */}
        <View style={styles.textSection}>
          <Spacer num={scaleWidth(48)} />
          <Text style={[Heading_24EB_Round, { color: COLORS.black }]}>
            레벨업하며 성장하는
            {'\n'}캐릭터를 확인해보세요
          </Text>
          <Spacer num={scaleWidth(20)} />
          <Text style={[Body_15M, { color: COLORS.gray600 }]}>
            활동을 통해 경험치를 모으면 레벨이 오르고 {'\n'} 새로운 캐릭터를
            만날 수 있어요
          </Text>
          <Spacer num={scaleWidth(47)} />
        </View>

        {/* 일러스트레이션 및 진행 상태 영역 */}
        <View style={styles.illustrationSection}>
          <Intro_Fuction />
          <Spacer num={scaleWidth(70)} />
          <ActivityIndicator activeIndex={1} />
        </View>
      </View>

      {/* 다음 버튼 */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate(RouteNames.INTRO_SEARCH);
          logEvent('Next_Onboarding_Function02_Character');
        }}
      >
        <Text style={[Heading_18EB_Round, { color: COLORS.white }]}>다음</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /** 전체 컨테이너 */
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  /** 콘텐츠 영역 */
  contentWrapper: {
    flex: 1,
  },

  /** 제목 및 설명 영역 */
  textSection: {
    paddingHorizontal: scaleWidth(20),
  },

  /** 일러스트레이션 영역 (가운데 정렬) */
  illustrationSection: {
    alignItems: 'center',
  },

  /** 다음 버튼 - 화면 하단 고정 */
  button: {
    height: scaleWidth(56),
    borderRadius: BORDER_RADIUS[16],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.puple.main,
    marginHorizontal: scaleWidth(20),
  },
});

export default IntroFuction;
