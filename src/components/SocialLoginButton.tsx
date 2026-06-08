import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from './Button';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { AppleIcon, GoogleIcon, Tooltip_RecentIcon } from '../icons';
import { KakaoIcon } from '../icons/commonIcons/commonIcons';
import { NaverIcon } from '../icons/commonIcons/commonIcons';
import { SocialLoginProvider } from '../services/socialLoginService';
import { RecentLoginInfo } from '../services/authStorageService';
import Spacer from './Spacer';

interface SocialLoginButtonProps {
  provider: SocialLoginProvider;
  onPress: () => void;
  loading: SocialLoginProvider | null;
  recentLogin: RecentLoginInfo | null;
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  onPress,
  loading,
  recentLogin,
}) => {
  const showTooltip = recentLogin?.provider === provider;

  const renderButton = () => {
    switch (provider) {
      case 'APPLE':
        return (
          <Button
            variant="primary"
            style={styles.appleButton}
            onPress={onPress}
            disabled={loading !== null}
          >
            <AppleIcon />
            <Spacer horizontal num={8} />
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>
              애플 계정으로 로그인
            </Text>
          </Button>
        );
      case 'GOOGLE':
        return (
          <Button
            variant="outline"
            style={styles.outlineButton}
            onPress={onPress}
            disabled={loading !== null}
          >
            <GoogleIcon />
            <Spacer horizontal num={8} />
            <Text style={styles.socialButtonText}>구글 계정으로 로그인</Text>
          </Button>
        );
      case 'KAKAO':
        return (
          <Button
            variant="primary"
            style={styles.kakaoButton}
            onPress={onPress}
            disabled={loading !== null}
          >
            <KakaoIcon />
            <Spacer horizontal num={8} />
            <Text style={[styles.socialButtonText, styles.kakaoButtonText]}>
              카카오 계정으로 로그인
            </Text>
          </Button>
        );
      case 'NAVER':
        return (
          <Button
            variant="primary"
            style={styles.naverButton}
            onPress={onPress}
            disabled={loading !== null}
          >
            <NaverIcon />
            <Spacer horizontal num={8} />
            <Text style={[styles.socialButtonText, styles.naverButtonText]}>
              네이버 계정으로 로그인
            </Text>
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.buttonWrapper}>
      {showTooltip && (
        <View style={styles.tooltipContainer} pointerEvents="none">
          <View style={styles.tooltipBackground} />
          <Tooltip_RecentIcon />
        </View>
      )}
      {renderButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    width: '100%',
    position: 'relative',
  },
  tooltipContainer: {
    position: 'absolute',
    top: scaleWidth(-55),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  tooltipBackground: {
    position: 'absolute',
    width: scaleWidth(163),
    height: scaleWidth(42),
    borderRadius: BORDER_RADIUS[16],
    zIndex: -1,
  },
  appleButton: {
    width: '100%',
    backgroundColor: COLORS.black,
    borderWidth: 0,
  },
  outlineButton: {
    backgroundColor: COLORS.white,
  },
  kakaoButton: {
    backgroundColor: COLORS.kakao,
  },
  naverButton: {
    backgroundColor: COLORS.naver,
  },
  socialButtonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: scaleWidth(16),
  },
  kakaoButtonText: {
    color: COLORS.black,
  },
  naverButtonText: {
    color: COLORS.white,
  },
  appleButtonText: {
    color: COLORS.white,
  },
});

export default SocialLoginButton;
