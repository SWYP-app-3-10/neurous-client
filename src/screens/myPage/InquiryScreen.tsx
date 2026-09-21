import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { SUCCESS_TOAST_PRESET } from '../../components/toastPresets';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import BottomCtaBar from '../../components/BottomCtaBar';

import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';

import { useShowToastModal } from '../../store/modalStore';
import { LevelChangeCheckIcon } from '../../icons';
import { getUserInfo } from '../../services/authService';
import {
  Body_16M,
  Caption_12M,
  Heading_16B,
  Heading_18SB,
  Heading_20EB_Round,
} from '../../styles/typography';

/**
 * 이메일 도메인 형식을 검사해 오류 메시지를 반환합니다.
 * 문제가 없으면 빈 문자열을 반환합니다. (도메인 오입력 케이스별 안내)
 */
const getEmailDomainError = (value: string): string => {
  const email = value.trim();
  if (email.length === 0) return '';
  if (email.length > 254) return '이메일은 최대 254자까지 입력할 수 있습니다.';

  const atCount = (email.match(/@/g) || []).length;
  if (atCount === 0) return "이메일에 '@' 문자를 포함해 주세요.";
  if (atCount > 1) return "'@'는 한 번만 사용할 수 있습니다.";

  const [local, domain] = email.split('@');
  if (local.length === 0) return "'@' 앞에 아이디를 입력해 주세요.";
  if (domain.length === 0)
    return "'@' 뒤에 도메인(예: example.com)을 입력해 주세요.";
  if (!domain.includes('.'))
    return "도메인에 '.'을 포함해 주세요. 예) example.com";
  if (domain.startsWith('.')) return '도메인은 알파벳·숫자로 시작해야 합니다.';
  if (domain.endsWith('.')) return '도메인은 알파벳·숫자로 끝나야 합니다.';
  if (domain.includes('..')) return "도메인에 연속된 '..'은 허용되지 않습니다.";
  if (!/^[A-Za-z0-9.-]+$/.test(domain)) {
    return '도메인에는 영문, 숫자, 하이픈(-)만 사용할 수 있습니다.';
  }

  const tld = domain.split('.').pop() ?? '';
  if (tld.length < 2)
    return '최상위 도메인은 최소 2자 이상이어야 합니다. 예) .com';

  return '';
};

const InquiryScreen = () => {
  const navigation = useNavigation<any>();
  const showToastModal = useShowToastModal();

  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchEmail = async () => {
      const userInfo = await getUserInfo();
      console.log('저장된 유저 정보:', userInfo);
      if (userInfo?.email) {
        setEmail(userInfo.email);
      }
    };
    fetchEmail();
  }, []);

  // 이메일 도메인 오입력 여부 (빈 문자열이면 정상)
  const emailError = useMemo(() => getEmailDomainError(email), [email]);

  const isSubmitEnabled = useMemo(() => {
    // 문의 내용 + 이메일 입력 및 형식 검증 통과 시에만 활성화
    return (
      content.trim().length > 0 && email.trim().length > 0 && emailError === ''
    );
  }, [content, email, emailError]);

  const onPressSubmit = () => {
    console.log('[Inquiry] submit', { content, email });
    showToastModal({
      ...SUCCESS_TOAST_PRESET,
      message: '문의 전달이 완료되었어요',
      icon: <LevelChangeCheckIcon />,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 버그 수정: 안드로이드에서 behavior가 undefined라 키보드가 올라와도 화면이 안 밀렸음.
          height로 지정해 안드로이드에서도 키보드 높이만큼 뷰가 줄어들어 ScrollView가 스크롤되도록 함 */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerWrap}>
          <Header title="" />
          <View pointerEvents="none" style={styles.headerCenterTitleWrap}>
            <Text style={styles.headerCenterTitle}>문의하기</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TODO(QA): Figma Inquiry_Default 기준 안내 문구 행간 수치 확인 필요 */}
          <Text style={styles.title}>
            뉴로스 이용 중 불편한 점이나{'\n'}
            궁금한 점이 있다면 말씀해주세요.
          </Text>

          <Text style={styles.sectionLabel}>문의 내용</Text>

          <Input
            placeholder="문의 내용을 10자 이상 작성해주세요."
            value={content}
            onChangeText={setContent}
            variant="outline"
            multiline
            textAlignVertical="top"
            containerStyle={styles.textareaContainer}
            style={styles.inputText}
          />

          <Text style={[styles.sectionLabel, styles.sectionLabelWithTop]}>
            답변 받을 이메일
          </Text>

          <Input
            placeholder="abcd@naver.com"
            value={email}
            onChangeText={setEmail}
            variant="outline"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            containerStyle={styles.emailContainer}
            style={styles.inputText}
          />
          {/* 이메일 도메인 형식이 잘못된 경우 케이스별 안내 메시지 표시 */}
          {emailError ? (
            <Text style={styles.emailErrorText}>{emailError}</Text>
          ) : null}
        </ScrollView>

        {/* 하단 버튼 (공통 CTA 컨테이너) */}
        <BottomCtaBar>
          <Button
            title="전달하기"
            onPress={onPressSubmit}
            disabled={!isSubmitEnabled}
            variant="primary"
            style={styles.submitButton}
          />
        </BottomCtaBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InquiryScreen;

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
  kav: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(25),
    // 스크롤 최하단에서 CTA 영역과 겹치지 않도록 여백 확보 (Figma 디자인 기준 48px)
    paddingBottom: scaleWidth(48),
  },
  title: {
    ...Heading_20EB_Round,
    color: COLORS.black,
    // TODO(QA): Figma Inquiry_Default 기준 안내 문구 lineHeight 확인 필요
    lineHeight: scaleWidth(35),
    marginBottom: scaleWidth(52),
  },
  sectionLabel: {
    ...Heading_18SB,
    color: COLORS.black,
    marginBottom: scaleWidth(12),
  },
  textareaContainer: {
    height: scaleWidth(207),
    alignItems: 'flex-start',
    // TODO(QA): Figma Inquiry_Default 기준 문의 내용 텍스트 박스 내부 패딩 확인 필요
    padding: scaleWidth(18),
    borderRadius: BORDER_RADIUS[16],
    borderColor: COLORS.gray300,
  },
  emailContainer: {
    height: scaleWidth(60),
    // TODO(QA): Figma Inquiry_Default 기준 이메일 텍스트 박스 내부 패딩 확인 필요
    borderColor: COLORS.gray300,
  },
  emailErrorText: {
    ...Caption_12M,
    color: COLORS.red.main,
    marginTop: -scaleWidth(8),
  },
  inputText: {
    ...Body_16M,
    color: COLORS.black,
  },
  sectionLabelWithTop: {
    // TODO(QA): Figma Inquiry_Default 기준 문의 내용 텍스트 박스와 답변 받을 이메일 사이 간격 수치 확인 필요
    marginTop: scaleWidth(32),
  },
  submitButton: {
    width: '100%',
    borderRadius: scaleWidth(12),
  },
});
