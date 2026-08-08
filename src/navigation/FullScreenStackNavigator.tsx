/**
 * 전체 화면 스택 네비게이터 (FullScreenStackNavigator.tsx)
 *
 * 탭바 없이 전체 화면으로 표시되는 화면들을 관리하는 네비게이터이다.
 *
 * 포함된 화면 카테고리:
 *   - 공통: 알림, 글 상세, 퀴즈, 광고 로딩
 *   - 검색: 검색 입력, 검색 결과
 *   - 캐릭터: 기준 확인, 포인트 히스토리
 *   - 마이페이지: 설정, 로그인 정보, 문의, 약관, 개인정보처리방침
 *
 * 설계 의도:
 *   - 하단 탭바를 숨기고 전체 화면으로 표시해야 하는 화면들을 모아둠
 *   - 모든 탭에서 공통으로 접근 가능한 화면들 (글 읽기, 퀴즈, 설정 등)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteNames } from '../../routes';

import NotificationScreen from '../screens/common/NotificationScreen';
import ArticleDetailScreen from '../screens/common/ArticleDetailScreen';
import ReadArticleDetailScreen from '../screens/common/ReadArticleDetailScreen';
import QuizScreen from '../screens/common/QuizScreen';
import AdLoadingScreen from '../screens/common/AdLoadingScreen';
import MockArticleDetailScreen from '../screens/common/MockArticleDetailScreen';
import MockQuizScreen from '../screens/common/MockQuizScreen';

import SettingScreen from '../screens/myPage/SettingScreen';
import LoginInfoScreen from '../screens/myPage/LoginInfoScreen';
import InquiryScreen from '../screens/myPage/InquiryScreen';
import TermsOfServiceScreen from '../screens/myPage/TermOfServiceScreen';
import PrivacyPolicyScreen from '../screens/myPage/PrivacyPolicyScreen';

import SearchInputScreen from '../screens/search/SearchInputScreen';
import SearchResultScreen from '../screens/search/SearchResultScreen';

import PointHistoryScreen from '../screens/character/history/PointHistoryScreen';
import CriteriaCheckScreen from '../screens/character/criteria/CriteriaCheckScreen';

import { FullScreenStackParamList } from './types';

const Stack = createNativeStackNavigator<FullScreenStackParamList>();

/**
 * 탭바가 없는 전체 화면 스택 네비게이터
 *
 * screenOptions:
 *   - headerShown: false → 모든 화면에서 기본 헤더 숨김
 *     (각 화면에서 커스텀 Header 컴포넌트 사용)
 */
const FullScreenStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* ──────────────────────────────────────────────
          공통 화면
          모든 탭에서 접근 가능한 화면들
      ────────────────────────────────────────────── */}

      {/* 알림 화면 (캐릭터 탭 > 알림 아이콘 클릭 시) */}
      <Stack.Screen
        name={RouteNames.CHARACTER_NOTIFICATION}
        component={NotificationScreen}
      />

      {/* 글 상세 화면 (미션/검색에서 글 클릭 시) */}
      <Stack.Screen
        name={RouteNames.ARTICLE_DETAIL}
        component={ArticleDetailScreen}
      />

      {/* 읽은 글 상세 화면 (마이페이지 > 읽은 글 목록에서 클릭 시) */}
      <Stack.Screen
        name={RouteNames.READ_ARTICLE_DETAIL}
        component={ReadArticleDetailScreen}
      />

      {/* 퀴즈 화면 (글 읽기 완료 후 "퀴즈 풀기" 버튼 클릭 시) */}
      <Stack.Screen name={RouteNames.QUIZ} component={QuizScreen} />

      {/* 광고 로딩 화면 (잠긴 글을 광고로 열 때) */}
      <Stack.Screen name={RouteNames.AD_LOADING} component={AdLoadingScreen} />

      {/* ──────────────────────────────────────────────
          [내부 테스트] 스토어 스크린샷용 mock 화면
          IS_INTERNAL_TEST 빌드의 홈/탐색 리스트 맨 위 mock 카드에서만 진입 가능
      ────────────────────────────────────────────── */}

      {/* 목 아티클 상세 화면 (스크린샷용) */}
      <Stack.Screen
        name={RouteNames.MOCK_ARTICLE_DETAIL}
        component={MockArticleDetailScreen}
      />

      {/* 목 퀴즈 화면 (스크린샷용) */}
      <Stack.Screen name={RouteNames.MOCK_QUIZ} component={MockQuizScreen} />

      {/* ──────────────────────────────────────────────
          검색 탭 서브 화면
      ────────────────────────────────────────────── */}

      {/* 검색 입력 화면 (검색 탭 > 검색창 클릭 시) */}
      <Stack.Screen
        name={RouteNames.SEARCH_INPUT}
        component={SearchInputScreen}
      />

      {/* 검색 결과 화면 (검색어 입력 후 검색 시) */}
      <Stack.Screen
        name={RouteNames.SEARCH_RESULT}
        component={SearchResultScreen}
      />

      {/* ──────────────────────────────────────────────
          캐릭터 탭 서브 화면
      ────────────────────────────────────────────── */}

      {/* 난이도 기준 확인 화면 (캐릭터 탭 > 난이도 설정 시) */}
      <Stack.Screen
        name={RouteNames.CHARACTER_CRITERIA}
        component={CriteriaCheckScreen}
      />

      {/* 포인트 획득 히스토리 화면 (캐릭터 탭 > 포인트 클릭 시) */}
      <Stack.Screen
        name={RouteNames.CHARACTER_POINT_HISTORY}
        component={PointHistoryScreen}
      />

      {/* ──────────────────────────────────────────────
          마이페이지 탭 서브 화면
      ────────────────────────────────────────────── */}

      {/* 설정 화면 (마이페이지 > 설정 아이콘 클릭 시) */}
      <Stack.Screen name={RouteNames.SETTINGS} component={SettingScreen} />

      {/* 로그인 정보 화면 (설정 > 로그인 정보 클릭 시) */}
      <Stack.Screen name={RouteNames.LOGIN_INFO} component={LoginInfoScreen} />

      {/* 문의하기 화면 (설정 > 문의하기 클릭 시) */}
      <Stack.Screen name={RouteNames.INQUIRY} component={InquiryScreen} />

      {/* 이용약관 화면 (설정 > 이용약관 클릭 시) */}
      <Stack.Screen
        name={RouteNames.TERMS_OF_SERVICE}
        component={TermsOfServiceScreen}
      />

      {/* 개인정보처리방침 화면 (설정 > 개인정보처리방침 클릭 시) */}
      <Stack.Screen
        name={RouteNames.PRIVACY_POLICY}
        component={PrivacyPolicyScreen}
      />
    </Stack.Navigator>
  );
};

export default FullScreenStackNavigator;
