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
    participant Hook as useQuizButton
    participant API
    participant Backend
    participant Store as pointStore / experienceStore
    participant Storage as AsyncStorage

    User->>Screen: 퀴즈 풀기 → QuizScreen 이동
    Screen->>Hook: useQuizButton
    User->>Screen: 답안 제출
    Screen->>Hook: submitAnswer
    Hook->>API: submitQuizAnswer
    API->>Backend: POST /quiz/submit
    Backend-->>API: 정답 여부 + 보상
    API-->>Hook: QuizResult
    Hook->>Store: addPoints / addExperience
    Store->>Storage: 로컬 상태 동기화
    Hook-->>Screen: 결과 표시
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

    User->>Screen: 앱 실행 / 홈 탭 진입
    Screen->>Storage: getItem(DAILY_MISSION_ENTRY_KEY)
    Storage-->>Screen: 마지막 출석일

    alt 오늘 이미 출석함 (로컬 날짜 기준 동일)
        Screen->>Screen: 아무 동작 없음
    else 오늘 첫 진입
        Screen->>Storage: setItem(DAILY_MISSION_ENTRY_KEY, 오늘 날짜)
        Screen->>Screen: getLocalDateKey()로 오늘 날짜, getDay()로 요일 계산<br/>(둘 다 로컬 기준 Date 하나로 통일)

        alt 평일 (일요일 아님)
            Screen->>Store: addPoints(DAILY_POINT) / addExperience(DAILY_EXP)
            Screen->>Mixpanel: reward_popup_view (reward_source: daily_attendance)
            Screen->>Modal: showModal (데일리 보상 팝업)
        else 일요일 (위클리 출석 완료)
            Screen->>Store: addPoints(DAILY+WEEKLY) / addExperience(DAILY+WEEKLY)
            Screen->>Mixpanel: reward_popup_view (reward_source: daily_attendance)
            Screen->>Mixpanel: reward_popup_view (reward_source: weekly_attendance)
            Screen->>Modal: showModal (데일리+위클리 합산 보상 팝업, weekly=true)
        end
    end

    Modal-->>User: 보상 팝업 노출
```

**설계 메모**

- 위클리 출석은 서버 API 없이 클라이언트에서 요일(일요일)만으로 판단하며, 항상 그날의 데일리 출석과 같은 시점에 합산 지급된다. 별도의 위클리 전용 dedup 키가 없는 이유는 `DAILY_MISSION_ENTRY_KEY`의 하루 1회 체크가 이미 위클리 중복 지급도 막아주기 때문
- 팝업은 하나로 합쳐서 보여주지만(`ExperienceModalContent`의 `weekly` prop), Mixpanel 분석 이벤트는 `daily_attendance` / `weekly_attendance` 두 건으로 나눠서 전송한다 (소스별 집계를 위해)
- 날짜 판단은 반드시 로컬(기기) 기준으로 통일해야 한다. `Date.toISOString()`(UTC)과 `Date.getDay()`(로컬)를 섞어 쓰면 한국시간 자정~오전 9시 사이 요일 판별이 어긋나는 버그가 있었다 (`src/utils/dateUtils.ts`의 `getLocalDateKey()` 참고)

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
