import React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TextInputProps,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import IconButton from '../../../components/IconButton';
import { Ic_backIcon } from '../../../icons';
import X_SearchInput from '../../../assets/svg/X_SearchInput.svg';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../../styles/global';
import { Body_16M } from '../../../styles/typography';
import { logEvent } from '../../../services/analyticsService';

type Props = {
  value: string;

  // 입력 화면에서만 사용
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;

  placeholder?: string;
  goBackAction?: () => void;
  iconColor?: string;

  // 결과 화면 등에서 "표시만" 할 때 사용
  readOnly?: boolean;
  onPressBar?: () => void;

  inputProps?: Omit<
    TextInputProps,
    'value' | 'onChangeText' | 'onSubmitEditing'
  >;
};

const HEADER_HEIGHT = scaleWidth(52);
const SEARCH_BAR_HEIGHT = scaleWidth(52);

export default function SearchHeader({
  value,
  onChangeText,
  onSubmit,
  placeholder = '글을 검색해보세요',
  goBackAction,
  iconColor,
  readOnly = false,
  onPressBar,
  inputProps,
}: Props) {
  const navigation = useNavigation();

  const handleBack = () => {
    logEvent('Back_Search');
    if (goBackAction) return goBackAction();
    navigation.goBack();
  };

  const handleClear = () => {
    onChangeText?.('');
    logEvent('ClearText_Search');
  };

  return (
    <View style={styles.container}>
      {/* 뒤로가기 버튼 */}
      <View style={styles.leftArea}>
        <IconButton onPress={handleBack}>
          <Ic_backIcon color={iconColor ?? COLORS.gray800} />
        </IconButton>
      </View>

      {/* 검색바 */}
      <View style={styles.searchBarWrap}>
        {readOnly ? (
          // readOnly: 입력은 막고, 탭 시 onPressBar만 실행
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.readOnlyPressArea}
            onPress={onPressBar}
          >
            <TextInput
              value={value}
              placeholder={placeholder}
              placeholderTextColor={COLORS.gray600}
              style={styles.searchInput}
              editable={false}
              showSoftInputOnFocus={false}
              selectTextOnFocus={false}
              caretHidden
              focusable={false}
            />
          </TouchableOpacity>
        ) : (
          // 입력 모드: 텍스트 입력 + 값 있을 때 X 버튼
          <View style={styles.inputRow}>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={COLORS.gray600}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
              style={styles.searchInput}
              {...inputProps}
            />

            {!!value?.length && (
              <Pressable
                onPress={handleClear}
                hitSlop={10}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
              >
                <X_SearchInput color={COLORS.gray500} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    paddingHorizontal: scaleWidth(20),
    marginTop: scaleWidth(8),
    backgroundColor: COLORS.white,
  },

  leftArea: {
    marginRight: scaleWidth(12),
  },

  searchBarWrap: {
    flex: 1,
    height: SEARCH_BAR_HEIGHT,
    borderRadius: BORDER_RADIUS[16],
    backgroundColor: COLORS.gray100,
    paddingHorizontal: scaleWidth(20),
    justifyContent: 'center',
  },

  readOnlyPressArea: {
    flex: 1,
    justifyContent: 'center',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    height: '100%',
  },

  // 커서가 길어지는 원인(lineHeight를 높이로 주는 것) 제거
  searchInput: {
    flex: 1,
    ...Body_16M,
    color: COLORS.black,

    height: scaleWidth(24),
    paddingVertical: 0,
    paddingHorizontal: 0,
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  clearBtn: {
    width: scaleWidth(24),
    height: scaleWidth(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
