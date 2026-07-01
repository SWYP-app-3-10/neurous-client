/**
 * 퀴즈 화면 (QuizScreen.tsx)
 *
 * 글을 읽은 후 퀴즈를 풀고, 정답 여부에 따라 포인트와 경험치를 획득하는 화면이다.
 *
 * 주요 기능:
 *   1. 퀴즈 문제 및 선택지 표시
 *   2. 정답 제출 및 피드백 표시
 *   3. 포인트 및 경험치 획득
 *   4. 레벨업 정보 저장
 *   5. 난이도 피드백 모달 (하루 1회)
 *   6. 난이도 제안 시스템 (실시간 분석)
 *
 * 화면 상태:
 *   - question: 문제 화면 (선택지 선택 가능)
 *   - feedback: 정답 체크 화면 (정답/오답 표시)
 *
 * 처리 흐름:
 *   1. 퀴즈 화면 진입과 동시에 난이도 평가 팝업 표시 (하루 1회)
 *   2. 난이도 선택 → 피드백 저장 → 즉시 분석 → 조건 충족 시 난이도 제안 팝업
 *   3. 퀴즈 데이터 로드 (fetchQuiz API)
 *   4. 사용자가 선택지 선택
 *   5. "다음" 버튼 클릭 → 완독 체크 API 호출 → submitQuiz API 호출
 *   6. 포인트/경험치 지급 (로컬 상태) → 리워드 팝업 표시
 *   7. 리워드 팝업 "확인" 클릭 → 정답 체크 화면으로 전환
 *   8. "완료" 버튼 클릭 → 원래 화면으로 이동 (mission 또는 search)
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../../styles/global';
import {
  Body_16M,
  Body_16SB,
  Heading_18EB_Round,
  Heading_20EB_Round,
} from '../../styles/typography';
import Header from '../../components/Header';
import Button from '../../components/Button';
import QuizOptionCard from '../../components/QuizOptionCard';
import QuizQuestion from '../../components/QuizQuestion';
import Spacer from '../../components/Spacer';
import { Modal_IMG, CheckIcon, LevelChangeCheckIcon } from '../../icons';
import {
  useShowModal,
  useShowToastModal,
  useHideModal,
} from '../../store/modalStore';
import DifficultySelectionModal, {
  Difficulty,
} from '../../components/DifficultySelectionModal';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ExperienceModalContent } from '../../components/ArticlePointModalContent';
import { usePointStore } from '../../store/pointStore';
import { useExperienceStore } from '../../store/experienceStore';
import {
  useDifficultySubmit,
  checkCanSubmitDifficulty,
} from '../../hooks/useDifficultySubmit';
import { createQuizCompleteNavigation } from '../../utils/quizNavigation';
import { fetchQuiz, QuizResponse, submitQuiz } from '../../api/missionApi';
import { getUserInfo } from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent, logScreenView } from '../../services/analyticsService';
import { FullScreenStackParamList } from '../../navigation/types';
import { RouteNames } from '../../../routes';
import { useDifficultyFeedbackCheck } from '../../hooks/useDifficultyFeedbackCheck';
import { useDifficultySuggestion } from '../../hooks/useDifficultySuggestion';
import { saveDifficultyFeedback } from '../../services/difficultyFeedbackService';
import { useOnboardingStore } from '../../store/onboardingStore';
import { LevelCategory } from '../../types/interests';
import LevelSuggestionModal from '../../components/LevelSuggestionModal';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** 퀴즈 화면의 두 가지 상태 */
type QuizState = 'question' | 'feedback';

/** 퀴즈 선택지 인터페이스 */
interface QuizOption {
  id: number;
  text: string;
}

type NavigationProp = NativeStackNavigationProp<FullScreenStackParamList>;
type QuizRouteProp = RouteProp<
  FullScreenStackParamList,
  typeof RouteNames.QUIZ
>;

