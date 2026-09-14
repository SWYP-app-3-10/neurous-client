import React, { useMemo } from 'react';

import { RouteNames } from '../../routes';
import MissionStackNavigator from './MissionStackNavigator';
import CharacterStackNavigator from './CharacterStackNavigator';
import SearchStackNavigator from './SearchStackNavigator';
import MyPageStackNavigator from './MyPageStackNavigator';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CharacterIcon, HomeIcon, Search_tab_Icon, MyPageIcon } from '../icons';
import { COLORS, scaleWidth } from '../styles/global';
import { Caption_12M } from '../styles/typography';
import { logEvent } from '../services/analyticsService';

const Tab = createBottomTabNavigator();

// tabBarIcon 생성 헬퍼 함수 (컴포넌트 외부에 정의)
type IconComponent = React.ComponentType<{ color: string }>;
const createTabBarIcon = (Icon: IconComponent) => {
  return ({ focused }: { focused: boolean }) => (
    <Icon color={focused ? COLORS.puple.main : COLORS.gray500} />
  );
};

const MainTabNavigator = () => {
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.puple.main,
      tabBarInactiveTintColor: COLORS.gray400,
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
      },
      tabBarLabelStyle: {
        ...Caption_12M,
        marginTop: scaleWidth(2),
      },
    }),
    [],
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
