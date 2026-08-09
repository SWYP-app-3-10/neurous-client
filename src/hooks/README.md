# 🪝 hooks/ — 커스텀 훅 레이어

> 이 폴더는 **화면(Screen)과 API 사이에서 중간 다리 역할**을 하는 커스텀 훅들이에요.
> 화면은 UI에만 집중하고, 데이터 패칭·상태 관리 로직은 여기서 담당합니다.

---

## 📁 파일 구성

### 🌐 서버 데이터 훅 (React Query 기반)

| 파일 | 역할 |
|------|------|
| `useCharacter.ts` | 캐릭터 정보, 리워드, 통합 정보 조회 |
| `useMissions.ts` | 미션 목록 조회 및 완료 처리 |
| `useExploreContents.ts` | 홈/탐색 콘텐츠 목록 |
| `useSearchContents.ts` | 검색 결과 |
| `useMyPage.ts` | 마이페이지 유저 정보 |
| `usePointHistory.ts` | 포인트 내역 |
| `useUpdateLevel.ts` | 레벨(난이도) 업데이트 |
| `useDifficultyInfo.ts` | 난이도 정보 조회 |
| `useDifficultySubmit.ts` | 난이도 제출 |
| `useWithdrawUser.ts` | 회원 탈퇴 처리 |

### 📱 UI/기능 훅 (로컬 상태 기반)

| 파일 | 역할 |
|------|------|
| `useNotificationSSE.ts` | SSE 실시간 알림 구독 |
| `useNotificationPermission.ts` | 알림 권한 요청 (iOS) |
| `useTrackingPermission.ts` | ATT 추적 권한 요청 (iOS) |
| `useArticleNavigation.ts` | 아티클 화면 전환 로직 |
| `useQuizButton.ts` | 퀴즈 버튼 상태 관리 |
| `useScrollToQuiz.ts` | 퀴즈 위치로 스크롤 |

---

## ⚡ React Query 훅 패턴

### useCharacter.ts — 캐릭터 훅

> `useQuery`로 서버 데이터를 가져오고, 캐싱까지 자동으로 처리해줘요.

```ts
// Query Keys — 캐시 식별자
export const characterKeys = {
  all: ['character'],
  data: () => [...characterKeys.all, 'data'],
  reward: () => [...characterKeys.all, 'reward'],
  me: () => [...characterKeys.all, 'me'],
};

// 훅 사용 예시
const { data, isLoading, error } = useCharacterData();
const { data: reward } = useCharacterReward();
const { data: me } = useCharacterMe();
```

| 훅 | staleTime | gcTime | refetchOnMount | 설명 |
|----|----------|--------|----------------|------|
| `useCharacterData` | 5분 | 10분 | `always` | 캐릭터 기본 정보 |
| `useCharacterReward` | 5분 | 10분 | - | 리워드 정보 |
| `useCharacterMe` | 5분 | 10분 | `always` | 성장·출석·미션 통합 |

> 💡 **staleTime vs gcTime**
> - `staleTime`: 이 시간 동안은 캐시를 "신선하다"고 봄 → 서버 재요청 안 함
> - `gcTime`: 이 시간 후 캐시를 메모리에서 제거
> - 비유: staleTime = 우유 유통기한 / gcTime = 냉장고에서 꺼내는 시간

> 💡 **refetchOnMount: 'always'는 왜 필요한가요?**
> `useCharacterData`/`useCharacterMe`는 캐릭터 탭 진입 시(`useFocusEffect`) 수동으로 `refetch()`를 호출하지만,
> 마운트 타이밍과 겹치면 이 호출이 누락될 수 있어요. `refetchOnMount: 'always'`를 함께 걸어두면
> staleTime과 무관하게 화면이 마운트될 때마다 서버에서 다시 받아오므로 이중 안전장치가 됩니다.
> (홈 탭의 `useMissions`도 동일한 이유로 `refetchOnMount: true`를 사용 중)

### prefetchCharacterAfterReward() — 보상 발생 시 미리 받아두기

