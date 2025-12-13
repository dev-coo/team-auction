# Architecture Overview

## Route Structure
```
src/app/
├── page.tsx              # 랜딩 페이지
├── create/page.tsx       # 경매 생성
├── room/[id]/page.tsx    # 경매 진행 (메인)
├── join/[code]/page.tsx  # 초대 링크 입장
└── result/[id]/          # 결과 (예정)
```

## Auction Room Page (`src/app/room/[id]/`)
페이즈별 컴포넌트로 분리:
```
src/app/room/[id]/
├── page.tsx                    # 메인 (레이아웃, Realtime, DB fetch)
├── components/
│   ├── DebugControls.tsx       # 디버그용 역할/페이즈 선택
│   └── phases/
│       ├── WaitingPhase.tsx    # WAITING
│       ├── CaptainIntroPhase.tsx # CAPTAIN_INTRO
│       ├── ShufflePhase.tsx    # SHUFFLE
│       ├── AuctionPhase.tsx    # AUCTION
│       ├── RandomAssignPhase.tsx # 랜덤 배분
│       └── FinishedPhase.tsx   # FINISHED
```

## Phase-Role UI Matrix
| Phase | HOST | CAPTAIN | OBSERVER |
|-------|------|---------|----------|
| WAITING | 팀장 입장 현황 + 다음 | 입장 완료 메시지 | 관전 모드 |
| CAPTAIN_INTRO | 팀장 소개 + 다음 | 목록 관전 | 목록 관전 |
| SHUFFLE | 셔플 애니메이션 + 다음 | 셔플 관전 | 셔플 관전 |
| AUCTION | 타이머/현황 + 다음 | **입찰 UI** | 관전 모드 |
| FINISHED | 결과 보기 | 결과 보기 | 결과 보기 |

## Role Detection (`page.tsx`)
1. localStorage `participant_id_{roomId}` → 해당 참가자 역할
2. localStorage `host_code_{roomId}` → HOST
3. 둘 다 없으면 → OBSERVER

## Core Types (`src/types/index.ts`)
- `AuctionPhase`: WAITING | CAPTAIN_INTRO | SHUFFLE | AUCTION | FINISHED
- `ParticipantRole`: HOST | CAPTAIN | MEMBER | OBSERVER
- `AuctionRoom`, `Participant`, `Team`, `Bid`, `AuctionResult`

## Realtime Hooks (`src/lib/realtime.ts`)
```typescript
// Broadcast (이벤트 전송/수신)
const { channel, broadcast } = useRoomChannel(roomId, onEvent);

// Presence (접속자 상태)
const { onlineUsers } = usePresence(roomId, participantId, userInfo);

// DB Changes (테이블 변경 감지)
useDbChanges("participants", filter, onChange);
```

## API Functions (`src/lib/api/auction.ts`)
- `createAuction()` - 경매방 생성
- `getAuctionById()` - 경매방 조회
- `createBid()` - 입찰 기록
- `recordSold()` - 낙찰 처리
- `updateTeamPoints()` - 팀 포인트 업데이트
- `saveAuctionStartState()` - 경매 시작 상태 저장
- `saveBidState()` - 입찰 상태 저장
