"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { AuctionRoom, Team, Participant } from "@/types";

interface InviteLinksModalProps {
  room: AuctionRoom;
  teams: (Team & { captain: Participant })[];
  onClose: () => void;
  closeable?: boolean;
}

export default function InviteLinksModal({
  room,
  teams,
  onClose,
  closeable = true,
}: InviteLinksModalProps) {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const getJoinUrl = (code: string) => `${baseUrl}/join/${code}`;

  const copyToClipboard = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(getJoinUrl(code));
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  const handleEnterRoom = () => {
    // 주최자 코드를 localStorage에 저장
    localStorage.setItem(`host_code_${room.id}`, room.hostCode);
    router.push(`/room/${room.id}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeable ? onClose : undefined}
      >
        <motion.div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl">🎉</div>
            <h2 className="text-2xl font-bold text-slate-200">
              경매방이 생성되었습니다!
            </h2>
            <p className="mt-1 text-slate-400">{room.title}</p>
          </div>

          {/* 초대 링크 섹션 */}
          <div className="space-y-4">
            {/* 주최자 링크 */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">👑</span>
                <span className="font-semibold text-amber-400">주최자 링크</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getJoinUrl(room.hostCode)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300"
                />
                <button
                  onClick={() => copyToClipboard(room.hostCode, "주최자")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    copiedCode === room.hostCode
                      ? "bg-green-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {copiedCode === room.hostCode ? "복사됨!" : "복사"}
                </button>
              </div>
            </div>

            {/* 팀장 링크들 */}
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="font-semibold text-slate-200">팀장 링크</span>
                <span className="text-sm text-slate-400">
                  (팀별 개별 링크)
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/50 p-2"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="flex-1 text-sm text-slate-300">
                      {team.name}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(team.captainCode, team.name)
                      }
                      className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                        copiedCode === team.captainCode
                          ? "bg-green-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {copiedCode === team.captainCode ? "복사됨!" : "복사"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 옵저버 링크 */}
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">👁️</span>
                <span className="font-semibold text-slate-200">
                  옵저버 링크
                </span>
                <span className="text-sm text-slate-400">
                  (팀원/관전자 공용)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getJoinUrl(room.observerCode)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300"
                />
                <button
                  onClick={() => copyToClipboard(room.observerCode, "옵저버")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    copiedCode === room.observerCode
                      ? "bg-green-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {copiedCode === room.observerCode ? "복사됨!" : "복사"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                팀원도 경매를 관전하려면 이 링크로 입장합니다.
              </p>
            </div>
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex gap-3">
            {closeable ? (
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-600 bg-slate-800/50 px-6 py-3 font-semibold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700/50"
              >
                닫기
              </button>
            ) : (
              <button
                onClick={handleEnterRoom}
                className="flex-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-3 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50"
              >
                바로 입장하기
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
