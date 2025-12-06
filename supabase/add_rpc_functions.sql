-- 팀 포인트 차감 RPC 함수
-- 낙찰 처리 시 원자적으로 팀 포인트를 차감합니다.

CREATE OR REPLACE FUNCTION decrement_team_points(p_team_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE teams
  SET current_points = current_points - p_amount
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql;
