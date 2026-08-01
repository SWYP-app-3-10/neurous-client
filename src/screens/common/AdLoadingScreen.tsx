/**
 * 광고 로딩 화면 (AdLoadingScreen.tsx)
 *
 * 리워드 광고를 표시하고, 광고 시청 완료 시 콘텐츠를 구매하여 열어주는 화면이다.
 *
 * 처리 흐름:
 *   1. 화면 진입 시 리워드 광고 자동 로드
 *   2. 광고 로드 완료 시 자동으로 광고 표시
 *   3. 사용자가 광고를 끝까지 시청하면 보상 획득
 *   4. 보상 획득 시 포인트 추가 + 서버에 콘텐츠 구매 요청
 *   5. 구매 성공 시 ArticleDetailScreen으로 이동
 *
 * 예외 처리:
 *   - 광고 로드 실패: 에러 알림 후 뒤로가기
 *   - 10초 타임아웃: 타임아웃 알림 후 뒤로가기
 *   - 광고 중간 이탈: "끝까지 시청해야 포인트 획득" 알림 후 뒤로가기
 *   - 콘텐츠 구매 실패: 에러 알림 후 뒤로가기
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRewardedAd } from 'react-native-google-mobile-ads';
import { COLORS } from '../../styles/global';
import { FullScreenStackParamList } from '../../navigation/types';
import { RouteNames } from '../../../routes';
import { usePointStore } from '../../store/pointStore';
import { AD_REWARD_POINTS } from '../../config/rewards';
import { purchaseContentWithAd } from '../../api/missionApi';
import { getUserInfo } from '../../services/authService';
import { REWARDED_AD_UNIT_ID } from '../../config/adConfig';
import { trackEvent } from '../../services/mixpanelService';

type NavigationProp = NativeStackNavigationProp<FullScreenStackParamList>;

const AdLoadingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { addPoints } = usePointStore();

  // ──────────────────────────────────────────────
  // Route Params
  // ──────────────────────────────────────────────

  /** 광고를 보고 열고자 하는 글 ID */
  const articleId = (route.params as FullScreenStackParamList['ad-loading'])
    ?.articleId as number;

  /** 글을 읽은 후 돌아갈 화면 ('mission' | 'search' 등) */
  const returnTo = (route.params as FullScreenStackParamList['ad-loading'])
    ?.returnTo;

  /** 진입 경로 (Mixpanel article_start용, ArticleDetail로 전달) */
  const entrySource = (route.params as FullScreenStackParamList['ad-loading'])
    ?.entrySource;

  // ──────────────────────────────────────────────
  // 리워드 광고 훅
  // ──────────────────────────────────────────────

  /**
   * Google AdMob 리워드 광고 훅
   *
   * - isLoaded: 광고 로드 완료 여부
   * - isClosed: 광고 닫힘 여부 (시청 완료 또는 중간 이탈 모두 포함)
   * - load: 광고 로드 함수
   * - show: 광고 표시 함수
   * - reward: 보상 객체 (광고를 끝까지 시청하면 설정됨)
   * - error: 광고 로드 에러
   *
   * requestNonPersonalizedAdsOnly: 개인화되지 않은 광고만 요청 (GDPR 준수)
   */
  const { isLoaded, isClosed, load, show, reward, error } = useRewardedAd(
    REWARDED_AD_UNIT_ID,
    {
      requestNonPersonalizedAdsOnly: true,
    },
  );

  // ──────────────────────────────────────────────
  // State & Refs
  // ──────────────────────────────────────────────

  /** 광고가 현재 표시 중인지 여부 */
  const [isAdShowing, setIsAdShowing] = useState(false);

  /** 사용자가 보상을 획득했는지 여부 (광고 끝까지 시청 완료) */
  const [hasEarnedReward, setHasEarnedReward] = useState(false);

  /** 포인트를 이미 추가했는지 여부 (중복 방지) */
  const hasAddedPointsRef = useRef(false);

  /** 콘텐츠를 이미 구매했는지 여부 (중복 API 호출 방지) */
  const hasPurchasedRef = useRef(false);

  /** 광고 로드 타임아웃 타이머
   * React Native 환경에서는 NodeJS.Timeout 대신
   * ReturnType<typeof setTimeout> 사용
   */
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 에러 알림을 이미 표시했는지 여부 (중복 알림 방지) */
  const hasShownErrorRef = useRef(false);

  // ──────────────────────────────────────────────
  // Effect 1: 보상 감지
  // ──────────────────────────────────────────────

  /**
   * 리워드 광고 보상 감지
   *
   * reward 객체가 설정되면 사용자가 광고를 끝까지 시청한 것으로 간주한다.
   * hasEarnedReward 상태를 true로 설정하여 포인트 추가 및 콘텐츠 구매 흐름을 트리거한다.
   */
  useEffect(() => {
    if (reward) {
      setHasEarnedReward(true);
    }
  }, [reward]);

  // ──────────────────────────────────────────────
  // Effect 2: 광고 로드 에러 처리
  // ──────────────────────────────────────────────

  /**
   * 광고 로드 에러 처리
   *
   * 광고 로드 실패 시 사용자에게 알림을 표시하고 뒤로 간다.
   * hasShownErrorRef로 중복 알림을 방지한다.
   *
   * 에러 원인:
   *   - 네트워크 연결 불량
   *   - 광고 인벤토리 부족
   *   - AdMob 설정 오류
   */
  useEffect(() => {
    if (error && !hasShownErrorRef.current) {
      hasShownErrorRef.current = true;
      console.error('[AdLoadingScreen] 광고 로드 에러:', error);

      // 타임아웃 타이머 정리
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      Alert.alert(
        '오류',
        '광고를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.',
        [
          {
            text: '확인',
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );
    }
  }, [error, navigation]);

  // ──────────────────────────────────────────────
  // Effect 3: 광고 로드 및 타임아웃
  // ──────────────────────────────────────────────

  /**
   * 화면 진입 시 광고 자동 로드 및 타임아웃 설정
   *
   * 처리:
   *   1. 광고가 아직 로드되지 않았고 에러가 없으면 load() 호출
   *   2. 10초 타임아웃 설정 (광고 로드가 너무 오래 걸리는 경우 대비)
   *   3. 타임아웃 발생 시 알림 표시 후 뒤로가기
   *
   * cleanup:
   *   - 컴포넌트 언마운트 시 타이머 정리
   */
  useEffect(() => {
    if (!isLoaded && !error) {
      load();

      // 10초 타임아웃 설정
      loadTimeoutRef.current = setTimeout(() => {
        if (!isLoaded && !hasShownErrorRef.current) {
          hasShownErrorRef.current = true;
          console.error('[AdLoadingScreen] 광고 로드 타임아웃');
          Alert.alert(
            '오류',
            '광고를 불러오는 데 시간이 오래 걸립니다. 다시 시도해주세요.',
            [
              {
                text: '확인',
                onPress: () => {
                  navigation.goBack();
                },
              },
            ],
          );
        }
      }, 10000); // 10초
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [isLoaded, load, error, navigation]);

  // ──────────────────────────────────────────────
  // Effect 4: 광고 자동 표시
  // ──────────────────────────────────────────────

  /**
   * 광고 로드 완료 시 자동으로 광고를 표시한다.
   *
   * 조건:
   *   - isLoaded: 광고 로드 완료
   *   - !isAdShowing: 광고가 아직 표시되지 않음 (중복 표시 방지)
   *   - !error: 에러가 없음
   *
   * 처리:
   *   1. 타임아웃 타이머 정리 (로드 완료되었으므로)
   *   2. isAdShowing을 true로 설정
   *   3. 상태 리셋 (새 광고 시청 준비)
   *   4. show() 호출하여 광고 표시
   *
   * 에러 처리:
   *   - 광고 표시 실패 시 알림 후 뒤로가기
   */
  useEffect(() => {
    if (isLoaded && !isAdShowing && !error) {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      setIsAdShowing(true);
      setHasEarnedReward(false);
      hasAddedPointsRef.current = false; // 새 광고 시청 시 리셋

      try {
        show();
      } catch (showError) {
        console.error('광고 표시 실패:', showError);
        Alert.alert('오류', '광고를 표시할 수 없습니다.');
        navigation.goBack();
      }
    }
  }, [isLoaded, isAdShowing, show, navigation, error]);

  // ──────────────────────────────────────────────
  // Effect 5: 보상 획득 시 포인트 추가
  // ──────────────────────────────────────────────

  /**
   * 광고 시청 완료 시 포인트를 추가한다.
   *
   * hasAddedPointsRef로 중복 포인트 추가를 방지한다.
   *
   * 주의:
   *   - 포인트는 로컬 상태(pointStore)에만 추가됨
   *   - 서버 동기화는 purchaseContentWithAd API에서 처리
   */
  useEffect(() => {
    if (hasEarnedReward && !hasAddedPointsRef.current) {
      hasAddedPointsRef.current = true;
      addPoints(AD_REWARD_POINTS);

      // Mixpanel: 광고 시청 완료
      trackEvent('ad_watch_complete', {
        article_id: articleId,
      });
    }
  }, [hasEarnedReward, addPoints, articleId]);

  // ──────────────────────────────────────────────
  // Effect 6: 콘텐츠 구매 API 호출
  // ──────────────────────────────────────────────

  /**
   * 광고 시청 완료 후 콘텐츠 구매 API를 호출하고 글 상세 화면으로 이동한다.
   *
   * 조건:
   *   - hasEarnedReward: 보상 획득 완료
   *   - isClosed: 광고가 닫힘 (시청 완료 후 광고창 닫은 상태)
   *   - isAdShowing: 광고가 표시된 적이 있음
   *   - !hasPurchasedRef.current: 아직 구매하지 않음 (중복 API 호출 방지)
   *
   * 처리 흐름:
   *   1. hasPurchasedRef를 true로 설정 (중복 호출 방지)
   *   2. getUserInfo()로 현재 사용자 정보 조회
   *   3. purchaseContentWithAd() API 호출 (서버에 광고 시청 기록 + 콘텐츠 구매)
   *   4. 성공 시 ArticleDetailScreen으로 이동 (replace로 뒤로가기 방지)
   *   5. 실패 시 에러 알림 후 뒤로가기
   *
   * 에러 처리:
   *   - 사용자 정보 없음: 알림 후 뒤로가기
   *   - API 실패: 에러 메시지 알림 후 뒤로가기
   */
  useEffect(() => {
    const handlePurchase = async () => {
      if (
        hasEarnedReward &&
        isClosed &&
        isAdShowing &&
        !hasPurchasedRef.current
      ) {
        hasPurchasedRef.current = true;

        try {
          // 사용자 정보 가져오기
          const userInfo = await getUserInfo();
          if (!userInfo) {
            Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
            navigation.goBack();
            return;
          }

          // 광고로 콘텐츠 구매 API 호출
          const purchaseResponse = await purchaseContentWithAd(
            userInfo.userId,
            articleId,
          );

          console.log('[AdLoadingScreen] 광고 구매 응답:', purchaseResponse);

          // 구매 성공 후 글 상세 화면으로 이동
          // openType: ad -> 광고 시청 후 열린 글
          // replace 사용 -> 뒤로가기 시 광고 화면으로 다시 돌아가지 않도록 처리
          navigation.replace(RouteNames.ARTICLE_DETAIL, {
            articleId,
            returnTo,
            openType: 'ad',
            entrySource,
          });
        } catch (purchaseError: any) {
          console.error('[AdLoadingScreen] 광고 구매 에러:', purchaseError);
          Alert.alert(
            '오류',
            purchaseError.response?.data?.message ||
              '컨텐츠 구매에 실패했습니다.',
          );
          navigation.goBack();
        }
      }
    };

    handlePurchase();
  }, [
    hasEarnedReward,
    isClosed,
    isAdShowing,
    articleId,
    navigation,
    returnTo,
    entrySource,
  ]);

  // ──────────────────────────────────────────────
  // Effect 7: 광고 중간 이탈 처리
  // ──────────────────────────────────────────────

  /**
   * 사용자가 광고를 끝까지 시청하지 않고 중간에 닫은 경우 처리
   *
   * 조건:
   *   - isClosed: 광고가 닫힘
   *   - isAdShowing: 광고가 표시된 적이 있음
   *   - !hasEarnedReward: 보상을 받지 못함 (끝까지 시청 안 함)
   *   - !hasPurchasedRef.current: 아직 구매하지 않음
   *
   * 처리:
   *   - "광고를 끝까지 시청해야 포인트를 받을 수 있습니다" 알림 표시
   *   - 확인 버튼 클릭 시 뒤로가기
   */
  useEffect(() => {
    if (
      isClosed &&
      isAdShowing &&
      !hasEarnedReward &&
      !hasPurchasedRef.current
    ) {
      Alert.alert('알림', '광고를 끝까지 시청해야 포인트를 받을 수 있습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    }
  }, [isClosed, isAdShowing, hasEarnedReward, navigation]);

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  /**
   * 광고 로딩 중 표시할 UI
   *
   * - 로딩 스피너만 표시
   * - 광고가 로드되면 자동으로 전체화면 광고가 표시됨
   */
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.puple.main} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdLoadingScreen;
