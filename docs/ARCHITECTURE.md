# 아키텍처

## 1. 전체 책임 구조도 (Layered Architecture)

```mermaid
graph TB
    subgraph Entry
        App[App Entry]
    end

    subgraph Screens["SCREENS (화면 계층)"]
        direction LR
        Auth["🔐 인증<br/>LoginScreen"]
        MainTab["📱 메인 탭<br/>MissionScreen<br/>SearchScreen<br/>CharacterScreen<br/>MyPageScreen"]
        Content["📄 콘텐츠<br/>ArticleDetail<br/>ReadArticle<br/>QuizScreen<br/>AdLoading"]
        Search["🔍 검색<br/>SearchInput<br/>SearchResult<br/>SearchLiveOverlay"]
    end

    subgraph Hooks["HOOKS (비즈니스 로직 계층)"]
        direction LR
        HookContent["콘텐츠<br/>useArticleNavigation<br/>useExploreContents<br/>useDifficulty"]
        HookMission["미션/퀴즈<br/>useMissions<br/>useQuizButton<br/>useScrollToQuiz"]
        HookUser["유저/캐릭터<br/>useCharacter<br/>useMyPage<br/>useUpdateLevel<br/>usePointHistory"]
        HookNotif["알림/권한<br/>useNotifications<br/>useNotificationPermission<br/>useTrackingPermission"]
    end

    subgraph StoreLayer["STORE (상태 관리)"]
        Stores["Zustand Stores<br/>pointStore · experienceStore<br/>modalStore · toastStore<br/>notificationStore · onboardingStore"]
    end

    subgraph ServiceLayer["SERVICES (서비스 계층)"]
        AuthSvc["인증<br/>authService<br/>authStorageService<br/>socialLoginService"]
        EtcSvc["기타<br/>onboardingService<br/>analyticsService<br/>mixpanelService"]
    end

    subgraph APILayer["API (데이터 접근 계층)"]
        Client["HTTP Client · client.ts<br/>━━━━━━━━━━━━━━━━<br/>Request Interceptor<br/>· Bearer Token 자동 추가<br/>· /api/auth/login/ 헤더 제외<br/>· /api/auth/refresh 헤더 제외<br/>━━━━━━━━━━━━━━━━<br/>Response Interceptor<br/>· 401/403 → 토큰 재발급<br/>· 재발급 실패 → 로그아웃"]
        APIMod["API 모듈<br/>authApi · contentApi<br/>missionApi · characterApi<br/>userApi · notificationApi<br/>pointHistoryApi · withdrawApi"]
    end

    subgraph External["외부 연동"]
        Storage["📦 AsyncStorage<br/>@auth_token<br/>@refresh_token<br/>@user_info<br/>@onboarding_completed"]
        Backend["🖥️ Backend<br/>Spring Boot API<br/>RESTful · SSE"]
        ThirdParty["🌐 Third Party<br/>Firebase Auth · Analytics<br/>FCM · AdMob · Mixpanel<br/>━━━━━━━━━━━━<br/>Kakao · Naver<br/>Google · Apple"]
    end

    App --> Screens
    Screens --> Hooks
    Hooks --> StoreLayer
    Hooks --> ServiceLayer
    StoreLayer --> APILayer
    ServiceLayer --> APILayer
    APILayer --> Storage
    APILayer --> Backend
    APILayer --> ThirdParty
```

<br />

## 2. 전체 호출 흐름도 (Sequence Diagram)

### 2-1. 앱 시작 및 인증 플로우

```mermaid
sequenceDiagram
    actor User
    participant Screen
    participant Service as socialLoginService
    participant API
    participant Interceptor
    participant Backend
    participant Storage as AsyncStorage

    User->>Screen: 앱 실행
    Screen->>Storage: 온보딩/토큰 확인
    Storage-->>Screen: 저장된 상태 반환

    rect rgb(240, 245, 255)
        Note over Screen,Storage: 토큰 없음 → 로그인 플로우
        Screen-->>User: LoginScreen 표시
        User->>Screen: 소셜 로그인 선택
        Screen->>Service: 로그인 요청
        Service->>Service: Firebase Auth / 소셜 SDK 인증
        Service->>API: loginWithProvider
        API->>Interceptor: 요청 (Authorization 헤더 제외)
        Interceptor->>Backend: POST /api/auth/login/{provider}
        Backend-->>Interceptor: 토큰 + 유저정보
        Interceptor-->>API: Response
        API-->>Service: LoginResponse
        Service->>Storage: saveAuthToken / saveRefreshToken / saveUserInfo
        Service-->>Screen: 로그인 성공
        Screen->>Screen: onboardingStore 업데이트 → 메인 화면 이동
    end
```

#### 로그아웃 플로우 (참고)

