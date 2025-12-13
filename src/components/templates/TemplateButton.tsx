"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AuctionTemplate } from "@/data/templates";
import TemplateSelectModal from "./TemplateSelectModal";

interface TemplateButtonProps {
  onSelect: (template: AuctionTemplate, teamCount: number) => void;
}

export default function TemplateButton({ onSelect }: TemplateButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-5 py-3 font-semibold text-slate-900 shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-500/50"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>🏆</span>
        <span>LCK 템플릿</span>
      </motion.button>

      {showModal && (
        <TemplateSelectModal
          onSelect={(template, teamCount) => {
            onSelect(template, teamCount);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
