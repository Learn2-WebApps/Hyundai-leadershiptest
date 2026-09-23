import { NextResponse } from "next/server";
import { CHARACTERS } from "@/lib/characters";
import { ScoringError, gradeAnswers, resolveFinalType } from "@/lib/scoring";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 제출. 클라이언트가 보낸 유형 코드와 점수는 신뢰하지 않고 optionId 로부터 다시 계산한다.
 * 최고점 동점이면 tieBreakSelectedType 없이는 확정하지 않는다.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const store = getStore();
  const participant = await store.getParticipant(params.id);
  if (!participant) return NextResponse.json({ error: "참여 정보를 찾을 수 없습니다." }, { status: 404 });

  try {
    const { answers, scores, hasTopTie, tiedTypes } = gradeAnswers(body?.answers);

    if (hasTopTie && !body?.tieBreakSelectedType) {
      await store.updateParticipant(params.id, { answers, scores, hasTopTie, tiedTypes });
      return NextResponse.json({ needTieBreak: true, tiedTypes });
    }

    const finalCharacterType = resolveFinalType(tiedTypes, hasTopTie, body?.tieBreakSelectedType);
    const predictionMatched = participant.predictedType ? participant.predictedType === finalCharacterType : null;

    const patch = {
      answers,
      scores,
      hasTopTie,
      tiedTypes,
      tieBreakSelectedType: hasTopTie ? finalCharacterType : null,
      finalCharacterType,
      finalCharacterName: CHARACTERS[finalCharacterType].name,
      predictionMatched,
      completedAt: new Date().toISOString(),
      status: "completed" as const,
    };
    const saved = await store.updateParticipant(params.id, patch);

    return NextResponse.json({
      needTieBreak: false,
      result: {
        participantName: participant.participantName,
        predictedType: participant.predictedType,
        finalCharacterType,
        predictionMatched,
        hasTopTie,
        tiedTypes,
        scores: saved?.scores ?? scores,
      },
    });
  } catch (e) {
    if (e instanceof ScoringError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "제출 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
