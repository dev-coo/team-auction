"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuctionTemplate, getAllTemplates } from "@/data/templates";
import TeamCountSelector from "./TeamCountSelector";

interface TemplateSelectModalProps {
  onSelect: (template: AuctionTemplate, teamCount: number) => void;
  onClose: () => void;
}

export default function TemplateSelectModal({
  onSelect,
  onClose,
}: TemplateSelectModalProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<AuctionTemplate | null>(null);
  const [teamCount, setTeamCount] = useState<number>(0);

  const templates = getAllTemplates();

  const handleTemplateSelect = (template: AuctionTemplate) => {
    setSelectedTemplate(template);
    setTeamCount(template.metadata.maxTeams);
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setTeamCount(0);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate, teamCount);
    }
  };

  // Portal을 위한 mounted 상태
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-lg rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1단계: 템플릿 선택 */}
          {!selectedTemplate && (
            <>
              <div className="mb-6 text-center">
                <div className="mb-2 text-4xl">📋</div>
                <h2 className="text-2xl font-bold text-slate-200">
                  템플릿 선택
                </h2>
                <p className="mt-1 text-slate-400">
                  경매에 사용할 템플릿을 선택하세요
                </p>
              </div>

              <div className="space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.metadata.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-left transition-all hover:border-amber-500/50 hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {template.metadata.icon}
                      </span>
                      <div>
                        <h3 className="font-semibold text-slate-200">
                          {template.metadata.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {template.metadata.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-full border border-slate-600 bg-slate-800/50 px-6 py-3 font-semibold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700/50"
              >
                취소
              </button>
            </>
          )}

          {/* 2단계: 팀 수 선택 */}
          {selectedTemplate && (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
                >
                  ← 뒤로
                </button>
                <div className="text-center">
                  <div className="mb-2 text-4xl">
                    {selectedTemplate.metadata.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-200">
                    {selectedTemplate.metadata.name}
                  </h2>
                  <p className="mt-1 text-slate-400">참가 팀 수를 선택하세요</p>
                </div>
              </div>

              <TeamCountSelector
                min={selectedTemplate.metadata.minTeams}
                max={selectedTemplate.metadata.maxTeams}
                value={teamCount}
                onChange={setTeamCount}
                teams={selectedTemplate.teams}
              />

              {/* 설정 미리보기 */}
              <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>팀당 인원</span>
                  <span className="text-slate-200">
                    {selectedTemplate.metadata.membersPerTeam}명
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>총 포인트</span>
                  <span className="text-slate-200">
                    {selectedTemplate.metadata.defaultPoints}p
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>총 팀원 수</span>
                  <span className="text-slate-200">
                    {teamCount *
                      (selectedTemplate.metadata.membersPerTeam - 1)}
                    명
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full border border-slate-600 bg-slate-800/50 px-6 py-3 font-semibold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700/50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-3 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50"
                >
                  {teamCount}팀 적용하기
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
