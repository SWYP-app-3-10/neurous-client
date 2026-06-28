/**
 * 소셜 로그인 통합 서비스 (socialLoginService.ts)
 *
 * Google, Kakao, Naver, Apple 네 가지 소셜 로그인 제공자를 통합 관리한다.
 *
 * 처리 흐름 (모든 제공자 공통):
 *   1. 소셜 SDK로 로그인 → 소셜 액세스 토큰 획득
 *   2. Google은 accessToken을 서버로 전달, Apple은 Firebase Auth 사용
 *   3. 서버 API 호출 (/api/auth/login/provider) → 서버 JWT 토큰 발급
 *   4. 서버 토큰 + 사용자 정보를 AsyncStorage에 일괄 저장 (saveAuthData → multiSet 1회)
 *   5. FCM 토큰 서버 등록 (백그라운드, 로그인 흐름 블로킹 없음)
 *   6. newUser 플래그 반환 (신규/기존 사용자 구분)
 */

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  login as kakaoLogin,
  getProfile as getKakaoProfile,
  logout as kakaoLogout,
} from '@react-native-seoul/kakao-login';
import NaverLogin from '@react-native-seoul/naver-login';
import { GOOGLE_CONFIG, NAVER_CONFIG } from '../config/socialLoginConfig';
import appleAuth from '@invertase/react-native-apple-authentication';
import {
  getAuth,
  AppleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { loginWithProvider } from '../api/authApi';
import { saveAuthData } from './authService';
import { registerFCMToken } from '../api/notificationApi';
import messaging from '@react-native-firebase/messaging';

export type SocialLoginProvider = 'GOOGLE' | 'KAKAO' | 'NAVER' | 'APPLE';

export interface SocialLoginResult {
  success: boolean;
  provider: SocialLoginProvider;
  accessToken?: string;
  userInfo?: {
    id: string;
    email?: string;
    name?: string;
    profileImage?: string;
  };
  newUser?: boolean;
  error?: string;
}

// ────────────────────────────────────────────────────────────────────────────────────────────
// 구글 로그인
// ────────────────────────────────────────────────────────────────────────────────────────────

export const initializeGoogleSignIn = () => {
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_CONFIG.webClientId,
      scopes: ['profile', 'email'],
      offlineAccess: true,
    });
  } catch (error) {
    console.warn('구글 로그인 초기화 실패:', error);
  }
};

