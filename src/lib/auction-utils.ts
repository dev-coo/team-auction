import {
  BID_UNIT_RULES,
  BID_UNIT_INCREMENT,
  BID_UNIT_PRICE_THRESHOLD,
} from "./constants";

/**
 * 현재 입찰가에 따른 최소 입찰 단위 계산
 * @param currentPrice 현재 입찰가
 * @returns 최소 입찰 단위
 *
 * @example
 * getMinBidUnit(50) // 5
 * getMinBidUnit(150) // 10
 * getMinBidUnit(450) // 25
 */
export function getMinBidUnit(currentPrice: number): number {
  // 기본 규칙 범위 내인 경우
  for (const rule of BID_UNIT_RULES) {
    if (currentPrice <= rule.maxPrice) {
      return rule.unit;
    }
  }

  // 400 이상인 경우: 100 단위마다 +5씩 증가
  // 예: 400-499 → 25, 500-599 → 30, 600-699 → 35
  const lastRuleMaxPrice = BID_UNIT_RULES[BID_UNIT_RULES.length - 1].maxPrice;
  const lastRuleUnit = BID_UNIT_RULES[BID_UNIT_RULES.length - 1].unit;

  const priceAboveLastRule = currentPrice - lastRuleMaxPrice;
  const additionalUnits =
    Math.floor(priceAboveLastRule / BID_UNIT_PRICE_THRESHOLD) *
    BID_UNIT_INCREMENT;

  return lastRuleUnit + additionalUnits;
}

/**
 * 다음 최소 입찰가 계산
 * @param currentPrice 현재 입찰가
 * @returns 다음 최소 입찰가
 */
export function getNextMinBid(currentPrice: number): number {
  return currentPrice + getMinBidUnit(currentPrice);
}

/**
 * 입찰 가능 여부 확인
 * @param currentPrice 현재 입찰가
 * @param bidAmount 입찰하려는 금액
 * @param availablePoints 보유 포인트
 * @returns 입찰 가능 여부
 */
export function canBid(
  currentPrice: number,
  bidAmount: number,
  availablePoints: number
): boolean {
  // 보유 포인트 확인
  if (bidAmount > availablePoints) {
    return false;
  }

  // 최소 입찰가 이상인지 확인
  const minBid = getNextMinBid(currentPrice);
  if (bidAmount < minBid) {
    return false;
  }

  return true;
}

/**
 * 팀원 순서 셔플
 * @param array 셔플할 배열
 * @returns 셔플된 배열
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 초를 분:초 형식으로 변환
 * @param seconds 초
 * @returns "MM:SS" 형식 문자열
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
