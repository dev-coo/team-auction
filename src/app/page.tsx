"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
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
        <motion.div
          className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/20 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center gap-12 px-6 text-center">
        {/* Hero section */}
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl md:text-8xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            팀 경매
          </motion.h1>

          <motion.p
            className="max-w-2xl text-xl font-medium text-slate-300 sm:text-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            리그오브레전드 실시간 팀원 경매 시스템
          </motion.p>

          <motion.div
            className="mt-4 text-base text-slate-400 sm:text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            포인트로 팀원을 입찰하고, 최고의 팀을 구성하세요
          </motion.div>
        </motion.div>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Link href="/create">
            <motion.button
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-12 py-5 text-xl font-bold text-slate-900 shadow-2xl shadow-amber-500/50 transition-all duration-300 hover:shadow-amber-500/80"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-300"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative z-10 flex items-center gap-2">
                경매 시작하기
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  →
                </motion.span>
              </span>
            </motion.button>
          </Link>
        </motion.div>

        {/* Feature cards section */}
        <motion.div
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/50 hover:bg-slate-800/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 transition-all duration-300 group-hover:from-amber-500/5 group-hover:to-purple-500/5" />
              <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="font-bold text-slate-200">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer hint */}
      <motion.div
        className="absolute bottom-8 text-sm text-slate-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        실시간 경매로 공정하고 즐거운 팀 구성
      </motion.div>
    </div>
  );
}

const features = [
  {
    icon: "⚡",
    title: "실시간 경매",
    description: "모든 참가자가 동시에 입찰 현황 확인",
  },
  {
    icon: "💬",
    title: "실시간 채팅",
    description: "경매 중 모든 참가자와 소통",
  },
  {
    icon: "🎯",
    title: "입찰 시스템",
    description: "공정한 포인트 기반 경매 진행",
  },
  {
    icon: "⏱️",
    title: "타이머 동기화",
    description: "입찰마다 시간 추가되는 긴장감",
  },
];