export const signInWithGoogle = async (): Promise<SocialLoginResult> => {
  try {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    const googleAccessToken = tokens.accessToken;

    if (!googleAccessToken) {
      console.error('Google Access Token이 없습니다. tokens:', tokens);
      throw new Error('Google Access Token이 없습니다.');
    }

    let newUser = true;

    try {
      const loginResponse = await loginWithProvider('GOOGLE', {
        accessToken: googleAccessToken,
      });

      newUser = loginResponse.data?.newUser ?? true;

      // 서버 응답 데이터 일괄 저장 (multiSet 1회)
      if (loginResponse.data) {
        await saveAuthData({
          accessToken: loginResponse.data.accessToken,
          refreshToken: loginResponse.data.refreshToken,
          userInfo: loginResponse.data.userInfo
            ? {
                ...loginResponse.data.userInfo,
                provider: 'GOOGLE',
                loginTime: Date.now(),
                providerAccessToken: googleAccessToken,
              }
            : undefined,
        });
      } else if (loginResponse.token) {
        await saveAuthData({
          accessToken: loginResponse.token,
          refreshToken: loginResponse.refreshToken,
          userInfo: loginResponse.user
            ? {
                userId: parseInt(loginResponse.user.id, 10) || 0,
                name: loginResponse.user.name,
                email: loginResponse.user.email,
                profileImage: loginResponse.user.profileImage,
                provider: 'GOOGLE',
                loginTime: Date.now(),
                providerAccessToken: googleAccessToken,
              }
            : undefined,
        });
      } else {
        console.warn('서버에서 토큰을 받지 못했습니다.');
      }

      // FCM 토큰 서버 등록 (백그라운드)
      messaging()
        .getToken()
        .then(fcmToken => registerFCMToken(fcmToken))
        .then(() => console.log('[구글 로그인] FCM 토큰 등록 완료'))
        .catch(fcmError =>
          console.warn('[구글 로그인] FCM 토큰 등록 실패:', fcmError),
        );

      const responseUserInfo = loginResponse.data?.userInfo;
      const legacyUser = loginResponse.user;

      return {
        success: true,
        provider: 'GOOGLE',
        accessToken: googleAccessToken,
        userInfo: responseUserInfo
          ? {
              id: String(responseUserInfo.userId ?? ''),
              email: responseUserInfo.email,
              name: responseUserInfo.name,
              profileImage: responseUserInfo.profileImage,
            }
          : legacyUser
            ? {
                id: String(legacyUser.id ?? ''),
                email: legacyUser.email,
                name: legacyUser.name,
                profileImage: legacyUser.profileImage,
              }
            : undefined,
        newUser,
      };
    } catch (apiError: any) {
      console.error('서버 로그인 API 호출 실패:', apiError);
      console.log('[GoogleLogin] server error code:', apiError?.code);
      console.log('[GoogleLogin] server error message:', apiError?.message);
      console.log('[GoogleLogin] server error response:', apiError?.response);

      return {
        success: false,
        provider: 'GOOGLE',
        error: '서버 로그인에 실패했습니다. 다시 시도해주세요.',
      };
    }
  } catch (error: any) {
    console.error('구글 로그인 에러:', error);
    console.log('[GoogleLogin] ERROR raw:', error);
    console.log('[GoogleLogin] ERROR code:', error?.code);
    console.log('[GoogleLogin] ERROR message:', error?.message);
    console.log('[GoogleLogin] ERROR stack:', error?.stack);

    const isCancelled =
      error?.code === '12501' ||
      error?.message?.includes('SIGN_IN_CANCELLED') ||
      error?.message?.includes('Sign in action cancelled');

    if (isCancelled) {
      return {
        success: false,
        provider: 'GOOGLE',
        error: '로그인이 취소되었습니다.',
      };
    }

    return {
      success: false,
      provider: 'GOOGLE',
      error: error?.message || '구글 로그인에 실패했습니다.',
    };
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    try {
      initializeGoogleSignIn();
    } catch (initError) {
      console.warn('구글 로그인 초기화 실패 (로그아웃 시도):', initError);
    }
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('구글 로그아웃 실패:', error);
  }
};

// ────────────────────────────────────────────────────────────────────────────────────────────
// 카카오 로그인
// ────────────────────────────────────────────────────────────────────────────────────────────

