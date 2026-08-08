/**
 * 미션 화면 (MissionScreen.tsx)
 *
 * 앱의 메인 홈 화면으로, 오늘의 미션과 추천 아티클을 표시한다.
 *
 * 주요 기능:
 *   1. 오늘의 미션 캐러셀 (수평 스크롤)
 *   2. 추천 아티클 목록 (수직 스크롤)
 *   3. 일일 출석 체크 (포인트 & 경험치 지급)
 *   4. 레벨업 모달 표시 (AsyncStorage에서 감지)
 *   5. Android 뒤로가기 종료 처리 (2초 내 두 번 누르면 종료)
 *
 * 캐러셀 구조:
 *   - 첫 번째/마지막 카드: 353px 너비 (더 넓음)
 *   - 중간 카드: 348px 너비
 *   - 카드 간격: 10px
 *   - Snap 효과: 각 카드가 화면 중앙에 정렬
 *
 * 온보딩 리셋 조건:
 *   - 컨텐츠가 빈 배열이고
 *   - 온보딩이 완료된 상태이며
 *   - 관심분야가 선택되지 않았을 때
 *   → 관심분야 선택 단계로 리셋
 */

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import {
  Heading_24EB_Round,
  Body_16M,
  Heading_20EB_Round,
} from '../../styles/typography';
import Spacer from '../../components/Spacer';
import { useMissions } from '../../hooks/useMissions';
import { MissionCard, ArticleCard } from '../../components';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useArticleNavigation } from '../../hooks/useArticleNavigation';
import { convertMissionContentToArticle } from '../../api/missionApi';
import {
  MainTabNavigationProp,
  MissionStackParamList,
} from '../../navigation/types';
import { RouteNames } from '../../../routes';
import { useShowModal, useShowToastModal } from '../../store/modalStore';
import { usePointStore } from '../../store/pointStore';
import { ExperienceModalContent } from '../../components/ArticlePointModalContent';
import { useOnboardingStore } from '../../store/onboardingStore';

import {
  DAILY_ATTENDANCE_EXPERIENCE,
  DAILY_ATTENDANCE_POINT,
  WEEKLY_ATTENDANCE_EXPERIENCE,
  WEEKLY_ATTENDANCE_POINT,
} from '../../config/rewards';
import { useExperienceStore } from '../../store/experienceStore';
import IconButton from '../../components/IconButton';
import { AlarmIcon, Modal_IMG } from '../../icons';
import { logEvent, logScreenView } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';
import { getLocalDateKey } from '../../utils/dateUtils';
import { IS_INTERNAL_TEST } from '../../config/env';
import {
  MOCK_ARTICLE_QUIZ,
  MOCK_ARTICLE_THUMBNAIL_DATA_URI,
} from '../../data/mock/mockArticleQuiz';

// ──────────────────────────────────────────────
// 상수 정의
// ──────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 첫 번째와 마지막 미션 카드 너비 (더 넓음) */
const WIDTH_EDGE = scaleWidth(353);

/** 중간 미션 카드 너비 */
const WIDTH_MID = scaleWidth(348);

/** 카드 사이 간격 */
const GAP = scaleWidth(10);

/** 스크롤 이벤트 쓰로틀링 (60fps) */
const SCROLL_EVENT_THROTTLE = 16;

/** 일일 출석 체크 AsyncStorage 키 */
const DAILY_MISSION_ENTRY_KEY = '@daily_mission_entry';

/**
 * 첫 번째 카드를 화면 중앙에 배치하기 위한 좌우 여백
 *
 * 계산식:
 *   SIDE_SPACING = (화면 너비 - 첫 카드 너비) / 2
 *
 * 이렇게 하면 첫 카드가 화면 중앙에 정확히 위치한다.
 */
const SIDE_SPACING = (SCREEN_WIDTH - WIDTH_EDGE) / 2;

