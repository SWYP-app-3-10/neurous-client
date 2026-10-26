/**
 * Firebase Analytics 서비스 (analyticsService.ts)
 *
 * 사용자 행동 추적 및 화면 조회 이벤트를 Firebase에 전송한다.
 *
 * 핵심 전략:
 *   - Firebase 자동 screen_view 이벤트 대신, 화면 이름을 직접 이벤트 이름으로 사용
 *   - RouteNames → 사용자 친화적 이름(screenNameMap)으로 변환 후 전송
 *   - IS_PRODUCTION 플래그로 프로덕션 환경에서만 로그 전송 (개발 중엔 로그 미전송)
 *
 * adConfig.ts의 IS_PRODUCTION 값을 true로 설정해야 로그가 Firebase에 기록된다.
 */

import {
  getAnalytics,
  logEvent as firebaseLogEvent,
} from '@react-native-firebase/analytics';
import { getApp } from '@react-native-firebase/app';
import { RouteNames } from '../../routes';
import { IS_PRODUCTION } from '../config/env';

/**
 * 화면 이름 매핑 테이블
 *
 * 앱 내부 RouteNames를 Firebase에 전송할 때 사용할
 * 사용자 친화적이고 분석에 유리한 이름으로 변환한다.
 *
 * 매핑 원칙:
 *   - 온보딩: Onboarding_XXX
 *   - 메인 기능: Home, Reading, Quiz, Character 등 단순 명사형
 *   - 검색: Explore, Search
 *
 * 매핑되지 않은 화면은 기본적으로 로그를 전송하지 않는다.
 * (forceLog=true 옵션으로 예외 처리 가능)
 */
const screenNameMap: Record<string, string> = {
  // ──────────────────────────────────────────────
  // 온보딩
  // ──────────────────────────────────────────────
  [RouteNames.INTRO_CARDLIST]: 'Onboarding_Function01_CardList',
  [RouteNames.INTRO_FUNCTION]: 'Onboarding_Function02_Character',
  [RouteNames.INTRO_SEARCH]: 'Onboarding_Function03_Explore',
  [RouteNames.SOCIAL_LOGIN]: 'Onboarding_SocialLogin',
  [RouteNames.TERMS_AGREEMENT]: 'AgreeToTerms',
  [RouteNames.INTERESTS]: 'Onboarding_Interests',
  [RouteNames.DIFFICULTY_SETTING]: 'Onboarding_Difficulty',

  // ──────────────────────────────────────────────
  // 미션 (메인 기능)
  // ──────────────────────────────────────────────
  [RouteNames.MISSION]: 'Home',
  [RouteNames.ARTICLE_DETAIL]: 'Reading',
  [RouteNames.READ_ARTICLE_DETAIL]: 'ReadingDetails',
  [RouteNames.QUIZ]: 'Quiz',

  // ──────────────────────────────────────────────
  // 광고
  // ──────────────────────────────────────────────
  [RouteNames.AD_LOADING]: 'Advertisement',

  // ──────────────────────────────────────────────
  // 검색
  // ──────────────────────────────────────────────
  [RouteNames.SEARCH]: 'Explore',
  [RouteNames.SEARCH_INPUT]: 'Search',
  [RouteNames.SEARCH_RESULT]: 'SearchResults',

  // ──────────────────────────────────────────────
  // 캐릭터
  // ──────────────────────────────────────────────
  [RouteNames.CHARACTER]: 'Character',
  [RouteNames.CHARACTER_POINT_HISTORY]: 'ConfirmEarnedHistory',
  [RouteNames.CHARACTER_NOTIFICATION]: 'Alarm',
  [RouteNames.CHARACTER_CRITERIA]: 'GrowthGuide',

  // ──────────────────────────────────────────────
  // 마이페이지
  // ──────────────────────────────────────────────
  [RouteNames.MY_PAGE]: 'My',
  [RouteNames.SETTINGS]: 'Settings',
  [RouteNames.LOGIN_INFO]: 'LoginInfo',
  [RouteNames.INQUIRY]: 'Inquiry',
  [RouteNames.TERMS_OF_SERVICE]: 'TermsOfService',
  [RouteNames.PRIVACY_POLICY]: 'PrivacyPolicy',
};

