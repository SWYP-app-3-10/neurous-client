/**
 * 난이도 설정 화면 (DifficultySettingScreen.tsx)
 *
 * 온보딩 과정의 마지막 단계로, 사용자가 읽을 글의 난이도를 선택하는 화면이다.
 *
 * 주요 기능:
 *   1. 난이도 선택 (초급/중급/고급)
 *   2. 선택한 난이도에 대한 설명 표시
 *   3. API로부터 난이도별 정보 조회 (예상 읽기 시간, 설명)
 *   4. 온보딩 완료 처리 및 메인 화면 이동
 *
 * 난이도 옵션:
 *   - BEGINNER (초급): 1분, 쉬운 글
 *   - INTERMEDIATE (중급): 2분, 중간 난이도 글
 *   - ADVANCED (고급): 3분, 어려운 글
 *
 * 온보딩 흐름:
 *   소개 화면 → 소셜 로그인 → 약관 동의 → 관심분야 선택 → [난이도 설정] → 메인 화면
 *
 * 진행률: 2/2 (ProgressBar fill=2)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../styles/global';
import {
  useCompleteOnboarding,
  useOnboardingStore,
} from '../../store/onboardingStore';
import { LevelCategory, LevelCategoryNames } from '../../types/interests';
import { ProgressBar } from '../../components';
import {
  Body_15M,
  Body_16M,
  Body_16R,
  Body_16SB,
  Heading_20EB_Round,
  Heading_24EB_Round,
} from '../../styles/typography';
import Spacer from '../../components/Spacer';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { getUserInfo } from '../../services/authService';
import { updateUserLevel } from '../../api/userApi';
import { useDifficultyInfo } from '../../hooks/useDifficultyInfo';
import { logEvent, logScreenView } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';

const DifficultySettingScreen = () => {
  // ──────────────────────────────────────────────
  // Store 및 State
  // ──────────────────────────────────────────────

  /**
   * 저장된 난이도 가져오기 (온보딩 재진입 시 복원용)
   *
   * 사용자가 뒤로가기 등으로 다시 이 화면에 올 때
   * 이전에 선택했던 난이도를 유지한다.
   */
  const savedDifficulty = useOnboardingStore(state => state.difficulty);

  /** 난이도 저장 함수 (Zustand store) */
  const setDifficulty = useOnboardingStore(state => state.setDifficulty);

  /**
   * 현재 선택된 난이도
   *
   * 초기값:
   *   - savedDifficulty가 있으면 그 값 사용 (복원)
   *   - 없으면 BEGINNER (초급)
   */
  const [selectedDifficulty, setSelectedDifficulty] = useState<LevelCategory>(
    savedDifficulty || LevelCategory.BEGINNER,
  );

  /** 온보딩 완료 처리 함수 */
  const completeOnboarding = useCompleteOnboarding();

  // ──────────────────────────────────────────────
  // API Hooks
  // ──────────────────────────────────────────────

  /**
   * 난이도 정보 조회 (API)
   *
   * 응답 데이터:
   *   - level: 난이도 한글 이름 (예: "초급")
   *   - timeGuide: 예상 읽기 시간 (예: "1분")
   *   - description: 난이도 설명
   *
   * 선택된 난이도가 변경될 때마다 자동으로 새로운 정보를 가져온다.
   */
  const { difficultyInfo, isLoading } = useDifficultyInfo(selectedDifficulty);

  // ──────────────────────────────────────────────
  // 이벤트 핸들러
  // ──────────────────────────────────────────────

  /**
   * 난이도 선택 핸들러
   *
   * 처리:
   *   1. 선택된 난이도 상태 업데이트 (로컬 state)
   *   2. Zustand store에 저장 (전역 상태)
   *   3. analytics 이벤트 로그
   *
   * analytics 이벤트:
   *   - BEGINNER: 'Btn_Easy_Onboarding'
   *   - INTERMEDIATE: 'Btn_Medium_Onboarding'
   *   - ADVANCED: 'Btn_Hard_Onboarding'
   */
  const handleDifficultyChange = useCallback(
    (difficulty: LevelCategory) => {
      setSelectedDifficulty(difficulty);
      setDifficulty(difficulty);

      // analytics 이벤트 로그
      if (difficulty === LevelCategory.BEGINNER) {
        logEvent('Btn_Easy_Onboarding');
      } else if (difficulty === LevelCategory.INTERMEDIATE) {
        logEvent('Btn_Medium_Onboarding');
      } else if (difficulty === LevelCategory.ADVANCED) {
        logEvent('Btn_Hard_Onboarding');
      }
    },
    [setDifficulty],
  );

  /**
   * "다음" 버튼 클릭 핸들러
   *
   * 처리 흐름:
   *   1. analytics 이벤트 로그
   *   2. 사용자 정보 조회 (getUserInfo)
   *   3. 난이도 업데이트 API 호출 (updateUserLevel)
   *   4. 온보딩 완료 처리 (completeOnboarding)
   *   5. 메인 화면으로 자동 이동 (RootNavigator에서 처리)
   *
   * 에러 처리:
   *   - 사용자 정보가 없으면 Alert 표시 후 중단
   *   - API 호출 실패 시 에러 로그만 남기고 계속 진행 (UX 우선)
   */
  const handleNext = async () => {
    logEvent('Next_Onboarding_Difficulty_Medium');

    // 사용자 정보 조회
    const userInfo = await getUserInfo();
    if (!userInfo || !userInfo.userId) {
      Alert.alert(
        '오류',
        '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
      );
      return;
    }

    // 난이도 업데이트 API 호출
    console.log('[난이도 업데이트] API 호출 시작');
    await updateUserLevel(userInfo.userId, selectedDifficulty);
    console.log('[난이도 업데이트] API 호출 성공');

    // Mixpanel: 온보딩 난이도 최초 선택
    trackEvent('difficulty_selected', {
      difficulty: LevelCategoryNames[selectedDifficulty],
    });

    // 온보딩 완료 처리
    await completeOnboarding();
  };

  // ──────────────────────────────────────────────
  // Effect: 화면 전환 시 analytics 로그
  // ──────────────────────────────────────────────

  /**
   * 선택된 난이도에 따라 화면 뷰 이벤트 로그
   *
   * 화면 이름:
   *   - BEGINNER: 'Onboarding_Difficulty_Easy'
   *   - INTERMEDIATE: 'Onboarding_Difficulty_Medium'
   *   - ADVANCED: 'Onboarding_Difficulty_Hard'
   *
   * 사용자가 난이도를 변경할 때마다 해당 난이도의
   * 설명 화면을 보고 있다고 기록한다.
   */
  useEffect(() => {
    const screenName =
      selectedDifficulty === LevelCategory.BEGINNER
        ? 'Onboarding_Difficulty_Easy'
        : selectedDifficulty === LevelCategory.INTERMEDIATE
          ? 'Onboarding_Difficulty_Medium'
          : 'Onboarding_Difficulty_Hard';

    logScreenView(screenName, undefined, true);
  }, [selectedDifficulty]);

  // ──────────────────────────────────────────────
  // UI 관련 계산
  // ──────────────────────────────────────────────

  /** Safe Area Insets (하단 패딩용) */
  const { bottom } = useSafeAreaInsets();

  /**
   * 선택된 난이도 정보
   *
   * API 데이터가 있으면 사용, 없으면 기본값 표시
   *
   * 기본값:
   *   - label: '초급'
   *   - time: '1분'
   *   - description: ''
   *
   * API 로딩 중이거나 실패했을 때를 대비한 fallback
   */
  const selectedInfo = difficultyInfo
    ? {
        label: difficultyInfo.level,
        time: difficultyInfo.timeGuide,
        description: difficultyInfo.description,
      }
    : {
        label: '초급',
        time: '1분',
        description: '',
      };

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header iconColor={COLORS.gray800} />
      <Spacer num={2} />

      {/* 진행률 표시 (2/2) */}
      <View style={styles.header}>
        <ProgressBar fill={2} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Spacer num={92} />

        {/* 타이틀 */}
        <Text style={styles.title}>난이도를 선택해주세요</Text>
        <Spacer num={4} />

        {/* 서브타이틀 */}
        <Text style={styles.subtitle}>
          화면에서 나의 관심분야 글을 확인할 수 있어요
        </Text>
        <Spacer num={32} />

        {/* 난이도 선택 버튼 (초급/중급/고급) */}
        <View style={styles.difficultyContainer}>
          {/* 초급 버튼 */}
          <Button
            variant="primary"
            title="초급"
            style={[
              styles.difficultyButton,
              selectedDifficulty === LevelCategory.BEGINNER &&
                styles.difficultyButtonSelected,
            ]}
            onPress={() => handleDifficultyChange(LevelCategory.BEGINNER)}
          >
            <Text
              style={[
                styles.difficultyButtonText,
                selectedDifficulty === LevelCategory.BEGINNER &&
                  styles.difficultyButtonTextSelected,
              ]}
            >
              초급
            </Text>
          </Button>

          {/* 중급 버튼 */}
          <Button
            variant="primary"
            title="중급"
            style={[
              styles.difficultyButton,
              selectedDifficulty === LevelCategory.INTERMEDIATE &&
                styles.difficultyButtonSelected,
            ]}
            onPress={() => handleDifficultyChange(LevelCategory.INTERMEDIATE)}
          >
            <Text
              style={[
                styles.difficultyButtonText,
                selectedDifficulty === LevelCategory.INTERMEDIATE &&
                  styles.difficultyButtonTextSelected,
              ]}
            >
              중급
            </Text>
          </Button>

          {/* 고급 버튼 */}
          <Button
            variant="primary"
            title="고급"
            style={[
              styles.difficultyButton,
              selectedDifficulty === LevelCategory.ADVANCED &&
                styles.difficultyButtonSelected,
            ]}
            onPress={() => handleDifficultyChange(LevelCategory.ADVANCED)}
          >
            <Text
              style={[
                styles.difficultyButtonText,
                selectedDifficulty === LevelCategory.ADVANCED &&
                  styles.difficultyButtonTextSelected,
              ]}
            >
              고급
            </Text>
          </Button>
        </View>

        <Spacer num={32} />

        {/* 선택된 난이도 설명 */}
        {isLoading ? (
          // 로딩 중
          <View>
            <Text style={styles.descriptionText}>
              난이도 정보를 불러오는 중...
            </Text>
          </View>
        ) : (
          // 난이도 정보 표시
          <View>
            {/* 난이도 라벨 및 예상 시간 */}
            <View style={styles.descriptionTitleContainer}>
              <Text style={styles.descriptionTitle}>{selectedInfo.label}</Text>
              <Text style={styles.descriptionLabelTime}>
                {selectedInfo.time}
              </Text>
            </View>

            <Spacer num={20} />

            {/* 난이도 설명 */}
            <Text style={styles.descriptionText}>
              {selectedInfo.description}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 다음 버튼 */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          title="다음"
          onPress={handleNext}
          // disabled={!isNextButtonActive} // 항상 활성화 (난이도 선택 필수)
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  content: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
  },
  title: {
    ...Heading_24EB_Round,
    color: COLORS.black,
  },
  subtitle: {
    ...Body_15M,
    color: COLORS.gray600,
  },

  // ────── 난이도 선택 버튼 ──────
  /**
   * 난이도 버튼 컨테이너
   *
   * 3개 버튼(초급/중급/고급)을 가로로 배치
   * 배경색이 있는 컨테이너 안에 버튼들이 위치
   */
  difficultyContainer: {
    flexDirection: 'row',
    gap: scaleWidth(8),
    height: scaleWidth(52),
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[12],
  },

  /** 난이도 버튼 (비활성 상태) */
  difficultyButton: {
    backgroundColor: 'transparent',
    width: scaleWidth(107),
    height: scaleWidth(36),
    borderRadius: BORDER_RADIUS[10],
    justifyContent: 'center',
    alignItems: 'center',
  },

  /** 난이도 버튼 (선택된 상태) */
  difficultyButtonSelected: {
    backgroundColor: COLORS.puple.main,
    borderColor: COLORS.puple.main,
    borderRadius: BORDER_RADIUS[10],
  },

  /** 난이도 버튼 텍스트 (비활성) */
  difficultyButtonText: {
    ...Body_16SB,
    color: COLORS.gray500,
  },

  /** 난이도 버튼 텍스트 (선택됨) */
  difficultyButtonTextSelected: {
    ...Body_16SB,
    color: COLORS.white,
  },

  // ────── 난이도 설명 영역 ──────
  /** 난이도 라벨 및 시간 컨테이너 */
  descriptionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(11),
  },

  /** 난이도 라벨 (예: "초급") */
  descriptionTitle: {
    ...Heading_20EB_Round,
    color: COLORS.puple.main,
  },

  /** 예상 읽기 시간 (예: "1분") */
  descriptionLabelTime: {
    ...Body_16M,
    color: COLORS.puple.main,
  },

  /** 난이도 설명 텍스트 */
  descriptionText: {
    ...Body_16R,
    color: COLORS.black,
  },

  // ────── 하단 버튼 영역 ──────
  footer: {
    paddingHorizontal: scaleWidth(20),
  },
});

export default DifficultySettingScreen;
