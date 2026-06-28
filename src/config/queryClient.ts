import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 매번 최신 데이터를 확인하도록 캐시 데이터를 즉시 stale 상태로 처리
      staleTime: 0,

      // 사용하지 않는 쿼리 캐시는 5분 뒤 메모리에서 제거
      gcTime: 1000 * 60 * 5,

      // 쿼리  실패 시 재시도 여부 설정
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;

        // 401/403은 인증/권한 문제이므로 재시도해도 같은 응답이 반복됨
        // 토큰 재발급은 Axios 인터셉터에서 처리하므로 TanStack Query 재시도 대상에서 제외
        if (status === 401 || status === 403) {
          return false;
        }

        // 그 외 일시적인 네트워크/서버 오류는 최대 1회만 재시도
        return failureCount < 1;
      },

      // 재시도 간격은 지수 백오프 방식으로 증가하되 최대 30초로 제한
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },

    mutations: {
      // mutation은 중복 요청 방지를 위해 자동 재시도하지 않음
      retry: 0,
    },
  },
});