export const signInWithKakao = async (): Promise<SocialLoginResult> => {
  try {
    const token = await kakaoLogin();
    const profile = await getKakaoProfile();
    const profileData = profile as any;

    const userInfo = {
      id: profileData.id?.toString() || '',
      email: profileData.kakaoAccount?.email || undefined,
      name:
        profileData.kakaoAccount?.profile?.nickname ||
        profileData.nickname ||
        undefined,
      profileImage:
        profileData.kakaoAccount?.profile?.profileImageUrl ||
        profileData.profileImageUrl ||
        undefined,
    };

    let newUser = true;

    try {
      const loginResponse = await loginWithProvider('KAKAO', {
        accessToken: token.accessToken,
      });

      newUser = loginResponse.data?.newUser ?? true;

      if (loginResponse.data) {
        await saveAuthData({
          accessToken: loginResponse.data.accessToken,
          refreshToken: loginResponse.data.refreshToken,
          userInfo: loginResponse.data.userInfo
            ? {
                ...loginResponse.data.userInfo,
                provider: 'KAKAO',
                loginTime: Date.now(),
                providerAccessToken: token.accessToken,
              }
            : undefined,
        });
      } else if (loginResponse.token) {
        await saveAuthData({
          accessToken: loginResponse.token,
          refreshToken: loginResponse.refreshToken,
          userInfo: loginResponse.user
            ? {
                userId: parseInt(loginResponse.user.id, 10) || 0,
                name: loginResponse.user.name,
                email: loginResponse.user.email,
                profileImage: loginResponse.user.profileImage,
                provider: 'KAKAO',
                loginTime: Date.now(),
                providerAccessToken: token.accessToken,
              }
            : undefined,
        });
      } else {
        console.warn('서버에서 토큰을 받지 못했습니다.');
      }

      // FCM 토큰 서버 등록 (백그라운드)
      messaging()
        .getToken()
        .then(fcmToken => registerFCMToken(fcmToken))
        .then(() => console.log('[카카오 로그인] FCM 토큰 등록 완료'))
        .catch(fcmError =>
          console.warn('[카카오 로그인] FCM 토큰 등록 실패:', fcmError),
        );
    } catch (apiError) {
      console.error('서버 로그인 API 호출 실패:', apiError);
      return {
        success: false,
        provider: 'KAKAO',
        error: '서버 로그인에 실패했습니다. 다시 시도해주세요.',
      };
    }

    return {
      success: true,
      provider: 'KAKAO',
      accessToken: token.accessToken,
      userInfo,
      newUser,
    };
  } catch (error: any) {
    console.error('카카오 로그인 에러:', error);

    const isCancelled =
      error?.code === 'E_CANCELLED' ||
      error?.message?.includes('cancelled') ||
      error?.message?.includes('취소');

    if (isCancelled) {
      return {
        success: false,
        provider: 'KAKAO',
        error: '로그인이 취소되었습니다.',
      };
    }

    return {
      success: false,
      provider: 'KAKAO',
      error: error?.message || '카카오 로그인에 실패했습니다.',
    };
  }
};

export const signOutKakao = async (): Promise<void> => {
  try {
    await kakaoLogout();
  } catch (error) {
    console.error('카카오 로그아웃 실패:', error);
  }
};

// ────────────────────────────────────────────────────────────────────────────────────────────
// 네이버 로그인
// ────────────────────────────────────────────────────────────────────────────────────────────

export const initializeNaverLogin = () => {
  try {
    if (NaverLogin && typeof NaverLogin.initialize === 'function') {
      NaverLogin.initialize({
        appName: NAVER_CONFIG.appName,
        consumerKey: NAVER_CONFIG.consumerKey,
        consumerSecret: NAVER_CONFIG.consumerSecret,
        serviceUrlSchemeIOS: NAVER_CONFIG.serviceUrlScheme,
      });
    }
  } catch (error) {
    console.warn('[NaverLogin] initialize failed:', error);
  }
};

