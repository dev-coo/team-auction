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
Frontend + Backend: Next.js (App Router)
Database: Supabase (PostgreSQL)
Realtime: Supabase Realtime (WebSocket 대체)
Styling: Tailwind CSS
Deploy: Vercel
```

---

## 3. 상세 스택

### 3.1 Framework

| 구분 | 기술 | 버전 | 비고 |
|------|------|------|------|
| Framework | Next.js | 14+ | App Router 사용 |
| Language | TypeScript | 5+ | |
| Runtime | Node.js | 18+ | |

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

```
room:{roomId}
  ├── phase      # 페이즈 상태 (Broadcast)
  ├── auction    # 입찰/낙찰 이벤트 (Broadcast)
  ├── timer      # 타이머 동기화 (Broadcast)
  ├── chat       # 전체 채팅 (Broadcast)
  └── presence   # 접속자 상태 (Presence)

team:{teamId}
  └── chat       # 팀 채팅 (Broadcast)
```

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

## 5. 프로젝트 구조 (예상)

```
/app
  /page.tsx                 # 랜딩
  /create/page.tsx          # 경매 생성
  /room/[id]/
    /page.tsx               # 경매 진행
    /manage/page.tsx        # 주최자 관리
  /join/[code]/page.tsx     # 초대 링크 입장
  /result/[id]/page.tsx     # 결과

/components
  /auction/                 # 경매 관련 컴포넌트
  /chat/                    # 채팅 컴포넌트
  /ui/                      # 공통 UI

/lib
  /supabase.ts              # Supabase 클라이언트
  /realtime.ts              # Realtime 훅

/types
  /index.ts                 # 타입 정의
```

---

## 6. 주요 라이브러리

```json
{
  "dependencies": {
    "next": "^14",
    "@supabase/supabase-js": "^2",
    "framer-motion": "^10",
    "tailwindcss": "^3"
  }
}
```

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2025-11-29 | 최은우 | 최초 작성 |
