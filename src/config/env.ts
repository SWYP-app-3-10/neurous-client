// src/config/env.ts

/**
 * 환경 설정
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 환경별 동작
 * ───────────────────────────────────────────────────────────────────────────
 * ┌──────────────┬─────────┬──────────────────┬───────────────┬──────┬───────────┐
 * │ 환경         │ __DEV__ │ IS_INTERNAL_TEST │ IS_PRODUCTION │ 광고 │ Analytics │
 * ├──────────────┼─────────┼──────────────────┼───────────────┼──────┼───────────┤
 * │ Debug 빌드   │ true    │ false            │ false         │ 테스트 │ 로그만   │
 * │ 내부 테스트  │ false   │ true             │ false         │ 테스트 │ 로그만   │
 * │ 실제 배포    │ false   │ false            │ true          │ 실제   │ 활성화   │
 * └──────────────┴─────────┴──────────────────┴───────────────┴──────┴───────────┘
 *
 * __DEV__: React Native가 자동 제공 (Debug: true, Release: false)
 * IS_INTERNAL_TEST: 내부 테스트 시 true로 변경
 * IS_PRODUCTION: 실제 프로덕션 여부 (= !__DEV__ && !IS_INTERNAL_TEST)
 */

/**
 * 내부 테스트 모드
 *
 * Release 빌드이지만 테스트 광고를 보고 싶을 때 true로 설정
 * (Google Play 내부 테스트, 베타 배포 시)
 */
export const IS_INTERNAL_TEST = true;

/**
 * 프로덕션 모드
 *
 * true: 실제 광고 + Analytics 활성화
 * false: 테스트 광고 + Analytics 로그만
 */
export const IS_PRODUCTION = !__DEV__ && !IS_INTERNAL_TEST;
