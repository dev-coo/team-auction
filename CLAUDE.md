# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

팀 경매 사이트 - 리그오브레전드 등 팀 게임에서 팀장이 포인트로 팀원을 입찰하는 실시간 경매 시스템

## Commands

```bash
pnpm dev      # 개발 서버 (http://localhost:3000)
pnpm build    # 프로덕션 빌드
pnpm lint     # ESLint 실행
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime (Broadcast, Presence, DB Changes)
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion

## Architecture

### Route Structure
```
src/app/
  page.tsx              # 랜딩
  create/               # 경매 생성
  room/[id]/            # 경매 진행
  join/[code]/          # 초대 링크 입장
  result/[id]/          # 결과
```

### Auction Room Page (`src/app/room/[id]/`)

경매 진행 페이지는 페이즈별 컴포넌트로 분리하여 개발 중:

```
src/app/room/[id]/
  page.tsx                    # 메인 페이지 (레이아웃, Realtime 연결, DB 데이터 fetch)
  components/
    DebugControls.tsx         # 디버그용 역할/페이즈 강제 선택 UI
    phases/
      WaitingPhase.tsx        # ✅ WAITING 페이즈 (역할별 UI + 인프라 연동 완료)
      CaptainIntroPhase.tsx   # ⏳ CAPTAIN_INTRO 페이즈 (예정)
      ShufflePhase.tsx        # ⏳ SHUFFLE 페이즈 (예정)
      AuctionPhase.tsx        # ⏳ AUCTION 페이즈 (예정)
      FinishedPhase.tsx       # ⏳ FINISHED 페이즈 (예정)
```

#### 페이즈별 역할 UI 매트릭스

| 페이즈 | HOST | CAPTAIN | OBSERVER |
|--------|------|---------|----------|
| WAITING | 팀장 입장 현황 + 다음 버튼 | 입장 완료 메시지 | 관전 모드 메시지 |
| CAPTAIN_INTRO | 팀장 소개 + 다음 버튼 | 팀장 목록 관전 | 팀장 목록 관전 |
| SHUFFLE | 셔플 애니메이션 + 다음 버튼 | 셔플 관전 | 셔플 관전 |
| AUCTION | 타이머/현황 + 다음 버튼 | **입찰 UI** | 관전 모드 |
| FINISHED | 결과 보기 버튼 | 결과 보기 버튼 | 결과 보기 버튼 |

#### 개발 진행 방식
- **순서**: 페이즈별 UI → 인프라 연동 → 다음 페이즈 UI → 다음 인프라
- **현재**: WAITING 페이즈 완료 (UI + 인프라), CAPTAIN_INTRO 예정
- **타이머**: Edge Function (서버리스)으로 서버 기준 타이머 (AUCTION 페이즈)
- **낙찰 후 진행**: 주최자가 "다음" 버튼 클릭

#### 역할 판별 (`page.tsx`)
- localStorage에서 `participant_id_{roomId}` → 해당 참가자 역할
- localStorage에서 `host_code_{roomId}` → HOST
- 둘 다 없으면 → OBSERVER

### Core Types (`src/types/index.ts`)
- `AuctionPhase`: WAITING → CAPTAIN_INTRO → SHUFFLE → AUCTION → FINISHED
- `ParticipantRole`: HOST | CAPTAIN | MEMBER | OBSERVER
- `AuctionRoom`, `Participant`, `Team`, `Bid`, `ChatMessage`, `AuctionResult`

### Realtime Channel Structure
```
room:{roomId}        # Broadcast 전용 (페이즈, 입찰, 타이머, 채팅)
presence:{roomId}    # Presence 전용 (접속자 상태) - 분리 필수!
team:{teamId}        # 팀 채팅 (Broadcast)
```

**주의**: `room:` 채널과 `presence:` 채널을 분리해야 함. 같은 채널명으로 Broadcast와 Presence를 함께 사용하면 충돌 발생.

### Lib Modules

```
src/lib/
  supabase.ts        # Supabase 클라이언트
  constants.ts       # 설정값, 색상, 이벤트 타입 상수
  auction-utils.ts   # 입찰 단위 계산, 셔플, 포맷 유틸리티
  realtime.ts        # Supabase Realtime 커스텀 훅
  api/
    auction.ts       # 경매방 CRUD API 함수
