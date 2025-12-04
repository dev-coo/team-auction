-- 마이그레이션: 팀장 포인트 필드 추가
-- 목적: 팀장의 가치(포인트)를 저장하여 팀의 시작 포인트에서 차감

-- teams 테이블에 captain_points 컬럼 추가
ALTER TABLE teams ADD COLUMN captain_points INTEGER NOT NULL DEFAULT 0;

-- 코멘트 추가
COMMENT ON COLUMN teams.captain_points IS '팀장의 포인트 가치. 팀 시작 포인트 = 총 포인트 - captain_points';
