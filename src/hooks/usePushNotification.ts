import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import {
  useNotificationStore,
  NotificationItem,
} from '../store/notificationStore';
import { registerFCMToken } from '../api/notificationApi';

/**
 * FCM 원격 메시지 → NotificationItem 변환
 * - 서버 응답 필드명이 다를 수 있어 우선순위 순으로 fallback
 */
const toNotificationItem = (remoteMessage: any): NotificationItem => {
  const now = new Date();
  const createdAt = `${now.getMonth() + 1}월 ${String(now.getDate()).padStart(2, '0')}일`;

  return {
    id: remoteMessage.messageId ?? `${Date.now()}-${Math.random()}`,
    title: remoteMessage.notification?.title ?? '새 알림이 도착했어요',
    subtitle:
      remoteMessage.notification?.body ??
      remoteMessage.data?.message ??
      '알림을 확인해 주세요',
    createdAt: remoteMessage.sentTime
      ? (() => {
          const d = new Date(remoteMessage.sentTime);
          return `${d.getMonth() + 1}월 ${String(d.getDate()).padStart(2, '0')}일`;
        })()
      : createdAt,
    isRead: false,
    raw: remoteMessage,
  };
};

/**
 * FCM 기반 푸시 알림 수신 훅
 * - 포그라운드: 메시지 수신 시 notificationStore에 추가
 * - 백그라운드: 알림 탭 시 notificationStore에 추가 후 읽음 처리
 * - 콜드스타트: 종료 상태에서 알림 탭으로 앱 진입 시 처리
 */
export function usePushNotification() {
  const add = useNotificationStore(s => s.add);

  useEffect(() => {
    const init = async () => {
      try {
        // iOS는 명시적 권한 요청 필요 (Android는 불필요)
        if (Platform.OS === 'ios') {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;
          if (!enabled) return;
        }

        // FCM 토큰 발급 후 서버 등록
        const token = await messaging().getToken();
        if (__DEV__) console.log('[FCM Token]', token);

        // 정상 호출 (에러는 registerFCMToken 내부에서 처리)
        await registerFCMToken(token);
      } catch (e) {
        console.warn('[FCM] 초기화 실패:', e);
      }
    };

    init();

    // 토큰 갱신 시 서버 재등록
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(
      async newToken => {
        await registerFCMToken(newToken);
      },
    );

    // 포그라운드 메시지 수신 → notificationStore에 추가
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      if (__DEV__) console.log('[FCM 포그라운드]', remoteMessage);
      add(toNotificationItem(remoteMessage));
    });

    // 백그라운드 상태에서 알림 탭 → 앱 포커스 시
    const unsubscribeBackground = messaging().onNotificationOpenedApp(
      remoteMessage => {
        if (__DEV__) console.log('[FCM 백그라운드 탭]', remoteMessage);
        // 탭해서 열었으므로 읽음 처리
        add({ ...toNotificationItem(remoteMessage), isRead: true });
      },
    );

    // 앱 완전 종료 후 알림 탭 → 콜드스타트로 열렸을 때 (최초 1회)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (!remoteMessage) return;
        if (__DEV__) console.log('[FCM 콜드스타트]', remoteMessage);
        add({ ...toNotificationItem(remoteMessage), isRead: true });
      });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeBackground();
    };
  }, [add]);
}
