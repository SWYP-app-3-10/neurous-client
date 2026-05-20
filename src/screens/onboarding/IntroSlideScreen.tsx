import React, { useRef, useState } from 'react';
import {
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
  Intro_Fuction,
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
    title: '미션을 확인하고 관심 있는\n분야의 글을 읽어보세요',
    description:
      '관심 있는 분야의 글을 추천받고, 오늘의 미션을\n수행하며 경험치와 포인트를 모아보세요',
    eventName: 'Next_Onboarding_Function01_CardList',
    Illustration: Intro_CardList,
  },
  {
    id: 1,
    title: '레벨업하며 성장하는\n캐릭터를 확인해보세요',
    description:
      '활동을 통해 경험치를 모으면 레벨이 오르고\n새로운 캐릭터를 만날 수 있어요',
    eventName: 'Next_Onboarding_Function02_Character',
    Illustration: Intro_Fuction,
  },
  {
    id: 2,
    title: '다양한 주제의 글을 탐색하며\n낯선 글에 도전해보세요',
    description:
      '관심 있는 주제부터 새로운 분야까지,\n다양한 글을 탐색해보세요',
    eventName: 'Next_Onboarding_Function03_Explore',
    Illustration: Intro_Search,
  },
];

/**
 * 온보딩 인트로 슬라이드 화면
 *
 * - 버튼으로 다음 페이지 이동 가능
 * - 좌우 스와이프로 앞/뒤 페이지 이동 가능
 * - 마지막 페이지에서 다음 버튼 클릭 시 관심분야 설정 화면으로 이동
 */
const IntroSlidesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();

  const flatListRef = useRef<FlatList<IntroSlide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const setOnboardingStep = useOnboardingStore(
    state => state.setOnboardingStep,
  );

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / width);

    setCurrentIndex(nextIndex);
  };

  const handleNext = async () => {
    const currentSlide = INTRO_SLIDES[currentIndex];

    logEvent(currentSlide.eventName);

    if (currentIndex < INTRO_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });

      setCurrentIndex(currentIndex + 1);
      return;
    }

    await setOnboardingStep('interests');
    navigation.navigate(RouteNames.INTERESTS, {});
  };

  const renderItem = ({ item }: { item: IntroSlide }) => {
    const Illustration = item.Illustration;

    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.textSection}>
            <Spacer num={scaleWidth(48)} />
            <Text style={[Heading_24EB_Round, { color: COLORS.black }]}>
              {item.title}
            </Text>
            <Spacer num={scaleWidth(20)} />
            <Text style={[Body_15M, { color: COLORS.gray600 }]}>
              {item.description}
            </Text>
            <Spacer num={scaleWidth(47)} />
          </View>

          <View style={styles.illustrationSection}>
            <Illustration />
            <Spacer num={scaleWidth(70)} />
            <ActivityIndicator activeIndex={currentIndex} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={INTRO_SLIDES}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={[Heading_18EB_Round, { color: COLORS.white }]}>다음</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /** 전체 컨테이너 */
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  /** 슬라이드 한 페이지 */
  slide: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  /** 콘텐츠 영역 */
  contentWrapper: {
    flex: 1,
  },

  /** 제목 및 설명 영역 */
  textSection: {
    paddingHorizontal: scaleWidth(20),
  },

  /** 일러스트레이션 영역 */
  illustrationSection: {
    alignItems: 'center',
  },

  /** 다음 버튼 */
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
