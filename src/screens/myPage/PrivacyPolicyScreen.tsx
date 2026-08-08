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
 * 개인정보 처리방침 화면
 * - 2026.08 정책 개편 반영: 데이터 저장 인프라(NCP → GCP) 및 분석/인증 수탁사
 *   (Firebase, Mixpanel) 추가, AdMob 맞춤형(개인화) 광고 도입에 따른 광고
 *   식별자 수집·거부 절차(ATT) 명시, 문의 처리 관련 수집 목적/보유 기간 추가
 */
const PrivacyPolicyScreen = () => {
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
        {/* 메인 타이틀 & 서문 */}
        <View style={styles.section}>
          <Text style={styles.mainTitle}>뉴로스 개인정보 처리 방침</Text>
          <Text style={styles.text}>
            뉴런즈 (이하 “팀”)은 팀이 제공하는 서비스 “뉴로스(Neurous)”(이하
            “서비스”)를 이용하는 개인(이하 “이용자”)의 정보를 보호하기 위해,
            「개인정보 보호법」 등 관련 법령을 준수하고, 서비스 이용자의
            개인정보 보호 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기
            위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </Text>
        </View>

        {/* 1. 개인정보 수집 및 이용 목적 - 문의 처리 목적 신규 추가 */}
        <View style={styles.section}>
          <Text style={styles.title}>1. 개인정보 수집 및 이용 목적</Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>가. 이용 목적</Text>
            <Text style={styles.text}>
              팀은 이용자의 개인정보를 다음의 목적으로만 활용합니다. 다음 목적
              외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는
              별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </Text>

            <View style={styles.bulletList}>
              {renderItem(
                '1.',
                '회원 관리: 서비스 제공에 따른 본인 식별, 가입 의사 확인, 부정 이용 방지, 각종 고지·통지, 문의 처리, 분쟁 조정을 위한 기록 보존',
              )}
              {renderItem(
                '2.',
                '서비스 제공: 콘텐츠 제공 및 이용자 설정에 따른 서비스 이용 지원',
              )}
              {renderItem(
                '3.',
                '광고 및 리워드 제공: 개인 맞춤형 광고(Google AdMob) 송출, 광고 시청 여부 확인 및 보상 지급, 광고 부정 이용 방지',
              )}
              {renderItem(
                '4.',
                '서비스 개선 및 통계 분석: 서비스 이용 통계 분석을 통한 서비스 최적화',
              )}
              {renderItem(
                '5.',
                '문의 처리: 이용자 문의 접수 및 답변, 재문의 발생 시 신속한 대응을 위한 이력 관리',
              )}
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>나. 아동의 개인정보 보호</Text>
            <Text style={styles.text}>
              서비스는 만 14세 이상만 가입이 가능하며, 원칙적으로 만 14세
              미만 아동의 개인정보를 수집하지 않습니다. 만약 만 14세 미만
              아동의 정보가 수집된 사실이 확인될 경우 즉시 파기합니다.
            </Text>
          </View>
        </View>

        {/* 2. 수집하는 개인정보의 항목 및 방법 - 행동 분석/문의 관련 수집 항목 신규 추가 */}
        <View style={styles.section}>
          <Text style={styles.title}>2. 수집하는 개인정보의 항목 및 방법</Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>가. 처리하는 개인정보의 항목</Text>
            <View style={styles.bulletList}>
              {renderItem(
                '1.',
                '회원 가입 (소셜 로그인 연동): 카카오, 네이버, 구글, 애플 소셜 로그인을 통해 수집되는 로그인 식별 값, 이메일, 이름(닉네임), 소셜 제공자 고유 ID',
              )}
              {renderItem(
                '2.',
                '서비스 이용 설정 정보: 관심 분야, 난이도 등 이용자가 선택하는 서비스 이용 설정 값',
              )}
              {renderItem(
                '3.',
                '서비스 이용 과정에서 생성되는 정보: 서비스 이용 기록, 서비스 내 적립 데이터, 단말기 정보(모델명, OS 버전), 푸시 알림(FCM) 토큰, 광고 식별자(ADID/IDFA), 접속 IP',
              )}
              {renderItem(
                '4.',
                '서비스 이용 행동 분석 데이터: 서비스 이용 중 발생하는 행동 로그, 기기 식별자, 분석 도구 내 회원 식별값',
              )}
              {renderItem('5.', '문의 접수 시: 이메일 주소, 문의 내용')}
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>나. 개인정보의 수집 방법</Text>
            <View style={styles.bulletList}>
              {renderItem(
                '1.',
                '회원가입 및 서비스 이용 과정에서 이용자가 개인정보 수집에 대해 동의하고 직접 입력',
              )}
              {renderItem('2.', '소셜 로그인 제공업체(카카오, 네이버, 구글, 애플 등)로부터의 제공')}
              {renderItem(
                '3.',
                '서비스 이용 과정에서 자동 생성 정보 수집 툴(Firebase, Mixpanel, 광고 SDK 등)을 통한 수집',
              )}
              {renderItem('4.', '문의 접수 과정에서 이용자가 직접 입력')}
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>
              다. 개인정보 자동 수집 장치의 설치·운영 및 거부
            </Text>

            <View style={styles.bulletList}>
              {renderItem(
                '1.',
                '서비스 이용 기록 자동 수집: 서비스의 안정적인 운영, 서비스 개선, 부정 이용 방지를 위해 서비스 이용 기록이 Firebase, Mixpanel 등 분석 도구를 통해 자동으로 생성·수집됩니다.',
              )}
              {renderItem(
                '2.',
                '광고 식별자(ADID/IDFA)의 활용 및 거부: 서비스는 Google AdMob을 통해 개인 맞춤형(개인화) 광고를 제공하며, 이를 위해 광고 식별자를 수집·활용합니다. iOS 이용자의 경우 앱 최초 실행 시 추적 투명성(ATT) 동의 절차를 통해 광고 식별자 수집 여부를 직접 선택할 수 있으며, 이용자는 언제든지 아래 경로를 통해 설정을 확인하거나 변경할 수 있습니다.',
              )}
            </View>

            <View style={[styles.bulletList, { marginLeft: scaleWidth(30) }]}>
              {renderItem(
                '•',
                'Android: 설정 > Google > 광고 > 광고 ID 삭제 또는 재설정, 또는 맞춤형 광고 선택 해제',
              )}
              {renderItem(
                '•',
                'iOS: 설정 > 개인정보 보호 및 보안 > 추적 > 앱의 추적 허용 해제',
              )}
            </View>

            <Text style={styles.text}>
              다만 이용자가 광고 식별자 수집을 거부하는 경우에도 서비스
              이용에는 제한이 없으며, 이 경우 팀은 비식별 방식의 일반 광고를
              제공합니다.
            </Text>
          </View>
        </View>

        {/* 3. 개인정보의 제3자 제공 및 위탁 - 저장 인프라 GCP 전환, Firebase/Mixpanel 수탁 추가 */}
        <View style={styles.section}>
          <Text style={styles.title}>3. 개인정보의 제3자 제공 및 위탁</Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>가. 개인정보 처리 위탁</Text>
            <Text style={styles.text}>
              팀은 원활한 서비스 이행을 위해 다음과 같이 개인정보 처리 업무를
              외부 전문 업체에 위탁하여 운영하고 있습니다.
            </Text>

            {/* 테이블 */}
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text
                  style={[styles.tableHeader, { flex: 1 }, styles.borderRight]}
                >
                  수탁 업체
                </Text>
                <Text
                  style={[styles.tableHeader, { flex: 1 }, styles.borderRight]}
                >
                  위탁 업무 내용
                </Text>
                <Text style={[styles.tableHeader, { flex: 1 }]}>이전 국가</Text>
              </View>

              <View style={styles.tableRow}>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  GCP(Google Cloud Platform)
                </Text>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  서비스 데이터 저장, 시스템 및 서버 운영 관리
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>국내</Text>
              </View>

              <View style={styles.tableRow}>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  Google AdMob
                </Text>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  맞춤형 광고 송출, 광고 시청 여부 확인 및 리워드(포인트) 지급
                  관리
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>국외(미국)</Text>
              </View>

              <View style={styles.tableRow}>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  Firebase (Google)
                </Text>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  로그인 인증, 서비스 이용 행동 분석, 푸시 알림(FCM) 발송
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>국외(미국)</Text>
              </View>

              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  Mixpanel
                </Text>
                <Text
                  style={[styles.tableCell, { flex: 1 }, styles.borderRight]}
                >
                  서비스 이용 행동 분석 및 통계
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>국외(미국)</Text>
              </View>
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>나. 개인정보의 국외 이전</Text>
            <Text style={styles.text}>
              팀은 광고 및 서비스 운영 지원을 위해 아래와 같이 개인정보를
              국외(미국)로 이전합니다.
            </Text>
            <View style={styles.bulletList}>
              {renderItem(
                '1.',
                '이전 항목: 광고 식별자(ADID/IDFA), 단말기 정보(모델명, OS), 서비스 이용 기록·행동 이벤트 데이터, 푸시 토큰, 접속 IP',
              )}
              {renderItem(
                '2.',
                '이전 목적: 맞춤형 광고 송출 및 보상(포인트) 지급 확인, 로그인 인증, 서비스 이용 통계 분석, 푸시 알림 발송',
              )}
              {renderItem(
                '3.',
                '이전 일시 및 방법: 서비스 이용 및 광고 호출·시청 시점에 SDK를 통해 암호화 전송',
              )}
              {renderItem(
                '4.',
                '보유 및 이용 기간: 수집 목적 달성 시까지 (각 수탁업체의 개인정보 처리방침에 따름)',
              )}
            </View>
          </View>
        </View>

        {/* 4. 개인정보 보유 기간 및 파기 - 문의 기록 1년 보관 조항 신규 추가 */}
        <View style={styles.section}>
          <Text style={styles.title}>4. 개인정보 보유 기간 및 파기</Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>가. 개인정보 보유 및 이용 기간</Text>
            <View style={styles.bulletList}>
              {renderItem(
                '1.',
                '이용자의 개인정보는 수집 및 이용 목적이 달성되면 지체 없이 즉시 파기하는 것을 원칙으로 합니다.',
              )}
              {renderItem(
                '2.',
                '이용자가 회원 탈퇴를 요청하거나 개인정보 수집 동의를 철회하는 경우, 해당 이용자의 데이터는 복구할 수 없는 방법으로 즉시 삭제됩니다. (단순 로그아웃은 삭제 사유에 해당하지 않습니다.)',
              )}
              {renderItem(
                '3.',
                '다만, 문의 처리 과정에서 생성된 기록은 재문의 발생 시 신속한 대응을 위하여 처리 완료일로부터 1년간 보관 후 파기합니다.',
              )}
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>나. 개인정보 파기</Text>
            <View style={styles.bulletList}>
              {renderItem(
                '1.',
                '파기 절차: 이용자가 입력한 정보 및 생성된 모든 데이터는 목적 달성 시(회원 탈퇴 등) 위 4-가-3호에 따른 문의 기록을 제외하고 별도의 보관 기간 없이 데이터베이스(DB)에서 해당 이용자의 모든 내역을 즉시 삭제합니다.',
              )}
              {renderItem(
                '2.',
                '파기 방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 영구 삭제합니다.',
              )}
            </View>
          </View>
        </View>

        {/* 5. 이용자의 권리 및 행사 방법 - 셀프 수정 가능 항목과 문의 대상 항목을 구분 */}
        <View style={styles.section}>
          <Text style={styles.title}>5. 이용자의 권리 및 행사 방법</Text>
          <Text style={styles.text}>
            이용자는 언제든지 자신의 개인정보를 조회할 수 있으며, 관심
            분야·난이도 등 서비스 이용 설정 정보는 앱 내에서 직접 수정할 수
            있습니다. 그 외 개인정보의 열람·정정·삭제 및 동의 철회(회원
            탈퇴)는 문의를 통해 요청할 수 있습니다.
          </Text>
          <View style={styles.bulletList}>
            {renderItem(
              '1.',
              '권리 행사 방법: 앱 내 [마이페이지 > 설정] 메뉴에서 관심 분야·난이도를 직접 조회 및 수정할 수 있으며, 그 외 권리 행사는 문의 또는 [회원 탈퇴] 기능을 통해 가능합니다.',
            )}
            {renderItem(
              '2.',
              '이용자가 개인정보의 오류에 대한 정정을 요청한 경우, 정정을 완료하기 전까지 당해 개인정보를 이용하거나 제공하지 않습니다.',
            )}
          </View>
        </View>

        {/* 6. 개인정보 보호 책임자 및 권익침해 구제방법 */}
        <View style={styles.section}>
          <Text style={styles.title}>
            6. 개인정보 보호 책임자 및 권익침해 구제방법
          </Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>가. 개인정보 보호 책임자</Text>
            <Text style={styles.text}>
              팀은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
              처리와 관련한 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와
              같이 개인정보 보호 책임자를 지정하고 있습니다.
            </Text>

            <View style={styles.bulletList}>
              {renderItem('•', '성명/직책: 이슬희 / PM')}
              {renderItem('•', '연락처: neurous2@gmail.com')}
              {renderItem('', '(※ 개인정보 보호 관련 문의만 처리됩니다.)')}
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>
              나. 정보주체의 권익침해에 대한 구제방법
            </Text>
            <Text style={styles.text}>
              기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래
              기관에 문의하시기 바랍니다.
            </Text>
            <View style={styles.bulletList}>
              {renderItem(
                '•',
                '개인정보분쟁조정위원회 (www.kopico.go.kr / 1833-6972)',
              )}
              {renderItem(
                '•',
                '개인정보침해신고센터 (privacy.kisa.or.kr / 118)',
              )}
              {renderItem('•', '경찰청 사이버수사국 (ecrm.cyber.go.kr / 182)')}
            </View>
          </View>
        </View>

        {/* 7. 변경 고지 - 시행일자 최신화 (공고 2026.08.08 / 시행 2026.08.09) */}
        <View style={styles.section}>
          <Text style={styles.title}>7. 개인정보 처리방침의 변경</Text>
          <Text style={styles.text}>
            이 개인정보 처리방침은 시행일로부터 적용되며, 관련 법률 및 지침의
            변경과 내부 운영 방침의 변경에 따라 변경될 수 있습니다. 현
            개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 시에는 시행일 최소
            7일 전부터 서비스 알림을 통해 고지할 것입니다.
          </Text>

          <View style={styles.bulletList}>
            <Text style={styles.text}>• 공고 일자: 2026.08.08</Text>
            <Text style={styles.text}>• 시행 일자: 2026.08.09</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

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
  subSection: {
    gap: scaleWidth(16),
  },
  bulletList: {
    marginTop: scaleWidth(8),
    gap: scaleWidth(4),
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
  noticeText: {
    ...Body_16R,
    color: COLORS.gray500,
  },

  /* 테이블 */
  table: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: COLORS.gray300,
  },
  tableHeader: {
    padding: scaleWidth(8),
    backgroundColor: COLORS.gray100,
    ...Heading_16B,
    color: COLORS.black,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  tableCell: {
    padding: scaleWidth(8),
    ...Body_16R,
    color: COLORS.black,
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  /* 박스 */
  box: {
    padding: scaleWidth(12),
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    gap: scaleWidth(4),
  },
});