```

### Realtime Hooks (`src/lib/realtime.ts`)

```typescript
// 경매방 채널 구독 (Broadcast 전용)
const { channel, isConnected, broadcast } = useRoomChannel(roomId, onEvent);
broadcast("BID", { amount: 100, teamId: "..." });

// 팀 채팅 채널
const { channel, isConnected, sendMessage } = useTeamChannel(teamId, onMessage);

// 접속자 상태 (별도 Presence 채널)
const { onlineUsers } = usePresence(roomId, userId, { nickname, role });

// DB 변경 구독
useDbChanges("participants", `room_id=eq.${roomId}`, onChange);
```

#### Realtime 훅 주의사항
- **callback 함수는 useRef로 저장**: dependency 배열에 함수를 넣으면 무한 루프 발생
- **객체 dependency는 문자열화**: `userInfo` 같은 객체는 매 렌더링마다 새 참조 생성
- **presenceState() 결과는 spread로 복사**: `setOnlineUsers({ ...state })` - React가 변화 감지하도록

### Auction Rules
- **Timer**: 15초 시작, 입찰마다 +2초 (고정값, `src/lib/constants.ts`)
- **Bid Unit**: 0~99 → +5p, 100~199 → +10p, 200~299 → +15p, 400+ → 100마다 +5p
- 입찰 단위 계산: `getMinBidUnit()`, `getNextMinBid()` (`src/lib/auction-utils.ts`)
- **Captain Points**: 팀장별 개별 포인트 설정 가능 (기본값 0)
  - 팀 시작 포인트 = 총 포인트 - 팀장 포인트
  - 예: 총 1000p, 팀장 200p → 해당 팀 800p로 시작

## Database Setup

Supabase SQL Editor에서 `supabase/schema.sql` 실행 후 `.env.local` 설정:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## Design System

### Theme: 게이밍 & 다이나믹
LoL 테마를 기반으로 한 다크 배경 + 골드/퍼플 액센트

### Color Palette

#### Background
- **Main Background**: `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`
- **Card Background**: `bg-slate-800/30` (반투명)
- **Border**: `border-slate-700/50`

#### Text
- **Primary**: `text-slate-200` (메인 텍스트)
- **Secondary**: `text-slate-300` (서브 텍스트)
- **Tertiary**: `text-slate-400` (설명 텍스트)
- **Muted**: `text-slate-500` (힌트, 푸터)

#### Accent Colors
- **Primary (Gold)**: `amber-400`, `amber-500` (메인 CTA, 강조)
- **Secondary (Purple)**: `purple-500` (배경 효과)
- **Tertiary (Blue)**: `blue-500` (배경 효과)

#### Gradients
- **Title**: `from-amber-200 via-amber-400 to-amber-200` (메인 타이틀)
- **Button**: `from-amber-500 via-amber-400 to-amber-500` (CTA 버튼)
- **Hover**: `from-amber-500/5 to-purple-500/5` (카드 호버)

### Typography

#### Headings
- **H1 (Hero)**: `text-6xl sm:text-7xl md:text-8xl font-black`
- **H2 (Section)**: `text-4xl sm:text-5xl font-bold`
- **H3 (Card Title)**: `text-xl font-bold`

#### Body Text
- **Large**: `text-xl sm:text-2xl font-medium`
- **Medium**: `text-base sm:text-lg`
- **Small**: `text-sm`

### Components

#### Button (Primary CTA)
```tsx
<button className="
  rounded-full
  bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500
  px-12 py-5
  text-xl font-bold text-slate-900
  shadow-2xl shadow-amber-500/50
  hover:shadow-amber-500/80
  transition-all duration-300
