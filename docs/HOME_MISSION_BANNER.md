# 홈 미션 배너 (오늘의 미션 캐러셀)

홈 화면(`src/screens/main/MissionScreen.tsx`) 상단의 "오늘의 미션" 가로 캐러셀 동작을 정리한 문서입니다.

## 요구사항

1. 미션 카드 순서는 **서버 응답 순서 그대로 고정**한다. 상태(진행 중 / 완료 / 잠김)가 바뀌어도 카드 위치는 바뀌지 않는다.
2. 화면에 진입했을 때 **진행 중인 미션 카드가 처음부터 화면 중앙에 보이도록** 캐러셀을 해당 위치로 이동시킨다. (애니메이션 없이 즉시 이동)

## 변경 배경

- 이전에는 `진행 중 → 완료 → 잠김` 순으로 클라이언트에서 재정렬했다.
- 그 결과 미션을 완료할 때마다 카드 순서가 뒤바뀌어 "몇 번째 미션인지" 흐름을 파악하기 어려웠다.
- 정렬 대신 **스크롤 위치**로 진행 중 미션을 강조하는 방식으로 변경했다.

## 동작 규칙

| 상황 | 동작 |
|------|------|
| 미션 목록 | 서버 응답 순서 그대로 렌더링 (클라이언트 정렬 없음) |
| 진행 중 미션 1개 | 해당 카드 위치로 캐러셀 이동, 인디케이터 점도 해당 카드로 표시 |
| 진행 중 미션 여러 개 (예외) | 첫 번째 진행 중 카드에 포커스 |
| 진행 중 미션 없음 (전부 완료/잠김) | 맨 앞 카드에서 시작 |
| 미션 탭 재진입 | 진행 중 카드 위치로 다시 이동 |
| refetch 후 진행 중 미션이 바뀜 | 새 진행 중 카드 위치로 이동 |
| 사용자가 직접 스와이프 | 자동 이동 대기 해제 (사용자 조작을 덮어쓰지 않음) |

## 구현 요약

- `focusIndex`: `missions.findIndex(status === '진행 중')`, 없으면 0
- `scrollToFocusedMission`: `snapOffsets[focusIndex]` 위치로 `scrollTo({ animated: false })` 후 `currentIndex` 갱신
- `useFocusEffect`: 탭 진입 및 포커스 대상 변경 시 위 함수 실행
- `onContentSizeChange`: 최초 마운트 시 레이아웃이 끝나기 전 `scrollTo`가 무시되는 경우(특히 Android)를 대비해, 레이아웃 완료 시점에 한 번 더 이동 (`pendingFocusRef`로 제어)
- `onScrollBeginDrag`: 사용자 스와이프 시작 시 `pendingFocusRef`를 해제

## 캐릭터(나의 레벨) 탭 미션 목록

- 탭 이름은 "캐릭터"에서 **"나의 레벨"**로 변경했다. (`MainTabNavigator.tsx`)
- 캐릭터 탭의 "오늘의 미션" 세로 목록도 홈과 동일하게 **서버 응답 순서 그대로** 표시한다. (`CharacterScreen.tsx`)
- 마지막 카드와 탭바 사이 간격은 48로 맞췄다. (카드 하단 margin 16 + 스크롤 영역 `paddingBottom` 32)

## MissionCard 공통 스타일 (홈 / 나의 레벨 탭 공용)

| 상태 | 스타일 |
|------|--------|
| 완료 | 제목과 "완료" 배지 글자 `#767C91` (`COLORS.gray800`) |
| 진행 중 | 검정 제목 + 연보라 "진행 중" 배지 |
| 잠김 | 배경 `#FBFBFC`, 제목/자물쇠 opacity 30%, **테두리는 opacity 미적용**, 자물쇠는 제목/배지 레이아웃과 무관하게 **카드 전체 기준 정중앙**(가로·세로 모두)에 absolute로 배치 |

## 배너 노출 화면

미션 배너(캐러셀/리스트)는 **홈**과 **나의 레벨**(구 캐릭터) 탭에서만 나온다. **마이** 탭 화면(`MyPageScreen.tsx`)에는 미션 카드가 렌더링되지 않는다.

`MissionCard`의 prop 이름은 기존 `myPage`에서 **`myLevelPage`**로 변경했다(2026-09-28) — 실제 마이 탭과 무관하다는 오해를 줄이기 위함. 두 화면 모두 현재는 `myLevelPage={false}`(진행바 없는 카드)로 호출한다 — 홈(`MissionScreen.tsx`)은 기본값을, 나의 레벨 탭(`CharacterScreen.tsx`)은 명시적으로 `false`를 전달한다. `myLevelPage={true}` 분기(진행바 있는 카드)는 현재 코드상 호출부가 없다.

## 관련 파일

- `src/screens/main/MissionScreen.tsx`
- `src/screens/main/CharacterScreen.tsx`
- `src/navigation/MainTabNavigator.tsx`
- `src/components/MissionCard.tsx`