```mermaid
sequenceDiagram
    actor User
    participant Screen
    participant AuthSvc as authService.logout()
    participant API as authApi / notificationApi
    participant Social as socialLoginService
    participant Storage as AsyncStorage

    User->>Screen: 로그아웃 선택
    Screen->>AuthSvc: logout()
    AuthSvc->>Storage: getUserInfo() / @fcm_token 조회

    rect rgb(240, 245, 255)
        Note over AuthSvc,API: 인증 필요 서버 API — await Promise.allSettled로 완료 대기
        AuthSvc->>API: logoutFromServer(userId)
        AuthSvc->>API: unregisterFCMToken(userId, token)
        AuthSvc->>API: updateNotificationStatus(userId, false)
        API-->>AuthSvc: 완료 (개별 실패해도 계속 진행)
    end

    AuthSvc-->>Social: signOutSocial(provider) — fire-and-forget
    AuthSvc->>Storage: multiRemove([토큰들]) — 위 API 완료 후에만 실행
    AuthSvc-->>Screen: 로그아웃 완료 → 로그인 화면 이동
```

> ⚠️ **순서 주의**: 인증 필요 API(위 rect 영역)를 로컬 토큰 삭제보다 먼저 완료해야 함. 순서가 뒤바뀌면 요청 인터셉터가 토큰을 헤더에 붙이기 전에 토큰이 삭제되어 401이 발생함 (`docs/AUTH_FLOW.md`의 "로그아웃 순서 보장", `docs/TROUBLESHOOTING.md`의 "네이버/구글 로그아웃·탈퇴 시 401" 참고).

### 2-2. 메인 기능 플로우 (미션 조회 + 토큰 재발급)

```mermaid
sequenceDiagram
    actor User
    participant Screen
    participant Hook as useMissions
    participant API
    participant Interceptor
    participant Backend
    participant Storage as AsyncStorage

    User->>Screen: MissionScreen 진입
    Screen->>Hook: useMissions
    Hook->>API: fetchMissions
    API->>Interceptor: Request (토큰 자동 추가)
    Interceptor->>Backend: GET /api/missions

    rect rgb(255, 245, 240)
        Note over Interceptor,Storage: 토큰 만료 (401/403)
        Backend-->>Interceptor: 401 Unauthorized
        Interceptor->>Backend: POST /api/auth/refresh
        Backend-->>Interceptor: 새 토큰
        Interceptor->>Storage: saveAuthToken
        Interceptor->>Backend: GET /api/missions (재시도)
    end

    Backend-->>Interceptor: 미션 데이터
    Interceptor-->>API: Response
    API-->>Hook: Mission[]
    Hook-->>Screen: 렌더링
```

### 2-3. 기사 읽기 플로우 (콘텐츠 접근 3분기)

```mermaid
sequenceDiagram
    actor User
    participant Screen
    participant Hook as useArticleNavigation
    participant Store as modalStore / pointStore
    participant API
    participant Backend
    participant AdMob

    User->>Screen: 기사 클릭
    Screen->>Hook: handleArticlePress
    Hook->>API: fetchContentAccess
    API->>Backend: GET /api/content/access
    Backend-->>API: 접근 권한 정보
    API-->>Hook: ContentAccess

    alt 무료 열람
        Hook->>Screen: ArticleDetailScreen 이동
    else 포인트 충분
        Hook->>Store: showModal (포인트 사용 확인)
        User->>Store: 확인
        Hook->>API: purchaseContentWithPoint
        API->>Backend: POST .../point
        Backend-->>API: 성공
        Hook->>Store: subtractPoints
        Hook->>Screen: ArticleDetailScreen 이동
    else 포인트 부족 → 광고 시청
        Hook->>Store: showModal (광고 모달)
        User->>Store: 광고 시청 선택
        Screen->>AdMob: 리워드 광고 로드/표시
        AdMob-->>Screen: 광고 완료
        Screen->>API: purchaseContentWithAd
        API->>Backend: POST .../ad
        Backend-->>API: 성공
        Screen->>Store: addPoints
        Screen->>Screen: ArticleDetailScreen 이동
    end
```

### 2-4. 퀴즈 풀기 플로우

```mermaid
sequenceDiagram
    actor User
    participant Screen as QuizScreen
    participant API
    participant Backend
    participant Store as pointStore / experienceStore

    User->>+Screen: 퀴즈 풀기 → QuizScreen 이동
    Screen->>+API: fetchQuiz(userId, contentId)
    API->>+Backend: GET /api/quiz/{contentId}?userId=
    Backend-->>-API: 퀴즈 문항 + 선택지
    API-->>-Screen: QuizResponse
    Screen-->>-User: 문항/선택지 표시

    User->>+Screen: 답안 선택 후 "다음" 클릭
    Screen->>+API: submitQuiz(userId, { quizId, selectedNo, readContentId })
    API->>+Backend: POST /api/quiz/submit?userId=
    Backend-->>-API: quizResultResponse + rewardResponse<br/>(earnedPoint, earnedExp) + userLevelInformation
    API-->>-Screen: response.data
    Screen->>+Store: addPoints(rewardResponse.earnedPoint)<br/>addExperience(rewardResponse.earnedExp)
    Store-->>-Screen: 반영 완료
    Screen-->>-User: 정답/오답 팝업<br/>(팝업 텍스트는 로컬 상수 — 실제 지급은 서버값, 4-3 참고)
```

