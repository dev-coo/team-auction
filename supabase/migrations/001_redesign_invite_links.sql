-- ============================================
-- Migration: 경매 생성 및 입장 시스템 재설계
-- ============================================
-- 변경 내용:
-- 1. auction_rooms에서 captain_code, member_code 제거
-- 2. teams에 captain_code 추가 (팀별 고유 링크)
-- 3. participants에 is_confirmed 추가 (팀장 본인 확인용)
-- ============================================

-- ============================================
-- 1. teams 테이블에 captain_code 추가
-- ============================================
ALTER TABLE teams
ADD COLUMN captain_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex');

-- 기존 팀 데이터에 captain_code가 없을 경우를 대비한 업데이트
UPDATE teams
SET captain_code = encode(gen_random_bytes(4), 'hex')
WHERE captain_code IS NULL;

-- ============================================
-- 2. participants 테이블에 is_confirmed 추가
-- ============================================
ALTER TABLE participants
ADD COLUMN is_confirmed BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 3. auction_rooms에서 불필요한 코드 컬럼 제거
-- ============================================
-- captain_code: 팀별로 이동됨
-- member_code: 팀원 링크 불필요 (팀원은 옵저버로 입장)
ALTER TABLE auction_rooms
DROP COLUMN IF EXISTS captain_code;

ALTER TABLE auction_rooms
DROP COLUMN IF EXISTS member_code;

-- ============================================
-- 변경 후 스키마 요약:
-- ============================================
-- auction_rooms: host_code, observer_code 유지
-- teams: captain_code 추가 (팀별 고유 링크)
-- participants: is_confirmed 추가 (팀장 본인 확인)
-- ============================================
