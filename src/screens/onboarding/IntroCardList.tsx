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
import { Intro_CardList } from '../../icons/commonIcons/simpleImages';
import { logEvent } from '../../services/analyticsService';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const IntroCardList = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: scaleWidth(20) }}>
          <Spacer num={48} />
          <Text style={[Heading_24EB_Round, { color: COLORS.black }]}>
            미션을 확인하고 관심 있는
            {'\n'}분야의 글을 읽어보세요
          </Text>
          <Spacer num={20} />
          <Text style={[Body_15M, { color: COLORS.gray600 }]}>
            관심 있는 분야의 글을 추천받고, 오늘의 미션을
            {'\n'}수행하며 경험치와 포인트를 모아보세요
          </Text>
          <Spacer num={47} />
        </View>
        <View
          style={{
            paddingHorizontal: scaleWidth(41),
          }}
        >
          <Intro_CardList />
          <Spacer num={69} />

          <ActivityIndicator activeIndex={0} />
        </View>
      </View>
      <TouchableOpacity
        style={{
          height: scaleWidth(56),
          borderRadius: BORDER_RADIUS[16],
          backgroundColor: COLORS.puple.main,
          marginHorizontal: scaleWidth(20),
        }}
        onPress={() => {
          navigation.navigate(RouteNames.INTRO_FUNCTION);
          logEvent('Next_Onboarding_Function01_CardList');
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
  content: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(40),
    paddingBottom: scaleWidth(40),
  },
  imagePlaceholder: {
    width: '100%',
    height: scaleWidth(300),
    backgroundColor: COLORS.grayLight,
    borderRadius: scaleWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleWidth(20),
  },
  textPlaceholder: {
    width: '100%',
    height: scaleWidth(80),
    backgroundColor: COLORS.grayLight,
    borderRadius: scaleWidth(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleWidth(40),
  },
  placeholderText: {
    color: COLORS.gray600,
    fontSize: scaleWidth(14),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleWidth(40),
    gap: scaleWidth(8),
  },
  dot: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
    backgroundColor: COLORS.grayMedium,
  },
  activeDot: {
    backgroundColor: COLORS.onboardingPurple,
    width: scaleWidth(24),
  },
  button: {
    width: '100%',
    height: scaleWidth(56),
    backgroundColor: COLORS.onboardingGreen,
    borderRadius: scaleWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButton: {
    width: '100%',
    height: scaleWidth(56),
    backgroundColor: COLORS.grayLight,
    borderRadius: scaleWidth(12),
  },
  buttonText: {
    color: COLORS.white,
    fontSize: scaleWidth(16),
    fontWeight: '600',
  },
});

export default IntroCardList;
