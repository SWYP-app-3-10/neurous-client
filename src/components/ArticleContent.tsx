import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import {
  Body_16R,
  Caption_14R,
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
            <Spacer num={32} />
            <View style={styles.reconstructedBanner}>
              <Text style={styles.reconstructedBannerEmoji}>📝</Text>
              <Text style={styles.reconstructedBannerText}>
                <Text style={styles.reconstructedBannerTextGray}>기사의 </Text>
                <Text style={styles.reconstructedBannerTextPurple}>
                  핵심 사실만 추출해 재구성한 글
                </Text>
                <Text style={styles.reconstructedBannerTextGray}>이에요</Text>
              </Text>
            </View>
          </>
        )}

        <Spacer num={showReconstructedBanner ? 32 : 40} />

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
  reconstructedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
    paddingVertical: scaleWidth(12),
    paddingHorizontal: scaleWidth(16),
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS[16],
  },
  reconstructedBannerEmoji: {
    fontSize: scaleWidth(18),
    lineHeight: scaleWidth(24),
  },
  reconstructedBannerText: {
    ...Caption_14R,
    flex: 1,
  },
  reconstructedBannerTextGray: {
    color: COLORS.gray800,
  },
  reconstructedBannerTextPurple: {
    color: COLORS.puple.main,
  },
});

export default ArticleContent;
