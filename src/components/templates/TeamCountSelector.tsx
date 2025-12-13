"use client";

import { TemplateTeam } from "@/data/templates/types";

interface TeamCountSelectorProps {
  min: number;
  max: number;
  value: number;
  onChange: (count: number) => void;
  teams: TemplateTeam[];
}

export default function TeamCountSelector({
  min,
  max,
  value,
  onChange,
  teams,
}: TeamCountSelectorProps) {
  const counts = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const selectedTeams = teams.slice(0, value);

  return (
    <div className="space-y-4">
      {/* 팀 수 버튼 그리드 */}
      <div className="flex flex-wrap justify-center gap-2">
        {counts.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onChange(count)}
            className={`h-12 w-12 rounded-lg font-bold transition-all ${
              value === count
                ? "bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {count}
          </button>
        ))}
      </div>

      {/* 선택된 팀 미리보기 */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <p className="mb-2 text-center text-sm text-slate-400">
          선택된 팀 ({value}팀)
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {selectedTeams.map((team) => (
            <span
              key={team.name}
              className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-200"
            >
              {team.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
