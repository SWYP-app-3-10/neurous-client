/**
 * 보상 모달 (RewardModal.tsx)
 *
 * 글 읽기 경험치 획득, 퀴즈 완료/레벨업 등 보상 지급 시 공통으로 쓰는 2단 카드형 모달.
 * 카드 상단(연보라 배경)엔 상황별 안내 문구, 하단(흰 배경)엔 리워드 칩과 액션 버튼이 들어간다.
 * 모달 종류별로 내용이 달라서 topContent/bottomTopContent를 외부에서 조립해 넘기는 방식으로 만들었다.
 */
import React, { ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { COLORS, scaleWidth, BORDER_RADIUS } from '../styles/global';
import { Body_16SB, Caption_14R } from '../styles/typography';
import Button from './Button';
import Spacer from './Spacer';

export interface RewardChip {
  /** 칩에 표시할 라벨 (예: "글 읽기") */
  label: string;
  /** 실제로 지급된 값만 넘긴다 — 지급되지 않은 항목은 배열에 아예 포함하지 않는다 */
  value: number;
}

export interface RewardModalProps {
  visible: boolean;
  onClose?: () => void;
  closeOnBackdropPress?: boolean;

  /** 카드 위로 떠 있는 캐릭터/트로피 이미지 */
  image: ReactNode;
  imageSize?: { width: number; height: number };
  imageTopOffset?: number;

  /** 상단 연보라 블록 안에 들어갈 콘텐츠 (모달 종류별로 다르게 조립해서 전달) */
  topContent: ReactNode;
  /** 하단 흰 블록에서 리워드 칩 "위"에 들어가는 선택적 콘텐츠 (레벨업 모달의 "+25 XP" 등) */
  bottomTopContent?: ReactNode;
  /** 실제 지급된 보상만 담은 리워드 칩 목록 */
  rewards: RewardChip[];

  onNextArticle: () => void;
  /** 넘기지 않으면 "퀴즈 풀고 더 얻기" 버튼 자체를 표시하지 않는다 (레벨업 모달용) */
  onMoreQuiz?: () => void;
  onDismiss: () => void;
}

const RewardModal: React.FC<RewardModalProps> = ({
  visible,
  onClose,
  closeOnBackdropPress = false,
  image,
  imageSize = { width: scaleWidth(80), height: scaleWidth(80) },
  imageTopOffset = scaleWidth(-81),
  topContent,
  bottomTopContent,
  rewards,
  onNextArticle,
  onMoreQuiz,
  onDismiss,
}) => {
  const handleOverlayPress = () => {
    // closeOnBackdropPress가 false면 배경 클릭해도 닫지 않음
    if (closeOnBackdropPress) {
      onClose?.();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeOnBackdropPress ? onClose : undefined}
    >
      <Pressable style={styles.overlay} onPress={handleOverlayPress}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.wrapper}>
            {/* 카드 위로 떠 있는 캐릭터/트로피 이미지 */}
            <View
              style={[
                styles.imageContainer,
                imageSize,
                { top: imageTopOffset },
              ]}
            >
              {image}
            </View>

            <View style={styles.card}>
              {/* 상단 연보라 블록 */}
              <View style={styles.topBlock}>{topContent}</View>

              {/* 하단 흰 블록: (선택) 상단 텍스트 + 리워드 칩 + 액션 버튼 */}
              <View style={styles.bottomBlock}>
                {bottomTopContent && (
                  <>
                    {bottomTopContent}
                    <Spacer num={4} />
                  </>
                )}

                <View style={styles.chipRow}>
                  {rewards.map(reward => (
                    <View key={reward.label} style={styles.chip}>
                      <Text style={styles.chipText}>
                        {reward.label} +{reward.value}
                      </Text>
                    </View>
                  ))}
                </View>

                <Spacer num={20} />

                <View style={styles.buttonGroup}>
                  <Button
                    variant="primary"
                    title="다음 글 보기"
                    onPress={onNextArticle}
                    style={styles.actionButton}
                  />

                  {onMoreQuiz && (
                    <>
                      <Spacer num={14} />
                      <Button
                        variant="outline"
                        title="퀴즈 풀고 더 얻기"
                        onPress={onMoreQuiz}
                        style={[styles.actionButton, styles.moreQuizButton]}
                        textStyle={styles.moreQuizButtonText}
                      />
                    </>
                  )}

                  <Spacer num={14} />

                  <Button
                    variant="ghost"
                    title="지금은 괜찮아요"
                    onPress={onDismiss}
                    style={styles.dismissButton}
                    textStyle={styles.dismissButtonText}
                  />
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: scaleWidth(312),
    borderRadius: BORDER_RADIUS[20],
    // 위/아래 블록의 배경색이 카드 모서리 둥글기를 벗어나 삐져나오지 않도록 클리핑
    overflow: 'hidden',
  },
  topBlock: {
    width: '100%',
    backgroundColor: COLORS.puple[3],
    paddingTop: scaleWidth(76),
    paddingBottom: scaleWidth(16),
    alignItems: 'center',
  },
  bottomBlock: {
    width: '100%',
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(16),
    paddingBottom: scaleWidth(28),
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: scaleWidth(8),
  },
  chip: {
    paddingVertical: scaleWidth(4),
    paddingHorizontal: scaleWidth(10),
    borderRadius: BORDER_RADIUS[99],
    backgroundColor: COLORS.gray100,
  },
  chipText: {
    ...Caption_14R,
    color: COLORS.gray700,
  },
  buttonGroup: {
    width: '100%',
  },
  actionButton: {
    width: '100%',
  },
  /** "퀴즈 풀고 더 얻기" — Button의 outline 기본값(보라 보더+굵은 보라 텍스트)은
      "다음 글 보기"와 비슷하게 튀어 보여서, 시안처럼 톤을 낮춘 회색 보조 버튼으로 오버라이드 */
  moreQuizButton: {
    borderColor: COLORS.gray300,
  },
  moreQuizButtonText: {
    ...Body_16SB,
    color: COLORS.gray700,
  },
  dismissButton: {
    width: '100%',
    height: scaleWidth(24),
  },
  dismissButtonText: {
    ...Caption_14R,
    color: COLORS.gray700,
  },
});

export default RewardModal;
