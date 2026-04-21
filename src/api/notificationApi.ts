/**
 * 알림 관련 API
 */
import client from './client';
import { getUserInfo } from '../services/authService';
import { Platform } from 'react-native';

export interface RegisterTokenRequest {
  userId: number;
  token: string;
  platform: 'ANDROID' | 'IOS';
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
    // 토큰 등록 실패해도 앱 동작에 영향 없도록 throw하지 않음
  }
}
