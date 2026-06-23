import {
  InterestCategory,
  InterestCategoryNames,
  LevelCategory,
} from '../types/interests';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { MyPageContent, ReadArticlesByDate } from '../api/userApi';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';

/**
 * 난이도 -> 레벨 표시 텍스트 변환
 */
export const getLevelText = (difficulty: LevelCategory | null): string => {
  switch (difficulty) {
    case LevelCategory.BEGINNER:
      return '초급';
    case LevelCategory.INTERMEDIATE:
      return '중급';
    case LevelCategory.ADVANCED:
      return '고급';
    default:
      return '초급';
  }
};

/**
 * 카테고리 ID -> 한글 이름 매핑
 */
export const categoryNameMap: Record<string, string> = {
  [InterestCategory.POLITICS]: InterestCategoryNames[InterestCategory.POLITICS],
  [InterestCategory.ECONOMY]: InterestCategoryNames[InterestCategory.ECONOMY],
  [InterestCategory.SOCIETY]: InterestCategoryNames[InterestCategory.SOCIETY],
  [InterestCategory.LIFE_CULTURE]:
    InterestCategoryNames[InterestCategory.LIFE_CULTURE],
  [InterestCategory.IT_SCIENCE]:
    InterestCategoryNames[InterestCategory.IT_SCIENCE],
  [InterestCategory.WORLD]: InterestCategoryNames[InterestCategory.WORLD],
};

/**
 * 한글 이름 -> ENUM 값 매핑 (역변환)
 */
export const nameToCategoryMap: Record<string, InterestCategory> = {
  [InterestCategoryNames[InterestCategory.POLITICS]]: InterestCategory.POLITICS,
  [InterestCategoryNames[InterestCategory.ECONOMY]]: InterestCategory.ECONOMY,
  [InterestCategoryNames[InterestCategory.SOCIETY]]: InterestCategory.SOCIETY,
  [InterestCategoryNames[InterestCategory.LIFE_CULTURE]]:
    InterestCategory.LIFE_CULTURE,
  [InterestCategoryNames[InterestCategory.IT_SCIENCE]]:
    InterestCategory.IT_SCIENCE,
  [InterestCategoryNames[InterestCategory.WORLD]]: InterestCategory.WORLD,
};

/**
 * 날짜 포맷팅 (YYYY-MM-DD -> MM.DD 요일)
 */
export const formatArticleDate = (
  dateStr: string,
  dayOfWeek: string,
): string => {
  const [_year, month, day] = dateStr.split('-');
  return `${month}.${day} ${dayOfWeek}`;
};

/**
 * 주간 날짜 범위 계산 (월요일 시작 기준)
 */
export const calculateWeekRange = (selectedWeek: number): string => {
  const today = dayjs().tz(KST);
  const targetDate = today.add(selectedWeek * 7, 'day');

  // 월요일(1) 기준으로 주 시작일 계산 (일요일=0이면 6일 전이 월요일)
  const dayOfWeek = targetDate.day();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startDate = targetDate.subtract(daysFromMonday, 'day');
  const endDate = startDate.add(6, 'day');

  const formatDate = (d: dayjs.Dayjs) => `${d.format('MM')}.${d.format('DD')}`;

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * 다음 주에 데이터가 있는지 확인 (월요일 시작 기준)
 * @param selectedWeek 선택된 주 (0 = 현재 주)
 * @param readArticles 읽은 글 목록 (ReadArticlesByDate[])
 */
export const hasNextWeekData = (
  selectedWeek: number,
  readArticles: ReadArticlesByDate[],
): boolean => {
  if (!readArticles || readArticles.length === 0) {
    return false;
  }

  const today = dayjs().tz(KST);
  const nextWeekDate = today.add((selectedWeek + 1) * 7, 'day');

  const dayOfWeek = nextWeekDate.day();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startDate = nextWeekDate.subtract(daysFromMonday, 'day');
  const endDate = startDate.add(6, 'day');

  return readArticles.some(dateGroup => {
    const articleDate = dayjs(dateGroup.date);
    return (
      (articleDate.isAfter(startDate) ||
        articleDate.isSame(startDate, 'day')) &&
      (articleDate.isBefore(endDate) || articleDate.isSame(endDate, 'day'))
    );
  });
};

/**
 * MM.DD 형태의 날짜를 YYYY-MM-DD 형태로 변환
 * calculateWeekRange가 KST 기준으로 연도까지 계산하므로 현재 연도 그대로 사용
 * @param dateStr "06.21" 형태의 문자열
 * @returns "YYYY-MM-DD" 형태의 문자열
 */
export const convertToYYYYMMDD = (dateStr: string): string => {
  const [month, day] = dateStr.split('.');
  const year = dayjs().tz(KST).year();
  return dayjs(`${year}-${month}-${day}`).format('YYYY-MM-DD');
};

/**
 * 요일 이름을 한글로 변환 (KST 기준 YYYY-MM-DD 문자열 입력)
 */
const getDayOfWeek = (kstDateStr: string): string => {
  const days = [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
  ];
  return days[dayjs.tz(kstDateStr, KST).day()];
};

/**
 * MyPageContent[]를 ReadArticlesByDate[] 형태로 변환
 * readAt은 UTC ISO 문자열이므로 KST(Asia/Seoul) 기준으로 날짜 그룹화
 */
export const convertMyPageContentsToReadArticles = (
  contents: MyPageContent[],
): ReadArticlesByDate[] => {
  if (!contents || contents.length === 0) {
    return [];
  }

  // KST 기준으로 날짜별 그룹화
  const groupedByDate = contents.reduce(
    (acc, content) => {
      const readDate = dayjs(content.readAt).tz(KST).format('YYYY-MM-DD');
      if (!acc[readDate]) {
        acc[readDate] = [];
      }
      acc[readDate].push(content);
      return acc;
    },
    {} as Record<string, MyPageContent[]>,
  );

  // ReadArticlesByDate 형태로 변환
  return Object.entries(groupedByDate)
    .map(([date, articles]) => {
      return {
        date,
        dayOfWeek: getDayOfWeek(date),
        count: articles.length,
        articles,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
