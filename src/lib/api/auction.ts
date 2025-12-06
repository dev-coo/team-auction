import { supabase } from "@/lib/supabase";
import { AuctionRoom, Team, Participant, Bid, AuctionResult } from "@/types";
import { TEAM_COLORS } from "@/lib/constants";

// ============================================
// 타입 정의
// ============================================

interface CaptainInput {
  nickname: string;
  position: string;
  description?: string;
  points: number; // 팀장 포인트 (가치)
}

interface MemberInput {
  nickname: string;
  position: string;
  description?: string;
}

interface CreateAuctionParams {
  title: string;
  teamCount: number;
  memberPerTeam: number;
  totalPoints: number;
  captains: CaptainInput[];
  members: MemberInput[];
}

interface CreateAuctionResult {
  room: AuctionRoom;
  teams: (Team & { captain: Participant })[];
}

// ============================================
// 경매 생성
// ============================================

/**
 * 경매방 생성 (팀장/팀원 포함)
 * 1. auction_rooms 테이블에 INSERT
 * 2. teams 테이블에 teamCount만큼 팀 생성
 * 3. participants 테이블에 팀장/팀원 생성
 * 4. teams.captain_id 업데이트
 */
export async function createAuction(
  params: CreateAuctionParams
): Promise<CreateAuctionResult> {
  const { title, teamCount, memberPerTeam, totalPoints, captains, members } =
    params;

  // 유효성 검사
  if (captains.length !== teamCount) {
    throw new Error(`팀장 수(${captains.length})가 팀 수(${teamCount})와 일치하지 않습니다`);
  }

  // 1. 경매방 생성
  const { data: room, error: roomError } = await supabase
    .from("auction_rooms")
    .insert({
      title,
      team_count: teamCount,
      member_per_team: memberPerTeam,
      total_points: totalPoints,
    })
    .select()
    .single();

  if (roomError) {
    throw new Error(`경매방 생성 실패: ${roomError.message}`);
  }

  // 2. 팀 생성 (팀장 포인트 반영)
  const teamsToInsert = Array.from({ length: teamCount }, (_, i) => ({
    room_id: room.id,
    name: `${i + 1}팀`,
    captain_points: captains[i]?.points || 0,
    current_points: totalPoints - (captains[i]?.points || 0),
    color: TEAM_COLORS[i % TEAM_COLORS.length],
  }));

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .insert(teamsToInsert)
    .select();

  if (teamsError) {
    await supabase.from("auction_rooms").delete().eq("id", room.id);
    throw new Error(`팀 생성 실패: ${teamsError.message}`);
  }

  // 3. 팀장 생성 (각 팀에 1명씩)
  const captainsToInsert = captains.map((captain, i) => ({
    room_id: room.id,
    nickname: captain.nickname,
    role: "CAPTAIN" as const,
    position: captain.position,
    description: captain.description || null,
    team_id: teams[i].id,
    is_confirmed: false,
  }));

  const { data: captainParticipants, error: captainsError } = await supabase
    .from("participants")
    .insert(captainsToInsert)
    .select();

  if (captainsError) {
    await supabase.from("auction_rooms").delete().eq("id", room.id);
    throw new Error(`팀장 생성 실패: ${captainsError.message}`);
  }

  // 4. 각 팀의 captain_id 업데이트
  for (let i = 0; i < teams.length; i++) {
    await supabase
      .from("teams")
      .update({ captain_id: captainParticipants[i].id })
      .eq("id", teams[i].id);
  }

  // 5. 팀원 생성 (경매 대상)
  if (members.length > 0) {
    const membersToInsert = members.map((member) => ({
      room_id: room.id,
      nickname: member.nickname,
      role: "MEMBER" as const,
      position: member.position,
      description: member.description || null,
      team_id: null,
      is_confirmed: true, // 팀원은 주최자가 등록하므로 자동 확인
    }));

    const { error: membersError } = await supabase
      .from("participants")
      .insert(membersToInsert);

    if (membersError) {
      await supabase.from("auction_rooms").delete().eq("id", room.id);
      throw new Error(`팀원 생성 실패: ${membersError.message}`);
    }
  }

  // 업데이트된 팀 정보 다시 조회
  const { data: updatedTeams } = await supabase
    .from("teams")
    .select("*")
    .eq("room_id", room.id)
    .order("created_at", { ascending: true });

  return {
    room: {
      id: room.id,
      title: room.title,
      totalPoints: room.total_points,
      teamCount: room.team_count,
      memberPerTeam: room.member_per_team,
      phase: room.phase,
      currentTargetId: room.current_target_id,
      hostCode: room.host_code,
      observerCode: room.observer_code,
      createdAt: room.created_at,
      // 실시간 상태 동기화용 필드 (기본값)
      currentPrice: 5,
      highestBidTeamId: null,
      timerEndAt: null,
      timerRunning: false,
      auctionQueue: [],
      shuffleOrder: [],
      captainIntroIndex: 0,
      completedCount: 0,
    },
    teams: (updatedTeams || []).map((team, i) => ({
      id: team.id,
      roomId: team.room_id,
      name: team.name,
      captainId: team.captain_id,
      captainCode: team.captain_code,
      captainPoints: team.captain_points,
      currentPoints: team.current_points,
      color: team.color,
      createdAt: team.created_at,
      captain: {
        id: captainParticipants[i].id,
        roomId: captainParticipants[i].room_id,
        nickname: captainParticipants[i].nickname,
        role: captainParticipants[i].role,
        position: captainParticipants[i].position,
        description: captainParticipants[i].description,
        teamId: captainParticipants[i].team_id,
        isOnline: captainParticipants[i].is_online,
        isConfirmed: captainParticipants[i].is_confirmed,
        auctionOrder: captainParticipants[i].auction_order,
        createdAt: captainParticipants[i].created_at,
      },
    })),
  };
}

