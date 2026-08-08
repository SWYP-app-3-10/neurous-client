/**
 * 네비게이션 타입 정의 (types.ts)
 *
 * React Navigation의 모든 화면과 파라미터 타입을 정의한다.
 *
 * 타입 계층 구조:
 *   RootStackParamList (최상위)
 *   ├─ OnboardingStackParamList (온보딩 화면들)
 *   ├─ MainTabParamList (하단 탭)
 *   │  ├─ MissionStackParamList
 *   │  ├─ CharacterStackParamList
 *   │  ├─ SearchStackParamList
 *   │  └─ MyPageStackParamList
 *   └─ FullScreenStackParamList (전체 화면)
 *
 * 설계 원칙:
 *   - 파라미터가 필요 없는 화면: undefined
 *   - 선택적 파라미터: { param?: type }
 *   - 필수 파라미터: { param: type }
 */

import {
  NavigatorScreenParams,
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteNames } from '../../routes';
import { NewsCategory } from '../data/mock/searchData';

export type SocialLoginProvider = 'GOOGLE' | 'KAKAO' | 'NAVER' | 'APPLE';

// ──────────────────────────────────────────────
// 온보딩 스택 파라미터 타입
// ──────────────────────────────────────────────

/**
 * 온보딩 화면들의 파라미터 타입 정의
 *
 * 처리 흐름:
 *   소셜 로그인 → 약관 동의 → 온보딩 인트로 3개 → 관심분야 선택 → 난이도 선택
 */
export type OnboardingStackParamList = {
  /**
   * 소셜 로그인 화면
   * @param agreedProvider - 약관 동의 후 돌아올 때 어떤 소셜로 로그인할지 전달 (선택)
   */
  [RouteNames.SOCIAL_LOGIN]:
    | { agreedProvider?: SocialLoginProvider }
    | undefined;

  /**
   * 약관 동의 화면
   * @param provider - 어떤 소셜 로그인을 진행 중인지 (필수)
   */
  [RouteNames.TERMS_AGREEMENT]: { provider: SocialLoginProvider };

  /** 온보딩 인트로 1 - 미션 소개 */
  [RouteNames.INTRO_CARDLIST]: undefined;

  /** 온보딩 인트로 2 - 캐릭터 성장 소개 */
  [RouteNames.INTRO_FUNCTION]: undefined;

  /** 온보딩 인트로 3 - 글 탐색 소개 */
  [RouteNames.INTRO_SEARCH]: undefined;

  /**
   * 관심분야 선택 화면
   * @param editMode - 온보딩 중인지(false) 마이페이지에서 수정하는지(true) 구분
   */
  [RouteNames.INTERESTS]: { editMode?: boolean };

  /** 난이도 설정 화면 (온보딩 마지막 단계) */
  [RouteNames.DIFFICULTY_SETTING]: undefined;

  /** 이용약관 상세 화면 */
  [RouteNames.TERMS_OF_SERVICE]: undefined;

  /** 개인정보처리방침 상세 화면 */
  [RouteNames.PRIVACY_POLICY]: undefined;
};

// ──────────────────────────────────────────────
// 탭 내부 스택 파라미터 타입들
// ──────────────────────────────────────────────

/**
 * 미션 탭 스택 파라미터 타입
 *
 * 미션 탭은 단일 화면으로 구성되어 있음
 */
export type MissionStackParamList = {
  /** 미션 메인 화면 (홈 화면) */
  [RouteNames.MISSION]: undefined;
};

/**
 * 캐릭터 탭 스택 파라미터 타입
 *
 * 캐릭터 메인 화면만 포함
 * (서브 화면들은 FullScreenStackParamList에 정의됨)
 */
