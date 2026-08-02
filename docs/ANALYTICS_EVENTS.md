# Analytics 이벤트 목록

이 문서는 앱 내에서 사용되는 Firebase Analytics 이벤트와 Mixpanel 이벤트를 정리한 문서입니다.

앱은 두 개의 분석 도구를 병행 사용합니다.

| 도구 | 서비스 파일 | 용도 |
| --- | --- | --- |
| **Firebase Analytics** | `src/services/analyticsService.ts` (`logEvent`, `logScreenView`) | 화면 조회·버튼 클릭 등 세밀한 UI 이벤트 트래킹 |
| **Mixpanel** | `src/services/mixpanelService.ts` (`trackEvent`) | 디자인팀 정의 이벤트 명세 기반 퍼널/리텐션 분석 |

## 목차

1. [Mixpanel 이벤트](#mixpanel-이벤트)
2. [화면 조회 이벤트 (Screen View)](#화면-조회-이벤트-screen-view)
3. [백버튼 이벤트 (Back Button)](#백버튼-이벤트-back-button)
4. [네비게이션 이벤트 (Navigation)](#네비게이션-이벤트-navigation)
5. [온보딩 이벤트 (Onboarding)](#온보딩-이벤트-onboarding)
6. [퀴즈 이벤트 (Quiz)](#퀴즈-이벤트-quiz)
7. [검색 이벤트 (Search)](#검색-이벤트-search)
8. [마이페이지 이벤트 (My Page)](#마이페이지-이벤트-my-page)
9. [캐릭터 이벤트 (Character)](#캐릭터-이벤트-character)
10. [로그인 이벤트 (Login)](#로그인-이벤트-login)
11. [기타 이벤트 (Others)](#기타-이벤트-others)

---

## Mixpanel 이벤트

디자인팀 이벤트 명세(Update v1 Analytics Event Tracking)를 기반으로 구현된 21개 이벤트입니다. `trackEvent(eventName, properties)` 호출 시 `user_id`(서버 발급 회원 ID)와 `session_id`(앱 실행마다 생성)가 모든 이벤트에 자동으로 첨부됩니다.

`IS_PRODUCTION`이 `false`면 Mixpanel로 전송되지 않고 콘솔에 `[Mixpanel - Dev] Event: ...` 형태로만 로그됩니다.

| 이벤트 | 설명 | 주요 property | 파일 경로 |
| --- | --- | --- | --- |
| `article_start` | 콘텐츠 상세 페이지 진입 | `article_id`, `category`, `difficulty`, `entry_source`(home/explore/search/my_page) | `ArticleDetailScreen.tsx`, `ReadArticleDetailScreen.tsx` |
| `quiz_enter` | 퀴즈 화면 진입 | `article_id`, `category`, `difficulty` | `QuizScreen.tsx` |
| `quiz_complete` | 퀴즈 완료 (정답 여부 무관) | `is_correct` | `QuizScreen.tsx` |
| `reward_popup_view` | 보상 팝업 노출 | `reward_type`, `reward_source`, `xp_amount`, `point_amount` | `QuizScreen.tsx`, `MissionScreen.tsx`, `AdLoadingScreen.tsx` |
| `level_up_popup_view` / `level_up_popup_confirm` | 레벨업 팝업 노출/확인 | `level_before`, `level_after` | `RootNavigator.tsx` |
| `character_growth_view` | '나의 레벨' 화면 진입 | `character_level` | `CharacterScreen.tsx` |
| `growth_guide_view` | 성장 가이드 화면 진입 | `tab`(level/xp_point) | `CriteriaCheckScreen.tsx` |
| `interest_selected` | 관심분야 선택(최초/변경 동일) | `interests` | `InterestsScreen.tsx` |
| `difficulty_selected` | 온보딩 난이도 최초 선택 | `difficulty` | `DifficultySettingScreen.tsx` |
| `difficulty_changed` | 난이도 변경 | `difficulty_before`, `difficulty_after` | `useUpdateLevel.ts`, `useDifficultySuggestion.ts` |
| `difficulty_recommendation_view/accepted/dismissed` | 난이도 추천 팝업 노출/수락/거절 | `current_difficulty`, `recommended_difficulty` | `QuizScreen.tsx` |
| `mission_complete` | 미션 완료 (미완료→완료 전환 시) | `mission_type` | `useMissions.ts` |
| `point_use_popup_view` / `point_use_confirm` | 포인트 사용 팝업 노출/사용 | `article_id`, `category` | `useArticleNavigation.ts` |
| `ad_popup_view` / `ad_watch_complete` | 광고 팝업 노출 / 시청 완료 | `article_id`, `category` | `useArticleNavigation.ts`, `AdLoadingScreen.tsx` |
| `search_result_click` | 검색 결과에서 글 선택 | `article_id`, `category` | `SearchScreen.tsx` 외 검색 화면 3곳 |
| `my_page_view` | 마이페이지 탭 진입 | - | `MyPageScreen.tsx` |

### reward_source 값

| 값 | 의미 | 구현 여부 |
| --- | --- | --- |
| `quiz_correct` / `quiz_wrong` | 퀴즈 정답/오답 보상 | ✅ |
| `daily_attendance` | 데일리 출석 보상 | ✅ |
| `weekly_attendance` | 위클리 출석 보상 (일요일 데일리 출석 시 합산 지급) | ✅ (팝업은 데일리와 합산 노출, 이벤트는 별도 전송) |
| `ad_reward` | 광고 시청 보상 | ✅ (`ad_watch_complete`로 별도 추적) |
| `mission_complete` | 미션 완료 보상 | ✅ |
| `article_read` | 글 읽기 자체에 대한 보상 | ❌ 미구현 — 해당 보상 팝업 UI가 앱에 없음. 별도 브랜치에서 논의 예정 |

### 참고

- Mixpanel Project Token은 `src/services/mixpanelService.ts`에 하드코딩되어 있습니다 (비밀키 아님, 클라이언트 노출 전제로 설계된 값).
- 이벤트 이름/속성 원본 명세는 디자인팀이 md 파일로 전달했으며, `article_id`는 명세 예시(`"article_12345"` 문자열)와 달리 실제로는 서버 contentId 그대로 **숫자**로 전송됩니다.

---

## 화면 조회 이벤트 (Screen View)

화면 조회 이벤트는 `logScreenView()` 함수를 사용하여 기록됩니다. `RootNavigator`에서 자동으로 기록되는 화면과 수동으로 기록되는 화면으로 구분됩니다.

### 자동 매핑 화면 (RootNavigator)

`RootNavigator`에서 화면 전환 시 자동으로 기록되는 화면입니다. `analyticsService.ts`의 `screenNameMap`에 매핑되어 있습니다.

| 이벤트 이름                       | 화면               | 파일 경로                                              | 기록 방식            |
| --------------------------------- | ------------------ | ------------------------------------------------------ | -------------------- |
| `Onboarding_Function01_CardList`  | 온보딩 카드 리스트 | `src/screens/onboarding/IntroCardList.tsx`             | 자동 (RootNavigator) |
| `Onboarding_Function02_Character` | 온보딩 캐릭터 소개 | `src/screens/onboarding/IntroFuction.tsx`              | 자동 (RootNavigator) |
| `Onboarding_Function03_Explore`   | 온보딩 탐색 소개   | `src/screens/onboarding/IntroSearch.tsx`               | 자동 (RootNavigator) |
| `Onboarding_SocialLogin`          | 소셜 로그인        | `src/screens/auth/LoginScreen.tsx`                     | 자동 (RootNavigator) |
| `AgreeToTerms`                    | 약관 동의          | `src/screens/onboarding/TermsAgreementScreen.tsx`      | 자동 (RootNavigator) |
| `Home`                            | 미션 화면          | `src/screens/main/MissionScreen.tsx`                   | 자동 (RootNavigator) |
| `Reading`                         | 게시글 상세        | `src/screens/common/ArticleDetailScreen.tsx`           | 자동 (RootNavigator) |
| `ReadingDetails`                  | 읽은 글 상세       | `src/hooks/useArticleNavigation.ts`                    | 자동 (RootNavigator) |
| `Quiz`                            | 퀴즈 화면          | `src/screens/common/QuizScreen.tsx`                    | 자동 (RootNavigator) |
| `Advertisement`                   | 광고 화면          | `src/screens/common/AdLoadingScreen.tsx`               | 자동 (RootNavigator) |
| `Explore`                         | 검색 화면          | `src/screens/search/SearchScreen.tsx`                  | 자동 (RootNavigator) |
| `Search`                          | 검색 입력          | `src/screens/search/SearchInputScreen.tsx`             | 자동 (RootNavigator) |
| `Character`                       | 캐릭터 화면        | `src/screens/main/CharacterScreen.tsx`                 | 자동 (RootNavigator) |
| `ConfirmEarnedHistory`            | 포인트 내역        | `src/screens/character/history/PointHistoryScreen.tsx` | 자동 (RootNavigator) |
| `Alarm`                           | 알림 화면          | `src/screens/common/NotificationScreen.tsx`            | 자동 (RootNavigator) |
| `My`                              | 마이페이지         | `src/screens/main/MyPageScreen.tsx`                    | 자동 (RootNavigator) |

### 수동 기록 화면 (logScreenView)

각 화면/컴포넌트에서 `logScreenView()` 함수를 직접 호출하여 기록하는 화면입니다.

#### 일반 화면

| 이벤트 이름                    | 화면                    | 파일 경로                                                            | 기록 시점                   |
| ------------------------------ | ----------------------- | -------------------------------------------------------------------- | --------------------------- |
| `Onboarding_Interest01`        | 관심분야 선택 (초기)    | `src/screens/onboarding/InterestsScreen.tsx`                         | 선택 전 상태                |
| `Onboarding_Interest02`        | 관심분야 선택 (선택 후) | `src/screens/onboarding/InterestsScreen.tsx`                         | 선택 후 상태                |
| `EditInterest`                 | 관심분야 편집           | `src/screens/onboarding/InterestsScreen.tsx`                         | 편집 모드 진입              |
| `Quiz_Answer`                  | 퀴즈 답변 화면          | `src/screens/common/QuizScreen.tsx`                                  | 퀴즈 상태가 'feedback'일 때 |
| `ReadingDetails_Quiz`          | 읽은 글 상세에서 퀴즈   | `src/hooks/useQuizButton.ts`                                         | 퀴즈 버튼 클릭 시           |
| `ConfirmStandard_Level`        | 레벨 기준 확인          | `src/screens/character/criteria/level/LevelCriteriaScreen.tsx`       | 화면 마운트 시              |
| `ConfirmStandard_Xp_P`         | XP/P 기준 확인          | `src/screens/character/criteria/expAndPoint/PointCriteriaScreen.tsx` | 화면 마운트 시              |
| `Onboarding_Difficulty_Easy`   | 난이도 선택 (초급)      | `src/screens/onboarding/DifficultySettingScreen.tsx`                 | 초급 선택 시                |
| `Onboarding_Difficulty_Medium` | 난이도 선택 (중급)      | `src/screens/onboarding/DifficultySettingScreen.tsx`                 | 중급 선택 시                |
| `Onboarding_Difficulty_Hard`   | 난이도 선택 (고급)      | `src/screens/onboarding/DifficultySettingScreen.tsx`                 | 고급 선택 시                |
| `SPLASH`                       | 스플래시 화면           | `src/screens/SplashScreen.tsx`                                       | 화면 마운트 시              |

#### 모달/팝업

| 이벤트 이름                      | 화면                       | 파일 경로                                              | 기록 시점      |
| -------------------------------- | -------------------------- | ------------------------------------------------------ | -------------- |
| `EditLevelModal`                 | 난이도 편집 모달           | `src/screens/main/MyPageScreen.tsx`                    | 모달 열림 시   |
| `ConfirmEarnedHistoryModal`      | 포인트 내역 모달           | `src/screens/character/history/PointHistoryScreen.tsx` | 모달 열림 시   |
| `Popup_Out_App`                  | 앱 종료 팝업               | `src/screens/main/MissionScreen.tsx`                   | 팝업 표시 시   |
| `Popup_App_Notification`         | 앱 알림 팝업               | `src/screens/auth/LoginScreen.tsx`                     | 팝업 표시 시   |
| `Popup_Local_Notification_Local` | 로컬 알림 팝업             | `src/hooks/useNotificationPermission.ts`               | 팝업 표시 시   |
| `Popup_Reading`                  | 읽기 팝업                  | `src/hooks/useArticleNavigation.ts`                    | 팝업 표시 시   |
| `Popup_Advertisement`            | 광고 팝업                  | `src/hooks/useArticleNavigation.ts`                    | 팝업 표시 시   |
| `Popup_Difficulty`               | 난이도 선택 모달           | `src/components/DifficultySelectionModal.tsx`          | 모달 열림 시   |
| `Popup_Difficulty_Select`        | 난이도 선택 모달 (선택 후) | `src/components/DifficultySelectionModal.tsx`          | 난이도 선택 시 |

---

## 백버튼 이벤트 (Back Button)

Header 컴포넌트의 뒤로가기 아이콘 클릭 시 기록되는 이벤트입니다.

| 이벤트 이름                    | 화면                        | 파일 경로                                                |
| ------------------------------ | --------------------------- | -------------------------------------------------------- |
| `Back_ConfirmStandard_Reading` | 게시글 상세                 | `src/screens/common/ArticleDetailScreen.tsx`             |
| `Back_ConfirmStandard_Quiz`    | 퀴즈 화면                   | `src/screens/common/QuizScreen.tsx`                      |
| `Back_EditInterest`            | 관심분야 편집               | `src/screens/onboarding/InterestsScreen.tsx`             |
| `Back_Alarm`                   | 알림 화면                   | `src/screens/common/NotificationScreen.tsx`              |
| `Back_ConfirmEarnedHistory`    | 포인트 내역                 | `src/screens/character/history/PointHistoryScreen.tsx`   |
| `Back_ConfirmStandard_Level`   | 레벨 기준 확인              | `src/screens/character/criteria/CriteriaCheckScreen.tsx` |
| `Back_ConfirmStandard_Xp_P`    | XP/P 기준 확인              | `src/screens/character/criteria/CriteriaCheckScreen.tsx` |
| `Back_Search`                  | 검색 화면                   | `src/screens/search/components/SearchHeader.tsx`         |
| `Back_DateRead_My`             | 마이페이지 날짜 선택 (이전) | `src/screens/main/MyPageScreen.tsx`                      |
| `Next_DateRead_My`             | 마이페이지 날짜 선택 (다음) | `src/screens/main/MyPageScreen.tsx`                      |

---

## 네비게이션 이벤트 (Navigation)

하단 탭 네비게이션 클릭 시 기록되는 이벤트입니다.

| 이벤트 이름     | 설명               | 파일 경로                             |
| --------------- | ------------------ | ------------------------------------- |
| `Nav_Home`      | 홈 탭 클릭         | `src/navigation/MainTabNavigator.tsx` |
| `Nav_Character` | 캐릭터 탭 클릭     | `src/navigation/MainTabNavigator.tsx` |
| `Nav_Explore`   | 탐색 탭 클릭       | `src/navigation/MainTabNavigator.tsx` |
| `Nav_My`        | 마이페이지 탭 클릭 | `src/navigation/MainTabNavigator.tsx` |

---

## 온보딩 이벤트 (Onboarding)

온보딩 과정에서 기록되는 이벤트입니다.

| 이벤트 이름                                | 설명                    | 파일 경로                                            |
| ------------------------------------------ | ----------------------- | ---------------------------------------------------- |
| `Next_Onboarding_Function01_CardList`      | 온보딩 카드 리스트 다음 | `src/screens/onboarding/IntroCardList.tsx`           |
| `Next_Onboarding_Function02_Character`     | 온보딩 캐릭터 소개 다음 | `src/screens/onboarding/IntroFuction.tsx`            |
| `Next_Onboarding_Function03_Explore`       | 온보딩 탐색 소개 다음   | `src/screens/onboarding/IntroSearch.tsx`             |
| `Next_Onboarding_Interest02`               | 관심분야 선택 다음      | `src/screens/onboarding/InterestsScreen.tsx`         |
| `Next_Onboarding_Difficulty_Medium`        | 난이도 선택 다음        | `src/screens/onboarding/DifficultySettingScreen.tsx` |
| `Kakao_Login_Onboarding_SocialLogin`       | 카카오 로그인           | `src/screens/auth/LoginScreen.tsx`                   |
| `Google_Login_Onboarding_SocialLogin`      | 구글 로그인             | `src/screens/auth/LoginScreen.tsx`                   |
| `NAVER_Login_Onboarding_SocialLogin`       | 네이버 로그인           | `src/screens/auth/LoginScreen.tsx`                   |
| `apple_Login_Onboarding_SocialLogin`       | 애플 로그인             | `src/screens/auth/LoginScreen.tsx`                   |
| `AgreeAll_AgreeToTerms`                    | 약관 전체 동의          | `src/screens/onboarding/TermsAgreementScreen.tsx`    |
| `Chk_Required_Age14Plus_AgreeToTerms`      | 만 14세 이상 체크       | `src/screens/onboarding/TermsAgreementScreen.tsx`    |
| `Chk_Required_TermsOfService_AgreeToTerms` | 이용약관 체크           | `src/screens/onboarding/TermsAgreementScreen.tsx`    |
| `Chk_Required_PrivacyPolicy_AgreeToTerms`  | 개인정보처리방침 체크   | `src/screens/onboarding/TermsAgreementScreen.tsx`    |
| `Btn_Easy_Onboarding`                      | 난이도 초급 선택        | `src/screens/onboarding/DifficultySettingScreen.tsx` |
| `Btn_Medium_Onboarding`                    | 난이도 중급 선택        | `src/screens/onboarding/DifficultySettingScreen.tsx` |
| `Btn_Hard_Onboarding`                      | 난이도 고급 선택        | `src/screens/onboarding/DifficultySettingScreen.tsx` |

### 관심분야 태그 이벤트

| 이벤트 이름                                  | 설명                         | 파일 경로                                    |
| -------------------------------------------- | ---------------------------- | -------------------------------------------- |
| `InterestTag_Politics_Onboarding`            | 정치 태그 클릭 (온보딩)      | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_Politics_EditInterest`          | 정치 태그 클릭 (편집)        | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_Economy_Onboarding`             | 경제 태그 클릭 (온보딩)      | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_Economy_EditInterest`           | 경제 태그 클릭 (편집)        | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_Society_Onboarding`             | 사회 태그 클릭 (온보딩)      | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_Society_EditInterest`           | 사회 태그 클릭 (편집)        | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_LifeCulture_Onboarding`         | 생활/문화 태그 클릭 (온보딩) | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_Lifestyle_Culture_EditInterest` | 생활/문화 태그 클릭 (편집)   | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_It_Science_Onboarding`          | IT/과학 태그 클릭 (온보딩)   | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_It_Science_EditInterest`        | IT/과학 태그 클릭 (편집)     | `src/screens/onboarding/InterestsScreen.tsx` |
| `InterestTag_World_Onboarding`               | 세계 태그 클릭 (온보딩)      | `src/screens/onboarding/InterestsScreen.tsx` |
| `EditInterest_World_EditInterest`            | 세계 태그 클릭 (편집)        | `src/screens/onboarding/InterestsScreen.tsx` |

---

## 퀴즈 이벤트 (Quiz)

퀴즈 관련 이벤트입니다.

| 이벤트 이름            | 설명                 | 파일 경로                                    |
| ---------------------- | -------------------- | -------------------------------------------- |
| `StartQuiz_Reading`    | 게시글에서 퀴즈 시작 | `src/screens/common/ArticleDetailScreen.tsx` |
| `Next_Quiz`            | 퀴즈 다음 버튼       | `src/screens/common/QuizScreen.tsx`          |
| `Complete_Quiz_Answer` | 퀴즈 답변 완료       | `src/screens/common/QuizScreen.tsx`          |
| `Choice1_Quiz`         | 퀴즈 선택지 1 클릭   | `src/screens/common/QuizScreen.tsx`          |
| `Choice2_Quiz`         | 퀴즈 선택지 2 클릭   | `src/screens/common/QuizScreen.tsx`          |
| `Choice3_Quiz`         | 퀴즈 선택지 3 클릭   | `src/screens/common/QuizScreen.tsx`          |

---

## 검색 이벤트 (Search)

검색 관련 이벤트입니다.

| 이벤트 이름                                   | 설명                      | 파일 경로                                        |
| --------------------------------------------- | ------------------------- | ------------------------------------------------ |
| `Search_Explore`                              | 검색 실행                 | `src/screens/search/SearchScreen.tsx`            |
| `ClearText_Search`                            | 검색 텍스트 지우기        | `src/screens/search/components/SearchHeader.tsx` |
| `ClearRecentSearches_Search`                  | 최근 검색어 전체 삭제     | `src/screens/search/SearchInputScreen.tsx`       |
| `RecentSearchChip`                            | 최근 검색어 클릭          | `src/components/RecentSearches.tsx`              |
| `RecentSearchChip1`, `RecentSearchChip2`, ... | 최근 검색어 클릭 (동적)   | `src/components/RecentSearches.tsx`              |
| `CategoryChip_All_Explore`                    | 전체 카테고리 클릭        | `src/screens/search/SearchScreen.tsx`            |
| `CategoryChip_Politics_Explore`               | 정치 카테고리 클릭        | `src/screens/search/SearchScreen.tsx`            |
| `CategoryChip_Economy_Explore`                | 경제 카테고리 클릭        | `src/screens/search/SearchScreen.tsx`            |
| `CategoryChip_Society_Explore`                | 사회 카테고리 클릭        | `src/screens/search/SearchScreen.tsx`            |
| `CategoryChip_Lifestyle_Culture_Explore`      | 생활/문화 카테고리 클릭   | `src/screens/search/SearchScreen.tsx`            |
| `CategoryChip_It_Science_Explore`             | IT/과학 카테고리 클릭     | `src/screens/search/SearchScreen.tsx`            |
| `CategoryChip_World_Explore`                  | 세계 카테고리 클릭        | `src/screens/search/SearchScreen.tsx`            |
| `ContectsList_Explore`                        | 검색 결과 리스트 클릭     | `src/screens/search/SearchScreen.tsx`            |
| `ContectsList1_Search`                        | 검색 결과 1번 클릭        | `src/screens/search/SearchResultScreen.tsx`      |
| `ContectsList2_Search`                        | 검색 결과 2번 클릭        | `src/screens/search/SearchResultScreen.tsx`      |
| `ContectsList3_Search`                        | 검색 결과 3번 클릭        | `src/screens/search/SearchResultScreen.tsx`      |
| `ContectsList4_Search`, ...                   | 검색 결과 N번 클릭 (동적) | `src/screens/search/SearchResultScreen.tsx`      |
| `Timer_Explore`                               | 검색 타이머               | `src/screens/search/SearchScreen.tsx`            |

---

## 마이페이지 이벤트 (My Page)

마이페이지 관련 이벤트입니다.

| 이벤트 이름                       | 설명                     | 파일 경로                                    |
| --------------------------------- | ------------------------ | -------------------------------------------- |
| `Setting_My`                      | 설정 버튼 클릭           | `src/screens/main/MyPageScreen.tsx`          |
| `EditInterest_My`                 | 관심분야 편집 클릭       | `src/screens/main/MyPageScreen.tsx`          |
| `EditLevel_My`                    | 난이도 편집 클릭         | `src/screens/main/MyPageScreen.tsx`          |
| `ReadingHistoryList_Correct_My`   | 읽은 글 리스트 정답 클릭 | `src/components/TimelineGroup.tsx`           |
| `ReadingHistoryList_InCorrect_My` | 읽은 글 리스트 오답 클릭 | `src/components/TimelineGroup.tsx`           |
| `Complete_EditInterest`           | 관심분야 편집 완료       | `src/screens/onboarding/InterestsScreen.tsx` |

---

## 캐릭터 이벤트 (Character)

캐릭터 화면 관련 이벤트입니다.

| 이벤트 이름                       | 설명                              | 파일 경로                                                      |
| --------------------------------- | --------------------------------- | -------------------------------------------------------------- |
| `Tooltip_Character`               | 툴팁 클릭                         | `src/screens/main/CharacterScreen.tsx`                         |
| `Confirm_LevelStandard_Character` | 레벨 기준 확인 클릭               | `src/screens/main/CharacterScreen.tsx`                         |
| `Confirm_PXp_Character`           | XP/P 기준 확인 클릭               | `src/screens/main/CharacterScreen.tsx`                         |
| `Level_ConfirmLevelStandard`      | 레벨 기준 확인 화면에서 레벨 확인 | `src/screens/character/criteria/CriteriaCheckScreen.tsx`       |
| `XpP_ConfirmLevelStandard`        | XP/P 기준 확인 화면에서 XP/P 확인 | `src/screens/character/criteria/CriteriaCheckScreen.tsx`       |
| `XpTooltip_ConfirmStandard_Level` | 레벨 기준 확인 화면에서 XP 툴팁   | `src/screens/character/criteria/level/LevelCriteriaScreen.tsx` |
| `list_ConfirmEarnedHistory`       | 포인트 내역 리스트 클릭           | `src/screens/character/history/PointHistoryScreen.tsx`         |

---

## 로그인 이벤트 (Login)

로그인 및 알림 관련 이벤트입니다.

| 이벤트 이름                                          | 설명                           | 파일 경로                                |
| ---------------------------------------------------- | ------------------------------ | ---------------------------------------- |
| `EnableNotifications_Popup_App_Notification`         | 앱 알림 팝업에서 알림 활성화   | `src/screens/auth/LoginScreen.tsx`       |
| `Dismiss_Popup_App_Notification`                     | 앱 알림 팝업 닫기              | `src/screens/auth/LoginScreen.tsx`       |
| `Dismiss_Popup_Local_Notification_Local`             | 로컬 알림 팝업 닫기            | `src/hooks/useNotificationPermission.ts` |
| `EnableNotifications_Popup_Local_Notification_Local` | 로컬 알림 팝업에서 알림 활성화 | `src/hooks/useNotificationPermission.ts` |

---

## 기타 이벤트 (Others)

기타 이벤트입니다.

| 이벤트 이름                                 | 설명                           | 파일 경로                                     |
| ------------------------------------------- | ------------------------------ | --------------------------------------------- |
| `Card01_Home`                               | 미션 카드 1번 클릭             | `src/screens/main/MissionScreen.tsx`          |
| `Card02_Home`                               | 미션 카드 2번 클릭             | `src/screens/main/MissionScreen.tsx`          |
| `Card03_Home`                               | 미션 카드 3번 클릭             | `src/screens/main/MissionScreen.tsx`          |
| `Card04_Home`, `Card05_Home`, ...           | 미션 카드 N번 클릭 (동적)      | `src/screens/main/MissionScreen.tsx`          |
| `ReadNewArticle_Popup_Reading`              | 읽기 팝업에서 새 글 읽기       | `src/hooks/useArticleNavigation.ts`           |
| `GetAndRead_Popup_Advertisement`            | 광고 팝업에서 광고 보고 읽기   | `src/hooks/useArticleNavigation.ts`           |
| `Difficulty_Beginner_EditLevelModal`        | 난이도 편집 모달에서 초급 선택 | `src/components/LevelSelectionContent.tsx`    |
| `Difficulty_Intermediate_EditLevelModal`    | 난이도 편집 모달에서 중급 선택 | `src/components/LevelSelectionContent.tsx`    |
| `Difficulty_Hard_EditLevelModal`            | 난이도 편집 모달에서 고급 선택 | `src/components/LevelSelectionContent.tsx`    |
| `Choice_Difficulty_Easy_Popup_Difficulty`   | 난이도 선택 모달에서 초급 선택 | `src/components/DifficultySelectionModal.tsx` |
| `Choice_Difficulty_Medium_Popup_Difficulty` | 난이도 선택 모달에서 중급 선택 | `src/components/DifficultySelectionModal.tsx` |
| `Choice_Difficulty_Hard_Popup_Difficulty`   | 난이도 선택 모달에서 고급 선택 | `src/components/DifficultySelectionModal.tsx` |

---

## 이벤트 통계

### logScreenView (화면 조회 이벤트)

- **자동 매핑 화면**: 16개 (RootNavigator에서 자동 기록)
- **수동 기록 일반 화면**: 11개
- **수동 기록 모달/팝업**: 9개
- **총 화면 조회 이벤트**: 36개

### logEvent (버튼/액션 이벤트)

- **백버튼 이벤트**: 10개
- **네비게이션 이벤트**: 4개
- **온보딩 이벤트**: 27개 (일반 15개 + 관심분야 태그 12개)
- **퀴즈 이벤트**: 6개
- **검색 이벤트**: 15개 (동적 이벤트 포함)
- **마이페이지 이벤트**: 6개
- **캐릭터 이벤트**: 7개
- **로그인 이벤트**: 4개
- **기타 이벤트**: 11개 (동적 이벤트 포함)
- **총 버튼/액션 이벤트**: 94개

### 전체 통계

- **화면 조회 이벤트 (logScreenView)**: 36개
- **버튼/액션 이벤트 (logEvent)**: 94개
- **총 이벤트 수**: 130개

### 동적 이벤트

다음 이벤트들은 인덱스에 따라 동적으로 생성됩니다:

- `Card0${index + 1}_Home`: 미션 카드 클릭 (1~9번까지만 기록)
- `ContectsList${index + 1}_Search`: 검색 결과 클릭 (무제한)
- `RecentSearchChip`: 최근 검색어 클릭 (고정 이름)

---

## 참고사항

### 프로덕션 모드

모든 이벤트는 `IS_PRODUCTION` 설정이 `true`일 때만 기록됩니다.

**파일**: `src/config/adConfig.ts`

```typescript
export const IS_PRODUCTION = false; // true로 변경하면 프로덕션 모드
```

### 이벤트 이름 규칙

- 화면 조회: 화면 이름 그대로 사용 (예: `Home`, `Reading`)
- 백버튼: `Back_[화면명]` 형식
- 액션: `[액션명]_[화면명]` 형식
- 모달/팝업: `Popup_[팝업명]` 또는 `[액션명]_Popup_[팝업명]` 형식

### 문서 업데이트

새로운 이벤트를 추가할 때는 이 문서도 함께 업데이트해주세요.
