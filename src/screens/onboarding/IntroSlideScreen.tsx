import React, { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RouteNames } from '../../../routes';
import { OnboardingStackParamList } from '../../navigation/types';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../styles/global';
import Spacer from '../../components/Spacer';
import ActivityIndicator from '../../components/ActivityIndicator';
import {
  Body_15M,
  Heading_18EB_Round,
  Heading_24EB_Round,
} from '../../styles/typography';
import {
  Intro_CardList,
  Intro_Function,
  Intro_Search,
} from '../../icons/commonIcons/simpleImages';
import { logEvent } from '../../services/analyticsService';
import { useOnboardingStore } from '../../store/onboardingStore';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

type IntroSlide = {
  id: number;
  title: string;
  description: string;
  eventName: string;
  Illustration: React.ComponentType;
};

const INTRO_SLIDES: IntroSlide[] = [
  {
    id: 0,
    title: '미션과 추천 글로\n읽기를 시작해보세요',
    description:
      '관심 있는 분야의 글을 추천받고, 오늘의\n미션을 수행하며 읽기를 이어가 보세요.',
    eventName: 'Next_Onboarding_Function01_CardList',
    Illustration: Intro_CardList,
  },
  {
    id: 1,
    title: '읽을수록 성장하는\n캐릭터를 만나보세요',
    description:
      '글을 읽고 경험치를 모으면 레벨이\n오르고 새로운 캐릭터를 만날 수 있어요.',
    eventName: 'Next_Onboarding_Function02_Character',
    Illustration: Intro_Function,
  },
  {
    id: 2,
    title: '다양한 주제의 글을\n탐색해보세요',
    description: '경제, 사회, IT/과학 등\n다양한 분야의 글을 읽어보세요.',
    eventName: 'Next_Onboarding_Function03_Explore',
    Illustration: Intro_Search,
  },
];

/**
 * 온보딩 인트로 슬라이드 화면
 *
 * - 텍스트(타이틀+설명)는 고정 위치에서 fade 전환
 * - 예시 이미지(일러스트)는 좌우 슬라이딩
 * - 하단 인디케이터는 Animated spring으로 매끄럽게 전환
 * - 버튼으로 다음 페이지 이동 가능
 * - 좌우 스와이프로 앞/뒤 페이지 이동 가능
 * - 마지막 페이지에서 다음 버튼 클릭 시 관심분야 설정 화면으로 이동
 */
const IntroSlidesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();

  const flatListRef = useRef<FlatList<IntroSlide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const setOnboardingStep = useOnboardingStore(
    state => state.setOnboardingStep,
  );

  const fadeTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const pendingIndexRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // 버튼으로 이동 중일 때는 onScroll fade 트리거 무시
    if (isProgrammaticScrollRef.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const ratio = offsetX / width;
    const nearest = Math.round(ratio);

    // 절반 넘어가는 순간 한 번만 fade 트리거
    if (nearest !== currentIndex && nearest !== pendingIndexRef.current) {
      pendingIndexRef.current = nearest;
      fadeTransition(() => setCurrentIndex(nearest));
    }
  };

  const handleMomentumScrollEnd = () => {
    // 스크롤 완전히 끝난 후 pending 초기화
    pendingIndexRef.current = null;
    isProgrammaticScrollRef.current = false;
  };

  const handleNext = async () => {
    const currentSlide = INTRO_SLIDES[currentIndex];
    logEvent(currentSlide.eventName);

    if (currentIndex < INTRO_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;

      isProgrammaticScrollRef.current = true;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });

      fadeTransition(() => setCurrentIndex(nextIndex));
      return;
    }

    await setOnboardingStep('interests');
    navigation.navigate(RouteNames.INTERESTS, {});
  };

  const currentSlide = INTRO_SLIDES[currentIndex];

  const renderItem = ({ item }: { item: IntroSlide }) => {
    const Illustration = item.Illustration;

    return (
      <View style={[styles.slide, { width }]}>
        <Illustration />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 텍스트 영역 - 고정, fade 전환 */}
      <View style={styles.textSection}>
        <Spacer num={scaleWidth(48)} />
        <Animated.Text
          style={[
            Heading_24EB_Round,
            { color: COLORS.black },
            { opacity: fadeAnim },
          ]}
        >
          {currentSlide.title}
        </Animated.Text>
        <Spacer num={scaleWidth(20)} />
        <Animated.Text
          style={[Body_15M, { color: COLORS.gray600 }, { opacity: fadeAnim }]}
        >
          {currentSlide.description}
        </Animated.Text>
        <Spacer num={scaleWidth(47)} />
      </View>

      {/* 이미지 영역 - 슬라이딩 */}
      <View style={styles.illustrationSection}>
        <FlatList
          ref={flatListRef}
          data={INTRO_SLIDES}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        />
      </View>

      {/* 인디케이터 */}
      <Spacer num={scaleWidth(70)} />
      <ActivityIndicator activeIndex={currentIndex} />

      <Spacer num={scaleWidth(24)} />

      {/* 다음 버튼 */}
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={[Heading_18EB_Round, { color: COLORS.white }]}>다음</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  textSection: {
    paddingHorizontal: scaleWidth(20),
  },
  illustrationSection: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: scaleWidth(56),
    borderRadius: BORDER_RADIUS[16],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.puple.main,
    marginHorizontal: scaleWidth(20),
  },
});

export default IntroSlidesScreen;