### 2-5. 출석 체크 및 보상 플로우 (데일리 + 위클리 합산)

```mermaid
sequenceDiagram
    actor User
    participant Screen as MissionScreen
    participant Storage as AsyncStorage
    participant Store as pointStore / experienceStore
    participant Modal as modalStore
    participant Mixpanel as mixpanelService
    participant Backend

    User->>+Screen: 앱 실행 / 홈 탭 진입
    Screen->>+Storage: getItem(DAILY_MISSION_ENTRY_KEY)
    Storage-->>-Screen: 마지막 출석일

    alt 오늘 이미 출석함 (로컬 날짜 기준 동일)
        Screen->>Screen: 아무 동작 없음
    else 오늘 첫 진입
        Screen->>+Storage: setItem(DAILY_MISSION_ENTRY_KEY, 오늘 날짜)
        Storage-->>-Screen: 완료
        Screen->>Screen: getLocalDateKey()로 오늘 날짜, getDay()로 요일 계산<br/>(둘 다 로컬 기준 Date 하나로 통일)

        Note over Screen,Backend: ⚠️ 이 지점에는 서버로 보내는 API 호출이 없다.<br/>출석 사실 자체는 서버에 전달되지 않는다.

        alt 평일 (일요일 아님)
            Screen->>+Store: addPoints(DAILY_POINT) / addExperience(DAILY_EXP)
            Store-->>-Screen: 반영 완료
            Screen->>+Mixpanel: reward_popup_view (reward_source: daily_attendance)
            Mixpanel-->>-Screen: 완료
            Screen->>+Modal: showModal (데일리 보상 팝업)
            Modal-->>-User: 보상 팝업 노출
        else 일요일 (위클리 출석 완료)
            Screen->>+Store: addPoints(DAILY+WEEKLY) / addExperience(DAILY+WEEKLY)
            Store-->>-Screen: 반영 완료
            Screen->>+Mixpanel: reward_popup_view (reward_source: daily_attendance)
            Mixpanel-->>-Screen: 완료
            Screen->>+Mixpanel: reward_popup_view (reward_source: weekly_attendance)
            Mixpanel-->>-Screen: 완료
            Screen->>+Modal: showModal (데일리+위클리 합산 보상 팝업, weekly=true)
            Modal-->>-User: 보상 팝업 노출
        end
    end

    Note over Backend: 서버의 "주간 출석 기록"(CharacterScreen에 표시)은<br/>이 플로우와 무관하게 별도로 계산된다.<br/>클라이언트가 출석을 알리는 write API는 없고,<br/>서버가 그날의 다른 인증 활동을 근거로 자체 판단한다.
    Screen-->>-User: (참고) 이후 CharacterScreen 진입 시<br/>GET /api/characters/me로 서버 판단 출석 기록을 별도 조회 (4-4 참고)
```

**설계 메모**

- 위클리 출석은 서버 API 없이 클라이언트에서 요일(일요일)만으로 판단하며, 항상 그날의 데일리 출석과 같은 시점에 합산 지급된다. 별도의 위클리 전용 dedup 키가 없는 이유는 `DAILY_MISSION_ENTRY_KEY`의 하루 1회 체크가 이미 위클리 중복 지급도 막아주기 때문
- 팝업은 하나로 합쳐서 보여주지만(`ExperienceModalContent`의 `weekly` prop), Mixpanel 분석 이벤트는 `daily_attendance` / `weekly_attendance` 두 건으로 나눠서 전송한다 (소스별 집계를 위해)
- 날짜 판단은 반드시 로컬(기기) 기준으로 통일해야 한다. `Date.toISOString()`(UTC)과 `Date.getDay()`(로컬)를 섞어 쓰면 한국시간 자정~오전 9시 사이 요일 판별이 어긋나는 버그가 있었다 (`src/utils/dateUtils.ts`의 `getLocalDateKey()` 참고)
- 이 플로우 전체에 백엔드 호출이 없다는 것 자체가 중요한 특징이다. 서버가 보여주는 "주간 출석 기록"은 이 로컬 보상 지급과 완전히 별개의 시스템이며, 서버에 출석을 기록시키는 write API는 코드 전체에 존재하지 않는다 (4-4 참고)

### 2-6. 글 읽기 보상 플로우 (퀴즈 이어풀기 시 합산)

