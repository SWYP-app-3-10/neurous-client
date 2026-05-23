import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { NewsItems } from '../../../data/mock/searchData';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../../styles/global';
import { Body_16M, Caption_14R } from '../../../styles/typography';

import ViewIcon from '../../../assets/svg/View.svg';
import ClockIcon from '../../../assets/svg/clock.svg';
import ExploreResultDivider from '../../../assets/svg/ExploreResultDivider.svg';
import ReadDimCheckIcon from '../../../assets/svg/read_dim_check.svg';

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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* 텍스트 영역 */}
      <View style={styles.left}>
        {/* 제목(2줄) — 읽음: black 50% opacity (Figma Variant3) */}
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
            <ClockIcon
              width={ICON_SIZE}
              height={ICON_SIZE}
              color={COLORS.gray600}
            />
            <Text style={styles.metaText}>{readTimeText}</Text>
          </View>

          {/* 구분선 (1x8) */}
          <ExploreResultDivider
            width={DIVIDER_W}
            height={DIVIDER_H}
            color={COLORS.gray700}
          />

          {/* 조회수 블록 */}
          <View style={styles.metaGroup}>
            <ViewIcon
              width={ICON_SIZE}
              height={ICON_SIZE}
              color={COLORS.gray600}
            />
            <Text style={styles.metaText}>{viewText}</Text>
          </View>
        </View>
      </View>

      {/* 썸네일 — 읽음: 이미지 50% + 중앙 체크 */}
      <View style={styles.thumb}>
        {shouldShowImage ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.thumbImage, isRead && styles.thumbDim]}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.thumbPlaceholder, isRead && styles.thumbDim]} />
        )}
        {isRead && (
          <View style={styles.thumbCheckOverlay} pointerEvents="none">
            <ReadDimCheckIcon width={CHECK_SIZE} height={CHECK_SIZE} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const THUMB_SIZE = scaleWidth(85);
const THUMB_RADIUS = BORDER_RADIUS[16];
const CHECK_SIZE = scaleWidth(31);

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
    opacity: 0.5,
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
  thumbDim: {
    opacity: 0.5,
  },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.gray300,
  },
  thumbCheckOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
