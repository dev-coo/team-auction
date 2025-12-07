-- ============================================
-- current_price 기본값 변경 (5 → 0)
-- 첫 입찰이 5p부터 시작하도록 수정
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================

ALTER TABLE auction_rooms ALTER COLUMN current_price SET DEFAULT 0;