```mermaid
sequenceDiagram
    actor User
    participant Screen as ArticleDetailScreen
    participant API
    participant Backend
    participant Storage as AsyncStorage
    participant Store as experienceStore
    participant Modal as modalStore
    participant Mixpanel as mixpanelService
    participant Quiz as QuizScreen

    User->>+Screen: 기사 상세 화면 진입
    Screen->>+API: fetchContentDetail(userId, contentId, isFromHome)
    API->>+Backend: GET /api/content/{contentId}?userId=&isFromHome=
    Backend-->>-API: 글 본문 데이터<br/>(서버는 이 호출 자체로 "완독"을 함께 기록,<br/>보상 계산은 하지 않음)
    API-->>-Screen: ContentDetail
    Screen-->>-User: 본문 표시 (article_start 트래킹만, 보상은 아직 없음)

    alt 퀴즈 풀기 버튼 클릭
        User->>+Screen: "퀴즈 풀기" 클릭
        Screen->>Screen: wentToQuizRef = true
        Screen->>+Storage: getItem(@article_read_reward_{articleId})
        Storage-->>-Screen: 미지급 상태
        Screen->>+Storage: setItem(..., true)
        Storage-->>-Screen: 완료
        Screen->>+Store: addExperience(5) — 팝업 없이 조용히 반영
        Store-->>-Screen: 반영 완료
        Screen->>+Quiz: navigate (push, 이 화면은 언마운트 안 됨)
        deactivate Screen
        User->>Quiz: 답안 선택 후 "다음" 클릭
        Quiz->>+API: submitQuiz(userId, { quizId, selectedNo, readContentId })
        API->>+Backend: POST /api/quiz/submit?userId=
        Backend-->>-API: rewardResponse (earnedPoint, earnedExp)
        API-->>-Quiz: response.data
        Quiz->>+Store: addPoints(서버값) / addExperience(서버값)
        Store-->>-Quiz: 반영 완료<br/>(최종 경험치 = 서버 퀴즈 보상 + 조용히 더한 5xp)
        Quiz-->>-User: 정답/오답 팝업 (25XP/15XP, 5xp 포함된 합산값)
    else 퀴즈로 이어지지 않고 이탈 (뒤로가기 등)
        User->>+Screen: 화면 이탈 (뒤로가기 / 다른 화면 이동)
        Screen->>Screen: useFocusEffect cleanup 실행<br/>(blur 감지, wentToQuizRef === false 확인)
        Screen->>+Storage: getItem(@article_read_reward_{articleId})
        Storage-->>-Screen: 미지급 상태
        Screen->>+Storage: setItem(..., true)
        Storage-->>-Screen: 완료
        Screen->>+Store: addExperience(5)
        Store-->>-Screen: 반영 완료
        Screen->>+Mixpanel: reward_popup_view (reward_source: article_read)
        Mixpanel-->>-Screen: 완료
        Screen->>+Modal: showModal (경험치 획득 팝업, articleRead=true)
        Modal-->>-User: 경험치 획득 팝업 노출 (5XP)
        deactivate Screen
    end
```

**설계 메모**

- React Navigation 스택 구조상 퀴즈로 `push`해도 `ArticleDetailScreen`은 언마운트되지 않고 blur만 되므로, 일반 `useEffect`의 unmount cleanup이 아니라 `useFocusEffect`의 cleanup으로 이탈을 감지한다. 뒤로가기(pop)와 퀴즈 이동(push) 둘 다 blur를 거치므로 한 cleanup으로 두 경우를 모두 처리할 수 있다.
- `wentToQuizRef`로 두 경로를 나눈다: 퀴즈로 이동한 경우는 팝업 없이 store에만 조용히 반영하고(퀴즈 결과 팝업이 합산값을 보여주므로), 이어지지 않은 이탈은 자체 팝업으로 5xp를 보여준다.
- 이 플로우에는 백엔드 호출이 두 곳 있다: 화면 진입 시 `fetchContentDetail`(완독 기록은 겸하지만 보상 계산은 하지 않음)과, 퀴즈 경로에서만 발생하는 `submitQuiz`(실제 보상값을 서버가 계산). 글 읽기 5xp 자체는 두 호출 중 어디에도 실려가지 않고 클라이언트에서만 계산된다.
- dedup 키(`@article_read_reward_{articleId}`)는 두 경로가 공유한다 — 글 하나당 평생 한 번만 지급.
- 퀴즈 경로의 최종 지급액(서버값 + 로컬 5xp)과 QuizScreen 팝업에 표시되는 고정 텍스트(25XP/15XP)는 별개의 값이다. 팝업 텍스트는 `QUIZ_CORRECT_EXPERIENCE` 같은 로컬 상수를 그대로 보여줄 뿐, 실제 서버 보상액과 정확히 일치한다는 보장은 없다 (4-3 참고). 서버가 정답 보상으로 정확히 20xp를 주는지 등은 백엔드 확인이 필요하다.

<br />

## 3. 주요 요청 흐름도 (Request Processing Flow)

