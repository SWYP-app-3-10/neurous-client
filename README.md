# Neurous (뉴로스)

성인 문해력 향상을 위한 뉴로스 모바일 애플리케이션 클라이언트 레포지토리입니다.

- **App ID**: `io.neurous.app`
- **Platform**: iOS / Android (React Native CLI)

<br />

## 기술 스택

| 분류               | 기술                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| **Core**           | React Native 0.83.1, React 19.2.0, TypeScript 5.8, Node ≥ 20              |
| **Navigation**     | React Navigation 6 (native-stack, bottom-tabs, stack)                     |
| **State (Client)** | Zustand 5                                                                 |
| **State (Server)** | TanStack Query 5                                                          |
| **Networking**     | Axios, `react-native-sse` (SSE)                                           |
| **Storage**        | AsyncStorage                                                              |
| **Firebase**       | App / Auth / Analytics / Messaging(FCM) 23.7                              |
| **Social Login**   | Google, Kakao, Naver, Apple                                               |
| **Ads**            | `react-native-google-mobile-ads` (AdMob)                                  |
| **UI**             | `react-native-svg`, `react-native-linear-gradient`, `lottie-react-native` |
| **Etc**            | `react-native-permissions`, `dayjs`, `patch-package`                      |
| **Analytics**      | Firebase Analytics, Amplitude                                             |
| **Backend**        | Spring Boot (REST API + SSE)                                              |

<br />

## 시작하기

### 요구 사항

- Node.js ≥ 20
- iOS 빌드 시 macOS + Xcode + CocoaPods

### 설치

```bash
# 의존성 설치 (postinstall에서 patch-package 자동 실행)
npm install

# iOS
cd ios && pod install && cd ..
```

> ⚠️ Git에 커밋되지 않는 민감 설정 파일(`GoogleService-Info.plist`, `google-services.json`, `Info.plist`, `Config.xcconfig`, 소셜 로그인 키 등)이 별도로 필요합니다. 신규 환경 세팅 시 팀에 설정 파일을 요청하세요. (누락 시 앱 화이트 스크린 / Archive 빌드 실패 발생)

### 실행

```bash
npm start          # Metro 번들러
npm run ios        # iOS 실행
npm run android    # Android 실행
```

### 코드 스타일

커밋 전 반드시 린트를 실행하세요.

```bash
npm run lint                # ESLint 검사
npm run lint -- --fix       # 자동 수정
```

<br />

## 프로젝트 구조

```
src/
├── api/                  # Axios 인스턴스 및 도메인별 API 모듈
│   ├── client.ts         # Axios 인터셉터 (JWT 자동 추가/갱신, 로깅)
│   ├── authApi.ts        ├── userApi.ts        ├── contentApi.ts
│   ├── missionApi.ts     ├── characterApi.ts   ├── notificationApi.ts
│   ├── pointHistoryApi.ts├── withdrawApi.ts    └── inquiryApi.ts
├── components/           # 공통 UI 컴포넌트
│   ├── Button.tsx / Input.tsx / Toggle.tsx / Header.tsx ...
│   ├── ArticleContent.tsx          # 기사 내용 (AI 재구성 안내 배너 지원)
│   ├── NotificationModal.tsx       # 전역 알림 모달
│   ├── BottomSheetModal.tsx        # 전역 바텀시트 모달
│   ├── ToastModal.tsx              # 전역 토스트
│   ├── Quiz*.tsx                   # Question / Feedback / OptionCard
│   └── Search*.tsx, SocialLoginButton.tsx ...
├── hooks/                # 비즈니스 로직 커스텀 훅 (React Query 포함)
│   ├── useNotifications.ts / usePushNotification.ts / useNotificationPermission.ts
│   ├── useArticleNavigation.ts / useExploreContents.ts
│   ├── useMissions.ts / useQuizButton.ts / useScrollToQuiz.ts
│   ├── useCharacter.ts / useMyPage.ts / useUpdateLevel.ts
│   ├── useDifficulty*.ts / usePointHistory.ts / useWithdrawUser.ts ...
├── navigation/           # 네비게이션 설정
│   ├── RootNavigator.tsx / MainTabNavigator.tsx
│   ├── FullScreenStackNavigator.tsx          # 탭바 없는 화면
│   ├── Mission / Character / Search / MyPage StackNavigator.tsx
│   ├── OnboardingNavigator.tsx
│   └── types.ts                              # 네비게이션 타입 정의
├── screens/              # 화면 컴포넌트
│   ├── auth/             # 인증 (LoginScreen 등)
│   ├── onboarding/       # 온보딩 (IntroSlide / Terms / Difficulty / Interests)
│   ├── main/             # 메인 탭 (Mission / Character / MyPage)
│   ├── common/           # 공통 (ArticleDetail / Quiz / AdLoading / Notification)
│   └── search/           # 검색 관련 화면
├── services/             # 도메인 서비스 레이어
│   ├── socialLoginService.ts / authService.ts / authStorageService.ts
│   ├── analyticsService.ts / onboardingService.ts
│   └── difficultyFeedbackService.ts / recentSearches.ts
├── store/                # Zustand 전역 상태
│   ├── modalStore.ts / toastStore.ts / notificationStore.ts
│   └── onboardingStore.ts / pointStore.ts / experienceStore.ts
├── utils/                # 유틸리티 (dateUtils / myPageUtils / imageUtils ...)
└── config/               # 환경/라우트 설정 (env / routes / queryClient / adConfig ...)
```

