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
import { unregisterFCMToken } from '../api/notificationApi';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken as getKakaoAccessToken } from '@react-native-seoul/kakao-login';

export interface AuthStatus {
  isAuthenticated: boolean;
  userInfo?: RecentLoginInfo;
}

// ──────────────────────────────────────────────
// AsyncStorage 키 상수
// 여러 함수에서 공통으로 참조하므로 상수로 관리
// ──────────────────────────────────────────────
const AUTH_TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const USER_INFO_KEY = '@user_info';
const RECENT_PROVIDER_KEY = '@recent_provider'; // 최근 로그인한 소셜 제공자 저장용 키

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

/**
 * 현재 인증 상태를 확인한다.
 *
 * 서버에 별도 토큰 검증 요청을 보내지 않고,
 * AsyncStorage에 저장된 사용자 정보 존재 여부만으로 판단한다.
 *
 * 참고: 실제 토큰 유효성 검증은 API 요청 시 서버가 401/403을 반환하면
 *       client.ts의 Axios 인터셉터가 자동으로 리프레시 토큰으로 재발급하거나 로그아웃 처리한다.
 *
 * @returns isAuthenticated - 로컬에 사용자 정보가 있으면 true
 * @returns userInfo        - 저장된 최근 로그인 정보 (없으면 undefined)
 */
export const checkAuthStatus = async (): Promise<AuthStatus> => {
  try {
    const recentLogin = await getRecentLogin();

    // 로컬에 로그인 정보가 없으면 미인증 상태로 간주
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

/**
 * 액세스 토큰을 AsyncStorage에 저장한다.
 * 소셜 로그인 성공 후 서버에서 발급받은 JWT를 보관할 때 사용한다.
 *
 * @param token 서버 발급 JWT 액세스 토큰
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('토큰 저장 실패:', error);
  }
};

/**
 * 리프레시 토큰을 AsyncStorage에 저장한다.
 * 액세스 토큰 만료 시 client.ts 인터셉터가 이 값으로 재발급을 시도한다.
 *
 * @param refreshToken 서버 발급 리프레시 토큰
 */
export const saveRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('리프레시 토큰 저장 실패:', error);
  }
};

/**
 * AsyncStorage에서 리프레시 토큰을 조회한다.
 * 주로 client.ts의 Axios 인터셉터에서 액세스 토큰 재발급 시 호출한다.
 *
 * @returns 저장된 리프레시 토큰 문자열 (없으면 null)
 */
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

/**
 * 사용자 정보를 AsyncStorage에 JSON 형태로 저장한다.
 *
 * 저장 항목:
 *   - userId              : 서버에서 발급한 사용자 고유 ID
 *   - provider            : 소셜 로그인 제공자 (GOOGLE | KAKAO | NAVER | APPLE)
 *   - providerAccessToken : 소셜 unlink(탈퇴 시 연결 해제)에 필요한 소셜 액세스 토큰
 *   - appleAuthorizationCode : Apple 탈퇴 시 필요한 인가 코드 (Apple만 해당)
 *   - loginTime           : 자동 로그인 만료 기간 계산용 타임스탬프
 *
 * @param userInfo 저장할 사용자 정보 객체
 */
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

    // 로그아웃 후 로그인 화면 툴팁 표시를 위해 provider 별도 보존
    if (userInfo.provider) {
      await AsyncStorage.setItem(RECENT_PROVIDER_KEY, userInfo.provider);
    }
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
  }
};

/**
 * AsyncStorage에서 사용자 정보를 조회한다.
 * 로그아웃, 회원 탈퇴, 레벨 업데이트 등 userId가 필요한 곳에서 호출한다.
 *
 * @returns 파싱된 사용자 정보 객체 (저장값 없거나 오류 시 null)
 */
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

