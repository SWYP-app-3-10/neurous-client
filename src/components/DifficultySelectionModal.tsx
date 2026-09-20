import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { Body_16SB } from '../styles/typography';
import { CheckIcon } from '../icons/commonIcons/commonIcons';
import Spacer from './Spacer';
import { logEvent, logScreenView } from '../services/analyticsService';

export type Difficulty = 'easy' | 'normal' | 'hard';

interface DifficultySelectionModalProps {
  initialDifficulty?: Difficulty | null;
  onSelect: (difficulty: Difficulty) => void;
}

const DifficultySelectionModal: React.FC<DifficultySelectionModalProps> = ({
  initialDifficulty = null,
  onSelect,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty | null>(initialDifficulty);
  useEffect(() => {
    logScreenView('Popup_Difficulty', undefined, true);
  }, []);
  useEffect(() => {
    setSelectedDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const handleSelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    // 난이도 선택 시 애널리틱스 로그
    logScreenView('Popup_Difficulty_Select', undefined, true);
    if (difficulty === 'easy') {
      logEvent('Choice_Difficulty_Easy_Popup_Difficulty');
    } else if (difficulty === 'normal') {
      logEvent('Choice_Difficulty_Medium_Popup_Difficulty');
    } else if (difficulty === 'hard') {
      logEvent('Choice_Difficulty_Hard_Popup_Difficulty');
    }
    onSelect(difficulty);
  };
  const difficultyOptions: { value: Difficulty; label: string }[] = [
    { value: 'easy', label: '쉬움' },
    { value: 'normal', label: '보통' },
    { value: 'hard', label: '어려움' },
  ];

  return (
    <View style={styles.container}>
      {/* TODO(QA): Figma Popup_Difficulty 기준 팝업 상단 여백(제목과 첫 선택지 사이) 값 확인 필요 */}
      <Spacer num={24} />
      {difficultyOptions.map((option, index) => {
        const isSelected = selectedDifficulty === option.value;
        return (
          <View key={option.value}>
            <TouchableOpacity
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handleSelect(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              <View
                style={[
                  styles.checkContainer,
                  {
                    backgroundColor: isSelected
                      ? COLORS.puple.main
                      : COLORS.gray300,
                  },
                ]}
              >
                <CheckIcon color={isSelected ? COLORS.white : COLORS.gray100} />
              </View>
            </TouchableOpacity>
            {/* TODO(QA): Figma Popup_Difficulty 기준 선택지 사이 간격 값 확인 필요 */}
            {index < difficultyOptions.length - 1 && <Spacer num={12} />}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    // TODO(QA): Figma Popup_Difficulty 기준 선택지 높이(팝업 전체 길이에 영향) 값 확인 필요
    height: scaleWidth(52),
    // TODO(QA): Figma Popup_Difficulty 기준 선택지 좌우 padding 값 확인 필요
    paddingHorizontal: scaleWidth(32),
    borderRadius: BORDER_RADIUS[12],
    backgroundColor: COLORS.gray100,
  },
  optionSelected: {
    borderColor: COLORS.puple.main,
    backgroundColor: COLORS.puple[3],
    borderWidth: 1,
  },
  optionText: {
    ...Body_16SB,
    color: COLORS.gray700,
  },
  optionTextSelected: {
    color: COLORS.puple.main,
  },
  checkContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
  },
});

export default DifficultySelectionModal;
