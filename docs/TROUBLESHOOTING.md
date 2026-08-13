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
