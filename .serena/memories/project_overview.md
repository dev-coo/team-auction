# Team Auction Project Overview

## Purpose
팀 경매 사이트 - 리그오브레전드 등 팀 게임에서 팀장이 포인트로 팀원을 입찰하는 실시간 경매 시스템

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript + React 19
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime (Broadcast, Presence, DB Changes)
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **Package Manager**: pnpm

## Key Features
1. 실시간 경매 진행 (팀장이 팀원을 포인트로 입찰)
2. 5단계 페이즈 시스템: WAITING → CAPTAIN_INTRO → SHUFFLE → AUCTION → FINISHED
3. 역할 기반 UI: HOST(주최자), CAPTAIN(팀장), MEMBER(팀원), OBSERVER(관전자)
4. 실시간 타이머 및 입찰 동기화
5. 유찰 처리 및 랜덤 배분 시스템

## Database Tables
- `auction_rooms`: 경매방 정보
- `teams`: 팀 정보 (팀장, 포인트 등)
- `participants`: 참가자 정보
- `bids`: 입찰 기록
- `chat_messages`: 채팅 메시지
- `auction_results`: 경매 결과

## Auction Rules
- **Timer**: 15초 시작, 입찰마다 +2초
- **Bid Unit**: 0~99 → +5p, 100~199 → +10p, 200~299 → +15p, 400+ → 100마다 +5p
- **Captain Points**: 팀장별 개별 포인트 설정 가능
- **유찰**: 1라운드 → 2라운드 → 랜덤 배분