export const signInWithNaver = async (): Promise<SocialLoginResult> => {
  try {
    initializeNaverLogin();

    const loginPromise = NaverLogin.login();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 5000);
    });

    let result: any;

    try {
      result = (await Promise.race([loginPromise, timeoutPromise])) as any;
    } catch (timeoutError: any) {
      if (timeoutError?.message === 'TIMEOUT') {
        console.log('[NaverLogin] timeout');
        return {
          success: false,
          provider: 'NAVER',
          error: '로그인이 취소되었습니다.',
        };
      }
      throw timeoutError;
    }

    if (!result) {
      console.log('[NaverLogin] result is empty');
      return {
        success: false,
        provider: 'NAVER',
        error: '네이버 로그인 응답이 없습니다.',
      };
    }

    if (!result?.isSuccess) {
      console.error('[NaverLogin] login failed:', {
        failureResponse: result?.failureResponse,
        result,
      });
      return {
        success: false,
        provider: 'NAVER',
        error:
          result?.failureResponse?.message ||
          result?.failureResponse?.errorDescription ||
          '네이버 로그인이 취소되었거나 실패했습니다.',
      };
    }

    const accessToken =
      result?.successResponse?.accessToken ||
      result?.accessToken ||
      result?.token;

    if (!accessToken) {
      console.error('[NaverLogin] successResponse:', result?.successResponse);
      return {
        success: false,
        provider: 'NAVER',
        error: '네이버 Access Token을 받지 못했습니다.',
      };
    }

    const profileResult = await NaverLogin.getProfile(accessToken);

    const userInfo = {
      id: profileResult?.response?.id || '',
      email: profileResult?.response?.email || undefined,
      name: profileResult?.response?.name || undefined,
      profileImage: profileResult?.response?.profile_image || undefined,
    };

    try {
      const loginResponse = await loginWithProvider('NAVER', {
        accessToken,
        email: userInfo.email,
      });

      await saveAuthData({
        accessToken: loginResponse.data?.accessToken,
        refreshToken: loginResponse.data?.refreshToken,
        userInfo: loginResponse.data?.userInfo
          ? {
              ...loginResponse.data.userInfo,
              provider: 'NAVER',
              loginTime: Date.now(),
              providerAccessToken: accessToken,
            }
          : undefined,
      });

      // FCM 토큰 서버 등록 (백그라운드)
      messaging()
        .getToken()
        .then(fcmToken => registerFCMToken(fcmToken))
        .then(() => console.log('[네이버 로그인] FCM 토큰 등록 완료'))
        .catch(fcmError =>
          console.warn('[네이버 로그인] FCM 토큰 등록 실패:', fcmError),
        );

      return {
        success: true,
        provider: 'NAVER',
        accessToken,
        userInfo,
        newUser: loginResponse.data?.newUser ?? true,
      };
    } catch (apiError: any) {
      console.error('[NaverLogin] server login failed:', apiError);
      console.log('[NaverLogin] server error code:', apiError?.code);
      console.log('[NaverLogin] server error message:', apiError?.message);
      console.log('[NaverLogin] server error response:', apiError?.response);

      return {
        success: false,
        provider: 'NAVER',
        error: '서버 연동 실패',
      };
    }
  } catch (error: any) {
    console.error('[NaverLogin] error:', error);
    console.log('[NaverLogin] ERROR raw:', error);
    console.log('[NaverLogin] ERROR code:', error?.code);
    console.log('[NaverLogin] ERROR message:', error?.message);
    console.log('[NaverLogin] ERROR stack:', error?.stack);

    const errorMessage = (error?.message || '').toLowerCase();
    const errorCode = String(error?.code || '');

    const isCancel =
      errorCode === 'USER_CANCEL' ||
      errorCode === 'CANCELLED' ||
      errorCode === 'E_CANCELLED' ||
      errorMessage.includes('취소') ||
      errorMessage.includes('cancel') ||
      errorMessage.includes('cancelled') ||
      errorMessage === 'timeout';

    if (isCancel) {
      return {
        success: false,
        provider: 'NAVER',
        error: '로그인이 취소되었습니다.',
      };
    }

    return {
      success: false,
      provider: 'NAVER',
      error: error?.message || '네이버 로그인 오류',
    };
  }
};

export const signOutNaver = async (): Promise<void> => {
  try {
    await NaverLogin.logout();
    console.log('[NaverLogin] logout success');
  } catch (error) {
    console.error('[NaverLogin] logout failed:', error);
  }
};

// ────────────────────────────────────────────────────────────────────────────────────────────
// 애플 로그인
// ────────────────────────────────────────────────────────────────────────────────────────────

