import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ARTICLE_READ_POINT_COST,
  ARTICLE_READ_EXPERIENCE,
  AD_REWARD_POINTS,
  QUIZ_CORRECT_POINT,
  QUIZ_INCORRECT_POINT,
  QUIZ_CORRECT_EXPERIENCE,
  QUIZ_INCORRECT_EXPERIENCE,
  DAILY_ATTENDANCE_POINT,
  DAILY_ATTENDANCE_EXPERIENCE,
  WEEKLY_ATTENDANCE_POINT,
  WEEKLY_ATTENDANCE_EXPERIENCE,
} from '../config/rewards';

import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { Heading_20EB_Round, Body_16SB } from '../styles/typography';
import { levelDetailMap } from '../data/mock/characterData';

export const ArticlePointModalContent: React.FC = () => {
  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalContentText}>
        <Text style={styles.pointText}>{ARTICLE_READ_POINT_COST}포인트</Text>가
        사용돼요
      </Text>
    </View>
  );
};
export const ArticlePointModalContentGet: React.FC = () => {
  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalContentText}>
        <Text style={styles.pointText}>{AD_REWARD_POINTS}포인트</Text>를 받을 수
        있어요
      </Text>
    </View>
  );
};

export const ExperienceModalContent: React.FC<{
  point?: boolean;
  correct?: boolean;
  daily?: boolean;
  /**
   * 위클리 출석 보상 합산 표시 여부
   *
   * 위클리 출석은 일요일 데일리 출석 시 항상 데일리 보상과 함께 지급되므로,
   * true면 데일리 + 위클리 보상을 합산한 값을 보여준다 (별도 위클리 단독 지급은 없음).
   */
  weekly?: boolean;
  /** 글 읽기 보상 팝업 여부 (경험치만 지급, 포인트 없음) */
  articleRead?: boolean;
}> = ({
  point = false,
  correct = false,
  daily = false,
  weekly = false,
  articleRead = false,
}) => {
  const getPointText = weekly
    ? DAILY_ATTENDANCE_POINT + WEEKLY_ATTENDANCE_POINT
    : daily
      ? DAILY_ATTENDANCE_POINT
      : correct
        ? QUIZ_CORRECT_POINT
        : QUIZ_INCORRECT_POINT;
  const getExperienceText = articleRead
    ? ARTICLE_READ_EXPERIENCE
    : weekly
      ? DAILY_ATTENDANCE_EXPERIENCE + WEEKLY_ATTENDANCE_EXPERIENCE
      : daily
        ? DAILY_ATTENDANCE_EXPERIENCE
        : correct
          ? QUIZ_CORRECT_EXPERIENCE
          : QUIZ_INCORRECT_EXPERIENCE;

  return (
    <View style={styles.modalContent}>
      <View
        style={[
          styles.modalContentTextWrap,
          { backgroundColor: COLORS.blue[3] },
        ]}
      >
        <Text style={styles.getExperienceText}>
          경험치 {getExperienceText} XP
        </Text>
      </View>
      {point && (
        <View
          style={[
            styles.modalContentTextWrap,
            { backgroundColor: COLORS.yellow[1], marginLeft: scaleWidth(6) },
          ]}
        >
          <Text style={styles.getPointText}>포인트 {getPointText} P</Text>
        </View>
      )}
    </View>
  );
};

export const LevelUpModalContent: React.FC<{ newLevel: number }> = ({
  newLevel,
}) => {
  const levelTitle = levelDetailMap[newLevel].title;
  return (
    <View style={styles.levelUpModalContent}>
      <Text style={styles.levelUpModalContentText}>{levelTitle}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  levelUpModalContent: {
    marginTop: scaleWidth(20),
    alignItems: 'center',
    justifyContent: 'center',
    width: scaleWidth(248),
    height: scaleWidth(62),
    borderRadius: BORDER_RADIUS[12],
    backgroundColor: COLORS.puple[3],
  },
  levelUpModalContentText: {
    ...Heading_20EB_Round,
    color: COLORS.puple.main,
  },
  modalContentTextWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    height: scaleWidth(36),
    borderRadius: BORDER_RADIUS[30],
  },
  modalContentText: {
    ...Body_16SB,
    color: COLORS.gray700,
  },
  pointText: {
    ...Body_16SB,
    color: COLORS.puple.main,
  },
  getExperienceText: {
    ...Body_16SB,
    color: COLORS.blue[6],
  },
  getPointText: {
    ...Body_16SB,
    color: COLORS.yellow.medium,
  },
  modalContent: {
    marginTop: scaleWidth(4),
    flexDirection: 'row',
    alignItems: 'center',
  },
});
