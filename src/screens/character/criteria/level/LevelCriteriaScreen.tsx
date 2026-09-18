// LevelCriteriaScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  LayoutChangeEvent,
  ListRenderItem,
  Image,
  ActivityIndicator,
} from 'react-native';
import { levelList, LevelCriteria } from './levelData';

import XpIcon from '../../../../assets/png/coin_xp.png';
import TooltipXP from '../../../../assets/png/Tooltip_XP.png';

import { InfoIcon } from '../../../../icons';

import { COLORS, BORDER_RADIUS, scaleWidth } from '../../../../styles/global';
import {
  Body_16SB,
  Heading_24EB_Round,
  Caption_14R,
  Heading_18EB_Round,
  Caption_12SB,
  Body_16M,
} from '../../../../styles/typography';
import { logEvent, logScreenView } from '../../../../services/analyticsService';

// CharacterScreen과 동일한 데이터 소스 사용
import { useCharacterMe } from '../../../../hooks/useCharacter';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Tooltip 이미지(원본) 기준 값
const TOOLTIP_ASSET_W = 490;
const TOOLTIP_ASSET_H = 146;
// 원본 이미지에서 꼬리(tip)가 위치한 X (px)
const TOOLTIP_TIP_X = 147;

// 앱에서 사용할 Tooltip 크기(원본 비율 유지)
const TOOLTIP_W = scaleWidth(260);
const TOOLTIP_H = scaleWidth((260 * TOOLTIP_ASSET_H) / TOOLTIP_ASSET_W);

/**
 * useTooltip
 * - measureLayout 대신 onLayout 값으로 아이콘 중심점을 계산해 툴팁 left를 산출
 * - card 기준 iconCenterX = rowX(Pressable) + iconXInRow + iconW/2
 * - TIP_FINE_TUNE: 이미지 꼬리 위치가 미세하게 어긋날 때 보정(+면 오른쪽)
 */
function useTooltip(autoHideMs: number) {
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 카드 폭(툴팁 clamp 기준)
  const [cardWidth, setCardWidth] = useState(0);

  // onLayout 좌표계 보정용 값들
  const [rowX, setRowX] = useState(0); // 카드 기준 Pressable 시작 x
  const [iconXInRow, setIconXInRow] = useState(0); // row 기준 아이콘 x
  const [iconW, setIconW] = useState(0); // 아이콘 wrapper 폭

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const openWithAutoHide = useCallback(() => {
    clearTimer();
    setVisible(true);

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, autoHideMs);
  }, [autoHideMs, clearTimer]);

  const close = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  // 툴팁 토글(열면 자동 닫힘)
  const toggle = useCallback(() => {
    if (visible) {
      close();
      return;
    }
    openWithAutoHide();
  }, [visible, close, openWithAutoHide]);

  // 카드 폭 측정(툴팁 left clamp용)
  const onLayoutCard = useCallback((e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  }, []);

  // Pressable 시작 x (카드 기준)
  const onLayoutRow = useCallback((e: LayoutChangeEvent) => {
    setRowX(e.nativeEvent.layout.x);
  }, []);

  // 아이콘 wrapper의 x/width (row 기준)
  const onLayoutIcon = useCallback((e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setIconXInRow(x);
    setIconW(width);
  }, []);

  // 카드 기준 아이콘 중앙 x
  const iconCenterX = useMemo(
    () => rowX + iconXInRow + iconW / 2,
    [rowX, iconXInRow, iconW],
  );

  // 툴팁 left 계산(꼬리를 아이콘 중앙에 맞추고 카드 폭 안에서 clamp)
  const tooltipLeft = useMemo(() => {
    if (!cardWidth) return 0;

    const tipOffsetX = (TOOLTIP_W * TOOLTIP_TIP_X) / TOOLTIP_ASSET_W;

    // 꼬리 위치 미세 보정(+면 오른쪽 / -면 왼쪽)
    const TIP_FINE_TUNE = scaleWidth(21);

    const raw = iconCenterX - tipOffsetX + TIP_FINE_TUNE;
    return clamp(raw, 0, cardWidth - TOOLTIP_W);
  }, [cardWidth, iconCenterX]);

  return {
    visible,
    toggle,
    tooltipLeft,
    onLayoutCard,
    onLayoutRow,
    onLayoutIcon,
  };
}

