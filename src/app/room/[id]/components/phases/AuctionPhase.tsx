"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Team,
  Participant,
  ParticipantRole,
  AuctionState,
} from "@/types";
import { getMinBidUnit, getNextMinBid } from "@/lib/auction-utils";
import { INITIAL_TIMER_SECONDS } from "@/lib/constants";

interface AuctionPhaseProps {
  currentRole: ParticipantRole;
  teams: Team[];
  auctionState: AuctionState;
  myTeam: Team | null;
  currentTarget: Participant | null | undefined;
  onStartAuction: () => void;
  onBid: (amount: number) => void;
  onNextAuction: () => void;
  onPass: () => void;
}

export default function AuctionPhase({
  currentRole,
  teams,
  auctionState,
  myTeam,
  currentTarget,
  onStartAuction,
  onBid,
  onNextAuction,
  onPass,
}: AuctionPhaseProps) {
  const [customBidInput, setCustomBidInput] = useState("");

  const {
    timer,
    timerRunning,
    currentPrice,
    highestBidTeamId,
    bidHistory,
    showSoldAnimation,
    lastSoldInfo,
    totalTargets,
    completedCount,
    auctionQueue,
  } = auctionState;

  // 현재 최고 입찰 팀 정보
  const highestBidTeam = teams.find((t) => t.id === highestBidTeamId);

  // 최소 입찰 단위
  const minBidUnit = getMinBidUnit(currentPrice);
  const nextMinBid = getNextMinBid(currentPrice);

  // 직접 입찰 처리
  const handleCustomBid = () => {
    const amount = parseInt(customBidInput, 10);
    if (isNaN(amount) || amount < nextMinBid) {
      return;
    }
    if (myTeam && amount > myTeam.currentPoints) {
      return;
    }
    onBid(amount);
    setCustomBidInput("");
  };

  // 낙찰 애니메이션 표시 중
  if (showSoldAnimation && lastSoldInfo) {
    return (
      <motion.div
        key="sold-animation"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="flex h-full flex-col items-center justify-center"
      >
        <motion.div
          className="mb-6 text-8xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{ duration: 0.5 }}
        >
          {lastSoldInfo.isAutoAssignment ? "🎁" : "🎉"}
        </motion.div>

        <h2 className="mb-2 text-4xl font-bold text-amber-400">
          {lastSoldInfo.isAutoAssignment ? "자동 배정!" : "낙찰!"}
        </h2>

        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold text-slate-200">
            {lastSoldInfo.targetNickname}
          </p>
          <p className="mt-2 flex items-center justify-center gap-2 text-xl">
            <span
              className="inline-block h-4 w-4 rounded-full"
              style={{ backgroundColor: lastSoldInfo.winnerTeamColor }}
            />
            <span className="text-slate-300">{lastSoldInfo.winnerTeamName}</span>
            <span className="text-amber-400">
              {lastSoldInfo.finalPrice > 0
                ? `${lastSoldInfo.finalPrice}p`
                : "무료!"}
            </span>
          </p>
        </div>

        {/* 주최자만 다음 버튼 표시 */}
        {currentRole === "HOST" && (
          <motion.button
            className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNextAuction}
          >
            {auctionQueue.length > 0 ? "다음 경매 →" : "경매 종료 →"}
          </motion.button>
        )}
      </motion.div>
    );
  }

  // 경매 대상이 없거나 경매 시작 전
  if (!currentTarget) {
    return (
      <motion.div
        key="auction-ready"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex h-full flex-col items-center justify-center"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">⚡</div>
          <h2 className="mb-2 text-3xl font-bold text-slate-200">
            경매 준비 완료
          </h2>
          <p className="text-slate-400">
            총 {totalTargets || auctionQueue.length}명의 팀원이 경매를 기다리고 있습니다
          </p>
        </div>

        {currentRole === "HOST" && auctionQueue.length > 0 && (
          <motion.button
            className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-amber-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartAuction}
          >
            첫 번째 경매 시작
          </motion.button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="auction-active"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full flex-col items-center justify-center"
    >
      {/* 진행 상황 */}
      <div className="mb-4 text-center">
        <span className="rounded-full bg-amber-500/20 px-4 py-1 text-sm font-medium text-amber-400">
          {completedCount + 1} / {totalTargets || auctionQueue.length + completedCount}
        </span>
      </div>

      {/* 현재 경매 대상 카드 */}
      <motion.div
        className="mb-8 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 text-center"
        layoutId={`member-card-${currentTarget.id}`}
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 text-5xl">
            👤
          </div>
        </div>
        <h2 className="text-3xl font-bold text-slate-200">
          {currentTarget.nickname}
        </h2>
        <p className="mt-1 text-lg text-amber-400">{currentTarget.position}</p>
        {currentTarget.description && (
          <p className="mt-2 text-slate-400">
            &ldquo;{currentTarget.description}&rdquo;
          </p>
        )}
      </motion.div>

      {/* 타이머 */}
      <div className="mb-6 w-full max-w-md">
        <div className="mb-2 flex items-center justify-center gap-2">
          <motion.span
            className={`text-5xl font-bold ${
              timer <= 3 ? "text-red-400" : "text-slate-200"
            }`}
            animate={timer <= 3 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {timer}
          </motion.span>
          <span className="text-xl text-slate-400">초</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-700">
          <motion.div
            className={`h-full rounded-full ${
              timer <= 3 ? "bg-red-500" : "bg-amber-500"
            }`}
            initial={{ width: "100%" }}
            animate={{ width: `${(timer / INITIAL_TIMER_SECONDS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* 현재 입찰 정보 */}
      <div className="mb-6 text-center">
        <p className="text-sm text-slate-400">현재 입찰가</p>
        <p className="text-5xl font-bold text-amber-400">
          {currentPrice}
          <span className="text-2xl">p</span>
        </p>
        {highestBidTeam ? (
          <p className="mt-2 flex items-center justify-center gap-2 text-slate-400">
            <span className="text-sm">최고 입찰자:</span>
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: highestBidTeam.color }}
            />
            <span className="font-medium text-slate-200">
              {highestBidTeam.name}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-slate-500">아직 입찰이 없습니다</p>
        )}
      </div>

      {/* 입찰 버튼 (팀장용) */}
      {currentRole === "CAPTAIN" && myTeam ? (
        <div className="w-full max-w-lg">
          {/* 남은 포인트 표시 */}
          <div className="mb-4 text-center">
            <span className="text-sm text-slate-400">
              내 팀 ({myTeam.name}) 남은 포인트:{" "}
            </span>
            <span className="font-bold text-amber-400">
              {myTeam.currentPoints}p
            </span>
          </div>

          {/* 최소입찰 버튼들 */}
          <div className="mb-4 flex justify-center gap-3">
            {[1, 2, 3].map((multiplier) => {
              const bidAmount = currentPrice + minBidUnit * multiplier;
              const disabled = !timerRunning || bidAmount > myTeam.currentPoints;
              return (
                <motion.button
                  key={multiplier}
                  className={`rounded-full px-6 py-3 text-lg font-bold shadow-lg transition-colors ${
                    disabled
                      ? "cursor-not-allowed bg-slate-700 text-slate-500"
                      : "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 shadow-amber-500/30"
                  }`}
                  whileHover={disabled ? {} : { scale: 1.05 }}
                  whileTap={disabled ? {} : { scale: 0.95 }}
                  onClick={() => !disabled && onBid(bidAmount)}
                  disabled={disabled}
                >
                  +{minBidUnit * multiplier}p
                </motion.button>
              );
            })}
          </div>

          {/* 직접 입찰 */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-4">
              <input
                type="number"
                min={nextMinBid}
                max={myTeam.currentPoints}
                value={customBidInput}
                onChange={(e) => setCustomBidInput(e.target.value)}
                placeholder={`${nextMinBid}p 이상`}
                className="w-28 bg-transparent py-3 text-center text-slate-200 outline-none placeholder:text-slate-500"
                disabled={!timerRunning}
              />
              <motion.button
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  !timerRunning ||
                  !customBidInput ||
                  parseInt(customBidInput) < nextMinBid ||
                  parseInt(customBidInput) > myTeam.currentPoints
                    ? "cursor-not-allowed bg-slate-700 text-slate-500"
                    : "bg-slate-600 text-slate-200 hover:bg-slate-500"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCustomBid}
                disabled={
                  !timerRunning ||
                  !customBidInput ||
                  parseInt(customBidInput) < nextMinBid ||
                  parseInt(customBidInput) > myTeam.currentPoints
                }
              >
                입찰
              </motion.button>
            </div>
          </div>

          {/* 입찰 불가 메시지 */}
          {!timerRunning && !showSoldAnimation && (
            <p className="mt-3 text-center text-sm text-slate-500">
              경매가 시작되면 입찰할 수 있습니다
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-slate-800/50 px-6 py-3 text-slate-400">
            👀 관전 중
          </div>
          <p className="text-sm text-slate-500">팀장만 입찰할 수 있습니다</p>
        </div>
      )}

      {/* 주최자 컨트롤 */}
      {currentRole === "HOST" && (
        <div className="mt-8 flex gap-4">
          {!timerRunning && !showSoldAnimation && (
            <motion.button
              className="rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-3 font-bold text-slate-900 shadow-lg shadow-amber-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartAuction}
            >
              경매 시작
            </motion.button>
          )}

          {/* 유찰 버튼 (입찰자가 없을 때만 활성화) */}
          {timer === 0 && !highestBidTeamId && (
            <motion.button
              className="rounded-full border border-slate-600 bg-slate-800/50 px-6 py-3 font-medium text-slate-300 hover:bg-slate-700/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPass}
            >
              유찰 (다음으로)
            </motion.button>
          )}
        </div>
      )}

      {/* 입찰 히스토리 */}
      {bidHistory.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <p className="mb-2 text-center text-xs text-slate-500">최근 입찰</p>
          <div className="flex flex-wrap justify-center gap-2">
            {bidHistory.slice(0, 5).map((bid, index) => (
              <motion.div
                key={`${bid.teamId}-${bid.timestamp}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                  index === 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-800/50 text-slate-400"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: bid.teamColor }}
                />
                <span>{bid.teamName}</span>
                <span className="font-medium">{bid.amount}p</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
