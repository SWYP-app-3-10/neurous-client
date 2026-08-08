/**
 * Axios 공용 HTTP 클라이언트 (client.ts)
 *
 * 앱 전체에서 사용하는 Axios 인스턴스.
 * 모든 API 파일은 이 client를 import해 사용한다.
 *
 * 주요 기능:
 *   - baseURL 환경 분기 (개발 / 프로덕션)
 *   - Request Interceptor  : Authorization 헤더 자동 첨부
 *   - Response Interceptor : 401/403 → refreshToken 재발급 → 원래 요청 재시도
 *
 * 동시 401 처리:
 *   콜드 스타트 시 TanStack Query가 여러 API를 동시에 발사하면
 *   모두 401을 받을 수 있다. 이때 첫 번째 요청만 재발급을 시도하고
 *   나머지는 refreshSubscribers 큐에서 대기한다.
 *   재발급 성공 → 큐 전체에 새 토큰 전달 후 재시도
 *   재발급 실패 → 큐 전체 reject 후 로그아웃 처리
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  getAuthToken,
  getRefreshToken,
  saveAuthToken,
  saveRefreshToken,
} from '../services/authService';
import { refreshToken } from './authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingStore } from '../store/onboardingStore';
import { IS_PRODUCTION } from '../config/env';
import { DEV_URL, PROD_URL } from '../config/api';
import {
  showNetworkErrorToast,
  showGeneralErrorToast,
} from '../utils/errorToast';

// ─────────────────────────────────────────────────────────────
// Axios 인스턴스
// ─────────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: IS_PRODUCTION ? PROD_URL : DEV_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});
console.log('baseURL:', client.defaults.baseURL);
console.log('IS_PRODUCTION:', IS_PRODUCTION);

// ─────────────────────────────────────────────────────────────
// 토큰 재발급 상태 관리
// ─────────────────────────────────────────────────────────────

/** 재발급 진행 중 플래그 — true이면 후속 401은 큐에 대기 */
let isRefreshing = false;

/** 재발급 대기 큐 — 재발급 완료 후 일괄 resolve/reject */
let refreshSubscribers: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

/** 재발급 성공 시 큐의 모든 요청에 새 토큰 전달 */
const onRefreshSuccess = (newToken: string) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(newToken));
  refreshSubscribers = [];
};

/** 재발급 실패 시 큐의 모든 요청을 reject */
const onRefreshFailure = (error: any) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

// ─────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * 인증 데이터 삭제 + 로그인 화면 이동 트리거
 *
 * refreshToken 만료 또는 재발급 실패 시 호출한다.
 * AsyncStorage 토큰 삭제 → 온보딩 리셋 → RootNavigator가 감지하여 로그인 화면 전환
 */
const clearAuthAndRedirect = async () => {
  await AsyncStorage.multiRemove([
    '@auth_token',
    '@refresh_token',
    '@user_info',
  ]);
  await AsyncStorage.setItem('@onboarding_completed', 'false');
  await AsyncStorage.setItem('@onboarding_step', 'login');
  useOnboardingStore.getState().resetOnboarding();
};

// ─────────────────────────────────────────────────────────────
// Request Interceptor
// ─────────────────────────────────────────────────────────────

/**
 * 요청 직전 Authorization 헤더를 자동 첨부한다.
 *
 * 예외 (헤더 제거):
 *   - /api/auth/refresh : 만료된 accessToken이 딸려가면 서버 검증 실패
 *   - /api/auth/login/  : 탈퇴 후 재가입 시 이전 토큰이 남아 서버 500 유발
 */
