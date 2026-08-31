# 트러블슈팅

## 소셜 로그인

### Google 로그인 DEVELOPER_ERROR (Play Store 배포 빌드)

- **증상**: 로컬 debug 빌드에서는 정상이나, Play Console 내부 테스트 앱에서 Google 로그인 실패
- **원인**: Play App Signing Key의 SHA가 Firebase에 미등록
- **해결**: Play Console에서 App Signing Key의 SHA-1/SHA-256 확인 → Firebase 프로젝트에 등록 → `google-services.json` 재발급

### Google/Kakao 로그인 환경별 키 불일치 (debug 빌드)

- **증상**: Play Store 배포 빌드 대응 후에도 debug 빌드에서 Google `ApiException code 12500`, Kakao `keyHash validation failed` 재현
- **원인**: debug.keystore 기반 SHA/키 해시가 Firebase·Kakao에 미등록
- **해결**: debug keystore의 SHA-1/SHA-256 및 키 해시를 추출해 기존 release/App Signing Key 값과 함께 등록
- **교훈**: 환경별로 keystore가 다르면 각각 등록이 필요함

### App Signing Key 업그레이드 후 Kakao 키 해시 불일치

- **증상**: 앱 서명 키 업그레이드 후 Play Store 배포 APK에서 Kakao 로그인 실패
- **원인**: 서명이 Google 관리 키로 변경되었으나 Kakao에는 기존 Upload Key 해시만 등록되어 있었음
- **해결**: Play Console에 노출된 App Signing Key SHA-1을 Base64 키 해시로 변환 → Kakao Developers에 추가 등록 (Upload Key 해시는 로컬 테스트용으로 유지)

### Naver 로그인 release 빌드 실패

- **증상**: ProGuard 활성화 시 로그인 후 스플래시로 복귀
- **원인**: SDK 콜백 클래스가 난독화되어 정상 동작하지 않음
- **해결**: keep rule 적용 시도 및 임시 비활성화 처리 (ProGuard/R8 이슈 대응)

### Naver SDK Promise 미종료 버그

- **증상**: 로그인 취소 시 Promise가 종료되지 않아 앱이 hang
- **원인**: SDK 자체 결함
- **해결**: `Promise.race` 기반 타임아웃 처리로 우회

### Kakao 로그인 앱 강제 종료

- **증상**: Kakao 로그인 시도 시 앱 크래시
- **원인**: AndroidManifest 메타데이터 중복 선언
- **해결**: 중복 선언 제거

<br />

## 인증

### 탈퇴 후 다른 계정 로그인 시 서버 500

- **증상**: a 계정 탈퇴 후 앱 재설치 없이 b 계정으로 로그인하면 서버 500 반환. 앱 재설치 시에는 정상.
- **원인**: `client.ts` 요청 인터셉터가 `/api/auth/login/:provider`(소셜 로그인 공개 API)에도 `Authorization: Bearer <token>` 헤더를 자동 첨부. 탈퇴 흐름(`withdraw()`) 중 서버 API 호출 실패 시 `AsyncStorage.multiRemove`에 도달하지 못해 이전 계정의 `@auth_token`이 잔류 → 새 계정의 소셜 로그인 API 요청에 stale 토큰이 딸려감 → 서버가 탈퇴된 계정 토큰을 검증하려다 500 반환
- **해결**: `/api/auth/refresh`와 동일하게 `/api/auth/login/` 경로도 Authorization 헤더 제외 대상에 추가
- **수정 파일**: `src/api/client.ts`

### 네이버/구글 로그아웃·탈퇴 시 401 (로그아웃 API, FCM 해제, 알림 설정 전부 실패)

- **증상**: 로그아웃/회원탈퇴 시 `POST /api/auth/logout`, `PATCH /api/notification/token/deactivate`, `PATCH /api/user/notification`이 전부 401 반환. 콘솔 로그상 `[logout] 완료`가 이 API 응답들보다 먼저 출력됨
- **원인**: `authService.logout()`이 위 서버 API들을 `Promise.allSettled(tasks)`로 **await 없이(fire-and-forget)** 실행한 직후 곧바로 `AsyncStorage.multiRemove`로 토큰을 삭제. `client.ts`의 요청 인터셉터는 매 요청마다 `await getAuthToken()`으로 AsyncStorage에서 토큰을 비동기로 다시 읽는데, 이 조회가 끝나기 전에 토큰이 먼저 삭제되면 `Authorization` 헤더 없이 요청이 나가 서버가 401을 반환하는 레이스 컨디션이었음. `withdraw()`의 `unregisterFCMToken` 호출도 동일한 구조로 영향받음
- **해결**: `logoutFromServer` / `unregisterFCMToken` / `updateNotificationStatus`를 `await`로 완료를 기다린 뒤에 `AsyncStorage.multiRemove`를 호출하도록 순서 변경. 백엔드 토큰과 무관한 `signOutSocial`(소셜 SDK 로그아웃)만 계속 fire-and-forget으로 유지
- **수정 파일**: `src/services/authService.ts` (`logout()`, `withdraw()`)
- **관련 문서**: `docs/AUTH_FLOW.md`의 "로그아웃 순서 보장" 절

### 로그아웃 후 다른 계정 로그인 시 이전 계정 캐릭터 정보가 잠깐 보임

- **증상**: 로그아웃하고 다른 계정으로 로그인하면, 캐릭터 탭에 이전 계정의 레벨/경험치/출석 정보가 잠깐 보였다가 잠시 뒤 새 계정 정보로 바뀜
- **원인**: `queryClient`(React Query 캐시)는 앱 전체에서 하나만 쓰는 싱글턴인데, 로그아웃 시 이를 비우는 코드가 없었음. 캐릭터 쿼리 키(`characterKeys.me()` 등)는 유저 ID로 구분되지 않는 고정 키라, 이전 계정 응답이 캐시에 그대로 남아있는 상태에서 새 계정으로 로그인하면 화면이 일단 그 낡은 캐시를 먼저 그려주고, 백그라운드 refetch가 끝난 뒤에야 새 계정 데이터로 바뀜
- **해결**: `authService.ts`의 `logout()`, `withdraw()`에서 로컬 저장값 삭제 직후 `queryClient.clear()` 호출해 React Query 캐시 전체를 비우도록 추가
- **수정 파일**: `src/services/authService.ts` (`logout()`, `withdraw()`)
- **참고**: 캐시를 비우고 나면 다음 로그인 시 캐릭터 쿼리가 처음부터 다시 시작되므로, 신규 유저와 동일하게 `refetchQueries`가 아닌 `prefetchQuery` 기반 프리페치가 필요함 ("캐릭터 탭 첫 진입 시 출석/진행률 미갱신" 항목 참고)

### 이용약관이 신규/기존 유저 구분 없이 로그인 때마다 노출

