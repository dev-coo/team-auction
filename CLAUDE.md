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
