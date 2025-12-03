"use client";

import { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    if (!roomId) return;

    const roomChannel = supabase.channel(getChannelName.room(roomId), {
      config: {
        broadcast: { self: true },
        presence: { key: roomId },
      },
    });

    // Broadcast 이벤트 구독
    roomChannel.on("broadcast", { event: "*" }, ({ payload }) => {
      if (onEvent && payload) {
        onEvent(payload as RealtimeEvent);
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
  }, [roomId, onEvent]);

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
 * 팀 채팅 Realtime 채널 구독 훅
 * @param teamId 팀 ID
 * @param onMessage 메시지 핸들러
 */
export function useTeamChannel(
  teamId: string | null,
  onMessage?: (message: RealtimeEvent) => void
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    const teamChannel = supabase.channel(getChannelName.team(teamId), {
      config: {
        broadcast: { self: true },
      },
    });

    teamChannel.on("broadcast", { event: "CHAT" }, ({ payload }) => {
      if (onMessage && payload) {
        onMessage(payload as RealtimeEvent);
      }
    });

    teamChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setIsConnected(false);
      }
    });

    setChannel(teamChannel);

    return () => {
      teamChannel.unsubscribe();
    };
  }, [teamId, onMessage]);

  const sendMessage = useCallback(
    (content: string, senderNickname: string) => {
      if (!channel) return;

      const event: RealtimeEvent = {
        type: "CHAT",
        payload: { content, senderNickname },
        timestamp: Date.now(),
      };

      channel.send({
        type: "broadcast",
        event: "CHAT",
        payload: event,
      });
    },
    [channel]
  );

  return { channel, isConnected, sendMessage };
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

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(getChannelName.room(roomId), {
      config: {
        presence: { key: userId },
      },
    });

    // 사용자 입장
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUsers(state);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(userInfo);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, userId, userInfo]);

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