- **증상**: 이미 가입한 기존 유저도 소셜 로그인 버튼을 누를 때마다 이용약관 동의 화면을 다시 봐야 했음
- **원인**: 소셜 버튼 `onPress`가 실제 로그인(계정 선택 + 서버 로그인)보다 먼저 무조건 `TermsAgreementScreen`으로 이동하는 구조였음. 신규/기존 유저를 가르는 `newUser` 값은 서버 로그인 응답에만 들어있는데, 약관 화면이 로그인보다 먼저 뜨다 보니 애초에 분기할 수 있는 시점이 없었음
- **해결**: 소셜 버튼이 로그인을 바로 실행하도록 순서를 뒤집음. 로그인 성공 후 `newUser === false`(기존 유저)면 약관/온보딩 없이 바로 홈으로, 그 외(신규 유저)만 약관 화면으로 이동. 로그인이 이미 끝난 뒤에 약관 화면을 보여주는 구조가 되면서, 약관 미동의 이탈 시 서버 계정과 클라이언트 상태가 어긋나지 않도록 `TermsAgreementScreen` 언마운트 시 자동 로그아웃을 추가함
- **수정 파일**: `src/screens/auth/LoginScreen.tsx`, `src/screens/onboarding/TermsAgreementScreen.tsx`, `src/navigation/types.ts`
- **관련 문서**: `docs/AUTH_FLOW.md`의 "약관 동의 플로우" 절

<br />

## UI / UX

### 마이페이지 읽은 내역 날짜 오표시

- **증상**: 마이페이지에서 읽은 글이 실제 날짜와 다른 날짜에 표시
- **원인**: 두 가지 독립 오류의 결합
  1. `calculateWeekRange`가 일요일(0)을 주 시작으로 계산 + `convertToYYYYMMDD`의 잘못된 연도 판별 ("현재보다 과거 날짜면 작년") → API에 1년 전 날짜 전달
  2. 서버가 UTC 기준 ISO 문자열로 반환하는 `readAt`을 타임존 변환 없이 파싱 → KST 자정(00:00~08:59)에 읽은 글이 전날로 그룹화
- **해결**: `dayjs/plugin/utc`, `dayjs/plugin/timezone` 도입, 전체 날짜 계산을 KST(Asia/Seoul) 기준 통일, 주 시작을 월요일로 변경
- **수정 파일**: `src/utils/myPageUtils.ts`

### 온보딩 슬라이드 스와이프 시 텍스트 깜빡임

- **증상**: 온보딩 인트로 슬라이드를 텍스트(fade) + 이미지(슬라이딩)으로 레이어 분리 후, 스와이프 이동 시 텍스트 깜빡임
- **원인**: `onMomentumScrollEnd`는 스크롤이 완전히 멈춘 뒤에 호출되므로, 이미지는 이미 다음 슬라이드로 넘어간 상태에서 텍스트 fade 전환이 뒤늦게 발생
- **해결**: `onScroll` + `scrollEventThrottle={16}`으로 실시간 스크롤 offset 추적, 절반 지점(`Math.round(offsetX / width)` 변경 시점)에서 미리 fade 트리거. 다음 버튼(`scrollToIndex`) 이동 시에는 `isProgrammaticScrollRef` 플래그로 `onScroll` 트리거 무시

### 위클리 출석 보상 판별 UTC/로컬 타임존 불일치

- **증상**: 위클리 출석(일요일 데일리 출석 시 보상 합산) 판별 로직 추가 중, 출석 dedup 날짜 키와 요일 판별 기준이 서로 달라 자정~오전 9시(KST) 사이 경계 케이스에서 오작동 가능성 발견
- **원인**: 출석 체크의 "오늘" 날짜 키를 `new Date().toISOString().split('T')[0]`(UTC 기준)으로 만들고, 요일 판별은 `new Date().getDay()`(로컬 기준)로 계산 — 한국(UTC+9)에서는 자정~오전 9시 사이 UTC 날짜와 로컬 날짜가 하루 어긋남
- **해결**: `src/utils/dateUtils.ts`에 `getLocalDateKey()` 추가, 하나의 `Date` 인스턴스로 날짜 키와 요일을 모두 로컬 기준으로 통일해서 계산
- **수정 파일**: `src/utils/dateUtils.ts`, `src/screens/main/MissionScreen.tsx`
- **교훈**: 날짜 문자열 키(`toISOString`)와 요일/시간 계산(`getDay`, `getHours` 등)을 같은 로직 안에서 섞어 쓸 때는 반드시 기준(UTC vs 로컬)을 통일해야 함. 마이페이지 날짜 오표시(위 항목)와 같은 계열의 버그

### 아티클 진입 시 토스트 노출 중 스크롤 차단

- **증상**: 아티클 상세 화면 진입 시 뜨는 토스트(오픈 방식 안내)가 사라질 때까지 본문 스크롤이 되지 않음
- **원인**: 전역 토스트 컴포넌트(`ToastModal`)가 RN `<Modal>`을 사용. `<Modal>`은 별도의 네이티브 오버레이(iOS는 별도 뷰컨트롤러, Android는 별도 윈도우)라서 내부에 `pointerEvents="box-none"`을 줘도 뒤쪽 화면으로 터치/스크롤 제스처가 전달되지 않음
- **해결**: `<Modal>` 제거 → 화면 트리 안에 절대 위치(전체 화면 fill) 오버레이 `View`로 교체. 오버레이/컨테이너는 `pointerEvents="box-none"`, 토스트 박스는 `pointerEvents="none"`으로 설정해 토스트 노출 중에도 뒤 화면 스크롤·터치가 그대로 통과되도록 수정. 노출 시간(`duration`)·등장 애니메이션은 기존과 동일하게 유지하고, 사라지는 fade-out 애니메이션이 끝난 뒤 언마운트되도록 렌더 유지 로직(`isMounted`)을 추가
- **수정 파일**: `src/components/ToastModal.tsx`
- **참고**: `modalStore.showToastModal`을 통해 전역에서 공용으로 쓰이는 컴포넌트라 아티클뿐 아니라 미션/퀴즈/온보딩/마이페이지 토스트 전체에 동일하게 적용됨. `<Modal>` 제거에 따른 부수 효과로 (1) 토스트가 사라질 때 fade-out이 실제로 보임(기존엔 Modal이 즉시 사라져 체감상 애니메이션이 없었음), (2) 토스트가 떠 있는 영역을 탭하면 뒤에 있는 요소가 눌림, (3) Android 뒤로가기 버튼이 토스트를 닫지 않고 화면을 그대로 뒤로 넘김 — 3가지 동작 변화가 있음

### 읽은 글(퀴즈 미응시) 상세 화면에 동작하지 않는 "퀴즈 보기" 버튼 노출