export type CharacterStackParamList = {
  /** 캐릭터 메인 화면 */
  [RouteNames.CHARACTER]: undefined;

  /**
   * 난이도 기준 확인 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.CHARACTER_CRITERIA]: undefined;

  /**
   * 포인트 획득 히스토리 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.CHARACTER_POINT_HISTORY]: undefined;
};

/**
 * 검색 탭 스택 파라미터 타입
 */
export type SearchStackParamList = {
  /**
   * 검색 메인 화면
   * @param keyword - 검색어 (선택, 검색 결과에서 뒤로가기 시 전달됨)
   * @param initialCategory - 초기 선택 카테고리 (선택)
   */
  [RouteNames.SEARCH]:
    | {
        keyword?: string;
        initialCategory?: NewsCategory;
      }
    | undefined;

  /**
   * 검색어 입력 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.SEARCH_INPUT]: undefined;
};

/**
 * 마이페이지 탭 스택 파라미터 타입
 */
export type MyPageStackParamList = {
  /** 마이페이지 메인 화면 */
  [RouteNames.MY_PAGE]: undefined;

  /**
   * 설정 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.SETTINGS]: undefined;

  /**
   * 로그인 정보 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.LOGIN_INFO]: undefined;

  /**
   * 문의하기 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.INQUIRY]: undefined;

  /**
   * 이용약관 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.TERMS_OF_SERVICE]: undefined;

  /**
   * 개인정보처리방침 화면
   * 참고: 이 화면은 FullScreenStackParamList에도 중복 정의되어 있음
   */
  [RouteNames.PRIVACY_POLICY]: undefined;
};

// ──────────────────────────────────────────────
// 메인 탭 파라미터 타입 (하단 탭 네비게이터)
// ──────────────────────────────────────────────

/**
 * 하단 탭 네비게이터의 파라미터 타입
 *
 * NavigatorScreenParams를 사용하여 중첩된 네비게이터의 파라미터를 포함한다.
 * 이를 통해 탭 간 이동 시 파라미터를 전달할 수 있다.
 */
export type MainTabParamList = {
  /** 미션 탭 (홈) */
  [RouteNames.MISSION_TAB]: NavigatorScreenParams<MissionStackParamList>;

  /** 캐릭터 탭 */
  [RouteNames.CHARACTER_TAB]: NavigatorScreenParams<CharacterStackParamList>;

  /** 검색 탭 */
  [RouteNames.SEARCH_TAB]: NavigatorScreenParams<SearchStackParamList>;

  /** 마이페이지 탭 */
  [RouteNames.MY_PAGE_TAB]: NavigatorScreenParams<MyPageStackParamList>;
};

// ──────────────────────────────────────────────
// 전체 화면 스택 파라미터 타입
// ──────────────────────────────────────────────

/**
 * 탭바 없이 전체 화면으로 표시되는 화면들의 파라미터 타입
 *
 * 특징:
 *   - 모든 탭에서 공통으로 접근 가능
 *   - 하단 탭바가 숨겨짐
 *   - 글 읽기, 퀴즈, 설정 등 몰입이 필요한 화면들
 *
 * 주의:
 *   - 일부 화면은 탭 내부 스택에도 중복 정의되어 있음
 *     (예: CHARACTER_CRITERIA, SETTINGS 등)
 *   - 이는 탭 내부와 전체 화면 네비게이터 모두에서 접근 가능하도록 하기 위함
 */
export type FullScreenStackParamList = {
  // ────── 캐릭터 관련 화면 ──────

  /** 난이도 기준 확인 화면 (탭 2개 있는 화면) */
  [RouteNames.CHARACTER_CRITERIA]: undefined;

  /** 알림 목록 화면 */
  [RouteNames.CHARACTER_NOTIFICATION]: undefined;

  /** 포인트 획득 히스토리 화면 */
  [RouteNames.CHARACTER_POINT_HISTORY]: undefined;

  // ────── 글 읽기 관련 화면 ──────

  /**
   * 글 상세 화면 (미션/검색에서 글 클릭 시)
   * @param articleId - 표시할 글 ID (필수)
   * @param returnTo - 글을 읽은 후 돌아갈 화면 ('mission' | 'search', 선택)
   * @param openType - 글 열기 유형 ('free' | 'ad' | 'point', 선택)
   * @param entrySource - 진입 경로 (Mixpanel article_start용, 선택)
   */
  [RouteNames.ARTICLE_DETAIL]: {
    articleId: number;
    returnTo?: 'mission' | 'search';
    openType?: 'free' | 'ad' | 'point';
    entrySource?: 'home' | 'explore' | 'search' | 'my_page';
  };

  /**
   * 읽은 글 상세 화면 (마이페이지 > 읽은 글 목록에서 클릭 시)
   * @param articleId - 표시할 글 ID (필수)
   * @param entrySource - 진입 경로 (Mixpanel article_start용, 선택)
   */
  [RouteNames.READ_ARTICLE_DETAIL]: {
    articleId: number;
    entrySource?: 'home' | 'explore' | 'search' | 'my_page';
  };

  /**
   * 퀴즈 화면 (글 읽기 완료 후 "퀴즈 풀기" 버튼 클릭 시)
   * @param articleId - 퀴즈를 풀 글 ID (필수)
   * @param returnTo - 퀴즈 완료 후 돌아갈 화면 ('mission' | 'search', 선택)
   */
  [RouteNames.QUIZ]: {
    articleId: number;
    returnTo?: 'mission' | 'search';
  };

  /**
   * 광고 로딩 화면 (잠긴 글을 광고로 열 때)
   * @param articleId - 광고를 보고 열 글 ID (필수)
   * @param returnTo - 글을 읽은 후 돌아갈 화면 ('mission' | 'search', 선택)
   */
  [RouteNames.AD_LOADING]: {
    articleId: number;
    returnTo?: 'mission' | 'search';
    entrySource?: 'home' | 'explore' | 'search' | 'my_page';
  };

  // ────── [내부 테스트] 스토어 스크린샷용 mock 화면 ──────
  // 파라미터가 필요 없음: 내용이 src/data/mock/mockArticleQuiz.ts에 고정되어 있음

  /** [내부 테스트] 목 아티클 상세 화면 (스크린샷용) */
  [RouteNames.MOCK_ARTICLE_DETAIL]: undefined;

  /** [내부 테스트] 목 퀴즈 화면 (스크린샷용) */
  [RouteNames.MOCK_QUIZ]: undefined;

  // ────── 검색 관련 화면 ──────

  /** 검색어 입력 화면 (검색 탭 > 검색창 클릭 시) */
  [RouteNames.SEARCH_INPUT]: undefined;

  /**
   * 검색 결과 화면 (검색어 입력 후 검색 시)
   * @param keyword - 검색어 (필수)
   */
  [RouteNames.SEARCH_RESULT]: {
    keyword: string;
  };

  // ────── 마이페이지 서브 화면들 ──────
  // (FullScreenStack에서도 사용하므로 중복 정의)

  /** 설정 화면 */
  [RouteNames.SETTINGS]: undefined;

  /** 로그인 정보 화면 */
  [RouteNames.LOGIN_INFO]: undefined;

  /** 문의하기 화면 */
  [RouteNames.INQUIRY]: undefined;

  /** 이용약관 화면 */
  [RouteNames.TERMS_OF_SERVICE]: undefined;

  /** 개인정보처리방침 화면 */
  [RouteNames.PRIVACY_POLICY]: undefined;
};

// ──────────────────────────────────────────────
// 루트 스택 파라미터 타입 (최상위 네비게이터)
// ──────────────────────────────────────────────

/**
 * 앱 최상위 네비게이터의 파라미터 타입
 *
 * 네비게이션 계층 구조:
 *   1. ONBOARDING: 온보딩 화면들 (로그인 → 약관 → 인트로 → 관심분야 → 난이도)
 *   2. MAIN_TAB: 메인 탭 (미션, 캐릭터, 검색, 마이페이지)
 *   3. FULL_SCREEN_STACK: 전체 화면들 (글 읽기, 퀴즈, 설정 등)
 *
 * RootNavigator는 isOnboardingCompleted 상태에 따라
 * ONBOARDING과 MAIN_TAB 사이를 전환한다.
 */
export type RootStackParamList = {
  /** 온보딩 스택 (앱 최초 진입 시 또는 미로그인 시) */
  [RouteNames.ONBOARDING]: NavigatorScreenParams<OnboardingStackParamList>;

  /** 메인 탭 (로그인 완료 후) */
  [RouteNames.MAIN_TAB]: NavigatorScreenParams<MainTabParamList>;

  /** 전체 화면 스택 (탭바 없는 화면들) */
  [RouteNames.FULL_SCREEN_STACK]: NavigatorScreenParams<FullScreenStackParamList>;
};

// ──────────────────────────────────────────────
// 유틸리티 타입들
// ──────────────────────────────────────────────

/**
 * 메인 탭 내부 화면에서 사용하는 네비게이션 타입
 *
 * CompositeNavigationProp를 사용하여 여러 네비게이터를 조합한다.
 * 이를 통해:
 *   - 탭 내부 스택 이동 (예: MissionStack 내부 이동)
 *   - 탭 간 이동 (예: 미션 탭 → 검색 탭)
 *   - 전체 화면 이동 (예: 글 상세 화면)
 * 모두 가능하다.
 *
 * @example
 * const navigation = useNavigation<MainTabNavigationProp<MissionStackParamList>>();
 * navigation.navigate(RouteNames.ARTICLE_DETAIL, { articleId: 1 });
 */
export type MainTabNavigationProp<StackParamList extends Record<string, any>> =
  CompositeNavigationProp<
    NativeStackNavigationProp<StackParamList>,
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >;

/**
 * 전체 화면 스택의 Route 타입 헬퍼
 *
 * useRoute 훅에서 타입을 지정할 때 사용한다.
 *
 * @example
 * const route = useRoute<FullScreenStackRouteProp<typeof RouteNames.ARTICLE_DETAIL>>();
 * const articleId = route.params.articleId; // 타입 안전
 */
export type FullScreenStackRouteProp<
  RouteName extends keyof FullScreenStackParamList,
> = RouteProp<FullScreenStackParamList, RouteName>;
