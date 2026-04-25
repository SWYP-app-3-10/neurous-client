/**
 * 알림 관련 API
 */
import client from './client';
import { getUserInfo } from '../services/authService';
import { Platform } from 'react-native';

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
 * - 앱 실행 시 발급된 FCM 토큰을 서버에 저장
 * - 서버는 이 토큰으로 백그라운드/종료 상태의 디바이스에 푸시 발송
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

    await client.post('/api/notification/token', request);

    console.log('[FCM] 토큰 서버 등록 성공');
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
    console.log('[알림 목록 API] 요청 시작:', userId);

    // GET /api/notification/get?userId={userId}
    const response = await client.get<NotificationItemRaw[]>(
      `/api/notification/get?userId=${userId}`,
    );

    console.log('[알림 목록 API] 응답 성공:', response.data);

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
    console.error('[알림 목록 API] 에러:', error);
    if (error.response) {
      console.error('[알림 목록 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
}

/**
 * 알림 읽음 처리 (로컬 전용)
 *
 * - 백엔드에 읽음 처리 API가 없으므로 로컬 상태만 변경
 * - Optimistic Update와 함께 사용됨
 *
 * @param userId 사용자 ID
 * @param notificationId 알림 ID
 * @returns Promise<void>
 */
export async function markNotificationAsRead(
  userId: number,
  notificationId: number,
): Promise<void> {
  console.log('[알림 읽음 처리] 로컬만 처리:', {
    userId,
    notificationId,
  });

  // ⚠️ 백엔드 읽음 처리 API가 구현되면 주석 해제
  // try {
  //   await client.put(
  //     `/api/notifications/${notificationId}/read?userId=${userId}`,
  //   );
  //   console.log('[알림 읽음 처리 API] 성공');
  // } catch (error: any) {
  //   console.error('[알림 읽음 처리 API] 에러:', error);
  //   throw error;
  // }
}
