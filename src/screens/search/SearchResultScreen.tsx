import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RouteNames } from '../../../routes';
import type { FullScreenStackParamList } from '../../navigation/types';

import SearchHeader from './components/SearchHeader';
import SearchResultItem from './components/SearchResultItem';

import type { NewsItems } from '../../data/mock/searchData';
import { useArticleNavigation } from '../../hooks/useArticleNavigation';

import { useExploreContents } from '../../hooks/useExploreContents';

import { COLORS, scaleWidth } from '../../styles/global';
import { logEvent } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';
import { getImageUrl } from '../../utils/imageUtils';

/**
 * SearchResultScreen
 * - 검색 확정 후 결과 화면
 * - explore(전체) 페이지 데이터를 누적 로드한 뒤, 프론트에서 keyword로 필터링
 *
 * 동작
 * - 결과가 0개면: 다음 페이지를 자동으로 더 받아오며 결과를 탐색
 * - 사용자가 스크롤하면: onEndReached로 추가 페이지 로드
 */
export default function SearchResultScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<FullScreenStackParamList>>();
  const route =
    useRoute<
      RouteProp<FullScreenStackParamList, typeof RouteNames.SEARCH_RESULT>
    >();
  const { keyword } = route.params;

  // explore "전체" 데이터 무한스크롤 조회(page/size 기반)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isRefetching,
  } = useExploreContents(undefined);

  // 기사 클릭 시 상세 이동(포인트/구매/모달 로직 포함)
  const { handleArticlePress } = useArticleNavigation({
    returnTo: 'search',
    entrySource: 'search',
  });

  // pages -> contents -> UI 모델 변환
  const allVisibleData: NewsItems[] = useMemo(() => {
    const pages = data?.pages ?? [];
    const allContents = pages.flatMap(p => p.contents ?? []);

    return allContents.map(c => ({
      id: String(c.contentId),
      category: (c.categoryName || '전체') as any,
      title: c.title || '',
      subtitle: '',
      readTime: `${c.readingTime ?? 0}분 소요`,
      imageUrl: getImageUrl(c.imgUrl),
      content: '',
      hits: (c as any).hits ?? 0,
      read: (c as any).isRead ?? false,
    }));
  }, [data]);

  // keyword로 제목 필터링
  const filteredData: NewsItems[] = useMemo(() => {
    const kw = (keyword ?? '').trim().toLowerCase();
    if (!kw) return [];

    return allVisibleData.filter(item =>
      (item.title ?? '').toLowerCase().includes(kw),
    );
  }, [allVisibleData, keyword]);

  // 결과가 없을 때 자동으로 다음 페이지를 더 가져오도록 가드
  const autoFetchGuard = useRef(false);

  useEffect(() => {
    autoFetchGuard.current = false;
  }, [keyword]);

  useEffect(() => {
    if (isLoading || isRefetching || isFetchingNextPage) return;
    if (isError) return;

    const kw = (keyword ?? '').trim();
    if (!kw) return;

    // 아직 결과가 없고 다음 페이지가 있으면 1페이지씩 추가 로드
    if (filteredData.length === 0 && hasNextPage && !autoFetchGuard.current) {
      autoFetchGuard.current = true;
      fetchNextPage().finally(() => {
        autoFetchGuard.current = false;
      });
    }
  }, [
    keyword,
    filteredData.length,
    hasNextPage,
    fetchNextPage,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    isError,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <SearchHeader
          value={keyword ?? ''}
          readOnly
          goBackAction={() => navigation.goBack()}
          onPressBar={() => navigation.navigate(RouteNames.SEARCH_INPUT)}
        />

        {isLoading ? (
          <ActivityIndicator
            style={{ marginTop: 40 }}
            color={COLORS.puple.main}
          />
        ) : (
          <FlatList
            style={styles.list}
            data={filteredData}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <SearchResultItem
                item={item}
                onPress={() => {
                  const parsed = Number(item.id);
                  if (Number.isNaN(parsed)) return;

                  // 검색 결과에서 글 선택
                  trackEvent('search_result_click', {
                    article_id: parsed,
                    category: item.category,
                  });

                  handleArticlePress(parsed, item.read, item.category);
                  logEvent(`ContectsList${index + 1}_Search`);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              // 사용자가 더 내릴 때 추가 로드
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            ListFooterComponent={() =>
              isFetchingNextPage ? (
                <ActivityIndicator
                  style={{ margin: 20 }}
                  color={COLORS.puple.main}
                />
              ) : (
                <View style={{ height: 20 }} />
              )
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {isError
                  ? '데이터를 불러오지 못했습니다.'
                  : hasNextPage
                    ? '검색 결과를 찾는 중입니다...'
                    : '검색 결과가 없습니다.'}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: {
    paddingTop: scaleWidth(15),
    paddingBottom: scaleWidth(48),
    gap: scaleWidth(12),
  },
  empty: {
    textAlign: 'center',
    paddingTop: scaleWidth(40),
    color: COLORS.gray700,
  },
});