/**
 * AsyncStorage에서 액세스 토큰을 조회한다.
 * API 요청 시 Authorization 헤더에 삽입할 토큰을 가져올 때 사용한다.
 *
 * @returns 저장된 액세스 토큰 문자열 (없으면 null)
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('토큰 조회 실패:', error);
    return null;
  }
};

/**
 * AsyncStorage에서 사용자 정보(@user_info)를 삭제한다.
 * 로그아웃 시 단독으로 사용하거나, clearAllAuthData에서 내부 호출한다.
 */
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
 * 로그아웃을 처리한다. 다음 순서로 실행된다:
 *
 *   0. AsyncStorage에서 userId와 provider를 미리 읽어둔다 (삭제 전에 확보)
 *   1. 서버에 로그아웃 요청 → 리프레시 토큰 무효화
 *   2. FCM 토큰 서버에서 해제 → 이전 계정에 푸시 안 오도록
 *      (주의: accessToken 삭제 전에 호출해야 함)
 *   3. 소셜 SDK 로그아웃 (구글/카카오/네이버 세션 종료)
 *   4. AsyncStorage의 토큰 + 사용자 정보 + FCM 토큰 일괄 삭제
 *
 * @param provider 소셜 로그인 제공자. 생략 시 저장된 userInfo.provider를 사용한다.
 * @throws 로컬 로그아웃 도중 예상치 못한 오류 발생 시 throw
 */
