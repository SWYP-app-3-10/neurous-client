# 기술 개요 (Technical Overview)

> 스택 + 아키텍처 + 주요 플로우 + 트러블슈팅을 한 문서로 요약한 통합 자료입니다. 각 항목의 상세 내용은 하단 "관련 문서" 링크를 참고하세요.

<br />

## 프로젝트 소개

**Neurous(뉴로스)** — 성인 문해력 향상을 위한 모바일 애플리케이션 클라이언트

- **App ID**: `io.neurous.app`
- **Platform**: iOS / Android (React Native CLI)
- **핵심 컨셉**: AI로 재구성한 기사를 읽고 퀴즈를 풀며 문해력을 키우는 학습 앱. 포인트/경험치/캐릭터 성장 시스템으로 학습 동기를 부여한다.

<br />

## 담당 범위

- **버전 1(최초 출시, [SWYP-app-3-10/client](https://github.com/SWYP-app-3-10/client.git))**: 이전 팀원과 공동 개발
- **현재 버전(이 저장소)**: `ios/` 디렉토리를 제외한 전체를 단독으로 개발·유지보수

버전 1과 현재 버전의 소스/문서 파일 159개를 1:1로 전수 비교한 결과는 다음과 같다.

| 구분 | 개수 | 내용 |
| --- | --- | --- |
| 신규 추가 | 36개 | 문의하기·탈퇴 API/훅, 난이도 피드백, FCM 푸시 알림, Mixpanel 연동, 온보딩 인트로 구조 개편, 개발 문서(`docs/` 대부분) 신설 등 |
| 로직 변경 | 19개 | 캐릭터 탭 캐시 무효화 정책 개선, 로그아웃 시 쿼리 캐시 초기화, 보상 지급 직후 프리페치, 토스트/모달 시스템 재구현, 401 레이스 컨디션 수정 등 |
| 구조 유지 | 나머지 | 화면 레이아웃, 소셜 로그인, 검색, 마이페이지 등 버전 1의 구조를 그대로 사용 |

이 문서의 "트러블슈팅 하이라이트"에 정리된 사례들은 모두 위 "로직 변경" 항목에 포함된, 버전 1 이후 직접 진행한 작업이다.

<br />

## 기술 스택

| 분류               | 기술                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| **Core**           | React Native 0.83.1, React 19.2.0, TypeScript 5.8, Node ≥ 20               |
| **Navigation**     | React Navigation 6 (native-stack, bottom-tabs, stack)                      |
| **State (Client)** | Zustand 5                                                                  |
| **State (Server)** | TanStack Query 5                                                           |
| **Networking**     | Axios, `react-native-sse` (SSE)                                            |
| **Storage**        | AsyncStorage                                                               |
| **Firebase**       | App / Auth / Analytics / Messaging(FCM) 23.7                              |
| **Social Login**   | Google, Kakao, Naver, Apple                                                |
| **Ads**            | `react-native-google-mobile-ads` (AdMob)                                  |
| **UI**             | `react-native-svg`, `react-native-linear-gradient`, `lottie-react-native`  |
| **Analytics**      | Firebase Analytics, Mixpanel                                               |
| **Backend**        | Spring Boot (REST API + SSE)                                              |

<br />

## 아키텍처

```
Screen → Hook → Store / Service → API (client.ts) → Backend
```

| 계층 | 역할 |
| --- | --- |
| **Screen** | React Native 화면 컴포넌트. UI 렌더링만 담당 |
| **Hook** | 비즈니스 로직 캡슐화 (TanStack Query 기반 서버 상태 훅 포함) |
| **Store** | Zustand 전역 상태 (point / experience / modal / notification 등, UI 표시용) |
| **Service** | 인증·소셜 로그인·분석 등 도메인 서비스 |
| **API** | Axios 기반 HTTP 클라이언트 + 인터셉터 (JWT 자동 추가/갱신) |

**요청 흐름**: Screen → Hook → API → Interceptor → Backend
**응답 흐름**: Backend → Interceptor → API → Hook → Store → Screen
**에러 처리**: Interceptor에서 401/403 자동 재발급 시도, 실패 시 자동 로그아웃

세부 시퀀스 다이어그램(로그인/로그아웃, 미션 조회, 퀴즈, 출석, 글 읽기 등)은 `docs/ARCHITECTURE.md` 참고.

<br />

## 주요 기능

- 소셜 로그인 4종 (Google / Kakao / Naver / Apple)
- 온보딩 플로우 (난이도 설정, 관심분야 선택)
- AI 재구성 기사 읽기 + 퀴즈 시스템
- 콘텐츠 접근 3분기 (무료 열람 / 포인트 사용 / 광고 시청)
- 포인트·경험치·캐릭터 성장 시스템
- 미션 시스템 (일일 미션, 기사 읽기)
- 출석 보상 (데일리 출석 + 일요일에 월~토 출석을 모두 채운 경우 위클리 출석 합산 지급)
- 알림 시스템 (SSE 포그라운드 + FCM 백그라운드/종료)
- 검색 (카테고리별 기사 검색, 실시간 결과)
- 마이페이지 (프로필, 관심분야, 레벨, 읽은 글 목록)

<br />

## 핵심 플로우 요약

### 인증

소셜 로그인(4종) → Firebase Auth / 각 소셜 SDK 인증 → 백엔드 로그인 API로 JWT 발급 → AsyncStorage 저장. 이후 모든 요청에 Axios 인터셉터가 토큰을 자동 첨부하고, 401/403 응답 시 자동으로 refresh token으로 재발급을 시도한 뒤 원래 요청을 재시도한다. 재발급도 실패하면 자동 로그아웃 처리. (`docs/AUTH_FLOW.md`)

### 콘텐츠 접근 3분기

기사 클릭 시 서버에서 접근 권한을 조회해 무료 열람 / 포인트 차감 / 광고 시청 세 갈래로 분기한다.

### 보상 시스템 — 서버 값 vs 로컬 값

포인트/경험치가 지급되는 경로가 여러 곳(퀴즈, 출석, 광고, 글 읽기)인데, 이 중 **서버 응답값을 실제로 반영하는 건 퀴즈뿐**이다. 출석·글 읽기·광고 보상은 서버 API 호출 없이(또는 호출해도 보상액과 무관하게) 클라이언트에서 로컬 상수를 더하는 방식이라, 유저가 보는 "체감상 지급된 값"과 캐릭터 탭이 서버에서 조회해 보여주는 "실제 값"이 서로 다른 시스템으로 움직인다. 이 구조와 실제로 발생했던 동기화 문제는 아래 트러블슈팅 섹션과 `docs/ARCHITECTURE.md`의 "4. 보상 시스템" 참고.

### 알림

포그라운드에서는 SSE로 실시간 수신, 백그라운드/종료 상태에서는 FCM으로 수신한다. (`docs/NOTIFICATION.md`)

<br />

## 트러블슈팅 하이라이트

전체 목록은 `docs/TROUBLESHOOTING.md`에 있으며, 그중 원인 분석 과정이 잘 드러나는 사례 하나를 아래에 정리한다.

### 캐릭터 탭 데이터가 즉시 반영되지 않던 문제

**증상**: 경험치를 얻은 뒤 캐릭터 탭에 들어가면 출석 기록·진행률 바가 갱신 전 상태로 보이고, 다른 탭에 갔다 와야 정상 반영됨. 신규 가입 직후에는 아예 경험치 0 / 출석기록 없음으로 뜨는 경우도 있었음.

증상은 비슷해 보였지만 원인은 서로 다른 3가지였고, 순서대로 좁혀가며 해결했다.

| # | 원인 | 해결 |
| --- | --- | --- |
| 1 | 경험치 증가 시 캐시 무효화 대상이 실제 화면이 쓰는 쿼리 키(`characterKeys.me()`)를 빠뜨림 → 화면 자체의 focus refetch 한 번에만 의존 | 무효화 범위를 `characterKeys.all`로 확장 + 쿼리에 `refetchOnMount:'always'` 추가 |
| 2 | 1번을 고쳐도 남는 문제 — 서버가 그 순간 아직 보상을 반영 못 한 상태로 응답 (클라이언트 재요청 타이밍과 무관) | 완전 해결은 아니고 완화: 보상 지급 시점마다 캐릭터 탭 진입 전 미리 백그라운드로 조회(`prefetchQuery`, 즉시 1회 + 1.5초 뒤 1회 더) |
| 3 | 로그아웃해도 React Query 캐시(싱글턴)가 안 비워져서, 계정 전환 시 이전 계정 데이터가 잠깐 노출 | 로그아웃/탈퇴 시 `queryClient.clear()` 호출 |

**디버깅 포인트**: 1번과 2번은 겉보기엔 똑같이 "낡은/빈 값이 보이는" 증상이라 처음엔 헷갈리기 쉬웠다. 구분 기준은 "화면에 로딩 스피너가 아니라 실제 숫자(0, 없음 등)가 떴는가"였다 — 이미 서버 응답을 받았다는 뜻이므로 캐시 문제가 아니라 그 순간의 서버 응답 자체가 미반영 상태였다는 신호였다. 이 구분이 있어야 `refetchQueries`(캐시에 이미 등록된 쿼리만 재실행)와 `prefetchQuery`(캐시 유무 무관하게 항상 요청) 중 어떤 걸 써야 하는지도 정확히 판단할 수 있었다.

상세 내용: `docs/ARCHITECTURE.md`의 "4-5. 트러블슈팅: 캐릭터 탭 데이터가 즉시 반영되지 않던 문제", `docs/TROUBLESHOOTING.md`의 관련 항목

### 그 외 주요 사례

- **로그아웃/탈퇴 시 401 레이스 컨디션**: 서버 로그아웃 API를 fire-and-forget으로 쏘고 바로 로컬 토큰을 지우면, 인터셉터가 토큰을 읽기 전에 삭제되어 401 발생 → API 완료를 `await`한 뒤 토큰 삭제하도록 순서 변경
- **프로그래스바 0% 오표시**: `progressPercent || fallback`이 정상적인 0%를 falsy로 취급해 엉뚱한 계산값으로 덮어씀 → `??`로 변경해 0을 유효값으로 인정
- **위클리 출석 판별 UTC/로컬 타임존 불일치**: 날짜 키는 UTC, 요일 판별은 로컬 기준을 섞어 써서 자정~오전 9시(KST) 경계에서 오작동 가능성 → 하나의 `Date` 인스턴스로 통일

전체 사례(소셜 로그인 설정, iOS 빌드, 패키지/패치, 개발 환경 등)는 `docs/TROUBLESHOOTING.md` 참고.

<br />

## 관련 문서

| 문서 | 내용 |
| --- | --- |
| [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) | 아키텍처 다이어그램, Sequence Diagram, Request Flow, 보상 시스템 상세 |
| [`docs/AUTH_FLOW.md`](./AUTH_FLOW.md) | 소셜 로그인, Firebase Auth, JWT, Axios Interceptor |
| [`docs/NOTIFICATION.md`](./NOTIFICATION.md) | SSE, FCM, 알림 권한, 토큰 등록/해제 |
| [`docs/ANALYTICS_EVENTS.md`](./ANALYTICS_EVENTS.md) | Firebase Analytics / Mixpanel 이벤트 전체 목록 |
| [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | 전체 트러블슈팅 사례 |
| [`docs/RELEASE.md`](./RELEASE.md) | Play Console, App Signing, versionCode, ProGuard, Firebase SHA |
