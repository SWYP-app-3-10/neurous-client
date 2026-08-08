import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  // 화면 하단(safe area 제외)과 토스트 하단 사이 기본 간격: 52
  // 52 외의 값으로 변경 시 호출부에서 bottomOffset 사용해 직접 지정 가능
  const bottomGap = bottomOffset ?? scaleWidth(52);
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

  /**
   * 실제 DOM(뷰) 렌더 여부
   *
   * - RN <Modal>을 쓰지 않고 화면 트리 안에 절대 위치 오버레이로 토스트를 그리기 때문에,
   *   visible이 false가 되어도 사라지는 애니메이션(fade-out)이 끝날 때까지는 렌더를 유지해야
   *   자연스럽게 사라진다. 애니메이션이 끝나면 isMounted를 false로 바꿔 언마운트한다.
   */
  const [isMounted, setIsMounted] = useState(visible);

  const hideToast = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);

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
      // 사라지는 애니메이션 → 끝나면 언마운트
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

      Animated.parallel(animations).start(() => {
        setIsMounted(false);
      });
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

  // 사라지는 애니메이션까지 끝나면 아예 렌더하지 않는다 (터치 영역 자체를 없앰)
  if (!isMounted) {
    return null;
  }

  return (
    // RN <Modal> 대신 화면 트리 안에 절대 위치 오버레이로 렌더링한다.
    // <Modal>은 별도의 네이티브 오버레이라서 pointerEvents="box-none"을 줘도
    // 뒤쪽 화면(스크롤 등)으로 터치가 전달되지 않는 문제가 있었다.
    // 절대 위치 View + pointerEvents 조합으로 바꾸면 토스트 노출 중에도
    // 뒤쪽 화면을 그대로 스크롤/터치할 수 있다.
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={containerStyle} pointerEvents="box-none">
        <Animated.View
          style={[toastBoxStyle, animatedStyle]}
          pointerEvents="none"
        >
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
    </View>
  );
};

const styles = StyleSheet.create({
  // 화면 전체를 덮는 절대 위치 오버레이 (RN <Modal> 대체)
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
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
