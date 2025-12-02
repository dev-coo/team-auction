"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CreateAuction() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    teamCount: 5,
    memberPerTeam: 4,
    totalPoints: 1000,
    auctionTime: 15,
    bidTimeAdd: 2,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "title" ? value : Number(value),
    }));
    // 입력 시 에러 제거
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "경매 타이틀을 입력해주세요";
    }
    if (formData.teamCount < 2) {
      newErrors.teamCount = "최소 2개 팀이 필요합니다";
    }
    if (formData.memberPerTeam < 1) {
      newErrors.memberPerTeam = "팀당 최소 1명이 필요합니다";
    }
    if (formData.totalPoints < 100) {
      newErrors.totalPoints = "최소 100 포인트가 필요합니다";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // TODO: Supabase 연결 후 실제 API 호출
    console.log("경매 생성:", formData);

    // 임시: 알림 후 홈으로 이동
    alert("경매가 생성되었습니다! (임시 - Supabase 연결 필요)");
    // router.push("/room/[id]"); // 실제로는 생성된 방 ID로 이동
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-1/4 top-0 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -right-1/4 bottom-0 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>

      {/* Main content */}
      <main className="relative z-10 w-full max-w-2xl px-6 py-12">
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
          <p className="text-slate-400">새로운 팀 경매를 시작하세요</p>
        </motion.div>

        {/* Form card */}
        <motion.div
          className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 경매 타이틀 */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                경매 타이틀 <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                id="title"
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

            {/* 팀 설정 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="teamCount"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  팀 수
                </label>
                <input
                  type="number"
                  id="teamCount"
                  name="teamCount"
                  value={formData.teamCount}
                  onChange={handleChange}
                  min="2"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
                {errors.teamCount && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.teamCount}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="memberPerTeam"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  팀당 인원
                </label>
                <input
                  type="number"
                  id="memberPerTeam"
                  name="memberPerTeam"
                  value={formData.memberPerTeam}
                  onChange={handleChange}
                  min="1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
                {errors.memberPerTeam && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.memberPerTeam}
                  </p>
                )}
              </div>
            </div>

            {/* 포인트 설정 */}
            <div>
              <label
                htmlFor="totalPoints"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                총 포인트
              </label>
              <input
                type="number"
                id="totalPoints"
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
              <p className="mt-1 text-xs text-slate-500">
                각 팀장에게 지급될 포인트
              </p>
            </div>

            {/* 타이머 설정 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="auctionTime"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  경매 시작 시간 (초)
                </label>
                <input
                  type="number"
                  id="auctionTime"
                  name="auctionTime"
                  value={formData.auctionTime}
                  onChange={handleChange}
                  min="5"
                  max="60"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="bidTimeAdd"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  입찰 시 추가 시간 (초)
                </label>
                <input
                  type="number"
                  id="bidTimeAdd"
                  name="bidTimeAdd"
                  value={formData.bidTimeAdd}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            {/* 정보 카드 */}
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">
                📊 총{" "}
                <span className="font-semibold text-amber-400">
                  {formData.teamCount}개 팀
                </span>
                , 팀당{" "}
                <span className="font-semibold text-amber-400">
                  {formData.memberPerTeam}명
                </span>{" "}
                ={" "}
                <span className="font-semibold text-amber-400">
                  {formData.teamCount * formData.memberPerTeam}명
                </span>{" "}
                필요
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-4">
              <Link href="/" className="flex-1">
                <motion.button
                  type="button"
                  className="w-full rounded-full border border-slate-600 bg-slate-800/50 px-8 py-4 font-semibold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  취소
                </motion.button>
              </Link>

              <motion.button
                type="submit"
                className="flex-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 py-4 font-bold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                경매 생성하기
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Back link */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link
            href="/"
            className="text-sm text-slate-500 transition-colors hover:text-slate-400"
          >
            ← 홈으로 돌아가기
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
