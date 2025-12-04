"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Realtime 채팅 메시지 타입 (Broadcast용)
interface RealtimeChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
}
import {
  AuctionPhase,
  AuctionRoom as AuctionRoomType,
  Team,
  Participant,
  ParticipantRole,
  AuctionState,
  BidPayload,
  SoldPayload,
  PassedPayload,
  AuctionStartPayload,
} from "@/types";
import { useRoomChannel, usePresence } from "@/lib/realtime";
import {
  getAuctionById,
  getTeamsByRoomId,
  getParticipantsByRoomId,
  createBid,
  recordSold,
} from "@/lib/api/auction";
import DebugControls from "./components/DebugControls";
import WaitingPhase from "./components/phases/WaitingPhase";
import CaptainIntroPhase from "./components/phases/CaptainIntroPhase";
import ShufflePhase, { ShuffleState } from "./components/phases/ShufflePhase";
import AuctionPhaseComponent from "./components/phases/AuctionPhase";
import InviteLinksModal from "@/components/InviteLinksModal";
import { shuffleArray, getNextMinBid } from "@/lib/auction-utils";
import { INITIAL_TIMER_SECONDS, BID_TIME_EXTENSION_SECONDS } from "@/lib/constants";

// AUCTION 상태 초기값
const INITIAL_AUCTION_STATE: AuctionState = {
  currentTargetId: null,
  currentTargetIndex: 0,
  totalTargets: 0,
  auctionQueue: [],
  timer: INITIAL_TIMER_SECONDS,
  timerRunning: false,
  currentPrice: 5,
  highestBidTeamId: null,
  bidHistory: [],
  bidLockUntil: 0,
  showSoldAnimation: false,
  lastSoldInfo: null,
  completedCount: 0,
};


