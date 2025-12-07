// 경매 기본 설정
export const DEFAULT_TOTAL_POINTS = 1000;
export const DEFAULT_TEAM_COUNT = 5;
export const DEFAULT_MEMBER_PER_TEAM = 4;

// 타이머 설정 (0.1초 단위, 30초 = 300, 2초 = 20, 5초 = 50)
export const INITIAL_TIMER_SECONDS = 300; // 30.0초
export const BID_TIME_EXTENSION_SECONDS = 20; // 2.0초
export const MIN_TIMER_THRESHOLD = 50; // 5.0초 (이하면 5초로 고정)
export const TIMER_INTERVAL_MS = 100; // 0.1초마다 갱신

// 입찰 단위 계산 규칙
// 현재가에 따라 최소 입찰 단위가 동적으로 변경됨
export const BID_UNIT_RULES = [
  { maxPrice: 99, unit: 5 },
  { maxPrice: 199, unit: 10 },
  { maxPrice: 299, unit: 15 },
  { maxPrice: 399, unit: 20 },
  // 이후 100 단위마다 +5씩 증가
] as const;

// 입찰 단위 증가 규칙 (400 이상)
export const BID_UNIT_INCREMENT = 5;
export const BID_UNIT_PRICE_THRESHOLD = 100;

// 팀 색상
export const TEAM_COLORS = [
  "#EF4444", // red
  "#F59E0B", // orange
  "#EAB308", // yellow
  "#10B981", // green
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#6366F1", // indigo
] as const;

// Realtime 채널 이름
export const getChannelName = {
  room: (roomId: string) => `room:${roomId}`,
  presence: (roomId: string) => `presence:${roomId}`,
} as const;

// Realtime 이벤트 타입
export const REALTIME_EVENTS = {
  PHASE_CHANGE: "PHASE_CHANGE",
  AUCTION_START: "AUCTION_START",
  BID: "BID",
  TIMER_SYNC: "TIMER_SYNC",
  SOLD: "SOLD",
  CHAT: "CHAT",
} as const;