<br />

## 주요 기능

- 소셜 로그인 4종 (Google / Kakao / Naver / Apple)
- 온보딩 플로우 (난이도 설정, 관심분야 선택)
- AI 재구성 기사 읽기 + 퀴즈 시스템
- 콘텐츠 접근 3분기 (무료 열람 / 포인트 사용 / 광고 시청)
- 포인트·경험치·캐릭터 성장 시스템
- 미션 시스템 (일일 미션, 기사 읽기)
- 알림 시스템 (SSE 포그라운드 + FCM 백그라운드/종료)
- 검색 (카테고리별 기사 검색, 실시간 결과)
- 마이페이지 (프로필, 관심분야, 레벨, 읽은 글 목록)
- 전역 모달·토스트 시스템
- 리워드 광고 연동 (AdMob)

<br />

## 핵심 아키텍처 요약

### 계층 구조

```
Screen → Hook → Store / Service → API (client.ts) → Backend
```

- **Screen**: React Native 화면 컴포넌트
- **Hook**: 비즈니스 로직 캡슐화 (TanStack Query 포함)
- **Store**: Zustand 전역 상태 (point / experience / modal / notification 등)
- **Service**: 인증·소셜 로그인·분석 등 도메인 서비스
- **API**: Axios 기반 HTTP 클라이언트 + 인터셉터 (JWT 자동 추가/갱신)

### 데이터 흐름

- **요청**: Screen → Hook → API → Interceptor → Backend
- **응답**: Backend → Interceptor → API → Hook → Store → Screen
- **에러**: Interceptor에서 401/403 자동 재시도, 실패 시 로그아웃

### 전역 모달 / 토스트

어느 화면에서든 `useShowModal`, `useShowBottomSheetModal` 훅으로 호출 가능하며, 루트 레벨 렌더링으로 `goBack()` 후에도 유지됩니다.

```typescript
import { useShowModal } from '../store/modalStore';

const showModal = useShowModal();
showModal({
  title: '삭제하시겠습니까?',
  primaryButton: { title: '삭제', onPress: () => {} },
  secondaryButton: { title: '취소', onPress: () => {} },
});
```

<br />

## 개발 컨벤션

### 브랜치 네이밍

| Prefix   | 용도                  |
| -------- | --------------------- |
| `feat/`  | 신규 기능             |
| `fix/`   | 버그 / 깨진 상태 수정 |
| `chore/` | 유지보수              |
| `docs/`  | 문서                  |

### 커밋 메시지

`type(scope): 한글 요약` 형식, 파일/변경 단위로 커밋을 분리합니다.

```
feat(notification): SSE 기반 포그라운드 알림 수신 구현
fix(client): 소셜 로그인 API에 stale 토큰 첨부되는 문제 수정
```

### PR

- **Squash merge** 전략 사용
- PR 본문에 개요 / 변경 내용 / 범위 체크리스트 / 테스트 체크리스트 / 비고 포함

<br />

## 문서

| 문서                                                   | 내용                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)       | 아키텍처 다이어그램, Sequence Diagram, Request Flow            |
| [`docs/AUTH_FLOW.md`](./docs/AUTH_FLOW.md)             | 소셜 로그인, Firebase Auth, JWT, Axios Interceptor             |
| [`docs/NOTIFICATION.md`](./docs/NOTIFICATION.md)       | SSE, FCM, 알림 권한, 토큰 등록/해제                            |
| [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | Google/Kakao/Naver 로그인, iOS Archive, Node, CocoaPods 문제   |
| [`docs/RELEASE.md`](./docs/RELEASE.md)                 | Play Console, App Signing, versionCode, ProGuard, Firebase SHA |

<br />

## 라이선스

Private
