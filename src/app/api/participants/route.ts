import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 학습자 입장: 세션 코드 확인 후 참여자 생성 */
export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const sessionCode = String(body?.sessionCode ?? "").trim();
  const participantName = String(body?.participantName ?? "").trim();

  if (!/^\d{4}$/.test(sessionCode))
    return NextResponse.json({ error: "세션 코드는 숫자 4자리입니다." }, { status: 400 });
  if (!participantName) return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });

  const store = getStore();
  const session = await store.getSession(sessionCode);
  if (!session) return NextResponse.json({ error: "존재하지 않는 세션 코드입니다." }, { status: 404 });
  if (session.status !== "open")
    return NextResponse.json({ error: "종료된 세션입니다. 진행자에게 문의해 주세요." }, { status: 403 });

  const participant = await store.createParticipant({
    sessionCode,
    participantName,
    predictedType: null,
    predictedCharacterName: null,
    predictionSelectedAt: null,
    predictionDisplayOrder: null,
    answers: null,
    scores: null,
    hasTopTie: null,
    tiedTypes: null,
    tieBreakSelectedType: null,
    finalCharacterType: null,
    finalCharacterName: null,
    predictionMatched: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "in_progress",
  });

  return NextResponse.json({ participantId: participant.id, participantName, sessionCode });
}
