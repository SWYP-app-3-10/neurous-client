// PointCriteriaScreen.tsx
import React, { memo, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Image } from 'react-native';

// 공통 디자인 시스템 (색/스케일/라운드/타이포)
import { COLORS, BORDER_RADIUS, scaleWidth } from '../../../../styles/global';
import {
  Body_16SB,
  Heading_24EB_Round,
  Heading_18EB_Round,
  Heading_18B,
  Caption_14R,
} from '../../../../styles/typography';

import XpIcon from '../../../../assets/png/coin_xp.png';
import PtIcon from '../../../../assets/png/coin_p.png';
import { logScreenView } from '../../../../services/analyticsService';

/**
 * 경험치/포인트 획득 기준 목록
 * - label: 조건 설명
 * - xp: 지급 경험치(표시용 문자열)
 * - p: 지급 포인트(표시용 문자열)
 */
const rows = [
  { label: '미션 달성 시', xp: '40 XP', p: '40 P' },
  { label: '글 읽기 시', xp: '5 XP', p: '' },
  { label: '퀴즈 정답 시', xp: '20 XP', p: '30 P' },
  { label: '퀴즈 오답 시', xp: '10 XP', p: '10 P' },
  { label: '데일리 출석 시', xp: '5 XP', p: '10 P' },
  { label: '위클리 출석 시', xp: '30 XP', p: '30 P' },
  { label: '광고 시청 시', xp: '', p: '60 P' },
];

type RowItemProps = {
  label: string;
  xp?: string;
  p?: string;
};

/**
 * RowItem (각 줄이 개별 카드)
 * - 리스트를 row마다 카드(라운드/보더/배경)로 분리해서 렌더링
 * - 오른쪽에 XP/P pill 배지(값이 있을 때만) 표시
 */
const RowItem = memo(({ label, xp, p }: RowItemProps) => {
  return (
    <View style={styles.rowCard}>
      {/* 좌측: 조건 라벨 */}
      <Text style={styles.rowLabel}>{label}</Text>

      {/* 우측: 보상 배지 */}
      <View style={styles.badges}>
        {!!xp && (
          <View style={styles.xpPill}>
            <Text style={styles.pillTextXp}>{xp}</Text>
          </View>
        )}
        {!!p && (
          <View style={styles.ptPill}>
            <Text style={styles.pillTextPt}>{p}</Text>
          </View>
        )}
      </View>
    </View>
  );
});
RowItem.displayName = 'RowItem';

type InfoItemProps = {
  title: string;
  titleStyle: object;
  description: string;
  iconType?: 'XP' | 'PT';
};

const InfoItem = memo(
  ({ title, titleStyle, description, iconType }: InfoItemProps) => {
    return (
      <View style={styles.infoBlock}>
        {/* 아이콘 + 타이틀(한 줄 세트) */}
        <View style={styles.infoHead}>
          {iconType === 'XP' ? (
            <Image
              source={XpIcon}
              resizeMode="contain"
              style={styles.coinIcon}
            />
          ) : (
            <Image
              source={PtIcon}
              resizeMode="contain"
              style={styles.coinIcon}
            />
          )}

          <Text style={[styles.infoTitleBase, titleStyle]}>{title}</Text>
        </View>

        {/* 설명 */}
        <Text style={styles.infoDescSeparated}>{description}</Text>
      </View>
    );
  },
);
InfoItem.displayName = 'InfoItem';

