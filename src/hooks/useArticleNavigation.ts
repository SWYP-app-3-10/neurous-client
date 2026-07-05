/**
 * 아티클 클릭 및 네비게이션 처리 커스텀 훅
 *
 * 아티클 카드 클릭 시 접근 권한 확인 → 모달 표시 → 화면 이동까지의
 * 전체 흐름을 통합 관리함.
 *
 * [처리 흐름]
 * 아티클 클릭
 *   ↓
 * fetchContentAccess로 접근 권한 확인
 *   ↓ 이미 읽은 글       → ReadArticleDetail 이동 (접근 권한 확인 생략)
 *   ↓ 무료 열람 가능     → ArticleDetail 이동 (openType: 'free')
 *   ↓ 포인트 충분        → "새 글 읽기" 모달 → 포인트 구매 → ArticleDetail 이동
 *   ↓ 포인트 부족        → "광고 시청" 모달  → AdLoading 이동
 *   ↓ 에러 발생          → Alert 표시
 */
import React, { useCallback, useRef } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useShowModal, useHideModal } from '../store/modalStore';
import { RouteNames } from '../../routes';
import { RootStackParamList } from '../navigation/types';
import { ARTICLE_READ_POINT_COST } from '../config/rewards';
import {
  ArticlePointModalContent,
  ArticlePointModalContentGet,
} from '../components/ArticlePointModalContent';
import { COLORS } from '../styles/global';
import { Heading_16B } from '../styles/typography';
import {
  fetchContentAccess,
  purchaseContentWithPoint,
} from '../api/missionApi';
import { getUserInfo } from '../services/authService';
import { usePointStore } from '../store/pointStore';
import { logEvent, logScreenView } from '../services/analyticsService';

/**
 * 아티클 읽기 후 돌아갈 화면
 * - 'mission' : 미션 화면
 * - 'search'  : 검색 화면
 */
type ReturnTo = 'mission' | 'search';

/**
 * useArticleNavigation 훅 옵션
 *
 * @property returnTo  아티클 읽기 완료 후 돌아갈 화면
 */
