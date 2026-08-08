/**
 * 라우트 이름 상수 정의 (routes.ts)
 *
 * React Navigation에서 사용되는 모든 화면의 라우트 이름을 정의한다.
 *
 * 사용 예시:
 *   navigation.navigate(RouteNames.ARTICLE_DETAIL, { articleId: 1 });
 *
 * 네이밍 규칙:
 *   - 케밥 케이스 (kebab-case) 사용
 *   - 탭 이름은 한글 사용 (홈, 캐릭터, 탐색, 마이)
 *   - as const로 리터럴 타입 보장
 */

export const RouteNames = {
  // ──────────────────────────────────────────────
  // 스플래시
  // ──────────────────────────────────────────────
  /** 스플래시 화면 */
  SPLASH: 'splash' as const,

  // ──────────────────────────────────────────────
  // 온보딩 스택
  // ──────────────────────────────────────────────
  /** 온보딩 스택 (최상위) */
  ONBOARDING: 'onboarding' as const,

  /** 소셜 로그인 화면 */
  SOCIAL_LOGIN: 'social-login' as const,

  /** 약관 동의 화면 */
  TERMS_AGREEMENT: 'terms-agreement' as const,

  /** 온보딩 인트로 1/3 - 미션 소개 */
  INTRO_CARDLIST: 'intro-cardlist' as const,

  /** 온보딩 인트로 2/3 - 캐릭터 성장 소개 */
  INTRO_FUNCTION: 'intro-function' as const,

  /** 온보딩 인트로 3/3 - 글 탐색 소개 */
  INTRO_SEARCH: 'intro-search' as const,

  /** 관심분야 선택 화면 */
  INTERESTS: 'interests' as const,

  /** 난이도 설정 화면 */
  DIFFICULTY_SETTING: 'difficulty-setting' as const,

  // ──────────────────────────────────────────────
  // 메인 탭 네비게이터
  // ──────────────────────────────────────────────
  /** 메인 탭 (최상위) */
  MAIN_TAB: 'main-tab' as const,

  /** 미션 탭 (홈) */
  MISSION_TAB: '홈' as const,

  /** 캐릭터 탭 */
  CHARACTER_TAB: '캐릭터' as const,

  /** 검색 탭 */
  SEARCH_TAB: '탐색' as const,

  /** 마이페이지 탭 */
  MY_PAGE_TAB: '마이' as const,

  // ──────────────────────────────────────────────
  // 탭 내부 화면들
  // ──────────────────────────────────────────────
  /** 미션 메인 화면 */
  MISSION: 'mission' as const,

  /** 캐릭터 메인 화면 */
  CHARACTER: 'character' as const,

  /** 검색 메인 화면 */
  SEARCH: 'search' as const,

  /** 마이페이지 메인 화면 */
  MY_PAGE: 'my-page' as const,

  // ──────────────────────────────────────────────
  // 전체 화면 스택 (탭바 없는 화면들)
  // ──────────────────────────────────────────────
  /** 전체 화면 스택 (최상위) */
  FULL_SCREEN_STACK: 'full-screen-stack' as const,

  // ────── 글 읽기 관련 ──────
  /** 글 상세 화면 (미션/검색에서 진입) */
  ARTICLE_DETAIL: 'article' as const,

  /** 읽은 글 상세 화면 (마이페이지에서 진입) */
  READ_ARTICLE_DETAIL: 'read-article-detail' as const,

  /** 퀴즈 화면 */
  QUIZ: 'quiz' as const,

  /** 광고 로딩 화면 */
  AD_LOADING: 'ad-loading' as const,

  // ────── [내부 테스트] 스토어 스크린샷용 mock 화면 ──────
  // IS_INTERNAL_TEST 빌드에서 홈/탐색 리스트 맨 위 mock 카드 클릭 시에만 진입 가능.
  // 실서비스 배포 빌드에는 노출되지 않는다. (src/config/env.ts 참고)

  /** [내부 테스트] 목 아티클 상세 화면 (스크린샷용) */
  MOCK_ARTICLE_DETAIL: 'mock-article-detail' as const,

  /** [내부 테스트] 목 퀴즈 화면 (스크린샷용) */
  MOCK_QUIZ: 'mock-quiz' as const,

  // ────── 검색 관련 ──────
  /** 검색어 입력 화면 */
  SEARCH_INPUT: 'search-input' as const,

  /** 검색 결과 화면 */
  SEARCH_RESULT: 'search-result' as const,

  // ────── 캐릭터 관련 ──────
  /** 난이도 기준 확인 화면 */
  CHARACTER_CRITERIA: 'character-criteria' as const,

  /** 포인트 획득 히스토리 화면 */
  CHARACTER_POINT_HISTORY: 'character-point-history' as const,

  /** 알림 목록 화면 */
  CHARACTER_NOTIFICATION: 'character-notification' as const,

  // ────── 마이페이지 서브 화면 ──────
  /** 설정 화면 */
  SETTINGS: 'settings' as const,

  /** 로그인 정보 화면 */
  LOGIN_INFO: 'login-info' as const,

  /** 문의하기 화면 */
  INQUIRY: 'inquiry' as const,

  /** 서비스 이용 약관 화면 */
  TERMS_OF_SERVICE: 'terms-of-service' as const,

  /** 개인정보 처리 방침 화면 */
  PRIVACY_POLICY: 'PrivacyPolicy' as const,
};
