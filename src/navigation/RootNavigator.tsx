import React, { useEffect, useRef, useCallback } from 'react';
import {
  NavigationContainer,
  CommonActions,
  NavigationState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RouteNames } from '../../routes';

import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import FullScreenStackNavigator from './FullScreenStackNavigator';
import SearchStackNavigator from './SearchStackNavigator';

import {
  useModalState,
  useModalStore,
  useShowModal,
} from '../store/modalStore';
import { useIsOnboardingCompleted } from '../store/onboardingStore';

import NotificationModal from '../components/NotificationModal';
import BottomSheetModal from '../components/BottomSheetModal';
import ToastModal from '../components/ToastModal';

import { useExperienceStore } from '../store/experienceStore';
import { characterKeys } from '../hooks/useCharacter';
import { missionKeys } from '../hooks/useMissions';
import { LevelUpModalContent } from '../components/ArticlePointModalContent';
import { useQueryClient } from '@tanstack/react-query';
import { Heading_24EB_Round } from '../styles/typography';
import { COLORS, scaleWidth } from '../styles/global';
import { Modal_IMG } from '../icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LevelUpInfo } from '../api/missionApi';
import { logScreenView } from '../services/analyticsService';
import { isScreenMapped } from '../services/analyticsService';

const Stack = createNativeStackNavigator();

/**
 * RootNavigatorContent
 * - NavigationContainer 밖으로 navigationRef를 전달받아 reset 같은 액션을 수행
 * - 전역 모달(Notification / BottomSheet) 렌더링
 * - 온보딩 완료 시 MAIN_TAB으로 reset
 * - 경험치/레벨 데이터 기반 레벨업 모달 표시
 */
