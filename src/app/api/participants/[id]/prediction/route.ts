import { NextResponse } from "next/server";
import { CHARACTERS, TYPE_CODES, type TypeCode } from "@/lib/characters";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isType = (v: unknown): v is TypeCode => TYPE_CODES.includes(v as TypeCode);

/** 사전 예상 캐릭터 저장. 점수 계산과 동점 처리에는 쓰지 않는다. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const predictedType = body?.predictedType;
  if (!isType(predictedType)) return NextResponse.json({ error: "선택이 올바르지 않습니다." }, { status: 400 });

  const store = getStore();
  const participant = await store.getParticipant(params.id);
  if (!participant) return NextResponse.json({ error: "참여 정보를 찾을 수 없습니다." }, { status: 404 });
  if (participant.predictedType)
    return NextResponse.json({ error: "사전 예상은 변경할 수 없습니다." }, { status: 409 });

  const order = Array.isArray(body?.predictionDisplayOrder)
    ? (body.predictionDisplayOrder as unknown[]).filter(isType)
    : null;

  await store.updateParticipant(params.id, {
    predictedType,
    predictedCharacterName: CHARACTERS[predictedType].name,
    predictionSelectedAt: new Date().toISOString(),
    predictionDisplayOrder: order && order.length === 4 ? order : null,
  });

  return NextResponse.json({ ok: true });
}
