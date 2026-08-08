/**
 * 목(mock) 퀴즈 화면 (MockQuizScreen.tsx)
 *
 * [내부 테스트 전용] 스토어 등록용 스크린샷을 찍기 위해 만든 화면이다.
 *
 * 실제 QuizScreen과 시각적으로 동일하게 구성했지만,
 * 다음 사항이 실제 화면과 다르다.
 *   - 서버 API를 호출하지 않는다 (퀴즈 내용은 mockArticleQuiz.ts에 고정된 값 사용)
 *   - 포인트/경험치 지급, 난이도 피드백 모달, 레벨업 처리 등 어떤 실제 로직도 없다
 *   - 정답 여부 판단은 로컬 mock 데이터의 correct 값만으로 처리한다
 *
 * 실제 QuizScreen(src/screens/common/QuizScreen.tsx)은
 * 이 화면과 무관하게 그대로 유지된다.
 *
 * 화면 상태:
 *   - question : 문제 화면 (선택지 선택 가능)
 *   - feedback : 정답 체크 화면 (정답/오답 표시, 스크린샷용 최종 상태)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import { Body_16M } from '../../styles/typography';
import Header from '../../components/Header';
import Button from '../../components/Button';
import QuizOptionCard from '../../components/QuizOptionCard';
import QuizQuestion from '../../components/QuizQuestion';
import Spacer from '../../components/Spacer';
import { CheckIcon } from '../../icons';
import { FullScreenStackParamList } from '../../navigation/types';
import { MOCK_ARTICLE_QUIZ } from '../../data/mock/mockArticleQuiz';

type QuizState = 'question' | 'feedback';
type NavigationProp = NativeStackNavigationProp<FullScreenStackParamList>;

const MockQuizScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  /** 사용자가 선택한 선택지 ID */
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  /** 현재 화면 상태 (문제 화면 or 정답 체크 화면) */
  const [quizState, setQuizState] = useState<QuizState>('question');

  const { question, options } = MOCK_ARTICLE_QUIZ.quiz;

  /** 문제 화면에서 선택지를 누르면 선택 상태만 갱신 (서버 통신 없음) */
  const handleOptionSelect = (optionId: number) => {
    if (quizState === 'question') {
      setSelectedOptionId(optionId);
    }
  };

  /** "다음" 버튼: 정답 체크 화면으로 전환 (mock 데이터의 correct 값으로 즉시 판정) */
  const handleNext = () => {
    if (!selectedOptionId) {
      return;
    }
    setQuizState('feedback');
  };

  /** "완료" 버튼: 보상 팝업 없이 바로 이전 화면(mock 아티클)으로 복귀 */
  const handleComplete = () => {
    navigation.goBack();
  };

  const renderOption = (option: {
    id: number;
    text: string;
    correct: boolean;
  }) => {
    if (quizState === 'question') {
      const isSelected = selectedOptionId === option.id;

      return (
        <Pressable
          key={option.id}
          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
          onPress={() => handleOptionSelect(option.id)}
        >
          <Text style={styles.optionText}>{option.text}</Text>
          <View
            style={[
              styles.checkIconContainer,
              {
                backgroundColor: isSelected
                  ? COLORS.puple.main
                  : COLORS.gray300,
              },
            ]}
          >
            <CheckIcon color={isSelected ? COLORS.white : COLORS.gray100} />
          </View>
        </Pressable>
      );
    }

    // 정답 체크 화면: mock 데이터의 correct 값으로 정답/오답 스타일 적용
    return (
      <QuizOptionCard
        key={option.id}
        option={option}
        isCorrect={option.correct}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header iconColor={COLORS.gray800} />
      <Spacer num={32} />

      {/*
        실제 QuizScreen과 동일하게 ScrollView로 감싼다.
        (작은 화면에서 문제 + 선택지 3개가 화면 높이를 넘길 경우
        플레인 View만 쓰면 넘치는 내용이 그대로 잘려 보일 수 있어
        스크롤 가능한 구조로 맞춤)
      */}
      <ScrollView
        bounces={false}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Q 아이콘과 문제 */}
        <QuizQuestion question={question} />

        <Spacer num={40} />

        {/* 선택지 3개 */}
        {options.map((option, index) => (
          <View key={option.id}>
            {renderOption(option)}
            {index !== options.length - 1 && <Spacer num={16} />}
          </View>
        ))}

        <Spacer num={48} />
      </ScrollView>

      {/* 하단 버튼 */}
      <Button
        title={quizState === 'question' ? '다음' : '완료'}
        onPress={quizState === 'question' ? handleNext : handleComplete}
        variant="primary"
        style={styles.actionButton}
        disabled={quizState === 'question' && !selectedOptionId}
      />
    </SafeAreaView>
  );
};

// 스타일은 QuizScreen.tsx와 동일하게 맞춤
// (실제 화면과 시각적으로 동일해야 스크린샷 용도로 의미가 있으므로)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(20),
    paddingBottom: scaleWidth(100),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scaleWidth(20),
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleWidth(20),
    borderRadius: BORDER_RADIUS[16],
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: COLORS.puple.main,
    backgroundColor: COLORS.puple[3],
  },
  optionText: {
    ...Body_16M,
    color: COLORS.black,
    flex: 1,
  },
  checkIconContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.gray300,
  },
  actionButton: {
    marginHorizontal: scaleWidth(20),
  },
});

export default MockQuizScreen;
