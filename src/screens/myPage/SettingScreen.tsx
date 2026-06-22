/**
 * 설정 화면 (SettingScreen.tsx)
 *
 * 앱의 각종 설정 및 정보를 관리하는 화면이다.
 *
 * 주요 기능:
 *   1. 회원정보 관리 (로그인 정보)
 *   2. 알림 설정 (OS 권한 연동)
 *   3. 약관 및 정책 확인
 *   4. 도움말 (문의하기)
 *   5. [내부 테스트] 온보딩 다시보기
 *
 * 알림 설정 동작:
 *   - 토글 ON: OS 권한이 허용된 경우 앱 내부 알림만 활성화
 *   - 토글 OFF → ON: OS 권한 요청 또는 설정 화면으로 이동
 *   - 포커스 시 권한 상태 자동 동기화
 *
 * 온보딩 다시보기:
 *   - IS_INTERNAL_TEST 플래그가 true일 때만 표시
 *   - 로그아웃 없이 온보딩 인트로 3개 화면만 다시 표시
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from '../../components/Header';
import RightArrow from '../../assets/svg/RightArrow.svg';
import Toast from '../../components/Toast';
import Toggle from '../../components/Toggle';

import { COLORS, scaleWidth } from '../../styles/global';
import { Heading_16B, Caption_14R, Body_16SB } from '../../styles/typography';
import { RouteNames } from '../../../routes';
import { IS_INTERNAL_TEST } from '../../config/env';

import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { useToastMessage, useClearToast } from '../../store/toastStore';
import { updateNotificationStatus } from '../../api/notificationApi';
import { getUserInfo } from '../../services/authService';

const ALARM_ENABLED_KEY = '@alarm_enabled';

const SettingScreen = () => {
  const navigation = useNavigation<any>();

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /** 알림 토글 상태 (OS 권한 상태와 동기화) */
  const [isAlarmOn, setIsAlarmOn] = useState(false);

  /** 토스트 표시 여부 */
  const [toastVisible, setToastVisible] = useState(false);

  /** 토스트 메시지 내용 */
  const [toastMessage, setToastMessage] = useState('');

  // ──────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────

  const storedToastMessage = useToastMessage();
  const clearToast = useClearToast();

  /**
   * 설정 화면 이동 추적 ref
   * OS 설정 화면으로 이동 후 복귀 시 권한 상태 재확인을 위해 사용
   */
  const waitingForSettingsRef = useRef(false);

  /**
   * 알림 권한 관리 훅
   * - checkPermission: 현재 권한 상태 확인
   * - requestPermission: 권한 요청 또는 설정 화면 이동
   */
  const { checkPermission, requestPermission } = useNotificationPermission({
    onSettingsOpened: () => {
      waitingForSettingsRef.current = true;
    },
  });

  // ──────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────

  /**
   * 화면 포커스 시 실행
   *
   * 1. 토스트 메시지 표시
   *    - 다른 화면에서 설정한 메시지를 store에서 읽어와 표시
   *    - 표시 후 store에서 제거
   *
   * 2. 알림 권한 상태 동기화
   *    - OS 권한 + 앱 내부 저장값 모두 확인하여 토글 동기화
   *    - OS 권한이 없으면 무조건 OFF
   *    - OS 권한이 있으면 AsyncStorage 저장값으로 결정 (없으면 기본 ON)
   */
  useFocusEffect(
    useCallback(() => {
      // 토스트 메시지 처리
      if (storedToastMessage) {
        setToastMessage(storedToastMessage);
        setToastVisible(true);
        clearToast();
      }

      // OS 권한 + 앱 내부 저장값 모두 확인하여 토글 동기화
      const syncAlarmToggle = async () => {
        try {
          const shouldShowModal = await checkPermission();
          const hasOsPermission = !shouldShowModal;

          if (!hasOsPermission) {
            // OS 권한 자체가 없으면 무조건 OFF
            setIsAlarmOn(false);
            await AsyncStorage.setItem(ALARM_ENABLED_KEY, 'false');
          } else {
            // OS 권한은 있음 → 앱 내부 저장값으로 결정
            const stored = await AsyncStorage.getItem(ALARM_ENABLED_KEY);
            // 저장값이 없으면 기본 ON
            setIsAlarmOn(stored !== 'false');
          }
        } catch (error) {
          console.error(error);
        } finally {
          if (waitingForSettingsRef.current) {
            waitingForSettingsRef.current = false;
          }
        }
      };

      syncAlarmToggle();
    }, [storedToastMessage, clearToast, checkPermission]),
  );

  // ──────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────

  /**
   * 토스트 종료 핸들러
   */
  const handleHideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  /**
   * 알림 설정 토글 핸들러
   *
   * 동작 흐름:
   *   1. 현재 ON 상태인 경우
   *      → 앱 내부 알림 비활성화 (OS 권한은 유지) + 서버 패치
   *
   *   2. 현재 OFF 상태인 경우
   *      2-1. 이미 OS 권한이 허용되어 있음
   *           → 앱 내부 알림만 활성화 + 서버 패치
   *      2-2. OS 권한이 없음
   *           → requestPermission() 호출
   *           → iOS: 시스템 권한 팝업 또는 설정 화면 이동
   *           → Android: 권한 요청
   */
  const handlePressAlarmRow = async () => {
    if (isAlarmOn) {
      // ON → OFF
      setIsAlarmOn(false);
      await AsyncStorage.setItem(ALARM_ENABLED_KEY, 'false');
      try {
        const userInfo = await getUserInfo();
        if (userInfo?.userId) {
          await updateNotificationStatus(userInfo.userId, false);
        }
      } catch {
        console.warn('[SettingScreen] 알림 수신 설정 false 업데이트 실패');
      }
      return;
    }

    try {
      const shouldShowModal = await checkPermission();

      if (!shouldShowModal) {
        // 이미 OS 권한 허용됨 → 앱 내부 알림 활성화 + 서버 패치
        setIsAlarmOn(true);
        await AsyncStorage.setItem(ALARM_ENABLED_KEY, 'true');
        try {
          const userInfo = await getUserInfo();
          if (userInfo?.userId) {
            await updateNotificationStatus(userInfo.userId, true);
          }
        } catch {
          console.warn('[SettingScreen] 알림 수신 설정 true 업데이트 실패');
        }
        return;
      }

      // OS 권한 없음 → 권한 요청
      const granted = await requestPermission();
      if (granted) {
        setIsAlarmOn(true);
        await AsyncStorage.setItem(ALARM_ENABLED_KEY, 'true');
      } else {
        setIsAlarmOn(false);
        await AsyncStorage.setItem(ALARM_ENABLED_KEY, 'false');
      }
      try {
        const userInfo = await getUserInfo();
        if (userInfo?.userId) {
          await updateNotificationStatus(userInfo.userId, !!granted);
        }
      } catch {
        console.warn('[SettingScreen] 알림 수신 설정 업데이트 실패');
      }
    } catch (error: any) {
      Alert.alert(
        '오류',
        error?.message || '알림 설정 중 오류가 발생했습니다.',
      );
    }
  };

  /**
   * [내부 테스트] 온보딩 다시보기 핸들러
   *
   * 로그아웃 없이 온보딩 인트로 3개 화면만 다시 표시한다.
   * 온보딩 스택의 INTRO_CARDLIST 화면으로 이동하여
   * IntroCardList → IntroFunction → IntroSearch 순서로 다시 볼 수 있다.
   */
  const handleReviewOnboarding = () => {
    navigation.navigate(RouteNames.ONBOARDING, {
      screen: RouteNames.INTRO_CARDLIST,
    });
  };

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 토스트 (화면 상단에 오버레이) */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        duration={1500}
        onHide={handleHideToast}
      />

      {/* 헤더 */}
      <View style={styles.headerWrap}>
        <Header title="" />
        <View pointerEvents="none" style={styles.headerCenterTitleWrap}>
          <Text style={styles.headerCenterTitle}>설정</Text>
        </View>
      </View>

      {/* 메뉴 리스트 */}
      <View style={styles.container}>
        {/* 회원정보 섹션 */}
        <Text style={styles.sectionLabel}>회원정보</Text>
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate(RouteNames.LOGIN_INFO)}
        >
          <Text style={styles.rowTitle}>로그인 정보</Text>
          <RightArrow color={COLORS.gray700} />
        </Pressable>
        <View style={styles.divider} />

        {/* 알림 섹션 */}
        <Text style={styles.sectionLabel}>알림</Text>
        <Pressable
          style={[styles.row, styles.alarmRow]}
          onPress={handlePressAlarmRow}
        >
          <View style={styles.alarmTextContainer}>
            <Text style={styles.rowTitle}>알림 설정</Text>
            <Text style={styles.rowDesc}>
              아침 8시, 저녁 6시에 알림을 드려요.
            </Text>
          </View>
          <Toggle value={isAlarmOn} onChange={handlePressAlarmRow} />
        </Pressable>
        <View style={styles.divider} />

        {/* 약관 및 정책 섹션 */}
        <Text style={styles.sectionLabel}>약관 및 정책</Text>
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate(RouteNames.TERMS_OF_SERVICE)}
        >
          <Text style={styles.rowTitle}>서비스 이용 약관</Text>
          <RightArrow color={COLORS.gray700} />
        </Pressable>
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate(RouteNames.PRIVACY_POLICY)}
        >
          <Text style={styles.rowTitle}>개인정보 처리 방침</Text>
          <RightArrow color={COLORS.gray700} />
        </Pressable>
        <View style={styles.divider} />

        {/* 도움말 섹션 */}
        <Text style={styles.sectionLabel}>도움말</Text>
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate(RouteNames.INQUIRY)}
        >
          <Text style={styles.rowTitle}>문의하기</Text>
          <RightArrow color={COLORS.gray700} />
        </Pressable>

        {/* 내부 테스트 섹션 */}
        {IS_INTERNAL_TEST && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.sectionLabel, styles.testSectionLabel]}>
              내부 테스트
            </Text>
            <Pressable style={styles.row} onPress={handleReviewOnboarding}>
              <Text style={[styles.rowTitle, styles.testRowTitle]}>
                온보딩 다시보기
              </Text>
              <RightArrow color={COLORS.gray700} />
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SettingScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerWrap: {
    position: 'relative',
  },
  headerCenterTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: scaleWidth(8),
    height: scaleWidth(52),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterTitle: {
    ...Heading_16B,
    color: COLORS.black,
  },
  container: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(5),
  },
  sectionLabel: {
    ...Caption_14R,
    color: COLORS.gray700,
    marginTop: scaleWidth(24),
    marginBottom: scaleWidth(12),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaleWidth(12),
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginTop: scaleWidth(12),
  },
  alarmRow: {
    alignItems: 'flex-start',
    paddingVertical: scaleWidth(16),
  },
  alarmTextContainer: {
    flex: 1,
    marginRight: scaleWidth(12),
  },
  rowTitle: {
    ...Body_16SB,
    color: COLORS.black,
  },
  rowDesc: {
    ...Caption_14R,
    color: COLORS.gray700,
    marginTop: scaleWidth(4),
  },
  testSectionLabel: {
    color: COLORS.gray700,
  },
  testRowTitle: {
    color: COLORS.black,
  },
});
