import { CommonActions } from '@react-navigation/native';
import { RouteNames } from '../../routes';

/**
 * 퀴즈 완료 후 돌아갈 화면
 * - mission / search: 홈·탐색 탭
 * - read: 마이페이지 > 읽은 글 상세 (퀴즈를 안 푼 읽은 글에서 진입한 경우)
 */
type ReturnTo = 'mission' | 'search' | 'read';

/**
 * 퀴즈 완료 후 원래 화면으로 이동하는 네비게이션 리셋 액션 생성
 *
 * @param returnTo  돌아갈 화면
 * @param articleId returnTo가 'read'일 때 다시 열 읽은 글 ID
 */
export const createQuizCompleteNavigation = (
  returnTo: ReturnTo,
  articleId?: number,
): ReturnType<typeof CommonActions.reset> => {
  // 읽은 글 상세로 복귀: 스택을 [마이페이지 탭, 읽은 글 상세]로 재구성한다.
  // 리셋으로 읽은 글 상세가 새로 마운트되므로 방금 푼 퀴즈 결과가 다시 조회되어 바로 표시되고,
  // 뒤로가기 시에는 마이페이지로 돌아간다.
  if (returnTo === 'read' && articleId) {
    return CommonActions.reset({
      index: 1,
      routes: [
        {
          name: RouteNames.MAIN_TAB,
          state: {
            routes: [
              {
                name: RouteNames.MY_PAGE_TAB,
                state: { routes: [{ name: RouteNames.MY_PAGE }] },
              },
            ],
          },
        },
        {
          name: RouteNames.FULL_SCREEN_STACK,
          state: {
            routes: [
              {
                name: RouteNames.READ_ARTICLE_DETAIL,
                params: { articleId, entrySource: 'my_page' },
              },
            ],
          },
        },
      ],
    });
  }

  const targetTab =
    returnTo === 'search' ? RouteNames.SEARCH_TAB : RouteNames.MISSION_TAB;
  const targetScreen =
    returnTo === 'search' ? RouteNames.SEARCH : RouteNames.MISSION;

  return CommonActions.reset({
    index: 0,
    routes: [
      {
        name: RouteNames.MAIN_TAB,
        state: {
          routes: [
            {
              name: targetTab,
              state: {
                routes: [
                  {
                    name: targetScreen,
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  });
};
