"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { CHARACTERS, type TypeCode } from "@/lib/characters";
import { CharacterImage, Notice } from "./ui";

export type ResultData = {
  participantName: string;
  predictedType: TypeCode | null;
  finalCharacterType: TypeCode;
  predictionMatched: boolean | null;
  hasTopTie: boolean;
  tiedTypes: TypeCode[] | null;
};

const INTERPRETATION =
  "이 결과는 리더십 능력의 높고 낮음을 평가하는 점수가 아닙니다. 네 가지 행동 중 어떤 모습이 나와 상대적으로 더 가깝거나 먼지를 보여주는 결과입니다. 상황에 따라 네 가지 행동을 균형 있게 활용하는 것이 중요합니다.";

const TIE_NOTICE = "두 가지 이상의 행동 경향이 비슷하게 나타나, 추가 선택을 통해 대표 캐릭터를 정했습니다.";

const MATCH_MESSAGE =
  "첫 느낌으로 고른 캐릭터와 진단 결과가 같았습니다. 평소 자신의 행동 특성을 비교적 분명하게 인식하고 있는 것으로 볼 수 있습니다.";
const MISMATCH_MESSAGE =
  "처음 예상한 모습과 진단에서 나타난 행동 경향이 달랐습니다. 내가 생각하는 모습과 실제 상황에서 선택하는 행동의 차이를 살펴보세요.";

const ENGINE_LINK =
  "리더십 엔진이 나를 움직이는 가치관이라면, 리더십 주행모드는 그 가치가 현장에서 행동으로 나타나는 방식입니다.";

const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();

/** 캡처가 어떤 이유로든 끝나지 않을 때 버튼이 잠긴 채 남지 않도록 한다. */
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

const CAPTURE_FONT =
  '"Pretendard Variable", Pretendard, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

