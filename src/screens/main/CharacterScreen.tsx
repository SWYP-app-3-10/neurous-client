/**
 * 캐릭터 화면 (CharacterScreen.tsx)
 *
 * 사용자의 성장 현황을 시각적으로 보여주는 메인 화면이다.
 *
 * 주요 기능:
 *   1. 레벨별 캐릭터 애니메이션 (Lottie)
 *   2. 경험치 진행률 표시 및 레벨업 추적
 *   3. 포인트 및 경험치 현황
 *   4. 주간 출석 기록 (7일)
 *   5. 오늘의 미션 목록 (진행 중 → 완료 → 잠김 순서)
 *
 * 데이터 소스:
 *   - useCharacterMe: 사용자 성장 정보, 출석 기록, 미션 목록
 *   - useCharacterData: 다음 레벨까지 필요한 경험치
 *
 * 화면 구성:
 *   - 상단: 레벨별 캐릭터 애니메이션 (Lottie)
 *   - 레벨 버튼: 현재 레벨 표시 + 툴팁 (1.5초 자동 숨김)
 *   - 레벨 진행 카드: 경험치 진행률, 포인트/경험치 현황
 *   - 주간 출석 기록: 월~일 7일간 출석 체크
 *   - 오늘의 미션: 정렬된 미션 카드 목록
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RouteNames } from '../../../routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import {
  Body_16R,
  Caption_14R,
  Caption_12M,
  Heading_20EB_Round,
  Heading_24EB_Round,
  Heading_18EB_Round,
} from '../../styles/typography';
import { Button, MissionCard } from '../../components';
import {
  CharacterStackParamList,
  MainTabNavigationProp,
} from '../../navigation/types';
import { levelList } from '../../screens/character/criteria/level/levelData';
import Spacer from '../../components/Spacer';
import LottieView from 'lottie-react-native';
import {
  Check_3DIcon,
  Level_1_Tooltip,
  Level_2_Tooltip,
  Level_3_Tooltip,
  Level_4_Tooltip,
  Level_5_Tooltip,
  RightArrowIcon,
  ProgressBarIcon,
  InfoIcon,
  PIcon,
  XPIcon,
} from '../../icons';
import { Body_15M, Heading_16B } from '../../styles/typography';
import {
  useCharacterMe,
  useCharacterData,
  convertWeeklyAttendanceToAttendanceData,
  convertCharacterMissionToMission,
} from '../../hooks/useCharacter';
import { ActivityIndicator } from 'react-native';
import { logEvent } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';

// ──────────────────────────────────────────────
// 상수 정의
// ──────────────────────────────────────────────

/**
 * 레벨별 Lottie 애니메이션 파일 맵핑
 *
 * require()로 번들에 직접 포함시키는 방식 사용
 * (동적 import는 React Native에서 지원하지 않음)
 *
 * 파일 위치: src/assets/lottie/
 * - Lv1.json ~ Lv5.json
 * - 각 레벨별 images 폴더 (PNG 이미지 포함)
 *
 * 주의: Android에서는 assets 폴더 구조가 달라서
 *       imageAssetsFolder 설정이 플랫폼별로 다름
 */
const LOTTIE_BY_LEVEL: Record<number, any> = {
  1: require('../../assets/lottie/Lv1.json'),
  2: require('../../assets/lottie/Lv2.json'),
  3: require('../../assets/lottie/Lv3.json'),
  4: require('../../assets/lottie/Lv4.json'),
  5: require('../../assets/lottie/Lv5.json'),
};

