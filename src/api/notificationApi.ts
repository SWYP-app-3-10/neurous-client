/**
 * 알림 관련 API
 */
import client from './client';
import { getUserInfo } from '../services/authService';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FCM 토큰 등록 요청 타입
 */
export interface RegisterTokenRequest {
  userId: number;
  token: string;
  platform: 'ANDROID' | 'IOS';
}

/**
 * 백엔드 API 실제 응답 타입 (Swagger 기준)
 */
export interface NotificationItemRaw {
  notificationId: number;
  title: string;
  body: string;
  displayDate: string;
  isRead: boolean;
}

/**
 * 프론트엔드에서 사용할 알림 아이템 타입
 */
export interface NotificationItem {
  notificationId: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

/**
 * FCM 디바이스 토큰을 서버에 등록
 *
 * @param token FCM 토큰
 */
export async function registerFCMToken(token: string): Promise<void> {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo || !userInfo.userId) {
      console.warn('[FCM] 사용자 정보 없음 - 토큰 등록 스킵');
      return;
    }

    const request: RegisterTokenRequest = {
      userId: userInfo.userId,
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    };

    console.log('[FCM] 토큰 서버 등록 시작:', request);

    const response = await client.post('/api/notification/token', request);

    console.log('[FCM] 토큰 서버 등록 성공');
    console.log('[FCM] 응답 상태:', response.status);
  } catch (error: any) {
    console.error('[FCM] 토큰 서버 등록 실패:', error);
    if (error.response) {
      console.error('[FCM] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
  }
}

/**
 * FCM 디바이스 토큰을 서버에서 비활성화
 *
 * 로그아웃/탈퇴 시 호출하여 현재 계정과 FCM 토큰의 연결을 해제한다.
 *
 * 성능 최적화:
 *   cachedUserId / cachedToken을 전달하면 내부에서 getUserInfo()와
 *   messaging().getToken()을 호출하지 않는다.
 *   messaging().getToken()은 콜드 스타트 시 수 초가 걸리므로,
 *   호출 측에서 AsyncStorage 캐시(@fcm_token)를 읽어 전달하는 것을 권장한다.
 *
 * @param cachedUserId 미리 조회한 userId (생략 시 내부에서 getUserInfo 호출)
 * @param cachedToken  미리 조회한 FCM 토큰 (생략 시 내부에서 messaging().getToken 호출)
 */

export async function unregisterFCMToken(
  cachedUserId?: number,
  cachedToken?: string,
): Promise<void> {
  try {
    // userId 확보: 캐시 → getUserInfo 폴백
    const userId = cachedUserId ?? (await getUserInfo())?.userId;
    if (!userId) {
      console.warn('[FCM] 사용자 정보 없음 - 토큰 해제 스킵');
      return;
    }

    // FCM 토큰 확보: 캐시 → AsyncStorage → messaging().getToken 폴백
    let token = cachedToken;
    if (!token) {
      token = (await AsyncStorage.getItem('@fcm_token')) ?? undefined;
    }
    if (!token) {
      try {
        token = await messaging().getToken();
      } catch {
        console.warn('[FCM] messaging().getToken() 실패');
      }
    }
    if (!token) {
      console.warn('[FCM] FCM 토큰 없음 - 토큰 해제 스킵');
      return;
    }

    console.log('[FCM] 토큰 서버 비활성화 시작:', { userId });

    const response = await client.patch(
      `/api/notification/token/deactivate?userId=${userId}`,
      { token },
    );

    console.log('[FCM] 토큰 서버 비활성화 성공');
    console.log('[FCM] 응답 상태:', response.status);
    console.log('[FCM] 응답 데이터:', response.data);
  } catch (error: any) {
    console.error('[FCM] 토큰 서버 비활성화 실패:', error);
    if (error.response) {
      console.error('[FCM] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
  }
}

/**
 * 알림 수신 여부 설정 업데이트
 *
 * @param userId 사용자 ID
 * @param notificationStatus 알림 수신 여부
 */
export async function updateNotificationStatus(
  userId: number,
  notificationStatus: boolean,
): Promise<void> {
  try {
    console.log('[알림 수신 설정 API] 요청 시작:', {
      userId,
      notificationStatus,
    });

    const response = await client.patch(
      `/api/user/notification?userId=${userId}`,
      { notificationStatus },
    );

    console.log('[알림 수신 설정 API] 성공');
    console.log('[알림 수신 설정 API] 응답 상태:', response.status);
    console.log('[알림 수신 설정 API] 응답 데이터:', response.data);
  } catch (error: any) {
    console.error('[알림 수신 설정 API] 에러:', error);
    if (error.response) {
      console.error('[알림 수신 설정 API] 응답 상태:', error.response.status);
      console.error('[알림 수신 설정 API] 응답 데이터:', error.response.data);
    }
  }
}

/**
 * 알림 목록 조회
 *
 * @param userId 사용자 ID
 */
export async function fetchNotifications(
  userId: number,
): Promise<NotificationItem[]> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[알림 목록 API] 요청 시작');
    console.log('[알림 목록 API] userId:', userId);

    const response = await client.get<NotificationItemRaw[]>(
      `/api/notification/get?userId=${userId}`,
    );

    console.log('[알림 목록 API] 응답 상태:', response.status);
    console.log('[알림 목록 API] 응답 데이터:', response.data);
    console.log('[알림 목록 API] 데이터 개수:', response.data.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const notifications: NotificationItem[] = response.data.map(item => ({
      notificationId: item.notificationId,
      title: item.title,
      message: item.body,
      createdAt: item.displayDate,
      isRead: item.isRead,
    }));

    return notifications;
  } catch (error: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[알림 목록 API] 에러 발생');
    console.error('[알림 목록 API] 에러:', error.message);
    if (error.response) {
      console.error('[알림 목록 API] 응답 상태:', error.response.status);
      console.error('[알림 목록 API] 응답 데이터:', error.response.data);
      console.error('[알림 목록 API] 응답 헤더:', error.response.headers);
    } else if (error.request) {
      console.error('[알림 목록 API] 요청은 전송되었으나 응답 없음');
      console.error('[알림 목록 API] 요청:', error.request);
    } else {
      console.error('[알림 목록 API] 요청 설정 중 에러');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw error;
  }
}

/**
 * 알림 읽음 처리
 *
 * @param userId 사용자 ID
 * @param notificationId 알림 ID
 */
export async function markNotificationAsRead(
  userId: number,
  notificationId: number,
): Promise<void> {
  try {
    console.log('[알림 읽음 처리 API] 요청 시작:', {
      userId,
      notificationId,
    });

    const response = await client.patch(
      `/api/notification/${notificationId}/read?userId=${userId}`,
    );

    console.log('[알림 읽음 처리 API] 성공');
    console.log('[알림 읽음 처리 API] 응답 상태:', response.status);
    console.log('[알림 읽음 처리 API] 응답 데이터:', response.data);
  } catch (error: any) {
    console.error('[알림 읽음 처리 API] 에러:', error);
    if (error.response) {
      console.error('[알림 읽음 처리 API] 응답 상태:', error.response.status);
      console.error('[알림 읽음 처리 API] 응답 데이터:', error.response.data);
    }
    throw error;
  }
}