// ============================================
// 코드로 조회
// ============================================

/**
 * 주최자 코드로 경매방 조회
 */
export async function getAuctionByHostCode(code: string) {
  const { data, error } = await supabase
    .from("auction_rooms")
    .select("*")
    .eq("host_code", code)
    .single();

  if (error) {
    return null;
  }

  return mapRoomToAuctionRoom(data);
}

/**
 * 옵저버 코드로 경매방 조회
 */
export async function getAuctionByObserverCode(code: string) {
  const { data, error } = await supabase
    .from("auction_rooms")
    .select("*")
    .eq("observer_code", code)
    .single();

  if (error) {
    return null;
  }

  return mapRoomToAuctionRoom(data);
}

/**
 * 팀장 코드로 팀 및 팀장 정보 조회
 */
export async function getTeamByCaptainCode(code: string) {
  // 1. captain_code로 팀 조회
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*, auction_rooms(*)")
    .eq("captain_code", code)
    .single();

  if (teamError || !team) {
    return null;
  }

  // 2. 팀장 정보 조회
  const { data: captain, error: captainError } = await supabase
    .from("participants")
    .select("*")
    .eq("team_id", team.id)
    .eq("role", "CAPTAIN")
    .single();

  if (captainError || !captain) {
    return null;
  }

  return {
    team: {
      id: team.id,
      roomId: team.room_id,
      name: team.name,
      captainId: team.captain_id,
      captainCode: team.captain_code,
      captainPoints: team.captain_points,
      currentPoints: team.current_points,
      color: team.color,
      createdAt: team.created_at,
    } as Team,
    captain: mapParticipantToType(captain),
    room: mapRoomToAuctionRoom(team.auction_rooms),
  };
}

/**
 * 경매방 조회 (ID로)
 */
export async function getAuctionById(id: string) {
  const { data, error } = await supabase
    .from("auction_rooms")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return mapRoomToAuctionRoom(data);
}

/**
 * 경매방의 모든 팀 조회
 */
export async function getTeamsByRoomId(roomId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return data.map((team) => ({
    id: team.id,
    roomId: team.room_id,
    name: team.name,
    captainId: team.captain_id,
    captainCode: team.captain_code,
    captainPoints: team.captain_points,
    currentPoints: team.current_points,
    color: team.color,
    createdAt: team.created_at,
  })) as Team[];
}

/**
 * 경매방의 모든 참가자 조회
 */
export async function getParticipantsByRoomId(roomId: string) {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return data.map(mapParticipantToType);
}

