import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

export async function GET() {
  if (!isAdmin()) return deny();
  const sessions = await getStore().listSessions();
  return NextResponse.json({ sessions });
}

/** 중복되지 않는 숫자 4자리 코드를 문자열로 생성한다. ("0047" 형태 유지) */
export async function POST() {
  if (!isAdmin()) return deny();
  const store = getStore();
  for (let i = 0; i < 50; i++) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    if (await store.getSession(code)) continue;
    const session = await store.createSession(code);
    return NextResponse.json({ session });
  }
  return NextResponse.json({ error: "세션 코드를 생성하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
}
