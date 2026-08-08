/**
 * 목(mock) 글 상세 화면 (MockArticleDetailScreen.tsx)
 *
 * [내부 테스트 전용] 스토어 등록용 스크린샷을 찍기 위해 만든 화면이다.
 *
 * 실제 ArticleDetailScreen과 시각적으로 동일하게 구성했지만,
 * 다음 사항이 실제 화면과 다르다.
 *   - 서버 API를 호출하지 않는다 (콘텐츠는 mockArticleQuiz.ts에 고정된 값 사용)
 *   - 글 읽기 보상(경험치) 등 어떤 실제 데이터도 변경하지 않는다
 *   - 홈/탐색 화면 리스트 맨 위의 mock 카드를 클릭했을 때만 진입 가능하며,
 *     IS_INTERNAL_TEST가 true인 내부 테스트 빌드에서만 노출된다
 *
 * 실제 ArticleDetailScreen(src/screens/common/ArticleDetailScreen.tsx)은
 * 이 화면과 무관하게 그대로 유지된다.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import {
  Body_16R,
  Caption_14R,
  Caption_11M,
  Heading_20EB_Round,
} from '../../styles/typography';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Spacer from '../../components/Spacer';
import { RouteNames } from '../../../routes';
import { FullScreenStackParamList } from '../../navigation/types';
import { ViewIcon } from '../../icons';
import { MOCK_ARTICLE_QUIZ } from '../../data/mock/mockArticleQuiz';

type NavigationProp = NativeStackNavigationProp<FullScreenStackParamList>;

/** 날짜 표시 형식 변환 (YYYY-MM-DD → YYYY.MM.DD), ArticleContent와 동일한 규칙 */
const formatDate = (dateString: string): string =>
  dateString.replace(/-/g, '.');

const MockArticleDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  /** "퀴즈 풀기" 버튼 클릭 시 목 퀴즈 화면으로 이동 (서버 호출/보상 없음) */
  const handlePressQuizButton = () => {
    navigation.navigate(RouteNames.MOCK_QUIZ);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header iconColor={COLORS.gray800} />

      <ScrollView
        bounces={false}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 썸네일 이미지 (로컬 에셋, 실제 화면과 달리 원격 URL이 아님) */}
        <Image
          source={require('../../assets/png/MockArticle_Thumbnail.jpg')}
          style={styles.articleImage}
          resizeMode="cover"
        />

        <View style={styles.infoContainer}>
          {/* 카테고리 */}
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>
              {MOCK_ARTICLE_QUIZ.categoryName}
            </Text>
          </View>
          <Spacer num={8} />
          <Text style={styles.title}>{MOCK_ARTICLE_QUIZ.title}</Text>
          <View style={styles.metaContainer}>
            <Text style={styles.meta}>
              {formatDate(MOCK_ARTICLE_QUIZ.contentDate)}
            </Text>
            <Text style={styles.meta}> | </Text>
            <View style={styles.viewIconContainer}>
              <ViewIcon />
            </View>
            <Text style={styles.meta}> {MOCK_ARTICLE_QUIZ.hits}</Text>
          </View>

          <Spacer num={26} />

          {/* AI 재구성 안내 배너 (실제 화면과 동일한 문구) */}
          <View style={styles.reconstructedBanner}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
            <Text style={styles.reconstructedBannerText}>
              기사의 핵심 사실만 추출해 재구성한 글이에요
            </Text>
          </View>

          <Spacer num={26} />

          {/* 본문 */}
          <Text style={styles.body}>{MOCK_ARTICLE_QUIZ.content}</Text>
        </View>

        <Spacer num={48} />
      </ScrollView>

      <Button
        title="퀴즈 풀기"
        onPress={handlePressQuizButton}
        variant="primary"
        style={styles.quizButton}
      />
    </SafeAreaView>
  );
};

// 스타일은 ArticleContent.tsx / ArticleDetailScreen.tsx와 동일하게 맞춤
// (실제 화면과 시각적으로 동일해야 스크린샷 용도로 의미가 있으므로)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {},
  articleImage: {
    width: '100%',
    height: scaleWidth(220),
    backgroundColor: COLORS.gray200,
  },
  infoContainer: {
    borderRadius: BORDER_RADIUS[20],
    top: -scaleWidth(27),
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(27),
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: scaleWidth(12),
    height: scaleWidth(35),
    backgroundColor: COLORS.puple[3],
    borderRadius: BORDER_RADIUS[30],
    justifyContent: 'center',
    alignItems: 'center',
  },
  category: {
    ...Caption_14R,
    color: COLORS.puple.main,
  },
  title: {
    ...Heading_20EB_Round,
    color: COLORS.black,
    marginBottom: scaleWidth(12),
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    ...Caption_14R,
    color: COLORS.gray600,
  },
  viewIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reconstructedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
    height: scaleWidth(48),
    paddingVertical: scaleWidth(12),
    paddingHorizontal: scaleWidth(16),
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS[12],
  },
  aiBadge: {
    paddingHorizontal: scaleWidth(7),
    paddingVertical: scaleWidth(1),
    backgroundColor: COLORS.puple.main,
    opacity: 0.9,
    borderRadius: BORDER_RADIUS[99],
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadgeText: {
    ...Caption_11M,
    color: COLORS.white,
  },
  reconstructedBannerText: {
    ...Caption_14R,
    flex: 1,
    color: COLORS.gray800,
  },
  body: {
    ...Body_16R,
    color: COLORS.black,
  },
  quizButton: {
    marginHorizontal: scaleWidth(20),
  },
});

export default MockArticleDetailScreen;