> 포인트/경험치가 지급되는 순간(일일 출석 체크, 글 읽기 보상, 퀴즈 보상)마다 호출해서,
> 유저가 캐릭터 탭에 들어가기 전에 미리 최신 데이터를 캐시에 채워두는 함수예요.

```ts
// 사용 예시 (보상 지급 직후)
addExperience(ARTICLE_READ_EXPERIENCE);
prefetchCharacterAfterReward();
```

> 💡 **왜 refetchQueries가 아니라 prefetchQuery인가요?**
> `refetchQueries`는 캐시에 이미 등록된 쿼리만 다시 실행할 수 있어요. 신규 가입 유저나
> 로그아웃 후 재로그인처럼 캐릭터 탭에 한 번도 안 들어가 캐시가 비어있으면 아무 일도 안 합니다.
> `prefetchQuery`는 캐시 유무와 무관하게 항상 요청을 만들기 때문에 이런 상황에서도 동작해요.
> 보상 지급 시점엔 서버 반영이 아직 안 끝났을 수도 있어서, 즉시 1회 + 1.5초 뒤 1회 더 요청합니다.

---

## 📡 useNotificationSSE.ts — 실시간 알림 훅

> SSE(Server-Sent Events)로 서버에서 오는 **실시간 알림을 자동으로 수신**해요.

```ts
export function useNotificationSSE() {
  const startedRef = useRef(false);  // 중복 구독 방지!
  const add = useNotificationStore(s => s.add);

  useEffect(() => {
    if (startedRef.current) return;  // 이미 구독 중이면 skip
    startedRef.current = true;

    // SSE 구독 시작
    const off = await subscribeNotificationsSSE({ onMessage, onError, ... });

    return () => {
      off?.();                    // 화면 언마운트 시 구독 해제
      startedRef.current = false;
    };
  }, [add]);
}
```

### 중복 구독 방지 메커니즘

```
startedRef.current = false  (초기)
    ↓ useEffect 실행
startedRef.current = true   (구독 시작)
    ↓ 화면이 리렌더링되어도
if (startedRef.current) return  → 이미 구독 중이니 무시
    ↓ 화면 언마운트
off() 실행 + startedRef.current = false  (정리)
```

### 알림 수신 흐름

```
서버 SSE 이벤트 발생
    ↓
onMessage 콜백 실행
    ↓ JSON 파싱 (실패해도 string 처리)
    ↓ title, subtitle, id 추출
notificationStore.add(item)
    ↓
UI에서 store 구독 → 자동 반영
```

---

## 🔑 useNotificationPermission.ts / useTrackingPermission.ts

> iOS에서는 알림 권한과 ATT(앱 추적 투명성) 권한을 사용자에게 별도로 요청해야 해요.

```
앱 실행
    ↓
useTrackingPermission — ATT 권한 요청 (광고 추적 동의)
    ↓
useNotificationPermission — 푸시 알림 권한 요청
    ↓
권한 상태 저장 → 이후 동작 결정
```

> 💡 **왜 훅으로 분리하나요?**
> 권한 요청 로직을 훅으로 빼두면 화면 코드가 깔끔해지고,
> 다른 화면에서도 재사용할 수 있어요.

---

## 📌 핵심 원칙

```
❌ 잘못된 예: Screen 안에서 직접 fetch() 호출
✅ 올바른 예: Screen은 훅만 호출, 훅이 데이터 가져오기 처리
```

### 화면에서 사용하는 방법

```tsx
// CharacterScreen.tsx
const { data: character, isLoading } = useCharacterData();
const { data: reward } = useCharacterReward();

if (isLoading) return <LoadingSpinner />;
return <CharacterView data={character} reward={reward} />;
```

---

## 🔗 의존 관계

```
screens ← 여기 훅을 호출
    ↓
hooks/ ← 여기
    ↓ useQuery / useMutation
api/ (HTTP 통신)
    ↓
store/ (Zustand 상태 업데이트, 필요 시)
```
