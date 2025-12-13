-- ============================================
-- 서버 사이드 입찰 락 추가
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================

-- 1. auction_rooms 테이블에 last_bid_at 컬럼 추가
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS last_bid_at TIMESTAMPTZ DEFAULT NULL;

-- 2. 컬럼 코멘트
COMMENT ON COLUMN auction_rooms.last_bid_at IS '마지막 입찰 시간 (동시 입찰 방지용)';