// 퀴즈 보상 상수 re-export
export {
  QUIZ_CORRECT_EXPERIENCE,
  QUIZ_CORRECT_POINT,
  QUIZ_INCORRECT_EXPERIENCE,
  QUIZ_INCORRECT_POINT,
} from '../../config/rewards';

const MissionScreen = () => {
  const navigation =
    useNavigation<MainTabNavigationProp<MissionStackParamList>>();

  // ──────────────────────────────────────────────
  // Refs
  // ──────────────────────────────────────────────

  /** 미션 캐러셀 ScrollView 참조 (수평 스크롤) */
  const scrollViewRef = useRef<ScrollView>(null);

  /** 전체 ScrollView 참조 (수직 스크롤) */
  const verticalScrollViewRef = useRef<ScrollView>(null);

  /**
   * 일일 출석 체크 완료 여부 플래그
   *
   * 앱 실행 중 한 번만 체크하도록 방지
   * (화면 재진입 시 중복 체크 방지)
   */
  const hasCheckedDailyEntryRef = useRef(false);

  /**
   * Android 뒤로가기 종료 타이머
   *
   * 2초 내에 두 번째 뒤로가기를 누르면 앱 종료
   */
  const backPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 빈 컨텐츠 체크 완료 여부 플래그
   *
   * 온보딩 리셋을 한 번만 실행하도록 방지
   */
  const hasCheckedEmptyContentsRef = useRef(false);

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /**
   * 현재 캐러셀에서 선택된 미션 인덱스
   *
   * 캐러셀 인디케이터 표시에 사용
   */
  const [currentIndex, setCurrentIndex] = useState(0);

  // ──────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────

  /** 아티클 클릭 핸들러 (글 읽기 화면으로 이동) */
  const { handleArticlePress } = useArticleNavigation({
    returnTo: 'mission',
    entrySource: 'home',
  });

  const showModal = useShowModal();
  const showToastModal = useShowToastModal();
  const { addPoints } = usePointStore();
  const { addExperience } = useExperienceStore();

  /**
   * 미션 및 컨텐츠 데이터 조회
   *
   * 응답 데이터:
   *   - missions: 오늘의 미션 목록
   *   - contents: 추천 아티클 목록
   */
  const {
    data: missionData,
    isLoading: missionsLoading,
    refetch: refetchMissions,
  } = useMissions();

  /** 온보딩 상태 관리 */
  const { resetOnboarding, isOnboardingCompleted, interests } =
    useOnboardingStore();

  // ──────────────────────────────────────────────
  // Effect 1: 빈 컨텐츠 감지 및 온보딩 리셋
  // ──────────────────────────────────────────────

  /**
   * 컨텐츠가 비어있고 관심분야가 선택되지 않았을 때 온보딩으로 리셋
   *
   * 리셋 조건:
   *   1. contents 배열이 비어있음
   *   2. 온보딩이 완료된 상태 (isOnboardingCompleted === true)
   *   3. 관심분야가 선택되지 않음 (interests가 null이거나 빈 객체)
   *   4. 아직 체크하지 않음 (hasCheckedEmptyContentsRef === false)
   *
   * 리셋 동작:
   *   - resetOnboarding('interests') 호출
   *   - 관심분야 선택 화면으로 이동
   *
   * 플래그 리셋 조건:
   *   - 컨텐츠가 다시 생기거나 관심분야가 선택되면
   *     hasCheckedEmptyContentsRef를 false로 리셋
   *     (다시 빈 배열이 될 수 있으므로)
   */
  useEffect(() => {
    if (!missionsLoading && missionData) {
      const contents = missionData.contents || [];

      // 관심분야가 선택되었는지 확인
      const hasInterests =
        interests !== null &&
        typeof interests === 'object' &&
        Object.keys(interests).length > 0;

      if (
        contents.length === 0 &&
        isOnboardingCompleted &&
        !hasInterests &&
        !hasCheckedEmptyContentsRef.current
      ) {
        console.log(
          '[MissionScreen] 컨텐츠가 빈 배열이고 관심분야가 선택되지 않았습니다. 온보딩 상태를 리셋합니다.',
        );
        hasCheckedEmptyContentsRef.current = true;
        resetOnboarding('interests');
      } else if (contents.length > 0 || hasInterests) {
        // 컨텐츠가 있거나 관심분야가 있으면 플래그 리셋
        hasCheckedEmptyContentsRef.current = false;
      }
    }
  }, [
    missionData,
    missionsLoading,
    resetOnboarding,
    isOnboardingCompleted,
    interests,
  ]);

  // ──────────────────────────────────────────────
  // Effect 2: 탭 포커스 시 데이터 갱신 및 스크롤 최상단 이동
  // ──────────────────────────────────────────────

  /**
   * 미션 탭으로 전환될 때마다 실행
   *
   * 처리:
   *   1. 최신 미션 및 컨텐츠 데이터 조회 (refetch)
   *   2. 수직 스크롤을 맨 위로 이동
   *
   * useFocusEffect를 사용하는 이유:
   *   - 탭 전환 시마다 실행되어야 하므로
   *   - useEffect는 탭 전환 시 트리거되지 않음
   */
  useFocusEffect(
    useCallback(() => {
      refetchMissions();
      verticalScrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [refetchMissions]),
  );

  // ──────────────────────────────────────────────
  // 데이터 변환 및 정렬
  // ──────────────────────────────────────────────

  /**
   * 미션 목록 정렬
   *
   * 정렬 순서:
   *   1. 진행 중 (status === '진행 중')
   *   2. 완료 (status === '완료')
   *   3. 잠김 (status === null)
   *
   * 이유:
   *   - 사용자가 현재 진행할 수 있는 미션을 먼저 보여주기 위함
   *   - 캐러셀에서 진행 중인 미션이 앞에 위치
   */
  const missions = useMemo(() => {
    if (!missionData?.missions) {
      return [];
    }

    return [...missionData.missions].sort((a, b) => {
      // 진행 중 우선
      if (a.status === '진행 중' && b.status !== '진행 중') {
        return -1;
      }
      if (b.status === '진행 중' && a.status !== '진행 중') {
        return 1;
      }

      // 완료 다음
      if (
        a.status === '완료' &&
        b.status !== '완료' &&
        b.status !== '진행 중'
      ) {
        return -1;
      }
      if (
        b.status === '완료' &&
        a.status !== '완료' &&
        a.status !== '진행 중'
      ) {
        return 1;
      }

      // 잠김 마지막
      if (a.status === null && b.status !== null) {
        return 1;
      }
      if (b.status === null && a.status !== null) {
        return -1;
      }

      return 0;
    });
  }, [missionData?.missions]);

  /** 추천 아티클 목록 */
  const contents = useMemo(
    () => missionData?.contents || [],
    [missionData?.contents],
  );

  // ──────────────────────────────────────────────
  // 캐러셀 Snap 위치 계산
  // ──────────────────────────────────────────────

  /**
   * 각 카드가 화면 중앙에 오기 위한 스크롤 위치(Offset) 계산
   *
   * 계산 방식:
   *   1. 첫 카드 위치: 0
   *   2. 각 카드 너비 + 간격을 누적하여 다음 카드 위치 계산
   *   3. 첫/마지막 카드는 WIDTH_EDGE, 중간 카드는 WIDTH_MID 사용
   *
   * 예시 (카드 3개):
   *   - offsets[0] = 0
   *   - offsets[1] = WIDTH_EDGE + GAP
   *   - offsets[2] = WIDTH_EDGE + GAP + WIDTH_MID + GAP
   *
   * 이 오프셋들을 ScrollView의 snapToOffsets에 전달하면
   * 각 카드가 정확히 화면 중앙에 정렬된다.
   */
  const snapOffsets = useMemo(() => {
    const offsets: number[] = [];
    let currentPos = 0;

    missions.forEach((_, index) => {
      const isEdge = index === 0 || index === missions.length - 1;
      const cardWidth = isEdge ? WIDTH_EDGE : WIDTH_MID;

      offsets.push(currentPos);
      currentPos += cardWidth + GAP;
    });

    return offsets;
  }, [missions]);

  // ──────────────────────────────────────────────
  // 이벤트 핸들러
  // ──────────────────────────────────────────────

  /**
   * 캐러셀 스크롤 핸들러
   *
   * 현재 스크롤 위치에서 가장 가까운 오프셋의 인덱스를 찾아
   * currentIndex를 업데이트한다.
   *
   * 동작 원리:
   *   1. 현재 스크롤 위치 추출 (contentOffset.x)
   *   2. 각 오프셋과 다음 오프셋의 중간 지점을 기준으로 판단
   *   3. 스크롤 위치가 중간 지점을 넘으면 다음 인덱스로 전환
   *
   * 캐러셀 인디케이터 업데이트:
   *   - currentIndex가 변경되면 인디케이터 점이 활성화됨
   */
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;

      const index = snapOffsets.findIndex((offset, i) => {
        const nextOffset = snapOffsets[i + 1] || Infinity;
        return scrollPosition < (offset + nextOffset) / 2;
      });

      if (index !== -1 && index !== currentIndex) {
        setCurrentIndex(index);
      }
    },
    [snapOffsets, currentIndex],
  );

  /**
   * 알림 화면으로 이동
   *
   * 헤더의 알림 아이콘 클릭 시 호출
   */
  const handleNavigateToNotification = useCallback(() => {
    navigation.navigate(RouteNames.FULL_SCREEN_STACK, {
      screen: RouteNames.CHARACTER_NOTIFICATION,
    });
  }, [navigation]);

  /**
   * [내부 테스트] 스토어 스크린샷용 mock 카드 클릭 핸들러
   *
   * 실제 아티클과 달리 useArticleNavigation(접근 권한 확인, 포인트 차감 등)을
   * 거치지 않고 MockArticleDetailScreen으로 바로 이동한다.
   */
  const handlePressMockArticleCard = useCallback(() => {
    navigation.navigate(RouteNames.FULL_SCREEN_STACK, {
      screen: RouteNames.MOCK_ARTICLE_DETAIL,
    });
  }, [navigation]);

  // ──────────────────────────────────────────────
  // Effect 3: Android 뒤로가기 종료 처리
  // ──────────────────────────────────────────────

  /**
   * Android에서 뒤로가기 버튼을 두 번 누르면 앱 종료
   *
   * 동작 원리:
   *   1. 뒤로가기할 페이지가 있으면 기본 동작 허용 (뒤로가기)
   *   2. 뒤로가기할 페이지가 없으면:
   *      - 첫 번째 백키: 토스트 표시 + 타이머 시작 (2초)
   *      - 두 번째 백키 (2초 내): 앱 종료
   *      - 2초 경과: 타이머 리셋 (다시 첫 번째 백키로 간주)
   *
   * useFocusEffect를 사용하는 이유:
   *   - 화면이 포커스되어 있을 때만 이벤트 리스너 활성화
   *   - 다른 화면으로 이동하면 자동으로 리스너 제거
   */
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return;
      }

      const backAction = () => {
        // 뒤로가기할 페이지가 있으면 기본 동작 (뒤로가기)
        if (navigation.canGoBack()) {
          return false;
        }

        // 타이머가 있으면 (2초 내 두 번째 백키) 앱 종료
        if (backPressTimerRef.current) {
          clearTimeout(backPressTimerRef.current);
          backPressTimerRef.current = null;
          BackHandler.exitApp();
          return true;
        }

        // 첫 번째 백키: 토스트 표시
        showToastModal({
          message: "'뒤로' 버튼을 한번 더 누르시면 종료됩니다.",
          position: 'bottom',
          backgroundColor: COLORS.blackOpacity60,
          height: scaleWidth(67),
          width: scaleWidth(353),
          borderRadius: BORDER_RADIUS[16],
        });
        logScreenView('Popup_Out_App', undefined, true);

        // 2초 후 타이머 초기화
        backPressTimerRef.current = setTimeout(() => {
          backPressTimerRef.current = null;
        }, 2000);

        return true; // 기본 동작 차단
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction,
      );

      // cleanup: 이벤트 리스너 및 타이머 제거
      return () => {
        backHandler.remove();
        if (backPressTimerRef.current) {
          clearTimeout(backPressTimerRef.current);
          backPressTimerRef.current = null;
        }
      };
    }, [navigation, showToastModal]),
  );

  // ──────────────────────────────────────────────
  // Effect 4: 일일 출석 체크
  // ──────────────────────────────────────────────

  /**
   * 앱 실행 시 일일 출석 체크 및 포인트/경험치 지급
   *
   * 처리 흐름:
   *   1. AsyncStorage에서 마지막 출석 날짜 조회
   *   2. 오늘 날짜와 비교
   *   3. 날짜가 다르면:
   *      - 오늘 날짜 저장
   *      - 포인트 및 경험치 지급
   *      - 출석 체크 모달 표시
   *   4. 같으면: 아무 동작 없음
   *
   * 중복 체크 방지:
   *   - hasCheckedDailyEntryRef로 한 번만 실행되도록 제어
   *   - 화면 재진입 시에도 중복 체크하지 않음
   *
   * 날짜 형식:
   *   - ISO 형식의 날짜만 비교 (YYYY-MM-DD)
   *   - 시간은 무시 (같은 날이면 출석으로 간주)
   */
  useEffect(() => {
    if (hasCheckedDailyEntryRef.current) {
      return;
    }

    const checkDailyEntry = async () => {
      try {
        // 로컬(기기) 기준 "오늘" 날짜와 요일을 하나의 Date로 통일해서 계산
        // (UTC 기준 toISOString과 로컬 기준 getDay()를 섞어 쓰면
        //  한국시간 자정~오전 9시 사이에 하루가 어긋나는 문제가 있었음)
        const now = new Date();
        const today = getLocalDateKey(now); // YYYY-MM-DD (로컬 기준)
        const lastEntryDate = await AsyncStorage.getItem(
          DAILY_MISSION_ENTRY_KEY,
        );

        if (lastEntryDate !== today) {
          // 오늘 처음 진입
          await AsyncStorage.setItem(DAILY_MISSION_ENTRY_KEY, today);
          hasCheckedDailyEntryRef.current = true;

          // 일요일(마지막 요일) 데일리 출석 = 위클리 출석도 함께 완료
          // 위클리는 항상 이 시점에 데일리와 합산 지급되므로 별도 dedup이 필요 없다
          // (DAILY_MISSION_ENTRY_KEY의 하루 1회 체크가 위클리 중복 지급도 함께 막아준다)
          const isWeeklyAttendanceComplete = now.getDay() === 0; // 0 = 일요일 (today와 동일한 now 기준)

          // 포인트 및 경험치 지급 (일요일이면 데일리 + 위클리 합산)
          addPoints(
            DAILY_ATTENDANCE_POINT +
              (isWeeklyAttendanceComplete ? WEEKLY_ATTENDANCE_POINT : 0),
          );
          addExperience(
            DAILY_ATTENDANCE_EXPERIENCE +
              (isWeeklyAttendanceComplete ? WEEKLY_ATTENDANCE_EXPERIENCE : 0),
          );

          // Mixpanel: 보상 팝업 노출 (데일리 출석)
          trackEvent('reward_popup_view', {
            reward_type: 'xp_point',
            reward_source: 'daily_attendance',
            xp_amount: DAILY_ATTENDANCE_EXPERIENCE,
            point_amount: DAILY_ATTENDANCE_POINT,
          });

          // Mixpanel: 위클리 출석도 같은 시점에 완료되었으면 별도 이벤트로 함께 기록
          // (팝업은 하나로 합쳐서 보여주지만, 분석 이벤트는 각 reward_source별로 남긴다)
          if (isWeeklyAttendanceComplete) {
            trackEvent('reward_popup_view', {
              reward_type: 'xp_point',
              reward_source: 'weekly_attendance',
              xp_amount: WEEKLY_ATTENDANCE_EXPERIENCE,
              point_amount: WEEKLY_ATTENDANCE_POINT,
            });
          }

          // 출석 체크 모달 표시 (일요일이면 데일리+위클리 합산 값으로 표시)
          showModal({
            title: '포인트 & 경험치 획득!',
            image: <Modal_IMG />,
            titleStyle: {
              ...Heading_20EB_Round,
            },
            titleDescriptionGapSize: scaleWidth(20),
            children: React.createElement(ExperienceModalContent, {
              point: true,
              daily: true, // 일일 출석 표시
              weekly: isWeeklyAttendanceComplete, // 일요일이면 위클리 합산 표시로 전환
            }),
            primaryButton: { title: '확인', onPress: () => {} },
          });
        } else {
          // 오늘 이미 진입했음
          hasCheckedDailyEntryRef.current = true;
        }
      } catch (error) {
        console.error('일일 진입 체크 실패:', error);
      }
    };

    checkDailyEntry();
  }, [addExperience, addPoints, showModal]);

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  // 로딩 중
  if (missionsLoading) {
    return (
      <SafeAreaView style={missionScreenStyles.container}>
        <View style={missionScreenStyles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.puple.main} />
        </View>
      </SafeAreaView>
    );
  }

  // 데이터 존재 여부 확인
  const hasMissions = missions.length > 0;
  const hasContents = contents.length > 0;

  // 정상 렌더링
  return (
    <SafeAreaView style={missionScreenStyles.container} edges={['top']}>
      <ScrollView
        ref={verticalScrollViewRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true} // 중첩 스크롤 허용 (캐러셀 + 전체 스크롤)
        contentContainerStyle={missionScreenStyles.scrollContent}
      >
        {/* ────── 헤더 ────── */}
        <View style={missionScreenStyles.notificationButtonContainer}>
          {/* 레이아웃 밸런스를 위한 빈 공간 */}
          <View style={missionScreenStyles.notificationButton} />

          {/* 알림 버튼 */}
          <IconButton onPress={handleNavigateToNotification}>
            <AlarmIcon color={COLORS.gray800} />
          </IconButton>
        </View>

        <View style={missionScreenStyles.header}>
          <View style={missionScreenStyles.headerLeft}>
            <Text style={missionScreenStyles.headerTitle}>오늘의 미션</Text>
            <Text style={missionScreenStyles.headerDescription}>
              오늘의 미션을 통해 새로운 지식을 탐험하고{'\n'}문해력을
              키워보세요!
            </Text>
          </View>
        </View>

        <Spacer num={38} />

        {/* ────── 미션 캐러셀 ────── */}
        {hasMissions ? (
          <>
            <View>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={SCROLL_EVENT_THROTTLE}
                decelerationRate="fast" // 빠른 감속 (Snap 효과 향상)
                snapToOffsets={snapOffsets} // 각 카드 위치에 Snap
                snapToAlignment="start" // 왼쪽 정렬 기준 Snap
                disableIntervalMomentum={true} // 스크롤 중 Snap 비활성화
                nestedScrollEnabled={true}
                contentContainerStyle={{
                  paddingHorizontal: SIDE_SPACING, // 첫 카드 중앙 정렬용 패딩
                }}
              >
                {missions.map((mission, index) => {
                  const isEdge = index === 0 || index === missions.length - 1;
                  return (
                    <View
                      key={mission.id}
                      style={{
                        width: isEdge ? WIDTH_EDGE : WIDTH_MID,
                        marginRight: index === missions.length - 1 ? 0 : GAP,
                        height: scaleWidth(105),
                      }}
                    >
                      <MissionCard mission={mission} />
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <Spacer num={21} />

            {/* 캐러셀 인디케이터 (점) */}
            <View style={missionScreenStyles.carouselIndicators}>
              {missions.map((_, index) => (
                <View
                  key={index}
                  style={[
                    missionScreenStyles.indicatorDot,
                    index === currentIndex &&
                      missionScreenStyles.indicatorDotActive,
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          // 미션 데이터가 없을 때
          <>
            <View style={missionScreenStyles.emptyMissionContainer}>
              <Text style={missionScreenStyles.emptyText}>
                오늘의 미션이 없습니다
              </Text>
            </View>
            <Spacer num={16} />
          </>
        )}

        <Spacer num={47} />

        {/* ────── 추천 아티클 목록 ────── */}
        <View style={missionScreenStyles.articleList}>
          {/*
            [내부 테스트] 스토어 스크린샷용 mock 카드
            - 서버 데이터가 아닌 고정된 목데이터(mockArticleQuiz.ts)를 사용
            - IS_INTERNAL_TEST 빌드에서만 노출, 실서비스 배포 빌드에는 표시되지 않음
            - 실제 추천 아티클 목록보다 항상 맨 위에 위치
          */}
          {IS_INTERNAL_TEST && (
            <ArticleCard
              article={{
                id: 'mock-article',
                title: MOCK_ARTICLE_QUIZ.title,
                category: MOCK_ARTICLE_QUIZ.categoryName,
                readTime: '3분',
                date: MOCK_ARTICLE_QUIZ.contentDate,
                // ArticleCard는 Image를 {uri: imageUrl} 형태로만 그리므로
                // 로컬 require 에셋 대신 base64 data URI를 사용해야 카드에 썸네일이 보인다
                imageUrl: MOCK_ARTICLE_THUMBNAIL_DATA_URI,
              }}
              onPress={handlePressMockArticleCard}
            />
          )}

          {hasContents ? (
            contents.map((content, index) => {
              const article = convertMissionContentToArticle(content, index);

              return (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onPress={() => {
                    handleArticlePress(
                      article.contentId,
                      undefined,
                      article.category,
                    );

                    // analytics 이벤트 로그 (처음 9개 카드만)
                    if (index < 9) {
                      logEvent(`Card0${index + 1}_Home`);
                    }
                  }}
                />
              );
            })
          ) : (
            // 아티클 데이터가 없을 때
            <View style={missionScreenStyles.emptyContentContainer}>
              <Text style={missionScreenStyles.emptyText}>
                추천 아티클이 없습니다
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const missionScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: scaleWidth(8),
  },
  notificationButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    height: scaleWidth(52),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(8),
  },
  headerLeft: {
    flex: 1,
    paddingRight: scaleWidth(12),
  },
  /** 레이아웃 밸런스를 위한 빈 공간 (알림 버튼과 대칭) */
  notificationButton: {
    width: scaleWidth(112),
    height: scaleWidth(52),
  },
  headerTitle: {
    ...Heading_24EB_Round,
    color: COLORS.black,
    marginBottom: scaleWidth(4),
  },
  headerDescription: {
    ...Body_16M,
    color: COLORS.gray600,
  },
  /** 캐러셀 인디케이터 컨테이너 */
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleWidth(8),
  },
  /** 인디케이터 점 (비활성) */
  indicatorDot: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    backgroundColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS[99],
  },
  /** 인디케이터 점 (활성) */
  indicatorDotActive: {
    backgroundColor: COLORS.puple.main,
    width: scaleWidth(12),
    height: scaleWidth(12),
  },
  scrollContent: {
    paddingBottom: scaleWidth(50),
  },
  articleList: {
    gap: scaleWidth(24),
    paddingHorizontal: scaleWidth(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  emptyMissionContainer: {
    height: scaleWidth(200),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  emptyContentContainer: {
    minHeight: scaleWidth(100),
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scaleWidth(40),
  },
  emptyText: {
    ...Body_16M,
    color: COLORS.gray600,
  },
});

export default MissionScreen;
