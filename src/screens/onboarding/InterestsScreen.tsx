/**
 * 관심분야 선택 화면 (InterestsScreen.tsx)
 *
 * 사용자가 관심 있는 뉴스 카테고리를 선택하는 화면이다.
 *
 * 주요 기능:
 *   1. 관심분야 선택 (최대 3개, 우선순위 자동 부여)
 *   2. 선택 순서 시각화 (1위/2위/3위 배지)
 *   3. 선택 해제 및 순서 자동 재정렬
 *   4. 온보딩 모드 vs 편집 모드 전환
 *
 * 사용 컨텍스트:
 *   - 온보딩: 소셜 로그인 → 약관 동의 → [관심분야 선택] → 난이도 설정
 *   - 편집 모드: 마이페이지 > 나의 관심분야 > 편집 버튼
 *
 * 선택 제약:
 *   - 최소 1개 (다음 버튼 활성화 조건)
 *   - 최대 3개 (초과 시 토스트 메시지)
 *
 * 진행률 (온보딩 모드): 1/2 (ProgressBar fill=1)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RouteNames } from '../../../routes';
import { scaleWidth, COLORS, BORDER_RADIUS } from '../../styles/global';
import {
  Heading_24EB_Round,
  Body_15M,
  Body_18M,
  Heading_18SB,
} from '../../styles/typography';
import {
  MainTabNavigationProp,
  OnboardingStackParamList,
} from '../../navigation/types';
import Spacer from '../../components/Spacer';
import ProgressBar from '../../components/ProgressBar';
import { Button } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useShowToastModal } from '../../store/modalStore';
import {
  CheckIcon,
  FirstIcon,
  SecondIcon,
  ThirdIcon,
} from '../../icons/commonIcons/commonIcons';
import Header from '../../components/Header';
import {
  Interest,
  INTERESTS,
  InterestCategory,
  InterestCategoryNames,
} from '../../types/interests';
import { updateUserInterests } from '../../api/userApi';
import { getUserInfo } from '../../services/authService';
import { logEvent, logScreenView } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';

// ──────────────────────────────────────────────
// 상수 정의
// ──────────────────────────────────────────────

/**
 * 관심분야 레이아웃 배치
 *
 * 첫 번째 줄: 정치, 경제, 사회 (3개)
 * 두 번째 줄: 세계, 생활/문화, IT/과학 (3개)
 */
const FIRST_ROW_INTERESTS = INTERESTS.slice(0, 3);
const SECOND_ROW_INTERESTS = INTERESTS.slice(3, 6);

/**
 * Analytics 이벤트 이름 매핑
 *
 * 각 관심분야별로 온보딩 모드와 편집 모드에서
 * 서로 다른 이벤트를 로그한다.
 *
 * 구조:
 *   {
 *     [관심분야 이름]: {
 *       onboarding: '온보딩 시 이벤트명',
 *       edit: '편집 모드 시 이벤트명'
 *     }
 *   }
 */
const INTEREST_EVENT_MAP: Record<string, { onboarding: string; edit: string }> =
  {
    정치: {
      onboarding: 'InterestTag_Politics_Onboarding',
      edit: 'InterestTag_Politics_EditInterest',
    },
    경제: {
      onboarding: 'InterestTag_Economy_Onboarding',
      edit: 'InterestTag_Economy_EditInterest',
    },
    사회: {
      onboarding: 'InterestTag_Society_Onboarding',
      edit: 'InterestTag_Society_EditInterest',
    },
    세계: {
      onboarding: 'InterestTag_World_Onboarding',
      edit: 'EditInterest_World_EditInterest',
    },
  };

// ──────────────────────────────────────────────
// InterestTag 컴포넌트
// ──────────────────────────────────────────────

interface InterestTagProps {
  interest: Interest;
  priority: number | null;
  isSelected: boolean;
  onPress: (id: InterestCategory) => void;
  editMode?: boolean;
}

