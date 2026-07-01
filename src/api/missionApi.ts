/**
 * 미션 관련 API 모듈
 *
 * 오늘의 미션/추천 콘텐츠 조회, 글 상세/접근 권한/구매,
 * 완독 체크, 난이도 제출, 퀴즈 조회/제출 등
 * 미션 화면 전반에서 사용하는 서버 API 호출 함수 정의
 */

import client from './client';
import { getImageUrl } from '../utils/imageUtils';

// ─────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────

/**
 * 오늘의 미션 화면 - 추천 콘텐츠 아이템 타입
 *
 * @property contentId       콘텐츠 고유 ID
 * @property contentTitle    글 제목
 * @property contentImg      썸네일 이미지 URL
 * @property contentCategory 카테고리 코드 (예: "ECONOMY")
 * @property contentDate     발행일
 * @property readingTime     예상 읽기 시간 (분)
 */
export interface MissionContent {
  contentId: number;
  contentTitle: string;
  contentImg: string;
  contentCategory: string;
  contentDate: string;
  readingTime: number;
}

/**
 * 오늘의 미션 아이템 타입
 *
 * @property missionType     미션 식별 타입 (예: "READ_ARTICLE")
 * @property title           미션 제목
 * @property currentProgress 현재 진행 수치
 * @property targetGoal      목표 수치
 * @property isCompleted     완료 여부
 * @property isLocked        잠김 여부 (전 단계 미완료 시 true)
 */
export interface MissionToday {
  missionType: string;
  title: string;
  currentProgress: number;
  targetGoal: number;
  isCompleted: boolean;
  isLocked: boolean;
}

/**
 * 오늘의 미션 API 응답 data 필드 타입
 *
 * @property contents  오늘의 추천 콘텐츠 목록
 * @property missions  오늘의 미션 목록
 */
export interface MissionTodayResponse {
  contents: MissionContent[];
  missions: MissionToday[];
}

/**
 * 오늘의 미션 API 전체 응답 타입
 *
 * @property status   HTTP 상태 코드
 * @property message  안내 메시지
 * @property data     추천 콘텐츠 및 미션 목록
 */
export interface MissionTodayApiResponse {
  status: number;
  message: string;
  data: MissionTodayResponse;
}

/**
 * 글 상세 정보 타입
 *
 * userApi의 ReadContentDetailContent에서 재사용됨.
 *
 * @property contentId       콘텐츠 고유 ID
 * @property title           글 제목
 * @property content         본문 내용
 * @property contentCategory 카테고리 코드 (예: "ECONOMY")
 * @property categoryName    카테고리 이름 (예: "경제")
 * @property contentDate     발행일
 * @property hits            조회수
 * @property imageUrl        대표 이미지 URL
 */
export interface ContentDetail {
  contentId: number;
  title: string;
  content: string;
  contentCategory: string;
  categoryName: string;
  contentDate: string;
  hits: number;
  imageUrl: string;
}

/**
 * 글 상세 조회 API 응답 타입
 */
export interface ContentDetailResponse {
  status: number;
  message: string;
  data: ContentDetail;
}

/**
 * 글 접근 권한 확인 응답 타입
 *
 * 유저가 해당 글을 읽을 수 있는지, 포인트가 부족한지 등을 담음.
 *
 * @property accessType     접근 타입 (예: "POINT_USE" — 포인트 소모 필요)
 * @property title          안내 제목
 * @property message        안내 메시지
 * @property currentPoints  현재 보유 포인트
 * @property requiredPoints 읽기에 필요한 포인트
 * @property lackOfPoints   부족한 포인트 (음수일 때 의미 있음)
 * @property rewardPoints   읽기 완료 시 획득 포인트
 * @property readable       현재 읽기 가능 여부
 */
export interface ContentAccessResponse {
  accessType: string;
  title: string;
  message: string;
  currentPoints: number;
  requiredPoints: number;
  lackOfPoints: number;
  rewardPoints: number;
  readable: boolean;
}

/**
 * 글 접근 권한 확인 API 응답 타입
 */
export interface ContentAccessApiResponse {
  status: number;
  message: string;
  data: ContentAccessResponse;
}

/**
 * 콘텐츠 구매 API 응답 타입 (포인트/광고 공통)
 *
 * @property status   HTTP 상태 코드
 * @property message  안내 메시지
 * @property data     처리 결과 문자열
 */
export interface PurchaseContentResponse {
  status: number;
  message: string;
  data: string;
}

