/**
 * 글 상세 화면 (ArticleDetailScreen.tsx)
 *
 * 사용자가 선택한 글의 전체 내용을 표시하고, 퀴즈 풀기 화면으로 이동할 수 있다.
 *
 * 주요 기능:
 *   1. 글 내용 표시 (API로 조회)
 *   2. 광고를 통해 열린 글인 경우 토스트 메시지 표시
 *   3. 퀴즈 화면으로 이동
 *
 * 변경된 보상 처리 방식:
 *   - 기존: 글 상세 화면에서 완독/경험치 처리
 *   - 변경: QuizScreen에서 퀴즈 제출 성공 시 경험치 지급
 *
 * 제거된 기능:
 *   - 난이도별 읽기 시간 타이머
 *   - 읽기 시간 감지
 *   - 경험치 지급 모달
 *   - 글 상세 화면의 완독 체크 API 호출
 *   - 타이머 기반 완독 처리
 *   - 화면 포커스 기반 타이머 제어
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Spacer from '../../components/Spacer';
import { RouteNames } from '../../../routes';
import { FullScreenStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useShowToastModal } from '../../store/modalStore';
import { fetchContentDetail, ContentDetail } from '../../api/missionApi';
import { getUserInfo } from '../../services/authService';
import ArticleContent from '../../components/ArticleContent';
import { logEvent } from '../../services/analyticsService';

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

  // ──────────────────────────────────────────────
  // Route Params (타입 안전)
  // ──────────────────────────────────────────────

  /** 표시할 글 ID */
  const articleId = route.params.articleId;

  /** 글을 읽은 후 돌아갈 화면 ('mission' | 'search') */
  const returnTo = route.params.returnTo;

  /** 광고를 통해 열린 글인지 여부 (토스트 메시지 표시용) */
  const fromAd = route.params.fromAd;

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

        const response = await fetchContentDetail(userInfo.userId, articleId);
        if (response.data) {
          setContentDetail(response.data);
        }
      } catch (err: any) {
        console.error('[글 상세] 로드 실패:', err);
        setError('글을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadContentDetail();
  }, [articleId]);

  // ──────────────────────────────────────────────
  // Effect 2: 광고 통해 열린 글 토스트 메시지 표시
  // ──────────────────────────────────────────────

  /**
   * 광고를 통해 열린 글인 경우 "새로운 글이 열렸어요" 토스트 메시지를 표시한다.
   *
   * 조건:
   *   - fromAd: true일 때만 표시
   *
   * 타이밍:
   *   - 화면 진입 후 0.5초 뒤에 토스트 표시 (부드러운 UX)
   *
   * 토스트 설정:
   *   - 위치: 화면 중앙
   *   - 배경색: 반투명 회색
   *   - 크기: 148x39
   */
  useEffect(() => {
    if (!fromAd) {
      return;
    }

    showToastModal({
      message: '새로운 글이 열렸어요',
      position: 'center',
      backgroundColor: COLORS.gray800Opacity80,
      height: scaleWidth(39),
      width: scaleWidth(148),
      borderRadius: BORDER_RADIUS[8],
    });
  }, [fromAd, showToastModal]);

  // ──────────────────────────────────────────────
  // 퀴즈 풀기 버튼 처리
  // ──────────────────────────────────────────────

  /**
   * "퀴즈 풀기" 버튼을 눌렀을 때 실행된다.
   *
   * 처리 흐름:
   *   1. analytics 이벤트 기록
   *   2. 퀴즈 화면으로 이동
   *
   * 주의:
   *   - 이 화면에서는 완독 체크나 경험치 지급을 처리하지 않는다.
   *   - 완독 체크와 보상 처리는 QuizScreen의 퀴즈 제출 버튼에서 처리한다.
   */
  const handlePressQuizButton = () => {
    logEvent('StartQuiz_Reading');

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
        <ArticleContent content={contentDetail} />
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
