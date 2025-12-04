"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Team, Participant, ParticipantRole } from "@/types";

interface CaptainIntroPhaseProps {
  currentRole: ParticipantRole;
  teams: Team[];
  participants: Participant[];
  currentIndex: number;
  onNextCaptain: () => void;
}

export default function CaptainIntroPhase({
  currentRole,
  teams,
  participants,
  currentIndex,
  onNextCaptain,
}: CaptainIntroPhaseProps) {
  // 현재 팀과 팀장
  const currentTeam = teams[currentIndex];
  const currentCaptain = participants.find((p) => p.id === currentTeam?.captainId);

  // 마지막 팀장인지 확인
  const isLastCaptain = currentIndex === teams.length - 1;

  if (!currentTeam || !currentCaptain) {
    return null;
  }

  return (
    <motion.div
      key="captain-intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full flex-col items-center justify-center text-center"
    >
      {/* 제목 & 진행 상황 */}
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-slate-200">팀장 소개</h2>
        <p className="text-slate-400">
          <span className="text-amber-400 font-semibold">{currentIndex + 1}</span>
          <span className="mx-1">/</span>
          <span>{teams.length}</span>
          <span className="ml-1">번째 팀장</span>
        </p>
      </div>

      {/* 팀장 카드 - 중앙에 한 명만 표시 */}
      <div className="relative w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTeam.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="rounded-2xl border-2 border-amber-500/50 bg-slate-800/50 p-8 shadow-2xl shadow-amber-500/20"
          >
            {/* 팀 색상 악센트 라인 */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{ backgroundColor: currentTeam.color }}
            />

            {/* 팀장 아바타 */}
            <div
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full text-5xl"
              style={{ backgroundColor: `${currentTeam.color}20` }}
            >
              👑
            </div>

            {/* 팀명 */}
            <div
              className="mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ backgroundColor: `${currentTeam.color}30`, color: currentTeam.color }}
            >
              {currentTeam.name}
            </div>

            {/* 닉네임 */}
            <div className="mb-2 text-2xl font-bold text-slate-200">
              {currentCaptain.nickname}
            </div>

            {/* 포지션 */}
            <div className="inline-block rounded-lg bg-slate-700/50 px-3 py-1 text-sm text-slate-300">
              {currentCaptain.position}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 역할별 UI */}
      {currentRole === "HOST" && (
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNextCaptain}
          >
            {isLastCaptain ? "팀원 셔플 시작 →" : "다음 팀장 소개 →"}
          </motion.button>
        </motion.div>
      )}

      {(currentRole === "CAPTAIN" || currentRole === "OBSERVER" || currentRole === "MEMBER") && (
        <motion.div
          className="mt-10 rounded-lg border border-slate-600 bg-slate-800/50 px-6 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-slate-400">
            {currentRole === "CAPTAIN" ? "📢 팀장 소개 중" : "👀 관전 중"}
          </span>
          <p className="mt-1 text-sm text-slate-500">
            주최자가 다음 팀장을 소개합니다
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
