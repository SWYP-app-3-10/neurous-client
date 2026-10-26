# Mixpanel 이벤트 명세

팀 공유 및 Mixpanel 리포트 구성의 기준 문서입니다. 실제 허용 이벤트 이름은 `src/services/mixpanelService.ts`의 `MixpanelEventName`과 일치해야 합니다.

## 수집 정책

- `IS_PRODUCTION=true`인 빌드만 Mixpanel로 전송합니다. 개발 빌드는 콘솔의 `[Mixpanel - Dev]` 로그로 확인합니다.
- 모든 이벤트에는 `user_id`와 앱 콜드 스타트 단위 `session_id`가 자동으로 붙습니다.
- 이벤트명과 property는 `snake_case`를 사용합니다.
- ID는 서버 값을 그대로 보내며 `article_id`, `quiz_id`는 숫자입니다.
- 동일한 신규 핵심 행동은 Firebase Analytics에도 같은 이벤트명/property로 전송합니다.
- 화면 노출과 행동을 구분합니다. `_view`는 실제 노출, `_click`/`_start`/`_submit`/`_complete`는 해당 행동이 발생한 시점입니다.

## 핵심 퍼널

```text
article_start
  -> original_article_click (선택)
  -> article_read_complete
  -> reward_popup_view
  -> reward_popup_action(next_article | start_quiz | dismiss)
  -> quiz_start
  -> quiz_enter
  -> quiz_choice_select
  -> quiz_submit
  -> quiz_complete
  -> reward_popup_view
  -> reward_popup_action(confirm | next_article | dismiss)
```

`quiz_start`는 사용자가 퀴즈 진입 버튼을 누른 행동이고, `quiz_enter`는 퀴즈 데이터 로딩 후 화면 진입이 확인된 이벤트입니다. 두 이벤트를 합치지 않습니다.

## 전체 이벤트

### 글 읽기·퀴즈

| 이벤트                       | 발생 시점                           | 주요 property                                                                   |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `article_start`              | 새 글/읽은 글 상세 데이터 로딩 완료 | `article_id`, `category`, `difficulty`, `entry_source`                          |
| `original_article_click`     | 원문 확인하기 클릭                  | `article_id`, `category`, `entry_source`, `link_status`                         |
| `article_read_complete`      | 다 읽었어요 클릭                    | `article_id`, `category`, `entry_source`                                        |
| `quiz_start`                 | 글 상세의 퀴즈 시작 액션 클릭       | `article_id`, `entry_source`                                                    |
| `quiz_enter`                 | 퀴즈 데이터 로딩 및 화면 진입 완료  | `article_id`, `category`, `difficulty`, `entry_source`                          |
| `quiz_choice_select`         | 선택지 클릭                         | `article_id`, `quiz_id`, `choice_position`                                      |
| `quiz_submit`                | 다음 버튼으로 답안 제출 시도        | `article_id`, `quiz_id`, `entry_source`                                         |
| `quiz_complete`              | 제출 API 성공 후 결과 확정          | `article_id`, `quiz_id`, `category`, `difficulty`, `entry_source`, `is_correct` |
| `difficulty_feedback_view`   | 하루 1회 난이도 평가 모달 노출      | `article_id`                                                                    |
| `difficulty_feedback_submit` | 난이도 평가 API 성공                | `article_id`, `difficulty`                                                      |

`entry_source`는 글 진입에서는 `home`, `explore`, `search`, `my_page`, 퀴즈에서는 `article_detail`, `read_article_detail`을 사용합니다. 현재 `original_article_click.link_status`는 실제 원문 URL이 연결되기 전까지 `placeholder`입니다.

### 보상·레벨업·미션

| 이벤트                       | 발생 시점                                   | 주요 property                                                                               |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `reward_popup_view`          | 보상 팝업이 실제로 표시될 때                | `reward_type`, `reward_source`, `xp_amount`, `point_amount`, `is_level_up`, `modal_variant` |
| `reward_popup_action`        | 보상 팝업 버튼/닫기 액션                    | `reward_source`, `action`, `is_level_up`                                                    |
| `level_up_popup_view`        | 레벨업 형태의 보상 팝업 노출                | `level_before`, `level_after`, `reward_source`, `level_result_source`                       |
| `level_up_popup_confirm`     | 출석 레벨업 팝업 확인                       | 위 레벨업 property                                                                          |
| `mission_complete`           | 동일 세션에서 미완료였던 미션이 완료로 전환 | `mission_type`                                                                              |
| `reward_history_view`        | 보상 내역 로딩 완료                         | `item_count`                                                                                |
| `reward_history_detail_view` | 보상 내역 상세 펼침                         | `has_xp`, `has_point`                                                                       |
| `level_up_preview_view`      | 설정의 레벨업 미리보기 노출                 | `preview_level`                                                                             |

`reward_source`는 `article_read`, `quiz_correct`, `quiz_wrong`, `daily_attendance`, `weekly_attendance`를 사용합니다. 광고 보상은 팝업이 없으므로 `ad_watch_complete`로 기록합니다. `level_result_source`의 `server`는 서버 판정, `client_estimate`는 현재 클라이언트 계산값입니다.

`reward_popup_action.action` 값:

- `confirm`: 확인
- `next_article`: 다음 글 읽기
- `start_quiz`: 퀴즈 풀기
- `dismiss`: 지금은 괜찮아요/닫기

