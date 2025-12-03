import { supabase } from "@/lib/supabase";
import { Participant } from "@/types";

// ============================================
// 팀장 관련
// ============================================

/**
 * 팀장 본인 확인 (입장)
 * - is_confirmed를 true로 업데이트
 * - is_online을 true로 업데이트
 */
export async function confirmCaptain(participantId: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from("participants")
    .update({
      is_confirmed: true,
      is_online: true,
    })
    .eq("id", participantId)
    .eq("role", "CAPTAIN")
    .select()
    .single();

  if (error) {
    throw new Error(`팀장 확인 실패: ${error.message}`);
  }

  return mapParticipantToType(data);
}

/**
 * 팀장 재입장 (이미 확인된 경우)
 */
export async function reconnectCaptain(participantId: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from("participants")
    .update({ is_online: true })
    .eq("id", participantId)
    .eq("role", "CAPTAIN")
    .select()
    .single();

  if (error) {
    throw new Error(`팀장 재입장 실패: ${error.message}`);
  }

  return mapParticipantToType(data);
}

// ============================================
// 옵저버 관련
// ============================================

/**
 * 옵저버 생성 (입장)
 */
export async function createObserver(
  roomId: string,
  nickname: string
): Promise<Participant> {
  const { data, error } = await supabase
    .from("participants")
    .insert({
      room_id: roomId,
      nickname,
      role: "OBSERVER",
      position: "",
      is_online: true,
      is_confirmed: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`옵저버 생성 실패: ${error.message}`);
  }

  return mapParticipantToType(data);
}

// ============================================
// 참가자 정보 수정 (주최자용)
// ============================================

interface UpdateParticipantData {
  nickname?: string;
  position?: string;
  description?: string;
}

/**
 * 참가자 정보 수정
 */
export async function updateParticipant(
  participantId: string,
  data: UpdateParticipantData
): Promise<Participant | null> {
  const { data: updated, error } = await supabase
    .from("participants")
    .update(data)
    .eq("id", participantId)
    .select()
    .single();

  if (error) {
    throw new Error(`참가자 수정 실패: ${error.message}`);
  }

  return mapParticipantToType(updated);
}

/**
 * 참가자 온라인 상태 업데이트
 */
export async function updateParticipantOnline(
  participantId: string,
  isOnline: boolean
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ is_online: isOnline })
    .eq("id", participantId);

  if (error) {
    throw new Error(`온라인 상태 업데이트 실패: ${error.message}`);
  }
}

/**
 * 참가자 조회 (ID로)
 */
export async function getParticipantById(
  participantId: string
): Promise<Participant | null> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .single();

  if (error) {
    return null;
  }

  return mapParticipantToType(data);
}

// ============================================
// 헬퍼 함수
// ============================================

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
