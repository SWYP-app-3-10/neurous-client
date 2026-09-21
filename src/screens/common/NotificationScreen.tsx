import React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Header from '../../components/Header';
import Spacer from '../../components/Spacer';
import { NoNotificationsIcon } from '../../icons';
import { COLORS, scaleWidth } from '../../styles/global';
import { Body_16M, Body_16SB, Caption_14R } from '../../styles/typography';

import {
  useNotifications,
  useMarkNotificationAsRead,
} from '../../hooks/useNotifications';
import { formatNotificationDate } from '../../utils/dateUtils';

/**
 * NotificationScreen
 *
 * - 백엔드 API에서 알림 목록 조회
 * - 알림 클릭 시 읽음 처리 (PUT API 호출)
 * - 날짜는 서버가 준 displayDate를 그대로 표시 ("0일 전"만 "오늘"로 변환)
 * - 읽지 않은 알림은 배경색으로 강조 표시
 */
const NotificationScreen = () => {
  const navigation = useNavigation<any>();
  // 하단 시스템 바(제스처 바/내비게이션 바) 높이
  const insets = useSafeAreaInsets();

  // 알림 목록 조회
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useNotifications();

  // 알림 읽음 처리
  const { mutate: markAsRead } = useMarkNotificationAsRead();

  /**
   * 뒤로가기 처리
   */
  const onPressBack = () => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    }
  };

  /**
   * 알림 클릭 시 읽음 처리
   */
  const onPressItem = (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  };

  /**
   * FlatList 아이템 렌더링
   */
  const renderItem = ({ item }: { item: any }) => {
    const isUnread = !item.isRead;

    return (
      <Pressable
        onPress={() => onPressItem(item.notificationId, item.isRead)}
        style={[styles.row, isUnread && styles.rowUnread]}
      >
        <Text style={styles.title}>{item.title}</Text>

        <Text style={styles.subtitle}>{item.message}</Text>

        {/* 서버 displayDate 표시 ("0일 전"만 "오늘") */}
        <Text style={styles.date}>
          {formatNotificationDate(item.createdAt)}
        </Text>
      </Pressable>
    );
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header
          title="알림"
          goBackAction={onPressBack}
          backEventName="Back_Alarm"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.puple.main} />
        </View>
      </SafeAreaView>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header
          title="알림"
          goBackAction={onPressBack}
          backEventName="Back_Alarm"
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            알림을 불러오는 중 오류가 발생했습니다.
          </Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title="알림"
        goBackAction={onPressBack}
        backEventName="Back_Alarm"
      />

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.notificationId)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.listContentEmpty,
          // 빈 상태/목록 모두: 하단 바 높이 + 48만큼 띄워 푸터가 가려지지 않게 함
          { paddingBottom: insets.bottom + scaleWidth(48) },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {/* 빈 상태 일러스트 76x76, 텍스트와 간격 16 (Figma Alarm_Empty) */}
            <NoNotificationsIcon />
            <Spacer num={16} />
            <Text style={styles.emptyText}>아직 도착한 알림이 없어요</Text>
          </View>
        }
        ListFooterComponent={
          notifications.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                7일 전 알림까지 확인할 수 있어요
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  listContent: {
    // 헤더와 첫 알림 사이 간격 12 (Figma Alarm)
    // 하단 여백은 시스템 바 높이가 필요해 contentContainerStyle에서 동적으로 지정
    paddingTop: scaleWidth(12),
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  row: {
    // 알림 아이템 패딩: 좌우 20, 상하 24 (Figma List_*_Alarm)
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleWidth(24),
    backgroundColor: COLORS.white,
  },
  rowUnread: {
    backgroundColor: COLORS.puple[3],
  },
  title: {
    ...Body_16SB,
    color: COLORS.black,
  },
  subtitle: {
    // 제목과 내용 간격 4, 색상 gray700 (Figma)
    marginTop: scaleWidth(4),
    ...Caption_14R,
    color: COLORS.gray700,
  },
  date: {
    // 내용과 날짜 간격 16, 14R gray600 (Figma)
    marginTop: scaleWidth(16),
    ...Caption_14R,
    color: COLORS.gray600,
  },
  footer: {
    // 마지막 알림 아이템과 안내 문구 사이 간격 24 (하단 여백은 listContent에서 처리)
    paddingTop: scaleWidth(24),
    alignItems: 'center',
  },
  footerText: {
    ...Caption_14R,
    color: COLORS.gray600,
  },
  // 로딩 상태
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 에러 상태
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
  },
  errorText: {
    ...Body_16M,
    color: COLORS.gray600,
    marginBottom: scaleWidth(16),
  },
  retryButton: {
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleWidth(10),
    backgroundColor: COLORS.puple.main,
    borderRadius: scaleWidth(8),
  },
  retryButtonText: {
    ...Body_16M,
    color: COLORS.white,
  },
  // 빈 목록
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    // 빈 상태 안내 문구 14pt (Figma Alarm_Empty)
    ...Caption_14R,
    color: COLORS.gray600,
  },
});
