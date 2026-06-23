/**
 * Axios 공용 HTTP 클라이언트
 *
 * 앱 전체에서 사용하는 Axios 인스턴스.
 * 모든 API 파일은 이 client를 import해 사용함.
 *
 * [포함된 기능]
 * - baseURL 환경 분기 (개발 / 프로덕션)
 * - Request Interceptor  : 요청 직전 Authorization 헤더 자동 첨부
 * - Response Interceptor : 401/403 감지 → refreshToken으로 자동 재발급 → 원래 요청 재시도
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

// ─────────────────────────────────────────────────────────────
// Axios 인스턴스 생성
// ─────────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: IS_PRODUCTION ? PROD_URL : DEV_URL, // 환경에 따라 baseURL 분기
  timeout: 10000, // 10초 타임아웃 (네트워크가 느릴 때 무한 대기 방지)
  headers: {
    'Content-Type': 'application/json',
  },
});
console.log('baseURL:', client.defaults.baseURL);
console.log('IS_PRODUCTION:', IS_PRODUCTION);

// ─────────────────────────────────────────────────────────────
// 전역 상태 플래그
// ─────────────────────────────────────────────────────────────

/**
 * 토큰 재발급이 진행 중인지 나타내는 플래그
 *
 * 여러 요청이 동시에 401을 받았을 때 refreshToken API를
 * 중복 호출하지 않도록 막는 역할을 함.
 *
 * true  → 이미 재발급 중 → 추가 재발급 시도 없이 에러 반환
 * false → 재발급 중 아님 → 정상적으로 재발급 시도
 */
let isRefreshing = false;

// ─────────────────────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────────────────────

/**
 * 토큰 삭제 + 온보딩 상태 초기화 (로그인 화면으로 이동 처리)
 *
 * refreshToken 만료 또는 재발급 실패 시 호출.
 * AsyncStorage에서 인증 관련 데이터를 전부 삭제하고,
 * Zustand onboardingStore를 리셋해 RootNavigator가
 * 로그인 화면으로 전환하도록 트리거함.
 */
const clearAuthAndRedirect = async () => {
  await AsyncStorage.multiRemove([
    '@auth_token',
    '@refresh_token',
    '@user_info',
  ]);
  await AsyncStorage.setItem('@onboarding_completed', 'false');
  await AsyncStorage.setItem('@onboarding_step', 'login');
  // Zustand store 리셋 → RootNavigator가 상태 감지 후 로그인 화면으로 이동
  useOnboardingStore.getState().resetOnboarding();
};

// ─────────────────────────────────────────────────────────────
// Request Interceptor (요청 인터셉터)
// ─────────────────────────────────────────────────────────────

/**
 * 모든 요청이 서버로 전송되기 직전에 실행됨
 *
 * [역할]
 * 1. AsyncStorage에서 accessToken을 꺼내 Authorization 헤더에 자동 첨부
 * 2. /api/auth/refresh 요청은 헤더 첨부 생략
 *    (refreshToken을 body로 보내는 API라 Authorization 헤더 불필요)
 * 3. DEV 모드에서 요청 URL, 파라미터, 데이터 로그 출력
 */
