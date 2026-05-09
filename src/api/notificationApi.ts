/**
 * 알림 관련 API
 */
import client from './client';
import { getUserInfo } from '../services/authService';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

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
  body: string; // message가 아니라 body
  displayDate: string; // ISO 8601 형식
}

/**
 * 프론트엔드에서 사용할 알림 아이템 타입
 */
export interface NotificationItem {
  notificationId: number;
  title: string;
  message: string; // body를 message로 변환
  createdAt: string; // displayDate를 createdAt으로 변환 (ISO 8601)
  isRead: boolean; // 프론트에서 로컬 관리
}

/**
 * FCM 디바이스 토큰을 서버에 등록
 *
 * - 앱 실행 시 발급된 FCM 토큰을 서버에 저장
 * - 서버는 이 토큰으로 백그라운드/종료 상태의 디바이스에 푸시 발송
 *
 * @param token FCM 토큰
 * @returns Promise<void>
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

    // POST /api/notification/token
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
 * 로그아웃 시 호출하여 현재 계정과 FCM 토큰의 연결을 해제한다.
 * 이를 통해 로그아웃 후 해당 계정으로 푸시가 가지 않도록 한다.
 *
 * 주의:
 * - accessToken 삭제 전에 호출해야 한다.
 * - 실패해도 로그아웃은 계속 진행한다.
 *
 * @returns Promise<void>
 */
export async function unregisterFCMToken(): Promise<void> {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo || !userInfo.userId) {
      console.warn('[FCM] 사용자 정보 없음 - 토큰 해제 스킵');
      return;
    }

    const token = await messaging().getToken();
    if (!token) {
      console.warn('[FCM] FCM 토큰 없음 - 토큰 해제 스킵');
      return;
    }

    console.log('[FCM] 토큰 서버 비활성화 시작:', {
      userId: userInfo.userId,
    });

    // PATCH /api/notification/token/deactivate?userId={userId}
    // Body: { token: "..." }
    const response = await client.patch(
      `/api/notification/token/deactivate?userId=${userInfo.userId}`,
      {
        token,
      },
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
    // 실패해도 throw 안 함 (로그아웃은 계속 진행)
  }
}

/**
 * 알림 목록 조회
 *
 * - 백엔드 응답을 프론트엔드 형식으로 변환
 * - body → message
 * - displayDate → createdAt
 * - isRead는 기본값 false (백엔드에 필드 없음)
 *
 * @param userId 사용자 ID
 * @returns Promise<NotificationItem[]>
 */
export async function fetchNotifications(
  userId: number,
): Promise<NotificationItem[]> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[알림 목록 API] 요청 시작');
    console.log('[알림 목록 API] userId:', userId);

    // GET /api/notification/get?userId={userId}
    const response = await client.get<NotificationItemRaw[]>(
      `/api/notification/get?userId=${userId}`,
    );

    console.log('[알림 목록 API] 응답 상태:', response.status);
    console.log('[알림 목록 API] 응답 데이터:', response.data);
    console.log('[알림 목록 API] 데이터 개수:', response.data.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 백엔드 응답을 프론트엔드 형식으로 변환
    const notifications: NotificationItem[] = response.data.map(item => ({
      notificationId: item.notificationId,
      title: item.title,
      message: item.body, // body → message
      createdAt: item.displayDate, // displayDate → createdAt
      isRead: false, // 기본값: 읽지 않음 (백엔드에 필드 없음)
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
 * 사용자가 알림을 읽었을 때 읽음 처리를 수행한다.
 *
 * @param userId 사용자 ID
 * @param notificationId 알림 ID
 * @returns Promise<void>
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

    // PATCH /api/notification/{notificationId}/read?userId={userId}
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
