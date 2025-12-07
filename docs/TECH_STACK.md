# 기술 스택 문서

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 팀 경매 사이트 |
| 버전 | v1.0 |
| 작성일 | 2025-12-01 |
| 작성자 | 최은우 |

---

## 2. 기술 스택 요약

```
Frontend + Backend: Next.js 16 (App Router)
Database: Supabase (PostgreSQL)
Realtime: Supabase Realtime (Broadcast + Presence)
Styling: Tailwind CSS 4
Animation: Framer Motion
Deploy: Vercel
```

---

## 3. 상세 스택

### 3.1 Framework

| 구분 | 기술 | 버전 | 비고 |
|------|------|------|------|
| Framework | Next.js | 16.0.7 | App Router 사용 |
| Language | TypeScript | 5+ | |
| Runtime | Node.js | 18+ | |
| React | React | 19.2.1 | |

### 3.2 Database & Realtime

| 구분 | 기술 | 비고 |
|------|------|------|
| Database | Supabase | PostgreSQL 기반, 무료 티어 가능 |
| Realtime | Supabase Realtime | 별도 WebSocket 서버 불필요 |
| Auth | Supabase Auth (선택) | 링크 기반이라 미사용 가능 |

> **WebSocket 대안으로 Supabase Realtime 선택 이유:**
> - Next.js는 서버리스 환경(Vercel)에서 WebSocket 직접 운영 어려움
> - Supabase Realtime은 DB 변경사항을 실시간 구독 가능
> - 채팅, 입찰, 타이머 동기화에 적합

### 3.3 Styling

| 구분 | 기술 | 비고 |
|------|------|------|
| CSS | Tailwind CSS | 빠른 개발 |
| Animation | Framer Motion | 셔플 애니메이션용 |

### 3.4 Deploy

| 구분 | 기술 | 비고 |
|------|------|------|
| Hosting | Vercel | Next.js 최적화 |
| Domain | Vercel 기본 제공 | 추후 커스텀 도메인 |

---

## 4. Supabase Realtime 활용 계획

### 4.1 Realtime 기능 분류

Supabase Realtime은 3가지 기능 제공:
- **Broadcast**: 클라이언트 간 메시지 전송 (DB 저장 X, 빠름)
- **Presence**: 접속자 상태 추적
- **DB Changes**: 테이블 변경사항 구독

### 4.2 기능별 Realtime 매핑

| 기능 | 방식 | 설명 |
|------|------|------|
| **경매 시작** | Broadcast | 주최자가 시작 버튼 → 전체에게 전파 |
| **페이즈 전환** | Broadcast | 대기→팀장소개→셔플→경매→종료 |
| **입찰** | Broadcast | 입찰 이벤트 실시간 전파 |
| **타이머 동기화** | Broadcast | 서버 기준 타이머 상태 동기화 |
| **낙찰** | Broadcast + DB | 낙찰 알림 + 결과 저장 |
| **채팅** | Broadcast | 메시지 실시간 전송 |
| **참가자 입장/퇴장** | Presence | 접속자 목록 실시간 갱신 |
| **팀 구성 변경** | DB Changes | 팀원 배정 시 UI 갱신 |

### 4.3 채널 구조

> **중요**: Broadcast와 Presence 채널을 분리해야 함. 같은 채널에서 함께 사용하면 충돌 발생.

```
room:{roomId}          # Broadcast 전용
  ├── PHASE_CHANGE     # 페이즈 상태
  ├── AUCTION_START    # 경매 시작
  ├── BID              # 입찰 이벤트
  ├── TIMER_SYNC       # 타이머 동기화
  ├── SOLD             # 낙찰
  └── CHAT             # 전체 채팅

presence:{roomId}      # Presence 전용
  └── 접속자 상태
```

> **참고**: 팀 채팅은 제공하지 않음 (팀원이 관전자 역할)

### 4.4 이벤트 예시

```typescript
// 페이즈 전환
{ type: 'PHASE_CHANGE', phase: 'SHUFFLE', timestamp: ... }

// 경매 시작
{ type: 'AUCTION_START', targetId: 'user123', timestamp: ... }

// 입찰
{ type: 'BID', teamId: 'teamA', amount: 150, timestamp: ... }

// 타이머
{ type: 'TIMER_SYNC', remaining: 12, timestamp: ... }

// 낙찰
{ type: 'SOLD', targetId: 'user123', winnerTeamId: 'teamA', price: 150 }
```

---

## 5. 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                    # 랜딩 페이지
│   ├── layout.tsx                  # 루트 레이아웃
│   ├── create/page.tsx             # 경매 생성
│   ├── join/[code]/page.tsx        # 초대 링크 입장
│   └── room/[id]/
│       ├── page.tsx                # 경매방 메인 (Realtime, 상태 관리)
│       └── components/
│           ├── DebugControls.tsx   # 디버그용 역할/페이즈 선택
│           └── phases/
│               ├── WaitingPhase.tsx      # 대기 페이즈
│               ├── CaptainIntroPhase.tsx # 팀장 소개 페이즈
│               ├── ShufflePhase.tsx      # 셔플 페이즈
│               ├── AuctionPhase.tsx      # 경매 진행 페이즈
│               ├── FinishedPhase.tsx     # 완료 페이즈
│               └── RandomAssignPhase.tsx # 유찰자 랜덤 배분
├── components/
│   └── InviteLinksModal.tsx        # 초대 링크 모달
├── lib/
│   ├── supabase.ts                 # Supabase 클라이언트
│   ├── constants.ts                # 상수 정의
│   ├── auction-utils.ts            # 입찰 단위 계산, 유틸리티
│   ├── realtime.ts                 # Realtime 커스텀 훅
│   └── api/
│       ├── auction.ts              # 경매방 CRUD, 입찰, 낙찰 API
│       └── participant.ts          # 참가자 API
└── types/
    └── index.ts                    # 타입 정의
```

---

## 6. 주요 라이브러리

```json
{
  "dependencies": {
    "next": "16.0.7",
    "react": "19.2.1",
    "@supabase/supabase-js": "^2.86.0",
    "framer-motion": "^12.23.24"
  },
  "devDependencies": {
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 7. 경매 페이즈별 역할 UI 매트릭스

| 페이즈 | HOST | CAPTAIN | OBSERVER/MEMBER |
|--------|------|---------|-----------------|
| WAITING | 팀장 입장 현황 + 다음 버튼 | 입장 완료 메시지 | 관전 모드 메시지 |
| CAPTAIN_INTRO | 팀장 소개 + 다음 버튼 | 팀장 목록 관전 | 팀장 목록 관전 |
| SHUFFLE | 셔플 애니메이션 + 다음 버튼 | 셔플 관전 | 셔플 관전 |
| AUCTION | 타이머/현황 + 다음 버튼 | **입찰 UI** | 관전 모드 |
| FINISHED | 결과 보기 버튼 | 결과 보기 버튼 | 결과 보기 버튼 |

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2025-11-29 | 최은우 | 최초 작성 |
| v1.1 | 2025-12-07 | Claude | 실제 구현 기준으로 전면 업데이트 |
