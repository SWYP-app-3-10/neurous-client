/**
 * 소셜 로그인 화면 (LoginScreen.tsx)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RouteNames } from '../../../routes';
import { OnboardingStackParamList } from '../../navigation/types';
import { COLORS, scaleWidth } from '../../styles/global';
import { Body_16SB, Heading_16B } from '../../styles/typography';
import {
  signInWithSocial,
  initializeGoogleSignIn,
  initializeNaverLogin,
  SocialLoginProvider,
} from '../../services/socialLoginService';
import {
  getRecentLogin,
  RecentLoginInfo,
} from '../../services/authStorageService';
import { useShowModal } from '../../store/modalStore';
import { useCompleteOnboarding } from '../../store/onboardingStore';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { useTrackingPermission } from '../../hooks/useTrackingPermission';

import Spacer from '../../components/Spacer';
import { SocialLoginButton } from '../../components';
import { LoginBackground } from '../../icons/commonIcons/simpleImages';
import { logEvent, logScreenView } from '../../services/analyticsService';
import { updateNotificationStatus } from '../../api/notificationApi';
import { getUserInfo } from '../../services/authService';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;
type LoginRouteProp = RouteProp<
  OnboardingStackParamList,
  typeof RouteNames.SOCIAL_LOGIN
>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LoginRouteProp>();

  // ──────────────────────────────────────────────
  // State & Refs
  // ──────────────────────────────────────────────

  const [loading, setLoading] = useState<SocialLoginProvider | null>(null);
  const socialLoginInProgressRef = useRef(false);
  const pendingProviderRef = useRef<SocialLoginProvider | null>(null);
  const [recentLogin, setRecentLogin] = useState<RecentLoginInfo | null>(null);
  const trackingModalShownRef = useRef<boolean>(false);
  const waitingForSettingsRef = useRef<{
    isWaiting: boolean;
    isExistingUser?: boolean;
  }>({ isWaiting: false });

  // ──────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────

  const showModal = useShowModal();
  const completeOnboarding = useCompleteOnboarding();

  const {
    checkPermission: checkNotiPermission,
    requestPermission: requestNotiPermission,
  } = useNotificationPermission({
    onSettingsOpened: () => {
      waitingForSettingsRef.current.isWaiting = true;
      console.log(
        '[LoginScreen] 설정 화면으로 이동 - 기존 사용자 여부:',
        waitingForSettingsRef.current.isExistingUser,
      );
    },
    onCancel: () => {
      console.log('[LoginScreen] 알림 권한 Alert 취소');
      waitingForSettingsRef.current.isWaiting = false;
    },
  });

  const {
    checkPermission: checkTrackingPermission,
    requestPermission: requestTrackingPermission,
  } = useTrackingPermission();

  // ──────────────────────────────────────────────
  // Effect 1: 설정 화면 복귀 감지 (알림 권한)
  // ──────────────────────────────────────────────

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async nextAppState => {
        if (
          nextAppState === 'active' &&
          waitingForSettingsRef.current.isWaiting
        ) {
          const { isExistingUser } = waitingForSettingsRef.current;
          waitingForSettingsRef.current = { isWaiting: false };

          // 알림 수신 설정 서버 동기화 (백그라운드 — 화면 전환 블로킹 없음)
          getUserInfo()
            .then(async userInfo => {
              if (userInfo?.userId) {
                const shouldShowModal = await checkNotiPermission();
                await updateNotificationStatus(
                  userInfo.userId,
                  !shouldShowModal,
                );
              }
            })
            .catch(() => console.warn('[AppState] 알림 수신 설정 동기화 실패'));

          if (isExistingUser) {
            await completeOnboarding();
          } else {
            navigation.navigate(RouteNames.INTRO_CARDLIST);
          }
        }
      },
    );

    return () => subscription.remove();
  }, [navigation, completeOnboarding, checkNotiPermission]);

  // ──────────────────────────────────────────────
  // Effect 2: 소셜 로그인 SDK 초기화
  // ──────────────────────────────────────────────

  useEffect(() => {
    const initSocialLogin = async () => {
      try {
        initializeGoogleSignIn();
        initializeNaverLogin();
      } catch (error) {
        console.warn('소셜 로그인 초기화 중 오류:', error);
      }
    };

    const loadRecentLogin = async () => {
      const recent = await getRecentLogin();
      console.log('[LoginScreen] recentLogin:', JSON.stringify(recent));
      setRecentLogin(recent);
    };

    const timer = setTimeout(() => {
      initSocialLogin();
      loadRecentLogin();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ──────────────────────────────────────────────
  // 핸들러: iOS 추적 권한(ATT) 모달
  // ──────────────────────────────────────────────

  const handleTrackingModal = useCallback(async () => {
    if (Platform.OS !== 'ios') return;

    if (trackingModalShownRef.current) {
      console.log(
        '[handleTrackingModal] 이미 모달이 표시되었습니다. 중복 호출 방지',
      );
      return;
    }

    console.log('[handleTrackingModal] iOS 추적 권한 체크 시작');
    try {
      const hasPermission = await checkTrackingPermission();

      if (!hasPermission) {
        console.log(
          '[handleTrackingModal] 권한 요청 시도 - 네이티브 ATT 모달 표시',
        );
        trackingModalShownRef.current = true;
        await requestTrackingPermission();
        console.log('[handleTrackingModal] ATT 모달 닫힘');
      } else {
        console.log('[handleTrackingModal] 이미 권한이 허용되어 있습니다.');
        trackingModalShownRef.current = true;
      }
    } catch (error) {
      console.warn('추적 권한 처리 중 오류 (무시하고 진행):', error);
      trackingModalShownRef.current = false;
    }
  }, [checkTrackingPermission, requestTrackingPermission]);

  // ──────────────────────────────────────────────
  // 핸들러: 알림 권한 모달
  // ──────────────────────────────────────────────

  const handleNotificationModal = useCallback(
    async (isExistingUser = false) => {
      waitingForSettingsRef.current.isExistingUser = isExistingUser;

      const proceedNext = async () => {
        if (isExistingUser) {
          await completeOnboarding();
        } else {
          navigation.navigate(RouteNames.INTRO_CARDLIST);
        }
      };

      /**
       * 알림 수신 설정을 서버에 동기화한 뒤 다음 화면으로 이동한다.
       *
       * updateNotificationStatus는 fire-and-forget으로 처리한다.
       * 서버 응답을 기다리지 않고 즉시 화면 전환을 진행하여
       * 로그인 체감 속도를 개선한다.
       */
      const syncAndProceed = async () => {
        // 서버 동기화 (백그라운드 — 화면 전환 블로킹 없음)
        getUserInfo()
          .then(async userInfo => {
            if (userInfo?.userId) {
              const shouldShowModal = await checkNotiPermission();
              await updateNotificationStatus(userInfo.userId, !shouldShowModal);
            }
          })
          .catch(() =>
            console.warn(
              '[handleNotificationModal] 알림 수신 설정 동기화 실패',
            ),
          );

        await proceedNext();
      };

      try {
        const shouldShowModal = await checkNotiPermission();

        if (shouldShowModal) {
          logScreenView('Popup_App_Notification', undefined, true);
          showModal({
            title: '알림을 받으시겠어요?',
            description:
              '알림을 켜두면, 하루 두 번 문해력 루틴을 \n잊지 않고 챙길 수 있어요!',
            descriptionColor: COLORS.gray600,
            primaryButton: {
              title: '알림 받을래요',
              textStyle: { ...Heading_16B, color: COLORS.white },
              onPress: async () => {
                waitingForSettingsRef.current.isWaiting = false;

                const granted = await requestNotiPermission();

                if (!granted && waitingForSettingsRef.current.isWaiting) {
                  return;
                }

                console.log(
                  '[LoginScreen] 권한 허용 또는 취소 - syncAndProceed 호출',
                );
                await syncAndProceed();
                logEvent('EnableNotifications_Popup_App_Notification');
              },
            },
            secondaryButton: {
              title: '괜찮아요',
              variant: 'outline',
              textStyle: { color: COLORS.gray700, ...Heading_16B },
              style: { borderColor: COLORS.gray300, height: scaleWidth(48) },
              onPress: async () => {
                await syncAndProceed();
                logEvent('Dismiss_Popup_App_Notification');
              },
            },
          });
        } else {
          await syncAndProceed();
        }
      } catch (error) {
        console.error('알림 권한 로직 오류:', error);
        await syncAndProceed();
      }
    },
    [
      checkNotiPermission,
      requestNotiPermission,
      showModal,
      completeOnboarding,
      navigation,
    ],
  );

  // ──────────────────────────────────────────────
  // 핸들러: 소셜 로그인
  // ──────────────────────────────────────────────

  const handleSocialLogin = useCallback(
    async (provider: SocialLoginProvider) => {
      if (socialLoginInProgressRef.current) {
        console.log('[Login] duplicated login blocked:', provider);
        return;
      }

      socialLoginInProgressRef.current = true;

      console.log('[Login] handleSocialLogin called:', provider);

      try {
        if (Platform.OS === 'ios') {
          await handleTrackingModal();
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        setLoading(provider);

        const result = await signInWithSocial(provider);

        if (!result) {
          console.error('[LoginScreen] 로그인 결과가 undefined입니다.');
          return;
        }

        console.log('[LoginScreen] 로그인 결과:', {
          success: result.success,
          newUser: result.newUser,
          hasError: !!result.error,
        });

        if (result.success && result.userInfo) {
          if (result.newUser === false) {
            await handleNotificationModal(true);
          } else {
            await handleNotificationModal(false);
          }
          return;
        }

        if (result.error) {
          if (!result.error.includes('취소')) {
            Alert.alert('로그인 실패', result.error);
          } else {
            console.log('로그인이 취소되었습니다.');
          }
        }
      } catch (error: any) {
        console.error('[LoginScreen] 로그인 치명적 에러:', error);
        Alert.alert('오류', '로그인 중 알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(null);
        socialLoginInProgressRef.current = false;
      }
    },
    [handleTrackingModal, handleNotificationModal],
  );

  // ──────────────────────────────────────────────
  // Effect 3: 약관 동의 화면 복귀 시 로그인 트리거
  // ──────────────────────────────────────────────

  useEffect(() => {
    const agreedProvider = route.params?.agreedProvider;
    if (!agreedProvider) return;

    pendingProviderRef.current = agreedProvider as SocialLoginProvider;
    navigation.setParams({ agreedProvider: undefined });
  }, [route.params?.agreedProvider, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('transitionEnd', () => {
      const provider = pendingProviderRef.current;
      if (!provider) return;
      pendingProviderRef.current = null;
      handleSocialLogin(provider);
    });
    return () => unsubscribe();
  }, [navigation, handleSocialLogin]);

  // ──────────────────────────────────────────────
  // UI 핸들러: 약관 동의 화면으로 이동
  // ──────────────────────────────────────────────

  const goTermsAgreement = (provider: SocialLoginProvider) => {
    navigation.navigate(RouteNames.TERMS_AGREEMENT, {
      provider,
    });
  };

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <LoginBackground style={styles.backgroundImage} />
      </View>

      <View style={styles.content}>
        <Text style={styles.logoText}>일상의 틈, 부담 없이 이어가는 읽기</Text>

        <View style={styles.buttonContainer}>
          <SocialLoginButton
            provider="KAKAO"
            onPress={() => {
              goTermsAgreement('KAKAO');
              logEvent('Kakao_Login_Onboarding_SocialLogin');
            }}
            loading={loading}
            recentLogin={recentLogin}
          />
          <SocialLoginButton
            provider="GOOGLE"
            onPress={() => {
              goTermsAgreement('GOOGLE');
              logEvent('Google_Login_Onboarding_SocialLogin');
            }}
            loading={loading}
            recentLogin={recentLogin}
          />
          <SocialLoginButton
            provider="NAVER"
            onPress={() => {
              goTermsAgreement('NAVER');
              logEvent('NAVER_Login_Onboarding_SocialLogin');
            }}
            loading={loading}
            recentLogin={recentLogin}
          />
          {Platform.OS === 'ios' && (
            <SocialLoginButton
              provider="APPLE"
              onPress={() => {
                goTermsAgreement('APPLE');
                logEvent('apple_Login_Onboarding_SocialLogin');
              }}
              loading={loading}
              recentLogin={recentLogin}
            />
          )}
        </View>
      </View>
      <Spacer num={52} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.puple.main,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    zIndex: 1,
  },
  logoText: {
    ...Body_16SB,
    color: COLORS.puple.main,
  },
  buttonContainer: {
    width: '100%',
    gap: scaleWidth(12),
    flex: 1,
    justifyContent: 'flex-end',
  },
});

export default LoginScreen;