export const logout = async (provider?: SocialLoginProvider): Promise<void> => {
  try {
    // ── STEP 0. 삭제 전에 userId와 provider를 먼저 읽어둠 ──
    const userInfo = await getUserInfo();
    const resolvedProvider = provider ?? userInfo?.provider;
    const userId = userInfo?.userId;

    // ── STEP 1. 서버 로그아웃 (리프레시 토큰 무효화) ──────
    if (userId) {
      try {
        await logoutFromServer(userId);
      } catch {
        console.warn(
          '[logout] 서버 로그아웃 실패 - 로컬 로그아웃은 계속 진행합니다.',
        );
      }
    }

    // ── STEP 2. FCM 토큰 서버에서 해제 ─────────────────
    // 주의: accessToken 삭제 전에 호출해야 함
    try {
      await unregisterFCMToken();
      console.log('[logout] FCM 토큰 서버 해제 완료');
    } catch (fcmError) {
      console.warn('[logout] FCM 토큰 서버 해제 실패:', fcmError);
      // 실패해도 로그아웃은 계속 진행
    }

    // ── STEP 3. 소셜 SDK 로그아웃 (소셜 세션 종료) ───────
    if (resolvedProvider) {
      await signOutSocial(resolvedProvider);
    }

    // ── STEP 4. 로컬 저장값 일괄 삭제 → 자동로그인 방지 ──
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_INFO_KEY,
      '@fcm_token', // FCM 토큰도 삭제
      '@fcm_token_pending', // 대기 토큰도 삭제
      '@difficulty_submit_date', // 로그아웃 시 난이도 제출 날짜 초기화
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

/**
 * 로그인 관련 로컬 데이터를 초기화한다. (개발/테스트 전용)
 *
 * 온보딩 상태 초기화는 onboardingStore.resetOnboarding()에서 별도 처리한다.
 * 이 함수는 AsyncStorage의 인증 정보(@user_info)만 삭제한다.
 */
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
 * 회원 탈퇴를 처리한다. 다음 순서로 실행된다:
 *
 *   1. 서버 탈퇴 API 호출 (unlinkSocial: true → 서버가 소셜 연결도 함께 해제)
 *   2. 소셜 SDK 로그아웃 (실패해도 로컬 정리는 진행)
 *   2.5. FCM 토큰 서버에서 해제 → 푸시 안 가도록
 *   3. AsyncStorage 토큰 3종 + 사용자 정보 + FCM 토큰 일괄 삭제
 *
 * 소셜 제공자별 unlink 토큰 전략:
 *   - GOOGLE : signInSilently()로 토큰을 재발급받아 최신 accessToken을 확보
 *   - KAKAO  : getKakaoAccessToken()으로 최신 accessToken 획득
 *              (반환 타입이 string 또는 object로 불일치할 수 있어 방어 처리 포함)
 *   - NAVER  : 로그인 시 저장한 accessToken을 그대로 사용
 *   - APPLE  : 로그인 시 저장한 authorizationCode를 사용
 *              (Apple은 accessToken 재발급 API 미제공)
 *
 * @throws userId 또는 provider 정보가 없을 때, 또는 서버 탈퇴 API 실패 시 throw
 */
export const withdraw = async (): Promise<void> => {
  try {
    const userInfo = await getUserInfo();
    const userId = userInfo?.userId;
    const provider = userInfo?.provider;

    // 탈퇴에 필수적인 정보가 없으면 즉시 에러 (재로그인 유도)
    if (!userId) {
      throw new Error(
        '유저 정보를 찾을 수 없습니다. 다시 로그인 후 시도해주세요.',
      );
    }
    if (!provider) {
      throw new Error('로그인 제공자(provider) 정보를 찾을 수 없습니다.');
    }

    // Apple은 accessToken 대신 authorizationCode를 사용하는 특수 케이스
    const isApple = provider === 'APPLE';

    // unlink 토큰 초깃값: 로그인 시 저장해둔 값 (backup)
    // 탈퇴 시점에 최신값 재획득을 시도하고, 실패 시 이 백업 값으로 폴백
    let providerAccessToken = userInfo?.providerAccessToken;
    const appleAuthorizationCode = userInfo?.appleAuthorizationCode;

    try {
      if (provider === 'GOOGLE') {
        // signInSilently: 백그라운드 재인증으로 accessToken 갱신
        // 실패해도 기존 저장값으로 시도하므로 내부 오류는 warn으로 처리
        try {
          await GoogleSignin.signInSilently();
        } catch (e) {
          console.warn('[withdraw][GOOGLE] signInSilently 실패:', e);
        }

        const tokens = await GoogleSignin.getTokens();
        // 재획득 성공 시 최신값 사용, 실패 시 기존 백업값 유지
        providerAccessToken = tokens?.accessToken ?? providerAccessToken;
      }

      if (provider === 'KAKAO') {
        const tokenInfo: any = await getKakaoAccessToken();

        // 카카오 SDK 버전에 따라 반환 타입이 string 또는 object로 다를 수 있음
        // → 두 경우 모두 대응하는 방어 로직
        if (typeof tokenInfo === 'string') {
          providerAccessToken = tokenInfo || providerAccessToken;
        } else {
          // object 타입: 가능한 키 이름을 순서대로 탐색
          providerAccessToken =
            tokenInfo?.accessToken ||
            tokenInfo?.token?.accessToken ||
            tokenInfo?.access_token ||
            providerAccessToken; // 모두 없으면 백업값 유지
        }
      }

      // NAVER: SDK가 별도 토큰 재발급 API 미제공 → 로그인 시 저장한 값 사용
      // APPLE: accessToken 재발급 불가 → 로그인 시 저장한 authorizationCode 사용
    } catch (e) {
      // 토큰 재획득 자체가 실패해도 백업 저장값으로 서버 요청을 시도
      console.warn(
        '[withdraw] unlink 토큰 재획득 실패 - 저장된 값으로 시도합니다.',
        e,
      );
    }

    // Apple이 아닌 경우 providerAccessToken은 필수값
    // (없으면 서버의 소셜 unlink가 불가능하므로 에러 처리)
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

    // ── STEP 1. 서버 탈퇴 + 소셜 unlink 요청 ──────────────────
    const requestBody: {
      unlinkSocial: boolean;
      providerAccessToken?: string;
      appleAuthorizationCode?: string;
    } = {
      unlinkSocial: true, // 서버가 소셜 unlink까지 함께 처리
    };

    // 제공자별로 필요한 토큰 필드만 포함
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

    // ── STEP 2. 소셜 SDK 로그아웃 ──────────────────────────────
    try {
      await signOutSocial(provider);
    } catch {
      console.warn(
        '[withdraw] 소셜 로그아웃 실패 - 로컬 정리는 계속 진행합니다.',
      );
    }

    // ── STEP 2.5. FCM 토큰 서버에서 해제 ────────────────────
    try {
      await unregisterFCMToken();
      console.log('[withdraw] FCM 토큰 서버 해제 완료');
    } catch (fcmError) {
      console.warn('[withdraw] FCM 토큰 서버 해제 실패:', fcmError);
    }

    // ── STEP 3. 로컬 데이터 일괄 삭제 ─────────────────────────
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_INFO_KEY,
      '@fcm_token', // FCM 토큰도 삭제
      '@fcm_token_pending', // 대기 토큰도 삭제
      '@difficulty_submit_date', // 로그아웃 시 난이도 제출 날짜 초기화
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
