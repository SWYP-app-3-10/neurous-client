// 카테고리 타입
export type NewsCategory =
  | '정치'
  | '경제'
  | '사회'
  | '생활/문화'
  | 'IT/과학'
  | '세계';

export interface NewsItems {
  imageUrl: any;
  id: string;
  category: NewsCategory;
  title: string;
  subtitle: string;
  readTime: string; // ex: "5분 소요"
  content: string;
  hits: number;
  read: boolean;
}
