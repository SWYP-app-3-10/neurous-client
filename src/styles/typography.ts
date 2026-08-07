import { StyleSheet, TextStyle } from 'react-native';
import { scaleWidth } from './global';

const getFontFamily = (weight: number): string => {
  // 모든 플랫폼에서 정확한 폰트 이름 사용 (영어/숫자/한글 모두 동일한 굵기 보장)
  if (weight === 800) {
    return 'Pretendard-ExtraBold';
  } else if (weight === 700) {
    return 'Pretendard-Bold';
  } else if (weight === 600) {
    return 'Pretendard-SemiBold';
  } else if (weight === 500) {
    return 'Pretendard-Medium';
  } else if (weight === 400) {
    return 'Pretendard-Regular';
  } else {
    return 'Pretendard-Regular';
  }
};

// 커스텀 폰트를 사용할 때는 fontWeight를 지정하지 않음
// 커스텀 폰트 파일 자체가 이미 특정 굵기로 되어 있어서 fontWeight를 지정하면
// iOS/Android 모두에서 시스템이 폰트를 찾지 못하거나 잘못된 폰트가 적용될 수 있음
// 각 굵기별 폰트 파일(Pretendard-SemiBold, Pretendard-Bold 등)을 fontFamily로 직접 지정하는 것이 안전함

const getLineHeight = (fontSize: number, lineHeightPercent: number): number => {
  return scaleWidth((fontSize * lineHeightPercent) / 100);
};

const getLetterSpacing = (
  fontSize: number,
  letterSpacingPercent: number,
): number => {
  return scaleWidth((fontSize * letterSpacingPercent) / 100);
};

const createTextStyle = (
  size: number,
  weight: number,
  lineHeightPercent: number,
  letterSpacingPercent: number = 0,
): TextStyle => {
  const fontSize = scaleWidth(size);
  return {
    fontFamily: getFontFamily(weight),
    fontSize,
    lineHeight: getLineHeight(size, lineHeightPercent),
    letterSpacing: getLetterSpacing(size, letterSpacingPercent),
  };
};

const TYPOGRAPHY = StyleSheet.create({
  // ========== Heading Styles ==========
  Heading_24EB_Round: {
    fontFamily: 'NanumSquareRoundEB',
    fontSize: scaleWidth(24),
    lineHeight: getLineHeight(24, 150),
    letterSpacing: getLetterSpacing(24, 0),
  },
  Heading_20EB_Round: {
    fontFamily: 'NanumSquareRoundEB',
    fontSize: scaleWidth(20),
    lineHeight: getLineHeight(20, 150),
    letterSpacing: getLetterSpacing(20, 0),
  },
  Heading_18B: createTextStyle(18, 700, 150, 0),
  Heading_18EB_Round: {
    fontFamily: 'NanumSquareRoundEB',
    fontSize: scaleWidth(18),
    lineHeight: getLineHeight(18, 150),
    letterSpacing: getLetterSpacing(18, 0),
  },
  Heading_18SB: createTextStyle(18, 600, 150, 0),
  Heading_16B: createTextStyle(16, 700, 150, 0),
  Heading_16EB_Round: {
    fontFamily: 'NanumSquareRoundEB',
    fontSize: scaleWidth(16),
    lineHeight: getLineHeight(16, 150),
    letterSpacing: getLetterSpacing(16, 0),
  },
  // ========== Body Styles ==========
  Body_18M: createTextStyle(18, 500, 150, 0),
  Body_16SB: createTextStyle(16, 600, 150, 0),
  Body_16M: createTextStyle(16, 500, 150, 0),
  Body_16R: createTextStyle(16, 400, 160, 0),
  //
  Body_15M: createTextStyle(15, 500, 160, -2),

  // ========== Caption Styles ==========
  Caption_14R: createTextStyle(14, 400, 135, 0),
  Caption_12SB: createTextStyle(12, 600, 150, 0),
  Caption_12M: createTextStyle(12, 500, 150, 0),
  // 피그마 디자인 토큰 "Caption/11M" 대응 (AI 뱃지 등 초소형 라벨용)
  Caption_11M: createTextStyle(11, 500, 150, 0),
});

export const Heading_24EB_Round = TYPOGRAPHY.Heading_24EB_Round;
export const Heading_20EB_Round = TYPOGRAPHY.Heading_20EB_Round;
export const Heading_18B = TYPOGRAPHY.Heading_18B;
export const Heading_18EB_Round = TYPOGRAPHY.Heading_18EB_Round;
export const Heading_18SB = TYPOGRAPHY.Heading_18SB;
export const Heading_16B = TYPOGRAPHY.Heading_16B;
export const Heading_16EB_Round = TYPOGRAPHY.Heading_16EB_Round;

export const Body_18M = TYPOGRAPHY.Body_18M;
export const Body_16SB = TYPOGRAPHY.Body_16SB;
export const Body_16M = TYPOGRAPHY.Body_16M;
export const Body_16R = TYPOGRAPHY.Body_16R;
export const Body_15M = TYPOGRAPHY.Body_15M;

export const Caption_14R = TYPOGRAPHY.Caption_14R;
export const Caption_12SB = TYPOGRAPHY.Caption_12SB;
export const Caption_12M = TYPOGRAPHY.Caption_12M;
export const Caption_11M = TYPOGRAPHY.Caption_11M;