const RootNavigatorContent: React.FC<{
  navigationRef: React.RefObject<any>;
  isReady?: boolean;
}> = ({ navigationRef, isReady = false }) => {
  // zustand: modalState만 구독 (리렌더링 최적화)
  const modalState = useModalState();
  const hideModal = useModalStore(state => state.hideModal);
  const showModal = useShowModal();

  // zustand: 온보딩 완료 상태만 구독 (리렌더링 최적화)
  const isOnboardingCompleted = useIsOnboardingCompleted();

  // 경험치와 레벨 데이터 감시
  const { experience } = useExperienceStore();
  const queryClient = useQueryClient();

  // ref: 마지막 경험치 / 레벨업 모달 노출 여부 / 온보딩 완료 이전 상태
  const lastCheckedExpRef = useRef<number>(0);
  const prevOnboardingCompletedRef = useRef<boolean>(false);
  const hasCheckedPendingLevelUpRef = useRef<boolean>(false);

  // 온보딩 완료 시 메인 화면으로 자동 전환
  // 온보딩 미완료 시 로그인 화면으로 자동 전환 (401 에러 등으로 인한 로그아웃 처리)
  useEffect(() => {
    if (!navigationRef.current || !isReady) {
      return;
    }

    try {
      if (isOnboardingCompleted && !prevOnboardingCompletedRef.current) {
        // 온보딩 완료 → 메인 화면으로 이동
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: RouteNames.MAIN_TAB }],
          }),
        );
        // 온보딩 완료 후 미션 쿼리 무효화하여 자동으로 refetch되도록 함
        queryClient.invalidateQueries({ queryKey: missionKeys.lists() });
      } else if (!isOnboardingCompleted && prevOnboardingCompletedRef.current) {
        // 온보딩 미완료로 변경됨 (401 에러 등) → 로그인 화면으로 이동
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: RouteNames.ONBOARDING }],
          }),
        );
      }
    } catch (error) {
      // 네비게이션이 아직 준비되지 않은 경우 무시
      console.warn('네비게이션 리셋 실패:', error);
    }

    prevOnboardingCompletedRef.current = isOnboardingCompleted;
  }, [isOnboardingCompleted, navigationRef, isReady, queryClient]);

  // 두 useEffect에서 공유하기 위해 useCallback으로 선언
  const checkPendingLevelUp = useCallback(async () => {
    if (hasCheckedPendingLevelUpRef.current) {
      return;
    }

    try {
      const pendingLevelUpData =
        await AsyncStorage.getItem('@pending_level_up');

      if (pendingLevelUpData) {
        try {
          const levelUpInfo: LevelUpInfo = JSON.parse(pendingLevelUpData);

          if (!levelUpInfo || typeof levelUpInfo !== 'object') {
            console.warn(
              '[RootNavigator] 레벨업 정보 형식이 올바르지 않습니다:',
              levelUpInfo,
            );
            await AsyncStorage.removeItem('@pending_level_up');
            return;
          }

          hasCheckedPendingLevelUpRef.current = true;

          // 레벨업 모달 표시
          showModal({
            title: levelUpInfo.title || '축하해요! 레벨 업!',
            image: <Modal_IMG />,
            imageTopOffset: scaleWidth(-100.62),
            imagePaddingTop: scaleWidth(64),
            titleStyle: { ...Heading_24EB_Round },
            titleDescriptionGapSize: 4,
            description:
              levelUpInfo.message || '조금씩 생각이 자라나고 있어요.',
            descriptionColor: COLORS.gray700,
            children: React.createElement(LevelUpModalContent, {
              newLevel: (() => {
                // "LEVEL_2" 형식에서 숫자 추출
                const match = levelUpInfo.levelCode?.match(/LEVEL_(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })(),
            }),
            primaryButton: {
              title: '확인',
              onPress: async () => {
                // 레벨업 정보 삭제
                await AsyncStorage.removeItem('@pending_level_up');
                hasCheckedPendingLevelUpRef.current = false;
              },
            },
          });
        } catch (parseError) {
          console.error('[RootNavigator] 레벨업 정보 파싱 실패:', parseError);
          // 잘못된 데이터 삭제
          await AsyncStorage.removeItem('@pending_level_up');
        }
      }
    } catch (error) {
      console.error('[RootNavigator] 레벨업 체크 실패:', error);
    }
  }, [showModal]);

  // 앱 진입 시 미처리 레벨업 정보 체크
  useEffect(() => {
    if (!isOnboardingCompleted) {
      return;
    }

    checkPendingLevelUp();
  }, [isOnboardingCompleted, checkPendingLevelUp]);

  // 경험치 변경 시 characterData refetch + 레벨업 체크
  useEffect(() => {
    if (!isOnboardingCompleted) {
      return;
    }

    const previousExp = lastCheckedExpRef.current;
    if (experience !== previousExp && experience > previousExp) {
      // 경험치가 증가했을 때만 refetch
      queryClient.invalidateQueries({ queryKey: characterKeys.data() });
      // ref 리셋 직접 호출 - useEffect 의존성 재실행 없이도 즉시 체크
      hasCheckedPendingLevelUpRef.current = false;
      checkPendingLevelUp();
    }
    lastCheckedExpRef.current = experience;
  }, [experience, isOnboardingCompleted, queryClient, checkPendingLevelUp]);

  return (
    <>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={
          isOnboardingCompleted ? RouteNames.MAIN_TAB : RouteNames.ONBOARDING
        }
      >
        {/* 온보딩 스택 (소셜 로그인 포함) - 온보딩 완료 후에도 편집을 위해 접근 가능 */}
        <Stack.Screen
          name={RouteNames.ONBOARDING}
          component={OnboardingNavigator}
        />

        {isOnboardingCompleted && (
          <>
            {/* 메인 스택 (온보딩 완료 후) */}
            <Stack.Screen
              name={RouteNames.MAIN_TAB}
              component={MainTabNavigator}
            />

            {/* (옵션) 탭 외부에서 SEARCH_TAB로 직접 진입이 필요한 경우만 유지 */}
            <Stack.Screen
              name={RouteNames.SEARCH_TAB}
              component={SearchStackNavigator}
            />

            {/* 전체 화면 스택 (탭바 없는 화면들: 알림, 설정, 검색/검색결과 등) */}
            <Stack.Screen
              name={RouteNames.FULL_SCREEN_STACK}
              component={FullScreenStackNavigator}
            />
          </>
        )}
      </Stack.Navigator>

      {/* 전역 모달 */}
      {modalState.type === 'notification' && (
        <NotificationModal
          visible={modalState.visible}
          title={modalState.title}
          description={modalState.description}
          image={modalState.image}
          imageSize={modalState.imageSize}
          imageTopOffset={modalState.imageTopOffset}
          imagePaddingTop={modalState.imagePaddingTop}
          closeButton={modalState.closeButton}
          titleDescriptionGapSize={modalState.titleDescriptionGapSize}
          descriptionColor={modalState.descriptionColor}
          titleStyle={modalState.titleStyle}
          closeOnBackdropPress={modalState.closeOnBackdropPress}
          primaryButton={
            modalState.primaryButton
              ? {
                  ...modalState.primaryButton,
                  onPress: () => {
                    modalState.primaryButton?.onPress();
                    hideModal();
                  },
                }
              : undefined
          }
          secondaryButton={
            modalState.secondaryButton
              ? {
                  ...modalState.secondaryButton,
                  onPress: () => {
                    modalState.secondaryButton?.onPress();
                    hideModal();
                  },
                }
              : undefined
          }
          onClose={hideModal}
        >
          {modalState.children}
        </NotificationModal>
      )}

      {modalState.type === 'bottomSheet' && (
        <BottomSheetModal
          visible={modalState.visible}
          onClose={hideModal}
          paddingHorizontal={modalState.paddingHorizontal}
        >
          {modalState.children}
        </BottomSheetModal>
      )}

      {modalState.type === 'toast' && (
        <ToastModal
          visible={modalState.visible}
          message={modalState.message}
          icon={modalState.icon}
          duration={modalState.duration}
          position={modalState.position}
          backgroundColor={modalState.backgroundColor}
          height={modalState.height}
          width={modalState.width}
          marginHorizontal={modalState.marginHorizontal}
          borderRadius={modalState.borderRadius}
          borderColor={modalState.borderColor}
          borderWidth={modalState.borderWidth}
          paddingHorizontal={modalState.paddingHorizontal}
          paddingVertical={modalState.paddingVertical}
          messageStyle={modalState.messageStyle}
          bottomOffset={modalState.bottomOffset}
          onClose={() => {
            modalState.onClose?.();
            hideModal();
          }}
        />
      )}
    </>
  );
};

/**
 * 네비게이션 상태에서 현재 화면 이름 추출
 */
const getActiveRouteName = (
  state: NavigationState | undefined,
): string | null => {
  if (!state || typeof state.index !== 'number') {
    return null;
  }

  const route = state.routes[state.index];

  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
};

/**
 * RootNavigator
 * - NavigationContainer + navigationRef 연결
 * - 화면 전환 시 자동으로 Analytics 로그 기록
 */
const RootNavigator: React.FC = () => {
  const navigationRef = React.useRef<any>(null);
  const [isReady, setIsReady] = React.useState(false);
  const routeNameRef = React.useRef<string | null>(null);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setIsReady(true);
        // 초기 화면 로깅 (매핑된 화면만)
        const currentRouteName = getActiveRouteName(
          navigationRef.current?.getRootState(),
        );
        if (currentRouteName && isScreenMapped(currentRouteName)) {
          routeNameRef.current = currentRouteName;
          logScreenView(currentRouteName);
        }
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = getActiveRouteName(
          navigationRef.current?.getRootState(),
        );

        // 화면이 변경되었고, 매핑된 화면인 경우에만 로깅
        if (
          previousRouteName !== currentRouteName &&
          currentRouteName &&
          isScreenMapped(currentRouteName)
        ) {
          routeNameRef.current = currentRouteName;
          logScreenView(currentRouteName);
        }
      }}
    >
      <RootNavigatorContent navigationRef={navigationRef} isReady={isReady} />
    </NavigationContainer>
  );
};

export default RootNavigator;
