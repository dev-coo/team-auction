-- ============================================
-- 서버 사이드 입찰 검증 RPC 함수
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================

-- 1. 최소 입찰가 계산 함수
-- 100 단위마다 +5씩 증가: 0-99 → 5, 100-199 → 10, 200-299 → 15, ...
CREATE OR REPLACE FUNCTION calculate_min_bid(p_current_price INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_unit INTEGER;
BEGIN
  v_unit := 5 + (p_current_price / 100) * 5;
  RETURN p_current_price + v_unit;
END;
$$ LANGUAGE plpgsql;

-- 2. 원자적 입찰 처리 함수
CREATE OR REPLACE FUNCTION place_bid(
  p_room_id UUID,
  p_team_id UUID,
  p_target_id UUID,
  p_amount INTEGER,
  p_min_timer_threshold INTEGER DEFAULT 50,  -- 5.0초 (0.1초 단위)
  p_bid_lock_ms INTEGER DEFAULT 500          -- 입찰 락 시간 (밀리초)
)
RETURNS JSONB AS $$
DECLARE
  v_current_price INTEGER;
  v_highest_bid_team_id UUID;
  v_timer_end_at TIMESTAMPTZ;
  v_timer_running BOOLEAN;
  v_last_bid_at TIMESTAMPTZ;
  v_team_points INTEGER;
  v_min_bid INTEGER;
  v_new_timer_end_at TIMESTAMPTZ;
  v_remaining_ms INTEGER;
  v_bid_lock_remaining_ms INTEGER;
  v_now TIMESTAMPTZ;
BEGIN
  -- 서버 현재 시간 (모든 계산의 기준)
  v_now := NOW();

  -- 1. 경매방 상태 조회 (행 잠금으로 동시성 제어)
  SELECT current_price, highest_bid_team_id, timer_end_at, timer_running, last_bid_at
  INTO v_current_price, v_highest_bid_team_id, v_timer_end_at, v_timer_running, v_last_bid_at
  FROM auction_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- 경매방이 없으면 에러
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ROOM_NOT_FOUND'
    );
  END IF;

  -- 2. 타이머가 실행 중인지 확인
  IF NOT v_timer_running THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TIMER_NOT_RUNNING'
    );
  END IF;

  -- 3. 동시 입찰 방지: 마지막 입찰 후 lock 시간 내 재입찰 차단
  IF v_last_bid_at IS NOT NULL THEN
    v_bid_lock_remaining_ms := EXTRACT(EPOCH FROM (v_last_bid_at + (p_bid_lock_ms * INTERVAL '1 millisecond') - v_now)) * 1000;

    IF v_bid_lock_remaining_ms > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'BID_TOO_SOON',
        'wait_ms', CEIL(v_bid_lock_remaining_ms),
        'message', '입찰 처리 중입니다. 잠시 후 다시 시도해주세요.'
      );
    END IF;
  END IF;

  -- 4. 이미 최고 입찰자인지 검증
  IF v_highest_bid_team_id = p_team_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_HIGHEST_BIDDER'
    );
  END IF;

  -- 5. 타이머 만료 검증 (서버 시간 기준)
  IF v_timer_end_at IS NOT NULL AND v_timer_end_at < v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TIMER_EXPIRED'
    );
  END IF;

  -- 6. 팀 포인트 조회 (행 잠금)
  SELECT current_points INTO v_team_points
  FROM teams
  WHERE id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TEAM_NOT_FOUND'
    );
  END IF;

  -- 7. 포인트 검증
  IF p_amount > v_team_points THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_POINTS',
      'available', v_team_points
    );
  END IF;

  -- 8. 최소 입찰가 검증
  v_min_bid := calculate_min_bid(COALESCE(v_current_price, 0));

  IF p_amount < v_min_bid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BELOW_MIN_BID',
      'min_bid', v_min_bid
    );
  END IF;

  -- 9. 새 타이머 종료 시간 계산 (5초 룰)
  IF v_timer_end_at IS NOT NULL THEN
    -- 남은 시간 계산 (밀리초)
    v_remaining_ms := EXTRACT(EPOCH FROM (v_timer_end_at - v_now)) * 1000;

    IF v_remaining_ms <= p_min_timer_threshold * 100 THEN
      -- 5초 이하면 5초로 리셋
      v_new_timer_end_at := v_now + (p_min_timer_threshold * 100 * INTERVAL '1 millisecond');
    ELSE
      -- 5초 초과면 기존 시간 유지
      v_new_timer_end_at := v_timer_end_at;
    END IF;
  ELSE
    v_new_timer_end_at := NULL;
  END IF;

  -- 10. 경매방 상태 업데이트 (last_bid_at 포함)
  UPDATE auction_rooms
  SET
    current_price = p_amount,
    highest_bid_team_id = p_team_id,
    timer_end_at = v_new_timer_end_at,
    last_bid_at = v_now
  WHERE id = p_room_id;

  -- 11. 입찰 기록 저장
  INSERT INTO bids (room_id, team_id, target_id, amount)
  VALUES (p_room_id, p_team_id, p_target_id, p_amount);

  -- 12. 성공 응답 (서버 시간 포함)
  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'team_id', p_team_id,
    'timer_end_at', v_new_timer_end_at,
    'server_time', v_now
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SERVER_ERROR',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;
