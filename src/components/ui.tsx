"use client";

import { useState } from "react";
import type { Character } from "@/lib/characters";

export function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="mx-auto w-full px-4 py-10 sm:py-14" style={{ maxWidth: wide ? 1040 : 560 }}>
      {children}
    </main>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <header className="mb-8 text-center">
      <p className="pill">현장 리더십 주행모드 테스트</p>
      <h1 className="mt-4 text-[28px] font-extrabold leading-tight sm:text-[32px]">나의 현장 리더십 유형은?</h1>
      {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-inkSoft">{subtitle}</p> : null}
    </header>
  );
}

/** 이미지가 없거나 로딩에 실패해도 화면이 중단되지 않도록 placeholder 를 표시한다. */
/** 이미지마다 가로세로 비율이 달라 보이는 크기가 들쭉날쭉해지는 것을 면적 기준으로 맞춘다. */
const TARGET_AREA = 0.92;
const fitScale = (w: number, h: number) => {
  if (!w || !h) return 1;
  const frac = (w * h) / Math.max(w, h) ** 2; // 정사각 박스에 contain 했을 때 차지하는 면적 비율
  return Math.min(1.25, Math.max(0.85, Math.sqrt(TARGET_AREA / frac)));
};

export function CharacterImage({
  character,
  size = 160,
  className = "",
}: {
  character: Character;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(1);
  const box = `${size}px`;

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-[24px] bg-panel border border-line text-center text-inkFaint ${className}`}
        style={{ width: box, height: box }}
      >
        <span className="px-2 text-sm font-semibold leading-snug">{character.name}</span>
      </div>
    );
  }

  return (
    // next/image 대신 img 를 쓴다. PNG 캡처 시 원본 픽셀을 그대로 담기 위함.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={character.image}
      alt={`${character.name} 캐릭터 이미지`}
      width={size}
      height={size}
      onLoad={(e) => {
        const el = e.currentTarget;
        setScale(fitScale(el.naturalWidth, el.naturalHeight));
      }}
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
      style={{ width: box, height: box, transform: `scale(${scale})`, transformOrigin: "center" }}
    />
  );
}

export function Progress({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-inkSoft">
        <span>
          {current} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE2D4]">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Notice({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "warn" }) {
  return (
    <p
      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        tone === "warn" ? "bg-[#FBE9E3] text-[#A65B48]" : "bg-panel text-inkSoft"
      }`}
    >
      {children}
    </p>
  );
}
