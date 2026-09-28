"use client";

import { useMemo, useState } from "react";
import { CHARACTERS, CHARACTER_LIST, TYPE_CODES, type TypeCode } from "@/lib/characters";
import { QUESTIONS, TOTAL_QUESTIONS } from "@/lib/questions";
import ResultView, { type ResultData } from "./ResultView";
import { Brand, CharacterImage, Notice, Progress, Shell } from "./ui";

type Stage = "entry" | "predict" | "intro" | "quiz" | "tie" | "result";
type Draft = { mostOptionId?: string; leastOptionId?: string };

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function TestFlow({ onAdmin }: { onAdmin: () => void }) {
  const [stage, setStage] = useState<Stage>("entry");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionCode, setSessionCode] = useState("");
  const [name, setName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);

  // 사전 예상 카드 순서는 학습자마다 무작위. 이미지·이름·유형 코드는 캐릭터 객체 단위로 함께 이동한다.
  const predictCards = useMemo(() => shuffle(CHARACTER_LIST), []);
  const [predictPick, setPredictPick] = useState<TypeCode | null>(null);
  const [predictedType, setPredictedType] = useState<TypeCode | null>(null);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Draft>>({});
  const [slot, setSlot] = useState<"most" | "least">("most"); // 지금 고르는 칸

  const [tiedTypes, setTiedTypes] = useState<TypeCode[]>([]);
  const [tiePick, setTiePick] = useState<TypeCode | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);

  const question = QUESTIONS[index];
  const draft = answers[question?.questionId ?? ""] ?? {};
  const canNext = !!draft.mostOptionId && !!draft.leastOptionId;
  const isLast = index === TOTAL_QUESTIONS - 1;

  /* ------------ 입장 ------------ */
  const handleEnter = async () => {
    setError(null);
    const code = sessionCode.trim();
    const cleanName = name.trim();
    if (!/^\d{4}$/.test(code)) return setError("세션 코드는 숫자 4자리입니다.");
    if (!cleanName) return setError("이름을 입력해 주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode: code, participantName: cleanName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "입장하지 못했습니다.");
      setParticipantId(json.participantId);
      setName(cleanName);
      setStage("predict");
    } catch (e: any) {
      setError(e?.message ?? "입장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------ 사전 예상 ------------ */
  const handlePredict = async () => {
    if (!predictPick || !participantId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/participants/${participantId}/prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictedType: predictPick,
          predictionDisplayOrder: predictCards.map((c) => c.code),
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "저장하지 못했습니다.");
      setPredictedType(predictPick);
      setStage("intro");
    } catch (e: any) {
      setError(e?.message ?? "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------ 문항 선택 ------------ */
  /** 지금 활성화된 칸에 선택지를 넣는다. 같은 선택지가 다른 칸에 있으면 그 칸은 비운다. */
  const pick = (optionId: string) => {
    const cur: Draft = { ...(answers[question.questionId] ?? {}) };
    if (slot === "most") {
      cur.mostOptionId = optionId;
      if (cur.leastOptionId === optionId) cur.leastOptionId = undefined;
    } else {
      cur.leastOptionId = optionId;
      if (cur.mostOptionId === optionId) cur.mostOptionId = undefined;
    }
    setAnswers((prev) => ({ ...prev, [question.questionId]: cur }));
    // 아직 비어 있는 칸이 있으면 그 칸으로 자동으로 넘어간다.
    if (!cur.leastOptionId) setSlot("least");
    else if (!cur.mostOptionId) setSlot("most");
  };

  /** 결과 화면에서 입장 화면으로 돌아가 새 진단을 시작한다. */
  const restart = () => {
    setStage("entry");
    setSessionCode("");
    setName("");
    setParticipantId(null);
    setPredictPick(null);
    setPredictedType(null);
    setIndex(0);
    setSlot("most");
    setAnswers({});
    setTiedTypes([]);
    setTiePick(null);
    setResult(null);
    setError(null);
  };

  const goQuestion = (nextIndex: number) => {
    setIndex(nextIndex);
    const d = answers[QUESTIONS[nextIndex].questionId] ?? {};
    setSlot(!d.mostOptionId ? "most" : !d.leastOptionId ? "least" : "most");
  };

  /* ------------ 제출 ------------ */
  const submit = async (tieBreakSelectedType?: TypeCode) => {
    if (!participantId) return;
    setBusy(true);
    setError(null);
    try {
      const payload = QUESTIONS.map((q) => ({
        questionId: q.questionId,
        mostOptionId: answers[q.questionId]?.mostOptionId,
        leastOptionId: answers[q.questionId]?.leastOptionId,
      }));
      const res = await fetch(`/api/participants/${participantId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, tieBreakSelectedType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "제출하지 못했습니다.");
      if (json.needTieBreak) {
        setTiedTypes(json.tiedTypes);
        setTiePick(null);
        setStage("tie");
        return;
      }
      setResult({
        participantName: json.result.participantName,
        predictedType: json.result.predictedType ?? predictedType,
        finalCharacterType: json.result.finalCharacterType,
        predictionMatched: json.result.predictionMatched,
        hasTopTie: json.result.hasTopTie,
        tiedTypes: json.result.tiedTypes,
      });
      setStage("result");
    } catch (e: any) {
      setError(e?.message ?? "제출하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- 화면 ---------------- */

  if (stage === "entry")
    return (
      <Shell>
        <Brand subtitle="현장 상황에서 내가 주로 사용하는 리더십 행동을 알아보세요." />
        <div className="card space-y-4 p-7">
          <div>
            <label className="mb-2 block text-sm font-semibold text-inkSoft" htmlFor="code">
              세션 코드
            </label>
            <input
              id="code"
              className="field tracking-[0.3em]"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-inkSoft" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              className="field"
              placeholder="이름을 입력해 주세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error ? <Notice tone="warn">{error}</Notice> : null}
          <button className="btn-primary w-full" onClick={handleEnter} disabled={busy}>
            {busy ? "확인 중…" : "시작하기"}
          </button>
        </div>
        <div className="mt-6 text-center">
          <button className="text-sm font-semibold text-inkFaint underline underline-offset-4" onClick={onAdmin}>
            관리자 모드
          </button>
        </div>
      </Shell>
    );

  if (stage === "predict")
    return (
      <Shell>
        <header className="mb-6 text-center">
          <h2 className="text-[24px] font-extrabold">나는 어떤 현장 리더십 유형일까?</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-inkSoft">
            이미지와 이름만 보고 지금의 나와 가장 닮았을 것 같은 유형을 골라보세요.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-inkFaint">
            너무 오래 고민하지 말고 첫 느낌으로 선택해 주세요. 이 선택은 진단 결과에 반영되지 않습니다.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3">
          {predictCards.map((c) => {
            const on = predictPick === c.code;
            return (
              <button
                key={c.code}
                onClick={() => setPredictPick(c.code)}
                className={`flex flex-col items-center gap-3 rounded-[24px] border p-5 transition ${
                  on ? "border-accent bg-accentSoft" : "border-line bg-card hover:bg-panel"
                }`}
              >
                <CharacterImage character={c} size={120} />
                <span className="text-[15px] font-bold">{c.name}</span>
              </button>
            );
          })}
        </div>
        {error ? <div className="mt-4"><Notice tone="warn">{error}</Notice></div> : null}
        <button className="btn-primary mt-6 w-full" onClick={handlePredict} disabled={!predictPick || busy}>
          이 유형으로 예상하기
        </button>
      </Shell>
    );

  if (stage === "intro")
    return (
      <Shell>
        <div className="card space-y-5 p-8 text-center">
          <h2 className="text-[24px] font-extrabold leading-snug">현장에서 나는 주로 어떻게 움직일까?</h2>
          <div className="text-left">
            <p className="text-[14px] font-extrabold text-accentDeep">[응답 안내]</p>
            <p className="mt-2 text-[15px] leading-relaxed text-inkSoft">
              각 문항을 읽고 나의 모습과 가장 가까운 것 1개, 가장 먼 것 1개를 선택해 주세요. 총 12개 문항이며, 두
              유형의 점수가 같을 경우 마지막 동점 결정 문항으로 최종 유형을 정합니다.
            </p>
          </div>
          <Notice>
            <span className="block text-center">가장 좋아 보이는 답보다 실제 나의 모습에 가깝게 선택해 주세요.</span>
            <span className="block text-center">모든 유형에는 강점이 있으며 정답은 없습니다.</span>
          </Notice>
          <button className="btn-primary w-full" onClick={() => setStage("quiz")}>
            테스트 시작하기
          </button>
        </div>
      </Shell>
    );

  if (stage === "quiz")
    return (
      <Shell>
        <Progress current={index + 1} total={TOTAL_QUESTIONS} />
        <div className="card p-6">
          <p className="text-[18px] font-extrabold leading-relaxed">{question.situation}</p>

          {/* 질문 두 개를 나란히 두고, 지금 고르는 쪽을 강조한다. 질문을 누르면 그쪽을 다시 고를 수 있다. */}
          {/* 질문 두 개를 나란히 둔다. 지금 고르는 질문만 색으로 강조한다. */}
          <div className="mt-5 flex items-center gap-6">
            {(
              [
                { key: "most", q: "가장 가까운 행동은?" },
                { key: "least", q: "가장 먼 행동은?" },
              ] as const
            ).map((s) => {
              const on = slot === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSlot(s.key)}
                  aria-pressed={on}
                  className={`pb-1 text-[16px] font-extrabold transition ${
                    on
                      ? s.key === "most"
                        ? "border-b-2 border-accent text-accentDeep"
                        : "border-b-2 border-[#8C7A6C] text-[#5E4F45]"
                      : "border-b-2 border-transparent text-inkFaint hover:text-inkSoft"
                  }`}
                >
                  {s.q}
                </button>
              );
            })}
          </div>

          <ul className="mt-3 space-y-2">
            {question.options.map((o, i) => {
              const isMost = draft.mostOptionId === o.optionId;
              const isLeast = draft.leastOptionId === o.optionId;
              return (
                <li key={o.optionId}>
                  <button
                    type="button"
                    onClick={() => pick(o.optionId)}
                    className={`flex w-full items-center gap-3 rounded-[16px] border px-4 py-4 text-left transition ${
                      isMost
                        ? "border-accent bg-accentSoft"
                        : isLeast
                          ? "border-[#C9BBAE] bg-[#F2ECE5]"
                          : "border-transparent bg-panel hover:border-[#E0CDBB]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                        isMost
                          ? "bg-accent text-white"
                          : isLeast
                            ? "bg-[#8C7A6C] text-white"
                            : "bg-white text-inkFaint"
                      }`}
                    >
                      {isMost ? "●" : isLeast ? "×" : i + 1}
                    </span>
                    <span className="flex-1 text-[15px] leading-relaxed">{o.text}</span>
                    {isMost || isLeast ? (
                      <span
                        className={`shrink-0 text-[12px] font-bold ${
                          isMost ? "text-accentDeep" : "text-[#6E5A4F]"
                        }`}
                      >
                        {isMost ? "가장 가깝다" : "가장 멀다"}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {error ? <div className="mt-4"><Notice tone="warn">{error}</Notice></div> : null}

        <div className="mt-6 flex gap-3">
          <button
            className="btn-ghost flex-1"
            onClick={() => goQuestion(Math.max(0, index - 1))}
            disabled={index === 0 || busy}
          >
            이전
          </button>
          {!isLast ? (
            <button className="btn-primary flex-[2]" onClick={() => goQuestion(index + 1)} disabled={!canNext}>
              다음
            </button>
          ) : (
            <button className="btn-primary flex-[2]" onClick={() => submit()} disabled={!canNext || busy}>
              {busy ? "제출 중…" : "결과 확인하기"}
            </button>
          )}
        </div>
      </Shell>
    );

  if (stage === "tie")
    return (
      <Shell>
        <div className="card space-y-5 p-7">
          <p className="text-[15px] leading-relaxed text-inkSoft">
            두 가지 이상의 리더십 유형이 비슷하게 나타났습니다. 마지막 질문을 통해 대표 유형을 확인해보세요.
          </p>
          <h2 className="text-[20px] font-extrabold leading-snug">
            나의 파트장 경험을 돌아봤을 때, 다른 사람에게 가장 자신 있게 전할 수 있는 팁은?
          </h2>
          <ul className="space-y-3">
            {TYPE_CODES.filter((c) => tiedTypes.includes(c)).map((code) => {
              const on = tiePick === code;
              return (
                <li key={code}>
                  <button
                    onClick={() => setTiePick(code)}
                    className={`w-full rounded-[20px] border p-4 text-left text-[15px] leading-relaxed transition ${
                      on ? "border-accent bg-accentSoft" : "border-line bg-card hover:bg-panel"
                    }`}
                  >
                    {CHARACTERS[code].tieStatement}
                  </button>
                </li>
              );
            })}
          </ul>
          {error ? <Notice tone="warn">{error}</Notice> : null}
          <button
            className="btn-primary w-full"
            onClick={() => tiePick && submit(tiePick)}
            disabled={!tiePick || busy}
          >
            {busy ? "확인 중…" : "선택 완료"}
          </button>
        </div>
      </Shell>
    );

  if (stage === "result" && result)
    return (
      <Shell>
        <ResultView data={result} onRestart={restart} />
      </Shell>
    );

  return null;
}
