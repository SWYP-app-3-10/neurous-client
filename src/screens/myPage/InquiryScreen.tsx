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

import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';

import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';

import { useShowToast } from '../../store/toastStore';
import { getUserInfo } from '../../services/authService';
import {
  Body_16M,
  Heading_16B,
  Heading_18SB,
  Heading_20EB_Round,
} from '../../styles/typography';

const InquiryScreen = () => {
  const navigation = useNavigation<any>();
  const showToast = useShowToast();

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

  const isSubmitEnabled = useMemo(() => {
    return content.trim().length >= 10;
  }, [content]);

  const onPressSubmit = () => {
    console.log('[Inquiry] submit', { content, email });
    showToast('전달이 완료되었어요');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <Text style={styles.title}>
            뉴로스 이용 중 불편한 점이나{'\n'}
            궁금한 점이 있다면 말씀해주세요.
          </Text>

          <Text style={styles.sectionLabel}>문의 내용</Text>

          <Input
            placeholder="문의 사항을 입력해주세요"
            value={content}
            onChangeText={setContent}
            variant="outline"
            multiline
            textAlignVertical="top"
            containerStyle={styles.textareaContainer}
            style={styles.textareaInput}
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
            containerStyle={styles.emailContainer}
            style={styles.textareaInput}
          />
        </ScrollView>

        <View style={styles.bottom}>
          <Button
            title="전달하기"
            onPress={onPressSubmit}
            disabled={!isSubmitEnabled}
            variant="primary"
            style={styles.submitButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InquiryScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingBottom: scaleWidth(20),
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
    paddingBottom: scaleWidth(10),
  },
  title: {
    ...Heading_20EB_Round,
    color: COLORS.black,
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
    padding: scaleWidth(18),
    borderRadius: BORDER_RADIUS[16],
    borderColor: COLORS.gray300,
  },
  emailContainer: {
    height: scaleWidth(60),
    borderColor: COLORS.gray300,
  },
  textareaInput: {
    ...Body_16M,
    color: COLORS.gray600,
  },
  sectionLabelWithTop: {
    marginTop: scaleWidth(32),
  },
  bottom: {
    height: scaleWidth(63),
    paddingHorizontal: scaleWidth(20),
    backgroundColor: COLORS.white,
  },
  submitButton: {
    width: '100%',
    borderRadius: scaleWidth(12),
  },
});
