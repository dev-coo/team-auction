"use client";

import { motion } from "framer-motion";
import type { Team, Participant } from "@/types";
import { useMemo } from "react";

interface FinishedPhaseProps {
  teams: Team[];
  participants: Participant[];
}

interface TeamWithOrder {
  team: Team;
  order: number;
  captain: Participant | undefined;
  members: Participant[];
}

export default function FinishedPhase({ teams, participants }: FinishedPhaseProps) {
  // 팀을 남은 포인트 기준으로 정렬하고 순번 계산
  const teamsWithOrder = useMemo<TeamWithOrder[]>(() => {
    const sortedTeams = [...teams].sort((a, b) => b.currentPoints - a.currentPoints);
    const orders: number[] = [];

    sortedTeams.forEach((team, index) => {
      if (index === 0) {
        orders.push(1);
      } else if (team.currentPoints === sortedTeams[index - 1].currentPoints) {
        orders.push(orders[index - 1]);
      } else {
        orders.push(index + 1);
      }
    });

    return sortedTeams.map((team, index) => {
      const captain = participants.find(p => p.id === team.captainId);
      const members = participants.filter(p => p.teamId === team.id && p.role === "MEMBER");

      return {
        team,
        order: orders[index],
        captain,
        members,
      };
    });
  }, [teams, participants]);

  return (
    <motion.div
      key="finished"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-full flex-col items-center justify-center px-4"
    >
      {/* 헤더 */}
      <motion.div
        className="mb-4 text-6xl"
        animate={{
          rotate: [0, 10, -10, 10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 0.5 }}
      >
        🏆
      </motion.div>
      <h2 className="mb-2 text-3xl font-bold text-amber-400">경매 종료!</h2>
      <p className="mb-8 text-lg text-slate-400">모든 팀 구성이 완료되었습니다</p>

      {/* 팀 리스트 */}
      <div className="w-full max-w-3xl space-y-2">
        {teamsWithOrder.map(({ team, order, captain, members }, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-lg bg-slate-800/50 px-4 py-3"
            style={{ borderLeft: `4px solid ${team.color}` }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              {/* 순번 */}
              <span className="min-w-[36px] rounded bg-slate-700/50 px-2 py-1 text-center text-sm font-bold text-slate-300">
                [{order}]
              </span>

              {/* 포인트 */}
              <span className="min-w-[60px] text-sm font-medium text-amber-400">
                {team.currentPoints}p
              </span>

              {/* 팀장 */}
              {captain && (
                <span className="font-bold text-slate-200">
                  {captain.nickname}
                  <span className="ml-1 text-xs font-normal text-slate-500">(팀장)</span>
                </span>
              )}

              {/* 팀원들 */}
              {members.map((member, memberIndex) => (
                <span key={member.id} className="text-slate-300">
                  <span className="text-slate-600 mx-1">·</span>
                  {member.nickname}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
