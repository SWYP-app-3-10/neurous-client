import { Dimensions, PixelRatio } from 'react-native';

// 기준 디자인 크기 (디자인 시안 기준)
export const DESIGN_WIDTH = 393;
export const DESIGN_HEIGHT = 852;

// 실제 디바이스 크기 가져오기 (항상 최신 값)
const getScreenDimensions = () => Dimensions.get('window');

// 디바이스 크기 비율 계산 (가로 기준)
const getScaleWidth = () => {
  const { width } = getScreenDimensions();
  return width / DESIGN_WIDTH;
};

// 가로 기준 스케일링 함수
// 항상 최신 디바이스 크기를 기준으로 계산 (회전 시 자동 반영)
export const scaleWidth = (size: number): number => {
  const scaled = size * getScaleWidth();
  return PixelRatio.roundToNearestPixel(scaled);
};

// 현재 디바이스 크기 (필요시 사용)
export const getScreenSize = () => getScreenDimensions();

// (Border Radius)
export const BORDER_RADIUS: Record<number, number> = {
  16: scaleWidth(16),
  20: scaleWidth(20),
  // ?
  99: scaleWidth(99),
  30: scaleWidth(30),
  10: scaleWidth(10),
  12: scaleWidth(12),
  2: scaleWidth(2),
};

// 컬러 팔레트
export const COLORS = {
  // 그레이 색상
  white: '#FFFFFF',
  gray100: '#F6F7F9',
  gray200: '#E8E9EF',
  gray300: '#D9DCE5',
  gray400: '#CACED9',
  gray500: '#BCC1CF',
  gray600: '#ADB3C5',
  gray700: '#9EA5BB',
  gray800: '#767C91',
  /** Toast Popup stroke (Figma gray border on Gray800 surface) */
  gray800Stroke: '#6A6F82',
  gray800Opacity80: 'rgba(118, 124, 145, 0.8)',
  gray800Opacity95: 'rgba(118, 124, 145, 0.95)',
  black: '#19181E',
  blackOpacity60: 'rgba(0, 0, 0, 0.6) ',
  // 메인
  puple: {
    main: '#6F44F5',
    2: '#EDECFC',
    3: '#F6F4FE',
    5: '#9b7bFF',
    light: '#845DFF',
    lighter: '#764CF8',
    completed: '#BFABFF',
  },
  red: { main: '#ff7E6a', 3: '#FFEDEA' },
  blue: {
    main: '#4d8cff',
    3: '#E1EEFF',
    5: '#E8F4FF',
    6: '#00b1fc',
    correct: '#4d8cff',
  },
  yellow: {
    1: '#fff0ba',
    light: '#FFE682',
    medium: '#Fcb600',
    main: '#FCB000',
  },
  // 그림자
  shadow: '#000000',
  // Placeholder/배경
  placeholder: '#D9D9D9',
  // 오버레이
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayWhite: 'rgba(255, 255, 255, 0.7)',
  transparent: 'rgba(255, 255, 255, 0)',
  // 소셜 로그인
  kakao: '#FFD43B',
  naver: '#2DB400',
  // 온보딩
  onboardingPurple: '#9B59B6',
  onboardingGreen: '#2ECC71',
  // 기타
  grayLight: '#F5F5F5',
  grayMedium: '#E0E0E0',
  grayDark: '#D0D0D0',
  grayDarker: '#C0C0C0',
  grayDDD: '#ddd',
  purpleDark: '#6200EE',
  textDark: '#333',
  textMedium: '#666',
  gold: '#FFD700',
  iconDefault: '#171717',
};
