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
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from '../../components/Header';
import Spacer from '../../components/Spacer';
import { NoNotificationsIcon } from '../../icons';
import { COLORS, scaleWidth } from '../../styles/global';
import {
  Body_16M,
  Body_16SB,
  Caption_14R,
  Caption_12M,
} from '../../styles/typography';

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
        <Text style={[styles.title, isUnread && styles.titleUnread]}>
          {item.title}
        </Text>

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
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {/* TODO(QA): Figma Alarm_Empty 기준 빈 상태 일러스트 크기와 위치 수치 확인 필요 */}
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
    // TODO(QA): Figma Alarm 기준 리스트 상단 패딩과 아이템 간격 수치 확인 필요
    paddingTop: scaleWidth(8),
    paddingBottom: scaleWidth(16),
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  row: {
    // TODO(QA): Figma Alarm 기준 알림 리스트 아이템 패딩 수치 확인 필요
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleWidth(25),
    backgroundColor: COLORS.white,
  },
  rowUnread: {
    backgroundColor: COLORS.puple[3],
  },
  title: {
    ...Body_16SB,
    color: COLORS.black,
  },
  titleUnread: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: scaleWidth(6),
    ...Caption_14R,
    color: COLORS.gray600,
  },
  date: {
    marginTop: scaleWidth(13),
    ...Caption_12M,
    color: COLORS.gray500,
  },
  footer: {
    paddingVertical: scaleWidth(22),
    alignItems: 'center',
  },
  footerText: {
    ...Caption_12M,
    color: COLORS.gray500,
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
    ...Body_16M,
    // TODO(QA): Figma Alarm_Empty 기준 빈 상태 텍스트 크기와 위치 수치 확인 필요
    color: COLORS.gray600,
  },
});
