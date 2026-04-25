import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { registerFCMToken } from '../api/notificationApi';

/** AsyncStorage 키 */
const FCM_TOKEN_KEY = '@fcm_token';

/**
 * 로컬 노티피케이션 초기화
 */
const initializeLocalNotification = () => {
  PushNotification.configure({
    onNotification: function (notification) {
      console.log('[로컬 노티] 탭:', notification);
    },
    requestPermissions: false,
  });

  PushNotification.createChannel(
    {
      channelId: 'default-channel-id',
      channelName: '기본 알림',
      channelDescription: '뉴로스 기본 알림 채널',
      importance: 4,
      vibrate: true,
    },
    created => console.log(`[로컬 노티] 채널 생성: ${created}`),
  );
};

/**
 * FCM 기반 푸시 알림 수신 훅
 */
export function usePushNotification() {
  useEffect(() => {
    const init = async () => {
      try {
        // iOS 권한 요청
        if (Platform.OS === 'ios') {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;
          if (!enabled) return;
        }

        // FCM 토큰 발급
        const token = await messaging().getToken();
        if (__DEV__) console.log('[FCM Token]', token);

        // 저장된 토큰과 비교
        const savedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

        // 토큰이 변경되었거나 처음 발급받은 경우에만 서버 등록
        if (savedToken !== token) {
          console.log('[FCM] 토큰 변경 감지 - 서버 등록 시작');
          await registerFCMToken(token);

          // 토큰 저장 (다음 번 비교용)
          await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
          console.log('[FCM] 토큰 저장 완료');
        } else {
          console.log('[FCM] 기존 토큰과 동일 - 서버 등록 스킵');
        }

        // 로컬 노티피케이션 초기화
        initializeLocalNotification();
      } catch (e) {
        console.warn('[FCM] 초기화 실패:', e);
      }
    };

    init();

    // 토큰 갱신 시 서버 재등록
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(
      async newToken => {
        console.log('[FCM] 토큰 갱신:', newToken);
        await registerFCMToken(newToken);
        // ✅ 갱신된 토큰 저장
        await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
      },
    );

    // 포그라운드 메시지 수신 → 로컬 노티피케이션 표시
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      if (__DEV__) console.log('[FCM 포그라운드]', remoteMessage);

      PushNotification.localNotification({
        channelId: 'default-channel-id',
        title: remoteMessage.notification?.title || '새 알림',
        message: remoteMessage.notification?.body || '알림을 확인해주세요',
        playSound: true,
        soundName: 'default',
      });
    });

    // 백그라운드 상태에서 알림 탭
    const unsubscribeBackground = messaging().onNotificationOpenedApp(
      remoteMessage => {
        if (__DEV__) console.log('[FCM 백그라운드 탭]', remoteMessage);
      },
    );

    // 앱 완전 종료 후 알림 탭
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (!remoteMessage) return;
        if (__DEV__) console.log('[FCM 콜드스타트]', remoteMessage);
      });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeBackground();
    };
  }, []);
}
