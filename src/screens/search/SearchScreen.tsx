import React, {
  useCallback,
  //useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  //Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RouteNames } from '../../../routes';
import type {
  MainTabNavigationProp,
  SearchStackParamList,
} from '../../navigation/types';

// 로딩 스켈레톤 / 카테고리 탭 / 리스트 아이템 컴포넌트
import SearchResultSkeleton from './components/SearchResultSkeleton';
import CategoryTabs from './components/CategoryTabs';
import SearchResultItem from './components/SearchResultItem';

// 화면에서 쓰는 데이터 타입(목데이터 타입 재사용)
import { NewsCategory, NewsItems } from '../../data/mock/searchData';

// 기사 상세 이동 훅
import { useArticleNavigation } from '../../hooks/useArticleNavigation';

// 공통 스타일 토큰
import { BORDER_RADIUS, COLORS, scaleWidth } from '../../styles/global';
import { Caption_12M } from '../../styles/typography';

// SVG 아이콘
//import InfoIcon from '../../assets/svg/Info_Search.svg';
import SearchIcon from '../../assets/svg/ExploreSearch.svg';
//import ExploreTooltipTail from '../../assets/svg/ExploreTooltipTail.svg';

// 탐색 컨텐츠 조회(infinite query)
import { useExploreContents } from '../../hooks/useExploreContents';
import { logEvent } from '../../services/analyticsService';
import { getImageUrl } from '../../utils/imageUtils';

// 버튼 터치 영역 확대
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// 툴팁 상수
// const TOOLTIP_TAIL_H = scaleWidth(13);
// const TOOLTIP_TAIL_W = scaleWidth(15);
// const TOOLTIP_BG = 'rgba(118, 124, 145, 0.95)';

// UI 카테고리(한글) -> 서버 enum 매핑
const SERVER_CATEGORY_MAP: Record<string, string | undefined> = {
  전체: undefined,
  정치: 'POLITICS',
  경제: 'ECONOMY',
  사회: 'SOCIETY',
  '생활/문화': 'LIFE_CULTURE',
  'IT/과학': 'IT_SCIENCE',
  세계: 'WORLD',
};

export default function SearchScreen() {
  // 네비게이션 (탐색 탭 내부)
  const navigation =
    useNavigation<MainTabNavigationProp<SearchStackParamList>>();
  const flatListRef = useRef<FlatList>(null);

  // 카테고리 상태
  const [selectedCategory, setSelectedCategory] = useState<
    NewsCategory | '전체'
  >('전체');

  // 선택된 카테고리를 서버 파라미터(enum)로 변환
  const categoryParam = useMemo(
    () => SERVER_CATEGORY_MAP[selectedCategory],
    [selectedCategory],
  );

  // 서버에서 탐색 컨텐츠 조회 (무한 스크롤)
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useExploreContents(categoryParam);

  // 탐색 탭 진입/재진입 시 자동 새로고침
  useFocusEffect(
    useCallback(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      refetch();
    }, [refetch]),
  );

  // 서버 응답(페이지들)을 FlatList에서 쓰는 형태로 가공 + contentId 기준 중복 제거
  const visibleData: NewsItems[] = useMemo(() => {
    const pages = data?.pages ?? [];
    const allContents = pages.flatMap(p => p.contents ?? []);

    const uniqueContents = allContents.filter(
      (item, index, self) =>
        index === self.findIndex(t => t.contentId === item.contentId),
    );

    return uniqueContents.map(c => ({
      id: String(c.contentId),
      category: (c.categoryName || '전체') as any,
      title: c.title || '',
      subtitle: '',
      readTime: `${c.readingTime ?? 0}분 소요`,
      imageUrl: getImageUrl(c.imgUrl),
      content: '',
      hits: c.hits ?? 0,
      read: (c as any).read ?? false,
    }));
  }, [data]);

  // 기사 클릭 시 상세로 이동(포인트/구매/모달 등 포함된 네비게이션 처리)
  const { handleArticlePress } = useArticleNavigation({
    returnTo: 'search',
    entrySource: 'explore',
  });

  // 오른쪽 검색 아이콘 클릭 시 검색 입력 화면으로 이동
  const goToSearchInput = () => {
    logEvent('Search_Explore');
    navigation.navigate(RouteNames.FULL_SCREEN_STACK, {
      screen: RouteNames.SEARCH_INPUT,
    });
  };

  // 일반 상태: 헤더 + 카테고리 탭 + 리스트
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <ExploreHeaderWithTimer onSearch={goToSearchInput} />

        {/* 카테고리 탭 (선택 시 서버 파라미터가 바뀌어 쿼리 재조회) */}
        <View style={styles.tabsWrap}>
          <CategoryTabs
            categories={
              [
                '전체',
                '정치',
                '경제',
                '사회',
                '생활/문화',
                'IT/과학',
                '세계',
              ] as any
            }
            selected={selectedCategory as any}
            onSelect={(cat: any) => {
              // 같은 탭을 다시 누르면 새로고침(refetch)해서 "업데이트 이후" 최신을 다시 받게 함
              if (cat === selectedCategory) {
                refetch();
                return;
              }
              if (cat === '전체') {
                logEvent('CategoryChip_All_Explore');
              } else if (cat === '정치') {
                logEvent('CategoryChip_Politics_Explore');
              } else if (cat === '경제') {
                logEvent('CategoryChip_Economy_Explore');
              } else if (cat === '사회') {
                logEvent('CategoryChip_Society_Explore');
              } else if (cat === '생활/문화') {
                logEvent('CategoryChip_Lifestyle_Culture_Explore');
              } else if (cat === 'IT/과학') {
                logEvent('CategoryChip_It_Science_Explore');
              } else if (cat === '세계') {
                logEvent('CategoryChip_World_Explore');
              }
              setSelectedCategory(cat);
            }}
          />
        </View>

        {/* 리스트 영역만 스켈레톤/결과를 스위칭 */}
        {isLoading ? (
          <FlatList
            style={styles.list}
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(_, i) => `sk-${i}`}
            renderItem={() => <SearchResultSkeleton />}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.list}
            data={visibleData}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <SearchResultItem
                item={item}
                onPress={() => {
                  handleArticlePress(Number(item.id), item.read, item.category);
                  logEvent('ContectsList_Explore');
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => <View style={{ height: 20 }} />}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {isError
                  ? '데이터를 가져오지 못했습니다.'
                  : '해당 카테고리의 글이 없습니다.'}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
//-------------------------------------------------------------------
// 타이머 무효화 (주석 처리)
//-------------------------------------------------------------------

/**
 * ExploreHeaderWithTimer
 * - 가운데 타이머 pill은 항상 화면 정중앙에 위치
 * - 타이머 pill 탭 시 툴팁(자동 숨김) 표시
 * - 오른쪽 검색 아이콘 탭 시 검색 입력 화면으로 이동
 */
const ExploreHeaderWithTimer = React.memo(function ExploreHeaderWithTimer({
  onSearch,
}: {
  onSearch: () => void;
}) {
  // // 툴팁(자동 숨김 포함) 관련 상태/계산
  // const timerTooltip = useTooltip(1500);

  // // 다음 업데이트 시각과 남은 초
  // const [nextUpdateAt, setNextUpdateAt] = useState<Date>(() =>
  //   getNextUpdateAt(new Date()),
  // );
  // const [remainSec, setRemainSec] = useState<number>(() =>
  //   getRemainSeconds(new Date(), nextUpdateAt),
  // );

  // // 1초마다 tick 하면서 remainSec 갱신
  // // nextUpdateAt을 지나면 다음 업데이트 시각 재계산
  // useEffect(() => {
  //   const tick = () => {
  //     const now = new Date();
  //     if (now.getTime() >= nextUpdateAt.getTime()) {
  //       const next = getNextUpdateAt(now);
  //       setNextUpdateAt(next);
  //       setRemainSec(getRemainSeconds(now, next));
  //       return;
  //     }
  //     setRemainSec(getRemainSeconds(now, nextUpdateAt));
  //   };
  //   tick();
  //   const interval = setInterval(tick, 1000);
  //   return () => clearInterval(interval);
  // }, [nextUpdateAt]);

  // // 타이머 표시 포맷
  // // 1시간 이상: hh:mm / 1시간 미만: mm:ss
  // const timerText = useMemo(() => formatRemainText(remainSec), [remainSec]);

  // // 툴팁 표시용 텍스트
  // // 타이머와 일치하도록 분 계산은 floor(버림) 사용
  // // 1시간 이상: h시간 m분 / 1시간 미만: m분
  // const tooltipMinutes = useMemo(() => {
  //   const total = Math.max(0, remainSec);
  //   const h = Math.floor(total / 3600);

  //   if (h >= 1) {
  //     const m = Math.floor((total % 3600) / 60);
  //     return `${h}시간 ${m}분`;
  //   }

  //   const m = Math.floor(total / 60);
  //   return `${m}분`;
  // }, [remainSec]);

  // // "지금 확인" 문구 여부는 초 기준으로 판단
  // const isNow = remainSec <= 0;

  return (
    <HeaderArea
      // timerText={timerText}
      // tooltip={timerTooltip}
      // tooltipMinutes={tooltipMinutes}
      // isNow={isNow}
      onSearch={onSearch}
    />
  );
});

// /**
//  * useTooltip
//  * - visible 토글
//  * - autoHideMs 후 자동 숨김
//  * - 타이머 pill이 항상 화면 정중앙이므로 tooltipLeft(가로 위치 계산)는 제거
//  */
// function useTooltip(autoHideMs: number) {
//   const [visible, setVisible] = useState(false);
//   const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const clearTimer = useCallback(() => {
//     if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
//     hideTimerRef.current = null;
//   }, []);

//   const toggle = useCallback(() => {
//     logEvent('Timer_Explore');
//     setVisible(prev => {
//       const next = !prev;
//       clearTimer();

//       if (next) {
//         hideTimerRef.current = setTimeout(() => setVisible(false), autoHideMs);
//       }

//       return next;
//     });
//   }, [autoHideMs, clearTimer]);

//   useEffect(() => {
//     return () => clearTimer();
//   }, [clearTimer]);

//   return { visible, toggle };
// }

// // 업데이트는 하루 8번(3,6,9,12,15,18,21,24시)
// // 24는 다음날 00시로 처리
// const UPDATE_HOURS = [3, 6, 9, 12, 15, 18, 21, 24] as const;

// // 현재 시각 기준으로 다음 업데이트 시각 계산
// const getNextUpdateAt = (now: Date) => {
//   const y = now.getFullYear();
//   const m = now.getMonth();
//   const d = now.getDate();
//   for (const hour of UPDATE_HOURS) {
//     const candidate =
//       hour === 24
//         ? new Date(y, m, d + 1, 0, 0, 0, 0)
//         : new Date(y, m, d, hour, 0, 0, 0);
//     if (candidate.getTime() > now.getTime()) return candidate;
//   }
//   return new Date(y, m, d + 1, 0, 0, 0, 0);
// };

// // next까지 남은 초 계산(음수 방지)
// const getRemainSeconds = (now: Date, next: Date) =>
//   Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));

// // 타이머 표시 포맷
// // 1시간 이상: hh:mm / 1시간 미만: mm:ss
// const formatRemainText = (sec: number) => {
//   const total = Math.max(0, sec);
//   const h = Math.floor(total / 3600);
//   const m = Math.floor((total % 3600) / 60);
//   const s = total % 60;

//   if (h >= 1) {
//     return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
//   }

//   return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
// };

// 헤더 UI
// leftSpacer: 좌/우 폭을 맞춰 가운데 타이머 pill이 정확히 중앙에 오게 함
const HeaderArea = ({
  // timerText,
  // tooltip,
  // tooltipMinutes,
  // isNow,
  onSearch,
}: any) => (
  <View style={styles.exploreHeaderRow}>
    <View style={styles.leftSpacer} />

    {/* 타이머 & 툴팁 영역 임시 비활성화 */}
    {/* 타이머 & 툴팁 영역 (정중앙 고정) */}
    <View style={styles.centerWrap}>
      {/*
      <Pressable
        onPress={tooltip.toggle}
        style={styles.timerPill}
        hitSlop={HIT_SLOP}
      >
        <Text style={styles.timerPillText}>{timerText}</Text>
        <View style={styles.timerPillIconBox}>
          <InfoIcon />
        </View>
      </Pressable>

      {tooltip.visible && (
        <View style={styles.tooltipWrap} pointerEvents="none">
          {/* 꼬리 (SVG) * /}
          <View style={styles.tooltipTailWrap}>
            <ExploreTooltipTail
              width={TOOLTIP_TAIL_W}
              height={TOOLTIP_TAIL_H}
              color={'rgba(118, 124, 145, 0.95)'}
            />
          </View>

          {/* 몸통(패딩 기반) * /}
          <View style={styles.tooltipBody}>
            <Text style={styles.tooltipText}>
              {isNow
                ? '지금 새로운 글을 확인할 수 있어요!'
                : `${tooltipMinutes} 뒤에 새로운 글을 확인할 수 있어요!`}
            </Text>
          </View>
        </View>
      )}
        */}
    </View>

    {/* 오른쪽 검색 아이콘 버튼 */}
    <TouchableOpacity
      onPress={onSearch}
      style={styles.searchSquareBtn}
      hitSlop={HIT_SLOP}
    >
      <View style={styles.searchIconWrap}>
        <SearchIcon />
      </View>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1 },

  // 헤더 한 줄 레이아웃
  exploreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(52),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(8),
    zIndex: 100,
    elevation: 100,
    overflow: 'visible',
  },

  // 왼쪽을 비워두되, 오른쪽 버튼(48)과 폭을 맞춰 가운데가 정확히 중앙에 오게 함
  leftSpacer: { width: scaleWidth(48) },

  // 가운데 타이머 영역
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 100,
    overflow: 'visible',
  },

  // 타이머 pill UI
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(34),
    borderRadius: BORDER_RADIUS[30],
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(12),
  },
  timerPillText: {
    ...Caption_12M,
    color: COLORS.gray700,
    marginRight: scaleWidth(4),
  },
  timerPillIconBox: { width: scaleWidth(18), height: scaleWidth(18) },

  // 툴팁 (꼬리 SVG + 몸통 View)
  // tooltipWrap: {
  //   position: 'absolute',
  //   top: scaleWidth(42),
  //   zIndex: 999,
  //   elevation: 999,
  //   alignItems: 'center',
  // },
  // tooltipTailWrap: {
  //   height: TOOLTIP_TAIL_H,
  //   justifyContent: 'flex-end',
  //   alignItems: 'center',
  // },
  // tooltipBody: {
  //   backgroundColor: TOOLTIP_BG,
  //   borderRadius: BORDER_RADIUS[12],
  //   paddingHorizontal: scaleWidth(18),
  //   paddingVertical: scaleWidth(12),
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   marginTop: -2,
  // },
  // tooltipText: {
  //   ...Caption_14R,
  //   color: COLORS.white,
  //   textAlign: 'center',
  // },

  // 오른쪽 검색 버튼 영역
  searchSquareBtn: {
    minWidth: scaleWidth(44),
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  searchIconWrap: {
    width: scaleWidth(48),
    height: scaleWidth(48),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 카테고리 탭 영역
  tabsWrap: { paddingVertical: scaleWidth(20) },

  // 리스트 영역
  list: { flex: 1 },

  // 리스트 컨텐츠 여백/간격
  listContent: {
    paddingTop: scaleWidth(15),
    paddingBottom: scaleWidth(48),
    gap: scaleWidth(12),
  },

  // 빈 상태 문구
  empty: {
    textAlign: 'center',
    paddingTop: scaleWidth(40),
    color: COLORS.gray700,
  },
});
