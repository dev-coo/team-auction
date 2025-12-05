"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Team, Participant, ParticipantRole } from "@/types";

interface RandomAssignment {
  memberId: string;
  teamId: string;
  teamName: string;
  teamColor: string;
}

interface RandomAssignPhaseProps {
  currentRole: ParticipantRole;
  teams: Team[];
  targetMembers: Participant[];
  preCalculatedAssignments: RandomAssignment[];
  onStartRandomAssign: () => void;
  onAnimationComplete: () => void;
}

const ANIMATION_DURATION = 5000; // 5초
const COLOR_CHANGE_INTERVAL = 150; // 0.15초마다 색상 변경

export default function RandomAssignPhase({
  currentRole,
  teams,
  targetMembers,
  preCalculatedAssignments,
  onStartRandomAssign,
  onAnimationComplete,
}: RandomAssignPhaseProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [currentColors, setCurrentColors] = useState<Record<string, { color: string; name: string }>>({});
  const [countdown, setCountdown] = useState(5);

  // 랜덤 색상 애니메이션
  useEffect(() => {
    if (!isAnimating || animationComplete) return;

    // 초기 랜덤 색상 설정
    const initialColors: Record<string, { color: string; name: string }> = {};
    targetMembers.forEach((member) => {
      const randomTeam = teams[Math.floor(Math.random() * teams.length)];
      initialColors[member.id] = { color: randomTeam.color, name: randomTeam.name };
    });
    setCurrentColors(initialColors);

    // 색상 변경 인터벌
    const colorInterval = setInterval(() => {
      setCurrentColors((prev) => {
        const newColors: Record<string, { color: string; name: string }> = {};
        targetMembers.forEach((member) => {
          const randomTeam = teams[Math.floor(Math.random() * teams.length)];
          newColors[member.id] = { color: randomTeam.color, name: randomTeam.name };
        });
        return newColors;
      });
    }, COLOR_CHANGE_INTERVAL);

    // 카운트다운
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    // 애니메이션 종료
    const animationTimeout = setTimeout(() => {
      clearInterval(colorInterval);
      clearInterval(countdownInterval);

      // 최종 결과로 색상 설정
      const finalColors: Record<string, { color: string; name: string }> = {};
      preCalculatedAssignments.forEach((assignment) => {
        finalColors[assignment.memberId] = {
          color: assignment.teamColor,
          name: assignment.teamName,
        };
      });
      setCurrentColors(finalColors);
      setAnimationComplete(true);
      setCountdown(0);
    }, ANIMATION_DURATION);

    return () => {
      clearInterval(colorInterval);
      clearInterval(countdownInterval);
      clearTimeout(animationTimeout);
    };
  }, [isAnimating, animationComplete, teams, targetMembers, preCalculatedAssignments]);

  // 랜덤 배분 시작
  const handleStartRandomAssign = useCallback(() => {
    onStartRandomAssign();
    setIsAnimating(true);
    setCountdown(5);
  }, [onStartRandomAssign]);

  // 애니메이션 완료 후 확인
  const handleConfirm = useCallback(() => {
    onAnimationComplete();
  }, [onAnimationComplete]);

  return (
    <motion.div
      key="random-assign"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full flex-col items-center justify-center"
    >
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <motion.div
          className="mb-4 text-6xl"
          animate={isAnimating && !animationComplete ? { rotate: [0, 360] } : {}}
          transition={{ duration: 1, repeat: isAnimating && !animationComplete ? Infinity : 0, ease: "linear" }}
        >
          🎲
        </motion.div>
        <h2 className="mb-2 text-3xl font-bold text-slate-200">
          {animationComplete ? "배분 완료!" : isAnimating ? "랜덤 배분 중..." : "재유찰 멤버 랜덤 배분"}
        </h2>
        <p className="text-slate-400">
          {animationComplete
            ? "모든 멤버가 팀에 배정되었습니다"
            : isAnimating
            ? `${countdown}초 후 결과가 확정됩니다`
            : `${targetMembers.length}명의 재유찰 멤버를 랜덤으로 배분합니다`}
        </p>
      </div>

      {/* 멤버 카드 그리드 */}
      <div className="mb-8 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <AnimatePresence>
          {targetMembers.map((member, index) => {
            const colorInfo = currentColors[member.id];
            const finalAssignment = preCalculatedAssignments.find(
              (a) => a.memberId === member.id
            );

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-center"
              >
                {/* 팀 색상 배경 (애니메이션) */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    backgroundColor: colorInfo?.color || "#374151",
                  }}
                  transition={{ duration: animationComplete ? 0.5 : 0.1 }}
                />

                {/* 멤버 정보 */}
                <div className="relative z-10">
                  <div className="mb-3 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700/50 text-3xl">
                      👤
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-200">
                    {member.nickname}
                  </h3>
                  <p className="text-sm text-slate-400">{member.position}</p>

                  {/* 팀 표시 */}
                  {(isAnimating || animationComplete) && colorInfo && (
                    <motion.div
                      className="mt-3 flex items-center justify-center gap-2 rounded-full px-3 py-1"
                      style={{ backgroundColor: `${colorInfo.color}40` }}
                      animate={
                        !animationComplete
                          ? { scale: [1, 1.05, 1] }
                          : { scale: 1 }
                      }
                      transition={{
                        duration: 0.2,
                        repeat: !animationComplete ? Infinity : 0,
                      }}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: colorInfo.color }}
                      />
                      <span className="text-sm font-medium text-slate-200">
                        {colorInfo.name}
                      </span>
                    </motion.div>
                  )}

                  {/* 확정 표시 */}
                  {animationComplete && finalAssignment && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white"
                    >
                      ✓
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 버튼 */}
      {currentRole === "HOST" && (
        <div className="flex gap-4">
          {!isAnimating && !animationComplete && (
            <motion.button
              className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartRandomAssign}
            >
              🎲 랜덤 배분 시작
            </motion.button>
          )}

          {animationComplete && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-full bg-gradient-to-r from-green-500 via-green-400 to-green-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-green-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
            >
              경매 종료 →
            </motion.button>
          )}
        </div>
      )}

      {/* 비주최자용 안내 */}
      {currentRole !== "HOST" && !isAnimating && !animationComplete && (
        <div className="rounded-full bg-slate-800/50 px-6 py-3 text-slate-400">
          👀 주최자가 랜덤 배분을 시작할 때까지 대기 중...
        </div>
      )}
    </motion.div>
  );
}
