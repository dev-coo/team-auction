"use client";

import { TemplateTeam } from "@/data/templates/types";

interface TeamCheckboxSelectorProps {
  teams: TemplateTeam[];
  selectedTeams: string[]; // 선택된 팀 이름 배열
  onChange: (selectedTeams: string[]) => void;
  minTeams: number;
  maxTeams: number;
}

export default function TeamCheckboxSelector({
  teams,
  selectedTeams,
  onChange,
  minTeams,
  maxTeams,
}: TeamCheckboxSelectorProps) {
  const handleToggle = (teamName: string) => {
    if (selectedTeams.includes(teamName)) {
      // 이미 선택된 경우 제거 (최소 팀 수 체크)
      if (selectedTeams.length > minTeams) {
        onChange(selectedTeams.filter((t) => t !== teamName));
      }
    } else {
      // 선택 안 된 경우 추가 (최대 팀 수 체크)
      if (selectedTeams.length < maxTeams) {
        onChange([...selectedTeams, teamName]);
      }
    }
  };

  const handleSelectAll = () => {
    const allTeamNames = teams.slice(0, maxTeams).map((t) => t.name);
    onChange(allTeamNames);
  };

  const handleDeselectAll = () => {
    // 최소 팀 수만큼 남기기
    const firstTeams = teams.slice(0, minTeams).map((t) => t.name);
    onChange(firstTeams);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          팀 선택 ({selectedTeams.length}/{maxTeams})
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            전체 선택
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 팀 체크박스 그리드 */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {teams.map((team) => {
          const isSelected = selectedTeams.includes(team.name);
          const isDisabled = !isSelected && selectedTeams.length >= maxTeams;

          return (
            <button
              key={team.name}
              type="button"
              onClick={() => handleToggle(team.name)}
              disabled={isDisabled}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                isSelected
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : isDisabled
                  ? "border border-slate-700/30 bg-slate-800/20 text-slate-600 cursor-not-allowed"
                  : "border border-slate-700/50 bg-slate-800/30 text-slate-300 hover:border-slate-600"
              }`}
            >
              <div
                className={`h-4 w-4 rounded border flex items-center justify-center ${
                  isSelected
                    ? "border-amber-500 bg-amber-500"
                    : "border-slate-600 bg-slate-800"
                }`}
              >
                {isSelected && (
                  <svg
                    className="h-3 w-3 text-slate-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="truncate">{team.name}</span>
            </button>
          );
        })}
      </div>

      {/* 선택된 팀 미리보기 */}
      {selectedTeams.length > 0 && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <p className="mb-2 text-xs text-slate-500">선택된 팀</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedTeams.map((teamName) => (
              <span
                key={teamName}
                className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-300"
              >
                {teamName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      <p className="text-xs text-slate-500 text-center">
        최소 {minTeams}팀 ~ 최대 {maxTeams}팀 선택 가능
      </p>
    </div>
  );
}