/**
 * 개별 관심분야 태그 컴포넌트
 *
 * 기능:
 *   - 선택/선택 해제 토글
 *   - 우선순위 배지 표시 (1위/2위/3위)
 *   - 선택 시 스타일 변경 (배경색, 텍스트색, 체크 아이콘)
 *   - Analytics 이벤트 로그
 *
 * UI 변화:
 *   - 비선택: 연보라 배경, 보라 텍스트
 *   - 선택됨: 보라 배경, 흰색 텍스트, 체크 아이콘
 *   - 우선순위: 태그 위에 1/2/3 배지 표시
 */
const InterestTag: React.FC<InterestTagProps> = ({
  interest,
  priority,
  isSelected,
  onPress,
  editMode = false,
}) => {
  /**
   * 태그 클릭 핸들러
   *
   * 처리:
   *   1. 부모 컴포넌트의 toggleInterest 호출
   *   2. Analytics 이벤트 로그
   *
   * Analytics 이벤트 로직:
   *   - INTEREST_EVENT_MAP에 정의된 관심분야: 매핑된 이벤트 사용
   *   - 생활/문화: 별도 이벤트 (이름에 "생활" 포함 여부로 판단)
   *   - IT/과학: 별도 이벤트 (이름에 "IT" 포함 여부로 판단)
   */
  const handlePress = useCallback(() => {
    onPress(interest.id);

    // Analytics 이벤트 로깅
    const eventMap = INTEREST_EVENT_MAP[interest.name];
    if (eventMap) {
      const eventName = editMode ? eventMap.edit : eventMap.onboarding;
      logEvent(eventName);
    } else if (interest.name.includes('생활')) {
      logEvent(
        editMode
          ? 'InterestTag_Lifestyle_Culture_EditInterest'
          : 'InterestTag_LifeCulture_Onboarding',
      );
    } else if (interest.name.includes('IT')) {
      logEvent(
        editMode
          ? 'InterestTag_It_Science_EditInterest'
          : 'InterestTag_It_Science_Onboarding',
      );
    }
  }, [interest.id, interest.name, onPress, editMode]);

  /**
   * 우선순위 배지 아이콘 렌더링
   *
   * 순위에 따라 다른 아이콘 표시:
   *   - 1위: FirstIcon (금색)
   *   - 2위: SecondIcon (은색)
   *   - 3위: ThirdIcon (동색)
   *   - 선택 안 됨: null (배지 없음)
   */
  const renderPriorityIcon = useCallback(() => {
    switch (priority) {
      case 1:
        return <FirstIcon />;
      case 2:
        return <SecondIcon />;
      case 3:
        return <ThirdIcon />;
      default:
        return null;
    }
  }, [priority]);

  return (
    <View style={styles.tagContainer}>
      {/* 선택된 태그는 위쪽 여백 추가 (배지 공간 확보) */}
      {isSelected && <View style={styles.tagSpacer} />}

      {/* 우선순위 배지 (선택된 태그만 표시) */}
      {priority !== null && (
        <View style={styles.priorityBadge}>{renderPriorityIcon()}</View>
      )}

      {/* 태그 버튼 */}
      <Button
        variant="ghost"
        textStyle={styles.tagText}
        style={[styles.tag, isSelected && styles.tagSelected]}
        onPress={handlePress}
      >
        <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
          {interest.name}
        </Text>

        {/* 체크 아이콘 (선택된 태그만 표시) */}
        {isSelected && (
          <View style={styles.checkIconContainer}>
            <CheckIcon color={COLORS.puple.main} />
          </View>
        )}
      </Button>
    </View>
  );
};

// ──────────────────────────────────────────────
// InterestsScreen 메인 컴포넌트
// ──────────────────────────────────────────────