```mermaid
flowchart TD
    Start([사용자 요청]) --> AuthCheck{인증 필요?}

    AuthCheck -- No --> DirectCall[API 직접 호출]
    AuthCheck -- Yes --> TokenCheck[토큰 확인]

    TokenCheck --> TokenExist{토큰 존재?}
    TokenExist -- No --> LoginFlow[로그인 플로우]

    LoginFlow --> SocialLogin["소셜 로그인<br/>(Kakao / Naver / Google / Apple)"]
    SocialLogin --> FirebaseAuth[Firebase Auth]
    FirebaseAuth --> BackendLogin["Backend 로그인 API<br/>POST /api/auth/login/{provider}<br/>(Authorization 헤더 없음)"]
    BackendLogin --> SaveToken["토큰 저장<br/>(AsyncStorage)"]
    SaveToken --> AddBearer

    TokenExist -- Yes --> AddBearer["Request Header에<br/>Bearer Token 추가"]

    DirectCall --> SendRequest
    AddBearer --> SendRequest[API 요청 전송]

    SendRequest --> ReqInterceptor["Request Interceptor<br/>· 토큰 자동 추가 · 로깅"]
    ReqInterceptor --> BackendAPI["Backend API<br/>(Spring Boot)"]

    BackendAPI --> ResponseStatus{응답 상태}

    ResponseStatus -- 200 OK --> ResInterceptor["Response Interceptor<br/>· 로깅 · 데이터 반환"]
    ResponseStatus -- 401/403 --> RefreshAttempt[토큰 재발급 시도]
    ResponseStatus -- 500/Network Error --> ErrorHandle["에러 처리<br/>(Toast/Alert 표시)"]

    RefreshAttempt --> RefreshAPI["POST /api/auth/refresh"]
    RefreshAPI --> RefreshResult{재발급 성공?}

    RefreshResult -- Yes --> SaveNewToken[새 토큰 저장]
    SaveNewToken --> Retry[원래 요청 재시도]
    Retry --> ResInterceptor

    RefreshResult -- No --> ClearAuth["토큰/유저 정보 삭제<br/>온보딩 상태 초기화"]
    ClearAuth --> GoLogin[로그인 화면 이동]

    ResInterceptor --> StoreCheck{Store 업데이트<br/>필요?}
    StoreCheck -- Yes --> UpdateStore["Zustand Store 업데이트<br/>pointStore · experienceStore 등"]
    StoreCheck -- No --> Render

    UpdateStore --> Render[UI 렌더링]
    Render --> Analytics["Analytics 로깅<br/>Firebase · Mixpanel"]
    Analytics --> Done([완료])

    ErrorHandle --> Done
    GoLogin --> Done
```

<br />

## 4. 보상(Reward) 시스템 — 서버 값 vs 로컬 값

포인트/경험치가 여러 화면(퀴즈, 출석, 광고, 글 읽기)에서 지급되면서 "이 숫자가 서버에서 온 건지 프론트에서 만든 건지" 헷갈리기 쉬워서 별도로 정리한다.

### 4-1. 보상 트리거 → 지급 → 화면 반영 전체 흐름도

6가지 보상 트리거가 각각 서버값을 쓰는지 로컬 상수를 쓰는지, 그리고 그 값이 어디로 흘러가는지를 하나의 흐름도로 정리한다.

