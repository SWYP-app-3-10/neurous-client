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
import { Intro_Fuction } from '../../icons/commonIcons/simpleImages';
import { logEvent } from '../../services/analyticsService';
type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const IntroFuction = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        <Header />
        <View style={{ paddingHorizontal: scaleWidth(20) }}>
          <Text style={[Heading_24EB_Round, { color: COLORS.black }]}>
            레벨업하며 성장하는
            {'\n'}캐릭터를 확인해보세요
          </Text>
          <Spacer num={20} />
          <Text style={[Body_15M, { color: COLORS.gray600 }]}>
            활동을 통해 경험치를 모으면 레벨이 오르고 새 {'\n'}로운 캐릭터를
            만날 수 있어요
          </Text>
          <Spacer num={47} />
        </View>

        <View
          style={{
            paddingHorizontal: scaleWidth(41),
          }}
        >
          <Intro_Fuction />
          <Spacer num={69} />
          <ActivityIndicator activeIndex={1} />
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

export default IntroFuction;
