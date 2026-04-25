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

    // 에러 핸들러: err 사용하도록 수정
    onError: err => {
      console.log('[알림 읽음 처리] 로컬만 처리 (정상):', err.message);
      // 백엔드 API 없으므로 롤백하지 않음
    },

    onSuccess: () => {
      console.log('[알림 읽음 처리] 완료');
    },
  });
};
