/**
 * 인증 정보 로컬 저장소 서비스 (authStorageService.ts)
 *
 * authService.ts의 getUserInfo / clearUserInfo를 래핑하여
 * 로그인 화면과 마이페이지에서 사용하는 "최근 로그인 정보" 조회/삭제 인터페이스를 제공한다.
 *
 * 역할 분리:
 *   - authService.ts      : AsyncStorage 직접 조작 (토큰, 사용자 정보 저장/조회/삭제)
 *   - authStorageService.ts : 필요한 필드만 추출해 RecentLoginInfo 타입으로 반환 (화면 레이어용)
 */

import { SocialLoginProvider } from './socialLoginService';
import { getUserInfo, clearUserInfo, getRecentProvider } from './authService';

/**
 * 화면에서 사용할 최근 로그인 정보 타입
 *
 * authService의 전체 사용자 정보에서
 * 로그인 화면과 마이페이지 UI에 필요한 필드만 추출한 인터페이스
 */
export interface RecentLoginInfo {
  provider: SocialLoginProvider; // 소셜 로그인 제공자
  userId: number; // 서버 발급 사용자 고유 ID
  name?: string; // 사용자 이름
  userEmail?: string; // 사용자 이메일
  profileImage?: string; // 프로필 이미지 URL
  loginTime: number; // 로그인 시각 (타임스탬프) - 자동 로그인 만료 계산용
}

/**
 * AsyncStorage에서 최근 로그인 정보를 조회한다.
 *
 * authService.getUserInfo()를 호출해 전체 사용자 정보를 가져온 뒤,
 * UI에 필요한 필드만 추출하여 RecentLoginInfo 타입으로 반환한다.
 *
 * 필수 필드 검증:
 *   - provider와 loginTime이 없으면 null 반환 (불완전한 데이터로 간주)
 *   - 자동 로그인 여부 판단에 loginTime이 필수이므로 엄격히 검증
 *
 * @returns 유효한 최근 로그인 정보 (없거나 불완전하면 null)
 */
export const getRecentLogin = async (): Promise<RecentLoginInfo | null> => {
  try {
    const userInfo = await getUserInfo();

    // provider나 loginTime이 없으면 불완전한 로그인 정보로 간주
    if (!userInfo || !userInfo.provider || !userInfo.loginTime) {
      // @user_info 없을 때 @recent_provider 폴백으로 툴팁 표시
      const recentProvider = await getRecentProvider();
      if (!recentProvider) {
        return null;
      }

      return {
        provider: recentProvider as SocialLoginProvider,
        userId: 0, // 사용자 ID는 없지만 최근 로그인한 소셜 제공자 정보는 존재하는 경우
        loginTime: 0, // 로그인 시각 정보는 없으므로 0으로 설정 (자동 로그인 만료 계산에서 즉시 만료 처리)
      };
    }

    // UI 표시에 필요한 필드만 추출하여 반환
    return {
      provider: userInfo.provider as SocialLoginProvider,
      userId: userInfo.userId,
      name: userInfo.name,
      userEmail: userInfo.email, // authService에선 email, 여기선 userEmail로 매핑
      profileImage: userInfo.profileImage,
      loginTime: userInfo.loginTime,
    };
  } catch (error) {
    console.error('최근 로그인 정보 불러오기 실패:', error);
    return null;
  }
};

/**
 * 최근 로그인 정보를 삭제한다. (로그아웃 시 호출)
 *
 * 내부적으로 authService.clearUserInfo()를 호출해
 * AsyncStorage의 @user_info 키를 제거한다.
 *
 * 이 함수는 authService.logout()에서도 간접적으로 호출되지만,
 * 별도로 최근 로그인 정보만 삭제하고 싶을 때도 사용 가능하다.
 */
export const clearRecentLogin = async (): Promise<void> => {
  try {
    await clearUserInfo();
  } catch (error) {
    console.error('최근 로그인 정보 삭제 실패:', error);
  }
};
