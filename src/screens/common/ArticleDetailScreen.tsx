/**
 * 글 상세 화면 (ArticleDetailScreen.tsx)
 *
 * 사용자가 선택한 글의 전체 내용을 표시하고, 퀴즈 풀기 화면으로 이동할 수 있다.
 *
 * 주요 기능:
 *   1. 글 내용 표시 (API로 조회)
 *   2. 광고를 통해 열린 글인 경우 토스트 메시지 표시
 *   3. 글 읽기 보상 지급 (경험치만, 퀴즈로 이어지지 않고 이탈할 때 지급)
 *   4. 퀴즈 화면으로 이동
 *
 * 보상 처리 방식 (트리거 시점이 핵심):
 *   - 글 읽기 보상(5xp)은 "화면 진입 시"가 아니라 "퀴즈를 풀지 않고 이 화면을 벗어날 때" 지급된다.
 *     * fetchContentDetail 호출 자체가 서버의 "완독 처리"를 겸하고 있어서
 *       (마이페이지 읽은 글 목록에 퀴즈 미응시 글도 표시되는 이유), 별도 서버 API 없이
 *       클라이언트에서 보상만 로컬로 지급한다.
 *     * 퀴즈 풀기 버튼을 눌러 이동한 경우(wentToQuizRef): 팝업 없이 조용히 5xp만 store에 반영.
 *       이후 QuizScreen에서 정답/오답 팝업이 뜨는데, 그 팝업의 25XP/15XP는 이 5xp를 포함한
 *       합산값(=서버가 주는 퀴즈 보상 + 여기서 조용히 더한 5xp)이므로 별도 팝업을 띄우지 않는다.
 *     * 퀴즈로 이어지지 않고 뒤로가기 등으로 이탈한 경우: 경험치 획득 팝업을 띄우며 5xp 지급.
 *     * 이동 방식과 무관하게 React Navigation 스택 구조상 퀴즈로 push해도 이 화면은
 *       언마운트되지 않고 blur만 되므로, useFocusEffect의 cleanup으로 이탈을 감지한다.
 *     * AsyncStorage에 글 ID별로 지급 여부를 기록해 중복 지급 방지 (퀴즈 경로/이탈 경로 공통 dedup)
 *   - 퀴즈 자체 보상(서버값)은 QuizScreen에서 퀴즈 제출 성공 시 별도로 지급 (이 화면과 무관, 그대로 유지)
 *
 * 제거된 기능:
 *   - 난이도별 읽기 시간 타이머
 *   - 읽기 시간 감지
 *   - 타이머 기반 완독 처리
 *   - 화면 포커스 기반 타이머 제어
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  RouteProp,
} from '@react-navigation/native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import { Body_16M, Heading_20EB_Round } from '../../styles/typography';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Spacer from '../../components/Spacer';
import { RouteNames } from '../../../routes';
import { FullScreenStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useShowToastModal, useShowModal } from '../../store/modalStore';
import { fetchContentDetail, ContentDetail } from '../../api/missionApi';
import { getUserInfo } from '../../services/authService';
import ArticleContent from '../../components/ArticleContent';
import { logEvent } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';
import { useOnboardingStore } from '../../store/onboardingStore';
import { LevelCategoryNames } from '../../types/interests';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useExperienceStore } from '../../store/experienceStore';
import { ExperienceModalContent } from '../../components/ArticlePointModalContent';
import { Modal_IMG } from '../../icons';
import { ARTICLE_READ_EXPERIENCE } from '../../config/rewards';
import { prefetchCharacterAfterReward } from '../../hooks/useCharacter';
import { prefetchPointHistoryAfterReward } from '../../hooks/usePointHistory';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

type NavigationProp = NativeStackNavigationProp<FullScreenStackParamList>;
type ArticleDetailRouteProp = RouteProp<
  FullScreenStackParamList,
  typeof RouteNames.ARTICLE_DETAIL
>;

const ArticleDetailScreen = () => {
  const route = useRoute<ArticleDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const showToastModal = useShowToastModal();
  const showModal = useShowModal();
  const { addExperience } = useExperienceStore();

  // ──────────────────────────────────────────────
  // Route Params (타입 안전)
  // ──────────────────────────────────────────────

  /** 표시할 글 ID */
  const articleId = route.params.articleId;

  /** 글을 읽은 후 돌아갈 화면 ('mission' | 'search') */
  const returnTo = route.params.returnTo;

  /** 홈(미션) 화면에서 진입했는지 여부 — 서버 미션 달성 카운트 처리에 사용 */
  const isFromHome = returnTo === 'mission';

  /**
   * 글 오픈 방식
   * free : 무료 열람권
   * ad : 광고 시청 후 열람
   * point : 포인트 사용 열람
   */
  const openType = route.params.openType;

  /** 진입 경로 (Mixpanel article_start의 entry_source) */
  const entrySource = route.params.entrySource;

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /** 글 상세 내용 (API 응답 데이터) */
  const [contentDetail, setContentDetail] = useState<ContentDetail | null>(
    null,
  );

  /** 글 로딩 중 여부 */
  const [isLoading, setIsLoading] = useState(true);

  /** 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  // ──────────────────────────────────────────────
  // Refs (글 읽기 보상 트리거 제어)
  // ──────────────────────────────────────────────

  /**
   * 글 상세 API가 성공적으로 로드됐는지 여부
   *
   * 로드 실패/에러 상태로 화면을 벗어날 때는 보상을 지급하지 않기 위한 가드
   */
  const hasLoadedContentRef = useRef(false);

  /**
   * "퀴즈 풀기" 버튼을 눌러서 이동했는지 여부
   *
   * true면 화면 이탈(blur) 시 별도 글 읽기 보상 팝업을 띄우지 않는다.
   * (퀴즈 풀기 버튼을 누른 시점에 이미 조용히 5xp가 지급된 상태이며,
   *  이어지는 QuizScreen의 정답/오답 팝업이 이 5xp를 포함한 합산값을 보여준다)
   */
  const wentToQuizRef = useRef(false);

  // ──────────────────────────────────────────────
  // 글 읽기 보상 지급 함수
  // ──────────────────────────────────────────────

  /**
   * 글 읽기 보상(경험치 5xp)을 지급한다.
   *
   * 트리거 시점 (화면 진입 시가 아님에 주의):
   *   1. 퀴즈 풀기 버튼을 눌러 이동하는 시점 → silent: true (팝업 없이 조용히 store에만 반영,
   *      QuizScreen의 정답/오답 팝업이 이 5xp를 포함한 합산값을 표시하기 때문)
   *   2. 퀴즈로 이어지지 않고 화면을 벗어나는 시점(useFocusEffect cleanup) → silent: false
   *      (경험치 획득 팝업을 띄우며 지급)
   *
   * 같은 글은 평생 한 번만 지급되도록 AsyncStorage로 dedup 처리하며,
   * 이 dedup은 퀴즈 경로/이탈 경로 양쪽에 공통으로 적용된다.
   */
  const grantArticleReadReward = useCallback(
    async (options: { silent: boolean }) => {
      if (!articleId || !contentDetail) {
        return;
      }

      const readRewardKey = `@article_read_reward_${articleId}`;
      const alreadyRewarded = await AsyncStorage.getItem(readRewardKey);
      if (alreadyRewarded) {
        return;
      }

      await AsyncStorage.setItem(readRewardKey, 'true');
      addExperience(ARTICLE_READ_EXPERIENCE);

      // 캐릭터 탭 진입 전 미리 최신 정보를 백그라운드로 받아둠 (silent 여부와 무관하게
      // 경험치는 이미 지급됐으므로 두 경로 모두에서 호출)
      prefetchCharacterAfterReward();
      // "받은 내역 확인하기" 화면도 같은 시점에 함께 프리페치
      prefetchPointHistoryAfterReward();

      if (options.silent) {
        // 퀴즈로 이어지는 경로: 팝업/분석 이벤트 없이 store에만 조용히 반영
        // (퀴즈 결과 팝업 쪽에서 합산된 값을 보여주므로 여기서 별도로 노출하지 않는다)
        return;
      }

      // Mixpanel: 보상 팝업 노출 (글 읽기, 퀴즈로 이어지지 않은 경우)
      trackEvent('reward_popup_view', {
        article_id: articleId,
        category: contentDetail.categoryName,
        reward_type: 'xp',
        reward_source: 'article_read',
        xp_amount: ARTICLE_READ_EXPERIENCE,
        point_amount: 0,
      });

      // 글 읽기 보상 팝업 표시 (경험치만, 포인트 없음)
      // 시안 지시대로 배경 터치로는 닫히지 않도록 처리 (확인 버튼으로만 닫힘)
      showModal({
        title: '경험치 획득!',
        image: <Modal_IMG />,
        titleStyle: {
          ...Heading_20EB_Round,
        },
        titleDescriptionGapSize: scaleWidth(20),
        closeOnBackdropPress: false,
        children: React.createElement(ExperienceModalContent, {
          articleRead: true,
        }),
        primaryButton: { title: '확인', onPress: () => {} },
      });
    },
    [articleId, contentDetail, addExperience, showModal],
  );

  // ──────────────────────────────────────────────
  // Effect 1: 글 상세 정보 API 조회
  // ──────────────────────────────────────────────

  /**
   * 화면 진입 시 글 상세 정보를 API로 조회한다.
   *
   * 처리 흐름:
   *   1. articleId 유효성 검사
   *   2. getUserInfo()로 현재 사용자 정보 조회
   *   3. fetchContentDetail() API 호출
   *   4. 응답 데이터를 contentDetail 상태에 저장
   *
   * 에러 처리:
   *   - articleId 없음: "컨텐츠 ID가 없습니다" 에러
   *   - 사용자 정보 없음: "사용자 정보를 찾을 수 없습니다" 에러
   *   - API 실패: "글을 불러오는데 실패했습니다" 에러
   *
   * 주의: 이 Effect는 API 조회와 article_start 트래킹만 담당한다.
   * 글 읽기 보상 지급은 여기서 하지 않고, 퀴즈 이동/화면 이탈 시점에 처리한다
   * (grantArticleReadReward 참고).
   */
  useEffect(() => {
    const loadContentDetail = async () => {
      if (!articleId) {
        setError('컨텐츠 ID가 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const userInfo = await getUserInfo();
        if (!userInfo || !userInfo.userId) {
          setError('사용자 정보를 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }

        const response = await fetchContentDetail(
          userInfo.userId,
          articleId,
          isFromHome,
        );
        if (response.data) {
          setContentDetail(response.data);
          hasLoadedContentRef.current = true;

          // Mixpanel: 콘텐츠 상세 페이지 진입
          const userDifficulty = useOnboardingStore.getState().difficulty;
          trackEvent('article_start', {
            article_id: articleId,
            category: response.data.categoryName,
            difficulty: userDifficulty
              ? LevelCategoryNames[userDifficulty]
              : null,
            entry_source: entrySource,
          });
        }
      } catch (err: any) {
        console.error('[글 상세] 로드 실패:', err);
        setError('글을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadContentDetail();
  }, [articleId, isFromHome, entrySource]);

  // ──────────────────────────────────────────────
  // Effect 1-1: 화면 이탈 시 글 읽기 보상 지급 (퀴즈로 이어지지 않은 경우)
  // ──────────────────────────────────────────────

  /**
   * 이 화면이 포커스를 잃을 때(blur) 글 읽기 보상을 지급한다.
   *
   * useFocusEffect의 cleanup을 쓰는 이유:
   *   - React Navigation 스택 구조상 퀴즈 화면으로 push해도 이 화면은 언마운트되지 않고
   *     blur만 되므로, 일반 useEffect의 unmount cleanup으로는 감지할 수 없다.
   *   - 뒤로가기(pop)든 퀴즈로 이동(push)이든 전부 blur를 거치므로 이 cleanup 하나로
   *     "화면을 벗어나는 모든 경우"를 감지할 수 있다.
   *
   * wentToQuizRef로 분기:
   *   - 퀴즈로 이동한 경우: 이미 handlePressQuizButton에서 조용히 지급했으므로 여기서는 스킵
   *   - 그 외 이탈(뒤로가기 등): 여기서 팝업과 함께 지급
   */
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!wentToQuizRef.current && hasLoadedContentRef.current) {
          grantArticleReadReward({ silent: false });
        }
      };
    }, [grantArticleReadReward]),
  );

  // ──────────────────────────────────────────────
  // Effect 2: 열린 글 토스트 메시지 표시
  // ──────────────────────────────────────────────

  /**
   * 글 오픈 방식에 따라 토스트 메시지를 다르게 표시한다.
   *
   * free  :
   *   - 무료 열람권 사용
   *   - 현재는 토스트 표시하지 않음
   *
   * ad :
   *   - 광고 시청 후 글 열람
   *   - 광고 보상 + 포인트 사용 안내 표시
   *
   * point :
   *   - 포인트만 사용하여 글 열람
   *   - 포인트 차감 안내 표시
   */
  useEffect(() => {
    let message = '';

    switch (openType) {
      case 'ad':
        message = '60P 획득! 🥳 · 30P를 사용해 글을 열었어요';
        break;

      case 'point':
        message = '30P를 사용해 글을 열었어요';
        break;

      case 'free':
        message = '무료 열람권을 사용해 글을 열었어요';
        break;
      default:
        return;
    }

    showToastModal({
      message,
      position: 'bottom',
      duration: 2200,
      backgroundColor: COLORS.gray800,
      borderColor: COLORS.gray800Stroke,
      borderWidth: 1,
      width: scaleWidth(353),
      borderRadius: BORDER_RADIUS[16],
      paddingVertical: scaleWidth(18),
      paddingHorizontal: scaleWidth(20),
      messageStyle: {
        ...Body_16M,
        color: COLORS.white,
        textAlign: 'left',
      },
      bottomOffset: scaleWidth(20),
    });
  }, [openType, showToastModal]);

  // ──────────────────────────────────────────────
  // 퀴즈 풀기 버튼 처리
  // ──────────────────────────────────────────────

  /**
   * "퀴즈 풀기" 버튼을 눌렀을 때 실행된다.
   *
   * 처리 흐름:
   *   1. analytics 이벤트 기록
   *   2. wentToQuizRef를 true로 세팅 (화면 이탈 시 별도 글 읽기 팝업이 뜨지 않도록)
   *   3. 글 읽기 보상(5xp)을 조용히(팝업 없이) 지급 — QuizScreen의 정답/오답 팝업이
   *      이 5xp를 포함한 합산값을 보여주므로 여기서 별도로 노출하지 않는다
   *   4. 퀴즈 화면으로 이동
   *
   * 주의:
   *   - 완독 체크(서버)와 퀴즈 자체의 보상 지급은 QuizScreen의 퀴즈 제출 버튼에서 처리한다.
   */
  const handlePressQuizButton = () => {
    logEvent('StartQuiz_Reading');

    wentToQuizRef.current = true;
    grantArticleReadReward({ silent: true });

    navigation.navigate(RouteNames.QUIZ, {
      articleId,
      returnTo: returnTo || 'mission',
    });
  };

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  /**
   * 글 상세 API 호출 중에는 로딩 화면을 표시한다.
   */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header iconColor={COLORS.gray800} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.puple.main} />
          <Spacer num={16} />
          <Text>글을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * 에러가 발생했거나 글 상세 데이터가 없는 경우 에러 화면을 표시한다.
   */
  if (error || !contentDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <Header iconColor={COLORS.gray800} />
        <View style={styles.errorContainer}>
          <Text>{error || '기사를 찾을 수 없습니다.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * 글 상세 데이터가 정상적으로 로드된 경우 본문과 퀴즈 버튼을 표시한다.
   */
  return (
    <SafeAreaView style={styles.container}>
      <Header
        iconColor={COLORS.gray800}
        backEventName="Back_ConfirmStandard_Reading"
      />

      <ScrollView
        bounces={false}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 글 본문 */}
        <ArticleContent content={contentDetail} showReconstructedBanner />
        <Spacer num={48} />
      </ScrollView>

      {/* 퀴즈 화면으로 이동 */}
      <Button
        title="퀴즈 풀기"
        onPress={handlePressQuizButton}
        variant="primary"
        style={styles.quizButton}
      />
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  /** 전체 화면 컨테이너 */
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  /** 글 본문 스크롤 영역 */
  scrollView: {
    flex: 1,
  },

  /** ScrollView 내부 컨텐츠 영역 */
  content: {},

  /** 로딩 화면 컨테이너 */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /** 에러 화면 컨테이너 */
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },

  /** 하단 퀴즈 풀기 버튼 */
  quizButton: {
    marginHorizontal: scaleWidth(20),
  },
});

export default ArticleDetailScreen;
