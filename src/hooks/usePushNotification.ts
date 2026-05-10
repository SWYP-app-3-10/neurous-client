import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { registerFCMToken } from '../api/notificationApi';
import { getUserInfo } from '../services/authService';

/** AsyncStorage 키 */
const FCM_TOKEN_KEY = '@fcm_token';

/**
 * 로컬 노티피케이션 초기화
 *
 * - 포그라운드에서 푸시 수신 시 상태바 알림을 표시하기 위해 필요
 * - Android 채널 생성 (Android 8.0 이상 필수)
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
    created => {
      if (created) {
        console.log('[로컬 노티] 채널 생성 성공');
      } else {
        console.log('[로컬 노티] 채널 이미 존재 (정상)');
      }
    },
  );
};

/**
 * FCM 토큰을 서버와 동기화
 *
 * 원칙:
 * - 로그인 상태일 때만 서버에 등록
 * - 로그인 상태가 아니면 서버 등록 안 함
 * - 앱 시작 시마다 호출해도 됨 (서버는 멱등성 있게 처리)
 */
const syncFcmTokenIfLoggedIn = async () => {
  try {
    const userInfo = await getUserInfo();

    // 로그인 상태가 아니면 서버 등록 안 함
    if (!userInfo || !userInfo.userId) {
      console.log('[FCM] 로그인 상태 아님 - 서버 등록 스킵');
      return;
    }

    const token = await messaging().getToken();
    console.log('[FCM] 로그인 상태 - 토큰 서버 동기화 시작');

    // 서버에 토큰 등록
    await registerFCMToken(token);

    // AsyncStorage에도 저장 (참고용)
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

    console.log('[FCM] 토큰 서버 동기화 완료');
  } catch (error) {
    console.error('[FCM] 토큰 동기화 실패:', error);
  }
};

/**
 * FCM 기반 푸시 알림 수신 훅
 *
 * 책임:
 * 1. 앱 시작 시 FCM 초기화 및 토큰 동기화
 * 2. 토큰 갱신 시 서버 재등록
 * 3. 포그라운드 푸시 수신 시 상태바 알림 표시
 * 4. 백그라운드/콜드스타트 푸시 처리
 */
export function usePushNotification() {
  useEffect(() => {
    /**
     * FCM 초기화 함수
     */
    const initializeFcm = async () => {
      try {
        // ═══════════════════════════════════════════════
        // iOS 권한 요청
        // ═══════════════════════════════════════════════
        if (Platform.OS === 'ios') {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (!enabled) {
            console.log('[FCM] iOS 권한 거부됨');
            return;
          }
        }

        // ═══════════════════════════════════════════════
        // 로그인 상태면 FCM 토큰 서버 동기화
        // ═══════════════════════════════════════════════
        await syncFcmTokenIfLoggedIn();

        // ═══════════════════════════════════════════════
        // 로컬 노티피케이션 초기화
        // ═══════════════════════════════════════════════
        initializeLocalNotification();
      } catch (e) {
        console.error('[FCM] 초기화 실패:', e);
      }
    };

    initializeFcm();

    // ═══════════════════════════════════════════════
    // FCM 토큰 갱신 리스너
    // ═══════════════════════════════════════════════
    /**
     * 토큰 갱신 시 서버에 재등록
     *
     * 토큰이 갱신되는 경우:
     * - 앱 재설치
     * - 앱 데이터 삭제
     * - OS 업데이트
     * - Firebase SDK 업데이트
     */
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(
      async newToken => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[FCM] 토큰 갱신:', newToken);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
          const userInfo = await getUserInfo();

          // 로그인 상태일 때만 서버에 등록
          if (userInfo && userInfo.userId) {
            await registerFCMToken(newToken);
            await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
            console.log('[FCM] 갱신된 토큰 서버 등록 완료');
          } else {
            console.log('[FCM] 로그인 상태 아님 - 갱신된 토큰 등록 스킵');
          }
        } catch (error) {
          console.error('[FCM] 토큰 갱신 처리 실패:', error);
        }
      },
    );

    // ═══════════════════════════════════════════════
    // 포그라운드 메시지 수신 리스너
    // ═══════════════════════════════════════════════
    /**
     * 앱 사용 중(포그라운드)일 때 푸시 수신
     *
     * - 로컬 노티피케이션을 호출하여 상태바에 알림 표시
     * - 백그라운드/콜드스타트는 시스템이 자동으로 상태바 알림 표시
     */
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[FCM 포그라운드 수신]');
      console.log('제목:', remoteMessage.notification?.title);
      console.log('내용:', remoteMessage.notification?.body);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 상태바 알림 표시
      PushNotification.localNotification({
        channelId: 'default-channel-id',
        title: remoteMessage.notification?.title || '새 알림',
        message: remoteMessage.notification?.body || '알림을 확인해주세요',
        playSound: true,
        soundName: 'default',
      });

      console.log('[FCM] 로컬 노티피케이션 호출 완료');
    });

    // ═══════════════════════════════════════════════
    // 백그라운드 상태에서 알림 탭 리스너
    // ═══════════════════════════════════════════════
    /**
     * 홈 화면 등 백그라운드 상태에서 알림을 탭하면 실행됨
     */
    const unsubscribeBackground = messaging().onNotificationOpenedApp(
      remoteMessage => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[FCM 백그라운드 탭]');
        console.log('제목:', remoteMessage.notification?.title);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        // TODO: data payload 기준으로 화면 이동 처리
      },
    );

    // ═══════════════════════════════════════════════
    // 앱 완전 종료 후 알림 탭 처리
    // ═══════════════════════════════════════════════
    /**
     * 앱이 완전히 종료된 상태에서 알림을 탭하면 실행됨
     */
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (!remoteMessage) return;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[FCM 콜드스타트]');
        console.log('제목:', remoteMessage.notification?.title);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        // TODO: data payload 기준으로 화면 이동 처리
      });

    // ═══════════════════════════════════════════════
    // cleanup: 컴포넌트 언마운트 시 리스너 해제
    // ═══════════════════════════════════════════════
    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeBackground();
    };
  }, []);
}
