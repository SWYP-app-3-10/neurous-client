// levelData.ts
import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { scaleWidth } from '../../../../styles/global';
import {
  Level_1_Profile,
  Level_2_Profile,
  Level_3_Profile,
  Level_4_Profile,
  Level_5_Profile,
} from '../../../../icons';

export type LevelCriteria = {
  id: number;
  title: string;
  requiredExp: number;
  summaryTitle: string;
  summaryDesc: string;

  // 레벨별 캐릭터 컴포넌트 (사이즈 조정 가능)
  character: (style?: StyleProp<ImageStyle>) => React.ReactElement;
};

const createCharacterRenderer = (
  Component: React.ComponentType<{ style?: StyleProp<ImageStyle> }>,
  defaultSize?: { width?: number; height?: number },
): ((style?: StyleProp<ImageStyle>) => React.ReactElement) => {
  return (style?: StyleProp<ImageStyle>) => {
    const mergedStyle = defaultSize
      ? [{ width: defaultSize.width, height: defaultSize.height }, style]
      : style;
    return React.createElement(Component, { style: mergedStyle });
  };
};

export const levelList: LevelCriteria[] = [
  // summaryDesc 반영하지 않음 -> 추후 기획 수정 시 사용
  {
    id: 1,
    title: 'Lv. 1 아메바',
    requiredExp: 0,
    summaryTitle: '처음 시작',
    summaryDesc: '누구나 ...', // 반영하지 않음 -> 추후 기획 수정 시 사용
    character: createCharacterRenderer(Level_1_Profile, {
      width: scaleWidth(69.51),
      height: scaleWidth(62.53),
    }),
  },
  {
    id: 2,
    title: 'Lv. 2 꼬물 물고기',
    requiredExp: 100,
    summaryTitle: '경험치 100',
    summaryDesc: '퀴즈를 5개 풀면 달성할 수 있어요!',
    character: createCharacterRenderer(Level_2_Profile, {
      width: scaleWidth(76.21),
      height: scaleWidth(65.53),
    }),
  },
  {
    id: 3,
    title: 'Lv. 3 리틀 몽키',
    requiredExp: 500,
    summaryTitle: '경험치 500',
    summaryDesc: '퀴즈를 25개 풀면 달성할 수 있어요!',
    // TODO(QA): Figma ConfirmStandard_Level 기준 정수리에 잎사귀가 있는 Lv.3 리틀 몽키 에셋 교체 필요
    character: createCharacterRenderer(Level_3_Profile, {
      width: scaleWidth(84.4),
      height: scaleWidth(95.45),
    }),
  },
  {
    id: 4,
    title: 'Lv. 4 꼬마 원시인',
    requiredExp: 2000,
    summaryTitle: '경험치 2000',
    summaryDesc: '퀴즈를 100개 풀면 달성할 수 있어요!',
    character: createCharacterRenderer(Level_4_Profile, {
      width: scaleWidth(74.56),
      height: scaleWidth(84.46),
    }),
  },
  {
    id: 5,
    title: 'Lv. 5 아인슈타인',
    requiredExp: 6000,
    summaryTitle: '경험치 6000',
    summaryDesc: '퀴즈를 300개 풀면 달성할 수 있어요!',
    character: createCharacterRenderer(Level_5_Profile, {
      width: scaleWidth(83.57),
      height: scaleWidth(89.05),
    }),
  },
];