client.interceptors.request.use(
  async config => {
    if (
      config.url?.includes('/api/auth/refresh') ||
      config.url?.includes('/api/auth/login/')
    ) {
      // 인증이 필요 없는 공개 엔드포인트는 Authorization 헤더 제거
      // - /api/auth/refresh : 헤더가 있으면 만료된 토큰을 검증하려다 실패할 수 있음
      // - /api/auth/login/  : 소셜 로그인 API로, 헤더에 이전 계정 토큰이 남아있으면
      //                       탈퇴된 계정 토큰이 딸려가 서버 500 유발 가능
      if (config.headers) {
        delete config.headers.Authorization;
      }
    } else {
      // 그 외 모든 요청: AsyncStorage에서 토큰을 꺼내 헤더에 첨부
      const token = await getAuthToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // DEV 모드에서 요청 로깅
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
    // 요청 자체를 만들지 못한 경우 (설정 오류 등)
    if (__DEV__) {
      console.error('[API 요청 에러]:', error);
    }
    return Promise.reject(error);
  },
);

// ─────────────────────────────────────────────────────────────
// Response Interceptor (응답 인터셉터)
// ─────────────────────────────────────────────────────────────

/**
 * 서버 응답이 돌아왔을 때 실행됨
 *
 * [성공 (2xx)]
 * - DEV 모드 응답 로그 출력 후 그대로 반환
 *
 * [실패 (401 / 403)]
 * - accessToken 만료로 간주하고 자동 갱신 시도
 * - 갱신 성공 → 새 토큰으로 원래 요청 재시도
 * - 갱신 실패 → AsyncStorage 전체 삭제 + 로그인 화면으로 이동
 *
 * [무한루프 방지 메커니즘]
 * - _retry 플래그  : 같은 요청이 두 번 재시도되지 않도록 차단
 * - isRefreshing   : 동시에 여러 요청이 각각 재발급을 시도하지 않도록 차단
 */
client.interceptors.response.use(
  response => {
    // 2xx 성공 응답: DEV 모드 로그 출력 후 그대로 반환
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
    // _retry 플래그를 추가하기 위해 타입 확장
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean; // true면 이미 재시도한 요청 → 재시도 금지
        })
      | undefined;

    // ── 401 / 403 에러 처리 ──────────────────────────────────
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      originalRequest &&
      !originalRequest._retry // 이미 재시도한 요청이면 스킵 (무한루프 방지)
    ) {
      // refresh 엔드포인트 자체가 401/403을 반환한 경우
      // → refreshToken도 만료됐다는 의미이므로 바로 로그아웃 처리
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        await clearAuthAndRedirect();
        return Promise.reject(error);
      }

      // 이미 다른 요청이 재발급 중이면 현재 요청은 에러 반환
      // (재발급 완료 후 자동 재시도 기능은 미구현 → 각 요청이 독립 처리)
      if (isRefreshing) {
        return Promise.reject(error);
      }

      // 재시도 플래그 설정 (이 요청이 다시 401을 받아도 재시도하지 않도록)
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // AsyncStorage에서 refreshToken 조회
        const refreshTokenValue = await getRefreshToken();

        if (!refreshTokenValue) {
          // refreshToken 자체가 없으면 → 로그아웃 처리
          isRefreshing = false;
          await clearAuthAndRedirect();
          return Promise.reject(error);
        }

        // refreshToken으로 새 accessToken 요청
        const refreshResponse = await refreshToken(refreshTokenValue);

        // 서버 응답 구조가 두 가지 형태로 올 수 있어 둘 다 대응
        // (data 래퍼 방식 vs 직접 반환 방식 — RefreshTokenResponse 타입 참고)
        const newAccessToken =
          refreshResponse.data?.accessToken || refreshResponse.accessToken;

        if (!newAccessToken) {
          throw new Error('토큰 재발급 응답에 accessToken이 없음');
        }

        // 새 토큰 AsyncStorage에 저장
        await saveAuthToken(newAccessToken);
        const newRefreshToken =
          refreshResponse.data?.refreshToken || refreshResponse.refreshToken;
        if (newRefreshToken) {
          await saveRefreshToken(newRefreshToken);
        }

        // 재발급 완료 → 원래 요청 Authorization 헤더 교체 후 재시도
        isRefreshing = false;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return client(originalRequest);
      } catch (refreshError: any) {
        isRefreshing = false;

        // 재발급 실패 케이스별 처리
        if (
          refreshError.response?.status === 401 ||
          refreshError.response?.status === 403 ||
          !refreshError.response // 네트워크 단절 등 응답 자체가 없는 경우
        ) {
          // refreshToken 만료 또는 네트워크 오류 → 로그아웃 처리
          await clearAuthAndRedirect();
        }

        if (refreshError.response?.status === 500) {
          // 서버 내부 오류는 로그아웃 없이 에러만 전파
          // (서버 일시 오류일 수 있으므로 토큰 삭제 안 함)
          return Promise.reject(refreshError);
        }

        return Promise.reject(error);
      }
    }

    // ── 그 외 에러: DEV 모드 로그 출력 ──────────────────────
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
