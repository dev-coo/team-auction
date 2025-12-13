import { AuctionTemplate } from "./types";
import { LCK_STOVE_LEAGUE_TEMPLATE } from "./lck-stove-league";
import { EPL_LEGENDS_TEMPLATE } from "./epl-legends";

export * from "./types";

/** 모든 템플릿 등록 */
export const TEMPLATES: Record<string, AuctionTemplate> = {
  [LCK_STOVE_LEAGUE_TEMPLATE.metadata.id]: LCK_STOVE_LEAGUE_TEMPLATE,
  [EPL_LEGENDS_TEMPLATE.metadata.id]: EPL_LEGENDS_TEMPLATE,
};

/** 모든 템플릿 목록 */
export function getAllTemplates(): AuctionTemplate[] {
  return Object.values(TEMPLATES);
}

/** 템플릿 ID로 조회 */
export function getTemplateById(id: string): AuctionTemplate | undefined {
  return TEMPLATES[id];
}
