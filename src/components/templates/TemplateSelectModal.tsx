"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuctionTemplate, TemplateTeam, getAllTemplates } from "@/data/templates";
import TeamCheckboxSelector from "./TeamCheckboxSelector";

interface TemplateSelectModalProps {
  onSelect: (template: AuctionTemplate, selectedTeams: TemplateTeam[]) => void;
  onClose: () => void;
}

export default function TemplateSelectModal({
  onSelect,
  onClose,
}: TemplateSelectModalProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<AuctionTemplate | null>(null);
  const [selectedTeamNames, setSelectedTeamNames] = useState<string[]>([]);

  const templates = getAllTemplates();

  const handleTemplateSelect = (template: AuctionTemplate) => {
    setSelectedTemplate(template);
    // 기본으로 최대 팀 수만큼 선택 (최대 10팀)
    const defaultCount = Math.min(template.metadata.maxTeams, 10);
    const defaultTeams = template.teams.slice(0, defaultCount).map((t) => t.name);
    setSelectedTeamNames(defaultTeams);
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setSelectedTeamNames([]);
  };

  const handleApply = () => {
    if (selectedTemplate && selectedTeamNames.length >= 2) {
      // 선택된 팀 이름 순서대로 팀 객체 배열 생성
      const selectedTeams = selectedTeamNames
        .map((name) => selectedTemplate.teams.find((t) => t.name === name))
        .filter((t): t is TemplateTeam => t !== undefined);
      onSelect(selectedTemplate, selectedTeams);
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
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
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
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-200">
                          {template.metadata.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {template.metadata.description}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {template.teams.length}팀
                      </span>
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

          {/* 2단계: 팀 선택 */}
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
                  <p className="mt-1 text-slate-400">참가할 팀을 선택하세요</p>
                </div>
              </div>

              <TeamCheckboxSelector
                teams={selectedTemplate.teams}
                selectedTeams={selectedTeamNames}
                onChange={setSelectedTeamNames}
                minTeams={selectedTemplate.metadata.minTeams}
                maxTeams={Math.min(selectedTemplate.metadata.maxTeams, 10)}
              />

              {/* 설정 미리보기 */}
              <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>선택된 팀</span>
                  <span className="text-slate-200">
                    {selectedTeamNames.length}팀
                  </span>
                </div>
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
                    {selectedTeamNames.length *
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
                  disabled={selectedTeamNames.length < 2}
                  className="flex-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-3 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedTeamNames.length}팀 적용하기
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
