/**
 * 포인트/경험치 획득 내역 React Query 커스텀 훅
 *
 * fetchPointHistory 응답을 PointHistoryScreen이 사용하는
 * PointHistoryItem 형태로 변환해 반환함.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchPointHistory } from '../api/pointHistoryApi';
import { getUserInfo } from '../services/authService';
import type { PointHistoryItem } from '../data/mock/characterData';
import { queryClient } from '../config/queryClient';

// ─────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────

/**
 * 포인트 내역 관련 React Query 키 팩토리
 */
export const pointHistoryKeys = {
  all: ['pointHistory'] as const,
  lists: () => [...pointHistoryKeys.all, 'list'] as const,
};

// ─────────────────────────────────────────────────────────────
// 조회 함수
// ─────────────────────────────────────────────────────────────

/**
 * 보상 획득 내역 조회 + 응답 변환
 *
 * [응답 변환]
 * 서버 응답(PointHistoryDto)을 PointHistoryScreen이 기대하는
 * PointHistoryItem 구조로 매핑함:
 * - historyId → id, transactionId (PointHistoryScreen의 트랜잭션 기준 1아이템 구조)
 * - exp       → xpDelta
 * - point     → ptDelta
 * - reason    → title
 *
 * usePointHistory(useQuery)와 prefetchPointHistoryAfterReward(prefetchQuery)가
 * 동일한 조회 로직을 공유해야 해서 queryFn을 별도 함수로 분리함.
 *
 * @returns  items — PointHistoryItem 배열
 */
const fetchPointHistoryItems = async (): Promise<{
  items: PointHistoryItem[];
}> => {
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.userId) {
    throw new Error('사용자 정보가 없음');
  }

  const response = await fetchPointHistory(userInfo.userId);

  // 서버 PointHistoryDto → 화면용 PointHistoryItem 변환
  // historyId를 transactionId로 사용 (PointHistoryScreen 구조 유지)
  const items: PointHistoryItem[] = (response.data ?? []).map(it => ({
    id: String(it.historyId),
    transactionId: String(it.historyId),
    xpDelta: it.exp ?? 0,
    ptDelta: it.point ?? 0,
    title: it.reason ?? '',
    createdAt: it.createdAt,
  }));

  return { items };
};

// ─────────────────────────────────────────────────────────────
// 커스텀 훅
// ─────────────────────────────────────────────────────────────

/**
 * 보상 획득 내역 조회 훅
 *
 * @returns  items — PointHistoryItem 배열
 */
export const usePointHistory = () => {
  return useQuery<{ items: PointHistoryItem[] }, Error>({
    queryKey: pointHistoryKeys.lists(),
    queryFn: fetchPointHistoryItems,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
  });
};

// ─────────────────────────────────────────────────────────────
// 보상 발생 시 백그라운드 프리페치
// ─────────────────────────────────────────────────────────────

/**
 * 포인트/경험치 보상 발생 시점에 "받은 내역 확인하기" 화면(PointHistoryScreen)
 * 데이터를 백그라운드로 미리 요청한다.
 *
 * useCharacter.ts의 prefetchCharacterAfterReward와 동일한 목적/패턴이며,
 * 항상 같은 시점(보상 발생 직후)에 함께 호출된다:
 * - 캐릭터 탭 진입 전 미리 캐시를 채워 체감 로딩 시간을 줄임
 * - 즉시 1회 + 서버 반영 지연 대비 1.5초 뒤 1회 더 요청
 * - 캐시 유무와 무관하게 항상 요청하는 prefetchQuery 사용
 *
 * 사용처: 일일 출석 체크(MissionScreen), 글 읽기 보상(ArticleDetailScreen),
 *         퀴즈 보상(QuizScreen) — prefetchCharacterAfterReward와 나란히 호출
 */
export const prefetchPointHistoryAfterReward = () => {
  const run = () => {
    // prefetchQuery는 에러가 나도 throw하지 않아 화면 로직에 영향을 주지 않는다.
    queryClient.prefetchQuery({
      queryKey: pointHistoryKeys.lists(),
      queryFn: fetchPointHistoryItems,
      staleTime: 0, // 캐시 신선도 무시하고 항상 새로 요청
    });
  };

  run();
  setTimeout(run, 1500);
};
