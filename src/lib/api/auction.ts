import { supabase } from "@/lib/supabase";
import { AuctionRoom, Team, Participant } from "@/types";
import { TEAM_COLORS } from "@/lib/constants";

// ============================================
// 타입 정의
// ============================================

interface CaptainInput {
  nickname: string;
  position: string;
  description?: string;
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

  // 2. 팀 생성
  const teamsToInsert = Array.from({ length: teamCount }, (_, i) => ({
    room_id: room.id,
    name: `${i + 1}팀`,
    current_points: totalPoints,
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
    },
    teams: (updatedTeams || []).map((team, i) => ({
      id: team.id,
      roomId: team.room_id,
      name: team.name,
      captainId: team.captain_id,
      captainCode: team.captain_code,
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
