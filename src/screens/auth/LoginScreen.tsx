/**
 * 소셜 로그인 화면 (LoginScreen.tsx)
 *
 * 앱의 첫 진입점으로, 사용자가 소셜 계정으로 로그인할 수 있는 화면이다.
 *
 * 주요 기능:
 *   1. 소셜 로그인 (Google, Kakao, Naver, Apple)
 *   2. iOS 추적 권한(ATT) 요청
 *   3. 알림 권한 요청
 *   4. 신규/기존 사용자 구분 및 적절한 화면으로 이동
 *
 * 처리 흐름:
 *   [신규 사용자]
 *   약관 동의 → 소셜 로그인 → ATT 권한 → 알림 권한 → 온보딩 인트로 3개 → 관심분야 선택 → 난이도 선택 → 메인 화면
 *
 *   [기존 사용자]
 *   약관 동의 → 소셜 로그인 → ATT 권한 → 알림 권한 → 메인 화면
 *
 * 복잡도 이유:
 *   - iOS ATT 모달과 소셜 로그인 창의 충돌 방지 (0.5초 대기)
 *   - 알림 권한의 "설정으로 이동" 후 돌아올 때 AppState 감지 필요
 *   - 신규/기존 사용자에 따라 다른 화면 전환 로직
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

  /** 현재 로그인 중인 소셜 제공자 (로딩 스피너 표시용) */
  const [loading, setLoading] = useState<SocialLoginProvider | null>(null);

  /** 소셜 로그인 중복 실행 방지 */
  const socialLoginInProgressRef = useRef(false);

  /** 약관 동의 후 대기 중인 로그인 제공자 */
  const pendingProviderRef = useRef<SocialLoginProvider | null>(null);

  /** 최근 로그인 정보 (최근 사용한 로그인 방법 표시용) */
  const [recentLogin, setRecentLogin] = useState<RecentLoginInfo | null>(null);

  /**
   * iOS ATT 모달 중복 호출 방지 플래그
   *
   * ATT 모달은 한 번만 표시되어야 하며,
   * 사용자가 거부하거나 허용한 경우 다시 표시되지 않도록 한다.
   */
  const trackingModalShownRef = useRef<boolean>(false);

  /**
   * 알림 권한 설정 화면 이동 추적 ref
   *
   * - isWaiting: 설정 화면으로 이동했는지 여부 (AppState 감지용)
   * - isExistingUser: 기존 사용자인지 신규 사용자인지 (설정 복귀 후 화면 전환용)
   *
   * Alert의 "설정으로 이동" 버튼을 누르면 onSettingsOpened가 호출되어
   * isWaiting이 true로 설정되고, AppState가 'active'로 변경될 때
   * 설정에서 돌아온 것으로 판단하여 적절한 화면으로 이동한다.
   */
  const waitingForSettingsRef = useRef<{
    isWaiting: boolean;
    isExistingUser?: boolean;
  }>({ isWaiting: false });

  // ──────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────

  const showModal = useShowModal();
  const completeOnboarding = useCompleteOnboarding();

  /**
   * 알림 권한 관리 훅
   *
   * - onSettingsOpened: Alert의 "설정으로 이동" 버튼 클릭 시 호출
   * - onCancel: Alert의 "취소" 버튼 클릭 시 호출
   */
  const {
    checkPermission: checkNotiPermission,
    requestPermission: requestNotiPermission,
  } = useNotificationPermission({
    onSettingsOpened: () => {
      waitingForSettingsRef.current.isWaiting = true;
      console.log(
        '[LoginScreen] ✅ 설정 화면으로 이동 - 기존 사용자 여부:',
        waitingForSettingsRef.current.isExistingUser,
      );
    },
    onCancel: () => {
      console.log('[LoginScreen] 알림 권한 Alert 취소');
      waitingForSettingsRef.current.isWaiting = false;
    },
  });

  /**
   * iOS 추적 권한(ATT) 관리 훅
   */
  const {
    checkPermission: checkTrackingPermission,
    requestPermission: requestTrackingPermission,
  } = useTrackingPermission();

  // ──────────────────────────────────────────────
  // Effect 1: 설정 화면 복귀 감지 (알림 권한)
  // ──────────────────────────────────────────────

  /**
   * AppState를 감지하여 설정 화면에서 돌아왔을 때 처리한다.
   *
   * 동작 흐름:
   *   1. 사용자가 Alert의 "설정으로 이동" 버튼 클릭
   *   2. onSettingsOpened 콜백에서 waitingForSettingsRef.isWaiting = true 설정
   *   3. 사용자가 설정 앱에서 권한 변경 후 앱으로 복귀
   *   4. AppState가 'active'로 변경 → 이 useEffect 트리거
   *   5. isWaiting이 true이면 설정에서 돌아온 것으로 판단
   *   6. 신규/기존 사용자에 따라 적절한 화면으로 이동
   *
   * 기존 사용자: completeOnboarding() 호출 → 메인 화면으로 이동
   * 신규 사용자: 온보딩 인트로 첫 화면으로 이동
   */
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

          // 설정 복귀 후 최종 OS 권한 상태를 확인해서 서버에 동기화
          try {
            const userInfo = await getUserInfo();
            if (userInfo?.userId) {
              const shouldShowModal = await checkNotiPermission();
              await updateNotificationStatus(userInfo.userId, !shouldShowModal);
            }
          } catch {
            console.warn('[AppState] 알림 수신 설정 동기화 실패');
          }

          if (isExistingUser) {
            // 기존 사용자: 온보딩 완료 → 메인 화면으로 이동
            await completeOnboarding();
          } else {
            // 신규 사용자: 온보딩 인트로 첫 화면으로 이동
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

  /**
   * 컴포넌트 마운트 시 소셜 로그인 SDK를 초기화한다.
   *
   * UI 렌더링 우선순위를 위해 100ms 지연 실행한다.
   * (초기화가 무거워 UI 블로킹을 방지)
   *
   * - Google: Firebase 연동 설정
   * - Naver: SDK 초기화
   * - 최근 로그인 정보 불러오기 (최근 사용한 로그인 방법 표시용)
   */
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

  /**
   * iOS 추적 권한(ATT) 모달을 표시한다.
   *
   * 중요: 이 함수는 소셜 로그인 창을 띄우기 **전에** 호출되어야 한다.
   *       ATT 모달과 로그인 창이 동시에 뜨면 iOS가 혼란스러워한다.
   *
   * 중복 호출 방지:
   *   - trackingModalShownRef로 한 번만 표시되도록 제어
   *   - 권한이 이미 허용되어 있으면 모달을 띄우지 않음
   *
   * 처리 후 0.5초 대기:
   *   - ATT 모달이 완전히 닫힐 때까지 기다린 후 로그인 진행
   *   - handleSocialLogin에서 await 후 500ms delay 필요
   */
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

  /**
   * 알림 권한 모달을 표시하고 사용자 응답에 따라 화면 전환을 처리한다.
   *
   * 처리 시나리오:
   *   1. 권한이 이미 허용된 경우
   *      → 모달 없이 바로 proceedNext() 호출
   *
   *   2. 권한이 거부된 상태
   *      → 알림 권한 모달 표시
   *      → "알림 받을래요" 클릭: iOS/Android 시스템 권한 요청
   *      → "괜찮아요" 클릭: 권한 없이 진행
   *
   *   3. iOS에서 권한이 "차단됨" 상태
   *      → Alert 표시: "설정으로 이동" / "취소"
   *      → "설정으로 이동" 클릭: AppState 리스너가 복귀 감지 후 처리
   *      → "취소" 클릭: 권한 없이 진행
   *
   * @param isExistingUser 기존 사용자 여부 (화면 전환 분기용)
   */
  const handleNotificationModal = useCallback(
    async (isExistingUser = false) => {
      waitingForSettingsRef.current.isExistingUser = isExistingUser;

      /**
       * 다음 화면으로 이동하는 헬퍼 함수
       *
       * - 기존 사용자: completeOnboarding() → 메인 화면
       * - 신규 사용자: 온보딩 인트로 첫 화면으로 이동
       */
      const proceedNext = async () => {
        if (isExistingUser) {
          await completeOnboarding();
        } else {
          navigation.navigate(RouteNames.INTRO_CARDLIST);
        }
      };

      /**
       * OS 권한 최종 상태를 서버에 동기화한 뒤 다음 화면으로 이동
       * - checkNOtiPermission()이 false면 권한 있음 -> true로 PATCH
       * - checkNotiPermission()이 true면 권한 없음 -> false로 PATCH
       * - 실패해도 화면 전환은 계속 진행
       */
      const syncAndProceed = async () => {
        try {
          const userInfo = await getUserInfo();
          if (userInfo?.userId) {
            const shouldShowModal = await checkNotiPermission();
            await updateNotificationStatus(userInfo.userId, !shouldShowModal);
          }
        } catch {
          console.warn('[handleNotificationModal] 알림 수신 설정 동기화 실패');
        }
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

                // 설정 화면으로 이동한 경우 AppState에서 처리
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

  /**
   * 소셜 로그인 전체 흐름을 처리한다.
   *
   * 처리 순서:
   *   1. iOS ATT 권한 요청 (handleTrackingModal)
   *   2. 0.5초 대기 (ATT 모달 완전히 닫힐 때까지)
   *   3. 소셜 로그인 실행 (signInWithSocial)
   *   4. 로그인 성공 시 신규/기존 사용자 구분
   *   5. 알림 권한 모달 표시 (handleNotificationModal)
   *
   * 신규 사용자 (result.newUser === true):
   *   → 알림 권한 → 온보딩 인트로 → 관심분야 → 난이도 → 메인
   *
   * 기존 사용자 (result.newUser === false):
   *   → 알림 권한 → 메인 화면
   *
   * 로그인 실패/취소:
   *   - 취소 메시지인 경우 콘솔 로그만 남김
   *   - 실제 에러인 경우 Alert 표시
   *
   * @param provider 로그인할 소셜 제공자
   */
  const handleSocialLogin = useCallback(
    async (provider: SocialLoginProvider) => {
      if (socialLoginInProgressRef.current) {
        console.log('[Login] duplicated login blocked:', provider);
        return;
      }

      socialLoginInProgressRef.current = true;

      console.log('[Login] handleSocialLogin called:', provider);

      try {
        // STEP 1: iOS 추적 권한 (로그인 창 띄우기 전)
        if (Platform.OS === 'ios') {
          await handleTrackingModal();

          // ATT 시스템 모달이 완전히 닫힐 때까지 대기
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // STEP 2: 소셜 로그인 시도
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

        // STEP 3: 로그인 성공 시 처리
        if (result.success && result.userInfo) {
          if (result.newUser === false) {
            // 기존 사용자: 알림 권한 → 메인 화면
            await handleNotificationModal(true);
          } else {
            // 신규 사용자: 알림 권한 → 온보딩 인트로
            await handleNotificationModal(false);
          }

          return;
        }

        // STEP 4: 로그인 실패 또는 취소 처리
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

  /**
   * 약관 동의 화면에서 돌아왔을 때 로그인을 자동 실행한다.
   *
   * 처리 흐름:
   *   1. 사용자가 소셜 로그인 버튼 클릭
   *   2. goTermsAgreement()로 약관 동의 화면으로 이동
   *   3. 약관 동의 완료 후 navigation.navigate(RouteNames.SOCIAL_LOGIN, { agreedProvider })
   *   4. 이 useEffect가 트리거되어 handleSocialLogin() 자동 실행
   *   5. params를 undefined로 리셋하여 재진입 시 중복 실행 방지
   */
  // Effect 3-A: params 도착 즉시 ref에 저장하고 params 초기화
  // setParams() → re-render → effect cleanup 순서로 인해 타이머/리스너가 취소되는
  // race condition을 피하기 위해 cleanup이 없는 별도 effect로 분리
  useEffect(() => {
    const agreedProvider = route.params?.agreedProvider;
    if (!agreedProvider) return;

    pendingProviderRef.current = agreedProvider as SocialLoginProvider;
    navigation.setParams({ agreedProvider: undefined });
  }, [route.params?.agreedProvider, navigation]);

  // Effect 3-B: 네비게이션 전환 애니메이션 완료 시 ref에 저장된 제공자로 로그인 실행
  // transitionEnd는 애니메이션이 끝난 후에 발화하므로 Apple Sign In 시트가 안전하게 열림
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

  /**
   * 약관 동의 화면으로 이동한다.
   *
   * 약관 동의 완료 후 이 화면으로 돌아오면서
   * agreedProvider 파라미터를 전달받아 자동 로그인이 시작된다.
   *
   * @param provider 약관 동의할 소셜 제공자
   */
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
      {/* 배경 이미지 */}
      <View style={styles.backgroundContainer}>
        <LoginBackground style={styles.backgroundImage} />
      </View>

      {/* 콘텐츠 영역 */}
      <View style={styles.content}>
        <Text style={styles.logoText}>
          일상의 틈, 언제든 시작하는 문해력 미션
        </Text>

        {/* 소셜 로그인 버튼들 */}
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
          {/* Apple 로그인은 iOS에서만 표시 */}
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
