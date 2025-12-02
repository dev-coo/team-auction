"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuctionPhase, Team, Participant } from "@/types";

// Mock 데이터
const mockRoom = {
  id: "1",
  title: "롤 내전 경매",
  totalPoints: 1000,
  teamCount: 5,
  memberPerTeam: 4,
  phase: "AUCTION" as AuctionPhase,
  currentTargetId: "member1",
};

const mockTeams: Team[] = [
  { id: "team1", roomId: "1", name: "A팀", captainId: "captain1", currentPoints: 850, color: "#EF4444" },
  { id: "team2", roomId: "1", name: "B팀", captainId: "captain2", currentPoints: 720, color: "#F97316" },
  { id: "team3", roomId: "1", name: "C팀", captainId: "captain3", currentPoints: 650, color: "#EAB308" },
  { id: "team4", roomId: "1", name: "D팀", captainId: "captain4", currentPoints: 900, color: "#22C55E" },
  { id: "team5", roomId: "1", name: "E팀", captainId: "captain5", currentPoints: 780, color: "#3B82F6" },
];

const mockParticipants: Participant[] = [
  { id: "captain1", roomId: "1", nickname: "팀장A", role: "CAPTAIN", position: "미드", description: "미드 장인", teamId: "team1", isOnline: true, createdAt: "" },
  { id: "captain2", roomId: "1", nickname: "팀장B", role: "CAPTAIN", position: "정글", description: "정글 캐리", teamId: "team2", isOnline: true, createdAt: "" },
  { id: "captain3", roomId: "1", nickname: "팀장C", role: "CAPTAIN", position: "원딜", description: "원딜 장인", teamId: "team3", isOnline: true, createdAt: "" },
  { id: "captain4", roomId: "1", nickname: "팀장D", role: "CAPTAIN", position: "서폿", description: "서폿 장인", teamId: "team4", isOnline: true, createdAt: "" },
  { id: "captain5", roomId: "1", nickname: "팀장E", role: "CAPTAIN", position: "탑", description: "탑 장인", teamId: "team5", isOnline: true, createdAt: "" },
  { id: "member1", roomId: "1", nickname: "페이커짱", role: "MEMBER", position: "미드", description: "미드 장인입니다 믿고 뽑아주세요", teamId: null, isOnline: true, createdAt: "" },
  { id: "member2", roomId: "1", nickname: "원딜고수", role: "MEMBER", position: "원딜", description: "캐리 가능", teamId: null, isOnline: true, createdAt: "" },
  { id: "member3", roomId: "1", nickname: "서폿장인", role: "MEMBER", position: "서폿", description: "시야 장인", teamId: null, isOnline: true, createdAt: "" },
  { id: "member4", roomId: "1", nickname: "탑신병자", role: "MEMBER", position: "탑", description: "스플릿 장인", teamId: null, isOnline: true, createdAt: "" },
  { id: "member5", roomId: "1", nickname: "정글러123", role: "MEMBER", position: "정글", description: "갱킹 마스터", teamId: null, isOnline: true, createdAt: "" },
  { id: "member6", roomId: "1", nickname: "미드or탑", role: "MEMBER", position: "미드/탑", description: "듀얼 포지션", teamId: null, isOnline: true, createdAt: "" },
  { id: "member7", roomId: "1", nickname: "딜탱커", role: "MEMBER", position: "탑", description: "딜탱 전문", teamId: null, isOnline: true, createdAt: "" },
  { id: "member8", roomId: "1", nickname: "갱플전문", role: "MEMBER", position: "정글", description: "초반 갱 장인", teamId: null, isOnline: true, createdAt: "" },
];