">
```

#### Card
```tsx
<div className="
  rounded-2xl
  border border-slate-700/50
  bg-slate-800/30
  p-6
  backdrop-blur-sm
  hover:border-amber-500/50
  hover:bg-slate-800/50
  transition-all duration-300
">
```

#### Input Field (기본)
```tsx
<input className="
  rounded-lg
  border border-slate-700
  bg-slate-800/50
  px-4 py-3
  text-slate-200
  placeholder:text-slate-500
  focus:border-amber-500
  focus:ring-2 focus:ring-amber-500/20
  outline-none
  transition-all
">
```

### Animations

#### Framer Motion - 페이드인
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8 }}
```

#### Hover Effects
- **Scale**: `whileHover={{ scale: 1.05 }}`
- **Lift**: `whileHover={{ y: -5 }}`
- **Tap**: `whileTap={{ scale: 0.95 }}`

#### Background Animation
- 3개의 블러 원 (purple, blue, amber)
- 각각 8~10초 주기로 scale/opacity 애니메이션
- `blur-3xl` 효과

### Spacing & Layout

#### Container
- **Max Width**: `max-w-7xl` (대부분의 섹션)
- **Padding**: `px-6` (모바일), `px-8` (데스크톱)

#### Gap
- **Section**: `gap-12` (섹션 간 간격)
- **Cards**: `gap-6` (카드 그리드)
- **Elements**: `gap-2` ~ `gap-4` (작은 요소들)

### Responsive Breakpoints
- **Mobile**: 기본 (1열)
- **Tablet** (sm): 640px (2열)
- **Desktop** (lg): 1024px (4열)

### Usage Example
```tsx
// 페이지 래퍼
<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
  {/* 애니메이션 배경 */}
  <div className="absolute inset-0">
    <motion.div className="absolute ... bg-purple-500/30 blur-3xl" />
  </div>

  {/* 컨텐츠 */}
  <main className="relative z-10 ...">
    ...
  </main>
</div>
```

## Git Workflow

### Branch Strategy
- **main**: Vercel 연동, 프로덕션 배포 전용 (직접 커밋 금지)
- **develop**: 개발 메인 브랜치 (모든 작업 브랜치의 base)
- **feature/[task-name]**: 새 기능 개발
- **fix/[bug-name]**: 버그 수정
- **refactor/[target]**: 리팩토링

### Workflow Rules
1. **모든 작업은 반드시 브랜치를 생성해서 진행**
2. develop 브랜치에서 작업 브랜치 생성:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/landing-page
   ```
3. 작업 완료 후 develop으로 PR/Merge
4. develop → main 머지는 배포 준비 완료 시에만

### Commit Rules
- **커밋 전 반드시 사용자 확인 필요**
- 작업 완료 시 테스트 방법을 함께 제공
- 사용자가 직접 확인 후 커밋 허가를 받을 것
- 무단 커밋 금지

### Example
```bash
# 랜딩 페이지 작업 시작
git checkout develop
git checkout -b feature/landing-page
# ... 작업 진행 ...
git add .
git commit -m "feat: 랜딩 페이지 구현"
git push origin feature/landing-page
# PR 생성 후 develop으로 머지
```

## API Pattern

```typescript
// src/lib/api/auction.ts 예시
import { supabase } from "@/lib/supabase";

export async function createAuction(params: CreateAuctionParams) {
  const { data, error } = await supabase.from("auction_rooms").insert({...}).select().single();
  if (error) throw new Error(`실패: ${error.message}`);
  return data;
}
```

- 모든 API 함수는 `src/lib/api/` 폴더에 위치
- Supabase 에러는 throw하여 호출부에서 try-catch 처리
- 타입은 `src/types/index.ts`에서 import

## Documentation

상세 기획 문서: `docs/PROJECT_OVERVIEW.md`, `docs/REQUIREMENTS.md`, `docs/TECH_STACK.md`