const QuizScreen: React.FC = () => {
  const route = useRoute<QuizRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  // ──────────────────────────────────────────────
  // Route Params (타입 안전)
  // ──────────────────────────────────────────────

  /** 퀴즈를 풀 글 ID */
  const articleId = route.params.articleId;

  /** 퀴즈 완료 후 돌아갈 화면 ('mission' | 'search') */
  const returnTo = route.params.returnTo || 'mission';

  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────

  /** API로 조회한 퀴즈 데이터 */
  const [quizData, setQuizData] = useState<QuizResponse | null>(null);

  /** 사용자가 선택한 선택지 ID */
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  /** 현재 화면 상태 (문제 화면 or 정답 체크 화면) */
  const [quizState, setQuizState] = useState<QuizState>('question');

  /** 사용자가 선택한 난이도 (난이도 피드백 모달용) */
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty | null>(null);

  /**
   * 퀴즈 제출 결과 (API 응답)
   * - correctChoiceNo: 정답 선택지 번호
   * - isAnswerCorrect: 사용자가 맞췄는지 여부
   */
  const [quizResult, setQuizResult] = useState<{
    correctChoiceNo: number;
    isAnswerCorrect: boolean;
  } | null>(null);

  // ──────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────

  const showModal = useShowModal();
  const showToastModal = useShowToastModal();
  const hideModal = useHideModal();
  const { addPoints } = usePointStore();
  const { addExperience } = useExperienceStore();
  const { submitDifficultyToServer } = useDifficultySubmit();

  /** 난이도 제안 관련 훅 */
  const { handleAcceptSuggestion, handleDeclineSuggestion } =
    useDifficultySuggestion();

  const { checkAfterFeedback } = useDifficultyFeedbackCheck();

  /** 현재 난이도 가져오기 */
  const currentDifficulty = useOnboardingStore(state => state.difficulty);

  /** 난이도 모달 타이머 (모달 닫기 지연용) */
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 퀴즈 제출 중인지 여부 (버튼 연타로 인한 중복 제출 방지) */
  const isSubmittingQuizRef = useRef(false);

  // ──────────────────────────────────────────────
  // Effect 1: 화면 상태에 따른 analytics 로그
  // ──────────────────────────────────────────────

  /**
   * 정답 체크 화면으로 전환될 때만 로그 기록
   *
   * 'question' 상태는 RootNavigator에서 이미 '퀴즈'로 자동 로그가 기록되므로
   * 여기서는 'feedback' 상태로 변경될 때만 별도 로그를 남긴다.
   */
  useEffect(() => {
    if (quizState === 'feedback') {
      logScreenView('Quiz_Answer', undefined, true);
    }
  }, [quizState]);

  // ──────────────────────────────────────────────
  // Effect 2: 퀴즈 데이터 로드
  // ──────────────────────────────────────────────

  /**
   * 화면 진입 시 퀴즈 데이터를 API로 조회한다.
   *
   * 처리 흐름:
   *   1. articleId 유효성 검사
   *   2. getUserInfo()로 현재 사용자 정보 조회
   *   3. fetchQuiz() API 호출
   *   4. 응답 데이터를 quizData 상태에 저장
   *
   * 에러 처리:
   *   - articleId 없음: 조기 리턴
   *   - 사용자 정보 없음: 조기 리턴
   *   - API 실패: 콘솔 에러 로그만 남김 (UI에는 영향 없음)
   */
  useEffect(() => {
    const loadQuiz = async () => {
      if (!articleId) {
        return;
      }

      try {
        const userInfo = await getUserInfo();
        if (!userInfo || !userInfo.userId) {
          return;
        }

        const response = await fetchQuiz(userInfo.userId, articleId);
        console.log('[퀴즈 조회 API] 요청:', {
          userId: userInfo.userId,
          articleId,
        });
        console.log('[퀴즈 조회 API] 응답:', JSON.stringify(response, null, 2));

        if (response.data) {
          console.log('[퀴즈 조회 API] 데이터:', {
            quizId: response.data.quizId,
            quizContent: response.data.quizContent,
            choicesCount: response.data.choices?.length,
            choices: response.data.choices,
          });
          setQuizData(response.data);
        }
      } catch (err: any) {
        console.error('[퀴즈] 로드 실패:', err);
      }
    };

    loadQuiz();
  }, [articleId]);

  // ──────────────────────────────────────────────
  // Effect 3: articleId 변경 시 제출 관련 상태 초기화
  // ──────────────────────────────────────────────

  /**
   * articleId가 변경되면 퀴즈 제출 관련 상태를 초기화한다.
   *
   * 이유:
   *   - 같은 QuizScreen에서 다른 글의 퀴즈를 풀 수 있음
   *   - 글마다 제출 처리는 독립적으로 실행되어야 함
   *
   * 리셋 항목:
   *   - 퀴즈 제출 진행 여부
   */
  useEffect(() => {
    isSubmittingQuizRef.current = false;
  }, [articleId]);

  // ──────────────────────────────────────────────
  // Effect 4: 화면 진입 시 난이도 피드백 모달 표시
  // ──────────────────────────────────────────────

  /**
   * 퀴즈 화면 진입과 동시에 난이도 평가 팝업을 표시한다.
   *
   * 처리 흐름:
   *   1. checkCanSubmitDifficulty()로 오늘 이미 난이도를 제출했는지 확인
   *   2. 이미 제출했으면 모달 표시 없이 종료
   *   3. 제출하지 않았으면 난이도 선택 모달 표시
   *   4. 사용자가 난이도 선택 시:
   *      - saveDifficultyFeedback() 피드백 저장
   *      - checkAfterFeedback() 즉시 분석
   *      - 조건 충족 시 난이도 제안 팝업 (LevelSuggestionModal)
   *      - submitDifficultyToServer() API 호출
   *      - 0.2초 후 모달 닫기
   *
   * 변경 사유:
   *   - 기존: 퀴즈 완료 후 "완료" 버튼 클릭 시 표시
   *   - 변경: 퀴즈 화면 진입과 동시에 표시 (기획 변경)
   */
  useEffect(() => {
    const showDifficultyModalOnEnter = async () => {
      // 하루 한 번만 표시
      const canSubmit = await checkCanSubmitDifficulty();
      if (!canSubmit) {
        return;
      }

      logEvent('Complete_Quiz_Answer');

      showModal({
        title: '이번 글의 난이도는\n 어떠셨나요?',
        titleStyle: {
          ...Heading_18EB_Round,
        },
        description: '글의 난이도에 반영해드려요!',
        descriptionColor: COLORS.gray600,
        titleDescriptionGapSize: scaleWidth(8),
        closeOnBackdropPress: false,
        children: (
          <DifficultySelectionModal
            initialDifficulty={selectedDifficulty}
            onSelect={async difficulty => {
              setSelectedDifficulty(difficulty);

              // Step 1: 피드백 저장
              let feedbackType: 'easy' | 'normal' | 'hard';
              if (difficulty === 'easy') {
                feedbackType = 'easy';
              } else if (difficulty === 'normal') {
                feedbackType = 'normal';
              } else {
                feedbackType = 'hard';
              }

              // AsyncStorage에 피드백 저장 (최근 20개 유지)
              await saveDifficultyFeedback(
                articleId,
                currentDifficulty || LevelCategory.BEGINNER,
                feedbackType,
              );

              // Step 2: 즉시 분석 실행
              const analysis = await checkAfterFeedback();

              // Step 3: 제안 조건 충족 시 제안 팝업 표시
              if (
                analysis &&
                analysis.shouldSuggest &&
                analysis.suggestedLevel
              ) {
                logEvent('Show_Level_Suggestion_Modal');
                const suggestedLevel = analysis.suggestedLevel;

                // 기존 난이도 선택 모달 닫기
                hideModal();

                // 0.3초 후 제안 모달 표시 (모달 충돌 방지)
                setTimeout(() => {
                  const suggestionTitle =
                    analysis.reason === 'easy'
                      ? '조금 더 어려운 글도 읽어볼까요?'
                      : '조금 더 편하게 읽어볼까요?';

                  showModal({
                    title: suggestionTitle,
                    titleStyle: {
                      ...Heading_18EB_Round,
                    },
                    titleDescriptionGapSize: scaleWidth(16),
                    closeOnBackdropPress: true,
                    children: React.createElement(LevelSuggestionModal, {
                      suggestedLevel,
                      reason: analysis.reason as 'easy' | 'hard',
                      stats: analysis.stats,

                      onAccept: async () => {
                        logEvent('Accept_Level_Suggestion');
                        await handleAcceptSuggestion(suggestedLevel);
                        hideModal();
                        showToastModal({
                          message: '난이도 설정이 완료되었어요',
                          icon: <LevelChangeCheckIcon />,
                          position: 'bottom',
                          marginHorizontal: scaleWidth(20),
                          paddingHorizontal: scaleWidth(20),
                          paddingVertical: scaleWidth(14),
                          borderRadius: BORDER_RADIUS[99],
                          duration: 2000,
                        });
                      },

                      onDecline: async () => {
                        logEvent('Decline_Level_Suggestion');
                        await handleDeclineSuggestion();
                        hideModal();
                      },
                    }),
                    primaryButton: undefined,
                  });
                }, 300);

                return;
              }

              // Step 4: 서버로 난이도 전송 후 모달 닫기
              await submitDifficultyToServer(articleId, difficulty);

              // 0.2초 지연: 사용자가 선택한 것을 시각적으로 확인할 수 있도록
              setTimeout(() => {
                hideModal();
              }, 200);
            }}
          />
        ),
      });
    };

    showDifficultyModalOnEnter();
    // 진입 시 1회만 실행 (articleId는 Effect 3에서 변경 시 초기화되므로 의존성에서 제외)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──────────────────────────────────────────────
  // 핸들러: 선택지 선택
  // ──────────────────────────────────────────────

  /**
   * 사용자가 선택지를 클릭했을 때 호출된다.
   *
   * 문제 화면(question)에서만 선택 가능하며,
   * 정답 체크 화면(feedback)에서는 선택 불가능하다.
   *
   * @param optionId 선택한 선택지 ID
   */
  const handleOptionSelect = (optionId: number) => {
    if (quizState === 'question') {
      setSelectedOptionId(optionId);
    }
  };

  // ──────────────────────────────────────────────
  // 핸들러: "다음" 버튼 클릭 (퀴즈 제출)
  // ──────────────────────────────────────────────

  /**
   * "다음" 버튼 클릭 시 퀴즈를 제출하고 결과를 처리한다.
   *
   * 처리 흐름:
   *   1. 선택지 유효성 검사
   *   2. 버튼 연타로 인한 중복 제출 방지
   *   3. 현재 사용자 정보 조회
   *   4. 퀴즈 제출 시점에 완독 체크 API 호출
   *   5. submitQuiz API 호출
   *   6. 포인트 및 경험치 추가 (로컬 상태)
   *   7. 레벨업 정보 AsyncStorage에 저장 (MissionScreen에서 감지)
   *   8. 리워드 팝업 표시
   *   9. 리워드 팝업 "확인" 클릭 → 정답 체크 화면으로 전환
   *
   * 변경된 보상 처리 방식:
   *   - ArticleDetailScreen에서는 퀴즈 화면 이동만 처리
   *   - QuizScreen에서 퀴즈 제출 API가 성공했을 때 포인트/경험치를 지급
   *
   * 에러 처리:
   *   - 완독 체크 API 호출에 실패해도 퀴즈 제출은 계속 진행
   *   - 퀴즈 제출 API가 실패하면 보상 지급 및 정답 체크 화면 전환을 하지 않음
   */
  const handleNext = async () => {
    console.log('[QuizScreen] 퀴즈 제출 버튼 클릭');
    if (!selectedOptionId || !quiz || !quizData) {
      return;
    }

    if (isSubmittingQuizRef.current) {
      return;
    }

    isSubmittingQuizRef.current = true;

    try {
      const userInfo = await getUserInfo();
      if (!userInfo || !userInfo.userId) {
        console.error('[퀴즈] 사용자 정보 없음');
        isSubmittingQuizRef.current = false;
        return;
      }

      // 선택한 선택지의 choiceNo 찾기
      const selectedChoice = quizData.choices.find(
        choice => choice.quizChoiceId === selectedOptionId,
      );
      if (!selectedChoice) {
        console.error('[퀴즈] 선택한 선택지를 찾을 수 없습니다.');
        isSubmittingQuizRef.current = false;
        return;
      }

      // ──────────────────────────────────────────────
      // 퀴즈 제출 API 호출
      // ──────────────────────────────────────────────

      const submitRequest = {
        quizId: quiz.id,
        selectedNo: selectedChoice.choiceNo,
        readContentId: articleId,
      };
      logEvent('Next_Quiz');

      const response = await submitQuiz(userInfo.userId, submitRequest);
      console.log('[퀴즈 제출 API] 응답:', JSON.stringify(response, null, 2));

      const { quizResultResponse, rewardResponse, userLevelInformation } =
        response.data;

      console.log('[퀴즈 제출 API] 데이터:', {
        isAnswerCorrect: quizResultResponse?.isAnswerCorrect,
        correctChoiceNo: quizResultResponse?.correctChoiceNo,
        earnedPoint: rewardResponse?.earnedPoint,
        earnedExp: rewardResponse?.earnedExp,
        userLevelInformation,
      });

      // 퀴즈 결과 저장 (정답 체크 화면에서 정답 판단용)
      if (quizResultResponse) {
        setQuizResult({
          correctChoiceNo: quizResultResponse.correctChoiceNo,
          isAnswerCorrect: quizResultResponse.isAnswerCorrect,
        });
      }

      // ──────────────────────────────────────────────
      // Step 3: 퀴즈 제출 성공 시 포인트 및 경험치 지급
      // ──────────────────────────────────────────────

      /**
       * submitQuiz API 응답으로 받은 보상을 로컬 상태에 반영한다.
       *
       * 주의:
       *   - 경험치는 ArticleDetailScreen에서 지급하지 않는다.
       *   - 퀴즈 제출 API가 성공했을 때만 지급한다.
       */
      if (rewardResponse) {
        addPoints(rewardResponse.earnedPoint);
        addExperience(rewardResponse.earnedExp);
      }

      // 레벨업 정보가 있으면 AsyncStorage에 저장
      // MissionScreen에서 이 정보를 감지하여 레벨업 모달 표시
      if (userLevelInformation) {
        await AsyncStorage.setItem(
          '@pending_level_up',
          JSON.stringify(userLevelInformation),
        );
      }

      // ──────────────────────────────────────────────
      // Step 4: 리워드 팝업 표시
      // ──────────────────────────────────────────────

      // 포인트 & 경험치 획득 모달 표시
      // "확인" 클릭 시 정답 체크 화면으로 전환
      showModal({
        title: '포인트 & 경험치 획득!',
        image: <Modal_IMG />,
        titleStyle: {
          ...Heading_20EB_Round,
        },
        titleDescriptionGapSize: scaleWidth(20),
        children: React.createElement(ExperienceModalContent, {
          point: true,
          correct: quizResultResponse.isAnswerCorrect,
        }),
        primaryButton: {
          title: '확인',
          onPress: () => {
            // 모달 닫기 (hideModal은 모달 컴포넌트에서 처리)
          },
        },
      });

      // 정답 체크 화면으로 전환
      setQuizState('feedback');
    } catch (error: any) {
      console.error('[퀴즈] 제출 실패:', error);
      isSubmittingQuizRef.current = false;
    }
  };

  // ──────────────────────────────────────────────
  // 핸들러: "완료" 버튼 클릭
  // ──────────────────────────────────────────────

  /**
   * "완료" 버튼 클릭 시 원래 화면으로 이동한다.
   *
   * 난이도 피드백 모달은 퀴즈 화면 진입 시점(Effect 4)에서 처리하므로
   * 완료 버튼에서는 화면 이동만 수행한다.
   */
  const handleComplete = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    navigation.dispatch(createQuizCompleteNavigation(returnTo));
  };

  // ──────────────────────────────────────────────
  // 유틸리티 함수
  // ──────────────────────────────────────────────

  /**
   * 문자열 끝의 마침표를 제거한다.
   *
   * API에서 받은 퀴즈 문제와 선택지에 마침표가 포함되어 있을 수 있는데,
   * UI에서는 마침표 없이 표시하기 위해 제거한다.
   *
   * @param text 원본 문자열
   * @returns 마침표가 제거된 문자열
   */
  const removeTrailingPeriod = (text: string | undefined): string => {
    if (!text) {
      return '';
    }
    return text.endsWith('.') ? text.slice(0, -1) : text;
  };

  // ──────────────────────────────────────────────
  // API 응답을 UI용 Quiz 구조로 변환
  // ──────────────────────────────────────────────

  /**
   * API 응답(QuizResponse)을 UI 렌더링용 Quiz 객체로 변환한다.
   *
   * 변환 내용:
   *   - quizId → id
   *   - quizContent → question (마침표 제거)
   *   - choices → options (마침표 제거)
   *   - correct 필드를 찾아 correctAnswerId 설정
   *
   * 이렇게 변환하는 이유:
   *   - 기존 코드에서 사용하던 Quiz 인터페이스와 호환성 유지
   *   - 컴포넌트 렌더링 로직을 단순화
   */
  const quiz = quizData
    ? {
        id: quizData.quizId,
        question: removeTrailingPeriod(quizData.quizContent),
        options: quizData.choices.map(choice => ({
          id: choice.quizChoiceId,
          text: removeTrailingPeriod(choice.choiceText),
        })),
        correctAnswerId:
          quizData.choices.find(choice => choice.correct)?.quizChoiceId || 0,
      }
    : null;

  // ──────────────────────────────────────────────
  // 정답 판단 함수
  // ──────────────────────────────────────────────

  /**
   * 특정 선택지가 정답인지 판단한다.
   *
   * 판단 로직:
   *   - 문제 화면(question): 초기 데이터의 correct 필드 사용
   *   - 정답 체크 화면(feedback): API 응답의 correctChoiceNo 사용
   *
   * 정답 체크 화면에서 API 응답을 사용하는 이유:
   *   - 서버에서 실제로 정답으로 판정한 선택지를 표시하기 위함
   *   - 초기 데이터와 서버 판정이 다를 수 있음 (드물지만 발생 가능)
   *
   * @param optionId 확인할 선택지 ID
   * @returns 정답 여부
   */
  const isCorrect = (optionId: number) => {
    if (!quiz || !quizData) {
      return false;
    }

    // 정답 체크 화면: API 응답의 correctChoiceNo 사용
    if (quizState === 'feedback' && quizResult) {
      const option = quizData.choices.find(
        choice => choice.quizChoiceId === optionId,
      );
      return option?.choiceNo === quizResult.correctChoiceNo;
    }

    // 문제 화면: 초기 데이터의 correct 필드 사용
    return optionId === quiz.correctAnswerId;
  };

  // ──────────────────────────────────────────────
  // 선택지 렌더링 함수
  // ──────────────────────────────────────────────

  /**
   * 퀴즈 선택지를 렌더링한다.
   *
   * 화면 상태에 따라 다른 스타일 적용:
   *   - question (문제 화면):
   *     - 선택 여부에 따라 스타일 변경
   *     - 체크 아이콘 표시 (선택됨 / 선택 안 됨)
   *     - 클릭 가능
   *
   *   - feedback (정답 체크 화면):
   *     - 정답/오답에 따라 스타일 변경
   *     - QuizOptionCard 컴포넌트 사용 (정답 표시 아이콘 포함)
   *     - 클릭 불가능
   *
   * analytics 이벤트:
   *   - 첫 번째 선택지 클릭: 'Choice1_Quiz'
   *   - 두 번째 선택지 클릭: 'Choice2_Quiz'
   *   - 세 번째 선택지 클릭: 'Choice3_Quiz'
   *
   * @param option 선택지 객체
   * @param index 선택지 순서 (0부터 시작)
   * @returns 렌더링된 선택지 컴포넌트
   */
  const renderOption = (option: QuizOption, index: number) => {
    if (quizState === 'question') {
      // 문제 화면: 선택 여부에 따라 스타일 변경
      const isSelected = selectedOptionId === option.id;

      return (
        <Pressable
          key={option.id}
          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
          onPress={() => {
            // analytics 이벤트 로그
            if (index === 0) {
              logEvent('Choice1_Quiz');
            } else if (index === 1) {
              logEvent('Choice2_Quiz');
            } else if (index === 2) {
              logEvent('Choice3_Quiz');
            }
            handleOptionSelect(option.id);
          }}
        >
          <Text style={styles.optionText}>{option.text}</Text>
          <View style={[styles.checkIcon]}>
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
          </View>
        </Pressable>
      );
    } else {
      // 정답 체크 화면: 정답/오답에 따라 스타일 변경
      const correct = isCorrect(option.id);
      return (
        <QuizOptionCard key={option.id} option={option} isCorrect={correct} />
      );
    }
  };

  // ──────────────────────────────────────────────
  // UI 렌더링
  // ──────────────────────────────────────────────

  // 퀴즈 데이터가 없으면 아무것도 렌더링하지 않음
  if (!quiz) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        iconColor={COLORS.gray800}
        backEventName="Back_ConfirmStandard_Quiz"
      />
      <Spacer num={32} />
      <ScrollView
        bounces={false}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Q 아이콘과 문제 */}
        <QuizQuestion question={quiz.question} />

        <Spacer num={40} />

        {/* 선택지 */}
        {quiz.options.map((option, index) => {
          return (
            <View key={option.id}>
              {renderOption(option, index)}
              {/* 마지막 선택지가 아니면 간격 추가 */}
              {index !== quiz.options.length - 1 && <Spacer num={16} />}
            </View>
          );
        })}

        <Spacer num={48} />
      </ScrollView>

      {/* 하단 버튼 */}
      <Button
        title={quizState === 'question' ? '다음' : '완료'}
        onPress={quizState === 'question' ? handleNext : handleComplete}
        variant="primary"
        style={styles.actionButton}
        // 문제 화면에서 선택지를 선택하지 않으면 버튼 비활성화
        disabled={quizState === 'question' && !selectedOptionId}
      />
    </SafeAreaView>
  );
};

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
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    borderColor: 'transparent', // 기본적으로 투명한 border로 크기 유지
  },
  optionCardSelected: {
    borderColor: COLORS.puple.main,
    backgroundColor: COLORS.puple[3],
  },
  optionCardCorrect: {
    borderColor: COLORS.blue.main,
    backgroundColor: COLORS.blue[3],
    borderWidth: 1,
  },
  optionCardIncorrect: {
    borderColor: COLORS.red.main,
    backgroundColor: COLORS.red[3],
  },
  checkIconContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.gray300,
  },
  correctIconContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.blue.main,
  },
  incorrectIconContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.red.main,
  },
  optionText: {
    ...Body_16M,
    color: COLORS.black,
    flex: 1,
  },
  checkIcon: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    borderRadius: BORDER_RADIUS[99],
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackIcon: {
    width: scaleWidth(24),
    height: scaleWidth(24),
    borderRadius: scaleWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackIconCorrect: {
    backgroundColor: 'blue',
  },
  feedbackIconIncorrect: {
    backgroundColor: 'red',
  },
  circleIcon: {
    width: scaleWidth(12),
    height: scaleWidth(12),
    borderRadius: scaleWidth(6),
    backgroundColor: COLORS.white,
  },
  xIconText: {
    color: COLORS.white,
    fontSize: scaleWidth(16),
    fontWeight: 'bold',
  },
  buttonContainer: {
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleWidth(20),
    paddingTop: scaleWidth(16),
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  actionButton: {
    marginHorizontal: scaleWidth(20),
  },
  difficultyOptionsContainer: {
    width: '100%',
  },
  difficultyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: scaleWidth(68),
    paddingHorizontal: scaleWidth(32),
    borderRadius: BORDER_RADIUS[16],
    backgroundColor: COLORS.gray100,
  },
  difficultyOptionSelected: {
    borderColor: COLORS.puple.main,
    backgroundColor: COLORS.puple[3],
    borderWidth: 1,
  },
  difficultyOptionText: {
    ...Body_16SB,
    color: COLORS.black,
  },
  difficultyCheckContainer: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS[99],
  },
});

export default QuizScreen;
