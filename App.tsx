import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { queryClient } from './src/config/queryClient';
import { useOnboardingStore } from './src/store/onboardingStore';
import { Platform, StatusBar } from 'react-native';
import { usePushNotification } from './src/hooks/usePushNotification';

const App = () => {
  const loadOnboardingStatus = useOnboardingStore(
    state => state.loadOnboardingStatus,
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // FCM 푸시 알림 초기화 (토큰 발급 및 수신 핸들러 등록)
  usePushNotification();

  // 전역 StatusBar 기본값
  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
      StatusBar.setBackgroundColor('#FFFFFF');
    }
  }, []);

  // Firebase 초기화 확인 (개발 모드에서만)
  useEffect(() => {
    if (__DEV__) {
      try {
        const firebase = require('@react-native-firebase/app').default;
        const projectId = firebase.app().options.projectId;
        console.log('🔥 Firebase Project:', projectId);
        console.log('✅ Firebase initialized successfully');
      } catch (error) {
        console.error('❌ Firebase initialization check failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    const initializeAppData = async () => {
      try {
        await Promise.all([loadOnboardingStatus()]);
        setIsInitialized(true);
      } catch (error) {
        console.error('앱 초기화 중 오류:', error);
        // 에러가 나도 앱은 실행되도록 (최소한 로그인 화면은 보여줌)
        setIsInitialized(true);
      }
    };

    initializeAppData();
  }, [loadOnboardingStatus]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {isInitialized ? <RootNavigator /> : null}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

export default App;
