import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';

import SearchResultItem from './components/SearchResultItem';
import type { NewsItems } from '../../data/mock/searchData';
import { COLORS, scaleWidth } from '../../styles/global';
import { getImageUrl } from '../../utils/imageUtils';

import { useExploreContents } from '../../hooks/useExploreContents';
import { useArticleNavigation } from '../../hooks/useArticleNavigation';
import { trackEvent } from '../../services/mixpanelService';

type Props = {
  keyword: string;
  // 상위에서: 검색어 저장/오버레이 닫기/최근검색어 처리 등에 사용
  onPressItem: (item: NewsItems) => void;
};

/**
 * SearchLiveResultOverlay
 * - SearchInputScreen 위를 absolute overlay로 덮어 "입력 중 실시간 결과"를 노출
 * - explore(전체) 데이터를 누적 로드한 뒤, 프론트에서 keyword로 필터링
 * - 결과가 없고 hasNextPage가 true면 다음 페이지를 자동 로드하며 결과를 탐색
 */
export default function SearchLiveResultOverlay({
  keyword,
  onPressItem,
}: Props) {
  const trimmed = keyword.trim();

  // 기사 클릭 시 상세 이동(포인트/구매/모달/네비게이션 로직 포함)
  const { handleArticlePress } = useArticleNavigation({
    returnTo: 'search',
    entrySource: 'search',
  });

  // explore "전체" 데이터 조회(무한 스크롤)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isRefetching,
  } = useExploreContents(undefined);

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
      hits: (c as any).hits ?? (c as any).hits ?? 0,
    }));
  }, [data]);

  // 입력값 기준으로 제목 필터링
  const liveResults: NewsItems[] = useMemo(() => {
    const kw = trimmed.toLowerCase();
    if (!kw) return [];
    return allVisibleData.filter(item =>
      (item.title ?? '').toLowerCase().includes(kw),
    );
  }, [allVisibleData, trimmed]);

  // "결과 없음" 상태에서 fetchNextPage가 과도하게 연속 호출되는 것 방지
  const autoFetchGuard = useRef(false);

  // 키워드가 바뀌면 가드 초기화
  useEffect(() => {
    autoFetchGuard.current = false;
  }, [trimmed]);

  // 결과가 없고 다음 페이지가 있다면 자동으로 더 가져옴(페이지네이션 적용 시에만 의미 있음)
  useEffect(() => {
    if (!trimmed) return;
    if (isLoading || isRefetching || isFetchingNextPage) return;
    if (isError) return;

    if (liveResults.length === 0 && hasNextPage && !autoFetchGuard.current) {
      autoFetchGuard.current = true;
      fetchNextPage().finally(() => {
        autoFetchGuard.current = false;
      });
    }
  }, [
    trimmed,
    liveResults.length,
    hasNextPage,
    fetchNextPage,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    isError,
  ]);

  // 입력이 없으면 오버레이 숨김
  if (!trimmed) return null;

  // 최초 로딩만 로더 노출(캐시가 있으면 리스트 바로 표시)
  const showInitialLoading = isLoading && !data;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      {showInitialLoading ? (
        <ActivityIndicator
          style={{ marginTop: 20 }}
          color={COLORS.puple.main}
        />
      ) : (
        <FlatList
          data={liveResults}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <SearchResultItem
              item={item}
              onPress={() => {
                // 키보드 내려서 터치/화면전환 안정화
                Keyboard.dismiss();

                // 상위 처리(최근검색어 저장/오버레이 닫기 등)
                onPressItem(item);

                // 상세 페이지 이동(로직은 useArticleNavigation 내부)
                const contentId = Number(item.id);
                if (Number.isNaN(contentId)) return;

                // 검색 결과에서 글 선택
                trackEvent('search_result_click', {
                  article_id: contentId,
                  category: item.category,
                });

                handleArticlePress(contentId, item.read, item.category);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
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
            <Text style={styles.emptyText}>
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
  );
}

const styles = StyleSheet.create({
  // SearchInputScreen 위를 덮는 오버레이 레이어
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.white,
  },
  // 리스트 여백/간격
  listContent: {
    paddingTop: scaleWidth(12),
    paddingBottom: scaleWidth(24),
    gap: scaleWidth(12),
  },
  emptyText: {
    fontSize: scaleWidth(13),
    color: COLORS.gray400,
    marginTop: scaleWidth(20),
    textAlign: 'center',
  },
});
