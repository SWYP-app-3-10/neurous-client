/**
 * 보상 관련 상수 정의
 * 경험치(XP)와 포인트(P) 획득/차감 기준
 *
 * 서버에서 리워드 설정을 받아오지만, 오프라인/에러 시 기본값으로 사용
 */

/**
 * 리워드 설정 타입
 */
export interface RewardsConfig {
  // 기사 읽기 관련
  articleReadPointCost: number;
  articleReadExperience: number;

  // 광고 시청 관련
  adRewardPoints: number;

  // 퀴즈 관련
  quizCorrectExperience: number;
  quizCorrectPoint: number;
  quizIncorrectExperience: number;
  quizIncorrectPoint: number;

  // 데일리 출석
  dailyAttendanceExperience: number;
  dailyAttendancePoint: number;

  // 위클리 출석
  weeklyAttendanceExperience: number;
  weeklyAttendancePoint: number;
}

// 기본 리워드 설정
export const DEFAULT_REWARDS_CONFIG: RewardsConfig = {
  // 기사 읽기 관련
  articleReadPointCost: 30,
  articleReadExperience: 5,

  // 광고 시청 관련
  adRewardPoints: 60,

  // 퀴즈 관련
  quizCorrectExperience: 25,
  quizCorrectPoint: 30,
  quizIncorrectExperience: 15,
  quizIncorrectPoint: 10,

  // 데일리 출석
  dailyAttendanceExperience: 5,
  dailyAttendancePoint: 10,

  // 위클리 출석
  weeklyAttendanceExperience: 30,
  weeklyAttendancePoint: 30,
};

// 하위 호환성을 위한 개별 상수 export
const {
  articleReadPointCost,
  articleReadExperience,
  adRewardPoints,
  quizCorrectExperience,
  quizCorrectPoint,
  quizIncorrectExperience,
  quizIncorrectPoint,
  dailyAttendanceExperience,
  dailyAttendancePoint,
  weeklyAttendanceExperience,
  weeklyAttendancePoint,
} = DEFAULT_REWARDS_CONFIG;

export const ARTICLE_READ_POINT_COST = articleReadPointCost;
export const ARTICLE_READ_EXPERIENCE = articleReadExperience;
export const AD_REWARD_POINTS = adRewardPoints;
export const QUIZ_CORRECT_EXPERIENCE = quizCorrectExperience;
export const QUIZ_CORRECT_POINT = quizCorrectPoint;
export const QUIZ_INCORRECT_EXPERIENCE = quizIncorrectExperience;
export const QUIZ_INCORRECT_POINT = quizIncorrectPoint;
export const DAILY_ATTENDANCE_EXPERIENCE = dailyAttendanceExperience;
export const DAILY_ATTENDANCE_POINT = dailyAttendancePoint;
export const WEEKLY_ATTENDANCE_EXPERIENCE = weeklyAttendanceExperience;
export const WEEKLY_ATTENDANCE_POINT = weeklyAttendancePoint;