// Mock: 현재 유저 역할 (테스트용 - HOST로 변경하면 주최자 UI 확인 가능)
const mockCurrentUser = {
  id: "host1",
  role: "HOST" as const, // HOST | CAPTAIN | MEMBER | OBSERVER
};

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
  const [timer, setTimer] = useState(12);
  const [chatMessages, setChatMessages] = useState([
    { id: "1", sender: "팀장A", content: "이번엔 내가 간다", teamId: null },
    { id: "2", sender: "팀장B", content: "ㅋㅋㅋ 경쟁 치열하네", teamId: null },
    { id: "3", sender: "유저1", content: "와 불꽃 경쟁", teamId: null },
  ]);
  const [chatInput, setChatInput] = useState("");

  const currentTarget = mockParticipants.find((p) => p.id === mockRoom.currentTargetId);

  // 최소 입찰 단위 계산
  const getMinBidUnit = (currentBid: number) => {
    if (currentBid < 100) return 5;
    if (currentBid < 200) return 10;
    if (currentBid < 300) return 15;
    return Math.floor(currentBid / 100) * 5;
  };

  const minBidUnit = getMinBidUnit(mockCurrentBid.amount);

  const phaseLabels: Record<AuctionPhase, { emoji: string; label: string; color: string }> = {
    WAITING: { emoji: "🔴", label: "대기 중", color: "text-red-400" },
    CAPTAIN_INTRO: { emoji: "📢", label: "팀장 소개", color: "text-blue-400" },
    SHUFFLE: { emoji: "🎲", label: "팀원 셔플", color: "text-purple-400" },
    AUCTION: { emoji: "⚡", label: "경매 진행 중", color: "text-amber-400" },
    FINISHED: { emoji: "🏆", label: "경매 종료", color: "text-green-400" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-200">{mockRoom.title}</h1>
            <span className={`flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm font-medium ${phaseLabels[phase].color}`}>
              {phaseLabels[phase].emoji} {phaseLabels[phase].label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 주최자 컨트롤 */}
            {mockCurrentUser.role === "HOST" && (
              <div className="flex items-center gap-2">
                <motion.button
                  className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
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
                  className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-700/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  일시정지
                </motion.button>
              </div>
            )}

            <div className="text-sm text-slate-400">
              진행: 3/{mockRoom.teamCount * mockRoom.memberPerTeam}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Teams */}
        <aside className="w-64 border-r border-slate-700/50 bg-slate-900/50 p-4 overflow-y-auto">
          <h2 className="mb-4 text-sm font-semibold text-slate-400">팀별 현황</h2>
          <div className="space-y-3">
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
        <main className="flex flex-1 flex-col">
          <div className="flex-1 p-6">
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
                  {mockCurrentUser.role === "CAPTAIN" ? (
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

          {/* Next in queue - 카드 형식 */}
          <div className="border-t border-slate-700/50 bg-slate-900/50 px-6 py-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-400">📜 경매 대기열</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                {mockAuctionQueue.length}명
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mockAuctionQueue.slice(0, 8).map((member, index) => (
                <div key={member.id} className="flex items-center">
                  {/* 카드 */}
                  <motion.div
                    className={`relative rounded-lg border px-3 py-2 ${
                      index === 0
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-slate-700/50 bg-slate-800/30"
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                  >
                    {/* 순서 뱃지 */}
                    <div className={`absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0
                        ? "bg-amber-500 text-slate-900"
                        : "bg-slate-700 text-slate-300"
                    }`}>
                      {member.order}
                    </div>
                    <div className="text-sm font-medium text-slate-200">{member.nickname}</div>
                    <div className="text-xs text-slate-500">{member.position}</div>
                  </motion.div>
                  {/* 화살표 (지그재그) */}
                  {index < mockAuctionQueue.slice(0, 8).length - 1 && (
                    <motion.span
                      className={`mx-1 text-slate-600 ${index % 2 === 0 ? "rotate-0" : "rotate-0"}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      →
                    </motion.span>
                  )}
                </div>
              ))}
              {mockAuctionQueue.length > 8 && (
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-sm text-slate-500">
                  +{mockAuctionQueue.length - 8}명 더
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right sidebar - Chat */}
        <aside className="flex w-80 flex-col border-l border-slate-700/50 bg-slate-900/50">
          {/* Chat tabs */}
          <div className="flex border-b border-slate-700/50">
            <button className="flex-1 border-b-2 border-amber-500 py-3 text-sm font-medium text-amber-400">
              전체
            </button>
            <button className="flex-1 py-3 text-sm font-medium text-slate-500 hover:text-slate-400">
              팀 채팅
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="font-medium text-amber-400">{msg.sender}</span>
                <span className="ml-2 text-slate-300">{msg.content}</span>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div className="border-t border-slate-700/50 p-4">
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
