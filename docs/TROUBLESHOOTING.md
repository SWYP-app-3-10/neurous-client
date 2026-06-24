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

## 개발 환경

### Metro Bundler Node.js 호환성 에러

- **증상**: `configs.toReversed is not a function`
- **원인**: Metro 설정 모듈이 Node 20 API(`Array.prototype.toReversed`)를 사용하는데 Node 18이 설치되어 있었음
- **해결**: Node.js 20으로 업그레이드

### 신규 개발 환경 앱 화이트 스크린

- **증상**: Firebase 초기화 실패 메시지 외 별도 크래시 없이 흰 화면만 표시
- **원인**: Git에 커밋되지 않는 민감 설정 파일(`src/config/api.ts`, 소셜 로그인 키 등)이 신규 환경에 공유되지 않아 런타임 초기화 실패
- **해결**: 팀 온보딩 시 필요한 설정 파일 목록 문서화 및 공유 프로세스 정리
