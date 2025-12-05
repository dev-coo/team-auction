import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "팀 경매 - 실시간 팀원 입찰 시스템",
  description:
    "리그오브레전드 등 팀 게임에서 포인트로 팀원을 입찰하는 실시간 경매 시스템",
  keywords: ["팀 경매", "LOL", "리그오브레전드", "팀 구성", "경매 시스템"],
  openGraph: {
    title: "팀 경매",
    description: "실시간 팀원 입찰 시스템",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