### 콘텐츠 구매·광고·검색

| 이벤트                 | 발생 시점                | 주요 property                                                |
| ---------------------- | ------------------------ | ------------------------------------------------------------ |
| `point_use_popup_view` | 포인트 사용 안내 노출    | `article_id`, `category`                                     |
| `point_use_confirm`    | 포인트로 새 글 읽기 선택 | `article_id`, `category`                                     |
| `ad_popup_view`        | 광고 시청 안내 노출      | `article_id`, `category`                                     |
| `ad_watch_complete`    | 리워드 광고 보상 획득    | `article_id`, `reward_type`, `reward_source`, `point_amount` |
| `search_result_click`  | 검색 결과의 글 클릭      | `article_id`, `category`                                     |

### 사용자 설정·성장

| 이벤트                                | 발생 시점                       | 주요 property                                  |
| ------------------------------------- | ------------------------------- | ---------------------------------------------- |
| `character_growth_view`               | 캐릭터 탭 진입                  | `character_level`                              |
| `growth_guide_view`                   | 성장 가이드 탭 진입/전환        | `tab` (`level`/`xp_point`)                     |
| `interest_selected`                   | 관심 분야 저장 성공             | `interests`                                    |
| `difficulty_selected`                 | 최초 온보딩 난이도 저장 성공    | `difficulty`                                   |
| `difficulty_changed`                  | 난이도 변경 API 성공            | `difficulty_before`, `difficulty_after`        |
| `difficulty_recommendation_view`      | 난이도 추천 모달 노출           | `current_difficulty`, `recommended_difficulty` |
| `difficulty_recommendation_accepted`  | 추천 난이도 변경 성공           | `difficulty_before`, `difficulty_after`        |
| `difficulty_recommendation_dismissed` | 추천 거절                       | `current_difficulty`, `recommended_difficulty` |
| `onboarding_replay_start`             | 설정에서 온보딩 다시 보기 시작  | `entry_source`                                 |
| `onboarding_replay_complete`          | 다시 보기 마지막 단계 완료      | `entry_source`                                 |
| `notification_setting_changed`        | 알림 설정 서버 반영 시도 완료   | `enabled`, `permission_status`(활성화 시)      |
| `my_page_view`                        | 마이페이지 탭 포커스            | 없음                                           |
| `inquiry_submit_click`                | 유효한 문의 폼의 전달 버튼 클릭 | `has_valid_email`                              |

### 알림

| 이벤트                     | 발생 시점           | 주요 property                        |
| -------------------------- | ------------------- | ------------------------------------ |
| `notification_center_view` | 알림 목록 로딩 완료 | `notification_count`, `unread_count` |
| `notification_click`       | 알림 항목 클릭      | `notification_id`, `was_unread`      |
| `notification_read`        | 읽음 처리 API 성공  | `notification_id`                    |

## 구현 위치

| 영역                             | 파일                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| 초기화·사용자 식별·공통 property | `src/services/mixpanelService.ts`, `App.tsx`, `src/services/authService.ts`                       |
| 글·완독·원문·보상                | `src/screens/common/ArticleDetailScreen.tsx`                                                      |
| 읽은 글 퀴즈 진입                | `src/screens/common/ReadArticleDetailScreen.tsx`                                                  |
| 퀴즈·난이도 평가·퀴즈 보상       | `src/screens/common/QuizScreen.tsx`                                                               |
| 출석 보상·레벨업                 | `src/screens/main/MissionScreen.tsx`                                                              |
| 포인트/광고 진입 및 완료         | `src/hooks/useArticleNavigation.ts`, `src/screens/common/AdLoadingScreen.tsx`                     |
| 알림                             | `src/screens/common/NotificationScreen.tsx`, `src/screens/myPage/SettingScreen.tsx`               |
| 보상 내역                        | `src/screens/character/history/PointHistoryScreen.tsx`                                            |
| 온보딩·관심사·난이도             | `src/screens/onboarding/*`, `src/hooks/useUpdateLevel.ts`, `src/hooks/useDifficultySuggestion.ts` |

## Mixpanel 리포트 권장 구성

1. 글→퀴즈 퍼널: `article_start` → `article_read_complete` → `quiz_start` → `quiz_complete`
2. 완독 후 선택 비율: `reward_popup_action`을 `action`으로 breakdown
3. 퀴즈 정답률: `quiz_complete`을 `is_correct`로 breakdown
4. 유료 접근 전환: `point_use_popup_view` → `point_use_confirm`, `ad_popup_view` → `ad_watch_complete`
5. 보상별 레벨업: `reward_popup_view`를 `reward_source`, `is_level_up`으로 breakdown
6. 알림 효과: `notification_center_view` → `notification_click` → `notification_read`

## 변경 체크리스트

- 이벤트 이름을 `MixpanelEventName`에 추가했는가
- Firebase와 Mixpanel에 동일한 의미/property로 전송했는가
- API 성공 이벤트와 버튼 클릭 이벤트를 구분했는가
- 중복 렌더링/재요청으로 이벤트가 반복되지 않는가
- 이 문서와 `docs/ANALYTICS_EVENTS.md`를 함께 갱신했는가
- 개발 로그와 프로덕션 DebugView/Live View에서 실제 payload를 확인했는가
