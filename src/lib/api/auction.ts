import { supabase } from "@/lib/supabase";
import { AuctionRoom, Team } from "@/types";
import { TEAM_COLORS } from "@/lib/constants";

interface CreateAuctionParams {
  title: string;
  teamCount: number;
  memberPerTeam: number;
  totalPoints: number;
}

interface CreateAuctionResult {
  room: AuctionRoom & {
    host_code: string;
    captain_code: string;
    member_code: string;
    observer_code: string;
  };
  teams: Team[];
}

/**
 * 경매방 생성
 * 1. auction_rooms 테이블에 INSERT
 * 2. teams 테이블에 teamCount만큼 팀 생성
 */
export async function createAuction(
  params: CreateAuctionParams
): Promise<CreateAuctionResult> {
  const { title, teamCount, memberPerTeam, totalPoints } = params;

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
    // 팀 생성 실패 시 경매방 삭제 (롤백)
    await supabase.from("auction_rooms").delete().eq("id", room.id);
    throw new Error(`팀 생성 실패: ${teamsError.message}`);
  }

  return {
    room: {
      id: room.id,
      title: room.title,
      totalPoints: room.total_points,
      teamCount: room.team_count,
      memberPerTeam: room.member_per_team,
      phase: room.phase,
      currentTargetId: room.current_target_id,
      createdAt: room.created_at,
      host_code: room.host_code,
      captain_code: room.captain_code,
      member_code: room.member_code,
      observer_code: room.observer_code,
    },
    teams: teams.map((team) => ({
      id: team.id,
      roomId: team.room_id,
      name: team.name,
      captainId: team.captain_id,
      currentPoints: team.current_points,
      color: team.color,
    })),
  };
}

/**
 * 경매방 조회 (초대 코드로)
 */
export async function getAuctionByCode(code: string) {
  const { data, error } = await supabase
    .from("auction_rooms")
    .select("*")
    .or(
      `host_code.eq.${code},captain_code.eq.${code},member_code.eq.${code},observer_code.eq.${code}`
    )
    .single();

  if (error) {
    return null;
  }

  // 역할 판별
  let role: "HOST" | "CAPTAIN" | "MEMBER" | "OBSERVER";
  if (data.host_code === code) role = "HOST";
  else if (data.captain_code === code) role = "CAPTAIN";
  else if (data.member_code === code) role = "MEMBER";
  else role = "OBSERVER";

  return { room: data, role };
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

  return data;
}
