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
  NextTargetPayload,
  NextRoundPayload,
  AutoAssignPayload,
} from "@/types";
import { useRoomChannel, usePresence, useDbChanges } from "@/lib/realtime";
import {
  getAuctionById,
  getTeamsByRoomId,
  getParticipantsByRoomId,
  getAuctionResultsByRoomId,
  createBid,
  recordSold,
  resetAuction,
  updateRealtimeState,
  saveShuffleState,
  saveCaptainIntroIndex,
  placeBidServer,
} from "@/lib/api/auction";
import DebugControls from "./components/DebugControls";
import WaitingPhase from "./components/phases/WaitingPhase";
import CaptainIntroPhase from "./components/phases/CaptainIntroPhase";
import ShufflePhase, { ShuffleState } from "./components/phases/ShufflePhase";
import AuctionPhaseComponent from "./components/phases/AuctionPhase";
import RandomAssignPhase from "./components/phases/RandomAssignPhase";
import FinishedPhase from "./components/phases/FinishedPhase";
import InviteLinksModal from "@/components/InviteLinksModal";
import { shuffleArray, getNextMinBid } from "@/lib/auction-utils";
import {
  INITIAL_TIMER_SECONDS,
  MIN_TIMER_THRESHOLD,
  TIMER_INTERVAL_MS,
  ENABLE_SERVER_SIDE_BID,
} from "@/lib/constants";

// 프로덕션에서 HOST에게 디버그 컨트롤 표시 여부 (나중에 false로 변경하면 아무도 못 봄)
const SHOW_DEBUG_IN_PROD_FOR_HOST = true;