function XpSummaryCard({
  currentXp,
  needXp,
  isLoading,
}: {
  currentXp: number;
  needXp: number;
  isLoading: boolean;
}) {
  const tooltip = useTooltip(1500);

  return (
    <View style={styles.xpCard} onLayout={tooltip.onLayoutCard}>
      <View style={styles.xpLeft}>
        <Text style={styles.xpQ}>현재 나의 경험치는?</Text>

        <Pressable
          // rowX 확보(카드 기준)
          onLayout={tooltip.onLayoutRow}
          onPress={() => {
            if (isLoading) return;
            tooltip.toggle();
            logEvent('XpTooltip_ConfirmStandard_Level');
          }}
          style={styles.xpValueRow}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.puple.main} />
          ) : (
            <>
              <Text style={styles.xpNumber}>{currentXp}</Text>
              <Text style={styles.xpUnit}> XP</Text>
            </>
          )}

          <View
            style={styles.xpInfoIcon}
            // iconXInRow/iconW 확보(row 기준)
            onLayout={tooltip.onLayoutIcon}
          >
            <InfoIcon
              // TODO(QA): Figma ConfirmStandard_Level 기준 툴팁 아이콘 width/height 값 확인 필요
              width={scaleWidth(22)}
              height={scaleWidth(22)}
              color={COLORS.gray400}
            />
          </View>
        </Pressable>

        <Text style={styles.xpHint}>
          {isLoading ? (
            '경험치를 불러오는 중이에요'
          ) : (
            <>
              다음 단계 달성을 위해서는{'\n'}
              <Text style={styles.xpHintStrong}>{needXp}XP</Text>가 더 필요해요
            </>
          )}
        </Text>
      </View>

      <View style={styles.xpImg}>
        <Image source={XpIcon} style={styles.xpImgIcon} resizeMode="contain" />
      </View>

      {/* 툴팁(absolute). 아이콘 중심에 꼬리가 오도록 left 계산 */}
      {tooltip.visible && !isLoading && (
        <View
          style={[
            styles.tooltipWrap,
            {
              left: tooltip.tooltipLeft,
              width: TOOLTIP_W,
              height: TOOLTIP_H,
              backgroundColor: 'transparent',
              paddingHorizontal: 0,
              paddingVertical: 0,
              borderRadius: 0,
              maxWidth: undefined,
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={TooltipXP}
            style={styles.tooltipPng}
            resizeMode="stretch"
          />

          <Text style={styles.tooltipTextOverlay}>
            퀴즈, 글 읽기, 출석 등 다양한 활동으로{'\n'}
            경험치를 모을 수 있어요
          </Text>
        </View>
      )}
    </View>
  );
}

function LevelRow({ item, isMine }: { item: LevelCriteria; isMine: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.thumb}>{item.character()}</View>

      <View style={styles.textArea}>
        <View style={styles.rowTop}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>

          {isMine && (
            <View style={styles.myLevelPill}>
              <Text style={styles.myLevelText}>내 레벨</Text>
            </View>
          )}
        </View>

        <Text style={styles.summaryTitle}>{item.summaryTitle}</Text>
      </View>
    </View>
  );
}

const ItemSeparator = () => <View style={styles.separator} />;