export default function AuctionRoom({ params }: { params: Promise<{ id: string }> }) {
  // URL 파라미터
  const [roomId, setRoomId] = useState<string>("");

  // 데이터 상태
  const [room, setRoom] = useState<AuctionRoomType | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI 상태
  const [phase, setPhase] = useState<AuctionPhase>("WAITING");
  const [currentRole, setCurrentRole] = useState<ParticipantRole>("OBSERVER"); // 기본값 OBSERVER
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [captainIntroIndex, setCaptainIntroIndex] = useState(0); // 팀장 소개 인덱스
  const [shuffleState, setShuffleState] = useState<ShuffleState>("GATHER");
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [animationSeed, setAnimationSeed] = useState<number | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<RealtimeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [announceInput, setAnnounceInput] = useState("");
  const [currentAnnouncement, setCurrentAnnouncement] = useState("");
  // AUCTION 페이즈 상태
  const [auctionState, setAuctionState] = useState<AuctionState>(INITIAL_AUCTION_STATE);

  // params Promise 해결
  useEffect(() => {
    params.then((p) => setRoomId(p.id));
  }, [params]);

  // DB에서 데이터 fetch
  useEffect(() => {
    if (!roomId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 병렬로 데이터 fetch
        const [roomData, teamsData, participantsData] = await Promise.all([
          getAuctionById(roomId),
          getTeamsByRoomId(roomId),
          getParticipantsByRoomId(roomId),
        ]);

        if (!roomData) {
          setError("경매방을 찾을 수 없습니다");
          return;
        }

        setRoom(roomData);
        setTeams(teamsData);
        setParticipants(participantsData);
        setPhase(roomData.phase);

        // localStorage에서 역할 확인
        const savedParticipantId = localStorage.getItem(`participant_id_${roomId}`);
        const savedHostCode = localStorage.getItem(`host_code_${roomId}`);

        if (savedParticipantId) {
          // 참가자 ID가 있으면 해당 참가자의 역할 조회
          const participant = participantsData.find((p) => p.id === savedParticipantId);
          if (participant) {
            setCurrentRole(participant.role);
            setCurrentParticipantId(participant.id);
          }
        } else if (savedHostCode) {
          // 주최자 코드가 있으면 HOST
          setCurrentRole("HOST");
        }
        // 둘 다 없으면 기본값 OBSERVER 유지
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터를 불러오는 중 오류가 발생했습니다");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  // 현재 사용자 정보 (Presence용)
  const currentUser = useMemo(() => {
    if (currentParticipantId) {
      const participant = participants.find((p) => p.id === currentParticipantId);
      if (participant) {
        return { id: participant.id, nickname: participant.nickname, role: participant.role };
      }
    }
    // HOST는 participant가 아니므로 임시 ID 사용
    if (currentRole === "HOST") {
      return { id: `host-${roomId}`, nickname: "주최자", role: "HOST" as const };
    }
    return null;
  }, [currentParticipantId, participants, currentRole, roomId]);

  // Presence로 온라인 상태 추적
  const { onlineUsers } = usePresence(
    roomId,
    currentUser?.id || "",
    { nickname: currentUser?.nickname || "", role: currentUser?.role || "OBSERVER" }
  );

  // 온라인 사용자 목록을 기반으로 participants의 isOnline 상태 업데이트
  const participantsWithOnlineStatus = useMemo(() => {
    if (!onlineUsers || Object.keys(onlineUsers).length === 0) {
      return participants;
    }

    // Presence에서 온라인인 사용자 ID 목록
    const onlineUserIds = new Set(Object.keys(onlineUsers));

    return participants.map((p) => ({
      ...p,
      isOnline: onlineUserIds.has(p.id),
    }));
  }, [participants, onlineUsers]);

  // 대기 중인 팀원 목록 (셔플된 순서대로)
  const auctionQueue = useMemo(() => {
    const members = participantsWithOnlineStatus
      .filter((p) => p.role === "MEMBER" && p.teamId === null);

    // 셔플 완료 후에만 셔플된 순서 반영 (애니메이션 스포일러 방지)
    if (shuffledOrder && shuffledOrder.length > 0 && shuffleState === "COMPLETE") {
      return shuffledOrder
        .map((id) => members.find((m) => m.id === id))
        .filter((m): m is Participant => m !== undefined)
        .map((m, index) => ({ ...m, order: index + 1 }));
    }

    return members.map((p, index) => ({ ...p, order: index + 1 }));
  }, [participantsWithOnlineStatus, shuffledOrder, shuffleState]);

  // 현재 경매 대상 (auctionState 기반)
  const currentTarget = useMemo(() => {
    if (!auctionState.currentTargetId) return null;
    return participantsWithOnlineStatus.find((p) => p.id === auctionState.currentTargetId);
  }, [auctionState.currentTargetId, participantsWithOnlineStatus]);

  // 현재 팀장의 팀 정보
  const myTeam = useMemo(() => {
    if (currentRole !== "CAPTAIN" || !currentParticipantId) return null;
    const participant = participants.find((p) => p.id === currentParticipantId);
    if (!participant?.teamId) return null;
    return teams.find((t) => t.id === participant.teamId) || null;
  }, [currentRole, currentParticipantId, participants, teams]);

  // 초대링크 모달용 teams with captain 데이터
  const teamsWithCaptain = useMemo(() => {
    return teams.map((team) => {
      const captain = participantsWithOnlineStatus.find(
        (p) => p.id === team.captainId
      );
      return {
        ...team,
        captain: captain || {
          id: "",
          roomId: team.roomId,
          nickname: "미정",
          role: "CAPTAIN" as const,
          position: "",
          description: null,
          teamId: team.id,
          isOnline: false,
          isConfirmed: false,
          auctionOrder: null,
          createdAt: "",
        },
      };
    });
  }, [teams, participantsWithOnlineStatus]);

  // Realtime 이벤트 핸들러
  const handleRealtimeEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    switch (event.type) {
      case "PHASE_CHANGE":
        setPhase(event.payload.phase as AuctionPhase);
        // 페이즈 변경 시 상태 초기화
        if (event.payload.phase === "CAPTAIN_INTRO") {
          setCaptainIntroIndex(0);
        }
        if (event.payload.phase === "SHUFFLE") {
          setShuffleState("GATHER");
          setShuffledOrder(null);
          setRevealedCount(0);
          setAnimationSeed(null);
        }
        break;
      case "CAPTAIN_INDEX_CHANGE":
        setCaptainIntroIndex(event.payload.index as number);
        break;
      case "SHUFFLE_START":
        setShuffledOrder(event.payload.shuffledOrder as string[]);
        setAnimationSeed(event.payload.seed as number);
        setShuffleState("SHUFFLING");
        // 10초 후 REVEALING 상태로 전환
        setTimeout(() => setShuffleState("REVEALING"), 10000);
        break;
      case "SHUFFLE_REVEAL":
        setRevealedCount(event.payload.count as number);
        break;
      case "SHUFFLE_COMPLETE":
        setShuffleState("COMPLETE");
        break;
      case "CHAT":
        setChatMessages((prev) => [
          ...prev,
          {
            id: `${event.payload.timestamp as number}-${Math.random().toString(36).slice(2)}`,
            sender: event.payload.sender as string,
            content: event.payload.content as string,
            timestamp: event.payload.timestamp as number,
          },
        ]);
        break;
      case "ANNOUNCE":
        setCurrentAnnouncement(event.payload.content as string);
        break;
      // AUCTION 페이즈 이벤트
      case "AUCTION_START": {
        const payload = event.payload as unknown as AuctionStartPayload;
        setAuctionState((prev) => ({
          ...prev,
          currentTargetId: payload.targetId,
          currentTargetIndex: payload.targetIndex,
          totalTargets: payload.totalTargets,
          timer: INITIAL_TIMER_SECONDS,
          timerRunning: true,
          currentPrice: 5,
          highestBidTeamId: null,
          bidHistory: [],
          bidLockUntil: 0,
          showSoldAnimation: false,
          lastSoldInfo: null,
        }));
        break;
      }
      case "BID": {
        const payload = event.payload as unknown as BidPayload;
        // 500ms 락 체크
        setAuctionState((prev) => {
          if (payload.timestamp < prev.bidLockUntil) {
            // 락 기간 내 입찰 무시
            return prev;
          }
          if (payload.amount <= prev.currentPrice) {
            // 현재가보다 낮은 입찰 무시
            return prev;
          }
          return {
            ...prev,
            currentPrice: payload.amount,
            highestBidTeamId: payload.teamId,
            timer: Math.min(payload.newTimer, INITIAL_TIMER_SECONDS),
            bidLockUntil: payload.timestamp + 500,
            bidHistory: [
              {
                teamId: payload.teamId,
                teamName: payload.teamName,
                teamColor: payload.teamColor,
                amount: payload.amount,
                timestamp: payload.timestamp,
              },
              ...prev.bidHistory,
            ].slice(0, 10), // 최근 10개만 유지
          };
        });
        break;
      }
      case "TIMER_SYNC": {
        const serverTimer = event.payload.timer as number;
        setAuctionState((prev) => {
          // 1초 이상 차이나면 동기화
          if (Math.abs(prev.timer - serverTimer) > 1) {
            return { ...prev, timer: serverTimer };
          }
          return prev;
        });
        break;
      }
      case "SOLD": {
        const payload = event.payload as unknown as SoldPayload;
        // 팀 포인트 업데이트
        setTeams((prev) =>
          prev.map((t) => ({
            ...t,
            currentPoints: payload.updatedPoints[t.id] ?? t.currentPoints,
          }))
        );
        // 팀원을 팀에 배정
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === payload.targetId
              ? { ...p, teamId: payload.winnerTeamId }
              : p
          )
        );
        // 낙찰 애니메이션 표시
        setAuctionState((prev) => ({
          ...prev,
          timerRunning: false,
          showSoldAnimation: true,
          lastSoldInfo: {
            targetId: payload.targetId,
            targetNickname: payload.targetNickname,
            winnerTeamId: payload.winnerTeamId,
            winnerTeamName: payload.winnerTeamName,
            winnerTeamColor: payload.winnerTeamColor,
            finalPrice: payload.finalPrice,
            isAutoAssignment: payload.isAutoAssignment,
          },
          completedCount: prev.completedCount + 1,
          auctionQueue: prev.auctionQueue.filter((id) => id !== payload.targetId),
        }));
        break;
      }
      case "PASSED": {
        const payload = event.payload as unknown as PassedPayload;
        setAuctionState((prev) => ({
          ...prev,
          currentTargetId: payload.nextTargetId,
          auctionQueue: payload.newQueue,
          timer: INITIAL_TIMER_SECONDS,
          timerRunning: false,
          currentPrice: 5,
          highestBidTeamId: null,
          bidHistory: [],
          bidLockUntil: 0,
        }));
        break;
      }
    }
  }, []);

  // Realtime 채널 연결
  const { broadcast } = useRoomChannel(roomId, handleRealtimeEvent);

  // 다음 페이즈로 이동 (주최자용)
  const handleNextPhase = useCallback(() => {
    const phases: AuctionPhase[] = ["WAITING", "CAPTAIN_INTRO", "SHUFFLE", "AUCTION", "FINISHED"];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      setPhase(nextPhase);
      // captainIntroIndex 초기화
      if (nextPhase === "CAPTAIN_INTRO") {
        setCaptainIntroIndex(0);
      }
      // Realtime으로 다른 클라이언트에 브로드캐스트
      broadcast("PHASE_CHANGE", { phase: nextPhase });
    }
  }, [phase, broadcast]);

  // 다음 팀장 소개 (주최자용)
  const handleNextCaptain = useCallback(() => {
    const isLastCaptain = captainIntroIndex === teams.length - 1;
    if (isLastCaptain) {
      // 마지막 팀장이면 다음 페이즈로
      handleNextPhase();
    } else {
      // 다음 팀장으로
      const nextIndex = captainIntroIndex + 1;
      setCaptainIntroIndex(nextIndex);
      broadcast("CAPTAIN_INDEX_CHANGE", { index: nextIndex });
    }
  }, [captainIntroIndex, teams.length, broadcast, handleNextPhase]);

  // 셔플 시작 (주최자용)
  const handleStartShuffle = useCallback(() => {
    const members = participantsWithOnlineStatus.filter(
      (p) => p.role === "MEMBER" && p.teamId === null
    );
    const shuffled = shuffleArray(members.map((m) => m.id));
    const seed = Date.now();

    setShuffledOrder(shuffled);
    setAnimationSeed(seed);
    setShuffleState("SHUFFLING");

    broadcast("SHUFFLE_START", { shuffledOrder: shuffled, seed });

    // 10초 후 REVEALING 시작
    setTimeout(() => {
      setShuffleState("REVEALING");
      // 0.5초마다 한 장씩 공개
      let count = 0;
      const revealInterval = setInterval(() => {
        count++;
        setRevealedCount(count);
        broadcast("SHUFFLE_REVEAL", { count });
        if (count >= shuffled.length) {
          clearInterval(revealInterval);
          setShuffleState("COMPLETE");
          broadcast("SHUFFLE_COMPLETE", {});
        }
      }, 500);
    }, 10000);
  }, [participantsWithOnlineStatus, broadcast]);

  // 채팅 메시지 전송
  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    // 닉네임 결정
    let senderNickname: string;
    if (currentRole === "HOST") {
      senderNickname = "주최자";
    } else if (currentParticipantId) {
      const participant = participants.find((p) => p.id === currentParticipantId);
      senderNickname = participant?.nickname || "익명";
    } else {
      senderNickname = "익명";
    }

    const timestamp = Date.now();
    const newMessage: RealtimeChatMessage = {
      id: `${timestamp}-${Math.random().toString(36).slice(2)}`,
      sender: senderNickname,
      content: chatInput.trim(),
      timestamp,
    };

    // 로컬 상태에 추가 (self: false라서 본인 메시지는 broadcast로 안 옴)
    setChatMessages((prev) => [...prev, newMessage]);

    // 다른 클라이언트에 브로드캐스트
    broadcast("CHAT", {
      sender: senderNickname,
      content: chatInput.trim(),
      timestamp,
    });

    setChatInput("");
  }, [chatInput, currentRole, currentParticipantId, participants, broadcast]);

  // 채팅 입력 핸들러 (Enter 키)
  const handleChatKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    },
    [sendChatMessage]
  );

  // 공지 전송
  const sendAnnouncement = useCallback(() => {
    if (!announceInput.trim()) return;

    const content = announceInput.trim();

    // 로컬 상태 업데이트 (자신에게도 표시)
    setCurrentAnnouncement(content);

    // 다른 클라이언트에 브로드캐스트
    broadcast("ANNOUNCE", { content });

    setAnnounceInput("");
  }, [announceInput, broadcast]);

  // 공지 입력 핸들러 (Enter 키)
  const handleAnnounceKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendAnnouncement();
      }
    },
    [sendAnnouncement]
  );

  // 채팅 자동 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // AUCTION 타이머 로직
  useEffect(() => {
    if (!auctionState.timerRunning || phase !== "AUCTION") return;

    const interval = setInterval(() => {
      setAuctionState((prev) => {
        if (prev.timer <= 1) {
          // 타이머 종료 - HOST만 낙찰 처리
          return { ...prev, timer: 0, timerRunning: false };
        }
        return { ...prev, timer: prev.timer - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [auctionState.timerRunning, phase]);

  // 타이머 0초 도달 시 자동 낙찰 (HOST만)
  useEffect(() => {
    if (
      phase !== "AUCTION" ||
      currentRole !== "HOST" ||
      auctionState.timer !== 0 ||
      auctionState.timerRunning ||
      !auctionState.currentTargetId ||
      auctionState.showSoldAnimation
    ) {
      return;
    }

    // 입찰자가 있으면 낙찰, 없으면 유찰 (수동 처리)
    if (auctionState.highestBidTeamId) {
      handleSold();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionState.timer, auctionState.timerRunning, phase, currentRole]);

  // SHUFFLE 완료 후 경매 큐 초기화
  useEffect(() => {
    if (phase === "AUCTION" && shuffledOrder && auctionState.auctionQueue.length === 0) {
      setAuctionState((prev) => ({
        ...prev,
        auctionQueue: shuffledOrder,
        totalTargets: shuffledOrder.length,
      }));
    }
  }, [phase, shuffledOrder, auctionState.auctionQueue.length]);

  // 경매 시작 (주최자용)
  const handleStartAuction = useCallback(() => {
    if (!auctionState.auctionQueue.length) return;

    const targetId = auctionState.auctionQueue[0];
    const targetIndex = auctionState.currentTargetIndex;

    setAuctionState((prev) => ({
      ...prev,
      currentTargetId: targetId,
      timer: INITIAL_TIMER_SECONDS,
      timerRunning: true,
      currentPrice: 5,
      highestBidTeamId: null,
      bidHistory: [],
      bidLockUntil: 0,
      showSoldAnimation: false,
      lastSoldInfo: null,
    }));

    broadcast("AUCTION_START", {
      targetId,
      targetIndex,
      totalTargets: auctionState.totalTargets,
      startTime: Date.now(),
    });
  }, [auctionState.auctionQueue, auctionState.currentTargetIndex, auctionState.totalTargets, broadcast]);

  // 입찰 (팀장용)
  const handleBid = useCallback(
    async (amount: number) => {
      if (!myTeam || !auctionState.currentTargetId || !roomId) return;

      const now = Date.now();

      // 현재 최고 입찰자와 동일하면 입찰 불가
      if (auctionState.highestBidTeamId === myTeam.id) {
        console.log("이미 최고 입찰자입니다");
        return;
      }

      // 500ms 락 체크
      if (now < auctionState.bidLockUntil) {
        console.log("입찰 처리 중...");
        return;
      }

      // 유효성 검증
      const minBid = getNextMinBid(auctionState.currentPrice);
      if (amount < minBid) {
        console.log(`최소 입찰가는 ${minBid}p 입니다`);
        return;
      }
      if (amount > myTeam.currentPoints) {
        console.log("포인트가 부족합니다");
        return;
      }

      const newTimer = Math.min(
        auctionState.timer + BID_TIME_EXTENSION_SECONDS,
        INITIAL_TIMER_SECONDS
      );

      // 즉시 UI 업데이트 (낙관적 업데이트)
      setAuctionState((prev) => ({
        ...prev,
        currentPrice: amount,
        highestBidTeamId: myTeam.id,
        timer: newTimer,
        bidLockUntil: now + 500,
        bidHistory: [
          {
            teamId: myTeam.id,
            teamName: myTeam.name,
            teamColor: myTeam.color,
            amount,
            timestamp: now,
          },
          ...prev.bidHistory,
        ].slice(0, 10),
      }));

      // 브로드캐스트
      broadcast("BID", {
        teamId: myTeam.id,
        teamName: myTeam.name,
        teamColor: myTeam.color,
        amount,
        timestamp: now,
        newTimer,
      });

      // DB 저장 (fire and forget)
      try {
        await createBid({
          roomId,
          teamId: myTeam.id,
          targetId: auctionState.currentTargetId,
          amount,
        });
      } catch (err) {
        console.error("입찰 기록 실패:", err);
      }
    },
    [myTeam, auctionState, roomId, broadcast]
  );

  // 낙찰 처리 (주최자용)
  const handleSold = useCallback(async () => {
    if (!auctionState.currentTargetId || !auctionState.highestBidTeamId || !roomId) return;

    const winnerTeam = teams.find((t) => t.id === auctionState.highestBidTeamId);
    const target = participantsWithOnlineStatus.find((p) => p.id === auctionState.currentTargetId);
    if (!winnerTeam || !target) return;

    const finalPrice = auctionState.currentPrice;
    const auctionOrder = auctionState.completedCount + 1;

    // 업데이트된 포인트 계산
    const updatedPoints: Record<string, number> = {};
    teams.forEach((t) => {
      updatedPoints[t.id] =
        t.id === winnerTeam.id ? t.currentPoints - finalPrice : t.currentPoints;
    });

    // 로컬 상태 업데이트
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        currentPoints: updatedPoints[t.id] ?? t.currentPoints,
      }))
    );
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === target.id ? { ...p, teamId: winnerTeam.id } : p
      )
    );
    setAuctionState((prev) => ({
      ...prev,
      timerRunning: false,
      showSoldAnimation: true,
      lastSoldInfo: {
        targetId: target.id,
        targetNickname: target.nickname,
        winnerTeamId: winnerTeam.id,
        winnerTeamName: winnerTeam.name,
        winnerTeamColor: winnerTeam.color,
        finalPrice,
      },
      completedCount: prev.completedCount + 1,
      auctionQueue: prev.auctionQueue.filter((id) => id !== target.id),
    }));

    // 브로드캐스트
    broadcast("SOLD", {
      targetId: target.id,
      targetNickname: target.nickname,
      winnerTeamId: winnerTeam.id,
      winnerTeamName: winnerTeam.name,
      winnerTeamColor: winnerTeam.color,
      finalPrice,
      nextTargetId: null,
      updatedPoints,
      auctionOrder,
    });

    // DB 저장
    try {
      await recordSold({
        roomId,
        targetId: target.id,
        winnerTeamId: winnerTeam.id,
        finalPrice,
        auctionOrder,
      });
    } catch (err) {
      console.error("낙찰 기록 실패:", err);
    }
  }, [auctionState, teams, participantsWithOnlineStatus, roomId, broadcast]);

  // 다음 경매 (주최자용) - 낙찰 애니메이션 후 호출
  const handleNextAuction = useCallback(() => {
    const remainingQueue = auctionState.auctionQueue;

    // 마지막 1명 체크
    if (remainingQueue.length === 1) {
      // 자동 배정 처리
      const lastMemberId = remainingQueue[0];
      const lastMember = participantsWithOnlineStatus.find((p) => p.id === lastMemberId);
      // 팀원이 아직 가득 차지 않은 팀 찾기 (memberPerTeam은 팀장 포함이므로 -1)
      const availableTeam = teams.find(
        (t) =>
          participantsWithOnlineStatus.filter((p) => p.teamId === t.id && p.role === "MEMBER")
            .length < room!.memberPerTeam - 1
      );

      if (lastMember && availableTeam) {
        const updatedPoints: Record<string, number> = {};
        teams.forEach((t) => {
          updatedPoints[t.id] = t.currentPoints;
        });

        setTeams((prev) => prev);
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === lastMemberId ? { ...p, teamId: availableTeam.id } : p
          )
        );
        setAuctionState((prev) => ({
          ...prev,
          timerRunning: false,
          showSoldAnimation: true,
          lastSoldInfo: {
            targetId: lastMember.id,
            targetNickname: lastMember.nickname,
            winnerTeamId: availableTeam.id,
            winnerTeamName: availableTeam.name,
            winnerTeamColor: availableTeam.color,
            finalPrice: 0,
            isAutoAssignment: true,
          },
          completedCount: prev.completedCount + 1,
          auctionQueue: [],
        }));

        broadcast("SOLD", {
          targetId: lastMember.id,
          targetNickname: lastMember.nickname,
          winnerTeamId: availableTeam.id,
          winnerTeamName: availableTeam.name,
          winnerTeamColor: availableTeam.color,
          finalPrice: 0,
          nextTargetId: null,
          updatedPoints,
          isAutoAssignment: true,
          auctionOrder: auctionState.completedCount + 1,
        });

        // DB 저장
        recordSold({
          roomId: roomId!,
          targetId: lastMember.id,
          winnerTeamId: availableTeam.id,
          finalPrice: 0,
          auctionOrder: auctionState.completedCount + 1,
        }).catch(console.error);

        return;
      }
    }

    // 경매 완료 체크
    if (remainingQueue.length === 0) {
      setPhase("FINISHED");
      broadcast("PHASE_CHANGE", { phase: "FINISHED" });
      return;
    }

    // 다음 대상으로
    const nextTargetId = remainingQueue[0];
    setAuctionState((prev) => ({
      ...prev,
      currentTargetId: nextTargetId,
      currentTargetIndex: prev.currentTargetIndex + 1,
      timer: INITIAL_TIMER_SECONDS,
      timerRunning: false,
      currentPrice: 5,
      highestBidTeamId: null,
      bidHistory: [],
      bidLockUntil: 0,
      showSoldAnimation: false,
      lastSoldInfo: null,
    }));
  }, [auctionState, participantsWithOnlineStatus, teams, room, roomId, broadcast]);

  // 유찰 처리 (주최자용)
  const handlePass = useCallback(() => {
    if (!auctionState.currentTargetId || auctionState.auctionQueue.length === 0) return;

    // 현재 대상을 맨 뒤로
    const currentId = auctionState.auctionQueue[0];
    const newQueue = [...auctionState.auctionQueue.slice(1), currentId];
    const nextTargetId = newQueue[0];

    setAuctionState((prev) => ({
      ...prev,
      currentTargetId: nextTargetId,
      auctionQueue: newQueue,
      timer: INITIAL_TIMER_SECONDS,
      timerRunning: false,
      currentPrice: 5,
      highestBidTeamId: null,
      bidHistory: [],
      bidLockUntil: 0,
    }));

    broadcast("PASSED", {
      targetId: currentId,
      nextTargetId,
      newQueue,
    });
  }, [auctionState, broadcast]);

  const phaseLabels: Record<AuctionPhase, { emoji: string; label: string; color: string; bg: string }> = {
    WAITING: { emoji: "🔴", label: "대기 중", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
    CAPTAIN_INTRO: { emoji: "📢", label: "팀장 소개", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
    SHUFFLE: { emoji: "🎲", label: "팀원 셔플", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
    AUCTION: { emoji: "⚡", label: "경매 진행 중", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
    FINISHED: { emoji: "🏆", label: "경매 종료", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-slate-400">경매방을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !room) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <p className="text-red-400">{error || "경매방을 찾을 수 없습니다"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-slate-200 hover:bg-slate-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-200">{room.title}</h1>
            <div className="text-sm text-slate-400">
              진행: {participantsWithOnlineStatus.filter(p => p.role === "MEMBER" && p.teamId !== null).length}/
              {participantsWithOnlineStatus.filter(p => p.role === "MEMBER").length}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 주최자용 초대링크 버튼 */}
            {currentRole === "HOST" && (
              <motion.button
                className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowInviteModal(true)}
              >
                <span>🔗</span>
                <span>초대링크</span>
              </motion.button>
            )}

            {/* 디버그 컨트롤 (역할/페이즈 선택) */}
            <DebugControls
              currentRole={currentRole}
              currentPhase={phase}
              onRoleChange={setCurrentRole}
              onPhaseChange={setPhase}
            />
          </div>
        </div>

        {/* 페이즈 대형 표시 */}
        <div className={`border-t border-slate-700/30 px-6 py-2 ${phaseLabels[phase].bg}`}>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">{phaseLabels[phase].emoji}</span>
            <span className={`text-lg font-bold ${phaseLabels[phase].color}`}>
              {phaseLabels[phase].label}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar - Teams */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-700/50 bg-slate-900/50">
          <div className="p-4 pb-2 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
            <h2 className="text-sm font-semibold text-slate-400">
              {phase === "WAITING" ? "팀장 입장 현황" : "팀별 현황"}
            </h2>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {teams.map((team) => {
              const captain = participantsWithOnlineStatus.find((p) => p.id === team.captainId);
              const members = participantsWithOnlineStatus.filter((p) => p.teamId === team.id && p.role === "MEMBER");
              const isWaiting = phase === "WAITING";
              return (
                <motion.div
                  key={team.id}
                  className={`rounded-xl border p-3 ${
                    isWaiting
                      ? captain?.isOnline
                        ? "border-green-500/50 bg-green-500/10"
                        : "border-slate-700/50 bg-slate-800/30"
                      : "border-slate-700/50 bg-slate-800/30"
                  }`}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="font-semibold text-slate-200">{team.name}</span>
                    </div>
                    {!isWaiting && (
                      <span className="text-sm font-medium text-amber-400">
                        {team.currentPoints}p
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-500">👑</span>
                      <span className={captain?.isOnline ? "text-slate-300" : "text-slate-500"}>
                        {captain?.nickname}
                      </span>
                      {isWaiting && (
                        <span className={`ml-auto text-xs ${captain?.isOnline ? "text-green-400" : "text-slate-500"}`}>
                          {captain?.isOnline ? "접속 중" : "대기 중"}
                        </span>
                      )}
                      {!isWaiting && (
                        <span className="text-slate-500">({captain?.position})</span>
                      )}
                    </div>
                    {!isWaiting && (
                      <>
                        {members.map((m) => (
                          <div key={m.id} className="ml-4 text-slate-500">
                            └ {m.nickname} ({m.position})
                          </div>
                        ))}
                        {members.length === 0 && (
                          <div className="ml-4 text-slate-600">(팀원 없음)</div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </aside>

        {/* Center - Main auction area */}
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {phase === "AUCTION" && (
                <AuctionPhaseComponent
                  currentRole={currentRole}
                  teams={teams}
                  auctionState={auctionState}
                  myTeam={myTeam}
                  currentTarget={currentTarget}
                  onStartAuction={handleStartAuction}
                  onBid={handleBid}
                  onNextAuction={handleNextAuction}
                  onPass={handlePass}
                />
              )}

              {phase === "WAITING" && (
                <WaitingPhase
                  currentRole={currentRole}
                  teams={teams}
                  participants={participantsWithOnlineStatus}
                  onNextPhase={handleNextPhase}
                />
              )}

              {phase === "CAPTAIN_INTRO" && (
                <CaptainIntroPhase
                  currentRole={currentRole}
                  teams={teams}
                  participants={participantsWithOnlineStatus}
                  currentIndex={captainIntroIndex}
                  onNextCaptain={handleNextCaptain}
                />
              )}

              {/* 셔플 페이즈 */}
              {phase === "SHUFFLE" && (
                <ShufflePhase
                  currentRole={currentRole}
                  members={participantsWithOnlineStatus.filter(
                    (p) => p.role === "MEMBER" && p.teamId === null
                  )}
                  shuffledOrder={shuffledOrder}
                  shuffleState={shuffleState}
                  revealedCount={revealedCount}
                  animationSeed={animationSeed}
                  onStartShuffle={handleStartShuffle}
                  onNextPhase={handleNextPhase}
                />
              )}

              {/* 경매 종료 페이즈 */}
              {phase === "FINISHED" && (
                <motion.div
                  key="finished"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center"
                >
                  <motion.div
                    className="mb-6 text-8xl"
                    animate={{
                      rotate: [0, 10, -10, 10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    🏆
                  </motion.div>
                  <h2 className="mb-2 text-4xl font-bold text-amber-400">경매 종료!</h2>
                  <p className="mb-8 text-xl text-slate-400">모든 팀 구성이 완료되었습니다</p>

                  <motion.button
                    className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    결과 보기 →
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 주최자 공지 입력 */}
          {currentRole === "HOST" && (
            <div className="shrink-0 border-t border-slate-700/50 bg-slate-800/30 px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-red-400">📢</span>
                <input
                  type="text"
                  value={announceInput}
                  onChange={(e) => setAnnounceInput(e.target.value)}
                  onKeyDown={handleAnnounceKeyDown}
                  placeholder="공지할 내용을 입력하세요..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                />
                <motion.button
                  onClick={sendAnnouncement}
                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  공지하기
                </motion.button>
              </div>
            </div>
          )}

          {/* 비주최자 공지 표시 (공지가 있을 때만) */}
          {currentRole !== "HOST" && currentAnnouncement && (
            <div className="shrink-0 border-t border-slate-700/50 bg-slate-800/30 px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-red-400">📢</span>
                <span className="text-sm text-slate-200">{currentAnnouncement}</span>
              </div>
            </div>
          )}

          {/* Next in queue - 전체 대기열 그리드 */}
          {(() => {
            const showOrder = phase === "SHUFFLE" || phase === "AUCTION" || phase === "FINISHED";
            const queueTitle = showOrder ? "📜 경매 대기열" : "👥 경매 대상 팀원";
            const queueBadge = showOrder
              ? `${auctionQueue.length}명 대기`
              : `총 ${auctionQueue.length}명`;

            return (
              <div className="shrink-0 border-t border-slate-700/50 bg-slate-900/50 px-6 py-4 max-h-[200px] overflow-y-auto">
                <div className="mb-3 flex items-center gap-2 sticky top-0 bg-slate-900/90 py-1 -mt-1 backdrop-blur-sm">
                  <span className="text-sm font-semibold text-slate-400">{queueTitle}</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                    {queueBadge}
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {auctionQueue.map((member, index) => (
                    <motion.div
                      key={member.id}
                      className={`relative rounded-lg border px-2 py-2 text-center ${
                        showOrder && index === 0
                          ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                          : "border-slate-700/50 bg-slate-800/30"
                      }`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ scale: 1.05, y: -2, zIndex: 10 }}
                    >
                      {/* 순서 뱃지 - 셔플 이후에만 표시 */}
                      {showOrder && (
                        <div className={`absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-amber-500 text-slate-900"
                            : "bg-slate-700 text-slate-300"
                        }`}>
                          {member.order}
                        </div>
                      )}
                      <div className="text-xs font-medium text-slate-200 truncate">{member.nickname}</div>
                      <div className="text-[10px] text-slate-500 truncate">{member.position}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })()}
        </main>

        {/* Right sidebar - Chat */}
        <aside className="flex w-80 shrink-0 min-h-0 flex-col border-l border-slate-700/50 bg-slate-900/50">
          {/* Chat header */}
          <div className="flex shrink-0 items-center justify-center border-b border-slate-700/50 py-3">
            <span className="text-sm font-medium text-amber-400">전체 채팅</span>
          </div>

          {/* Chat messages */}
          <div
            ref={chatContainerRef}
            className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3"
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-4">
                아직 메시지가 없습니다
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <span className="font-medium text-amber-400">{msg.sender}</span>
                  <span className="ml-2 text-slate-300">{msg.content}</span>
                </div>
              ))
            )}
          </div>

          {/* Chat input */}
          <div className="shrink-0 border-t border-slate-700/50 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="메시지 입력..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <motion.button
                onClick={sendChatMessage}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                전송
              </motion.button>
            </div>
          </div>
        </aside>
      </div>

      {/* 초대링크 모달 */}
      {showInviteModal && room && (
        <InviteLinksModal
          room={room}
          teams={teamsWithCaptain}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