// AUCTION 상태 초기값
const INITIAL_AUCTION_STATE: AuctionState = {
  currentTargetId: null,
  currentTargetIndex: 0,
  totalTargets: 0,
  auctionQueue: [],
  timer: INITIAL_TIMER_SECONDS,
  timerEndAt: 0, // 타이머 종료 시각 (ms 타임스탬프)
  timerRunning: false,
  currentPrice: 0,
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
  // 팀원별 낙찰 가격 (memberId -> soldPrice)
  const [memberSoldPrices, setMemberSoldPrices] = useState<Record<string, number>>({});
  // 초기화 중 상태
  const [isResetting, setIsResetting] = useState(false);
  // 유찰된 멤버 ID 목록 (현재 라운드)
  const [passedMemberIds, setPassedMemberIds] = useState<Set<string>>(new Set());
  // 멤버별 유찰 횟수 (memberId -> passCount) - 2번 유찰 시 랜덤 배분
  const [memberPassCount, setMemberPassCount] = useState<Record<string, number>>({});
  // 현재 라운드
  const [currentRound, setCurrentRound] = useState(1);
  // 랜덤 배분 UI 상태
  const [showRandomAssignPhase, setShowRandomAssignPhase] = useState(false);
  const [randomAssignTargets, setRandomAssignTargets] = useState<string[]>([]);
  const [preCalculatedAssignments, setPreCalculatedAssignments] = useState<
    { memberId: string; teamId: string; teamName: string; teamColor: string }[]
  >([]);

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

        // DB에서 실시간 상태 복구
        // 1. 팀장 소개 인덱스
        if (roomData.captainIntroIndex > 0) {
          setCaptainIntroIndex(roomData.captainIntroIndex);
        }

        // 2. 셔플 순서 복구
        if (roomData.shuffleOrder && roomData.shuffleOrder.length > 0) {
          setShuffledOrder(roomData.shuffleOrder);
          // 셔플이 완료된 상태라면 COMPLETE로 설정
          if (roomData.phase === "AUCTION" || roomData.phase === "FINISHED") {
            setShuffleState("COMPLETE");
            setRevealedCount(roomData.shuffleOrder.length);
          }
        }

        // 3. AUCTION 상태 복구
        if (roomData.phase === "AUCTION" && roomData.auctionQueue && roomData.auctionQueue.length > 0) {
          // 타이머 계산: timerEndAt에서 현재 시간 빼기
          let remainingTimer = INITIAL_TIMER_SECONDS;
          let isTimerRunning = false;
          let timerEndAtMs = 0;

          if (roomData.timerEndAt && roomData.timerRunning) {
            const endTime = new Date(roomData.timerEndAt).getTime();
            const now = Date.now();
            const remaining = Math.floor((endTime - now) / 100); // 0.1초 단위
            if (remaining > 0) {
              remainingTimer = remaining;
              isTimerRunning = true;
              timerEndAtMs = endTime;
            }
          }

          setAuctionState({
            currentTargetId: roomData.currentTargetId,
            currentTargetIndex: roomData.auctionQueue.indexOf(roomData.currentTargetId || "") || 0,
            totalTargets: roomData.auctionQueue.length,
            auctionQueue: roomData.auctionQueue,
            timer: remainingTimer,
            timerEndAt: timerEndAtMs,
            timerRunning: isTimerRunning,
            currentPrice: roomData.currentPrice ?? 0,
            highestBidTeamId: roomData.highestBidTeamId,
            bidHistory: [],
            bidLockUntil: 0,
            showSoldAnimation: false,
            lastSoldInfo: null,
            completedCount: roomData.completedCount || 0,
          });

          // 라운드 상태 복구
          if (roomData.currentRound) {
            setCurrentRound(roomData.currentRound);
          }
          if (roomData.memberPassCount) {
            setMemberPassCount(roomData.memberPassCount);
          }
          if (roomData.passedMemberIds) {
            setPassedMemberIds(new Set(roomData.passedMemberIds));
          }

          // memberSoldPrices 복구 (auction_results 테이블에서)
          const auctionResults = await getAuctionResultsByRoomId(roomId);
          if (auctionResults.length > 0) {
            const soldPrices: Record<string, number> = {};
            auctionResults.forEach((result) => {
              soldPrices[result.targetId] = result.finalPrice;
            });
            setMemberSoldPrices(soldPrices);
          }
        }

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

  // DB Changes 구독 (Broadcast 손실 시 상태 복구 백업)
  useDbChanges(
    "auction_rooms",
    `id=eq.${roomId}`,
    useCallback((payload: { new: Record<string, unknown> }) => {
      const newData = payload.new;
      if (!newData || phase !== "AUCTION") return;

      // DB 변경으로 경매 상태 복구 (Broadcast 손실 시 안전장치)
      setAuctionState((prev) => {
        const dbCurrentPrice = newData.current_price as number | null;
        const dbHighestBidTeamId = newData.highest_bid_team_id as string | null;
        const dbTimerEndAt = newData.timer_end_at as string | null;

        // 이미 최신 상태면 무시 (중복 업데이트 방지)
        if (dbCurrentPrice != null && dbCurrentPrice <= prev.currentPrice) {
          return prev;
        }

        const timerEndAt = dbTimerEndAt
          ? new Date(dbTimerEndAt).getTime()
          : prev.timerEndAt;

        return {
          ...prev,
          currentPrice: dbCurrentPrice ?? prev.currentPrice,
          highestBidTeamId: dbHighestBidTeamId ?? prev.highestBidTeamId,
          timerEndAt,
          timer: Math.ceil((timerEndAt - Date.now()) / 100),
        };
      });
    }, [phase])
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
  // 버그 1 수정: AUCTION 페이즈에서는 auctionState.auctionQueue 기반으로 참가자 정보 조합
  const auctionQueue = useMemo(() => {
    // AUCTION 페이즈에서는 auctionState.auctionQueue ID 목록 기반으로 참가자 정보 조합
    // (낙찰된 사람도 대기열에 유지됨)
    if (phase === "AUCTION" && auctionState.auctionQueue.length > 0) {
      return auctionState.auctionQueue
        .map((id, index) => {
          const p = participantsWithOnlineStatus.find((participant) => participant.id === id);
          return p ? { ...p, order: index + 1 } : null;
        })
        .filter((p): p is Participant & { order: number } => p !== null);
    }

    // 셔플 완료 후에는 셔플된 순서로 모든 멤버 표시
    if (shuffledOrder && shuffledOrder.length > 0 && shuffleState === "COMPLETE") {
      return shuffledOrder
        .map((id, index) => {
          const p = participantsWithOnlineStatus.find((participant) => participant.id === id);
          return p ? { ...p, order: index + 1 } : null;
        })
        .filter((p): p is Participant & { order: number } => p !== null);
    }

    // 그 외에는 아직 배정 안 된 멤버만
    const members = participantsWithOnlineStatus
      .filter((p) => p.role === "MEMBER" && p.teamId === null);
    return members.map((p, index) => ({ ...p, order: index + 1 }));
  }, [participantsWithOnlineStatus, shuffledOrder, shuffleState, phase, auctionState.auctionQueue]);

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

  // 현재 팀장의 팀이 가득 찼는지 확인 (팀원 수 >= memberPerTeam - 1)
  const isMyTeamFull = useMemo(() => {
    if (!myTeam || !room) return false;
    const memberCount = participantsWithOnlineStatus.filter(
      (p) => p.teamId === myTeam.id && p.role === "MEMBER"
    ).length;
    // memberPerTeam은 팀장 포함이므로, 팀원 자리는 memberPerTeam - 1개
    return memberCount >= room.memberPerTeam - 1;
  }, [myTeam, room, participantsWithOnlineStatus]);

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
        const now = Date.now();
        const displayTimer = Math.ceil((payload.timerEndAt - now) / 100);
        setAuctionState((prev) => ({
          ...prev,
          currentTargetId: payload.targetId,
          currentTargetIndex: payload.targetIndex,
          totalTargets: payload.totalTargets,
          timer: displayTimer > 0 ? displayTimer : INITIAL_TIMER_SECONDS,
          timerEndAt: payload.timerEndAt,
          timerRunning: true,
          currentPrice: 0,
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
        const now = Date.now();
        setAuctionState((prev) => {
          if (payload.timestamp < prev.bidLockUntil) {
            // 락 기간 내 입찰 무시
            return prev;
          }
          if (payload.amount <= prev.currentPrice) {
            // 현재가보다 낮은 입찰 무시
            return prev;
          }
          // timerEndAt 절대 시간 기준으로 동기화
          const displayTimer = Math.ceil((payload.timerEndAt - now) / 100);
          return {
            ...prev,
            currentPrice: payload.amount,
            highestBidTeamId: payload.teamId,
            timerEndAt: payload.timerEndAt,
            timer: Math.max(0, displayTimer),
            // bidLockUntil은 내 입찰에서만 설정 (다른 팀 입찰로 내 락이 갱신되면 안 됨)
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
          // 1초(10단위) 이상 차이나면 동기화
          if (Math.abs(prev.timer - serverTimer) > 10) {
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
        // 낙찰 가격 저장
        setMemberSoldPrices((prev) => ({
          ...prev,
          [payload.targetId]: payload.finalPrice,
        }));
        // 낙찰 애니메이션 표시 (auctionQueue는 유지)
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
          // auctionQueue는 유지 (제거하지 않음)
        }));
        break;
      }
      case "PASSED": {
        const payload = event.payload as unknown as PassedPayload;
        // 유찰된 멤버 추가
        setPassedMemberIds((prev) => new Set([...prev, payload.targetId]));
        setAuctionState((prev) => ({
          ...prev,
          currentTargetId: payload.nextTargetId,
          currentTargetIndex: payload.nextIndex,
          timer: INITIAL_TIMER_SECONDS,
          timerRunning: false,
          currentPrice: 0,
          highestBidTeamId: null,
          bidHistory: [],
          bidLockUntil: 0,
        }));
        break;
      }
      case "NEXT_TARGET": {
        const payload = event.payload as unknown as NextTargetPayload;
        setAuctionState((prev) => ({
          ...prev,
          currentTargetId: payload.targetId,
          currentTargetIndex: payload.targetIndex,
          timer: INITIAL_TIMER_SECONDS,
          timerRunning: false,
          currentPrice: 0,
          highestBidTeamId: null,
          bidHistory: [],
          bidLockUntil: 0,
          showSoldAnimation: false,
          lastSoldInfo: null,
        }));
        break;
      }
      case "NEXT_ROUND": {
        const payload = event.payload as unknown as NextRoundPayload;
        setCurrentRound(payload.round);
        setPassedMemberIds(new Set()); // 이번 라운드 유찰 목록 초기화
        setAuctionState((prev) => ({
          ...prev,
          currentTargetId: payload.firstTargetId,
          currentTargetIndex: payload.firstTargetIndex,
          timer: INITIAL_TIMER_SECONDS,
          timerRunning: false,
          currentPrice: 0,
          highestBidTeamId: null,
          bidHistory: [],
          bidLockUntil: 0,
          showSoldAnimation: false,
          lastSoldInfo: null,
        }));
        break;
      }
      case "AUTO_ASSIGN": {
        const payload = event.payload as unknown as AutoAssignPayload;
        // 각 배정에 대해 참가자 및 낙찰 가격 업데이트
        payload.assignments.forEach((assignment) => {
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === assignment.memberId
                ? { ...p, teamId: assignment.teamId }
                : p
            )
          );
          setMemberSoldPrices((prev) => ({
            ...prev,
            [assignment.memberId]: 0, // 자동 배정은 0p
          }));
        });
        break;
      }
      case "RANDOM_ASSIGN_START": {
        // 랜덤 배분 UI 표시 (다른 클라이언트)
        const targetIds = event.payload.targetIds as string[];
        const assignments = event.payload.assignments as { memberId: string; teamId: string; teamName: string; teamColor: string }[];
        setRandomAssignTargets(targetIds);
        setPreCalculatedAssignments(assignments);
        setShowRandomAssignPhase(true);
        break;
      }
      case "RANDOM_ASSIGN_COMPLETE": {
        // 랜덤 배분 완료 (애니메이션 후)
        const assignments = event.payload.assignments as { memberId: string; teamId: string; teamName: string; teamColor: string }[];
        assignments.forEach((assignment) => {
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === assignment.memberId
                ? { ...p, teamId: assignment.teamId }
                : p
            )
          );
          setMemberSoldPrices((prev) => ({
            ...prev,
            [assignment.memberId]: 0,
          }));
        });
        setShowRandomAssignPhase(false);
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
      // DB에 phase 저장 (새 접속자가 현재 페이즈를 볼 수 있도록)
      if (roomId) {
        updateRealtimeState(roomId, { phase: nextPhase });
      }
    }
  }, [phase, broadcast, roomId]);

  // 경매 초기화 (디버그용)
  const handleReset = useCallback(async () => {
    if (!roomId) return;

    setIsResetting(true);
    try {
      await resetAuction(roomId);
      // 페이지 새로고침으로 모든 상태 초기화
      window.location.reload();
    } catch (err) {
      console.error("초기화 실패:", err);
      alert("초기화 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"));
    } finally {
      setIsResetting(false);
    }
  }, [roomId]);

  // 다음 팀장 소개 (주최자용)
  const handleNextCaptain = useCallback(async () => {
    const isLastCaptain = captainIntroIndex === teams.length - 1;
    if (isLastCaptain) {
      // 마지막 팀장이면 다음 페이즈로
      handleNextPhase();
    } else {
      // 다음 팀장으로
      const nextIndex = captainIntroIndex + 1;
      setCaptainIntroIndex(nextIndex);
      broadcast("CAPTAIN_INDEX_CHANGE", { index: nextIndex });

      // DB 동기화
      if (roomId) {
        saveCaptainIntroIndex(roomId, nextIndex).catch(console.error);
      }
    }
  }, [captainIntroIndex, teams.length, broadcast, handleNextPhase, roomId]);

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

          // DB 동기화 - 셔플 순서 저장
          if (roomId) {
            saveShuffleState(roomId, shuffled).catch(console.error);
          }
        }
      }, 500);
    }, 10000);
  }, [participantsWithOnlineStatus, broadcast, roomId]);

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

  // AUCTION 타이머 로직 (timerEndAt 절대 시간 기준)
  useEffect(() => {
    if (!auctionState.timerRunning || phase !== "AUCTION" || !auctionState.timerEndAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, auctionState.timerEndAt - now);
      const displayTimer = Math.ceil(remaining / 100);

      setAuctionState((prev) => {
        if (displayTimer <= 0) {
          // 타이머 종료 - HOST만 낙찰 처리
          return { ...prev, timer: 0, timerRunning: false };
        }
        return { ...prev, timer: displayTimer };
      });
    }, TIMER_INTERVAL_MS); // 100ms (0.1초)

    return () => clearInterval(interval);
  }, [auctionState.timerRunning, auctionState.timerEndAt, phase]);

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

  // SHUFFLE 완료 후 경매 큐 초기화 + 첫 대상 자동 설정 (버그 4 해결)
  useEffect(() => {
    if (phase === "AUCTION" && shuffledOrder && auctionState.auctionQueue.length === 0) {
      const firstTargetId = shuffledOrder[0];
      setAuctionState((prev) => ({
        ...prev,
        auctionQueue: shuffledOrder,
        totalTargets: shuffledOrder.length,
        currentTargetId: firstTargetId, // 첫 대상 자동 설정
        currentTargetIndex: 0,
        timerRunning: false, // 매물 소개 상태 (타이머 멈춤)
      }));
    }
  }, [phase, shuffledOrder, auctionState.auctionQueue.length]);

  // 다음 경매 대상 찾기 (현재 라운드에서 아직 처리 안 된 사람) - handleStartAuction보다 먼저 정의
  const findNextTarget = useCallback((
    queue: string[],
    startIndex: number,
    soldPrices: Record<string, number>,
    passedIds: Set<string>
  ): { id: string; index: number } | null => {
    for (let i = startIndex; i < queue.length; i++) {
      const id = queue[i];
      // 낙찰되지 않고, 이번 라운드에서 유찰되지 않은 사람
      if (soldPrices[id] === undefined && !passedIds.has(id)) {
        return { id, index: i };
      }
    }
    return null;
  }, []);

  // 경매 시작 (주최자용) - 버그 2 해결: currentTargetId가 있으면 타이머만 시작
  const handleStartAuction = useCallback(() => {
    if (!auctionState.auctionQueue.length) return;

    const now = Date.now();
    const timerEndAtMs = now + INITIAL_TIMER_SECONDS * 100; // ms 타임스탬프
    const timerEndAtISO = new Date(timerEndAtMs).toISOString();

    if (!auctionState.currentTargetId) {
      // 첫 경매인 경우 (currentTargetId가 없을 때)
      const firstTarget = findNextTarget(auctionState.auctionQueue, 0, memberSoldPrices, passedMemberIds);
      if (!firstTarget) return;

      setAuctionState((prev) => ({
        ...prev,
        currentTargetId: firstTarget.id,
        currentTargetIndex: firstTarget.index,
        timer: INITIAL_TIMER_SECONDS,
        timerEndAt: timerEndAtMs,
        timerRunning: true,
        currentPrice: 0,
        highestBidTeamId: null,
        bidHistory: [],
        bidLockUntil: 0,
        showSoldAnimation: false,
        lastSoldInfo: null,
      }));

      broadcast("AUCTION_START", {
        targetId: firstTarget.id,
        targetIndex: firstTarget.index,
        totalTargets: auctionState.totalTargets,
        startTime: now,
        timerEndAt: timerEndAtMs,
      });

      // DB 동기화
      if (roomId) {
        updateRealtimeState(roomId, {
          currentTargetId: firstTarget.id,
          currentPrice: 0,
          highestBidTeamId: null,
          timerEndAt: timerEndAtISO,
          timerRunning: true,
        }).catch(console.error);
      }
    } else {
      // 매물 소개 상태에서 경매 시작 (currentTargetId가 이미 있을 때 - 타이머만 시작)
      setAuctionState((prev) => ({
        ...prev,
        timer: INITIAL_TIMER_SECONDS,
        timerEndAt: timerEndAtMs,
        timerRunning: true,
        currentPrice: 0,
        highestBidTeamId: null,
        bidHistory: [],
        bidLockUntil: 0,
      }));

      broadcast("AUCTION_START", {
        targetId: auctionState.currentTargetId,
        targetIndex: auctionState.currentTargetIndex,
        totalTargets: auctionState.totalTargets,
        startTime: now,
        timerEndAt: timerEndAtMs,
      });

      // DB 동기화
      if (roomId) {
        updateRealtimeState(roomId, {
          currentPrice: 0,
          highestBidTeamId: null,
          timerEndAt: timerEndAtISO,
          timerRunning: true,
        }).catch(console.error);
      }
    }
  }, [auctionState, memberSoldPrices, passedMemberIds, findNextTarget, broadcast, roomId]);

  // 입찰 (팀장용)
  const handleBid = useCallback(
    async (amount: number) => {
      if (!myTeam || !auctionState.currentTargetId || !roomId) return;

      const now = Date.now();

      // === 클라이언트 사전 검증 (빠른 피드백용, 서버/기존 방식 공통) ===
      if (auctionState.highestBidTeamId === myTeam.id) {
        console.log("이미 최고 입찰자입니다");
        return;
      }

      if (now < auctionState.bidLockUntil) {
        console.log("입찰 처리 중...");
        return;
      }

      const minBid = getNextMinBid(auctionState.currentPrice);
      if (amount < minBid) {
        console.log(`최소 입찰가는 ${minBid}p 입니다`);
        return;
      }
      if (amount > myTeam.currentPoints) {
        console.log("포인트가 부족합니다");
        return;
      }

      // === Feature Flag: 서버 검증 vs 기존 방식 ===
      if (ENABLE_SERVER_SIDE_BID) {
        // [새 방식] 서버 사이드 입찰 검증
        try {
          const result = await placeBidServer({
            roomId,
            teamId: myTeam.id,
            targetId: auctionState.currentTargetId,
            amount,
          });

          if (!result.success) {
            // 서버 검증 실패 처리
            switch (result.error) {
              case "BID_TOO_SOON":
                // 동시 입찰 방지: 다른 사람이 먼저 입찰함
                console.log(
                  `입찰 실패: 동시 입찰 감지 (${result.wait_ms}ms 후 재시도 가능)`
                );
                break;
              case "ALREADY_HIGHEST_BIDDER":
                console.log("입찰 실패: 이미 최고 입찰자입니다");
                break;
              case "BELOW_MIN_BID":
                console.log(`입찰 실패: 최소 입찰가는 ${result.min_bid}p 입니다`);
                break;
              case "INSUFFICIENT_POINTS":
                console.log(
                  `입찰 실패: 포인트 부족 (보유: ${result.available}p)`
                );
                break;
              case "TIMER_EXPIRED":
                console.log("입찰 실패: 경매가 종료되었습니다");
                break;
              case "TIMER_NOT_RUNNING":
                console.log("입찰 실패: 경매가 진행 중이 아닙니다");
                break;
              default:
                console.log("입찰 실패:", result.error, result.message);
            }
            return;
          }

          // 성공 시 UI 업데이트 (서버 시간 기준)
          const serverTimerEndAt = result.timer_end_at
            ? new Date(result.timer_end_at).getTime()
            : auctionState.timerEndAt;
          const displayTimer = Math.ceil((serverTimerEndAt - Date.now()) / 100);

          setAuctionState((prev) => ({
            ...prev,
            currentPrice: result.amount!,
            highestBidTeamId: result.team_id!,
            timerEndAt: serverTimerEndAt,
            timer: Math.max(0, displayTimer),
            bidLockUntil: Date.now() + 500,
            bidHistory: [
              {
                teamId: myTeam.id,
                teamName: myTeam.name,
                teamColor: myTeam.color,
                amount: result.amount!,
                timestamp: Date.now(),
              },
              ...prev.bidHistory,
            ].slice(0, 10),
          }));

          // Broadcast (다른 클라이언트에게 알림)
          broadcast("BID", {
            teamId: result.team_id,
            teamName: myTeam.name,
            teamColor: myTeam.color,
            amount: result.amount,
            timestamp: Date.now(),
            timerEndAt: serverTimerEndAt,
          });
        } catch (err) {
          console.error("서버 입찰 처리 오류:", err);
        }
      } else {
        // [기존 방식] 클라이언트 사이드 (롤백 시 사용)
        const remainingMs = Math.max(0, auctionState.timerEndAt - now);

        let newEndAt: number;
        if (remainingMs <= MIN_TIMER_THRESHOLD * 100) {
          newEndAt = now + MIN_TIMER_THRESHOLD * 100;
        } else {
          newEndAt = auctionState.timerEndAt;
        }

        const displayTimer = Math.ceil((newEndAt - now) / 100);

        // 즉시 UI 업데이트 (낙관적 업데이트)
        setAuctionState((prev) => ({
          ...prev,
          currentPrice: amount,
          highestBidTeamId: myTeam.id,
          timerEndAt: newEndAt,
          timer: displayTimer,
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

        // 브로드캐스트 (timerEndAt 절대 시간 전송)
        broadcast("BID", {
          teamId: myTeam.id,
          teamName: myTeam.name,
          teamColor: myTeam.color,
          amount,
          timestamp: now,
          timerEndAt: newEndAt,
        });

        // DB 저장 (fire and forget)
        try {
          await createBid({
            roomId,
            teamId: myTeam.id,
            targetId: auctionState.currentTargetId,
            amount,
          });

          await updateRealtimeState(roomId, {
            currentPrice: amount,
            highestBidTeamId: myTeam.id,
            timerEndAt: new Date(newEndAt).toISOString(),
          });
        } catch (err) {
          console.error("입찰 기록 실패:", err);
        }
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
    // 낙찰 가격 저장
    setMemberSoldPrices((prev) => ({
      ...prev,
      [target.id]: finalPrice,
    }));
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
      // auctionQueue는 유지 (제거하지 않음)
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

      // 실시간 상태 DB 동기화
      await updateRealtimeState(roomId, {
        timerRunning: false,
        completedCount: auctionOrder,
      });
    } catch (err) {
      console.error("낙찰 기록 실패:", err);
    }
  }, [auctionState, teams, participantsWithOnlineStatus, roomId, broadcast]);

  // 자동 랜덤 배정
  const autoAssignRemaining = useCallback((unsoldIds: string[]) => {
    if (!room) return;

    // 현재 배정된 팀원 수 계산 (memberSoldPrices 기준)
    const teamMemberCounts: Record<string, number> = {};
    teams.forEach((t) => {
      teamMemberCounts[t.id] = participantsWithOnlineStatus.filter(
        (p) => p.teamId === t.id && p.role === "MEMBER"
      ).length;
    });

    // 랜덤 셔플
    const shuffledIds = [...unsoldIds].sort(() => Math.random() - 0.5);
    const assignments: { memberId: string; teamId: string; teamName: string; teamColor: string }[] = [];

    for (const memberId of shuffledIds) {
      // 자리가 남은 팀 찾기
      const availableTeam = teams.find((t) => {
        const currentCount = teamMemberCounts[t.id] + assignments.filter((a) => a.teamId === t.id).length;
        return currentCount < room.memberPerTeam - 1; // 팀장 제외
      });

      if (availableTeam) {
        assignments.push({
          memberId,
          teamId: availableTeam.id,
          teamName: availableTeam.name,
          teamColor: availableTeam.color,
        });
      }
    }

    // 각 배정 처리
    assignments.forEach((assignment) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === assignment.memberId
            ? { ...p, teamId: assignment.teamId }
            : p
        )
      );
      setMemberSoldPrices((prev) => ({
        ...prev,
        [assignment.memberId]: 0,
      }));

      // DB 저장
      recordSold({
        roomId: roomId!,
        targetId: assignment.memberId,
        winnerTeamId: assignment.teamId,
        finalPrice: 0,
        auctionOrder: auctionState.completedCount + 1,
      }).catch(console.error);
    });

    // 브로드캐스트
    broadcast("AUTO_ASSIGN", { assignments });

    // 경매 종료
    setPhase("FINISHED");
    broadcast("PHASE_CHANGE", { phase: "FINISHED" });
  }, [teams, participantsWithOnlineStatus, room, roomId, auctionState.completedCount, broadcast]);

  // 단일 멤버 랜덤 배정 (2번째 유찰 시)
  const autoAssignSingleMember = useCallback((memberId: string) => {
    if (!room) return;

    // 자리가 남은 팀 찾기
    const teamsWithSlots = teams.filter((t) => {
      const memberCount = participantsWithOnlineStatus.filter(
        (p) => p.teamId === t.id && p.role === "MEMBER"
      ).length;
      return memberCount < room.memberPerTeam - 1; // 팀장 제외
    });

    if (teamsWithSlots.length === 0) return;

    // 랜덤으로 팀 선택
    const randomTeam = teamsWithSlots[Math.floor(Math.random() * teamsWithSlots.length)];
    const target = participantsWithOnlineStatus.find((p) => p.id === memberId);
    if (!target || !randomTeam) return;

    // 참가자 팀 배정
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === memberId ? { ...p, teamId: randomTeam.id } : p
      )
    );

    // 낙찰 가격 기록 (0원 = 랜덤 배정)
    setMemberSoldPrices((prev) => ({
      ...prev,
      [memberId]: 0,
    }));

    // 완료 카운트 증가
    setAuctionState((prev) => ({
      ...prev,
      completedCount: prev.completedCount + 1,
      showSoldAnimation: true,
      lastSoldInfo: {
        targetId: memberId,
        targetNickname: target.nickname,
        winnerTeamId: randomTeam.id,
        winnerTeamName: randomTeam.name,
        winnerTeamColor: randomTeam.color,
        finalPrice: 0,
        isAutoAssignment: true,
      },
    }));

    // 브로드캐스트
    broadcast("SOLD", {
      targetId: memberId,
      targetNickname: target.nickname,
      winnerTeamId: randomTeam.id,
      winnerTeamName: randomTeam.name,
      winnerTeamColor: randomTeam.color,
      finalPrice: 0,
      nextTargetId: null,
      updatedPoints: teams.reduce((acc, t) => ({ ...acc, [t.id]: t.currentPoints }), {}),
      isAutoAssignment: true,
      auctionOrder: auctionState.completedCount + 1,
    });

    // DB 저장
    recordSold({
      roomId: roomId!,
      targetId: memberId,
      winnerTeamId: randomTeam.id,
      finalPrice: 0,
      auctionOrder: auctionState.completedCount + 1,
    }).catch(console.error);
  }, [teams, participantsWithOnlineStatus, room, roomId, auctionState.completedCount, broadcast]);

  // 다음 라운드 시작
  const startNextRound = useCallback((passedIds: Set<string>) => {
    const queue = auctionState.auctionQueue;
    // 유찰된 사람 중 첫 번째 (낙찰되지 않은)
    let firstPassedIndex = -1;
    let firstPassedId: string | null = null;

    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      if (passedIds.has(id) && memberSoldPrices[id] === undefined) {
        firstPassedId = id;
        firstPassedIndex = i;
        break;
      }
    }

    if (!firstPassedId || firstPassedIndex === -1) {
      // 유찰된 사람이 없으면 경매 종료
      setPhase("FINISHED");
      broadcast("PHASE_CHANGE", { phase: "FINISHED" });
      return;
    }

    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    setPassedMemberIds(new Set()); // 이번 라운드 유찰 목록 초기화
    setAuctionState((prev) => ({
      ...prev,
      currentTargetId: firstPassedId,
      currentTargetIndex: firstPassedIndex,
      timer: INITIAL_TIMER_SECONDS,
      timerRunning: false,
      currentPrice: 0,
      highestBidTeamId: null,
      bidHistory: [],
      bidLockUntil: 0,
      showSoldAnimation: false,
      lastSoldInfo: null,
    }));

    broadcast("NEXT_ROUND", {
      round: nextRound,
      firstTargetId: firstPassedId,
      firstTargetIndex: firstPassedIndex,
    });

    // DB 동기화 (라운드 전환)
    if (roomId) {
      updateRealtimeState(roomId, {
        currentRound: nextRound,
        passedMemberIds: [], // 새 라운드 시작 시 초기화
        currentTargetId: firstPassedId,
        currentPrice: 0,
        highestBidTeamId: null,
        timerRunning: false,
      }).catch(console.error);
    }
  }, [auctionState.auctionQueue, memberSoldPrices, currentRound, broadcast, roomId]);

  // 랜덤 배분 미리 계산
  const calculateRandomAssignments = useCallback((unsoldIds: string[]) => {
    if (!room) return [];

    // 현재 배정된 팀원 수 계산
    const teamMemberCounts: Record<string, number> = {};
    teams.forEach((t) => {
      teamMemberCounts[t.id] = participantsWithOnlineStatus.filter(
        (p) => p.teamId === t.id && p.role === "MEMBER"
      ).length;
    });

    // 랜덤 셔플
    const shuffledIds = [...unsoldIds].sort(() => Math.random() - 0.5);
    const assignments: { memberId: string; teamId: string; teamName: string; teamColor: string }[] = [];

    for (const memberId of shuffledIds) {
      // 자리가 남은 팀 찾기
      const availableTeam = teams.find((t) => {
        const currentCount = teamMemberCounts[t.id] + assignments.filter((a) => a.teamId === t.id).length;
        return currentCount < room.memberPerTeam - 1; // 팀장 제외
      });

      if (availableTeam) {
        assignments.push({
          memberId,
          teamId: availableTeam.id,
          teamName: availableTeam.name,
          teamColor: availableTeam.color,
        });
      }
    }

    return assignments;
  }, [teams, participantsWithOnlineStatus, room]);

  // 라운드 종료 또는 자동 배정 체크
  // 1라운드 유찰 → 2라운드 재경매, 2라운드 유찰 → 랜덤 배분 UI 표시
  const checkRoundEndOrAutoAssign = useCallback((passedIds: Set<string>) => {
    const queue = auctionState.auctionQueue;

    // 아직 낙찰 안 된 사람들
    const unsoldIds = queue.filter((id) => memberSoldPrices[id] === undefined);

    // 모두 배정됐으면 경매 종료
    if (unsoldIds.length === 0) {
      setPhase("FINISHED");
      broadcast("PHASE_CHANGE", { phase: "FINISHED" });
      return;
    }

    // 유찰된 사람 중 아직 낙찰 안 된 사람
    const unsoldPassedIds = [...passedIds].filter((id) => memberSoldPrices[id] === undefined);

    // 1라운드에서 유찰된 사람이 있으면 2라운드 시작
    if (currentRound === 1 && unsoldPassedIds.length > 0) {
      startNextRound(passedIds);
      return;
    }

    // 2라운드 끝 - 랜덤 배분 UI 표시
    if (unsoldIds.length > 0) {
      // 미리 배분 계산
      const assignments = calculateRandomAssignments(unsoldIds);
      setRandomAssignTargets(unsoldIds);
      setPreCalculatedAssignments(assignments);
      setShowRandomAssignPhase(true);

      // 다른 클라이언트에게 랜덤 배분 UI 표시 알림
      broadcast("RANDOM_ASSIGN_START", { targetIds: unsoldIds, assignments });
    } else {
      setPhase("FINISHED");
      broadcast("PHASE_CHANGE", { phase: "FINISHED" });
    }
  }, [auctionState.auctionQueue, memberSoldPrices, currentRound, calculateRandomAssignments, startNextRound, broadcast]);

  // 다음 경매 (주최자용) - 낙찰 애니메이션 후 호출
  const handleNextAuction = useCallback(() => {
    const queue = auctionState.auctionQueue;
    const currentIdx = queue.indexOf(auctionState.currentTargetId || "");

    // 다음 대상 찾기 (현재 위치 이후, 낙찰/유찰되지 않은 사람)
    const next = findNextTarget(queue, currentIdx + 1, memberSoldPrices, passedMemberIds);

    if (next) {
      // 다음 대상으로 이동
      setAuctionState((prev) => ({
        ...prev,
        currentTargetId: next.id,
        currentTargetIndex: next.index,
        timer: INITIAL_TIMER_SECONDS,
        timerRunning: false,
        currentPrice: 0,
        highestBidTeamId: null,
        bidHistory: [],
        bidLockUntil: 0,
        showSoldAnimation: false,
        lastSoldInfo: null,
      }));

      broadcast("NEXT_TARGET", {
        targetId: next.id,
        targetIndex: next.index,
      });

      // DB 동기화
      if (roomId) {
        updateRealtimeState(roomId, {
          currentTargetId: next.id,
          currentPrice: 0,
          highestBidTeamId: null,
          timerRunning: false,
        }).catch(console.error);
      }
    } else {
      // 이번 라운드 끝 → 다음 라운드 또는 자동 배정
      checkRoundEndOrAutoAssign(passedMemberIds);
    }
  }, [auctionState, memberSoldPrices, passedMemberIds, findNextTarget, checkRoundEndOrAutoAssign, broadcast, roomId]);

  // 유찰 처리 (주최자용)
  // 1라운드 유찰 → 2라운드 재경매, 2라운드 유찰 → 라운드 끝나고 한번에 랜덤 배분
  const handlePass = useCallback(() => {
    const queue = auctionState.auctionQueue;
    const currentTargetId = auctionState.currentTargetId;
    if (!currentTargetId) return;

    // 유찰 횟수 증가
    const newPassCount = (memberPassCount[currentTargetId] || 0) + 1;
    const newMemberPassCount = {
      ...memberPassCount,
      [currentTargetId]: newPassCount,
    };
    setMemberPassCount(newMemberPassCount);

    // 유찰 목록에 추가
    const newPassedIds = new Set([...passedMemberIds, currentTargetId]);
    setPassedMemberIds(newPassedIds);

    // 다음 대상 찾기
    const currentIdx = queue.indexOf(currentTargetId);
    const next = findNextTarget(queue, currentIdx + 1, memberSoldPrices, newPassedIds);

    if (next) {
      // 다음 대상으로 이동
      setAuctionState((prev) => ({
        ...prev,
        currentTargetId: next.id,
        currentTargetIndex: next.index,
        timer: INITIAL_TIMER_SECONDS,
        timerRunning: false,
        currentPrice: 0,
        highestBidTeamId: null,
        bidHistory: [],
        bidLockUntil: 0,
      }));

      broadcast("PASSED", {
        targetId: currentTargetId,
        nextTargetId: next.id,
        nextIndex: next.index,
      });

      // DB 동기화 (라운드 상태 포함)
      if (roomId) {
        updateRealtimeState(roomId, {
          currentTargetId: next.id,
          currentPrice: 0,
          highestBidTeamId: null,
          timerRunning: false,
          memberPassCount: newMemberPassCount,
          passedMemberIds: [...newPassedIds],
        }).catch(console.error);
      }
    } else {
      // 라운드 종료 → 다음 라운드 또는 자동 배정 체크
      broadcast("PASSED", {
        targetId: currentTargetId,
        nextTargetId: null,
        nextIndex: -1,
      });

      // DB 동기화 (라운드 상태)
      if (roomId) {
        updateRealtimeState(roomId, {
          memberPassCount: newMemberPassCount,
          passedMemberIds: [...newPassedIds],
        }).catch(console.error);
      }

      checkRoundEndOrAutoAssign(newPassedIds);
    }
  }, [auctionState, passedMemberIds, memberSoldPrices, memberPassCount, findNextTarget, checkRoundEndOrAutoAssign, broadcast, roomId]);

  // 랜덤 배분 시작 (주최자용) - 버튼 클릭 시 애니메이션 시작
  const handleStartRandomAssign = useCallback(() => {
    // 애니메이션 시작을 브로드캐스트
    broadcast("RANDOM_ASSIGN_ANIMATING", {});
  }, [broadcast]);

  // 랜덤 배분 완료 (애니메이션 후 DB 저장)
  const handleRandomAssignComplete = useCallback(async () => {
    // DB에 저장 및 상태 업데이트
    for (const assignment of preCalculatedAssignments) {
      // 참가자 팀 배정
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === assignment.memberId ? { ...p, teamId: assignment.teamId } : p
        )
      );

      // 낙찰 가격 기록 (0p = 랜덤 배정)
      setMemberSoldPrices((prev) => ({
        ...prev,
        [assignment.memberId]: 0,
      }));

      // DB 저장
      try {
        await recordSold({
          roomId: roomId!,
          targetId: assignment.memberId,
          winnerTeamId: assignment.teamId,
          finalPrice: 0,
          auctionOrder: auctionState.completedCount + 1,
        });
      } catch (err) {
        console.error("랜덤 배정 기록 실패:", err);
      }
    }

    // 브로드캐스트
    broadcast("RANDOM_ASSIGN_COMPLETE", { assignments: preCalculatedAssignments });

    // 상태 초기화 및 경매 종료
    setShowRandomAssignPhase(false);
    setRandomAssignTargets([]);
    setPreCalculatedAssignments([]);
    setPhase("FINISHED");
    broadcast("PHASE_CHANGE", { phase: "FINISHED" });
  }, [preCalculatedAssignments, roomId, auctionState.completedCount, broadcast]);

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

            {/* 디버그 컨트롤 (역할/페이즈 선택) - dev: 모두, prod: HOST만 */}
            {(process.env.NODE_ENV === 'development' || (SHOW_DEBUG_IN_PROD_FOR_HOST && currentRole === 'HOST')) && (
              <DebugControls
                currentRole={currentRole}
                currentPhase={phase}
                onRoleChange={setCurrentRole}
                onPhaseChange={setPhase}
                onReset={handleReset}
                isResetting={isResetting}
              />
            )}
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
                        {members.map((m) => {
                          const soldPrice = memberSoldPrices[m.id];
                          return (
                            <div key={m.id} className="ml-4 flex items-center gap-1 text-slate-500">
                              <span>└ {m.nickname} ({m.position})</span>
                              {soldPrice !== undefined && (
                                <span className="ml-auto text-xs text-amber-400">
                                  {soldPrice}p
                                </span>
                              )}
                            </div>
                          );
                        })}
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
              {phase === "AUCTION" && !showRandomAssignPhase && (
                <AuctionPhaseComponent
                  currentRole={currentRole}
                  teams={teams}
                  auctionState={auctionState}
                  myTeam={myTeam}
                  currentTarget={currentTarget}
                  isPassed={passedMemberIds.has(auctionState.currentTargetId || "")}
                  isTeamFull={isMyTeamFull}
                  onStartAuction={handleStartAuction}
                  onBid={handleBid}
                  onNextAuction={handleNextAuction}
                  onPass={handlePass}
                />
              )}

              {/* 랜덤 배분 UI */}
              {phase === "AUCTION" && showRandomAssignPhase && (
                <RandomAssignPhase
                  currentRole={currentRole}
                  teams={teams}
                  targetMembers={participantsWithOnlineStatus.filter((p) =>
                    randomAssignTargets.includes(p.id)
                  )}
                  preCalculatedAssignments={preCalculatedAssignments}
                  onStartRandomAssign={handleStartRandomAssign}
                  onAnimationComplete={handleRandomAssignComplete}
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
                <FinishedPhase
                  teams={teams}
                  participants={participantsWithOnlineStatus}
                  memberSoldPrices={memberSoldPrices}
                />
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
                  {auctionQueue.map((member, index) => {
                    const isCurrent = member.id === auctionState.currentTargetId;
                    const soldPrice = memberSoldPrices[member.id];
                    const isSold = soldPrice !== undefined;
                    const isPassed = passedMemberIds.has(member.id);
                    const passCount = memberPassCount[member.id] || 0;
                    const isDoublePassed = passCount >= 2; // 재유찰

                    return (
                      <motion.div
                        key={member.id}
                        className={`relative rounded-lg border px-2 py-2 text-center ${
                          isCurrent
                            ? "border-amber-500/50 bg-amber-500/10 ring-2 ring-amber-500/50"
                            : isSold
                            ? "border-green-500/50 bg-green-500/10"
                            : isDoublePassed
                            ? "border-red-500/50 bg-red-500/10"
                            : isPassed
                            ? "border-orange-500/50 bg-orange-500/10"
                            : "border-slate-700/50 bg-slate-800/30"
                        }`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.05, y: -2, zIndex: 10 }}
                      >
                        {/* 순서 뱃지 (좌상단) */}
                        {showOrder && (
                          <div className={`absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                            isCurrent
                              ? "bg-amber-500 text-slate-900"
                              : "bg-slate-700 text-slate-300"
                          }`}>
                            {member.order}
                          </div>
                        )}

                        {/* 낙찰됨 딱지 (우상단) */}
                        {isSold && (
                          <div className="absolute -top-1 -right-1 rounded bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                            {soldPrice}p
                          </div>
                        )}

                        {/* 재유찰 딱지 (우상단) - 2번 유찰된 경우, 빨간색 */}
                        {isDoublePassed && !isSold && (
                          <div className="absolute -top-1 -right-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                            재유찰
                          </div>
                        )}

                        {/* 유찰됨 딱지 (우상단) - 1번 유찰된 경우, 주황색 */}
                        {isPassed && !isSold && !isDoublePassed && (
                          <div className="absolute -top-1 -right-1 rounded bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                            유찰
                          </div>
                        )}

                        <div className={`text-xs font-medium truncate ${isSold || isPassed ? "text-slate-400" : "text-slate-200"}`}>
                          {member.nickname}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{member.position}</div>
                      </motion.div>
                    );
                  })}
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
