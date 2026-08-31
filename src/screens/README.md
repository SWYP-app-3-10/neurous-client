# 🖥️ screens/ — 화면 레이어

> 이 폴더는 **사용자에게 실제로 보이는 화면(UI) 컴포넌트**들이 있는 곳이에요.
> 화면은 데이터 패칭이나 비즈니스 로직을 직접 하지 않고,
> **훅(hooks)을 호출하고 받은 데이터를 렌더링**하는 역할만 담당합니다.

---

## 📁 파일 구성

### 🔐 인증 화면

| 파일                  | 역할                                           |
| --------------------- | ---------------------------------------------- |
| `LoginScreen.tsx`     | 소셜 로그인 선택 (Google, Kakao, Naver, Apple) |
| `AdLoadingScreen.tsx` | 로그인 후 광고 로딩 + 권한 요청 처리           |

### 📖 콘텐츠 화면

| 파일                          | 역할                       |
| ----------------------------- | -------------------------- |
| `ArticleDetailScreen.tsx`     | 아티클 상세 보기 (읽는 중) |
| `ReadArticleDetailScreen.tsx` | 이미 읽은 아티클 다시 보기 |
| `QuizScreen.tsx`              | 아티클 독해 퀴즈, 일일 난이도 평가 및 변경 제안 플로우 조정 |

### 🎮 캐릭터 성장 화면

| 파일                  | 역할                           |
| --------------------- | ------------------------------ |
| `CharacterScreen.tsx` | 캐릭터 성장 현황, 출석, 리워드 |
| `MissionScreen.tsx`   | 일일/주간 미션 목록            |

### 🔍 검색 화면

| 파일                          | 역할                      |
| ----------------------------- | ------------------------- |
| `SearchScreen.tsx`            | 검색 홈 (최근 검색어 등)  |
| `SearchInputScreen.tsx`       | 검색어 입력 화면          |
| `SearchResultScreen.tsx`      | 검색 결과 목록            |
| `SearchLiveResultOverlay.tsx` | 실시간 검색 결과 오버레이 |

### 👤 마이페이지

| 파일               | 역할                    |
| ------------------ | ----------------------- |
| `MyPageScreen.tsx` | 유저 정보, 포인트, 설정 |

---

## 🏗️ 화면 구조 설계 원칙

```
Screen 컴포넌트의 역할:
1. 커스텀 훅 호출 → 데이터 받기
2. 로딩/에러 상태 처리
3. 받은 데이터를 JSX로 렌더링
4. 사용자 액션 → 훅의 함수 호출

Screen 컴포넌트가 하지 말아야 할 것:
- fetch() 직접 호출 ❌
- AsyncStorage 직접 접근 ❌
- 복잡한 비즈니스 로직 ❌
```

### 올바른 화면 코드 패턴

```tsx
// ✅ 좋은 예
const CharacterScreen = () => {
  // 1. 훅으로 데이터 가져오기
  const { data: character, isLoading } = useCharacterData();
  const experience = useExperienceStore(s => s.experience);

  // 2. 로딩/에러 처리
  if (isLoading) return <SkeletonUI />;

  // 3. 렌더링만!
  return (
    <View>
      <CharacterImage level={character.level} />
      <ExpBar current={experience} />
    </View>
  );
};
```

---

## 🔐 LoginScreen.tsx

### 소셜 로그인 흐름

```
사용자가 "구글로 로그인" 버튼 클릭
    ↓
socialLoginService.signIn('GOOGLE')  →  구글 SDK로 accessToken 획득
    ↓
authApi.loginWithProvider('GOOGLE', { accessToken })  →  서버에서 JWT 발급
    ↓
authService.saveAuthToken(jwt)
authService.saveUserInfo(userInfo)
    ↓
onboardingStore.completeOnboarding() or setStep('interests')
    ↓
RootNavigator가 onboardingStore 변화 감지 → 화면 전환
```

---

## ⚡ AdLoadingScreen.tsx — 권한 요청 허브

> 로그인 직후, 메인 화면 진입 전에 **iOS 권한들을 처리하는 중간 화면**이에요.

```
로그인 완료
    ↓
AdLoadingScreen 진입
    ↓
useTrackingPermission()  →  ATT 권한 요청
    ↓
useNotificationPermission()  →  알림 권한 요청
    ↓
광고 로딩 (AdMob)
    ↓
메인 화면 진입
```

---

## 📖 ArticleDetailScreen.tsx vs ReadArticleDetailScreen.tsx

| 구분 | ArticleDetailScreen         | ReadArticleDetailScreen |
| ---- | --------------------------- | ----------------------- |
| 상황 | 처음 읽는 아티클            | 이미 읽은 아티클 재열람 |
| 퀴즈 | 완료 후 QuizScreen으로 이동 | 퀴즈 재도전 가능        |
| EXP  | 완료 시 경험치 부여         | 경험치 없음             |

### QuizScreen 난이도 평가 흐름

```text
화면 진입 → 오늘 평가 여부 확인
  → 미평가: 평가 모달
  → 서버 제출 성공: 로컬 이력 저장·분석
    → 조건 미달: 평가 모달 종료
    → 조건 충족: 난이도 제안 모달
      → 수락 성공: 서버·로컬 난이도 변경
      → 거절: 현재 난이도 유지
```

화면은 순서를 조정하지만 API·분석·저장은 각각 `useDifficultySubmit`, `useDifficultyFeedbackCheck`, `useDifficultySuggestion`, `difficultyFeedbackService`에 위임한다. 자세한 실패 분기와 저장 키는 `docs/DIFFICULTY_FLOW.md` 참고.

---

## 🔍 검색 화면 흐름

```
SearchScreen (검색 홈)
    ↓ 검색창 탭
SearchInputScreen (입력)
    ↓ 타이핑 중
SearchLiveResultOverlay (실시간 결과 — 입력창 위에 오버레이)
    ↓ 검색 실행
SearchResultScreen (전체 결과 목록)
```

---

## 🔗 의존 관계

```
screens/ ← 여기 (UI만)
    ↓ 커스텀 훅 호출
hooks/
    ↓ React Query / Zustand
api/ + store/
```

---

## 📌 네비게이션

React Navigation을 사용하고 있으며, `RootNavigator`가 `onboardingStore`의 상태를 구독해서 화면 흐름을 결정합니다.

```
isOnboardingCompleted = false  →  OnboardingNavigator (로그인/온보딩 화면)
isOnboardingCompleted = true   →  MainNavigator (탭 기반 메인 화면)
```
