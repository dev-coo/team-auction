"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { RealtimeEvent, RealtimeEventType } from "@/types";
import { getChannelName } from "./constants";

/**
 * 경매방 Realtime 채널 구독 훅
 * @param roomId 경매방 ID
 * @param onEvent 이벤트 핸들러
 */
export function useRoomChannel(
  roomId: string,
  onEvent?: (event: RealtimeEvent) => void
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // onEvent를 ref로 저장하여 dependency에서 제외 (무한 루프 방지)
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!roomId) return;

    const roomChannel = supabase.channel(getChannelName.room(roomId), {
      config: {
        broadcast: { self: false }, // 자신이 보낸 메시지는 수신하지 않음
        presence: { key: roomId },
      },
    });

    // Broadcast 이벤트 구독
    roomChannel.on("broadcast", { event: "*" }, ({ payload }) => {
      if (onEventRef.current && payload) {
        onEventRef.current(payload as RealtimeEvent);
      }
    });

    roomChannel
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    setChannel(roomChannel);

    return () => {
      roomChannel.unsubscribe();
    };
  }, [roomId]); // onEvent 제거

  // 이벤트 전송
  const broadcast = useCallback(
    (type: RealtimeEventType, payload: Record<string, unknown>) => {
      if (!channel) return;

      const event: RealtimeEvent = {
        type,
        payload,
        timestamp: Date.now(),
      };

      channel.send({
        type: "broadcast",
        event: type,
        payload: event,
      });
    },
    [channel]
  );

  return { channel, isConnected, broadcast };
}

/**
 * Presence (접속자 상태) 훅
 * @param roomId 경매방 ID
 * @param userId 사용자 ID
 * @param userInfo 사용자 정보
 */
export function usePresence(
  roomId: string,
  userId: string,
  userInfo: { nickname: string; role: string }
) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});

  // userInfo를 ref로 저장하여 최신 값 유지
  const userInfoRef = useRef(userInfo);
  userInfoRef.current = userInfo;

  // userInfo를 문자열화하여 dependency 안정화
  const userInfoKey = `${userInfo.nickname}:${userInfo.role}`;

  useEffect(() => {
    if (!roomId || !userId) return;

    // Presence 전용 채널 사용 (room 채널과 분리)
    const channel = supabase.channel(getChannelName.presence(roomId), {
      config: {
        presence: { key: userId },
      },
    });

    // 사용자 입장/퇴장 처리
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // 새 객체로 복사하여 React가 변화를 감지하도록 함
        setOnlineUsers({ ...state });
      })
      .on("presence", { event: "join" }, () => {
        const state = channel.presenceState();
        setOnlineUsers({ ...state });
      })
      .on("presence", { event: "leave" }, () => {
        const state = channel.presenceState();
        setOnlineUsers({ ...state });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(userInfoRef.current);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, userId, userInfoKey]); // userInfo 객체 대신 문자열 key 사용

  return { onlineUsers };
}

/**
 * DB 변경사항 구독 훅
 * @param table 테이블 이름
 * @param filter 필터 (예: eq.room_id.xxx)
 * @param onChange 변경 핸들러
 */
export function useDbChanges(
  table: string,
  filter: string,
  onChange?: (payload: any) => void
) {
  useEffect(() => {
    if (!table || !filter) return;

    const channel = supabase
      .channel(`db:${table}:${filter}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        (payload) => {
          if (onChange) {
            onChange(payload);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [table, filter, onChange]);
}
