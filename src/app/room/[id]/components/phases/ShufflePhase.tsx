"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Participant, ParticipantRole } from "@/types";
import { createSeededRandom } from "@/lib/auction-utils";

export type ShuffleState = "GATHER" | "SHUFFLING" | "REVEALING" | "COMPLETE";

interface ShufflePhaseProps {
  currentRole: ParticipantRole;
  members: Participant[];
  shuffledOrder: string[] | null;
  shuffleState: ShuffleState;
  revealedCount: number;
  animationSeed: number | null;
  onStartShuffle: () => void;
  onNextPhase: () => void;
}

interface CardPosition {
  x: number;
  y: number;
  rotate: number;
  zIndex: number;
}

export default function ShufflePhase({
  currentRole,
  members,
  shuffledOrder,
  shuffleState,
  revealedCount,
  animationSeed,
  onStartShuffle,
  onNextPhase,
}: ShufflePhaseProps) {
  // 섞이는 애니메이션용 위치 상태 (member.id -> position 맵)
  const [positionMap, setPositionMap] = useState<Record<string, CardPosition>>({});

  // 공개되지 않은 카드 ID 목록 (셔플 중인 카드들)
  const unrevealedIds = useMemo(() => {
    if (!shuffledOrder) return members.map((m) => m.id);
    return shuffledOrder.slice(revealedCount);
  }, [shuffledOrder, revealedCount, members]);

  // 공개된 카드들 (순서대로)
  const revealedMembers = useMemo(() => {
    if (!shuffledOrder) return [];
    return shuffledOrder.slice(0, revealedCount).map((id, index) => {
      const member = members.find((m) => m.id === id);
      return { ...member!, order: index + 1 };
    });
  }, [shuffledOrder, revealedCount, members]);

  // 셔플 중인 카드들
  const shufflingMembers = useMemo(() => {
    return members.filter((m) => unrevealedIds.includes(m.id));
  }, [members, unrevealedIds]);

  // 섞이는 애니메이션 효과 (interval 기반으로 위치 업데이트)
  useEffect(() => {
    if (shuffleState !== "SHUFFLING" && shuffleState !== "REVEALING") {
      queueMicrotask(() => setPositionMap({}));
      return;
    }
    if (!animationSeed || !shuffledOrder) return;

    // 셔플된 순서의 멤버 ID 목록 (공개되지 않은 것들만)
    const memberIds = shuffledOrder.slice(revealedCount);
    const seededRandom = createSeededRandom(animationSeed + revealedCount); // revealedCount를 시드에 추가하여 동기화

    // 위치 생성 함수 (ID 기반 맵 반환)
    const generatePositionMap = () => {
      const map: Record<string, CardPosition> = {};
      memberIds.forEach((id) => {
        map[id] = {
          x: seededRandom() * 200 - 100,
          y: seededRandom() * 80 - 40,
          rotate: seededRandom() * 30 - 15,
          zIndex: Math.floor(seededRandom() * memberIds.length),
        };
      });
      return map;
    };

    // 즉시 첫 위치 설정
    queueMicrotask(() => setPositionMap(generatePositionMap()));

    // 0.3초마다 위치 변경
    const interval = setInterval(() => {
      setPositionMap(generatePositionMap());
    }, 300);

    return () => clearInterval(interval);
  }, [shuffleState, animationSeed, shuffledOrder, revealedCount]);

  return (
    <motion.div
      key="shuffle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full flex-col items-center justify-between py-8"
    >
      {/* 제목 */}
      <div className="text-center">
        <h2 className="mb-2 text-3xl font-bold text-slate-200">
          {shuffleState === "GATHER" && "팀원 셔플 준비"}
          {shuffleState === "SHUFFLING" && "셔플 중..."}
          {shuffleState === "REVEALING" && "순서 공개 중..."}
          {shuffleState === "COMPLETE" && "셔플 완료!"}
        </h2>
        <p className="text-slate-400">
          {shuffleState === "GATHER" && "팀원들의 경매 순서가 결정됩니다"}
          {shuffleState === "SHUFFLING" && "카드를 섞고 있습니다"}
          {shuffleState === "REVEALING" &&
            `${revealedCount} / ${members.length} 공개`}
          {shuffleState === "COMPLETE" && "모든 순서가 결정되었습니다!"}
        </p>
      </div>

      {/* 셔플 영역 (중앙) */}
      <div className="relative flex h-64 w-full max-w-2xl items-center justify-center">
        <AnimatePresence mode="popLayout">
          {/* GATHER 또는 SHUFFLING/REVEALING 중 미공개 카드 */}
          {(shuffleState === "GATHER" ||
            shuffleState === "SHUFFLING" ||
            shuffleState === "REVEALING") &&
            shufflingMembers.map((member, index) => {
              const pos = positionMap[member.id];
              return (
                <motion.div
                  key={member.id}
                  className="absolute"
                  initial={
                    shuffleState === "GATHER"
                      ? { y: 300, opacity: 0, scale: 0.8 }
                      : undefined
                  }
                  animate={{
                    x: pos?.x || 0,
                    y: pos?.y || 0,
                    rotate: pos?.rotate || 0,
                    opacity: 1,
                    scale: 1,
                    zIndex: pos?.zIndex || index,
                  }}
                  exit={{ scale: 0, opacity: 0, y: -50 }}
                  transition={
                    shuffleState === "GATHER"
                      ? { delay: index * 0.1, type: "spring", stiffness: 200 }
                      : { type: "spring", stiffness: 300, damping: 25 }
                  }
                >
                  {/* 카드 뒷면 */}
                  <div className="relative h-28 w-20 rounded-xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-900 via-slate-800 to-purple-900 shadow-xl">
                    {/* 카드 뒷면 패턴 */}
                    <div className="absolute inset-2 rounded-lg border border-purple-500/30 bg-purple-500/10" />
                    <div className="absolute inset-4 rounded border border-purple-400/20" />
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* 공개된 카드 목록 (하단) */}
      <div className="w-full max-w-4xl px-4">
        <div className="flex flex-wrap justify-center gap-3">
          <AnimatePresence>
            {revealedMembers.map((member) => (
              <motion.div
                key={member.id}
                initial={{ y: -100, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative"
              >
                {/* 순서 배지 */}
                <div className="absolute -top-2 -left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900 shadow-lg">
                  {member.order}
                </div>
                {/* 카드 앞면 */}
                <div className="rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 shadow-lg">
                  <div className="text-sm font-semibold text-slate-200">
                    {member.nickname}
                  </div>
                  <div className="text-xs text-slate-400">{member.position}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 빈 상태 표시 */}
        {revealedMembers.length === 0 && shuffleState !== "COMPLETE" && (
          <div className="py-8 text-center text-slate-500">
            셔플이 완료되면 여기에 순서가 표시됩니다
          </div>
        )}
      </div>

      {/* 역할별 버튼/메시지 */}
      <div className="mt-4">
        {currentRole === "HOST" && shuffleState === "GATHER" && (
          <motion.button
            className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartShuffle}
          >
            셔플 시작
          </motion.button>
        )}

        {currentRole === "HOST" && shuffleState === "COMPLETE" && (
          <motion.button
            className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNextPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            경매 시작 →
          </motion.button>
        )}

        {currentRole === "HOST" &&
          (shuffleState === "SHUFFLING" || shuffleState === "REVEALING") && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-6 py-3">
              <span className="text-amber-400">
                {shuffleState === "SHUFFLING"
                  ? "카드를 섞고 있습니다..."
                  : "순서를 공개하고 있습니다..."}
              </span>
            </div>
          )}

        {currentRole !== "HOST" && (
          <motion.div
            className="rounded-lg border border-slate-600 bg-slate-800/50 px-6 py-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-slate-400">
              {shuffleState === "GATHER" && "주최자가 셔플을 시작합니다"}
              {shuffleState === "SHUFFLING" && "셔플 진행 중..."}
              {shuffleState === "REVEALING" && "순서 공개 중..."}
              {shuffleState === "COMPLETE" && "셔플 완료!"}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
