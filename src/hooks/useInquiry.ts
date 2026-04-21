/**
 * 문의하기 훅
 */
import { useCallback, useState } from 'react';
import { createInquiry, InquiryRequest } from '../api/inquiryApi';
import { getUserInfo } from '../services/authService';

interface UseInquiryProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useInquiry = ({ onSuccess, onError }: UseInquiryProps = {}) => {
  const [isLoading, setIsLoading] = useState(false);

  const submitInquiry = useCallback(
    async (request: InquiryRequest) => {
      try {
        setIsLoading(true);

        const userInfo = await getUserInfo();
        if (!userInfo || !userInfo.userId) {
          console.error('[문의하기] 사용자 정보 없음');
          onError?.(new Error('사용자 정보 없음'));
          return;
        }

        await createInquiry(userInfo.userId, request);

        onSuccess?.();
      } catch (error) {
        console.error('[문의하기] 제출 실패:', error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  return {
    submitInquiry,
    isLoading,
  };
};