```mermaid
flowchart TD
    QuizSubmit(["퀴즈 제출"]) --> QuizAPI["submitQuiz API 호출<br/>✅ API 목적 자체가 '정답 제출 + 보상 계산'<br/>→ 서버가 확실히 반영"]
    QuizAPI --> QuizServerValue["서버 응답<br/>rewardResponse.earnedPoint/earnedExp"]
    QuizServerValue --> QuizPopup["퀴즈 결과 팝업<br/>⚠️ 표시 텍스트는 로컬 상수<br/>(QUIZ_CORRECT/INCORRECT_*)"]

    DailyEntry(["앱 실행 (일일 첫 진입)"]) --> DailyCheck{"AsyncStorage<br/>오늘 이미 출석?"}
    DailyCheck -- No --> DailyLocal["❌ API 호출 자체가 없음<br/>로컬 상수만 지급<br/>DAILY_ATTENDANCE_POINT/EXP<br/>→ 서버는 존재를 모름"]
    DailyCheck -- No --> SundayCheck{"오늘 일요일?"}
    SundayCheck -- Yes --> WeeklyLocal["❌ API 호출 자체가 없음<br/>위클리 보상 합산<br/>WEEKLY_ATTENDANCE_POINT/EXP<br/>→ 서버는 존재를 모름"]
    DailyCheck -- Yes --> DailySkip["보상 없음 (중복 방지)"]

    AdWatch(["광고 시청 완료"]) --> AdAPI["purchaseContentWithAd API 호출<br/>⚠️ API 목적은 '콘텐츠 열람권 부여'<br/>포인트도 같이 크레딧하는지는<br/>서버 스펙 미확인"]
    AdAPI --> AdLocal["클라이언트는 일단<br/>로컬 상수로 지급<br/>AD_REWARD_POINTS"]

    ArticleEnter(["글 상세 화면 진입"]) --> ContentAPI["fetchContentDetail API 호출<br/>⚠️ API 목적은 '콘텐츠 조회 + 완독 기록'<br/>(isRead만 기록, 보상 로직 없음)<br/>→ 서버는 '읽음'만 알고 경험치는 모름"]
    ContentAPI --> ArticleDedup{"AsyncStorage<br/>이 글 이미 보상 지급?"}
    ArticleDedup -- No --> ArticleLocal["로컬 상수 지급<br/>ARTICLE_READ_EXPERIENCE"]
    ArticleDedup -- Yes --> ArticleSkip["보상 없음 (중복 방지)"]

    PointPurchase(["포인트로 글 구매"]) --> PurchaseAPI["purchaseContentWithPoint API 호출<br/>✅ API 목적 자체가 '포인트 차감 트랜잭션'<br/>→ 서버가 확실히 반영"]
    PurchaseAPI --> PurchaseServer["서버에서 포인트 차감<br/>⚠️ 로컬 pointStore는 그대로<br/>(반대 방향 미동기화)"]

    QuizServerValue --> LocalStore
    DailyLocal --> LocalStore
    WeeklyLocal --> LocalStore
    AdLocal --> LocalStore
    ArticleLocal --> LocalStore

    LocalStore["experienceStore / pointStore<br/>(Zustand, addExperience/addPoints)"]

    LocalStore -->|"experience 증가 감지"| RootNav["RootNavigator<br/>→ characterData refetch<br/>→ 레벨업 체크"]
    LocalStore -->|"fallback 값으로만 사용"| ArticleNavFallback["useArticleNavigation<br/>currentPoints fallback"]

    RootNav --> ServerRefetch["GET /api/characters/me<br/>재조회"]
    PurchaseServer -.->|"다음 CharacterScreen<br/>진입 시에만 반영"| ServerRefetch

    ServerRefetch --> CharacterScreen["CharacterScreen<br/>('나의 레벨' 화면)<br/>유저가 보는 실제 수치<br/>= userGrowthInfo.currentExp/currentPoint"]

    style QuizAPI fill:#e8f5e9
    style QuizServerValue fill:#e8f5e9
    style PurchaseAPI fill:#e8f5e9
    style PurchaseServer fill:#e8f5e9
    style ServerRefetch fill:#e8f5e9
    style CharacterScreen fill:#e8f5e9
    style DailyLocal fill:#fff3e0
    style WeeklyLocal fill:#fff3e0
    style AdLocal fill:#fff3e0
    style ArticleLocal fill:#fff3e0
    style LocalStore fill:#fff3e0
    style AdAPI fill:#fce4ec
    style ContentAPI fill:#fce4ec
    style QuizPopup fill:#ffe0e0
```

🟢 초록(서버 값) · 🟠 주황(로컬 상수, 서버 미반영) · 🔴 빨강(표시값과 실제 지급값이 다를 수 있는 지점)

**읽는 법**: 왼쪽의 6개 시작점(퀴즈 제출/일일 출석/광고 시청/글 진입/포인트 구매)이 각각 어떤 방식으로 보상을 만들어내는지 보여준다. 서버 API를 호출해도 그 응답값을 실제로 쓰는 건 퀴즈뿐이고, 나머지는 API를 호출하더라도(광고, 포인트 구매) 보상액 자체는 로컬 상수이거나 서버 차감이 로컬에 반영되지 않는다. 결국 모든 로컬 지급은 `LocalStore`로 모이지만, 유저가 실제로 보는 `CharacterScreen`은 이 store를 거치지 않고 서버를 직접 재조회한 값만 보여준다 — 그래서 로컬 지급은 "유저 체감상 즉시 받은 것처럼 보이지만, 서버 기준 실제 수치와는 별개"라는 점이 이 흐름도의 핵심이다.

### 4-2. 보상 종류별 지급 방식 (요약 표)

