import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { Body_16M } from '../styles/typography';
import { CircleIcon, XIcon } from '../icons/commonIcons/commonIcons';
interface QuizOption {
  id: number;
  text: string;
}
interface QuizOptionCardProps {
  option: QuizOption;
  isCorrect: boolean;
}

const QuizOptionCard: React.FC<QuizOptionCardProps> = ({
  option,
  isCorrect,
}) => {
  return (
    <View
      style={[
        styles.optionCard,
        isCorrect ? styles.optionCardCorrect : styles.optionCardIncorrect,
      ]}
    >
      <Text style={styles.optionText}>{option.text}</Text>

      {isCorrect ? (
        <View style={styles.correctIconContainer}>
          <CircleIcon />
        </View>
      ) : (
        <View style={styles.incorrectIconContainer}>
          <XIcon color={COLORS.white} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: scaleWidth(68),
    gap: scaleWidth(20),
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleWidth(20),
    borderRadius: BORDER_RADIUS[16],
    backgroundColor: COLORS.gray100,
  },
  optionCardCorrect: {
    borderColor: COLORS.blue.main,
    backgroundColor: COLORS.blue[3],
    borderWidth: 1,
  },
  optionCardIncorrect: {
    borderColor: COLORS.red.main,
    backgroundColor: COLORS.red[3],
  },
  optionText: {
    ...Body_16M,
    color: COLORS.black,
    flex: 1,
  },
  correctIconContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.blue.main,
  },
  incorrectIconContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.red.main,
  },
});

export default QuizOptionCard;
