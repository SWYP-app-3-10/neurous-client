import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import {
  Heading_16EB_Round,
  Body_16SB,
  Body_16M,
  Caption_12SB,
  Caption_14R,
} from '../styles/typography';
import { LockIcon } from '../icons/commonIcons/simpleImages';

const MissionCard = React.memo(
  ({
    mission,
    myLevelPage = false,
  }: {
    mission: any;
    myLevelPage?: boolean;
  }) => {
    const current = Number(mission.current) || 0;
    const total = Number(mission.total) || 1;
    const isNotStarted = mission.status === null;
    const isCompleted = mission.status === '완료';

    const rawPercentage = (current / total) * 100;
    const progressPercentage = isCompleted
      ? 100
      : Math.min(100, Math.max(0, rawPercentage));

    // 내부 컨텐츠 렌더링 함수
    const renderCardContent = () => (
      <View
        style={[
          styles.cardPaddingWrapper,
          !myLevelPage && styles.cardPaddingWrapperHome,
          // 잠김 카드: 제목/배지/진행바 텍스트만 30% 투명도로 흐리게 (자물쇠는 별도 레이어라 투명 처리 안 됨)
          isNotStarted && styles.lockedContent,
        ]}
      >
        {/* 상단 Row */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.missionCardTitle,
              myLevelPage && styles.missionCardTitleMyLevelPage,
              // 완료 색상(#767C91)이 나의 레벨 탭 스타일에 덮이지 않도록 마지막에 적용
              isCompleted && styles.missionCardTitleCompleted,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {mission.title}
          </Text>
          {mission.status && (
            // 상태 배지는 홈/나의 레벨 탭 구분 없이 동일한 스타일(연보라/회색 필)을 사용한다
            <View
              style={[
                styles.statusBadge,
                isCompleted
                  ? styles.statusBadgeCompleted
                  : styles.statusBadgeInProgress,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  // 완료: 시안 기준 #767C91 (gray800), 진행 중: 메인 보라
                  { color: isCompleted ? COLORS.gray800 : COLORS.puple.main },
                ]}
              >
                {mission.status}
              </Text>
            </View>
          )}
        </View>

        {/* 하단 Row (프로그래스 바)는 나의 레벨 탭(myLevelPage) 카드에서만 표시하고,
            홈 카드는 제목+상태만 보여준다. */}
        {myLevelPage && (
          <View style={styles.bottomRow}>
            <View
              style={[
                styles.progressBarTrack,
                isNotStarted && styles.trackNotStarted,
                isCompleted && styles.trackCompleted,
                myLevelPage && styles.trackMyLevelPageCompleted,
              ]}
            >
              {!isNotStarted && (
                <LinearGradient
                  colors={[COLORS.yellow.light, COLORS.yellow.main]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercentage}%`,
                      borderTopLeftRadius: scaleWidth(9.5),
                      borderBottomLeftRadius: scaleWidth(9.5),
                      borderTopRightRadius: scaleWidth(9.5),
                      borderBottomRightRadius: scaleWidth(9.5),
                    },
                  ]}
                />
              )}
            </View>

            <View style={styles.countContainer}>
              <Text
                style={[
                  styles.countText,
                  isCompleted && styles.countTextCompleted,
                  myLevelPage && styles.countTextMyLevelPage,
                ]}
              >
                {current}/{total}
              </Text>
            </View>
          </View>
        )}
      </View>
    );

    /**
     * 잠김 카드의 자물쇠 아이콘
     *
     * 제목/배지 레이아웃과 무관하게 카드 전체 기준 가로 정중앙 + 시안 상하
     * padding(위 17 / 아래 17.5)에 맞춰 absolute로 겹쳐 그린다.
     * 제목/배지와 달리 자물쇠 자체는 투명 처리하지 않는다(시안 기준).
     */
    const renderLockOverlay = () =>
      isNotStarted && (
        <View style={styles.lockOverlayCenter}>
          {/* 자물쇠 크기: 시안 기준 가로 33 / 세로 37.95 (공용 LockIcon 기본 크기를 카드에서 override) */}
          <LockIcon
            style={{ width: scaleWidth(33), height: scaleWidth(37.95) }}
          />
        </View>
      );

    // --- 1. 나의 레벨 탭 (흰색 카드, 보더 있음, 둥글기 16) ---
    if (myLevelPage) {
      return (
        <View
          style={[
            styles.container,
            {
              borderRadius: BORDER_RADIUS[16],
              height: scaleWidth(72), // 시안 기준 배너 높이 72
            },
          ]}
        >
          <View
            style={[
              styles.whiteCardBackground,
              isNotStarted && styles.lockedCardBackground,
            ]}
          >
            {renderCardContent()}
            {/* 보더 뷰: absolute로 위에 덮어씌움 (투명도 미적용) */}
            <View style={styles.whiteCardBorder} />
          </View>
          {renderLockOverlay()}
        </View>
      );
    }

    // --- 2. 홈 화면 (흰색 카드, 보더 있음, 진행바 없음) ---
    // 나의 레벨 탭 카드와 동일한 흰색 카드 스타일을 사용하되 진행바/카운트는 표시하지 않는다.
    return (
      <View
        style={[
          styles.container,
          {
            borderRadius: BORDER_RADIUS[16],
            height: scaleWidth(72), // 시안 기준 배너 높이 72
          },
        ]}
      >
        <View
          style={[
            styles.whiteCardBackground,
            isNotStarted && styles.lockedCardBackground,
          ]}
        >
          {renderCardContent()}
          {/* 보더 뷰: absolute로 위에 덮어씌움 (투명도 미적용) */}
          <View style={styles.whiteCardBorder} />
        </View>
        {renderLockOverlay()}
      </View>
    );
  },
);

MissionCard.displayName = 'MissionCard';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: scaleWidth(105),
    overflow: 'hidden',
    position: 'relative',
    // borderRadius는 inline style로 제어함 (myLevelPage: 16, 홈: 20)
  },

  // 내부 패딩 및 배치
  cardPaddingWrapper: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleWidth(16),
    justifyContent: 'space-between',
  },
  // 홈 카드 전용: 하단 Row가 없어 상단 Row 하나만 세로 중앙 정렬
  cardPaddingWrapperHome: {
    // 시안 기준 상하 padding: 위 17 / 아래 17.5 (카드 높이 72 기준)
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(17),
    paddingBottom: scaleWidth(17.5),
    justifyContent: 'center',
  },

  // 흰색 카드 배경
  whiteCardBackground: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // 잠김 카드 배경: 시안 기준 #FBFBFC (테두리/내용의 투명도와 분리해서 처리)
  lockedCardBackground: {
    backgroundColor: '#FBFBFC',
  },
  // 잠김 카드 내용(제목, 배지, 진행바) 30% 투명도. 자물쇠는 별도 레이어(lockOverlayCenter)라 미적용
  lockedContent: {
    opacity: 0.3,
  },

  whiteCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BORDER_RADIUS[16],
    borderWidth: 1,
    borderColor: COLORS.gray300,
    pointerEvents: 'none',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  missionCardTitle: {
    ...Heading_16EB_Round,
    // 흰 배경 카드이므로 기본 텍스트 색은 검정을 사용
    color: COLORS.black,
    flex: 1,
    marginRight: scaleWidth(8),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // 완료 미션 제목 색상 (시안 #767C91)
  missionCardTitleCompleted: { color: COLORS.gray800 },
  missionCardTitleMyLevelPage: { ...Body_16SB, color: COLORS.black },

  statusBadge: {
    backgroundColor: COLORS.puple[5],
    borderRadius: BORDER_RADIUS[30],
    paddingHorizontal: scaleWidth(8),
    height: scaleWidth(26),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 홈/나의 레벨 탭 공용 상태 배지 스타일 (진행 중 / 완료)
  statusBadgeInProgress: { backgroundColor: COLORS.puple[2] },
  statusBadgeCompleted: { backgroundColor: COLORS.gray200 },
  statusText: { ...Caption_12SB, includeFontPadding: false },

  // --- 하단 Row ---
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: scaleWidth(24),
  },
  progressBarTrack: {
    flex: 1,
    height: scaleWidth(14),
    backgroundColor: COLORS.gray100,
    borderRadius: scaleWidth(9.5),
    overflow: 'hidden',
    marginRight: scaleWidth(12),
  },
  progressBarFill: {
    height: '100%',
    borderRadius: scaleWidth(9.5),
  },
  trackNotStarted: { backgroundColor: COLORS.white },
  trackCompleted: { backgroundColor: COLORS.gray400 },
  trackMyLevelPageCompleted: { backgroundColor: COLORS.gray200 },

  countContainer: {
    justifyContent: 'center',
    minWidth: scaleWidth(40),
  },
  countText: {
    ...Caption_14R,
    color: COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  countTextCompleted: { color: COLORS.puple.completed },
  countTextMyLevelPage: { ...Body_16M, color: COLORS.black },

  // 잠김 자물쇠: 카드 전체 기준 가로 정중앙 + 시안 상하 padding(위 17 / 아래 17.5)에 맞춰 배치
  // - 제목/배지와 opacity 없음(시안처럼 자물쇠 자체는 투명 처리하지 않음). 카드 배경(#FBFBFC)만으로 잠김 표현.
  // - pointerEvents: 'none' — 아이콘이 카드 터치(추후 인터랙션 추가 시)를 가로막지 않도록 함
  lockOverlayCenter: {
    position: 'absolute',
    top: scaleWidth(17),
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
});

export default MissionCard;
