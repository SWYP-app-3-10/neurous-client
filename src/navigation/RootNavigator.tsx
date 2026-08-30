import React, { useEffect, useRef } from 'react';
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

import { useModalState, useModalStore } from '../store/modalStore';
import { useIsOnboardingCompleted } from '../store/onboardingStore';

import NotificationModal from '../components/NotificationModal';
import RewardModal from '../components/RewardModal';
import BottomSheetModal from '../components/BottomSheetModal';
import ToastModal from '../components/ToastModal';

import { useExperienceStore } from '../store/experienceStore';
import { characterKeys } from '../hooks/useCharacter';
import { useQueryClient } from '@tanstack/react-query';
import { logScreenView } from '../services/analyticsService';
import { isScreenMapped } from '../services/analyticsService';

const Stack = createNativeStackNavigator();

/**
 * RootNavigatorContent
 * - NavigationContainer 밖으로 navigationRef를 전달받아 reset 같은 액션을 수행
 * - 전역 모달(Notification / BottomSheet) 렌더링
 * - 온보딩 완료 시 MAIN_TAB으로 reset
 * - 경험치 변경 시 캐릭터 데이터 refetch (레벨업 모달은 각 화면이 직접 처리)
 */
const RootNavigatorContent: React.FC<{
  navigationRef: React.RefObject<any>;
  isReady?: boolean;
}> = ({ navigationRef, isReady = false }) => {
  // zustand: modalState만 구독 (리렌더링 최적화)
  const modalState = useModalState();
  const hideModal = useModalStore(state => state.hideModal);

  // zustand: 온보딩 완료 상태만 구독 (리렌더링 최적화)
  const isOnboardingCompleted = useIsOnboardingCompleted();

  // 경험치와 레벨 데이터 감시
  const { experience } = useExperienceStore();
  const queryClient = useQueryClient();

  // ref: 마지막 경험치 / 온보딩 완료 이전 상태
  const lastCheckedExpRef = useRef<number>(0);
  const prevOnboardingCompletedRef = useRef<boolean>(false);

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
        // useMissions가 refetchOnMount: true라 MissionScreen 마운트 시 자동 refetch됨
        // (중복 invalidateQueries 호출 시 마운트 시점과 겹쳐 요청이 겹치는 레이스 발생 가능하여 제거)
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

  // 경험치 변경 시 characterData refetch
  //
  // 레벨업 감지/모달 표시는 더 이상 여기서 전역으로 하지 않는다. 각 화면(퀴즈 등)이
  // 보상 API 응답에서 받은 레벨업 정보를 levelUpStore에 기록해두고, 자신의 리워드
  // 모달을 띄우는 시점에 그 store를 확인해서 UI만 레벨업 버전으로 바꿔서 보여준다
  // (src/store/levelUpStore.ts 참고). 예전 방식(AsyncStorage 감지 후 별도 모달
  // 표시)은 사용자가 정답/오답 피드백을 보기도 전에 팝업이 먼저 뜨고, 이후 화면
  // 자체 리워드 모달과 이중으로 노출되는 문제가 있었다.
  useEffect(() => {
    if (!isOnboardingCompleted) {
      return;
    }

    const previousExp = lastCheckedExpRef.current;
    if (experience !== previousExp && experience > previousExp) {
      // 경험치가 증가했을 때만 refetch
      // characterKeys.all로 무효화해야 레벨/경험치 정보(data)뿐 아니라
      // 출석·진행률 바가 참조하는 characterKeys.me() 캐시도 함께 갱신된다.
      // (data()만 무효화하면 me()는 캐릭터 탭의 focus refetch에만 의존하게 되어
      //  탭 재진입 없이는 출석/진행률이 최신 상태로 반영되지 않는 문제가 있었음)
      queryClient.invalidateQueries({ queryKey: characterKeys.all });
    }
    lastCheckedExpRef.current = experience;
  }, [experience, isOnboardingCompleted, queryClient]);

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

      {modalState.type === 'reward' && (
        <RewardModal
          visible={modalState.visible}
          image={modalState.image}
          imageSize={modalState.imageSize}
          imageTopOffset={modalState.imageTopOffset}
          topContent={modalState.topContent}
          bottomTopContent={modalState.bottomTopContent}
          rewards={modalState.rewards}
          onNextArticle={modalState.onNextArticle}
          onMoreQuiz={modalState.onMoreQuiz}
          onDismiss={modalState.onDismiss}
          closeOnBackdropPress={modalState.closeOnBackdropPress}
          onClose={hideModal}
        />
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