const InterestsScreen = () => {
  const navigation =
    useNavigation<MainTabNavigationProp<OnboardingStackParamList>>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'interests'>>();

  // ──────────────────────────────────────────────
  // Store 및 Hooks
  // ──────────────────────────────────────────────

  const setOnboardingStep = useOnboardingStore(
    state => state.setOnboardingStep,
  );
  const savedInterests = useOnboardingStore(state => state.interests);
  const setInterests = useOnboardingStore(state => state.setInterests);
  const showToastModal = useShowToastModal();

  // ──────────────────────────────────────────────
  // Route Params
  // ──────────────────────────────────────────────

  /**
   * 편집 모드 여부
   *
   * true: 마이페이지에서 진입 (헤더 타이틀, 완료 버튼)
   * false: 온보딩에서 진입 (진행률 바, 다음 버튼)
   */
  const editMode = route.params?.editMode || false;

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /**
   * 선택된 관심분야 및 순서 저장
   *
   * 구조: Map<InterestCategory, 순서(1, 2, 3)>
   *
   * 예시:
   *   Map {
   *     'POLITICS' => 1,  // 정치가 1순위
   *     'ECONOMY' => 2,   // 경제가 2순위
   *     'SOCIETY' => 3    // 사회가 3순위
   *   }
   */
  const [selectedInterests, setSelectedInterests] = useState<
    Map<InterestCategory, number>
  >(new Map());

  // ──────────────────────────────────────────────
  // Effect 1: 저장된 관심분야 복원
  // ──────────────────────────────────────────────

  /**
   * Zustand store에 저장된 관심분야를 state에 복원
   *
   * 시나리오:
   *   - 온보딩 재진입 (뒤로가기 등)
   *   - 편집 모드 진입 (마이페이지에서)
   *
   * savedInterests 형식: { 'POLITICS': 1, 'ECONOMY': 2, ... }
   * 변환 후 형식: Map<InterestCategory, number>
   */
  useEffect(() => {
    if (savedInterests) {
      const interestsMap = new Map<InterestCategory, number>();
      Object.entries(savedInterests).forEach(([key, value]) => {
        if (Object.values(InterestCategory).includes(key as InterestCategory)) {
          interestsMap.set(key as InterestCategory, value);
        }
      });
      setSelectedInterests(interestsMap);
    }
  }, [savedInterests]);

  // ──────────────────────────────────────────────
  // Effect 2: Analytics 화면 조회 로그
  // ──────────────────────────────────────────────

  /**
   * 화면 뷰 이벤트 로그
   *
   * 로그 조건:
   *   - 편집 모드: 'EditInterest'
   *   - 온보딩 모드:
   *     - 선택 0개: 'Onboarding_Interest01' (처음 진입)
   *     - 선택 1개 이상: 'Onboarding_Interest02' (선택 후)
   */
  useEffect(() => {
    if (editMode) {
      logScreenView('EditInterest', undefined, true);
    } else {
      const screenName =
        selectedInterests.size > 0
          ? 'Onboarding_Interest02'
          : 'Onboarding_Interest01';
      logScreenView(screenName, undefined, true);
    }
  }, [selectedInterests.size, editMode]);

  // ──────────────────────────────────────────────
  // 핸들러: 관심분야 선택/해제 토글
  // ──────────────────────────────────────────────

  /**
   * 관심분야 선택/해제 토글 핸들러
   *
   * 선택 해제 시:
   *   1. Map에서 해당 관심분야 제거
   *   2. 제거된 순서보다 큰 순서들을 1씩 감소 (순서 재정렬)
   *
   *   예시: 2순위를 제거하면
   *     [1, 2, 3] → [1, 2] (기존 3순위가 2순위로)
   *
   * 선택 시:
   *   1. 최대 3개 제약 검사
   *   2. 초과 시 토스트 메시지 표시 후 중단
   *   3. 현재 최대 순서 + 1로 추가
   *
   * 변경 후:
   *   - Zustand store에 저장 (전역 상태 + AsyncStorage)
   */
  const toggleInterest = useCallback(
    (id: InterestCategory) => {
      setSelectedInterests(prev => {
        const newSelected = new Map(prev);

        // 이미 선택된 경우: 제거하고 순서 재정렬
        if (newSelected.has(id)) {
          const removedOrder = newSelected.get(id)!;
          newSelected.delete(id);

          // 제거된 순서보다 큰 순서들을 1씩 감소
          newSelected.forEach((order, key) => {
            if (order > removedOrder) {
              newSelected.set(key, order - 1);
            }
          });
        } else {
          // 최대 3개 제한 체크
          if (newSelected.size >= 3) {
            setTimeout(() => {
              showToastModal({
                message: '최대 3순위까지 선택할 수 있어요',
                position: 'center',
                backgroundColor: COLORS.gray800Opacity80,
                height: scaleWidth(39),
                width: scaleWidth(212),
                borderRadius: BORDER_RADIUS[8],
              });
            }, 0);
            return prev; // 변경 없이 이전 상태 반환
          }

          // 최대 순서를 찾아서 +1
          const maxOrder = Math.max(0, ...Array.from(newSelected.values()));
          newSelected.set(id, maxOrder + 1);
        }

        // 변경된 관심분야를 Zustand store에 저장 (AsyncStorage 자동 동기화)
        const interestsData: Record<string, number> = {};
        newSelected.forEach((order, key) => {
          interestsData[key] = order;
        });
        setInterests(interestsData);

        return newSelected;
      });
    },
    [setInterests, showToastModal],
  );

  /**
   * 특정 관심분야의 우선순위 조회
   *
   * @param id 관심분야 ID
   * @returns 우선순위 (1, 2, 3) 또는 null (선택 안 됨)
   */
  const getPriority = useCallback(
    (id: InterestCategory): number | null => {
      return selectedInterests.get(id) || null;
    },
    [selectedInterests],
  );

  // ──────────────────────────────────────────────
  // 핸들러: 다음/완료 버튼
  // ──────────────────────────────────────────────

  /**
   * 다음/완료 버튼 클릭 핸들러
   *
   * 처리 흐름:
   *   1. 선택된 관심분야를 순서대로 배열 변환
   *   2. 사용자 정보 조회 (getUserInfo)
   *   3. 서버 API 호출 (updateUserInterests)
   *   4. 모드에 따라 분기:
   *      - 편집 모드: 이전 화면으로 이동 (goBack)
   *      - 온보딩 모드: 난이도 설정 화면으로 이동
   *
   * 에러 처리:
   *   - 사용자 정보 없음: Alert 표시 후 중단
   *   - API 호출 실패: Alert 표시 후 중단
   */
  const handleNext = useCallback(async () => {
    // 선택된 관심분야를 순서대로 배열로 변환
    const interestsArray = Array.from(selectedInterests.entries())
      .sort((a, b) => a[1] - b[1]) // 순서대로 정렬
      .map(([category]) => category);

    // 서버 API 호출
    try {
      const userInfo = await getUserInfo();
      if (!userInfo?.userId) {
        Alert.alert(
          '오류',
          '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
        );
        return;
      }

      await updateUserInterests(userInfo.userId, interestsArray);

      // Mixpanel: 관심분야 선택 (온보딩 최초 선택 / 마이페이지 변경 동일 이벤트)
      trackEvent('interest_selected', {
        interests: interestsArray.map(
          category => InterestCategoryNames[category] || category,
        ),
      });
    } catch (error) {
      console.error('[관심분야 업데이트] 서버 업데이트 실패:', error);
      Alert.alert(
        '업데이트 실패',
        '관심분야 업데이트에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.',
      );
      return;
    }

    // 모드에 따라 분기
    if (editMode) {
      // 편집 모드: 마이페이지로 돌아가기
      navigation.goBack();
      logEvent('Complete_EditInterest');
    } else {
      // 온보딩 모드: 난이도 설정 화면으로 이동
      await setOnboardingStep('difficulty');
      logEvent('Next_Onboarding_Interest02');
      navigation.navigate(RouteNames.DIFFICULTY_SETTING);
    }
  }, [navigation, setOnboardingStep, editMode, selectedInterests]);

  /**
   * 다음 버튼 활성화 여부
   *
   * 조건: 최소 1개 이상 선택
   *
   * 편집 모드에서는 항상 활성화 (선택 해제 후 완료 가능)
   */
  const isNextButtonActive = useMemo(
    () => selectedInterests.size >= 1,
    [selectedInterests.size],
  );

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 (편집 모드 시 타이틀 표시) */}
      <Header
        iconColor={COLORS.gray800}
        title={editMode ? '관심분야 설정하기' : ''}
        backEventName={editMode ? 'Back_EditInterest' : undefined}
      />
      <Spacer num={2} />

      {/* 진행률 바 (온보딩 모드만 표시) */}
      {!editMode && (
        <View style={styles.header}>
          <ProgressBar fill={1} />
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Spacer num={editMode ? 54 : 92} />

        {/* 타이틀 */}
        <Text style={styles.title}>관심분야를 선택해주세요</Text>
        <Spacer num={4} />

        {/* 서브타이틀 */}
        <Text style={[Body_15M, { color: COLORS.gray600 }]}>
          홈 화면에서 나의 관심분야 글을 확인할 수 있어요
        </Text>
        <Spacer num={52} />

        {/* 관심분야 태그 (2줄 레이아웃) */}
        <View style={styles.tagsWrapper}>
          {/* 첫 번째 줄: 정치, 경제, 사회 */}
          <View style={styles.tagsRow}>
            {FIRST_ROW_INTERESTS.map(interest => {
              const priority = getPriority(interest.id);
              return (
                <InterestTag
                  key={interest.id}
                  interest={interest}
                  priority={priority}
                  isSelected={priority !== null}
                  onPress={toggleInterest}
                />
              );
            })}
          </View>

          {/* 두 번째 줄: 세계, 생활/문화, IT/과학 */}
          <View style={styles.tagsRow}>
            {SECOND_ROW_INTERESTS.map(interest => {
              const priority = getPriority(interest.id);
              return (
                <InterestTag
                  key={interest.id}
                  interest={interest}
                  priority={priority}
                  isSelected={priority !== null}
                  onPress={toggleInterest}
                  editMode={editMode}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          title={editMode ? '완료' : '다음'}
          onPress={handleNext}
          // 온보딩 모드에서는 1개 이상 선택 시 활성화
          // 편집 모드에서는 항상 활성화
          disabled={!editMode && !isNextButtonActive}
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
    gap: scaleWidth(12),
  },
  content: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
  },
  title: {
    ...Heading_24EB_Round,
    color: COLORS.black,
  },

  // ────── 관심분야 태그 레이아웃 ──────
  tagsWrapper: {
    gap: scaleWidth(8),
  },
  tagsRow: {
    flexDirection: 'row',
    gap: scaleWidth(12),
  },

  // ────── 개별 태그 스타일 ──────
  tagContainer: {
    justifyContent: 'flex-end',
    position: 'relative',
  },

  /**
   * 태그 상단 여백 (선택된 태그만)
   *
   * 우선순위 배지를 표시할 공간 확보
   */
  tagSpacer: {
    height: scaleWidth(50),
  },

  /** 태그 버튼 (비선택 상태) */
  tag: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(8),
    height: scaleWidth(43),
    borderRadius: BORDER_RADIUS[30],
    backgroundColor: COLORS.puple[3], // 연보라
    flexDirection: 'row',
    alignItems: 'center',
  },

  /** 태그 버튼 (선택된 상태) */
  tagSelected: {
    backgroundColor: COLORS.puple.main, // 진보라
    gap: scaleWidth(10),
  },

  /**
   * 우선순위 배지 (절대 위치)
   *
   * 태그 위쪽 중앙에 표시
   */
  priorityBadge: {
    position: 'absolute',
    top: scaleWidth(0),
    alignSelf: 'center',
  },

  /** 태그 텍스트 (비선택) */
  tagText: {
    ...Body_18M,
    color: COLORS.puple.main,
  },

  /** 태그 텍스트 (선택됨) */
  tagTextSelected: {
    ...Heading_18SB,
    color: COLORS.white,
  },

  /**
   * 체크 아이콘 컨테이너
   *
   * 흰색 원형 배경 + 보라색 체크 아이콘
   */
  checkIconContainer: {
    width: scaleWidth(24),
    height: scaleWidth(24),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.white,
  },

  footer: {
    paddingHorizontal: scaleWidth(20),
  },
});

export default InterestsScreen;
