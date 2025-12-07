"use client";

import { motion } from "framer-motion";
import type { Team, Participant } from "@/types";
import { useMemo } from "react";

interface FinishedPhaseProps {
  teams: Team[];
  participants: Participant[];
  memberSoldPrices: Record<string, number>; // memberId -> soldPrice
}

interface MemberWithPrice {
  participant: Participant;
  soldPrice: number | null; // null = 유찰자
}

interface TeamWithOrder {
  team: Team;
  order: number;
  captain: Participant | undefined;
  members: MemberWithPrice[]; // 낙찰가 순으로 정렬된 멤버 목록
}

export default function FinishedPhase({ teams, participants, memberSoldPrices }: FinishedPhaseProps) {
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
      const teamMembers = participants.filter(p => p.teamId === team.id && p.role === "MEMBER");

      // 멤버를 낙찰가 순으로 정렬 (높은 가격 순, 유찰자는 맨 뒤)
      const membersWithPrice: MemberWithPrice[] = teamMembers.map(member => ({
        participant: member,
        soldPrice: memberSoldPrices[member.id] ?? null, // undefined면 유찰
      })).sort((a, b) => {
        // 유찰자는 맨 뒤로
        if (a.soldPrice === null && b.soldPrice === null) return 0;
        if (a.soldPrice === null) return 1;
        if (b.soldPrice === null) return -1;
        // 낙찰가 높은 순
        return b.soldPrice - a.soldPrice;
      });

      return {
        team,
        order: orders[index],
        captain,
        members: membersWithPrice,
      };
    });
  }, [teams, participants, memberSoldPrices]);

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
      <div className="w-full max-w-4xl space-y-4">
        {teamsWithOrder.map(({ team, order, captain, members }, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="overflow-hidden rounded-xl bg-slate-800/50"
            style={{ borderLeft: `4px solid ${team.color}` }}
          >
            {/* 팀 헤더 */}
            <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3">
              {/* 순번 */}
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-sm font-bold text-slate-300">
                {order}
              </span>

              {/* 팀 이름 */}
              <span
                className="font-bold text-slate-200"
                style={{ color: team.color }}
              >
                {team.name}
              </span>

              {/* 남은 포인트 */}
              <span className="ml-auto rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
                잔여 {team.currentPoints}p
              </span>
            </div>

            {/* 팀 멤버 리스트 */}
            <div className="divide-y divide-slate-700/30">
              {/* 팀장 */}
              {captain && (
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="w-20 text-right text-sm font-medium text-purple-400">
                    팀장
                  </span>
                  <span className="min-w-[100px] font-semibold text-slate-200">
                    {captain.nickname}
                  </span>
                  <span className="text-sm text-slate-500">
                    {captain.position}
                  </span>
                  <span className="ml-auto rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">
                    {team.captainPoints}p
                  </span>
                </div>
              )}

              {/* 팀원들 (낙찰가 순) */}
              {members.map(({ participant, soldPrice }, memberIndex) => (
                <div key={participant.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="w-20 text-right text-sm text-slate-500">
                    {memberIndex + 1}픽
                  </span>
                  <span className="min-w-[100px] font-medium text-slate-300">
                    {participant.nickname}
                  </span>
                  <span className="text-sm text-slate-500">
                    {participant.position}
                  </span>
                  <span className="ml-auto">
                    {soldPrice !== null ? (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                        {soldPrice}p
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-500">
                        유찰
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