const CharacterScreen = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const rootNavigation =
    useNavigation<MainTabNavigationProp<CharacterStackParamList>>();
  const tabBarHeight = useBottomTabBarHeight(); // 하단 탭바 높이 (동적 패딩용)

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /** 레벨 툴팁 표시 여부 (Info 버튼 클릭 시 1.5초간 표시) */
  const [showTooltip, setShowTooltip] = useState(false);

  /** 툴팁 자동 숨김 타이머 */
  const tooltipTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ──────────────────────────────────────────────
  // API Hooks
  // ──────────────────────────────────────────────

  /**
   * 캐릭터 메인 정보 조회 (통합 API)
   *
   * 응답 데이터:
   *   - userGrowthInfo: 레벨, 경험치, 포인트, 진행률
   *   - attendance: 주간 출석 기록 (7일)
   *   - missions: 오늘의 미션 목록
   */
  const {
    data: characterMeResponse,
    isLoading: characterLoading,
    error: characterError,
    refetch: refetchCharacterMe,
  } = useCharacterMe();

  /**
   * 다음 레벨 경험치 조회 (별도 API)
   *
   * characterMe API에는 다음 레벨 경험치가 없어서
   * 별도 API로 조회한다.
   *
   * 응답 데이터:
   *   - nextLevelExp: 다음 레벨까지 필요한 총 경험치
   */
  const { data: characterData, refetch: refetchCharacterData } =
    useCharacterData();

  // ──────────────────────────────────────────────
  // Effect: 탭 포커스 시 스크롤 최상단 이동 및 데이터 갱신
  // ──────────────────────────────────────────────

  /**
   * 캐릭터 탭으로 전환될 때마다 실행
   *
   * 처리:
   *   1. 스크롤을 맨 위로 이동 (부드러운 전환)
   *   2. 최신 캐릭터 정보 조회 (refetch)
   *   3. 최신 다음 레벨 경험치 조회 (refetch)
   *
   * useFocusEffect를 사용하는 이유:
   *   - 탭 전환 시마다 실행되어야 하므로
   *   - useEffect는 탭 전환 시 트리거되지 않음
   */
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      refetchCharacterMe();
      refetchCharacterData(); // 다음 레벨 경험치도 최신 데이터로 갱신
    }, [refetchCharacterMe, refetchCharacterData]),
  );

  // ──────────────────────────────────────────────
  // 데이터 추출 및 변환
  // ──────────────────────────────────────────────

  /** API 응답의 data 래퍼에서 실제 데이터 추출 */
  const characterMeData = characterMeResponse?.data;

  /**
   * 주간 출석 데이터 변환
   *
   * API 응답을 UI 렌더링용 형태로 변환:
   *   - 입력: 서버 형식 (날짜별 출석 여부)
   *   - 출력: [{ day: '월', attended: true }, ...]
   */
  const attendanceData = useMemo(
    () =>
      characterMeData?.attendance
        ? convertWeeklyAttendanceToAttendanceData(characterMeData.attendance)
        : [],
    [characterMeData?.attendance],
  );

  /**
   * 미션 목록 변환 및 정렬
   *
   * 정렬 순서:
   *   1. 진행 중 (status === '진행 중')
   *   2. 완료 (status === '완료')
   *   3. 잠김 (status === null)
   *
   * 이유:
   *   - 사용자가 현재 진행할 수 있는 미션을 먼저 보여주기 위함
   *   - 완료된 미션은 중간에, 잠긴 미션은 맨 아래
   */
  const missions = useMemo(() => {
    if (!characterMeData?.missions) {
      return [];
    }

    const convertedMissions = characterMeData.missions.map((mission, index) =>
      convertCharacterMissionToMission(mission, index),
    );

    // 정렬: 진행 중 → 완료 → 잠긴
    return convertedMissions.sort((a, b) => {
      // 진행 중 (status === '진행 중') 우선
      if (a.status === '진행 중' && b.status !== '진행 중') {
        return -1;
      }
      if (b.status === '진행 중' && a.status !== '진행 중') {
        return 1;
      }

      // 완료 (status === '완료') 다음
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

      // 잠긴 (status === null) 마지막
      if (a.status === null && b.status !== null) {
        return 1;
      }
      if (b.status === null && a.status !== null) {
        return -1;
      }

      return 0;
    });
  }, [characterMeData?.missions]);

  // ──────────────────────────────────────────────
  // 사용자 성장 정보 추출
  // ──────────────────────────────────────────────

  const userGrowthInfo = characterMeData?.userGrowthInfo;

  /**
   * 현재 레벨 추출
   *
   * API 응답에서 levelEnum 값 파싱:
   *   - 예: "LEVEL_3" → 3
   *
   * 기본값: 1 (레벨 정보가 없을 때)
   */
  const currentLevel = useMemo(() => {
    if (!userGrowthInfo?.levelEnum) {
      return 1;
    }
    const match = userGrowthInfo.levelEnum.match(/LEVEL_(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }, [userGrowthInfo?.levelEnum]);

  /**
   * Mixpanel: '나의 레벨' 화면 진입 (탭 포커스 시 1회)
   *
   * currentLevel useMemo 이후에 선언해야 TDZ 문제 없이 레벨 값을 참조할 수 있다.
   */
  useFocusEffect(
    useCallback(() => {
      trackEvent('character_growth_view', {
        character_level: currentLevel,
      });
    }, [currentLevel]),
  );

  /** 현재 경험치 */
  const currentExp = userGrowthInfo?.currentExp ?? 0;

  /** 현재 포인트 */
  const currentPoints = userGrowthInfo?.currentPoint ?? 0;

  /** API에서 받은 진행률 (0~100) */
  const progressPercent = userGrowthInfo?.progressPercent ?? 0;

  /**
   * 다음 레벨까지 필요한 총 경험치
   *
   * 우선순위:
   *   1. characterData API에서 받은 nextLevelExp 사용
   *   2. API 데이터가 없으면 progressPercent 기반 계산
   *   3. 계산 실패 시 기본값 100
   *
   * 계산식:
   *   nextLevelExp = (currentExp / progressPercent) * 100
   *
   * 예외 처리:
   *   - progressPercent === 100: 최대 레벨 도달 (currentExp 반환)
   *   - currentExp === 0 또는 progressPercent === 0: 기본값 100
   *   - Infinity 또는 NaN: 기본값 100
   */
  const nextLevelExp = useMemo(() => {
    // API에서 받은 다음 레벨 경험치 사용
    if (characterData?.nextLevelExp) {
      return characterData.nextLevelExp;
    }

    // API 데이터가 없으면 progressPercent를 기반으로 계산
    if (progressPercent === 100) {
      // 최대 레벨에 도달한 경우
      return currentExp;
    }

    if (currentExp === 0 || progressPercent === 0) {
      // 경험치가 0이거나 progressPercent가 0인 경우 기본값 반환
      return 100;
    }

    const calculated = Math.round((currentExp / progressPercent) * 100);

    // Infinity나 NaN 체크
    if (!isFinite(calculated) || isNaN(calculated)) {
      return 100;
    }

    return calculated;
  }, [characterData, currentExp, progressPercent]);

  // ──────────────────────────────────────────────
  // UI 관련 메모이제이션
  // ──────────────────────────────────────────────

  /**
   * 현재 레벨의 상세 정보
   *
   * levelList에서 현재 레벨에 해당하는 데이터 조회
   * (제목, 설명 등)
   */
  const currentLevelData = useMemo(
    () => levelList.find(l => l.id === currentLevel),
    [currentLevel],
  );

  /**
   * 레벨별 툴팁 컴포넌트 선택
   *
   * 각 레벨마다 다른 툴팁 이미지를 표시하기 위해
   * 레벨에 맞는 컴포넌트를 동적으로 선택한다.
   */
  const LevelTooltip = useMemo(() => {
    switch (currentLevel) {
      case 1:
        return Level_1_Tooltip;
      case 2:
        return Level_2_Tooltip;
      case 3:
        return Level_3_Tooltip;
      case 4:
        return Level_4_Tooltip;
      case 5:
        return Level_5_Tooltip;
      default:
        return Level_1_Tooltip;
    }
  }, [currentLevel]);

  /**
   * 경험치 진행률 퍼센트 값
   *
   * 우선순위:
   *   1. API에서 받은 progressPercent 사용 (0~100, 0도 유효한 값)
   *   2. progressPercent가 null/undefined일 때만 직접 계산 (방어용, 실제로는 거의 발생하지 않음)
   *
   * 계산식(fallback):
   *   progressPercent = (currentExp / nextLevelExp) * 100
   *
   * 주의: `||` 대신 `??`를 사용해야 한다.
   * 레벨업 직후처럼 progressPercent가 정확히 0인 정상 케이스를 `||`가 falsy로 취급해
   * 무관한 계산식(fallback) 값으로 덮어써서 프로그래스바가 실제 진행률과 다르게 채워지는 버그가 있었음.
   */
  const progressPercentageValue = useMemo(
    () => progressPercent ?? Math.round((currentExp / nextLevelExp) * 100),
    [currentExp, nextLevelExp, progressPercent],
  );

  /**
   * 레벨별 Lottie 소스 선택
   *
   * LOTTIE_BY_LEVEL 맵에서 현재 레벨에 맞는
   * Lottie 애니메이션 파일을 가져온다.
   *
   * 기본값: Lv1 (레벨이 범위를 벗어날 때)
   */
  const lottieSource = useMemo(
    () => LOTTIE_BY_LEVEL[currentLevel] ?? LOTTIE_BY_LEVEL[1],
    [currentLevel],
  );

  // ──────────────────────────────────────────────
  // 로딩 및 에러 상태
  // ──────────────────────────────────────────────

  const isLoading = characterLoading;
  const hasError = characterError;

  // ──────────────────────────────────────────────
  // 이벤트 핸들러
  // ──────────────────────────────────────────────

  /**
   * 캐릭터 정보 버튼 클릭 핸들러 (Info 아이콘)
   *
   * 처리:
   *   1. 기존 타이머가 있으면 제거 (중복 타이머 방지)
   *   2. analytics 이벤트 로그
   *   3. 툴팁 표시 (showTooltip = true)
   *   4. 1.5초 후 자동으로 툴팁 숨김
   *
   * 툴팁 내용:
   *   - 현재 레벨에 대한 설명 (이미지)
   *   - 레벨별로 다른 툴팁 표시 (Level_1_Tooltip ~ Level_5_Tooltip)
   */
  const handleCharacterInfoPress = useCallback(() => {
    // 기존 타이머가 있으면 제거
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }

    logEvent('Tooltip_Character');

    // 툴팁 표시
    setShowTooltip(true);

    // 1500ms 후 툴팁 숨기기
    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
      tooltipTimerRef.current = null;
    }, 1500);
  }, []);

  /**
   * 컴포넌트 언마운트 시 타이머 정리
   *
   * 메모리 누수 방지를 위해 타이머를 정리한다.
   */
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  /**
   * 레벨 기준 확인 화면으로 이동
   *
   * "레벨 기준 확인하기" 버튼 클릭 시 호출
   * FullScreenStack 네비게이터를 통해 화면 전환
   */
  const handleNavigateToCriteria = useCallback(() => {
    logEvent('Confirm_LevelStandard_Character');
    rootNavigation.navigate(RouteNames.FULL_SCREEN_STACK, {
      screen: RouteNames.CHARACTER_CRITERIA,
    });
  }, [rootNavigation]);

  /**
   * 포인트 히스토리 화면으로 이동
   *
   * 포인트/경험치 영역 클릭 시 호출
   * FullScreenStack 네비게이터를 통해 화면 전환
   */
  const handleNavigateToPointHistory = useCallback(() => {
    logEvent('Confirm_PXp_Character');
    rootNavigation.navigate(RouteNames.FULL_SCREEN_STACK, {
      screen: RouteNames.CHARACTER_POINT_HISTORY,
    });
  }, [rootNavigation]);

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  // 로딩 중
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.puple.main} />
        </View>
      </SafeAreaView>
    );
  }

  // 에러 상태
  if (hasError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>데이터를 불러오는 중 오류가 발생했습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 정상 렌더링
  return (
    <>
      {/* StatusBar 투명 처리 (Lottie 영역이 StatusBar 아래까지 확장) */}
      <StatusBar translucent backgroundColor="transparent" />

      <ScrollView
        ref={scrollViewRef}
        bounces={false}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: tabBarHeight }} // 탭바 높이만큼 패딩
      >
        {/* ────── Lottie 애니메이션 영역 ────── */}
        <View style={styles.lottieContainer}>
          <LottieView
            source={lottieSource}
            style={styles.lottie}
            autoPlay
            loop
            resizeMode="cover"
            /**
             * 이미지(PNG)가 포함된 Lottie의 경우 assets 폴더 지정 필요
             *
             * iOS: lottie/lv{레벨}
             * Android: lottie/lv{레벨}/images
             *
             * 주의: Android는 "android/app/src/main/assets" 경로에도 존재해야 함
             */
            imageAssetsFolder={
              Platform.OS === 'ios'
                ? `lottie/lv${currentLevel}`
                : `lottie/lv${currentLevel}/images`
            }
          />
        </View>

        {/* ────── 레벨 버튼 (절대 위치) ────── */}
        <View style={styles.levelButtonContainer}>
          <Button
            style={styles.levelButton}
            onPress={handleCharacterInfoPress}
            variant="ghost"
          >
            <Text style={[styles.levelButtonText]}>
              {currentLevelData?.title || 'Lv. 1 아메바'}
            </Text>
            <InfoIcon color={COLORS.gray400} />
          </Button>

          {/* 툴팁 (1.5초간 표시) */}
          {showTooltip && (
            <View style={styles.tooltipContainer}>
              <LevelTooltip />
            </View>
          )}
        </View>

        {/* ────── 레벨 진행 카드 (절대 위치) ────── */}
        <View style={styles.levelCard}>
          {/* 카드 헤더: 레벨 + 기준 확인 버튼 */}
          <View style={styles.levelCardHeader}>
            <Text style={styles.levelCardTitle}>Lv. {currentLevel}</Text>
            <TouchableOpacity
              onPress={handleNavigateToCriteria}
              activeOpacity={1}
            >
              <View style={styles.levelCriteriaLinkWrapper}>
                <Text style={styles.levelCriteriaLink}>성장 가이드 보기</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 경험치 진행 바 */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarIconWrapper,
                  {
                    width: `${progressPercentageValue}%`, // 동적 너비
                  },
                ]}
              >
                <View style={styles.progressBarIconContainer}>
                  <ProgressBarIcon />
                </View>
              </View>
            </View>

            {/* 경험치 텍스트 및 퍼센트 */}
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressText}>
                경험치 {currentExp}/{nextLevelExp}
              </Text>
              <Text style={styles.progressPercentage}>
                {progressPercentageValue}%
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 포인트/경험치 정보 (클릭 시 히스토리 화면으로 이동) */}
          <TouchableOpacity
            style={styles.statsRowContainer}
            onPress={handleNavigateToPointHistory}
            activeOpacity={1}
          >
            <View style={styles.statsRowContainerWrapper}>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>경험치</Text>
                <View style={styles.statsValueContainer}>
                  <XPIcon />
                  <Text style={styles.statsValue}>{currentExp} XP</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>포인트</Text>
                <View style={styles.statsValueContainer}>
                  <PIcon />
                  <Text style={styles.statsValue}>{currentPoints} P</Text>
                </View>
              </View>
            </View>
            <RightArrowIcon color={COLORS.gray700} />
          </TouchableOpacity>
        </View>

        <Spacer num={24} />

        {/* ────── 주간 출석 기록 (절대 위치) ────── */}
        <View style={styles.attendanceSection}>
          <Text style={styles.sectionTitle}>주간 출석 기록</Text>
          <Spacer num={16} />
          <View style={styles.attendanceDays}>
            {attendanceData.map((item, index) => (
              <View key={index} style={styles.attendanceDay}>
                <Text style={styles.attendanceDayText}>{item.day}</Text>
                <View style={[styles.attendanceCircle]}>
                  {/* 출석한 날만 체크 아이콘 표시 */}
                  {item.attended && <Check_3DIcon />}
                </View>
              </View>
            ))}
          </View>
        </View>

        <Spacer num={48} />

        {/* ────── 오늘의 미션 ────── */}
        <View style={styles.missionSection}>
          <Text style={styles.sectionTitle}>오늘의 미션</Text>
          <Text style={styles.sectionDescription}>
            진행 중인 미션을 완료하면 새로운 미션이 열려요!
          </Text>
          <Spacer num={32} />

          {/* 미션 카드 목록 (정렬: 진행 중 → 완료 → 잠김) */}
          {missions.map((mission: any) => (
            <View key={mission.id} style={styles.missionCardWrapper}>
              <MissionCard mission={mission} myPage={true} />
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
};

export default CharacterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  /** Lottie 애니메이션 컨테이너 */
  lottieContainer: {
    width: '100%',
    height: scaleWidth(882),
    backgroundColor: COLORS.gray200,
    overflow: 'hidden',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  /** 레벨 버튼 컨테이너 (절대 위치) */
  levelButtonContainer: {
    position: 'absolute',
    top: scaleWidth(60),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  /** 툴팁 컨테이너 (레벨 버튼 아래에 표시) */
  tooltipContainer: {
    marginTop: scaleWidth(30),
    position: 'absolute',
    top: scaleWidth(46),
    alignItems: 'center',
  },
  /** 레벨 버튼 */
  levelButton: {
    marginTop: scaleWidth(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlayWhite,
    paddingHorizontal: scaleWidth(16),
    height: scaleWidth(44),
    borderRadius: BORDER_RADIUS[99],
    gap: scaleWidth(8),
    borderWidth: scaleWidth(2),
    borderColor: COLORS.white,
  },
  levelButtonText: {
    ...Heading_20EB_Round,
    color: COLORS.black,
  },
  /** 레벨 진행 카드 (절대 위치) */
  levelCard: {
    backgroundColor: COLORS.overlayWhite,
    width: scaleWidth(353),
    height: scaleWidth(268),
    borderRadius: BORDER_RADIUS[20],
    borderWidth: scaleWidth(3),
    borderColor: COLORS.white,
    position: 'absolute',
    top: scaleWidth(439),
    left: scaleWidth(20),
    padding: scaleWidth(24),
    overflow: 'hidden',
  },
  divider: {
    width: scaleWidth(353),
    marginLeft: scaleWidth(-24),
    marginRight: scaleWidth(-24),
    borderTopWidth: 1,
    borderTopColor: COLORS.gray300,
    marginVertical: scaleWidth(20),
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleWidth(12),
  },
  levelCardTitle: {
    ...Heading_24EB_Round,
    color: COLORS.black,
  },
  levelCriteriaLinkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS[30],
    width: scaleWidth(113),
    height: scaleWidth(30),
  },
  levelCriteriaLink: {
    ...Caption_12M,
    color: COLORS.gray800,
  },
  progressBarWrapper: {
    gap: scaleWidth(12),
  },
  progressBarContainer: {
    backgroundColor: COLORS.gray200,
    height: scaleWidth(18),
    borderRadius: scaleWidth(9.5),
    overflow: 'hidden',
  },
  /** 경험치 진행 바 (동적 너비) */
  progressBarIconWrapper: {
    height: '100%',
    borderRadius: scaleWidth(9.5),
    overflow: 'hidden',
  },
  progressBarIconContainer: {
    width: '100%',
    height: '100%',
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    ...Caption_14R,
    color: COLORS.gray800,
  },
  progressPercentage: {
    ...Heading_20EB_Round,
    color: COLORS.puple.main,
  },
  statsRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: scaleWidth(30),
  },
  statsRowContainerWrapper: {
    flex: 1,
    gap: scaleWidth(20),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLabel: {
    ...Heading_16B,
    color: COLORS.black,
  },
  statsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
  },
  statsValue: {
    ...Heading_18EB_Round,
    color: COLORS.black,
  },
  xpIconBox: {
    width: scaleWidth(26),
    height: scaleWidth(26),
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.blue[5],
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointIconBox: {
    width: scaleWidth(26),
    height: scaleWidth(26),
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.yellow[1],
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** 주간 출석 기록 섹션 (절대 위치) */
  attendanceSection: {
    position: 'absolute',
    width: scaleWidth(359),
    height: scaleWidth(118),
    top: scaleWidth(757),
    left: scaleWidth(20),
  },
  sectionTitle: {
    ...Heading_18EB_Round,
    color: COLORS.black,
    marginBottom: scaleWidth(4),
  },
  sectionDescription: {
    ...Body_16R,
    color: COLORS.gray700,
  },
  attendanceDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scaleWidth(15.83),
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS[16],
    paddingVertical: scaleWidth(30),
    paddingHorizontal: scaleWidth(24),
  },
  attendanceDay: {
    alignItems: 'center',
    gap: scaleWidth(4),
    flex: 1,
  },
  attendanceCircle: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceDayText: {
    ...Body_15M,
    color: COLORS.black,
  },
  /** 오늘의 미션 섹션 */
  missionSection: {
    paddingHorizontal: scaleWidth(20),
  },
  missionCardWrapper: {
    marginBottom: scaleWidth(16),
  },
  notificationButtonContainer: {
    marginTop: scaleWidth(30),
    position: 'absolute',
    top: scaleWidth(40),
    right: scaleWidth(20),
  },
  notificationButton: {
    marginTop: scaleWidth(30),
    width: scaleWidth(50),
    height: scaleWidth(50),
    borderRadius: BORDER_RADIUS[16],
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
});
