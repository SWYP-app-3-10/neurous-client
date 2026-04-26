/**
 * 퀴즈 섹션 스크롤 감지 및 제어 커스텀 훅
 *
 * 아티클 읽기 화면에서 유저가 스크롤해 퀴즈 섹션에 도달했는지 감지하고,
 * "퀴즈 보기 / 글 보기" 버튼과 연동해 화면 간 이동을 제어함.
 *
 * [showQuiz 상태 전환 조건]
 * - false → true: 스크롤이 퀴즈 섹션 시작 지점에 도달했을 때
 * - true → false: 스크롤이 임계값보다 충분히 위로 올라갔을 때
 *                 (히스테리시스 적용 — 경계선 근처에서 상태가 빠르게 토글되는 현상 방지)
 *
 * [measureLayout 우선순위]
 * 1순위: measureLayout으로 퀴즈 섹션의 실제 y 좌표 측정
 * 2순위: measureLayout 실패 시 contentHeight 비율 기반 fallback 사용
 */

import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

/**
 * useScrollToQuiz 훅 입력 옵션
 *
 * @property scrollViewRef  스크롤 이벤트를 감지할 ScrollView ref
 * @property quizSectionRef 퀴즈 섹션 컨테이너 View ref (위치 측정에 사용)
 */
interface UseScrollToQuizOptions {
  scrollViewRef: React.RefObject<ScrollView | null>;
  quizSectionRef: React.RefObject<View | null>;
}

/**
 * useScrollToQuiz 훅 반환값
 *
 * @property showQuiz     현재 퀴즈 섹션이 화면에 보이는 상태인지 여부
 * @property handleScroll ScrollView의 onScroll 이벤트에 연결할 핸들러
 * @property scrollToQuiz 퀴즈 섹션 위치로 자동 스크롤하는 함수
 * @property scrollToTop  글 최상단으로 자동 스크롤하는 함수
 */
interface UseScrollToQuizReturn {
  showQuiz: boolean;
  handleScroll: (event: any) => void;
  scrollToQuiz: () => void;
  scrollToTop: () => void;
}

/**
 * 히스테리시스 오프셋 비율
 *
 * showQuiz가 true가 되는 하강 임계값과 false가 되는 상승 임계값 사이의 간격.
 * scrollViewHeight의 20%를 버퍼로 두어, 경계 근처에서 상태가
 * 빠르게 true/false를 오가는 플리커링 현상을 방지함.
 */
const HYSTERESIS_OFFSET_RATIO = 0.2;

/**
 * measureLayout 실패 시 사용하는 fallback 하강 임계값
 * contentHeight의 80% 지점을 퀴즈 도달 기준으로 사용
 */
const FALLBACK_THRESHOLD_DOWN = 0.8;

/**
 * measureLayout 실패 시 사용하는 fallback 상승 임계값
 * contentHeight의 70% 지점 이하로 올라오면 showQuiz를 false로 전환
 */
const FALLBACK_THRESHOLD_UP = 0.7;

/**
 * scrollToQuiz / scrollToEnd 호출 전 딜레이 (ms)
 *
 * 레이아웃 측정 완료 후 즉시 스크롤하면 위치가 부정확할 수 있어
 * 짧은 딜레이를 두어 레이아웃이 안정된 뒤 스크롤하도록 함.
 */
const SCROLL_TO_END_DELAY = 100;

export const useScrollToQuiz = ({
  scrollViewRef,
  quizSectionRef,
}: UseScrollToQuizOptions): UseScrollToQuizReturn => {
  const [showQuiz, setShowQuiz] = useState(false);

  /**
   * showQuiz의 이전 상태를 추적하는 ref
   *
   * state로 관리하면 클로저 문제로 handleScroll 내부에서 최신 값을 읽지 못할 수 있어
   * ref를 병행 사용함. 불필요한 setState 호출도 방지함.
   */
  const lastShowQuizStateRef = useRef(false);

  /**
   * 스크롤 이벤트 핸들러
   *
   * ScrollView의 onScroll에 연결해 사용.
   * 퀴즈 섹션의 실제 y 좌표를 measureLayout으로 측정하고,
   * 현재 스크롤 위치와 비교해 showQuiz 상태를 업데이트함.
   *
   * [임계값 계산]
   * - thresholdDown: 퀴즈 섹션이 화면에 진입하는 순간의 scrollY
   *                  = quizSectionStart - scrollViewHeight
   * - thresholdUp:   showQuiz를 false로 되돌리는 scrollY
   *                  = thresholdDown - (scrollViewHeight * HYSTERESIS_OFFSET_RATIO)
   */
  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const scrollY = contentOffset.y;
      const scrollViewHeight = layoutMeasurement.height;

      quizSectionRef.current?.measureLayout(
        scrollViewRef.current as any,
        (_x, y, _width, _height) => {
          const quizSectionStart = y;
          const thresholdDown = quizSectionStart - scrollViewHeight;
          const hysteresisOffset = scrollViewHeight * HYSTERESIS_OFFSET_RATIO;
          const thresholdUp = thresholdDown - hysteresisOffset;

          // 퀴즈 섹션이 화면 하단에 진입한 경우 → showQuiz true
          if (scrollY + scrollViewHeight >= quizSectionStart) {
            if (!lastShowQuizStateRef.current) {
              setShowQuiz(true);
              lastShowQuizStateRef.current = true;
            }
          }
          // 히스테리시스 임계값 위로 충분히 올라간 경우 → showQuiz false
          else if (scrollY < thresholdUp) {
            if (lastShowQuizStateRef.current) {
              setShowQuiz(false);
              lastShowQuizStateRef.current = false;
            }
          }
        },
        // measureLayout 실패 시 fallback: contentHeight 비율 기반으로 판단
        () => {
          const { contentSize } = event.nativeEvent;
          const scrollableHeight = contentSize.height - scrollViewHeight;
          const threshold80Percent = scrollableHeight * FALLBACK_THRESHOLD_DOWN;

          if (scrollY >= threshold80Percent) {
            if (!lastShowQuizStateRef.current) {
              setShowQuiz(true);
              lastShowQuizStateRef.current = true;
            }
          } else if (scrollY < scrollableHeight * FALLBACK_THRESHOLD_UP) {
            if (lastShowQuizStateRef.current) {
              setShowQuiz(false);
              lastShowQuizStateRef.current = false;
            }
          }
        },
      );
    },
    [scrollViewRef, quizSectionRef],
  );

  /**
   * 퀴즈 섹션으로 스크롤
   *
   * measureLayout으로 퀴즈 섹션의 y 좌표를 측정해 해당 위치로 스크롤함.
   * 측정 실패 시 scrollToEnd로 fallback.
   * SCROLL_TO_END_DELAY 만큼 지연 후 실행해 레이아웃 안정성 확보.
   */
  const scrollToQuiz = useCallback(() => {
    if (!quizSectionRef.current || !scrollViewRef.current) {
      return;
    }

    quizSectionRef.current.measureLayout(
      scrollViewRef.current as any,
      (_x, y, _width, _height) => {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: y,
            animated: true,
          });
        }, SCROLL_TO_END_DELAY);
      },
      // measureLayout 실패 시 fallback: 화면 끝으로 스크롤
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, SCROLL_TO_END_DELAY);
      },
    );
  }, [scrollViewRef, quizSectionRef]);

  /**
   * 글 최상단으로 스크롤
   *
   * "글 보기" 버튼 클릭 시 호출됨.
   */
  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollViewRef]);

  return {
    showQuiz,
    handleScroll,
    scrollToQuiz,
    scrollToTop,
  };
};
