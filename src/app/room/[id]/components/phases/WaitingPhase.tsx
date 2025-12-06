"use client";

import { motion } from "framer-motion";
import { Team, Participant, ParticipantRole } from "@/types";

interface WaitingPhaseProps {
  currentRole: ParticipantRole;
  teams: Team[];
  participants: Participant[];
  onNextPhase: () => void;
}

export default function WaitingPhase({
  currentRole,
  teams,
  participants,
  onNextPhase,
}: WaitingPhaseProps) {
  // 팀장 목록
  const captains = participants.filter((p) => p.role === "CAPTAIN");
  const onlineCaptains = captains.filter((p) => p.isOnline);
  const allCaptainsOnline = onlineCaptains.length === teams.length;

  return (
    <motion.div
      key="waiting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full flex-col items-center justify-center text-center"
    >
      <div className="mb-4 text-6xl">⏳</div>
      <h2 className="text-2xl font-bold text-slate-200">참가자 입장 대기 중</h2>
      <p className="mt-2 text-slate-400">
        {currentRole === "HOST"
          ? "모든 팀장이 입장하면 경매를 시작할 수 있습니다"
          : "주최자가 경매를 시작할 때까지 대기해주세요"}
      </p>

      {/* 팀장 입장 현황 */}
      <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="mb-4 text-lg font-semibold text-amber-400">
          팀장 입장 현황: {onlineCaptains.length}/{teams.length}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {teams.map((team) => {
            const captain = participants.find((p) => p.id === team.captainId);
            const isOnline = captain?.isOnline;
            return (
              <motion.div
                key={team.id}
                className={`rounded-lg border px-4 py-2 ${
                  isOnline
                    ? "border-green-500/50 bg-green-500/10 text-green-400"
                    : "border-slate-700 bg-slate-800/50 text-slate-500"
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: teams.indexOf(team) * 0.05 }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isOnline ? "bg-green-500" : "bg-slate-600"
                    }`}
                  />
                  <span className="font-medium">{team.name}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 역할별 UI */}
      {currentRole === "HOST" && (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            className={`rounded-full px-8 py-4 text-lg font-bold transition-all ${
              allCaptainsOnline
                ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 shadow-xl shadow-amber-500/30"
                : "cursor-not-allowed bg-slate-700 text-slate-400"
            }`}
            whileHover={allCaptainsOnline ? { scale: 1.05 } : {}}
            whileTap={allCaptainsOnline ? { scale: 0.95 } : {}}
            onClick={allCaptainsOnline ? onNextPhase : undefined}
            disabled={!allCaptainsOnline}
          >
            {allCaptainsOnline ? "팀장 소개 시작 →" : "팀장 입장 대기 중..."}
          </motion.button>
          {!allCaptainsOnline && (
            <p className="mt-2 text-sm text-slate-500">
              모든 팀장이 입장해야 진행할 수 있습니다
            </p>
          )}
        </motion.div>
      )}

      {currentRole === "CAPTAIN" && (
        <motion.div
          className="mt-8 rounded-lg border border-green-500/30 bg-green-500/10 px-6 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-green-400">✓ 입장 완료</span>
          <p className="mt-1 text-sm text-slate-400">
            다른 팀장들의 입장을 기다리고 있습니다
          </p>
        </motion.div>
      )}

      {currentRole === "OBSERVER" && (
        <motion.div
          className="mt-8 rounded-lg border border-slate-600 bg-slate-800/50 px-6 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-slate-400">👀 관전 모드</span>
          <p className="mt-1 text-sm text-slate-500">
            경매가 시작되면 실시간으로 관전할 수 있습니다
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
