import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import {
  Body_16M,
  Caption_14R,
  Caption_12M,
  Body_16SB,
} from '../styles/typography';
import Button from './Button';
import Spacer from './Spacer';
import { RightArrowIcon } from '../icons';
import { MyPageContent } from '../api/userApi';
import { logEvent } from '../services/analyticsService';

export interface TimelineGroupProps {
  dateGroup: {
    date: string;
    dayOfWeek: string;
    count: number;
    articles: MyPageContent[];
  };
  formatDate: (dateStr: string, dayOfWeek: string) => string;
  isLast: boolean;
  onArticlePress: (articleId: number) => void;
}

export const TimelineGroup: React.FC<TimelineGroupProps> = ({
  dateGroup,
  formatDate,
  isLast,
  onArticlePress,
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // 점선 높이 계산
  const dashedLineHeight = Math.max(0, contentHeight - scaleWidth(16));
  const dashCount = Math.floor(
    (dashedLineHeight - scaleWidth(2.5)) / (scaleWidth(2.5) + scaleWidth(2.5)),
  );

  const displayedArticles = showAll
    ? dateGroup.articles
    : dateGroup.articles.slice(0, 5);

  return (
    <View style={styles.timelineGroup}>
      {/* 타임라인 컨테이너 */}
      <View style={styles.timelineContainer}>
        {/* 왼쪽 타임라인 라인 */}
        <View style={styles.timelineLineContainer}>
          {/* 상단 원형 마커 */}
          <View style={styles.timelineDot} />
          {/* 점선 - 게시글 길이에 맞춰 동적으로 생성 */}
          {contentHeight > 0 && (
            <View
              style={[
                styles.timelineDashedLineContainer,
                { height: dashedLineHeight },
              ]}
            >
              {Array.from({ length: Math.max(dashCount, 0) }).map(
                (_, index) => (
                  <View key={index} style={styles.timelineDash} />
                ),
              )}
            </View>
          )}
        </View>

        {/* 오른쪽 컨텐츠 */}
        <View style={styles.timelineContent} key={`content-${showAll}`}>
          {/* 날짜 헤더와 카드들을 감싸는 컨테이너 - 높이 측정용 */}
          <View
            onLayout={event => {
              const { height } = event.nativeEvent.layout;
              setContentHeight(height);
            }}
          >
            {/* 날짜 헤더 */}
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineDate}>
                {formatDate(dateGroup.date, dateGroup.dayOfWeek)}
              </Text>
              <Text style={styles.timelineCount}>{dateGroup.count}개</Text>
            </View>

            {/* 글 카드들 */}
            {displayedArticles.map((article, articleIndex) => (
              <React.Fragment key={article.contentId}>
                <TouchableOpacity
                  style={[
                    styles.articleCard,
                    articleIndex === displayedArticles.length - 1 &&
                      styles.articleCardLast,
                  ]}
                  onPress={() => {
                    onArticlePress(article.contentId);
                    if (
                      article.isQuizCorrect &&
                      article.isQuizCorrect === true
                    ) {
                      logEvent('ReadingHistoryList_Correct_My');
                    } else {
                      logEvent('ReadingHistoryList_InCorrect_My');
                    }
                  }}
                >
                  <View style={styles.articleContent}>
                    <Text style={styles.articleTitle} numberOfLines={2}>
                      {article.title}
                    </Text>

                    <View style={styles.articleFooter}>
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>
                          {article.category}
                        </Text>
                      </View>

                      {article.isQuizCorrect !== null && (
                        <View
                          style={[
                            styles.quizBadge,
                            article.isQuizCorrect
                              ? styles.quizBadgeCorrect
                              : styles.quizBadgeIncorrect,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quizBadgeText,
                              article.isQuizCorrect
                                ? styles.quizBadgeTextCorrect
                                : styles.quizBadgeTextIncorrect,
                            ]}
                          >
                            Q - {article.isQuizCorrect ? '정답' : '오답'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* 오른쪽 화살표 아이콘 */}
                  {<RightArrowIcon color={COLORS.gray700} />}
                </TouchableOpacity>
                {articleIndex !== displayedArticles.length - 1 && (
                  <Spacer num={16} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* 전체 보기 버튼 (높이 측정에서 제외) */}
          {dateGroup.articles.length > 5 &&
            (!showAll ? (
              <>
                <Spacer num={16} />
                <Button
                  variant="ghost"
                  textStyle={styles.viewAllText}
                  onPress={() => setShowAll(true)}
                  title="전체 보기"
                  style={{ height: scaleWidth(40) }}
                />
              </>
            ) : (
              <>
                <Spacer num={16} />
                <Button
                  variant="ghost"
                  textStyle={styles.viewAllText}
                  style={{ height: scaleWidth(40) }}
                  onPress={() => setShowAll(false)}
                  title="요약 보기"
                />
              </>
            ))}
        </View>
      </View>

      {!isLast && <Spacer num={24} />}
    </View>
  );
};

const styles = StyleSheet.create({
  timelineGroup: {},
  timelineContainer: {},
  timelineLineContainer: {
    alignItems: 'center',
    position: 'absolute',
    top: scaleWidth(5),
    left: scaleWidth(5),
  },
  timelineDot: {
    width: scaleWidth(10),
    height: scaleWidth(10),
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.gray800,
    position: 'relative',
  },
  timelineDashedLineContainer: {
    alignItems: 'center',
    position: 'absolute',
    top: scaleWidth(16), // 도트 높이(10) + 여백(6)
    width: scaleWidth(1),
    overflow: 'hidden', // 높이를 넘어서는 점선 숨김
  },
  timelineDash: {
    width: scaleWidth(1),
    height: scaleWidth(2.5),
    backgroundColor: COLORS.gray800,
    marginBottom: scaleWidth(2.5),
  },
  timelineContent: {
    flex: 1,
    position: 'relative',
    marginLeft: scaleWidth(25),
  },
  timelineHeader: {
    marginBottom: scaleWidth(12),
    gap: scaleWidth(10),
  },
  timelineDate: {
    ...Caption_14R,
    color: COLORS.gray700,
  },
  timelineCount: {
    ...Body_16SB,
    color: COLORS.black,
  },
  articleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaleWidth(16),
    paddingHorizontal: scaleWidth(20),
    borderRadius: BORDER_RADIUS[16],
    backgroundColor: COLORS.white,
    borderWidth: scaleWidth(1),
    borderColor: COLORS.gray300,
    gap: scaleWidth(19),
  },
  articleCardLast: {
    marginBottom: 0,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    ...Body_16M,
    color: COLORS.black,
    marginBottom: scaleWidth(16),
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },
  categoryTag: {
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(6),
    borderRadius: BORDER_RADIUS[30],
    backgroundColor: COLORS.gray100,
  },
  categoryTagText: {
    ...Caption_14R,
    color: COLORS.gray700,
  },
  quizBadge: {
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(6),
    borderRadius: BORDER_RADIUS[30],
  },
  quizBadgeCorrect: {
    backgroundColor: COLORS.blue[3],
  },
  quizBadgeIncorrect: {
    backgroundColor: COLORS.red[3],
  },
  quizBadgeText: {
    ...Caption_12M,
  },
  quizBadgeTextCorrect: {
    color: COLORS.blue.correct,
  },
  quizBadgeTextIncorrect: {
    color: COLORS.red.main,
  },
  viewAllText: {
    ...Body_16M,
    color: COLORS.gray800,
  },
});
