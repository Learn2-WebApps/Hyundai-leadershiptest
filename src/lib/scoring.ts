import { TYPE_CODES, type TypeCode } from "./characters";
import { QUESTIONS, TOTAL_QUESTIONS, lookupOption } from "./questions";

export type RawAnswer = { questionId: string; mostOptionId: string; leastOptionId: string };
export type Answer = RawAnswer & { mostType: TypeCode; leastType: TypeCode };
export type TypeScore = { mostCount: number; leastCount: number; netScore: number; displayScore: number };
export type Scores = Record<TypeCode, TypeScore>;

export class ScoringError extends Error {}

/** 표시 점수: ((netScore + 12) / 24) * 100, 소수점 첫째 자리. 백분율·능력치가 아니다. */
export const toDisplayScore = (netScore: number) =>
  Math.round(((netScore + TOTAL_QUESTIONS) / (TOTAL_QUESTIONS * 2)) * 1000) / 10;

/**
 * 클라이언트 응답을 원본 문항 매핑으로 다시 검증하고 점수를 계산한다.
 * 전달된 mostType/leastType/점수는 무시하고 optionId 로부터 재도출한다.
 */
export function gradeAnswers(input: unknown): { answers: Answer[]; scores: Scores; hasTopTie: boolean; tiedTypes: TypeCode[] } {
  if (!Array.isArray(input)) throw new ScoringError("응답 형식이 올바르지 않습니다.");
  if (input.length !== TOTAL_QUESTIONS) throw new ScoringError("응답 문항 수가 올바르지 않습니다.");

  const seen = new Set<string>();
  const answers: Answer[] = [];

  for (const q of QUESTIONS) {
    const found = input.filter((a: any) => a && a.questionId === q.questionId);
    if (found.length === 0) throw new ScoringError("응답하지 않은 문항이 있습니다.");
    if (found.length > 1) throw new ScoringError("한 문항에 중복 응답이 있습니다.");
    const a = found[0] as RawAnswer;
    if (seen.has(q.questionId)) throw new ScoringError("한 문항에 중복 응답이 있습니다.");
    seen.add(q.questionId);

    const most = lookupOption(String(a.mostOptionId));
    const least = lookupOption(String(a.leastOptionId));
    if (!most || !least) throw new ScoringError("존재하지 않는 선택지입니다.");
    if (most.questionId !== q.questionId || least.questionId !== q.questionId)
      throw new ScoringError("문항과 선택지가 일치하지 않습니다.");
    if (a.mostOptionId === a.leastOptionId)
      throw new ScoringError("가장 가까운 행동과 가장 먼 행동은 같을 수 없습니다.");

    answers.push({
      questionId: q.questionId,
      mostOptionId: a.mostOptionId,
      leastOptionId: a.leastOptionId,
      mostType: most.typeCode,
      leastType: least.typeCode,
    });
  }

  const scores = {} as Scores;
  for (const code of TYPE_CODES) scores[code] = { mostCount: 0, leastCount: 0, netScore: 0, displayScore: 0 };
  for (const a of answers) {
    scores[a.mostType].mostCount += 1;
    scores[a.leastType].leastCount += 1;
  }
  for (const code of TYPE_CODES) {
    const s = scores[code];
    s.netScore = s.mostCount - s.leastCount;
    s.displayScore = toDisplayScore(s.netScore);
  }

  // 불변식 검증
  const mostSum = TYPE_CODES.reduce((n, c) => n + scores[c].mostCount, 0);
  const leastSum = TYPE_CODES.reduce((n, c) => n + scores[c].leastCount, 0);
  const netSum = TYPE_CODES.reduce((n, c) => n + scores[c].netScore, 0);
  if (mostSum !== TOTAL_QUESTIONS || leastSum !== TOTAL_QUESTIONS || netSum !== 0)
    throw new ScoringError("점수 계산 검증에 실패했습니다.");

  const top = Math.max(...TYPE_CODES.map((c) => scores[c].netScore));
  const tiedTypes = TYPE_CODES.filter((c) => scores[c].netScore === top);
  return { answers, scores, hasTopTie: tiedTypes.length > 1, tiedTypes };
}

/** 대표 유형 결정. 동점이면 반드시 학습자가 고른 tieBreakSelectedType 이 있어야 한다. */
export function resolveFinalType(
  tiedTypes: TypeCode[],
  hasTopTie: boolean,
  tieBreakSelectedType: unknown
): TypeCode {
  if (!hasTopTie) return tiedTypes[0];
  const picked = tieBreakSelectedType as TypeCode;
  if (!picked || !tiedTypes.includes(picked)) throw new ScoringError("동점 추가 선택이 필요합니다.");
  return picked;
}
