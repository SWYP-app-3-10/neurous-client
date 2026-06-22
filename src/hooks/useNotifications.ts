/**
 * 알림 관련 React Query 훅
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  markNotificationAsRead,
  NotificationItem,
} from '../api/notificationApi';
import { getUserInfo } from '../services/authService';

/**
 * 알림 Query Keys
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: number) => [...notificationKeys.lists(), { userId }] as const,
};

/**
 * 알림 목록 조회 훅
 */
export const useNotifications = () => {
  return useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: async () => {
      const userInfo = await getUserInfo();
      if (!userInfo || !userInfo.userId) {
        throw new Error('사용자 정보가 없음');
      }

      const notifications = await fetchNotifications(userInfo.userId);
      return notifications;
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });
};

/**
 * 알림 읽음 처리 Mutation 훅
 *
 * - 서버에 읽음 처리 API(PATCH) 연동
 * - Optimistic Update로 클릭 즉시 캐시 반영
 * - 실패 시 캐시를 이전 상태로 롤백
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const userInfo = await getUserInfo();
      if (!userInfo || !userInfo.userId) {
        throw new Error('사용자 정보가 없음');
      }

      await markNotificationAsRead(userInfo.userId, notificationId);
      return notificationId;
    },

    // Optimistic Update
    onMutate: async (notificationId: number) => {
      await queryClient.cancelQueries({
        queryKey: notificationKeys.lists(),
      });

      const previousData = queryClient.getQueryData<NotificationItem[]>(
        notificationKeys.lists(),
      );

      queryClient.setQueryData<NotificationItem[]>(
        notificationKeys.lists(),
        old => {
          if (!old || !Array.isArray(old)) return [];

          return old.map(item =>
            item.notificationId === notificationId
              ? { ...item, isRead: true }
              : item,
          );
        },
      );

      return { previousData };
    },

    // 에러 시 롤백: 서버 처리 실패 시 낙관적 업데이트를 되돌림
    onError: (err, _notificationId, context) => {
      console.error('[알림 읽음 처리] 실패, 롤백 처리:', err);

      if (context?.previousData) {
        queryClient.setQueryData(
          notificationKeys.lists(),
          context.previousData,
        );
      }
    },

    onSuccess: () => {
      console.log('[알림 읽음 처리] 완료');
    },
  });
};
