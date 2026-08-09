import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RouteNames } from '../../../routes';
import { OnboardingStackParamList } from '../../navigation/types';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import {
  Heading_24EB_Round,
  Heading_18B,
  Body_16M,
} from '../../styles/typography';

import Header from '../../components/Header';
import { CheckIcon } from '../../icons';
import RightArrow from '../../assets/svg/RightArrow.svg';
import { logEvent } from '../../services/analyticsService';
import { logout } from '../../services/authService';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;
type RouteP = RouteProp<
  OnboardingStackParamList,
  typeof RouteNames.TERMS_AGREEMENT
>;

const TermsAgreementScreen = () => {
  // OnboardingStack 내에서 이동하는 navigation
  const navigation = useNavigation<NavigationProp>();

  // TermsAgreement로 넘어온 params(provider) 읽기
  const route = useRoute<RouteP>();

  // 어떤 소셜 로그인 버튼을 눌렀는지(provider)
  const provider = route.params?.provider;

  console.log('[TermsAgreement] TermsAgreementScreen provider:', provider);

  useEffect(() => {
    if (!provider) {
      navigation.goBack();
    }
  }, [provider, navigation]);

  // 필수 체크 항목들 상태
  const [age14, setAge14] = useState(false); // 만 14세 이상
  const [tos, setTos] = useState(false); // 이용약관 동의
  const [privacy, setPrivacy] = useState(false); // 개인정보 동의

  // 모든 필수 동의 완료 시, 딱 1번만 이동하도록 가드
  const [didProceed, setDidProceed] = useState(false);

  // 필수 3개가 모두 체크되었는지
  const allChecked = useMemo(
    () => age14 && tos && privacy,
    [age14, tos, privacy],
  );

  /**
   * 약관에 동의하고 정상적으로 다음 화면(온보딩)으로 넘어갔는지 여부
   *
   * 이 화면에 도달한 시점에는 이미 소셜 로그인 + 서버 로그인이 끝난 상태다
   * (LoginScreen 참고: newUser === true일 때만 이 화면으로 옴).
   * 즉 여기서 뒤로가기 등으로 동의 없이 이탈하면, 서버에는 이미 계정이
   * 생성됐는데 클라이언트만 로그인 이전 상태로 돌아가는 불일치가 생긴다.
   * 이를 막기 위해 정상적으로 동의하고 넘어간 경우가 아니면(false로 남아있으면)
   * 화면이 사라질 때(아래 unmount effect) 자동으로 로그아웃 처리한다.
   */
  const hasAgreedRef = useRef(false);

  // "모두 동의하기" 토글
  const toggleAll = () => {
    logEvent('AgreeAll_AgreeToTerms');
    const next = !(age14 && tos && privacy);
    setAge14(next);
    setTos(next);
    setPrivacy(next);
  };

  // 약관 동의 완료 → 온보딩 인트로 화면으로 진행
  // (로그인은 이 화면에 오기 전에 이미 끝난 상태이므로 로그인 화면으로
  //  되돌아갈 필요 없이 그대로 앞으로 진행하면 된다)
  const proceedToOnboarding = () => {
    console.log('[TermsAgreement] 약관 동의 완료, 온보딩으로 진행:', provider);

    // 자동 로그아웃(아래 unmount effect)이 발동하지 않도록 먼저 표시
    hasAgreedRef.current = true;

    navigation.navigate(RouteNames.INTRO_CARDLIST);
  };

  // 필수 3개를 다 체크한 순간 자동으로 온보딩으로 진행(1회만)
  useEffect(() => {
    if (!allChecked) return;
    if (didProceed) return;

    setDidProceed(true);
    proceedToOnboarding();
  }, [allChecked, didProceed]); // eslint-disable-line react-hooks/exhaustive-deps

  // 약관 동의 없이 화면을 벗어나면(뒤로가기 등) 자동 로그아웃
  // provider는 이 화면에 진입한 시점에 고정되는 값이라 의도적으로 의존성 배열에서
  // 제외했다(마운트 시점의 provider를 그대로 클로저로 캡처) — cleanup이 "실제 언마운트"
  // 시에만 한 번 실행되도록 하기 위함이며, eslint-disable로 이를 명시한다.
  useEffect(() => {
    return () => {
      if (!hasAgreedRef.current) {
        console.log('[TermsAgreement] 약관 미동의 상태로 이탈 → 자동 로그아웃');
        logout(provider).catch(err =>
          console.warn('[TermsAgreement] 이탈 시 로그아웃 실패:', err),
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 뒤로가기는 공통 Header로 처리 */}
      <Header title="" />

      <View style={styles.content}>
        {/* 상단 안내 타이틀 */}
        <Text style={styles.title}>
          뉴로스 이용을 위해{'\n'}약관 동의가 필요해요
        </Text>

        {/* 모두 동의하기(카드) */}
        <Pressable style={styles.allCard} onPress={toggleAll}>
          <Check checked={allChecked} />
          <Text style={styles.allText}>모두 동의하기</Text>
        </Pressable>

        {/* 필수 항목 리스트 */}
        <View style={styles.list}>
          <Pressable
            style={styles.row}
            onPress={() => {
              setAge14(v => !v);
              logEvent('Chk_Required_Age14Plus_AgreeToTerms');
            }}
          >
            <Check checked={age14} />
            <Text style={styles.rowText}>[필수] 만 14세 이상</Text>
          </Pressable>

          <View style={styles.row}>
            <Pressable
              onPress={() => {
                setTos(v => !v);
                logEvent('Chk_Required_TermsOfService_AgreeToTerms');
              }}
              hitSlop={8}
              style={styles.checkHit}
            >
              <Check checked={tos} />
            </Pressable>

            <Pressable
              style={styles.rowBody}
              onPress={() => navigation.navigate(RouteNames.TERMS_OF_SERVICE)}
            >
              <Text style={[styles.rowText, styles.flex1]}>
                [필수] 뉴로스 이용약관
              </Text>
              <RightArrow color={COLORS.gray700} />
            </Pressable>
          </View>

          <View style={styles.row}>
            <Pressable
              onPress={() => {
                setPrivacy(v => !v);
                logEvent('Chk_Required_PrivacyPolicy_AgreeToTerms');
              }}
              hitSlop={8}
              style={styles.checkHit}
            >
              <Check checked={privacy} />
            </Pressable>

            <Pressable
              style={styles.rowBody}
              onPress={() => navigation.navigate(RouteNames.PRIVACY_POLICY)}
            >
              <Text style={[styles.rowText, styles.flex1]}>
                [필수] 개인 정보 수집 및 이용 동의
              </Text>
              <RightArrow color={COLORS.gray700} />
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const Check = ({ checked }: { checked: boolean }) => {
  return (
    <View style={styles.checkIcon}>
      <View
        style={[
          styles.checkIconContainer,
          {
            backgroundColor: checked ? COLORS.puple.main : COLORS.gray300,
          },
        ]}
      >
        <CheckIcon color={checked ? COLORS.white : COLORS.gray100} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  content: {
    flex: 1,
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(20),
  },

  title: {
    ...Heading_24EB_Round,
    color: COLORS.black,
  },

  allCard: {
    flexDirection: 'row', // 체크 + 텍스트 가로 배치
    alignItems: 'center', // 세로 가운데 정렬
    gap: scaleWidth(16), // 체크와 텍스트 사이 간격
    paddingHorizontal: scaleWidth(12), // 카드 좌우 패딩
    paddingVertical: scaleWidth(16), // 카드 상하 패딩
    borderRadius: scaleWidth(12), // 카드 라운드
    backgroundColor: COLORS.gray100, // 카드 배경색
    marginTop: scaleWidth(40), // 제목과 간격
    marginBottom: scaleWidth(20), // 아래 리스트와 간격
  },

  allText: {
    ...Heading_18B, // 텍스트 폰트 스타일
    color: COLORS.gray800, // 텍스트 색상
  },

  list: {
    gap: scaleWidth(14), // 항목 간 간격
  },

  row: {
    flexDirection: 'row', // 체크/태그/텍스트 가로 배치
    alignItems: 'center', // 세로 가운데 정렬
    gap: scaleWidth(16), // 요소 간 간격
    minHeight: scaleWidth(44), // 최소 높이
    paddingHorizontal: scaleWidth(12),
  },

  rowBody: {
    flex: 1, // 오른쪽 영역이 남는 공간 차지
    flexDirection: 'row', // 태그/텍스트/화살표 가로 배치
    alignItems: 'center', // 세로 가운데 정렬
    gap: scaleWidth(6), // 태그와 텍스트 간격
    paddingVertical: scaleWidth(10), // 터치 영역 확보(상하)
  },

  rowText: {
    ...Body_16M, // 본문 폰트 스타일
    color: COLORS.gray800, // 본문 색상
  },

  flex1: {
    flex: 1,
  },

  checkHit: {
    justifyContent: 'center', // 체크 영역 세로 중앙
    alignItems: 'center', // 체크 영역 가로 중앙
  },

  checkIcon: {
    width: scaleWidth(28), // 체크 원 외곽 크기
    height: scaleWidth(28), // 체크 원 외곽 크기
    justifyContent: 'center', // 내부 중앙 정렬(세로)
    alignItems: 'center', // 내부 중앙 정렬(가로)
    borderRadius: BORDER_RADIUS[99], // 완전 원형
  },

  checkIconContainer: {
    width: scaleWidth(28), // 체크 배경 원 크기
    height: scaleWidth(28), // 체크 배경 원 크기
    justifyContent: 'center', // 체크 아이콘 세로 중앙
    alignItems: 'center', // 체크 아이콘 가로 중앙
    borderRadius: BORDER_RADIUS[99], // 완전 원형
    backgroundColor: COLORS.gray300, // 기본 배경(선택되지 않음 상태)
  },

  rightIconSlot: {
    width: scaleWidth(28), // 화살표 영역 너비(자리 확보용)
    height: scaleWidth(28), // 화살표 영역 높이(자리 확보용)
    alignItems: 'center', // 중앙 정렬(가로)
    justifyContent: 'center', // 중앙 정렬(세로)
  },
});

export default TermsAgreementScreen;
