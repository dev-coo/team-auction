/**
 * 경매 템플릿 타입 정의
 * 향후 다른 리그/게임 템플릿 추가 가능한 확장 구조
 */

/** 선수/멤버 정보 */
export interface TemplateMember {
  nickname: string;
  position: string;
  description?: string;
}

/** 팀 정보 (팀장 + 멤버들) */
export interface TemplateTeam {
  name: string;
  captain: TemplateMember;
  members: TemplateMember[];
}

/** 템플릿 메타 정보 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  minTeams: number;
  maxTeams: number;
  membersPerTeam: number;
  defaultPoints: number;
}

/** 전체 템플릿 구조 */
export interface AuctionTemplate {
  metadata: TemplateMetadata;
  teams: TemplateTeam[];
}