/**
 * RouteNames를 Firebase 전송용 화면 이름으로 변환한다.
 *
 * @param routeName 앱 내부 라우트 이름 (RouteNames 상수)
 * @returns 매핑된 화면 이름 (없으면 null)
 */
const getScreenName = (routeName: string): string | null => {
  return screenNameMap[routeName] || null;
};

/**
 * 주어진 RouteNames가 매핑 테이블에 등록되어 있는지 확인한다.
 *
 * 화면 진입 전에 로그를 보낼지 판단할 때 사용한다.
 *
 * @param routeName 앱 내부 라우트 이름
 * @returns 매핑 여부 (true면 로그 전송 대상)
 */
export const isScreenMapped = (routeName: string): boolean => {
  return routeName in screenNameMap;
};

/**
 * 화면 조회 이벤트를 Firebase에 전송한다.
 *
 * Firebase의 자동 screen_view 이벤트 대신,
 * 화면 이름을 직접 이벤트 이름으로 사용해 더 명확한 퍼널 분석이 가능하다.
 *
 * 동작 흐름:
 *   1. IS_PRODUCTION이 false면 즉시 종료 (개발 중엔 로그 미전송)
 *   2. RouteNames인 경우 screenNameMap에서 변환된 이름 조회
 *   3. 매핑 없고 forceLog=false면 종료 (로그 미전송)
 *   4. 매핑된 이름이나 forceLog=true인 경우 Firebase로 이벤트 전송
 *
 * @param screenName 화면 이름 (RouteNames 또는 커스텀 이름)
 * @param screenClass 화면 클래스 (현재 미사용, Firebase 자동 screen_view 호환용 인자)
 * @param forceLog 매핑되지 않은 경우에도 강제로 로그 전송 (기본값: false)
 *                  예: 팝업 이름을 직접 전송하고 싶을 때 true로 설정
 */
export const logScreenView = async (
  screenName: string,
  screenClass?: string,
  forceLog: boolean = false,
): Promise<void> => {
  try {
    // 프로덕션 모드가 아니면 로그를 Firebase에 전송하지 않음
    if (!IS_PRODUCTION) {
      return;
    }

    // RouteNames인 경우 매핑된 이름 조회
    const mappedName = getScreenName(screenName);

    // 매핑 없고 forceLog가 false면 로그를 보내지 않음
    // (매핑되지 않은 화면은 분석 대상이 아니라고 간주)
    if (!mappedName && !forceLog) {
      return;
    }

    // 매핑된 이름이 있으면 사용, 없으면 원래 이름 사용 (forceLog인 경우)
    const finalScreenName = mappedName || screenName;

    // 화면 이름을 직접 이벤트 이름으로 사용
    // (Firebase의 자동 screen_view 대신 커스텀 이벤트로 전송)
    const analyticsInstance = getAnalytics(getApp());
    await firebaseLogEvent(analyticsInstance, finalScreenName);
  } catch (error) {
    console.error('Analytics logScreenView 오류:', error);
  }
};

/**
 * 커스텀 이벤트를 Firebase에 전송한다.
 *
 * 화면 조회 외에 사용자 액션(버튼 클릭, 로그인, 퀴즈 제출 등)을 추적할 때 사용한다.
 *
 * 사용 예시:
 *   - logEvent('kakao_login_Onboarding_SocialLogin') // 카카오 로그인 버튼 클릭
 *   - logEvent('quiz_start', { articleId: 123 })     // 퀴즈 시작 (파라미터 포함)
 *   - logEvent('Dismiss_Popup_Local_Notification_Local') // 팝업 닫기
 *
 * @param eventName 이벤트 이름 (자유 형식)
 * @param params 이벤트와 함께 전송할 추가 데이터 (선택사항)
 *               예: { articleId: 123, difficulty: 'hard' }
 */
export const logEvent = async (
  eventName: string,
  params?: Record<string, any>,
): Promise<void> => {
  try {
    // 프로덕션 모드가 아니면 로그를 Firebase에 전송하지 않음
    if (!IS_PRODUCTION) {
      console.log('[Analytics - Dev] Event:', eventName, params);
      return;
    }

    const analyticsInstance = getAnalytics(getApp());
    await firebaseLogEvent(analyticsInstance, eventName, params);
  } catch (error) {
    console.error('Analytics logEvent 오류:', error);
  }
};
