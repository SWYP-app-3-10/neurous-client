import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { Caption_14R } from '../styles/typography';

export type ToastPosition = 'bottom' | 'center';

interface ToastModalProps {
  visible: boolean;
  message: string;
  /** 메시지 왼쪽에 표시할 아이콘 (예: 체크 배지). 지정 시 가로 레이아웃으로 전환 */
  icon?: React.ReactNode;
  duration?: number;
  position?: ToastPosition;
  backgroundColor?: string;
  height?: number;
  width?: number;
  /** width 미지정 시, 화면 좌우에 둘 여백 기준으로 풀폭 너비를 자동 계산 */
  marginHorizontal?: number;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  messageStyle?: StyleProp<TextStyle>;
  bottomOffset?: number;
  onClose?: () => void;
}

const ToastModal: React.FC<ToastModalProps> = ({
  visible,
  message,
  icon,
  duration = 1500,
  position = 'bottom',
  backgroundColor = COLORS.gray800,
  height,
  width,
  marginHorizontal,
  borderRadius = BORDER_RADIUS[12],
  borderColor,
  borderWidth,
  paddingHorizontal,
  paddingVertical,
  messageStyle,
  bottomOffset,
  onClose,
}) => {
  const { bottom } = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const bottomGap = bottomOffset ?? scaleWidth(20);
  const hasContentPadding =
    paddingHorizontal !== undefined || paddingVertical !== undefined;

  /**
   * 토스트 박스 너비 결정
   * - width를 직접 지정하면 그대로 사용
   * - width 없이 marginHorizontal만 지정하면 화면 좌우 여백 기준 풀폭 계산 (아이콘 토스트 등)
   * - 둘 다 없으면 기존 기본값(200) 유지 (기존 호출부 영향 없음)
   */
  const resolvedWidth =
    width ??
    (marginHorizontal !== undefined
      ? SCREEN_WIDTH - marginHorizontal * 2
      : scaleWidth(200));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(position === 'bottom' ? scaleWidth(24) : 0),
  ).current;
  const scaleAnim = useRef(
    new Animated.Value(position === 'center' ? 0.8 : 1),
  ).current;

  const hideToast = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      // 나타나는 애니메이션
      const animations: Animated.CompositeAnimation[] = [
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ];

      if (position === 'bottom') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        );
      } else {
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        );
      }

      Animated.parallel(animations).start();

      // 자동으로 사라지는 타이머
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // 사라지는 애니메이션
      const animations: Animated.CompositeAnimation[] = [
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ];

      if (position === 'bottom') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 50,
            duration: 200,
            useNativeDriver: true,
          }),
        );
      } else {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        );
      }

      Animated.parallel(animations).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration, hideToast, position]);

  const containerStyle =
    position === 'bottom' ? styles.containerBottom : styles.containerCenter;

  const animatedStyle =
    position === 'bottom'
      ? {
          bottom: bottom + bottomGap,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      : {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        };

  const toastBoxStyle = [
    styles.toastContainer,
    icon ? styles.toastContainerWithIcon : null, // 아이콘 있으면 가로 정렬로 전환
    {
      backgroundColor,
      width: resolvedWidth,
      borderRadius,
      ...(height !== undefined ? { height } : {}),
      ...(!height && !hasContentPadding ? { height: scaleWidth(48) } : {}),
      ...(paddingHorizontal !== undefined ? { paddingHorizontal } : {}),
      ...(paddingVertical !== undefined ? { paddingVertical } : {}),
      ...(borderWidth != null && borderColor
        ? { borderWidth, borderColor }
        : {}),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={hideToast}
    >
      <View style={containerStyle} pointerEvents="box-none">
        <Animated.View style={[toastBoxStyle, animatedStyle]}>
          {icon}
          <Text
            style={[
              styles.message,
              icon ? styles.messageWithIcon : null,
              messageStyle,
            ]}
          >
            {message}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  containerBottom: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toastContainer: {
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  // 아이콘 + 텍스트 가로 배치 (예: 난이도 설정 완료 토스트)
  toastContainerWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
  },
  message: {
    ...Caption_14R,
    color: COLORS.white,
    textAlign: 'center',
  },
  // 아이콘이 있을 때는 좌측 정렬 + 남은 공간 채움
  messageWithIcon: {
    flex: 1,
    textAlign: 'left',
  },
});

export default ToastModal;