/**
 * 레벨업 정보 타입
 *
 * 완독 체크 또는 퀴즈 제출 응답에서 레벨업이 발생한 경우 포함됨.
 *
 * @property title         레벨업 안내 제목
 * @property message       레벨업 안내 메시지
 * @property profileUrl    새 레벨 캐릭터 이미지 URL
 * @property levelCode     새 레벨 코드 (예: "LEVEL_2")
 * @property characterName 새 레벨 캐릭터 이름
 */
export interface LevelUpInfo {
  title: string;
  message: string;
  profileUrl: string;
  levelCode: string;
  characterName: string;
}

/**
 * 완독 체크 응답 타입
 *
 * @property levelUpInfo  레벨업 발생 시 포함 (없으면 undefined)
 * @property completed    완독 처리 성공 여부
 * @property levelUp      레벨업 발생 여부
 */
export interface ReadStatusResponse {
  levelUpInfo?: LevelUpInfo;
  completed: boolean;
  levelUp: boolean;
}

/**
 * 완독 체크 API 응답 타입
 */
export interface ReadStatusApiResponse {
  status: number;
  message: string;
  data: ReadStatusResponse;
}

/**
 * 난이도 전송 API 응답 타입
 */
export interface SubmitDifficultyResponse {
  status: number;
  message: string;
  data: string;
}

/**
 * 퀴즈와 연결된 아티클 정보 타입
 */
export interface QuizContent {
  contentId: number;
  title: string;
  content: string;
  contentDate: string;
  contentCategory: string;
  contentLevel: string;
  imageUrl: string;
  batchTime: string;
  hits: number;
}

/**
 * 퀴즈 선택지 타입
 *
 * @property quizChoiceId 선택지 고유 ID
 * @property choiceNo     선택지 번호 (1~4)
 * @property choiceText   선택지 텍스트
 * @property quiz         연결된 퀴즈 식별자
 * @property correct      정답 여부
 */
export interface QuizChoice {
  quizChoiceId: number;
  choiceNo: number;
  choiceText: string;
  quiz: string;
  correct: boolean;
}

/**
 * 퀴즈 조회 응답 타입
 *
 * @property quizId       퀴즈 고유 ID
 * @property quizNum      퀴즈 번호
 * @property content      퀴즈와 연결된 아티클 정보
 * @property quizContent  퀴즈 질문 텍스트 (구버전 필드명 question에서 변경됨)
 * @property quizDiff     퀴즈 난이도
 * @property quizCategory 퀴즈 카테고리
 * @property choices      선택지 배열
 */
export interface QuizResponse {
  quizId: number;
  quizNum: number;
  content: QuizContent;
  quizContent: string; // question → quizContent로 필드명 변경됨
  quizDiff: string;
  quizCategory: string;
  choices: QuizChoice[];
}

/**
 * 퀴즈 조회 API 응답 타입
 */
export interface QuizApiResponse {
  status: number;
  message: string;
  data: QuizResponse;
}

/**
 * 퀴즈 제출 요청 바디 타입
 *
 * @property quizId        제출할 퀴즈 ID
 * @property selectedNo    선택한 답안 번호
 * @property readContentId 읽은 콘텐츠 ID (퀴즈와 연결된 아티클)
 */
export interface SubmitQuizRequest {
  quizId: number;
  selectedNo: number;
  readContentId: number;
}

/**
 * 퀴즈 채점 결과 타입
 *
 * @property quizId            제출된 퀴즈 ID
 * @property selectedNo        선택한 답안 번호
 * @property isAnswerCorrect   정답 여부
 * @property correctChoiceNo   정답 선택지 번호
 * @property correctChoiceText 정답 선택지 텍스트
 */
export interface QuizResultResponse {
  quizId: number;
  selectedNo: number;
  isAnswerCorrect: boolean;
  correctChoiceNo: number;
  correctChoiceText: string;
}

/**
 * 퀴즈 제출 리워드 타입
 *
 * @property earnedPoint 퀴즈 제출로 획득한 포인트
 * @property earnedExp   퀴즈 제출로 획득한 경험치
 */
export interface RewardResponse {
  earnedPoint: number;
  earnedExp: number;
}

/**
 * 퀴즈 제출 시 레벨업 정보 타입
 */
export interface UserLevelInformation {
  title: string;
  message: string;
  profileUrl: string;
  levelCode: string;
  characterName: string;
}

/**
 * 퀴즈 제출 응답 data 필드 타입
 *
 * @property quizResultResponse   채점 결과
 * @property rewardResponse       획득 리워드
 * @property userLevelInformation 레벨업 발생 시 포함 (없으면 undefined)
 */
