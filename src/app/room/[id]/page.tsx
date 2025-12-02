"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuctionPhase, Team, Participant, ParticipantRole } from "@/types";

// Mock 데이터 - 8팀 5명 (팀장 8명 + 팀원 32명 = 총 40명)
const mockRoom = {
  id: "1",
  title: "롤 내전 경매",
  totalPoints: 1000,
  teamCount: 8,
  memberPerTeam: 5,
  phase: "AUCTION" as AuctionPhase,
  currentTargetId: "member1",
};

const mockTeams: Team[] = [
  { id: "team1", roomId: "1", name: "1팀", captainId: "captain1", currentPoints: 850, color: "#EF4444" },
  { id: "team2", roomId: "1", name: "2팀", captainId: "captain2", currentPoints: 720, color: "#F97316" },
  { id: "team3", roomId: "1", name: "3팀", captainId: "captain3", currentPoints: 650, color: "#EAB308" },
  { id: "team4", roomId: "1", name: "4팀", captainId: "captain4", currentPoints: 900, color: "#22C55E" },
  { id: "team5", roomId: "1", name: "5팀", captainId: "captain5", currentPoints: 780, color: "#3B82F6" },
  { id: "team6", roomId: "1", name: "6팀", captainId: "captain6", currentPoints: 820, color: "#8B5CF6" },
  { id: "team7", roomId: "1", name: "7팀", captainId: "captain7", currentPoints: 690, color: "#EC4899" },
  { id: "team8", roomId: "1", name: "8팀", captainId: "captain8", currentPoints: 750, color: "#06B6D4" },
];

