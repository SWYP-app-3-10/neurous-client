/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// setBackgroundMessageHandler는 앱 진입점 최상위에서 등록해야 RNFB 요구사항을 만족함.
// iOS에서 RN 브릿지 연결 전에 messaging()이 동기 호출되면
// "No Firebase App '[DEFAULT]'" 에러가 발생하므로
// require로 지연 로드하고 try-catch로 감싸 크래시를 방지함.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    if (__DEV__) console.log('[FCM 백그라운드 핸들러]', remoteMessage);
  });
} catch (e) {
  console.warn('[FCM] 백그라운드 핸들러 등록 실패:', e);
}

AppRegistry.registerComponent(appName, () => App);
