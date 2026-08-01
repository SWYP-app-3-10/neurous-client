/**
 * 읽은 글 상세 화면 (ReadArticleDetailScreen.tsx)
 *
 * 마이페이지에서 읽은 글 목록을 클릭했을 때 표시되는 화면이다.
 * 이미 읽었던 글의 내용과 풀었던 퀴즈 결과를 함께 보여준다.
 *
 * 주요 기능:
 *   1. 읽은 글 내용 표시 (API로 조회)
 *   2. 풀었던 퀴즈와 정답/오답 피드백 표시
 *   3. 스크롤에 따라 "퀴즈 보기" / "맨 위로" 버튼 자동 전환
 *   4. 플로팅 버튼으로 퀴즈 섹션으로 빠르게 이동
 *
 * ArticleDetailScreen과의 차이점:
 *   - ArticleDetailScreen: 처음 읽는 글 (경험치 획득, 퀴즈 풀기)
 *   - ReadArticleDetailScreen: 이미 읽은 글 (과거 퀴즈 결과 확인)
 *
 * UI 특징:
 *   - 하단 플로팅 버튼: 그라디언트 배경 + 그림자 효과
 *   - 플랫폼별 버튼 위치 조정 (iOS/Android)
 *   - Safe Area 대응
 */

import React, { useRef, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../styles/global';
import Header from '../../components/Header';
import Button from '../../components/Button';
import ArticleContent from '../../components/ArticleContent';
import QuizFeedback from '../../components/QuizFeedback';
import Spacer from '../../components/Spacer';
import { useScrollToQuiz } from '../../hooks/useScrollToQuiz';
import { useQuizButton } from '../../hooks/useQuizButton';
import { FullScreenStackRouteProp } from '../../navigation/types';
import { RouteNames } from '../../../routes';
import { fetchReadContentDetail, ReadContentDetail } from '../../api/userApi';
import { getUserInfo } from '../../services/authService';
import { trackEvent } from '../../services/mixpanelService';
import { useOnboardingStore } from '../../store/onboardingStore';
import { LevelCategoryNames } from '../../types/interests';

// ──────────────────────────────────────────────
// 상수 정의
// ──────────────────────────────────────────────

/**
 * 플랫폼별 하단 버튼 영역 높이
 *
 * iOS와 Android에서 Safe Area 처리 방식이 달라서
 * 버튼 영역 높이를 다르게 설정한다.
 *
 * - iOS: 246 (Safe Area Insets가 더 큼)
 * - Android: 267 (네비게이션 바 높이 고려)
 */
const BUTTON_WRAPPER_HEIGHT = Platform.OS === 'ios' ? 246 : 267;

const ReadArticleDetailScreen = () => {
  const route =
    useRoute<FullScreenStackRouteProp<typeof RouteNames.READ_ARTICLE_DETAIL>>();
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  // ──────────────────────────────────────────────
  // Refs
  // ──────────────────────────────────────────────

  /** ScrollView 참조 (프로그래밍 방식 스크롤 제어용) */
  const scrollViewRef = useRef<ScrollView | null>(null);

  /** 퀴즈 섹션 View 참조 (퀴즈 위치 측정용) */
  const quizSectionRef = useRef<View | null>(null);

  // ──────────────────────────────────────────────
  // Route Params
  // ──────────────────────────────────────────────

  /** 표시할 읽은 글 ID */
  const contentId = route.params?.articleId;

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /** 읽은 글 상세 내용 (API 응답 데이터) */
  const [contentDetail, setContentDetail] = useState<ReadContentDetail | null>(
    null,
  );

  /** 글 로딩 중 여부 */
  const [isLoading, setIsLoading] = useState(true);

  /** 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  // ──────────────────────────────────────────────
  // Effect: 읽은 글 상세 정보 API 조회
  // ──────────────────────────────────────────────

  /**
   * 화면 진입 시 읽은 글 상세 정보를 API로 조회한다.
   *
   * 처리 흐름:
   *   1. contentId 유효성 검사
   *   2. getUserInfo()로 현재 사용자 정보 조회
   *   3. fetchReadContentDetail() API 호출
   *   4. 응답 데이터를 contentDetail 상태에 저장
   *
   * API 응답 데이터:
   *   - content: 글 내용 (제목, 본문, 이미지 등)
   *   - quiz: 퀴즈 정보 (문제, 선택지, 정답, 사용자가 선택한 답)
   *
   * 에러 처리:
   *   - contentId 없음: "컨텐츠 ID가 없습니다" 에러
   *   - 사용자 정보 없음: "사용자 정보를 찾을 수 없습니다" 에러
   *   - API 실패: "글을 불러오는데 실패했습니다" 에러
   */
  useEffect(() => {
    const loadContentDetail = async () => {
      if (!contentId) {
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

        const response = await fetchReadContentDetail(
          userInfo.userId,
          contentId,
        );
        if (response.data) {
          setContentDetail(response.data);

          // Mixpanel: 콘텐츠 상세 페이지 진입 (읽은 글)
          const userDifficulty = useOnboardingStore.getState().difficulty;
          trackEvent('article_start', {
            article_id: contentId,
            category: response.data.content?.categoryName,
            difficulty: userDifficulty
              ? LevelCategoryNames[userDifficulty]
              : null,
            entry_source: route.params?.entrySource,
          });
        }
      } catch (err: any) {
        console.error('[읽은 글 상세] 로드 실패:', err);
        setError('글을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadContentDetail();
  }, [contentId]);

  // ──────────────────────────────────────────────
  // 퀴즈 데이터 변환
  // ──────────────────────────────────────────────

  /**
   * API 응답의 퀴즈 데이터를 UI 렌더링용 Quiz 객체로 변환한다.
   *
   * 변환 내용:
   *   - quizId → id
   *   - quizContent → question
   *   - choices → options
   *   - correctChoiceNo → correctAnswerId
   *
   * useMemo를 사용하는 이유:
   *   - contentDetail이 변경될 때만 재계산
   *   - 불필요한 재렌더링 방지
   */
  const quiz = useMemo(() => {
    if (contentDetail?.quiz) {
      return {
        id: contentDetail.quiz.quizId,
        question: contentDetail.quiz.quizContent,
        options: contentDetail.quiz.choices.map(choice => ({
          id: choice.quizChoiceId,
          choiceNo: choice.choiceNo,
          text: choice.choiceText,
        })),
        correctAnswerId: contentDetail.quiz.correctChoiceNo,
      };
    }
  }, [contentDetail]);

  /**
   * 사용자가 선택했던 답안 ID
   *
   * 과거에 퀴즈를 풀 때 선택했던 선택지를 표시하기 위해 사용한다.
   * QuizFeedback 컴포넌트에서 이 값을 받아서
   * 사용자가 선택한 답을 강조 표시한다.
   */
  const selectedAnswerId = contentDetail?.quiz?.selectedNo || null;

  // ──────────────────────────────────────────────
  // Custom Hooks
  // ──────────────────────────────────────────────

  /**
   * 스크롤 감지 및 제어 커스텀 훅
   *
   * 기능:
   *   - 스크롤 위치에 따라 showQuiz 상태 자동 전환
   *   - 퀴즈 섹션으로 스크롤 이동 (scrollToQuiz)
   *   - 맨 위로 스크롤 이동 (scrollToTop)
   *
   * showQuiz 상태:
   *   - true: 퀴즈가 화면 밖에 있음 → "퀴즈 보기" 버튼 표시
   *   - false: 퀴즈가 화면에 보임 → "맨 위로" 버튼 표시
   */
  const { showQuiz, handleScroll, scrollToQuiz, scrollToTop } = useScrollToQuiz(
    {
      scrollViewRef,
      quizSectionRef,
    },
  );

  /**
   * 플로팅 버튼 상태 및 핸들러 커스텀 훅
   *
   * 기능:
   *   - showQuiz 상태에 따라 버튼 텍스트 자동 변경
   *   - 버튼 클릭 시 적절한 동작 실행
   *
   * 버튼 동작:
   *   - showQuiz === true: scrollToQuiz() 실행 (퀴즈로 이동)
   *   - showQuiz === false: scrollToTop() 실행 (맨 위로 이동)
   */
  const { buttonTitle, handleButtonPress } = useQuizButton({
    showQuiz,
    onScrollToQuiz: scrollToQuiz,
    onScrollToTop: scrollToTop,
  });

  // ──────────────────────────────────────────────
  // 동적 스타일 계산
  // ──────────────────────────────────────────────

  /**
   * ScrollView 콘텐츠의 하단 패딩 계산
   *
   * 플로팅 버튼이 콘텐츠를 가리지 않도록
   * 버튼 높이 + Safe Area 하단 여백만큼 패딩을 추가한다.
   *
   * 계산식:
   *   paddingBottom = BUTTON_WRAPPER_HEIGHT + safeAreaBottom
   *
   * useMemo를 사용하는 이유:
   *   - safeAreaBottom이 변경될 때만 재계산
   *   - 불필요한 스타일 재생성 방지
   */
  const contentPaddingBottom = useMemo(
    () => scaleWidth(BUTTON_WRAPPER_HEIGHT) + safeAreaBottom,
    [safeAreaBottom],
  );

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  // 로딩 중
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header iconColor={COLORS.gray800} />
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={COLORS.puple.main} />
          <Spacer num={16} />
          <Text>글을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 에러 또는 데이터 없음
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

  // 정상 렌더링
  return (
    <SafeAreaView style={styles.container}>
      <Header iconColor={COLORS.gray800} />
      <ScrollView
        bounces={false}
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: contentPaddingBottom }, // 동적 패딩 적용
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll} // 스크롤 위치 감지
        scrollEventThrottle={16} // 스크롤 이벤트 쓰로틀링 (60fps)
      >
        {/* 글 내용 */}
        <ArticleContent content={contentDetail.content} />
        <Spacer num={12} />

        {/* 퀴즈 섹션 (정답/오답 피드백 포함) */}
        {quiz && (
          <QuizFeedback
            question={quiz.question}
            options={quiz.options}
            correctAnswerId={quiz.correctAnswerId}
            selectedAnswerId={selectedAnswerId} // 사용자가 과거에 선택한 답
            showFeedbackMessage={true} // 정답/오답 메시지 표시
            containerRef={quizSectionRef} // 퀴즈 섹션 위치 측정용
          />
        )}
      </ScrollView>

      {/* 하단 플로팅 버튼 컨테이너 */}
      <View
        style={[
          styles.fixedButtonContainer,
          { paddingBottom: safeAreaBottom }, // Safe Area 대응
        ]}
      >
        <View style={styles.buttonWrapper}>
          {/* 그라디언트 배경 (버튼 아래 콘텐츠를 자연스럽게 가림) */}
          <LinearGradient
            colors={[COLORS.white, COLORS.transparent]} // 하얀색 → 투명
            start={{ x: 0, y: 1 }} // 하단에서 시작
            end={{ x: 0, y: 0 }} // 상단으로 페이드
            style={styles.overlayBackdrop}
          />

          {/* 플로팅 버튼 */}
          <Button
            title={buttonTitle} // "퀴즈 보기" 또는 "맨 위로"
            onPress={handleButtonPress}
            variant="primary"
            style={styles.fixedButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    // paddingBottom은 동적으로 계산됨 (버튼 높이 + safeAreaBottom)
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  /** 하단 플로팅 버튼 컨테이너 (절대 위치) */
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 버튼 래퍼 (그라디언트 배경 + 버튼) */
  buttonWrapper: {
    position: 'relative',
    width: scaleWidth(393),
    height: scaleWidth(175),
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? scaleWidth(10) : scaleWidth(31), // 플랫폼별 패딩
  },
  /** 그라디언트 배경 (버튼 뒤에 표시) */
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  /** 플로팅 버튼 (그림자 효과 포함) */
  fixedButton: {
    width: scaleWidth(103),
    height: scaleWidth(47),
    borderRadius: BORDER_RADIUS[30],
    backgroundColor: COLORS.gray800,
    // iOS 그림자
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Android 그림자 (elevation)
    elevation: 8,
  },
});

export default ReadArticleDetailScreen;
