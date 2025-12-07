"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createAuction } from "@/lib/api/auction";
import InviteLinksModal from "@/components/InviteLinksModal";
import { AuctionRoom, Team, Participant } from "@/types";

const DRAFT_KEY = "auction_draft";
const LAST_CREATED_KEY = "last_created_auction";

interface DraftData {
  formData: {
    title: string;
    teamCount: number;
    memberPerTeam: number;
    totalPoints: number;
  };
  captains: PersonInput[];
  members: PersonInput[];
  savedAt: string;
  roomId?: string; // 생성 완료된 방의 ID (마지막 생성 방용)
}

interface PersonInput {
  nickname: string;
  position: string;
  description: string;
  points: number; // 팀장 포인트 (기본값 0)
}

interface CreateResult {
  room: AuctionRoom;
  teams: (Team & { captain: Participant })[];
}

export default function CreateAuction() {
  // 기본 설정
  const [formData, setFormData] = useState({
    title: "",
    teamCount: 5,
    memberPerTeam: 4,
    totalPoints: 1000,
  });

  // 팀장 목록 (팀 수에 맞춰 초기화)
  const [captains, setCaptains] = useState<PersonInput[]>(
    Array(5)
      .fill(null)
      .map(() => ({ nickname: "", position: "", description: "", points: 0 }))
  );

  // 팀원 목록 (팀수 × (팀당인원-1)로 고정)
  const [members, setMembers] = useState<PersonInput[]>(
    Array(5 * (4 - 1))
      .fill(null)
      .map(() => ({ nickname: "", position: "", description: "", points: 0 }))
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 생성 완료 모달
  const [showModal, setShowModal] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  // 임시 저장 관련
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<DraftData | null>(null);
  const [lastCreated, setLastCreated] = useState<DraftData | null>(null);

  // 임시 저장 및 마지막 생성 방 불러오기
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    const lastCreatedData = localStorage.getItem(LAST_CREATED_KEY);

    let hasDraft = false;
    let hasLastCreated = false;

    if (draft) {
      try {
        const parsed: DraftData = JSON.parse(draft);
        setSavedDraft(parsed);
        hasDraft = true;
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }

    if (lastCreatedData) {
      try {
        const parsed: DraftData = JSON.parse(lastCreatedData);
        setLastCreated(parsed);
        hasLastCreated = true;
      } catch {
        localStorage.removeItem(LAST_CREATED_KEY);
      }
    }

    // 둘 중 하나라도 있으면 모달 표시
    if (hasDraft || hasLastCreated) {
      setShowDraftModal(true);
    }
  }, []);

  // 자동 저장 (폼 데이터 변경 시)
  const saveDraft = useCallback(() => {
    const draft: DraftData = {
      formData,
      captains,
      members,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [formData, captains, members]);

  // 폼 변경 감지 후 자동 저장 (debounce)
  useEffect(() => {
    // 초기 로딩 시에는 저장하지 않음
    if (showDraftModal) return;

    const timer = setTimeout(() => {
      // 내용이 있을 때만 저장
      const hasContent =
        formData.title.trim() ||
        captains.some((c) => c.nickname.trim()) ||
        members.some((m) => m.nickname.trim());

      if (hasContent) {
        saveDraft();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, captains, members, saveDraft, showDraftModal]);

  // 임시 저장 복구
  const restoreDraft = () => {
    if (savedDraft) {
      setFormData(savedDraft.formData);
      setCaptains(savedDraft.captains);
      setMembers(savedDraft.members);
    }
    setShowDraftModal(false);
  };

  // 마지막 생성 방 복구
  const restoreLastCreated = () => {
    if (lastCreated) {
      setFormData(lastCreated.formData);
      setCaptains(lastCreated.captains);
      setMembers(lastCreated.members);
    }
    setShowDraftModal(false);
  };

  // 새로 작성 (모달 닫기만)
  const startFresh = () => {
    setShowDraftModal(false);
  };

  // 임시 저장 수동 삭제
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  // 마지막 생성 방 저장
  const saveLastCreated = (roomId: string) => {
    const data: DraftData = {
      formData,
      captains,
      members,
      savedAt: new Date().toISOString(),
      roomId,
    };
    localStorage.setItem(LAST_CREATED_KEY, JSON.stringify(data));
    clearDraft(); // 임시 저장은 삭제
  };

  // 기본 설정 변경
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = name === "title" ? value : Number(value);

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // 팀 수 변경 시 팀장/팀원 목록 조정
    if (name === "teamCount") {
      const count = Number(value);
      setCaptains((prev) => {
        if (count > prev.length) {
          return [
            ...prev,
            ...Array(count - prev.length)
              .fill(null)
              .map(() => ({ nickname: "", position: "", description: "", points: 0 })),
          ];
        } else {
          return prev.slice(0, count);
        }
      });
      // 팀원 수도 조정: 새팀수 × (팀당인원 - 1)
      const newMemberCount = count * (formData.memberPerTeam - 1);
      setMembers((prev) => {
        if (newMemberCount > prev.length) {
          return [
            ...prev,
            ...Array(newMemberCount - prev.length)
              .fill(null)
              .map(() => ({ nickname: "", position: "", description: "", points: 0 })),
          ];
        } else {
          return prev.slice(0, newMemberCount);
        }
      });
    }

    // 팀당 인원 변경 시 팀원 목록 조정
    if (name === "memberPerTeam") {
      const perTeam = Number(value);
      const newMemberCount = formData.teamCount * (perTeam - 1);
      setMembers((prev) => {
        if (newMemberCount > prev.length) {
          return [
            ...prev,
            ...Array(newMemberCount - prev.length)
              .fill(null)
              .map(() => ({ nickname: "", position: "", description: "", points: 0 })),
          ];
        } else {
          return prev.slice(0, newMemberCount);
        }
      });
    }

    // 에러 제거
    setErrors((prev) => {
      const newErrors = { ...prev };
      // 해당 필드 에러 제거
      delete newErrors[name];
      // 팀 수/팀당 인원 변경 시 팀장/팀원 관련 에러도 모두 제거
      if (name === "teamCount" || name === "memberPerTeam") {
        Object.keys(newErrors).forEach((key) => {
          if (key.startsWith("captain_") || key === "members") {
            delete newErrors[key];
          }
        });
      }
      return newErrors;
    });
  };

  // 팀장 정보 변경
  const handleCaptainChange = (
    index: number,
    field: keyof PersonInput,
    value: string | number
  ) => {
    setCaptains((prev) =>
      prev.map((captain, i) =>
        i === index ? { ...captain, [field]: value } : captain
      )
    );
  };

  // 팀원 정보 변경
  const handleMemberChange = (
    index: number,
    field: keyof PersonInput,
    value: string
  ) => {
    setMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    );
  };


  // 유효성 검사
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "경매 타이틀을 입력해주세요";
    }
    if (formData.teamCount < 2) {
      newErrors.teamCount = "최소 2개 팀이 필요합니다";
    }
    if (formData.memberPerTeam < 2) {
      newErrors.memberPerTeam = "팀당 최소 2명이 필요합니다 (팀장 포함)";
    }
    if (formData.totalPoints < 100) {
      newErrors.totalPoints = "최소 100 포인트가 필요합니다";
    }

    // 팀장 검사 (teamCount만큼만 검사)
    for (let i = 0; i < formData.teamCount; i++) {
      const captain = captains[i];
      if (!captain || !captain.nickname.trim()) {
        newErrors[`captain_${i}`] = `${i + 1}번째 팀장 이름을 입력해주세요`;
      } else {
        if (captain.points >= formData.totalPoints) {
          newErrors[`captain_points_${i}`] = `${i + 1}번째 팀장 포인트가 총 포인트보다 작아야 합니다`;
        }
        if (captain.points < 0) {
          newErrors[`captain_points_${i}`] = `${i + 1}번째 팀장 포인트는 0 이상이어야 합니다`;
        }
      }
    }

    // 팀원 검사 (모두 필수)
    const requiredCount = formData.teamCount * (formData.memberPerTeam - 1);
    const filledCount = members.filter((m) => m.nickname.trim()).length;
    if (filledCount < requiredCount) {
      newErrors.members = `모든 팀원 이름을 입력해주세요 (${filledCount}/${requiredCount}명 입력됨)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // 빈 닉네임 제외
      const validMembers = members.filter((m) => m.nickname.trim());

      const result = await createAuction({
        ...formData,
        captains: captains.slice(0, formData.teamCount).map((c) => ({
          nickname: c.nickname.trim(),
          position: c.position.trim(),
          description: c.description.trim() || undefined,
          points: c.points,
        })),
        members: validMembers.map((m) => ({
          nickname: m.nickname.trim(),
          position: m.position.trim(),
          description: m.description.trim() || undefined,
        })),
      });

      setCreateResult(result);
      setShowModal(true);
      // 성공 시 마지막 생성 방으로 저장
      saveLastCreated(result.room.id);
    } catch (error) {
      console.error("경매 생성 실패:", error);
      setErrors({
        submit:
          error instanceof Error ? error.message : "경매 생성에 실패했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="mb-2 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
            경매 생성
          </h1>
          <p className="text-slate-400">
            팀장과 팀원 정보를 등록하고 경매를 시작하세요
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 섹션 */}
          <motion.section
            className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-200">
              <span className="text-amber-400">01</span> 기본 정보
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  경매 타이틀 <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="예: 롤 내전 경매"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    팀 수
                  </label>
                  <input
                    type="number"
                    name="teamCount"
                    value={formData.teamCount}
                    onChange={handleChange}
                    min="2"
                    max="20"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  {errors.teamCount && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.teamCount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    팀당 인원 <span className="text-slate-500 text-xs">(팀장 포함)</span>
                  </label>
                  <input
                    type="number"
                    name="memberPerTeam"
                    value={formData.memberPerTeam}
                    onChange={handleChange}
                    min="2"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  {errors.memberPerTeam && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.memberPerTeam}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    총 포인트
                  </label>
                  <input
                    type="number"
                    name="totalPoints"
                    value={formData.totalPoints}
                    onChange={handleChange}
                    min="100"
                    step="50"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  {errors.totalPoints && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.totalPoints}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          {/* 팀장 등록 섹션 */}
          <motion.section
            className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-200">
              <span className="text-amber-400">02</span> 팀장 등록 (
              {formData.teamCount}명)
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              각 팀의 팀장 정보를 입력하세요. 팀장은 개별 링크로 입장합니다.
            </p>

            <div className="space-y-3">
              {captains.slice(0, formData.teamCount).map((captain, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-1 text-center text-sm font-medium text-slate-400">
                    팀장{index + 1}
                  </div>
                  <input
                    type="text"
                    value={captain.nickname}
                    onChange={(e) =>
                      handleCaptainChange(index, "nickname", e.target.value)
                    }
                    placeholder="이름 *"
                    className="col-span-3 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
                  />
                  <input
                    type="text"
                    value={captain.position}
                    onChange={(e) =>
                      handleCaptainChange(index, "position", e.target.value)
                    }
                    placeholder="포지션"
                    className="col-span-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
                  />
                  <input
                    type="text"
                    value={captain.description}
                    onChange={(e) =>
                      handleCaptainChange(index, "description", e.target.value)
                    }
                    placeholder="한줄소개"
                    className="col-span-4 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
                  />
                  <input
                    type="number"
                    value={captain.points}
                    onChange={(e) =>
                      handleCaptainChange(index, "points", Number(e.target.value) || 0)
                    }
                    placeholder="포인트"
                    min="0"
                    className="col-span-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            {Object.keys(errors).some((k) => k.startsWith("captain_")) && (
              <p className="mt-2 text-sm text-red-400">
                모든 팀장의 이름을 입력해주세요
              </p>
            )}
          </motion.section>

          {/* 팀원 등록 섹션 */}
          <motion.section
            className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-200">
              <span className="text-amber-400">03</span> 팀원 등록
              <span className="text-sm font-normal text-slate-400">
                ({members.filter((m) => m.nickname.trim()).length}/{members.length}명)
              </span>
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              경매 대상 팀원 정보를 입력하세요. 팀원은 옵저버 링크로 관전할 수
              있습니다.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {members.map((member, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-1 text-center text-sm font-medium text-slate-400">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={member.nickname}
                    onChange={(e) =>
                      handleMemberChange(index, "nickname", e.target.value)
                    }
                    placeholder="이름 *"
                    className="col-span-3 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
                  />
                  <input
                    type="text"
                    value={member.position}
                    onChange={(e) =>
                      handleMemberChange(index, "position", e.target.value)
                    }
                    placeholder="포지션"
                    className="col-span-3 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
                  />
                  <input
                    type="text"
                    value={member.description}
                    onChange={(e) =>
                      handleMemberChange(index, "description", e.target.value)
                    }
                    placeholder="한줄소개"
                    className="col-span-5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            {errors.members && (
              <p className="mt-2 text-sm text-red-400">{errors.members}</p>
            )}
          </motion.section>

          {/* 정보 요약 */}
          <motion.div
            className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-4 space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-amber-400">
                {formData.teamCount}개 팀
              </span>{" "}
              ×{" "}
              <span className="font-semibold text-amber-400">
                {formData.memberPerTeam}명(팀장 포함)
              </span>{" "}
              = 총{" "}
              <span className="font-semibold text-amber-400">
                {formData.teamCount * formData.memberPerTeam}명
              </span>
            </p>
            <p className="text-sm text-slate-400">
              팀장{" "}
              <span className="font-semibold text-amber-400">
                {formData.teamCount}명
              </span>{" "}
              + 경매 대상 팀원{" "}
              <span className="font-semibold text-amber-400">
                {formData.teamCount * (formData.memberPerTeam - 1)}명
              </span>
            </p>
            {captains.some((c) => c.points > 0) && (
              <p className="text-sm text-slate-400">
                각 팀 시작 포인트 ={" "}
                <span className="font-semibold text-amber-400">
                  {formData.totalPoints}p
                </span>
                {" - "}해당 팀장 포인트
                <span className="text-slate-500 ml-2">
                  (예: 팀장 200p → 팀 {formData.totalPoints - 200}p)
                </span>
              </p>
            )}
            <p className="text-xs text-slate-500">
              생성 후 주최자 링크, 팀장별 링크, 옵저버 공용 링크가 생성됩니다.
            </p>
          </motion.div>

          {/* 에러 메시지 */}
          {errors.submit && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-4">
            <Link href="/" className="flex-1">
              <motion.button
                type="button"
                disabled={isLoading}
                className="w-full rounded-full border border-slate-600 bg-slate-800/50 px-8 py-4 font-semibold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                취소
              </motion.button>
            </Link>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? "생성 중..." : "경매 생성하기"}
            </motion.button>
          </div>
        </form>

        {/* Back link */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Link
            href="/"
            className="text-sm text-slate-500 transition-colors hover:text-slate-400"
          >
            ← 홈으로 돌아가기
          </Link>
        </motion.div>
      </main>

      {/* 초대 링크 모달 */}
      {showModal && createResult && (
        <InviteLinksModal
          room={createResult.room}
          teams={createResult.teams}
          onClose={() => setShowModal(false)}
          closeable={false}
        />
      )}

      {/* 저장된 데이터 복구 모달 */}
      <AnimatePresence>
        {showDraftModal && (savedDraft || lastCreated) && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="mb-4 text-center">
                <div className="mb-2 text-4xl">📋</div>
                <h2 className="text-xl font-bold text-slate-200">
                  이전 데이터가 있습니다
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  불러올 데이터를 선택하세요
                </p>
              </div>

              <div className="mb-6 space-y-3">
                {/* 임시 저장 */}
                {savedDraft && (
                  <button
                    onClick={restoreDraft}
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-left transition-all hover:border-amber-500/50 hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💾</span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-200">작성 중인 내용</p>
                        <p className="text-xs text-slate-500">
                          {new Date(savedDraft.savedAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {savedDraft.formData.title && (
                        <span className="mr-3">제목: {savedDraft.formData.title}</span>
                      )}
                      팀장 {savedDraft.captains.filter((c) => c.nickname.trim()).length}명,
                      팀원 {savedDraft.members.filter((m) => m.nickname.trim()).length}명
                    </div>
                  </button>
                )}

                {/* 마지막 생성 방 */}
                {lastCreated && (
                  <button
                    onClick={restoreLastCreated}
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-left transition-all hover:border-green-500/50 hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔄</span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-200">마지막 생성 방</p>
                        <p className="text-xs text-slate-500">
                          {new Date(lastCreated.savedAt).toLocaleString("ko-KR")} 생성
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {lastCreated.formData.title && (
                        <span className="mr-3">제목: {lastCreated.formData.title}</span>
                      )}
                      팀장 {lastCreated.captains.filter((c) => c.nickname.trim()).length}명,
                      팀원 {lastCreated.members.filter((m) => m.nickname.trim()).length}명
                    </div>
                  </button>
                )}
              </div>

              <button
                onClick={startFresh}
                className="w-full rounded-full border border-slate-600 bg-slate-800/50 px-4 py-3 font-medium text-slate-300 transition-all hover:border-slate-500"
              >
                새로 작성
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
