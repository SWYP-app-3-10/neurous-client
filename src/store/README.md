# 🗃️ store/ — 전역 상태 관리 (Zustand)

> 이 폴더는 **앱 전체에서 공유하는 상태(Global State)**를 관리합니다.
> 여러 화면에서 동시에 필요한 데이터, 즉 "어디서든 꺼내 쓸 수 있어야 하는 것들"이 여기에 있어요.

---

## 📁 파일 구성

| 파일 | 관리하는 상태 |
|------|-------------|
| `experienceStore.ts` | 경험치 (EXP) |
| `pointStore.ts` | 포인트 잔액 |
| `notificationStore.ts` | 알림 목록 |
| `onboardingStore.ts` | 온보딩 완료 여부 및 단계 |
| `modalStore.ts` | 전역 모달 표시 여부 |
| `toastStore.ts` | 전역 토스트 메시지 |

---

## 🧠 왜 Zustand를 쓰나요?

> **Redux보다 훨씬 가볍고 보일러플레이트가 적은** 상태 관리 라이브러리예요.

```ts
// 이게 전부! create() 한 번으로 store 완성
const useExperienceStore = create((set, get) => ({
  experience: 0,
  setExperience: (v) => set({ experience: v }),
  addExperience: (amount) => set({ experience: get().experience + amount }),
}));
```

---

## 📦 experienceStore.ts — 경험치 Store

```ts
// 사용 예시
const experience = useExperienceStore(s => s.experience);      // 읽기
const addExp = useExperienceStore(s => s.addExperience);       // 쓰기
```

| 상태/액션 | 타입 | 설명 |
|-----------|------|------|
| `experience` | `number` | 현재 경험치 |
| `setExperience(v)` | `(number) => void` | 경험치 덮어쓰기 |
| `addExperience(amount)` | `(number) => void` | 경험치 추가 |
| `subtractExperience(amount)` | `(number) => void` | 경험치 차감 |

> ⚠️ **이 store는 UI 표시용 임시 상태일 뿐, 서버 동기화를 보장하지 않는다.** 출석/글 읽기 보상은 여기 `addExperience`만 호출하고 서버 API를 부르지 않는 경우가 있다. 캐릭터 탭이 보여주는 실제 경험치는 이 store가 아니라 서버 재조회(`useCharacterMe`) 값이며, 둘 사이 반영 시차 문제와 대응 방법은 `docs/ARCHITECTURE.md`의 "4. 보상 시스템 — 서버 값 vs 로컬 값" 참고.

---

## 🔔 notificationStore.ts — 알림 Store

SSE(Server-Sent Events)로 실시간 수신된 알림을 저장하는 곳이에요.

```ts
type NotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  isRead: boolean;
  raw?: any;  // 서버 원본 데이터
};
```

| 상태/액션 | 설명 |
|-----------|------|
| `list` | 알림 목록 배열 |
| `add(item)` | 새 알림 맨 앞에 추가 (최신 우선) |
| `markRead(id)` | 특정 알림 읽음 처리 |
| `setAll(items)` | 알림 목록 전체 교체 |
| `clear()` | 알림 전체 초기화 |

---

## 🚀 onboardingStore.ts — 온보딩 Store

> **앱 최초 실행 흐름** (로그인 → 관심사 선택 → 난이도 선택 → 완료)을 관리하는 핵심 Store

```
currentStep: 'login' → 'interests' → 'difficulty' → 'completed'
```

- `isOnboardingCompleted`가 `true`이면 → 메인 화면으로
- `isOnboardingCompleted`가 `false`이면 → 온보딩 화면으로
- `RootNavigator`가 이 값을 구독해서 화면 분기 처리

### ⚙️ Service 분리 패턴

```ts
// Store에서 직접 AsyncStorage 쓰지 않음!
// onboardingService를 통해서만 데이터 저장
completeOnboarding: async () => {
  await completeOnboardingService();  // service에 위임
  set({ isOnboardingCompleted: true });
}
```

> 💡 나중에 AsyncStorage → 서버 API로 바꿔야 할 때 `onboardingService`만 수정하면 됨

---

## ✅ Zustand 사용 팁 — 선택적 구독 (Selective Subscription)

> **최적화 핵심!** 필요한 값만 구독하면 불필요한 리렌더링을 줄일 수 있어요.

```ts
// ❌ 비효율: store 전체를 구독 → 어떤 값이 바뀌어도 리렌더
const store = useExperienceStore();

// ✅ 효율: 필요한 값만 선택적으로 구독
const experience = useExperienceStore(s => s.experience);
const addExp = useExperienceStore(s => s.addExperience);
```

---

## 🔗 다른 레이어와의 관계

```
서버 (SSE, API 응답)
    ↓
hooks / services
    ↓ set() 호출
store/ ← 여기 (전역 상태 저장소)
    ↑ 구독 (selector)
screens (화면에서 읽기)
```

---

## 📌 언제 Store를 쓰고, 언제 React Query를 쓰나요?

| 구분 | 사용처 |
|------|--------|
| **Zustand Store** | UI 상태, 실시간 데이터, 앱 흐름 제어 (온보딩, 모달, 토스트, 알림) |
| **React Query** | 서버에서 패치하는 데이터 (캐싱, 자동 갱신이 필요한 것) |

> 💡 **비유:**
> - Store = 책상 위 (언제든 꺼내 쓰는 것)
> - React Query = 캐비닛 (서버에서 가져와서 잠깐 보관하는 것)
