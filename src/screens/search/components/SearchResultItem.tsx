import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { NewsItems } from '../../../data/mock/searchData';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../../styles/global';
import { Body_16M, Caption_14R } from '../../../styles/typography';

import ViewIcon from '../../../assets/svg/View.svg';
import ClockIcon from '../../../assets/svg/clock.svg';
import ExploreResultDivider from '../../../assets/svg/ExploreResultDivider.svg';

type Props = {
  item: NewsItems;
  onPress?: () => void;
};

export default function SearchResultItem({ item, onPress }: Props) {
  const [imgError, setImgError] = useState(false);

  const isRead = item.read === true;

  const shouldShowImage = useMemo(() => {
    return !!item.imageUrl && item.imageUrl.trim().length > 0 && !imgError;
  }, [item.imageUrl, imgError]);

  // "5분 소요" -> "5분" 형태로 표시
  const readTimeText = useMemo(() => {
    const raw = item.readTime ?? '';
    const match = raw.match(/(\d+)\s*분/);
    return match ? `${match[1]}분` : raw;
  }, [item.readTime]);

  // 조회수: 서버 hits → SearchResultScreen에서 매핑한 hits 사용
  const viewText = useMemo(() => {
    const count = Number(item.hits ?? 0);
    return Number.isFinite(count) ? count.toLocaleString() : '0';
  }, [item.hits]);

  const metaColor = isRead ? COLORS.gray400 : COLORS.gray700;
  const iconColor = COLORS.gray600;

  return (
    <TouchableOpacity
      style={[styles.card, isRead && styles.cardRead]}
      onPress={onPress}
    >
      {/* 텍스트 영역 */}
      <View style={styles.left}>
        {/* 제목(2줄) */}
        <Text
          style={[styles.title, isRead && styles.titleRead]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* 메타: 시간 / 구분선 / 조회수 */}
        <View style={styles.metaRow}>
          {/* 시간 블록 */}
          <View style={styles.metaGroup}>
            <ClockIcon width={ICON_SIZE} height={ICON_SIZE} color={iconColor} />
            <Text style={[styles.metaText, { color: metaColor }]}>
              {readTimeText}
            </Text>
          </View>

          {/* 구분선 (1x8) */}
          <ExploreResultDivider
            width={DIVIDER_W}
            height={DIVIDER_H}
            color={metaColor}
          />

          {/* 조회수 블록 */}
          <View style={styles.metaGroup}>
            <ViewIcon width={ICON_SIZE} height={ICON_SIZE} color={iconColor} />
            <Text style={[styles.metaText, { color: metaColor }]}>
              {viewText}
            </Text>
          </View>
        </View>
      </View>

      {/* 썸네일 */}
      <View style={styles.thumb}>
        {shouldShowImage ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumbImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const THUMB_SIZE = scaleWidth(85);
const THUMB_RADIUS = BORDER_RADIUS[16];

const ICON_SIZE = scaleWidth(18);

// 구분선 크기: 1x8
const DIVIDER_W = scaleWidth(1);
const DIVIDER_H = scaleWidth(8);

// 간격 규칙
const GAP_ICON_TEXT = scaleWidth(4); // 아이콘 <-> 텍스트
const GAP_GROUPS = scaleWidth(10); // 시간 전체 <-> 구분선 <-> 뷰 전체
const GAP_TITLE_META = scaleWidth(8); // 제목 <-> 메타

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  cardRead: {
    backgroundColor: COLORS.gray100,
  },
  left: {
    flex: 1,
  },

  // 제목 2줄
  title: {
    ...Body_16M,
    color: COLORS.black,
    paddingRight: scaleWidth(20),
    marginBottom: GAP_TITLE_META,
  },
  titleRead: {
    color: COLORS.gray700,
  },

  // 메타 한 줄 (시간 / 구분선 / 조회수)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: GAP_GROUPS,
  },

  // 시간 전체/조회수 전체 블록
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: GAP_ICON_TEXT,
  },

  metaText: {
    ...Caption_14R,
    color: COLORS.gray700,
  },

  // 썸네일 (기존 유지)
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    overflow: 'hidden',
    backgroundColor: COLORS.gray300,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.gray300,
  },
});