- **증상**: 마이페이지 → 읽은 글 목록에서, 퀴즈를 풀지 않고 읽기만 한 글의 상세 화면에도 하단에 "퀴즈 보기" 플로팅 버튼이 표시됨. 눌러도 아무 동작 없음
- **원인**: `ReadArticleDetailScreen`의 하단 플로팅 버튼(`fixedButtonContainer`)이 퀴즈 존재 여부와 무관하게 항상 렌더링됨. 퀴즈 섹션(`QuizFeedback`)은 `quiz`가 있을 때만 렌더링되므로, 퀴즈를 안 푼 글은 `quizSectionRef`가 비어 있어 버튼을 눌러도 `useScrollToQuiz`의 `scrollToQuiz`가 조기 반환되어 아무 일도 일어나지 않음
- **해결**: 하단 플로팅 버튼 컨테이너를 퀴즈 섹션과 동일하게 `{quiz && (...)}` 조건으로 감싸 퀴즈를 푼 글에서만 노출. 버튼이 없을 때는 `ScrollView`의 하단 패딩도 버튼 높이만큼 빼서 불필요한 공백이 남지 않도록 조정
- **수정 파일**: `src/screens/common/ReadArticleDetailScreen.tsx`

### 캐릭터 화면 진행률 0%일 때 프로그래스바 오표시

- **증상**: 레벨업 직후 등 다음 레벨 진행률이 정확히 0%일 때, 캐릭터 화면 프로그래스바가 실제 진행 상황과 맞지 않게 채워짐
- **원인**: `progressPercentageValue` 계산에 `progressPercent || fallback`을 사용. `||`는 0을 falsy로 취급해서, 서버가 내려준 정상적인 0%(`progressPercent`)를 무시하고 `Math.round((currentExp / nextLevelExp) * 100)` fallback 계산식으로 덮어씀. 이 fallback은 계정 전체 누적 경험치(`currentExp`)와 레벨 기준 누적 경험치(`nextLevelExp`)를 그대로 나눈 값이라 "현재 레벨 내 진행률"과는 의미가 다름 → 0%여야 할 때 엉뚱하게 더 채워진 값이 표시됨
- **해결**: `||` → `??`로 변경해 0을 유효한 값으로 인정, 서버 `progressPercent`를 항상 신뢰하도록 수정 (fallback은 값이 정말 없을 때만 대비용으로 유지). 겸사겸사 같은 파일에 남아있던 개발용 `console.log`/`__DEV__` 디버그 로그 제거
- **수정 파일**: `src/screens/main/CharacterScreen.tsx`

### 캐릭터 탭 첫 진입 시 출석/진행률 미갱신

