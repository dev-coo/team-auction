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

### Core Types (`src/types/index.ts`)
- `AuctionPhase`: WAITING → CAPTAIN_INTRO → SHUFFLE → AUCTION → FINISHED
- `ParticipantRole`: HOST | CAPTAIN | MEMBER | OBSERVER
- `AuctionRoom`, `Participant`, `Team`, `Bid`, `ChatMessage`, `AuctionResult`

### Realtime Channel Structure
```
room:{roomId}
  ├── phase      # 페이즈 상태 (Broadcast)
  ├── auction    # 입찰/낙찰 (Broadcast)
  ├── timer      # 타이머 동기화 (Broadcast)
  ├── chat       # 전체 채팅 (Broadcast)
  └── presence   # 접속자 상태 (Presence)

team:{teamId}
  └── chat       # 팀 채팅 (Broadcast)
```

### Auction Rules
- **Timer**: 15초 시작, 입찰마다 +2초
- **Bid Unit**: 0~99 → +5p, 100~199 → +10p, 200~299 → +15p, 300+ → +20p...

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

## Documentation

상세 기획 문서: `docs/PROJECT_OVERVIEW.md`, `docs/REQUIREMENTS.md`, `docs/TECH_STACK.md`