client.interceptors.request.use(
  async config => {
    if (
      config.url?.includes('/api/auth/refresh') ||
      config.url?.includes('/api/auth/login/')
    ) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
    } else {
      const token = await getAuthToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (__DEV__) {
      const fullUrl = `${config.baseURL}${config.url}`;
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`[API 요청] ${config.method?.toUpperCase()} ${fullUrl}`);
      if (config.params) {
        console.log('[요청 파라미터]:', config.params);
      }
      if (config.data) {
        console.log('[요청 데이터]:', JSON.stringify(config.data, null, 2));
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return config;
  },
  error => {
    if (__DEV__) {
      console.error('[API 요청 에러]:', error);
    }
    return Promise.reject(error);
  },
);

// ─────────────────────────────────────────────────────────────
// Network Error 재시도
// ─────────────────────────────────────────────────────────────

/** 응답 자체를 못 받은 경우(Network Error, 타임아웃) 최대 재시도 횟수 */
const MAX_NETWORK_RETRY = 2;

/** ms만큼 대기 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 서버 응답을 아예 못 받은 요청인지 판별한다.
 * (4xx/5xx처럼 서버가 응답한 에러는 재시도 대상이 아님)
 */
const isNoResponseError = (error: AxiosError) => !error.response;

/**
 * 로그인/토큰 재발급 엔드포인트인지 판별한다.
 *
 * 이 두 엔드포인트는 이미 자체적인 사용자 피드백(로그인 실패 Alert,
 * 재발급 실패 시 로그아웃 처리)을 갖고 있으므로, 아래 공통 에러 토스트를
 * 중복으로 띄우지 않기 위해 제외 대상으로 둔다.
 */
const isAuthEndpoint = (url?: string) =>
  !!url &&
  (url.includes('/api/auth/login/') || url.includes('/api/auth/refresh'));

// ─────────────────────────────────────────────────────────────
// Response Interceptor
// ─────────────────────────────────────────────────────────────

/**
 * 401/403 응답 시 accessToken 재발급을 시도한다.
 *
 * 무한루프 방지:
 *   - _retry 플래그 : 같은 요청이 두 번 재시도되지 않도록 차단
 *   - isRefreshing  : 동시 401 시 첫 요청만 재발급, 나머지는 큐 대기
 */
client.interceptors.response.use(
  response => {
    if (__DEV__) {
      const fullUrl = `${response.config.baseURL}${response.config.url}`;
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        `[API 응답] ${response.config.method?.toUpperCase()} ${fullUrl}`,
      );
      console.log('[응답 데이터]:', JSON.stringify(response.data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
          _retryCount?: number;
        })
      | undefined;

    // ── Network Error / 타임아웃 재시도 ──────────────────────
    // 서버 응답 자체를 못 받은 경우(간헐적 커넥션 실패 등) 짧은 대기 후 재시도.
    // 4xx/5xx처럼 서버가 실제로 응답한 에러는 재시도하지 않는다.
    if (originalRequest && isNoResponseError(error)) {
      const retryCount = originalRequest._retryCount || 0;

      if (retryCount < MAX_NETWORK_RETRY) {
        originalRequest._retryCount = retryCount + 1;

        if (__DEV__) {
          console.warn(
            `[네트워크 재시도] ${retryCount + 1}/${MAX_NETWORK_RETRY} - ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`,
          );
        }

        await delay(500 * (retryCount + 1)); // 500ms, 1000ms ...
        return client(originalRequest);
      }
    }

    // ── 401 / 403 처리 ───────────────────────────────────────
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // refresh 엔드포인트 자체가 실패 → refreshToken도 만료 → 즉시 로그아웃
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        await clearAuthAndRedirect();
        return Promise.reject(error);
      }

      // 이미 재발급 진행 중 → 큐에 대기하고 새 토큰 받으면 재시도
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push({
            resolve: (newToken: string) => {
              originalRequest._retry = true;
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(client(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      // 첫 번째 401 요청 → 재발급 시도
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshTokenValue = await getRefreshToken();

        if (!refreshTokenValue) {
          isRefreshing = false;
          onRefreshFailure(error);
          await clearAuthAndRedirect();
          return Promise.reject(error);
        }

        const refreshResponse = await refreshToken(refreshTokenValue);

        // 서버 응답 구조 두 가지 대응 (data 래퍼 / 직접 반환)
        const newAccessToken =
          refreshResponse.data?.accessToken || refreshResponse.accessToken;

        if (!newAccessToken) {
          throw new Error('토큰 재발급 응답에 accessToken이 없음');
        }

        await saveAuthToken(newAccessToken);
        const newRefreshToken =
          refreshResponse.data?.refreshToken || refreshResponse.refreshToken;
        if (newRefreshToken) {
          await saveRefreshToken(newRefreshToken);
        }

        // 재발급 성공 → 큐의 모든 대기 요청에 새 토큰 전달
        isRefreshing = false;
        onRefreshSuccess(newAccessToken);

        // 원래 요청도 새 토큰으로 재시도
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return client(originalRequest);
      } catch (refreshError: any) {
        isRefreshing = false;
        onRefreshFailure(refreshError);

        // 서버가 명확히 401/403을 응답한 경우만 로그아웃 처리
        // Network Error(!refreshError.response)는 일시적 네트워크 문제이므로 로그아웃하지 않음
        if (
          refreshError.response?.status === 401 ||
          refreshError.response?.status === 403
        ) {
          await clearAuthAndRedirect();
        }

        if (refreshError.response?.status === 500) {
          return Promise.reject(refreshError);
        }

        return Promise.reject(error);
      }
    }

    // ── 그 외 에러 → 공통 에러 토스트 ─────────────────────────
    // 여기까지 내려오는 에러는 (1) 네트워크 재시도를 모두 소진했거나
    // (2) 401/403이 아닌 그 외 상태 코드(400/404/409/500 등)로 처리가
    // 끝난 경우다. 로그인/재발급 엔드포인트는 이미 자체 UI(Alert,
    // 로그아웃 처리)가 있으므로 중복 노출을 막기 위해 제외한다.
    if (!isAuthEndpoint(originalRequest?.url)) {
      if (isNoResponseError(error)) {
        showNetworkErrorToast(); // A. 네트워크 오류
      } else {
        showGeneralErrorToast(); // B. 일반 오류 (원인 특정이 어려운 나머지 실패)
      }
    }

    if (__DEV__) {
      const fullUrl = originalRequest
        ? `${originalRequest.baseURL}${originalRequest.url}`
        : '알 수 없음';
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(
        `[API 에러 응답] ${
          originalRequest?.method?.toUpperCase() || 'UNKNOWN'
        } ${fullUrl}`,
      );
      console.error(
        '[에러 상태]:',
        error.response?.status,
        error.response?.statusText,
      );
      if (error.response?.data) {
        console.error(
          '[에러 데이터]:',
          JSON.stringify(error.response.data, null, 2),
        );
      }
      if (error.message) {
        console.error('[에러 메시지]:', error.message);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return Promise.reject(error);
  },
);

export default client;
