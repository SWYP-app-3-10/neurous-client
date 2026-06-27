/**
 * 인증 관련 서비스 (authService.ts)
 *
 * JWT 토큰, 사용자 정보의 로컬 저장/조회/삭제와
 * 로그아웃 및 회원 탈퇴 흐름을 담당한다.
 *
 * AsyncStorage 키 구조:
 *   @auth_token    - 서버 발급 액세스 토큰
 *   @refresh_token - 서버 발급 리프레시 토큰
 *   @user_info     - 사용자 정보 JSON (userId, provider, 소셜 토큰 등 포함)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecentLogin, RecentLoginInfo } from './authStorageService';
import { signOutSocial, SocialLoginProvider } from './socialLoginService';
import { logoutFromServer } from '../api/authApi';
import { withdrawUser } from '../api/withdrawApi';
import {
  unregisterFCMToken,
  updateNotificationStatus,
} from '../api/notificationApi';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken as getKakaoAccessToken } from '@react-native-seoul/kakao-login';

export interface AuthStatus {
  isAuthenticated: boolean;
  userInfo?: RecentLoginInfo;
}

// ──────────────────────────────────────────────
// AsyncStorage 키 상수
// ──────────────────────────────────────────────
const AUTH_TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const USER_INFO_KEY = '@user_info';
const RECENT_PROVIDER_KEY = '@recent_provider';

export const getRecentProvider = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(RECENT_PROVIDER_KEY);
  } catch (error) {
    console.error('최근 로그인 provider 조회 실패:', error);
    return null;
  }
};

// ──────────────────────────────────────────────
// 인증 상태 확인
// ──────────────────────────────────────────────

export const checkAuthStatus = async (): Promise<AuthStatus> => {
  try {
    const recentLogin = await getRecentLogin();

    if (!recentLogin) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      userInfo: recentLogin,
    };
  } catch (error) {
    console.error('인증 상태 확인 중 오류:', error);
    return { isAuthenticated: false };
  }
};

// ──────────────────────────────────────────────
// 토큰 저장/조회
// ──────────────────────────────────────────────

export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('토큰 저장 실패:', error);
  }
};

export const saveRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('리프레시 토큰 저장 실패:', error);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('리프레시 토큰 조회 실패:', error);
    return null;
  }
};

// ──────────────────────────────────────────────
// 사용자 정보 저장/조회/삭제
// ──────────────────────────────────────────────

export const saveUserInfo = async (userInfo: {
  userId: number;
  name?: string;
  email?: string;
  profileImage?: string;
  provider?: string;
  loginTime?: number;
  providerAccessToken?: string;
  appleAuthorizationCode?: string;
}): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));

    if (userInfo.provider) {
      await AsyncStorage.setItem(RECENT_PROVIDER_KEY, userInfo.provider);
    }
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
  }
};

export const getUserInfo = async (): Promise<{
  userId: number;
  name?: string;
  email?: string;
  profileImage?: string;
  provider?: SocialLoginProvider;
  loginTime?: number;
  providerAccessToken?: string;
  appleAuthorizationCode?: string;
} | null> => {
  try {
    const data = await AsyncStorage.getItem(USER_INFO_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return null;
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('토큰 조회 실패:', error);
    return null;
  }
};

export const clearUserInfo = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_INFO_KEY);
  } catch (error) {
    console.error('사용자 정보 삭제 실패:', error);
  }
};

// ──────────────────────────────────────────────
// 로그아웃
// ──────────────────────────────────────────────

/**
 * 로그아웃을 처리한다.
 *
 * 성능 최적화:
 *   - getUserInfo() 1회만 호출 (기존 3회 → 1회)
 *   - FCM 토큰은 AsyncStorage 캐시(@fcm_token)에서 읽음
 *     (messaging().getToken()은 콜드 스타트 시 수 초 소요)
 *   - 서버 API 3개(logoutFromServer, unregisterFCMToken, updateNotificationStatus)를
 *     Promise.allSettled로 병렬 실행 (기존 순차 → 병렬)
 *
 * 실행 순서:
 *   1. 로컬에서 userInfo + FCM 캐시 토큰 조회 (AsyncStorage만, 네트워크 없음)
 *   2. 서버 API 3개 병렬 실행 (네트워크)
 *   3. 소셜 SDK 로그아웃
 *   4. AsyncStorage 일괄 삭제
 */
export const logout = async (provider?: SocialLoginProvider): Promise<void> => {
  try {
    // ── STEP 1. 로컬 데이터 조회 (1회) ───────────────────
    const userInfo = await getUserInfo();
    const resolvedProvider = provider ?? userInfo?.provider;
    const userId = userInfo?.userId;

    // FCM 토큰은 AsyncStorage 캐시에서 읽음 (messaging().getToken() 회피)
    const cachedFcmToken =
      (await AsyncStorage.getItem('@fcm_token')) ?? undefined;

    // ── STEP 2. 서버 API 병렬 실행 ───────────────────────
    // 세 API는 서로 의존성이 없으므로 병렬 처리
    // accessToken 삭제 전에 실행해야 하므로 STEP 4보다 먼저
    if (userId) {
      await Promise.allSettled([
        logoutFromServer(userId).catch(() =>
          console.warn(
            '[logout] 서버 로그아웃 실패 - 로컬 로그아웃은 계속 진행합니다.',
          ),
        ),
        unregisterFCMToken(userId, cachedFcmToken).catch(fcmError =>
          console.warn('[logout] FCM 토큰 서버 해제 실패:', fcmError),
        ),
        updateNotificationStatus(userId, false).catch(() =>
          console.warn(
            '[logout] 알림 수신 설정 리셋 실패 - 로그아웃은 계속 진행합니다.',
          ),
        ),
      ]);
    }

    // ── STEP 3. 소셜 SDK 로그아웃 ────────────────────────
    if (resolvedProvider) {
      await signOutSocial(resolvedProvider);
    }

    // ── STEP 4. 로컬 저장값 일괄 삭제 ────────────────────
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_INFO_KEY,
      '@fcm_token',
      '@fcm_token_pending',
      '@difficulty_submit_date',
      // RECENT_PROVIDER_KEY는 로그인 화면 툴팁 표시를 위해 유지
    ]);

    console.log('[logout] 완료');
  } catch (error) {
    console.error('로그아웃 중 오류:', error);
    throw error;
  }
};

