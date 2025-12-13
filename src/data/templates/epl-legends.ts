import { AuctionTemplate } from "./types";

/**
 * EPL 올타임 레전드 템플릿
 * 12개 클럽의 역대 레전드 5명씩 구성
 * 포지션: GK - DF - MF - MF - FW
 */
export const EPL_LEGENDS_TEMPLATE: AuctionTemplate = {
  metadata: {
    id: "epl-legends",
    name: "EPL 올타임 레전드",
    description: "프리미어리그 12개 클럽 역대 레전드",
    icon: "⚽",
    minTeams: 2,
    maxTeams: 12,
    membersPerTeam: 6, // 감독 1 + 선수 5
    defaultPoints: 1000,
  },
  teams: [
    {
      name: "맨유",
      captain: { nickname: "퍼거슨", position: "감독" },
      members: [
        { nickname: "슈마이켈", position: "GK" },
        { nickname: "퍼디난드", position: "DF" },
        { nickname: "스콜스", position: "MF" },
        { nickname: "깁스", position: "MF" },
        { nickname: "루니", position: "FW" },
      ],
    },
    {
      name: "리버풀",
      captain: { nickname: "클롭", position: "감독" },
      members: [
        { nickname: "알리송", position: "GK" },
        { nickname: "반다이크", position: "DF" },
        { nickname: "제라드", position: "MF" },
        { nickname: "알론소", position: "MF" },
        { nickname: "살라", position: "FW" },
      ],
    },
    {
      name: "아스날",
      captain: { nickname: "벵거", position: "감독" },
      members: [
        { nickname: "시먼", position: "GK" },
        { nickname: "캠벨", position: "DF" },
        { nickname: "비에라", position: "MF" },
        { nickname: "베르캄프", position: "MF" },
        { nickname: "앙리", position: "FW" },
      ],
    },
    {
      name: "첼시",
      captain: { nickname: "무리뉴", position: "감독" },
      members: [
        { nickname: "체흐", position: "GK" },
        { nickname: "테리", position: "DF" },
        { nickname: "램파드", position: "MF" },
        { nickname: "아자르", position: "MF" },
        { nickname: "드록바", position: "FW" },
      ],
    },
    {
      name: "맨시티",
      captain: { nickname: "과르디올라", position: "감독" },
      members: [
        { nickname: "에데르송", position: "GK" },
        { nickname: "콤파니", position: "DF" },
        { nickname: "실바", position: "MF" },
        { nickname: "데브라위너", position: "MF" },
        { nickname: "아게로", position: "FW" },
      ],
    },
    {
      name: "토트넘",
      captain: { nickname: "포체티노", position: "감독" },
      members: [
        { nickname: "요리스", position: "GK" },
        { nickname: "킹", position: "DF" },
        { nickname: "모드리치", position: "MF" },
        { nickname: "베일", position: "MF" },
        { nickname: "케인", position: "FW" },
      ],
    },
    {
      name: "뉴캐슬",
      captain: { nickname: "키건", position: "감독" },
      members: [
        { nickname: "기븐", position: "GK" },
        { nickname: "콜로치니", position: "DF" },
        { nickname: "지노라", position: "MF" },
        { nickname: "로버트", position: "MF" },
        { nickname: "시어러", position: "FW" },
      ],
    },
    {
      name: "에버튼",
      captain: { nickname: "모예스", position: "감독" },
      members: [
        { nickname: "하워드", position: "GK" },
        { nickname: "자기엘카", position: "DF" },
        { nickname: "아르테타", position: "MF" },
        { nickname: "필립넬빌", position: "MF" },
        { nickname: "루니(유스)", position: "FW" },
      ],
    },
    {
      name: "레스터",
      captain: { nickname: "라니에리", position: "감독" },
      members: [
        { nickname: "슈마이켈(K)", position: "GK" },
        { nickname: "모건", position: "DF" },
        { nickname: "캉테", position: "MF" },
        { nickname: "마레즈", position: "MF" },
        { nickname: "바디", position: "FW" },
      ],
    },
    {
      name: "애스턴빌라",
      captain: { nickname: "오닐", position: "감독" },
      members: [
        { nickname: "프리드만", position: "GK" },
        { nickname: "맥그라스", position: "DF" },
        { nickname: "배리", position: "MF" },
        { nickname: "영", position: "MF" },
        { nickname: "벤테케", position: "FW" },
      ],
    },
    {
      name: "웨스트햄",
      captain: { nickname: "파르듀", position: "감독" },
      members: [
        { nickname: "파비안스키", position: "GK" },
        { nickname: "페르디난드(R)", position: "DF" },
        { nickname: "노블", position: "MF" },
        { nickname: "팔라시오스", position: "MF" },
        { nickname: "디카니오", position: "FW" },
      ],
    },
    {
      name: "리즈",
      captain: { nickname: "오레어리", position: "감독" },
      members: [
        { nickname: "마틴", position: "GK" },
        { nickname: "우드게이트", position: "DF" },
        { nickname: "키웰", position: "MF" },
        { nickname: "보이어", position: "MF" },
        { nickname: "비두카", position: "FW" },
      ],
    },
  ],
};