// ============================================
// 헬퍼 함수
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRoomToAuctionRoom(data: any): AuctionRoom {
  return {
    id: data.id,
    title: data.title,
    totalPoints: data.total_points,
    teamCount: data.team_count,
    memberPerTeam: data.member_per_team,
    phase: data.phase,
    currentTargetId: data.current_target_id,
    hostCode: data.host_code,
    observerCode: data.observer_code,
    createdAt: data.created_at,
    // 실시간 상태 동기화용 필드
    currentPrice: data.current_price ?? 5,
    highestBidTeamId: data.highest_bid_team_id ?? null,
    timerEndAt: data.timer_end_at ?? null,
    timerRunning: data.timer_running ?? false,
    auctionQueue: data.auction_queue ?? [],
    shuffleOrder: data.shuffle_order ?? [],
    captainIntroIndex: data.captain_intro_index ?? 0,
    completedCount: data.completed_count ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapParticipantToType(data: any): Participant {
  return {
    id: data.id,
    roomId: data.room_id,
    nickname: data.nickname,
    role: data.role,
    position: data.position,
    description: data.description,
    teamId: data.team_id,
    isOnline: data.is_online,
    isConfirmed: data.is_confirmed,
    auctionOrder: data.auction_order,
    createdAt: data.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBidToType(data: any): Bid {
  return {
    id: data.id,
    roomId: data.room_id,
    teamId: data.team_id,
    targetId: data.target_id,
    amount: data.amount,
    createdAt: data.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuctionResultToType(data: any): AuctionResult {
  return {
    id: data.id,
    roomId: data.room_id,
    targetId: data.target_id,
    winnerTeamId: data.winner_team_id,
    finalPrice: data.final_price,
    order: data.auction_order,
    createdAt: data.created_at,
  };
}

// ============================================
// AUCTION 페이즈 API
// ============================================

/**
 * 입찰 기록 생성
 */
export async function createBid(params: {
  roomId: string;
  teamId: string;
  targetId: string;
  amount: number;
}): Promise<Bid> {
  const { data, error } = await supabase
    .from("bids")
    .insert({
      room_id: params.roomId,
      team_id: params.teamId,
      target_id: params.targetId,
      amount: params.amount,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`입찰 기록 실패: ${error.message}`);
  }

  return mapBidToType(data);
}

/**
 * 낙찰 처리 (결과 저장 + 포인트 차감 + 팀원 배정)
 */
export async function recordSold(params: {
  roomId: string;
  targetId: string;
  winnerTeamId: string;
  finalPrice: number;
  auctionOrder: number;
}): Promise<AuctionResult> {
  // 1. 낙찰 결과 저장
  const { data: result, error: resultError } = await supabase
    .from("auction_results")
    .insert({
      room_id: params.roomId,
      target_id: params.targetId,
      winner_team_id: params.winnerTeamId,
      final_price: params.finalPrice,
      auction_order: params.auctionOrder,
    })
    .select()
    .single();

  if (resultError) {
    throw new Error(`낙찰 결과 저장 실패: ${resultError.message}`);
  }

  // 2. 팀 포인트 차감
  const { error: pointsError } = await supabase.rpc("decrement_team_points", {
    p_team_id: params.winnerTeamId,
    p_amount: params.finalPrice,
  });

  // RPC가 없으면 직접 업데이트
  if (pointsError) {
    const { data: team } = await supabase
      .from("teams")
      .select("current_points")
      .eq("id", params.winnerTeamId)
      .single();

    if (team) {
      await supabase
        .from("teams")
        .update({ current_points: team.current_points - params.finalPrice })
        .eq("id", params.winnerTeamId);
    }
  }

  // 3. 팀원을 해당 팀에 배정
  const { error: assignError } = await supabase
    .from("participants")
    .update({ team_id: params.winnerTeamId })
    .eq("id", params.targetId);

  if (assignError) {
    throw new Error(`팀원 배정 실패: ${assignError.message}`);
  }

  return mapAuctionResultToType(result);
}

/**
 * 팀 포인트 업데이트
 */
export async function updateTeamPoints(
  teamId: string,
  newPoints: number
): Promise<void> {
  const { error } = await supabase
    .from("teams")
    .update({ current_points: newPoints })
    .eq("id", teamId);

  if (error) {
    throw new Error(`포인트 업데이트 실패: ${error.message}`);
  }
}

/**
 * 팀원을 팀에 배정
 */
export async function assignMemberToTeam(
  memberId: string,
  teamId: string
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ team_id: teamId })
    .eq("id", memberId);

  if (error) {
    throw new Error(`팀 배정 실패: ${error.message}`);
  }
}

/**
 * 현재 경매 대상 업데이트
 */
export async function updateCurrentTarget(
  roomId: string,
  targetId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("auction_rooms")
    .update({ current_target_id: targetId })
    .eq("id", roomId);

  if (error) {
    throw new Error(`타겟 업데이트 실패: ${error.message}`);
  }
}

/**
 * 셔플 후 경매 순서 저장
 */
export async function saveAuctionOrder(
  orderedMemberIds: string[]
): Promise<void> {
  for (let i = 0; i < orderedMemberIds.length; i++) {
    const { error } = await supabase
      .from("participants")
      .update({ auction_order: i + 1 })
      .eq("id", orderedMemberIds[i]);

    if (error) {
      throw new Error(`경매 순서 저장 실패: ${error.message}`);
    }
  }
}

/**
 * 팀의 현재 포인트 조회
 */
export async function getTeamCurrentPoints(teamId: string): Promise<number> {
  const { data, error } = await supabase
    .from("teams")
    .select("current_points")
    .eq("id", teamId)
    .single();

  if (error) {
    throw new Error(`팀 포인트 조회 실패: ${error.message}`);
  }

  return data.current_points;
}

/**
 * 경매방의 모든 경매 결과 조회
 */
export async function getAuctionResultsByRoomId(
  roomId: string
): Promise<AuctionResult[]> {
  const { data, error } = await supabase
    .from("auction_results")
    .select("*")
    .eq("room_id", roomId)
    .order("auction_order", { ascending: true });

  if (error) {
    return [];
  }

  return data.map(mapAuctionResultToType);
}

// ============================================
// 경매 초기화 (디버그용)
// ============================================

/**
 * 경매방 초기화 (디버그용)
 * - phase를 WAITING으로
 * - MEMBER의 team_id, auction_order를 null로
 * - teams의 current_points를 초기값으로
 * - auction_results, bids 삭제
 */
export async function resetAuction(roomId: string): Promise<void> {
  // 1. 경매방 정보 조회
  const { data: room, error: roomError } = await supabase
    .from("auction_rooms")
    .select("total_points")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    throw new Error("경매방을 찾을 수 없습니다");
  }

  // 2. 팀 정보 조회 (captain_points 포함)
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, captain_points")
    .eq("room_id", roomId);

  if (teamsError) {
    throw new Error(`팀 조회 실패: ${teamsError.message}`);
  }

  // 3. auction_rooms 테이블: phase를 WAITING으로 + 실시간 상태 초기화
  const { error: updateRoomError } = await supabase
    .from("auction_rooms")
    .update({
      phase: "WAITING",
      current_target_id: null,
      current_price: 5,
      highest_bid_team_id: null,
      timer_end_at: null,
      timer_running: false,
      auction_queue: [],
      shuffle_order: [],
      captain_intro_index: 0,
      completed_count: 0,
    })
    .eq("id", roomId);

  if (updateRoomError) {
    throw new Error(`경매방 초기화 실패: ${updateRoomError.message}`);
  }

  // 4. participants 테이블: MEMBER의 team_id, auction_order를 null로
  const { error: updateParticipantsError } = await supabase
    .from("participants")
    .update({ team_id: null, auction_order: null })
    .eq("room_id", roomId)
    .eq("role", "MEMBER");

  if (updateParticipantsError) {
    throw new Error(`참가자 초기화 실패: ${updateParticipantsError.message}`);
  }

  // 5. teams 테이블: current_points를 초기값으로
  for (const team of teams || []) {
    const { error: updateTeamError } = await supabase
      .from("teams")
      .update({ current_points: room.total_points - team.captain_points })
      .eq("id", team.id);

    if (updateTeamError) {
      throw new Error(`팀 포인트 초기화 실패: ${updateTeamError.message}`);
    }
  }

  // 6. auction_results 테이블: 삭제
  const { error: deleteResultsError } = await supabase
    .from("auction_results")
    .delete()
    .eq("room_id", roomId);

  if (deleteResultsError) {
    throw new Error(`경매 결과 삭제 실패: ${deleteResultsError.message}`);
  }

  // 7. bids 테이블: 삭제
  const { error: deleteBidsError } = await supabase
    .from("bids")
    .delete()
    .eq("room_id", roomId);

  if (deleteBidsError) {
    throw new Error(`입찰 기록 삭제 실패: ${deleteBidsError.message}`);
  }
}

// ============================================
// 실시간 상태 동기화 API
// ============================================

/**
 * 실시간 상태 업데이트용 타입
 */
export interface RealtimeStateUpdate {
  currentTargetId?: string | null;
  currentPrice?: number;
  highestBidTeamId?: string | null;
  timerEndAt?: string | null;
  timerRunning?: boolean;
  auctionQueue?: string[];
  shuffleOrder?: string[];
  captainIntroIndex?: number;
  completedCount?: number;
  phase?: string;
}

/**
 * 경매방 실시간 상태 업데이트
 */
export async function updateRealtimeState(
  roomId: string,
  state: RealtimeStateUpdate
): Promise<void> {
  // camelCase → snake_case 변환
  const updateData: Record<string, unknown> = {};

  if (state.currentTargetId !== undefined) {
    updateData.current_target_id = state.currentTargetId;
  }
  if (state.currentPrice !== undefined) {
    updateData.current_price = state.currentPrice;
  }
  if (state.highestBidTeamId !== undefined) {
    updateData.highest_bid_team_id = state.highestBidTeamId;
  }
  if (state.timerEndAt !== undefined) {
    updateData.timer_end_at = state.timerEndAt;
  }
  if (state.timerRunning !== undefined) {
    updateData.timer_running = state.timerRunning;
  }
  if (state.auctionQueue !== undefined) {
    updateData.auction_queue = state.auctionQueue;
  }
  if (state.shuffleOrder !== undefined) {
    updateData.shuffle_order = state.shuffleOrder;
  }
  if (state.captainIntroIndex !== undefined) {
    updateData.captain_intro_index = state.captainIntroIndex;
  }
  if (state.completedCount !== undefined) {
    updateData.completed_count = state.completedCount;
  }
  if (state.phase !== undefined) {
    updateData.phase = state.phase;
  }

  const { error } = await supabase
    .from("auction_rooms")
    .update(updateData)
    .eq("id", roomId);

  if (error) {
    throw new Error(`실시간 상태 업데이트 실패: ${error.message}`);
  }
}

/**
 * 셔플 완료 시 상태 저장
 */
export async function saveShuffleState(
  roomId: string,
  shuffledOrder: string[]
): Promise<void> {
  await updateRealtimeState(roomId, {
    shuffleOrder: shuffledOrder,
    auctionQueue: shuffledOrder,
  });
}

/**
 * 경매 시작 시 상태 저장
 */
export async function saveAuctionStartState(
  roomId: string,
  targetId: string,
  timerSeconds: number
): Promise<void> {
  const timerEndAt = new Date(Date.now() + timerSeconds * 100).toISOString();

  await updateRealtimeState(roomId, {
    currentTargetId: targetId,
    currentPrice: 5,
    highestBidTeamId: null,
    timerEndAt,
    timerRunning: true,
  });
}

/**
 * 입찰 시 상태 저장
 */
export async function saveBidState(
  roomId: string,
  price: number,
  teamId: string,
  newTimerSeconds: number
): Promise<void> {
  const timerEndAt = new Date(Date.now() + newTimerSeconds * 100).toISOString();

  await updateRealtimeState(roomId, {
    currentPrice: price,
    highestBidTeamId: teamId,
    timerEndAt,
  });
}

/**
 * 낙찰/패스 후 다음 타겟으로 상태 저장
 */
export async function saveNextTargetState(
  roomId: string,
  nextTargetId: string | null,
  completedCount: number
): Promise<void> {
  await updateRealtimeState(roomId, {
    currentTargetId: nextTargetId,
    currentPrice: 5,
    highestBidTeamId: null,
    timerEndAt: null,
    timerRunning: false,
    completedCount,
  });
}

/**
 * 타이머 정지
 */
export async function stopTimer(roomId: string): Promise<void> {
  await updateRealtimeState(roomId, {
    timerRunning: false,
  });
}

/**
 * 팀장 소개 인덱스 저장
 */
export async function saveCaptainIntroIndex(
  roomId: string,
  index: number
): Promise<void> {
  await updateRealtimeState(roomId, {
    captainIntroIndex: index,
  });
}
