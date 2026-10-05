import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { Heading_18EB_Round, Caption_14R } from '../styles/typography';
import Spacer from './Spacer';
import { normalizeCategoryName } from '../utils/categoryName';

interface Article {
  id: number | string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  imageUrl?: string;
}

interface ArticleCardProps {
  article: Article;
  onPress: () => void;
}

const formatDate = (dateString: string): string => {
  if (!dateString) {
    return '';
  }
  return dateString.replace(/-/g, '.');
};

const ArticleCard = React.memo<ArticleCardProps>(({ article, onPress }) => {
  const [imageError, setImageError] = useState(false);
  return (
    <TouchableOpacity style={styles.articleCardWrapper} onPress={onPress}>
      <View style={styles.articleCard}>
        {/* 이미지 */}
        <View style={styles.articleImageContainer}>
          {article.imageUrl && !imageError ? (
            <Image
              source={{ uri: article.imageUrl }}
              style={styles.articleImage}
              resizeMode="cover"
              onError={error => {
                console.error('[ArticleCard] 이미지 로딩 실패:', {
                  url: article.imageUrl,
                  error: error.nativeEvent?.error || error,
                  nativeEvent: error.nativeEvent,
                });
                setImageError(true);
              }}
            />
          ) : (
            <View style={styles.articleImagePlaceholder} />
          )}
          <View style={styles.articleTag}>
            <Text style={styles.articleTagText}>
              {normalizeCategoryName(article.category)}
            </Text>
            <Text style={styles.articleTagDivider}>·</Text>
            <Text style={styles.articleTagText}>{article.readTime}</Text>
          </View>
        </View>
        {/* 아티클 정보 */}
        <View style={styles.articleInfo}>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {article.title}
          </Text>
          <Spacer num={12} />
          <Text style={styles.articleDate}>{formatDate(article.date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

ArticleCard.displayName = 'ArticleCard';

const styles = StyleSheet.create({
  articleCardWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS[16],
    // Android 9 미만에서는 boxShadow를 지원하지 않아 기존 elevation을 사용한다.
    ...(Platform.OS === 'android' && Number(Platform.Version) < 28
      ? { elevation: 2 }
      : {
          boxShadow: [
            {
              offsetX: 0,
              offsetY: scaleWidth(2),
              blurRadius: scaleWidth(20),
              spreadDistance: 0,
              color: 'rgba(0, 0, 0, 0.2)',
            },
          ],
        }),
  },
  articleCard: {
    borderRadius: BORDER_RADIUS[16],
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  articleImageContainer: {
    position: 'relative',
    width: '100%',
    height: scaleWidth(175),
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  articleImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.placeholder,
  },
  articleTag: {
    position: 'absolute',
    top: scaleWidth(20),
    right: scaleWidth(20),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(8),
    backgroundColor: COLORS.puple[3],
    borderRadius: BORDER_RADIUS[30],
    flexDirection: 'row',
    alignItems: 'center',
  },
  articleTagDivider: {
    ...Caption_14R,
    color: COLORS.puple.main,
    marginHorizontal: scaleWidth(8),
  },
  articleTagText: {
    ...Caption_14R,
    color: COLORS.puple.main,
  },
  articleInfo: {
    paddingVertical: scaleWidth(16),
    paddingHorizontal: scaleWidth(24),
  },
  articleTitle: {
    ...Heading_18EB_Round,
    color: COLORS.black,
  },
  articleDate: {
    ...Caption_14R,
    color: COLORS.gray700,
  },
});

export default ArticleCard;
