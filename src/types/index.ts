// 경매 페이즈
export type AuctionPhase =
  | "WAITING"
  | "CAPTAIN_INTRO"
  | "SHUFFLE"
  | "AUCTION"
  | "FINISHED";

// 참가자 역할
export type ParticipantRole = "HOST" | "CAPTAIN" | "MEMBER" | "OBSERVER";

// 경매방
export interface AuctionRoom {
  id: string;
  title: string;
  totalPoints: number;
  teamCount: number;
  memberPerTeam: number;
  phase: AuctionPhase;
  currentTargetId: string | null;
  hostCode: string;
  observerCode: string;
  createdAt: string;
}

// 참가자
export interface Participant {
  id: string;
  roomId: string;
  nickname: string;
  role: ParticipantRole;
  position: string;
  description: string | null;
  teamId: string | null;
  isOnline: boolean;
  isConfirmed: boolean;
  auctionOrder: number | null;
  createdAt: string;
}

// 팀
export interface Team {
  id: string;
  roomId: string;
  name: string;
  captainId: string | null;
  captainCode: string;
  captainPoints: number; // 팀장 포인트 (가치)
  currentPoints: number;
  color: string;
  createdAt: string;
}

// 입찰
export interface Bid {
  id: string;
  roomId: string;
  teamId: string;
  targetId: string;
  amount: number;
  createdAt: string;
}

// 채팅 메시지
export interface ChatMessage {
  id: string;
  roomId: string;
  teamId: string | null; // null이면 전체 채팅
  senderId: string;
  senderNickname: string;
  content: string;
  createdAt: string;
}

// 경매 결과
export interface AuctionResult {
  id: string;
  roomId: string;
  targetId: string;
  winnerTeamId: string;
  finalPrice: number;
  order: number;
  createdAt: string;
}

// Realtime 이벤트 타입
export type RealtimeEventType =
  | "PHASE_CHANGE"
  | "CAPTAIN_INDEX_CHANGE"
  | "SHUFFLE_START"
  | "SHUFFLE_REVEAL"
  | "SHUFFLE_COMPLETE"
  | "AUCTION_START"
  | "NEXT_TARGET"
  | "BID"
  | "TIMER_SYNC"
  | "SOLD"
  | "PASSED"
  | "NEXT_ROUND"
  | "AUTO_ASSIGN"
  | "CHAT"
  | "ANNOUNCE"
  | "RANDOM_ASSIGN_START"
  | "RANDOM_ASSIGN_ANIMATING"
  | "RANDOM_ASSIGN_COMPLETE";

// AUCTION 페이즈 Realtime 이벤트 페이로드
export interface AuctionStartPayload {
  targetId: string;
  targetIndex: number;
  totalTargets: number;
  startTime: number;
}

export interface BidPayload {
  teamId: string;
  teamName: string;
  teamColor: string;
  amount: number;
  timestamp: number;
  newTimer: number;
}

export interface SoldPayload {
  targetId: string;
  targetNickname: string;
  winnerTeamId: string;
  winnerTeamName: string;
  winnerTeamColor: string;
  finalPrice: number;
  nextTargetId: string | null;
  updatedPoints: Record<string, number>;
  isAutoAssignment?: boolean;
  auctionOrder: number;
}

export interface PassedPayload {
  targetId: string;
  nextTargetId: string | null;
  nextIndex: number;
}

export interface NextRoundPayload {
  round: number;
  firstTargetId: string;
  firstTargetIndex: number;
}

export interface AutoAssignPayload {
  assignments: { memberId: string; teamId: string; teamName: string; teamColor: string }[];
}

export interface NextTargetPayload {
  targetId: string;
  targetIndex: number;
}

// AUCTION 페이즈 상태
export interface BidRecord {
  teamId: string;
  teamName: string;
  teamColor: string;
  amount: number;
  timestamp: number;
}

export interface SoldInfo {
  targetId: string;
  targetNickname: string;
  winnerTeamId: string;
  winnerTeamName: string;
  winnerTeamColor: string;
  finalPrice: number;
  isAutoAssignment?: boolean;
}

export interface AuctionState {
  currentTargetId: string | null;
  currentTargetIndex: number;
  totalTargets: number;
  auctionQueue: string[];
  timer: number;
  timerRunning: boolean;
  currentPrice: number;
  highestBidTeamId: string | null;
  bidHistory: BidRecord[];
  bidLockUntil: number;
  showSoldAnimation: boolean;
  lastSoldInfo: SoldInfo | null;
  completedCount: number;
}

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}
