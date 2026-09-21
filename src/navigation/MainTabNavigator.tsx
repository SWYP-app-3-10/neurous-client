import React, { useMemo } from 'react';

import { RouteNames } from '../../routes';
import MissionStackNavigator from './MissionStackNavigator';
import CharacterStackNavigator from './CharacterStackNavigator';
import SearchStackNavigator from './SearchStackNavigator';
import MyPageStackNavigator from './MyPageStackNavigator';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CharacterIcon, HomeIcon, Search_tab_Icon, MyPageIcon } from '../icons';
import { COLORS, scaleWidth } from '../styles/global';
import { Caption_12M } from '../styles/typography';
import { logEvent } from '../services/analyticsService';

const Tab = createBottomTabNavigator();

// 디자인 시안 기준 탭바 수치 (393pt 기준, scaleWidth로 화면 폭에 맞게 스케일)
// 구성: 상단 8(테두리 1 + paddingTop 7) + 탭 아이템 52 = 60 (하단 safe area 제외)
// 탭 아이템 52 = 위 여백 1 + 아이콘 28 + 간격 4 + 라벨 18 + 아래 여백 1
const TAB_BAR_CONTENT_HEIGHT = 60;
const TAB_BAR_BORDER_WIDTH = 1;
const TAB_BAR_PADDING_TOP = 7;
const TAB_ITEM_VERTICAL_PADDING = 1;
const TAB_ICON_SIZE = 28;
const TAB_ICON_LABEL_GAP = 4;

// tabBarIcon 생성 헬퍼 함수 (컴포넌트 외부에 정의)
type IconComponent = React.ComponentType<{ color: string }>;
const createTabBarIcon = (Icon: IconComponent) => {
  return ({ focused }: { focused: boolean }) => (
    <Icon color={focused ? COLORS.puple.main : COLORS.gray500} />
  );
};

const MainTabNavigator = () => {
  // 하단 safe area(홈 인디케이터 영역) 높이
  const { bottom: bottomInset } = useSafeAreaInsets();

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.puple.main,
      tabBarInactiveTintColor: COLORS.gray400,
      tabBarStyle: {
        borderTopWidth: TAB_BAR_BORDER_WIDTH,
        borderTopColor: COLORS.gray200,
        // 탭바 상단(테두리 포함 8)부터 탭 아이템이 시작하도록 위 여백 지정
        paddingTop: scaleWidth(TAB_BAR_PADDING_TOP),
        // 라이브러리 기본값(iOS는 inset - 4)을 덮어써 safe area를 그대로 반영
        paddingBottom: bottomInset,
        // height를 직접 지정하면 기본 높이 계산이 무시되므로 safe area를 직접 더함
        height: scaleWidth(TAB_BAR_CONTENT_HEIGHT) + bottomInset,
      },
      tabBarItemStyle: {
        // 기본은 아래 정렬(flex-end)이라 위쪽으로 재정렬 + 위/아래 여백 1
        justifyContent: 'flex-start' as const,
        paddingTop: scaleWidth(TAB_ITEM_VERTICAL_PADDING),
        paddingBottom: scaleWidth(TAB_ITEM_VERTICAL_PADDING),
      },
      tabBarIconStyle: {
        // 기본은 남는 공간을 채우며(flex: 1) 아이콘이 가운데 정렬되므로 아이콘 크기로 고정
        flex: 0,
        width: scaleWidth(TAB_ICON_SIZE),
        height: scaleWidth(TAB_ICON_SIZE),
      },
      tabBarLabelStyle: {
        ...Caption_12M,
        // 아이콘과 라벨 사이 간격 (디자인 시안 4)
        marginTop: scaleWidth(TAB_ICON_LABEL_GAP),
      },
    }),
    [bottomInset],
  );

  return (
    <Tab.Navigator
      screenOptions={screenOptions}
      initialRouteName={RouteNames.MAIN_TAB}
    >
      <Tab.Screen
        name={RouteNames.MISSION_TAB}
        component={MissionStackNavigator}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: createTabBarIcon(HomeIcon),
        }}
        listeners={{
          tabPress: () => {
            logEvent('Nav_Home');
          },
        }}
      />
      <Tab.Screen
        name={RouteNames.CHARACTER_TAB}
        component={CharacterStackNavigator}
        options={{
          tabBarLabel: '캐릭터',
          tabBarIcon: createTabBarIcon(CharacterIcon),
        }}
        listeners={{
          tabPress: () => {
            logEvent('Nav_Character');
          },
        }}
      />
      <Tab.Screen
        name={RouteNames.SEARCH_TAB}
        component={SearchStackNavigator}
        options={{
          tabBarLabel: '탐색',
          tabBarIcon: createTabBarIcon(Search_tab_Icon),
        }}
        listeners={{
          tabPress: () => {
            logEvent('Nav_Explore');
          },
        }}
      />
      <Tab.Screen
        name={RouteNames.MY_PAGE_TAB}
        component={MyPageStackNavigator}
        options={{
          tabBarLabel: '마이',
          tabBarIcon: createTabBarIcon(MyPageIcon),
        }}
        listeners={{
          tabPress: () => {
            logEvent('Nav_My');
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
