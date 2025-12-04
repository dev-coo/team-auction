-- ============================================
-- 팀 경매 사이트 Supabase 스키마
-- ============================================
-- 사용법: Supabase 대시보드 > SQL Editor > 이 파일 내용 복붙 > Run
-- ============================================

-- ENUM 타입 생성
CREATE TYPE auction_phase AS ENUM ('WAITING', 'CAPTAIN_INTRO', 'SHUFFLE', 'AUCTION', 'FINISHED');
CREATE TYPE participant_role AS ENUM ('HOST', 'CAPTAIN', 'MEMBER', 'OBSERVER');

-- ============================================
-- 1. 경매방 테이블
-- ============================================
CREATE TABLE auction_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 1000,
  team_count INTEGER NOT NULL DEFAULT 5,
  member_per_team INTEGER NOT NULL DEFAULT 4,
  phase auction_phase NOT NULL DEFAULT 'WAITING',
  current_target_id UUID,
  host_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  observer_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. 팀 테이블
-- ============================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  captain_id UUID,
  captain_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  captain_points INTEGER NOT NULL DEFAULT 0,  -- 팀장 포인트 (팀 시작 포인트에서 차감)
  current_points INTEGER NOT NULL DEFAULT 1000,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. 참가자 테이블
-- ============================================
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  role participant_role NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  auction_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 팀 테이블에 captain_id FK 추가 (순환 참조 해결)
ALTER TABLE teams
ADD CONSTRAINT fk_captain
FOREIGN KEY (captain_id) REFERENCES participants(id) ON DELETE SET NULL;

-- ============================================
-- 4. 입찰 기록 테이블
-- ============================================
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. 채팅 메시지 테이블
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  sender_nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. 경매 결과 테이블
-- ============================================
CREATE TABLE auction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  winner_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  final_price INTEGER NOT NULL,
  auction_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 인덱스 생성
-- ============================================
CREATE INDEX idx_participants_room ON participants(room_id);
CREATE INDEX idx_participants_team ON participants(team_id);
CREATE INDEX idx_teams_room ON teams(room_id);
CREATE INDEX idx_bids_room ON bids(room_id);
CREATE INDEX idx_chat_room ON chat_messages(room_id);
CREATE INDEX idx_chat_team ON chat_messages(team_id);
CREATE INDEX idx_results_room ON auction_results(room_id);

-- ============================================
-- Realtime 활성화
-- ============================================
-- Supabase 대시보드 > Database > Replication 에서 활성화하거나 아래 실행:
ALTER PUBLICATION supabase_realtime ADD TABLE auction_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_results;

-- ============================================
-- RLS (Row Level Security) 정책 - 기본 비활성화
-- ============================================
-- 필요시 활성화:
-- ALTER TABLE auction_rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auction_results ENABLE ROW LEVEL SECURITY;
