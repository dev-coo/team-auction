-- ============================================
-- 실시간 상태 동기화를 위한 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================

-- 현재 경매 가격
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS current_price INTEGER DEFAULT 5;

-- 현재 최고 입찰팀
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS highest_bid_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 타이머 종료 시각 (서버 시간 기준)
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS timer_end_at TIMESTAMPTZ;

-- 타이머 실행 중 여부
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT false;

-- 경매 순서 (셔플 결과, participant_id 배열)
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS auction_queue JSONB DEFAULT '[]'::jsonb;

-- 셔플 순서 (경매 순서와 동일, 셔플 페이즈에서 사용)
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS shuffle_order JSONB DEFAULT '[]'::jsonb;

-- 팀장 소개 인덱스
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS captain_intro_index INTEGER DEFAULT 0;

-- 완료된 경매 수
ALTER TABLE auction_rooms
ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0;