const mockParticipants: Participant[] = [
  // 팀장 8명
  { id: "captain1", roomId: "1", nickname: "Hide온bush", role: "CAPTAIN", position: "미드", description: "미드 장인", teamId: "team1", isOnline: true, createdAt: "" },
  { id: "captain2", roomId: "1", nickname: "정글의신", role: "CAPTAIN", position: "정글", description: "정글 캐리", teamId: "team2", isOnline: true, createdAt: "" },
  { id: "captain3", roomId: "1", nickname: "원딜마스터", role: "CAPTAIN", position: "원딜", description: "원딜 장인", teamId: "team3", isOnline: true, createdAt: "" },
  { id: "captain4", roomId: "1", nickname: "서폿왕", role: "CAPTAIN", position: "서폿", description: "서폿 장인", teamId: "team4", isOnline: true, createdAt: "" },
  { id: "captain5", roomId: "1", nickname: "탑라이너", role: "CAPTAIN", position: "탑", description: "탑 장인", teamId: "team5", isOnline: true, createdAt: "" },
  { id: "captain6", roomId: "1", nickname: "올라운더", role: "CAPTAIN", position: "미드/정글", description: "듀얼 포지션", teamId: "team6", isOnline: true, createdAt: "" },
  { id: "captain7", roomId: "1", nickname: "캐리장인", role: "CAPTAIN", position: "원딜", description: "팀 캐리 전문", teamId: "team7", isOnline: true, createdAt: "" },
  { id: "captain8", roomId: "1", nickname: "샷콜러", role: "CAPTAIN", position: "서폿", description: "콜 담당", teamId: "team8", isOnline: false, createdAt: "" },
  // 팀원 32명 (경매 대상) - 25명 낙찰 완료, 7명 대기 중
  // 1팀: 4명 완료 (풀팀)
  { id: "member1", roomId: "1", nickname: "페이커짱", role: "MEMBER", position: "미드", description: "미드 장인입니다", teamId: "team1", isOnline: true, createdAt: "" },
  { id: "member2", roomId: "1", nickname: "쵸비팬", role: "MEMBER", position: "미드", description: "로밍 장인", teamId: "team1", isOnline: true, createdAt: "" },
  { id: "member3", roomId: "1", nickname: "미드갓", role: "MEMBER", position: "미드", description: "암살자 장인", teamId: "team1", isOnline: true, createdAt: "" },
  { id: "member4", roomId: "1", nickname: "컨트롤형", role: "MEMBER", position: "미드", description: "컨트롤 메이지", teamId: "team1", isOnline: true, createdAt: "" },
  // 2팀: 4명 완료 (풀팀)
  { id: "member5", roomId: "1", nickname: "정글러123", role: "MEMBER", position: "정글", description: "갱킹 마스터", teamId: "team2", isOnline: true, createdAt: "" },
  { id: "member6", roomId: "1", nickname: "갱플전문", role: "MEMBER", position: "정글", description: "초반 갱 장인", teamId: "team2", isOnline: true, createdAt: "" },
  { id: "member7", roomId: "1", nickname: "파밍러", role: "MEMBER", position: "정글", description: "파밍형 정글러", teamId: "team2", isOnline: true, createdAt: "" },
  { id: "member8", roomId: "1", nickname: "오브젝터", role: "MEMBER", position: "정글", description: "오브젝트 전문", teamId: "team2", isOnline: true, createdAt: "" },
  // 3팀: 4명 완료 (풀팀)
  { id: "member9", roomId: "1", nickname: "원딜고수", role: "MEMBER", position: "원딜", description: "캐리 가능", teamId: "team3", isOnline: true, createdAt: "" },
  { id: "member10", roomId: "1", nickname: "한타충", role: "MEMBER", position: "원딜", description: "한타 장인", teamId: "team3", isOnline: true, createdAt: "" },
  { id: "member11", roomId: "1", nickname: "라인전장인", role: "MEMBER", position: "원딜", description: "라인전 강자", teamId: "team3", isOnline: true, createdAt: "" },
  { id: "member12", roomId: "1", nickname: "CS마스터", role: "MEMBER", position: "원딜", description: "CS 장인", teamId: "team3", isOnline: true, createdAt: "" },
  // 4팀: 3명
  { id: "member13", roomId: "1", nickname: "서폿장인", role: "MEMBER", position: "서폿", description: "시야 장인", teamId: "team4", isOnline: true, createdAt: "" },
  { id: "member14", roomId: "1", nickname: "힐러장인", role: "MEMBER", position: "서폿", description: "인챈터 전문", teamId: "team4", isOnline: true, createdAt: "" },
  { id: "member15", roomId: "1", nickname: "탱서폿", role: "MEMBER", position: "서폿", description: "탱커 서폿", teamId: "team4", isOnline: true, createdAt: "" },
  // 5팀: 3명
  { id: "member16", roomId: "1", nickname: "로밍서폿", role: "MEMBER", position: "서폿", description: "로밍 전문", teamId: "team5", isOnline: true, createdAt: "" },
  { id: "member17", roomId: "1", nickname: "탑신병자", role: "MEMBER", position: "탑", description: "스플릿 장인", teamId: "team5", isOnline: true, createdAt: "" },
  { id: "member18", roomId: "1", nickname: "딜탱커", role: "MEMBER", position: "탑", description: "딜탱 전문", teamId: "team5", isOnline: true, createdAt: "" },
  // 6팀: 3명
  { id: "member19", roomId: "1", nickname: "순탱유저", role: "MEMBER", position: "탑", description: "탱커 전문", teamId: "team6", isOnline: true, createdAt: "" },
  { id: "member20", roomId: "1", nickname: "캐리탑", role: "MEMBER", position: "탑", description: "탑 캐리형", teamId: "team6", isOnline: true, createdAt: "" },
  { id: "member21", roomId: "1", nickname: "미드or탑", role: "MEMBER", position: "미드/탑", description: "듀얼 포지션", teamId: "team6", isOnline: true, createdAt: "" },
  // 7팀: 2명
  { id: "member22", roomId: "1", nickname: "정글or서폿", role: "MEMBER", position: "정글/서폿", description: "유연한 픽", teamId: "team7", isOnline: true, createdAt: "" },
  { id: "member23", roomId: "1", nickname: "원딜or미드", role: "MEMBER", position: "원딜/미드", description: "원거리 딜러", teamId: "team7", isOnline: true, createdAt: "" },
  // 8팀: 2명
  { id: "member24", roomId: "1", nickname: "필포지션", role: "MEMBER", position: "ALL", description: "아무거나 가능", teamId: "team8", isOnline: true, createdAt: "" },
  { id: "member25", roomId: "1", nickname: "뉴비1234", role: "MEMBER", position: "서폿", description: "열심히 하겠습니다", teamId: "team8", isOnline: true, createdAt: "" },
  // 대기 중: 7명
  { id: "member26", roomId: "1", nickname: "고인물99", role: "MEMBER", position: "정글", description: "10년차 정글러", teamId: null, isOnline: true, createdAt: "" },
  { id: "member27", roomId: "1", nickname: "플레장인", role: "MEMBER", position: "원딜", description: "플레 5회 달성", teamId: null, isOnline: true, createdAt: "" },
  { id: "member28", roomId: "1", nickname: "골드막이", role: "MEMBER", position: "탑", description: "골드 고인물", teamId: null, isOnline: true, createdAt: "" },
  { id: "member29", roomId: "1", nickname: "실버탈출", role: "MEMBER", position: "미드", description: "이번엔 골드간다", teamId: null, isOnline: true, createdAt: "" },
  { id: "member30", roomId: "1", nickname: "다이아찍자", role: "MEMBER", position: "정글", description: "다이아 목표", teamId: null, isOnline: true, createdAt: "" },
  { id: "member31", roomId: "1", nickname: "즐겜러", role: "MEMBER", position: "서폿", description: "재미있게 합시다", teamId: null, isOnline: true, createdAt: "" },
  { id: "member32", roomId: "1", nickname: "트롤아님", role: "MEMBER", position: "탑/정글", description: "진지하게 합니다", teamId: null, isOnline: true, createdAt: "" },
];

