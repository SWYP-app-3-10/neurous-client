/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
// import messaging from '@react-native-firebase/messaging';

// Firebase 초기화 이전 messaging 접근 시 iOS에서
// No Firebase App '[DEFAULT]' 에러가 발생할 수 있어 임시 비활성화
// 추후 RNFirebase modular migration 이후 재활성화 필요
// messaging().setBackgroundMessageHandler(async remoteMessage => {
//   if (__DEV__) console.log('[FCM 백그라운드 핸들러]', remoteMessage);
// });

AppRegistry.registerComponent(appName, () => App);
