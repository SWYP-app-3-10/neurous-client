/**
 * "다음 글 보기" 모달 컨텐츠 (NextArticleModalContent.tsx)
 *
 * 글 상세 화면에서 "다 읽었어요" 버튼을 누르면 뜨는 모달의 본문이다.
 * 리워드 칩과 3단 액션 버튼(다음 글 보기 / 퀴즈 풀고 더 얻기 / 지금은 괜찮아요)을
 * 전부 이 컴포넌트 안에서 렌더링한다.
 *
 * showModal의 primaryButton/secondaryButton은 버튼 2개가 가로로 나란히
 * 배치되는 레이아웃만 지원하기 때문에, 세로로 3단 배치되는 이 모달은
 * LevelSuggestionModal처럼 버튼까지 포함한 컨텐츠 전체를 children으로 전달한다.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { Body_16SB, Caption_14R } from '../styles/typography';
import Button from './Button';
import Spacer from './Spacer';

interface NextArticleModalContentProps {
  /** 글 읽기로 실제 지급된 경험치 값 */
  experience: number;
  /** "다음 글 보기" 클릭 핸들러 */
  onNextArticle: () => void;
  /** "퀴즈 풀고 더 얻기" 클릭 핸들러 */
  onMoreQuiz: () => void;
  /** "지금은 괜찮아요" 클릭 핸들러 */
  onDismiss: () => void;
}

const NextArticleModalContent: React.FC<NextArticleModalContentProps> = ({
  experience,
  onNextArticle,
  onMoreQuiz,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      {/* 리워드 칩 — 이 시점에 실제로 지급되는 보상은 글 읽기 경험치 하나뿐이라
          그 값만 보여준다 (미션 완료/데일리 출석 등 다른 보상은 실제로 지급되지 않음) */}
      <View style={styles.chip}>
        <Text style={styles.chipText}>글 읽기 +{experience}</Text>
      </View>

      <Spacer num={24} />

      <Button
        variant="primary"
        title="다음 글 보기"
        onPress={onNextArticle}
        style={styles.actionButton}
      />

      <Spacer num={12} />

      <Button
        variant="outline"
        title="퀴즈 풀고 더 얻기"
        onPress={onMoreQuiz}
        style={styles.actionButton}
      />

      <Spacer num={16} />

      <Button
        variant="ghost"
        title="지금은 괜찮아요"
        onPress={onDismiss}
        style={styles.dismissButton}
        textStyle={styles.dismissButtonText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: scaleWidth(248),
    alignSelf: 'center',
    alignItems: 'center',
  },
  chip: {
    alignSelf: 'center',
    paddingHorizontal: scaleWidth(12),
    height: scaleWidth(36),
    borderRadius: BORDER_RADIUS[30],
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    ...Body_16SB,
    color: COLORS.gray700,
  },
  actionButton: {
    width: '100%',
  },
  dismissButton: {
    width: '100%',
    height: scaleWidth(24),
  },
  dismissButtonText: {
    ...Caption_14R,
    color: COLORS.gray600,
  },
});

export default NextArticleModalContent;
