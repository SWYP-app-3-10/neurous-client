import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import {
  Body_16R,
  Caption_14R,
  Caption_11M,
  Heading_20EB_Round,
} from '../styles/typography';
import Spacer from './Spacer';
import { ContentDetail } from '../api/missionApi';
import { ViewIcon } from '../icons';

interface ArticleContentProps {
  content?: ContentDetail;
  /** AI 재구성 안내 배너 표시 여부 */
  showReconstructedBanner?: boolean;
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) {
    return '';
  }
  return dateString.replace(/-/g, '.');
};

const ArticleContent: React.FC<ArticleContentProps> = ({
  content,
  showReconstructedBanner = false,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <>
      {/* 이미지 */}
      {content?.imageUrl && !imageError && (
        <Image
          source={{ uri: content?.imageUrl }}
          style={styles.articleImage}
          resizeMode="cover"
          onError={error => {
            console.error('[ArticleContent] 이미지 로딩 실패:', {
              url: content?.imageUrl,
              error: error.nativeEvent?.error || error,
              nativeEvent: error.nativeEvent,
            });
            setImageError(true);
          }}
        />
      )}
      <View style={styles.infoContainer}>
        {/* 카테고리 */}
        <View style={styles.categoryContainer}>
          <Text style={styles.category}>{content?.categoryName}</Text>
        </View>
        <Spacer num={8} />
        <Text style={styles.title}>{content?.title}</Text>
        <View style={styles.metaWrapper}>
          <View style={styles.metaContainer}>
            <Text style={styles.meta}>{formatDate(content?.contentDate)}</Text>
            <Text style={styles.meta}> | </Text>
            <View style={styles.viewIconContainer}>
              <ViewIcon />
            </View>
            <Text style={styles.meta}> {content?.hits}</Text>
          </View>
        </View>
        {showReconstructedBanner && (
          <>
            <Spacer num={26} />
            <View style={styles.reconstructedBanner}>
              {/* AI 뱃지: 보라색 알약형 배경 위에 흰색 "AI" 텍스트 */}
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
              {/* 피그마 시안: 강조 없이 전체 회색(gray800) 단일 톤 문구 */}
              <Text style={styles.reconstructedBannerText}>
                기사의 핵심 사실만 추출해 재구성한 글이에요
              </Text>
            </View>
          </>
        )}

        <Spacer num={showReconstructedBanner ? 26 : 40} />

        {/* 본문 */}
        <Text style={styles.body}>{content?.content}</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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
  meta: {
    ...Caption_14R,
    color: COLORS.gray600,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    ...Body_16R,
    color: COLORS.black,
  },
  viewIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaWrapper: {
    flex: 1,
  },
  // 재구성 안내 배너: 피그마 시안(node 329:17979) 기준 gray100 배경, radius 12, 높이 48 고정
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
  // AI 뱃지 컨테이너: 보라색 배경(90% 불투명도) + 알약(pill) 형태
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
  // 안내 문구: 시안 상 강조 없이 gray800 단일 톤
  reconstructedBannerText: {
    ...Caption_14R,
    flex: 1,
    color: COLORS.gray800,
  },
});

export default ArticleContent;