| 보상 | 실제 지급값 출처 | 지급 방식 | 관련 파일 |
| --- | --- | --- | --- |
| 퀴즈 정답/오답 | **서버** — `submitQuiz` 응답의 `rewardResponse.earnedPoint`/`earnedExp` | `addPoints(서버값)` / `addExperience(서버값)` | `QuizScreen.tsx` |
| 퀴즈 팝업에 **표시되는 텍스트** | ⚠️ 로컬 고정값 (`QUIZ_CORRECT_EXPERIENCE` 등) — 실제 지급된 서버값과 다를 수 있음 | `ExperienceModalContent`가 상수를 그대로 렌더링 | `ArticlePointModalContent.tsx` |
| 데일리 출석 | 로컬 상수 (`DAILY_ATTENDANCE_POINT`/`EXPERIENCE`) — 서버 API 호출 없음 | AsyncStorage로 하루 1회 dedup 후 로컬 지급 | `MissionScreen.tsx` |
| 위클리 출석 | 로컬 상수 (`WEEKLY_ATTENDANCE_POINT`/`EXPERIENCE`) — 서버 API 호출 없음 | 일요일 데일리 출석과 같은 시점에 합산 지급 | `MissionScreen.tsx` |
| 광고 시청 | 로컬 상수 (`AD_REWARD_POINTS`) — `purchaseContentWithAd` API는 별도 호출되지만 지급액은 로컬 상수 | 광고 시청 완료 시 로컬 지급 | `AdLoadingScreen.tsx` |
| 글 읽기 | 로컬 상수 (`ARTICLE_READ_EXPERIENCE`) — 서버 API 호출 없음 (완독 처리는 `fetchContentDetail` 호출 자체가 겸함) | AsyncStorage로 글 ID당 1회 dedup 후 로컬 지급 | `ArticleDetailScreen.tsx` |
| 포인트로 글 열람 (비용 차감) | ⚠️ 서버만 차감 — `purchaseContentWithPoint` 성공해도 로컬 `pointStore`는 차감되지 않음 (미동기화) | - | `useArticleNavigation.ts` |

### 4-3. 알아둘 점

- **로컬 지급(출석/광고/글 읽기)은 서버가 실제로 아는 값이 아니다.** 클라이언트가 "이만큼 준 걸로 치자"하고 흉내 내는 것에 가깝다. 유저가 캐릭터 탭에서 실제 경험치/포인트를 확인하면 서버가 카운트한 적 없는 값이라 반영되지 않을 수 있다.
- **정확한 지급을 보장하려면 서버 API가 필요하다.** 현재는 퀴즈만 서버 왕복으로 정확한 값을 받고, 나머지는 전부 프론트 추정치다.
- **퀴즈 팝업 표시값과 실제 지급값이 다를 수 있다.** 팝업은 `QUIZ_CORRECT_EXPERIENCE`(25) 같은 로컬 상수를 그대로 보여주지만, 실제로 store에 더해지는 값은 서버가 응답한 `rewardResponse.earnedExp`다. 서버 리워드 정책이 바뀌면 팝업 표시값도 함께 업데이트해야 한다.
- **포인트 구매(글 열람) 차감이 로컬에 반영되지 않는다.** 서버는 포인트를 차감하지만 `pointStore`는 그대로라, 다음 서버 재조회 전까지 로컬 fallback 값이 실제보다 높게 남아있을 수 있다.

### 4-4. 출석 보상 지급 vs 서버 출석 기록 조회 — 서로 무관한 두 트랙

**데일리/위클리 출석 "보상 지급"과, CharacterScreen에 보이는 "주간 출석 기록(요일별 체크)"은 완전히 다른 시스템이다.** 하나는 순수 로컬, 하나는 서버 조회이며 둘은 서로 데이터를 주고받지 않는다.

```mermaid
flowchart TD
    subgraph Client["클라이언트 (MissionScreen) — 보상 지급 트랙"]
        Start(["앱 실행 / MissionScreen 마운트"]) --> GetNow["now = new Date()<br/>today = getLocalDateKey(now)"]
        GetNow --> ReadStorage["AsyncStorage.getItem<br/>('@daily_mission_entry')"]
        ReadStorage --> Compare{"오늘 이미<br/>출석함?"}
        Compare -- Yes --> Skip["보상 없음"]
        Compare -- No --> SaveToday["AsyncStorage.setItem<br/>('@daily_mission_entry', today)"]
        SaveToday --> IsSunday{"오늘 일요일?"}
        IsSunday -- No --> DailyLocal["로컬 상수 지급<br/>DAILY_ATTENDANCE_POINT/EXP<br/>addPoints / addExperience"]
        IsSunday -- Yes --> WeeklyLocal["로컬 상수 합산 지급<br/>DAILY + WEEKLY_ATTENDANCE_POINT/EXP<br/>addPoints / addExperience"]
        DailyLocal --> Modal["showModal<br/>(포인트/경험치 획득 팝업)"]
        WeeklyLocal --> Modal
        DailyLocal --> Mixpanel1["trackEvent('reward_popup_view')"]
        WeeklyLocal --> Mixpanel2["trackEvent('reward_popup_view') x2<br/>(daily + weekly)"]
    end

    NoAPI(["❌ 이 트랙에는<br/>서버로 보내는 API 호출이<br/>단 한 줄도 없음"])
    SaveToday -.->|"출석 사실은<br/>서버로 전송 안 됨"| NoAPI

    subgraph Server["서버 — 출석 기록 트랙 (완전히 별개)"]
        AnyActivity(["유저의 그날 서버 인증 활동<br/>(어떤 API든 호출 시 서버가<br/>자체적으로 '출석'으로 판단·기록<br/>— 클라이언트는 관여 안 함)"]) --> ServerCompute["서버가 요일별 출석 여부<br/>자체 계산/저장<br/>(WeeklyAttendance: mon~sun boolean)"]
    end

    subgraph CharScreen["클라이언트 (CharacterScreen) — 조회 트랙"]
        Focus(["CharacterScreen 진입/포커스"]) --> FetchAPI["GET /api/characters/me<br/>fetchCharacterMe()"]
        FetchAPI --> Convert["convertWeeklyAttendanceToAttendanceData()<br/>{day:'월', attended:true} 등으로 변환"]
        Convert --> Render["'주간 출석 기록' UI<br/>요일별 원형 체크 표시"]
    end

    ServerCompute --> FetchAPI

    style DailyLocal fill:#fff3e0
    style WeeklyLocal fill:#fff3e0
    style NoAPI fill:#ffe0e0
    style ServerCompute fill:#e8f5e9
    style FetchAPI fill:#e8f5e9
    style Render fill:#e8f5e9
```

