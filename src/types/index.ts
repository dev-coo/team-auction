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
  | "AUCTION_START"
  | "BID"
  | "TIMER_SYNC"
  | "SOLD"
  | "CHAT";

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}