function Section({ title, emoji, items }: { title: string; emoji: string; items: string[] }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-[17px] font-extrabold">
        <span aria-hidden>{emoji}</span>
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-[15px] leading-relaxed text-inkSoft">
            <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** PNG 에 담기는 전용 레이아웃. 화면에는 보이지 않는 곳에서 렌더링해 캡처한다. */
function CaptureLayout({ data }: { data: ResultData }) {
  const c = CHARACTERS[data.finalCharacterType];
  return (
    <div
      style={{
        width: 720,
        padding: "48px 44px",
        background: "linear-gradient(180deg,#FDF6EE 0%,#F8EEE3 100%)",
        color: "#4A3B33",
        fontFamily: CAPTURE_FONT,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#C57B51", letterSpacing: "-0.01em" }}>
          현장 리더십 주행모드 테스트
        </div>
        <div style={{ marginTop: 10, fontSize: 20, fontWeight: 600, color: "#6E5A4F" }}>
          {data.participantName} 님의 현장 리더십 유형은
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          background: "#FFFBF6",
          border: "1px solid #EFE2D4",
          borderRadius: 28,
          padding: "36px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CharacterImage character={c} size={220} />
        </div>
        <div style={{ marginTop: 20, fontSize: 32, fontWeight: 800 }}>{c.name}</div>
        <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6, color: "#6E5A4F" }}>{c.summary}</div>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
        {[
          { title: "🌱 주행 강점", items: c.strengths },
          { title: "🚨 주행 경고등", items: c.warnings },
        ].map((block) => (
          <div
            key={block.title}
            style={{ background: "#FFFBF6", border: "1px solid #EFE2D4", borderRadius: 24, padding: "24px 26px" }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{block.title}</div>
            {block.items.map((t) => (
              <div key={t} style={{ display: "flex", gap: 8, fontSize: 15, lineHeight: 1.7, color: "#6E5A4F" }}>
                <span style={{ color: "#D98E63" }}>•</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={{ background: "#FBE6D8", borderRadius: 24, padding: "24px 26px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: "#A8623B" }}>💬 브레이크 한마디</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#8E5232", lineHeight: 1.6 }}>“{c.brake}”</div>
        </div>

        {data.hasTopTie ? (
          <div style={{ background: "#FBF3EA", borderRadius: 20, padding: "18px 22px", fontSize: 14, lineHeight: 1.7, color: "#6E5A4F" }}>
            {TIE_NOTICE}
          </div>
        ) : null}

        <div style={{ background: "#FBF3EA", borderRadius: 20, padding: "18px 22px", fontSize: 14, lineHeight: 1.7, color: "#6E5A4F" }}>
          {INTERPRETATION}
        </div>
      </div>
    </div>
  );
}

export default function ResultView({ data }: { data: ResultData }) {
  const c = CHARACTERS[data.finalCharacterType];
  const predicted = data.predictedType ? CHARACTERS[data.predictedType] : null;
  const captureRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (saving) return; // 중복 클릭 방지
    const node = captureRef.current;
    if (!node) return;
    setSaving(true);
    setMessage("결과 이미지를 만들고 있습니다.");
    try {
      // 한글 웹폰트와 캐릭터 이미지 로딩을 기다린 뒤 캡처한다.
      if (document.fonts?.ready) await withTimeout(document.fonts.ready, 4000).catch(() => null);
      const images = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
        )
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));

      // skipFonts: 웹폰트 CSS(수백 개의 서브셋)를 인라인하려 하면 캡처가 멈춘다.
      // 캡처 레이아웃은 시스템 한글 폰트까지 포함한 폰트 스택을 직접 지정해 한글이 깨지지 않게 한다.
      const dataUrl = await withTimeout(
        toPng(node, {
          pixelRatio: 2,
          cacheBust: true,
          skipFonts: true,
          backgroundColor: "#FDF6EE",
          width: node.scrollWidth,
          height: node.scrollHeight,
        }),
        20000
      );

      const link = document.createElement("a");
      link.download = `${sanitize("현장 리더십 주행모드 테스트")}_${sanitize(data.participantName)}.png`;
      link.href = dataUrl;
      link.click();
      setMessage("결과 이미지가 저장되었습니다.");
    } catch {
      setMessage("이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }, [data.participantName, saving]);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-[15px] font-semibold text-inkSoft">{data.participantName} 님, 진단이 끝났습니다.</p>
        <h2 className="mt-2 text-[24px] font-extrabold leading-snug sm:text-[28px]">
          나의 현장 리더십 유형은 ‘{c.name}’입니다
        </h2>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-xs font-semibold text-inkFaint">내가 예상한 유형</p>
            <div className="mt-3 flex flex-col items-center gap-2">
              {predicted ? (
                <>
                  <CharacterImage character={predicted} size={72} />
                  <p className="text-[15px] font-bold">{predicted.name}</p>
                </>
              ) : (
                <p className="py-6 text-sm text-inkFaint">선택 없음</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-accentSoft p-4">
            <p className="text-xs font-semibold text-accentDeep">테스트로 확인한 유형</p>
            <div className="mt-3 flex flex-col items-center gap-2">
              <CharacterImage character={c} size={72} />
              <p className="text-[15px] font-bold">{c.name}</p>
            </div>
          </div>
        </div>
        {data.predictionMatched === null ? null : (
          <p className="mt-4 text-[14px] leading-relaxed text-inkSoft">
            {data.predictionMatched ? MATCH_MESSAGE : MISMATCH_MESSAGE}
          </p>
        )}
      </div>

      <div className="card p-7 text-center">
        <div className="flex justify-center">
          <CharacterImage character={c} size={200} />
        </div>
        <h3 className="mt-5 text-[26px] font-extrabold">{c.name}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-inkSoft">{c.summary}</p>
      </div>

      <div className="card p-7">
        <Section title="주행 강점" emoji="🌱" items={c.strengths} />
      </div>
      <div className="card p-7">
        <Section title="주행 경고등" emoji="🚨" items={c.warnings} />
      </div>

      <div className="rounded-[28px] bg-accentSoft p-7">
        <h3 className="flex items-center gap-2 text-[17px] font-extrabold text-[#A8623B]"><span aria-hidden>💬</span>브레이크 한마디</h3>
        <p className="mt-3 text-[18px] font-bold leading-relaxed text-[#8E5232]">“{c.brake}”</p>
      </div>

      {data.hasTopTie ? <Notice>{TIE_NOTICE}</Notice> : null}
      <Notice>{INTERPRETATION}</Notice>
      <Notice>{ENGINE_LINK}</Notice>

      <div className="pt-2">
        <button type="button" className="btn-primary w-full" onClick={handleSave} disabled={saving}>
          {saving ? "결과 이미지를 만드는 중…" : "결과 이미지 저장"}
        </button>
        {message ? <p className="mt-3 text-center text-sm text-inkSoft">{message}</p> : null}
      </div>

      {/* 캡처 전용 레이아웃 — 화면 밖에서 항상 렌더링되어 있어 저장 시 잘리지 않는다. */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <div ref={captureRef}>
          <CaptureLayout data={data} />
        </div>
      </div>
    </div>
  );
}