// ──────────────────────────────────────────────
// 개발/테스트 유틸
// ──────────────────────────────────────────────

export const clearAllAuthData = async (): Promise<void> => {
  try {
    await clearUserInfo();
    console.log('모든 인증 정보 초기화 완료');
  } catch (error) {
    console.error('인증 정보 초기화 중 오류:', error);
  }
};

// ──────────────────────────────────────────────
// 회원 탈퇴
// ──────────────────────────────────────────────

/**
 * 회원 탈퇴를 처리한다.
 *
 * FCM 토큰 해제 시 AsyncStorage 캐시(@fcm_token)를 사용한다.
 * (messaging().getToken()은 콜드 스타트 시 수 초 소요되므로 회피)
 */
export const withdraw = async (): Promise<void> => {
  try {
    const userInfo = await getUserInfo();
    const userId = userInfo?.userId;
    const provider = userInfo?.provider;

    if (!userId) {
      throw new Error(
        '유저 정보를 찾을 수 없습니다. 다시 로그인 후 시도해주세요.',
      );
    }
    if (!provider) {
      throw new Error('로그인 제공자(provider) 정보를 찾을 수 없습니다.');
    }

    const isApple = provider === 'APPLE';

    let providerAccessToken = userInfo?.providerAccessToken;
    const appleAuthorizationCode = userInfo?.appleAuthorizationCode;

    try {
      if (provider === 'GOOGLE') {
        try {
          await GoogleSignin.signInSilently();
        } catch (e) {
          console.warn('[withdraw][GOOGLE] signInSilently 실패:', e);
        }

        const tokens = await GoogleSignin.getTokens();
        providerAccessToken = tokens?.accessToken ?? providerAccessToken;
      }

      if (provider === 'KAKAO') {
        const tokenInfo: any = await getKakaoAccessToken();

        if (typeof tokenInfo === 'string') {
          providerAccessToken = tokenInfo || providerAccessToken;
        } else {
          providerAccessToken =
            tokenInfo?.accessToken ||
            tokenInfo?.token?.accessToken ||
            tokenInfo?.access_token ||
            providerAccessToken;
        }
      }
    } catch (e) {
      console.warn(
        '[withdraw] unlink 토큰 재획득 실패 - 저장된 값으로 시도합니다.',
        e,
      );
    }

    if (!isApple && !providerAccessToken) {
      throw new Error(
        '소셜 연결 끊기에 필요한 providerAccessToken이 없습니다.',
      );
    }

    console.log('[withdraw] 최종 요청 준비:', {
      userId,
      provider,
      unlinkSocial: true,
      hasProviderAccessToken: !!providerAccessToken,
      hasAppleAuthorizationCode: !!appleAuthorizationCode,
    });

    // ── STEP 1. 서버 탈퇴 + 소셜 unlink 요청 ─────────────
    const requestBody: {
      unlinkSocial: boolean;
      providerAccessToken?: string;
      appleAuthorizationCode?: string;
    } = {
      unlinkSocial: true,
    };

    if (!isApple) {
      if (providerAccessToken) {
        requestBody.providerAccessToken = providerAccessToken;
      }
    } else {
      if (appleAuthorizationCode) {
        requestBody.appleAuthorizationCode = appleAuthorizationCode;
      }
    }

    await withdrawUser(userId, requestBody);

    // ── STEP 2. 소셜 SDK 로그아웃 ─────────────────────────
    try {
      await signOutSocial(provider);
    } catch {
      console.warn(
        '[withdraw] 소셜 로그아웃 실패 - 로컬 정리는 계속 진행합니다.',
      );
    }

    // ── STEP 2.5. FCM 토큰 서버에서 해제 ──────────────────
    // AsyncStorage 캐시에서 FCM 토큰을 읽어 전달 (messaging().getToken() 회피)
    try {
      const cachedFcmToken =
        (await AsyncStorage.getItem('@fcm_token')) ?? undefined;
      await unregisterFCMToken(userId, cachedFcmToken);
      console.log('[withdraw] FCM 토큰 서버 해제 완료');
    } catch (fcmError) {
      console.warn('[withdraw] FCM 토큰 서버 해제 실패:', fcmError);
    }

    // ── STEP 3. 로컬 데이터 일괄 삭제 ─────────────────────
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_INFO_KEY,
      '@fcm_token',
      '@fcm_token_pending',
      '@difficulty_submit_date',
    ]);

    console.log('[withdraw] 완료');
  } catch (error: any) {
    console.error('[withdraw] 실패:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
};