export const signInWithApple = async (): Promise<SocialLoginResult> => {
  try {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const authorizationCode = appleAuthRequestResponse.authorizationCode;
    const identityToken = appleAuthRequestResponse.identityToken;
    const { user } = appleAuthRequestResponse;

    if (!identityToken) {
      throw new Error('Apple ID Token이 없습니다.');
    }

    if (!user) {
      throw new Error('Apple User ID가 없습니다.');
    }

    const authInstance = getAuth(getApp());
    const appleCredential = AppleAuthProvider.credential(
      identityToken,
      appleAuthRequestResponse.nonce || undefined,
    );

    const userCredential = await signInWithCredential(
      authInstance,
      appleCredential,
    );
    const firebaseUser = userCredential.user;

    const userInfo = {
      id: firebaseUser.uid,
      email: firebaseUser.email || appleAuthRequestResponse.email || undefined,
      name:
        firebaseUser.displayName ||
        appleAuthRequestResponse.fullName?.givenName ||
        undefined,
      profileImage: undefined,
    };

    let newUser = true;

    try {
      const loginResponse = await loginWithProvider('APPLE', {
        accessToken: identityToken,
        email: userInfo.email,
      });

      newUser = loginResponse.data?.newUser ?? true;

      if (loginResponse.data) {
        await saveAuthData({
          accessToken: loginResponse.data.accessToken,
          refreshToken: loginResponse.data.refreshToken,
          userInfo: loginResponse.data.userInfo
            ? {
                ...loginResponse.data.userInfo,
                provider: 'APPLE',
                loginTime: Date.now(),
                appleAuthorizationCode: authorizationCode || undefined,
              }
            : undefined,
        });
      } else if (loginResponse.token) {
        await saveAuthData({
          accessToken: loginResponse.token,
          refreshToken: loginResponse.refreshToken,
          userInfo: loginResponse.user
            ? {
                userId: parseInt(loginResponse.user.id, 10) || 0,
                name: loginResponse.user.name,
                email: loginResponse.user.email,
                profileImage: loginResponse.user.profileImage,
                provider: 'APPLE',
                loginTime: Date.now(),
                appleAuthorizationCode: authorizationCode || undefined,
              }
            : undefined,
        });
      } else {
        console.warn('서버에서 토큰을 받지 못했습니다.');
      }

      // FCM 토큰 서버 등록 (백그라운드)
      messaging()
        .getToken()
        .then(fcmToken => registerFCMToken(fcmToken))
        .then(() => console.log('[애플 로그인] FCM 토큰 등록 완료'))
        .catch(fcmError =>
          console.warn('[애플 로그인] FCM 토큰 등록 실패:', fcmError),
        );
    } catch (apiError) {
      console.error('서버 로그인 API 호출 실패:', apiError);
      return {
        success: false,
        provider: 'APPLE',
        error: '서버 로그인에 실패했습니다. 다시 시도해주세요.',
      };
    }

    return {
      success: true,
      provider: 'APPLE',
      accessToken: identityToken,
      userInfo,
      newUser,
    };
  } catch (err: any) {
    console.error('애플 로그인 에러:', err);
    return {
      success: false,
      provider: 'APPLE',
      error: err.message || '애플 로그인 실패',
    };
  }
};

// ────────────────────────────────────────────────────────────────────────────────────────────
// 통합 함수
// ────────────────────────────────────────────────────────────────────────────────────────────

export const signInWithSocial = async (
  provider: SocialLoginProvider,
): Promise<SocialLoginResult> => {
  switch (provider) {
    case 'GOOGLE':
      console.error('[GoogleLogin] before signInWithGoogle');
      return signInWithGoogle();

    case 'KAKAO':
      console.error('[KakaoLogin] before signInWithKakao');
      return signInWithKakao();

    case 'NAVER':
      console.error('[NaverLogin] before signInWithNaver');
      return signInWithNaver();

    case 'APPLE':
      console.error('[AppleLogin] before signInWithApple');
      return signInWithApple();

    default:
      return {
        success: false,
        provider,
        error: '지원하지 않는 소셜 로그인입니다',
      };
  }
};

export const signOutSocial = async (
  provider: SocialLoginProvider,
): Promise<void> => {
  switch (provider) {
    case 'GOOGLE':
      await signOutGoogle();
      break;
    case 'KAKAO':
      await signOutKakao();
      break;
    case 'NAVER':
      await signOutNaver();
      break;
    case 'APPLE':
      break;
  }
};