export interface SubmitQuizData {
  quizResultResponse: QuizResultResponse;
  rewardResponse: RewardResponse;
  userLevelInformation?: UserLevelInformation;
}

/**
 * 퀴즈 제출 API 응답 타입
 */
export interface SubmitQuizApiResponse {
  status: number;
  message: string;
  data: SubmitQuizData;
}

// ─────────────────────────────────────────────────────────────
// API 함수
// ─────────────────────────────────────────────────────────────

/**
 * 오늘의 미션 화면 조회
 *
 * [엔드포인트] GET /api/mission/today?userId={userId}
 *
 * 오늘의 추천 콘텐츠 목록과 미션 목록을 한 번에 반환함.
 *
 * @param userId  현재 로그인된 유저 ID
 * @returns       추천 콘텐츠 목록 + 미션 목록
 * @throws        네트워크 오류 또는 서버 에러 시 에러
 */
export const fetchMissionToday = async (
  userId: number,
): Promise<MissionTodayApiResponse> => {
  try {
    const response = await client.get<MissionTodayApiResponse>(
      `/api/mission/today?userId=${userId}`,
    );
    return response.data;
  } catch (error: any) {
    console.error('[오늘의 미션 API] 에러:', error);
    if (error.response) {
      console.error('[오늘의 미션 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 특정 미션 조회
 *
 * [엔드포인트] GET /missions/:missionId
 *
 * @param missionId  조회할 미션 ID
 * @returns          미션 데이터 또는 null (에러 시 null 반환)
 */
export const fetchMissionById = async (
  missionId: number,
): Promise<any | null> => {
  try {
    const response = await client.get<any>(`/missions/${missionId}`);
    return response.data;
  } catch (error) {
    console.error('미션 조회 실패:', error);
    return null; // 에러 시 null 반환 (상위에서 처리)
  }
};

/**
 * 미션 진행도 업데이트
 *
 * ⚠️ 미구현 상태 (TODO). 호출 시 에러 throw됨.
 */
export const updateMissionProgress = async (
  _missionId: number,
  _current: number,
): Promise<any> => {
  // TODO: 미션 진행도 업데이트 API 구현
  throw new Error('Not implemented');
};

/**
 * 글 상세 정보 조회
 *
 * [엔드포인트] GET /api/content/:contentId?userId={userId}&isFromHome={isFromHome}
 *
 * 응답의 imageUrl을 getImageUrl 유틸로 변환해 절대 URL로 보정함.
 * isFromHome은 홈(미션) 화면에서 진입했는지 여부를 서버에 전달해
 * 미션 달성 카운트 처리에 사용됨.
 *
 * @param userId     현재 로그인된 유저 ID
 * @param isFromHome 홈(미션) 화면에서 진입했는지 여부 (기본값 false)
 * @param contentId  조회할 콘텐츠 ID
 * @returns          글 상세 데이터 (이미지 URL 보정 포함)
 * @throws           네트워크 오류 또는 서버 에러 시 에러
 */
export const fetchContentDetail = async (
  userId: number,
  isFromHome: boolean,
  contentId: number,
): Promise<ContentDetailResponse> => {
  try {
    console.log(
      `[글 상세 API] 요청: /api/content/${contentId}?userId=${userId}&isFromHome=${isFromHome}`,
    );

    const response = await client.get<ContentDetailResponse>(
      `/api/content/${contentId}?userId=${userId}&isFromHome=${isFromHome}`,
    );

    // 이미지 URL이 상대 경로로 오는 경우 절대 URL로 변환
    if (response.data.data?.imageUrl) {
      response.data.data.imageUrl = getImageUrl(response.data.data.imageUrl);
    }

    return response.data;
  } catch (error: any) {
    console.error('[글 상세 API] 에러:', error);
    if (error.response) {
      console.error('[글 상세 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 글 접근 권한 확인
 *
 * [엔드포인트] GET /api/content/:contentId/access?userId={userId}
 *
 * 유저가 해당 글을 읽을 수 있는지(포인트 충분 여부 등)를 확인함.
 * 응답의 readable 값으로 구매 모달 표시 여부 결정.
 *
 * @param userId     현재 로그인된 유저 ID
 * @param contentId  접근 권한을 확인할 콘텐츠 ID
 * @returns          접근 가능 여부 및 포인트 정보
 * @throws           네트워크 오류 또는 서버 에러 시 에러
 */
export const fetchContentAccess = async (
  userId: number,
  contentId: number,
): Promise<ContentAccessApiResponse> => {
  try {
    const response = await client.get<ContentAccessApiResponse>(
      `/api/content/${contentId}/access?userId=${userId}`,
    );
    return response.data;
  } catch (error: any) {
    console.error('[글 접근 권한 API] 에러:', error);
    if (error.response) {
      console.error('[글 접근 권한 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 포인트로 콘텐츠 구매
 *
 * [엔드포인트] POST /api/content/:contentId/purchase/point?userId={userId}
 *
 * 유저의 포인트를 차감하고 해당 콘텐츠 읽기 권한을 부여함.
 *
 * @param userId     현재 로그인된 유저 ID
 * @param contentId  구매할 콘텐츠 ID
 * @returns          구매 처리 결과
 * @throws           포인트 부족 / 네트워크 오류 시 에러
 */
export const purchaseContentWithPoint = async (
  userId: number,
  contentId: number,
): Promise<PurchaseContentResponse> => {
  try {
    const response = await client.post<PurchaseContentResponse>(
      `/api/content/${contentId}/purchase/point?userId=${userId}`,
    );
    return response.data;
  } catch (error: any) {
    console.error('[포인트 구매 API] 에러:', error);
    if (error.response) {
      console.error('[포인트 구매 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 광고 시청으로 콘텐츠 구매
 *
 * [엔드포인트] POST /api/content/:contentId/purchase/ad?userId={userId}
 *
 * 광고 시청 완료 후 호출. 포인트 대신 광고 시청으로 읽기 권한 부여.
 *
 * @param userId     현재 로그인된 유저 ID
 * @param contentId  구매할 콘텐츠 ID
 * @returns          구매 처리 결과
 * @throws           네트워크 오류 또는 서버 에러 시 에러
 */
export const purchaseContentWithAd = async (
  userId: number,
  contentId: number,
): Promise<PurchaseContentResponse> => {
  try {
    const response = await client.post<PurchaseContentResponse>(
      `/api/content/${contentId}/purchase/ad?userId=${userId}`,
    );
    return response.data;
  } catch (error: any) {
    console.error('[광고 구매 API] 에러:', error);
    if (error.response) {
      console.error('[광고 구매 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 완독 여부 체크
 *
 * [엔드포인트] POST /api/content/:contentId/read-status?userId={userId}
 *
 * 유저가 글을 읽는 동안 주기적으로, 그리고 읽기 완료 시 호출.
 * 서버가 체류 시간과 완독 여부를 기반으로 경험치/포인트를 지급하고
 * 레벨업 여부를 응답에 포함함.
 *
 * @param userId       현재 로그인된 유저 ID
 * @param contentId    읽고 있는 콘텐츠 ID
 * @param staySeconds  현재까지의 체류 시간 (초)
 * @param isCompleted  완독 완료 여부
 * @returns            완독 처리 결과 및 레벨업 정보
 * @throws             네트워크 오류 또는 서버 에러 시 에러
 */
export const checkReadStatus = async (
  userId: number,
  contentId: number,
  staySeconds: number,
  isCompleted: boolean,
): Promise<ReadStatusApiResponse> => {
  try {
    const response = await client.post<ReadStatusApiResponse>(
      `/api/content/${contentId}/read-status?userId=${userId}`,
      {
        staySeconds,
        isCompleted,
      },
    );
    return response.data;
  } catch (error: any) {
    console.error('[완독 체크 API] 에러:', error);
    if (error.response) {
      console.error('[완독 체크 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 난이도 전송
 *
 * [엔드포인트] POST /api/content/:contentId/difficulty?userId={userId}&difficulty={difficulty}
 *
 * 유저가 글을 읽고 느낀 난이도를 서버에 전송함.
 * 향후 콘텐츠 추천 알고리즘에 활용됨.
 *
 * @param userId      현재 로그인된 유저 ID
 * @param contentId   난이도를 전송할 콘텐츠 ID
 * @param difficulty  선택한 난이도 ('EASY' | 'MEDIUM' | 'HARD')
 * @returns           처리 결과
 * @throws            네트워크 오류 또는 서버 에러 시 에러
 */
export const submitDifficulty = async (
  userId: number,
  contentId: number,
  difficulty: 'EASY' | 'MEDIUM' | 'HARD',
): Promise<SubmitDifficultyResponse> => {
  try {
    const response = await client.post<SubmitDifficultyResponse>(
      `/api/content/${contentId}/difficulty?userId=${userId}&difficulty=${difficulty}`,
    );
    return response.data;
  } catch (error: any) {
    console.error('[난이도 전송 API] 에러:', error);
    if (error.response) {
      console.error('[난이도 전송 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 퀴즈 조회
 *
 * [엔드포인트] GET /api/quiz/:contentId?userId={userId}
 *
 * 특정 콘텐츠에 연결된 퀴즈 문제와 선택지를 가져옴.
 *
 * @param userId     현재 로그인된 유저 ID
 * @param contentId  퀴즈를 조회할 콘텐츠 ID
 * @returns          퀴즈 문제 및 선택지
 * @throws           네트워크 오류 또는 서버 에러 시 에러
 */
export const fetchQuiz = async (
  userId: number,
  contentId: number,
): Promise<QuizApiResponse> => {
  try {
    const response = await client.get<QuizApiResponse>(
      `/api/quiz/${contentId}?userId=${userId}`,
    );
    return response.data;
  } catch (error: any) {
    console.error('[퀴즈 조회 API] 에러:', error);
    if (error.response) {
      console.error('[퀴즈 조회 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

/**
 * 퀴즈 정답 제출
 *
 * [엔드포인트] POST /api/quiz/submit?userId={userId}
 *
 * 유저가 선택한 답안을 제출하고 채점 결과와 리워드를 받음.
 * 응답의 userLevelInformation이 있으면 레벨업 발생.
 *
 * @param userId       현재 로그인된 유저 ID
 * @param requestBody  제출할 퀴즈 ID, 선택 답안, 연결 콘텐츠 ID
 * @returns            채점 결과, 획득 리워드, 레벨업 정보(선택)
 * @throws             네트워크 오류 또는 서버 에러 시 에러
 */
export const submitQuiz = async (
  userId: number,
  requestBody: SubmitQuizRequest,
): Promise<SubmitQuizApiResponse> => {
  try {
    const response = await client.post<SubmitQuizApiResponse>(
      `/api/quiz/submit?userId=${userId}`,
      requestBody,
    );
    return response.data;
  } catch (error: any) {
    console.error('[퀴즈 제출 API] 에러:', error);
    if (error.response) {
      console.error('[퀴즈 제출 API] 서버 응답:', {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// 변환 함수
// ─────────────────────────────────────────────────────────────

/**
 * MissionToday → 미션 화면용 형식 변환
 *
 * 서버 MissionToday 객체를 미션 화면 컴포넌트가 기대하는 형태로 변환함.
 *
 * @param missionToday  변환할 MissionToday 객체
 * @param index         배열 내 인덱스 (id 생성: index + 1)
 * @returns             화면용 미션 객체
 *                      - status: "완료" | "진행 중" | null(잠김)
 */
export const convertMissionTodayToMission = (
  missionToday: MissionToday,
  index: number,
): any => {
  return {
    id: index + 1, // 임시 ID (missionType 기반으로 변경 가능)
    title: missionToday.title,
    current: missionToday.currentProgress,
    total: missionToday.targetGoal,
    // isCompleted → "완료" / isLocked → null(잠김) / 그 외 → "진행 중"
    status: missionToday.isCompleted
      ? '완료'
      : missionToday.isLocked
        ? null
        : '진행 중',
  };
};

/**
 * MissionContent → ArticleCard 형식 변환
 *
 * 미션 화면의 추천 콘텐츠를 ArticleCard 컴포넌트가 기대하는 형태로 변환함.
 * 카테고리 코드(영문)를 한글 이름으로 매핑하며,
 * 매핑되지 않은 코드는 원본 값을 그대로 사용.
 *
 * @param content  변환할 MissionContent 객체
 * @param index    배열 내 인덱스 (임시 id 생성에 사용)
 * @returns        ArticleCard 형식 객체
 */
export const convertMissionContentToArticle = (
  content: MissionContent,
  index: number,
): {
  id: number;
  title: string;
  category: string;
  readTime: string;
  date: string;
  imageUrl: string;
  contentId: number;
} => {
  // 서버 카테고리 코드 → 화면 표시용 한글 이름 매핑
  const categoryMap: Record<string, string> = {
    LIFE_CULTURE: '생활/문화',
    SOCIETY: '사회',
    ECONOMY: '경제',
    POLITICS: '정치',
    IT_SCIENCE: 'IT/과학',
    WORLD: '세계',
  };

  return {
    id: index, // 임시 ID
    title: content.contentTitle,
    category: categoryMap[content.contentCategory] || content.contentCategory,
    readTime: `${content.readingTime ?? 0}분`,
    date: content.contentDate,
    imageUrl: getImageUrl(content.contentImg), // 절대 URL로 변환
    contentId: content.contentId,
  };
};
