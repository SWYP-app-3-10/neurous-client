/**
 * 마이페이지 화면 (MyPageScreen.tsx)
 *
 * 사용자의 프로필, 관심분야, 난이도 설정, 읽은 글 히스토리를 보여주는 화면이다.
 *
 * 주요 기능:
 *   1. 프로필 정보 표시 (레벨별 프로필 이미지, 이름, 이메일)
 *   2. 관심분야 태그 목록 및 편집
 *   3. 난이도 설정 및 변경 (Bottom Sheet 모달)
 *   4. 읽은 글 타임라인 (주간 단위 조회)
 *   5. 주간 날짜 범위 선택 (이전 주 / 다음 주)
 *
 * 데이터 소스:
 *   - useMyPage: 프로필, 관심분야, 난이도, 읽은 글 목록
 *   - useCharacterData: 현재 레벨 (프로필 이미지 선택용)
 *
 * 주간 날짜 선택:
 *   - selectedWeek: 0 = 이번 주, -1 = 저번 주, -2 = 2주 전, ...
 *   - 다음 주로 이동 불가 (canGoNext === false)
 *   - 날짜 형식: "MM.DD - MM.DD" (예: "02.10 - 02.16")
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import {
  Heading_18EB_Round,
  Body_16M,
  Caption_14R,
  Heading_18SB,
} from '../../styles/typography';

import Spacer from '../../components/Spacer';
import { TimelineGroup } from '../../components/TimelineGroup';
import IconButton from '../../components/IconButton';

import {
  useNavigation,
  CompositeNavigationProp,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  MyPageStackParamList,
  RootStackParamList,
} from '../../navigation/types';

import { RouteNames } from '../../../routes';

import {
  LevelChangeCheckIcon,
  Check_2Icon,
  Level_1_Profile,
  Level_2_Profile,
  Level_3_Profile,
  Level_4_Profile,
  Level_5_Profile,
  NoArticlesIcon,
  SettingIcon,
  TriangleIcon,
} from '../../icons';
import {
  useShowBottomSheetModal,
  useHideModal,
  useShowToastModal,
} from '../../store/modalStore';
import LevelSelectionContent from '../../components/LevelSelectionContent';
import { useCharacterData } from '../../hooks/useCharacter';
import { useMyPage } from '../../hooks/useMyPage';
import { useUpdateLevel } from '../../hooks/useUpdateLevel';
import {
  getLevelText,
  categoryNameMap,
  formatArticleDate,
  calculateWeekRange,
  convertToYYYYMMDD,
  convertMyPageContentsToReadArticles,
} from '../../utils/myPageUtils';
import { logEvent, logScreenView } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/**
 * MyPageStack과 RootStack을 합친 네비게이션 타입
 *
 * 이유:
 *   - 마이페이지 내부 화면 이동 (MyPageStack)
 *   - 전체 화면으로 이동 (RootStack → FullScreenStack)
 *   둘 다 필요하므로 CompositeNavigationProp 사용
 */
type MyPageNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MyPageStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const MyPageScreen = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<MyPageNavigationProp>();

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /**
   * 선택된 주 인덱스 (0 = 이번 주)
   *
   * 음수 값:
   *   - 0: 이번 주
   *   - -1: 저번 주
   *   - -2: 2주 전
   *   - ...
   *
   * 양수 값은 미래 날짜이므로 선택 불가 (canGoNext === false)
   */
  const [selectedWeek, setSelectedWeek] = useState(0);

  // ──────────────────────────────────────────────
  // API Hooks
  // ──────────────────────────────────────────────

  /**
   * 현재 레벨 조회 (프로필 이미지 선택용)
   *
   * 레벨별 프로필 이미지:
   *   - Lv1 ~ Lv5까지 각각 다른 이미지
   */
  const { data: characterData } = useCharacterData();
  const currentLevel = characterData?.currentLevel ?? 1;

  /**
   * 날짜 범위 계산
   *
   * selectedWeek를 기반으로 주간 날짜 범위를 계산한다.
   * 예: "02.10 - 02.16"
   */
  const currentWeekRange = useMemo(
    () => calculateWeekRange(selectedWeek),
    [selectedWeek],
  );

  /**
   * 마이페이지 데이터 조회
   *
   * 파라미터:
   *   - startDate: 주간 시작일 (YYYY-MM-DD 형식)
   *
   * 응답 데이터:
   *   - name: 사용자 이름
   *   - email: 사용자 이메일
   *   - interests: 관심분야 ID 배열
   *   - level: 난이도 설정
   *   - contents: 읽은 글 목록
   */
  const { myPageData, setMyPageData } = useMyPage(
    convertToYYYYMMDD(currentWeekRange.split(' - ')[0]),
  );

  // ──────────────────────────────────────────────
  // Modal Hooks
  // ──────────────────────────────────────────────

  const showBottomSheetModal = useShowBottomSheetModal();
  const showToastModal = useShowToastModal();
  const hideModal = useHideModal();

  /**
   * 난이도 업데이트 핸들러
   *
   * Bottom Sheet에서 난이도를 선택하면:
   *   1. API로 난이도 업데이트
   *   2. myPageData 상태 갱신
   *   3. 모달 닫기
   *   4. 완료 토스트 표시
   */
  const { handleUpdateLevel } = useUpdateLevel({
    setMyPageData,
    currentLevel: myPageData?.level ?? null,
    onSuccess: () => {
      hideModal();
      showToastModal({
        message: '난이도 설정이 완료되었어요',
        icon: <LevelChangeCheckIcon />,
        position: 'bottom',
        marginHorizontal: scaleWidth(20),
        paddingHorizontal: scaleWidth(20),
        paddingVertical: scaleWidth(14),
        borderRadius: BORDER_RADIUS[99],
        duration: 2000,
      });
    },
    onError: () => hideModal(),
  });

  // ──────────────────────────────────────────────
  // Effect: 탭 포커스 시 스크롤 최상단 이동
  // ──────────────────────────────────────────────

  /**
   * 마이페이지 탭으로 전환될 때마다 실행
   *
   * 처리:
   *   - 스크롤을 맨 위로 이동 (부드러운 전환)
   *
   * useFocusEffect를 사용하는 이유:
   *   - 탭 전환 시마다 실행되어야 하므로
   *   - useEffect는 탭 전환 시 트리거되지 않음
   */
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      // Mixpanel: 마이페이지 탭 진입 (진입 시 1회)
      trackEvent('my_page_view');
    }, []),
  );

  // ──────────────────────────────────────────────
  // UI 관련 메모이제이션
  // ──────────────────────────────────────────────

  /**
   * 레벨별 프로필 이미지 컴포넌트 선택
   *
   * currentLevel에 따라 다른 프로필 이미지를 표시한다.
   * Lv1 ~ Lv5까지 각각 다른 디자인
   */
  const ProfileImage = useMemo(() => {
    switch (currentLevel) {
      case 1:
        return <Level_1_Profile />;
      case 2:
        return <Level_2_Profile />;
      case 3:
        return <Level_3_Profile />;
      case 4:
        return <Level_4_Profile />;
      case 5:
        return <Level_5_Profile />;
      default:
        return <Level_1_Profile />;
    }
  }, [currentLevel]);

  /**
   * 읽은 글 데이터 변환
   *
   * API 응답을 타임라인 렌더링용 형태로 변환:
   *   - 입력: 서버 형식 (평면 배열)
   *   - 출력: 날짜별 그룹화된 배열
   *     [
   *       { date: '2026-02-15', articles: [...] },
   *       { date: '2026-02-14', articles: [...] },
   *       ...
   *     ]
   */
  const readArticles = useMemo(() => {
    if (!myPageData?.contents || myPageData.contents.length === 0) {
      return [];
    }
    return convertMyPageContentsToReadArticles(myPageData.contents);
  }, [myPageData?.contents]);

  /**
   * 관심분야 태그 목록
   *
   * 관심분야 ID를 한글 이름으로 변환:
   *   - 예: "ECONOMY" → "경제"
   *   - categoryNameMap에서 매핑
   */
  const interestTags = useMemo(() => {
    if (myPageData?.interests && myPageData.interests.length > 0) {
      return myPageData.interests.map(id => categoryNameMap[id] || id);
    }
    return [];
  }, [myPageData?.interests]);

  /** 이메일 존재 여부 */
  const hasEmail = useMemo(() => {
    return !!myPageData?.email && myPageData.email.trim().length > 0;
  }, [myPageData?.email]);

  /** 현재 난이도 설정 (초급/중급/고급) */
  const currentDifficulty = myPageData?.level || null;

  /**
   * 다음 주 이동 버튼 활성화 여부
   *
   * selectedWeek < 0:
   *   - 과거 주를 보고 있음 → 다음 주(이번 주 방향)로 이동 가능
   *
   * selectedWeek >= 0:
   *   - 이번 주를 보고 있음 → 미래로 이동 불가
   */
  const canGoNext = useMemo(() => {
    return selectedWeek < 0;
  }, [selectedWeek]);

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ────── 헤더 (설정 버튼) ────── */}
        <View
          style={{
            paddingHorizontal: scaleWidth(20),
            height: scaleWidth(52),
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <IconButton
            onPress={() => {
              // getParent()로 RootStack에 접근하여 FullScreenStack 이동
              navigation.getParent()?.navigate(RouteNames.FULL_SCREEN_STACK, {
                screen: RouteNames.SETTINGS,
              });
              logEvent('Setting_My');
            }}
          >
            <SettingIcon />
          </IconButton>
        </View>
        <Spacer num={20} />

        {/* ────── 프로필 섹션 ────── */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>{ProfileImage}</View>
          <View style={styles.profileInfo}>
            <Text style={styles.userId}>{myPageData?.name}</Text>
            {hasEmail && (
              <Text style={styles.userEmail}>{myPageData?.email}</Text>
            )}
          </View>
        </View>

        <Spacer num={41} />

        {/* ────── 나의 관심분야 섹션 ────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>나의 관심분야</Text>

            {/* 편집 버튼: 관심분야 선택 화면으로 이동 (편집 모드) */}
            <TouchableOpacity
              onPress={() => {
                navigation.navigate(RouteNames.ONBOARDING, {
                  screen: RouteNames.INTERESTS,
                  params: { editMode: true }, // 편집 모드로 진입
                });
                logEvent('EditInterest_My');
              }}
            >
              <Text style={styles.editButton}>편집</Text>
            </TouchableOpacity>
          </View>

          {/* 관심분야 태그 목록 */}
          <View style={styles.interestTags}>
            {interestTags.length > 0 ? (
              interestTags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>{tag}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>관심분야를 선택해주세요</Text>
            )}
          </View>
        </View>

        <Spacer num={33} />

        {/* ────── 나의 난이도 섹션 ────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 난이도</Text>
          <Spacer num={16} />

          {/* 난이도 선택 버튼: Bottom Sheet 모달 표시 */}
          <TouchableOpacity
            style={styles.levelButton}
            onPress={() => {
              logScreenView('EditLevelModal', undefined, true);

              // Bottom Sheet 모달 표시
              showBottomSheetModal({
                children: React.createElement(LevelSelectionContent, {
                  selectedLevel: currentDifficulty,
                  onSelect: handleUpdateLevel, // 난이도 선택 시 API 호출
                }),
                paddingHorizontal: 0,
              });

              logEvent('EditLevel_My');
            }}
          >
            <Text style={styles.levelText}>
              {getLevelText(currentDifficulty)}
            </Text>
            <Check_2Icon color={COLORS.gray600} />
          </TouchableOpacity>
        </View>

        <Spacer num={32} />

        {/* ────── 읽은 글 섹션 ────── */}
        <View style={styles.readArticleSection}>
          <Spacer num={32} />
          <Text style={styles.sectionTitle}>읽은 글</Text>
          <Spacer num={6} />

          {/* 주간 날짜 선택기 */}
          <View style={styles.dateSelector}>
            {/* 이전 주 버튼 (<) */}
            <IconButton
              onPress={() => {
                setSelectedWeek(prev => prev - 1); // 과거로 이동
                logEvent('Back_DateRead_My');
              }}
            >
              <TriangleIcon color={COLORS.gray600} />
            </IconButton>

            {/* 날짜 범위 표시 (예: "02.10 - 02.16") */}
            <Text style={styles.dateRange}>{currentWeekRange}</Text>

            {/* 다음 주 버튼 (>) */}
            <IconButton
              onPress={() => {
                // canGoNext가 true일 때만 이동 (미래로 이동 불가)
                if (canGoNext) {
                  setSelectedWeek(prev => prev + 1); // 현재로 이동
                  logEvent('Next_DateRead_My');
                }
              }}
              disabled={!canGoNext}
            >
              <TriangleIcon
                color={canGoNext ? COLORS.gray600 : COLORS.gray200}
                style={{ transform: [{ rotate: '180deg' }] }} // 화살표 반전
              />
            </IconButton>
          </View>

          <Spacer num={24} />

          {/* 읽은 글 타임라인 */}
          {readArticles.length > 0 ? (
            readArticles.map((dateGroup, groupIndex) => (
              <TimelineGroup
                key={`${dateGroup.date}-${groupIndex}`}
                dateGroup={dateGroup}
                formatDate={formatArticleDate} // 날짜 포맷 함수
                isLast={groupIndex === readArticles.length - 1}
                onArticlePress={articleId => {
                  // 읽은 글 상세 화면으로 이동
                  navigation
                    .getParent()
                    ?.navigate(RouteNames.FULL_SCREEN_STACK, {
                      screen: RouteNames.READ_ARTICLE_DETAIL,
                      params: {
                        articleId,
                        entrySource: 'my_page',
                      },
                    });
                }}
              />
            ))
          ) : (
            // 읽은 글이 없을 때
            <View style={styles.noArticlesContainer}>
              <NoArticlesIcon />
              <Spacer num={16} />
              <Text style={styles.noArticlesText}>읽은 글이 없어요</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: scaleWidth(8),
  },

  // ────── 프로필 섹션 ──────
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  profileImageContainer: {
    marginRight: scaleWidth(16),
    width: scaleWidth(90),
    height: scaleWidth(90),
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scaleWidth(1),
    borderColor: COLORS.gray200,
  },
  profileInfo: {
    flex: 1,
    minHeight: scaleWidth(90),
    justifyContent: 'center',
  },
  userId: {
    ...Heading_18EB_Round,
    color: COLORS.black,
  },
  userEmail: {
    ...Body_16M,
    color: COLORS.gray700,
  },

  // ────── 섹션 공통 ──────
  section: {
    paddingHorizontal: scaleWidth(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleWidth(9),
    height: scaleWidth(44),
  },
  sectionTitle: {
    ...Heading_18EB_Round,
    color: COLORS.black,
  },

  // ────── 관심분야 ──────
  editButton: {
    ...Body_16M,
    color: COLORS.puple.main,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(12),
  },
  interestTag: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(8),
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.gray100,
  },
  interestTagText: {
    ...Body_16M,
    color: COLORS.gray700,
  },
  emptyText: {
    ...Caption_14R,
    color: COLORS.gray500,
  },

  // ────── 나의 난이도 ──────
  levelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.gray100,
    width: scaleWidth(71),
    height: scaleWidth(40),
    gap: scaleWidth(10),
  },
  levelText: {
    ...Body_16M,
    color: COLORS.gray700,
  },

  // ────── 읽은 글 섹션 ──────
  readArticleSection: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleWidth(40),
  },

  // 날짜 선택기
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateRange: {
    ...Heading_18SB,
    color: COLORS.black,
  },
  noArticlesContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: scaleWidth(100),
    paddingBottom: scaleWidth(128),
  },
  noArticlesText: {
    ...Caption_14R,
    color: COLORS.gray600,
  },
});

export default MyPageScreen;
