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
  ({ mission, myPage = false }: { mission: any; myPage?: boolean }) => {
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
          !myPage && styles.cardPaddingWrapperHome,
        ]}
      >
        {/* 상단 Row */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.missionCardTitle,
              isCompleted && styles.missionCardTitleCompleted,
              myPage && styles.missionCardTitleMyPage,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {mission.title}
          </Text>
          {mission.status && (
            // 상태 배지는 홈/마이페이지 구분 없이 동일한 스타일(연보라/회색 필)을 사용한다
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
                  { color: isCompleted ? COLORS.gray700 : COLORS.puple.main },
                ]}
              >
                {mission.status}
              </Text>
            </View>
          )}
        </View>

        {/* 하단 Row (프로그래스 바)는 마이페이지(캐릭터 탭) 카드에서만 표시하고,
            홈 카드는 제목+상태만 보여준다. */}
        {myPage && (
          <View style={styles.bottomRow}>
            <View
              style={[
                styles.progressBarTrack,
                isNotStarted && styles.trackNotStarted,
                isCompleted && styles.trackCompleted,
                myPage && styles.trackMyPageCompleted,
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
                  myPage && styles.countTextMyPage,
                ]}
              >
                {current}/{total}
              </Text>
            </View>
          </View>
        )}
      </View>
    );

    // --- 1. 마이페이지 (흰색 카드, 보더 있음, 둥글기 16) ---
    if (myPage) {
      return (
        <View
          style={[
            styles.container,
            {
              opacity: isNotStarted ? 0.3 : 1,
              borderRadius: BORDER_RADIUS[16],
            },
          ]}
        >
          <View style={styles.whiteCardBackground}>
            {renderCardContent()}
            {/* 보더 뷰: absolute로 위에 덮어씌움 */}
            <View style={styles.whiteCardBorder} />
          </View>
          {isNotStarted && (
            <View style={styles.lockOverlay}>
              <LockIcon />
            </View>
          )}
        </View>
      );
    }

    // --- 2. 홈 화면 (흰색 카드, 보더 있음, 진행바 없음) ---
    // 마이페이지 카드와 동일한 흰색 카드 스타일을 사용하되 진행바/카운트는 표시하지 않는다.
    return (
      <View
        style={[
          styles.container,
          {
            opacity: isNotStarted ? 0.3 : 1,
            borderRadius: BORDER_RADIUS[16],
            height: scaleWidth(74),
          },
        ]}
      >
        <View style={styles.whiteCardBackground}>
          {renderCardContent()}
          {/* 보더 뷰: absolute로 위에 덮어씌움 */}
          <View style={styles.whiteCardBorder} />
        </View>
        {isNotStarted && (
          <View style={[styles.lockOverlay, styles.lockOverlayHome]}>
            <LockIcon />
          </View>
        )}
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
    // borderRadius는 inline style로 제어함 (myPage ? 16 : 20)
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
    justifyContent: 'center',
  },

  // 흰색 카드 배경
  whiteCardBackground: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  missionCardTitleCompleted: { color: COLORS.gray800 },
  missionCardTitleMyPage: { ...Body_16SB, color: COLORS.black },

  statusBadge: {
    backgroundColor: COLORS.puple[5],
    borderRadius: BORDER_RADIUS[30],
    paddingHorizontal: scaleWidth(8),
    height: scaleWidth(26),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 홈/마이페이지 공용 상태 배지 스타일 (진행 중 / 완료)
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
  trackMyPageCompleted: { backgroundColor: COLORS.gray200 },

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
  countTextMyPage: { ...Body_16M, color: COLORS.black },

  lockOverlay: {
    position: 'absolute',
    bottom: scaleWidth(32),
    left: scaleWidth(157),
  },
  lockOverlayHome: {
    bottom: scaleWidth(15),
  },
});

export default MissionCard;
