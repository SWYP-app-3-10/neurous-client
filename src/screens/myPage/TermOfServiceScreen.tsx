import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import Header from '../../components/Header';
import { scaleWidth, COLORS } from '../../styles/global';
import {
  Heading_24EB_Round,
  Heading_18B,
  Heading_16B,
  Body_16R,
} from '../../styles/typography';

/**
 * 이용약관 화면
 * - 2026.08 정책 개편 반영: 용어 정의 확대, 수치(무료 열람권 개수/차감 포인트 등)를
 *   약관에서 제거하고 '운영정책'으로 위임, AI 콘텐츠 생성 고지 및 면책 범위 확대
 */
const TermsOfServiceScreen = () => {
  const navigation = useNavigation<any>();

  /**
   * 리스트 아이템 렌더링 (Hanging Indent)
   * - label: 번호(1.) 또는 불릿(•)
   * - content: 내용 텍스트
   */
  const renderItem = useCallback((label: string, content: string) => {
    return (
      <View style={styles.row}>
        <Text style={styles.listLabel}>{label}</Text>
        <Text style={styles.listContent}>{content}</Text>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 상단 헤더 */}
      <Header goBackAction={() => navigation.goBack()} />

      {/* 본문 */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 메인 타이틀 & 제1조 (목적) */}
        <View style={styles.section}>
          <Text style={styles.mainTitle}>뉴로스 이용약관</Text>
          <Text style={styles.title}>제1조 (목적)</Text>
          <Text style={styles.text}>
            본 약관은 뉴런즈(이하 '팀')가 제공하는 콘텐츠 열람, 퀴즈, 캐릭터
            성장 시스템 및 이에 부수되는 제반 서비스(“뉴로스”, 이하 '서비스')의
            이용과 관련하여 팀과 이용자의 권리, 의무 및 책임 사항을 규정함을
            목적으로 합니다.
          </Text>
        </View>

        {/* 제2조 (용어의 정의) - 캐릭터/레벨/미션/관심 분야/난이도/운영정책 정의 추가 */}
        <View style={styles.section}>
          <Text style={styles.title}>제2조 (용어의 정의)</Text>

          <View style={styles.bulletList}>
            {renderItem(
              '1.',
              '포인트(P): 서비스 내에서 콘텐츠 열람 등을 위해 사용되는 가상의 데이터입니다.',
            )}
            {renderItem(
              '2.',
              '경험치(XP): 사용자의 활동(미션, 출석, 퀴즈 등)에 따라 적립되며, 캐릭터의 레벨을 결정하는 척도입니다.',
            )}
            {renderItem(
              '3.',
              '무료 열람권: 매일 정해진 수량만큼 제공되는 콘텐츠 무료 이용 권한입니다.',
            )}
            {renderItem(
              '4.',
              '캐릭터: 경험치 누적에 따라 레벨이 상승하며 외형이 진화하는 이용자의 서비스 내 아바타입니다.',
            )}
            {renderItem(
              '5.',
              '레벨: 캐릭터의 성장 단계를 나타내는 지표로, 누적 경험치 구간에 따라 결정됩니다.',
            )}
            {renderItem(
              '6.',
              '미션: 팀이 제공하는 특정 활동 과제로, 완료 시 포인트 및 경험치가 지급됩니다.',
            )}
            {renderItem(
              '7.',
              '관심 분야: 이용자가 가입 시 선택하는 콘텐츠 카테고리로, 최대 3순위까지 설정 가능하며 이후 언제든 변경할 수 있습니다.',
            )}
            {renderItem(
              '8.',
              '난이도: 이용자가 선택하는 콘텐츠 학습 수준(초급/중급/고급)으로, 이후 언제든 변경할 수 있습니다.',
            )}
            {renderItem(
              '9.',
              '운영정책: 본 약관에서 정하지 않은 세부 이용 기준(포인트·경험치 지급 기준, 무료 열람권 수량 등)을 팀이 정하여 앱 내 공지사항, 팝업, 안내 화면 등을 통해 고지하는 정책을 말합니다.',
            )}
          </View>
        </View>

        {/* 제3조 (서비스의 이용 및 제한) - 세부 수치는 삭제하고 운영정책으로 위임 */}
        <View style={styles.section}>
          <Text style={styles.title}>제3조 (서비스의 이용 및 제한)</Text>

          <View style={styles.bulletList}>
            {renderItem(
              '1.',
              '이용 대상: 본 서비스는 만 14세 이상의 이용자를 대상으로 하며, 만 14세 미만 아동의 가입은 제한됩니다. 연령 허위 기재로 발생하는 문제에 대해 팀은 책임을 지지 않습니다.',
            )}
            {renderItem(
              '2.',
              '무료 열람권 지급: 팀은 이용자에게 팀이 정하는 수량의 무료 열람권을 매일 제공하며, 세부 지급 기준은 운영정책에 따라 정해집니다.',
            )}
            {renderItem(
              '3.',
              '관심 분야 및 난이도 설정: 이용자는 가입 시 관심 분야 및 콘텐츠 난이도를 선택하며, 앱 내 설정 메뉴에서 언제든지 이를 변경할 수 있습니다.',
            )}
            {renderItem(
              '4.',
              '업데이트: 서비스 콘텐츠의 업데이트 주기는 팀이 정하는 바에 따르며, 운영 상황에 따라 변경될 수 있습니다.',
            )}
          </View>
        </View>
        {/* 제4조 (포인트 및 리워드 시스템) - 지급/차감 기준을 운영정책으로 위임 */}
        <View style={styles.section}>
          <Text style={styles.title}>제4조 (포인트 및 리워드 시스템)</Text>

          <View style={styles.bulletList}>
            {renderItem(
              '1.',
              '획득: 이용자는 콘텐츠 열람, 미션 수행, 퀴즈 참여, 출석, 광고 시청 등 팀이 정하는 서비스 내 활동을 통해 포인트 및 경험치를 획득할 수 있으며, 세부 지급 기준은 운영정책에 따라 정해집니다.',
            )}
            {renderItem(
              '2.',
              '사용: 보유 포인트는 무료 열람권 소진 후 추가 콘텐츠를 열람하는 데 사용되며, 세부 이용(차감) 기준은 운영정책에 따라 정해집니다.',
            )}
            {renderItem(
              '3.',
              '소멸 및 환불: 무상으로 지급된 포인트는 현금으로 환급되지 않으며, 회원 탈퇴 시 즉시 소멸되어 복구되지 않습니다.',
            )}
            {renderItem(
              '4.',
              '부정 획득: 매크로 사용, 시스템 오류 악용 등 부정한 방법으로 획득한 데이터는 사전 통지 없이 회수될 수 있으며 서비스 이용이 제한될 수 있습니다.',
            )}
          </View>
        </View>

        {/* 제5조 (광고 및 서비스 알림) */}
        <View style={styles.section}>
          <Text style={styles.title}>제5조 (광고 및 서비스 알림)</Text>

          <View style={styles.bulletList}>
            {renderItem(
              '1.',
              '광고 리워드: 광고 시청 완료 시 포인트가 지급되나, 광고 제공사(AdMob 등)의 사정에 따라 반영이 지연되거나 시청이 제한될 수 있습니다.',
            )}
            {renderItem(
              '2.',
              '푸시 알림: 팀은 서비스 운영을 위해 푸시 알림을 발송할 수 있으며, 이용자는 앱 설정에서 이를 거부할 수 있습니다.',
            )}
          </View>
        </View>

        {/* 제6조 (데이터 활용 및 저작권) - AI 콘텐츠 생성 고지 항목 신규 추가 */}
        <View style={styles.section}>
          <Text style={styles.title}>제6조 (데이터 활용 및 저작권)</Text>

          <View style={styles.bulletList}>
            {renderItem(
              '1.',
              '데이터 활용: 팀은 서비스 개선 및 알고리즘 고도화를 위해 이용자의 관심 분야, 난이도 선택 정보, 문제 풀이 결과 등을 비식별화하여 활용할 수 있습니다.',
            )}
            {renderItem(
              '2.',
              '저작권: 서비스 내 모든 콘텐츠(글, 퀴즈, 이미지 등)의 저작권은 팀 또는 원저작권자에게 귀속됩니다. 이용자는 이를 무단 복제하거나 배포할 수 없습니다.',
            )}
            {renderItem(
              '3.',
              'AI 콘텐츠 생성 고지: 서비스에서 제공되는 읽기 콘텐츠(글, 퀴즈)는 다수의 뉴스 기사에서 사실을 추출·정제한 후 생성형 인공지능(AI) 기술을 활용하여 사전 작성되며, 이용자의 관심 분야 및 난이도 설정에 따라 해당 콘텐츠가 매칭되어 제공됩니다. 팀은 본 약관을 통해 콘텐츠가 AI로 생성된다는 사실을 사전에 고지하며, 이용자는 본 약관 확인 이후 서비스를 이용함으로써 이를 인지한 것으로 간주합니다.',
            )}
          </View>
        </View>

        {/* 제7조 (면책 사항) - 제3자 SDK 연동 면책 및 불가항력 조항 확대 */}
        <View style={styles.section}>
          <Text style={styles.title}>제7조 (면책 사항)</Text>

          <View style={styles.bulletList}>
            {renderItem(
              '1.',
              '팀은 이용자의 네트워크 환경, 디바이스 설정, 계정 정보(소셜 로그인 인증 정보 포함) 관리 소홀로 인해 발생하는 서비스 이용 장애나 손해에 대해 책임을 지지 않습니다.',
            )}
            {renderItem(
              '2.',
              '팀은 서비스 운영을 위해 연동하는 제3자 서비스(광고 제공사, 인증·분석·푸시 발송 등 외부 SDK 포함)의 시스템 장애나 정책 변경으로 발생하는 문제에 대해, 팀의 고의 또는 중과실이 없는 한 책임을 지지 않습니다.',
            )}
            {renderItem(
              '3.',
              '서비스 내 콘텐츠와 퀴즈는 AI 기술을 활용하여 생성되므로 정보의 정확성을 완전히 보장하지 않습니다. 콘텐츠 오류로 인한 직접적인 손해에 대해 팀은 책임을 지지 않습니다.',
            )}
            {renderItem(
              '4.',
              '팀은 천재지변, 시스템 점검, 정부 규제 등 팀이 통제할 수 없는 사유로 서비스 제공이 일시 중단되는 경우 이에 대한 책임을 지지 않습니다.',
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsOfServiceScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleWidth(20),
    paddingBottom: scaleWidth(48),
    gap: scaleWidth(32),
  },

  section: {
    gap: scaleWidth(16),
  },
  bulletList: {
    marginTop: scaleWidth(0),
    gap: scaleWidth(0),
  },

  /* 리스트(행) */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleWidth(4),
  },
  listLabel: {
    ...Body_16R,
    color: COLORS.black,
    minWidth: scaleWidth(14),
  },
  listContent: {
    ...Body_16R,
    color: COLORS.black,
    flex: 1,
  },

  /* 텍스트 */
  mainTitle: {
    ...Heading_24EB_Round,
    color: COLORS.black,
  },
  title: {
    ...Heading_18B,
    color: COLORS.black,
  },
  subTitle: {
    ...Heading_16B,
    color: COLORS.black,
  },
  text: {
    ...Body_16R,
    color: COLORS.black,
  },
});
