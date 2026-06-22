import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { COLORS, scaleWidth } from '../styles/global';

const DOT_ACTIVE_WIDTH = scaleWidth(24);
const DOT_INACTIVE_WIDTH = scaleWidth(6);
const DOT_HEIGHT = scaleWidth(6);

const AnimatedDot = ({ isActive }: { isActive: boolean }) => {
  const widthAnim = useRef(
    new Animated.Value(isActive ? DOT_ACTIVE_WIDTH : DOT_INACTIVE_WIDTH),
  ).current;
  const colorAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: isActive ? DOT_ACTIVE_WIDTH : DOT_INACTIVE_WIDTH,
      useNativeDriver: false,
      speed: 20,
      bounciness: 4,
    }).start();

    Animated.timing(colorAnim, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isActive, widthAnim, colorAnim]);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.gray300, COLORS.puple.main],
  });

  return (
    <Animated.View
      style={{
        height: DOT_HEIGHT,
        borderRadius: 99,
        width: widthAnim,
        backgroundColor,
      }}
    />
  );
};

const ActivityIndicator = ({
  activeIndex,
  dotCount = 3,
}: {
  activeIndex: number;
  dotCount?: number;
}) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scaleWidth(6),
      }}
    >
      {[...Array(dotCount)].map((_, index) => (
        <AnimatedDot key={index} isActive={index === activeIndex} />
      ))}
    </View>
  );
};

export default ActivityIndicator;