const LevelCriteriaScreen = () => {
  // 성장 정보(현재 레벨/경험치) 조회
  const { data: characterMeResponse, isLoading: meLoading } = useCharacterMe();
  const userGrowthInfo = characterMeResponse?.data?.userGrowthInfo;

  const currentXp = userGrowthInfo?.currentExp ?? 0;

  useEffect(() => {
    logScreenView('ConfirmStandard_Level', undefined, true);
  }, []);

  // LEVEL_1 형태를 숫자 레벨로 변환
  const currentLevelId = useMemo(() => {
    const raw = userGrowthInfo?.levelEnum;
    if (!raw) return 1;
    const match = raw.match(/LEVEL_(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }, [userGrowthInfo?.levelEnum]);

  // 다음 레벨까지 필요한 경험치
  const needXp = useMemo(() => {
    const next = levelList.find(l => l.id === currentLevelId + 1);
    if (!next) return 0; // 마지막 레벨이면 0
    return Math.max(0, next.requiredExp - currentXp);
  }, [currentLevelId, currentXp]);

  const renderItem: ListRenderItem<LevelCriteria> = useCallback(
    ({ item }) => <LevelRow item={item} isMine={item.id === currentLevelId} />,
    [currentLevelId],
  );

  // FlatList Header(현재 경험치 카드)
  const Header = useMemo(
    () => (
      <>
        <XpSummaryCard
          currentXp={currentXp}
          needXp={needXp}
          isLoading={meLoading}
        />
        <View style={styles.headerSpace} />
      </>
    ),
    [currentXp, needXp, meLoading],
  );

  return (
    <FlatList
      data={levelList}
      keyExtractor={item => String(item.id)}
      renderItem={renderItem}
      ListHeaderComponent={Header}
      ItemSeparatorComponent={ItemSeparator}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
};

export default LevelCriteriaScreen;

const styles = StyleSheet.create({
  listContent: {
    marginHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(32),
    paddingBottom: scaleWidth(48),
  },

  headerSpace: {
    height: scaleWidth(32),
  },

  separator: {
    height: scaleWidth(20),
  },

  xpCard: {
    padding: scaleWidth(20),
    borderRadius: BORDER_RADIUS[16],
    borderWidth: scaleWidth(1),
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

  xpLeft: {
    flex: 1,
  },

  xpQ: {
    ...Body_16SB,
    color: COLORS.black,
  },

  xpValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(16),
  },

  xpNumber: {
    ...Heading_24EB_Round,
    color: COLORS.black,
  },

  xpUnit: {
    ...Heading_24EB_Round,
    color: COLORS.black,
  },

  xpInfoIcon: {
    marginLeft: scaleWidth(12),
    width: scaleWidth(22),
    height: scaleWidth(22),
    alignItems: 'center',
    justifyContent: 'center',
  },

  tooltipWrap: {
    position: 'absolute',
    top: scaleWidth(88),
    zIndex: 10,
    elevation: 0,
  },

  tooltipPng: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },

  tooltipTextOverlay: {
    position: 'absolute',
    left: scaleWidth(20),
    top: scaleWidth(26),
    ...Caption_14R,
    color: COLORS.white,
    lineHeight: scaleWidth(20),
  },

  xpHint: {
    ...Caption_14R,
    marginTop: scaleWidth(8),
    color: COLORS.gray700,
    includeFontPadding: false,
  },

  xpHintStrong: {
    color: COLORS.puple.main,
    lineHeight: scaleWidth(24),
    includeFontPadding: false,
  },

  xpImg: {
    width: scaleWidth(92),
    height: scaleWidth(92),
    borderRadius: BORDER_RADIUS[12],
    alignItems: 'center',
    justifyContent: 'center',
  },

  xpImgIcon: {
    width: scaleWidth(92),
    height: scaleWidth(92),
  },

  row: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
  },

  thumb: {
    width: scaleWidth(110),
    height: scaleWidth(130),
    borderRadius: BORDER_RADIUS[16],
    backgroundColor: COLORS.gray100,
    marginRight: scaleWidth(24),
    alignItems: 'center',
    justifyContent: 'center',
  },

  textArea: {
    flex: 1,
    gap: scaleWidth(3),
  },

  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    ...Heading_18EB_Round,
    color: COLORS.black,
    flex: 1,
    marginRight: scaleWidth(8),
  },

  myLevelPill: {
    paddingVertical: scaleWidth(4),
    paddingHorizontal: scaleWidth(8),
    borderRadius: BORDER_RADIUS[30],
    backgroundColor: COLORS.puple[2],
  },

  myLevelText: {
    ...Caption_12SB,
    color: COLORS.puple.main,
  },

  summaryTitle: {
    ...Body_16M,
    color: COLORS.gray800,
  },
});
