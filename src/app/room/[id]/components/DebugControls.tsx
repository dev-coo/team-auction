"use client";

import { useState } from "react";
import { AuctionPhase, ParticipantRole } from "@/types";

interface DebugControlsProps {
  currentRole: ParticipantRole;
  currentPhase: AuctionPhase;
  onRoleChange: (role: ParticipantRole) => void;
  onPhaseChange: (phase: AuctionPhase) => void;
  onReset?: () => Promise<void>;
  isResetting?: boolean;
}

const roleOptions: ParticipantRole[] = ["HOST", "CAPTAIN", "OBSERVER"];
const phaseOptions: AuctionPhase[] = [
  "WAITING",
  "CAPTAIN_INTRO",
  "SHUFFLE",
  "AUCTION",
  "FINISHED",
];

const roleLabels: Record<ParticipantRole, { label: string; color: string }> = {
  HOST: {
    label: "주최자",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  CAPTAIN: {
    label: "팀장",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  MEMBER: {
    label: "팀원",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
  OBSERVER: {
    label: "관전자",
    color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  },
};

const phaseLabels: Record<AuctionPhase, { label: string; color: string }> = {
  WAITING: {
    label: "대기 중",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  CAPTAIN_INTRO: {
    label: "팀장 소개",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
  SHUFFLE: {
    label: "팀원 셔플",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  },
  AUCTION: {
    label: "경매 진행",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  FINISHED: {
    label: "경매 종료",
    color: "text-green-400 bg-green-500/10 border-green-500/30",
  },
};

export default function DebugControls({
  currentRole,
  currentPhase,
  onRoleChange,
  onPhaseChange,
  onReset,
  isResetting,
}: DebugControlsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    if (onReset) {
      await onReset();
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-dashed border-slate-600 bg-slate-800/30 px-3 py-2">
      <span className="text-xs font-medium text-slate-500">DEBUG</span>

      {/* 역할 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">역할:</span>
        <select
          value={currentRole}
          onChange={(e) => onRoleChange(e.target.value as ParticipantRole)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium outline-none ${roleLabels[currentRole].color}`}
        >
          {roleOptions.map((role) => (
            <option
              key={role}
              value={role}
              className="bg-slate-800 text-slate-200"
            >
              {roleLabels[role].label}
            </option>
          ))}
        </select>
      </div>

      {/* 페이즈 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">페이즈:</span>
        <select
          value={currentPhase}
          onChange={(e) => onPhaseChange(e.target.value as AuctionPhase)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium outline-none ${phaseLabels[currentPhase].color}`}
        >
          {phaseOptions.map((phase) => (
            <option
              key={phase}
              value={phase}
              className="bg-slate-800 text-slate-200"
            >
              {phaseLabels[phase].label}
            </option>
          ))}
        </select>
      </div>

      {/* 초기화 버튼 */}
      {onReset && (
        <div className="relative">
          {showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">정말 초기화?</span>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="rounded px-2 py-1 text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isResetting ? "..." : "확인"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded px-2 py-1 text-xs font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
