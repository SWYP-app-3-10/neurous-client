import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { FullScreenStackParamList } from '../../navigation/types';
import { RouteNames } from '../../../routes';

import RecentSearches from '../../components/RecentSearches';
import SearchHeader from './components/SearchHeader';
import SearchLiveResultOverlay from './SearchLiveResultOveraly';

import { COLORS, scaleWidth } from '../../styles/global';
import { Heading_18SB } from '../../styles/typography';
import {
  loadRecents,
  addRecent,
  removeRecent,
} from '../../storage/recentSearches';

import type { NewsItems } from '../../data/mock/searchData';
import { useArticleNavigation } from '../../hooks/useArticleNavigation';
import { logEvent } from '../../services/analyticsService';
import { trackEvent } from '../../services/mixpanelService';

type Props = NativeStackScreenProps<
  FullScreenStackParamList,
  typeof RouteNames.SEARCH_INPUT
>;

type SearchRecord = {
  searchName: string;
};

export default function SearchInputScreen({ navigation }: Props) {
  // 현재 입력 중인 검색어
  const [text, setText] = useState('');
  // 저장된 최근 검색어 목록
  const [searchRecord, setSearchRecord] = useState<SearchRecord[]>([]);

  // 기사 상세 화면 이동 공통 훅
  const { handleArticlePress } = useArticleNavigation({
    returnTo: 'search',
    entrySource: 'search',
  });

  // string[] 형태의 최근 검색어를 화면에서 사용하는 타입으로 변환
  const convertToSearchRecords = (keywords: string[]): SearchRecord[] =>
    keywords.map(keyword => ({ searchName: keyword }));

  // 화면 진입 시 로컬 스토리지에 저장된 최근 검색어 로드
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const keywords = await loadRecents();
        setSearchRecord(convertToSearchRecords(keywords));
      } catch (error) {
        console.error('최근 검색어 불러오기 실패:', error);
      }
    };
    loadRecentSearches();
  }, []);

  // 검색어를 최근 검색어 목록에 저장
  const recordSearch = useCallback(async (keyword: string) => {
    try {
      const updated = await addRecent(keyword);
      setSearchRecord(convertToSearchRecords(updated));
    } catch (error) {
      console.error('검색어 저장 실패:', error);
    }
  }, []);

  // 검색 확정(엔터 / 검색 버튼)
  // - 검색어 저장
  // - 검색 결과 화면으로 이동
  const submit = useCallback(
    async (kw?: string) => {
      const keyword = (kw ?? text).trim();
      if (!keyword) return;

      await recordSearch(keyword);
      navigation.navigate(RouteNames.SEARCH_RESULT, { keyword });
    },
    [text, recordSearch, navigation],
  );

  // 최근 검색어 칩 클릭 시
  // - 입력값 세팅
  // - 검색 결과 화면으로 이동
  const handleRecentSearchClick = useCallback(
    async (keyword: string) => {
      setText(keyword);
      await submit(keyword);
    },
    [submit],
  );

  // 최근 검색어 삭제
  const removeSearchRecordFn = useCallback(async (name: string) => {
    try {
      const updated = await removeRecent(name);
      logEvent('ClearRecentSearches_Search');
      setSearchRecord(convertToSearchRecords(updated));
    } catch (error) {
      console.error('검색어 삭제 실패:', error);
    }
  }, []);

  // 실시간 검색 결과 오버레이에서 아이템 클릭 시
  // - 검색어 저장
  // - 기사 상세 화면으로 바로 이동
  const handlePressLiveItem = useCallback(
    async (item: NewsItems) => {
      const parsed = Number(item.id);
      if (Number.isNaN(parsed)) return;

      await recordSearch(text.trim());

      // 검색 결과에서 글 선택
      trackEvent('search_result_click', {
        article_id: parsed,
        category: item.category,
      });

      handleArticlePress(parsed, item.read, item.category);
    },
    [handleArticlePress, recordSearch, text],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 검색 입력 / 표시 공통 헤더 */}
      <SearchHeader
        value={text}
        onChangeText={setText}
        onSubmit={() => submit()}
        goBackAction={() => navigation.goBack()}
      />

      <View style={styles.container}>
        {/* 기존 최근 검색어 UI
            - 항상 렌더링
            - 오버레이 방식으로 덮이기 때문에 구조 변경 없음 */}
        <Text style={styles.sectionTitle}>최근 검색어</Text>

        <View style={styles.chipsArea}>
          {searchRecord.length === 0 ? (
            <Text style={styles.emptyText}>최근 검색어가 없습니다.</Text>
          ) : (
            <View style={styles.recentContainer}>
              {searchRecord.map((value, index) => (
                <RecentSearches
                  key={index.toString()}
                  index={index}
                  removeSearchRecord={removeSearchRecordFn}
                  recordSearch={handleRecentSearchClick}
                  setSearch={setText}
                  item={value}
                />
              ))}
            </View>
          )}
        </View>

        {/* 입력 중일 때만 노출되는 실시간 검색 결과 오버레이
            - 기존 최근 검색어 UI 위에 덮는 구조
            - 입력값이 비어 있으면 내부에서 null 반환 */}
        <SearchLiveResultOverlay
          keyword={text}
          onPressItem={handlePressLiveItem}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
    position: 'relative', // 오버레이 기준이 되는 부모
  },
  sectionTitle: {
    marginVertical: scaleWidth(20),
    ...Heading_18SB,
    color: COLORS.gray800,
  },
  chipsArea: {
    flex: 1,
  },
  emptyText: {
    fontSize: scaleWidth(13),
    color: COLORS.gray400,
    marginTop: scaleWidth(6),
  },
  recentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: scaleWidth(12),
    rowGap: scaleWidth(16),
  },
});
