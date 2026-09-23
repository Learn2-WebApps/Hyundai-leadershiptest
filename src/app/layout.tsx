import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "현장 리더십 주행모드 테스트",
  description: "나의 현장 리더십 유형은? 현장 상황에서 내가 주로 사용하는 리더십 행동을 알아보세요.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FDF6EE" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