const PointCriteriaScreen = () => {
  useEffect(() => {
    logScreenView('ConfirmStandard_Xp_P', undefined, true);
  }, []);
  return (
    <ScrollView
      style={styles.scroll} // 스크롤 컨테이너
      contentContainerStyle={styles.content} // 세로 여백
      showsVerticalScrollIndicator={false} // 스크롤바 숨김
    >
      {/* 섹션 1: 제목 */}
      <Text style={styles.title}>포인트 & 경험치란?</Text>

      {/* 섹션 1: 개념 설명 카드 */}
      <View style={styles.infoCard}>
        {/* 경험치 블록 (아이콘+타이틀 세트 / 설명 분리) */}
        <InfoItem
          title="경험치"
          titleStyle={styles.infoTitleXp}
          description="경험치를 모아 캐릭터 레벨을 올릴 수 있어요"
          iconType="XP"
        />

        <View style={styles.infoDivider} />

        {/* 포인트 블록 (아이콘+타이틀 세트 / 설명 분리) */}
        <InfoItem
          title="포인트"
          titleStyle={styles.infoTitlePt}
          description={
            '포인트를 사용해 더 많은 글을 읽을 수 있어요\n글 한 편당 30포인트가 필요해요'
          }
          iconType="PT"
        />
      </View>

      {/* 섹션 2: 제목 */}
      <Text style={styles.subTitle}>
        경험치와 포인트는 이렇게 모을 수 있어요!
      </Text>

      {/* 섹션 2: 기준 리스트 (각 row 개별 카드 + gap) */}
      <View style={styles.list}>
        {rows.map(item => (
          <RowItem
            key={item.label}
            label={item.label}
            xp={item.xp}
            p={item.p}
          />
        ))}
      </View>
    </ScrollView>
  );
};

export default PointCriteriaScreen;

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: scaleWidth(24), // 하단 스크롤 여백(부모 paddingHorizontal 사용 중)
  },
  h1: {
    ...Heading_24EB_Round, // 섹션 타이틀 타이포
    color: COLORS.black, // 타이틀 색상
    marginBottom: scaleWidth(10), // 타이틀 아래 간격
  },
  // 스크롤 컨테이너
  scroll: {
    flex: 1,
    marginHorizontal: scaleWidth(20),
  },
  content: {
    // TODO(QA): Figma ConfirmStandard_Xp_Point 기준 상단 탭바 bottom부터 포인트 & 경험치란? title top까지 간격 확인 필요
    paddingTop: scaleWidth(20),
    paddingBottom: scaleWidth(48),
  },
  // 화면 메인 타이틀
  title: {
    ...Heading_18EB_Round,
    color: COLORS.black,
    marginBottom: scaleWidth(24),
  },

  // 섹션 서브 타이틀
  subTitle: {
    ...Heading_18EB_Round,
    color: COLORS.black,
    marginBottom: scaleWidth(24),
  },
  // 상단 개념 설명 카드
  infoCard: {
    borderRadius: BORDER_RADIUS[16],
    borderWidth: scaleWidth(1),
    borderColor: COLORS.gray300,
    padding: scaleWidth(20),
    backgroundColor: COLORS.white,
    marginBottom: scaleWidth(40),
  },

  // 경험치/포인트 블록
  infoBlock: {},

  // 아이콘 + 타이틀 행
  infoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
  },

  // 개념 타이틀 공통
  infoTitleBase: {
    ...Heading_18B,
  },

  // 경험치 타이틀
  infoTitleXp: {
    color: COLORS.blue[6],
  },

  // 포인트 타이틀
  infoTitlePt: {
    color: COLORS.yellow.medium,
  },

  // 개념 설명 텍스트
  infoDescSeparated: {
    ...Caption_14R,
    color: COLORS.gray800,
    lineHeight: scaleWidth(23),
    marginTop: scaleWidth(16),
  },

  // 카드 내부 구분선
  infoDivider: {
    height: scaleWidth(1),
    backgroundColor: COLORS.gray300,
    marginVertical: scaleWidth(24),
  },

  // 기준 리스트 컨테이너
  list: {
    gap: scaleWidth(16),
  },

  // 기준 리스트 카드
  rowCard: {
    height: scaleWidth(72),
    borderRadius: BORDER_RADIUS[16],
    borderWidth: scaleWidth(1),
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // 기준 라벨 텍스트
  rowLabel: {
    ...Body_16SB,
    color: COLORS.black,
  },

  // 보상 배지 영역
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },

  // XP 배지
  xpPill: {
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleWidth(4),
    borderRadius: BORDER_RADIUS[30],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.blue[5],
  },

  // 포인트 배지
  ptPill: {
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleWidth(4),
    borderRadius: BORDER_RADIUS[30],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.yellow[1],
  },

  // XP 배지 텍스트
  pillTextXp: {
    ...Body_16SB,
    color: COLORS.blue[6],
  },

  // 포인트 배지 텍스트
  pillTextPt: {
    ...Body_16SB,
    color: COLORS.yellow.medium,
  },
  coinIcon: {
    width: scaleWidth(44),
    height: scaleWidth(44),
  },
});
