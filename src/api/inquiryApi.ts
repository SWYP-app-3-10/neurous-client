/**
 * 문의하기 관련 API
 */
import client from './client';

export interface InquiryRequest {
  content: string;
  replyEmail: string;
}

export interface InquiryResponse {
  status: number;
  message: string;
}

/**
 * 문의 등록 API
 * @param userId 사용자 ID (query parameter)
 * @param request 문의 내용 및 답변 이메일
 * @returns Promise<InquiryResponse>
 */
export const createInquiry = async (
  userId: number,
  request: InquiryRequest,
): Promise<InquiryResponse> => {
  try {
    console.log('[문의하기 API] 요청 시작:', { userId, request });

    const response = await client.post<InquiryResponse>(
      `/api/inquiry/ask?userId=${userId}`,
      request,
    );

    console.log('[문의하기 API] 응답 성공:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('[문의하기 API] 에러:', error);
    if (error.response) {
      console.error('[문의하기 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};
