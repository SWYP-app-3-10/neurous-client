import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import type { PointHistoryItem } from '../../../data/mock/characterData';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomSheetModal from '../../../components/BottomSheetModal';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../../styles/global';
import {
  Caption_14R,
  Heading_18SB,
  Body_16M,
} from '../../../styles/typography';
import Header from '../../../components/Header';
import RewardIcon from '../../../assets/svg/RewardIcon.svg';

// 백엔드 연동 훅
import { usePointHistory } from '../../../hooks/usePointHistory';
import { logEvent, logScreenView } from '../../../services/analyticsService';

/**
 * PointHistoryScreen
 * - 보상 획득 내역을 최신순으로 표시하고, 탭 시 바텀시트로 상세를 보여줌
 * - 리스트는 "트랜잭션(보상 1회)" 기준으로 XP/P를 합산해 1줄로 노출
 * - 현재 트랜잭션 키(transactionId)가 백엔드에 실제 존재하는지/ historyId로 대체 가능한지 확인 대기 중
 *  >> 현 시점은 usePointHistory에서 내려주는 transactionId로 묶고, 답변에 따라 추후 수정 예정.
 */

const PointHistoryScreen = () => {
  /** 바텀시트 노출 여부 */
  const [sheetVisible, setSheetVisible] = useState(false);

  /**
   * 선택된 트랜잭션 키
   * - 현재는 transactionId로 취급
   * - 실제 값은 hook(usePointHistory)에서 mapping한 값에 의존함
   */
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  /** 트랜잭션 상세 보기 오픈 */
  const openSheet = (txId: string) => {
    setSelectedTxId(txId);
    setSheetVisible(true);
  };

  /** 트랜잭션 상세 보기 닫기 */
  const closeSheet = () => {
    setSheetVisible(false);
    setSelectedTxId(null);
  };

  /** 보상 획득 내역 조회 (hook 내부에서 API 호출 + 응답 mapping 수행) */
  const { data: historyData } = usePointHistory();

  /** ISO → "mm월 dd일" */
  const toShortDate = useCallback((iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}월 ${dd}일`;
  }, []);

  /**
   * 원본 리스트
   * - 획득 내역만(0 이하 제외)
   * - 최신순 정렬
   */
  const earnedRawList = useMemo(() => {
    return (historyData?.items ?? [])
      .filter(it => it.xpDelta > 0 || it.ptDelta > 0)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [historyData?.items]);

  /**
   * 리스트 렌더링용(요약) 타입
   * - transactionId 기준으로 XP/P를 합산한 결과를 리스트에 1줄로 표시하기 위함
   */
  type TxSummaryItem = {
    id: string; // FlatList key 용
    transactionId: string; // 그룹키(트랜잭션)
    createdAt: string; // 트랜잭션 대표 시간(최신 createdAt)
    xpSum: number; // 트랜잭션 내 XP 합
    ptSum: number; // 트랜잭션 내 P 합
  };

  /**
   * 트랜잭션 요약 리스트
   * - earnedRawList(원본 레코드)를 transactionId로 묶어서 합산한다.
   * - transactionId가 "진짜 그룹키"인지 여부는 현재 백엔드 확인 대기 상태.
   *   (확정되면 hook 매핑/필드 정의 쪽을 정리할 예정)
   */
  const earnedList: TxSummaryItem[] = useMemo(() => {
    const map = new Map<
      string,
      { xpSum: number; ptSum: number; latestIso: string }
    >();

    for (const it of earnedRawList) {
      const key = it.transactionId;
      const xp = Math.max(0, it.xpDelta);
      const pt = Math.max(0, it.ptDelta);

      const prev = map.get(key);
      if (!prev) {
        map.set(key, { xpSum: xp, ptSum: pt, latestIso: it.createdAt });
        continue;
      }

      prev.xpSum += xp;
      prev.ptSum += pt;

      // 트랜잭션 대표 createdAt은 "가장 최신"으로 유지
      if (
        new Date(it.createdAt).getTime() > new Date(prev.latestIso).getTime()
      ) {
        prev.latestIso = it.createdAt;
      }
    }

    const list: TxSummaryItem[] = Array.from(map.entries()).map(([key, v]) => ({
      id: key,
      transactionId: key,
      createdAt: v.latestIso,
      xpSum: v.xpSum,
      ptSum: v.ptSum,
    }));

    // 최신 트랜잭션이 위로
    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return list;
  }, [earnedRawList]);

  /**
   * 선택된 트랜잭션의 상세 레코드 목록
   * - 리스트에서 선택된 transactionId와 동일한 원본 레코드들을 바텀시트에 노출
   */
  const bundledItems = useMemo(() => {
    if (!selectedTxId) return [];
    return earnedRawList.filter(it => it.transactionId === selectedTxId);
  }, [selectedTxId, earnedRawList]);

  /** 리스트 아이템(트랜잭션 요약 1줄) */
  const renderItem = ({ item }: { item: TxSummaryItem }) => {
    const hasXp = item.xpSum > 0;
    const hasPt = item.ptSum > 0;

    return (
      <Pressable
        style={styles.rowPressable}
        onPress={() => {
          openSheet(item.transactionId);
          logEvent('list_ConfirmEarnedHistory');
        }}
      >
        <View style={styles.row}>
          {/* 1줄: 아이콘 + XP/P 합산  |  우측 날짜(대표 createdAt) */}
          <View style={styles.line1}>
            <View style={styles.leftGroup}>
              <View style={styles.icon}>
                <RewardIcon width={ICON_SIZE} height={ICON_SIZE} />
              </View>

              <View style={styles.badgeLine}>
                {hasXp && (
                  <Text style={[styles.badgeText, styles.badgeXp]}>
                    + {item.xpSum} XP
                  </Text>
                )}
                {hasPt && (
                  <Text style={[styles.badgeText, styles.badgePt]}>
                    + {item.ptSum} P
                  </Text>
                )}
              </View>
            </View>

            <Text style={styles.shortDate}>{toShortDate(item.createdAt)}</Text>
          </View>

          {/* 2줄: 상세 보기 */}
          <Text style={styles.detailHint}>자세히 보기</Text>
        </View>
      </Pressable>
    );
  };

  /** 바텀시트 내부 항목(원본 레코드 1개) */
  const renderSheetItem = ({ item }: { item: PointHistoryItem }) => {
    const hasXp = item.xpDelta > 0;
    const hasPt = item.ptDelta > 0;

    return (
      <View style={styles.sheetItem}>
        <View style={styles.sheetItemTop}>
          <View style={styles.sheetBadgeLine}>
            {hasXp && (
              <Text style={[styles.sheetBadgeText, styles.badgeXp]}>
                + {item.xpDelta} XP
              </Text>
            )}
            {hasPt && (
              <Text style={[styles.sheetBadgeText, styles.badgePt]}>
                + {item.ptDelta} P
              </Text>
            )}
          </View>

          <Text style={styles.sheetRightDate}>
            {toShortDate(item.createdAt)}
          </Text>
        </View>

        <Text style={styles.sheetItemTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    );
  };

  /** 바텀시트 콘텐츠(선택된 트랜잭션의 상세 레코드 리스트) */
  const SheetContent = () => {
    logScreenView('ConfirmEarnedHistoryModal', undefined, true);
    return (
      <View style={styles.sheetContainer}>
        <FlatList
          data={bundledItems}
          keyExtractor={it => it.id}
          renderItem={renderSheetItem}
          ItemSeparatorComponent={() => <View style={styles.sheetSeparator} />}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title="받은 내역 확인하기"
        backEventName="Back_ConfirmEarnedHistory"
      />

      <FlatList
        data={earnedList}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <BottomSheetModal visible={sheetVisible} onClose={closeSheet}>
        <SheetContent />
      </BottomSheetModal>
    </SafeAreaView>
  );
};

export default PointHistoryScreen;

const ICON_SIZE = scaleWidth(26);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  /* ================= 리스트 ================= */
  listContent: {
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleWidth(48),
  },
  separator: {
    height: scaleWidth(1),
    backgroundColor: COLORS.gray200,
    marginHorizontal: -scaleWidth(20),
  },
  rowPressable: {
    borderRadius: BORDER_RADIUS[12],
  },

  /* 아이템 */
  row: {
    paddingVertical: scaleWidth(24),
    gap: scaleWidth(12),
  },
  line1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: ICON_SIZE,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    // TODO(QA): Figma ConfirmEarnedHistory 기준 아이콘과 XP/P 텍스트 사이 간격 확인 필요
    marginRight: scaleWidth(6),
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    // TODO(QA): Figma ConfirmEarnedHistory 기준 XP와 P 사이 간격 확인 필요
    gap: scaleWidth(4),
  },
  badgeText: {
    // TODO(QA): Figma ConfirmEarnedHistory 기준 + 아이콘 및 XP/P 폰트 크기 확인 필요
    ...Heading_18SB,
  },
  // 시안 컬러: XP(블루), P(옐로)
  badgeXp: { color: COLORS.blue[6] },
  badgePt: { color: COLORS.yellow.main },

  shortDate: {
    ...Caption_14R,
    color: COLORS.gray600,
  },
  detailHint: {
    ...Caption_14R,
    color: COLORS.gray800,
  },

  /* ================= 바텀시트 ================= */
  sheetContainer: {
    // TODO(QA): Figma ConfirmEarnedHistoryModal 기준 리스트 하단 여백 확인 필요
    paddingBottom: scaleWidth(0),
  },
  sheetSeparator: {
    height: scaleWidth(1),
    backgroundColor: COLORS.gray200,
  },
  sheetItem: {
    // TODO(QA): Figma ConfirmEarnedHistoryModal 기준 항목 상하 padding 확인 필요
    paddingVertical: scaleWidth(18),
  },
  sheetItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetBadgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },
  sheetBadgeText: {
    // TODO(QA): Figma ConfirmEarnedHistoryModal 기준 XP/P 폰트 크기 확인 필요
    ...Heading_18SB,
  },
  sheetRightDate: {
    ...Caption_14R,
    color: COLORS.gray600,
  },
  sheetItemTitle: {
    // TODO(QA): Figma ConfirmEarnedHistoryModal 기준 XP/P와 서브 설명 사이 간격 확인 필요
    marginTop: scaleWidth(10),
    ...Body_16M,
    color: COLORS.black,
  },
});
