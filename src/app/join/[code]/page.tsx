"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  getAuctionByHostCode,
  getAuctionByObserverCode,
  getTeamByCaptainCode,
} from "@/lib/api/auction";
import { confirmCaptain, createObserver } from "@/lib/api/participant";
import { AuctionRoom, Team, Participant } from "@/types";

type JoinType = "HOST" | "CAPTAIN" | "OBSERVER" | null;

interface CaptainData {
  team: Team;
  captain: Participant;
  room: AuctionRoom;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinType, setJoinType] = useState<JoinType>(null);

  // 주최자/옵저버용 방 정보
  const [room, setRoom] = useState<AuctionRoom | null>(null);

  // 팀장용 데이터
  const [captainData, setCaptainData] = useState<CaptainData | null>(null);

  // 옵저버용 닉네임
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 코드 타입 확인
  useEffect(() => {
    async function checkCode() {
      setLoading(true);
      setError(null);

      try {
        // 1. 주최자 코드 확인
        const hostRoom = await getAuctionByHostCode(code);
        if (hostRoom) {
          setJoinType("HOST");
          setRoom(hostRoom);
          setLoading(false);
          return;
        }

        // 2. 팀장 코드 확인
        const captainResult = await getTeamByCaptainCode(code);
        if (captainResult) {
          setJoinType("CAPTAIN");
          setCaptainData(captainResult);
          setLoading(false);
          return;
        }

        // 3. 옵저버 코드 확인
        const observerRoom = await getAuctionByObserverCode(code);
        if (observerRoom) {
          setJoinType("OBSERVER");
          setRoom(observerRoom);
          setLoading(false);
          return;
        }

        // 모두 실패
        setError("유효하지 않은 초대 링크입니다");
      } catch (err) {
        console.error("코드 확인 실패:", err);
        setError("링크 확인 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      checkCode();
    }
  }, [code]);

  // 주최자 입장
  const handleHostJoin = () => {
    if (!room) return;
    localStorage.setItem(`host_code_${room.id}`, code);
    router.push(`/room/${room.id}`);
  };

  // 팀장 입장 (본인 확인)
  const handleCaptainConfirm = async () => {
    if (!captainData) return;

    setIsSubmitting(true);
    try {
      await confirmCaptain(captainData.captain.id);
      localStorage.setItem(`participant_id_${captainData.room.id}`, captainData.captain.id);
      router.push(`/room/${captainData.room.id}`);
    } catch (err) {
      console.error("팀장 확인 실패:", err);
      setError("입장 처리 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 옵저버 입장
  const handleObserverJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !nickname.trim()) return;

    setIsSubmitting(true);
    try {
      const participant = await createObserver(room.id, nickname.trim());
      localStorage.setItem(`participant_id_${room.id}`, participant.id);
      router.push(`/room/${room.id}`);
    } catch (err) {
      console.error("옵저버 생성 실패:", err);
      setError("입장 처리 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto" />
          <p className="text-slate-400">링크 확인 중...</p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <motion.div
          className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-800/30 p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4 text-4xl">❌</div>
          <h1 className="mb-2 text-xl font-bold text-slate-200">{error}</h1>
          <p className="mb-6 text-slate-400">
            주최자에게 올바른 링크를 요청해주세요.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full border border-slate-600 bg-slate-800/50 px-6 py-3 font-semibold text-slate-300 transition-all hover:border-slate-500"
          >
            홈으로 돌아가기
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-1/4 top-0 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-1/4 bottom-0 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>

      {/* 주최자 입장 */}
      {joinType === "HOST" && room && (
        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-800/30 p-8 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl">👑</div>
            <h1 className="text-2xl font-bold text-amber-400">주최자 입장</h1>
            <p className="mt-2 text-slate-400">{room.title}</p>
          </div>

          <div className="mb-6 rounded-lg bg-slate-900/50 p-4">
            <p className="text-sm text-slate-300">
              주최자로서 경매를 진행하고 제어할 수 있습니다.
            </p>
          </div>

          <button
            onClick={handleHostJoin}
            className="w-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-4 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50"
          >
            경매방 입장
          </button>
        </motion.div>
      )}

      {/* 팀장 입장 */}
      {joinType === "CAPTAIN" && captainData && (
        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl">🎯</div>
            <h1 className="text-2xl font-bold text-slate-200">팀장 입장</h1>
            <p className="mt-2 text-slate-400">{captainData.room.title}</p>
          </div>

          <div className="mb-6 rounded-lg border border-slate-700/50 bg-slate-900/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: captainData.team.color }}
              />
              <span className="font-semibold text-slate-200">
                {captainData.team.name}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-300">
                <span className="text-slate-500">이름:</span>{" "}
                {captainData.captain.nickname}
              </p>
              {captainData.captain.position && (
                <p className="text-slate-300">
                  <span className="text-slate-500">포지션:</span>{" "}
                  {captainData.captain.position}
                </p>
              )}
              {captainData.captain.description && (
                <p className="text-slate-300">
                  <span className="text-slate-500">소개:</span>{" "}
                  {captainData.captain.description}
                </p>
              )}
            </div>
          </div>

          <p className="mb-4 text-center text-sm text-slate-400">
            위 정보가 본인이 맞으면 확인을 눌러주세요.
          </p>

          <button
            onClick={handleCaptainConfirm}
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-4 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "입장 중..." : "본인 맞습니다"}
          </button>
        </motion.div>
      )}

      {/* 옵저버 입장 */}
      {joinType === "OBSERVER" && room && (
        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl">👁️</div>
            <h1 className="text-2xl font-bold text-slate-200">관전자 입장</h1>
            <p className="mt-2 text-slate-400">{room.title}</p>
          </div>

          <form onSubmit={handleObserverJoin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                닉네임 <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="채팅에 표시될 이름"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <p className="text-sm text-slate-500">
              경매를 관전하고 채팅에 참여할 수 있습니다.
            </p>

            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim()}
              className="w-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-4 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "입장 중..." : "입장하기"}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
