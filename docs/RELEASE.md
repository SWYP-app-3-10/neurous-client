# 빌드 & 배포

## Android 배포

### Google Play Console 내부 테스트

내부 테스트 트랙으로 배포하고 있습니다. 전체 사이클:

1. `android/app/build.gradle`에서 `versionCode` 증가 + `versionName` 갱신
2. release 빌드 생성: `cd android && ./gradlew bundleRelease`
3. Play Console에서 AAB 업로드 → 내부 테스트 트랙 배포
4. 내부 테스트 링크로 설치 확인

> ⚠️ versionCode는 이전 업로드보다 반드시 높아야 합니다. 중복 시 업로드 거부됩니다.

### 버전 관리

| 항목 | 위치 | 설명 |
| --- | --- | --- |
| `versionCode` | `android/app/build.gradle` | Play Console 업로드마다 반드시 증가 (정수) |
| `versionName` | `android/app/build.gradle` | 사용자에게 표시되는 버전 (ex: `1.0.0`) |

<br />

## App Signing 구조

### 키 구분

| 키 | 역할 | 보유 주체 |
| --- | --- | --- |
| **Upload Key** | 개발자가 AAB에 서명하는 키 | 개발자 (`neuros-app.keystore`, alias: `neuros-key`) |
| **App Signing Key** | Play Store가 최종 APK에 서명하는 키 | Google (Play Console 관리) |

개발자는 Upload Key로 AAB를 서명해 업로드하고, Google Play가 App Signing Key로 최종 APK를 재서명합니다.

### App Signing Key 업그레이드 이력

마이그레이션 직후 내부 테스트 단계(프로덕션 미배포)임을 확인하고, Play Console의 "Google Play에서 새 앱 서명 키 생성" 옵션으로 업그레이드를 진행했습니다. Upload Key(기존 keystore)는 유지한 채 App Signing Key만 Google 관리로 전환했습니다.

### 환경별 SHA / 키 해시 등록

keystore가 환경마다 다르므로, 소셜 로그인이 동작하려면 **각 keystore의 SHA/키 해시를 모두 등록**해야 합니다.

| 환경 | keystore | 등록 대상 |
| --- | --- | --- |
| **debug** | `~/.android/debug.keystore` | Firebase SHA, Kakao 키 해시 |
| **upload (release)** | `neuros-app.keystore` | Firebase SHA, Kakao 키 해시 |
| **App Signing** | Google 관리 (Play Console에서 확인) | Firebase SHA, Kakao 키 해시 |

#### SHA 추출 방법

```bash
# debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android

# upload keystore
keytool -list -v -keystore neuros-app.keystore -alias neuros-key
```

#### Kakao 키 해시 변환

```bash
# SHA-1 hex → Base64 키 해시
echo -n "<SHA-1 hex>" | xxd -r -p | openssl base64
```

<br />

## Firebase SHA 등록

Firebase Console → 프로젝트 설정 → Android 앱 → SHA 인증서 지문에서 등록합니다.

등록할 SHA 목록:
- debug keystore SHA-1 / SHA-256
- upload keystore SHA-1 / SHA-256
- App Signing Key SHA-1 / SHA-256 (Play Console에서 확인)

> SHA 변경 후에는 반드시 `google-services.json`을 재다운로드하여 `android/app/`에 교체해야 합니다.

<br />

## Firebase 마이그레이션 (neurous-v2)

기존 Firebase 프로젝트를 `neurous-v2`로 마이그레이션하면서 수행한 작업:

- Firebase Analytics 이벤트 트래킹 재구성
- AdMob 광고 유닛 ID 마이그레이션 (Android/iOS 플랫폼별)
- `GoogleService-Info.plist` / `google-services.json` 교체 및 gitignore 재설정

### 외부 API 키 전체 교체

| 서비스 | 교체 항목 |
| --- | --- |
| **Google** | OAuth Client ID (webClientId), `google-services.json` |
| **Kakao** | Native App Key, AndroidManifest scheme, 키 해시 재등록 |
| **Naver** | consumerKey / consumerSecret |
| **AdMob** | Android/iOS 광고 단위 ID |
| **Firebase** | SHA 인증서 재등록, 설정 파일 재배포 |

<br />

## ProGuard (R8) 이슈

### Naver SDK 난독화 문제

- **증상**: release 빌드에서만 Naver 로그인 후 스플래시로 복귀
- **원인**: ProGuard 활성화 시 SDK 콜백 클래스가 난독화
- **대응**: keep rule 적용 시도, 현재 임시 비활성화 처리

### ProGuard 설정 위치

```
android/app/proguard-rules.pro
```

<br />

## iOS 빌드 / 배포

### 필수 설정 파일

| 파일 | 위치 | 설명 |
| --- | --- | --- |
| `GoogleService-Info.plist` | `ios/` | Firebase 설정 (Xcode에 Add Files + Target Membership 필수) |
| `Info.plist` | `ios/{프로젝트명}/` | URL Scheme, ATS, 권한 설정 |
| `Config.xcconfig` | `ios/` | 환경 변수 분리, 민감 정보 관리 |

### gitignore 대상

```
ios/GoogleService-Info.plist
ios/**/Info.plist
ios/Config.xcconfig
```

> 신규 팀원은 위 파일들을 팀에서 별도로 전달받아야 합니다. `Info.plist.example` 템플릿을 참고하세요.

### iOS URL Scheme

소셜 로그인 리다이렉트 처리를 위해 Kakao / Naver / Google / Apple 각 제공자의 URL Scheme이 `Info.plist`에 등록되어 있어야 합니다.

### Archive 업로드

Xcode → Product → Archive → Distribute App → App Store Connect 업로드. Signing 설정 및 프로비저닝 프로파일 확인 필요.
