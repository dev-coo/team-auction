import { AuctionTemplate } from "./types";

/**
 * LCK 스토브리그 2024/25 템플릿
 * 순서: 젠지 → 한화 → T1 → KT → DK → 농심 → BFX → 브리온 → DRX → DN프릭스
 */
export const LCK_STOVE_LEAGUE_TEMPLATE: AuctionTemplate = {
  metadata: {
    id: "lck-stove-league-2025",
    name: "LCK 스토브리그 2025",
    description: "LCK 10개 팀 (감독 + 선수 5명)",
    icon: "🏆",
    minTeams: 2,
    maxTeams: 10,
    membersPerTeam: 6, // 감독 1 + 선수 5
    defaultPoints: 1000,
  },
  teams: [
    {
      name: "젠지",
      captain: { nickname: "젠지감독", position: "감독" },
      members: [
        { nickname: "Kiin", position: "TOP" },
        { nickname: "Canyon", position: "JGL" },
        { nickname: "Chovy", position: "MID" },
        { nickname: "Ruler", position: "AD" },
        { nickname: "Duro", position: "SPT" },
      ],
    },
    {
      name: "한화",
      captain: { nickname: "한화감독", position: "감독" },
      members: [
        { nickname: "Zeus", position: "TOP" },
        { nickname: "Kanavi", position: "JGL" },
        { nickname: "Zeka", position: "MID" },
        { nickname: "Gumayusi", position: "AD" },
        { nickname: "Delight", position: "SPT" },
      ],
    },
    {
      name: "T1",
      captain: { nickname: "T1감독", position: "감독" },
      members: [
        { nickname: "Doran", position: "TOP" },
        { nickname: "Oner", position: "JGL" },
        { nickname: "Faker", position: "MID" },
        { nickname: "Peyz", position: "AD" },
        { nickname: "Keria", position: "SPT" },
      ],
    },
    {
      name: "KT",
      captain: { nickname: "KT감독", position: "감독" },
      members: [
        { nickname: "PerfecT", position: "TOP" },
        { nickname: "Cuzz", position: "JGL" },
        { nickname: "Bdd", position: "MID" },
        { nickname: "Aiming", position: "AD" },
        { nickname: "Pollu", position: "SPT" },
      ],
    },
    {
      name: "DK",
      captain: { nickname: "DK감독", position: "감독" },
      members: [
        { nickname: "Siwoo", position: "TOP" },
        { nickname: "Lucid", position: "JGL" },
        { nickname: "ShowMaker", position: "MID" },
        { nickname: "Smash", position: "AD" },
        { nickname: "Career", position: "SPT" },
      ],
    },
    {
      name: "농심",
      captain: { nickname: "농심감독", position: "감독" },
      members: [
        { nickname: "Kingen", position: "TOP" },
        { nickname: "Sponge", position: "JGL" },
        { nickname: "Scout", position: "MID" },
        { nickname: "Taeyoon", position: "AD" },
        { nickname: "Lehends", position: "SPT" },
      ],
    },
    {
      name: "BFX",
      captain: { nickname: "BFX감독", position: "감독" },
      members: [
        { nickname: "Clear", position: "TOP" },
        { nickname: "Raptor", position: "JGL" },
        { nickname: "Daystar", position: "MID" },
        { nickname: "Diable", position: "AD" },
        { nickname: "Kellin", position: "SPT" },
      ],
    },
    {
      name: "브리온",
      captain: { nickname: "브리온감독", position: "감독" },
      members: [
        { nickname: "Casting", position: "TOP" },
        { nickname: "GIDEON", position: "JGL" },
        { nickname: "Fisher", position: "MID" },
        { nickname: "Teddy", position: "AD" },
        { nickname: "Namgung", position: "SPT" },
      ],
    },
    {
      name: "DRX",
      captain: { nickname: "DRX감독", position: "감독" },
      members: [
        { nickname: "Rich", position: "TOP" },
        { nickname: "Vincenzo", position: "JGL" },
        { nickname: "Ucal", position: "MID" },
        { nickname: "Jiwoo", position: "AD" },
        { nickname: "Andil", position: "SPT" },
      ],
    },
    {
      name: "DN",
      captain: { nickname: "DN감독", position: "감독" },
      members: [
        { nickname: "DuDu", position: "TOP" },
        { nickname: "Pyosik", position: "JGL" },
        { nickname: "Clozer", position: "MID" },
        { nickname: "deokdam", position: "AD" },
        { nickname: "Peter", position: "SPT" },
      ],
    },
  ],
};
