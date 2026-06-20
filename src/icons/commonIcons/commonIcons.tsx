import { ICON_SIZES } from '../config/iconSizes';
import Icon_back from '../../assets/svg/icon_back.svg';
import {
  createIconComponent,
  createRectangleIconComponent,
} from '../config/iconUtils';
import Level_change_check from '../../assets/svg/Level_change_check.svg';
import Check from '../../assets/svg/Check_.svg';
import Close from '../../assets/svg/Close_.svg';
import First from '../../assets/svg/First.svg';
import Second from '../../assets/svg/Second.svg';
import Third from '../../assets/svg/Third.svg';
import { scaleWidth } from '../../styles/global';
import Circle from '../../assets/svg/Circle.svg';
import Info from '../../assets/svg/Info.svg';
import RightArrow from '../../assets/svg/RightArrow.svg';
import Triangle from '../../assets/svg/Triangle.svg';
import Apple from '../../assets/svg/Apple.svg';
import Google from '../../assets/svg/Google.svg';
import Kakao from '../../assets/svg/Kakao.svg';
import Naver from '../../assets/svg/Naver.svg';
import Alarm from '../../assets/svg/Alarm.svg';
import Setting from '../../assets/svg/Setting.svg';
import Check_2 from '../../assets/svg/check_2.svg';
import Home from '../../assets/svg/home.svg';
import Search from '../../assets/svg/search.svg';
import Character from '../../assets/svg/character.svg';
import MyPage from '../../assets/svg/myPage.svg';
import BottomModalCheck from '../../assets/svg/bottomModalCheck.svg';
import Note from '../../assets/svg/note.svg';
import Clock from '../../assets/svg/clock.svg';
import NoArticles from '../../assets/svg/noArticles.svg';
import Search_tab from '../../assets/svg/search_tab.svg';
import View from '../../assets/svg/View.svg';
import P_Icon from '../../assets/svg/P_Icon.svg';
import XP_Icon from '../../assets/svg/XP_Icon.svg';
import X_icon from '../../assets/svg/X_icon.svg';

export const LevelChangeCheckIcon = createIconComponent(
  Level_change_check,
  scaleWidth(28),
);
export const Ic_backIcon = createIconComponent(Icon_back, ICON_SIZES.XL);
export const CircleIcon = createIconComponent(Circle, scaleWidth(14));
export const InfoIcon = createIconComponent(Info, ICON_SIZES.L);
export const InfoIcon_M = createIconComponent(Info, ICON_SIZES.M);
export const CloseIcon = createIconComponent(Close, scaleWidth(28));
export const ViewIcon = createIconComponent(View, scaleWidth(18));
export const TriangleIcon = createIconComponent(Triangle, ICON_SIZES.X3L);
export const AppleIcon = createIconComponent(Apple, ICON_SIZES.M);
export const GoogleIcon = createIconComponent(Google, ICON_SIZES.M);
export const KakaoIcon = createIconComponent(Kakao, ICON_SIZES.M);
export const NaverIcon = createIconComponent(Naver, ICON_SIZES.M);
export const AlarmIcon = createIconComponent(Alarm, scaleWidth(28));
export const SettingIcon = createIconComponent(Setting, scaleWidth(28));
export const HomeIcon = createIconComponent(Home, scaleWidth(28));
export const SearchIcon = createIconComponent(Search, scaleWidth(28));
export const Search_tab_Icon = createIconComponent(Search_tab, scaleWidth(28));
export const CharacterIcon = createIconComponent(Character, scaleWidth(28));
export const MyPageIcon = createIconComponent(MyPage, scaleWidth(28));
export const NoteIcon = createIconComponent(Note, scaleWidth(26));
export const ClockIcon = createIconComponent(Clock, scaleWidth(26));
export const PIcon = createIconComponent(P_Icon, scaleWidth(26));
export const XPIcon = createIconComponent(XP_Icon, scaleWidth(26));
export const XIcon = createIconComponent(X_icon, ICON_SIZES.S);
//  가로, 세로 크기 다름
export const CheckIcon = createRectangleIconComponent(
  Check,
  scaleWidth(12),
  scaleWidth(9),
);
export const Check_2Icon = createRectangleIconComponent(
  Check_2,
  scaleWidth(10),
  scaleWidth(6),
);
export const BottomModalCheckIcon = createRectangleIconComponent(
  BottomModalCheck,
  scaleWidth(13),
  scaleWidth(10),
);
export const FirstIcon = createRectangleIconComponent(
  First,
  scaleWidth(55),
  scaleWidth(44),
);
export const SecondIcon = createRectangleIconComponent(
  Second,
  scaleWidth(58),
  scaleWidth(44),
);
export const ThirdIcon = createRectangleIconComponent(
  Third,
  scaleWidth(58),
  scaleWidth(44),
);
export const RightArrowIcon = createRectangleIconComponent(
  RightArrow,
  scaleWidth(7),
  scaleWidth(12),
);
export const NoArticlesIcon = createRectangleIconComponent(
  NoArticles,
  scaleWidth(64),
  scaleWidth(62),
);
