/**
 * 캐릭터 관련 React Query 커스텀 훅 모음
 *
 * characterApi의 API 함수들을 React Query로 감싸
 * 서버 상태 캐싱, 로딩/에러 상태 관리를 자동화함.
 *
 * [캐시 설정 공통]
 * staleTime: 5분 — 5분 이내 재요청 시 캐시 데이터 반환 (API 미호출)
 * gcTime:   10분 — 마지막 구독 해제 후 10분간 캐시 유지
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchCharacterData,
  fetchCharacterReward,
  fetchCharacterMe,
  convertWeeklyAttendanceToAttendanceData,
  convertCharacterMissionToMission,
  CharacterData,
  CharacterRewardResponse,
  CharacterMeResponse,
} from '../api/characterApi';
import { queryClient } from '../config/queryClient';

// ─────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────

/**
 * 캐릭터 관련 React Query 키 팩토리
 *
 * 계층 구조로 관리해 특정 쿼리만 선택적으로 무효화 가능.
 *
 * @example
 * // 캐릭터 관련 전체 쿼리 무효화
 * queryClient.invalidateQueries({ queryKey: characterKeys.all })
 *
 * // 캐릭터 데이터만 무효화
 * queryClient.invalidateQueries({ queryKey: characterKeys.data() })
 */
export const characterKeys = {
  all: ['character'] as const,
  data: () => [...characterKeys.all, 'data'] as const,
  attendance: () => [...characterKeys.all, 'attendance'] as const,
  reward: () => [...characterKeys.all, 'reward'] as const,
  me: () => [...characterKeys.all, 'me'] as const,
};

// ─────────────────────────────────────────────────────────────
// 커스텀 훅
// ─────────────────────────────────────────────────────────────

/**
 * 캐릭터 정보 조회 훅
 *
 * fetchCharacterData를 호출해 현재 레벨, 경험치,
 * 다음 레벨 기준 경험치를 가져옴.
 *
 * 사용처: CharacterScreen 경험치 바 렌더링
 */
export const useCharacterData = () => {
  return useQuery<CharacterData>({
    queryKey: characterKeys.data(),
    queryFn: fetchCharacterData,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
    // 화면 마운트 시 캐시 신선도와 무관하게 항상 서버에서 다시 조회한다.
    // (useMissions와 동일한 패턴) 캐릭터 탭 첫 진입 시 focus refetch 타이밍과
    // 겹쳐 갱신이 누락되는 문제를 막기 위한 이중 안전장치.
    refetchOnMount: 'always',
  });
};

/**
 * 캐릭터 리워드 정보 조회 훅
 *
 * fetchCharacterReward를 호출해 각 행동별 포인트/경험치
 * 획득 기준 정보를 가져옴.
 *
 * 사용처: CharacterScreen 리워드 안내 섹션
 */
export const useCharacterReward = () => {
  return useQuery<CharacterRewardResponse>({
    queryKey: characterKeys.reward(),
    queryFn: fetchCharacterReward,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
  });
};

/**
 * 캐릭터 통합 정보 조회 훅 (성장 정보 + 출석 + 미션)
 *
 * fetchCharacterMe를 호출해 유저 성장 정보, 주간 출석 현황,
 * 미션 목록을 한 번에 가져옴.
 *
 * 사용처: CharacterScreen 전체 (캐릭터 화면의 메인 데이터 소스)
 */
export const useCharacterMe = () => {
  return useQuery<CharacterMeResponse>({
    queryKey: characterKeys.me(),
    queryFn: fetchCharacterMe,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
    // 화면 마운트 시 캐시 신선도와 무관하게 항상 서버에서 다시 조회한다.
    // (useMissions와 동일한 패턴) 캐릭터 탭 첫 진입 시 출석/진행률 바가
    // 갱신 전 상태로 보이던 문제의 재발 방지용 안전장치.
    refetchOnMount: 'always',
  });
};

// ─────────────────────────────────────────────────────────────
// 보상 발생 시 백그라운드 프리페치
// ─────────────────────────────────────────────────────────────

/**
 * 포인트/경험치 보상 발생 시점(모달 노출 등)에 캐릭터 정보를 백그라운드로 미리 요청한다.
 *
 * 목적: 유저가 실제로 캐릭터 탭에 들어가기 전에 캐시를 미리 채워둬서
 *       탭 진입 시 체감 로딩 시간을 줄인다.
 *
 * 즉시 1회 + 1.5초 뒤 1회 더 요청하는 이유:
 *   보상 지급 시점에 서버 반영이 아직 안 끝났을 수 있어(예: 로컬에서만
 *   처리되는 출석 체크), 한 번만 요청하면 여전히 이전 값을 받아올 수 있다.
 *   짧은 지연 후 한 번 더 요청해 반영 지연에 대비한다.
 *
 * refetchQueries가 아닌 prefetchQuery를 쓰는 이유:
 *   refetchQueries는 캐시에 기존 쿼리가 있어야만 동작한다. 신규 가입 유저나
 *   로그아웃 후 재로그인(캐시 전체 삭제됨) 직후처럼 캐릭터 탭에 한 번도
 *   들어간 적 없어 캐시가 비어있는 경우엔 아무 일도 하지 않으므로, 캐시
 *   유무와 무관하게 항상 요청하는 prefetchQuery를 사용한다.
 *
 * 사용처: 일일 출석 체크(MissionScreen), 글 읽기 보상(ArticleDetailScreen),
 *         퀴즈 보상(QuizScreen) — 포인트/경험치 지급 직후 호출
 */
export const prefetchCharacterAfterReward = () => {
  const run = () => {
    // prefetchQuery는 에러가 나도 throw하지 않아 화면 로직에 영향을 주지 않는다.
    queryClient.prefetchQuery({
      queryKey: characterKeys.me(),
      queryFn: fetchCharacterMe,
      staleTime: 0, // 캐시 신선도 무시하고 항상 새로 요청
    });
    queryClient.prefetchQuery({
      queryKey: characterKeys.data(),
      queryFn: fetchCharacterData,
      staleTime: 0,
    });
  };

  run();
  setTimeout(run, 1500);
};

// ─────────────────────────────────────────────────────────────
// 변환 함수 re-export
// ─────────────────────────────────────────────────────────────

/**
 * characterApi의 변환 함수를 훅과 함께 사용할 수 있도록 re-export
 *
 * - convertWeeklyAttendanceToAttendanceData : WeeklyAttendance → AttendanceData[]
 * - convertCharacterMissionToMission        : CharacterMission → 화면용 미션 객체
 */
export {
  convertWeeklyAttendanceToAttendanceData,
  convertCharacterMissionToMission,
};
