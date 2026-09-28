import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { code: string } };
const deny = () => NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

/** 세션 종료 */
export async function PATCH(_req: Request, { params }: Ctx) {
  if (!isAdmin()) return deny();
  const ok = await getStore().closeSession(params.code);
  if (!ok) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** 세션 삭제 — 참여자 데이터까지 함께 삭제한다. */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!isAdmin()) return deny();
  const store = getStore();
  if (!(await store.getSession(params.code)))
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  const deletedParticipants = await store.deleteSessionCascade(params.code);
  return NextResponse.json({ deleted: true, deletedParticipants });
}