// 역할 목록 (테스트용)
const roleOptions: ParticipantRole[] = ["HOST", "CAPTAIN", "MEMBER", "OBSERVER"];

// 대기 중인 팀원 목록 (경매 순서대로)
const mockAuctionQueue = mockParticipants
  .filter((p) => p.role === "MEMBER" && p.teamId === null)
  .map((p, index) => ({ ...p, order: index + 1 }));

const mockCurrentBid = {
  amount: 150,
  teamId: "team1",
  teamName: "A팀",
};

export default function AuctionRoom({ params }: { params: { id: string } }) {
  const [phase, setPhase] = useState<AuctionPhase>(mockRoom.phase);
  const [currentRole, setCurrentRole] = useState<ParticipantRole>("HOST");
  const [timer, setTimer] = useState(12);
  const [chatMessages, setChatMessages] = useState([
    { id: "1", sender: "팀장A", content: "이번엔 내가 간다", teamId: null },
    { id: "2", sender: "팀장B", content: "ㅋㅋㅋ 경쟁 치열하네", teamId: null },
    { id: "3", sender: "유저1", content: "와 불꽃 경쟁", teamId: null },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [announceInput, setAnnounceInput] = useState("");

  const currentTarget = mockParticipants.find((p) => p.id === mockRoom.currentTargetId);

  // 최소 입찰 단위 계산
  const getMinBidUnit = (currentBid: number) => {
    if (currentBid < 100) return 5;
    if (currentBid < 200) return 10;
    if (currentBid < 300) return 15;
    return Math.floor(currentBid / 100) * 5;
  };

  const minBidUnit = getMinBidUnit(mockCurrentBid.amount);

  const phaseLabels: Record<AuctionPhase, { emoji: string; label: string; color: string; bg: string }> = {
    WAITING: { emoji: "🔴", label: "대기 중", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
    CAPTAIN_INTRO: { emoji: "📢", label: "팀장 소개", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
    SHUFFLE: { emoji: "🎲", label: "팀원 셔플", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
    AUCTION: { emoji: "⚡", label: "경매 진행 중", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
    FINISHED: { emoji: "🏆", label: "경매 종료", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  };

  const roleLabels: Record<ParticipantRole, { label: string; color: string }> = {
    HOST: { label: "주최자", color: "text-red-400 bg-red-500/10 border-red-500/30" },
    CAPTAIN: { label: "팀장", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    MEMBER: { label: "팀원", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    OBSERVER: { label: "관전자", color: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-200">{mockRoom.title}</h1>
            <div className="text-sm text-slate-400">
              진행: {mockParticipants.filter(p => p.role === "MEMBER" && p.teamId !== null).length}/
              {mockParticipants.filter(p => p.role === "MEMBER").length}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 역할 선택 (테스트용) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">역할:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as ParticipantRole)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium outline-none ${roleLabels[currentRole].color}`}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role} className="bg-slate-800 text-slate-200">
                    {roleLabels[role].label}
                  </option>
                ))}
              </select>
            </div>

            {/* 주최자 컨트롤 */}
            {currentRole === "HOST" && (
              <div className="flex items-center gap-2">
                <motion.button
                  className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const phases: AuctionPhase[] = ["WAITING", "CAPTAIN_INTRO", "SHUFFLE", "AUCTION", "FINISHED"];
                    const currentIndex = phases.indexOf(phase);
                    if (currentIndex < phases.length - 1) {
                      setPhase(phases[currentIndex + 1]);
                    }
                  }}
                >
                  다음 단계 →
                </motion.button>
                <motion.button
                  className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-700/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  일시정지
                </motion.button>
              </div>
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
            <h2 className="text-sm font-semibold text-slate-400">팀별 현황</h2>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {mockTeams.map((team) => {
              const captain = mockParticipants.find((p) => p.id === team.captainId);
              const members = mockParticipants.filter((p) => p.teamId === team.id && p.role === "MEMBER");
              return (
                <motion.div
                  key={team.id}
                  className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3"
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
                    <span className="text-sm font-medium text-amber-400">
                      {team.currentPoints}p
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-amber-500">👑</span>
                      <span>{captain?.nickname}</span>
                      <span className="text-slate-500">({captain?.position})</span>
                    </div>
                    {members.map((m) => (
                      <div key={m.id} className="ml-4 text-slate-500">
                        └ {m.nickname} ({m.position})
                      </div>
                    ))}
                    {members.length === 0 && (
                      <div className="ml-4 text-slate-600">(팀원 없음)</div>
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
              {phase === "AUCTION" && currentTarget && (
                <motion.div
                  key="auction"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex h-full flex-col items-center justify-center"
                >
                  {/* Current target */}
                  <div className="mb-8 text-center">
                    <p className="mb-2 text-sm text-slate-400">현재 경매 대상</p>
                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 text-5xl">
                      👤
                    </div>
                    <h2 className="text-3xl font-bold text-slate-200">
                      {currentTarget.nickname}
                    </h2>
                    <p className="mt-1 text-lg text-amber-400">{currentTarget.position}</p>
                    <p className="mt-2 text-slate-400">&ldquo;{currentTarget.description}&rdquo;</p>
                  </div>

                  {/* Timer */}
                  <div className="mb-8 w-full max-w-md">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <span className="text-4xl font-bold text-slate-200">{timer}</span>
                      <span className="text-xl text-slate-400">초</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                      <motion.div
                        className={`h-full rounded-full ${timer <= 3 ? "bg-red-500" : "bg-amber-500"}`}
                        initial={{ width: "100%" }}
                        animate={{ width: `${(timer / 15) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Current bid info */}
                  <div className="mb-8 text-center">
                    <p className="text-sm text-slate-400">현재 입찰가</p>
                    <p className="text-4xl font-bold text-amber-400">
                      {mockCurrentBid.amount}
                      <span className="text-2xl">p</span>
                    </p>
                    <p className="mt-1 text-slate-400">
                      최고 입찰자: <span className="text-slate-200">{mockCurrentBid.teamName}</span>
                    </p>
                  </div>

                  {/* Bid buttons - 팀장만 표시 */}
                  {currentRole === "CAPTAIN" ? (
                    <div className="flex gap-4">
                      <motion.button
                        className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        +{minBidUnit} 입찰
                      </motion.button>
                      <div className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-4">
                        <input
                          type="number"
                          min="0"
                          placeholder="직접 입력"
                          className="w-24 bg-transparent py-4 text-center text-slate-200 outline-none placeholder:text-slate-500"
                        />
                        <motion.button
                          className="rounded-full bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          입찰
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-slate-800/50 px-6 py-3 text-slate-400">
                        👀 관전 중
                      </div>
                      <p className="text-sm text-slate-500">팀장만 입찰할 수 있습니다</p>
                    </div>
                  )}
                </motion.div>
              )}

              {phase === "WAITING" && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center"
                >
                  <div className="mb-4 text-6xl">⏳</div>
                  <h2 className="text-2xl font-bold text-slate-200">참가자 입장 대기 중</h2>
                  <p className="mt-2 text-slate-400">모든 팀장이 입장하면 경매를 시작할 수 있습니다</p>

                  {/* 팀장 입장 현황 */}
                  <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
                    <div className="mb-4 text-lg font-semibold text-amber-400">
                      팀장 입장 현황: {mockParticipants.filter(p => p.role === "CAPTAIN" && p.isOnline).length}/{mockRoom.teamCount}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {mockTeams.map((team) => {
                        const captain = mockParticipants.find(p => p.id === team.captainId);
                        const isOnline = captain?.isOnline;
                        return (
                          <div
                            key={team.id}
                            className={`rounded-lg border px-4 py-2 ${
                              isOnline
                                ? "border-green-500/50 bg-green-500/10 text-green-400"
                                : "border-slate-700 bg-slate-800/50 text-slate-500"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-600"}`}
                              />
                              <span className="font-medium">{team.name}</span>
                            </div>
                            <div className="text-xs opacity-70">
                              {captain?.nickname || "대기 중"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 팀장 소개 페이즈 */}
              {phase === "CAPTAIN_INTRO" && (
                <motion.div
                  key="captain-intro"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-full flex-col items-center py-8"
                >
                  <h2 className="mb-2 text-3xl font-bold text-slate-200">팀장 소개</h2>
                  <p className="mb-8 text-slate-400">각 팀을 이끌 팀장들을 소개합니다</p>

                  <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {mockTeams.map((team, index) => {
                      const captain = mockParticipants.find(p => p.id === team.captainId);
                      return (
                        <motion.div
                          key={team.id}
                          className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 text-center"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -5 }}
                        >
                          <div
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                            style={{ backgroundColor: `${team.color}20` }}
                          >
                            👑
                          </div>
                          <div className="mb-1 text-xl font-bold text-slate-200">
                            {captain?.nickname}
                          </div>
                          <div
                            className="mb-2 inline-block rounded-full px-3 py-1 text-sm font-medium"
                            style={{ backgroundColor: `${team.color}20`, color: team.color }}
                          >
                            {team.name} · {captain?.position}
                          </div>
                          <p className="text-sm text-slate-400">
                            &ldquo;{captain?.description}&rdquo;
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* 셔플 페이즈 */}
              {phase === "SHUFFLE" && (
                <motion.div
                  key="shuffle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center"
                >
                  <h2 className="mb-2 text-3xl font-bold text-slate-200">팀원 순서 셔플</h2>
                  <p className="mb-8 text-slate-400">경매 순서를 무작위로 정합니다</p>

                  <div className="relative flex flex-wrap justify-center gap-3">
                    {mockAuctionQueue.map((member, index) => (
                      <motion.div
                        key={member.id}
                        className="relative rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3"
                        initial={{
                          x: Math.random() * 200 - 100,
                          y: Math.random() * 200 - 100,
                          rotate: Math.random() * 30 - 15,
                          opacity: 0
                        }}
                        animate={{
                          x: 0,
                          y: 0,
                          rotate: 0,
                          opacity: 1
                        }}
                        transition={{
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 100
                        }}
                      >
                        <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900">
                          {index + 1}
                        </div>
                        <div className="text-sm font-medium text-slate-200">{member.nickname}</div>
                        <div className="text-xs text-slate-500">{member.position}</div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.p
                    className="mt-8 text-amber-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: mockAuctionQueue.length * 0.1 + 0.5 }}
                  >
                    ✨ 순서가 결정되었습니다!
                  </motion.p>
                </motion.div>
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
                  placeholder="공지할 내용을 입력하세요..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                />
                <motion.button
                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  공지하기
                </motion.button>
              </div>
            </div>
          )}

          {/* Next in queue - 전체 대기열 그리드 */}
          <div className="shrink-0 border-t border-slate-700/50 bg-slate-900/50 px-6 py-4 max-h-[200px] overflow-y-auto">
            <div className="mb-3 flex items-center gap-2 sticky top-0 bg-slate-900/90 py-1 -mt-1 backdrop-blur-sm">
              <span className="text-sm font-semibold text-slate-400">📜 경매 대기열</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                {mockAuctionQueue.length}명 대기
              </span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {mockAuctionQueue.map((member, index) => (
                <motion.div
                  key={member.id}
                  className={`relative rounded-lg border px-2 py-2 text-center ${
                    index === 0
                      ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-slate-700/50 bg-slate-800/30"
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.05, y: -2, zIndex: 10 }}
                >
                  {/* 순서 뱃지 */}
                  <div className={`absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? "bg-amber-500 text-slate-900"
                      : "bg-slate-700 text-slate-300"
                  }`}>
                    {member.order}
                  </div>
                  <div className="text-xs font-medium text-slate-200 truncate">{member.nickname}</div>
                  <div className="text-[10px] text-slate-500 truncate">{member.position}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </main>

        {/* Right sidebar - Chat */}
        <aside className="flex w-80 shrink-0 min-h-0 flex-col border-l border-slate-700/50 bg-slate-900/50">
          {/* Chat tabs */}
          <div className="flex shrink-0 border-b border-slate-700/50">
            <button className="flex-1 border-b-2 border-amber-500 py-3 text-sm font-medium text-amber-400">
              전체
            </button>
            <button className="flex-1 py-3 text-sm font-medium text-slate-500 hover:text-slate-400">
              팀 채팅
            </button>
          </div>

          {/* Chat messages */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="font-medium text-amber-400">{msg.sender}</span>
                <span className="ml-2 text-slate-300">{msg.content}</span>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div className="shrink-0 border-t border-slate-700/50 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="메시지 입력..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <motion.button
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
    </div>
  );
}
