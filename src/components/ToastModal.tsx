import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
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
  duration?: number;
  position?: ToastPosition;
  backgroundColor?: string;
  height?: number;
  width?: number;
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
  duration = 1500,
  position = 'bottom',
  backgroundColor = COLORS.gray800,
  height,
  width = scaleWidth(200),
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
  const bottomGap = bottomOffset ?? scaleWidth(20);
  const hasContentPadding =
    paddingHorizontal !== undefined || paddingVertical !== undefined;
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
    {
      backgroundColor,
      width,
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
          <Text style={[styles.message, messageStyle]}>{message}</Text>
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
  message: {
    ...Caption_14R,
    color: COLORS.white,
    textAlign: 'center',
  },
});

export default ToastModal;
