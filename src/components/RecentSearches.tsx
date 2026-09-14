import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import Button from './Button';
import IconButton from './IconButton';
import Spacer from './Spacer';

import XSearchIcon from '../assets/svg/X_Search.svg';
import { scaleWidth, BORDER_RADIUS, COLORS } from '../styles/global';
import { Body_16M } from '../styles/typography';
import { logEvent } from '../services/analyticsService';

type Props = {
  index: number;
  item: { searchName: string };

  // 검색어 클릭 시: 입력값 반영 + 검색 실행(혹은 화면 이동)
  setSearch: (text: string) => void;
  recordSearch: (keyword: string) => void | Promise<void>;

  // X 버튼 클릭 시: 해당 검색어 삭제
  removeSearchRecord: (name: string) => void | Promise<void>;

  // 옵션
  closeIconColor?: string;
};

// 표시 텍스트 규칙
// - 최대 8자(공백 포함)
// - 8자 초과 시: 8자 + '…' (총 9자)
// - 말줄임표는 공백 없이 바로 붙임(끝 공백 제거)
const toDisplayText = (text: string) => {
  const chars = Array.from(text);
  if (chars.length <= 8) return text;

  const head = chars.slice(0, 8).join('').replace(/\s+$/, '');
  return `${head}…`;
};

/**
 * RecentSearches
 * - 최근 검색어 칩 UI
 * - 칩 클릭: 입력값 반영 + 검색 실행
 * - X 클릭: 해당 검색어 삭제
 *
 * 텍스트 노출 기준
 * - 최대 8자(공백 포함), 초과 시 8자 + 말줄임표(…)를 공백 없이 뒤에 붙임
 */
const RecentSearches = ({
  index,
  item,
  setSearch,
  recordSearch,
  removeSearchRecord,
  closeIconColor,
}: Props) => {
  const displayName = useMemo(
    () => toDisplayText(item.searchName),
    [item.searchName],
  );

  return (
    <Button
      key={index.toString()}
      onPress={() => {
        setSearch(item.searchName);
        recordSearch(item.searchName);
        logEvent(`RecentSearchChip`);
      }}
      style={{
        borderRadius: BORDER_RADIUS[30],

        // 내용 기반(auto width)으로 보이게
        alignSelf: 'flex-start',
        flexGrow: 0,
        flexShrink: 1,

        paddingHorizontal: scaleWidth(12),
        height: scaleWidth(40),
        backgroundColor: COLORS.gray100,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <>
        {/* 검색어 텍스트 */}
        <View style={{ flexShrink: 1 }}>
          <Text
            style={{ ...Body_16M, color: COLORS.gray800 }}
            numberOfLines={1}
            ellipsizeMode="clip" // 우리가 만든 '…'만 보이게, RN이 다시 말줄임하지 않게
          >
            {displayName}
          </Text>
        </View>

        <Spacer horizontal num={5} />

        {/* 삭제 버튼 */}
        <IconButton onPress={() => removeSearchRecord(item.searchName)}>
          <XSearchIcon
            width={scaleWidth(16)}
            height={scaleWidth(16)}
            color={closeIconColor ?? COLORS.gray500}
          />
        </IconButton>
      </>
    </Button>
  );
};

export default RecentSearches;