interface UseArticleNavigationOptions {
  returnTo: ReturnTo;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * 아티클 클릭 및 네비게이션 처리 커스텀 훅
 *
 * [중복 호출 방지]
 * isProcessingRef를 사용해 동일 아티클에 대한 중복 클릭을 차단함.
 * state가 아닌 ref를 쓰는 이유: 리렌더링 없이 즉시 값을 갱신해야 하기 때문.
 *
 * [포인트 우선순위]
 * fetchContentAccess 응답의 currentPoints를 우선 사용하고,
 * 값이 없으면 pointStore의 로컬 포인트를 fallback으로 사용함.
 *
 * @param returnTo  아티클 읽기 완료 후 돌아갈 화면 ('mission' | 'search')
 * @returns         handleArticlePress — 아티클 카드에 연결할 클릭 핸들러
 */
export const useArticleNavigation = ({
  returnTo,
}: UseArticleNavigationOptions): {
  handleArticlePress: (articleId: number, isRead?: boolean) => void;
} => {
  const navigation = useNavigation<NavigationProp>();
  const showModal = useShowModal();
  const hideModal = useHideModal();

  // 중복 클릭 방지 플래그 (state 대신 ref 사용 — 리렌더링 없이 즉시 갱신)
  const isProcessingRef = useRef(false);
  const { points: storePoints } = usePointStore();

  /**
   * 아티클 카드 클릭 핸들러
   *
   * [처리 순서]
   * 1. 이미 읽은 글이면 ReadArticleDetailScreen으로 바로 이동
   * 2. 중복 클릭 방지 (isProcessingRef)
   * 3. 유저 정보 조회
   * 4. fetchContentAccess로 접근 권한 및 포인트 확인
   * 5-A. readable === true → 무료 열람권 / 이미 구매한 글 → ArticleDetail 이동
   * 5-B. 포인트 충분 → 포인트 사용 확인 모달 → 구매 후 ArticleDetail 이동
   * 5-C. 포인트 부족 → 광고 시청 안내 모달 → AdLoading 이동
   */
  const handleArticlePress = useCallback(
    async (articleId: number, isRead?: boolean) => {
      // 이미 읽은 글이면 접근 권한 확인 없이 바로 이동
      if (isRead === true) {
        console.log(
          '[useArticleNavigation] 이미 읽은 글 → ReadArticleDetailScreen 이동',
        );
        navigation.navigate(RouteNames.FULL_SCREEN_STACK, {
          screen: RouteNames.READ_ARTICLE_DETAIL,
          params: {
            articleId,
          },
        });
        return;
      }

      // 이전 요청이 아직 처리 중이면 무시 (빠른 연속 클릭 방지)
      if (isProcessingRef.current) {
        console.log('[useArticleNavigation] 이미 처리 중, 중복 호출 방지');
        return;
      }

      isProcessingRef.current = true;

      try {
        const userInfo = await getUserInfo();
        if (!userInfo) {
          Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
          return;
        }

        // 접근 권한 확인: 읽기 가능 여부 + 현재 포인트 조회
        const accessResponse = await fetchContentAccess(
          userInfo.userId,
          articleId,
        );

        const accessData = accessResponse.data;

        // API 응답의 currentPoints가 없으면 pointStore 로컬 값으로 fallback
        const currentPoints =
          accessData.currentPoints !== undefined
            ? accessData.currentPoints
            : storePoints;

        console.log('[useArticleNavigation] 포인트 확인:', {
          accessData,
          apiPoints: accessData.currentPoints,
          storePoints,
          currentPoints,
        });

        /**
         * readable === true: 추가 결제 없이 바로 읽을 수 있는 글
         * - 무료 열람권 잔여 횟수 있음 (accessType: null)
         * - 이미 포인트/광고로 구매한 글
         */
        if (accessData.readable) {
          navigation.navigate(RouteNames.FULL_SCREEN_STACK, {
            screen: RouteNames.ARTICLE_DETAIL,
            params: {
              articleId,
              returnTo,
              openType: 'free',
            },
          });

          isProcessingRef.current = false; // 네비게이션 완료 후 클릭 허용
          return;
        }

        if (currentPoints >= ARTICLE_READ_POINT_COST) {
          // ───────────────────────────────────────────
          // 포인트 충분 → 포인트 사용 확인 모달
          // ───────────────────────────────────────────
          await logScreenView('Popup_Reading', undefined, true);
          isProcessingRef.current = false; // 모달 표시 시점에 처리 완료 → 모달 내 버튼 클릭 허용

          showModal({
            title: '새로운 글을 읽으시겠어요?',
            description: `사용 가능한 포인트: ${currentPoints}p`,
            descriptionColor: COLORS.gray600,
            closeButton: true,
            children: React.createElement(ArticlePointModalContent),
            primaryButton: {
              title: '새 글 읽기',
              textStyle: Heading_16B,
              onPress: async () => {
                // 모달 내 버튼도 중복 클릭 방지
                if (isProcessingRef.current) {
                  console.log(
                    '[useArticleNavigation] 포인트 구매 이미 처리 중, 중복 호출 방지',
                  );
                  // 처리 중 로딩 모달로 교체
                  showModal({
                    title: '처리 중...',
                    children: React.createElement(
                      View,
                      { style: { paddingVertical: 20, alignItems: 'center' } },
                      React.createElement(ActivityIndicator, {
                        size: 'large',
                        color: COLORS.puple.main,
                      }),
                    ),
                    closeButton: false,
                    closeOnBackdropPress: false,
                  });
                  logEvent('ReadNewArticle_Popup_Reading');
                  return;
                }

                isProcessingRef.current = true;

                // 구매 처리 중 로딩 모달 표시
                showModal({
                  title: '처리 중...',
                  children: React.createElement(
                    View,
                    { style: { paddingVertical: 20, alignItems: 'center' } },
                    React.createElement(ActivityIndicator, {
                      size: 'large',
                      color: COLORS.puple.main,
                    }),
                  ),
                  closeButton: false,
                  closeOnBackdropPress: false,
                });

                try {
                  const purchaseUserInfo = await getUserInfo();
                  if (!purchaseUserInfo) {
                    hideModal();
                    Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
                    isProcessingRef.current = false;
                    return;
                  }

                  // 포인트 차감 및 읽기 권한 부여
                  const purchaseResponse = await purchaseContentWithPoint(
                    purchaseUserInfo.userId,
                    articleId,
                  );

                  console.log(
                    '[useArticleNavigation] 포인트 구매 응답:',
                    purchaseResponse,
                  );

                  // 구매 성공 → ArticleDetail 화면으로 이동
                  navigation.navigate(RouteNames.FULL_SCREEN_STACK, {
                    screen: RouteNames.ARTICLE_DETAIL,
                    params: {
                      articleId,
                      returnTo,
                      openType: 'point',
                    },
                  });
                } catch (error: any) {
                  console.error(
                    '[useArticleNavigation] 포인트 구매 에러:',
                    error,
                  );
                  hideModal();
                  Alert.alert(
                    '오류',
                    error.response?.data?.message ||
                      '포인트 구매에 실패했습니다.',
                  );
                } finally {
                  hideModal();
                  // 네비게이션 완료 후 1초 뒤 플래그 리셋 (연속 클릭 방지)
                  setTimeout(() => {
                    isProcessingRef.current = false;
                  }, 1000);
                }
              },
            },
          });
        } else {
          // ───────────────────────────────────────────
          // 포인트 부족 → 광고 시청 안내 모달
          // ───────────────────────────────────────────
          await logScreenView('Popup_Advertisement', undefined, true);
          isProcessingRef.current = false; // 모달 표시 시점에 처리 완료 → 모달 내 버튼 클릭 허용

          showModal({
            title: '광고를 보고 포인트 받으시겠어요?',
            description: `부족한 포인트:${ARTICLE_READ_POINT_COST - currentPoints}p`,
            descriptionColor: COLORS.gray600,
            closeButton: true,
            children: React.createElement(ArticlePointModalContentGet),
            primaryButton: {
              title: '포인트 받고 글 읽기',
              textStyle: Heading_16B,
              onPress: () => {
                logEvent('GetAndRead_Popup_Advertisement');
                // 광고 로딩 화면으로 이동 (광고 시청 완료 후 아티클 접근)
                navigation.navigate(RouteNames.FULL_SCREEN_STACK, {
                  screen: RouteNames.AD_LOADING,
                  params: {
                    articleId,
                    returnTo,
                  },
                });
              },
            },
          });
        }
      } catch (error: any) {
        console.error('[useArticleNavigation] 에러:', error);
        isProcessingRef.current = false; // fetchContentAccess 에러 시 즉시 리셋 → 재시도 가능
        Alert.alert('오류', '글 접근 권한을 확인하는 중 오류가 발생했습니다.');
      }
    },
    [showModal, hideModal, navigation, returnTo, storePoints],
  );

  return { handleArticlePress };
};
