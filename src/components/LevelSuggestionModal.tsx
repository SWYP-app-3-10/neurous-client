/**
 * 난이도 제안 모달 컴포넌트
 *
 * 사용자의 피드백 패턴을 분석하여 난이도 변경을 제안하는 모달
 *
 * 주요 기능:
 *   1. 제안 사유에 따른 메시지 표시 (쉬움/어려움)
 *   2. 제안 수락 ("좋아요" 버튼)
 *   3. 제안 거절 ("지금은 괜찮아요" 버튼)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import {
  Body_16SB,
  Caption_12M,
  Caption_14R,
  Heading_16B,
  Heading_24EB_Round,
} from '../styles/typography';
import { LevelCategory } from '../types/interests';
import Button from './Button';
import Spacer from './Spacer';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

interface LevelSuggestionModalProps {
  /** 제안하는 난이도 */
  suggestedLevel: LevelCategory;

  /** 제안 사유 */
  reason: 'easy' | 'hard';

  /** 통계 정보 */
  stats: {
    easyCount: number;
    normalCount: number;
    hardCount: number;
  };

  /** 수락 핸들러 */
  onAccept: () => void;

  /** 거절 핸들러 */
  onDecline: () => void;
}

// ──────────────────────────────────────────────
// 난이도 한글 변환
// ──────────────────────────────────────────────

const LEVEL_TEXT_MAP: Record<LevelCategory, string> = {
  [LevelCategory.BEGINNER]: '초급',
  [LevelCategory.INTERMEDIATE]: '중급',
  [LevelCategory.ADVANCED]: '고급',
};

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────

const LevelSuggestionModal: React.FC<LevelSuggestionModalProps> = ({
  suggestedLevel,
  reason,

  onAccept,
  onDecline,
}) => {
  const suggestionMessage = useMemo(() => {
    const suggestedLevelText = LEVEL_TEXT_MAP[suggestedLevel];

    if (reason === 'easy') {
      return {
        levelBadgeText: suggestedLevelText,
        description: `최근 난이도 기록을 보니,
지금보다 조금 더 어려운 글도 
읽어볼 수 있을 것 같아요.`,
      };
    }

    if (suggestedLevel === LevelCategory.INTERMEDIATE) {
      return {
        levelBadgeText: suggestedLevelText,
        description: `최근 난이도 기록을 보니, 
지금보다 쉬운 난이도로 차근차근
소화해보는 게 좋을 것 같아요`,
      };
    }

    return {
      levelBadgeText: suggestedLevelText,
      description: `최근 난이도 기록을 보니, 
지금보다 쉬운 난이도로 차근차근
소화해보는 게 좋을 것 같아요`,
    };
  }, [suggestedLevel, reason]);

  return (
    <View style={styles.container}>
      {/* 난이도 배지 */}
      <View style={styles.levelBadge}>
        <Text style={styles.levelBadgeCaption}>추천 난이도</Text>
        <Text style={styles.levelBadgeText}>
          {suggestionMessage.levelBadgeText}
        </Text>
      </View>

      <Spacer num={8} />

      {/* 설명 */}
      <Text style={styles.description}>{suggestionMessage.description}</Text>

      <Spacer num={24} />

      {/* 버튼 */}
      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          title="좋아요"
          onPress={onAccept}
          style={styles.acceptButton}
          textStyle={styles.acceptButtonText}
        />

        <Spacer num={12} />

        <Button
          variant="ghost"
          title="지금은 괜찮아요"
          onPress={onDecline}
          style={styles.declineButton}
          textStyle={styles.declineButtonText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: scaleWidth(248),
    alignSelf: 'center',
    alignItems: 'stretch',
    paddingTop: scaleWidth(4),
  },
  levelBadge: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleWidth(16),
    borderRadius: BORDER_RADIUS[12],
    backgroundColor: COLORS.puple[3],
  },
  levelBadgeCaption: {
    ...Caption_12M,
    color: COLORS.puple.main,
    textAlign: 'center',
  },
  levelBadgeText: {
    ...Heading_24EB_Round,
    color: COLORS.puple.main,
    textAlign: 'center',
  },
  description: {
    ...Caption_14R,
    width: '100%',
    color: COLORS.gray600,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  acceptButton: {
    width: '100%',
    height: scaleWidth(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    ...Heading_16B,
    width: '100%',
    color: COLORS.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  declineButton: {
    width: '100%',
    height: scaleWidth(48),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  declineButtonText: {
    ...Body_16SB,
    width: '100%',
    color: COLORS.gray700,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});

export default LevelSuggestionModal;
