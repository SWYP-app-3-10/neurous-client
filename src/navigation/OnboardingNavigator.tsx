import React, { useEffect, useRef, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteNames } from '../../routes';
import { OnboardingStackParamList } from './types';
import LoginScreen from '../screens/auth/LoginScreen';
import InterestsScreen from '../screens/onboarding/InterestsScreen';
import DifficultySettingScreen from '../screens/onboarding/DifficultySettingScreen';
import IntroSlidesScreen from '../screens/onboarding/IntroSlideScreen';
import { useOnboardingStore } from '../store/onboardingStore';
import TermsOfServiceScreen from '../screens/myPage/TermOfServiceScreen';
import PrivacyPolicyScreen from '../screens/myPage/PrivacyPolicyScreen';
import TermsAgreementScreen from '../screens/onboarding/TermsAgreementScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

type OnboardingNavigationProp =
  NativeStackNavigationProp<OnboardingStackParamList>;

/**
 * 온보딩 네비게이터
 *
 * 신규 사용자의 온보딩 플로우를 관리한다.
 *
 * 화면 구성:
 *   1. 소셜 로그인 (SOCIAL_LOGIN)
 *   2. 약관 동의 (TERMS_AGREEMENT)
 *   3. 온보딩 인트로 3개 (INTRO_CARDLIST → INTRO_FUNCTION → INTRO_SEARCH)
 *   4. 관심분야 선택 (INTERESTS)
 *   5. 난이도 설정 (DIFFICULTY_SETTING)
 *
 * currentStep 상태에 따라 초기 화면이 자동으로 결정된다.
 */
const OnboardingNavigator = () => {
  const currentStep = useOnboardingStore(state => state.currentStep);
  const navigation = useNavigation<OnboardingNavigationProp>();
  const prevStepRef = useRef<typeof currentStep>(currentStep);

  /**
   * 현재 온보딩 단계에 따라 초기 화면을 결정한다.
   *
   * - login: 소셜 로그인 화면
   * - interests/difficulty: 관심분야 화면 (난이도 단계에서도 관심분야 확인 가능)
   * - completed: RootNavigator에서 메인 화면으로 전환 처리
   */
  const getInitialRouteName = useCallback(() => {
    switch (currentStep) {
      case 'interests':
      case 'difficulty':
        return RouteNames.INTERESTS;
      case 'completed':
        return RouteNames.INTERESTS;
      case 'login':
      default:
        return RouteNames.SOCIAL_LOGIN;
    }
  }, [currentStep]);

  /**
   * currentStep 변경 시 네비게이션 상태를 업데이트한다.
   *
   * 온보딩 단계가 변경되면 해당하는 화면으로 자동 이동한다.
   * 이미 목표 화면에 있는 경우 네비게이션을 수행하지 않는다.
   */
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      const targetRoute = getInitialRouteName();
      const state = navigation.getState();
      const currentRoute = state?.routes?.[state?.index || 0]?.name;

      if (currentRoute !== targetRoute) {
        navigation.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
      }
      prevStepRef.current = currentStep;
    }
  }, [currentStep, navigation, getInitialRouteName]);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={getInitialRouteName()}
    >
      {/* 온보딩 인트로 화면들 */}
      <Stack.Screen
        name={RouteNames.INTRO_CARDLIST}
        component={IntroSlidesScreen}
      />

      {/* 로그인 및 약관 화면 */}
      <Stack.Screen name={RouteNames.SOCIAL_LOGIN} component={LoginScreen} />
      <Stack.Screen
        name={RouteNames.TERMS_AGREEMENT}
        component={TermsAgreementScreen}
      />

      {/* 온보딩 설정 화면들 */}
      <Stack.Screen name={RouteNames.INTERESTS} component={InterestsScreen} />
      <Stack.Screen
        name={RouteNames.DIFFICULTY_SETTING}
        component={DifficultySettingScreen}
      />

      {/* 약관 상세 화면 */}
      <Stack.Screen
        name={RouteNames.TERMS_OF_SERVICE}
        component={TermsOfServiceScreen}
      />
      <Stack.Screen
        name={RouteNames.PRIVACY_POLICY}
        component={PrivacyPolicyScreen}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