- **증상**: 퀴즈/아티클 등으로 경험치가 오른 뒤 캐릭터 탭에 처음 들어가면 출석 기록·진행률 바가 갱신 전 상태로 보임. 다른 탭에 갔다가 캐릭터 탭으로 돌아오면 그제서야 정상 반영됨
- **원인**: `RootNavigator`가 로컬 경험치(`experience`) 증가를 감지해 캐릭터 쿼리를 무효화(`invalidateQueries`)할 때 대상이 `characterKeys.data()`뿐이었음. 정작 출석·진행률이 담긴 `characterKeys.me()` 캐시는 앱 전체 어디서도 무효화되지 않아, `CharacterScreen`의 `useFocusEffect` 강제 refetch 한 번에만 전적으로 의존하는 구조 → 마운트 타이밍과 겹치면 첫 포커스에서 최신 데이터를 받아오지 못함
- **해결**: `RootNavigator`의 무효화 대상을 `characterKeys.data()` → `characterKeys.all`로 확장(`data`/`me`/`reward` 전체 무효화). 추가로 `useCharacterMe`/`useCharacterData`에 `refetchOnMount: 'always'`를 붙여(`useMissions`와 동일한 패턴) 화면 마운트 시 캐시 신선도와 무관하게 항상 서버 재조회하도록 이중 안전장치를 둠
- **수정 파일**: `src/navigation/RootNavigator.tsx`, `src/hooks/useCharacter.ts`
- **후속 조치 (신규 가입 등 서버 반영 자체가 늦는 케이스 대비)**: 위 조치는 "캐릭터 탭에 들어갈 때마다 다시 요청"하는 것까진 보장하지만, 그 요청 시점에 서버가 아직 보상을 반영 못 했으면 여전히 낡은 값을 받아옴. 이를 완화하기 위해 포인트/경험치 지급 직후(일일 출석 체크·글 읽기 보상·퀴즈 보상) 캐릭터 탭 진입 전에 미리 백그라운드로 조회해두는 `prefetchCharacterAfterReward()`를 추가. 캐시 존재 여부와 무관하게 항상 요청이 나가야 해서 `refetchQueries`가 아닌 `prefetchQuery`를 사용했고, 서버 반영 지연 대비 즉시 1회 + 1.5초 뒤 1회 더 요청함
- **후속 조치 수정 파일**: `src/hooks/useCharacter.ts`(`prefetchCharacterAfterReward` 추가), `src/screens/main/MissionScreen.tsx`, `src/screens/common/ArticleDetailScreen.tsx`, `src/screens/common/QuizScreen.tsx`
- **2026-08-31 추가 발견**: 위 prefetch를 적용한 뒤에도 보상 직후 캐릭터 탭에 들어가면 출석·포인트가 갱신되지 않고, 다른 탭에 다녀와야 반영되는 현상이 남아 있었음. 즉시 요청이 1.5초 이상 진행되면 고정 타이머로 시작한 후속 prefetch와 캐릭터 탭 focus refetch가 동일 query key의 진행 중 요청으로 합쳐져, 서버 반영 전 첫 응답만 공유되고 실제 두 번째 네트워크 요청은 실행되지 않는 것이 원인이었음
- **2026-08-31 해결**: 즉시 실행하는 `me()`/`data()` prefetch를 `Promise.all`로 완료까지 기다린 뒤, 그 완료 시점부터 1.5초 후 두 번째 prefetch를 시작하도록 변경. 첫 요청 속도와 무관하게 후속 요청이 독립적으로 실행되고, 캐릭터 화면이 이미 활성화돼 있어도 React Query 캐시 갱신이 화면에 반영됨
- **관련 PR**: `fix(character, auth, article): 캐릭터 갱신 및 재가입·카테고리 오류 수정` (#125)

### 탈퇴 후 재가입 시 첫 난이도 평가 팝업 미노출

- **증상**: 같은 기기에서 탈퇴 후 재가입하고 첫 글의 퀴즈에 진입해도 난이도 평가 팝업이 나타나지 않음
- **원인**: 하루 한 번 노출을 제어하는 `@difficulty_submit_date`와 누적 제안 분석용 `@difficulty_feedback_history`가 계정 생명주기와 분리된 기기 전역 AsyncStorage 값이라, 이전 계정의 기록이 남으면 새 계정도 이미 평가한 것으로 판단할 수 있었음
- **해결**: 로그아웃·탈퇴 시 두 키를 모두 삭제하고, 서버가 `newUser`로 판정한 신규 가입 로그인에서도 두 값을 다시 초기화해 이전 계정 상태가 재가입 계정으로 넘어가지 않도록 이중 방어
- **수정 파일**: `src/services/authService.ts`, `src/screens/auth/LoginScreen.tsx`, `src/hooks/useDifficultySubmit.ts`

### 난이도 제안이 뜬 평가가 서버에 제출되지 않음

- **증상**: 제안 조건을 충족하면 난이도 변경 제안 모달은 표시되지만, 같은 날 다른 글에서도 평가 모달이 다시 나타날 수 있고 해당 글의 평가가 서버에 남지 않음
- **원인**: 기존 순서가 `로컬 이력 저장 → 제안 분석 → 조건 충족 시 return → 서버 제출`이라 제안 분기에서 `submitDifficultyToServer()`와 `@difficulty_submit_date` 저장에 도달하지 못함. QA 임계값이 낮을 때는 제안 모달 자체가 보여 정상처럼 보였고, 운영 임계값(쉬움 13/어려움 8)에서는 분기 진입 빈도가 낮아 잠재 오류가 늦게 발견됨
- **해결**: `서버 제출 성공 → 오늘 날짜 저장 → 로컬 이력 저장 → 제안 분석`으로 순서를 변경. 서버 실패 시 로컬 이력과 날짜를 저장하지 않고 평가 모달에서 재선택 가능하도록 처리
- **추가 방어**: 제안 수락 API가 `boolean`을 반환하게 해 성공한 경우에만 모달 종료·이벤트·토스트 실행. 제안 모달의 배경 종료와 버튼 연타를 차단
- **수정 파일**: `src/screens/common/QuizScreen.tsx`, `src/hooks/useDifficultySubmit.ts`, `src/hooks/useDifficultySuggestion.ts`, `src/components/LevelSuggestionModal.tsx`
- **상세 문서**: `docs/DIFFICULTY_FLOW.md`

### IT 카테고리가 `IT/`로 잘려 표시됨

- **증상**: 일부 아티클 카드의 카테고리 배지가 정식 명칭 `IT/과학` 대신 `IT/` 또는 `IT`로 표시됨
- **원인**: 서버 응답의 간헐적인 카테고리 표기 편차를 `ArticleCard`가 별도 보정 없이 그대로 렌더링함
- **해결**: `normalizeCategoryName()` 경계를 추가해 `IT`, `IT/`, 공백이 섞인 `IT / 과학`을 모두 `IT/과학`으로 정규화하고, 다른 카테고리는 앞뒤 공백만 제거해 유지. 관련 단위 테스트 6건 추가
- **수정 파일**: `src/utils/categoryName.ts`, `src/components/ArticleCard.tsx`, `src/utils/__tests__/categoryName.test.ts`

### 로그인 화면 문구를 코드에서 수정해도 반영되지 않음

- **증상**: `LoginScreen`의 태그라인 문구를 코드에서 수정해도 실제 기기에는 계속 이전 문구가 표시됨. Metro 캐시 초기화(`--reset-cache`), 앱 완전 삭제 후 재설치, `gradlew clean` 포함 완전 클린 빌드까지 해도 재현됨
- **원인**: 서로 다른 두 문제가 겹쳐 있었음
  1. 화면 배경으로 쓰이던 `login.png`가 로고 워드마크와 태그라인 문구를 하나로 합쳐 래스터화한 이미지였음. 화면에 실제로 보이는 문구는 이 이미지 픽셀에 박혀있던 옛 문구였고, 코드 수정과는 무관하게 항상 그대로 표시됨
  2. 별도로 렌더링되던 라이브 `<Text>` 태그라인은 이미 새 문구로 정상 반영되어 있었지만, `logoText` 스타일의 글자색이 배경색과 동일한 `COLORS.puple.main`으로 지정되어 있어 보라 배경 위 보라 글씨가 되어 애초에 눈에 보이지 않는 상태였음
- **해결**: 배경 PNG에서 로고 워드마크만 분리한 투명배경 이미지(`logo_Neurous.png`)로 교체하고, 태그라인은 라이브 `<Text>` 컴포넌트만으로 렌더링. 텍스트 색상을 흰색(`COLORS.white`)으로 수정
- **수정 파일**: `src/screens/auth/LoginScreen.tsx`, `src/icons/commonIcons/simpleImages.tsx`
- **교훈**: 문구 수정이 반영되지 않을 때 캐시/빌드 문제로 단정하기 전에, 배경·썸네일 이미지에 텍스트가 래스터로 박혀있지 않은지부터 확인할 것. 또한 "텍스트가 안 보이는" 증상은 렌더링 자체가 안 되는 경우와, 렌더링은 되지만 색상이 배경과 같아 안 보이는 경우를 구분해서 확인해야 함

### 문의하기 화면에서 키보드가 입력 필드를 가림

- **증상**: 마이페이지 > 설정 > 문의하기 화면에서 텍스트 입력 시 키보드가 화면을 덮어도 스크롤되지 않아 입력 중인 글자를 볼 수 없음 (안드로이드)
- **원인**: `KeyboardAvoidingView`는 이미 적용되어 있었으나 `behavior`가 iOS는 `'padding'`으로 지정된 반면 안드로이드는 `undefined`로 되어있어 안드로이드에서는 사실상 아무 동작도 하지 않았음
- **해결**: 안드로이드에도 `behavior`를 `'height'`로 지정
- **수정 파일**: `src/screens/myPage/InquiryScreen.tsx`
- **참고**: 프로젝트 내 `KeyboardAvoidingView`를 사용하는 화면은 현재 이 화면이 유일함. 추후 입력 화면 추가 시 `behavior: Platform.OS === 'ios' ? 'padding' : 'height'` 패턴을 기본으로 사용할 것

### 문의하기 화면 이메일 미입력·오입력 시에도 전달하기 버튼 활성화

- **증상**: 마이페이지 > 설정 > 문의하기 화면에서 이메일을 입력하지 않거나 잘못된 형식으로 입력해도 전달하기 버튼이 활성화됨
- **원인**: `isSubmitEnabled`가 문의 내용 길이(`content.trim().length >= 10`)만 검사하고 이메일 값은 전혀 검증하지 않았음
- **해결**: 이메일 도메인 형식을 검사하는 `getEmailDomainError()` 추가(`@` 누락/중복, 로컬·도메인파트 누락, 도메인 `.` 누락/시작·끝/연속, 허용되지 않는 문자, 최상위 도메인 2자 미만, 전체 254자 초과) 후 `isSubmitEnabled` 조건에 이메일 유효성 통과 여부 포함. 오류 시 입력창 테두리 색상과 케이스별 안내 메시지도 함께 노출
- **수정 파일**: `src/screens/myPage/InquiryScreen.tsx`

<br />

## 보상 / 전역 상태 관리

### 포인트·레벨업 통합 모달 개편 과정에서 보상 상태 관리 구조의 한계 발견

#### 상황

기존 앱에서는 포인트·경험치 획득 모달과 레벨업 모달이 서로 다른 흐름으로 동작했다. 보상 모달은 이번에 받은 포인트와 경험치를 안내하고, 레벨업 모달은 별도의 상태와 UI를 통해 새로운 레벨을 안내했다.

UI 개편 과정에서 **포인트·경험치를 받은 결과 레벨업까지 발생했다면 두 결과를 분리하지 않고, 기존 보상 모달에 레벨업 정보를 결합한 하나의 포인트-레벨업 모달로 보여주기**로 요구사항이 변경됐다.

사용자가 한 번의 행동으로 얻게 된 결과는 실제로 다음과 같이 하나의 사건이기 때문이다.

```text
퀴즈·출석·글 읽기 완료
→ 포인트·경험치 지급
→ 누적 경험치 증가
→ 레벨 기준 통과
→ 레벨업
```

따라서 통합 모달에는 다음 정보가 함께 필요해졌다.

- 이번에 받은 포인트와 경험치
- 보상이 발생한 이유(출석·글 읽기·퀴즈 등)
- 레벨업 발생 여부
- 새로운 레벨과 캐릭터 정보
- 발생 화면에 맞는 다음 행동 버튼

#### 기존 구조

요구사항을 적용하기 전에는 관련 정보가 하나의 보상 결과로 관리되지 않았다.

- `pointStore`와 `experienceStore`가 포인트·경험치 로컬 합계를 각각 누적
- `levelUpStore`가 퀴즈 응답의 레벨업 정보를 별도로 임시 보관
- `modalStore`는 현재 표시할 모달 하나만 보관
- 출석·글 읽기·퀴즈 화면이 각자 레벨업 여부와 모달 콘텐츠·버튼을 조립
- 퀴즈는 서버 응답으로 레벨업을 확인하지만, 출석과 글 읽기는 프론트에서 레벨업 여부를 추정

이 구조에서도 각각의 모달은 표시할 수 있었지만, “이번 보상과 그 결과 발생한 레벨업”을 하나의 데이터로 다루기 어려웠다. 화면마다 같은 판단과 UI 조립 코드가 반복됐고, 어느 값을 기준으로 모달을 구성해야 하는지도 경로마다 달랐다.

#### 분석 과정

단순히 두 모달의 UI를 합치기 전에 실제 보상 데이터가 어디에서 만들어지고 소비되는지 먼저 추적했다.

1. 퀴즈 제출, 일일·위클리 출석, 글 읽기 완료, 광고 시청의 보상 발생 지점을 각각 확인
2. 각 경로가 서버 응답값과 로컬 상수 중 무엇을 사용하는지 확인
3. `pointStore`, `experienceStore`, `levelUpStore`, `modalStore`의 읽기·쓰기 위치 검색
4. 캐릭터 화면과 콘텐츠 구매 화면이 실제로 표시·검증하는 포인트의 출처 확인
5. 버튼 연타, 화면 재진입, AsyncStorage 키 등 기존 중복 방지 범위 확인

그 결과 UI 결합만의 문제가 아니라, 보상 데이터의 책임과 진실 공급원이 여러 곳에 나뉘어 있다는 점을 발견했다.

#### 발견한 문제

1. **보상과 레벨업 정보가 분리됨**
   - 포인트·경험치는 로컬 store에 누적되고 레벨업 정보는 별도 `levelUpStore`에 저장됨
   - 하나의 보상 결과가 여러 상태로 분리돼 서로 다른 시점에 갱신될 수 있음

2. **보상 경로마다 진실 공급원이 다름**
   - 퀴즈는 서버가 실제 지급량과 레벨업 정보를 반환
   - 출석·글 읽기·광고는 일부 보상을 로컬에서만 증가시킴
   - 출석·글 읽기의 레벨업 여부는 서버 현재 경험치에 로컬 보상을 더해 임시로 추정

3. **포인트 잔액이 이중으로 존재함**
   - 캐릭터 화면과 콘텐츠 접근 판단은 서버의 `currentPoint`/`currentPoints`를 우선 사용
   - `pointStore`는 서버값으로 초기화하거나 구매 차감을 반영하지 않고 증가만 함
   - 일반 화면에서는 서버값이 정상적으로 보여도 예외적인 fallback 경로에서는 오래된 로컬 값이 사용될 수 있음

4. **전역 모달이지만 보상 순차 처리는 보장하지 않음**
   - `modalStore`는 `modalState` 하나만 보관하므로 새 모달 호출이 기존 모달을 대체함
   - 여러 보상이 연속 발생할 경우 앞의 보상 안내가 사라질 가능성이 있음

5. **중복 방지 범위가 경로마다 다름**
   - 화면 ref와 AsyncStorage로 버튼 연타·같은 기기의 재지급은 일부 방지
   - 네트워크 재시도, 앱 재설치, 다른 기기, 서버 처리 후 응답 유실까지는 프론트만으로 보장할 수 없음

#### 이번 작업에서 내린 결정

서버 계약이 확정되지 않은 상태에서 포인트 store와 보상 지급 로직까지 한 번에 바꾸면, 실제 서버 동작과 다른 가정을 코드에 고정할 위험이 있었다. 따라서 이번 작업은 다음 두 단계로 범위를 나눴다.

**이번에 적용한 범위**

- 공용 `RewardModal`에 일반 보상용 `compact`와 레벨업·글 읽기용 `split` 레이아웃 추가
- 포인트·경험치 단위와 시각적 구분을 공용 컴포넌트에서 처리
- 고정 버튼 대신 `primaryAction`·`secondaryAction`·`dismissAction`으로 화면별 동작 전달
- 출석의 구형 보상 모달을 공용 `RewardModal`로 교체
- 퀴즈·출석·글 읽기의 레벨업/비레벨업 UI를 동일한 공용 모달 계열로 통일
- 현재 서버 연동이 없는 출석·글 읽기의 기존 보상 처리와 레벨업 추정은 동작 보존

**서버 협의 후 적용할 범위**

- 출석·글 읽기·광고 보상을 서버에서 실제 지급하도록 API 계약 확정
- 모든 지급·차감 응답에 실제 지급량과 처리 후 최신 포인트·경험치·레벨 포함
- 서버가 레벨업 여부를 최종 판정해 공통 보상 결과로 반환
- 서버의 기존 중복 지급 방지 방식 확인 후 요청 ID 기반 멱등성 보완 여부 결정
- 공통 응답이 확정된 뒤 `pointStore`·`experienceStore`의 로컬 누적 제거 여부 결정
- `levelUpStore`를 별도로 유지하지 않고 보상 이벤트의 `levelUp` 정보로 통합
- 여러 보상을 순차 표시할 전역 `rewardQueueStore`와 `RewardPresenter` 도입

#### 왜 서버 협의 전에는 store를 바로 제거하지 않았는가

현재 주요 포인트 화면은 이미 서버 잔액을 사용하지만, 출석·글 읽기·광고 보상은 서버 지급 API가 없거나 응답 정보가 충분하지 않다. 이 상태에서 로컬 store를 먼저 제거하면 해당 보상의 화면 반영 자체가 사라질 수 있고, 반대로 로컬 값을 서버값처럼 계속 사용하면 잔액 불일치가 유지된다.

또한 클라이언트 저장소만으로는 백엔드가 퀴즈 중복 제출이나 콘텐츠 중복 구매를 DB 제약조건으로 방지하는지 확인할 수 없다. 따라서 서버의 현재 구현과 변경 가능 범위를 확인한 뒤 최종 구조를 결정하는 것이 안전하다고 판단했다.

#### 결과 및 현재 상태

- 사용자 관점에서는 보상과 레벨업이 하나의 모달 흐름으로 표현되도록 UI를 통일함
- 출석·글 읽기·퀴즈 상황에 따라 필요한 버튼 구성을 유지함
- 공용 모달의 레이아웃과 액션 인터페이스를 정리해 화면별 UI 중복을 줄임
- 서버·로컬 잔액 불일치, 레벨업 추정, 전역 보상 큐는 해결 완료로 표현하지 않고 후속 협의 범위로 명시함

#### 배운 점

- 화면 두 개를 합치는 UI 요구사항도 실제로는 상태의 소유권과 API 응답 계약을 다시 검토해야 하는 데이터 흐름 문제로 확장될 수 있음
- “전역 store를 사용한다”는 것과 “하나의 일관된 전역 상태를 가진다”는 것은 다름. 서로 다른 store에 같은 사건의 일부를 나누어 보관하면 상태 간 순서와 일관성을 별도로 보장해야 함
- 서버 데이터와 로컬 데이터를 함께 사용할 때는 어느 값이 진실 공급원인지 화면별로 명확히 해야 함
- 클라이언트의 버튼 연타 방지는 사용자 입력 중복을 줄이는 장치이고, 서버의 멱등성은 장애와 재시도에서도 데이터 중복을 막는 장치이므로 서로 대체할 수 없음
- 백엔드 계약이 정해지지 않은 상황에서는 임시 동작과 최종 구조를 구분하고, 확인되지 않은 서버 동작을 가정해 대규모 리팩터링하지 않는 것이 안전함

#### 관련 파일 및 문서

- `src/components/RewardModal.tsx`
- `src/store/modalStore.ts`
- `src/store/pointStore.ts`
- `src/store/experienceStore.ts`
- `src/store/levelUpStore.ts`
- `src/screens/common/QuizScreen.tsx`
- `src/screens/common/ArticleDetailScreen.tsx`
- `src/screens/main/MissionScreen.tsx`
- `docs/LEVEL_UP_FLOW.md`
- `docs/POINT_FLOW.md`
- `docs/REWARD_SYSTEM_DESIGN.md`

### 여러 보상 모달이 연달아 발생하면 앞의 보상이 사라질 수 있음

- **증상**: 출석·글 읽기·퀴즈·레벨업처럼 둘 이상의 보상이 짧은 간격으로 발생하면 먼저 띄운 보상 모달이 닫히기 전에 다음 모달로 교체되거나, 일부 보상이 사용자에게 노출되지 않을 수 있음
- **원인**: 현재 `modalStore`는 하나의 `modalState`만 보관함. `showRewardModal()`을 다시 호출하면 기존 상태를 새 상태로 통째로 대체하므로, 모달을 전역에서 렌더링한다는 사실만으로는 순차 표시가 보장되지 않음. 또한 화면이 `ReactNode`와 콜백을 직접 조립해 store에 넣기 때문에 보상 데이터와 UI·네비게이션 책임이 섞여 있음
- **현재 조치**: `RewardModal`을 `compact`(일반 포인트·경험치)와 `split`(레벨업·글 읽기) 레이아웃으로 통일하고, 버튼을 상황별 `primaryAction`/`secondaryAction`/`dismissAction`으로 구성해 화면별 UI 불일치를 줄임. 단, 이는 표시 형태를 통일한 것이며 동시 보상의 유실 가능성까지 해결한 것은 아님
- **권장 해결**: 일반 알림용 `modalStore`와 별도로 `rewardQueueStore`를 두고, 서버가 확정한 보상 이벤트를 배열 뒤에 `enqueue`함. 루트의 `RewardPresenter`는 `queue[0]` 하나만 표시하고 사용자가 완료하면 제거한 뒤 다음 항목을 표시함. 동일 `rewardTransactionId`는 중복 등록하지 않음
- **수정 파일**: `src/components/RewardModal.tsx`, `src/store/modalStore.ts`, `src/navigation/RootNavigator.tsx`, `src/screens/common/ArticleDetailScreen.tsx`, `src/screens/common/QuizScreen.tsx`, `src/screens/main/MissionScreen.tsx`
- **관련 문서**: `docs/REWARD_SYSTEM_DESIGN.md`

### 포인트·경험치 로컬 store와 서버 잔액이 서로 다름

- **증상**: 보상 직후 로컬에서는 포인트·경험치가 증가했지만 캐릭터 화면이나 콘텐츠 구매 화면의 서버 잔액에는 반영되지 않거나, 포인트 구매 후 로컬 값에는 차감이 반영되지 않을 수 있음
- **원인**: `pointStore`와 `experienceStore`는 `addPoints()`/`addExperience()`로 로컬 합계를 누적하지만 서버 값으로 초기화·보정하는 호출이 사실상 없음. 퀴즈만 서버가 보상을 지급하고, 출석·글 읽기·광고는 보상 지급 API 없이 로컬 값만 올림. 반대로 콘텐츠 포인트 구매는 서버에서 차감하지만 응답에 최신 잔액이 없어 로컬 store를 정확하게 갱신할 수 없음
- **현재 조치**: 캐릭터 등 주요 화면은 서버 조회값을 사용하고 보상 뒤 관련 React Query 캐시를 다시 조회함. 이는 화면에 오래된 값이 남는 시간을 줄이는 우회책이며, 서버에 존재하지 않는 로컬 보상을 동기화해주는 것은 아님
- **권장 해결**: 포인트·경험치·레벨을 서버의 단일 진실 공급원으로 정함. 모든 지급·차감 API가 실제 지급량과 지급 후 `currentPoint`, `currentExp`, `levelCode`를 반환하고, 클라이언트는 로컬 합계를 더하지 않고 이 값으로 React Query 캐시를 대입함. optimistic update가 필요하면 실패 rollback과 성공 시 서버값 재대입을 함께 구현함
- **관련 파일**: `src/store/pointStore.ts`, `src/store/experienceStore.ts`, `src/hooks/useCharacter.ts`, `src/hooks/useArticleNavigation.ts`
- **관련 문서**: `docs/POINT_FLOW.md`, `docs/LEVEL_UP_FLOW.md`, `docs/REWARD_SYSTEM_DESIGN.md`

### 출석·글 읽기 레벨업 모달이 서버의 실제 레벨업과 다를 수 있음

- **증상**: 출석이나 글 읽기 보상에서 레벨업 모달이 떴지만 서버 레벨은 오르지 않거나, 반대로 서버 레벨이 올랐는데 레벨업 모달이 표시되지 않을 수 있음
- **원인**: 퀴즈는 서버 응답의 `userLevelInformation`으로 레벨업을 확정하지만, 출석·글 읽기는 보상 지급 API가 없어 클라이언트가 `서버 현재 경험치 + 로컬 지급 예정 경험치`로 다음 레벨을 추정함. 이 계산은 서버에 경험치를 실제 반영하지 않으며, 다른 기기 동시 사용·보너스·서버 정책 변경에도 취약함
- **현재 조치**: 서버 레벨 기준표를 조회해 가능한 범위에서 동일한 알고리즘으로 추정하고, 실패하면 일반 보상 모달로 처리함. 정식 서버 연동 전의 임시 조치이므로 서버 레벨업 확정으로 간주하면 안 됨
- **권장 해결**: 출석·글 읽기 완료 API가 보상 지급과 레벨 계산을 하나의 서버 트랜잭션으로 처리하고 `levelUp` 정보를 공통 보상 응답에 포함함. 이후 `levelUpStore`와 화면별 레벨업 추정 코드를 제거하고 `RewardEvent.levelUp`만 사용함
- **관련 파일**: `src/store/levelUpStore.ts`, `src/screens/common/QuizScreen.tsx`, `src/screens/common/ArticleDetailScreen.tsx`, `src/screens/main/MissionScreen.tsx`
- **관련 문서**: `docs/LEVEL_UP_FLOW.md`, `docs/REWARD_SYSTEM_DESIGN.md`

### 재시도·중복 탭으로 보상이 중복 지급되거나 모달이 다시 뜰 수 있음

- **증상**: 네트워크 재시도, 완료 버튼 연타, 화면 재진입 또는 앱 재실행 시 같은 보상이 두 번 지급되거나 같은 모달이 반복 노출될 가능성이 있음
- **원인**: 클라이언트의 AsyncStorage 키나 화면 ref만으로 중복을 막으면 앱 재설치·다른 기기·요청 타임아웃 후 재시도까지 포괄할 수 없음. 또한 서버 지급 거래와 모달 확인 여부를 식별하는 공통 ID가 없음
- **권장 해결**: 지급 요청에 `Idempotency-Key` 또는 `requestId`를 보내고, 서버는 같은 키에 동일한 `rewardTransactionId`와 결과를 반환함. 클라이언트 보상 큐는 이 ID를 기준으로 중복 enqueue를 막음. 앱 종료 뒤 미확인 보상 복구가 필요하면 서버에 pending 조회와 ack API를 추가함
- **관련 문서**: `docs/REWARD_SYSTEM_DESIGN.md`의 공통 `RewardTransactionResponse`, 권장 엔드포인트 절

<br />

## 광고 (AdMob)

### 배포 빌드에서만 리워드 광고 로드 실패 ("광고를 불러올 수 없습니다. 네트워크 연결을 확인해주세요")

- **증상**: 개발/내부테스트 빌드(테스트 광고 사용)에서는 정상이나, 실제 배포(release) 빌드에서만 리워드 광고 진입 시 항상 "광고를 불러올 수 없습니다. 네트워크 연결을 확인해주세요" 에러
- **원인**: 이전 팀원이 설정해둔 `src/config/api.ts`의 `ADMOB_REWARDED_ANDROID` 값이 광고 단위(Ad Unit) ID가 아니라 앱(App) ID였음(`~` 구분자 — `AndroidManifest.xml`의 `APPLICATION_ID`와 동일한 문자열이 그대로 들어가 있었음). `ADMOB_REWARDED_IOS`와 `ios/Neurous/Info.plist`의 `GADApplicationIdentifier`도 실제 사용 중인 AdMob 계정과 다른 계정 값으로 설정되어 있었음. `AdLoadingScreen.tsx`가 `useRewardedAd`의 `error`를 원인 구분 없이 동일한 "네트워크 연결 확인" 문구로 알림 처리하고 있어, 실제 원인(잘못된 광고 단위 ID)이 에러 메시지만으로는 드러나지 않았음
- **해결**: AdMob 콘솔에서 실제 계정(`ca-app-pub-2195740935444660`)의 Android/iOS 리워드 광고 단위 ID와 앱 ID를 재확인하여 아래와 같이 교체
  - `src/config/api.ts`: `ADMOB_REWARDED_ANDROID`, `ADMOB_REWARDED_IOS`를 올바른 광고 단위 ID(`/` 구분자)로 교체, 앱 ID와 혼동 방지 주석 추가
  - `ios/Neurous/Info.plist`: `GADApplicationIdentifier`를 실제 계정의 앱 ID로 교체
  - `app.json`: `react-native-google-mobile-ads.android_app_id` / `ios_app_id`도 동일 계정으로 동기화
- **수정 파일**: `src/config/api.ts`, `ios/Neurous/Info.plist`, `app.json`
- **참고**: 원래 설정은 이전 팀원이 작업한 것으로, 이번에 증상을 재현·분석해 원인(앱 ID/광고 단위 ID 혼동, 계정 불일치)을 특정하고 수정함
- **교훈**: AdMob 앱 ID(`~` 구분자)와 광고 단위 ID(`/` 구분자)는 형식이 비슷해 혼동하기 쉬우므로, 값을 하드코딩할 때 주석으로 구분자 규칙을 명시해둘 것

<br />

## iOS 빌드 / 설정

### 신규 환경 Archive 빌드 실패 (GoogleService-Info.plist 누락)

- **증상**: `Build input file cannot be found: GoogleService-Info.plist`
- **원인**: Firebase Console에서 재발급한 파일을 Finder에만 복사하고, Xcode 프로젝트에 Add Files + Target Membership 체크를 하지 않으면 참조가 끊김
- **해결**: Xcode에서 Add Files to Project → Target Membership 체크 확인

### iOS ATS (App Transport Security) 설정

- **증상**: HTTP 백엔드 API 호출 시 Network Error
- **원인**: iOS는 HTTP 트래픽을 기본 차단
- **해결**: `Info.plist`의 `NSExceptionDomains`에 서버 도메인 설정 추가

### CocoaPods 설치 무한 대기

- **증상**: `pod install` 중 특정 라이브러리(PromisesObjC)에서 CPU 0%로 멈춤
- **원인**: Git LFS 미설치
- **해결**: Git LFS 설치 후 캐시 삭제 및 재설치

<br />

## 패키지 / 패치

### lottie-react-native 패치 파일에 빌드 산출물이 섞여 patch-package 실패

- **증상**: `npm install` 시 `patch-package` 단계에서 `lottie-react-native` 패치 적용 실패 (`Failed to apply patch`). 재생성(`npx patch-package lottie-react-native`) 시도 시 `Filename too long` 에러로 실패
- **원인**: 과거 안드로이드 빌드가 완료된 상태의 `node_modules/lottie-react-native`에서 패치를 생성해서, `android/build/`, `android/.gradle/` 같은 빌드 캐시 폴더(수백 개의 `.dex`/`.class` 바이너리)까지 패치 diff에 통째로 포함됨. Windows 경로 길이 제한(260자)에 걸려 재생성도 실패
- **해결**:
  1. `node_modules/lottie-react-native/android/build`, `android/.gradle` 폴더를 삭제 (gradle이 빌드 시 자동 재생성하므로 안전)
  2. `npx patch-package lottie-react-native`로 패치 재생성 — 실제 소스 수정 2개 파일(`LottieAnimationViewManagerImpl.kt`, `LottieAnimationViewPropertyManager.kt`)만 남는지 diff 개수로 확인 (`Select-String -Path patches\lottie-react-native+7.3.5.patch -Pattern "^diff --git" | Measure-Object` 등으로 카운트, 정상은 2개)
- **교훈**: 안드로이드/iOS 빌드를 한 번이라도 실행한 `node_modules`에서 `patch-package <패키지명>`을 실행하기 전에는 해당 패키지의 `android/build`, `android/.gradle`, `ios/build` 등 빌드 산출물 폴더를 먼저 정리할 것

### Mixpanel 추가 후 안드로이드 빌드 시 Maven/Gradle 저장소 연결 실패

- **증상**: `gradlew.bat app:installDebug` 실행 시 `:mixpanel-react-native:compileDebugJavaWithJavac`에서 `kotlinx-coroutines-core-jvm` 등의 의존성을 `repo.maven.apache.org` / `plugins.gradle.org`에서 받아오지 못하고 `Connection timed out` 또는 `알려진 호스트가 없습니다`(DNS 조회 실패)로 실패
- **원인**: 브라우저(curl)는 성공하는데 Gradle(JVM)만 실패하는 패턴 — 회사 SSL 검사 프록시가 원인인 경우가 많지만, 개인 PC에서도 재현됨. 정확한 원인은 특정되지 않았고 일시적 네트워크/DNS 불안정으로 추정
- **해결**: `ipconfig /flushdns` 후 재시도, 그래도 실패 시 `android/gradle.properties`의 `org.gradle.jvmargs`에 `-Djava.net.preferIPv4Stack=true` 추가. 최종적으로는 에뮬레이터 와이파이를 실기기 USB 연결로 바꾼 뒤 해결됨 (에뮬레이터 NAT 네트워크 불안정이 원인이었을 가능성)
- **교훈**: 회사 보안 소프트웨어가 없는 환경에서도 Gradle 의존성 다운로드가 curl과 다르게 실패할 수 있음. 재현 시 DNS 캐시 초기화 → IPv4 강제 → 네트워크 환경(에뮬레이터 NAT vs 실기기 USB vs 다른 와이파이) 교체 순으로 시도

<br />

## 개발 환경

### Metro Bundler Node.js 호환성 에러

- **증상**: `configs.toReversed is not a function`
- **원인**: Metro 설정 모듈이 Node 20 API(`Array.prototype.toReversed`)를 사용하는데 Node 18이 설치되어 있었음
- **해결**: Node.js 20으로 업그레이드

### 신규 개발 환경 앱 화이트 스크린

- **증상**: Firebase 초기화 실패 메시지 외 별도 크래시 없이 흰 화면만 표시
- **원인**: Git에 커밋되지 않는 민감 설정 파일(`src/config/api.ts`, 소셜 로그인 키 등)이 신규 환경에 공유되지 않아 런타임 초기화 실패
- **해결**: 팀 온보딩 시 필요한 설정 파일 목록 문서화 및 공유 프로세스 정리

### `git status`/`git commit`이 특정 개발 환경에서 무한 대기(hang)

- **증상**: 워킹트리 전체를 스캔하는 git 명령(`git status`, `git branch --show-current && git status`, `git commit -m ...`, `git commit --dry-run` 포함)이 진행 표시 없이 멈춤. 175초 이상 기다려도 끝나지 않고, 강제 종료 시 `.git/index.lock`이 남아 이후 명령까지 막힘. 반면 특정 파일만 지정한 `git status -- <path...>`, `git add <path...>`, `git write-tree`, `git rev-parse HEAD`는 몇 초 안에 정상 종료됨
- **원인**: 정확히 특정되지 않았으나, 워킹트리 전체를 훑는 인덱스 리프레시 단계(모든 추적 파일을 stat)가 비정상적으로 느림 — 특정 개발 환경(예: 실시간 백신 검사가 걸리는 Windows PC, 네트워크 드라이브 등)에서 파일 I/O 지연이 누적되는 것으로 추정. `git commit`은 `-- <pathspec>`을 줘도 내부적으로 전체 인덱스를 리프레시하기 때문에 pathspec만으로는 우회되지 않음
- **해결**: 저수준(plumbing) 명령으로 전체 워킹트리 스캔을 건너뛰고 커밋 생성
  1. `git add <path...>` (필요한 파일만 스테이징 — 빠름)
  2. `git write-tree` → 현재 인덱스로부터 트리 객체 생성 (인덱스만 사용, 워킹트리 전체 스캔 없음 — 빠름)
  3. `git commit-tree <tree-sha> -p <parent-sha> -m "커밋 메시지"` → 커밋 객체 생성 (순수 객체 DB 쓰기 — 빠름)
  4. `git update-ref refs/heads/<branch> <new-commit-sha>` → 브랜치 포인터 이동
  - 멈춘 명령을 강제 종료했다면 재시도 전에 `.git/index.lock`이 남아있는지 확인하고 지울 것
- **교훈**: 이 환경에서는 워킹트리 "전체"를 훑는 git 명령(무인자 `git status`, `git commit`, `git diff` 등)은 항상 느릴 수 있다고 가정하고, 가능하면 경로를 지정한 명령이나 위 plumbing 조합을 우선 사용할 것. 근본 원인(백신/네트워크 드라이브 등)은 아직 확인되지 않았으므로, 재현 환경에서 백신 예외 처리나 저장소를 로컬 SSD로 옮기는 시도도 고려해볼 수 있음
