import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, scaleWidth } from '../styles/global';
import { Body_16M, Body_18M, Heading_18B } from '../styles/typography';
import { BottomModalCheckIcon, ClockIcon, NoteIcon } from '../icons';
import { LevelCategory } from '../types/interests';
import { logEvent } from '../services/analyticsService';

interface LevelOption {
  value: LevelCategory;
  label: string;
  description: string;
  time: string;
}

interface LevelSelectionContentProps {
  selectedLevel: LevelCategory | null;
  onSelect: (level: LevelCategory) => void;
}

export const LEVEL_OPTIONS: LevelOption[] = [
  {
    value: LevelCategory.BEGINNER,
    label: '초급',
    description: '한 문단',
    time: '1분',
  },
  {
    value: LevelCategory.INTERMEDIATE,
    label: '중급',
    description: '두 문단',
    time: '2분',
  },
  {
    value: LevelCategory.ADVANCED,
    label: '고급',
    description: '세 문단',
    time: '4분',
  },
];

const LevelSelectionContent: React.FC<LevelSelectionContentProps> = ({
  selectedLevel,
  onSelect,
}) => {
  const handleSelect = (level: LevelCategory) => {
    onSelect(level);
  };

  return (
    <View style={styles.optionsContainer}>
      {LEVEL_OPTIONS.map(option => {
        const isSelected = selectedLevel === option.value;
        return (
          <React.Fragment key={option.value}>
            <TouchableOpacity
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => {
                handleSelect(option.value);
                if (option.label === '초급') {
                  logEvent('Difficulty_Beginner_EditLevelModal');
                } else if (option.label === '중급') {
                  logEvent('Difficulty_Intermediate_EditLevelModal');
                } else if (option.label === '고급') {
                  logEvent('Difficulty_Hard_EditLevelModal');
                }
              }}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionDetails}>
                  <View style={styles.optionLabelContainer}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionSelectedLabel,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <BottomModalCheckIcon color={COLORS.puple.main} />
                    )}
                  </View>
                  <View style={styles.optionDetailsContainer}>
                    <View style={[styles.detailItem]}>
                      <NoteIcon />
                      <Text
                        style={[
                          styles.detailText,
                          isSelected && styles.detailTextSelected,
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    <View style={[styles.detailItem]}>
                      <ClockIcon />
                      <Text
                        style={[
                          styles.detailText,
                          isSelected && styles.detailTextSelected,
                        ]}
                      >
                        {option.time}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {},
  // 옵션 행 높이는 선택 여부와 상관없이 항상 같게 고정한다.
  // (선택 시 체크 아이콘/굵은 텍스트가 붙으면서 행 높이가 달라져 바텀시트 높이·위치가 흔들리던 문제 방지)
  // 3개 옵션 x 59 = 177 (QA-016-01 기준 각 옵션 59px)
  // TODO(QA): Figma EditLevel_Modal(node 2:3627) 기준 바텀시트 전체 높이 289 (핸들 영역 + 옵션 3개 + 하단 여백) 확인 필요
  option: {
    height: scaleWidth(59),
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  optionSelected: {
    backgroundColor: COLORS.puple[3],
  },
  optionContent: {
    flexDirection: 'row',
  },
  optionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
  },
  optionLabel: {
    ...Body_18M,
    color: COLORS.black,
  },
  optionSelectedLabel: {
    ...Heading_18B,
    color: COLORS.puple.main,
  },
  optionDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: scaleWidth(165),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
  },
  detailText: {
    ...Body_16M,
    color: COLORS.black,
  },
  detailTextSelected: {
    color: COLORS.black,
  },
});

export default LevelSelectionContent;