- **보상 지급 트랙 (`MissionScreen.tsx`)**: `AsyncStorage` 키 `@daily_mission_entry`로 "오늘 이미 출석했는가"만 로컬 체크하고, 통과하면 로컬 상수를 `addPoints`/`addExperience`로 바로 반영한다. 서버에 "오늘 출석했다"를 알리는 API 호출은 코드 전체에 존재하지 않는다 (`client.post`/`patch` + attendance/출석 키워드로 전수 검색해도 0건).
- **출석 기록 조회 트랙 (`CharacterScreen.tsx`)**: 요일별 체크 원(`주간 출석 기록`)은 `GET /api/characters/me` (`fetchCharacterMe`, `src/api/characterApi.ts:384-399`)의 응답 중 `attendance` 필드(`WeeklyAttendance`: `monday~sunday` boolean, `characterApi.ts:118-126`)를 그대로 그려주는 것이다. 이 값은 서버가 자체적으로 계산해서 내려주며, 클라이언트가 별도로 "기록"시키는 write API는 존재하지 않는다.
- **서버가 정확히 무엇을 근거로 출석을 판단하는지는 코드로 확인 불가.** 그날 다른 API를 하나라도 호출하면 출석 처리되는 것인지, 별도 로그인/세션 체크인지는 백엔드 스펙 확인이 필요하다.
- **결론**: 유저가 실제로 받는 포인트/경험치(로컬)와 CharacterScreen에 보이는 "출석 기록"(서버)은 서로 다른 기준으로 독립적으로 움직인다. 둘을 같은 하나의 "출석 시스템"으로 오해하지 않도록 주의.

<br />

## 아키텍처 특징 요약

### 계층 분리 (Layered Architecture)

- **Presentation**: React Native 화면 컴포넌트
- **Business Logic**: Custom Hooks로 비즈니스 로직 분리
- **State Management**: Zustand를 통한 전역 상태 관리
- **Service**: 인증, 소셜로그인, 분석 등 도메인 서비스
- **Data Access**: Axios 기반 API 클라이언트

### 주요 패턴

- **Interceptor 패턴**: 요청/응답 자동 처리 (토큰, 로깅, 재발급)
- **Custom Hooks**: 재사용 가능한 비즈니스 로직 캡슐화
- **Store Pattern**: Zustand로 전역 상태 관리
- **API Module Pattern**: 도메인별 API 모듈로 데이터 접근 로직 분리
- **Service/API Layer 분리**: 인증·소셜로그인·분석 로직과 HTTP 요청 모듈을 역할별로 분리

### 데이터 흐름

- **요청**: Screen → Hook → API → Interceptor → Backend
- **응답**: Backend → Interceptor → API → Hook → Store → Screen
- **에러**: Interceptor에서 자동 재시도/로그아웃 처리

### 내부 테스트 전용 화면 (스토어 스크린샷용)

`MockArticleDetailScreen.tsx` / `MockQuizScreen.tsx`(`src/screens/common/`)는 스토어 등록용 스크린샷 촬영을 위해 추가된 화면이다.

- `ArticleDetailScreen` / `QuizScreen`과 시각적으로 동일하지만, 서버 API 호출과 포인트·경험치 지급 로직이 없다. 콘텐츠는 `src/data/mock/mockArticleQuiz.ts`에 고정된 값을 사용한다.
- (2026-08-09 기준) 홈(`MissionScreen`)·탐색(`SearchScreen`) 리스트 맨 위 mock 카드 노출은 비활성화되어 현재 진입 경로가 없다. 라우트(`MOCK_ARTICLE_DETAIL` / `MOCK_QUIZ`)와 화면·데이터 파일은 재사용을 위해 그대로 유지된다.
- 실제 `ArticleDetailScreen` / `QuizScreen`의 로직에는 영향을 주지 않는 별도 화면이다.
