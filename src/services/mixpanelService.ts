/**
 * Mixpanel 분석 서비스 (mixpanelService.ts)
 *
 * 디자인팀 이벤트 명세(Update v1 Analytics Event Tracking)에 정의된
 * 21개 사용자 행동 이벤트를 Mixpanel로 전송한다.
 *
 * 핵심 설계:
 *   - 모든 이벤트에 user_id(서버 발급 회원 ID)와 session_id를 자동 첨부
 *   - session_id는 앱 실행(콜드 스타트)마다 새로 생성 — `s_타임스탬프_랜덤` 형식
 *   - IS_PRODUCTION이 false면 Mixpanel로 전송하지 않고 콘솔 로그만 출력
 *     (analyticsService.ts의 Firebase 게이트와 동일한 정책)
 *   - 이벤트 이름은 MixpanelEventName 유니온 타입으로 제한해 오타 방지
 *
 * 사용 흐름:
 *   1. App.tsx        → initMixpanel() 호출 (앱 시작 시 1회)
 *   2. authService    → 로그인 시 identifyUser(userId), 로그아웃/탈퇴 시 resetUser()
 *   3. 각 화면/훅     → trackEvent('article_start', { article_id, ... })
 */

import { Mixpanel } from 'mixpanel-react-native';
import { IS_PRODUCTION } from '../config/env';

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────

/** Mixpanel 프로젝트 토큰 (디자인팀 전달값, 비밀키 아님) */
const MIXPANEL_TOKEN = '4642625bc9c193ba5aacbcd67fcfae5a';

/** Mixpanel 자동 이벤트(app open 등) 수집 여부 — 명세된 이벤트만 수집하므로 비활성화 */
const TRACK_AUTOMATIC_EVENTS = false;

// ──────────────────────────────────────────────
// 이벤트 이름 타입 (명세서의 21개 이벤트)
// ──────────────────────────────────────────────

export type MixpanelEventName =
  | 'article_start'
  | 'quiz_enter'
  | 'quiz_complete'
  | 'reward_popup_view'
  | 'level_up_popup_view'
  | 'level_up_popup_confirm'
  | 'character_growth_view'
  | 'growth_guide_view'
  | 'interest_selected'
  | 'difficulty_selected'
  | 'difficulty_changed'
  | 'difficulty_recommendation_view'
  | 'difficulty_recommendation_accepted'
  | 'difficulty_recommendation_dismissed'
  | 'mission_complete'
  | 'point_use_popup_view'
  | 'point_use_confirm'
  | 'ad_popup_view'
  | 'ad_watch_complete'
  | 'search_result_click'
  | 'my_page_view';

/** article_start의 진입 경로 (하단 탭 기준 4종) */
export type ArticleEntrySource = 'home' | 'explore' | 'search' | 'my_page';

// ──────────────────────────────────────────────
// 내부 상태
// ──────────────────────────────────────────────

/** Mixpanel 인스턴스 (프로덕션에서만 생성) */
let mixpanel: Mixpanel | null = null;

/** identify된 회원 ID — 모든 이벤트의 user_id로 자동 첨부 */
let currentUserId: number | null = null;

/**
 * 세션 ID
 *
 * 앱 실행(콜드 스타트)마다 새로 생성되며, 그 실행 동안 발생하는
 * 모든 이벤트에 동일한 값이 붙는다. 형식: s_타임스탬프_랜덤6자리
 */
const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ──────────────────────────────────────────────
// 초기화 / 사용자 식별
// ──────────────────────────────────────────────

/**
 * Mixpanel을 초기화한다. 앱 시작 시(App.tsx) 1회 호출.
 *
 * 프로덕션이 아니면 SDK를 초기화하지 않는다 (콘솔 로그 모드).
 *
 * @param userId 이미 로그인된 상태로 앱을 켠 경우의 회원 ID (선택)
 */
export const initMixpanel = async (userId?: number): Promise<void> => {
  try {
    if (userId) {
      currentUserId = userId;
    }

    if (!IS_PRODUCTION) {
      console.log('[Mixpanel - Dev] init (로그 모드), session_id:', sessionId);
      return;
    }

    mixpanel = new Mixpanel(MIXPANEL_TOKEN, TRACK_AUTOMATIC_EVENTS);
    await mixpanel.init();

    if (userId) {
      await mixpanel.identify(String(userId));
    }
  } catch (error) {
    console.error('Mixpanel 초기화 오류:', error);
  }
};

/**
 * 로그인한 회원을 Mixpanel에 식별시킨다. 로그인 성공 시 호출.
 *
 * 이후 발생하는 모든 이벤트가 이 회원 기준으로 묶인다.
 *
 * @param userId 서버 발급 회원 고유 ID
 */
export const identifyUser = async (userId: number): Promise<void> => {
  try {
    currentUserId = userId;

    if (!IS_PRODUCTION) {
      console.log('[Mixpanel - Dev] identify:', userId);
      return;
    }

    await mixpanel?.identify(String(userId));
  } catch (error) {
    console.error('Mixpanel identify 오류:', error);
  }
};

/**
 * 사용자 식별 정보를 초기화한다. 로그아웃/회원 탈퇴 시 호출.
 */
export const resetUser = (): void => {
  try {
    currentUserId = null;

    if (!IS_PRODUCTION) {
      console.log('[Mixpanel - Dev] reset');
      return;
    }

    mixpanel?.reset();
  } catch (error) {
    console.error('Mixpanel reset 오류:', error);
  }
};

// ──────────────────────────────────────────────
// 이벤트 전송
// ──────────────────────────────────────────────

/**
 * 이벤트를 Mixpanel로 전송한다.
 *
 * user_id, session_id는 자동으로 첨부되므로 호출부에서 넣지 않아도 된다.
 *
 * 사용 예시:
 *   trackEvent('article_start', {
 *     article_id: 'article_12345',
 *     category: '경제',
 *     difficulty: '중급',
 *     entry_source: 'home',
 *   });
 *
 * @param eventName  명세서에 정의된 이벤트 이름
 * @param properties 이벤트별 추가 속성 (선택)
 */
export const trackEvent = (
  eventName: MixpanelEventName,
  properties?: Record<string, any>,
): void => {
  try {
    const payload = {
      user_id: currentUserId,
      session_id: sessionId,
      ...properties,
    };

    if (!IS_PRODUCTION) {
      console.log('[Mixpanel - Dev] Event:', eventName, payload);
      return;
    }

    mixpanel?.track(eventName, payload);
  } catch (error) {
    console.error('Mixpanel trackEvent 오류:', error);
  }
};
